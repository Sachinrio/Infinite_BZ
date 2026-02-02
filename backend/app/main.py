import sys
import asyncio

if sys.platform == 'win32':
    import asyncio
    if not isinstance(asyncio.get_event_loop_policy(), asyncio.WindowsProactorEventLoopPolicy):
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from fastapi import FastAPI, Depends
from contextlib import asynccontextmanager
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy.future import select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import SQLModel

# Imports from your project
from app.core.database import init_db, engine
from app.api.routes import router
from app.api.auth_routes import router as auth_router
from app.api.admin_routes import router as admin_router
from app.api.scraper_routes import router as scraper_router # NEW ROUTER
from app.models.schemas import Event
from app.services.event_manager import run_full_scrape_cycle, remove_outdated_events

# --- THE BACKGROUND TASK ---
async def scheduled_scraper_task():
    """
    Runs automatically daily. Now spawns a separate worker process to avoid Windows loop issues.
    """
    import subprocess
    import sys
    import os
    python_exe = sys.executable
    worker_script = os.path.join(os.getcwd(), "scraper_worker.py")
    log_file = os.path.join(os.getcwd(), "scraper.log")
    # Open log file for background process inheritance
    f = open(log_file, "a")
    subprocess.Popen(
        [python_exe, worker_script], 
        stdout=f, 
        stderr=f, 
        creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
    )

async def scheduled_cleanup_task():
    """
    Runs automatically to delete expired events.
    Now delegates to event_manager logic but kept for scheduler clarity.
    """
    from app.services.event_manager import remove_outdated_events
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        await remove_outdated_events(session)

# --- LIFESPAN MANAGER ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Startup: Create DB Tables
    await init_db()
    
    # 2. Startup: Initialize Scheduler
    scheduler = AsyncIOScheduler()
    scheduler.add_job(scheduled_scraper_task, 'cron', hour=8, minute=0)
    scheduler.add_job(scheduled_cleanup_task, 'cron', hour=2, minute=0) # Keep as backup
    scheduler.start()
    print("Scheduler started! Will scrape every day at 8:00 AM.")
    
    # 3. Startup: Run Cleanup Immediately
    print("STARTUP: Running initial cleanup...")
    asyncio.create_task(scheduled_cleanup_task())
    
    yield
    
    # 3. Shutdown
    scheduler.shutdown()

app = FastAPI(title="Infinite BZ API", lifespan=lifespan)

@app.middleware("http")
async def log_requests(request, call_next):
    print(f"REQUEST: {request.method} {request.url}")
    try:
        response = await call_next(request)
        print(f"RESPONSE: {response.status_code}")
        return response
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Request FAILED: {e}")
        raise e

# --- CRITICAL: ENABLE FRONTEND ACCESS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all frontends (React, Postman, etc.)
    allow_credentials=True,
    allow_methods=["*"],  # Allows GET, POST, DELETE, etc.
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(scraper_router, prefix="/api/v1") # NEW Scraper Endpoints

# Mount uploads directory to serve images
import os
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.post("/scrape")
async def manual_scrape():
    """Legacy manual trigger (kept for compatibility)."""
    asyncio.create_task(scheduled_scraper_task())
    return {"message": "Scraper triggered via Legacy Endpoint."}

@app.get("/")
def root():
    return {"message": "Infinite BZ Backend is Running with Multi-Source Scraper 🚀"}