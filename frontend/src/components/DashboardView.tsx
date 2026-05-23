import React, { useState, useRef, useEffect } from 'react';
import { Activity, ShieldAlert, Calendar, Clipboard, FileText } from 'lucide-react';

interface DashboardViewProps {
  patient: any;
  config?: any;
}

interface ClinicalTimelinesProps {
  history: any[];
  config?: any;
  nextProviderVisitDate?: string;
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

function ClinicalTimelines({ history, config, nextProviderVisitDate }: ClinicalTimelinesProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    title: string;
    details: React.ReactNode;
    maxWidth?: string;
    transform?: string;
  } | null>(null);

  useEffect(() => {
    const observe = () => {
      if (ref.current) setWidth(ref.current.getBoundingClientRect().width || 800);
    };
    observe();
    const ro = new ResizeObserver(observe);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  // Sort history by date
  const sortedHistory = [...history].sort(
    (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  if (sortedHistory.length === 0) {
    return <div style={{ padding: '20px', color: 'var(--text-gray)' }}>No timeline records found.</div>;
  }

  // Find start and end date of history
  const dates = sortedHistory.map((h: any) => new Date(h.date).getTime());
  const minTime = Math.min(...dates);
  const maxTime = Math.max(...dates);
  const timeRange = (maxTime - minTime) || 86400000; // default to 1 day if range is 0

  // Horizontal layout pads
  const pad = { left: 160, right: 30 };
  const innerW = Math.max(100, width - pad.left - pad.right);

  const getX = (dateStr: string) => {
    const t = new Date(dateStr).getTime();
    return pad.left + ((t - minTime) / timeRange) * innerW;
  };

  // Vertical layout (Top to Bottom)
  const rowH = 45;
  const moodH = 140;
  
  const yMoodTop = 20;
  const yMed = yMoodTop + moodH + 20;
  const yActions = yMed + rowH;
  const yCheckIn = yActions + rowH;
  const yVisit = yCheckIn + rowH;
  
  const totalH = yVisit + 40;

  // Mood scaling
  const innerHMood = 100;
  const padTopMood = 20;
  const getMoodY = (val: number) => yMoodTop + padTopMood + innerHMood - ((val - 1) / 4) * innerHMood;

  // Filter check-ins and visits
  const checkIns = sortedHistory.filter((h: any) => h.type === 'check-in');
  const actionCheckIns = checkIns.filter((h: any) => h.actions && h.actions.trim() !== '');
  const visits = sortedHistory.filter((h: any) => h.type === 'provider-visit');
  const moodNotes = checkIns.filter((h: any) => h.value !== undefined && h.value !== null && h.completed !== false);
  const hasMedication = config?.questions?.some((q: any) => (q.text || '').toLowerCase().includes('medication'));

  // Generate Mood plot path
  let moodPath = '';
  if (moodNotes.length > 0) {
    moodPath = moodNotes
      .map((m, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(m.date)},${getMoodY(m.value)}`)
      .join(' ');
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <svg width="100%" height={totalH} style={{ overflow: 'visible', display: 'block' }}>
        {/* Row Labels */}
        <text x="10" y={yMoodTop + (moodH/2) + 4} fontSize="11" fontWeight="700" fill="var(--text-dark)">Mood level</text>
        <text x="10" y={yMed + 4} fontSize="11" fontWeight="700" fill="var(--text-dark)">Medication compliance</text>
        <text x="10" y={yActions + 4} fontSize="11" fontWeight="700" fill="var(--text-dark)">Agent actions</text>
        <text x="10" y={yCheckIn + 4} fontSize="11" fontWeight="700" fill="var(--text-dark)">Check-in completed</text>
        <text x="10" y={yVisit + 4} fontSize="11" fontWeight="700" fill="var(--text-dark)">Psychiatrist visits</text>
        {nextProviderVisitDate && (
          <text x="10" y={yVisit + 16} fontSize="9" fill="var(--text-gray)">Next: {formatDate(nextProviderVisitDate)}</text>
        )}

        {/* Row Lines */}
        <line x1={pad.left} x2={width - pad.right} y1={yMed} y2={yMed} stroke="#e2e8f0" strokeWidth="1.5" />
        <line x1={pad.left} x2={width - pad.right} y1={yActions} y2={yActions} stroke="#e2e8f0" strokeWidth="1.5" />
        <line x1={pad.left} x2={width - pad.right} y1={yCheckIn} y2={yCheckIn} stroke="#e2e8f0" strokeWidth="1.5" />
        <line x1={pad.left} x2={width - pad.right} y1={yVisit} y2={yVisit} stroke="#e2e8f0" strokeWidth="1.5" />

        {/* Mood Grid Lines */}
        {[1, 3, 5].map((val) => {
          const y = getMoodY(val);
          const labels: any = { 1: 'Bad', 3: 'Neutral', 5: 'Good' };
          return (
            <g key={val}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="#f7f7f7" strokeWidth="1" />
              <text x={pad.left - 8} y={y + 4} fontSize="9" fill="#a0aec0" textAnchor="end">{labels[val]}</text>
            </g>
          );
        })}
        <line x1={pad.left} x2={pad.left} y1={getMoodY(5)} y2={getMoodY(1)} stroke="#e2e8f0" strokeWidth="1.5" />

        {/* Mood Path */}
        {moodPath && (
          <path d={moodPath} fill="none" stroke="var(--primary-red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Mood Dots */}
        {moodNotes.map((m, i) => {
          const x = getX(m.date);
          const y = getMoodY(m.value);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="6"
              fill="var(--primary-red)"
              stroke="white"
              strokeWidth="1.5"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const containerRect = ref.current?.getBoundingClientRect();
                setTooltip({
                  x: Math.min(rect.left - (containerRect?.left || 0) + 12, width - 260),
                  y: rect.top - (containerRect?.top || 0) - 110,
                  title: formatDate(m.date),
                  details: (
                    <div style={{ minWidth: '220px' }}>
                      <strong>Mood Score:</strong> {m.value}/5
                      <div style={{ borderTop: '1px solid #edf2f7', marginTop: '6px', paddingTop: '6px', fontSize: '11px', color: '#4a5568', whiteSpace: 'normal', wordBreak: 'break-word', fontStyle: 'italic' }}>
                        "{m.voice_note}"
                      </div>
                    </div>
                  )
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}

        {/* Medication circles */}
        {checkIns.map((c, i) => {
          if (c.medication_taken === undefined && c.completed !== false) return null;
          if (c.completed === false && !hasMedication) return null;
          const x = getX(c.date);
          const isCompleted = c.completed !== false;
          const taken = !!c.medication_taken;

          return (
            <circle
              key={i}
              cx={x}
              cy={yMed}
              r="6"
              fill={!isCompleted ? 'white' : (taken ? '#38a169' : '#e53e3e')}
              stroke={!isCompleted ? '#cbd5e0' : 'white'}
              strokeWidth="1.5"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const containerRect = ref.current?.getBoundingClientRect();
                setTooltip({
                  x: rect.left - (containerRect?.left || 0) + 10,
                  y: rect.top - (containerRect?.top || 0) - 70,
                  title: formatDate(c.date),
                  details: (
                    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      <strong>Medication:</strong> {!isCompleted ? 'Not checked' : (taken ? 'Taken' : 'Not taken')}
                      {c.medication_explain && <div style={{ fontSize: '11px', color: '#718096', fontStyle: 'italic', marginTop: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>"{c.medication_explain}"</div>}
                    </div>
                  )
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}

        {/* Agent Actions circles */}
        {actionCheckIns.map((c, i) => {
          const x = getX(c.date);
          return (
            <g key={i} style={{ cursor: 'pointer' }}
               onMouseEnter={(e) => {
                 const rect = e.currentTarget.getBoundingClientRect();
                 const containerRect = ref.current?.getBoundingClientRect();
                 setTooltip({
                   x: rect.left - (containerRect?.left || 0) + 10,
                   y: rect.top - (containerRect?.top || 0) - 70,
                   title: formatDate(c.date),
                   details: (
                     <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                       <strong>Agent Action:</strong>
                       <div style={{ fontSize: '11px', color: 'var(--primary-red)', fontWeight: 'bold', marginTop: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c.actions}</div>
                     </div>
                   )
                 });
               }}
               onMouseLeave={() => setTooltip(null)}
            >
              <circle cx={x} cy={yActions} r="12" fill="black" stroke="white" strokeWidth="2" />
              {/* Simple Minimalist Robot Icon */}
              <g transform={`translate(${x - 7}, ${yActions - 7})`} stroke="white" strokeWidth="1.5" fill="none">
                <rect x="2" y="4" width="10" height="8" rx="1" />
                <circle cx="5" cy="7.5" r="0.5" fill="white" />
                <circle cx="9" cy="7.5" r="0.5" fill="white" />
                <line x1="7" x2="7" y1="1" y2="4" />
                <circle cx="7" cy="1" r="0.5" fill="white" />
              </g>
            </g>
          );
        })}

        {/* Check-ins */}
        {checkIns.map((c, i) => {
          const x = getX(c.date);
          const isCompleted = c.completed !== false;
          return (
            <circle
              key={i}
              cx={x}
              cy={yCheckIn}
              r="12"
              fill={isCompleted ? '#38a169' : '#e53e3e'}
              stroke="white"
              strokeWidth="2"
              style={{ cursor: 'pointer' }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const containerRect = ref.current?.getBoundingClientRect();
                setTooltip({
                  x: rect.left - (containerRect?.left || 0) + 10,
                  y: rect.top - (containerRect?.top || 0) - 50,
                  title: formatDate(c.date),
                  details: (<div><strong>Check-in:</strong> {isCompleted ? 'Completed' : 'Missed'}</div>)
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}

        {/* Provider Visits */}
        {visits.map((v, i) => {
          const x = getX(v.date);
          return (
            <g key={i} style={{ cursor: 'pointer' }}
               onMouseEnter={(e) => {
                 const rect = e.currentTarget.getBoundingClientRect();
                 const containerRect = ref.current?.getBoundingClientRect();
                 setTooltip({
                   x: Math.min(rect.left - (containerRect?.left || 0) + 12, width - 420),
                   y: rect.top - (containerRect?.top || 0) - 8,
                   title: formatDate(v.date),
                   transform: 'translateY(-100%)',
                   maxWidth: '400px',
                   details: (
                     <div>
                       <strong>Provider Visit (Doctor Doe)</strong>
                       <div style={{ fontSize: '11px', color: '#2d3748', marginTop: '4px' }}><strong>Dosing:</strong> {v.prescriptions?.join(', ') || 'None'}</div>
                       <div style={{
                         fontSize: '11.5px',
                         color: '#4a5568',
                         backgroundColor: '#f7fafc',
                         borderLeft: '3px solid var(--primary-red)',
                         padding: '8px 10px',
                         borderRadius: '4px',
                         marginTop: '8px',
                         whiteSpace: 'pre-wrap',
                         wordBreak: 'break-word',
                         lineHeight: '1.4'
                       }}>
                         {v.notes}
                       </div>
                     </div>
                   )
                 });
               }}
               onMouseLeave={() => setTooltip(null)}
            >
              <circle cx={x} cy={yVisit} r="12" fill="#3182ce" stroke="white" strokeWidth="2" />
              <text x={x} y={yVisit + 3} textAnchor="middle" fill="white" fontSize="9" fontWeight="bold">MD</text>
            </g>
          );
        })}
      </svg>

      {/* Unified Tooltip */}
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: tooltip.x,
          top: tooltip.y,
          background: 'white',
          border: '1px solid rgba(255, 51, 102, 0.15)',
          borderRadius: '12px',
          padding: '10px 14px',
          fontSize: '12px',
          color: '#2d3748',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          zIndex: 100,
          pointerEvents: 'none',
          maxWidth: tooltip.maxWidth || '250px',
          transform: tooltip.transform || 'none'
        }}>
          <div style={{ fontWeight: 'bold', color: 'var(--primary-red)', marginBottom: '4px' }}>📅 {tooltip.title}</div>
          {tooltip.details}
        </div>
      )}
    </div>
  );
}

const DashboardView: React.FC<DashboardViewProps> = ({ patient, config }) => {
  const [logFilter, setLogFilter] = useState<'all' | 'checkin' | 'provider'>('all');

  if (!patient) return (
    <div className="card" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-gray)' }}>
      Select a patient to view their dashboard.
    </div>
  );

  const timeline = [...(patient.history || [])].sort(
    (a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const checkIns = timeline.filter((h: any) => h.type === 'check-in');
  const providerVisits = timeline.filter((h: any) => h.type === 'provider-visit');

  const completedCheckIns = checkIns.filter((c: any) => c.completed !== false);
  const medicationCheckIns = completedCheckIns.filter((c: any) => c.medication_taken !== undefined);
  const takenCount = medicationCheckIns.filter((c: any) => c.medication_taken).length;
  const complianceRate = medicationCheckIns.length > 0 ? Math.round((takenCount / medicationCheckIns.length) * 100) : 100;

  return (
    <div className="view-container">
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ marginBottom: '8px' }}>Clinical Dashboard</h1>
          <p style={{ color: 'var(--text-gray)', margin: 0 }}>
            <span style={{ fontWeight: 'bold', color: 'var(--primary-red)' }}>{patient.name}</span> ({patient.condition.toLowerCase()})
          </p>
        </div>
      </header>

      {/* Aligned Chart Canvas */}
      <div className="card" style={{ marginBottom: '28px', padding: '28px 32px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--primary-red)', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} /> Clinical Timelines
        </h2>

        {/* Unified Clinical Timelines Component */}
        <ClinicalTimelines history={timeline} config={config} />
      </div>

      {/* AI Summary and KPI section */}
      <div className="card" style={{ 
        marginBottom: '28px', 
        background: 'linear-gradient(135deg, #fff 0%, var(--light-pink) 100%)',
        display: 'flex',
        justifyContent: 'space-between',
        gap: '32px',
        alignItems: 'stretch'
      }}>
        {/* Left column: Latest Check-in */}
        <div style={{ flex: 1 }}>
          <h3 style={{ fontSize: '14px', color: 'var(--primary-red)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldAlert size={17} /> Latest Check-in
          </h3>
          {checkIns.length > 0 ? (
            (() => {
              const latest = checkIns[checkIns.length - 1];
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px', color: 'var(--text-dark)' }}>
                  <div><strong>Check-in Date:</strong> {formatDate(latest.date)}</div>
                  <div><strong>Check-in completed:</strong> {latest.completed !== false ? 'Yes' : 'No'}</div>
                  {latest.completed !== false && latest.medication_taken !== undefined && (
                    <div><strong>Medication taken:</strong> {latest.medication_taken ? 'Yes' : 'No'}</div>
                  )}
                  {latest.completed !== false && latest.voice_note && (
                    <div>
                      <strong>Optional mood note:</strong> <span style={{ color: 'var(--text-gray)', fontStyle: 'italic' }}>"{latest.voice_note}"</span>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <p style={{ fontSize: '14px', color: 'var(--text-gray)', margin: 0 }}>No check-ins logged.</p>
          )}
        </div>

        {/* Right column: Less pronounced KPI metrics */}
        <div style={{ 
          width: '260px', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          gap: '16px', 
          paddingLeft: '28px', 
          borderLeft: '1px solid rgba(255, 51, 102, 0.1)' 
        }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-gray)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Medication Adherence
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '22px', fontWeight: '800', color: complianceRate >= 80 ? '#38a169' : '#e53e3e' }}>
                {medicationCheckIns.length > 0 ? `${complianceRate}%` : '—'}
              </span>
              {medicationCheckIns.length > 0 && (
                <span style={{ fontSize: '11px', color: 'var(--text-gray)' }}>
                  of doses taken
                </span>
              )}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-gray)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '0.5px', marginBottom: '4px' }}>
              Total Check-ins
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-dark)' }}>
                {checkIns.length}
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-gray)' }}>
                sessions logged
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Split Logs */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ fontSize: '17px', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clipboard size={19} color="var(--primary-red)" /> Check-ins and Provider Notes
          </h2>
          <div className="segment-container">
            {(['all', 'checkin', 'provider'] as const).map(f => (
              <button key={f} className={`segment-item ${logFilter === f ? 'active' : ''}`} onClick={() => setLogFilter(f)}>
                {f === 'all' ? 'All' : f === 'checkin' ? 'Check-ins' : 'Provider Notes'}
              </button>
            ))}
          </div>
        </div>

        {/* Patient check-ins table */}
        {(logFilter === 'all' || logFilter === 'checkin') && (
          <div style={{ marginBottom: logFilter === 'all' ? '36px' : 0 }}>
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={15} color="var(--primary-red)" /> Patient Check-in Log
            </h3>
            {checkIns.length === 0
              ? <p style={{ color: 'var(--text-gray)', fontSize: '13px' }}>No check-ins yet.</p>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Medication Compliance</th>
                        <th>Daily Tasks</th>
                        <th>Mood Voice Note Transcript</th>
                        <th>Mood Score (LLM)</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...checkIns].reverse().map((e: any, i: number) => {
                        const isCompleted = e.completed !== false;
                        return (
                          <tr key={i}>
                            <td style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>{formatDate(e.date)}</td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {!isCompleted ? (
                                <span style={{ color: '#e53e3e', fontWeight: 'bold' }}>Missed Check-in</span>
                              ) : e.medication_taken === undefined ? (
                                <span>—</span>
                              ) : (
                                <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', background: e.medication_taken ? '#f0fff4' : '#fff5f5', color: e.medication_taken ? '#276749' : '#c53030' }}>
                                  {e.medication_taken ? 'Taken' : 'Not taken'}
                                </span>
                              )}
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>
                              {!isCompleted ? (
                                <span style={{ color: '#e53e3e', fontWeight: 'bold' }}>Missed Check-in</span>
                              ) : e.tasks_completed === undefined ? (
                                <span>—</span>
                              ) : (
                                <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', background: e.tasks_completed ? '#f0fff4' : '#fff5f5', color: e.tasks_completed ? '#276749' : '#c53030' }}>
                                  {e.tasks_completed ? 'Completed' : 'Not completed'}
                                </span>
                              )}
                              {e.tasks_explain && <div style={{ fontSize: '11px', color: 'var(--text-gray)', marginTop: '4px', fontStyle: 'italic', whiteSpace: 'normal' }}>"{e.tasks_explain}"</div>}
                            </td>
                            <td style={{ color: 'var(--text-dark)', fontSize: '12px', maxWidth: '300px', whiteSpace: 'normal', wordBreak: 'break-word', fontStyle: 'italic' }}>
                              {e.voice_note ? `"${e.voice_note}"` : '—'}
                            </td>
                            <td style={{ fontWeight: '700' }}>
                              {e.value !== undefined && e.value !== null ? `${e.value}/5` : '—'}
                            </td>
                            <td style={{
                              fontSize: '11px',
                              color: e.actions ? 'var(--primary-red)' : 'var(--text-gray)',
                              fontWeight: e.actions ? '700' : 'normal',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              verticalAlign: 'top',
                              minWidth: '200px'
                            }}>{e.actions || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        )}

        {/* Provider visits table */}
        {(logFilter === 'all' || logFilter === 'provider') && (
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={15} color="var(--primary-red)" /> Provider Visit Notes
            </h3>
            {providerVisits.length === 0
              ? <p style={{ color: 'var(--text-gray)', fontSize: '13px' }}>No visits recorded.</p>
              : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead><tr><th>Date</th><th>Prescriptions</th><th>Clinical Notes</th></tr></thead>
                    <tbody>
                      {[...providerVisits].reverse().map((e: any, i: number) => (
                        <tr key={i}>
                          <td style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>{formatDate(e.date)}</td>
                          
                          <td style={{ fontWeight: '600', fontSize: '13px' }}>{e.prescriptions?.join(', ') || '—'}</td>
                          <td style={{ verticalAlign: 'top' }}>
                            <div style={{
                              color: '#2d3748',
                              fontSize: '13px',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              backgroundColor: '#f8fafc',
                              borderLeft: '3px solid #cbd5e0',
                              padding: '8px 12px',
                              borderRadius: '4px',
                              lineHeight: '1.4'
                            }}>
                              {e.notes}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardView;
