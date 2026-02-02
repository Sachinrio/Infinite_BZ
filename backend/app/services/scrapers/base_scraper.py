
import urllib.parse
import os

class BaseScraper:
    # Use environment variable for security, fallback to provided key if not set (though env is preferred)
    SCRAPER_API_KEY = os.getenv("SCRAPER_API_KEY", "b58f4363957c7716d677f77594d25ef0") 
    
    def get_proxy_url(self, target_url: str, render_js: bool = True):
        """
        Wraps the target URL with the Scraping API.
        IMPORTANT: 'render=true' forces the API to load the page in a headless browser 
        and execute JS before returning the HTML.
        """
        params = {
            'api_key': self.SCRAPER_API_KEY,
            'url': target_url,
            'keep_headers': 'true', # Helps maintain session-like behavior
        }
        
        # Enable JS rendering for sites like Meetup/AllEvents
        if render_js:
            params['render'] = 'true'
            # Optional: wait for a specific selector if you want ScraperAPI to handle the wait
            # params['wait_for_selector'] = 'div.event-card' 
            
        return f"http://api.scraperapi.com/?{urllib.parse.urlencode(params)}"
