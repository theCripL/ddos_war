@echo off
title DDos_war - DA Bridge Server
color 0A

cd /d "%~dp0bridge"

:: Проверяем установлен ли модуль ws
if not exist "node_modules\ws" (
    echo [Bridge] Установка модуля ws...
    call npm install ws
)

echo [Bridge] Запуск сервера моста...
node server.js
pause