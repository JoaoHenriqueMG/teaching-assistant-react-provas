import { Before, After } from '@cucumber/cucumber';
import { Browser, Page, launch } from 'puppeteer';

/**
 * One browser per @gui scenario, shared by every step definition file.
 *
 * Step files import this module before declaring their own hooks, so these
 * hooks are registered first: the browser is opened before any other Before
 * hook runs and closed after every other After hook (Cucumber runs After
 * hooks in reverse order), which lets those hooks still use the page.
 */

export const baseUrl = 'http://localhost:3004';

let browser: Browser | undefined;
let page: Page | undefined;

/** The page of the current @gui scenario. */
export const currentPage = (): Page => {
  if (!page) {
    throw new Error('No browser page: the scenario must be tagged @gui');
  }
  return page;
};

Before({ tags: '@gui' }, async function () {
  browser = await launch({
    headless: false, // Set to true for CI/CD
    slowMo: 50 // Slow down actions for visibility
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
});

After({ tags: '@gui' }, async function () {
  if (browser) {
    await browser.close();
  }
  browser = undefined;
  page = undefined;
});
