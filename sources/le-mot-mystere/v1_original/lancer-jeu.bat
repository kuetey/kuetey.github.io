@echo off

title Jeu du Pendu

cd /d "%~dp0"

start "" http://localhost:8000

php -S localhost:8000