# PRODUCT

we are making an applications that providers can use to schedule digital check-in for their patients.

when patients have a long-term or chronic condition, they have to go to the provider on a regular basis.

Going to the provider costs money so we are making an app that will check in on the patients periodically to monitor symptoms and treatment compliance.

## Patient Experience

The idea is that this application will use some mechanism like push notifications or emails or text messages or whatever to check in on patients and ask for their status. 
This could be done with conversational AI so that the AI asks the patient the right questions and is able to ask for clarifications, for example if some information is incomplete. 
This could be useful, for example, if the questions are very exact and answering them correctly would require reading long requirements. We could have the AI read these requirements and make sure that the patient answers in accordance with these requirements.
The application will use AI to analyze the patient's answers and generate structured outputs to fill a table with new entries for every day. It then converts these into nicely readable graphs for the practitioner. 
We must note that it is not so good to ask people for numbers, as that could induce issues with subjective measurement, although this must be substantiated by the literature. We will have to look into this but what we could do is something similar to what we do with LLMs. We tell the patient, "Last week you told me that you were feeling so-and-so. How does your feeling or mental state today compare? Is it better or worse?" 

Something that could be nice is that the AI, based on the answers of the patient, can increase the frequency of check-ins if the person's condition is worsening and that is medically indicated. We will provide some scientific evidence to support this technique in the document Evidence.md. 

The application can, based on the patient's answers, perform actions such as, as previously noted, changing its schedule and sending a notification to the practitioner with different messages, such as:
- telling them that the patient is in a bad condition
- maybe suggesting a sooner next appointment
- or a call to check in

## Practioner View

The practitioner will have this data in a nicely readable visual format. Suitable plots. Maybe we can use something interactive like plotly or whatever is suitable considering our tech stack. The tech stack will be defined in a tech section. There will also be a little AI-generated summary of the development of the patient's condition in the last period, whatever periods we have. What is shown to the practitioner at the end is also configurable. See section below. 

## Configuration and data collection

The idea here is that this timer can be configured in natural language.
UI configuration is also possible. The machine takes in the practitioner's natural language instructions and creates a configuration which is then editable in the UI with certain options and a set of questions that are to be asked. 

The practitioner will specify something like:
- Check in on the patient every other day. Change frequency as needed (default option).
- Notify me in case of significant worsening.
- Notify me also in case the patient has not taken their medication for three days.
- Notifications are to be sent to me via email.
You will ask the patient the following questions:
- Have you taken your medication today and yesterday?
- Did you have any panic attacks in the last two days?
- How are you feeling, or not?

Depending on the question, this will be the case for most questions. The AI will generate answer options for every question, and as the patient uses the application, it will always fill in these answers with one of the standard options here. 

Visual Frame: Centralized, large emulated smartphone container for the patient interactive interface.Control 

Margin: Sidebar controls to simulate time-skipping, view toggles, and background events (e.g., "email notification sent").Security & Branding: Global "Demo / Proof of Concept" watermark on the demo; "end-to-end encrypted, HIPAA-compliant bla all data will be sent to provider and only to your provider (ie doc fyi for u ai)".
Framework Weight: Lightweight implementation; no heavy UI frameworks.
System Toggles (3 Views)
Configuration View: Wide control panel to set up questions, parameters, and flow options.
Patient Check-In View: Interactive chat simulation where AI drafts response fields, allowing manual patient edits and submission.
Dashboard View: Dual-visible trend tracking (patient and provider) displaying continuous multi-day answer histories.
Data Visualization
Numeric Fields: simple 2d plot maybe.
Categoric (eg better/worse) Simple, linear 1D trend plots aligned sequentially underneath the data, eg with red minus and green plus.

# Tech

# Application Planning & Technical Specification: Digital Check-In System

## 1. Overview & Core Value Proposition

This application enables medical practitioners to schedule and manage digital check-ins for patients managing long-term or chronic conditions. By automating periodic symptom monitoring and treatment compliance tracking, the platform minimizes the financial and logistical burden of frequent, in-person clinic visits.

---

## 2. Patient Experience

* **Engagement Channels:** Initiated via push notifications, emails, or text messages based on the active schedule.
* **Conversational AI Interface:**
* Conducts automated interviews using a conversational model.
* Asks clarification questions if provided information is incomplete.
* Ingests and references long, detailed medical requirements behind the scenes to ensure patient responses comply precisely without requiring the patient to read complex documentation.
* **Dynamic Frequency Adjustment:** Based on response analysis, the AI automatically increases check-in frequency if the patient’s condition exhibits medically indicated worsening (scientific literature backing this is located in `Evidence.md`).


* **Subjective Measurement Mitigation:** To avoid the subjective inconsistency of asking patients for raw numerical scores, the AI uses relative comparisons anchoring to past states (e.g., *"Last week you mentioned feeling X. How does your state today compare? Better or worse?"*). Historical tracking literature is detailed in `Evidence.md`.
* **Automated Clinical Triggers:** Based on patient inputs, the system triggers real-time schedule modifications and dispatches email notifications to the provider containing specific updates:
* Alerting that a patient's condition has severely deteriorated.
* Suggesting an accelerated timeline for the next clinical appointment.
* Recommending an immediate telephonic check-in.



---

## 3. Practitioner View & Configurations

### Configuration Engine

Practitioners define check-in rules using either manual UI fields or raw natural language inputs. A natural language processing parser converts text instructions into structured configurations, which remain fully editable within the wide configuration UI panel.

**Example Configuration Specification:**

* *Triggers:* Notify practitioner via email if significant worsening occurs, or if medication compliance drops for 3 consecutive days.
* *Configured Interview Questions:*
* "Have you taken your medication today and yesterday?"
* "How are you feeling, or not?"



### UI Mapping & Response Capture

For every configured question, the AI defines standard categorical answer choices. As the conversation progresses, the AI maps the patient's spoken statements directly to these predefined options. A single patient statement can resolve multiple questions simultaneously (e.g., answering both mood and physical symptoms in one sentence). The model also populates a separate free-text summary field for additional qualitative context if redundancy occurs.

---

## 4. Frontend Interface Architecture

The application runs as a lightweight proof-of-concept interface with zero heavy UI frameworks.

### Global Visual Frame

* **Patient Container:** A centralized, large emulated smartphone frame displaying the active patient chat and voice interface.
* **Control Margin (Sidebar):** A functional sidebar housing time-skipping simulation tools, system view toggles, and real-time background event logs (e.g., displaying *"Email notification sent to provider"*).
* **Compliance, Security & Branding:** A global, permanent **"Demo / Proof of Concept"** watermark is visible across all views. Interface text clearly states: *"End-to-end encrypted, HIPAA-compliant. All data will be sent to your provider and only to your provider."*

### System Navigation (3 Unified Views)

1. **Configuration View:** Wide control layout enabling providers to set up parameters, schedules, target tracking metrics, and custom question flows. Includes a text input for natural language parsing alongside manual adjustments.
2. **Patient Check-In View:** The emulated phone chat screen supporting voice-driven interactions. Displays the active question, the AI's verbal prompts, and real-time updates as the system maps responses to target fields. Patients review the populated fields before final submission.
3. **Dashboard View:** Dual-visible trend tracking interface accessible to both patient and provider views. To simulate real clinical multi-patient setups, a top-level dropdown allows selecting between **three distinct mock patient profiles**, each containing between **1 and 5 months of continuous historical data** at varying check-in frequencies.
* *Note:* In production, patients would strictly see only their own data, marked via an embedded information box in the demo dashboard.



### Data Visualization Layout

To guarantee maximum responsiveness, **all historical data is aggressively pre-loaded**. Clicking the Dashboard view instantly renders charts without loading spinners or layout shifts.

* **Top Section:**
* *Numeric Fields:* Rendered via a clean 2D trend plot.
* *Categorical Fields (e.g., Better/Worse):* Visualized as simple, linear 1D trend lines aligned sequentially underneath the numeric plot, leveraging clear red minus (`-`) and green plus (`+`) indicator markers.
* *AI Summary:* A short text box containing an AI-generated analysis summarizing the trajectory of the patient's condition over the preceding tracking period.


* **Bottom Section:**
* *Historical Data Table:* A comprehensive daily log detailing exactly what the patient answered for every single question.
* *Actions Log Column:* A dedicated ledger column tracking every automated systemic intervention executed by the AI agent on that calendar date.



---

## 5. Technical & Backend API Specification

### State and Data Architecture

The frontend operates as a state-display engine. The backend manages conversational analysis and evaluation. For this demo, state is stored on the backend mimicking a relational system by saving records directly as flat JSON files.

### API Endpoints

#### 1. `POST /api/chat-audio`

Processes incoming streaming or raw patient audio during a check-in session. The frontend handles physical audio decoding, passing the raw voice data to the backend. The backend uses cloud AI to parse the audio context against the active session state, executing slot-filling logic against the active questionnaire parameters.

* **Input Payload:**
```json
{
  "audioData": "string (base64 encoded raw audio or path link)",
  "currentHistory": [
    {"role": "assistant", "text": "How are you feeling today compared to last week?"},
    {"role": "user", "text": "Audio transcript context if pre-processed"}
  ]
}

```


* **Backend Logic:**
1. Prepend clinical interviewer system prompt specifying targets (Metrics X, Y, Z).
2. Transcribe and evaluate input audio via cloud AI toolchains.
3. Determine if the current statement fulfills any outstanding questionnaire fields.
4. Generate structured JSON mapping updates for fields and compile the next voice response string.


* **Success Response:**

```json
    {
      "audioReply": "string (base64 encoded audio response or path)",
      "textReply": "string (text transcript of AI response)",
      "fieldUpdates": {
        "mood_status": "better",
        "free_text_comment": "Feeling better than yesterday but still experiencing mild fatigue."
      },
      "isComplete": false
    }
    ```
    *(Note: `fieldUpdates` can return empty or contain multiple elements depending on statement density. When `isComplete` passes true, the frontend hides chat inputs and exposes the "Review & Submit" panel.)*

#### 2. `POST /api/submit-check-in`
Commit finalized patient data entries to the JSON file data layer.
*   **Input Payload:**
    
```json
    {
      "patientId": "string",
      "checkInData": {
        "medication_taken_today": true,
        "medication_taken_yesterday": true,
        "panic_attacks_2d": false,
        "mood_status": "better",
        "summary_notes": "Patient reports positive progression."
      }
    }
    ```
*   **Backend Logic:**
    1. Validate incoming JSON keys against schema requirements.
    2. Append records to target patient JSON history file.
    3. Evaluate if metrics trigger immediate practitioner email notifications.
*   **Success Response:**
    
```json
    {
      "status": "success",
      "timestamp": "2026-05-18T22:55:07Z"
    }
    ```

#### 3. `POST /api/configure-nl`
Parses raw natural language text configurations supplied by the medical practitioner into actionable UI form parameters.
*   **Input Payload:**
    
```json
    {
      "rawInstruction": "Check in on the patient every other day. Notify me via email if they skip meds for three days or show significant worsening."
    }
    ```
*   **Backend Logic:**
    1. Pass instruction text to structured LLM parsing engine.
    2. Map parameters to the systemic configuration JSON schema definitions.
*   **Success Response:**
    
```json
    {
      "configuration": {
        "frequency_days": 2,
        "auto_adjust_frequency": true,
        "notification_channels": ["email"],
        "trigger_conditions": {
          "missed_medication_days": 3,
          "significant_worsening": true
        }
      }
    }
    ```

#### 4. `POST /api/time-skip`
Advances global system time metadata to simulate multi-day data logs, background triggers, and patient tracking metrics.
*   **Input Payload:**
    ```json
    {
      "days": 5
    }
    ```
*   **Backend Logic:**
    1. Shift active virtual clock metadata forward by specified integer value.
    2. Generate mock data entries across skipped days to simulate ongoing user compliance behavior.
    3. Run background check loops to evaluate if simulated events generate automated downstream interventions (e.g., schedule updates or clinic alerts).
*   **Success Response:**
    
```json
    {
      "updatedHistory": [
        {
          "date": "2026-05-23",
          "medication_compliance": false,
          "mood_metric": "worse",
          "actions_taken": "Email alert dispatched to practitioner: 3 days missed medication."
        }
      ]
    }
    ```


```


