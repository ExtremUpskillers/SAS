// Student Registration JavaScript

// Global variables
let videoStream = null;
let faceCaptured = false;
let voiceRecorded = false;
let mediaRecorder = null;
let audioChunks = [];
let audioBlob = null;
let canvasContext = null;
let audioContext = null;
let audioAnalyser = null;
let audioBars = [];

// DOM elements
const videoFeed = document.getElementById('video-feed');
const canvasFeed = document.getElementById('canvas-feed');
const captureFaceBtn = document.getElementById('capture-face');
const clearFaceBtn = document.getElementById('clear-face');
const recordVoiceBtn = document.getElementById('record-voice');
const playVoiceBtn = document.getElementById('play-voice');
const faceStatus = document.getElementById('face-status');
const voiceStatus = document.getElementById('voice-status');
const registrationForm = document.getElementById('registration-form');
const audioBarsContainer = document.getElementById('audio-bars');
const voicePhrase = document.getElementById('voice-phrase');

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    initCamera();
    initAudioVisualizer();
    setupEventListeners();
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
        
        // Enable the capture button once video is ready
        videoFeed.onloadedmetadata = () => {
            captureFaceBtn.disabled = false;
            
            // Initialize canvas
            canvasFeed.width = videoFeed.videoWidth;
            canvasFeed.height = videoFeed.videoHeight;
            canvasContext = canvasFeed.getContext('2d');
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
    // Capture face button
    captureFaceBtn.addEventListener('click', captureFace);
    
    // Clear face button
    clearFaceBtn.addEventListener('click', clearFace);
    
    // Record voice button
    recordVoiceBtn.addEventListener('click', toggleVoiceRecording);
    
    // Play voice button
    playVoiceBtn.addEventListener('click', playVoice);
    
    // Registration form submit
    registrationForm.addEventListener('submit', registerStudent);
    
    // Update voice phrase with student name
    document.getElementById('student-name').addEventListener('input', (e) => {
        const name = e.target.value.trim() || '[your name]';
        voicePhrase.textContent = `"My name is ${name} and I am present today."`;
    });
}

// Capture face from video feed
function captureFace() {
    // Draw current video frame to canvas
    canvasContext.drawImage(videoFeed, 0, 0, canvasFeed.width, canvasFeed.height);
    
    // Display the canvas
    canvasFeed.style.display = 'block';
    videoFeed.style.display = 'none';
    
    // Update status
    faceStatus.innerHTML = '<p class="text-success">Face captured successfully</p>';
    
    // Update buttons
    clearFaceBtn.disabled = false;
    captureFaceBtn.disabled = true;
    
    // Enable voice recording
    recordVoiceBtn.disabled = false;
    
    faceCaptured = true;
}

// Clear captured face
function clearFace() {
    // Clear canvas
    canvasContext.clearRect(0, 0, canvasFeed.width, canvasFeed.height);
    
    // Hide canvas, show video
    canvasFeed.style.display = 'none';
    videoFeed.style.display = 'block';
    
    // Update status
    faceStatus.innerHTML = '<p class="text-muted text-center">Click "Capture Face" to take a picture</p>';
    
    // Update buttons
    clearFaceBtn.disabled = true;
    captureFaceBtn.disabled = false;
    
    faceCaptured = false;
}

// Toggle voice recording
async function toggleVoiceRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        // Stop recording
        mediaRecorder.stop();
        recordVoiceBtn.textContent = 'Record Voice';
        recordVoiceBtn.classList.remove('btn-danger');
        recordVoiceBtn.classList.add('btn-primary');
        
        // Hide visualizer animation
        stopVisualization();
    } else {
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
            
            mediaRecorder.onstop = () => {
                // Create blob from chunks
                audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                
                // Update status
                voiceStatus.innerHTML = '<p class="text-success">Voice sample recorded</p>';
                
                // Enable play button
                playVoiceBtn.disabled = false;
                
                voiceRecorded = true;
            };
            
            // Clear previous chunks
            audioChunks = [];
            
            // Start recording
            mediaRecorder.start();
            
            // Update button
            recordVoiceBtn.textContent = 'Stop Recording';
            recordVoiceBtn.classList.remove('btn-primary');
            recordVoiceBtn.classList.add('btn-danger');
            
            // Update status
            voiceStatus.innerHTML = '<p class="text-warning">Recording... Speak clearly</p>';
        } catch (error) {
            console.error('Error accessing microphone:', error);
            showStatusMessage('Could not access microphone. Please check permissions.', 'error');
        }
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

// Play recorded voice
function playVoice() {
    if (!audioBlob) return;
    
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    audio.play();
}

// Register student
async function registerStudent(event) {
    event.preventDefault();
    
    if (!faceCaptured || !voiceRecorded) {
        showStatusMessage('Please capture both face and voice before registering', 'warning');
        return;
    }
    
    showLoading(true);
    
    try {
        // Get form data
        const studentId = document.getElementById('student-id').value;
        const studentName = document.getElementById('student-name').value;
        const studentEmail = document.getElementById('student-email').value;
        const studentCourse = document.getElementById('student-course').value;
        
        // Prepare form data for API
        const formData = new FormData();
        formData.append('student_id', studentId);
        formData.append('name', studentName);
        formData.append('email', studentEmail);
        formData.append('course', studentCourse);
        
        // Get face image data from canvas
        const faceImageData = canvasFeed.toDataURL('image/jpeg').split(',')[1];
        formData.append('face_image', faceImageData);
        
        // Add voice recording
        formData.append('voice_sample', audioBlob);
        
        // Send to backend
        const response = await fetch('http://localhost:8000/api/students/register', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatusMessage('Student registered successfully!', 'success');
            
            // Reset form
            registrationForm.reset();
            clearFace();
            
            // Clear voice recording
            audioBlob = null;
            audioChunks = [];
            voiceRecorded = false;
            
            // Reset status
            voiceStatus.innerHTML = '<p class="text-muted text-center">Click "Record Voice" to record your verification phrase</p>';
            
            // Disable buttons
            playVoiceBtn.disabled = true;
            recordVoiceBtn.disabled = true;
        } else {
            showStatusMessage(`Registration failed: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Error registering student:', error);
        showStatusMessage('Error registering student. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}
