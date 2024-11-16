#!/bin/bash

# Update system
sudo apt-get update

# Install Docker and Docker Compose
sudo apt-get install -y docker.io
sudo apt-get install -y docker-compose

# Install curl
sudo apt-get install -y curl

# Install nvm and Node.js LTS
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
source ~/.nvm/nvm.sh  # Load NVM for current session
nvm install --lts

# Install dependencies
npm install

# Install ffmpeg
sudo apt-get install -y ffmpeg

# Install redis client for testing
sudo apt install -y redis-tools

# Open port 25 access for grading server.
# Note that iptables commands are not automatically saved on server restart.
ip6tables -I OUTPUT -p tcp -m tcp --dport 25 -j DROP
iptables -t nat -I OUTPUT -o ens3 -p tcp -m tcp --dport 25 -j DNAT --to-destination 130.245.136.123:11587

# Mount Volume to Image
mkdir /mnt/media
mount /dev/vdb /mnt/media


