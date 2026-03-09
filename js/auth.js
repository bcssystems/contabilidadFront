// ========================================
// BC Systems - Auth Module
// ========================================

// Login Form Handler
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const submitBtn = document.querySelector('.btn-login');
    const errorDiv = document.getElementById('loginError');
    
    // Show loading
    submitBtn.classList.add('loading');
    errorDiv.classList.remove('show');
    
    try {
        const success = await api.login(username, password);
        
        if (success) {
            // Save user info
            localStorage.setItem('user', JSON.stringify({ username }));
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
        } else {
            errorDiv.classList.add('show');
        }
    } catch (error) {
        console.error('Login error:', error);
        errorDiv.classList.add('show');
        errorDiv.querySelector('span').textContent = error.message || 'Error al iniciar sesión';
    } finally {
        submitBtn.classList.remove('loading');
    }
}

// Check authentication
function checkAuth() {
    if (!api.isAuthenticated()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Get current user
function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// Logout
function logout() {
    api.logout();
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Export functions
window.auth = {
    checkAuth,
    getCurrentUser,
    logout
};
