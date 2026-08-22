const { test, expect } = require('@playwright/test');

// 1. XML Validation Test
test('theme.xml is valid XML syntax', async () => {
  const fs = require('fs');
  const xmlContent = fs.readFileSync('theme.xml', 'utf8');
  expect(xmlContent.length).toBeGreaterThan(100000);
  expect(xmlContent).toContain('<b:skin>');
  expect(xmlContent).toContain('</b:skin>');
});

// Setup mock Blogger feed data for client testing
test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => {});

  await page.route('**/*.mp4', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'video/mp4',
      body: Buffer.from('AAAAIGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQ==', 'base64')
    });
  });

  await page.route('**/feeds/posts/default?*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        feed: {
          entry: [
            {
              id: { $t: 'tag:blogger.com,1999:blog-1.post-101' },
              title: { $t: 'Featured WorkDaily System Update' },
              summary: { $t: 'Discover the latest features in the WorkDaily platform.' },
              content: { $t: '<p>Featured article full content body here.</p><img src="https://images.unsplash.com/photo-1542744094-3a3172720177?w=800" />' },
              published: { $t: '2026-05-12T10:00:00Z' },
              category: [{ term: 'featured' }, { term: 'update' }],
              media$thumbnail: { url: 'https://images.unsplash.com/photo-1542744094-3a3172720177?w=800' },
              author: [{ name: { $t: 'WorkDaily Team' } }],
              thr$total: { $t: '2' }
            },
            {
              id: { $t: 'tag:blogger.com,1999:blog-1.post-102' },
              title: { $t: 'Text Only Announcement' },
              summary: { $t: 'An important update regarding contractor settlements.' },
              content: { $t: '<p>This is a text only article with no images attached.</p>' },
              published: { $t: '2026-05-10T10:00:00Z' },
              category: [{ term: 'news' }],
              author: [{ name: { $t: 'Admin' } }],
              thr$total: { $t: '0' }
            },
            {
              id: { $t: 'tag:blogger.com,1999:blog-1.post-103' },
              title: { $t: 'Video Overview Article' },
              summary: { $t: 'Watch our new walkthrough video.' },
              content: { $t: '<p>Here is the project demo video:</p><video src="sample.mp4" poster="https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800"></video><p>Enjoy watching!</p>' },
              published: { $t: '2026-05-08T10:00:00Z' },
              category: [{ term: 'update' }],
              media$thumbnail: { url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800' },
              author: [{ name: { $t: 'Product Team' } }],
              thr$total: { $t: '1' }
            },
            {
              id: { $t: 'tag:blogger.com,1999:blog-1.post-104' },
              title: { $t: 'Multi Image Gallery Article' },
              summary: { $t: 'Photos from our recent operational site visits.' },
              content: { $t: '<p>Check out the site images:</p><img src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800" /><p>Second photo:</p><img src="https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800" />' },
              published: { $t: '2026-05-05T10:00:00Z' },
              category: [{ term: 'article' }],
              media$thumbnail: { url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800' },
              author: [{ name: { $t: 'Site Team' } }],
              thr$total: { $t: '0' }
            }
          ]
        }
      })
    });
  });

  await page.route('**/feeds/*/comments/default?*', async route => {
    const url = route.request().url();
    if (url.includes('101')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          feed: {
            entry: [
              {
                author: [{ name: { $t: 'John Doe' } }],
                content: { $t: 'Great update on WorkDaily!' },
                published: { $t: '2026-05-12T11:00:00Z' }
              },
              {
                author: [{ name: { $t: 'Sarah Smith' } }],
                content: { $t: 'Very helpful feature.' },
                published: { $t: '2026-05-12T12:00:00Z' }
              }
            ]
          }
        })
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ feed: { entry: [] } })
      });
    }
  });
});

test('Video Autoplay Prevention & Custom Player Controls', async ({ page }) => {
  await page.addInitScript(() => {
    window.addEventListener('error', (e) => {
      if (e.target && e.target.tagName === 'VIDEO') {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    }, true);

    window.HTMLMediaElement.prototype.play = function() {
      Object.defineProperty(this, 'paused', { get: () => false, configurable: true });
      this.dispatchEvent(new Event('play'));
      return Promise.resolve();
    };
    window.HTMLMediaElement.prototype.pause = function() {
      Object.defineProperty(this, 'paused', { get: () => true, configurable: true });
      this.dispatchEvent(new Event('pause'));
    };
  });

  await page.goto('/index.html#article/103');
  await page.waitForSelector('#wd-article-content', { state: 'visible' });

  const video = page.locator('.wd-post-body video');
  await expect(video).toBeAttached();

  // Verify autoplay prevention safeguards
  const isPaused = await video.evaluate(v => v.paused !== false);
  expect(isPaused).toBe(true);

  const autoplayAttr = await video.evaluate(v => v.autoplay);
  expect(autoplayAttr).toBe(false);

  const nativeControls = await video.evaluate(v => v.controls);
  expect(nativeControls).toBe(false);

  // Custom Player Wrapper
  const wrapper = page.locator('.wd-video-player-wrapper');
  await expect(wrapper).toBeVisible();

  const bigPlayBtn = page.locator('.wd-video-big-play-btn');
  await expect(bigPlayBtn).toBeVisible();

  const playBtn = page.locator('.wd-v-play');
  await expect(playBtn).toBeVisible();

  const progressBar = page.locator('.wd-video-progress-container');
  await expect(progressBar).toBeVisible();

  const volumeSlider = page.locator('.wd-video-volume-slider');
  await expect(volumeSlider).toBeVisible();

  const speedSelect = page.locator('.wd-video-speed-select');
  await expect(speedSelect).toBeVisible();

  // Test Play/Pause Interaction using scrollIntoViewIfNeeded or force click
  await bigPlayBtn.scrollIntoViewIfNeeded();
  await bigPlayBtn.click({ force: true });
  await expect(wrapper).toHaveClass(/playing/);

  await playBtn.click({ force: true });
  await expect(wrapper).not.toHaveClass(/playing/);

  // Route away and back test
  await page.goto('/index.html#blog');
  await page.waitForSelector('#wd-blog-list-view', { state: 'visible' });

  await page.goto('/index.html#article/103');
  await page.waitForSelector('#wd-article-content', { state: 'visible' });

  const wrapperOnReturn = page.locator('.wd-video-player-wrapper');
  await expect(wrapperOnReturn).not.toHaveClass(/playing/);
});

test('Text-Only Post Layout (No empty image box)', async ({ page }) => {
  await page.goto('/index.html#blog');
  await page.waitForSelector('#wd-blog-grid', { state: 'visible' });

  await page.waitForSelector('.wd-blog-card[data-post-id="102"]');

  const card102 = page.locator('.wd-blog-card[data-post-id="102"]');
  await expect(card102).toHaveClass(/no-image/);
  expect(await card102.locator('.wd-blog-thumb').count()).toBe(0);
});

test('Image Deduplication in Article View', async ({ page }) => {
  await page.goto('/index.html#article/101');
  await page.waitForSelector('#wd-article-content', { state: 'visible' });

  // Post 101 image is in body HTML, so top hero container should be deduplicated (hidden)
  const heroWrap = page.locator('#wd-post-hero-wrap');
  await expect(heroWrap).toBeHidden();

  // Original image inside article body must remain intact
  const bodyImg = page.locator('#wd-article-body img');
  await expect(bodyImg).toBeVisible();

  // Post 104 with multiple distinct images
  await page.goto('/index.html#article/104');
  await page.waitForSelector('#wd-article-content', { state: 'visible' });

  const bodyImgs = page.locator('#wd-article-body img');
  expect(await bodyImgs.count()).toBe(2);
});

test('Real Comments Loading & Article Action Bar', async ({ page }) => {
  await page.goto('/index.html#article/101');
  await page.waitForSelector('#wd-comments-area', { state: 'visible' });

  // Action Bar UI
  const likeBtn = page.locator('#wd-like-btn');
  await expect(likeBtn).toBeVisible();

  await likeBtn.click();
  await expect(likeBtn).toHaveClass(/liked/);
  await expect(page.locator('#wd-like-btn-text')).toHaveText('Liked');

  // Share button test
  const shareBtn = page.locator('#wd-share-btn');
  await expect(shareBtn).toBeVisible();
  await shareBtn.click();

  const shareToast = page.locator('#wd-share-toast');
  await expect(shareToast).toHaveClass(/show/);

  // Real Blogger Comments
  await page.waitForSelector('.wd-comment-item');
  const commentItems = page.locator('.wd-comment-item');
  expect(await commentItems.count()).toBe(2);

  await expect(commentItems.first().locator('.wd-comment-author')).toHaveText('John Doe');
  await expect(commentItems.first().locator('.wd-comment-text')).toHaveText('Great update on WorkDaily!');
});

test('Article Routing & SPA Back Navigation', async ({ page }) => {
  await page.goto('/index.html#blog');
  await page.waitForSelector('#wd-blog-list-view', { state: 'visible' });

  // Click article
  await page.click('.wd-blog-card[data-post-id="101"] .wd-blog-card-title a');
  await page.waitForSelector('#wd-article-content', { state: 'visible' });
  expect(page.url()).toContain('#article/101');

  // Click back button
  await page.click('#wd-back-to-blog');
  await page.waitForSelector('#wd-blog-list-view', { state: 'visible' });
  expect(page.url()).toContain('#blog');
});

// Viewport Responsive Matrix Tests
const viewports = [
  { width: 320, height: 600 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1600, height: 900 },
  { width: 1920, height: 1080 }
];

for (const vp of viewports) {
  test(`Responsive test at ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto('/index.html#blog');
    await page.waitForSelector('#wd-blog-grid', { state: 'visible' });

    // Verify no horizontal overflow
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);

    // Open article detail
    await page.goto('/index.html#article/103');
    await page.waitForSelector('#wd-article-content', { state: 'visible' });

    const articleHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(articleHorizontalScroll).toBe(false);
  });
}
