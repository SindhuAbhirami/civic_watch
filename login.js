document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.getElementById('login-container');
    const registerContainer = document.getElementById('register-container');
    const showRegisterLink = document.getElementById('show-register-link');
    const showLoginLink = document.getElementById('show-login-link');
    const API_URL = 'http://localhost:3000';
    
    // --- REGISTRATION FORM SUBMISSION (NEW FLOW) ---
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const password = form.password.value;
        const confirmPassword = document.getElementById('reg-confirm-password').value;

        if (password !== confirmPassword) {
            alert('Passwords do not match!');
            return;
        }

        const formData = new FormData(form);
        const role = new URLSearchParams(window.location.search).get('role') || 'user';
        formData.append('role', role);

        try {
            const response = await fetch(`${API_URL}/register`, { method: 'POST', body: formData });
            const result = await response.json();
            alert(result.message);
            if (response.ok) {
                // On success, switch to login form
                registerContainer.classList.add('hidden');
                loginContainer.classList.remove('hidden');
            }
        } catch (error) {
            alert('Could not connect to the server.');
        }
    });

    // --- LOGIN FORM SUBMISSION (No changes) ---
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: form.username.value, password: form.password.value })
            });
            const result = await response.json();
            if (response.ok) {
                localStorage.setItem('civicWatchUser', JSON.stringify(result.user));
                window.location.href = 'index.html';
            } else { alert(result.message); }
        } catch (error) { alert('Could not connect to the server.'); }
    });
    
    // ... (logic for toggling forms and adjusting for role) ...
    const departmentField = document.getElementById('department-field');
    const departmentSelect = document.getElementById('reg-department');
    const role = new URLSearchParams(window.location.search).get('role') || 'user';
    if (role === 'official') {
        document.getElementById('login-title').textContent = 'Official Login';
        document.getElementById('register-title').textContent = 'Official Registration';
        departmentField.classList.remove('hidden');
        departmentSelect.required = true;
    }
    showRegisterLink.addEventListener('click', (e) => { e.preventDefault(); loginContainer.classList.add('hidden'); registerContainer.classList.remove('hidden'); });
    showLoginLink.addEventListener('click', (e) => { e.preventDefault(); registerContainer.classList.add('hidden'); loginContainer.classList.remove('hidden'); });
});