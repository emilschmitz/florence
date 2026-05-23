import puppeteer from 'puppeteer';
import { join } from 'path';

const ARTIFACT_DIR = '/home/emil/.gemini/antigravity-cli/brain/3fef5550-19b1-4118-95e1-f1257ca0b99e';

async function run() {
  console.log("Starting Florence Browser Verification for Refresh/Quiz Flow...");
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
    await page.setViewport({ width: 1280, height: 950 });

    let url = 'http://localhost:5173';
    console.log(`Navigating to ${url}...`);
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 5000 });
    } catch (e) {
      url = 'http://localhost:5174';
      console.log(`Connection to 5173 failed, trying fallback to ${url}...`);
      await page.goto(url, { waitUntil: 'networkidle2' });
    }

    // 1. Simulating page refresh
    console.log("Refreshing the page...");
    await page.reload({ waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // 2. Select Patient View
    console.log("Selecting Patient View...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.toggle-pill-btn'));
      const patientBtn = buttons.find(b => b.textContent.includes('Patient View'));
      if (patientBtn) {
        patientBtn.click();
        console.log("Clicked Patient View button.");
      } else {
        console.log("Could not find Patient View button.");
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    // 3. Capture screen to confirm it's on the quiz page
    await page.screenshot({ path: join(ARTIFACT_DIR, 'patient_view_after_refresh.png') });

    // 4. Verify we are on the check-in quiz screen and NOT the completed screen
    const result = await page.evaluate(() => {
      const bodyText = document.body.textContent || '';
      const isQuizScreen = bodyText.includes('Daily Health Check-in') && bodyText.includes('Question 1');
      const isSuccessScreen = bodyText.includes('Thank you') || bodyText.includes('Incredible! You haven\'t missed');
      
      return {
        isQuizScreen,
        isSuccessScreen,
        bodyTextSummary: bodyText.substring(0, 300)
      };
    });

    console.log("Evaluation Results:", result);

    if (result.isQuizScreen && !result.isSuccessScreen) {
      console.log("[PASS] Verification successful! Right after refresh, the patient view starts directly on the check-in quiz screen.");
    } else {
      console.error("[FAIL] Verification failed! Expected quiz screen but got success/completion screen or unknown state.");
      process.exit(1);
    }

  } catch (error) {
    console.error("Error during browser verification:", error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

run().catch(console.error);
