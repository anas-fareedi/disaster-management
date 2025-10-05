
# Crowdsourced Disaster Relief (ResQ) 🚨

A disaster management platform built during a hackathon.  
It allows people to **submit disaster requests (food, rescue, medical, etc.)**,  
and helps **NGOs/volunteers visualize and respond** via a dashboard and live map.

---

## ✨ Features

- ✅ Submit disaster relief requests (form-based submission).  
- ✅ Interactive **map visualization** of requests.  
- ✅ Volunteer/NGO **dashboard** to manage requests.  
- ✅ Spam/duplicate request filtering.  
- ✅ Database-backed (MySQL + SQLAlchemy).  
- ✅ Built with **FastAPI** and **Jinja2 templates**.  

---

## ⚡ Tech Stack

- **Backend**: FastAPI, SQLAlchemy, Pydantic  
- **Database**: MySQL  
- **Frontend**: HTML, CSS, JS (Jinja2 templates, static files)  
- **Other**: Geolocation utilities, Spam filtering  

---

## 🚀 Getting Started
**STEPS**
### 1️⃣ Clone the repository
```
git clone https://github.com/anas-fareedi/disaster-management.git
```
**2️⃣ Create & activate a virtual environment**
python -m venv .venv
source .venv/bin/activate   # on Linux/Mac
.venv\Scripts\activate      # on Windows

**3️⃣ Install dependencies**
pip install -r requirements.txt

**4️⃣ Configure the database**
Create a MySQL database (example: disaster_db).
Update app/database.py with your DB credentials.

**5️⃣ Run the application**
uvicorn app.main:app --reload


crowdsourced-disaster-relief/
│
├── app/
│   ├── main.py                  # Entry point (FastAPI app)
│   ├── database.py              # DB connection (MySQL)
│   ├── models.py                # SQLAlchemy models (Request table)
│   ├── schemas.py               # Pydantic schemas for validation
│   ├── crud.py                  # Database operations (create, fetch, update)
│   ├── routes/
│   │   ├── __init__.py
│   │   └── requests.py          # API endpoints (submit/fetch/update)
│   │
│   ├── templates/               # HTML files (Jinja2 templates)
│   │   ├── index.html           # Request submission form
│   │   ├── map.html             # Map visualization page
│   │   └── dashboard.html       # Volunteer/NGO dashboard
│   │
│   ├── static/                  # CSS, JS, Images (served by FastAPI)
│   │   ├── css/
│   │   │   └── styles.css
│   │   ├── js/
│   │   │   ├── main.js          # Handles form submissions
│   │   │   ├── map.js           # Fetches & plots requests on map
│   │   │   └── dashboard.js     # Admin/Volunteer logic
│   │   └── icons/
│   │       └── ...              # Map icons for rescue, food, etc.
│   │
│   └── utils/
│       ├── filters.py           # Spam/duplicate filtering logic
│       └── geo_utils.py         # Location utilities (optional)
│
├── requirements.txt             # FastAPI, SQLAlchemy, Jinja2, MySQL connector
└── README.md

**Contribution**

Pull requests are welcome!
If you’d like to add features, improve documentation, or fix bugs,
please open an issue first to discuss what you’d like to change.
