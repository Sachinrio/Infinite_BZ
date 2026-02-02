
# InfiniteBZ - Chennai's Premier Business Event Platform

**InfiniteBZ** is a specialized event discovery and management platform dedicated strictly to the **Business, Tech, and Startup community in Chennai**. It filters out noise (entertainment, music, sports) to provide a professional ecosystem for networking and growth.

![InfiniteBZ Dashboard](https://via.placeholder.com/800x400?text=InfiniteBZ+Dashboard)

---

## 🌟 Key Features

### 🏢 Exclusive Business Focus
*   **Strict Filtering**: Automatically filters out non-business events (Music, Sports, Comedy, etc.).
*   **Curated Sources**: Aggregates high-quality events from:
    *   **Trade Centre (CTC)**: Major expos and trade summits.
    *   **AllEvents**: Business & Professional workshops only.
    *   **Meetup**: Tech and startup community gatherings.
    *   **Eventbrite**: Corporate seminars and conferences.

### 🤖 Smart Technology
*   **Multi-Source Scraping**: Powered by **Playwright** for robust, real-time event discovery.
*   **AI Chatbot**: Built with **Groq (Llama 3)** to answer natural language queries like *"Show me AI conferences next week"*.
*   **Dynamic Dashboard**: Real-time analytics, registration tracking, and event management.

### 🎟️ Seamless Management
*   **Unified Registration**: Register for events directly or get redirected to official sources.
*   **PDF Tickets**: Automated generation of professional QR-coded tickets.
*   **Email Confirmations**: Instant booking confirmations via SMTP.

---

## 🛠️ Tech Stack

### Backend
*   **Language**: Python 3.10+
*   **Framework**: FastAPI
*   **Database**: PostgreSQL (Async/Await with SQLAlchemy)
*   **Task Queue**: APScheduler (Background scraping & cleanup)
*   **Automation**: Playwright (Headless browser automation)
*   **AI**: LangChain + Groq API

### Frontend
*   **Framework**: React (Vite)
*   **Styling**: Modern CSS / Tailwind (Glassmorphism design)
*   **Icons**: Lucide React

---

## 🚀 Installation & Setup

### Prerequisites
*   Python 3.10+
*   Node.js 18+
*   PostgreSQL Database managed via pgAdmin

### 1. Backend Setup
1.  Navigate to the backend directory:
    ```bash
    cd backend
    ```
2.  Create and activate virtual environment:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate   # Microsoft Windows
    # source venv/bin/activate  # macOS/Linux
    ```
3.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    playwright install
    ```
4.  Configure `.env` file (see Configuration section).
5.  Run the server:
    ```bash
    python run.py
    ```
    *Server runs at: http://localhost:8000*

### 2. Frontend Setup
1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```
    *App runs at: http://localhost:5173* (or 5174)

---

## ⚙️ Configuration

Create a `.env` file in `backend/` with the following:

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/infinite_bz

# AI (Groq)
GROQ_API_KEY=your_groq_api_key_here

# Email (SMTP)
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MAIL_FROM=your_email@gmail.com
MAIL_PORT=587
MAIL_SERVER=smtp.gmail.com

# Security
SECRET_KEY=your_secret_key
ALGORITHM=HS256
```

---

## 🕷️ Scraping System
The scraper is designed to be **robust and self-healing**:
*   **`robust_scrape.py`**: Runs scrapers sequentially (AllEvents -> Meetup -> CTC -> Eventbrite).
*   **Business Filter**: A global strict filter ensures zero "junk" events enter the DB.
*   **Source Mapping**: Intellegently maps "Trade Centre" and "AllEvents" to unified backend sources.

---

*Built with ❤️ for Chennai's Startup Ecosystem.*
