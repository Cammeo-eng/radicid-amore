@echo off
rem Radici d'Amore: abre o site no navegador (dois cliques neste arquivo).
rem Precisa do Node.js (https://nodejs.org). Sem Node, abra o index.html direto no navegador.
cd /d "%~dp0"
title Radici d'Amore - servidor local

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Abrindo o index.html direto no navegador...
  start "" "%~dp0index.html"
  pause
  exit /b
)

node tools\servidor-local.js 5173 --abrir
pause
