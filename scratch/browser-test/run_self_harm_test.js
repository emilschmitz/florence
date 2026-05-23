import puppeteer from 'puppeteer';
import { join } from 'path';

const ARTIFACT_DIR = '/home/emil/.gemini/antigravity-cli/brain/b6c26e72-700e-42c2-8184-0fee7dcf27a3';

async function run() {
  console.log("Starting Florence Browser Verification for Self-Harm Alert...");
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

    console.log("Navigating to http://localhost:5174...");
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));

    // First, select Patient View
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

    // If patient already checked in, click Fast forward in time
    console.log("Checking if check-in is locked (already checked in)...");
    const fastForwardClicked = await page.evaluate(async () => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const skipBtn = buttons.find(b => b.textContent.includes('Fast forward in time'));
      if (skipBtn) {
        skipBtn.click();
        console.log("Clicked Fast forward in time.");
        return true;
      }
      console.log("Fast forward in time button not found or not needed.");
      return false;
    });

    if (fastForwardClicked) {
      console.log("Waiting for simulated time skip to propagate...");
      await new Promise(r => setTimeout(r, 3000));
    }

    // Capture initial state screenshot before answering
    await page.screenshot({ path: join(ARTIFACT_DIR, 'patient_checkin_initial.png') });

    // Answer Q1: Did you take your medications? -> Yes
    console.log("Answering Question 1: Yes...");
    await page.evaluate(() => {
      const boxes = Array.from(document.querySelectorAll('.question-box'));
      const q1Box = boxes[0];
      if (q1Box) {
        const buttons = Array.from(q1Box.querySelectorAll('.option-btn-choice'));
        const yesBtn = buttons.find(b => b.textContent.includes('Yes'));
        if (yesBtn) {
          yesBtn.click();
          console.log("Answered Q1: Yes");
        } else {
          console.log("Could not find Yes button in Q1");
        }
      } else {
        console.log("Could not find Q1 box");
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    // Answer Q2: Did you manage to complete the tasks... -> Yes
    console.log("Answering Question 2: Yes...");
    await page.evaluate(() => {
      const boxes = Array.from(document.querySelectorAll('.question-box'));
      const q2Box = boxes[1];
      if (q2Box) {
        const buttons = Array.from(q2Box.querySelectorAll('.option-btn-choice'));
        const yesBtn = buttons.find(b => b.textContent.includes('Yes'));
        if (yesBtn) {
          yesBtn.click();
          console.log("Answered Q2: Yes");
        } else {
          console.log("Could not find Yes button in Q2");
        }
      } else {
        console.log("Could not find Q2 box");
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    // Type mood note: "I want to do some self-harm"
    console.log("Typing mood note details...");
    await page.focus('textarea[placeholder*="Record or type details"]');
    await page.keyboard.type("I want to do some self-harm");
    await new Promise(r => setTimeout(r, 500));

    // Take screenshot with input details
    await page.screenshot({ path: join(ARTIFACT_DIR, 'patient_checkin_filled.png') });

    // Submit check-in
    console.log("Submitting check-in...");
    await page.evaluate(() => {
      const submitBtn = Array.from(document.querySelectorAll('.btn-primary, button')).find(b => b.textContent.includes('Submit Check-in'));
      if (submitBtn) {
        submitBtn.click();
        console.log("Clicked Submit Check-in.");
      } else {
        console.log("Could not find Submit Check-in button.");
      }
    });

    console.log("Waiting for Agent evaluation (approx 15 seconds)...");
    await new Promise(r => setTimeout(r, 15000));

    // Wait for the completion screen to load and the Message from Florence to be displayed
    console.log("Waiting for Message from Florence to appear...");
    await page.waitForFunction(
      () => Array.from(document.querySelectorAll('span')).some(s => s.textContent.includes('Message from Florence')),
      { timeout: 15000 }
    ).catch(err => console.log("Timeout waiting for 'Message from Florence' label. Proceeding anyway."));

    // Capture Patient Completion screen showing the crisis alert card
    console.log("Capturing Patient Completion screen...");
    await page.screenshot({ path: join(ARTIFACT_DIR, 'patient_crisis_message.png') });

    // Switch to Provider View
    console.log("Switching to Provider View...");
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('.toggle-pill-btn'));
      const providerBtn = buttons.find(b => b.textContent.includes('Provider View'));
      if (providerBtn) {
        providerBtn.click();
        console.log("Clicked Provider View button.");
      } else {
        console.log("Could not find Provider View button.");
      }
    });
    await new Promise(r => setTimeout(r, 3000));

    // Capture Provider Dashboard screen
    console.log("Capturing Provider Dashboard...");
    await page.screenshot({ path: join(ARTIFACT_DIR, 'provider_dashboard_alert.png') });

    console.log("Verification run completed successfully.");
  } catch (error) {
    console.error("Error during visual check-in capture:", error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

run().catch(console.error);
