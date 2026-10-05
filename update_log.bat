@echo off
setlocal EnableExtensions DisableDelayedExpansion

set "ROOT=%~dp0"
set "NOTES_FILE=%TEMP%\bubble-borough-update-notes-%RANDOM%%RANDOM%.txt"
set "ISSUES_FILE=%TEMP%\bubble-borough-known-issues-%RANDOM%%RANDOM%.txt"

echo.
echo Bubble Borough update log
echo Enter one note per line. Use [header] Title, [bullet] Item, or [space].
echo Type [done] when you are finished.
echo.

:note
set "NOTE="
set /p "NOTE=Note: "
if /I "%NOTE%"=="[done]" goto save
>>"%NOTES_FILE%" echo(%NOTE%
goto note

:save
echo.
echo Enter known issues one per line. Type [done] when you are finished, or [none] for none.

:issue
set "ISSUE="
set /p "ISSUE=Known issue: "
if /I "%ISSUE%"=="[done]" goto append
if /I "%ISSUE%"=="[none]" goto append
>>"%ISSUES_FILE%" echo(%ISSUE%
goto issue

:append
node "%ROOT%scripts\append-update-log.cjs" "%NOTES_FILE%" "%ISSUES_FILE%"
set "RESULT=%ERRORLEVEL%"
if exist "%NOTES_FILE%" del "%NOTES_FILE%"
if exist "%ISSUES_FILE%" del "%ISSUES_FILE%"
if not "%RESULT%"=="0" (
  echo.
  echo The update log was not saved.
  pause
  exit /b %RESULT%
)

call npm.cmd run build:website
if errorlevel 1 (
  echo.
  echo The update was saved, but the static News page could not be rebuilt.
  pause
  exit /b 1
)

echo.
echo Update saved and the static News page was rebuilt.
pause
