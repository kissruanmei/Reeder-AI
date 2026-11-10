@echo off
cd /d "%~dp0"
call npm run electron:dev
if errorlevel 1 pause
