
import asyncio
import sys
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import engine
from app.models.schemas import Event
from app.services.scrapers.meetup import MeetupScraper
from app.services.scrapers.allevents import AllEventsScraper
from app.services.scrapers.trade_centre import CTCScraper
from app.services.scraper import scrape_events_playwright
from playwright.async_api import async_playwright

async def save_events(events, source_name):
    if not events:
        print(f"[{source_name}] No events to save.")
        return
        
    print(f"[{source_name}] Saving {len(events)} events...")
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        added = 0
        updated = 0
        for data in events:
            # Check exist
            stmt = select(Event).where(Event.eventbrite_id == data['eventbrite_id'])
            result = await session.execute(stmt)
            existing = result.scalars().first()
            
            if not existing:
                event = Event(**data)
                session.add(event)
                added += 1
            else:
                updated += 1
        await session.commit()
        print(f"[{source_name}] Saved: {added} New, {updated} Updated.")

async def run_scraper_safe(scraper_cls, name):
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            scraper = scraper_cls()
            events = await scraper.scrape(page)
            await browser.close()
            return events
    except Exception as e:
        print(f"[{name}] Failed: {e}")
        return []

async def main():
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        
    print("--- ROBUST SCRAPE START ---")
    
    # 1. Meetup
    events = await run_scraper_safe(MeetupScraper, "Meetup")
    await save_events(events, "Meetup")
    
    # 2. AllEvents
    events = await run_scraper_safe(AllEventsScraper, "AllEvents")
    await save_events(events, "AllEvents")
    
    # 3. CTC
    events = await run_scraper_safe(CTCScraper, "CTC")
    await save_events(events, "CTC")
    
    # 4. Eventbrite API
    try:
        print("[Eventbrite] Starting...")
        events = await scrape_events_playwright("chennai")
        await save_events(events, "Eventbrite")
    except Exception as e:
        print(f"[Eventbrite] Failed: {e}")

    print("--- ROBUST SCRAPE COMPLETE ---")

if __name__ == "__main__":
    asyncio.run(main())
