@echo off
title Le Mot Mystere - v5 Far West

cd /d "%~dp0"

rem Ports : v1 = 8000, v2 = 8001, v3 = 8002, v4 = 8003, v5 = 8004
set "PORT=8004"

rem La v5 n'a plus de PHP : php.exe sert seulement de petit serveur web,
rem car les modules JavaScript (import) ne marchent pas en ouvrant index.html directement.
rem Quel php.exe utiliser ?
rem 1. celui du dossier php\ s'il existe et n'est pas vide
rem 2. sinon celui du PATH (XAMPP)
rem 3. sinon C:\xampp\php\php.exe
set "PHP=php"
where php > nul 2>&1 || set "PHP=C:\xampp\php\php.exe"
if exist "%~dp0php\php.exe" for %%F in ("%~dp0php\php.exe") do if %%~zF GTR 0 set "PHP=%~dp0php\php.exe"

start "Serveur PHP - Mot Mystere v5" /min "%PHP%" -S localhost:%PORT% -t "%~dp0"

timeout /t 2 /nobreak > nul

start "" http://localhost:%PORT%

exit
