; Aether Windows installer (per-user, no UAC prompt).
; APPROOT and OUTFILE are passed by scripts/build-windows.sh.

!ifndef APPROOT
  !error "APPROOT is required"
!endif
!ifndef OUTFILE
  !error "OUTFILE is required"
!endif

!define APPNAME "Aether"
!define APPVERSION "1.0.0"

Name "${APPNAME} ${APPVERSION}"
OutFile "${OUTFILE}"
InstallDir "$LOCALAPPDATA\${APPNAME}"
RequestExecutionLevel user
SetCompressor /SOLID lzma
Icon "${APPROOT}\aether.ico"
UninstallIcon "${APPROOT}\aether.ico"

Page directory
Page instfiles

UninstPage uninstConfirm
UninstPage instfiles

Section "Install"
  SetOutPath "$INSTDIR"
  File /r "${APPROOT}\*"

  CreateDirectory "$SMPROGRAMS\${APPNAME}"
  CreateShortcut "$DESKTOP\${APPNAME}.lnk" "$WINDIR\System32\wscript.exe" '"$INSTDIR\Aether.vbs"' "$INSTDIR\aether.ico"
  CreateShortcut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$WINDIR\System32\wscript.exe" '"$INSTDIR\Aether.vbs"' "$INSTDIR\aether.ico"
  CreateShortcut "$SMPROGRAMS\${APPNAME}\Uninstall ${APPNAME}.lnk" "$INSTDIR\uninstall.exe" "" "$INSTDIR\aether.ico"

  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayName" "${APPNAME} Browser"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayVersion" "${APPVERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "Publisher" "The Aether Project"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayIcon" "$INSTDIR\aether.ico"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "UninstallString" '"$INSTDIR\uninstall.exe"'
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "NoRepair" 1
  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\${APPNAME}.lnk"
  Delete "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk"
  Delete "$SMPROGRAMS\${APPNAME}\Uninstall ${APPNAME}.lnk"
  RMDir "$SMPROGRAMS\${APPNAME}"

  Delete "$INSTDIR\uninstall.exe"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}"
SectionEnd
