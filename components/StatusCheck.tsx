
import React, { useState } from 'react';
import { ApplicationData, ApplicationStatus } from '../types';
import { StorageService } from '../services/storage';

interface Props {
  onBack: () => void;
}

const StatusCheck: React.FC<Props> = ({ onBack }) => {
  const [id, setId] = useState('');
  const [result, setResult] = useState<ApplicationData | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (id.length < 13) {
      setError('กรุณากรอกเลขบัตรประชาชนให้ครบ 13 หลัก');
      return;
    }

    setError('');
    setIsLoading(true);
    setResult(null);

    try {
      // 1. ดึงข้อมูลล่าสุดจาก Google Sheet โดยตรง
      const scriptUrl = StorageService.getScriptUrl();
      const url = `${scriptUrl}?action=read&t=${Date.now()}`;
      const res = await fetch(url);
      
      if (!res.ok) throw new Error("ไม่สามารถเชื่อมต่อฐานข้อมูลโรงเรียนได้");
      
      const allApps: any[] = await res.json();
      
      // 2. ค้นหาข้อมูลผู้สมัครจากเลขบัตรประชาชน (ลบขีดออกก่อนเทียบ)
      const cleanInput = id.replace(/-/g, '');
      const found = allApps.find(a => String(a.nationalId).replace(/-/g, '').replace(/'/g, '') === cleanInput);

      if (found) {
        setResult(found);
        // บันทึกเก็บไว้ในเครื่องเป็นสำรองด้วย
        StorageService.saveApplication(found);
      } else {
        // ลองหาในเครื่องเผื่อเน็ตหลุด
        const localApps = StorageService.getApplications();
        const localFound = localApps.find(a => a.nationalId.replace(/-/g, '') === cleanInput);
        if (localFound) {
          setResult(localFound);
        } else {
          setError('ไม่พบข้อมูลการสมัครในระบบ โปรดตรวจสอบเลขบัตรประชาชนอีกครั้ง');
        }
      }
    } catch (err) {
      console.error("Status check failed:", err);
      // Fallback: หากดึงจาก Cloud ไม่ได้ ให้หาในเครื่อง
      const cleanInput = id.replace(/-/g, '');
      const localApps = StorageService.getApplications();
      const localFound = localApps.find(a => a.nationalId.replace(/-/g, '') === cleanInput);
      
      if (localFound) {
        setResult(localFound);
      } else {
        setError('ไม่สามารถเชื่อมต่อระบบออนไลน์ได้ในขณะนี้ และไม่พบข้อมูลในเครื่องนี้');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isDocAttached = (field?: string) => field && (field.startsWith('data:image') || field.startsWith('http') || field === 'UPLOADED');

  return (
    <div className="max-w-2xl mx-auto animate-slide-up">
      <div className="bg-white shadow-2xl rounded-[3rem] overflow-hidden no-print text-left border">
        <div className="p-10 text-center bg-blue-900 text-white relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
             <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          </div>
          <h2 className="text-3xl font-black italic tracking-tight">ตรวจสอบสถานะการสมัคร</h2>
          <p className="opacity-70 font-medium">ระบุเลขประจำตัวประชาชน 13 หลักของผู้สมัคร</p>
        </div>
        
        <div className="p-10 space-y-8">
          <div className="flex flex-col md:flex-row gap-3">
            <input 
              type="text" 
              maxLength={13} 
              value={id} 
              onChange={e => setId(e.target.value.replace(/\D/g, ''))} 
              placeholder="เลขบัตรประชาชน 13 หลัก"
              className="flex-1 p-5 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-black text-2xl tracking-widest text-blue-900 placeholder:text-slate-200"
            />
            <button 
              onClick={handleSearch} 
              disabled={isLoading}
              className={`bg-blue-600 text-white px-10 py-5 rounded-2xl font-black text-lg active:scale-95 transition-all shadow-xl shadow-blue-100 hover:bg-blue-700 flex items-center justify-center space-x-2 ${isLoading ? 'opacity-50' : ''}`}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>กำลังค้นหา...</span>
                </>
              ) : (
                <span>ค้นหาข้อมูล</span>
              )}
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-100 p-6 rounded-2xl flex items-center space-x-4 animate-shake">
               <div className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
               </div>
               <p className="text-red-600 font-black">{error}</p>
            </div>
          )}

          {result && (
            <div className="bg-slate-50 p-8 rounded-[2.5rem] space-y-8 border-2 border-slate-100 animate-slide-up shadow-inner relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
                  <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
               </div>
               
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                 <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">สถานะปัจจุบันของคุณ</p>
                    <div className={`px-6 py-2 rounded-full inline-flex items-center space-x-2 shadow-sm ${
                      result.status === ApplicationStatus.APPROVED ? 'bg-green-500 text-white' :
                      result.status === ApplicationStatus.REJECTED ? 'bg-red-500 text-white' : 'bg-yellow-400 text-yellow-900'
                    }`}>
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      <span className="text-xl font-black italic">{result.status}</span>
                    </div>
                 </div>
                 <div className="text-left md:text-right">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">รหัสอ้างอิงใบสมัคร</p>
                    <p className="text-3xl font-black text-blue-900 tracking-tighter">{result.id}</p>
                 </div>
               </div>

               <div className="border-t border-slate-200 pt-8 space-y-2">
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">ข้อมูลผู้สมัคร</p>
                 <p className="text-2xl font-black text-slate-800">{result.title}{result.firstName} {result.lastName}</p>
                 <p className="text-sm font-bold text-slate-500 bg-white inline-block px-4 py-1 rounded-full border">ระดับชั้น: มัธยมศึกษาปีที่ {result.level}</p>
                 
                 <div className="mt-8">
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3">การตรวจสอบเอกสารเบื้องต้น</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { l: 'รูปถ่าย', f: 'photo' },
                          { l: 'ทะเบียนบ้าน', f: 'houseReg' },
                          { l: 'บัตรประชาชน', f: 'idCard' },
                          { l: 'ปพ.1 (หน้า)', f: 'transcript' },
                          { l: 'ปพ.1 (หลัง)', f: 'transcriptBack' }
                        ].map(d => (
                          <div key={d.f} className="flex items-center space-x-2 bg-white p-3 rounded-xl border border-slate-100">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm ${isDocAttached((result.files as any)[d.f]) ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                              {isDocAttached((result.files as any)[d.f]) ? '✓' : '!'}
                            </div>
                            <span className="text-[11px] font-bold text-slate-600 truncate">{d.l}</span>
                          </div>
                        ))}
                    </div>
                 </div>
               </div>

               {result.status === ApplicationStatus.REJECTED && (
                 <div className="bg-white p-8 rounded-[2rem] text-red-700 border-2 border-red-100 shadow-xl animate-bounce-short">
                   <div className="flex items-center space-x-2 mb-3">
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                      <h4 className="font-black uppercase text-sm tracking-widest">ข้อความจากเจ้าหน้าที่:</h4>
                   </div>
                   <p className="font-bold text-lg leading-relaxed italic">"{result.adminNote || 'เอกสารไม่ถูกต้อง หรือข้อมูลไม่ครบถ้วน กรุณาติดต่อฝ่ายรับสมัครโรงเรียนท่าบ่อเพื่อแก้ไขข้อมูล'}"</p>
                 </div>
               )}

               {result.status === ApplicationStatus.APPROVED && (
                 <div className="bg-green-600 p-6 rounded-2xl text-white shadow-lg text-center font-black animate-pulse">
                    ยินดีด้วย! ใบสมัครของคุณได้รับการอนุมัติแล้ว
                 </div>
               )}
            </div>
          )}
        </div>

        <div className="p-8 border-t text-center bg-slate-50/50">
           <button onClick={onBack} className="text-slate-400 font-black hover:text-blue-600 transition-all flex items-center justify-center space-x-2 mx-auto">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
              <span>กลับสู่หน้าหลัก</span>
           </button>
        </div>
      </div>
      
      <p className="mt-8 text-slate-400 text-xs font-bold italic">
         * หากข้อมูลไม่ถูกต้องหรือมีข้อสงสัย โปรดติดต่อฝ่ายรับสมัคร โรงเรียนท่าบ่อ ในวันและเวลาราชการ
      </p>
    </div>
  );
};

export default StatusCheck;
