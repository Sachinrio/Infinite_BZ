
import asyncio
import sys
from sqlalchemy import text
from app.core.database import engine

async def audit():
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    async with engine.begin() as conn:
        print("--- AllEvents Image Audit ---")
        res = await conn.execute(text("SELECT image_url, count(*) FROM event WHERE raw_data->>'source' = 'allevents' GROUP BY image_url ORDER BY count(*) DESC"))
        rows = res.fetchall()
        for row in rows:
            print(f"COUNT: {row[1]} | URL: {row[0]}")
            
        print("\n--- Eventbrite Image Audit ---")
        res = await conn.execute(text("SELECT image_url, count(*) FROM event WHERE raw_data->>'source' = 'eventbrite' GROUP BY image_url ORDER BY count(*) DESC"))
        rows = res.fetchall()
        for row in rows:
            print(f"COUNT: {row[1]} | URL: {row[0]}")

if __name__ == "__main__":
    asyncio.run(audit())
