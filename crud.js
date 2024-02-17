const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');

const app = express();
const PORT = process.env.PORT || 3000;

// Create MySQL connection pool
const pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: 'YourRootPassword',
    database: 'newdb'
});

console.log("connected")

// Middleware for parsing JSON bodies
app.use(bodyParser.json());

// Middleware for user authentication
function authenticateUser(req, res, next) {
    // You can implement JWT authentication here
    // For simplicity, let's assume user authentication using a username and password
    const { username, password } = req.body;

    // Query the database to authenticate user
    pool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], (error, results) => {
        if (error) {
            console.error('Error authenticating user:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }

        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        req.user = results[0];
        next();
    });
}

// Middleware for checking user roles
function checkUserRole(role) {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        next();
    };
}

// Endpoint for creating events (only for organizers)
app.post('/events',(req, res) => {
    const {id,event_name,contact_mobile,date,venue_addr,max_entry_per_registration,registration_status } = req.body;

    pool.query('INSERT INTO events (id,event_name,contact_mobile,date,venue_addr,max_entry_per_registration,registration_status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id,event_name,contact_mobile,date,venue_addr,max_entry_per_registration,registration_status, req.user.id],
        (error, results) => {
            if (error) {
                console.error('Error creating event:', error);
                return res.status(500).json({ message: 'Internal Server Error' });
            }

            res.status(201).json({ message: 'Event created successfully', eventId: results.insertId });
        });
});

// Endpoint for listing events (filtering by name, date, venue)
app.get('/events', authenticateUser, (req, res) => {
    const { name, date, venue } = req.query;

    let query = 'SELECT * FROM events WHERE 1';
    const params = [];

    if (name) {
        query += ' AND name LIKE ?';
        params.push(`%${name}%`);
    }

    if (date) {
        query += ' AND date = ?';
        params.push(date);
    }

    if (venue) {
        query += ' AND venue = ?';
        params.push(venue);
    }

    pool.query(query, params, (error, results) => {
        if (error) {
            console.error('Error listing events:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }

        res.json(results);
    });
});

// Endpoint for event registration (for participants)
app.post('/register', authenticateUser, (req, res) => {
    const { eventId, participantName, email } = req.body;

    // Check if event registration is open
    pool.query('SELECT * FROM events WHERE id = ?', [eventId], (error, results) => {
        if (error) {
            console.error('Error checking event registration status:', error);
            return res.status(500).json({ message: 'Internal Server Error' });
        }

        if (results.length === 0 || results[0].status !== 'open') {
            return res.status(400).json({ message: 'Event registration is closed' });
        }

        // Perform registration
        pool.query('INSERT INTO registrations (event_id, participant_name, email) VALUES (?, ?, ?)',
            [eventId, participantName, email],
            (error, results) => {
                if (error) {
                    console.error('Error registering participant:', error);
                    return res.status(500).json({ message: 'Internal Server Error' });
                }

                res.status(201).json({ message: 'Participant registered successfully', registrationId: results.insertId });
            });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
