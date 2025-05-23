#!/bin/bash

# Variables
REPO_URL="git@github.com:cbremseth/synchronous-communication-platform.git"
CLONE_DIR="synchronous-communication-platform"

# Get the server's public IP address
SERVER_IP=$(curl -4 ifconfig.me)

# Function to display an error and exit
function error_exit {
    echo "[ERROR] $1" >&2
    exit 1
}

# Function to create default environment file
function create_default_env {
    cat > .env << EOL
# Node Environment
APP_ENV=production

# MongoDB
MONGO_USER=admin
MONGO_PASSWORD=password

# Backend
BACKEND_PORT=5001
MONGODB_URI=mongodb://\${MONGO_USER}:\${MONGO_PASSWORD}@mongodb:27017/

# Frontend
FRONTEND_PORT=3000
NEXT_PUBLIC_API_URL=http://${SERVER_IP}:5001

# Development Environment
NEXT_TELEMETRY_DISABLED=1

# NextAuth
NEXTAUTH_URL=http://${SERVER_IP}:3000
NEXTAUTH_SECRET="e9HI2RipS2McD4jwPjSoWvuhrbifIiC1NQk3/PHfK08="
EOL
}

# Check if Git is installed
if ! command -v git &>/dev/null; then
    echo "[INFO] Installing Git..."
    apt-get update
    apt-get install -y git || error_exit "Failed to install Git."
fi

# Install Docker if not installed
if ! command -v docker &>/dev/null; then
    echo "[INFO] Docker not found. Installing Docker..."
    # Install dependencies
    apt-get update
    apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release || error_exit "Failed to install Docker dependencies."

    # Add Docker's official GPG key
    mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg

    # Set up the repository
    echo \
        "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
        $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker Engine
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin || error_exit "Failed to install Docker."

    # Start Docker service
    systemctl start docker || error_exit "Failed to start Docker service."
    systemctl enable docker || error_exit "Failed to enable Docker service."
fi

# Check if Docker is running
if ! docker info &>/dev/null; then
    systemctl start docker || error_exit "Failed to start Docker service."
fi

# Check if Docker Compose is installed
if ! command -v docker compose &>/dev/null; then
    error_exit "Docker Compose is not available. Please check Docker installation."
fi

# Install standalone docker-compose for compatibility
if ! command -v docker-compose &>/dev/null; then
    echo "[INFO] Installing standalone docker-compose for compatibility..."
    curl -L "https://github.com/docker/compose/releases/download/v2.23.3/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose || error_exit "Failed to set permissions on docker-compose."
    echo "[INFO] Standalone docker-compose installed successfully."
fi

# Clone the repository
if [ -d "$CLONE_DIR" ]; then
    echo "[INFO] Removing existing repository..."
    rm -rf "$CLONE_DIR" || error_exit "Failed to remove existing repository."
fi

echo "[INFO] Cloning the repository..."
git clone "$REPO_URL" "$CLONE_DIR" || error_exit "Failed to clone the repository."
cd "$CLONE_DIR" || error_exit "Failed to navigate to the repository directory."

# Set up environment variables
echo "[INFO] Setting up environment variables..."
PARENT_DIR="$(cd .. && pwd)"

# Check if environment file exists in parent directory
if [ -f "$PARENT_DIR/.env" ]; then
    echo "[INFO] Using environment file from parent directory..."
    cp "$PARENT_DIR/.env" ".env" || error_exit "Failed to copy .env"

    # Update the IP-specific variables in the existing .env
    sed -i "s|^NEXTAUTH_URL=.*|NEXTAUTH_URL=http://${SERVER_IP}:3000|g" .env
    sed -i "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=http://${SERVER_IP}:5001/api|g" .env
else
    echo "[INFO] Creating default environment file..."
    create_default_env
fi

# Run Docker Compose
echo "[INFO] Starting Docker Compose..."
# Stop and remove existing containers
docker-compose down --volumes --remove-orphans || true

# Start services
echo "[INFO] Starting services..."
docker-compose up -d

# Wait for containers to be ready
echo "[INFO] Waiting for containers to be ready..."
attempt=1
max_attempts=30
until docker-compose ps | grep -q "Up" || [ $attempt -gt $max_attempts ]; do
    echo "Waiting for containers to be ready... (Attempt $attempt/$max_attempts)"
    sleep 5
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    error_exit "Containers failed to start after $max_attempts attempts"
fi

# Additional wait to ensure services are fully initialized
sleep 10

echo "[SUCCESS] Project deployed successfully!"
echo "Frontend URL: http://${SERVER_IP}:3000"
echo "Backend API URL: http://${SERVER_IP}:5001/api"
echo "WebSocket URL: http://${SERVER_IP}:5001"
