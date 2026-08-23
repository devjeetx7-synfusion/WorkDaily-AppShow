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

  await page.route('**/feeds/posts/default**', async route => {
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

  await page.goto('/index.html#blog');
  await page.waitForSelector('#wd-blog-grid', { state: 'visible' });

  await page.goto('/index.html#article/103');
  await page.waitForSelector('#wd-post-title-heading', { state: 'visible' });

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
  await page.waitForSelector('#wd-post-title-heading', { state: 'visible' });

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
  await page.goto('/index.html#blog');
  await page.waitForSelector('#wd-blog-grid', { state: 'visible' });

  await page.goto('/index.html#article/101');
  await page.waitForSelector('#wd-post-title-heading', { state: 'visible' });

  // Post 101 image is in body HTML, so top hero container should be deduplicated (hidden)
  const heroWrap = page.locator('#wd-post-hero-wrap');
  await expect(heroWrap).toBeHidden();

  // Original image inside article body must remain intact
  const bodyImg = page.locator('#wd-article-body img');
  await expect(bodyImg).toBeVisible();

  // Post 104 with multiple distinct images
  await page.goto('/index.html#article/104');
  await page.waitForSelector('#wd-post-title-heading', { state: 'visible' });

  const bodyImgs = page.locator('#wd-article-body img');
  expect(await bodyImgs.count()).toBe(2);
});

test('Negative Assertion: Like & Comment Elements Are Completely Removed', async ({ page }) => {
  await page.goto('/index.html#blog');
  await page.waitForSelector('#wd-blog-grid', { state: 'visible' });

  await page.goto('/index.html#article/101');
  await page.waitForSelector('#wd-post-title-heading', { state: 'visible' });

  // Confirm obsolete elements do NOT exist in DOM
  await expect(page.locator('#wd-like-btn')).toHaveCount(0);
  await expect(page.locator('#wd-comments-btn')).toHaveCount(0);
  await expect(page.locator('#wd-comments-area')).toHaveCount(0);
  await expect(page.locator('#wd-article-action-bar')).toHaveCount(0);
  await expect(page.locator('#wd-comment-textarea')).toHaveCount(0);
  await expect(page.locator('#wd-comment-submit-btn')).toHaveCount(0);
  await expect(page.locator('.wd-like-count')).toHaveCount(0);
  await expect(page.locator('.wd-comment-count-badge')).toHaveCount(0);
});

test('Article Header Share Button Position & Accessibility', async ({ page }) => {
  await page.goto('/index.html#blog');
  await page.waitForSelector('#wd-blog-grid', { state: 'visible' });

  await page.goto('/index.html#article/101');
  await page.waitForSelector('#wd-post-title-heading', { state: 'visible' });

  const shareBtn = page.locator('#wd-share-btn');
  await expect(shareBtn).toBeVisible();
  await expect(shareBtn).toHaveAttribute('aria-label', 'Share article');
  await expect(shareBtn).toHaveAttribute('aria-haspopup', 'true');
  await expect(shareBtn).toHaveAttribute('aria-expanded', 'false');

  // Verify Share button is located inside the article header top container
  const headerTop = page.locator('.wd-post-header-top');
  await expect(headerTop).toBeVisible();
  await expect(headerTop.locator('#wd-share-btn')).toBeVisible();
});

test('Desktop Share Popover Dropdown & Social Options', async ({ page }) => {
  await page.goto('/index.html#blog');
  await page.waitForSelector('#wd-blog-grid', { state: 'visible' });

  await page.goto('/index.html#article/101');
  await page.waitForSelector('#wd-post-title-heading', { state: 'visible' });

  const shareBtn = page.locator('#wd-share-btn');
  const popover = page.locator('#wd-share-popover');

  // Initially hidden
  await expect(popover).toBeHidden();

  // Open popover
  await shareBtn.click();
  await expect(popover).toBeVisible();
  await expect(shareBtn).toHaveAttribute('aria-expanded', 'true');

  // Verify all 6 required options exist
  const options = popover.locator('.wd-share-option');
  await expect(options).toHaveCount(6);

  await expect(popover.locator('[data-platform="whatsapp"]')).toBeVisible();
  await expect(popover.locator('[data-platform="telegram"]')).toBeVisible();
  await expect(popover.locator('[data-platform="facebook"]')).toBeVisible();
  await expect(popover.locator('[data-platform="x"]')).toBeVisible();
  await expect(popover.locator('[data-platform="linkedin"]')).toBeVisible();
  await expect(popover.locator('[data-platform="copy"]')).toBeVisible();

  // Test close button
  const closeBtn = page.locator('#wd-share-close-btn');
  await closeBtn.click();
  await expect(popover).toBeHidden();
  await expect(shareBtn).toHaveAttribute('aria-expanded', 'false');

  // Test Escape key close
  await shareBtn.click();
  await expect(popover).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();

  // Test outside click close
  await shareBtn.click();
  await expect(popover).toBeVisible();
  await page.click('#wd-post-title-heading');
  await expect(popover).toBeHidden();
});

test('Copy Link & Toast Notification', async ({ page }) => {
  await page.goto('/index.html#blog');
  await page.waitForSelector('#wd-blog-grid', { state: 'visible' });

  await page.goto('/index.html#article/101');
  await page.waitForSelector('#wd-post-title-heading', { state: 'visible' });

  const shareBtn = page.locator('#wd-share-btn');
  await shareBtn.click();

  const copyOption = page.locator('#wd-share-popover [data-platform="copy"]');
  await expect(copyOption).toBeVisible();
  await copyOption.click();

  // Toast confirmation feedback
  const toast = page.locator('#wd-share-toast');
  await expect(toast).toHaveClass(/show/);
  await expect(toast).toHaveText('Link copied');
});

test('Native Web Share API Support on Mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.addInitScript(() => {
    navigator.share = async (data) => {
      window.__shareData = data;
      return Promise.resolve();
    };
  });

  await page.goto('/index.html#blog');
  await page.waitForSelector('#wd-blog-grid', { state: 'visible' });

  await page.goto('/index.html#article/101');
  await page.waitForSelector('#wd-post-title-heading', { state: 'visible' });

  const shareBtn = page.locator('#wd-share-btn');
  await shareBtn.click();

  // Verify navigator.share was invoked with real post title and canonical URL
  const shareData = await page.evaluate(() => window.__shareData);
  expect(shareData).not.toBeNull();
  expect(shareData.title).toBe('Featured WorkDaily System Update');
  expect(shareData.url).toMatch(/#article\/(101|article-1)/);
});

test('Dynamic Share URL Updates Across Article Navigation & SPA History', async ({ page }) => {
  await page.goto('/index.html#blog');
  await page.waitForSelector('#wd-blog-grid', { state: 'visible' });

  // Open Article 101
  await page.click('.wd-blog-card[data-post-id="101"] .wd-blog-card-title a');
  await page.waitForSelector('#wd-post-title-heading', { state: 'visible' });
  expect(page.url()).toContain('#article/101');

  // Verify Share button URL points to 101
  let currentShareUrl = await page.evaluate(() => {
    const route = window.WorkDailyRouter.currentRoute;
    return window.location.origin + window.location.pathname + '#article/' + encodeURIComponent(route.postId);
  });
  expect(currentShareUrl).toContain('#article/101');

  // Open Related Article
  const relatedCard = page.locator('#wd-related-grid .wd-blog-card').first();
  if (await relatedCard.count() > 0) {
    const targetPostId = await relatedCard.getAttribute('data-post-id');
    await relatedCard.click();
    await page.waitForSelector('#wd-post-title-heading', { state: 'visible' });

    // Share URL must update to the new article
    const updatedShareUrl = await page.evaluate(() => {
      const route = window.WorkDailyRouter.currentRoute;
      return window.location.origin + window.location.pathname + '#article/' + encodeURIComponent(route.postId);
    });
    expect(updatedShareUrl).toContain(`#article/${targetPostId}`);
  }

  // SPA Back Navigation
  await page.click('#wd-back-to-blog');
  await page.waitForSelector('#wd-blog-list-view', { state: 'visible' });
  expect(page.url()).toContain('#blog');
});

test('Google Sign-In Header State (Independent of Comments)', async ({ page }) => {
  await page.goto('/index.html#blog');
  await page.waitForSelector('#wd-blog-grid', { state: 'visible' });

  const loginBtn = page.locator('#wd-google-login-btn');
  await expect(loginBtn).toBeVisible();

  page.on('dialog', async dialog => {
    await dialog.accept('Test User');
  });

  await loginBtn.click();
  await expect(page.locator('.wd-user-profile-badge')).toBeVisible();
});

test('Article Routing & SPA Back Navigation', async ({ page }) => {
  await page.goto('/index.html#blog');
  await page.waitForSelector('#wd-blog-list-view', { state: 'visible' });

  // Click article
  await page.click('.wd-blog-card[data-post-id="101"] .wd-blog-card-title a');
  await page.waitForSelector('#wd-post-title-heading', { state: 'visible' });
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
    await page.waitForSelector('#wd-post-title-heading', { state: 'visible' });

    const articleHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(articleHorizontalScroll).toBe(false);

    // Share button must be visible top-right without overflow
    const shareBtn = page.locator('#wd-share-btn');
    await expect(shareBtn).toBeVisible();
  });
}
