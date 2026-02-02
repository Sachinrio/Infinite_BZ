
import asyncio
from playwright.async_api import async_playwright
import sys

async def debug():
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        
    async with async_playwright() as p:
        # We don't use proxy here to be fast, unless it blocks us
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        print("Navigating to CTC...")
        try:
            await page.goto("https://www.chennaitradecentre.in/UpcomingEvents.aspx?etype=1", timeout=60000)
            await page.wait_for_selector('.schedule-item', timeout=20000)
            content = await page.content()
            with open("ctc_debug.html", "w", encoding="utf-8") as f:
                f.write(content)
            print("Saved ctc_debug.html")
        except Exception as e:
            print(f"Error: {e}")
            await page.screenshot(path="ctc_error.png")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(debug())
