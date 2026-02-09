import requests
import json
import time
import sys

# Reconfigure stdout for UTF-8 to avoid encoding errors in Windows terminal
sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8001/api/v1"
EMAIL = f"test_{int(time.time())}@example.com"
PASSWORD = "password123"

def run():
    try:
        # 1. Register
        print(f"Registering user {EMAIL}...")
        reg_res = requests.post(f"{BASE_URL}/auth/register", json={
            "email": EMAIL,
            "password": PASSWORD,
            "full_name": "Test User"
        })
        if reg_res.status_code != 200:
            print(f"Registration failed: {reg_res.text}")
            return

        # 2. Login
        print("Logging in...")
        login_res = requests.post(f"{BASE_URL}/auth/login", data={
            "username": EMAIL,
            "password": PASSWORD
        })
        if login_res.status_code != 200:
            print(f"Login failed: {login_res.text}")
            return
        
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Create Event Payload (Mimic Frontend)
        payload = {
            "title": "Test AI Event",
            "description": "Generated Description",
            "start_time": "2026-02-10T10:00:00.000",
            "end_time": "2026-02-10T12:00:00.000",
            "venue_name": "Online Event",
            "venue_address": "Online",
            "image_url": "https://example.com/image.jpg",
            "category": "Business",
            "is_free": True,
            "online_event": True,
            "capacity": 100,
            "meeting_link": "https://zoom.us/j/123",
            "meeting_link_private": True,
            "timezone": "UTC",
            "organizer_name": "Host",
            "agenda": [
                {"time": "10:00", "title": "Intro", "speaker": "Host"}
            ],
            "speakers": [
                {"name": "Host", "role": "Organizer", "imageUrl": ""}
            ],
            "tickets": [
                {
                    "name": "General Admission",
                    "type": "free",
                    "price": 0,
                    "quantity": 100,
                    "min_quantity": 1,
                    "max_quantity": 10
                }
            ]
        }

        print("Creating Event...")
        create_res = requests.post(f"{BASE_URL}/events", json=payload, headers=headers)
        
        print(f"Status Code: {create_res.status_code}")
        print(f"Response: {create_res.text}")
        
        with open("api_status.txt", "w", encoding="utf-8") as f:
            f.write(f"STATUS: {create_res.status_code}\n")
            f.write(f"RESPONSE: {create_res.text}\n")

    except Exception as e:
        import traceback
        traceback.print_exc()
        with open("api_status.txt", "w", encoding="utf-8") as f:
            f.write(f"CRASH: {e}")

if __name__ == "__main__":
    run()
