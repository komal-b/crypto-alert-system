# ⚡ Real-Time Crypto Alert System

A high-performance, event-driven cryptocurrency dashboard that tracks live prices and triggers instant user alerts. Built to demonstrate **scalable system design** using **Redis Pub/Sub**, **WebSockets**, and **Worker Microservices**.

![Status](https://img.shields.io/badge/Status-Proof%20of%20Concept-orange)
![Stack](https://img.shields.io/badge/Tech-Node.js%20%7C%20Redis%20%7C%20Socket.io-blue)

## 🏗️ System Architecture

Unlike typical monolithic apps, this project uses a decoupled architecture to handle high-concurrency real-time data.



1.  **The Worker (Publisher):** A standalone microservice that fetches prices from CoinGecko and pushes them to Redis. It handles the "heavy lifting" of API polling.
2.  **Redis (The Broker):**
    * **Pub/Sub:** Broadcasts price updates to the main server.
    * **Sorted Sets (ZSET):** Efficiently stores and ranks thousands of user alerts (O(log N) complexity).
3.  **The Server (Subscriber):** A lightweight Express server that listens to Redis and pushes data to the frontend via WebSockets.
4.  **The Client:** A live dashboard using Chart.js and Socket.io for bidirectional communication.

---

## 🚀 Features

* **📡 Real-Time Data Stream:** Live Bitcoin & Ethereum prices without page refreshes.
* **🔔 Targeted Alerts:** Users set price targets. When hit, the server notifies *only* that specific user (using Socket ID targeting).
* **📊 Dynamic Visualization:** Live updating line charts using Chart.js.
* **⚡ Low Latency:** "Push" technology ensures alerts trigger practically instantly when the price hits.

---

## 🛠️ Tech Stack

* **Backend:** Node.js, Express
* **Real-Time Engine:** Socket.io (WebSockets)
* **Database / Message Broker:** Redis (ioredis)
* **Frontend:** HTML5, CSS3, Chart.js
* **External API:** CoinGecko

---

## 🏃‍♂️ How to Run

### Prerequisites
* Node.js installed.
* Redis installed and running locally on port `6379`.

### 1. Clone & Install
```
git clone [https://github.com/komal-b/crypto-alert-system.git](https://github.com/komal-b/crypto-alert-system.git)
cd crypto-alert-system
npm install
```

2. Start Redis
Make sure your Redis server is up.
```
redis-server
```
3. Start the Components
You need to run the Server and the Worker in separate terminals.

Terminal 1 (The Web Server):

```
node server.js
```
Terminal 2 (The Price Fetcher):
```
node worker.js
```
4. View the App
Open your browser and go to: http://localhost:3000

## 🧠 Key Design Decisions (Why Redis?)
Decoupling: If the worker crashes, the server stays alive (users can still view the site, just no updates). If the server restarts, the worker keeps fetching.

Scalability: We use Redis Pub/Sub. If we had 100,000 users, we could spin up 10 servers, and they would all subscribe to the same Redis channel seamlessly.

Performance: Redis Sorted Sets allow us to check alerts for thousands of users in milliseconds, rather than looping through a slow SQL database.

## ⚠️ Known Limitations (To-Do)
Session Persistence: Alerts are currently tied to ephemeral socket.id. If a user refreshes the page, their alerts are lost.
Input Validation: Basic validation exists, but production grade sanitization is needed.
Garbage Collection: Expired alerts are removed, but "zombie" alerts from disconnected users currently remain in Redis until a manual TTL is implemented.

