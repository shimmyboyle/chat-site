const socket = io();
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const connectionStatus = document.getElementById('connectionStatus');
let isConnected = false;

// Viewport height fix for mobile browsers (Safari issue fix)
function setViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
}

// Handle viewport changes (important for mobile browsers)
window.addEventListener('resize', setViewportHeight);
window.addEventListener('orientationchange', () => {
    setTimeout(setViewportHeight, 100);
});
setViewportHeight();

// Connection status handling
socket.on('connect', () => {
    isConnected = true;
    connectionStatus.textContent = 'Connected';
    connectionStatus.className = 'connection-status connected';
    sendButton.disabled = false;
});

socket.on('disconnect', () => {
    isConnected = false;
    connectionStatus.textContent = 'Disconnected - Reconnecting...';
    connectionStatus.className = 'connection-status disconnected';
    sendButton.disabled = true;
});

// Load existing messages
socket.on('load_messages', (messages) => {
    messagesDiv.innerHTML = '';
    messages.forEach(msg => {
        displayMessage(msg.message, msg.timestamp);
    });
    scrollToBottom();
});

// Receive new messages
socket.on('message_broadcast', (data) => {
    displayMessage(data.message, data.timestamp);
    scrollToBottom();
});

// Display message in chat (always add to bottom)
function displayMessage(message, timestamp) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    
    // Create timestamp
    const timeElement = document.createElement('div');
    timeElement.className = 'message-time';
    
    if (timestamp) {
        const date = new Date(timestamp);
        timeElement.textContent = formatTimestamp(date);
    } else {
        timeElement.textContent = formatTimestamp(new Date());
    }
    
    // Create message content
    const contentElement = document.createElement('div');
    contentElement.className = 'message-content';
    contentElement.textContent = message;
    
    messageElement.appendChild(timeElement);
    messageElement.appendChild(contentElement);
    messagesDiv.appendChild(messageElement);
}

// Format timestamp for display
function formatTimestamp(date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    // For older messages, show actual date
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

// Scroll to bottom of messages - improved for mobile
function scrollToBottom() {
    // Use requestAnimationFrame for smoother scrolling on mobile
    requestAnimationFrame(() => {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    });
}

// Send message
function sendMessage() {
    const message = messageInput.value.trim();
    if (message && isConnected) {
        socket.emit('new_message', { message: message });
        messageInput.value = '';
    }
}

// Event listeners
sendButton.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault(); // Prevent form submission
        sendMessage();
    }
});

// iOS Safari keyboard fixes
messageInput.addEventListener('focus', () => {
    // Delay scroll to account for keyboard animation
    setTimeout(() => {
        messageInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 300);
});

// Prevent double-tap zoom on buttons (iOS Safari)
sendButton.addEventListener('touchend', (e) => {
    e.preventDefault();
    sendMessage();
});

// Prevent zoom on iOS when focusing input - your original code
messageInput.addEventListener('touchstart', (e) => {
    e.target.style.fontSize = '16px';
});

// Auto-focus input on desktop - your original code
if (window.innerWidth > 768) {
    messageInput.focus();
}