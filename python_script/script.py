#!/usr/bin/env python3
"""
Script de déploiement automatisé pour hackathon-deploy.
Reproduit les étapes du README.md :
  1. Copie des fichiers vers le serveur distant (rsync sur Linux, scp sur Windows)
  2. Connexion SSH au serveur
  3. Exécution de install_hackathon.sh sur le serveur distant
"""

import argparse
import os
import platform
import subprocess
import sys


def run_cmd(cmd: list[str], *, check: bool = True, **kwargs):
    """Exécute une commande et affiche sa sortie en temps réel."""
    print(f"\n>>> {' '.join(cmd)}")
    result = subprocess.run(cmd, check=check, **kwargs)
    return result


def resolve_deploy_dir() -> str:
    """
    Remonte depuis le répertoire courant ou le répertoire du script
    pour trouver un dossier contenant les fichiers de déploiement
    (par exemple un dossier 'hackathon-deploy' ou le dossier parent du projet).
    Par défaut, on utilise le répertoire courant.
    """
    return os.getcwd()


def copy_files(ipv4: str, source_dir: str):
    """
    Copie les fichiers du dossier source vers le serveur distant.
    Utilise rsync sur Linux/macOS et scp sur Windows.
    L'option StrictHostKeyChecking=no évite le prompt interactif
    « Are you sure you want to continue connecting (yes/no)? ».
    """
    ssh_opts = "-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
    dest = f"root@{ipv4}:~/hackathon-deploy"

    if platform.system() != "Windows":
        # Linux / macOS  →  rsync
        cmd = [
            "rsync", "-avz", "--progress",
            "-e", f"ssh {ssh_opts}",
            f"{source_dir}/", dest
        ]
    else:
        # Windows  →  scp
        cmd = [
            "scp", "-r",
            "-o", "StrictHostKeyChecking=no",
            "-o", "UserKnownHostsFile=/dev/null",
            f"{source_dir}/", dest
        ]

    run_cmd(cmd)


def remote_exec(ipv4: str):
    """
    Se connecte en SSH au serveur et exécute les commandes de déploiement :
      cd hackathon-deploy && chmod +x install_hackathon.sh && ./install_hackathon.sh
    StrictHostKeyChecking=no gère automatiquement le prompt « yes/no »
    lié à la vérification de l'empreinte du serveur.
    """
    remote_commands = (
        "cd hackathon-deploy && "
        "chmod +x install_hackathon.sh && "
        "./install_hackathon.sh"
    )

    cmd = [
        "ssh",
        "-o", "StrictHostKeyChecking=no",
        "-o", "UserKnownHostsFile=/dev/null",
        f"root@{ipv4}",
        remote_commands
    ]

    run_cmd(cmd)


def main():
    parser = argparse.ArgumentParser(
        description="Déploiement automatisé vers un serveur distant."
    )
    parser.add_argument(
        "ipv4",
        help="Adresse IPv4 du serveur cible (ex: 192.168.1.42)"
    )
    parser.add_argument(
        "--source-dir",
        default=None,
        help=(
            "Chemin vers le dossier local contenant les fichiers à déployer. "
            "Par défaut : le répertoire courant."
        )
    )

    args = parser.parse_args()
    ipv4 = args.ipv4
    source_dir = args.source_dir or resolve_deploy_dir()

    print(f"=== Déploiement vers {ipv4} ===")
    print(f"    Dossier source : {source_dir}")

    # Étape 1 : copie des fichiers
    print("\n[1/2] Copie des fichiers vers le serveur distant...")
    copy_files(ipv4, source_dir)

    # Étape 2 : exécution distante du script d'installation
    print("\n[2/2] Exécution de install_hackathon.sh sur le serveur distant...")
    remote_exec(ipv4)

    print("\n=== Déploiement terminé avec succès ! ===")


if __name__ == "__main__":
    main()
