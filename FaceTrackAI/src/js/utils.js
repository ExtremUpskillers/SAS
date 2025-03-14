/**
 * Utility functions for the Smart Attendance System
 */

/**
 * Formats a date to a string in the local format
 * @param {string|Date} date - The date to format
 * @returns {string} The formatted date string
 */
function formatDate(date) {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleDateString();
}

/**
 * Formats a timestamp to a time string
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} The formatted time string
 */
function formatTime(timestamp) {
    if (!timestamp) return 'N/A';
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Gets initials from a name (first letters of first and last name)
 * @param {string} name - The full name
 * @returns {string} The initials
 */
function getInitials(name) {
    if (!name) return '??';
    return name
        .split(' ')
        .map(part => part.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

/**
 * Converts a canvas to a base64 string
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {string} format - The image format (default: 'jpeg')
 * @param {number} quality - The image quality (0-1, default: 0.8)
 * @returns {string} The base64 data URL
 */
function canvasToBase64(canvas, format = 'jpeg', quality = 0.8) {
    return canvas.toDataURL(`image/${format}`, quality).split(',')[1];
}

/**
 * Converts a base64 string to a Blob
 * @param {string} base64 - The base64 string
 * @param {string} mimeType - The MIME type
 * @returns {Blob} The blob
 */
function base64ToBlob(base64, mimeType) {
    const byteString = atob(base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    
    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    
    return new Blob([ab], { type: mimeType });
}

/**
 * Truncates text to a specified length with ellipsis
 * @param {string} text - The text to truncate
 * @param {number} maxLength - The maximum length
 * @returns {string} The truncated text
 */
function truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return `${text.substring(0, maxLength)}...`;
}

/**
 * Creates a random alphanumeric ID
 * @param {number} length - The length of the ID
 * @returns {string} The random ID
 */
function generateRandomId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Validates an email address format
 * @param {string} email - The email to validate
 * @returns {boolean} True if valid, false otherwise
 */
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Gets a URL parameter by name
 * @param {string} name - The parameter name
 * @returns {string|null} The parameter value or null
 */
function getUrlParameter(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

/**
 * Debounce function to limit how often a function is called
 * @param {Function} func - The function to debounce
 * @param {number} wait - The wait time in milliseconds
 * @returns {Function} The debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

/**
 * Creates a delay using a Promise
 * @param {number} ms - The delay in milliseconds
 * @returns {Promise} A promise that resolves after the delay
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Toggles fullscreen mode for an element
 * @param {HTMLElement} element - The element to toggle fullscreen for
 */
function toggleFullscreen(element) {
    if (!document.fullscreenElement) {
        // Enter fullscreen
        if (element.requestFullscreen) {
            element.requestFullscreen();
        } else if (element.mozRequestFullScreen) { // Firefox
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullscreen) { // Chrome, Safari and Opera
            element.webkitRequestFullscreen();
        } else if (element.msRequestFullscreen) { // IE/Edge
            element.msRequestFullscreen();
        }
    } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { // Firefox
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE/Edge
            document.msExitFullscreen();
        }
    }
}

/**
 * Gets the most dominant color from an image
 * @param {HTMLImageElement} img - The image element
 * @returns {string} The hex color
 */
function getDominantColor(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const width = canvas.width = img.width;
    const height = canvas.height = img.height;
    
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const colorCounts = {};
    
    // Sample pixels (every 5th pixel for performance)
    for (let i = 0; i < data.length; i += 20) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        // Create a "bucketized" color key (reduce precision for grouping similar colors)
        const roundTo = 16;
        const bucketR = Math.round(r / roundTo) * roundTo;
        const bucketG = Math.round(g / roundTo) * roundTo;
        const bucketB = Math.round(b / roundTo) * roundTo;
        
        const colorKey = `${bucketR},${bucketG},${bucketB}`;
        
        if (colorCounts[colorKey]) {
            colorCounts[colorKey]++;
        } else {
            colorCounts[colorKey] = 1;
        }
    }
    
    // Find the most common color
    let maxCount = 0;
    let dominantColor = '0,0,0';
    
    for (const color in colorCounts) {
        if (colorCounts[color] > maxCount) {
            maxCount = colorCounts[color];
            dominantColor = color;
        }
    }
    
    // Convert back to RGB
    const [r, g, b] = dominantColor.split(',').map(Number);
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Generates a contrast color (black or white) based on background color
 * @param {string} hexColor - The hex color
 * @returns {string} '#ffffff' or '#000000'
 */
function getContrastColor(hexColor) {
    // Remove # if present
    hexColor = hexColor.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hexColor.substr(0, 2), 16);
    const g = parseInt(hexColor.substr(2, 2), 16);
    const b = parseInt(hexColor.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black or white based on luminance
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Converts seconds to a human-readable duration
 * @param {number} seconds - The duration in seconds
 * @returns {string} The formatted duration
 */
function formatDuration(seconds) {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`;
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (minutes === 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

/**
 * Calculates the size of a file in human-readable format
 * @param {number} bytes - The size in bytes
 * @returns {string} The formatted size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Creates a CSV file from JSON data
 * @param {Array} data - Array of objects to convert to CSV
 * @param {Array} columns - Array of column definitions
 * @returns {string} The CSV content
 */
function jsonToCSV(data, columns) {
    if (!data || !data.length) return '';
    
    // Create header row
    const header = columns.map(col => col.header || col.field).join(',');
    
    // Create data rows
    const rows = data.map(item => {
        return columns.map(col => {
            let value = item[col.field];
            
            // Apply formatter if provided
            if (col.formatter) {
                value = col.formatter(value, item);
            }
            
            // Ensure proper CSV escaping
            if (typeof value === 'string') {
                // Escape quotes
                value = value.replace(/"/g, '""');
                
                // Wrap in quotes if contains comma, newline or quotes
                if (value.includes(',') || value.includes('\n') || value.includes('"')) {
                    value = `"${value}"`;
                }
            } else if (value === null || value === undefined) {
                value = '';
            }
            
            return value;
        }).join(',');
    }).join('\n');
    
    return `${header}\n${rows}`;
}

// Export the functions for use in other modules
window.utils = {
    formatDate,
    formatTime,
    getInitials,
    canvasToBase64,
    base64ToBlob,
    truncateText,
    generateRandomId,
    isValidEmail,
    getUrlParameter,
    debounce,
    delay,
    toggleFullscreen,
    getDominantColor,
    getContrastColor,
    formatDuration,
    formatFileSize,
    jsonToCSV
};
