@echo off

taskkill /IM php.exe /F > nul 2>&1

echo Le serveur PHP a ete arrete.
pause