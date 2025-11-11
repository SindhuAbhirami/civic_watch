// START OF FILE: report.js (MODIFIED)
document.addEventListener('DOMContentLoaded', () => {
    const user = JSON.parse(localStorage.getItem('civicWatchUser'));
    if (!user) {
        alert("You must be logged in to report an issue.");
        window.location.href = 'login-selection.html';
        return;
    }

    // --- Form Elements ---
    const reportForm = document.getElementById('report-form');
    const issueTypeSelect = document.getElementById('issue-type');
    const otherIssueContainer = document.getElementById('other-issue-container');
    const otherIssueText = document.getElementById('other-issue-text');
    const issuePhotoInput = document.getElementById('issue-photo');
    const photoPreviewImg = document.getElementById('photo-preview-img');
    const descriptionTextarea = document.getElementById('issue-description');
    const aiSpinner = document.getElementById('ai-spinner');
    const submitBtn = reportForm.querySelector('button[type="submit"]');

    // --- Location Elements ---
    const getLocationBtn = document.getElementById('get-location-btn');
    const locationDisplay = document.getElementById('location-display');
    const latInput = document.getElementById('lat');
    const lngInput = document.getElementById('lng');

    // --- Camera Modal Elements ---
    const takePhotoBtn = document.getElementById('take-photo-btn');
    const cameraModal = document.getElementById('camera-modal');
    const cameraStreamEl = document.getElementById('camera-stream');
    const cameraCanvas = document.getElementById('camera-canvas');
    const snapPhotoBtn = document.getElementById('snap-photo-btn');
    const retakePhotoBtn = document.getElementById('retake-photo-btn');
    const confirmPhotoBtn = document.getElementById('confirm-photo-btn');
    const closeCameraBtn = document.getElementById('close-camera-btn');
    let activeStream = null;
    let aiRunning = false;
    let photoFile = null; // Store the file object here for form submission

    const API_URL = 'http://localhost:3000';
    const AI_URL = 'http://127.0.0.1:5001/predict';

    // --- AI Prediction ---
    const predictDescription = async (file) => {
        if (!file) return;
        aiRunning = true;
        aiSpinner.classList.remove('hidden');
        descriptionTextarea.value = "Predicting issue description...";
        submitBtn.disabled = true;

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(AI_URL, { method: 'POST', body: formData });
            const result = await response.json();

            if (result.class && result.confidence !== undefined) {
                // Pre-fill the description, but allow user to change it
                descriptionTextarea.value = `Detected: ${result.class} (${(result.confidence*100).toFixed(2)}%)`;
            } else {
                descriptionTextarea.value = "";
                // console.warn('AI could not predict the issue.'); // Removed alert for smoother UX
            }
        } catch (err) {
            descriptionTextarea.value = "";
            console.error('AI service prediction failed:', err);
            // alert('Failed to contact AI service.'); // Removed alert for smoother UX
        } finally {
            aiSpinner.classList.add('hidden');
            submitBtn.disabled = false;
            aiRunning = false;
        }
    };

    // --- Issue Type Change ---
    issueTypeSelect.addEventListener('change', () => {
        otherIssueContainer.classList.toggle('hidden', issueTypeSelect.value !== 'other');
        otherIssueText.required = issueTypeSelect.value === 'other';
    });

    // --- Get Location ---
    getLocationBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            locationDisplay.textContent = 'Geolocation not supported.';
            return;
        }
        locationDisplay.textContent = 'Fetching location...';
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                latInput.value = pos.coords.latitude;
                lngInput.value = pos.coords.longitude;
                locationDisplay.textContent = '✅ Location captured!';
                locationDisplay.style.color = '#43a047';
            },
            () => { 
                locationDisplay.textContent = '❌ Could not get location.';
                locationDisplay.style.color = '#e53935';
            }
        );
    });

    // --- File Input Change ---
    issuePhotoInput.addEventListener('change', (e) => {
        photoFile = e.target.files[0]; // Store the file directly
        if (!photoFile) {
            photoPreviewImg.classList.add('hidden');
            photoPreviewImg.src = "";
            descriptionTextarea.value = ""; // Clear description if photo removed
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            photoPreviewImg.src = e.target.result;
            photoPreviewImg.classList.remove('hidden');
        };
        reader.readAsDataURL(photoFile);

        // Run AI prediction
        predictDescription(photoFile);
    });

    // --- Camera Modal Logic ---
    const resetCameraModal = () => {
        cameraStreamEl.classList.remove('hidden');
        cameraCanvas.classList.add('hidden');
        snapPhotoBtn.classList.remove('hidden');
        retakePhotoBtn.classList.add('hidden');
        confirmPhotoBtn.classList.add('hidden');
    };

    takePhotoBtn.addEventListener('click', async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert('Camera API not available.');
            return;
        }
        try {
            activeStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            cameraModal.classList.remove('hidden');
            cameraStreamEl.srcObject = activeStream;
            resetCameraModal();
        } catch (err) {
            alert('Could not access camera. Please ensure permissions are granted.');
        }
    });

    snapPhotoBtn.addEventListener('click', () => {
        cameraCanvas.width = cameraStreamEl.videoWidth;
        cameraCanvas.height = cameraStreamEl.videoHeight;
        cameraCanvas.getContext('2d').drawImage(cameraStreamEl, 0, 0);
        cameraStreamEl.classList.add('hidden');
        cameraCanvas.classList.remove('hidden');
        snapPhotoBtn.classList.add('hidden');
        retakePhotoBtn.classList.remove('hidden');
        confirmPhotoBtn.classList.remove('hidden');
    });

    retakePhotoBtn.addEventListener('click', resetCameraModal);

    const stopCamera = () => {
        if (activeStream) activeStream.getTracks().forEach(track => track.stop());
        cameraModal.classList.add('hidden');
    };
    closeCameraBtn.addEventListener('click', stopCamera);

    confirmPhotoBtn.addEventListener('click', () => {
        cameraCanvas.toBlob((blob) => {
            photoFile = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" }); // Store in photoFile
            
            // Update the file input's files list (optional, for visual consistency)
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(photoFile);
            issuePhotoInput.files = dataTransfer.files;

            const previewUrl = URL.createObjectURL(blob);
            photoPreviewImg.src = previewUrl;
            photoPreviewImg.classList.remove('hidden');

            predictDescription(photoFile); // Predict using the captured photo
            stopCamera();
        }, 'image/jpeg');
    });

    // --- Form Submission ---
    reportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (aiRunning) {
            alert('AI is still predicting. Please wait or clear the photo.');
            return;
        }

        if (!photoFile) {
            alert('Please add a photo for the report.');
            return;
        }

        if (!latInput.value || !lngInput.value) {
            alert('Please get your current location.');
            return;
        }

        // Reconstruct FormData to ensure all dynamic fields are included
        const formData = new FormData();
        formData.append('issue-type', issueTypeSelect.value);
        if (issueTypeSelect.value === 'other') {
            formData.append('other-issue-text', otherIssueText.value);
        }
        formData.append('issue-description', descriptionTextarea.value || 'No description provided'); // Ensure description is sent
        formData.append('lat', latInput.value);
        formData.append('lng', lngInput.value);
        formData.append('reporterId', user.id);
        formData.append('reporterName', user.fullname);
        formData.append('issue-photo', photoFile); // Append the stored File object

        submitBtn.disabled = true; // Disable button to prevent double submission

        try {
            const response = await fetch(`${API_URL}/report-issue`, { method: 'POST', body: formData });
            const result = await response.json();
            alert(result.message);
            if (response.ok) {
                window.location.href = 'index.html';
            }
        } catch (error) {
            console.error('Submission Error:', error);
            alert('Failed to submit report. Server may be down or there was a network issue.');
        } finally {
            submitBtn.disabled = false; // Re-enable button
        }
    });
});