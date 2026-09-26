@echo off

rem Attention : arrete TOUS les serveurs php.exe (v1 et v2 comprises)
taskkill /IM php.exe /F > nul 2>&1

echo Le serveur PHP a ete arrete.
pause
