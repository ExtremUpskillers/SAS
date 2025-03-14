// Admin Panel JavaScript

// Global variables
let studentsData = [];
let sessionsData = [];
let currentStudentPage = 1;
let currentSessionPage = 1;
let studentsPerPage = 10;
let settingsData = {};

// DOM elements
const systemSettingsForm = document.getElementById('system-settings-form');
const faceThreshold = document.getElementById('face-threshold');
const faceThresholdValue = document.getElementById('face-threshold-value');
const voiceThreshold = document.getElementById('voice-threshold');
const voiceThresholdValue = document.getElementById('voice-threshold-value');
const cameraSelect = document.getElementById('camera-select');
const micSelect = document.getElementById('mic-select');
const requireBothAuth = document.getElementById('require-both-auth');
const testCamera = document.getElementById('test-camera');
const testMicrophone = document.getElementById('test-microphone');
const testRecognition = document.getElementById('test-recognition');
const diagnosticResult = document.getElementById('diagnostic-result');
const studentSearch = document.getElementById('student-search');
const searchBtn = document.getElementById('search-btn');
const studentTableBody = document.getElementById('student-table-body');
const studentPagination = document.getElementById('student-pagination');
const sessionTableBody = document.getElementById('session-table-body');
const editStudentForm = document.getElementById('edit-student-form');
const saveStudentEdit = document.getElementById('save-student-edit');

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initDeviceOptions();
    loadSettings();
    loadStudents();
    loadSessions();
});

// Setup event listeners
function setupEventListeners() {
    // Threshold sliders
    faceThreshold.addEventListener('input', () => {
        faceThresholdValue.textContent = faceThreshold.value;
    });
    
    voiceThreshold.addEventListener('input', () => {
        voiceThresholdValue.textContent = voiceThreshold.value;
    });
    
    // System settings form
    systemSettingsForm.addEventListener('submit', (event) => {
        event.preventDefault();
        saveSettings();
    });
    
    // Test buttons
    testCamera.addEventListener('click', testCameraFunction);
    testMicrophone.addEventListener('click', testMicrophoneFunction);
    testRecognition.addEventListener('click', testRecognitionFunction);
    
    // Search button
    searchBtn.addEventListener('click', () => {
        loadStudents(1, studentSearch.value);
    });
    
    // Student search input (search on enter)
    studentSearch.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            loadStudents(1, studentSearch.value);
        }
    });
    
    // Save student edit
    saveStudentEdit.addEventListener('click', saveStudentChanges);
}

// Initialize device options (cameras and microphones)
async function initDeviceOptions() {
    try {
        // Get available media devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        // Filter video devices (cameras)
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        
        // Filter audio devices (microphones)
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        
        // Populate camera select
        cameraSelect.innerHTML = '';
        videoDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Camera ${cameraSelect.options.length + 1}`;
            cameraSelect.appendChild(option);
        });
        
        // Populate microphone select
        micSelect.innerHTML = '';
        audioDevices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.text = device.label || `Microphone ${micSelect.options.length + 1}`;
            micSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error initializing device options:', error);
        showStatusMessage('Error accessing media devices. Please check permissions.', 'error');
    }
}

// Load settings
async function loadSettings() {
    try {
        const response = await fetch('http://localhost:8000/api/settings');
        const result = await response.json();
        
        if (result.success) {
            settingsData = result.settings;
            
            // Update form values
            faceThreshold.value = settingsData.face_recognition_threshold;
            faceThresholdValue.textContent = settingsData.face_recognition_threshold;
            
            voiceThreshold.value = settingsData.voice_recognition_threshold;
            voiceThresholdValue.textContent = settingsData.voice_recognition_threshold;
            
            // Set camera and mic if they exist in the list
            if (settingsData.camera_id && cameraSelect.querySelector(`option[value="${settingsData.camera_id}"]`)) {
                cameraSelect.value = settingsData.camera_id;
            }
            
            if (settingsData.microphone_id && micSelect.querySelector(`option[value="${settingsData.microphone_id}"]`)) {
                micSelect.value = settingsData.microphone_id;
            }
            
            requireBothAuth.checked = settingsData.require_both_auth;
        } else {
            showStatusMessage('Failed to load settings', 'error');
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        showStatusMessage('Error loading settings. Please try again.', 'error');
    }
}

// Save settings
async function saveSettings() {
    try {
        const settings = {
            face_recognition_threshold: parseFloat(faceThreshold.value),
            voice_recognition_threshold: parseFloat(voiceThreshold.value),
            camera_id: cameraSelect.value,
            microphone_id: micSelect.value,
            require_both_auth: requireBothAuth.checked
        };
        
        const response = await fetch('http://localhost:8000/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(settings)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatusMessage('Settings saved successfully', 'success');
            settingsData = settings;
        } else {
            showStatusMessage('Failed to save settings', 'error');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showStatusMessage('Error saving settings. Please try again.', 'error');
    }
}

// Test camera function
async function testCameraFunction() {
    try {
        // Show diagnostic area
        diagnosticResult.style.display = 'block';
        diagnosticResult.innerHTML = 'Testing camera... Please wait.';
        
        // Get selected camera ID
        const cameraId = cameraSelect.value;
        
        // Try to access camera
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                deviceId: cameraId ? { exact: cameraId } : undefined
            }
        });
        
        // Camera is working if we get here
        diagnosticResult.innerHTML = `
            <div class="text-success mb-2">
                <i data-feather="check-circle"></i> Camera is working correctly!
            </div>
            <div class="small text-muted">
                Active camera: ${stream.getVideoTracks()[0].label}
            </div>
        `;
        
        // Update feather icons
        feather.replace();
        
        // Stop the stream
        stream.getTracks().forEach(track => track.stop());
    } catch (error) {
        console.error('Camera test error:', error);
        
        // Show error message
        diagnosticResult.innerHTML = `
            <div class="text-danger mb-2">
                <i data-feather="alert-triangle"></i> Camera test failed!
            </div>
            <div class="small text-muted">
                Error: ${error.message}
            </div>
            <div class="mt-2">
                Please check that:
                <ul class="mt-1 mb-0">
                    <li>Your camera is connected properly</li>
                    <li>You've granted camera permissions to the application</li>
                    <li>No other application is using the camera</li>
                </ul>
            </div>
        `;
        
        // Update feather icons
        feather.replace();
    }
}

// Test microphone function
async function testMicrophoneFunction() {
    try {
        // Show diagnostic area
        diagnosticResult.style.display = 'block';
        diagnosticResult.innerHTML = 'Testing microphone... Please wait.';
        
        // Get selected microphone ID
        const microphoneId = micSelect.value;
        
        // Try to access microphone
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                deviceId: microphoneId ? { exact: microphoneId } : undefined
            }
        });
        
        // Create audio context for testing
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        const microphone = audioContext.createMediaStreamSource(stream);
        microphone.connect(analyser);
        
        // Microphone is working if we get here
        diagnosticResult.innerHTML = `
            <div class="text-success mb-2">
                <i data-feather="check-circle"></i> Microphone is working correctly!
            </div>
            <div class="small text-muted">
                Active microphone: ${stream.getAudioTracks()[0].label}
            </div>
            <div class="mt-2">
                <div class="progress">
                    <div id="volume-meter" class="progress-bar" role="progressbar" style="width: 0%"></div>
                </div>
                <div class="text-center small text-muted mt-1">Speak to see audio level</div>
            </div>
        `;
        
        // Update feather icons
        feather.replace();
        
        // Setup volume meter
        const volumeMeter = document.getElementById('volume-meter');
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        function updateVolume() {
            // Stop if no analyser (user navigated away)
            if (!analyser) return;
            
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;
            const volume = Math.min(100, average * 2); // Scale to 0-100
            
            // Update volume meter
            if (volumeMeter) {
                volumeMeter.style.width = `${volume}%`;
                
                // Change color based on volume
                if (volume > 70) {
                    volumeMeter.className = 'progress-bar bg-danger';
                } else if (volume > 30) {
                    volumeMeter.className = 'progress-bar bg-success';
                } else {
                    volumeMeter.className = 'progress-bar bg-info';
                }
            }
            
            // Continue updating
            requestAnimationFrame(updateVolume);
        }
        
        // Start volume meter
        updateVolume();
        
        // Stop the test after 10 seconds
        setTimeout(() => {
            stream.getTracks().forEach(track => track.stop());
            audioContext.close();
            
            // Update display if it's still visible
            if (diagnosticResult.style.display !== 'none') {
                diagnosticResult.innerHTML = `
                    <div class="text-success mb-2">
                        <i data-feather="check-circle"></i> Microphone test completed successfully!
                    </div>
                    <div class="small text-muted">
                        Microphone: ${stream.getAudioTracks()[0].label}
                    </div>
                `;
                feather.replace();
            }
        }, 10000);
    } catch (error) {
        console.error('Microphone test error:', error);
        
        // Show error message
        diagnosticResult.innerHTML = `
            <div class="text-danger mb-2">
                <i data-feather="alert-triangle"></i> Microphone test failed!
            </div>
            <div class="small text-muted">
                Error: ${error.message}
            </div>
            <div class="mt-2">
                Please check that:
                <ul class="mt-1 mb-0">
                    <li>Your microphone is connected properly</li>
                    <li>You've granted microphone permissions to the application</li>
                    <li>No other application is using the microphone</li>
                </ul>
            </div>
        `;
        
        // Update feather icons
        feather.replace();
    }
}

// Test recognition function
async function testRecognitionFunction() {
    try {
        // Show diagnostic area
        diagnosticResult.style.display = 'block';
        diagnosticResult.innerHTML = `
            <div class="text-info mb-2">
                <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                Testing recognition services...
            </div>
        `;
        
        // Test backend services
        const response = await fetch('http://localhost:8000/api/diagnostics/test-recognition');
        const result = await response.json();
        
        if (result.success) {
            // All services working
            diagnosticResult.innerHTML = `
                <div class="text-success mb-2">
                    <i data-feather="check-circle"></i> Recognition services are working correctly!
                </div>
                <div class="mt-2">
                    <ul class="list-group">
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Face Recognition
                            <span class="badge bg-success rounded-pill">
                                <i data-feather="check" style="width: 16px; height: 16px;"></i>
                            </span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Voice Recognition
                            <span class="badge bg-success rounded-pill">
                                <i data-feather="check" style="width: 16px; height: 16px;"></i>
                            </span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Database Connection
                            <span class="badge bg-success rounded-pill">
                                <i data-feather="check" style="width: 16px; height: 16px;"></i>
                            </span>
                        </li>
                    </ul>
                </div>
            `;
        } else {
            // Some services failed
            diagnosticResult.innerHTML = `
                <div class="text-warning mb-2">
                    <i data-feather="alert-triangle"></i> Some recognition services have issues!
                </div>
                <div class="mt-2">
                    <ul class="list-group">
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Face Recognition
                            <span class="badge ${result.face_recognition ? 'bg-success' : 'bg-danger'} rounded-pill">
                                <i data-feather="${result.face_recognition ? 'check' : 'x'}" style="width: 16px; height: 16px;"></i>
                            </span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Voice Recognition
                            <span class="badge ${result.voice_recognition ? 'bg-success' : 'bg-danger'} rounded-pill">
                                <i data-feather="${result.voice_recognition ? 'check' : 'x'}" style="width: 16px; height: 16px;"></i>
                            </span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            Database Connection
                            <span class="badge ${result.database ? 'bg-success' : 'bg-danger'} rounded-pill">
                                <i data-feather="${result.database ? 'check' : 'x'}" style="width: 16px; height: 16px;"></i>
                            </span>
                        </li>
                    </ul>
                </div>
                <div class="mt-2 text-danger small">
                    ${result.message || 'Check the server logs for more details.'}
                </div>
            `;
        }
        
        // Update feather icons
        feather.replace();
    } catch (error) {
        console.error('Recognition test error:', error);
        
        // Show error message
        diagnosticResult.innerHTML = `
            <div class="text-danger mb-2">
                <i data-feather="alert-triangle"></i> Recognition test failed!
            </div>
            <div class="small text-muted">
                Error: ${error.message}
            </div>
            <div class="mt-2">
                Please check that:
                <ul class="mt-1 mb-0">
                    <li>The backend server is running</li>
                    <li>All required dependencies are installed</li>
                    <li>The database is properly configured</li>
                </ul>
            </div>
        `;
        
        // Update feather icons
        feather.replace();
    }
}

// Load students
async function loadStudents(page = 1, searchQuery = '') {
    showLoading(true);
    currentStudentPage = page;
    
    try {
        // Build query params
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('per_page', studentsPerPage);
        if (searchQuery) {
            params.append('query', searchQuery);
        }
        
        // Fetch students
        const response = await fetch(`http://localhost:8000/api/students?${params}`);
        const result = await response.json();
        
        if (result.success) {
            studentsData = result.students;
            const totalPages = Math.ceil(result.total / studentsPerPage);
            
            // Update table
            updateStudentTable(studentsData, totalPages, page);
        } else {
            showStatusMessage('Failed to load students', 'error');
            studentTableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-4 text-muted">
                        Failed to load student data
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error loading students:', error);
        showStatusMessage('Error loading students. Please try again.', 'error');
        studentTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4 text-muted">
                    Error loading student data
                </td>
            </tr>
        `;
    } finally {
        showLoading(false);
        feather.replace(); // Re-initialize icons
    }
}

// Update student table
function updateStudentTable(students, totalPages, currentPage) {
    // Clear table
    studentTableBody.innerHTML = '';
    
    if (students.length === 0) {
        studentTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4 text-muted">
                    No students found
                </td>
            </tr>
        `;
        return;
    }
    
    // Add students to table
    students.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.student_id}</td>
            <td>${student.name}</td>
            <td>${student.email}</td>
            <td>${student.course}</td>
            <td>${formatDate(student.registration_date)}</td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button type="button" class="btn btn-outline-primary edit-student" data-id="${student.id}">
                        <i data-feather="edit-2" style="width: 16px; height: 16px;"></i>
                    </button>
                    <button type="button" class="btn btn-outline-danger delete-student" data-id="${student.id}">
                        <i data-feather="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                </div>
            </td>
        `;
        
        studentTableBody.appendChild(row);
    });
    
    // Update feather icons
    feather.replace();
    
    // Setup edit buttons
    document.querySelectorAll('.edit-student').forEach(button => {
        button.addEventListener('click', () => {
            const studentId = button.getAttribute('data-id');
            openEditStudentModal(studentId);
        });
    });
    
    // Setup delete buttons
    document.querySelectorAll('.delete-student').forEach(button => {
        button.addEventListener('click', () => {
            const studentId = button.getAttribute('data-id');
            confirmDeleteStudent(studentId);
        });
    });
    
    // Update pagination
    updateStudentPagination(totalPages, currentPage);
}

// Update student pagination
function updateStudentPagination(totalPages, currentPage) {
    studentPagination.innerHTML = '';
    
    if (totalPages <= 1) {
        return; // No pagination needed
    }
    
    const ul = document.createElement('ul');
    ul.className = 'pagination';
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#">&laquo;</a>`;
    prevLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            loadStudents(currentPage - 1, studentSearch.value);
        }
    });
    ul.appendChild(prevLi);
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.addEventListener('click', (e) => {
            e.preventDefault();
            loadStudents(i, studentSearch.value);
        });
        ul.appendChild(li);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#">&raquo;</a>`;
    nextLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage < totalPages) {
            loadStudents(currentPage + 1, studentSearch.value);
        }
    });
    ul.appendChild(nextLi);
    
    studentPagination.appendChild(ul);
}

// Open edit student modal
function openEditStudentModal(studentId) {
    const student = studentsData.find(s => s.id.toString() === studentId.toString());
    
    if (!student) {
        showStatusMessage('Student not found', 'error');
        return;
    }
    
    // Set form values
    document.getElementById('edit-student-id').value = student.id;
    document.getElementById('edit-student-name').value = student.name;
    document.getElementById('edit-student-email').value = student.email;
    document.getElementById('edit-student-course').value = student.course;
    document.getElementById('edit-student-status').checked = student.status === 'active';
    
    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('student-edit-modal'));
    modal.show();
}

// Save student changes
async function saveStudentChanges() {
    const studentId = document.getElementById('edit-student-id').value;
    
    try {
        const updatedStudent = {
            id: studentId,
            name: document.getElementById('edit-student-name').value,
            email: document.getElementById('edit-student-email').value,
            course: document.getElementById('edit-student-course').value,
            status: document.getElementById('edit-student-status').checked ? 'active' : 'inactive'
        };
        
        const response = await fetch(`http://localhost:8000/api/students/${studentId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatedStudent)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatusMessage('Student updated successfully', 'success');
            
            // Close modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('student-edit-modal'));
            modal.hide();
            
            // Reload students
            loadStudents(currentStudentPage, studentSearch.value);
        } else {
            showStatusMessage(`Failed to update student: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Error updating student:', error);
        showStatusMessage('Error updating student. Please try again.', 'error');
    }
}

// Confirm delete student
function confirmDeleteStudent(studentId) {
    const student = studentsData.find(s => s.id.toString() === studentId.toString());
    
    if (!student) {
        showStatusMessage('Student not found', 'error');
        return;
    }
    
    if (confirm(`Are you sure you want to delete ${student.name}? This cannot be undone.`)) {
        deleteStudent(studentId);
    }
}

// Delete student
async function deleteStudent(studentId) {
    try {
        const response = await fetch(`http://localhost:8000/api/students/${studentId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatusMessage('Student deleted successfully', 'success');
            
            // Reload students
            loadStudents(currentStudentPage, studentSearch.value);
        } else {
            showStatusMessage(`Failed to delete student: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Error deleting student:', error);
        showStatusMessage('Error deleting student. Please try again.', 'error');
    }
}

// Load sessions
async function loadSessions() {
    try {
        const response = await fetch('http://localhost:8000/api/sessions');
        const result = await response.json();
        
        if (result.success) {
            sessionsData = result.sessions;
            
            // Update table
            updateSessionTable(sessionsData);
        } else {
            showStatusMessage('Failed to load sessions', 'error');
            sessionTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4 text-muted">
                        Failed to load session data
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
        showStatusMessage('Error loading sessions. Please try again.', 'error');
        sessionTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-muted">
                    Error loading session data
                </td>
            </tr>
        `;
    }
}

// Update session table
function updateSessionTable(sessions) {
    // Clear table
    sessionTableBody.innerHTML = '';
    
    if (sessions.length === 0) {
        sessionTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-muted">
                    No sessions found
                </td>
            </tr>
        `;
        return;
    }
    
    // Add sessions to table
    sessions.forEach(session => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${session.id}</td>
            <td>${session.name}</td>
            <td>${formatDate(session.date)}</td>
            <td>${session.start_time || 'N/A'}</td>
            <td>${session.end_time || 'N/A'}</td>
            <td>${session.attendance_count || 0}</td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button type="button" class="btn btn-outline-danger delete-session" data-id="${session.id}">
                        <i data-feather="trash-2" style="width: 16px; height: 16px;"></i>
                    </button>
                </div>
            </td>
        `;
        
        sessionTableBody.appendChild(row);
    });
    
    // Update feather icons
    feather.replace();
    
    // Setup delete buttons
    document.querySelectorAll('.delete-session').forEach(button => {
        button.addEventListener('click', () => {
            const sessionId = button.getAttribute('data-id');
            confirmDeleteSession(sessionId);
        });
    });
}

// Confirm delete session
function confirmDeleteSession(sessionId) {
    const session = sessionsData.find(s => s.id.toString() === sessionId.toString());
    
    if (!session) {
        showStatusMessage('Session not found', 'error');
        return;
    }
    
    if (confirm(`Are you sure you want to delete the session "${session.name}"? This will also delete all attendance records for this session.`)) {
        deleteSession(sessionId);
    }
}

// Delete session
async function deleteSession(sessionId) {
    try {
        const response = await fetch(`http://localhost:8000/api/sessions/${sessionId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showStatusMessage('Session deleted successfully', 'success');
            
            // Reload sessions
            loadSessions();
        } else {
            showStatusMessage(`Failed to delete session: ${result.message}`, 'error');
        }
    } catch (error) {
        console.error('Error deleting session:', error);
        showStatusMessage('Error deleting session. Please try again.', 'error');
    }
}

// Helper: Format date
function formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString();
}
