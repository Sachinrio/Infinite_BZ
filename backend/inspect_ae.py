
import asyncio
import sys
from sqlalchemy import text
from app.core.database import engine

async def inspect():
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT id, eventbrite_id, title FROM event WHERE image_url = 'https://allevents.in/img/og-logo.jpg'"))
        rows = res.fetchall()
        for row in rows:
            print(f"ID: {row[0]} | EID: {row[1]} | TITLE: {row[2]}")

if __name__ == "__main__":
    asyncio.run(inspect())
