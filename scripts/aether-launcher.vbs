' Double-click launcher for Aether on Windows.
' Starts PowerShell hidden so no console window stays on screen.

Option Explicit

Dim shell, fso, script, command, i, quotedScript, quotedArg
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

script = fso.BuildPath(fso.GetParentFolderName(WScript.ScriptFullName), "Aether.ps1")
quotedScript = """" & Replace(script, """", """""") & """"
command = "powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File " & quotedScript

For i = 0 To WScript.Arguments.Count - 1
    quotedArg = """" & Replace(WScript.Arguments(i), """", """""") & """"
    command = command & " " & quotedArg
Next

shell.Run command, 0, False
