// Initialize Feather Icons
document.addEventListener('DOMContentLoaded', () => {
    feather.replace();
    loadPage('attendance'); // Default page to load
    setupNavigation();
});

// Handle navigation
function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            
            // Update active state
            document.querySelectorAll('.nav-link').forEach(el => {
                el.classList.remove('active');
            });
            event.target.closest('.nav-link').classList.add('active');
            
            // Load the requested page
            const page = event.target.closest('.nav-link').dataset.page;
            loadPage(page);
        });
    });
}

// Load page content
async function loadPage(pageName) {
    showLoading(true);
    
    try {
        const response = await fetch(`./src/pages/${pageName}.html`);
        if (!response.ok) throw new Error(`Failed to load ${pageName} page`);
        
        const html = await response.text();
        document.getElementById('content').innerHTML = html;
        
        // Load and execute the corresponding JS for the page
        const script = document.createElement('script');
        script.src = `./src/js/${pageName}.js`;
        script.type = 'text/javascript';
        document.body.appendChild(script);
        
        // Remove old page scripts to prevent duplication
        const oldScripts = document.querySelectorAll(`script[src*="./src/js/"][src!="./src/js/${pageName}.js"]`);
        oldScripts.forEach(oldScript => {
            oldScript.remove();
        });
    } catch (error) {
        showStatusMessage(`Error loading page: ${error.message}`, 'error');
        console.error('Error loading page:', error);
    } finally {
        showLoading(false);
    }
}

// Show/hide loading indicator
function showLoading(visible) {
    const loader = document.getElementById('loading');
    if (visible) {
        loader.classList.remove('d-none');
    } else {
        loader.classList.add('d-none');
    }
}

// Display status messages
function showStatusMessage(message, type = 'info') {
    const statusMessage = document.getElementById('status-message');
    const statusBody = statusMessage.querySelector('.toast-body');
    
    // Set message and style based on type
    statusBody.textContent = message;
    statusMessage.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info');
    
    switch (type) {
        case 'success':
            statusMessage.classList.add('bg-success', 'text-white');
            break;
        case 'error':
            statusMessage.classList.add('bg-danger', 'text-white');
            break;
        case 'warning':
            statusMessage.classList.add('bg-warning');
            break;
        default:
            statusMessage.classList.add('bg-info', 'text-white');
    }
    
    // Show the toast
    const toast = new bootstrap.Toast(statusMessage);
    toast.show();
}

// Global utility functions
window.showStatusMessage = showStatusMessage;
window.showLoading = showLoading;
