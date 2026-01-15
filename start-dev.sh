#!/bin/bash

# FoodPlaner - Full Stack Development Server Starter

echo "🚀 Starting FoodPlaner Full Stack Application..."
echo ""

# Start backend on port 3001
echo "📦 Starting Backend Server (port 3001)..."
cd /home/bay/Documents/FoodPlaner/backend
npm run dev &
BACKEND_PID=$!
echo "✓ Backend started (PID: $BACKEND_PID)"

# Give backend time to start
sleep 2

# Start frontend on port 3000
echo ""
echo "🎨 Starting Frontend Server (port 3000)..."
cd /home/bay/Documents/FoodPlaner/nextjs
npm run dev &
FRONTEND_PID=$!
echo "✓ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "==========================================="
echo "✓ FoodPlaner is now running!"
echo "==========================================="
echo ""
echo "Frontend:  http://localhost:3000"
echo "Backend:   http://localhost:3001"
echo "WebSocket: ws://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for interrupt
wait
