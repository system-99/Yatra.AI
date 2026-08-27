# 🧭 Yatra.AI — AI-Powered Dynamic Travel Replanner

> **Your journey changes. Your itinerary should too.**

Yatra.AI is an AI-powered travel planning and **dynamic replanning** application that helps travelers create and adapt their itineraries when unexpected changes occur during a trip.

Instead of giving you a static itinerary, Yatra.AI is designed to **react to real-world disruptions** and generate an updated travel plan based on the user's situation.

---

## ✨ Features

* 🗺️ **AI-Powered Itinerary Planning**

  * Generate personalized travel itineraries based on destination and preferences.

* 🔄 **Dynamic Replanning**

  * Adapt the itinerary when plans change or unexpected situations occur.

* 📍 **Interactive Maps**

  * Visualize destinations and itinerary locations on a map.

* 🤖 **AI Travel Assistant**

  * Uses AI to understand travel requirements and provide useful recommendations.

* ⚡ **FastAPI Backend**

  * High-performance Python backend for handling application logic and APIs.

* 💻 **Modern Frontend**

  * Interactive web interface for creating and managing travel plans.

* 🌦️ **Real-World Adaptability**

  * Designed to account for changing travel conditions and user constraints.

---

## 🏗️ Architecture

```text
                    ┌─────────────────────┐
                    │      User           │
                    │   Travel Request    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      Frontend       │
                    │   React Web App      │
                    └──────────┬──────────┘
                               │
                               │ API Requests
                               ▼
                    ┌─────────────────────┐
                    │   FastAPI Backend   │
                    │                     │
                    │  Travel Logic       │
                    │  AI Processing      │
                    │  Replanning         │
                    └──────────┬──────────┘
                               │
                  ┌────────────┼────────────┐
                  ▼            ▼            ▼
             ┌─────────┐ ┌─────────┐ ┌────────────┐
             │   AI    │ │ Maps /  │ │ External   │
             │ Models  │ │Location │ │ APIs       │
             └─────────┘ └─────────┘ └────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Updated Itinerary   │
                    │   + Map Display     │
                    └─────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

* React.js
* JavaScript
* HTML5
* CSS3
* Vite
* Map integration

### Backend

* Python
* FastAPI
* REST APIs
* AI/LLM integration

### AI

* Generative AI
* LLM-based reasoning
* AI-powered itinerary generation
* Dynamic itinerary replanning

### Development Tools

* Git
* GitHub
* VS Code
* npm
* Python Virtual Environment

---

## 📂 Project Structure

```text
Yatra-AI/
│
├── backend/
│   └── app/
│       ├── main.py
│       └── ...
│
├── FRONTEND/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Itinerary.jsx
│   │   │   └── Map.jsx
│   │   │
│   │   ├── hooks/
│   │   ├── services/
│   │   └── ...
│   │
│   ├── .env.example
│   └── package.json
│
├── .gitignore
├── LICENSE
└── README.md
```

---

## 🚀 Getting Started

Follow these steps to run Yatra.AI locally.

### 1. Clone the Repository

```bash
git clone https://github.com/jayendra08/Yatra-AI.git
```

```bash
cd Yatra-AI
```

---

# 🔙 Backend Setup

### 2. Navigate to Backend

```bash
cd backend
```

### 3. Create a Virtual Environment

Windows:

```bash
python -m venv venv
```

Activate it:

```bash
venv\Scripts\activate
```

### 4. Install Dependencies

```bash
pip install -r requirements.txt
```

### 5. Configure Environment Variables

Create a `.env` file inside the backend directory and add the required API keys.

Example:

```env
OPENAI_API_KEY=your_api_key
GOOGLE_MAPS_API_KEY=your_api_key
```

> Do not commit your `.env` file or expose API keys publicly.

### 6. Start the Backend

```bash
uvicorn app.main:app --reload
```

The backend will run at:

```text
http://127.0.0.1:8000
```

FastAPI documentation:

```text
http://127.0.0.1:8000/docs
```

---

# 🎨 Frontend Setup

Open another terminal.

### 7. Navigate to Frontend

From the project root:

```bash
cd FRONTEND
```

### 8. Install Dependencies

```bash
npm install
```

### 9. Start the Development Server

```bash
npm run dev
```

Vite will provide a local URL, usually:

```text
http://localhost:5173
```

Open the **frontend URL** in your browser to see the complete Yatra.AI application.

---

## 🔄 How Yatra.AI Works

### Step 1 — User Provides Travel Requirements

The user provides information such as:

* Destination
* Number of days
* Places they want to visit
* Preferences
* Travel constraints

### Step 2 — AI Generates an Itinerary

The backend processes the request and generates a structured travel itinerary.

### Step 3 — Itinerary is Displayed

The frontend presents the itinerary in an easy-to-use interface along with map information.

### Step 4 — Something Changes

For example:

```text
❌ Attraction becomes unavailable
🌧️ Weather changes
⏰ User loses travel time
📍 User changes location
🚫 A planned activity becomes unavailable
```

### Step 5 — Dynamic Replanning

Instead of forcing the user to manually rebuild the entire itinerary, Yatra.AI can reconsider the remaining plan and generate an updated itinerary.

```text
Original Plan
     │
     ▼
Unexpected Change
     │
     ▼
AI Re-evaluates Remaining Activities
     │
     ▼
New Constraints
     │
     ▼
Updated Itinerary
```

---

## 💡 Why Yatra.AI?

Traditional travel planners usually create **static itineraries**.

But real trips are rarely static.

Flights get delayed.
Weather changes.
Places close.
Plans take longer than expected.

Yatra.AI focuses on making travel planning **adaptive rather than fixed**.

> **Plan → Travel → Detect Change → Replan → Continue**

---

## 🎯 Use Cases

Yatra.AI can be useful for:

* 🧳 Vacation planning
* 🌍 Multi-day trips
* 👨‍👩‍👧 Family travel
* 🎒 Backpacking
* 🏙️ City exploration
* ⏰ Time-constrained trips
* 🌦️ Weather-based replanning
* 🚫 Unexpected attraction closures

---

## 🔮 Future Improvements

Some potential improvements include:

* ✈️ Flight and train integration
* 🏨 Hotel recommendations
* 🍽️ Restaurant recommendations
* 🌦️ Real-time weather integration
* 🚦 Real-time traffic information
* 💰 Budget-aware itinerary planning
* 🧠 More advanced autonomous AI agents
* 📱 Mobile application
* 🔔 Real-time travel alerts
* 👥 Collaborative trip planning

---

## 🔐 Environment Variables

API keys should **never** be committed to GitHub.

Use `.env` locally:

```env
API_KEY=your_api_key
```

And provide an `.env.example` file:

```env
API_KEY=
```

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a new branch

```bash
git checkout -b feature/your-feature
```

3. Make your changes
4. Commit your changes

```bash
git add .
git commit -m "Add new feature"
```

5. Push the branch

```bash
git push origin feature/your-feature
```

6. Open a Pull Request

---

## 📜 License

This project is licensed under the **MIT License**.

See the `LICENSE` file for more information.

---

## 👨‍💻 Developer

**Jayendra**

Built with ❤️ using **AI, FastAPI, React, and modern web technologies.**

---

⭐ If you find Yatra.AI interesting, consider giving the repository a star!

**Yatra.AI — Travel plans that adapt to reality. 🧭**
