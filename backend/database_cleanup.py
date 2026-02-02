
import asyncio
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import sessionmaker
from app.models.schemas import Event, UserRegistration
from app.core.database import engine

async def cleanup_duplicates():
    # Use existing engine
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        print("Fetching all events...")
        # 1. Fetch all events with eventbrite_id
        stmt = select(Event).where(Event.eventbrite_id != None)
        result = await session.execute(stmt)
        events = result.scalars().all()

        # 2. Group by eventbrite_id
        grouped = {}
        for event in events:
            if event.eventbrite_id not in grouped:
                grouped[event.eventbrite_id] = []
            grouped[event.eventbrite_id].append(event)

        deleted_count = 0
        
        for eventbrite_id, group in grouped.items():
            if len(group) > 1:
                print(f"Found {len(group)} duplicates for {eventbrite_id}")
                
                # 3. Determine which to keep
                events_with_stats = []
                for event in group:
                    # Count registrations
                    reg_stmt = select(func.count()).select_from(UserRegistration).where(UserRegistration.event_id == event.id)
                    reg_res = await session.execute(reg_stmt)
                    reg_count = reg_res.scalar()
                    events_with_stats.append((event, reg_count))

                # Sort by registration count (desc), then ID (asc - keep oldest)
                events_with_stats.sort(key=lambda x: (-x[1], x[0].id))

                keep_event = events_with_stats[0][0]
                delete_events = [x[0] for x in events_with_stats[1:]]

                print(f"  Keeping ID: {keep_event.id} (Registrations: {events_with_stats[0][1]})")
                
                for event_to_delete in delete_events:
                    print(f"  Deleting ID: {event_to_delete.id}")
                    await session.delete(event_to_delete)
                    deleted_count += 1
        
        await session.commit()
        print(f"Cleanup complete. Deleted {deleted_count} duplicate events.")

if __name__ == "__main__":
    asyncio.run(cleanup_duplicates())
