# Aether browser launcher for Windows.
# No Python or third-party tools are required.

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition
$profileDir = Join-Path $root 'User Data'
$defaultDir = Join-Path $profileDir 'Default'
$chrome = Join-Path $root 'chrome.exe'

function Read-Varint([byte[]]$Data, [ref]$Position) {
    $value = 0
    $shift = 0
    while ($Position.Value -lt $Data.Length) {
        $byte = $Data[$Position.Value]
        $Position.Value++
        $value = $value -bor (($byte -band 0x7F) -shl $shift)
        if (($byte -band 0x80) -eq 0) { break }
        $shift += 7
    }
    return $value
}

function Read-LogPrefs([string]$Path, [hashtable]$Prefs) {
    $bytes = [IO.File]::ReadAllBytes($Path)
    $pos = 0
    $block = 32768
    while ($pos + 7 -le $bytes.Length) {
        $length = [BitConverter]::ToUInt16($bytes, $pos + 4)
        $kind = $bytes[$pos + 6]
        $start = $pos
        $pos += 7
        if ($length -eq 0 -or $length -gt $block -or $pos + $length -gt $bytes.Length) {
            $pos = ([int][Math]::Floor($start / $block) + 1) * $block
            continue
        }
        $payload = New-Object byte[] $length
        [Array]::Copy($bytes, $pos, $payload, 0, $length)
        $pos += $length
        if ($kind -ne 1 -or $payload.Length -lt 12) { continue }

        $i = 8
        $count = [BitConverter]::ToUInt32($payload, $i)
        $i += 4
        for ($n = 0; $n -lt $count -and $i -lt $payload.Length; $n++) {
            $i++ # kTypeValue
            $keyLen = Read-Varint $payload ([ref]$i)
            if ($keyLen -le 0 -or $i + $keyLen -gt $payload.Length) { break }
            $key = [Text.Encoding]::UTF8.GetString($payload, $i, $keyLen)
            $i += $keyLen
            $valueLen = Read-Varint $payload ([ref]$i)
            if ($valueLen -lt 0 -or $i + $valueLen -gt $payload.Length) { break }
            $value = [Text.Encoding]::UTF8.GetString($payload, $i, $valueLen)
            $i += $valueLen
            if ($key -like 'aether.*') {
                try { $value = ConvertFrom-Json -InputObject $value } catch { }
                $Prefs[$key] = $value
            }
        }
    }
}

function Get-AetherPrefs([string]$Profile) {
    $prefs = @{}
    $storeRoot = Join-Path $Profile 'Default\Local Extension Settings'
    if (-not (Test-Path $storeRoot)) { return $prefs }
    Get-ChildItem -Path $storeRoot -Filter '*.log' -Recurse -File -ErrorAction SilentlyContinue |
        Sort-Object FullName |
        ForEach-Object { Read-LogPrefs $_.FullName $prefs }
    return $prefs
}

function Clean-Profile([string]$PreferencesFile) {
    if (-not (Test-Path $PreferencesFile)) { return }
    try {
        $data = Get-Content -Raw -LiteralPath $PreferencesFile | ConvertFrom-Json
    } catch { return }

    $extensions = $data.extensions
    if ($null -eq $extensions) { return }
    $settings = $extensions.settings
    $stale = @()
    if ($null -ne $settings) {
        foreach ($property in $settings.PSObject.Properties) {
            if ($property.Value.location -eq 8) { $stale += $property.Name }
        }
    }

    $validIds = @()
    if ($null -ne $settings) {
        foreach ($property in $settings.PSObject.Properties) {
            if ($stale -notcontains $property.Name) { $validIds += $property.Name }
        }
    }

    $commands = $extensions.commands
    if ($null -ne $commands) {
        foreach ($property in @($commands.PSObject.Properties)) {
            $extension = $property.Value.extension
            if ($null -eq $extension -or $validIds -notcontains $extension) {
                $commands.PSObject.Properties.Remove($property.Name) | Out-Null
            }
        }
    }

    if ($null -ne $settings) {
        foreach ($id in $stale) {
            $settings.PSObject.Properties.Remove($id) | Out-Null
        }
    }

    $theme = $extensions.theme
    if ($null -ne $theme -and $stale -contains $theme.id) {
        $extensions.theme = @{ id = ''; system_theme = 0 }
    }

    $pinned = $extensions.pinned_extensions
    if ($null -ne $pinned) {
        $extensions.pinned_extensions = @($pinned | Where-Object { $stale -notcontains $_ })
    }

    $data.extensions = $extensions
    $json = $data | ConvertTo-Json -Depth 100 -Compress
    [IO.File]::WriteAllText($PreferencesFile, $json, (New-Object Text.UTF8Encoding $false))

    $sw = Join-Path (Split-Path -Parent $PreferencesFile) 'Service Worker'
    if (Test-Path $sw) { Remove-Item -LiteralPath $sw -Recurse -Force -ErrorAction SilentlyContinue }
}

if (-not (Test-Path $chrome)) {
    throw "Aether browser files are missing: $chrome"
}

if (-not (Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
    Copy-Item -Path (Join-Path $root 'profile-template\*') -Destination $profileDir -Recurse -Force
}
if (-not (Test-Path $defaultDir)) {
    New-Item -ItemType Directory -Path $defaultDir -Force | Out-Null
}

$confFile = Join-Path $profileDir 'aether.conf'
if (-not (Test-Path $confFile)) {
    Copy-Item -LiteralPath (Join-Path $root 'aether.conf') -Destination $confFile -Force
}

$conf = @{}
foreach ($line in Get-Content -LiteralPath $confFile) {
    if ($line -match '^\s*#|^\s*$') { continue }
    if ($line -match '^\s*([^=]+?)\s*=\s*(.*?)\s*$') {
        $conf[$Matches[1]] = $Matches[2]
    }
}

Clean-Profile (Join-Path $defaultDir 'Preferences')
$prefs = Get-AetherPrefs $profileDir

function Get-Choice($name, $default) {
    if ($prefs.ContainsKey("aether.$name")) { return [string]$prefs["aether.$name"] }
    if ($conf.ContainsKey($name)) { return [string]$conf[$name] }
    return $default
}

$theme = Get-Choice 'theme' 'aurora'
$startPage = Get-Choice 'startPage' 'modern'
if (-not (Test-Path (Join-Path $root "extensions\themes\$theme\manifest.json"))) { $theme = 'aurora' }
if (-not (Test-Path (Join-Path $root "startpage\$startPage.html"))) { $startPage = 'modern' }

$targetExtensions = Join-Path $profileDir 'extensions'
if (-not (Test-Path $targetExtensions)) {
    New-Item -ItemType Directory -Path $targetExtensions -Force | Out-Null
}
Get-ChildItem -Path (Join-Path $root 'extensions') -Directory |
    Where-Object { Test-Path (Join-Path $_.FullName 'manifest.json') } |
    ForEach-Object {
        $dest = Join-Path $targetExtensions $_.Name
        if (Test-Path $dest) { Remove-Item -LiteralPath $dest -Recurse -Force }
        Copy-Item -LiteralPath $_.FullName -Destination $dest -Recurse -Force
    }

$extensionKeys = @{
    'aether-block' = 'ads'
    'aether-tabs' = 'vertical_tabs'
    'aether-canvas' = 'canvas'
    'aether-spotlight' = 'spotlight'
    'aether-controls' = 'controls'
}
$enabled = @()
Get-ChildItem -Path $targetExtensions -Directory |
    Where-Object { Test-Path (Join-Path $_.FullName 'manifest.json') } |
    ForEach-Object {
        $key = $extensionKeys[$_.Name]
        if ($null -eq $key -or (Get-Choice $key 'on') -ne 'off') {
            $enabled += $_.FullName
        }
    }
$enabled += (Join-Path $targetExtensions "themes\$theme")

$flags = @("--user-data-dir=$profileDir")
$flagFile = Join-Path $root 'config\flags.txt'
if (Test-Path $flagFile) {
    foreach ($line in Get-Content -LiteralPath $flagFile) {
        if ($line -match '^\s*#|^\s*$') { continue }
        $flag = $line.Trim()
        if ($flag -like '--class=*' -or $flag -eq '--password-store=basic') { continue }
        $flags += $flag
    }
}
if ((Get-Choice 'no_sandbox' 'auto') -eq 'on') { $flags += '--no-sandbox' }
$flags += '--load-extension=' + ($enabled -join ',')

$arguments = @($flags)
if ($args.Count -gt 0) {
    $arguments += $args
} else {
    $page = (Join-Path $root "startpage\$startPage.html")
    $arguments += ([Uri]$page).AbsoluteUri
}

& $chrome @arguments
