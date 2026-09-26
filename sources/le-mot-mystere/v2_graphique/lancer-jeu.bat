@echo off
title Le Mot Mystere - v2 graphique

cd /d "%~dp0"

rem Port 8001 : la v1 (dossier Jeu_du_pendu) garde le port 8000
set "PORT=8001"

rem Quel php.exe utiliser ?
rem 1. celui du dossier php\ s'il existe et n'est pas vide
rem 2. sinon celui du PATH (XAMPP)
rem 3. sinon C:\xampp\php\php.exe
set "PHP=php"
where php > nul 2>&1 || set "PHP=C:\xampp\php\php.exe"
if exist "%~dp0php\php.exe" for %%F in ("%~dp0php\php.exe") do if %%~zF GTR 0 set "PHP=%~dp0php\php.exe"

start "Serveur PHP - Mot Mystere v2" /min "%PHP%" -S localhost:%PORT% -t "%~dp0"

timeout /t 2 /nobreak > nul

start "" http://localhost:%PORT%

exit
