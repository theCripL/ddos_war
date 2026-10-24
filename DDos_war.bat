@echo off
title DDos_war Overlay - Control Panel (v1.5.0)
color 0B

cd /d "%~dp0"

:MENU
cls
echo ================================================================
echo               DDos_war Overlay - CONTROL PANEL (v1.5.0)
echo ================================================================
echo.
echo  [1] First Launch Setup (Twitch Channel + DA Token)
echo  [2] Open Test Bench (test.html) in browser
echo  [3] Open OBS Overlay (index.html) in browser
echo  [4] Start DA Bridge Server (Node.js)
echo  [5] Check files and modules integrity
echo  [6] View current config (config.js)
echo  [7] Edit Settings in config.js (Open in Notepad)
echo  [8] Edit Blacklist (media/blacklist.txt)
echo  [0] Exit
echo.
echo ================================================================
set "opt="
set /p opt="Select action [0-8]: "

if "%opt%"=="1" goto FIRST_LAUNCH
if "%opt%"=="2" goto OPEN_TEST
if "%opt%"=="3" goto OPEN_OBS
if "%opt%"=="4" goto START_BRIDGE
if "%opt%"=="5" goto CHECK_FILES
if "%opt%"=="6" goto SHOW_CONFIG
if "%opt%"=="7" goto EDIT_CONFIG
if "%opt%"=="8" goto EDIT_BLACKLIST
if "%opt%"=="0" goto QUIT
goto MENU

:FIRST_LAUNCH
cls
echo ================================================================
echo                      FIRST LAUNCH SETUP
echo ================================================================
echo.
echo  [1] Set DonationAlerts Widget Token (da_token)
echo  [2] Set Twitch Channel Name (channel)
echo  [3] Quick Setup Wizard (Setup Both Step-by-Step)
echo  [0] Back to Main Menu
echo.
echo ================================================================
set "fl_opt="
set /p fl_opt="Select action [0-3]: "

if "%fl_opt%"=="1" goto SET_DA_TOKEN_ONLY
if "%fl_opt%"=="2" goto SET_TWITCH_ONLY
if "%fl_opt%"=="3" goto WIZARD_STEP1
if "%fl_opt%"=="0" goto MENU
goto FIRST_LAUNCH

:SET_DA_TOKEN_ONLY
cls
echo ================================================================
echo              STEP 1: SET DONATIONALERTS TOKEN
echo ================================================================
echo.
echo Paste widget token from your DonationAlerts widget link.
echo Example link: .../alerts?group_id=1^&token=YOUR_TOKEN
echo.
set "new_token="
set /p new_token="Paste DA token (or press Enter to cancel): "

if not "%new_token%"=="" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='config.js'; if (Test-Path $f) { $t=Get-Content $f -Raw; $t=$t -replace \"da_token:\s*'[^']*'\", \"da_token: '%new_token%'\"; [System.IO.File]::WriteAllText($f, $t, [System.Text.Encoding]::UTF8) }"
    echo.
    echo [OK] DonationAlerts token updated!
    ping 127.0.0.1 -n 2 >nul
)
goto FIRST_LAUNCH

:SET_TWITCH_ONLY
cls
echo ================================================================
echo              STEP 2: SET TWITCH CHANNEL NAME
echo ================================================================
echo.
set "new_channel="
set /p new_channel="Enter Twitch channel name (e.g. thecripl): "

if not "%new_channel%"=="" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='config.js'; if (Test-Path $f) { $t=Get-Content $f -Raw; $t=$t -replace \"channel:\s*'[^']*'\", \"channel: '%new_channel%'\"; [System.IO.File]::WriteAllText($f, $t, [System.Text.Encoding]::UTF8) }"
    echo.
    echo [OK] Twitch channel updated!
    ping 127.0.0.1 -n 2 >nul
)
goto FIRST_LAUNCH

:WIZARD_STEP1
cls
echo ================================================================
echo       WIZARD STEP 1/2: SET DONATIONALERTS TOKEN
echo ================================================================
echo.
echo Paste widget token from your DonationAlerts widget link.
echo Example link: .../alerts?group_id=1^&token=YOUR_TOKEN
echo.
set "w_token="
set /p w_token="Paste DA token (or press Enter to skip): "

if not "%w_token%"=="" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='config.js'; if (Test-Path $f) { $t=Get-Content $f -Raw; $t=$t -replace \"da_token:\s*'[^']*'\", \"da_token: '%w_token%'\"; [System.IO.File]::WriteAllText($f, $t, [System.Text.Encoding]::UTF8) }"
    echo [OK] Token saved.
)

echo.
echo ================================================================
echo       WIZARD STEP 2/2: SET TWITCH CHANNEL NAME
echo ================================================================
echo.
set "w_channel="
set /p w_channel="Enter Twitch channel name (or press Enter to skip): "

if not "%w_channel%"=="" (
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$f='config.js'; if (Test-Path $f) { $t=Get-Content $f -Raw; $t=$t -replace \"channel:\s*'[^']*'\", \"channel: '%w_channel%'\"; [System.IO.File]::WriteAllText($f, $t, [System.Text.Encoding]::UTF8) }"
    echo [OK] Channel saved.
)

echo.
echo [SUCCESS] Setup wizard completed!
ping 127.0.0.1 -n 2 >nul
goto MENU

:OPEN_TEST
cls
echo Launching test.html in default browser...
start "" "test.html"
ping 127.0.0.1 -n 2 >nul
goto MENU

:OPEN_OBS
cls
echo Launching index.html for OBS...
start "" "index.html"
ping 127.0.0.1 -n 2 >nul
goto MENU

:START_BRIDGE
cls
if not exist "bridge\server.js" (
    echo [ERROR] File bridge\server.js was not found!
    echo Please make sure the folder 'bridge' and 'server.js' exist.
    pause
    goto MENU
)

echo Starting DonationAlerts Bridge in a new window...
start "DDos_war DA Bridge" cmd /k "chcp 65001 >nul && cd /d "%~dp0bridge" && (if not exist "node_modules\ws" (echo Installing dependencies... & npm install ws puppeteer)) && node server.js"
ping 127.0.0.1 -n 2 >nul
goto MENU

:CHECK_FILES
cls
echo ================================================================
echo                 CHECKING PROJECT INTEGRITY
echo ================================================================
echo.

set "missing_count=0"

call :VERIFY_FILE "index.html"
call :VERIFY_FILE "test.html"
call :VERIFY_FILE "config.js"
call :VERIFY_FILE "media\style.css"
call :VERIFY_FILE "media\blacklist.js"
call :VERIFY_FILE "logic\sound-manager.js"
call :VERIFY_FILE "logic\text-renderer.js"
call :VERIFY_FILE "logic\rally-renderer.js"
call :VERIFY_FILE "logic\rally-manager.js"
call :VERIFY_FILE "logic\event-manager.js"
call :VERIFY_FILE "logic\walker.js"
call :VERIFY_FILE "logic\crowd-manager.js"
call :VERIFY_FILE "logic\twitch-service.js"
call :VERIFY_FILE "logic\donation-service.js"
call :VERIFY_FILE "logic\main.js"
call :VERIFY_FILE "bridge\server.js"

echo.
echo --- Audio assets check ---
if not exist "media\sounds" mkdir "media\sounds" 2>nul
call :VERIFY_SOUND "media\sounds\arrows.mp3"
call :VERIFY_SOUND "media\sounds\meteor.mp3"
call :VERIFY_SOUND "media\sounds\kaspersky.mp3"

echo.
if "%missing_count%"=="0" (
    echo [SUCCESS] All required core files are present!
)
if not "%missing_count%"=="0" (
    echo [WARNING] Missing files detected: %missing_count%
)
echo.
pause
goto MENU

:VERIFY_FILE
if exist "%~1" (
    echo  [OK] %~1
    exit /b
)
echo  [MISSING] %~1
set /a missing_count+=1
exit /b

:VERIFY_SOUND
if exist "%~1" (
    echo  [OK] %~1
    exit /b
)
echo  [INFO] %~1 not found (Web Audio synth active)
exit /b

:SHOW_CONFIG
cls
echo ================================================================
echo                     CONFIG.JS CONTENT
echo ================================================================
echo.
if exist "config.js" type "config.js"
if not exist "config.js" echo config.js not found!
echo.
echo ================================================================
pause
goto MENU

:EDIT_CONFIG
cls
echo Opening config.js in Notepad...
if not exist "config.js" (
    echo [ERROR] config.js not found!
    pause
    goto MENU
)
start notepad "config.js"
goto MENU

:EDIT_BLACKLIST
cls
echo Opening media\blacklist.txt in Notepad...
if not exist "media\blacklist.txt" echo. > "media\blacklist.txt"
start notepad "media\blacklist.txt"
goto MENU

:QUIT
cls
exit