
import asyncio
from sqlalchemy import delete
from sqlalchemy.future import select
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.core.database import engine
from app.models.schemas import Event

# Import Scrapers
from app.services.scrapers.meetup import MeetupScraper
from app.services.scrapers.allevents import AllEventsScraper
from app.services.scrapers.trade_centre import CTCScraper
from app.services.scraper import scrape_events_playwright # Eventbrite Scraper
from playwright.async_api import async_playwright

async def run_full_scrape_cycle():
    """
    Orchestrator that runs all scrapers and updates DB.
    """
    print("EVENT MANAGER: Starting Full Scrape Cycle...")
    
    async def run_playwright_scraper(scraper_class):
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                scraper = scraper_class()
                events = await scraper.scrape(page)
                await browser.close()
                return events
        except Exception as e:
            print(f"{scraper_class.__name__} Error: {e}")
            return []

    # Run all in parallel
    results = await asyncio.gather(
        run_playwright_scraper(MeetupScraper),
        run_playwright_scraper(AllEventsScraper),
        run_playwright_scraper(CTCScraper),
        scrape_events_playwright("chennai")
    )
    
    all_new_events = []
    for res in results:
        all_new_events.extend(res)

    print(f"EVENT MANAGER: Scraped {len(all_new_events)} total events.")
    
    # 2. Save to Database
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        added = 0
        updated = 0
        for data in all_new_events:
            stmt = select(Event).where(Event.eventbrite_id == data['eventbrite_id'])
            result = await session.execute(stmt)
            existing = result.scalars().first()
            
            if not existing:
                event = Event(**data)
                session.add(event)
                added += 1
            else:
                # Comprehensive Update Logic
                existing.title = data['title']
                existing.description = data['description']
                existing.start_time = data['start_time']
                existing.end_time = data['end_time']
                existing.venue_name = data['venue_name']
                existing.venue_address = data.get('venue_address')
                existing.organizer_name = data.get('organizer_name')
                existing.image_url = data.get('image_url')
                existing.is_free = data.get('is_free', False)
                existing.online_event = data.get('online_event', False)
                existing.url = data['url']
                existing.raw_data = data.get('raw_data', {})
                updated += 1
        
        await session.commit()
        print(f"EVENT MANAGER: DB Saved {added} new, Updated {updated}.")
        
        # 3. Cleanup Old Events
        await remove_outdated_events(session)

async def remove_outdated_events(session: AsyncSession):
    """
    Deletes events where end_time < NOW.
    """
    try:
        current_time = datetime.now()
        print(f"CLEANUP: Removing events older than {current_time}...")
        
        stmt = delete(Event).where(Event.end_time < current_time)
        result = await session.execute(stmt)
        await session.commit()
        
        print(f"CLEANUP: Deleted {result.rowcount} old events.")
    except Exception as e:
        print(f"CLEANUP FAILED: {e}")
