// START OF FILE: official-dashboard.js (CORRECTED)
document.addEventListener('DOMContentLoaded', () => {
    // --- 1. GUARD CLAUSE: Protect this page from non-officials ---
    const user = JSON.parse(localStorage.getItem('civicWatchUser'));
    if (!user || user.role !== 'official') {
        alert('Access Denied. You must be a logged-in official to view this page.');
        window.location.href = 'login-selection.html';
        return; // Stop the script if not an authorized official
    }

    const issueContainer = document.querySelector('.issue-container');
    const API_URL = 'http://localhost:3000';

    const loadOfficialIssues = async () => {
        try {
            const response = await fetch(`${API_URL}/get-official-issues`);
            if (!response.ok) throw new Error('Failed to fetch from server.');
            const issues = await response.json();
            displayIssues(issues);
        } catch (error) {
            issueContainer.innerHTML = `<p class="error-message">Could not load issues. Is the backend server running?</p>`;
        }
    };

    const displayIssues = (issues) => {
        issueContainer.innerHTML = '';
        if (issues.length === 0) {
            issueContainer.innerHTML = '<h2>No issues to review at this time.</h2>';
            return;
        }

        issues.forEach(issue => {
            const reporterPhoto = issue.reporter.photo ? `${API_URL}/${issue.reporter.photo.replace(/\\/g, '/')}` : 'https://i.imgur.com/S82vYyG.png';
            const issuePhoto = issue.photo.startsWith('http') ? issue.photo : `${API_URL}/${issue.photo.replace(/\\/g, '/')}`;
            const displayName = issue.name.charAt(0).toUpperCase() + issue.name.slice(1);
            
            // --- 2. SIMPLIFIED AND CORRECTED BUTTON LOGIC ---
            const acceptButtonDisabled = issue.statusColor !== 'status-red';
            const fixButtonDisabled = issue.statusColor !== 'status-yellow';

            const issueCardHTML = `
                <div class="issue-card-wrapper">
                    <article class="issue-card">
                        <img src="${issuePhoto}" alt="Issue image" class="issue-image">
                        <div class="card-content">
                            <div class="issue-status ${issue.statusColor}">${issue.status}</div>
                            <h3 class="issue-name">${displayName}</h3>
                            <p class="issue-description">${issue.description}</p>
                            
                            <div class="reporter-details">
                                <img src="${reporterPhoto}" alt="Reporter photo" class="reporter-photo">
                                <div>
                                    <strong>Reported By:</strong> ${issue.reporter.fullname}<br>
                                    <span style="font-size:0.8rem; color: #aaa;">Contact: ${issue.reporter.username}</span>
                                </div>
                            </div>

                            <div class="official-actions">
                                <button class="btn btn-accept" data-id="${issue.id}" ${acceptButtonDisabled ? 'disabled' : ''}>Accept</button>
                                <button class="btn btn-fix" data-id="${issue.id}" ${fixButtonDisabled ? 'disabled' : ''}>Mark as Fixed</button>
                            </div>
                        </div>
                    </article>
                </div>`;
            issueContainer.innerHTML += issueCardHTML;
        });
    };

    // --- 3. EVENT LISTENER FOR BUTTON CLICKS (Unchanged but confirmed correct) ---
    issueContainer.addEventListener('click', async (e) => {
        const button = e.target;
        const id = button.dataset.id;
        if (!id || button.disabled) return; // Ignore clicks on disabled buttons

        let url = '';
        if (button.classList.contains('btn-accept')) url = `${API_URL}/issue/accept/${id}`;
        else if (button.classList.contains('btn-fix')) url = `${API_URL}/issue/fix/${id}`;
        else return;
        
        try {
            button.disabled = true;
            const response = await fetch(url, { method: 'POST' });
            const result = await response.json();
            alert(result.message);
            loadOfficialIssues(); // Reload the dashboard
        } catch (error) {
            alert('An error occurred.');
            button.disabled = false;
        }
    });

    loadOfficialIssues();
});