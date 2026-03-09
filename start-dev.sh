#!/bin/bash

# LibColab - Local Development Startup Script
# This script starts both backend and frontend servers for local development

set -e  # Exit on error

# Get the script's directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

echo "🚀 LibColab - Local Development Environment"
echo "==========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
print_info "Checking prerequisites..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js from https://nodejs.org/"
    exit 1
fi
print_success "Node.js found: $(node --version)"

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed. Please install Python 3 from https://www.python.org/"
    exit 1
fi
print_success "Python 3 found: $(python3 --version)"

# Check if MongoDB is accessible
print_info "Checking MongoDB connection..."
if nc -z localhost 27017 2>/dev/null; then
    print_success "MongoDB is running on localhost:27017"
else
    print_warning "MongoDB doesn't appear to be running on localhost:27017"
    echo "   To start MongoDB:"
    echo "   • macOS: brew services start mongodb-community"
    echo "   • Linux: sudo systemctl start mongodb"
    echo "   • Or configure MongoDB Atlas in backend/.env"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Operation cancelled"
        exit 1
    fi
fi

echo ""
print_info "Starting services..."
echo ""

# Start backend in the background
print_info "Starting backend server..."
cd "$PROJECT_ROOT/backend"

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    print_warning "Virtual environment not found. Creating..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install requirements if needed
if [ ! -f "requirements_installed.txt" ] || [ "requirements.txt" -nt "requirements_installed.txt" ]; then
    print_info "Installing Python dependencies..."
    pip install -q -r requirements.txt
    touch requirements_installed.txt
fi

# Start backend
print_info "Launching backend server on http://localhost:8000..."
python3 server.py &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait a moment for backend to start
sleep 2

# Check if backend started successfully
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    print_error "Failed to start backend server"
    exit 1
fi
print_success "Backend is running (PID: $BACKEND_PID)"

# Start frontend
print_info "Starting frontend server..."
cd "$PROJECT_ROOT/frontend"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_warning "node_modules not found. Installing dependencies..."
    npm install
fi

# Start frontend
print_info "Launching frontend server on http://localhost:3000..."
npm start &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo ""
echo "========================================="
print_success "All services started successfully!"
echo "========================================="
echo ""
echo "📍 Services are available at:"
echo "   • Frontend:     http://localhost:3000"
echo "   • Backend API:  http://localhost:8000"
echo "   • API Docs:     http://localhost:8000/docs"
echo ""
echo "📝 To stop services, press Ctrl+C or run in another terminal:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "💡 Tips:"
echo "   • Check backend logs in the first terminal"
echo "   • Check frontend logs in the second terminal"
echo "   • API documentation: http://localhost:8000/docs"
echo "   • Frontend will auto-reload on code changes"
echo ""

# Keep script running and allow graceful shutdown
trap 'print_warning "Shutting down..."; kill $BACKEND_PID $FRONTEND_PID; exit' SIGINT SIGTERM

# Wait for all background jobs
wait
