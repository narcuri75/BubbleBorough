@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo ==========================================
echo   Bubble Borough - Build All Assets
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js was not found in PATH.
  echo Install Node.js, then run this file again.
  goto :fail
)

if not exist "package.json" (
  echo ERROR: This file must stay in the Bubble Borough project root.
  goto :fail
)

if not exist "node_modules\sharp" (
  echo Dependencies are missing. Installing them first...
  call npm.cmd install
  if errorlevel 1 goto :fail
)

echo Building generated asset outputs from the authored assets...
echo This preserves the master artwork and regenerates only derived files.
echo.
call npm.cmd run build:app
if errorlevel 1 goto :fail

echo.
echo Verifying the generated assets and app bundle...
call npm.cmd run check:app
if errorlevel 1 goto :fail

echo.
echo ==========================================
echo   DONE
echo.
echo   Full atlases, Borough small atlases,
echo   previews, manifests, and app bundle are current.
echo ==========================================
echo.
pause
exit /b 0

:fail
echo.
echo ==========================================
echo   BUILD FAILED
echo.
echo   Read the error above; no files were deleted.
echo ==========================================
echo.
pause
exit /b 1
