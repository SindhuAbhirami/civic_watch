document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('civicWatchUser'));
    const API_URL = 'http://localhost:3000';

    if (!user) {
        window.location.href = 'login-selection.html';
        return;
    }

    const profileForm = document.getElementById('profile-form');
    const passwordForm = document.getElementById('password-form');

    const fullnameInput = document.getElementById('profile-fullname');
    const usernameInput = document.getElementById('profile-username');
    const ageInput = document.getElementById('profile-age');
    const addressContainer = document.getElementById('profile-address-container');
    const addressInput = document.getElementById('profile-address');
    const departmentContainer = document.getElementById('profile-department-container');
    const departmentSelect = document.getElementById('profile-department');

    // --- Function to load user data ---
    const loadUserProfile = async () => {
        try {
            const response = await fetch(`${API_URL}/get-user-profile/${user.id}/${user.role}`);
            if (!response.ok) {
                throw new Error('Could not load user profile.');
            }
            const profileData = await response.json();

            fullnameInput.value = profileData.fullname || '';
            usernameInput.value = profileData.username || '';
            ageInput.value = profileData.age || '';

            if (user.role === 'official') {
                addressContainer.classList.add('hidden'); // Officials don't typically have a public address in this context
                departmentContainer.classList.remove('hidden');
                departmentSelect.value = profileData.department || '';
            } else {
                addressContainer.classList.remove('hidden');
                addressInput.value = profileData.address || '';
                departmentContainer.classList.add('hidden');
            }

        } catch (error) {
            console.error('Error loading profile:', error);
            alert('Failed to load profile data.');
        }
    };

    // --- Handle Profile Update ---
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(profileForm);
        // The username is disabled, so it won't be in formData. Add it back.
        formData.append('username', user.username); 
        formData.append('role', user.role);

        const payload = Object.fromEntries(formData.entries());

        try {
            const response = await fetch(`${API_URL}/update-profile/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            alert(result.message);
            if (response.ok) {
                // Update local storage user data if fullname changed
                const updatedUser = { ...user, fullname: payload.fullname };
                localStorage.setItem('civicWatchUser', JSON.stringify(updatedUser));
                // Reload header to reflect new fullname if auth.js is active
                document.dispatchEvent(new Event('DOMContentLoaded')); 
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile.');
        }
    });

    // --- Handle Password Change ---
    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmNewPassword = document.getElementById('confirm-new-password').value;

        if (newPassword !== confirmNewPassword) {
            alert('New passwords do not match!');
            return;
        }

        if (newPassword.length < 6) {
            alert('New password must be at least 6 characters long.');
            return;
        }

        try {
            const response = await fetch(`${API_URL}/change-password/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: user.username, // Send username to identify and verify
                    role: user.role,
                    currentPassword, 
                    newPassword 
                })
            });

            const result = await response.json();
            alert(result.message);
            if (response.ok) {
                passwordForm.reset(); // Clear form on success
            }
        } catch (error) {
            console.error('Error changing password:', error);
            alert('Failed to change password.');
        }
    });

    // Initial load of user profile data
    loadUserProfile();
});