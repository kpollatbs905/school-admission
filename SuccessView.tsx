
import React from 'react';
import { ApplicationData } from '../types';

interface Props {
  data: ApplicationData;
  onClose: () => void;
}

const SuccessView: React.FC<Props> = ({ data, onClose }) => {
  return (
    <div className="max-w-4xl mx-auto text-center space-y-8 animate-fade-in mb-20">
      <div className="bg-white rounded-[3rem] shadow-2xl p-12 border-t-8 border-green-500 overflow-hidden relative">
         <div className="absolute top-0 right-0 p-4 opacity-5">
            <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
         </div>

         <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
            <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
            </svg>
         </div>
         
         <h2 className="text-5xl font-black text-slate-800 tracking-tight mb-2 uppercase italic">บันทึกสำเร็จ!</h2>
         <p className="text-slate-500 mb-10 text-xl font-bold">ข้อมูลการสมัครเรียนของท่านเข้าระบบโรงเรียนท่าบ่อแล้ว</p>
         
         <div className="bg-slate-50 border-2 border-slate-100 p-10 rounded-[2.5rem] mb-10 shadow-inner group transition-all hover:bg-white hover:border-blue-200">
            <p className="text-slate-400 text-xs font-black uppercase mb-2 tracking-widest">เลขประจำตัวประชาชนผู้สมัคร</p>
            <p className="text-5xl font-black text-blue-900 tracking-tighter group-hover:scale-105 transition-transform">{data.nationalId}</p>
            <div className="mt-4 inline-block px-8 py-2 bg-blue-600 text-white rounded-full font-black text-sm shadow-lg">
               รหัสอ้างอิง: {data.id}
            </div>
         </div>

         <div className="flex flex-col items-center space-y-4">
            <button onClick={onClose} className="bg-blue-600 text-white px-16 py-5 rounded-[1.5rem] font-black hover:bg-blue-700 transition-all text-lg active:scale-95 shadow-xl shadow-blue-100 w-full md:w-auto">
               กลับสู่หน้าหลัก
            </button>
            <p className="text-slate-400 text-sm font-bold">กรุณาจดรหัสอ้างอิงเพื่อใช้ตรวจสอบสถานะในภายหลัง</p>
         </div>
      </div>
    </div>
  );
};

export default SuccessView;
