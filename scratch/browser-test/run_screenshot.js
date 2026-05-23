import puppeteer from 'puppeteer';
import { join } from 'path';

const ARTIFACT_DIR = '/home/emil/.gemini/antigravity-ide/brain/938f791e-b0a0-4ec2-ac73-4b238d332e94';

async function run() {
  console.log("Florence UI Verification Script starting...");
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
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.toString()));
    await page.setViewport({ width: 1280, height: 900 });

    console.log("Navigating to http://localhost:5173...");
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // Screenshot 1: Patient View (Chat & Checklist Cards Grid)
    console.log("Capturing Patient View...");
    await page.screenshot({ path: join(ARTIFACT_DIR, 'patient_view.png') });

    // Click on a progress checklist card to check manual override dropdown functionality
    console.log("Clicking on Checklist Card for manual override...");
    await page.evaluate(() => {
      // Find the card containing 'Mood' or 'Mood Status' and click it
      const cards = Array.from(document.querySelectorAll('.bubbly-card'));
      const moodCard = cards.find(c => c.textContent.includes('Mood Status'));
      if (moodCard) moodCard.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    console.log("Capturing Patient View with Manual Override Dropdown open...");
    await page.screenshot({ path: join(ARTIFACT_DIR, 'patient_override_dropdown.png') });

    // Toggle to Provider View
    console.log("Clicking 'Provider View' toggle pill...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.toggle-pill-btn'));
      const providerBtn = buttons.find(b => b.textContent.includes('Provider View'));
      if (providerBtn) providerBtn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    // Screenshot 2: Provider Dashboard
    console.log("Capturing Provider Dashboard...");
    await page.screenshot({ path: join(ARTIFACT_DIR, 'provider_dashboard.png') });

    // Hover or Click on a Psychiatrist Visit dot to trigger the clinical tooltip
    console.log("Triggering tooltip for Provider Visits scatter plot...");
    await page.evaluate(() => {
      const scatterDots = Array.from(document.querySelectorAll('.recharts-scatter-symbol'));
      if (scatterDots.length > 0) {
        // Try clicking or hovering over the first dot
        const event = new MouseEvent('mouseover', { bubbles: true, cancelable: true });
        scatterDots[0].dispatchEvent(event);
      }
    });
    await new Promise(r => setTimeout(r, 1000));
    console.log("Capturing Provider Dashboard with Tooltip open...");
    await page.screenshot({ path: join(ARTIFACT_DIR, 'provider_dashboard_tooltip.png') });

    // Click "Care Protocol Config & Guidelines" Tab
    console.log("Switching to Care Protocol Setup tab...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.btn'));
      const configBtn = buttons.find(b => b.textContent.includes('Care Protocol Config'));
      if (configBtn) configBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Screenshot 3: Protocol Config
    console.log("Capturing Protocol Configuration...");
    await page.screenshot({ path: join(ARTIFACT_DIR, 'provider_protocol.png') });

    // Click "Branding Alternative Styles" Tab
    console.log("Switching to Branding alternative styles tab...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.btn'));
      const brandingBtn = buttons.find(b => b.textContent.includes('Branding'));
      if (brandingBtn) brandingBtn.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Screenshot 4: Branding Comparison
    console.log("Capturing Branding Options stack...");
    await page.screenshot({ path: join(ARTIFACT_DIR, 'provider_branding.png') });

    console.log("Screenshots captured successfully.");
  } catch (error) {
    console.error("Error during visual capture:", error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

run().catch(console.error);
