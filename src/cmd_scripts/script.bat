@echo off
REM ============================================================
REM Script de deploiement automatise pour hackathon-deploy.
REM Reproduit les etapes du README.md :
REM   1. Copie des fichiers vers le serveur distant via scp
REM   2. Connexion SSH et execution de install_hackathon.sh
REM
REM Usage : script.bat <IPV4> [source_dir]
REM   IPV4       : adresse IPv4 du serveur cible
REM   source_dir : chemin vers le dossier a deployer (defaut : repertoire courant)
REM ============================================================

setlocal

echo [SCRIPT] Starting deployment script

if "%~1"=="" (
    echo Usage: %~nx0 ^<IPV4^> [source_dir]
    exit /b 1
)

set "IPV4=%~1"

if "%~2"=="" (
    set "SOURCE_DIR=."
) else (
    set "SOURCE_DIR=%~2"
)

echo [SCRIPT] IPV4 = %IPV4%
echo [SCRIPT] SOURCE_DIR = %SOURCE_DIR%

set "SSH_OPTS=-o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL -o BatchMode=yes"
if defined SSH_KEY_PATH (
    echo [SCRIPT] Using SSH key: %SSH_KEY_PATH%
    set "SSH_OPTS=%SSH_OPTS% -i "%SSH_KEY_PATH%""
)

echo === Deployment to %IPV4% ===
echo     Source directory: %SOURCE_DIR%

REM -- Etape 1 : copie des fichiers ----------------------------
echo.
echo [1/2] Copying files to remote server...
echo [SCRIPT] Launching scp to root@%IPV4%...

scp -r %SSH_OPTS% "%SOURCE_DIR%/" "root@%IPV4%:~/hackathon-deploy"
set ERR=%ERRORLEVEL%
echo [SCRIPT] scp finished with code %ERR%
if %ERR% NEQ 0 (
    echo ERROR: File copy failed with error code %ERR%.
    exit /b %ERR%
)

REM -- Etape 2 : execution distante du script d'installation ---
echo.
echo [2/2] Running install_hackathon.sh on remote server...
echo [SCRIPT] SSH connection to root@%IPV4%...

ssh %SSH_OPTS% "root@%IPV4%" "cd hackathon-deploy && sed -i 's/\r$//' install_hackathon.sh && chmod +x install_hackathon.sh && ./install_hackathon.sh"
set ERR=%ERRORLEVEL%
echo [SCRIPT] ssh finished with code %ERR%
if %ERR% NEQ 0 (
    echo ERROR: Remote execution failed with error code %ERR%.
    exit /b %ERR%
)

echo.
echo === Deployment completed successfully! ===

endlocal
