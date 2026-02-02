
from bs4 import BeautifulSoup
import os

html_file = "ae_debug.html"
with open(html_file, "r", encoding="utf-8") as f:
    soup = BeautifulSoup(f.read(), "html.parser")

for selector in ["li[data-link]", ".event-card"]:
    items = soup.select(selector)
    print(f"\n--- Selector: {selector} (Found {len(items)}) ---")
    for item in items[:3]:
        print(f"TEXT: {item.get_text(strip=True)[:50]}...")
        img = item.find("img")
        if img:
            print(f"IMG ATTRS: {img.attrs.keys()}")
            print(f"SRC: {img.get('src')}")
            print(f"DATA-SRC: {img.get('data-src')}")
            print(f"DATA-IMG: {img.get('data-img')}")
