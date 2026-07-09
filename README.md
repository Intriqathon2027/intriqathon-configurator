# intriqathon-configurator : POC for deploy script

## deploy commands :
`cd /path/to/hackathon-deploy`

### Linux:
`rsync -avz --progress ./ root@<IPV4>:~/hackathon-deploy`
### Windows:
`scp -r ./ root@<IPV4>:~/hackathon-deploy`

`ssh root@<IPV4>`

-> yes or no prompt pour add aux IP reconnues (ou alors ça explose et dans ce cas il faut supprimer les IP reconnues dans /.ssh/known_hosts et reessayer)

`cd hackathon-deploy`
`chmod +x install_hackathon.sh`
`./install_hackathon.sh`

## Python VS Bash + Powershell :
Python est plus simple à utiliser car il gère lui même les différentes plateformes, mais il faut l'avoir d'installé sur la machine de l'utilisateur.

Bash + Powershell requiert donc moins, vu qu'il n'y a besoin d'aucune installation mais, cela demande plus de code/de checks dans le client Electron.