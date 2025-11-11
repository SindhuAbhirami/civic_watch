

// START OF FILE: backend/server.js (REVERTED VERSION)
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const bcrypt = require('bcrypt');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const citizensDbPath = path.join(__dirname, 'citizens.json');
const officialsDbPath = path.join(__dirname, 'officials.json');
const issuesDbPath = path.join(__dirname, 'issues.json');

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const FormData = require('form-data');

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const loadDB = (filePath) => {
    try {
        if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) return [];
        return JSON.parse(fs.readFileSync(filePath));
    } catch (error) { return []; }
};
const saveDB = (data, filePath) => fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir), // use absolute path
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ storage: storage });

// --- USER ROUTES ---
app.post('/register', upload.single('photo'), async (req, res) => {
    try {
        const { role, phone, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { ...req.body, id: Date.now(), username: phone, password: hashedPassword, photo: req.file ? req.file.path : null };

        if (role === 'official') {
            const officials = loadDB(officialsDbPath);
            if (officials.find(o => o.phone === phone)) return res.status(400).json({ message: 'Phone number already registered.' });
            officials.push(newUser);
            saveDB(officials, officialsDbPath);
        } else {
            const citizens = loadDB(citizensDbPath);
            if (citizens.find(c => c.phone === phone)) return res.status(400).json({ message: 'Phone number already registered.' });
            citizens.push(newUser);
            saveDB(citizens, citizensDbPath);
        }
        res.status(201).json({ message: 'Registration successful! You can now log in.' });
    } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = [...loadDB(officialsDbPath), ...loadDB(citizensDbPath)].find(u => u.username === username);
        if (!user || !await bcrypt.compare(password, user.password)) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        res.status(200).json({ message: 'Login successful!', user: { id: user.id, fullname: user.fullname, role: user.role, username: user.username } });
    } catch (e) { res.status(500).json({ message: 'Server error.' }); }
});

// --- NEW: GET USER PROFILE ROUTE ---
app.get('/get-user-profile/:id/:role', (req, res) => {
    try {
        const { id, role } = req.params;
        let db = role === 'official' ? loadDB(officialsDbPath) : loadDB(citizensDbPath);
        const userProfile = db.find(u => String(u.id) === id);

        if (!userProfile) {
            return res.status(404).json({ message: 'User profile not found.' });
        }
        // Exclude password for security
        const { password, ...safeProfile } = userProfile; 
        res.status(200).json(safeProfile);
    } catch (e) {
        console.error('Error fetching user profile:', e);
        res.status(500).json({ message: 'Server error fetching profile.' });
    }
});

// --- NEW: UPDATE PROFILE ROUTE ---
app.put('/update-profile/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { fullname, age, address, department, role } = req.body;

        let dbPath = role === 'official' ? officialsDbPath : citizensDbPath;
        let db = loadDB(dbPath);
        const userIndex = db.findIndex(u => String(u.id) === id);

        if (userIndex === -1) {
            return res.status(404).json({ message: 'User not found.' });
        }

        db[userIndex].fullname = fullname;
        db[userIndex].age = age;

        if (role === 'official') {
            db[userIndex].department = department;
        } else {
            db[userIndex].address = address;
        }

        saveDB(db, dbPath);
        res.status(200).json({ message: 'Profile updated successfully!' });
    } catch (e) {
        console.error('Error updating profile:', e);
        res.status(500).json({ message: 'Server error updating profile.' });
    }
});

// --- NEW: CHANGE PASSWORD ROUTE ---
app.put('/change-password/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, role, currentPassword, newPassword } = req.body;

        let dbPath = role === 'official' ? officialsDbPath : citizensDbPath;
        let db = loadDB(dbPath);
        const userIndex = db.findIndex(u => String(u.id) === id && u.username === username);

        if (userIndex === -1) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const user = db[userIndex];

        // Verify current password
        if (!await bcrypt.compare(currentPassword, user.password)) {
            return res.status(401).json({ message: 'Incorrect current password.' });
        }

        // Hash and save new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        db[userIndex].password = hashedPassword;
        saveDB(db, dbPath);

        res.status(200).json({ message: 'Password changed successfully!' });
    } catch (e) {
        console.error('Error changing password:', e);
        res.status(500).json({ message: 'Server error changing password.' });
    }
});


// --- ISSUE ROUTES ---
// START OF FILE: backend/server.js
// ... (other code)

app.post('/report-issue', upload.single('issue-photo'), async (req, res) => {
    try {
        const issues = loadDB(issuesDbPath);
        const citizens = loadDB(citizensDbPath);
        const { 'issue-type': issueType, 'other-issue-text': otherIssueText, reporterId, 'issue-description': description, lat, lng } = req.body;

        const reporter = citizens.find(c => String(c.id) === reporterId);
        if (!reporter) return res.status(404).json({ message: "Reporting user not found." });

        // CORRECTED: Ensure photoPath is stored correctly for frontend access
        let storedPhotoPath = null;
        if (req.file) {
            // Store only the path relative to the 'uploads' directory
            storedPhotoPath = `uploads/${req.file.filename}`;
        }

        let autoDescription = description;

        // Only call AI if description is empty and photo exists
        if (!description && storedPhotoPath) { // Use storedPhotoPath here
            try {
                const formData = new FormData();
                // When sending to AI, use the actual file stream, not the stored path string
                formData.append('file', fs.createReadStream(req.file.path));

                const response = await axios.post("http://127.0.0.1:5001/predict", formData, {
                    headers: formData.getHeaders()
                });

                autoDescription = `Detected: ${response.data.class} (${(response.data.confidence*100).toFixed(2)}%)`;
            } catch (err) {
                console.error("AI prediction failed:", err.message);
            }
        }

        const issueName = issueType === 'other' ? otherIssueText || 'Other Issue' : issueType.replace(/-/g, ' ');

        const newIssue = {
            ...req.body,
            id: Date.now(),
            name: issueName,
            description: autoDescription || "No description",
            area: reporter.address || "",
            status: 'Reported, Pending Confirmation',
            statusColor: 'status-red',
            photo: storedPhotoPath, // Use the corrected path here!
            timestamp: new Date().toISOString(),
            handlerId: null,
            lat: lat || null,
            lng: lng || null
        };

        issues.push(newIssue);
        saveDB(issues, issuesDbPath);

        res.status(201).json({ message: 'Issue reported successfully!' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Server error while submitting report.' });
    }
});

// ... (rest of your server.js)


app.get('/get-issues', (req, res) => res.status(200).json(loadDB(issuesDbPath).reverse()));
app.get('/get-my-issues/:reporterId', (req, res) => res.status(200).json(loadDB(issuesDbPath).filter(i => String(i.reporterId) === req.params.reporterId).reverse()));
app.get('/get-official-issues', (req, res) => {
    const issues = loadDB(issuesDbPath);
    const citizens = loadDB(citizensDbPath);
    const officials = loadDB(officialsDbPath); // Also load officials to map handlers if needed

    res.status(200).json(issues.map(issue => {
        const reporter = citizens.find(u => String(u.id) === String(issue.reporterId)) || { fullname: 'Unknown', username: 'N/A', photo: null };
        const handler = officials.find(o => String(o.id) === String(issue.handlerId)) || null; // Find handler if assigned
        return { ...issue, reporter, handler: handler ? { fullname: handler.fullname, department: handler.department } : null };
    }).reverse());
});

app.get('/get-handled-issues/:officialId', (req, res) => {
    const issues = loadDB(issuesDbPath);
    const citizens = loadDB(citizensDbPath); // To get reporter details for history view
    const handledIssues = issues.filter(i => String(i.handlerId) === req.params.officialId).map(issue => {
        const reporter = citizens.find(u => String(u.id) === String(issue.reporterId)) || { fullname: 'Unknown' };
        return { ...issue, reporterName: reporter.fullname }; // Attach reporter name
    }).reverse();
    res.status(200).json(handledIssues);
});

app.post('/issue/accept/:id', (req, res) => {
    let issues = loadDB(issuesDbPath);
    const idx = issues.findIndex(i => String(i.id) === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Issue not found.' });
    issues[idx].status = 'Accepted by Official';
    issues[idx].statusColor = 'status-yellow';
    issues[idx].handlerId = req.body.officialId; // Ensure officialId is passed from frontend
    saveDB(issues, issuesDbPath);
    res.status(200).json({ message: 'Issue accepted.' });
});

app.post('/issue/fix/:id', (req, res) => {
    let issues = loadDB(issuesDbPath);
    const idx = issues.findIndex(i => String(i.id) === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Issue not found.' });
    issues[idx].status = 'Resolved';
    issues[idx].statusColor = 'status-green';
    issues[idx].handlerId = req.body.officialId; // Ensure officialId is passed from frontend
    saveDB(issues, issuesDbPath);
    // setTimeout(() => saveDB(loadDB(issuesDbPath).filter(i => String(i.id) !== req.params.id), issuesDbPath), 60000); // Optional: Auto-delete after 1 minute
    res.status(200).json({ message: 'Issue marked as fixed.' });
});
app.get('/get-issue/:id', (req, res) => {
    const issue = loadDB(issuesDbPath).find(i => String(i.id) === req.params.id);
    if (issue) res.status(200).json(issue); else res.status(404).json({ message: 'Issue not found' });
});

app.listen(PORT, () => console.log(`Backend server running on http://localhost:${PORT}`));