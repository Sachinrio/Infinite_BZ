
from .base_scraper import BaseScraper
from playwright.async_api import Page
from datetime import datetime, timedelta
import dateparser

from .utils import is_business_event

class AllEventsScraper(BaseScraper):
    async def scrape(self, page: Page):
        print("Starting AllEvents Scrape (Business Only)...")
        target_url = "https://allevents.in/chennai/business"
        
        # AllEvents is heavy, use render_js=True
        proxy_url = self.get_proxy_url(target_url, render_js=True)
        
        try:
            print("AllEvents: Navigating via Proxy (this may take 1-3 mins)...")
            # Increase timeout
            await page.goto(proxy_url, timeout=180000)
            
            # Wait for body to ensure load
            await page.wait_for_selector('body', timeout=60000)
            
            print("AllEvents page loaded.")
            # Selector for event items
            # Using .event-card as it proved more reliable in deep audit
            items = await page.query_selector_all('.event-card')
            if not items:
                items = await page.query_selector_all('li[data-link]')
            if not items:
                items = await page.query_selector_all('div.event-item')
                
            print(f"Found {len(items)} AllEvents items.")
            
            events = []
            # Process up to 50 items to get a good batch
            for item in items[:50]:
                try:
                    title_el = await item.query_selector('.title') or await item.query_selector('h3')
                    title = await title_el.inner_text() if title_el else "Unknown Event"
                    
                    link_el = await item.query_selector('a')
                    link = await link_el.get_attribute('href') if link_el else ""
                    if not link:
                        link = await item.get_attribute('data-link') or ""
                    
                    time_el = await item.query_selector('.time') or await item.query_selector('.date')
                    time_str = await time_el.inner_text() if time_el else ""
                    
                    venue_el = await item.query_selector('.subtitle') or await item.query_selector('.location')
                    venue = await venue_el.inner_text() if venue_el else "Chennai"

                    start_time = datetime.now() + timedelta(days=2)
                    if time_str:
                        # Clean up text specifically for AllEvents (e.g. "Sun Feb 11")
                        clean_time = time_str.replace('\n', ' ').strip()
                        parsed = dateparser.parse(clean_time)
                        if parsed:
                            start_time = parsed

                    # --- Smart Image Hunter (V3) ---
                    # AllEvents posters are usually lazy-loaded in 'data-src' or 'data-img'
                    # The high-quality image usually has 'banner' in the URL.
                    event_image = None
                    
                    # 1. Try to find the specific banner image
                    img_el = await item.query_selector('img.banner-image-v3') or \
                             await item.query_selector('img[data-src*="banner"]') or \
                             await item.query_selector('img[src*="banner"]') or \
                             await item.query_selector('img')

                    if img_el:
                        # 2. Check attributes in order of quality/presence
                        for attr in ["data-src", "data-img", "data-lazy-src", "srcset", "src"]:
                            val = await img_el.get_attribute(attr)
                            if val:
                                # Normalize protocol-relative or path
                                potential = val.split(",")[0].split(" ")[0].strip()
                                if potential.startswith("//"):
                                    potential = "https:" + potential
                                
                                # Final filtering: skip generic logos/placeholders
                                if "http" in potential and not any(p in potential.lower() for p in ["og-logo", "logo.jpg", "logo.png", "placeholder", "blank.gif", "data:image"]):
                                    event_image = potential
                                    break
                    
                    if not event_image:
                        # Fallback pool
                        image_pool = [
                            "https://images.unsplash.com/photo-1540575861501-7cf05a4b125a?q=80&w=1000&auto=format&fit=crop",
                            "https://images.unsplash.com/photo-1505373630103-89d00c2a5851?q=80&w=1000&auto=format&fit=crop",
                            "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?q=80&w=1000&auto=format&fit=crop",
                            "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1000&auto=format&fit=crop"
                        ]
                        event_image = image_pool[abs(hash(title)) % len(image_pool)]

                    event_data = {
                        "title": title,
                        "description": f"Event on AllEvents: {title}",
                        "start_time": start_time,
                        "end_time": start_time + timedelta(hours=3),
                        "url": link,
                        "venue_name": venue,
                        "image_url": event_image,
                        "eventbrite_id": f"allevents-{hash(link)}",
                        "is_free": False,
                        "category": "Business",
                        "raw_data": {"source": "allevents"}
                    }
                    
                    if is_business_event(event_data):
                        events.append(event_data)
                    else:
                        print(f"  [Filtered] Non-business event: {title}")
                except Exception as e:
                    print(f"Error parsing AllEvents item: {e}")
                    continue
                    
            return events

        except Exception as e:
            print(f"AllEvents Scrape Failed: {e}")
            return []
