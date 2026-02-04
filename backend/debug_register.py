
import requests

BASE_URL = "http://localhost:8000/api/v1"

def debug_registration():
    # 1. Login (assuming a user exists, or creating one)
    # Let's try to login with a known user or create one
    email = "debug_tester@example.com"
    password = "password123"
    
    # Try Create
    try:
        s_resp = requests.post(f"{BASE_URL}/auth/register", json={
            "email": email,
            "password": password,
            "full_name": "Debug Tester"
        })
        print("Signup Status:", s_resp.status_code, s_resp.text)
    except Exception as e:
        print("Signup Exception:", e)

    # Login
    resp = requests.post(f"{BASE_URL}/auth/login", data={
        "username": email,
        "password": password
    })
    
    if resp.status_code != 200:
        print("Login Failed:", resp.text)
        return

    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Construct Payload mimicking CheckoutModal
    payload = {
        "tickets": [
            {
                "name": "General Admission",
                "price": 0,
                "selectedQty": 1,
                # Extra fields usually present from raw_data tickets
                "quantity": 100,
                "description": "Standard Ticket"
            }
        ],
        "attendee": {
            "firstName": "Debug",
            "lastName": "Tester",
            "email": email,
            "phone": "1234567890"
        },
        "total_amount": 0
    }

    print("Sending payload:", payload)

    # 3. Call Register Endpoint
    # Using Event ID 2 as per user log
    event_id = 2 
    r = requests.post(f"{BASE_URL}/events/{event_id}/register", json=payload, headers=headers)
    
    print(f"Status: {r.status_code}")
    print("Response:", r.text)

if __name__ == "__main__":
    debug_registration()
