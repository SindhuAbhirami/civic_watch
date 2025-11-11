// START OF FILE: detail.js (REVISED WITH REVERSE GEOCODING)

// This variable will hold the fetched issue data so other functions can access it.
let currentIssue;

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const issueId = params.get('id');
    const API_URL = 'http://localhost:3000';

    if (!issueId) {
        displayError();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/get-issue/${issueId}`);
        if (!response.ok) {
            throw new Error('Issue not found on server.');
        }
        currentIssue = await response.json();
        populateIssueDetails();
    } catch (error) {
        console.error('Failed to load issue details:', error);
        displayError();
    }
});

// This function fills the page with the issue's data
function populateIssueDetails() {
    if (!currentIssue) return;

    const imageUrl = currentIssue.photo.startsWith('http')
        ? currentIssue.photo
        : `http://localhost:3000/${currentIssue.photo.replace(/\\/g, '/')}`;
    const displayName = currentIssue.name.charAt(0).toUpperCase() + currentIssue.name.slice(1);
    
    document.getElementById('detail-image').src = imageUrl;
    document.getElementById('detail-image').alt = `Image for ${displayName}`;
    document.getElementById('detail-name').textContent = displayName;
    document.getElementById('detail-description').textContent = currentIssue.description;

    // --- NEW LOGIC: We will set the location text after the map and geocoder are ready ---
    // So we don't set the detail-area text here anymore.

    // If Google Maps is already loaded, we can proceed.
    // If not, the `initMap` function will handle it when the script loads.
    if (window.google && window.google.maps) {
        initMap();
    }
}

function displayError() {
    document.getElementById('detail-name').textContent = 'Issue Not Found';
    document.getElementById('detail-description').textContent = 'Please go back and select a valid issue.';
    document.getElementById('detail-image').src = 'https://i.imgur.com/Q2BAOd2.png';
}

// This function is called by the Google Maps API script when it's ready
function initMap() {
    if (!currentIssue || !currentIssue.lat || !currentIssue.lng) {
        document.getElementById('map').innerHTML = '<p class="error-message">Map data is not available for this issue.</p>';
        // Fallback to the user's address if no map data
        document.getElementById('detail-area').textContent = `📍 ${currentIssue.area}`;
        return;
    }
    
    const issueLocation = { 
        lat: parseFloat(currentIssue.lat), 
        lng: parseFloat(currentIssue.lng) 
    };

    // --- NEW: REVERSE GEOCODING TO GET THE ADDRESS ---
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ 'location': issueLocation }, (results, status) => {
        const locationTextElement = document.getElementById('detail-area');
        if (status === 'OK' && results[0]) {
            // Use the formatted address from Google
            locationTextElement.textContent = `📍 ${results[0].formatted_address}`;
        } else {
            // If geocoding fails, fall back to the user's registered address
            locationTextElement.textContent = `📍 ${currentIssue.area}`;
            console.error('Geocoder failed due to: ' + status);
        }
    });

    // Create the map (this part is unchanged)
    // Create the map
const map = new google.maps.Map(document.getElementById("map"), {
    zoom: 17,
    center: issueLocation,
    styles: [ // Your custom dark-mode styles are kept
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
        { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
        { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
        { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
        { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
        { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
        { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
        { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
        { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
        { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
        { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
        { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
        { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
        { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
        { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
    ],

    // --- ADD THESE LINES TO GET YOUR CONTROLS BACK ---
    streetViewControl: true, // This brings back the Pegman for Street View
    mapTypeControl: true,    // This brings back the "Map | Satellite" switcher
    mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: google.maps.ControlPosition.TOP_RIGHT,
        mapTypeIds: ["roadmap", "satellite", "terrain", "hybrid"] // Explicitly include terrain and hybrid
    },
    fullscreenControl: true, // Adds the fullscreen button
    zoomControl: true         // Ensures the zoom controls are visible
});

    // Create a marker (this part is unchanged)
    new google.maps.Marker({
        position: issueLocation,
        map: map,
        title: currentIssue.name,
    });
}