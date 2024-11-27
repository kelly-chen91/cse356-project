#!/bin/bash

# Add Docker's official GPG key:
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl 
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update -y

sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo service docker start

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
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIL9Wn9mifPDNTMoISHr7uqu2j3jeZ+hJsEk5GAsghtxN gdgzl@DESKTOP-7H9VUBL"
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIFax/E1Pm5LKofeg4GhnsF7WwHmWiSfijGXgIg+7OxYh lingzhenting@gmail.com"
    "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMov30nGLu2T2qhLH8TcIPUOToldnrU5VtbwI/prAY1j kellychen966@gmail.com"
    "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDlDw3Af3Jy9IvgOvY3RNpjUuatYqu6QGrPFTKq0cIidg11UM1Lkaz3rw3oLxiilx1DDj9gtvu+BUftgawcZ8AYHIXH0asZ0wpocuRIpZpYCCNRPCxQ1I8V8Bm6UJW7mRi0q8nSpmtKUmyqgEQgPl7qGeZ+z8fms9QzFD8+aT+DSp5JxEsBkL9nA3p2HCk4LM/aD8EAGfC6LOnApBKTUgxYjqc4QEzj4m3In78V2amIJREowwoqzBIOSSVEnVNtJPlB263sXVCqcB3Oj2h7ZFMcJC/7eTH0fWNL+G9St2vHdc000nVj+gKbTmpuGd4OOVeXwJuxGK9KxpW1lrF0i/0qODbXXJ4vmz5hXslRGsyF7v5qDiKCFYWOSqtvMDY6+CizkGS7ksWRRE2uIel1jWcbkPrzlC8kriivQNfdplSgNxI+YyZwyEVDtHCLdt7vLDMF+R7qQhB5xB9tp0sNKvZGznflsRO+ZXfDxf61FZMVC7Cob1D1fFm4ntF0vBvxJg0= zhenb@DESKTOP-TR09I6H"
    "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCyfQzyq0RUB5IXGRfpdMKWHPJ9jFTXfpxgbANsnJzXu5OnAiw8F1nG1unJNK+LycjwI8m5BfqxpBIwE4qnxu0CL66sHnxMywSmMaKNabiOiLArR84pws0fm6K2bhRyLqtcJiUTbvX2FH6qfYdMfbZNBI1mGDx1DnJTO640/ZCLtGBf35ZiD7A0sua3GT8zg0ukgnBnzK8srWotKz2piYvXa7T8zVyzbZePHrbm1dxORmzLhbH8hBt+vfQ6t10tuqWLu7pUpTT+UUL6S5vvuQ0gH7W2hGR17ZgzvBZbPo6ordRRT5CO47FhEC/oj8gId91gucMkWD8ZihGADCI6W7L63tzSWqkOh3MkvhsKqC7+fl7hHpQzLGJYlyI6LUnhy5nCtFpJl/tLkvHxFrzCYD0OVWsD53uAxqwLuH8zFpdj+MVYJFoQgUVhRZZHv/4uKxvBpuo4PZ4OTweWEzgO5yhx3yrIaerVxlvl2nbMr16moRfaY/X7frc833UCZFJ1F+8= yao cheng 2@DESKTOP-VP5Q3FJ"
    "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQC7ush+J2U/aA+MUopeZkzheLxK+0k7idNNslrCPIFb4IByHMRCOdZlBi8MlG3IaHRx2N2DnFdgDyhx+1Lj8VDewR6BLauPMHSYUJyRFm34Sc0DzXzHHK2SmwzHGxI8ZS5Y7+bbpWg/+ThX2Ca0Q0UXJs7h0Ehi64gjNa/+XVhfNm3TEFEH1cHBRA3piEPxyo5A9gSOns/JTPrsaos+rr81ZjcurGhM3xouCLgqMP1CmYRHzKEWjih0qUA6e2jVDXQmKtouXzTNPTerHcIeovcty60t0MyHpbk7JaEegXyRI0xq/vMK7uyUoRmeVuRDXwiMXsyy9/cDUqrbsb6QoyJHS0wbLMLNinXVO15KFafPhLPU9/Hp+7O8+D8JNIHLvQvlPYpGkv7zWdyTlX4dbsRT54w8yM910HhbGEahs+G0l0lvxG1gOkwTaF1++3v8VGHDb+kVRyYWep7WGsyHaQnPVA1IlhTxFSue7Dwz4zbxC/4aIG5ihBzuAzXrBBNKmFc= kelly@DESKTOP-OFQFD6D"
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
