
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
  const [settings] = useState<SystemSettings>(StorageService.getSettings());
  const [imgError, setImgError] = useState(false);

  const logoUrl = "https://drive.google.com/thumbnail?id=1IjjdJpQYPGN2DlNa7QGHznqRjCu-oE1D&sz=w1000";

  const startApplication = (level: Level) => {
    if (!settings.isOpen) {
      alert("ขออภัย ระบบรับสมัครออนไลน์ปิดให้บริการในขณะนี้");
      return;
    }
    setCurrentLevel(level);
    setView('form');
  };

  const handleFinish = (data: ApplicationData) => {
    try {
      StorageService.saveApplication(data);
    } catch (e) {
      console.error("Local storage failed", e);
    }
    
    setSubmittedData(data);
    setView('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => {
    setView('landing');
    setSubmittedData(null);
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
                <div className="inline-block bg-yellow-400 text-blue-900 px-6 py-1.5 rounded-full text-sm font-black mb-2 shadow-sm uppercase tracking-wider">
                  Admission System {new Date().getFullYear() + 543}
                </div>
                <h1 className="text-4xl md:text-6xl font-black text-blue-900 tracking-tight">
                  {settings.schoolName}
                </h1>
                <p className="text-xl md:text-2xl text-slate-500 font-medium tracking-wide">
                  ระบบรับสมัครนักเรียนผ่านสื่ออิเล็กทรอนิกส์
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 px-4">
              <div className="group bg-white rounded-[2.5rem] shadow-xl overflow-hidden border-b-8 border-yellow-400 hover:shadow-2xl transition-all cursor-pointer transform hover:-translate-y-2" 
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
                  <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 shadow-xl shadow-blue-200 transition-colors mt-4">
                    สมัครเรียน ม.1
                  </button>
                </div>
              </div>

              <div className="group bg-white rounded-[2.5rem] shadow-xl overflow-hidden border-b-8 border-blue-600 hover:shadow-2xl transition-all cursor-pointer transform hover:-translate-y-2"
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
                  <button className="w-full bg-yellow-500 text-white py-4 rounded-2xl font-black hover:bg-yellow-600 shadow-xl shadow-yellow-100 transition-colors mt-4">
                    สมัครเรียน ม.4
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
          <StatusCheck onBack={reset} />
        )}

        {view === 'admin' && (
          <AdminDashboard onBack={reset} />
        )}
      </main>

      <footer className="bg-white border-t py-12 no-print">
        <div className="container mx-auto px-4 text-center space-y-4">
          <p className="text-slate-400 text-sm font-medium">
            © {new Date().getFullYear() + 543} {settings.schoolName}<br/>
            พัฒนาโดย ครูชมัยพร ถิ่นสำราญ โรงเรียนท่าบ่อ
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;
