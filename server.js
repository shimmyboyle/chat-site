const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static('public'));

// Initialize SQLite database
const db = new sqlite3.Database('chat.db');

// Create messages table if it doesn't exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected');

    // Send existing messages to newly connected user
    db.all("SELECT * FROM messages ORDER BY timestamp ASC", (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }
        socket.emit('load_messages', rows);
    });

    // Handle new messages
    socket.on('new_message', (data) => {
        const message = data.message.trim();
        
        if (message.length > 0 && message.length <= 500) {
            // Save to database
            db.run("INSERT INTO messages (message) VALUES (?)", [message], function(err) {
                if (err) {
                    console.error(err);
                    return;
                }
                
                const messageData = {
                    id: this.lastID,
                    message: message,
                    timestamp: new Date().toISOString()
                };
                
                // Broadcast to all connected clients
                io.emit('message_broadcast', messageData);
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});