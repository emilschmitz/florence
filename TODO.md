# Digital Check-In System - Implementation TODO

## 1. Advanced Interaction & Voice
- [x] **Modern Interaction Framework:**
    - [ ] Switch to OpenAI Realtime-style interaction (low latency - *Future Goal*).
    - [x] Replace robotic browser TTS with high-quality OpenAI TTS (`tts-1`).
    - [ ] Implement interruption handling (Voice Activity Detection - *Future Goal*).
- [x] **Agentic Question Checklist:**
    - [x] Update LLM prompt to explicitly cross off structured questions.
    - [x] Add side-panel checklist in `PatientCheckInView` for visual progress.
    - [x] Ensure AI "circles back" to unanswered categorical questions.

## 2. UI/UX Polishing (Pink & Gradient)
- [x] **Visual Redesign:**
    - [x] Switch to pure white backgrounds with pink gradients.
    - [x] Use thin borders and soft rounded edges (20px).
    - [x] Fix Dashboard text overflows (AI Summary boxes).
    - [x] Remove "phone-like" constraints from the chat interface.
- [ ] **Interaction Delights:**
    - [ ] Add hover animations (bubbles scaling up).
    - [ ] Smooth transitions between dashboard metrics.

## 3. Data & Scientific Grounding
- [x] **Persistent Database:**
    - [x] Migrate from JSON files to SQLite for structured clinical data.
    - [x] Implement `sqlite3` bridge in backend.
- [x] **Scientific Grounding Page:**
    - [x] Create a dedicated page for clinical validity (PHQ-9, GAD-7 mapping).
    - [x] Add justifications for each care protocol question.
- [x] **Configuration Enhancements:**
    - [x] Support for Open-Ended vs Categorical questions in UI.
    - [x] Allow natural language modification of predefined answers.

## 4. Verification & Testing
- [ ] **Full User Flow Simulation:**
    - [ ] Run 10-20 end-to-end tests via OpenRouter.
    - [ ] Verify checklist crossing for Michael Chen (Anxiety flow).
    - [ ] Verify checklist crossing for Sarah Jenkins (Depression flow).
- [x] **Visual Audit:**
    - [x] Take screenshots of aligned text boxes (`dashboard.png`).
    - [x] Confirm modern web app aesthetic.
