@echo off
title PokeBonk Local Play
echo Starting PokeBonk Local Server...
echo.

where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Using Node.js server...
    start http://localhost:8000
    node server.js
    pause
    exit /b
)

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo Using Python server...
    start http://localhost:8000
    python server.py
    pause
    exit /b
)

echo Neither Node.js nor Python was found on PATH.
pause
