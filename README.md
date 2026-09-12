<div align="center">

# ChatToKanban

### AI-Powered WhatsApp Group Chat Task & Announcement Extractor

<br/>

> Developed for the **Pak Angels HEC Cohort 11 Mid Hackathon**

<br/>

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini-2.5-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Sortable.js](https://img.shields.io/badge/Sortable.js-1.15-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

<br/>

### Team

| | Name |
|---|------|
| <img src="https://img.shields.io/badge/-Lead-FF5500?style=flat-square" width="80"> | **Adeel Hussain** |
| | **Saim Arshad** |
| | **Amna Amjad** |
| | **Hasan Yasir** |

</div>

---

## Executive Overview

WhatsApp group chats are where projects live — and where critical deadlines go to die. Buried under hundreds of daily messages, action items get lost, announcements get muted, and team coordination crumbles into chaos.

**ChatToKanban** solves this by using Google Gemini AI to parse raw WhatsApp export files, filter out noise (greetings, memes, one-word replies), and extract structured tasks, deadlines, and formal announcements into an interactive drag-and-drop Kanban board — all within seconds.

---

## Core Features

| Feature | Description |
|---------|-------------|
| **Gemini AI Context Parsing** | Upload a raw `.txt` WhatsApp export. Gemini 2.5 Flash distinguishes actionable tasks from fluff and outputs structured JSON with title, assignee, deadline, and priority. |
| **Interactive Drag-and-Drop Kanban** | Tasks visualize across **To Do**, **In Progress**, and **Done** columns. Powered by Sortable.js for tactile card dragging with inline action buttons and an edit modal. |
| **Real-Time Visual Analytics** | Chart.js powers a bar chart (tasks per assignee) and doughnut chart (actionable vs. noise). Metrics update instantly on task changes. |
| **Multi-Format Data Exports** | Excel-ready CSV with UTF-8 BOM, fully structured JSON with metadata, and clean Markdown with tables and blockquotes. |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend | Python 3.10+, FastAPI, Uvicorn | REST API, async request handling |
| Templating | Jinja2 | Server-side HTML rendering |
| AI Engine | Google Gemini API (`langchain-google-genai`) | Structured extraction from chat transcripts |
| Data Models | Pydantic | Type-safe task/announcement schemas |
| Parsing | Pandas, python-dateutil | WhatsApp format parsing, date filtering |
| Frontend | HTML5, CSS3, Vanilla JS | Single-page application |
| Drag & Drop | Sortable.js 1.15 | Kanban card reordering |
| Charts | Chart.js 4.4 | Task distribution & noise ratio analytics |
| Typography | Plus Jakarta Sans, Inter | Headings and body text |

---

## Quick Start

### Prerequisites

- Python 3.10+
- Google Gemini API key ([Get one here](https://aistudio.google.com/apikey))

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/chattokanban.git
cd chattokanban

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Linux/macOS
# venv\Scripts\activate         # Windows

# Install dependencies
pip install -r requirements.txt
```

### Configuration

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

### Run

```bash
uvicorn main:app --reload
```

Open **http://localhost:8000** in your browser.

---

## Architecture

```
chattokanban/
├── main.py                 # FastAPI app + /api/analyze endpoint
├── chat_parser.py          # WhatsApp regex parser + date filtering
├── extractor.py            # Gemini AI extraction + Pydantic models
├── config.py               # Model constants
├── requirements.txt        # Python dependencies
├── .env.example            # Environment template
├── templates/
│   └── index.html          # Main frontend (Jinja2)
└── static/
    ├── css/
    │   └── style.css       # Light theme + responsive layout
    └── js/
        └── app.js          # Frontend logic + export functions
```

---

## Supported Data Exports

| Format | Details |
|--------|---------|
| **CSV** | UTF-8 BOM for Excel compatibility, properly escaped fields, two sections: ACTIONABLE TASKS + ANNOUNCEMENTS |
| **JSON** | Structured payload with `export_timestamp`, `summary`, `metrics`, `tasks[]`, `announcements[]` |
| **Markdown** | Formatted tables per status (To Do / In Progress / Done), blockquoted announcements, executive summary |

---

<div align="center">

**ChatToKanban** — Built with FastAPI + Gemini AI + Sortable.js

*Pak Angels HEC Cohort 11 Mid Hackathon*

</div>
