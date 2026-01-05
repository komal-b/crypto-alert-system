const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const Redis = require("ioredis");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 1. Redis Setup
// We need a Subscriber to listen to the Worker
const redisSub = new Redis();
// We need a normal Client to write data (add alerts)
const redisClient = new Redis();

app.use(express.static('public')); // Will serve our HTML file later

// 2. Subscribe to the Channels the Worker is using
redisSub.subscribe("price_updates", "alert_notifications", (err, count) => {
    if (err) console.error("Failed to subscribe: %s", err.message);
    else console.log(`✅ Subscribed to ${count} channels.`);
});

// 3. Listen for Messages from Redis (The Bridge)
redisSub.on("message", (channel, message) => {
    const data = JSON.parse(message);

    if (channel === "price_updates") {
        // CONCEPT: Broadcasting
        // The worker sent a price. Send it to ALL connected browsers.
        io.emit("price-tick", data);
    } 
    else if (channel === "alert_notifications") {
        // CONCEPT: Targeted Messaging
        // The worker says User X needs an alert. Send ONLY to User X.
        console.log(`🔔 Alert triggered for socket: ${data.socketId}`);
        io.to(data.socketId).emit("alert-popup", data.message);
    }
});

// 4. Handle Browser Connections
io.on('connection', (socket) => {
    console.log('👤 User connected:', socket.id);

    // Event: User wants to set an alert
    socket.on('set-alert', async (targetPrice) => {
    
        const key = `alerts:${coin.toLowerCase()}`;

        // CONCEPT: Redis Sorted Sets (ZSET)
        // We store the Socket ID as the 'value' and the Target Price as the 'score'.
        // This lets the Worker find "All users with score < X" instantly.
        await redisClient.zadd(key, targetPrice, socket.id);
        
        console.log(`✅ Alert set for ${socket.id} at $${targetPrice}`);
        socket.emit("alert-confirmed", `Alert set for $${targetPrice}`);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(3000, () => {
    console.log('🚀 Server running on http://localhost:3000');
});