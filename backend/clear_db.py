
import asyncio
from sqlalchemy import text
from app.core.database import engine

async def clear_database():
    async with engine.begin() as conn:
        print("CLEARING DATABASE: Deleting all events...")
        try:
            result = await conn.execute(text("DELETE FROM event"))
            print(f"SUCCESS: Deleted {result.rowcount} events.")
        except Exception as e:
            print(f"ERROR: {e}")

if __name__ == "__main__":
    import sys
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    
    try:
        asyncio.run(clear_database())
    except RuntimeError:
        pass
