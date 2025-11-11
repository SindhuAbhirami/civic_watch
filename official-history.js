document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('civicWatchUser'));
    if (!user || user.role !== 'official') {
        window.location.href = 'login-selection.html';
        return;
    }
    const issueContainer = document.querySelector('.issue-container');
    const API_URL = 'http://localhost:3000';

    const loadHandledIssues = async () => {
        try {
            const response = await fetch(`${API_URL}/get-handled-issues/${user.id}`);
            const issues = await response.json();
            // We can reuse the public card display logic from dashboard.js
            issueContainer.innerHTML = '';
            if (issues.length === 0) {
                issueContainer.innerHTML = '<h2>You have not handled any issues yet.</h2>';
                return;
            }
            issues.forEach(issue => {
                const imageUrl = issue.photo.startsWith('http') ? issue.photo : `${API_URL}/${issue.photo.replace(/\\/g, '/')}`;
                const displayName = issue.name.charAt(0).toUpperCase() + issue.name.slice(1);
                issueContainer.innerHTML += `
                    <a href="issue-detail.html?id=${issue.id}" class="card-link">
                        <article class="issue-card">
                            <img src="${imageUrl}" alt="${displayName}" class="issue-image">
                            <div class="card-content">
                                <div class="issue-status ${issue.statusColor}">${issue.status}</div>
                                <h3 class="issue-name">${displayName}</h3>
                                <p class="issue-area">📍 ${issue.area}</p>
                            </div>
                        </article>
                    </a>`;
            });
        } catch (error) {
            issueContainer.innerHTML = '<p>Could not load your history.</p>';
        }
    };
    loadHandledIssues();
});