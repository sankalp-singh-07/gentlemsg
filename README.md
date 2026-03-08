# 💬 GentleMsg – Real-Time Chat with Media Sharing & Emoji Support

> 🚀 A secure and modern real-time chat application with message encryption, emoji reactions, and media sharing!

![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-10-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38B2AC?style=for-the-badge&logo=tailwind-css)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite)
![Redux Toolkit](https://img.shields.io/badge/Redux--Toolkit-%23CE3534.svg?style=for-the-badge&logo=redux&logoColor=white)

---

## 🌟 What is GentleMsg?

GentleMsg is a full-featured real-time chat app where you can:

- 💬 Chat instantly with other users
- 📎 Share images and media files securely
- 😀 Pick and react with emojis
- 🔐 Advanced security with JWT authorization and profanity filtering
- 📱 Works seamlessly on mobile and desktop
- 🌙 Includes dark mode support for better usability

---

## ✨ Features

- 🔒 **Secure Authentication** via Google OAuth integration
- 💬 **Real-Time Messaging** powered by FastAPI WebSockets
- 📎 **Media Sharing** (images/docs) with server-side validation
- 😀 **Emoji Picker Integration**
- 🛡️ **GDPR Compliant** (Account Deletion & Data Export)
- ✨ **Content Moderation** (Profanity Filtering)
- 🎨 **Responsive UI** with Tailwind CSS & Framer Motion
- 🌗 **Dark Mode Ready**

---

## 🛠️ Tech Stack

### 🧩 Frontend
- React 18, React Router
- Redux Toolkit + Reselect
- IndexedDB (Dexie.js) for local caching
- Tailwind CSS 3, Vite, Framer Motion

### 🔐 Backend & Auth
- Python 3.10+ & FastAPI
- SQLAlchemy (async) + Alembic
- SQLite
- WebSockets for real-time bi-directional events

## 📋 Prerequisites

To run this locally, you will need:
- Node.js 18+
- Python 3.10+

---

## 📥 Installation

### Backend Setup (API & WebSockets)

1. Open a new terminal and navigate to the backend folder:
```bash
git clone https://github.com/sankalp-singh-07/gentlemsg.git
cd gentlemsg/backend
```

2. Create and activate a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows use: .venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables:
```bash
# Duplicate .env.example to .env and fill in required variables like your Google Client ID
cp .env.example .env
```

5. Run database migrations to set up your local SQLite database:
```bash
alembic upgrade head
```

6. Start the FastAPI server:
```bash
uvicorn main:app --reload --port 8000
```
The API will be available at `http://localhost:8000` and API docs at `http://localhost:8000/docs`.


### Frontend Setup

1. Open a new terminal and navigate to the frontend folder:
```bash
cd gentlemsg/frontend
```

2. Install node dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
# Set VITE_API_URL to http://localhost:8000
cp .env.example .env
```

4. Start the frontend development server:
```bash
npm run dev
```

---

## 🚀 Live Demo

🌐 **Try it live**: [https://www.gentlemsg.online](https://www.gentlemsg.online)

📂 **Source Code**: [github.com/sankalp-singh-07/gentlemsg](https://github.com/sankalp-singh-07/gentlemsg)
