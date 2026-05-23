import React, { useState, useEffect } from 'react';
import PatientCheckInView from './components/PatientCheckInView';
import DashboardView from './components/DashboardView';
import ConfigurationView from './components/ConfigurationView';
import CustomDropdown from './components/CustomDropdown';
import { ArrowRight, Users, Settings, BookOpen } from 'lucide-react';

export type MainView = 'patient' | 'provider';
export type ProviderTab = 'dashboard' | 'protocol';

const BirdLogo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 32 32">
    <g transform="translate(4, 4)" fill="none" stroke="var(--primary-red)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 7h.01" />
      <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" />
      <path d="m20 7 2 .5-2 .5" />
      <path d="M10 18v3" />
      <path d="M14 17.75V21" />
      <path d="M7 18a6 6 0 0 0 3.84-10.61" />
    </g>
  </svg>
);

function App() {
  const [mainView, setMainView] = useState<MainView>('provider');
  const [providerTab, setProviderTab] = useState<ProviderTab>('dashboard');
  const [patients, setPatients] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [system, setSystem] = useState<any>(null);
  const [currentPatientId, setCurrentPatientId] = useState<string>('1');

  useEffect(() => {
    const resetAndFetch = async () => {
      try {
        await fetch('/api/reset', { method: 'POST' });
      } catch (error) {
        console.error('Florence: Failed to reset database on mount:', error);
      }
      await fetchData();
    };
    resetAndFetch();
  }, []);

  const fetchData = async () => {
    try {
      const [patientsRes, configRes, systemRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/config'),
        fetch('/api/system')
      ]);
      if (!patientsRes.ok || !configRes.ok || !systemRes.ok) throw new Error("Florence: Server error");
      
      const patientsData = await patientsRes.json();
      const configData = await configRes.json();
      const systemData = await systemRes.json();
      
      setPatients(patientsData);
      setConfig(configData);
      setSystem(systemData);
    } catch (error) {
      console.error('Florence: Fetch failed:', error);
    }
  };

  const currentPatient = patients.find(p => p.id === currentPatientId);

  const handleJumpToNextCheckIn = async () => {
    if (!currentPatient || !currentPatient.nextCheckInDate) return;
    try {
      const res = await fetch('/api/time-skip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetDate: currentPatient.nextCheckInDate })
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error('Florence: Skip time failed:', error);
    }
  };

  return (
    <div className="app-container">
      {/* Grayscale Borderless Demo Watermark */}
      <div className="watermark">demo</div>

      {/* Global Header */}
      <header className="app-header">
        {/* Brand Logo - Option 5: Playful / Bird Symbol */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'var(--light-pink)', padding: '8px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BirdLogo />
          </div>
          <div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontWeight: '700', fontSize: '20px', color: 'var(--primary-red)', lineHeight: '1.1' }}>
              Florence
            </div>
            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '11px', fontStyle: 'italic', color: 'var(--text-gray)', marginTop: '1px' }}>
              Checkup Assistant
            </div>
          </div>
        </div>

        {/* Patient Selection Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--text-gray)' }}>
            Active Patient:
          </label>
          <CustomDropdown 
            value={currentPatientId} 
            onChange={async (val) => {
              setCurrentPatientId(val);
              const targetPatient = patients.find(p => p.id === val);
              if (mainView === 'patient' && targetPatient && system) {
                const alreadyCheckedInToday = targetPatient.history?.some(
                  (h: any) => h.type === 'check-in' && h.date === system.current_date
                );
                if (alreadyCheckedInToday && targetPatient.nextCheckInDate) {
                  try {
                    const res = await fetch('/api/time-skip', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ targetDate: targetPatient.nextCheckInDate })
                    });
                    if (res.ok) {
                      await fetchData();
                    }
                  } catch (error) {
                    console.error('Florence: Skip time failed:', error);
                  }
                }
              }
            }}
            options={patients.map(p => ({ value: p.id, label: `${p.name} (${p.condition})` }))}
            style={{ width: '480px' }}
          />
        </div>

        {/* Toggle Pill navigation */}
        <div className="toggle-pill-container">
          <div 
            className="toggle-pill-highlight" 
            style={{
              transform: `translateX(${mainView === 'provider' ? '0px' : '140px'})`
            }}
          />
          <button 
            className={`toggle-pill-btn ${mainView === 'provider' ? 'active' : ''}`}
            onClick={() => setMainView('provider')}
          >
            Provider View
          </button>
          <button 
            className={`toggle-pill-btn ${mainView === 'patient' ? 'active' : ''}`}
            onClick={async () => {
              const alreadyCheckedInToday = currentPatient?.history?.some(
                (h: any) => h.type === 'check-in' && h.date === system?.current_date
              );
              if (alreadyCheckedInToday) {
                await handleJumpToNextCheckIn();
              }
              setMainView('patient');
            }}
          >
            Patient View
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="main-content">
        {mainView === 'patient' ? (
          /* Patient View */
          <div className="view-container">
            <PatientCheckInView 
              patient={currentPatient} 
              config={config} 
              onComplete={fetchData} 
              system={system}
              onJumpToNextCheckIn={handleJumpToNextCheckIn}
            />
          </div>
        ) : (
          /* Provider View */
          <div className="view-container">
            {/* Internal Practitioner Tabs */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '16px' }}>
              <button 
                onClick={() => setProviderTab('dashboard')}
                className="btn" 
                style={{ 
                  background: providerTab === 'dashboard' ? 'var(--light-pink)' : 'white',
                  borderColor: providerTab === 'dashboard' ? 'var(--primary-red)' : 'transparent',
                  color: providerTab === 'dashboard' ? 'var(--primary-red)' : 'var(--text-gray)'
                }}
              >
                <Users size={18} /> Clinical Dashboard & Logs
              </button>
              <button 
                onClick={() => setProviderTab('protocol')}
                className="btn"
                style={{ 
                  background: providerTab === 'protocol' ? 'var(--light-pink)' : 'white',
                  borderColor: providerTab === 'protocol' ? 'var(--primary-red)' : 'transparent',
                  color: providerTab === 'protocol' ? 'var(--primary-red)' : 'var(--text-gray)'
                }}
              >
                <Settings size={18} /> Care Protocol Config
              </button>
            </div>

            {providerTab === 'dashboard' && (
              <DashboardView patient={currentPatient} config={config} />
            )}

            {providerTab === 'protocol' && (
              <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <ConfigurationView config={config} onSave={fetchData} />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
