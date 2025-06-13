const socket = io();
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const connectionStatus = document.getElementById('connectionStatus');

let isConnected = false;

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
        displayMessage(msg.message);
    });
    scrollToBottom();
});

// Receive new messages
socket.on('message_broadcast', (data) => {
    displayMessage(data.message);
    scrollToBottom();
});

// Display message in chat
function displayMessage(message) {
    const messageElement = document.createElement('div');
    messageElement.className = 'message';
    messageElement.textContent = message;
    messagesDiv.appendChild(messageElement);
}

// Scroll to bottom of messages
function scrollToBottom() {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
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
        sendMessage();
    }
});

// Prevent zoom on iOS when focusing input
messageInput.addEventListener('touchstart', (e) => {
    e.target.style.fontSize = '16px';
});

// Auto-focus input on desktop
if (window.innerWidth > 768) {
    messageInput.focus();
}