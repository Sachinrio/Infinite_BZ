
import requests
try:
    r = requests.get('http://localhost:8000/api/v1/events?page=1&limit=5')
    data = r.json()
    events = data['data']
    for i, e in enumerate(events):
        print(f"{i+1}. ID:{e['id']} | SRC:{e.get('raw_data',{}).get('source')} | TITLE:{e['title'][:50]}")
except Exception as e:
    print(f"ERROR: {e}")
