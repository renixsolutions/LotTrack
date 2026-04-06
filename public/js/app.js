/**
 * LotTrack Core UI Logic - Advanced Edition
 */

// Modal Management
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden'; 
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// Sidebar & Backdrop Control
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) {
        sidebar.classList.toggle('open');
        if (backdrop) {
            if (sidebar.classList.contains('open')) {
                backdrop.classList.add('show');
            } else {
                backdrop.classList.remove('show');
            }
        }
    }
}

// Close sidebar on backdrop click
document.addEventListener('click', (e) => {
    if (e.target.id === 'sidebarBackdrop') {
        toggleSidebar();
    }
    // Universal modal overlay click
    if (e.target.classList.contains('overlay')) {
        e.target.classList.remove('show');
        document.body.style.overflow = '';
        // If it was the scanner, stop it
        if (typeof stopScanner === 'function') stopScanner();
    }
});

// Advanced Theme-Based Toasts (Top-Right)
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toastMsg');
    const icon = document.getElementById('toastIcon');
    
    if (toast && msg && icon) {
        msg.textContent = message;
        toast.className = 'toast toast-top show ' + type;
        
        // Dynamic Icons based on Theme
        if (type === 'success') icon.innerHTML = '<i class="fas fa-check"></i>';
        else if (type === 'error') icon.innerHTML = '<i class="fas fa-exclamation-triangle"></i>';
        else icon.innerHTML = '<i class="fas fa-info-circle"></i>';
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }
}

// Handle success/error from URL params automatically
// Page Loader Controls (Skeleton Shroud Sync)
function showLoader() {
    document.body.classList.add('loading');
    const bar = document.getElementById('topProgressBar');
    const skeleton = document.getElementById('skeletonShroud');
    if (bar) bar.classList.add('loading');
    if (skeleton) skeleton.classList.add('show');
}

function hideLoader() {
    document.body.classList.remove('loading');
    const bar = document.getElementById('topProgressBar');
    const skeleton = document.getElementById('skeletonShroud');
    if (bar) bar.classList.remove('loading');
    if (skeleton) {
        // Smooth fade out
        setTimeout(() => skeleton.classList.remove('show'), 400);
    }
}

// Global Navigation/Form Loader Logic
document.addEventListener('click', (e) => {
    const navItem = e.target.closest('.mob-nav-item, .nav-item, .btn');
    if (navItem && navItem.tagName === 'A' && !navItem.target) {
        // Skip loader for functional links (like modal triggers)
        if (navItem.getAttribute('href') && navItem.getAttribute('href').startsWith('javascript:')) {
            return;
        }
        showLoader();
    }
});

document.addEventListener('submit', (e) => {
    if (!e.defaultPrevented) {
        showLoader();
    }
});

// Handle success/error from URL params automatically
window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('success')) showToast(params.get('success'), 'success');
    if (params.has('error')) showToast(params.get('error'), 'error');
    hideLoader(); // Ensure loader is hidden after load
};
