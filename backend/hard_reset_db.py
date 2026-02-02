
import asyncio
import sys
from sqlalchemy import text
from app.core.database import engine

async def reset():
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    async with engine.begin() as conn:
        res = await conn.execute(text("DELETE FROM event"))
        print(f"Deleted {res.rowcount} events. Database is now empty.")

if __name__ == "__main__":
    asyncio.run(reset())
