
import React, { useState } from 'react';
import Header from './components/Header';
import AdmissionForm from './components/AdmissionForm';
import SuccessView from './components/SuccessView';
import StatusCheck from './components/StatusCheck';
import AdminDashboard from './components/AdminDashboard';
import PublicStats from './components/PublicStats';
import { ApplicationData, Level, SystemSettings } from './types';
import { StorageService } from './services/storage';

const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'form' | 'success' | 'check' | 'admin'>('landing');
  const [currentLevel, setCurrentLevel] = useState<Level>(Level.M1);
  const [submittedData, setSubmittedData] = useState<ApplicationData | null>(null);
  const [editData, setEditData] = useState<ApplicationData | null>(null);
  const [settings, setSettings] = useState<SystemSettings>(StorageService.getSettings());
  const [imgError, setImgError] = useState(false);

  // Refresh settings when view changes back to landing or admin
  React.useEffect(() => {
    if (view === 'landing' || view === 'admin') {
      setSettings(StorageService.getSettings());
    }
  }, [view]);

  const logoUrl = "https://drive.google.com/thumbnail?id=1IjjdJpQYPGN2DlNa7QGHznqRjCu-oE1D&sz=w1000";

  const startApplication = (level: Level) => {
    if (!settings.isOpen) {
      alert("ขออภัย ระบบรับสมัครออนไลน์ปิดให้บริการในขณะนี้");
      return;
    }
    setCurrentLevel(level);
    setEditData(null);
    setView('form');
  };

  const handleEdit = (data: ApplicationData) => {
    setCurrentLevel(data.level);
    setEditData(data);
    setView('form');
  };

  const handleFinish = (data: ApplicationData) => {
    // Local storage persistence removed to avoid QuotaExceededError
    setSubmittedData(data);
    setView('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setView('landing');
    setSubmittedData(null);
    setEditData(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-yellow-100">
      <Header onHome={() => setView('landing')} onAdmin={() => setView('admin')} />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {view === 'landing' && (
          <div className="max-w-5xl mx-auto space-y-12 pb-20">
            <div className="text-center space-y-6 animate-fade-in pt-6">
              <div className="flex justify-center mb-4">
                <div className="w-44 h-44 md:w-60 md:h-60 flex items-center justify-center bg-white p-4 rounded-[3rem] shadow-2xl border-4 border-white transform hover:scale-105 transition-all duration-500">
                  {!imgError ? (
                    <img 
                      src={logoUrl} 
                      alt="โรงเรียนท่าบ่อ" 
                      className="w-full h-full object-contain"
                      onError={() => setImgError(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2rem] flex items-center justify-center text-white">
                      <span className="text-4xl font-black italic">TB</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <div className={`inline-block px-6 py-1.5 rounded-full text-sm font-black mb-2 shadow-sm uppercase tracking-wider ${settings.isOpen ? 'bg-yellow-400 text-blue-900' : 'bg-red-500 text-white'}`}>
                  {settings.isOpen ? `Admission System ${settings.admissionYear}` : 'Admission System Closed'}
                </div>
                <h1 className="text-4xl md:text-6xl font-black text-blue-900 tracking-tight">
                  {settings.schoolName}
                </h1>
                <p className="text-xl md:text-2xl text-slate-500 font-medium tracking-wide">
                  ระบบรับสมัครนักเรียนผ่านสื่ออิเล็กทรอนิกส์
                </p>
                {!settings.isOpen && (
                  <div className="mt-4 p-4 bg-white/50 border-2 border-red-200 text-red-600 rounded-2xl max-w-lg mx-auto font-black italic">
                    ⚠️ ขณะนี้ระบบปิดรับสมัครออนไลน์ถาวรหรืออยู่ในช่วงปิดระบบ <br/>
                    โปรดติดต่อโรงเรียนที่เบอร์: {settings.contactPhone}
                  </div>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 px-4">
              <div className={`group bg-white rounded-[2.5rem] shadow-xl overflow-hidden border-b-8 border-yellow-400 transition-all cursor-pointer transform ${settings.isOpen ? 'hover:shadow-2xl hover:-translate-y-2' : 'opacity-80 grayscale'}`} 
                   onClick={() => startApplication(Level.M1)}>
                <div className="p-10 text-center space-y-4">
                  <div className="bg-yellow-100 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto group-hover:rotate-6 transition-transform shadow-inner">
                    <span className="text-4xl font-black text-yellow-700">ม.1</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-800">ชั้นมัธยมศึกษาปีที่ 1</h2>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    สำหรับผู้จบการศึกษาชั้นประถมศึกษาปีที่ 6<br/>
                    ทั่วไป และในเขตพื้นที่บริการ
                  </p>
                  <button className={`w-full py-4 rounded-2xl font-black shadow-xl transition-colors mt-4 ${settings.isOpen ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                    {settings.isOpen ? 'สมัครเรียน ม.1' : 'ปิดรับสมัคร'}
                  </button>
                </div>
              </div>

              <div className={`group bg-white rounded-[2.5rem] shadow-xl overflow-hidden border-b-8 border-blue-600 transition-all cursor-pointer transform ${settings.isOpen ? 'hover:shadow-2xl hover:-translate-y-2' : 'opacity-80 grayscale'}`}
                   onClick={() => startApplication(Level.M4)}>
                <div className="p-10 text-center space-y-4">
                  <div className="bg-blue-100 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto group-hover:-rotate-6 transition-transform shadow-inner">
                    <span className="text-4xl font-black text-blue-700">ม.4</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-800">ชั้นมัธยมศึกษาปีที่ 4</h2>
                  <p className="text-slate-500 text-sm leading-relaxed">
                    สำหรับผู้จบการศึกษาชั้นมัธยมศึกษาปีที่ 3<br/>
                    โควตาโรงเรียนเดิม และนักเรียนทั่วไป
                  </p>
                  <button className={`w-full py-4 rounded-2xl font-black shadow-xl transition-colors mt-4 ${settings.isOpen ? 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-yellow-100' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}>
                    {settings.isOpen ? 'สมัครเรียน ม.4' : 'ปิดรับสมัคร'}
                  </button>
                </div>
              </div>
            </div>
            
            <PublicStats />

            <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-8">
              <button 
                onClick={() => setView('check')}
                className="flex items-center space-x-3 bg-white border-2 border-slate-200 px-10 py-4 rounded-2xl text-blue-700 font-black hover:bg-blue-50 hover:border-blue-200 transition-all shadow-sm active:scale-95"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>ตรวจสอบสถานะการสมัคร</span>
              </button>
            </div>
          </div>
        )}

        {view === 'form' && (
          <AdmissionForm 
            level={currentLevel} 
            settings={settings}
            initialData={editData || undefined}
            onCancel={reset}
            onFinish={handleFinish}
          />
        )}

        {view === 'success' && submittedData && (
          <SuccessView 
            data={submittedData} 
            onClose={reset} 
          />
        )}

        {view === 'check' && (
          // Fixed: Removed unsupported onEdit prop from StatusCheck component call
          <StatusCheck onBack={reset} />
        )}

        {view === 'admin' && (
          <AdminDashboard onBack={reset} />
        )}
      </main>

      <footer className="bg-white border-t py-12 no-print">
        <div className="container mx-auto px-4 text-center space-y-4">
          <p className="text-slate-400 text-sm font-medium">
            © {settings.admissionYear} {settings.schoolName}<br/>
            {settings.contactLine}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
