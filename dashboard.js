// START OF FILE: dashboard.js (COMPLETE AND CORRECTED VERSION)

document.addEventListener('DOMContentLoaded', () => {
    const issueContainer = document.querySelector('.issue-container');
    const user = JSON.parse(localStorage.getItem('civicWatchUser'));
    const API_URL = 'http://localhost:3000';

    // --- Function to create cards for the public view ---
    const createPublicCard = (issue) => {
        const imageUrl = issue.photo ? (issue.photo.startsWith('http') ? issue.photo : `${API_URL}/${issue.photo.replace(/\\/g, '/')}`) : 'https://i.imgur.com/Q2BAOd2.png';
        const displayName = issue.name ? issue.name.charAt(0).toUpperCase() + issue.name.slice(1) : 'Untitled Issue';
        
        return `
            <a href="issue-detail.html?id=${issue.id}" class="card-link">
                <article class="issue-card">
                    <img src="${imageUrl}" alt="${displayName}" class="issue-image">
                    <div class="card-content">
                        <div class="issue-status ${issue.statusColor}">${issue.status}</div>
                        <h3 class="issue-name">${displayName}</h3>
                        <p class="issue-area">📍 ${issue.area}</p>
                        <p class="issue-description">${issue.description}</p>
                    </div>
                </article>
            </a>`;
    };

    // --- Function to create cards for the official's view ---
    const createOfficialCard = (issue) => {
        const reporterPhoto = issue.reporter && issue.reporter.photo ? `${API_URL}/${issue.reporter.photo.replace(/\\/g, '/')}` : 'https://i.imgur.com/S82vYyG.png';
        const issuePhoto = issue.photo ? (issue.photo.startsWith('http') ? issue.photo : `${API_URL}/${issue.photo.replace(/\\/g, '/')}`) : 'https://i.imgur.com/Q2BAOd2.png';
        const displayName = issue.name ? issue.name.charAt(0).toUpperCase() + issue.name.slice(1) : 'Untitled Issue';
        const reporterName = issue.reporter ? issue.reporter.fullname : 'Unknown User';
        const reporterContact = issue.reporter ? issue.reporter.username : 'N/A';

        let actionButton = '';
        if (issue.statusColor === 'status-red') {
            actionButton = `<button class="btn btn-accept" data-id="${issue.id}">Accept</button>`;
        } else if (issue.statusColor === 'status-yellow') {
            actionButton = `<button class="btn btn-fix" data-id="${issue.id}">Mark as Fixed</button>`;
        } else {
            actionButton = `<button class="btn" disabled>Resolved</button>`;
        }

        return `
            <div class="issue-card-wrapper">
                <article class="issue-card">
                    <a href="issue-detail.html?id=${issue.id}" class="card-link-img">
                        <img src="${issuePhoto}" alt="Issue image" class="issue-image">
                    </a>
                    <div class="card-content">
                        <div class="issue-status ${issue.statusColor}">${issue.status}</div>
                        <a href="issue-detail.html?id=${issue.id}" class="card-link-title">
                            <h3 class="issue-name">${displayName}</h3>
                        </a>
                        <p class="issue-description">${issue.description}</p>
                        <div class="reporter-details">
                            <img src="${reporterPhoto}" alt="Reporter photo">
                            <div>
                                <strong>Reported By:</strong> ${reporterName}<br>
                                <span style="font-size:0.8rem; color: #aaa;">Contact: ${reporterContact}</span>
                            </div>
                        </div>
                        <div class="official-actions">${actionButton}</div>
                    </div>
                </article>
            </div>`;
    };

    // --- Function to display the issues using the correct card creator ---
    const displayIssues = (issues, cardCreator) => {
        issueContainer.innerHTML = '';
        if (issues.length === 0) {
            // Show a different message depending on if the user is an official
            const message = (user && user.role === 'official') ? "No issues to review at this time." : "No issues have been reported yet.";
            issueContainer.innerHTML = `<h2>${message}</h2>`;
            return;
        }
        issues.forEach(issue => {
            issueContainer.innerHTML += cardCreator(issue);
        });
    };
    
    // --- Main function to load data based on user role ---
    const loadData = async () => {
        try {
            if (user && user.role === 'official') {
                const response = await fetch(`${API_URL}/get-official-issues`);
                const issues = await response.json();
                displayIssues(issues, createOfficialCard);
            } else {
                const response = await fetch(`${API_URL}/get-issues`);
                const issues = await response.json();
                displayIssues(issues, createPublicCard);
            }
        } catch (error) {
            console.error("Fetch Error:", error); // Added for better debugging
            issueContainer.innerHTML = `<p class="error-message">Could not load issues. Is the backend server running?</p>`;
        }
    };

    // --- Event listener for official action buttons ---
    issueContainer.addEventListener('click', async (e) => {
        const button = e.target;
        const id = button.dataset.id;
        // Guard clause to ensure we only act on button clicks from a logged-in official
        if (!id || button.disabled || !button.classList.contains('btn') || !user || user.role !== 'official') {
            return;
        }
        
        // Prevent the link from navigating when a button is clicked
        e.preventDefault(); 
        
        let url = '';
        if (button.classList.contains('btn-accept')) {
            url = `${API_URL}/issue/accept/${id}`;
        } else if (button.classList.contains('btn-fix')) {
            url = `${API_URL}/issue/fix/${id}`;
        } else {
            return;
        }

        try {
            button.disabled = true;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ officialId: user.id })
            });
            await response.json();
            loadData(); // Reload the dashboard to show changes
        } catch (error) {
            alert('An error occurred while updating the issue.');
            button.disabled = false;
        }
    });

    // --- Initial call to load the data when the page loads ---
    loadData();
});