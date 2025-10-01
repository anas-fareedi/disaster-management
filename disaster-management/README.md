# disaster-management
disaster-management by crowdsourcing project for Hackathon

```
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
```
