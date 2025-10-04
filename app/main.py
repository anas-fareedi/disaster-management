from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from contextlib import asynccontextmanager
from database import engine, Base
from routes import requests as request_routes

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    print("🚀 Starting Crowdsourced Disaster Relief API...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created/verified")
    yield
    print("🛑 Shutting down API...")

app = FastAPI(
    title="Crowdsourced Disaster Relief API",
    description="A platform for coordinating disaster relief efforts through crowdsourced requests and volunteer responses",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="app/static"), name="static")

templates = Jinja2Templates(directory="app/templates")

app.include_router(request_routes.router, prefix="/api", tags=["requests"])

@app.get("/", response_class=HTMLResponse, tags=["pages"])
async def home(request: Request):
    """Serve the main request submission form"""
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/map", response_class=HTMLResponse, tags=["pages"])
async def map_view(request: Request):
    """Serve the map visualization page"""
    return templates.TemplateResponse("map.html", {"request": request})

@app.get("/dashboard", response_class=HTMLResponse, tags=["pages"])
async def dashboard(request: Request):
    """Serve the volunteer/NGO dashboard"""
    return templates.TemplateResponse("dashboard.html", {"request": request})


@app.get("/health", tags=["system"])
async def health_check():
    """API health check endpoint"""
    return {
        "status": "healthy",
        "message": "Disaster Relief API is running",
        "version": "1.0.0"
    }

@app.get("/info", tags=["system"])
async def api_info():
    """Get API information and available endpoints"""
    return {
        "title": "Crowdsourced Disaster Relief API",
        "description": "Platform for disaster relief coordination",
        "features": [
            "Submit disaster relief requests",
            "View requests on interactive map",
            "Volunteer/NGO dashboard",
            "Request status tracking",
            "Spam filtering"
        ],
        "endpoints": {
            "pages": {
                "/": "Request submission form",
                "/map": "Interactive map view",
                "/dashboard": "Volunteer dashboard"
            },
            "api": {
                "/api/requests": "Manage relief requests",
                "/health": "Health check",
                "/info": "API information"
            }
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,  
        log_level="info"
    )