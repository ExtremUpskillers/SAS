
#!/bin/bash

# Start Python backend
echo "Starting Python Backend..."
cd backend && python app.py &
BACKEND_PID=$!

# Wait a moment for backend to initialize
sleep 2

# Start web interface
echo "Starting Web Interface..."
node server.js &
WEB_PID=$!

echo "Smart Attendance System is running!"
echo "Web interface: http://0.0.0.0:3000"
echo "Python backend: http://0.0.0.0:8000"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $WEB_PID; exit" INT
wait
