# Synchronous Communication Platform

A real-time communication platform featuring chat rooms, direct messaging, file sharing, and more. Similar to applications like Slack or Discord, this platform enables teams to collaborate effectively with both synchronous and asynchronous communication tools.

## Features

- **Real-time Chat**: Instant messaging with WebSocket integration
- **User Authentication**: Secure signup, login, and profile management
- **Channel Management**: Create, edit, and archive chat channels
- **File Sharing**: Upload and share files with configurable size limits per channel
- **Rich Message Features**:
  - Message deletion
  - @mentions and notifications
  - Emoji reactions (including custom emoji support)
  - Message history and search
- **User Status**: Set and display online/busy/offline status

## Technologies Used

### Frontend

- Next.js / React
- TypeScript
- Tailwind CSS
- Socket.io Client
- Emoji Mart

### Backend

- Node.js with Express
- Socket.io for WebSockets
- MongoDB with Mongoose
- GridFS for file storage
- JWT for authentication

## Installation

### Prerequisites

- Node.js (v14+)
- MongoDB
- Docker (optional, for containerized deployment)

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/synchronous-communication-platform.git
   cd synchronous-communication-platform
   ```

2. Install dependencies:

3. Configure environment variables:

4. Start development servers:

   ```bash
   # Start backend (from backend directory)
   npm run dev

   # Start frontend (from frontend directory)
   npm run dev
   ```

5. For Docker deployment:
   ```bash
   docker-compose up -d
   ```

## Usage

1. Navigate to host url
2. Create an account or log in
3. Join or create channels to start communicating
4. Upload files, react to messages, and mention users with @username

## Architecture

This application follows a client-server architecture:

- **Frontend**: Next.js React application with TypeScript
- **Backend**: Express.js API server
- **Database**: MongoDB for storing users, channels, messages, and notifications
- **File Storage**: GridFS for storing and serving user-uploaded files
- **Real-time Communication**: Socket.io for bidirectional event-based communication
