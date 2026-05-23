import puppeteer from 'puppeteer';
import { join } from 'path';

const ARTIFACT_DIR = '/home/emil/.gemini/antigravity-ide/brain/2ae888e4-e752-4791-a7cf-1ba02c758e9b';

async function run() {
  console.log("Starting visual verification...");
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      executablePath: '/home/emil/.agent-browser/browsers/chrome-148.0.7778.167/chrome',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 950 });

    console.log("Navigating to http://localhost:5173...");
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Toggle to Provider View
    console.log("Clicking 'Provider View' toggle pill...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.toggle-pill-btn'));
      const providerBtn = buttons.find(b => b.textContent.includes('Provider View'));
      if (providerBtn) providerBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    // Screenshot 1: Provider Dashboard
    console.log("Capturing Provider Dashboard...");
    await page.screenshot({ path: join(ARTIFACT_DIR, 'provider_dashboard.png') });

    // Hover or Click on a Psychiatrist Visit dot to trigger the clinical tooltip
    console.log("Triggering tooltip for a Provider/Psychiatrist Visit dot...");
    await page.evaluate(() => {
      // Find MD visit circle or text
      const mdCircles = Array.from(document.querySelectorAll('circle'));
      // Find blue circles with r="12" (or fill="#3182ce")
      const mdCircle = mdCircles.find(c => c.getAttribute('fill') === '#3182ce' || c.getAttribute('r') === '12');
      if (mdCircle) {
        const event = new MouseEvent('mouseenter', { bubbles: true, cancelable: true });
        mdCircle.dispatchEvent(event);
      }
    });
    await new Promise(r => setTimeout(r, 1000));
    console.log("Capturing Provider Dashboard with Tooltip open...");
    await page.screenshot({ path: join(ARTIFACT_DIR, 'provider_dashboard_tooltip.png') });

    console.log("Visual verification screenshots captured successfully.");
  } catch (error) {
    console.error("Error during visual capture:", error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

run().catch(console.error);
