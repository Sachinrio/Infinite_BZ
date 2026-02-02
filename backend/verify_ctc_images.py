
import asyncio
from sqlalchemy import text
from app.core.database import engine

async def check():
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT title, image_url FROM event WHERE raw_data->>'source' = 'trade_centre' LIMIT 10"))
        rows = res.fetchall()
        print(f"Checking {len(rows)} CTC events...")
        images = set()
        for row in rows:
            print(f"TITLE: {row[0][:30]} | IMAGE: {row[1]}")
            images.add(row[1])
        print(f"Unique images: {len(images)}")

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
