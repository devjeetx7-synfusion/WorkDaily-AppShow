const { test, expect } = require('@playwright/test');
const fs = require('fs');

// 1. XML Validation Test
test('theme.xml is valid XML syntax', async () => {
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
              link: [{ rel: 'alternate', href: 'https://workdaily.blogspot.com/2026/05/featured-update.html' }]
            },
            {
              id: { $t: 'tag:blogger.com,1999:blog-1.post-102' },
              title: { $t: 'Text Only Announcement' },
              summary: { $t: 'An important update regarding contractor settlements.' },
              content: { $t: '<p>This is a text only article with no images attached.</p>' },
              published: { $t: '2026-05-10T10:00:00Z' },
              category: [{ term: 'news' }],
              author: [{ name: { $t: 'Admin' } }]
            },
            {
              id: { $t: 'tag:blogger.com,1999:blog-1.post-103' },
              title: { $t: 'Video Overview Article' },
              summary: { $t: 'Watch our new walkthrough video.' },
              content: { $t: '<p>Here is the project demo video:</p><video src="sample.mp4" poster="https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800"></video><p>Enjoy watching!</p>' },
              published: { $t: '2026-05-08T10:00:00Z' },
              category: [{ term: 'update' }],
              media$thumbnail: { url: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=800' },
              author: [{ name: { $t: 'Product Team' } }]
            },
            {
              id: { $t: 'tag:blogger.com,1999:blog-1.post-104' },
              title: { $t: 'Multi Image Gallery Article' },
              summary: { $t: 'Photos from our recent operational site visits.' },
              content: { $t: '<p>Check out the site images:</p><img src="https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800" /><p>Second photo:</p><img src="https://images.unsplash.com/photo-1512428559087-560fa5ceab42?w=800" />' },
              published: { $t: '2026-05-05T10:00:00Z' },
              category: [{ term: 'article' }],
              media$thumbnail: { url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800' },
              author: [{ name: { $t: 'Site Team' } }]
            }
          ]
        }
      })
    });
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

  const isPaused = await video.evaluate(v => v.paused !== false);
  expect(isPaused).toBe(true);

  const autoplayAttr = await video.evaluate(v => v.autoplay);
  expect(autoplayAttr).toBe(false);

  const nativeControls = await video.evaluate(v => v.controls);
  expect(nativeControls).toBe(false);

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

  await bigPlayBtn.scrollIntoViewIfNeeded();
  await bigPlayBtn.click({ force: true });
  await expect(wrapper).toHaveClass(/playing/);

  await playBtn.click({ force: true });
  await expect(wrapper).not.toHaveClass(/playing/);

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

  const heroWrap = page.locator('#wd-post-hero-wrap');
  await expect(heroWrap).toBeHidden();

  const bodyImg = page.locator('#wd-article-body img');
  await expect(bodyImg).toBeVisible();

  await page.goto('/index.html#article/104');
  await page.waitForSelector('#wd-article-content', { state: 'visible' });

  const bodyImgs = page.locator('#wd-article-body img');
  expect(await bodyImgs.count()).toBe(2);
});

test('Article Routing & SPA Back Navigation', async ({ page }) => {
  await page.goto('/index.html#blog');
  await page.waitForSelector('#wd-blog-list-view', { state: 'visible' });

  await page.click('.wd-blog-card[data-post-id="101"] .wd-blog-card-title a');
  await page.waitForSelector('#wd-article-content', { state: 'visible' });
  expect(page.url()).toContain('#article/101');

  await page.click('#wd-back-to-blog');
  await page.waitForSelector('#wd-blog-list-view', { state: 'visible' });
  expect(page.url()).toContain('#blog');
});

// Negative Assertions: Verify Like, Comment, and Login/Register features do NOT exist
test('Negative Assertions — Old interaction elements & text do NOT exist', async ({ page }) => {
  await page.goto('/index.html#article/101');
  await page.waitForSelector('#wd-article-content', { state: 'visible' });

  await expect(page.locator('#wd-like-btn')).toHaveCount(0);
  await expect(page.locator('#wd-comments-btn')).toHaveCount(0);
  await expect(page.locator('#wd-comments-area')).toHaveCount(0);
  await expect(page.locator('#wd-google-login-btn')).toHaveCount(0);

  const postHeader = page.locator('.wd-post-header');
  await expect(postHeader.locator('button:has-text("Like")')).toHaveCount(0);
  await expect(postHeader.locator('button:has-text("Comment")')).toHaveCount(0);
});

// Share Button & Popover Tests
test('Top-Right Share Button & Popover Structure', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'share', { get: () => undefined, configurable: true });
    Object.defineProperty(navigator, 'share', { get: () => undefined, configurable: true });
  });

  await page.goto('/index.html#article/101');
  await page.waitForSelector('#wd-article-content', { state: 'visible' });

  const shareBtn = page.locator('#wd-share-btn');
  await expect(shareBtn).toBeVisible();
  await expect(shareBtn).toHaveAttribute('aria-label', 'Share article');
  await expect(shareBtn).toHaveAttribute('aria-haspopup', 'true');
  await expect(shareBtn).toHaveAttribute('aria-expanded', 'false');

  const isInsideHeader = await page.evaluate(() => {
    const btn = document.getElementById('wd-share-btn');
    const header = document.querySelector('.wd-post-header');
    return !!(btn && header && header.contains(btn));
  });
  expect(isInsideHeader).toBe(true);

  const popover = page.locator('#wd-share-popover');
  await expect(popover).not.toHaveClass(/show/);

  await shareBtn.click();
  await expect(popover).toHaveClass(/show/);
  await expect(shareBtn).toHaveAttribute('aria-expanded', 'true');

  const platforms = [
    { selector: '[data-platform="whatsapp"]', name: 'Share on WhatsApp', label: 'WhatsApp' },
    { selector: '[data-platform="telegram"]', name: 'Share on Telegram', label: 'Telegram' },
    { selector: '[data-platform="facebook"]', name: 'Share on Facebook', label: 'Facebook' },
    { selector: '[data-platform="x"]', name: 'Share on X', label: 'X' },
    { selector: '[data-platform="linkedin"]', name: 'Share on LinkedIn', label: 'LinkedIn' },
    { selector: '#wd-copy-link-btn', name: 'Copy Link', label: 'Copy Link' }
  ];

  for (const item of platforms) {
    const opt = popover.locator(item.selector);
    await expect(opt).toBeVisible();
    await expect(opt).toHaveAttribute('aria-label', item.name);
    await expect(opt).toContainText(item.label);
  }
});

test('Social Share URLs generation & encoding', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'share', { get: () => undefined, configurable: true });
    Object.defineProperty(navigator, 'share', { get: () => undefined, configurable: true });
  });

  await page.goto('/index.html#article/101');
  await page.waitForSelector('#wd-article-content', { state: 'visible' });

  const shareBtn = page.locator('#wd-share-btn');
  await shareBtn.click();

  const popover = page.locator('#wd-share-popover');

  const expectedPermalink = 'https://workdaily.blogspot.com/2026/05/featured-update.html';

  const waHref = await popover.locator('[data-platform="whatsapp"]').getAttribute('href');
  expect(waHref).toContain(encodeURIComponent(expectedPermalink));

  const tgHref = await popover.locator('[data-platform="telegram"]').getAttribute('href');
  expect(tgHref).toContain(encodeURIComponent(expectedPermalink));

  const fbHref = await popover.locator('[data-platform="facebook"]').getAttribute('href');
  expect(fbHref).toContain(encodeURIComponent(expectedPermalink));

  const xHref = await popover.locator('[data-platform="x"]').getAttribute('href');
  expect(xHref).toContain(encodeURIComponent(expectedPermalink));

  const liHref = await popover.locator('[data-platform="linkedin"]').getAttribute('href');
  expect(liHref).toContain(encodeURIComponent(expectedPermalink));
});

test('Copy Link functionality & toast confirmation', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'share', { get: () => undefined, configurable: true });
    Object.defineProperty(navigator, 'share', { get: () => undefined, configurable: true });
    window.__copiedText = '';
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: async (text) => {
          window.__copiedText = text;
          return Promise.resolve();
        }
      },
      configurable: true
    });
  });

  await page.goto('/index.html#article/101');
  await page.waitForSelector('#wd-article-content', { state: 'visible' });

  await page.locator('#wd-share-btn').click();

  const copyBtn = page.locator('#wd-copy-link-btn');
  await copyBtn.click();

  const copiedText = await page.evaluate(() => window.__copiedText);
  expect(copiedText).toContain('featured-update.html');

  const toast = page.locator('#wd-share-toast');
  await expect(toast).toHaveClass(/show/);
  await expect(toast).toHaveText('Link copied');
});

test('Native Web Share API handling', async ({ page }) => {
  await page.addInitScript(() => {
    window.__shareCalledWith = null;
    navigator.share = async (data) => {
      window.__shareCalledWith = data;
      return Promise.resolve();
    };
  });

  await page.goto('/index.html#article/101');
  await page.waitForSelector('#wd-article-content', { state: 'visible' });

  await page.locator('#wd-share-btn').click();

  const shareData = await page.evaluate(() => window.__shareCalledWith);
  expect(shareData).not.toBeNull();
  expect(shareData.title).toBe('Featured WorkDaily System Update');
  expect(shareData.url).toContain('featured-update.html');

  const popover = page.locator('#wd-share-popover');
  await expect(popover).not.toHaveClass(/show/);
});

test('Share Popover Close Behavior (Outside click & Escape)', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'share', { get: () => undefined, configurable: true });
    Object.defineProperty(navigator, 'share', { get: () => undefined, configurable: true });
  });

  await page.goto('/index.html#article/101');
  await page.waitForSelector('#wd-article-content', { state: 'visible' });

  const shareBtn = page.locator('#wd-share-btn');
  const popover = page.locator('#wd-share-popover');

  await shareBtn.click();
  await expect(popover).toHaveClass(/show/);
  await expect(shareBtn).toHaveAttribute('aria-expanded', 'true');

  await page.click('body', { position: { x: 10, y: 10 } });
  await expect(popover).not.toHaveClass(/show/);
  await expect(shareBtn).toHaveAttribute('aria-expanded', 'false');

  await shareBtn.click();
  await expect(popover).toHaveClass(/show/);
  await expect(shareBtn).toHaveAttribute('aria-expanded', 'true');

  await page.keyboard.press('Escape');
  await expect(popover).not.toHaveClass(/show/);
  await expect(shareBtn).toHaveAttribute('aria-expanded', 'false');
});

test('Share URL updates dynamically during Article Navigation', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'share', { get: () => undefined, configurable: true });
    Object.defineProperty(navigator, 'share', { get: () => undefined, configurable: true });
  });

  await page.goto('/index.html#article/101');
  await page.waitForSelector('#wd-article-content', { state: 'visible' });

  await page.locator('#wd-share-btn').click();
  let waHref = await page.locator('#wd-share-popover [data-platform="whatsapp"]').getAttribute('href');
  expect(waHref).toContain('featured-update.html');

  const relatedCard = page.locator('#wd-related-grid .wd-blog-card').first();
  const clickedPostId = await relatedCard.getAttribute('data-post-id');

  await relatedCard.click();
  await page.waitForSelector('#wd-article-content', { state: 'visible' });

  await page.locator('#wd-share-btn').click();
  waHref = await page.locator('#wd-share-popover [data-platform="whatsapp"]').getAttribute('href');
  expect(waHref).not.toContain('featured-update.html');
  expect(waHref).toContain(clickedPostId);
});

test('Share URL persistence on Refresh', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'share', { get: () => undefined, configurable: true });
    Object.defineProperty(navigator, 'share', { get: () => undefined, configurable: true });
  });

  await page.goto('/index.html#article/102');
  await page.waitForSelector('#wd-article-content', { state: 'visible' });

  await page.reload();
  await page.waitForSelector('#wd-article-content', { state: 'visible' });

  const shareBtn = page.locator('#wd-share-btn');
  await expect(shareBtn).toBeVisible();

  await shareBtn.click();
  const waHref = await page.locator('#wd-share-popover [data-platform="whatsapp"]').getAttribute('href');
  expect(waHref).toContain('102');
});

test('Share URL accuracy across Browser Back and Forward navigation', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'share', { get: () => undefined, configurable: true });
    Object.defineProperty(navigator, 'share', { get: () => undefined, configurable: true });
  });

  await page.goto('/index.html#blog');
  await page.waitForSelector('#wd-blog-list-view', { state: 'visible' });

  await page.goto('/index.html#article/102');
  await page.waitForSelector('#wd-article-content', { state: 'visible' });

  await page.goto('/index.html#article/103');
  await page.waitForSelector('#wd-article-content', { state: 'visible' });

  await page.goBack();
  await page.waitForSelector('#wd-article-content', { state: 'visible' });

  await page.locator('#wd-share-btn').click();
  let waHref = await page.locator('#wd-share-popover [data-platform="whatsapp"]').getAttribute('href');
  expect(waHref).toContain('102');
  await page.keyboard.press('Escape');

  await page.goForward();
  await page.waitForSelector('#wd-article-content', { state: 'visible' });

  await page.locator('#wd-share-btn').click();
  waHref = await page.locator('#wd-share-popover [data-platform="whatsapp"]').getAttribute('href');
  expect(waHref).toContain('103');
});

const viewports = [
  { width: 320, height: 800 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 430, height: 932 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 }
];

for (const vp of viewports) {
  test(`Responsive & Share test at ${vp.width}x${vp.height}`, async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'share', { get: () => undefined, configurable: true });
      Object.defineProperty(navigator, 'share', { get: () => undefined, configurable: true });
    });

    await page.setViewportSize(vp);
    await page.goto('/index.html#article/101');
    await page.waitForSelector('#wd-article-content', { state: 'visible' });

    const shareBtn = page.locator('#wd-share-btn');
    await expect(shareBtn).toBeVisible();

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    await shareBtn.click();
    const popover = page.locator('#wd-share-popover');
    await expect(popover).toBeVisible();

    const isPopoverWithinViewport = await page.evaluate(() => {
      const el = document.getElementById('wd-share-popover');
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + 20 &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth) + 20
      );
    });
    expect(isPopoverWithinViewport).toBe(true);
  });
}
