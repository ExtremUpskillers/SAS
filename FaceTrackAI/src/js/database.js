/**
 * Database interface for the Smart Attendance System
 * This module provides a client-side API to interact with the SQLite database
 * through the Python backend service
 */

class DatabaseService {
    constructor() {
        this.baseUrl = 'http://localhost:8000/api';
    }

    /**
     * Student Methods
     */

    async registerStudent(studentData) {
        try {
            const formData = new FormData();
            
            // Add student information
            formData.append('student_id', studentData.student_id);
            formData.append('name', studentData.name);
            formData.append('email', studentData.email);
            formData.append('course', studentData.course);
            
            // Add face image data
            if (studentData.face_image) {
                formData.append('face_image', studentData.face_image);
            }
            
            // Add voice sample
            if (studentData.voice_sample) {
                formData.append('voice_sample', studentData.voice_sample);
            }
            
            const response = await fetch(`${this.baseUrl}/students/register`, {
                method: 'POST',
                body: formData
            });
            
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Error registering student:', error);
            throw error;
        }
    }

    async getStudents(page = 1, perPage = 10, query = '') {
        try {
            const params = new URLSearchParams({
                page,
                per_page: perPage
            });
            
            if (query) {
                params.append('query', query);
            }
            
            const response = await fetch(`${this.baseUrl}/students?${params}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching students:', error);
            throw error;
        }
    }

    async getStudent(studentId) {
        try {
            const response = await fetch(`${this.baseUrl}/students/${studentId}`);
            return await response.json();
        } catch (error) {
            console.error(`Error fetching student ${studentId}:`, error);
            throw error;
        }
    }

    async updateStudent(studentId, studentData) {
        try {
            const response = await fetch(`${this.baseUrl}/students/${studentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(studentData)
            });
            
            return await response.json();
        } catch (error) {
            console.error(`Error updating student ${studentId}:`, error);
            throw error;
        }
    }

    async deleteStudent(studentId) {
        try {
            const response = await fetch(`${this.baseUrl}/students/${studentId}`, {
                method: 'DELETE'
            });
            
            return await response.json();
        } catch (error) {
            console.error(`Error deleting student ${studentId}:`, error);
            throw error;
        }
    }

    /**
     * Session Methods
     */

    async getSessions() {
        try {
            const response = await fetch(`${this.baseUrl}/sessions`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching sessions:', error);
            throw error;
        }
    }

    async createSession(sessionData) {
        try {
            const response = await fetch(`${this.baseUrl}/sessions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(sessionData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error creating session:', error);
            throw error;
        }
    }

    async deleteSession(sessionId) {
        try {
            const response = await fetch(`${this.baseUrl}/sessions/${sessionId}`, {
                method: 'DELETE'
            });
            
            return await response.json();
        } catch (error) {
            console.error(`Error deleting session ${sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Attendance Methods
     */

    async getAttendance(sessionId) {
        try {
            const response = await fetch(`${this.baseUrl}/attendance?session_id=${sessionId}`);
            return await response.json();
        } catch (error) {
            console.error(`Error fetching attendance for session ${sessionId}:`, error);
            throw error;
        }
    }

    async markAttendance(studentId, sessionId) {
        try {
            const response = await fetch(`${this.baseUrl}/attendance/mark`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    student_id: studentId,
                    session_id: sessionId
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error marking attendance:', error);
            throw error;
        }
    }

    /**
     * Recognition Methods
     */

    async detectFace(imageData, sessionId) {
        try {
            const response = await fetch(`${this.baseUrl}/recognition/detect-face`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image: imageData,
                    session_id: sessionId
                })
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error detecting face:', error);
            throw error;
        }
    }

    async verifyVoice(voiceSample, studentId, sessionId) {
        try {
            const formData = new FormData();
            formData.append('voice_sample', voiceSample);
            formData.append('student_id', studentId);
            formData.append('session_id', sessionId);
            
            const response = await fetch(`${this.baseUrl}/recognition/verify-voice`, {
                method: 'POST',
                body: formData
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error verifying voice:', error);
            throw error;
        }
    }

    /**
     * Report Methods
     */

    async getReports(filters) {
        try {
            const params = new URLSearchParams(filters);
            const response = await fetch(`${this.baseUrl}/reports?${params}`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching reports:', error);
            throw error;
        }
    }

    async exportReportCsv(filters) {
        try {
            const params = new URLSearchParams(filters);
            const response = await fetch(`${this.baseUrl}/reports/export?${params}`);
            return await response.json();
        } catch (error) {
            console.error('Error exporting report:', error);
            throw error;
        }
    }

    /**
     * Settings Methods
     */

    async getSettings() {
        try {
            const response = await fetch(`${this.baseUrl}/settings`);
            return await response.json();
        } catch (error) {
            console.error('Error fetching settings:', error);
            throw error;
        }
    }

    async saveSettings(settingsData) {
        try {
            const response = await fetch(`${this.baseUrl}/settings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settingsData)
            });
            
            return await response.json();
        } catch (error) {
            console.error('Error saving settings:', error);
            throw error;
        }
    }

    /**
     * Diagnostic Methods
     */

    async testRecognition() {
        try {
            const response = await fetch(`${this.baseUrl}/diagnostics/test-recognition`);
            return await response.json();
        } catch (error) {
            console.error('Error testing recognition:', error);
            throw error;
        }
    }
}

// Export singleton instance
const dbService = new DatabaseService();
window.dbService = dbService;
