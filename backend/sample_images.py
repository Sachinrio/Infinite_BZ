
import asyncio
from sqlalchemy import text
from app.core.database import engine

async def check():
    async with engine.begin() as conn:
        print("--- Eventbrite Samples ---")
        res = await conn.execute(text("SELECT title, image_url FROM event WHERE raw_data->>'source' = 'eventbrite' LIMIT 5"))
        for row in res.fetchall():
            print(f"TITLE: {row[0][:30]} | URL: {row[1]}")
            
        print("\n--- AllEvents Samples ---")
        res = await conn.execute(text("SELECT title, image_url FROM event WHERE raw_data->>'source' = 'allevents' LIMIT 5"))
        for row in res.fetchall():
            print(f"TITLE: {row[0][:30]} | URL: {row[1]}")

if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(check())
    finally:
        loop.close()
