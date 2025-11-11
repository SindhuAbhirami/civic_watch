// START OF FILE: history.js
document.addEventListener('DOMContentLoaded', () => {
    // --- GUARD CLAUSE: Only logged-in users can see this page ---
    const user = JSON.parse(localStorage.getItem('civicWatchUser'));
    if (!user) {
        alert("You must be logged in to view your history.");
        window.location.href = 'login-selection.html';
        return;
    }

    const issueContainer = document.querySelector('.issue-container');
    const API_URL = 'http://localhost:3000';

    const loadMyIssues = async () => {
        try {
            const response = await fetch(`${API_URL}/get-my-issues/${user.id}`);
            const issues = await response.json();
            displayIssues(issues);
        } catch (error) {
            issueContainer.innerHTML = '<p class="error-message">Could not load your issues.</p>';
        }
    };

    const displayIssues = (issues) => {
        issueContainer.innerHTML = '';
        if (issues.length === 0) {
            issueContainer.innerHTML = '<h2>You have not reported any issues yet.</h2>';
            return;
        }

        issues.forEach(issue => {
            const imageUrl = issue.photo.startsWith('http') 
                ? issue.photo 
                : `${API_URL}/${issue.photo.replace(/\\/g, '/')}`;
            const displayName = issue.name.charAt(0).toUpperCase() + issue.name.slice(1);
            const issueCard = `
                <a href="issue-detail.html?id=${issue.id}" class="card-link">
                    <article class="issue-card">
                        <img src="${imageUrl}" alt="Image for ${displayName}" class="issue-image">
                        <div class="card-content">
                            <div class="issue-status ${issue.statusColor}">${issue.status}</div>
                            <h3 class="issue-name">${displayName}</h3>
                            <p class="issue-area">📍 Reported by you</p>
                            <p class="issue-description">${issue.description}</p>
                        </div>
                    </article>
                </a>`;
            issueContainer.innerHTML += issueCard;
        });
    };

    loadMyIssues();
});