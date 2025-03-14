// Attendance Marking JavaScript

// Global variables
let videoStream = null;
let faceDetectionInterval = null;
let mediaRecorder = null;
let audioChunks = [];
let audioBlob = null;
let canvasContext = null;
let audioContext = null;
let audioAnalyser = null;
let audioBars = [];
let currentStudentId = null;
let currentSessionId = null;
let isAttendanceActive = false;

// DOM elements
const videoFeed = document.getElementById('video-feed');
const canvasOverlay = document.getElementById('canvas-overlay');
const attendanceActive = document.getElementById('attendance-active');
const sessionSelect = document.getElementById('session-select');
const newSession = document.getElementById('new-session');
const createSessionBtn = document.getElementById('create-session');
const recordAttendanceVoiceBtn = document.getElementById('record-attendance-voice');
const audioBarsContainer = document.getElementById('audio-bars');
const faceStatusText = document.getElementById('face-status-text');
const voiceStatusText = document.getElementById('voice-status-text');
const faceSpinner = document.getElementById('face-spinner');
const voiceSpinner = document.getElementById('voice-spinner');
const faceRecognitionStatus = document.getElementById('face-recognition-status');
const voiceRecognitionStatus = document.getElementById('voice-recognition-status');
const attendanceList = document.getElementById('attendance-list');
const currentSessionName = document.getElementById('current-session-name');
const currentDate = document.getElementById('current-date');
const totalPresent = document.getElementById('total-present');
const refreshAttendanceBtn = document.getElementById('refresh-attendance');

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    initCamera();
    initAudioVisualizer();
    setupEventListeners();
    loadSessions();
    updateCurrentDate();
});

// Initialize camera
async function initCamera() {
    try {
        const constraints = {
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            }
        };
        
        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoFeed.srcObject = videoStream;
        
        // Setup canvas once video is loaded
        videoFeed.onloadedmetadata = () => {
            canvasOverlay.width = videoFeed.videoWidth;
            canvasOverlay.height = videoFeed.videoHeight;
            canvasContext = canvasOverlay.getContext('2d');
        };
    } catch (error) {
        console.error('Error accessing camera:', error);
        showStatusMessage('Could not access camera. Please check permissions.', 'error');
    }
}

// Initialize audio visualizer
function initAudioVisualizer() {
    // Create audio bars
    for (let i = 0; i < 30; i++) {
        const bar = document.createElement('div');
        bar.className = 'audio-bar';
        bar.style.height = '5px';
        audioBarsContainer.appendChild(bar);
        audioBars.push(bar);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Attendance active toggle
    attendanceActive.addEventListener('change', toggleAttendance);
    
    // Create session button
    createSessionBtn.addEventListener('click', createNewSession);
    
    // Session select change
    sessionSelect.addEventListener('change', selectSession);
    
    // Record voice button
    recordAttendanceVoiceBtn.addEventListener('click', toggleVoiceRecording);
    
    // Refresh attendance button
    refreshAttendanceBtn.addEventListener('click', () => {
        if (currentSessionId) {
            loadAttendanceList(currentSessionId);
        }
    });
}

// Toggle attendance system
function toggleAttendance() {
    isAttendanceActive = attendanceActive.checked;
    
    if (isAttendanceActive) {
        if (!currentSessionId) {
            showStatusMessage('Please select or create a session first', 'warning');
            attendanceActive.checked = false;
            isAttendanceActive = false;
            return;
        }
        
        // Start face detection
        startFaceDetection();
        showStatusMessage('Attendance system activated', 'success');
    } else {
        // Stop face detection
        stopFaceDetection();
        showStatusMessage('Attendance system deactivated', 'info');
    }
}

// Start face detection
function startFaceDetection() {
    if (faceDetectionInterval) {
        clearInterval(faceDetectionInterval);
    }
    
    setFaceStatus('waiting', 'Scanning...');
    setVoiceStatus('waiting', 'Waiting for face recognition...');
    
    // Start detection interval
    faceDetectionInterval = setInterval(async () => {
        try {
            // Capture current frame
            canvasContext.drawImage(videoFeed, 0, 0, canvasOverlay.width, canvasOverlay.height);
            
            // Get the image data
            const imageData = canvasContext.getImageData(0, 0, canvasOverlay.width, canvasOverlay.height);
            
            // Convert to base64
            const base64Image = canvasToBase64(canvasOverlay);
            
            // Send to backend for face detection
            const response = await fetch('http://localhost:8000/api/recognition/detect-face', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: base64Image,
                    session_id: currentSessionId
                })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Handle successful face detection
                handleFaceDetection(result);
            } else {
                // No face detected or error
                setFaceStatus('failure', result.message || 'No face detected');
                setVoiceStatus('waiting', 'Waiting for face recognition...');
                recordAttendanceVoiceBtn.disabled = true;
                drawNoFaceBoundingBox();
            }
        } catch (error) {
            console.error('Error in face detection:', error);
            setFaceStatus('failure', 'Detection error');
        }
    }, 1000); // Check every second
}

// Handle face detection result
function handleFaceDetection(result) {
    if (result.faces && result.faces.length > 0) {
        // Draw bounding boxes
        drawBoundingBoxes(result.faces);
        
        // Check if any face was recognized
        const recognizedFace = result.faces.find(face => face.recognized);
        
        if (recognizedFace) {
            // Face recognized
            setFaceStatus('success', `Recognized: ${recognizedFace.student_name}`);
            
            // Store current student for voice verification
            currentStudentId = recognizedFace.student_id;
            
            // Enable voice recording
            recordAttendanceVoiceBtn.disabled = false;
            setVoiceStatus('waiting', 'Please record your voice for verification');
        } else {
            // Face detected but not recognized
            setFaceStatus('failure', 'Face not recognized');
            setVoiceStatus('waiting', 'Waiting for face recognition...');
            recordAttendanceVoiceBtn.disabled = true;
            currentStudentId = null;
        }
    } else {
        // No faces detected
        setFaceStatus('failure', 'No face detected');
        setVoiceStatus('waiting', 'Waiting for face recognition...');
        recordAttendanceVoiceBtn.disabled = true;
        currentStudentId = null;
        drawNoFaceBoundingBox();
    }
}

// Draw bounding boxes on detected faces
function drawBoundingBoxes(faces) {
    // Clear previous drawings
    canvasContext.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
    
    faces.forEach(face => {
        const { x, y, width, height, recognized } = face;
        
        // Scale coordinates to canvas size
        const scaledX = x * canvasOverlay.width;
        const scaledY = y * canvasOverlay.height;
        const scaledWidth = width * canvasOverlay.width;
        const scaledHeight = height * canvasOverlay.height;
        
        // Set style based on recognition status
        if (recognized) {
            canvasContext.strokeStyle = '#28a745'; // Green for recognized faces
            canvasContext.fillStyle = 'rgba(40, 167, 69, 0.3)';
        } else {
            canvasContext.strokeStyle = '#dc3545'; // Red for unrecognized faces
            canvasContext.fillStyle = 'rgba(220, 53, 69, 0.3)';
        }
        
        canvasContext.lineWidth = 3;
        
        // Draw rectangle
        canvasContext.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
        canvasContext.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
        
        // Draw label if recognized
        if (recognized) {
            canvasContext.fillStyle = '#28a745';
            canvasContext.font = '16px Arial';
            canvasContext.fillText(face.student_name, scaledX, scaledY - 5);
        }
    });
}

// Draw indicator when no face is detected
function drawNoFaceBoundingBox() {
    // Clear previous drawings
    canvasContext.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
    
    // Draw red border around the entire frame
    canvasContext.strokeStyle = '#dc3545';
    canvasContext.lineWidth = 5;
    canvasContext.strokeRect(0, 0, canvasOverlay.width, canvasOverlay.height);
    
    // Draw message
    canvasContext.fillStyle = 'rgba(220, 53, 69, 0.7)';
    canvasContext.font = 'bold 24px Arial';
    canvasContext.textAlign = 'center';
    canvasContext.fillText('No Face Detected', canvasOverlay.width / 2, canvasOverlay.height / 2);
    
    // Reset text alignment
    canvasContext.textAlign = 'start';
}

// Stop face detection
function stopFaceDetection() {
    if (faceDetectionInterval) {
        clearInterval(faceDetectionInterval);
        faceDetectionInterval = null;
    }
    
    // Clear canvas
    if (canvasContext) {
        canvasContext.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height);
    }
    
    // Reset status
    setFaceStatus('inactive', 'Inactive');
    setVoiceStatus('inactive', 'Inactive');
    
    // Disable voice recording
    recordAttendanceVoiceBtn.disabled = true;
}

// Set face recognition status
function setFaceStatus(status, message) {
    switch (status) {
        case 'waiting':
            faceRecognitionStatus.className = 'recognition-status status-processing';
            faceSpinner.style.display = 'inline-block';
            break;
        case 'success':
            faceRecognitionStatus.className = 'recognition-status status-success';
            faceSpinner.style.display = 'none';
            break;
        case 'failure':
            faceRecognitionStatus.className = 'recognition-status status-failure';
            faceSpinner.style.display = 'none';
            break;
        case 'inactive':
            faceRecognitionStatus.className = 'recognition-status';
            faceSpinner.style.display = 'none';
            break;
    }
    
    faceStatusText.textContent = message;
}

// Set voice recognition status
function setVoiceStatus(status, message) {
    switch (status) {
        case 'waiting':
            voiceRecognitionStatus.className = 'recognition-status status-processing';
            voiceSpinner.style.display = 'none';
            break;
        case 'processing':
            voiceRecognitionStatus.className = 'recognition-status status-processing';
            voiceSpinner.style.display = 'inline-block';
            break;
        case 'success':
            voiceRecognitionStatus.className = 'recognition-status status-success';
            voiceSpinner.style.display = 'none';
            break;
        case 'failure':
            voiceRecognitionStatus.className = 'recognition-status status-failure';
            voiceSpinner.style.display = 'none';
            break;
        case 'inactive':
            voiceRecognitionStatus.className = 'recognition-status';
            voiceSpinner.style.display = 'none';
            break;
    }
    
    voiceStatusText.textContent = message;
}

// Toggle voice recording
async function toggleVoiceRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        // Stop recording
        mediaRecorder.stop();
        recordAttendanceVoiceBtn.textContent = 'Record Voice';
        recordAttendanceVoiceBtn.classList.remove('btn-danger');
        recordAttendanceVoiceBtn.classList.add('btn-primary');
        
        // Hide visualizer animation
        stopVisualization();
        
        // Set status to processing
        setVoiceStatus('processing', 'Processing voice...');
    } else {
        if (!currentStudentId) {
            showStatusMessage('Face must be recognized first', 'warning');
            return;
        }
        
        // Start recording
        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Setup audio context for visualization
            setupAudioVisualization(audioStream);
            
            // Setup media recorder
            mediaRecorder = new MediaRecorder(audioStream);
            
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };
            
            mediaRecorder.onstop = async () => {
                // Create blob from chunks
                audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                
                // Send to backend for verification
                await verifyVoice();
                
                // Clear chunks for next recording
                audioChunks = [];
            };
            
            // Clear previous chunks
            audioChunks = [];
            
            // Start recording
            mediaRecorder.start();
            
            // Update button
            recordAttendanceVoiceBtn.textContent = 'Stop Recording';
            recordAttendanceVoiceBtn.classList.remove('btn-primary');
            recordAttendanceVoiceBtn.classList.add('btn-danger');
            
            // Update status
            setVoiceStatus('processing', 'Recording... Speak clearly');
        } catch (error) {
            console.error('Error accessing microphone:', error);
            showStatusMessage('Could not access microphone. Please check permissions.', 'error');
        }
    }
}

// Verify voice against student record
async function verifyVoice() {
    if (!audioBlob || !currentStudentId) return;
    
    try {
        // Create form data
        const formData = new FormData();
        formData.append('voice_sample', audioBlob);
        formData.append('student_id', currentStudentId);
        formData.append('session_id', currentSessionId);
        
        // Send to backend
        const response = await fetch('http://localhost:8000/api/recognition/verify-voice', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Voice verified
            setVoiceStatus('success', 'Voice verified!');
            
            // Mark attendance
            await markAttendance();
        } else {
            // Voice not verified
            setVoiceStatus('failure', 'Voice not verified');
        }
    } catch (error) {
        console.error('Error verifying voice:', error);
        setVoiceStatus('failure', 'Verification error');
        showStatusMessage('Error verifying voice. Please try again.', 'error');
    }
}

// Mark attendance after successful verification
async function markAttendance() {
    try {
        const response = await fetch('http://localhost:8000/api/attendance/mark', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                student_id: currentStudentId,
                session_id: currentSessionId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatusMessage(`Attendance marked for ${result.student_name}!`, 'success');
            
            // Reset for next student
            currentStudentId = null;
            
            // Reload attendance list
            loadAttendanceList(currentSessionId);
        } else {
            showStatusMessage(`Failed to mark attendance: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Error marking attendance:', error);
        showStatusMessage('Error marking attendance. Please try again.', 'error');
    }
}

// Setup audio visualization
function setupAudioVisualization(stream) {
    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create analyser
    audioAnalyser = audioContext.createAnalyser();
    audioAnalyser.fftSize = 64;
    
    // Connect stream to analyser
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(audioAnalyser);
    
    // Start visualization
    visualize();
}

// Visualize audio
function visualize() {
    if (!audioAnalyser) return;
    
    const bufferLength = audioAnalyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    function draw() {
        if (!audioAnalyser) return;
        
        // Get the frequency data
        audioAnalyser.getByteFrequencyData(dataArray);
        
        // Update the bar heights
        for (let i = 0; i < audioBars.length; i++) {
            const barIndex = Math.floor(i * (bufferLength / audioBars.length));
            const barHeight = (dataArray[barIndex] / 255) * 60;
            audioBars[i].style.height = `${barHeight}px`;
        }
        
        // Call again on the next animation frame
        requestAnimationFrame(draw);
    }
    
    draw();
}

// Stop visualization
function stopVisualization() {
    if (audioContext) {
        audioContext.close();
        audioContext = null;
        audioAnalyser = null;
    }
    
    // Reset bar heights
    audioBars.forEach(bar => {
        bar.style.height = '5px';
    });
}

// Convert canvas to base64
function canvasToBase64(canvas) {
    return canvas.toDataURL('image/jpeg').split(',')[1];
}

// Load sessions
async function loadSessions() {
    try {
        const response = await fetch('http://localhost:8000/api/sessions');
        const result = await response.json();
        
        if (result.success) {
            // Clear select
            sessionSelect.innerHTML = '<option value="">Select a session</option>';
            
            // Add sessions
            result.sessions.forEach(session => {
                const option = document.createElement('option');
                option.value = session.id;
                option.textContent = `${session.name} (${formatDate(session.date)})`;
                sessionSelect.appendChild(option);
            });
        } else {
            showStatusMessage('Failed to load sessions', 'error');
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
        showStatusMessage('Error loading sessions. Please try again.', 'error');
    }
}

// Create new session
async function createNewSession() {
    const sessionName = newSession.value.trim();
    
    if (!sessionName) {
        showStatusMessage('Please enter a session name', 'warning');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:8000/api/sessions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: sessionName,
                date: new Date().toISOString().split('T')[0]
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatusMessage('Session created successfully', 'success');
            
            // Reload sessions
            await loadSessions();
            
            // Select the new session
            sessionSelect.value = result.session_id;
            selectSession();
            
            // Clear input
            newSession.value = '';
        } else {
            showStatusMessage(`Failed to create session: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Error creating session:', error);
        showStatusMessage('Error creating session. Please try again.', 'error');
    }
}

// Select session
function selectSession() {
    const sessionId = sessionSelect.value;
    
    if (sessionId) {
        currentSessionId = sessionId;
        
        // Update display
        currentSessionName.textContent = sessionSelect.options[sessionSelect.selectedIndex].text;
        
        // Load attendance for this session
        loadAttendanceList(sessionId);
        
        // Enable attendance toggle
        attendanceActive.disabled = false;
    } else {
        currentSessionId = null;
        currentSessionName.textContent = 'None';
        
        // Clear attendance list
        attendanceList.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i data-feather="users" style="width: 40px; height: 40px;"></i>
                <p class="mt-2">No attendance records yet</p>
            </div>
        `;
        feather.replace();
        
        // Disable attendance toggle
        attendanceActive.disabled = true;
        attendanceActive.checked = false;
    }
}

// Load attendance list for a session
async function loadAttendanceList(sessionId) {
    try {
        const response = await fetch(`http://localhost:8000/api/attendance?session_id=${sessionId}`);
        const result = await response.json();
        
        if (result.success) {
            if (result.attendance.length === 0) {
                // No attendance records
                attendanceList.innerHTML = `
                    <div class="text-center py-4 text-muted">
                        <i data-feather="users" style="width: 40px; height: 40px;"></i>
                        <p class="mt-2">No attendance records yet</p>
                    </div>
                `;
            } else {
                // Display attendance records
                attendanceList.innerHTML = '';
                
                result.attendance.forEach(record => {
                    const item = document.createElement('div');
                    item.className = 'attendance-item';
                    item.innerHTML = `
                        <div class="d-flex align-items-center w-100">
                            <div class="attendance-avatar bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                                ${getInitials(record.student_name)}
                            </div>
                            <div class="ms-3 flex-grow-1">
                                <div class="d-flex justify-content-between">
                                    <strong>${record.student_name}</strong>
                                    <small class="text-muted">${formatTime(record.timestamp)}</small>
                                </div>
                                <div class="text-muted small">${record.student_id}</div>
                            </div>
                        </div>
                    `;
                    
                    attendanceList.appendChild(item);
                });
            }
            
            // Update total present
            totalPresent.textContent = result.attendance.length;
            
            // Refresh feather icons
            feather.replace();
        } else {
            showStatusMessage('Failed to load attendance', 'error');
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
        showStatusMessage('Error loading attendance. Please try again.', 'error');
    }
}

// Update current date display
function updateCurrentDate() {
    const now = new Date();
    currentDate.textContent = formatDate(now);
}

// Helper: Format date
function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString();
}

// Helper: Format time
function formatTime(timestamp) {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Helper: Get initials from name
function getInitials(name) {
    return name
        .split(' ')
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
}
