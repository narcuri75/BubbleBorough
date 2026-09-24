@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo ==========================================
echo   Bubble Borough Sprite Asset Rebuilder
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js was not found in PATH.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)

if not exist "package.json" (
  echo ERROR: Run this BAT from the Bubble Borough project root.
  pause
  exit /b 1
)

if not exist "scripts\strip-sprite-json-images.cjs" (
  echo ERROR: Missing scripts\strip-sprite-json-images.cjs
  pause
  exit /b 1
)

if not exist "node_modules\sharp" (
  echo Dependencies are missing. Installing them first...
  call npm install
  if errorlevel 1 goto :fail
)

echo [1/5] Removing embedded base64 images from sprite JSON files...
node "scripts\strip-sprite-json-images.cjs"
if errorlevel 1 goto :fail

echo.
echo [2/5] Deleting ALL previously generated sprite delivery files...
if exist "assets\generated\sprites" (
  rmdir /s /q "assets\generated\sprites"
  if exist "assets\generated\sprites" (
    echo ERROR: Could not fully remove assets\generated\sprites
    goto :fail
  )
)

echo.
echo [3/5] Rebuilding sprite definitions, thumbnails, previews, manifests, and app bundle...
node "scripts\build-app-bundle.cjs"
if errorlevel 1 goto :fail

echo.
echo [4/5] Normalizing the asset manifest...
node "scripts\write-stable-json.cjs" "assets\asset-manifest.json"
if errorlevel 1 goto :fail

echo.
echo [5/5] Verifying generated sprite assets are current...
node "scripts\generate-sprite-delivery.cjs" --check
if errorlevel 1 goto :fail
node "scripts\generate-sprite-sheets.cjs" --check
if errorlevel 1 goto :fail
node "scripts\generate-asset-manifest.cjs" --check
if errorlevel 1 goto :fail
node "scripts\build-app-bundle.cjs" --check
if errorlevel 1 goto :fail

echo.
echo ==========================================
echo   DONE

echo   Sprite assets were rebuilt from the

echo   current .webp + .json source files.

echo   Old generated thumbnails that are no

echo   longer referenced have been removed.

echo ==========================================
echo.
pause
exit /b 0

:fail
echo.
echo ==========================================
echo   REBUILD FAILED

echo   Read the error above. No fake success.

echo ==========================================
echo.
pause
exit /b 1
