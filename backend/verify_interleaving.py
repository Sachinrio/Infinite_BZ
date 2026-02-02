
import requests
try:
    r = requests.get('http://localhost:8000/api/v1/events?page=1&limit=20')
    data = r.json()
    events = data['data']
    print(f"Total returned: {len(events)}")
    for i, e in enumerate(events):
        source = (e.get('raw_data') or {}).get('source', 'unknown')
        print(f"{i+1:2d}. [{source:15s}] {e['title'][:50]}")
except Exception as e:
    print(f"ERROR: {e}")
