const Redis = require("ioredis");
const axios = require("axios");

// 1. Create Redis Connections
// We need two: one to write data (publisher), one for general commands
const redis = new Redis();     // Standard connection for data ops
const publisher = new Redis(); // Dedicated connection for Pub/Sub

const COIN_API_URL = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd";

async function fetchAndProcess() {
    try {
        console.log("🔍 Fetching prices...");
        
        // A. Fetch Real Data
        const response = await axios.get(COIN_API_URL);
        const btcPrice = response.data.bitcoin.usd;
        const ethPrice = response.data.ethereum.usd;
        const coins = [
        { name: "bitcoin", price: btcPrice }, 
        { name: "ethereum", price: ethPrice }
    ];

        console.log(`💰 BTC: $${btcPrice} | ETH: $${ethPrice}`);

        // B. Publish Price Update (For the Frontend Graph)
        // The server.js will hear this and show it to everyone
        await publisher.publish("price_updates", JSON.stringify({
            bitcoin: btcPrice,
            ethereum: ethPrice,
            timestamp: Date.now()
        }));

        // 2. STORE (History) - For users who join later
        // "LPUSH" adds to the start of a list
        await redis.lpush("price_history", JSON.stringify({
            bitcoin: btcPrice,
            ethereum: ethPrice,
            timestamp: Date.now()
        }));

        await redis.ltrim("price_history", 0, 49); // Keep only latest 100 entries

        // C. Check for Alerts (The "Senior" Logic)
        // We look for users who wanted to be notified if BTC >= currentPrice
        // ZRANGEBYSCORE key min max
        // We check alerts between 0 and currentPrice (assuming "notify when drops" logic)
        // OR for "notify when rises", you'd check differently. 
        // Let's implement: "Notify if Price >= Target" (e.g. Target 95k, Price is 96k -> Trigger)
        for (const coin of coins) {
            const key = `alerts:${coin.name}`;
            
            // Get all UserIDs who have a target price <= current actual price
            // These are the people whose condition has been met.
            const usersToNotify = await redis.zrangebyscore(key, "-inf", coin.price);

            if (usersToNotify.length > 0) {
                console.log(`🚨 Triggering alerts for ${usersToNotify.length} users!`);
                
                for (const socketId of usersToNotify) {
                    // 1. Tell the Server to notify this specific user
                    await publisher.publish("alert_notifications", JSON.stringify({
                        socketId: socketId,
                        message: `BTC has reached $${btcPrice}!`
                    }));

                    // 2. Remove t he alert so they don't get spammed every 5 seconds
                    await redis.zrem(key, socketId);
                }
            }
        }

    } catch (error) {
        if (error.response && error.response.status === 429) {
            console.warn("⚠️ Too many requests! Skipping this turn to cool down...");
        } else {
            console.error("Error in worker:", error.message);
        }
    }
}


// CoinGecko allows ~10-30 calls/min. We will run every 10 seconds to be safe.
setInterval(fetchAndProcess, 10000);

console.log("👷 Worker started. Polling every 10s...");