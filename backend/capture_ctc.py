
import requests
import os
import urllib.parse

def get_html():
    api_key = os.getenv("SCRAPER_API_KEY", "b58f4363957c7716d677f77594d25ef0")
    target_url = "https://www.chennaitradecentre.in/UpcomingEvents.aspx?etype=1"
    
    params = {
        'api_key': api_key,
        'url': target_url,
        'keep_headers': 'true'
    }
    
    proxy_url = f"http://api.scraperapi.com/?{urllib.parse.urlencode(params)}"
    
    try:
        print(f"Fetching {target_url} via proxy...")
        resp = requests.get(proxy_url, timeout=60)
        print(f"Status: {resp.status_code}")
        
        with open("ctc_source.html", "w", encoding="utf-8") as f:
            f.write(resp.text)
        print("Saved to ctc_source.html")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    get_html()
