
import asyncio
from playwright.async_api import Page
from datetime import datetime, timedelta
import dateparser
from typing import List, Dict
from app.services.scrapers.base_scraper import BaseScraper
from .utils import is_business_event

class MeetupScraper(BaseScraper):
    async def scrape(self, page: Page) -> List[Dict]:
        print("Starting Meetup Scrape (Link Hunter Mode)...")
        events = []
        
        # 1. Use the Query Param URL (More stable than clean URLs)
        url = "https://www.meetup.com/find/?location=in--Chennai&source=EVENTS&categoryId=career-business"
        
        # render_js=True is MUST for Meetup
        proxy_url = self.get_proxy_url(url, render_js=True)
        
        try:
            # Set a large viewport internally to ensure desktop layout
            await page.set_viewport_size({'width': 1920, 'height': 1080})
            
            print("Meetup: Navigating via Proxy (Timeout set to 3 mins)...")
            # 3 Minute Timeout to be safe
            await page.goto(proxy_url, timeout=180000)
            
            # Wait for Body to load
            await page.wait_for_selector('body', timeout=60000)
            
            # Scroll to trigger lazy loading
            for _ in range(3):
                await page.evaluate("window.scrollBy(0, 1000)")
                await asyncio.sleep(2)
            
            # --- STRATEGY A: Standard Card Selector ---
            print("Meetup: Attempting Strategy A (Cards)...")
            cards = await page.query_selector_all('div[data-testid="event-card-in-search"]')
            
            # --- STRATEGY B: Link Hunter (Fallback) ---
            if len(cards) == 0:
                print("Meetup: Strategy A failed (0 cards). Engaging Strategy B (Link Hunter)...")
                # Find ALL links containing '/events/' 
                # This bypasses specific class names or test-ids
                cards = await page.query_selector_all('a[href*="/events/"]')

            print(f"Meetup: Found {len(cards)} potential items.")

            seen_ids = set()

            for card in cards:
                try:
                    # 1. Extract URL & ID
                    # If card is an 'a' tag (Strategy B), use it directly. 
                    # If card is a 'div' (Strategy A), find the 'a' inside.
                    tag_name = await card.evaluate("el => el.tagName")
                    link_element = card if tag_name == 'A' else await card.query_selector("a")
                    
                    if not link_element:
                        continue
                        
                    event_url = await link_element.get_attribute('href')
                    if not event_url:
                        continue
                        
                    # Extract ID (the numbers in the URL)
                    # Format: meetup.com/.../events/123456789/
                    if "/events/" not in event_url:
                        continue
                        
                    # Simple extraction of the numeric ID
                    parts = event_url.split("/events/")[-1].split("/")[0]
                    event_id = ''.join(filter(str.isdigit, parts))
                    
                    if not event_id or event_id in seen_ids:
                        continue
                    seen_ids.add(event_id)

                    # 2. Extract Text (Title & Date)
                    # We grab the full text of the link/card and parse it
                    full_text = await card.inner_text()
                    lines = [line.strip() for line in full_text.split('\n') if line.strip()]
                    
                    title = "Untitled Meetup Event"
                    start_time = None
                    
                    # Try to find a line that looks like a date
                    for line in lines:
                        # Strict parsing for Meetup format "Fri, Jan 29 · 7:00 PM IST"
                        parsed_date = dateparser.parse(line, settings={'PREFER_DATES_FROM': 'future'})
                        if parsed_date and len(line) > 5: # Avoid matching short numbers/times only
                            # Check if the line likely contains date-like info (e.g. month names or day names)
                            date_keywords = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                            if any(k in line for k in date_keywords):
                                start_time = parsed_date
                                # Remove the date line from potential titles
                                if line in lines: lines.remove(line)
                                if lines:
                                    # Pick the longest or first remaining line as title
                                    title = max(lines, key=len)
                                break
                    
                    # Fallback if no date found
                    if not start_time:
                        start_time = datetime.now() + timedelta(days=7) # Default to next week
                        if lines:
                            title = lines[0] # Just take the first line

                    # 3. Extract Image
                    img_el = await card.query_selector('img')
                    event_image = None
                    if img_el:
                        attrs = ["src", "data-src", "srcset", "data-img"]
                        for attr in attrs:
                            val = await img_el.get_attribute(attr)
                            if val and ("http" in val or val.startswith("//")) and "data:image" not in val and "placeholder" not in val:
                                event_image = val.split(",")[0].split(" ")[0].strip()
                                if event_image.startswith("//"):
                                    event_image = "https:" + event_image
                                break
                    
                    if not event_image:
                        image_pool = [
                            "https://images.unsplash.com/photo-1540575861501-7cf05a4b125a?q=80&w=1000&auto=format&fit=crop",
                            "https://images.unsplash.com/photo-1505373630103-89d00c2a5851?q=80&w=1000&auto=format&fit=crop",
                            "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?q=80&w=1000&auto=format&fit=crop",
                            "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1000&auto=format&fit=crop"
                        ]
                        event_image = image_pool[abs(hash(title)) % len(image_pool)]

                    # 4. Construct Event
                    event_data = {
                        "eventbrite_id": f"meetup_{event_id}",
                        "title": title[:100], # Truncate if too long
                        "description": f"Join this meetup: {event_url}",
                        "start_time": start_time.replace(tzinfo=None) if start_time else None,
                        "end_time": (start_time + timedelta(hours=2)).replace(tzinfo=None) if start_time else None,
                        "url": event_url if "http" in event_url else f"https://www.meetup.com{event_url}",
                        "image_url": event_image, 
                        "venue_name": "Check Event Link",
                        "venue_address": "Chennai, India",
                        "organizer_name": "Meetup Group",
                        "is_free": False,
                        "online_event": False,
                        "category": "Business",
                        "raw_data": {"source": "meetup"}
                    }
                    
                    if is_business_event(event_data):
                        events.append(event_data)
                    else:
                        print(f"  [Filtered] Non-business event: {title}")
                    
                except Exception as e:
                    continue

        except Exception as e:
            print(f"Meetup Global Error: {e}")
            await page.screenshot(path="debug_meetup_fatal.png")
            
        print(f"Meetup Scrape finished. Collected {len(events)} events.")
        return events
