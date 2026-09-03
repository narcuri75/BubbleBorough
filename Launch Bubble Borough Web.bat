@echo off
cd /d "%~dp0"
npm.cmd start
if errorlevel 1 pause
