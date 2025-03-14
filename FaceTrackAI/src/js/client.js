/**
 * API Client for Smart Attendance System
 * Handles communication with the backend API
 */

class ApiClient {
    constructor(baseUrl = 'http://localhost:8000') {
        this.baseUrl = baseUrl;
    }

    /**
     * Make a GET request to the API
     * @param {string} endpoint - API endpoint
     * @param {Object} params - URL parameters
     * @returns {Promise} - Promise resolving to response data
     */
    async get(endpoint, params = {}) {
        try {
            // Build URL with query parameters
            const url = new URL(`${this.baseUrl}${endpoint}`);
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== null) {
                    url.searchParams.append(key, params[key]);
                }
            });

            // Make request
            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // Parse response
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`Error making GET request to ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Make a POST request to the API
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @param {boolean} isFormData - Whether data is FormData
     * @returns {Promise} - Promise resolving to response data
     */
    async post(endpoint, data = {}, isFormData = false) {
        try {
            const options = {
                method: 'POST'
            };

            if (isFormData) {
                // Send as FormData
                options.body = data;
            } else {
                // Send as JSON
                options.headers = {
                    'Content-Type': 'application/json'
                };
                options.body = JSON.stringify(data);
            }

            // Make request
            const response = await fetch(`${this.baseUrl}${endpoint}`, options);

            // Parse response
            const responseData = await response.json();
            return responseData;
        } catch (error) {
            console.error(`Error making POST request to ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Make a PUT request to the API
     * @param {string} endpoint - API endpoint
     * @param {Object} data - Request data
     * @returns {Promise} - Promise resolving to response data
     */
    async put(endpoint, data = {}) {
        try {
            // Make request
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            // Parse response
            const responseData = await response.json();
            return responseData;
        } catch (error) {
            console.error(`Error making PUT request to ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Make a DELETE request to the API
     * @param {string} endpoint - API endpoint
     * @returns {Promise} - Promise resolving to response data
     */
    async delete(endpoint) {
        try {
            // Make request
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            // Parse response
            const responseData = await response.json();
            return responseData;
        } catch (error) {
            console.error(`Error making DELETE request to ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Check API status
     * @returns {Promise} - Promise resolving to API status
     */
    async checkStatus() {
        return this.get('/');
    }

    /**
     * Get students with optional filtering
     * @param {number} page - Page number
     * @param {number} perPage - Items per page
     * @param {string} query - Search query
     * @returns {Promise} - Promise resolving to students data
     */
    async getStudents(page = 1, perPage = 10, query = '') {
        return this.get('/api/students', { page, per_page: perPage, query });
    }

    /**
     * Register a new student
     * @param {FormData} formData - Form data with student information and biometric data
     * @returns {Promise} - Promise resolving to registration result
     */
    async registerStudent(formData) {
        return this.post('/api/students/register', formData, true);
    }

    /**
     * Get sessions
     * @returns {Promise} - Promise resolving to sessions data
     */
    async getSessions() {
        return this.get('/api/sessions');
    }

    /**
     * Create a new session
     * @param {Object} sessionData - Session data
     * @returns {Promise} - Promise resolving to creation result
     */
    async createSession(sessionData) {
        return this.post('/api/sessions', sessionData);
    }
}

// Export the API client
window.ApiClient = ApiClient;