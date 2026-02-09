from app.core.database import get_session
from app.models.schemas import Event
from sqlalchemy import delete, select
import asyncio

async def cleanup():
    async for session in get_session():
        # Find events with the specific test title
        stmt = select(Event).where(Event.title == "Test AI Event")
        result = await session.execute(stmt)
        events = result.scalars().all()
        
        if events:
            print(f"Found {len(events)} test events. Deleting...")
            for evt in events:
                print(f"Deleting dependencies for Event {evt.id}...")
                
                # 1. Delete Dependencies (Tickets, Registrations)
                # Need to use raw SQL delete or select dependent classes
                from app.models.schemas import TicketClass, UserRegistration
                
                # Delete Registrations
                stmt_reg = delete(UserRegistration).where(UserRegistration.event_id == evt.id)
                await session.execute(stmt_reg)
                
                # Delete Tickets
                stmt_tick = delete(TicketClass).where(TicketClass.event_id == evt.id)
                await session.execute(stmt_tick)

                # 2. Delete Event
                stmt_del = delete(Event).where(Event.id == evt.id)
                await session.execute(stmt_del)
                
            await session.commit()
            print("Cleanup complete.")
        else:
            print("No test events found.")

if __name__ == "__main__":
    import asyncio
    asyncio.run(cleanup())
