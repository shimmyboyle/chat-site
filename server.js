const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    // Add CORS configuration for mobile browsers
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    },
    // Enable transport fallbacks for better mobile compatibility
    transports: ['websocket', 'polling']
});

// Serve static files from public directory
app.use(express.static('public'));

// Initialize SQLite database
const db = new sqlite3.Database('chat.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
    }
});

// Create messages table if it doesn't exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            console.error('Error creating table:', err.message);
        } else {
            console.log('Messages table ready');
        }
    });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    
    // Send existing messages to newly connected user
    db.all("SELECT * FROM messages ORDER BY timestamp ASC LIMIT 50", (err, rows) => {
        if (err) {
            console.error('Error fetching messages:', err.message);
            return;
        }
        socket.emit('load_messages', rows);
    });
    
    // Handle new messages
    socket.on('new_message', (data) => {
        const message = data.message ? data.message.trim() : '';
        
        // Validate message
        if (message.length > 0 && message.length <= 500) {
            // Save to database
            db.run("INSERT INTO messages (message) VALUES (?)", [message], function(err) {
                if (err) {
                    console.error('Error saving message:', err.message);
                    socket.emit('error', { message: 'Failed to save message' });
                    return;
                }
                
                const messageData = {
                    id: this.lastID,
                    message: message,
                    timestamp: new Date().toISOString()
                };
                
                console.log('New message saved:', messageData.id);
                
                // Broadcast to all connected clients
                io.emit('message_broadcast', messageData);
            });
        } else {
            // Send error for invalid message
            socket.emit('error', { 
                message: 'Message must be between 1 and 500 characters' 
            });
        }
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
        console.log('User disconnected:', socket.id, 'Reason:', reason);
    });
    
    // Handle connection errors
    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });
});

// Error handling for the server
server.on('error', (error) => {
    console.error('Server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down server...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed');
        }
    });
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});