# Florence App - Comprehensive Update TODO

## 1. Re-branding & Core Identity
- [x] Rename project to **Florence** (from CareCore).
- [ ] Update all UI labels, headers, and logs to use "Florence".
- [ ] Update favicon/assets (if any) to Florence theme.

## 2. Configuration & Notification Engine
- [ ] **Data Schema Update:**
    - [ ] Update `config.json` to include:
        - `notification_channels`: Array of `email`, `push`, `sms`.
        - `contact_instructions`: Free-text instruction for when/how to notify (e.g., "Email practitioner immediately if mood is 'worse' for 2 days").
        - `patient_notification_settings`: Preferences for check-in reminders.
- [ ] **Agent Integration (Simulated Mastra + MCP):**
    - [ ] Implement a simplified "Agent" service that:
        - Parses `contact_instructions` to decide on notifications.
        - Handles schedule change requests via a simulated MCP tool.
        - Saves these as structured "Agent Logs" for the practitioner.
- [ ] **Configuration View Update:**
    - [ ] Add specific inputs for Notification Channels (Email/Push/SMS).
    - [ ] Add a text field for "Contact Instructions".
    - [ ] Add "Patient Reminder Preferences".

## 3. Advanced Features & Refinement
- [ ] **LLM Upgrade:**
    - [ ] Switch primary LLM to `deepseek/deepseek-chat` or `google/gemini-3.1-flash-lite` (cheaper/faster).
- [ ] **UI Polish & Responsiveness:**
    - [ ] Fix "demo button" styling (ensure it's not "funny").
    - [ ] Add media queries to `index.css` for responsive layout (Mobile/Tablet/Desktop).
    - [ ] Refine the red/pinkish theme for better contrast and accessibility.
- [ ] **Realistic Data Sweep:**
    - [ ] Ensure all mock patients have realistic medical histories and medication lists (Wellbutrin, etc.).

## 4. Verification & Testing (Meticulous)
- [ ] **Integration Tests:**
    - [ ] Test the notification logic: Perform a "worse" check-in and verify an email alert is "sent" in logs.
    - [ ] Test the Agent's MCP simulation: Send an instruction to "change schedule to weekly" and verify the config updates.
- [ ] **Meticulous Browser Verification:**
    - [ ] Record a video/screenshots of every flow:
        - [ ] Dashboard view (Desktop & Mobile).
        - [ ] Configuration view (Notification setup & Protocol drafting).
        - [ ] Patient View (Voice check-in & Review flow).
    - [ ] Verify visual consistency across all screen sizes.

## 5. Deployment Readiness
- [ ] Final visual audit of all screenshots.
- [ ] Clean up logs and temporary data files.
