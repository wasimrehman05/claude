#!/bin/bash

# Claude-like AI Coding Agent - Development Startup Script
# This script starts both backend and frontend servers for development

echo "🚀 Starting Claude-like AI Coding Agent..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+ and try again.${NC}"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}❌ Node.js version 18+ is required. Current version: $(node -v)${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Please run this script from the project root directory${NC}"
    exit 1
fi

# Check for Gemini API key
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  No .env file found in backend directory${NC}"
    echo -e "${BLUE}Creating .env file from template...${NC}"
    cp backend/env.example backend/.env
    echo ""
    echo -e "${YELLOW}📝 Please edit backend/.env and add your GEMINI_API_KEY${NC}"
    echo -e "${BLUE}You can get a free API key at: https://makersuite.google.com/app/apikey${NC}"
    echo ""
    read -p "Press Enter after you've added your API key to continue..."
fi

# Install dependencies if node_modules don't exist
if [ ! -d "backend/node_modules" ]; then
    echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
    cd backend
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install backend dependencies${NC}"
        exit 1
    fi
    cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${BLUE}📦 Installing frontend dependencies...${NC}"
    cd frontend
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
        exit 1
    fi
    cd ..
fi

# Build backend
echo -e "${BLUE}🔨 Building backend...${NC}"
cd backend
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Backend build failed${NC}"
    exit 1
fi
cd ..

# Build frontend
echo -e "${BLUE}🔨 Building frontend...${NC}"
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi
cd ..

echo ""
echo -e "${GREEN}✅ All builds completed successfully!${NC}"
echo ""
echo -e "${BLUE}🚀 Starting servers...${NC}"
echo -e "${YELLOW}Backend will run on: http://localhost:4000${NC}"
echo -e "${YELLOW}Frontend will run on: http://localhost:3000${NC}"
echo ""
echo -e "${BLUE}Press Ctrl+C to stop both servers${NC}"
echo ""

# Function to handle cleanup when script is interrupted
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down servers...${NC}"
    jobs -p | xargs -r kill
    exit 0
}

# Set trap to cleanup on script termination
trap cleanup SIGINT SIGTERM

# Start backend in background
cd backend
npm run dev &
BACKEND_PID=$!

# Start frontend in background
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Wait for user to interrupt
wait
