
import asyncio
import sys
from sqlalchemy import text
from app.core.database import engine

async def count():
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    async with engine.begin() as conn:
        res = await conn.execute(text("SELECT count(*) FROM event WHERE raw_data->>'source' = 'allevents'"))
        print(f"TOTAL_AE: {res.scalar()}")

if __name__ == "__main__":
    asyncio.run(count())
