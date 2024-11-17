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

# Open port 25 access for grading server.
# Note that iptables commands are not automatically saved on server restart.
ip6tables -I OUTPUT -p tcp -m tcp --dport 25 -j DROP
iptables -t nat -I OUTPUT -o ens3 -p tcp -m tcp --dport 25 -j DNAT --to-destination 130.245.136.123:11587

# Mount Volume to Image
mkdir /mnt/media
mount /dev/vdb /mnt/media

# Add ssh keys of the gang >:)

# Destination authorized_keys file
AUTH_KEYS_FILE="$HOME/.ssh/authorized_keys"

# Hardcoded public keys
PUBLIC_KEYS=(
    "ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAnExampleKey1 user1@example.com"
    "ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAnExampleKey2 user2@example.com"
    "ssh-rsa AAAAB3NzaC1yc2EAAAABIwAAAQEAnExampleKey3 user3@example.com"
)

# Ensure authorized_keys file exists with the correct permissions
if [ ! -f "$AUTH_KEYS_FILE" ]; then
    echo "Authorized keys file not found. Creating it..."
    touch "$AUTH_KEYS_FILE"
    chmod 600 "$AUTH_KEYS_FILE"
fi

# Add each public key if it's not already present
for key in "${PUBLIC_KEYS[@]}"; do
    if grep -qF "$key" "$AUTH_KEYS_FILE"; then
        echo "Key for $(echo "$key" | awk '{print $NF}') is already present. Skipping..."
    else
        echo "Adding key for $(echo "$key" | awk '{print $NF}')..."
        echo "$key" >> "$AUTH_KEYS_FILE"
    fi
done

# Ensure the final permissions are correct
chmod 600 "$AUTH_KEYS_FILE"

echo "Public keys have been added successfully."
