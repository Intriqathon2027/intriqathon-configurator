# intriqathon-configurator : deploy script

Recuperer la cle publique ssh:
cat ~/.ssh/id_ed25519.pub

Si besoin d'en generer une:
ssh-keygen -t ed25519 -C "login@example.com"


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