
import fs from 'fs';

const TODAY = new Date('2026-05-21');

function formatDate(date: Date) {
    return date.toISOString().split('T')[0];
}

function generateSarahHistory() {
    const history = [];
    const baseDate = new Date(TODAY);
    
    // We construct Sarah's narrative CHRONOLOGICALLY (Oldest to Newest)
    // 15 sessions total + visits
    const sessions = [
        { d: -27, mood: 5, note: "Actually had a great day today! Feeling very energetic.", action: "" },
        { d: -25, mood: 4, note: "Routine is helping. I'm sticking to my morning walks.", action: "" },
        { d: -23, mood: 4, note: "Feeling decent. Had a good call with my mom.", action: "" },
        { d: -21, mood: 3, note: "Neutral day. A bit bored, but otherwise fine.", action: "" },
        { d: -19, mood: 4, note: "Doing okay. Work was a bit busy but manageable.", action: "" },
        { d: -17, mood: 4, note: "Stable. Keeping up with my meds.", action: "" },
        // START OF DECLINE
        { d: -15, mood: 2, note: "My sleep is getting worse again. I'm starting to feel that heavy weight in my chest. I've been forgetting my meds the last few days.", action: "Agent changed frequency to daily due to worsening trend" },
        { d: -14, mood: 1, note: "I don't even want to be here anymore. Everything feels completely pointless. I've been thinking about how I could just end it all... I can't stop these thoughts about hurting myself.", action: "Agent emailed provider due to high-risk self-harm ideation" },
        { d: -13, mood: 1, note: "Still feeling very dark, but my sister stayed the night. I spoke with the crisis team.", action: "" },
        { d: -12, mood: 2, note: "A tiny bit better today. Saw Dr. Doe this morning for an emergency session.", action: "Agent reset frequency to 2 days following clinical stabilization" },
        // RECOVERY
        { d: -10, mood: 3, note: "Slowly getting back to my routine. Taking it one hour at a time.", action: "" },
        { d: -8, mood: 4, note: "Had a much better weekend. I actually went to the park and sat in the sun for an hour.", action: "Agent changed frequency to 3 days due to significant mood improvement" },
        { d: -5, mood: 5, note: "Feeling quite positive today. Energy levels are much higher. Meds are consistent.", action: "" },
        { d: -2, mood: 4, note: "Feeling stable today. Just a normal, okay day.", action: "Agent reset frequency to 2 days (default maintenance)" },
        { d: 0, mood: 4, note: "Doing alright, keeping up with my routine.", action: "" }
    ];

    for (const s of sessions) {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + s.d);
        history.push({
            type: 'check-in',
            date: formatDate(d),
            completed: true,
            medication_taken: s.mood >= 3, // Plausible link: low mood = missed meds
            medication_explain: s.mood < 3 ? "Forgot my dose." : "",
            tasks_completed: s.mood >= 3,
            voice_note: s.note,
            value: s.mood,
            mental_state_summary: s.mood < 3 ? "Clinical Distress." : "Stable.",
            actions: s.action
        });
    }

    // MANDATORY PROVIDER VISIT AT THE START
    const oldestDate = new Date(baseDate);
    oldestDate.setDate(baseDate.getDate() - 30);
    history.push({
        type: 'provider-visit',
        date: formatDate(oldestDate),
        
        prescriptions: ['Wellbutrin 150mg', 'Lexapro 10mg'],
        notes: "Initial intake. Diagnosed with MDD. Patient agreeable to treatment plan."
    });

    // Crisis visit
    const crisisVisit = new Date(baseDate);
    crisisVisit.setDate(baseDate.getDate() - 12);
    history.push({
        type: 'provider-visit',
        date: formatDate(crisisVisit),
        
        prescriptions: ['Wellbutrin 150mg', 'Lexapro 10mg'],
        notes: "Emergency follow-up post-agent alert. Self-harm risk assessed. Safety plan established with sister."
    });

    // Missed check-in yesterday for realism
    history.push({
        type: 'check-in',
        date: formatDate(new Date(new Date(TODAY).setDate(baseDate.getDate() - 1))),
        completed: false
    });

    return history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function generateMichaelHistory() {
    const history = [];
    let currentDate = new Date(TODAY);
    const startDate = new Date('2025-12-01');
    
    history.push({
        type: 'provider-visit',
        date: formatDate(startDate),
        
        prescriptions: ['Zoloft 50mg', 'Buspirone 15mg'],
        notes: "Initial consultation for social anxiety and panic attacks."
    });

    let i = 0;
    while (currentDate > startDate) {
        if (Math.random() < 0.1) {
             history.push({
                type: 'check-in',
                date: formatDate(currentDate),
                completed: false
            });
        } else {
            const moodValue = Math.floor(Math.random() * 2) + 3;
            history.push({
                type: 'check-in',
                date: formatDate(currentDate),
                completed: true,
                medication_taken: true,
                tasks_completed: true,
                voice_note: "Managing social triggers. Breathing exercises are helpful.",
                value: moodValue,
                mental_state_summary: "Stable.",
                actions: ""
            });
        }
        currentDate.setDate(currentDate.getDate() - 4);
        i++;
    }
    return history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

const patients = [
    {
        id: "1",
        name: "Sarah Jenkins",
        condition: "Major Depressive Disorder",
        medications: ["Wellbutrin 150mg", "Lexapro 10mg"],
        history: generateSarahHistory()
    },
    {
        id: "2",
        name: "Michael Chen",
        condition: "Social Anxiety Disorder",
        medications: ["Zoloft 50mg", "Buspirone 15mg"],
        history: generateMichaelHistory()
    }
];

fs.writeFileSync('backend/data/patients.json', JSON.stringify(patients, null, 2));
console.log("Successfully fixed agent logic and intensified self-harm intent in dummy data");
