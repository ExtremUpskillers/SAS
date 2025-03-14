// Reports JavaScript

// Global variables
let reportData = [];
let currentPage = 1;
let itemsPerPage = 10;
let chart = null;

// DOM elements
const reportFilterForm = document.getElementById('report-filter-form');
const dateRange = document.getElementById('date-range');
const customDateRange = document.getElementById('custom-date-range');
const startDate = document.getElementById('start-date');
const endDate = document.getElementById('end-date');
const sessionFilter = document.getElementById('session-filter');
const studentFilter = document.getElementById('student-filter');
const exportCsvBtn = document.getElementById('export-csv');
const totalSessions = document.getElementById('total-sessions');
const totalStudents = document.getElementById('total-students');
const attendanceRate = document.getElementById('attendance-rate');
const reportTableBody = document.getElementById('report-table-body');
const reportPagination = document.getElementById('report-pagination');
const attendanceChartCanvas = document.getElementById('attendance-chart');

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadFilterOptions();
    setDefaultDates();
    generateEmptyReport();
});

// Setup event listeners
function setupEventListeners() {
    // Date range change
    dateRange.addEventListener('change', toggleCustomDateRange);
    
    // Report filter form submit
    reportFilterForm.addEventListener('submit', (event) => {
        event.preventDefault();
        generateReport();
    });
    
    // Export CSV button
    exportCsvBtn.addEventListener('click', exportReportToCsv);
}

// Toggle custom date range visibility
function toggleCustomDateRange() {
    if (dateRange.value === 'custom') {
        customDateRange.classList.remove('d-none');
    } else {
        customDateRange.classList.add('d-none');
    }
}

// Set default dates
function setDefaultDates() {
    const today = new Date();
    
    // Set end date to today
    const endDateStr = today.toISOString().split('T')[0];
    endDate.value = endDateStr;
    
    // Set start date to 7 days ago
    const startDateObj = new Date(today);
    startDateObj.setDate(today.getDate() - 7);
    const startDateStr = startDateObj.toISOString().split('T')[0];
    startDate.value = startDateStr;
}

// Load filter options
async function loadFilterOptions() {
    try {
        // Load sessions
        const sessionsResponse = await fetch('http://localhost:8000/api/sessions');
        const sessionsResult = await sessionsResponse.json();
        
        if (sessionsResult.success) {
            // Populate session filter
            sessionFilter.innerHTML = '<option value="">All Sessions</option>';
            
            sessionsResult.sessions.forEach(session => {
                const option = document.createElement('option');
                option.value = session.id;
                option.textContent = `${session.name} (${formatDate(session.date)})`;
                sessionFilter.appendChild(option);
            });
        }
        
        // Load students
        const studentsResponse = await fetch('http://localhost:8000/api/students');
        const studentsResult = await studentsResponse.json();
        
        if (studentsResult.success) {
            // Populate student filter
            studentFilter.innerHTML = '<option value="">All Students</option>';
            
            studentsResult.students.forEach(student => {
                const option = document.createElement('option');
                option.value = student.id;
                option.textContent = `${student.name} (${student.student_id})`;
                studentFilter.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading filter options:', error);
        showStatusMessage('Error loading filter options. Please try again.', 'error');
    }
}

// Generate empty report
function generateEmptyReport() {
    // Clear report data
    reportData = [];
    
    // Update summary stats
    updateSummaryStats({
        total_sessions: 0,
        total_students: 0,
        attendance_rate: 0
    });
    
    // Clear chart
    if (chart) {
        chart.destroy();
    }
    
    // Create empty chart
    createChart([], []);
    
    // Clear table
    reportTableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center py-4">
                <p class="text-muted mb-0">No data available. Please select filters and generate a report.</p>
            </td>
        </tr>
    `;
    
    // Clear pagination
    reportPagination.innerHTML = '';
}

// Generate report based on filters
async function generateReport() {
    showLoading(true);
    
    try {
        // Get filter values
        const filterParams = buildFilterParams();
        
        // Fetch report data
        const response = await fetch(`http://localhost:8000/api/reports?${filterParams}`);
        const result = await response.json();
        
        if (result.success) {
            // Store report data
            reportData = result.attendance;
            
            // Update summary stats
            updateSummaryStats(result.stats);
            
            // Update chart
            updateChart(result.daily_stats);
            
            // Display report data in table
            displayReportData(1); // Start with first page
        } else {
            showStatusMessage('Failed to generate report', 'error');
            generateEmptyReport();
        }
    } catch (error) {
        console.error('Error generating report:', error);
        showStatusMessage('Error generating report. Please try again.', 'error');
        generateEmptyReport();
    } finally {
        showLoading(false);
    }
}

// Build query parameters from filters
function buildFilterParams() {
    const params = new URLSearchParams();
    
    // Date range
    if (dateRange.value === 'custom') {
        params.append('start_date', startDate.value);
        params.append('end_date', endDate.value);
    } else {
        params.append('date_range', dateRange.value);
    }
    
    // Session filter
    if (sessionFilter.value) {
        params.append('session_id', sessionFilter.value);
    }
    
    // Student filter
    if (studentFilter.value) {
        params.append('student_id', studentFilter.value);
    }
    
    return params.toString();
}

// Update summary statistics
function updateSummaryStats(stats) {
    totalSessions.textContent = stats.total_sessions;
    totalStudents.textContent = stats.total_students;
    attendanceRate.textContent = `${stats.attendance_rate}%`;
}

// Update chart with new data
function updateChart(dailyStats) {
    // Extract dates and counts
    const dates = dailyStats.map(stat => stat.date);
    const counts = dailyStats.map(stat => stat.count);
    
    // Clear previous chart
    if (chart) {
        chart.destroy();
    }
    
    // Create new chart
    createChart(dates, counts);
}

// Create attendance chart
function createChart(labels, data) {
    const ctx = attendanceChartCanvas.getContext('2d');
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Attendance Count',
                data: data,
                backgroundColor: 'rgba(90, 92, 255, 0.2)',
                borderColor: 'rgba(90, 92, 255, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(90, 92, 255, 1)',
                pointRadius: 4,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 10,
                    titleFont: {
                        size: 14
                    },
                    bodyFont: {
                        size: 13
                    }
                }
            }
        }
    });
}

// Display report data in table
function displayReportData(page) {
    currentPage = page;
    
    // Calculate pagination
    const totalPages = Math.ceil(reportData.length / itemsPerPage);
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, reportData.length);
    
    // Clear table
    reportTableBody.innerHTML = '';
    
    if (reportData.length === 0) {
        // No data
        reportTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">
                    <p class="text-muted mb-0">No data available for the selected filters.</p>
                </td>
            </tr>
        `;
    } else {
        // Add data rows
        for (let i = startIndex; i < endIndex; i++) {
            const record = reportData[i];
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(record.date)}</td>
                <td>${record.session_name}</td>
                <td>${record.student_id}</td>
                <td>${record.student_name}</td>
                <td>${formatTime(record.timestamp)}</td>
                <td><span class="badge bg-success">Present</span></td>
            `;
            
            reportTableBody.appendChild(row);
        }
    }
    
    // Update pagination
    updatePagination(totalPages, page);
}

// Update pagination controls
function updatePagination(totalPages, currentPage) {
    reportPagination.innerHTML = '';
    
    if (totalPages <= 1) {
        return; // No pagination needed
    }
    
    const ul = document.createElement('ul');
    ul.className = 'pagination';
    
    // Previous button
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous"><span aria-hidden="true">&laquo;</span></a>`;
    prevLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            displayReportData(currentPage - 1);
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
            displayReportData(i);
        });
        ul.appendChild(li);
    }
    
    // Next button
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next"><span aria-hidden="true">&raquo;</span></a>`;
    nextLi.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage < totalPages) {
            displayReportData(currentPage + 1);
        }
    });
    ul.appendChild(nextLi);
    
    reportPagination.appendChild(ul);
}

// Export report to CSV
async function exportReportToCsv() {
    if (reportData.length === 0) {
        showStatusMessage('No data to export', 'warning');
        return;
    }
    
    try {
        // Get filter values
        const filterParams = buildFilterParams();
        
        // Fetch CSV data
        const response = await fetch(`http://localhost:8000/api/reports/export?${filterParams}`);
        const result = await response.json();
        
        if (result.success) {
            // Create CSV content
            const csvContent = result.csv_content;
            
            // Create download link
            const encodedUri = encodeURI(`data:text/csv;charset=utf-8,${csvContent}`);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute('download', 'attendance_report.csv');
            document.body.appendChild(link);
            
            // Trigger download
            link.click();
            
            // Clean up
            document.body.removeChild(link);
            
            showStatusMessage('Report exported successfully', 'success');
        } else {
            showStatusMessage('Failed to export report', 'error');
        }
    } catch (error) {
        console.error('Error exporting report:', error);
        showStatusMessage('Error exporting report. Please try again.', 'error');
    }
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
