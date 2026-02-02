
from playwright.async_api import Page
from datetime import datetime
from typing import List, Dict
from app.services.scrapers.base_scraper import BaseScraper
import dateparser
from datetime import timedelta
from .utils import is_business_event

class CTCScraper(BaseScraper):
    async def scrape(self, page: Page) -> List[Dict]:
        print("Starting CTC Scrape (Playwright)...")
        # CORRECT URL
        target_url = "https://www.chennaitradecentre.in/UpcomingEvents.aspx?etype=1"
        
        # Use render_js=True for Proxy
        proxy_url = self.get_proxy_url(target_url, render_js=True)
        
        try:
            # Increase timeout
            await page.goto(proxy_url, timeout=180000)
            print("CTC page loaded.")
            
            # Wait for the JS-rendered content
            # The JS renders into #pills-tabContent-schedule
            try:
                await page.wait_for_selector('.schedule-item', timeout=60000)
            except:
                print("CTC: No .schedule-item found. Taking debug screenshot...")
                await page.screenshot(path="debug_ctc_fail.png")
                return []
            
            items = await page.query_selector_all('.schedule-item')
            print(f"Found {len(items)} CTC items.")
            
            events = []
            for item in items:
                try:
                    # Based on line 274 of the HTML:
                    # <h4>UsageCategory - EventProfileName</h4>
                    title_el = await item.query_selector('h4')
                    title = await title_el.inner_text() if title_el else "Unknown Event"
                    
                    # <li><i class="far fa-calendar"></i>DateRange</li>
                    date_el = await item.query_selector('li:has(i.fa-calendar)')
                    if not date_el:
                         # Fallback search
                         meta_list = await item.query_selector('.schedule-meta ul')
                         if meta_list:
                             date_el = await meta_list.query_selector('li')
                    
                    date_text = await date_el.inner_text() if date_el else ""
                    
                    # <h6>Event Organizer</h6><span>OrgName</span>
                    org_el = await item.query_selector('h6:text("Event Organizer") + span')
                    if not org_el:
                        # Try finding by text match
                        spans = await item.query_selector_all('span')
                        for s in spans:
                            prev = await page.evaluate('(el) => el.previousElementSibling?.innerText', s)
                            if prev and "Organizer" in prev:
                                org_el = s
                                break
                    
                    organizer = await org_el.inner_text() if org_el else "Chennai Trade Centre"

                    start_time = None
                    if date_text:
                        # Handle range: "13-Feb-2026 - 15-Feb-2026"
                        first_part = date_text.split(" - ")[0].strip()
                        start_time = dateparser.parse(first_part, settings={'DATE_ORDER': 'DMY', 'PREFER_DATES_FROM': 'future'})
                    
                    if not start_time:
                        continue

                    # --- THE 6-MONTH FILTER ---
                    now = datetime.now()
                    six_months_later = now + timedelta(days=180) # Approx 6 months
                    
                    if start_time < now.replace(hour=0, minute=0, second=0, microsecond=0):
                        # Skip past events
                        continue
                        
                    if start_time > six_months_later:
                        # Skip events more than 6 months away
                        continue
                    # ---------------------------
                    
                    # --- NEW: Image Selection ---
                    image_pool = [
                        "https://images.unsplash.com/photo-1582192730841-2a682d7375f9?q=80&w=1000&auto=format&fit=crop",
                        "https://images.unsplash.com/photo-1540575861501-7cf05a4b125a?q=80&w=1000&auto=format&fit=crop",
                        "https://images.unsplash.com/photo-1505373630103-89d00c2a5851?q=80&w=1000&auto=format&fit=crop",
                        "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?q=80&w=1000&auto=format&fit=crop",
                        "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1000&auto=format&fit=crop",
                        "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?q=80&w=1000&auto=format&fit=crop",
                        "https://images.unsplash.com/photo-1560179707-f14e90ef3623?q=80&w=1000&auto=format&fit=crop",
                        "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?q=80&w=1000&auto=format&fit=crop"
                    ]
                    # Select image based on title hash for consistency
                    img_idx = abs(hash(title)) % len(image_pool)
                    event_image = image_pool[img_idx]

                    event_data = {
                        "eventbrite_id": f"ctc_{int(start_time.timestamp())}_{title[:10]}",
                        "title": title,
                        "description": f"Trade Exhibition organized by {organizer}",
                        "start_time": start_time,
                        "end_time": start_time + timedelta(hours=8),
                        "url": target_url,
                        "image_url": event_image,
                        "venue_name": "Chennai Trade Centre",
                        "venue_address": "CTC Complex, Nandambakkam, Chennai",
                        "organizer_name": organizer,
                        "is_free": False,
                        "online_event": False,
                        "category": "Business",
                        "raw_data": {"source": "trade_centre"}
                    }
                    
                    if is_business_event(event_data):
                        events.append(event_data)
                    else:
                        print(f"  [Filtered] Non-business event: {title}")
                except Exception as e:
                    print(f"Error parsing CTC item: {e}")
                    continue
                    
            return events

        except Exception as e:
            print(f"CTC Scrape Failed: {e}")
            return []
