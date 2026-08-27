import json
from playwright.sync_api import sync_playwright

def handle_posts_route(route):
    mock_data = {
        "feed": {
            "entry": [
                {
                    "id": { "$t": "tag:blogger.com,1999:blog-1.post-101" },
                    "title": { "$t": "Featured WorkDaily System Update" },
                    "summary": { "$t": "Discover the latest features in the WorkDaily platform." },
                    "content": { "$t": "<p>Featured article full content body here.</p><img src=\"https://images.unsplash.com/photo-1542744094-3a3172720177?w=800\" />" },
                    "published": { "$t": "2026-05-12T10:00:00Z" },
                    "category": [{ "term": "featured" }, { "term": "update" }],
                    "media$thumbnail": { "url": "https://images.unsplash.com/photo-1542744094-3a3172720177?w=800" },
                    "author": [{ "name": { "$t": "WorkDaily Team" } }],
                    "link": [{ "rel": "alternate", "href": "https://workdaily.blogspot.com/2026/05/featured-update.html" }]
                }
            ]
        }
    }
    route.fulfill(
        status=200,
        content_type="application/json",
        body=json.dumps(mock_data)
    )

def run_cuj(page):
    page.add_init_script("Object.defineProperty(Navigator.prototype, 'share', { get: () => undefined, configurable: true }); Object.defineProperty(navigator, 'share', { get: () => undefined, configurable: true });")
    page.route("**/feeds/posts/default?*", handle_posts_route)

    # Navigate to Article Detail
    page.goto("http://localhost:3000/index.html#article/101")
    page.wait_for_selector("#wd-article-content", state="visible")
    page.wait_for_timeout(500)

    # Click Share Button to open Popover
    share_btn = page.locator("#wd-share-btn")
    share_btn.click()
    page.wait_for_timeout(500)

    # Take Screenshot of open Share Popover
    page.screenshot(path="verification/screenshots/verification.png")
    page.wait_for_timeout(500)

    # Click Copy Link
    copy_btn = page.locator("#wd-copy-link-btn")
    copy_btn.click()
    page.wait_for_timeout(1000)

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="verification/videos"
        )
        page = context.new_page()
        try:
            run_cuj(page)
        finally:
            context.close()
            browser.close()
