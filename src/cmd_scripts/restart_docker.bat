@echo off
REM ============================================================
REM Script pour redémarrer le conteneur discord_bot via SSH
REM
REM Usage : restart_docker.bat <IPV4>
REM   IPV4       : adresse IPv4 du serveur cible
REM ============================================================

setlocal

echo [SCRIPT] Starting docker restart script

if "%~1"=="" (
    echo Usage: %~nx0 ^<IPV4^>
    exit /b 1
)

set "IPV4=%~1"

echo [SCRIPT] IPV4 = %IPV4%

set "SSH_OPTS=-o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL -o BatchMode=no"
if defined SSH_KEY_PATH (
    echo [SCRIPT] Using SSH key: %SSH_KEY_PATH%
    set "SSH_OPTS=%SSH_OPTS% -i "%SSH_KEY_PATH%""
)

echo === Restarting on %IPV4% ===

REM -- Etape 1 : execution distante du script d'installation ---
echo.
echo [1/1] Running docker restart on remote server...
echo [SCRIPT] SSH connection to root@%IPV4%...

ssh %SSH_OPTS% "root@%IPV4%" "docker restart discord_bot"
set ERR=%ERRORLEVEL%
echo [SCRIPT] ssh finished with code %ERR%
if %ERR% NEQ 0 (
    echo ERROR: Remote execution failed with error code %ERR%.
    exit /b %ERR%
)

echo.
echo === Docker restart completed successfully! ===

endlocal
