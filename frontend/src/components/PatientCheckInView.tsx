import React, { useState, useRef, useEffect } from 'react';
import { Mic, CheckCircle2, Volume2, ArrowRight, Check, X, ShieldAlert } from 'lucide-react';

interface PatientCheckInViewProps {
  patient: any;
  config: any;
  onComplete: () => void;
  system: any;
  onJumpToNextCheckIn: () => void;
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
  if (year === undefined || month === undefined || day === undefined) return dateStr;
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const PatientCheckInView: React.FC<PatientCheckInViewProps> = ({ 
  patient, 
  config, 
  onComplete, 
  system, 
  onJumpToNextCheckIn 
}) => {
  const [answers, setAnswers] = useState<{ [qId: string]: string | null }>({});
  const [explanations, setExplanations] = useState<{ [qId: string]: string }>({});
  const [moodNoteText, setMoodNoteText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [activeRecordingField, setActiveRecordingField] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [activeSuccessView, setActiveSuccessView] = useState<{
    date: string;
    header: string;
    body: string;
    agentMessage?: string;
    nextCheckInDate: string;
  } | null>(null);
  
  const recognitionRef = useRef<any>(null);

  // Check if patient already completed a check-in for the current system date
  const alreadyCheckedInToday = patient?.history?.some(
    (h: any) => h.type === 'check-in' && h.date === system?.current_date
  );

  const todayCheckIn = patient?.history?.find(
    (h: any) => h.type === 'check-in' && h.date === system?.current_date
  );

  const isSkipped = alreadyCheckedInToday && todayCheckIn?.completed === false;
  const isCompleted = alreadyCheckedInToday && todayCheckIn?.completed === true;
  const showSuccessPage = activeSuccessView !== null || isCompleted;

  // Calculate medication streak
  const getMedicationStreak = () => {
    if (!patient?.history) return 0;
    let streak = 0;
    const history = [...patient.history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    for (const entry of history) {
      if (entry.type === 'check-in' && entry.medication_taken) {
        streak++;
      } else if (entry.type === 'check-in' && entry.medication_taken === false) {
        break;
      }
    }
    return streak;
  };

  const medicationStreak = getMedicationStreak();
  const firstName = patient?.name ? patient.name.split(' ')[0] : 'Patient';

  const getSuccessMessage = () => {
    if (medicationStreak >= 7) return "Incredible! You haven't missed a single dose in over a week. Your consistency is truly impressive.";
    if (medicationStreak >= 3) return "Great work! You've been very consistent with your medications. You haven't missed any time recently.";
    return "Thank you for checking in today. Keeping your clinician updated is an important step in your care.";
  };

  useEffect(() => {
    // Reset inputs when patient or date changes
    setAnswers({});
    setExplanations({});
    setMoodNoteText('');
    setActiveRecordingField(null);
    setTranscript('');
    stopVoiceRecording();

    if (patient && !alreadyCheckedInToday) {
      const intro = `Hi ${patient.name}. Let's do your check-in for today.`;
      speak(intro);
    }
  }, [patient, system?.current_date]);

  // Reset success view when patient changes
  useEffect(() => {
    setActiveSuccessView(null);
  }, [patient?.id]);

  // Auto-resize textareas when contents change (voice transcription or typing)
  useEffect(() => {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach((ta) => {
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    });
  }, [explanations, moodNoteText]);

  if (!config || !patient || !system) {
    return (
      <div className="patient-view-centered" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: 'var(--primary-red)' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800' }}>Loading daily health check-in...</h2>
      </div>
    );
  }

  async function speak(text: string) {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new (window as any).Audio(url);
        audio.play();
      }
    } catch (error) {
      console.error('Florence TTS error:', error);
    }
  }

  function startVoiceRecording(field: string) {
    let currentVal = '';
    if (field === 'mood') {
      currentVal = moodNoteText;
    } else {
      currentVal = explanations[field] || '';
    }

    setTranscript(currentVal);
    setIsRecording(true);
    setActiveRecordingField(field);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (currentTranscript) {
          setTranscript(currentTranscript);
          if (field === 'mood') {
            setMoodNoteText(currentTranscript);
          } else {
            setExplanations(prev => ({ ...prev, [field]: currentTranscript }));
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("Failed to start speech recognition:", err);
      setIsRecording(false);
    }
  }

  function stopVoiceRecording() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }

  const handleSubmit = async () => {
    const checkInData: any = {
      voice_note: moodNoteText || undefined
    };

    config.questions?.forEach((q: any) => {
      const qText = (q.text || '').toLowerCase();
      const ans = answers[q.id];
      const exp = explanations[q.id];

      if (qText.includes('medication')) {
        if (q.type === 'free-form') {
          const lowerExp = (exp || '').toLowerCase();
          const hasNegation = /\b(no|not|forgot|forget|missed|didn't|did not|skipped)\b/.test(lowerExp);
          checkInData.medication_taken = exp ? !hasNegation : undefined;
        } else {
          checkInData.medication_taken = ans === 'Yes';
        }
      } else if (qText.includes('task')) {
        if (q.type === 'free-form') {
          checkInData.tasks_explain = exp || undefined;
          const lowerExp = (exp || '').toLowerCase();
          const hasNegation = /\b(no|not|forgot|forget|missed|didn't|did not|skipped)\b/.test(lowerExp);
          checkInData.tasks_completed = exp ? !hasNegation : undefined;
        } else {
          checkInData.tasks_completed = ans === 'Yes';
          if (ans === 'Explain') {
            checkInData.tasks_explain = exp || undefined;
          }
        }
      }
    });

    try {
      setLoading(true);
      const res = await fetch('/api/submit-check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id,
          checkInData
        })
      });
      if (res.ok) {
        const data = await res.json();
        speak(data.patientEncouragementHeader || "Thank you for checking in.");
        setActiveSuccessView({
          date: system.current_date,
          header: data.patientEncouragementHeader,
          body: data.patientEncouragementBody,
          agentMessage: data.agentMessage,
          nextCheckInDate: data.nextCheckInDate
        });
        onComplete();
      }
    } catch (error) {
      console.error('Submit check-in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSkipToday = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/skip-check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: patient.id
        })
      });
      if (res.ok) {
        speak("Check-in skipped.");
        onComplete();
      }
    } catch (error) {
      console.error('Skip check-in error:', error);
    } finally {
      setLoading(false);
    }
  };

  const isQuestionUnlocked = (idx: number) => {
    for (let i = 0; i < idx; i++) {
      const prevQ = config.questions[i];
      if (prevQ.type === 'free-form') {
        if (!explanations[prevQ.id]?.trim()) {
          return false;
        }
      } else {
        if (!answers[prevQ.id]) {
          return false;
        }
      }
    }
    return true;
  };

  const allQuestionsAnswered = config.questions?.every((q: any) => {
    if (q.type === 'free-form') {
      return !!explanations[q.id]?.trim();
    }
    return !!answers[q.id];
  });

  const successData = activeSuccessView || (isCompleted ? {
    date: todayCheckIn.date,
    header: todayCheckIn.patient_encouragement_header || `Great job, ${firstName}!`,
    body: todayCheckIn.patient_encouragement_body || getSuccessMessage(),
    agentMessage: todayCheckIn.agent_message,
    nextCheckInDate: patient.nextCheckInDate
  } : null);

  return (
    <div className="patient-view-centered">
      {loading && (
        <div className="processing-overlay">
          <div className="spinner-container">
            <div className="spinner"></div>
            <div className="processing-text">Processing results...</div>
          </div>
        </div>
      )}

      {showSuccessPage && successData ? (
        /* Lockdown / Completion Screen */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px 0' }}>
          <div className="card" style={{ textAlign: 'center', padding: '40px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: '20px' }}>
              <div style={{ background: 'var(--light-pink)', borderRadius: '50%', padding: '20px' }}>
                <CheckCircle2 size={56} color="var(--primary-red)" />
              </div>
              {medicationStreak > 0 && (
                <div style={{ position: 'absolute', top: -5, right: -5, background: 'var(--primary-red)', color: 'white', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', border: '3px solid white', boxShadow: '0 2px 8px rgba(255, 51, 102, 0.2)' }}>
                  {medicationStreak}
                </div>
              )}
            </div>
            
            <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '12px', color: 'var(--text-dark)' }}>{successData.header}</h2>
            
            <p style={{ color: 'var(--text-gray)', fontSize: '15px', marginBottom: '0', maxWidth: '440px', lineHeight: '1.5' }}>
              {successData.body}
            </p>
            {successData.agentMessage && (
              <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(255, 51, 102, 0.1)', borderRadius: '12px', border: '1px solid rgba(255, 51, 102, 0.2)', width: '100%', maxWidth: '440px', textAlign: 'left' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <ShieldAlert size={18} color="var(--primary-red)" />
                  <span style={{ fontWeight: '700', color: 'var(--primary-red)', fontSize: '14px' }}>Message from Florence</span>
                </div>
                <p style={{ margin: 0, color: 'var(--text-dark)', fontSize: '14px', lineHeight: '1.5' }}>
                  {successData.agentMessage}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Check-in Forms */
        <div className={isSkipped ? 'skipped-form' : ''}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div>
              <h2 style={{ margin: 0, fontWeight: '800', fontSize: '24px' }}>Daily Health Check-in</h2>
              <p style={{ margin: '4px 0 0 0', color: 'var(--text-gray)', fontSize: '14px' }}>Clinical daily checkup assistant</p>
            </div>
          </div>

          {isSkipped && (
            <div className="skipped-banner">
              <X size={20} color="var(--text-gray)" />
              <span>Check-in for {formatDate(system?.current_date)} was skipped.</span>
            </div>
          )}

          {/* Render Active Clinical Questions dynamically */}
          {config.questions?.map((q: any, idx: number) => {
            const unlocked = isQuestionUnlocked(idx);
            const answer = answers[q.id];
            const explanation = explanations[q.id] || '';
            const showExplain = q.type !== 'categorical';

            return (
              <div key={q.id} className={`question-box ${!unlocked ? 'locked' : ''}`}>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--primary-red)', display: 'block', marginBottom: '8px' }}>
                  Question {idx + 1}
                </span>
                <h3 className="question-title" style={{ marginBottom: '20px' }}>
                  {idx + 1}. {q.text.replace(/\{\{(medications|medication)\}\}/gi, config?.medications_text || 'medications').replace(/\[\[(medications|medication)\]\]/gi, config?.medications_text || 'medications')}
                </h3>

                {q.type === 'free-form' && (
                  <hr style={{ border: '0', borderTop: '1px solid rgba(255, 51, 102, 0.15)', margin: '16px 0 20px 0' }} />
                )}

                {q.type === 'categorical' && (
                  <div className="option-group">
                    {(q.options || ['Yes', 'No']).filter((opt: string) => opt.toLowerCase() !== 'explain').map((opt: string) => {
                      let btnClass = '';
                      if (answer === opt) {
                        if (opt === 'Yes') btnClass = 'selected-yes';
                        else if (opt === 'No') btnClass = 'selected-no';
                        else btnClass = 'selected-voice';
                      }
                      return (
                        <button
                          key={opt}
                          className={`option-btn-choice ${btnClass}`}
                          onClick={() => {
                            setAnswers({ ...answers, [q.id]: opt });
                            speak(opt);
                            stopVoiceRecording();
                          }}
                          disabled={!unlocked || loading || isSkipped}
                        >
                          {opt === 'Yes' ? <Check size={18} /> : opt === 'No' ? <X size={18} /> : <Mic size={18} />} {opt}
                        </button>
                      );
                    })}
                  </div>
                )}

                {showExplain && (
                  <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                      type="button"
                      className="btn"
                      style={{
                        width: '100%',
                        height: '46px',
                        borderRadius: '20px',
                        border: '2px solid rgba(255, 51, 102, 0.15)',
                        background: isRecording && activeRecordingField === q.id ? 'var(--primary-red)' : 'white',
                        color: isRecording && activeRecordingField === q.id ? 'white' : 'var(--primary-red)',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        if (isRecording && activeRecordingField === q.id) {
                          stopVoiceRecording();
                        } else {
                          startVoiceRecording(q.id);
                        }
                      }}
                      disabled={!unlocked || loading || isSkipped}
                    >
                      <Mic size={18} />
                      {isRecording && activeRecordingField === q.id ? 'Finish recording' : q.type === 'free-form' ? 'Record response' : 'Record explanation'}
                    </button>

                    {(isRecording && activeRecordingField === q.id) && (
                      <div className="mic-buzz-wave">
                        <div className="mic-buzz-bar" />
                        <div className="mic-buzz-bar" />
                        <div className="mic-buzz-bar" />
                        <div className="mic-buzz-bar" />
                        <div className="mic-buzz-bar" />
                      </div>
                    )}

                    {(explanation || (isRecording && activeRecordingField === q.id) || q.type === 'free-form' || q.type === 'open-ended') && (
                      <textarea
                        value={explanation}
                        onChange={(e) => setExplanations({ ...explanations, [q.id]: e.target.value })}
                        placeholder={q.type === 'free-form' ? "Type response or record here..." : "Record details or type explanation here..."}
                        style={{
                          width: '100%',
                          minHeight: '80px',
                          height: 'auto',
                          padding: '12px',
                          borderRadius: '16px',
                          border: '1px solid rgba(255, 51, 102, 0.15)',
                          background: 'var(--light-pink)',
                          fontSize: '13px',
                          resize: 'none',
                          outline: 'none',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box'
                        }}
                        disabled={!unlocked || loading || isSkipped}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Question 3: Optional Mood Note */}
          <div className={`question-box ${!allQuestionsAnswered ? 'locked' : ''}`}>
            <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--primary-red)', display: 'block', marginBottom: '8px' }}>
              Optional
            </span>
            <h3 className="question-title">Make a note of how you feel</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  type="button"
                  className="btn"
                  style={{
                    width: '100%',
                    height: '46px',
                    borderRadius: '20px',
                    border: '2px solid rgba(255, 51, 102, 0.15)',
                    background: isRecording && activeRecordingField === 'mood' ? 'var(--primary-red)' : 'white',
                    color: isRecording && activeRecordingField === 'mood' ? 'white' : 'var(--primary-red)',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                  disabled={!allQuestionsAnswered || loading || isSkipped}
                  onClick={() => {
                    if (isRecording && activeRecordingField === 'mood') {
                      stopVoiceRecording();
                    } else {
                      startVoiceRecording('mood');
                    }
                  }}
                >
                  <Mic size={18} />
                  {isRecording && activeRecordingField === 'mood' ? 'Finish recording' : 'Record how you feel'}
                </button>

                {(isRecording && activeRecordingField === 'mood') && (
                  <div className="mic-buzz-wave">
                    <div className="mic-buzz-bar" />
                    <div className="mic-buzz-bar" />
                    <div className="mic-buzz-bar" />
                    <div className="mic-buzz-bar" />
                    <div className="mic-buzz-bar" />
                  </div>
                )}

                {(true) && (
                  <textarea
                    value={moodNoteText}
                    onChange={(e) => setMoodNoteText(e.target.value)}
                    placeholder="Record or type details about your mood, anxiety, energy, or overall feelings today..."
                    style={{
                      width: '100%',
                      minHeight: '100px',
                      height: 'auto',
                      padding: '12px',
                      borderRadius: '16px',
                      border: '1px solid rgba(255, 51, 102, 0.15)',
                      background: 'var(--light-pink)',
                      fontSize: '13px',
                      resize: 'none',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box'
                    }}
                    disabled={!allQuestionsAnswered || loading || isSkipped}
                  />
                )}
              </div>

              {allQuestionsAnswered && !isSkipped && (
                <button
                  onClick={handleSubmit}
                  className="btn btn-primary"
                  style={{ width: '100%', height: '48px', borderRadius: '20px', marginTop: '12px' }}
                  disabled={loading}
                >
                  {loading ? 'Submitting...' : 'Submit Check-in'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating Jump to Next Check-in Box (Only in Patient View, bottom-right separate box) */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        backgroundColor: 'white',
        padding: '20px 24px',
        borderRadius: '28px',
        boxShadow: '0 10px 35px -5px rgba(0,0,0,0.1), 0 8px 16px -6px rgba(0,0,0,0.05)',
        border: '1px solid rgba(255, 51, 102, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        alignItems: 'center',
        zIndex: 40,
        minWidth: '240px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-gray)', textTransform: 'uppercase', display: 'block', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '4px' }}>
            Simulated Date
          </span>
          <span style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-dark)' }}>
            {activeSuccessView 
              ? formatDate(activeSuccessView.date) 
              : (formatDate(system?.current_date) || 'May 20, 2026')}
          </span>
        </div>

        {activeSuccessView ? (
          <button 
            onClick={() => setActiveSuccessView(null)}
            className="btn btn-primary"
            style={{ 
              width: '100%',
              padding: '12px 20px', 
              fontSize: '16px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              lineHeight: '1.2',
              borderRadius: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800' }}>
              <span>Start next check-in</span>
              <ArrowRight size={18} />
            </div>
            <span style={{ fontSize: '13px', opacity: '0.9', fontWeight: '600' }}>
              on {formatDate(activeSuccessView.nextCheckInDate)}
            </span>
          </button>
        ) : isSkipped ? (
          <button 
            onClick={onJumpToNextCheckIn}
            className="btn btn-primary"
            style={{ 
              width: '100%',
              padding: '12px 20px', 
              fontSize: '16px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              lineHeight: '1.2',
              borderRadius: '24px'
            }}
            title="Advance clock to next check-in schedule"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800' }}>
              <span>Fast forward in time</span>
              <ArrowRight size={18} />
            </div>
            {patient?.nextCheckInDate && (
              <span style={{ fontSize: '13px', opacity: '0.9', fontWeight: '600' }}>
                to next check-in on {formatDate(patient.nextCheckInDate)}
              </span>
            )}
          </button>
        ) : isCompleted ? (
          <button 
            onClick={onJumpToNextCheckIn}
            className="btn btn-primary"
            style={{ 
              width: '100%',
              padding: '12px 20px', 
              fontSize: '16px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              lineHeight: '1.2',
              borderRadius: '24px'
            }}
            title="Advance clock to next check-in schedule"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800' }}>
              <span>Fast forward in time</span>
              <ArrowRight size={18} />
            </div>
            {patient?.nextCheckInDate && (
              <span style={{ fontSize: '13px', opacity: '0.9', fontWeight: '600' }}>
                to next check-in on {formatDate(patient.nextCheckInDate)}
              </span>
            )}
          </button>
        ) : (
          <button 
            onClick={handleSkipToday}
            className="btn"
            style={{ 
              width: '100%',
              padding: '12px 20px', 
              fontSize: '16px', 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              lineHeight: '1.2',
              borderRadius: '24px',
              border: '2px solid rgba(255, 51, 102, 0.15)',
              color: 'var(--primary-red)',
              background: 'white',
              fontWeight: '800'
            }}
            title="Skip today's check-in"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Skip check-in</span>
            </div>
            <span style={{ fontSize: '13px', opacity: '0.9', fontWeight: '600' }}>
              for {formatDate(system?.current_date)}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default PatientCheckInView;


