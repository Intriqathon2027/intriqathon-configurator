@echo off
REM ============================================================
REM Script pour redémarrer le conteneur discord_bot via SSH
REM
REM Usage : restart_docker.bat <IPV4>
REM   IPV4       : adresse IPv4 du serveur cible
REM ============================================================

setlocal

echo [SCRIPT] Demarrage du script de redemarrage de docker

if "%~1"=="" (
    echo Usage : %~nx0 ^<IPV4^>
    exit /b 1
)

set "IPV4=%~1"

echo [SCRIPT] IPV4 = %IPV4%

set "SSH_OPTS=-o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL -o BatchMode=no"

echo === Redemarrage sur %IPV4% ===

REM -- Etape 1 : execution distante du script d'installation ---
echo.
echo [1/1] Execution de docker restart sur le serveur distant...
echo [SCRIPT] Connexion SSH a root@%IPV4%...

ssh %SSH_OPTS% "root@%IPV4%" "docker restart discord_bot"
set ERR=%ERRORLEVEL%
echo [SCRIPT] ssh termine avec le code %ERR%
if %ERR% NEQ 0 (
    echo ERREUR : l'execution distante a echoue avec le code d'erreur %ERR%.
    exit /b %ERR%
)

echo.
echo === Redemarrage de Docker termine avec succes ! ===

endlocal
