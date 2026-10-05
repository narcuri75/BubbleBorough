@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."

powershell -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_ROOT%\scripts\generate-asset-manifest.ps1" -ProjectRoot "%PROJECT_ROOT%"
exit /b %ERRORLEVEL%
