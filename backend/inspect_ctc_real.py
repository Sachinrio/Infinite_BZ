
from bs4 import BeautifulSoup
import os

html_file = "ctc_debug.html"
if not os.path.exists(html_file):
    print(f"File {html_file} not found.")
    exit(1)

with open(html_file, "r", encoding="utf-8") as f:
    soup = BeautifulSoup(f.read(), "html.parser")

items = soup.select(".schedule-item")
print(f"Found {len(items)} schedule items.")

for i, item in enumerate(items[:5]):
    print(f"\n--- Item {i} ---")
    title = item.select_one("h4")
    print(f"TITLE: {title.get_text(strip=True) if title else 'N/A'}")
    
    # Look for ANY img tag inside or nearby
    imgs = item.find_all("img")
    print(f"IMGS: {len(imgs)}")
    for img in imgs:
        print(f"  SRC: {img.get('src')}")
        print(f"  DATA-SRC: {img.get('data-src')}")
        print(f"  ATTRS: {img.attrs.keys()}")

    # check parent/sibling for images if not inside
    parent = item.parent
    if parent:
        p_imgs = parent.find_all("img")
        if len(p_imgs) > len(imgs):
             print(f"PARENT IMGS: {len(p_imgs)}")
