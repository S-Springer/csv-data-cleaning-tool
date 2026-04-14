#define MyAppName "TidyCSV"

#ifndef MyAppVersion
  #define MyAppVersion "0.1.0"
#endif

#ifndef SourceExe
  #define SourceExe "..\\dist\\csv-data-tool.exe"
#endif

[Setup]
AppId={{4D49D669-22D7-4A63-8F8D-059F583DA013}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher=TidyCSV
DefaultDirName={autopf}\TidyCSV
DefaultGroupName=TidyCSV
OutputDir=..\dist\installer
OutputBaseFilename=TidyCSV-Setup-{#MyAppVersion}
Compression=lzma
SolidCompression=yes
WizardStyle=modern
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
PrivilegesRequired=admin
UninstallDisplayIcon={app}\TidyCSV.exe

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "Create a desktop shortcut"; GroupDescription: "Additional icons:"; Flags: unchecked

[Files]
Source: "{#SourceExe}"; DestDir: "{app}"; DestName: "TidyCSV.exe"; Flags: ignoreversion
Source: "..\README.md"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\TidyCSV"; Filename: "{app}\TidyCSV.exe"
Name: "{group}\Uninstall TidyCSV"; Filename: "{uninstallexe}"
Name: "{autodesktop}\TidyCSV"; Filename: "{app}\TidyCSV.exe"; Tasks: desktopicon

[Run]
Filename: "{app}\TidyCSV.exe"; Description: "Launch TidyCSV"; Flags: nowait postinstall skipifsilent
