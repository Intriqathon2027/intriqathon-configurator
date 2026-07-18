#!/bin/bash
docker compose down -v
docker rmi -f $(docker images -aq)