
import React, { useState, useEffect, useMemo } from 'react';
import { ApplicationData, ApplicationStatus, Level, SystemSettings } from '../types';
import { StorageService } from '../services/storage';

interface Props {
  onBack: () => void;
}

const TRACK_DEFINITIONS = {
  [Level.M1]: {
    special: ['ห้องเรียนพิเศษ วิทย์-คณิต (Talented Program)', 'ห้องเรียนพิเศษ ภาษาอังกฤษ (Mini English Program)'],
    regular: ['ห้องเรียนปกติ']
  },
  [Level.M4]: {
    special: [
      'ห้องเรียนพิเศษ วิทยาศาสตร์-คณิตศาสตร์ (Talented Program)',
      'ห้องเรียนพิเศษ วิทยาศาสตร์ (Gifted Science Program)',
      'ห้องเรียนพิเศษภาษาอังกฤษและการสื่อสาร (Gifted English and Communication Program)'
    ],
    regular: [
      'ห้องเรียนวิทยาศาสตร์-คณิตศาสตร์ (วิทยาศาสตร์สุขภาพ)',
      'ห้องเรียนวิทยาศาสตร์-คณิตศาสตร์ (เตรียมวิศวกรรม)',
      'ห้องเรียนวิทยาศาสตร์-คณิตศาสตร์ (วิทยาศาสตร์พลังสิบ)',
      'ห้องเรียนวิทยาศาสตร์-คณิตศาสตร์ (ทั่วไป)',
      'ห้องเรียนศิลป์-ภาษา (อังกฤษ จีน เกาหลี ญี่ปุ่น)',
      'ห้องเรียนศิลป์-สังคม (กีฬา Sport Talented Program)',
      'ห้องเรียนศิลป์-สังคม (ศิลป์ธุรกิจ: MOU ปัญญาภิวัฒน์)',
      'ห้องเรียนศิลป์-สังคม (ศิลป์ทั่วไป)'
    ]
  }
};

const AdminDashboard: React.FC<Props> = ({ onBack }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [tab, setTab] = useState<'apps' | 'settings'>('apps');
  const [settings, setSettings] = useState<SystemSettings>(StorageService.getSettings());
  const [apps, setApps] = useState<ApplicationData[]>([]);
  const [selectedApp, setSelectedApp] = useState<ApplicationData | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [viewingImage, setViewingImage] = useState<{url: string, title: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<ApplicationData | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterTrack, setFilterTrack] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const url = `${StorageService.getScriptUrl()}?action=read&t=${Date.now()}`;
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) {
        setApps(data);
        try {
          localStorage.setItem('thabo_admission_apps_v2', JSON.stringify(data));
        } catch (storageError) {
          console.warn("Could not sync cloud data to local storage: Quota exceeded");
        }
      } else {
        setApps(StorageService.getApplications());
      }
    } catch (err) {
      console.error("Cloud fetch failed", err);
      setApps(StorageService.getApplications());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogin = (e: any) => {
    e.preventDefault();
    if (e.target.user.value === settings.adminUsername && e.target.pass.value === settings.adminPassword) {
      setIsLoggedIn(true);
    } else {
      alert("รหัสผ่านไม่ถูกต้อง");
    }
  };

  const updateStatus = async (status: ApplicationStatus) => {
    if (!selectedApp) return;
    
    // ตั้งค่า Loading และเตรียมข้อมูลที่อัปเดต
    setIsLoading(true);
    const updated: ApplicationData = { 
      ...selectedApp, 
      status, 
      adminNote: adminNote, 
      updatedAt: new Date().toISOString() 
    };

    try {
      // 1. อัปเดตข้อมูลใน UI ทันที (Optimistic Update)
      setApps(prev => prev.map(a => a.id === updated.id ? updated : a));
      
      // 2. บันทึกลง Local Storage เพื่อความปลอดภัย
      StorageService.saveApplication(updated);
      
      // 3. ส่งข้อมูลสถานะไปยัง Google Cloud (อัปเดต Column C / Index 2 ใน Sheet)
      // ใช้ stripImages เพื่อตัด Base64 ออกให้ข้อมูลเบาและส่งไวที่สุด
      const syncData = StorageService.stripImages(updated);
      await StorageService.submitToCloud(syncData);
      
      // 4. บันทึกเสร็จเรียบร้อย -> แสดงหน้าจอสีเขียว Success
      setIsLoading(false);
      setShowSuccessOverlay(true);
      
      // 5. ค้างไว้ 1.5 วินาที แล้วปิด Modal อัตโนมัติ
      setTimeout(() => {
        setShowSuccessOverlay(false);
        setSelectedApp(null);
        setAdminNote('');
      }, 1500);
      
    } catch (err) {
      console.error("Update status failed", err);
      setIsLoading(false);
      alert("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ แต่ระบบได้บันทึกสถานะไว้ในเครื่องแล้ว");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("ลบใบสมัครนี้? ข้อมูลจะถูกลบจาก Google Sheet ด้วย")) return;
    setIsLoading(true);
    await StorageService.deleteFromCloud(id);
    StorageService.deleteApplication(id);
    setApps(prev => prev.filter(a => a.id !== id));
    setSelectedApp(null);
    setIsLoading(false);
  };

  const handleSaveEdit = async () => {
    if (!editFormData) return;
    setIsLoading(true);
    const updated = { ...editFormData, updatedAt: new Date().toISOString() };
    const syncData = StorageService.stripImages(updated);
    await StorageService.submitToCloud(syncData);
    StorageService.saveApplication(updated);
    setApps(prev => prev.map(a => a.id === updated.id ? updated : a));
    setSelectedApp(updated);
    setIsEditing(false);
    setIsLoading(false);
    alert("บันทึกการแก้ไขเรียบร้อย");
  };

  const getDisplayImg = (val?: string) => {
    if (!val || val === 'UPLOADED') return null;
    if (val.startsWith('data:image')) return val;
    if (val.startsWith('http')) {
      if (val.includes('drive.google.com')) {
        const idMatch = val.match(/\/d\/([a-zA-Z0-9_-]+)/) || val.match(/id=([a-zA-Z0-9_-]+)/);
        if (idMatch && idMatch[1]) {
          return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
        }
      }
      return val;
    }
    return null;
  };

  const availableTracksInFilter = useMemo(() => {
    if (filterLevel === 'all') {
      return [...TRACK_DEFINITIONS[Level.M1].special, ...TRACK_DEFINITIONS[Level.M1].regular, 
              ...TRACK_DEFINITIONS[Level.M4].special, ...TRACK_DEFINITIONS[Level.M4].regular];
    }
    const level = filterLevel as Level;
    return [...TRACK_DEFINITIONS[level].special, ...TRACK_DEFINITIONS[level].regular];
  }, [filterLevel]);

  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      if (filterLevel !== 'all' && app.level !== filterLevel) return false;
      if (filterTrack !== 'all' && app.track !== filterTrack) return false;
      if (filterDate) {
        const appDate = new Date(app.submitDate).toISOString().split('T')[0];
        if (appDate !== filterDate) return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return `${app.firstName} ${app.lastName}`.toLowerCase().includes(term) || 
               app.nationalId.includes(term) || app.id.toLowerCase().includes(term);
      }
      return true;
    });
  }, [apps, filterLevel, filterTrack, filterDate, searchTerm]);

  const renderDocLink = (field: string | undefined, title: string) => {
    const imgUrl = getDisplayImg(field);
    if (!field || field === 'UPLOADED') return (
      <div className="flex items-center space-x-2 p-2 bg-slate-50 border border-dashed rounded-xl opacity-50">
        <div className="w-8 h-8 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12"/></svg>
        </div>
        <span className="text-[10px] font-bold text-slate-400 italic">{title} (ว่าง)</span>
      </div>
    );

    return (
      <div className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-xl mb-2 hover:border-blue-400 transition-all shadow-sm">
        <div className="flex items-center space-x-2 truncate mr-2 text-left">
           <div className="w-8 h-8 bg-blue-50 text-blue-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
           </div>
           <span className="text-[11px] font-bold text-slate-700 truncate">{title}</span>
        </div>
        <div className="flex space-x-1 flex-shrink-0">
          {imgUrl ? (
            <button 
              onClick={() => setViewingImage({url: imgUrl, title})} 
              className="p-1.5 bg-slate-900 text-white rounded-lg shadow-sm hover:bg-blue-600 transition-colors"
              title="ขยายดูรูป"
            >
               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </button>
          ) : (
            <a href={field} target="_blank" rel="noreferrer" className="p-1.5 bg-blue-600 text-white rounded-lg shadow-sm">
               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
            </a>
          )}
        </div>
      </div>
    );
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto mt-20 p-10 bg-white shadow-2xl rounded-[2.5rem] text-center border-t-8 border-blue-600">
        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg">
           <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 00-2 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h2 className="text-2xl font-black text-blue-900 mb-6">Staff Control Center</h2>
        <form onSubmit={handleLogin} className="space-y-4 text-left">
          <input name="user" placeholder="Username" className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold outline-none" />
          <input name="pass" type="password" placeholder="Password" className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold outline-none" />
          <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">Authenticate</button>
          <button type="button" onClick={onBack} className="w-full text-slate-400 text-sm font-bold mt-4 hover:text-slate-600 text-center">กลับหน้าหลัก</button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-fade-in">
      {/* Success Full-Screen Overlay (ค้างไว้ 1.5 วินาทีตามสั่ง) */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 bg-green-500 z-[2000] flex flex-col items-center justify-center animate-fade-in">
            <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center mb-6 shadow-2xl animate-bounce">
               <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tighter">บันทึกข้อมูลเรียบร้อยแล้ว</h2>
            <div className="mt-8 px-8 py-2 bg-white/20 rounded-full text-white text-sm font-bold animate-pulse">กำลังกลับสู่หน้ารายการ...</div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && !showSuccessOverlay && (
        <div className="fixed inset-0 bg-white/70 z-[1000] flex items-center justify-center backdrop-blur-md">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
              <p className="font-black text-blue-900 tracking-widest uppercase text-xs">กำลังบันทึกสถานะไปที่ Google Sheet...</p>
            </div>
        </div>
      )}
      
      {/* Image Viewer Overlay */}
      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black/95 z-[600] flex flex-col items-center justify-center p-4 animate-fade-in"
          onClick={() => setViewingImage(null)} 
        >
          <button 
            onClick={(e) => { e.stopPropagation(); setViewingImage(null); }} 
            className="absolute top-6 right-6 text-white bg-white/10 p-4 rounded-full hover:bg-white/20 transition-all z-[610]"
          >
             <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          
          <div 
            className="flex flex-col items-center max-w-full"
            onClick={(e) => e.stopPropagation()} 
          >
            <div className="bg-white/10 px-8 py-3 rounded-full mb-6 border border-white/20">
                <p className="text-white font-black text-sm tracking-widest uppercase">ตรวจสอบเอกสาร: {viewingImage.title}</p>
            </div>
            
            <img 
              src={viewingImage.url} 
              alt={viewingImage.title}
              className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-2xl border-4 border-white/30 mb-8" 
            />
            
            <button 
                onClick={() => setViewingImage(null)} 
                className="bg-white text-slate-900 px-12 py-5 rounded-[2rem] font-black hover:bg-blue-600 hover:text-white transition-all shadow-2xl flex items-center space-x-3 active:scale-95 border-b-4 border-slate-200"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 0118 0z" /></svg>
                <span>ปิดเอกสาร และกลับหน้าพิจารณา</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm">
           <button onClick={() => setTab('apps')} className={`px-8 py-2.5 rounded-xl font-black text-sm transition-all ${tab === 'apps' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>ใบสมัครล่าสุด</button>
           <button onClick={() => setTab('settings')} className={`px-8 py-2.5 rounded-xl font-black text-sm transition-all ${tab === 'settings' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>ตั้งค่าระบบ</button>
        </div>
        <button onClick={() => setIsLoggedIn(false)} className="bg-red-50 text-red-500 px-6 py-2 rounded-xl font-bold text-sm hover:bg-red-100 transition-all">ออกจากระบบ</button>
      </div>

      {tab === 'apps' ? (
        <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border">
           <div className="p-8 bg-slate-50/50 border-b space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-left">
                <div className="md:col-span-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">ค้นหาข้อมูล</label>
                   <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="ชื่อ / เลขบัตรประชาชน / รหัส ID..." className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 font-bold" />
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">ระดับชั้น</label>
                   <select value={filterLevel} onChange={e => { setFilterLevel(e.target.value); setFilterTrack('all'); }} className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold outline-none cursor-pointer">
                      <option value="all">ทุกระดับชั้น</option>
                      <option value={Level.M1}>มัธยมศึกษาปีที่ 1</option>
                      <option value={Level.M4}>มัธยมศึกษาปีที่ 4</option>
                   </select>
                </div>
                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">วันที่สมัคร</label>
                   <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold outline-none cursor-pointer" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-left">
                <div className="md:col-span-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">แผนการเรียน</label>
                   <select value={filterTrack} onChange={e => setFilterTrack(e.target.value)} className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl font-bold outline-none cursor-pointer">
                      <option value="all">ทุกแผนการเรียน</option>
                      {availableTracksInFilter.map((track, i) => <option key={i} value={track}>{track}</option>)}
                   </select>
                </div>
                <button onClick={fetchData} className="bg-slate-900 text-white py-3.5 rounded-xl font-black shadow-lg hover:bg-blue-600 transition-all flex items-center justify-center space-x-2">
                   <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                   <span>Refresh Data</span>
                </button>
              </div>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 tracking-tighter">
                 <tr>
                   <th className="p-6">ID</th>
                   <th className="p-6">ข้อมูลผู้สมัคร</th>
                   <th className="p-6">แผนการเรียน</th>
                   <th className="p-6">GPAX</th>
                   <th className="p-6">สถานะ</th>
                   <th className="p-6 text-right">การจัดการ</th>
                 </tr>
               </thead>
               <tbody className="divide-y text-sm">
                 {filteredApps.length === 0 ? (
                   <tr><td colSpan={6} className="p-20 text-center text-slate-400 font-bold italic">ไม่พบข้อมูลใบสมัคร</td></tr>
                 ) : filteredApps.sort((a,b) => b.id.localeCompare(a.id)).map(app => (
                   <tr key={app.id} className="hover:bg-blue-50/30 transition-colors">
                     <td className="p-6 font-black text-blue-600">{app.id}</td>
                     <td className="p-6">
                        <div className="font-bold text-slate-800">{app.title}{app.firstName} {app.lastName}</div>
                        <div className="text-[10px] text-slate-400 tracking-widest">{app.nationalId}</div>
                        <div className="text-[9px] text-slate-300 italic">{new Date(app.submitDate).toLocaleDateString('th-TH')}</div>
                     </td>
                     <td className="p-6">
                        <div className="text-xs font-bold text-slate-500 max-w-[200px] truncate">{app.track}</div>
                     </td>
                     <td className="p-6">
                        <div className="font-black text-lg">{app.education.gpa}</div>
                        {app.education.subGpa && <div className="text-[10px] text-blue-500 font-black">SubGPA: {app.education.subGpa}</div>}
                     </td>
                     <td className="p-6">
                        <span className={`px-4 py-1 rounded-full text-[10px] font-black shadow-sm ${
                          app.status === ApplicationStatus.APPROVED ? 'bg-green-500 text-white' : 
                          app.status === ApplicationStatus.REJECTED ? 'bg-red-500 text-white' : 'bg-yellow-400 text-yellow-900'
                        }`}>{app.status}</span>
                     </td>
                     <td className="p-6 text-right">
                        <button onClick={() => { 
                          setSelectedApp(app); 
                          setAdminNote(app.adminNote || '');
                          setIsEditing(false); 
                        }} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black hover:bg-blue-600 transition-all active:scale-95 shadow-md">ตรวจสอบ</button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
        </div>
      ) : (
        <div className="bg-white p-12 rounded-[2.5rem] shadow-xl border animate-slide-up text-left">
           <h3 className="text-2xl font-black text-blue-900 mb-8 pb-4 border-b">ตั้งค่าสถานศึกษาและระบบ</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ชื่อโรงเรียน (ภาษาไทย)</label>
                 <input value={settings.schoolName} onChange={e => setSettings({...settings, schoolName: e.target.value})} className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-2xl font-bold transition-all outline-none" placeholder="ชื่อโรงเรียน" />
              </div>
              <div className="space-y-4">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">สถานะระบบรับสมัคร</label>
                 <button 
                   onClick={() => setSettings({...settings, isOpen: !settings.isOpen})}
                   className={`w-full p-4 rounded-2xl font-black text-lg transition-all border-2 ${settings.isOpen ? 'bg-green-50 border-green-200 text-green-600' : 'bg-red-50 border-red-200 text-red-600'}`}
                 >
                    {settings.isOpen ? '● เปิดรับสมัครออนไลน์' : '○ ปิดรับสมัครชั่วคราว'}
                 </button>
              </div>
           </div>
           <div className="mt-12 pt-8 border-t flex justify-end">
              <button onClick={() => { StorageService.saveSettings(settings); alert("บันทึกการตั้งค่าสำเร็จ"); }} className="bg-blue-600 text-white px-12 py-5 rounded-[2rem] font-black shadow-2xl shadow-blue-200 active:scale-95 transition-all">บันทึกข้อมูลตั้งค่า</button>
           </div>
        </div>
      )}

      {selectedApp && (
        <div className="fixed inset-0 bg-slate-900/95 z-[500] flex items-center justify-center p-4 backdrop-blur-xl">
           <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl p-10 max-h-[95vh] overflow-y-auto animate-slide-up relative">
              <div className="flex justify-between items-start mb-8 border-b pb-8">
                 <div className="text-left">
                    <div className="flex items-center space-x-2 mb-2">
                       <span className={`px-3 py-1 rounded-full text-[10px] font-black text-white ${selectedApp.level === Level.M1 ? 'bg-blue-600' : 'bg-orange-600'}`}>มัธยมศึกษาปีที่ {selectedApp.level}</span>
                       <span className="text-xs font-bold text-slate-400">APPLICATION REVIEW</span>
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 leading-tight">
                       {isEditing ? 'แก้ไขข้อมูลนักเรียน' : 'รายละเอียดผู้สมัครเรียน'}
                    </h2>
                    <p className="text-sm text-slate-400 font-bold mt-1 tracking-tight">รหัสใบสมัคร: <span className="text-blue-600">{selectedApp.id}</span> | วันที่สมัคร: {new Date(selectedApp.submitDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                 </div>
                 <div className="flex space-x-3">
                    {!isEditing && (
                      <>
                        <button onClick={() => { setEditFormData(JSON.parse(JSON.stringify(selectedApp))); setIsEditing(true); }} className="w-12 h-12 bg-yellow-400 text-yellow-900 rounded-2xl flex items-center justify-center hover:shadow-xl transition-all" title="แก้ไข">
                           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDelete(selectedApp.id)} className="w-12 h-12 bg-red-500 text-white rounded-2xl flex items-center justify-center hover:shadow-xl transition-all" title="ลบข้อมูล">
                           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </>
                    )}
                    <button onClick={() => { setSelectedApp(null); setIsEditing(false); }} className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center hover:bg-slate-200 transition-all hover:text-red-500">
                       <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-12 text-left">
                 <div className="md:col-span-4 space-y-8">
                    <div className="aspect-[3/4] bg-slate-100 rounded-[2rem] overflow-hidden border-8 border-white shadow-2xl relative group">
                       {getDisplayImg(selectedApp.files.photo) ? (
                         <div className="relative h-full">
                            <img src={getDisplayImg(selectedApp.files.photo)!} className="w-full h-full object-cover cursor-zoom-in" onClick={() => setViewingImage({url: getDisplayImg(selectedApp.files.photo)!, title: 'รูปถ่ายหน้าตรง'})} />
                            <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                               <span className="bg-white text-blue-600 px-4 py-2 rounded-full font-black text-xs shadow-lg">คลิกเพื่อขยายดูรูป</span>
                            </div>
                         </div>
                       ) : (
                         <div className="h-full flex flex-col items-center justify-center text-slate-400 italic p-10 text-center font-bold">
                            <svg className="w-20 h-20 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            <span>{selectedApp.files.photo === 'UPLOADED' ? 'รูปถ่าย (Cloud)' : 'ไม่มีข้อมูลรูปถ่าย'}</span>
                         </div>
                       )}
                    </div>
                    
                    <div className="bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 space-y-4">
                       <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest text-left">เอกสารประกอบการสมัคร</h4>
                       {renderDocLink(selectedApp.files.transcript, "ใบ ปพ.1 (ด้านหน้า)")}
                       {renderDocLink(selectedApp.files.transcriptBack, "ใบ ปพ.1 (ด้านหลัง)")}
                       {renderDocLink(selectedApp.files.idCard, "สำเนาบัตรประชาชน")}
                       {renderDocLink(selectedApp.files.houseReg, "สำเนาทะเบียนบ้าน")}
                    </div>
                 </div>

                 <div className="md:col-span-8 space-y-8">
                    <div className="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-slate-100 shadow-inner">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                          <div className="space-y-1">
                             <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">ชื่อ-นามสกุล</span>
                             {isEditing && editFormData ? (
                               <div className="flex space-x-2">
                                  <input value={editFormData.title} onChange={e => setEditFormData({...editFormData, title: e.target.value})} className="w-20 p-2.5 bg-white border rounded-xl font-bold outline-none focus:border-blue-500" />
                                  <input value={editFormData.firstName} onChange={e => setEditFormData({...editFormData, firstName: e.target.value})} className="flex-1 p-2.5 bg-white border rounded-xl font-bold outline-none focus:border-blue-500" />
                                  <input value={editFormData.lastName} onChange={e => setEditFormData({...editFormData, lastName: e.target.value})} className="flex-1 p-2.5 bg-white border rounded-xl font-bold outline-none focus:border-blue-500" />
                               </div>
                             ) : <p className="text-2xl font-black text-slate-800 tracking-tight">{selectedApp.title}{selectedApp.firstName} {selectedApp.lastName}</p>}
                          </div>
                          <div className="space-y-1">
                             <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">เลขประจำตัวประชาชน</span>
                             <p className="text-2xl font-black text-slate-800 tracking-widest">{selectedApp.nationalId}</p>
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                          <div className="space-y-1">
                             <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">โรงเรียนเดิม</span>
                             <p className="text-lg font-bold text-slate-600">{selectedApp.education.schoolName}</p>
                          </div>
                          <div className="space-y-1">
                             <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">เบอร์โทรศัพท์</span>
                             <p className="text-lg font-bold text-blue-600 tracking-wider">{selectedApp.phone}</p>
                          </div>
                       </div>
                    </div>

                    <div className="bg-slate-900 text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                       <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-600/20 rounded-full blur-3xl group-hover:bg-blue-600/40 transition-all duration-1000"></div>
                       <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-4 block">ความประสงค์และแผนการเรียน</span>
                       
                       {isEditing && editFormData ? (
                          <div className="space-y-6 animate-slide-up">
                             <select value={editFormData.track} onChange={e => setEditFormData({...editFormData, track: e.target.value})} className="w-full bg-slate-800 p-4 rounded-2xl font-black text-xl border-2 border-slate-700 focus:border-blue-500 outline-none appearance-none">
                                {[...TRACK_DEFINITIONS[editFormData.level].special, ...TRACK_DEFINITIONS[editFormData.level].regular].map(t => (
                                   <option key={t} value={t}>{t}</option>
                                ))}
                             </select>
                             <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                   <span className="text-[10px] font-black uppercase text-blue-300">GPAX รวม</span>
                                   <input type="number" step="0.01" value={editFormData.education.gpa} onChange={e => setEditFormData({...editFormData, education: {...editFormData.education, gpa: e.target.value}})} className="w-full bg-slate-800 p-4 rounded-2xl font-black text-2xl text-blue-400 border-2 border-slate-700 outline-none focus:border-blue-400" />
                                </div>
                                {editFormData.education.subGpaSubject && (
                                   <div className="space-y-2">
                                      <span className="text-[10px] font-black uppercase text-orange-300 truncate block">{editFormData.education.subGpaSubject}</span>
                                      <input type="number" step="0.01" value={editFormData.education.subGpa} onChange={e => setEditFormData({...editFormData, education: {...editFormData.education, subGpa: e.target.value}})} className="w-full bg-slate-800 p-4 rounded-2xl font-black text-2xl text-orange-400 border-2 border-slate-700 outline-none focus:border-orange-400" />
                                   </div>
                                )}
                             </div>
                          </div>
                       ) : (
                          <>
                             <p className="text-3xl font-black text-white leading-tight mb-8 underline decoration-blue-500 decoration-4 underline-offset-8">{selectedApp.track}</p>
                             <div className="grid grid-cols-2 gap-8">
                                <div className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-all">
                                   <span className="text-[10px] block font-black uppercase text-blue-400 mb-2">GPAX (รวม)</span>
                                   <span className="text-4xl font-black text-white">{selectedApp.education.gpa}</span>
                                </div>
                                {selectedApp.education.subGpaSubject && (
                                   <div className="bg-white/5 p-6 rounded-3xl border border-white/10 hover:bg-white/10 transition-all">
                                      <span className="text-[10px] block font-black uppercase text-orange-400 mb-2 truncate" title={selectedApp.education.subGpaSubject}>{selectedApp.education.subGpaSubject}</span>
                                      <span className="text-4xl font-black text-white">{selectedApp.education.subGpa}</span>
                                   </div>
                                )}
                             </div>
                          </>
                       )}
                    </div>

                    {!isEditing && (
                      <div className="bg-slate-50 p-10 rounded-[2.5rem] border-2 border-slate-100 shadow-xl space-y-8">
                         <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg">
                               <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <h4 className="text-2xl font-black text-slate-800">พิจารณาและบันทึกผล</h4>
                         </div>
                         
                         <div className="space-y-2 text-left">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">บันทึกเพิ่มเติมถึงนักเรียน (ระบุเหตุผลหากต้องการให้แก้ไข)</label>
                           <textarea 
                             value={adminNote}
                             onChange={e => setAdminNote(e.target.value)}
                             placeholder="ระบุเหตุผลในการแจ้งแก้ไข หรือข้อความแนะนำเพิ่มเติม..." 
                             className="w-full p-6 bg-white border-2 border-slate-200 rounded-[2rem] h-32 outline-none focus:border-blue-500 font-bold transition-all shadow-inner" 
                           />
                         </div>
                         
                         <div className="grid grid-cols-2 gap-6">
                            <button 
                              onClick={() => updateStatus(ApplicationStatus.APPROVED)} 
                              className={`bg-green-500 hover:bg-green-600 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-green-100 active:scale-95 transition-all flex items-center justify-center space-x-3 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={isLoading}
                            >
                               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                               <span>{isLoading ? 'กำลังบันทึก...' : 'อนุมัติการสมัคร'}</span>
                            </button>
                            <button 
                              onClick={() => updateStatus(ApplicationStatus.REJECTED)} 
                              className={`bg-red-500 hover:bg-red-600 text-white py-5 rounded-[1.5rem] font-black text-lg shadow-xl shadow-red-100 active:scale-95 transition-all flex items-center justify-center space-x-3 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                              disabled={isLoading}
                            >
                               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                               <span>{isLoading ? 'กำลังบันทึก...' : 'แจ้งให้แก้ไขข้อมูล'}</span>
                            </button>
                         </div>
                      </div>
                    )}
                    
                    {isEditing && (
                      <div className="flex gap-6 pt-10 border-t">
                         <button onClick={() => setIsEditing(false)} className="flex-1 py-5 border-2 rounded-[1.5rem] font-black text-slate-500 hover:bg-slate-50 transition-all active:scale-95 text-lg">ยกเลิกการแก้ไข</button>
                         <button onClick={handleSaveEdit} className="flex-1 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 text-lg">บันทึกข้อมูลที่แก้ไข</button>
                      </div>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
