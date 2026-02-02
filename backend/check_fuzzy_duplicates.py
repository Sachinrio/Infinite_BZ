
import asyncio
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.schemas import Event
from app.core.database import engine

async def check_fuzzy_duplicates():
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        print("Fetching all events for fuzzy duplicate check...")
        stmt = select(Event)
        result = await session.execute(stmt)
        events = result.scalars().all()

        # Group by (Title, StartTime)
        grouped = {}
        for event in events:
            # Normalize title: lowercase, strip
            key = (event.title.strip().lower(), event.start_time)
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(event)
        
        duplicate_groups = {k: v for k, v in grouped.items() if len(v) > 1}
        
        print(f"Total Events: {len(events)}")
        print(f"Found {len(duplicate_groups)} groups of fuzzy duplicates (Same Title + Start Time).")
        
        for key, group in duplicate_groups.items():
            print(f"\nGroup: '{key[0]}' at {key[1]}")
            for evt in group:
                print(f"  - ID: {evt.id} | EB_ID: {evt.eventbrite_id} | Source: {evt.raw_data.get('source', 'N/A')}")

if __name__ == "__main__":
    asyncio.run(check_fuzzy_duplicates())
