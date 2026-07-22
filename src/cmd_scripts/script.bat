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

echo [SCRIPT] Demarrage du script de deploiement

if "%~1"=="" (
    echo Usage : %~nx0 ^<IPV4^> [source_dir]
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

set "SSH_OPTS=-o StrictHostKeyChecking=no -o UserKnownHostsFile=NUL -o BatchMode=no"

echo === Deploiement vers %IPV4% ===
echo     Dossier source : %SOURCE_DIR%

REM -- Etape 1 : copie des fichiers ----------------------------
echo.
echo [1/2] Copie des fichiers vers le serveur distant...
echo [SCRIPT] Lancement scp vers root@%IPV4%...

scp -r %SSH_OPTS% "%SOURCE_DIR%/" "root@%IPV4%:~/hackathon-deploy"
set ERR=%ERRORLEVEL%
echo [SCRIPT] scp termine avec le code %ERR%
if %ERR% NEQ 0 (
    echo ERREUR : la copie des fichiers a echoue avec le code d'erreur %ERR%.
    exit /b %ERR%
)

REM -- Etape 2 : execution distante du script d'installation ---
echo.
echo [2/2] Execution de install_hackathon.sh sur le serveur distant...
echo [SCRIPT] Connexion SSH a root@%IPV4%...

ssh %SSH_OPTS% "root@%IPV4%" "cd hackathon-deploy && sed -i 's/\r$//' install_hackathon.sh && chmod +x install_hackathon.sh && ./install_hackathon.sh"
set ERR=%ERRORLEVEL%
echo [SCRIPT] ssh termine avec le code %ERR%
if %ERR% NEQ 0 (
    echo ERREUR : l'execution distante a echoue avec le code d'erreur %ERR%.
    exit /b %ERR%
)

echo.
echo === Deploiement termine avec succes ! ===

endlocal
