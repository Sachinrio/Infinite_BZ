
import asyncio
import sys
from app.services.event_manager import run_full_scrape_cycle
from app.core.database import engine

async def main():
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    try:
        await run_full_scrape_cycle()
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(main())
