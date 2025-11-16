// Yes....yes I used AI for this. It is a test file for client

const io = require('socket.io-client');

// Connect to your server
const socket = io('http://localhost:5000');

socket.on('connect', () => {
    console.log('✅ Mock client connected:', socket.id);
    
    // Simulate user login - register with userId
    const mockUserId = '123';
    socket.emit('register', mockUserId);
    console.log(`📤 Registered as user ${mockUserId}`);
});

socket.on('registered', (data) => {
    console.log('✅ Registration confirmed:', data);
});

socket.on('notification', (data) => {
    console.log('🔔 Notification received:', data);
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected');
});

socket.on('connect_error', (error) => {
    console.error('❌ Connection error:', error.message);
});

// Keep the script running
console.log('Mock client running... Press Ctrl+C to exit');

// Optional: Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nDisconnecting...');
    socket.disconnect();
    process.exit();
});