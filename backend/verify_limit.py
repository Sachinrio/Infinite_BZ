
import requests
try:
    r = requests.get('http://localhost:8000/api/v1/events?page=1')
    data = r.json()
    print(f"COUNT: {len(data['data'])}")
    print(f"LIMIT: {data['limit']}")
    print(f"TOTAL: {data['total']}")
except Exception as e:
    print(f"ERROR: {e}")
