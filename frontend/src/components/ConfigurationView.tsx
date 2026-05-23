import React, { useState, useEffect, useRef } from 'react';
import { Save, Plus, Trash2, Loader2, Settings, MessageSquare, AlertCircle } from 'lucide-react';
import CustomDropdown from './CustomDropdown';

const HighlightedInput: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleScroll = () => {
    if (textareaRef.current) {
      setScrollTop(textareaRef.current.scrollTop);
    }
  };

  const renderHighlightedText = (text: string) => {
    if (!text) return null;
    const regex = /(\{\{[^{}]+\}\}|\[\[[^[\]]+\]\])/g;
    const parts = text.split(regex);
    return parts.map((part, index) => {
      const isMatch = (part.startsWith('{{') && part.endsWith('}}')) || (part.startsWith('[[') && part.endsWith(']]'));
      return (
        <span
          key={index}
          style={{
            color: isMatch ? 'var(--primary-red)' : 'var(--text-dark)',
            fontWeight: isMatch ? 'bold' : 'normal',
          }}
        >
          {part}
        </span>
      );
    });
  };

  return (
    <div style={{ position: 'relative', flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          padding: '12px 16px',
          fontSize: '14px',
          fontFamily: 'inherit',
          lineHeight: '1.5',
          pointerEvents: 'none',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflow: 'hidden',
          display: 'block',
          boxSizing: 'border-box',
          transform: `translateY(-${scrollTop}px)`,
        }}
      >
        {value ? renderHighlightedText(value) : <span style={{ color: '#a0aec0', opacity: 0.8 }}>{placeholder}</span>}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onScroll={handleScroll}
        placeholder={placeholder}
        rows={1}
        style={{
          flex: 1,
          width: '100%',
          minHeight: '44px',
          padding: '12px 16px',
          borderRadius: '20px',
          border: '1px solid rgba(255, 51, 102, 0.1)',
          fontSize: '14px',
          outline: 'none',
          background: 'transparent',
          color: 'transparent',
          caretColor: 'var(--text-dark)',
          position: 'relative',
          zIndex: 1,
          fontFamily: 'inherit',
          lineHeight: '1.5',
          boxSizing: 'border-box',
          resize: 'none',
          overflow: 'hidden'
        }}
      />
    </div>
  );
};


interface ConfigurationViewProps {
  config: any;
  onSave: () => void;
}

const ConfigurationView: React.FC<ConfigurationViewProps> = ({ config, onSave }) => {
  const [localConfig, setLocalConfig] = useState<any>(config);
  const [loading, setLoading] = useState(false);
  const [newOptionTexts, setNewOptionTexts] = useState<{ [key: string]: string }>({});
  const [tagAdderActive, setTagAdderActive] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (config) setLocalConfig(config);
  }, [config]);

  // Auto-resize textareas when config fields change
  useEffect(() => {
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach((ta) => {
      if (ta.style.color === 'transparent') return;
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    });
  }, [localConfig]);

  const compileMedicationsText = (meds: Array<{ name: string; dosage: string }>) => {
    if (!meds || meds.length === 0) return '';
    const list = meds.map(m => {
      const n = (m.name || '').trim();
      const d = (m.dosage || '').trim();
      if (n && d) return `${n} ${d}`;
      return n || d;
    }).filter(Boolean);
    
    if (list.length === 0) return '';
    if (list.length === 1) return list[0];
    if (list.length === 2) return `${list[0]} and ${list[1]}`;
    return `${list.slice(0, -1).join(', ')}, and ${list[list.length - 1]}`;
  };

  const updateMedications = (meds: Array<{ name: string; dosage: string }>) => {
    const text = compileMedicationsText(meds);
    setLocalConfig({
      ...localConfig,
      medications: meds,
      medications_text: text
    });
  };

  const renderQuestionPreview = (text: string) => {
    if (!text) return null;
    const medicationsText = localConfig.medications_text || 'medications';
    const formatted = text
      .replace(/\{\{(medications|medication)\}\}/gi, medicationsText)
      .replace(/\[\[(medications|medication)\]\]/gi, medicationsText);
    
    return (
      <span>
        {formatted}
      </span>
    );
  };

  const handleManualSave = async () => {
    setLoading(true);
    try {
      await fetch('/api/configure-nl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualConfig: localConfig })
      });
      onSave();
      alert('Protocol committed successfully.');
    } catch (error) {
      console.error('Florence: Save error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addChannel = () => {
    const channels = localConfig.notification_channels || [];
    setLocalConfig({
      ...localConfig,
      notification_channels: [...channels, { type: 'email', destination: '' }]
    });
  };

  const updateChannel = (index: number, key: 'type' | 'destination', value: string) => {
    const channels = [...(localConfig.notification_channels || [])];
    channels[index] = { ...channels[index], [key]: value };
    setLocalConfig({ ...localConfig, notification_channels: channels });
  };

  const removeChannel = (index: number) => {
    const channels = (localConfig.notification_channels || []).filter((_: any, idx: number) => idx !== index);
    setLocalConfig({ ...localConfig, notification_channels: channels });
  };

  const handleAddCategory = (qIdx: number, qId: string) => {
    const text = newOptionTexts[qId] || '';
    if (!text.trim()) return;
    
    const newQs = [...localConfig.questions];
    const options = newQs[qIdx].options || [];
    newQs[qIdx] = { ...newQs[qIdx], options: [...options, text.trim()] };
    
    setLocalConfig({ ...localConfig, questions: newQs });
    setNewOptionTexts(prev => ({ ...prev, [qId]: '' }));
  };

  if (!localConfig) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '400px', color: 'var(--primary-red)' }}>
        <Loader2 className="animate-spin" size={48} />
        <p style={{ marginTop: '16px', fontWeight: 'bold' }}>Retrieving care protocol...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 0 40px 0' }}>
      <header style={{ marginBottom: '32px' }}>
        <h1 style={{ marginBottom: '8px' }}>Care Protocol Setup</h1>
        <p style={{ color: 'var(--text-gray)', margin: 0 }}>Configure the check-in questions, answer styles, warning thresholds, and delivery channels.</p>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
        
        {/* Core Configuration & Settings Section */}
        <section className="card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Agent Instructions pretext box */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-gray)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Agent Instructions
            </label>
            <textarea 
              value={localConfig.agent_instructions || ''}
              onChange={(e) => setLocalConfig({ ...localConfig, agent_instructions: e.target.value })}
              placeholder="Enter clinical instructions for the Florence AI agent..."
              style={{
                width: '100%',
                minHeight: '140px',
                padding: '16px',
                borderRadius: '20px',
                border: '1px solid rgba(255, 51, 102, 0.15)',
                fontSize: '14px',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
                background: 'white',
                lineHeight: '1.5'
              }}
            />
          </div>

          {/* Medications Configuration Section */}
          <hr style={{ border: '0', borderTop: '1px solid rgba(0,0,0,0.05)', margin: 0 }} />
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-gray)', textTransform: 'uppercase', margin: 0 }}>
                Medications & Dosages
              </label>
              <button 
                type="button"
                onClick={() => {
                  const meds = localConfig.medications || [];
                  updateMedications([...meds, { name: '', dosage: '' }]);
                }}
                className="btn"
                style={{
                  padding: '8px 16px',
                  fontSize: '12px',
                  borderRadius: '15px'
                }}
              >
                <Plus size={14} /> Add Medication
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(localConfig.medications || []).map((med: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <input 
                    type="text" 
                    value={med.name}
                    placeholder="Medication name (e.g. Wellbutrin)"
                    onChange={(e) => {
                      const meds = [...(localConfig.medications || [])];
                      meds[idx] = { ...meds[idx], name: e.target.value };
                      updateMedications(meds);
                    }}
                    style={{
                      flex: 1,
                      padding: '12px 18px',
                      borderRadius: '20px',
                      border: '1px solid rgba(255, 51, 102, 0.15)',
                      fontSize: '14px',
                      outline: 'none',
                      background: 'white'
                    }}
                  />
                  <input 
                    type="text" 
                    value={med.dosage}
                    placeholder="Dosage (e.g. 150mg)"
                    onChange={(e) => {
                      const meds = [...(localConfig.medications || [])];
                      meds[idx] = { ...meds[idx], dosage: e.target.value };
                      updateMedications(meds);
                    }}
                    style={{
                      flex: 0.5,
                      padding: '12px 18px',
                      borderRadius: '20px',
                      border: '1px solid rgba(255, 51, 102, 0.15)',
                      fontSize: '14px',
                      outline: 'none',
                      background: 'white'
                    }}
                  />
                  <button 
                    type="button"
                    onClick={() => {
                      const meds = (localConfig.medications || []).filter((_: any, i: number) => i !== idx);
                      updateMedications(meds);
                    }}
                    style={{ 
                      color: 'var(--primary-red)', 
                      border: 'none', 
                      background: 'transparent', 
                      padding: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {(localConfig.medications || []).length === 0 && (
                <p style={{ fontStyle: 'italic', fontSize: '13px', color: 'var(--text-gray)', margin: '0 0 10px 0' }}>
                  No medications added yet. Click 'Add Medication' to define the active list.
                </p>
              )}
            </div>
          </div>

          <hr style={{ border: '0', borderTop: '1px solid rgba(0,0,0,0.05)', margin: 0 }} />

          {/* Provider Contact Methods Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-gray)', textTransform: 'uppercase', margin: 0 }}>
                Provider Contact Methods
              </label>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(localConfig.notification_channels || []).map((chan: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <CustomDropdown
                    value={chan.type}
                    onChange={(val) => updateChannel(idx, 'type', val)}
                    options={[
                      { value: 'email', label: 'Email' },
                      { value: 'sms', label: 'SMS' },
                      { value: 'push', label: 'Push' }
                    ]}
                    buttonStyle={{
                      padding: '12px 48px 12px 16px',
                      borderRadius: '20px',
                      backgroundColor: 'white',
                      fontSize: '14px',
                      border: '1px solid rgba(255, 51, 102, 0.15)',
                      width: '130px'
                    }}
                  />
                  
                  <input 
                    type="text" 
                    value={chan.destination}
                    onChange={(e) => updateChannel(idx, 'destination', e.target.value)}
                    placeholder={chan.type === 'email' ? 'drdoe@example.com' : chan.type === 'sms' ? '+1 (555) 0199' : 'device endpoint'}
                    style={{
                      flex: 1,
                      padding: '12px 18px',
                      borderRadius: '20px',
                      border: '1px solid rgba(255, 51, 102, 0.15)',
                      fontSize: '14px',
                      outline: 'none',
                      background: 'white'
                    }}
                  />
                  
                  <button 
                    type="button"
                    onClick={() => removeChannel(idx)}
                    style={{ 
                      color: 'var(--primary-red)', 
                      border: 'none', 
                      background: 'transparent', 
                      padding: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              
              {(localConfig.notification_channels || []).length === 0 ? (
                <button 
                  type="button"
                  onClick={addChannel}
                  className="btn"
                  style={{
                    padding: '12px 24px',
                    fontSize: '14px',
                    borderRadius: '20px',
                    alignSelf: 'flex-start',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Plus size={16} /> Add provider contact method
                </button>
              ) : (
                <button 
                  type="button"
                  onClick={addChannel}
                  className="btn"
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    borderRadius: '16px',
                    alignSelf: 'flex-start',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '4px'
                  }}
                >
                  <Plus size={14} /> Add another contact method
                </button>
              )}
            </div>
          </div>

          <hr style={{ border: '0', borderTop: '1px solid rgba(0,0,0,0.05)', margin: 0 }} />

          {/* Questions configuration */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-gray)', marginBottom: '16px', textTransform: 'uppercase' }}>
              Active Clinical Questions
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {localConfig.questions?.map((q: any, i: number) => {
                return (
                  <div key={q.id || i} style={{ padding: '20px', borderRadius: '24px', background: 'var(--light-pink)', border: '1px solid rgba(255, 51, 102, 0.08)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <HighlightedInput 
                        value={q.text}
                        onChange={(e) => {
                          const newQs = [...localConfig.questions];
                          newQs[i] = { ...q, text: e.target.value };
                          setLocalConfig({...localConfig, questions: newQs});
                        }}
                        placeholder="Enter clinical question..."
                      />
                      <button className="btn" onClick={() => setLocalConfig({...localConfig, questions: localConfig.questions.filter((_:any, idx:number) => idx !== i)})} style={{ color: 'var(--primary-red)', border: 'none', background: 'transparent', padding: '12px 8px', flexShrink: 0 }}>
                        <Trash2 size={18} />
                      </button>
                    </div>

                    {/\{\{|\[\[/.test(q.text || '') && (
                      <div style={{ marginTop: '-8px', fontSize: '13px' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-gray)', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Live Preview: </span>
                        <span style={{ color: 'var(--text-dark)', fontWeight: '500' }}>{renderQuestionPreview(q.text)}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-gray)', textTransform: 'uppercase', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                          Answer Type
                        </span>
                        <div className="segment-container" style={{ margin: 0 }}>
                          {[
                            { val: 'categorical', label: 'Yes / No' },
                            { val: 'free-form', label: 'Free Form' }
                          ].map(typeObj => (
                            <button
                              key={typeObj.val}
                              type="button"
                              className={`segment-item ${q.type === typeObj.val ? 'active' : ''}`}
                              onClick={() => {
                                const newQs = [...localConfig.questions];
                                newQs[i] = { 
                                  ...q, 
                                  type: typeObj.val,
                                  options: typeObj.val === 'categorical' ? ['Yes', 'No'] : []
                                };
                                setLocalConfig({...localConfig, questions: newQs});
                              }}
                            >
                              {typeObj.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="btn" onClick={() => setLocalConfig({...localConfig, questions: [...localConfig.questions, { id: `q${Date.now()}`, text: "", type: "open-ended", options: [], guidelines: "" }]})} style={{ marginTop: '20px', fontSize: '13px' }}>
              <Plus size={14} /> Add Protocol Question
            </button>
          </div>

          <button className="btn btn-primary" onClick={handleManualSave} disabled={loading} style={{ width: '100%', padding: '16px' }}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />} Commit Protocol
          </button>
        </section>

      </div>
    </div>
  );
};

export default ConfigurationView;
