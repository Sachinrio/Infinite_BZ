
from fastapi import APIRouter, BackgroundTasks
from app.services.event_manager import run_full_scrape_cycle

router = APIRouter()

@router.post("/refresh-events")
async def trigger_refresh():
    """
    Triggers the multi-source scraper in a separate process to avoid loop issues on Windows.
    """
    import subprocess
    import sys
    import os
    
    # Path to the virtualenv python
    python_exe = sys.executable
    worker_script = os.path.join(os.getcwd(), "scraper_worker.py")
    log_file = os.path.join(os.getcwd(), "scraper.log")
    
    # Open log file in append mode. We don't close it here because the child process inherits it.
    # It's better to let the OS handle it or just use shell redirection if possible,
    # but for Windows uvicorn, this is reliable.
    f = open(log_file, "a")
    subprocess.Popen(
        [python_exe, worker_script], 
        stdout=f, 
        stderr=f, 
        creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0
    )
    # Note: We don't f.close() here as it might close the inherited handle in some OS versions,
    # though modern Windows/Linux usually duplicate. 
    # The process will cleanly finish and the handle will be released by the OS.
    
    return {
        "status": "accepted",
        "message": "Scraping started in a background process. Refresh the page in a minute."
    }
