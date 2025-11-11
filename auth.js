// START OF FILE: auth.js (FINAL VERSION)
document.addEventListener('DOMContentLoaded', () => {
    const authNav = document.getElementById('header-nav-auth');
    const user = JSON.parse(localStorage.getItem('civicWatchUser'));

    if (user) {
        // --- USER IS LOGGED IN ---
        const userInitial = user.fullname.charAt(0).toUpperCase();
        let reportButtonHTML = '';
        let historyLink = '';

        // Conditional elements based on role
        if (user.role === 'official') {
            historyLink = `<a href="official-history.html" class="btn btn-secondary" style="width: 100%;">Handled History</a>`;
        } else {
            reportButtonHTML = `<a href="report.html" class="btn btn-primary">Report an Issue</a>`;
            historyLink = `<a href="history.html" class="btn btn-secondary" style="width: 100%;">My History</a>`;
        }

        authNav.innerHTML = `
            ${reportButtonHTML}
            <div class="profile-dropdown-wrapper">
                <button id="profile-btn" class="profile-btn">
                    <div class="profile-avatar">${userInitial}</div>
                    <span>${user.fullname}</span>
                </button>
                <div id="dropdown-menu" class="dropdown-menu hidden">
                    <a href="profile.html" class="btn btn-secondary" style="width: 100%;">My Profile</a>
                    ${historyLink}
                    <button id="logout-btn" class="btn btn-secondary" style="width: 100%; margin-top: 0.5rem;">Logout</button>
                </div>
            </div>
        `;

        const profileBtn = document.getElementById('profile-btn');
        const dropdownMenu = document.getElementById('dropdown-menu');
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('hidden');
        });
        window.addEventListener('click', () => {
            if (!dropdownMenu.classList.contains('hidden')) dropdownMenu.classList.add('hidden');
        });
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('civicWatchUser');
            window.location.href = 'index.html';
        });

    } else {
        // --- USER IS NOT LOGGED IN ---
        authNav.innerHTML = `<a href="login-selection.html" class="btn btn-secondary">Login / Register</a>`;
    }
});