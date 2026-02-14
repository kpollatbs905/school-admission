
import React, { useEffect, useState, useMemo } from 'react';
import { StorageService } from '../services/storage';
import { Level, ApplicationData } from '../types';

const PublicStats: React.FC = () => {
  const [apps, setApps] = useState<ApplicationData[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTrack, setFilterTrack] = useState<string>('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const scriptUrl = StorageService.getScriptUrl();
        // Use standard fetch for GET, GAS handles redirects automatically
        const url = `${scriptUrl}?action=read&t=${Date.now()}`;
        const res = await fetch(url);
        
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        
        const data = await res.json();
        if (Array.isArray(data)) {
          setApps(data);
          try {
            // Sync to local as backup, but wrap in try-catch for quota issues
            localStorage.setItem('thabo_admission_apps_v2', JSON.stringify(data));
          } catch (storageError) {
            console.warn("Could not sync stats to local storage: Quota exceeded");
          }
        } else {
          throw new Error("Invalid data format from cloud");
        }
      } catch (err) {
        console.error("Public stats fetch failed:", err);
        // Fallback to local data
        setApps(StorageService.getApplications());
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const overviewStats = useMemo(() => {
    const m1 = apps.filter(a => a.level === Level.M1);
    const m4 = apps.filter(a => a.level === Level.M4);
    
    const count = (list: any[]) => ({
      total: list.length,
      male: list.filter(a => ['เด็กชาย', 'นาย'].includes(a.title)).length,
      female: list.filter(a => ['เด็กหญิง', 'นางสาว'].includes(a.title)).length
    });

    return { m1: count(m1), m4: count(m4) };
  }, [apps]);

  const filteredApps = useMemo(() => {
    return apps.filter(app => {
      if (filterLevel !== 'all' && app.level !== filterLevel) return false;
      if (filterType !== 'all' && app.trackType !== filterType) return false;
      if (filterTrack !== 'all' && app.track !== filterTrack) return false;
      return true;
    });
  }, [apps, filterLevel, filterType, filterTrack]);

  const filteredStats = useMemo(() => {
    const male = filteredApps.filter(a => ['เด็กชาย', 'นาย'].includes(a.title)).length;
    const female = filteredApps.filter(a => ['เด็กหญิง', 'นางสาว'].includes(a.title)).length;
    return { total: filteredApps.length, male, female };
  }, [filteredApps]);

  const availableTracks = useMemo(() => {
    let source = apps;
    if (filterLevel !== 'all') source = source.filter(a => a.level === filterLevel);
    if (filterType !== 'all') source = source.filter(a => a.trackType === filterType);
    return Array.from(new Set(source.map(a => a.track))).filter(Boolean).sort();
  }, [apps, filterLevel, filterType]);

  const StatCard = ({ title, data, colorClass, icon }: any) => (
    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 flex-1 hover:shadow-2xl transition-all">
      <div className="flex items-center space-x-4 mb-6">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg ${colorClass}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-800">{title}</h3>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">ยอดผู้สมัครทั้งหมด</p>
        </div>
        <div className="flex-grow text-right">
           <span className={`text-4xl font-black ${colorClass.replace('bg-', 'text-')}`}>{data.total}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-50 rounded-xl p-3 flex items-center space-x-3 border border-slate-100">
           <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
             <span className="text-xs">M</span>
           </div>
           <div>
             <p className="text-[10px] font-bold text-slate-400 uppercase">ชาย</p>
             <p className="text-xl font-black text-slate-700">{data.male}</p>
           </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 flex items-center space-x-3 border border-slate-100">
           <div className="w-8 h-8 rounded-full bg-pink-100 text-pink-500 flex items-center justify-center">
             <span className="text-xs">F</span>
           </div>
           <div>
             <p className="text-[10px] font-bold text-slate-400 uppercase">หญิง</p>
             <p className="text-xl font-black text-slate-700">{data.female}</p>
           </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 mt-12 animate-slide-up space-y-8">
      <div>
        <div className="flex items-center space-x-2 mb-6 justify-center">
           <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
           <h2 className="text-xl font-black text-slate-400 uppercase tracking-widest text-center">สถิติการรับสมัครล่าสุด</h2>
        </div>
        
        {loading ? (
          <div className="text-center py-10">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-slate-400 font-bold">กำลังโหลดข้อมูลล่าสุด...</p>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-8">
            <StatCard 
              title="ระดับชั้น ม.1" 
              data={overviewStats.m1} 
              colorClass="bg-blue-600" 
              icon={<span className="text-2xl font-black">1</span>}
            />
            <StatCard 
              title="ระดับชั้น ม.4" 
              data={overviewStats.m4} 
              colorClass="bg-yellow-500" 
              icon={<span className="text-2xl font-black">4</span>}
            />
          </div>
        )}
      </div>

      {!loading && (
        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
           <h3 className="text-lg font-black text-slate-700 mb-6 flex items-center">
              เจาะลึกสถิติรายแผนการเรียน
           </h3>

           <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-8">
              <div className="md:col-span-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">ระดับชั้น</label>
                 <select value={filterLevel} onChange={e => { setFilterLevel(e.target.value); setFilterTrack('all'); }} className="w-full p-3 rounded-xl bg-slate-50 border-2 font-bold outline-none">
                    <option value="all">ทั้งหมด</option>
                    <option value={Level.M1}>ม.1</option>
                    <option value={Level.M4}>ม.4</option>
                 </select>
              </div>
              <div className="md:col-span-3">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">ประเภทห้องเรียน</label>
                 <select value={filterType} onChange={e => { setFilterType(e.target.value); setFilterTrack('all'); }} className="w-full p-3 rounded-xl bg-slate-50 border-2 font-bold outline-none">
                    <option value="all">ทั้งหมด</option>
                    <option value="special">ห้องเรียนพิเศษ</option>
                    <option value="regular">ห้องเรียนปกติ</option>
                 </select>
              </div>
              <div className="md:col-span-6">
                 <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">แผนการเรียน</label>
                 <select value={filterTrack} onChange={e => setFilterTrack(e.target.value)} className="w-full p-3 rounded-xl bg-slate-50 border-2 font-bold outline-none">
                    <option value="all">ทุกแผนการเรียน</option>
                    {availableTracks.map((t, i) => <option key={i} value={t}>{t}</option>)}
                 </select>
              </div>
           </div>

           <div className="bg-slate-900 rounded-3xl p-6 text-white flex flex-col md:flex-row items-center justify-between shadow-lg">
              <div className="flex items-center space-x-4 mb-6 md:mb-0 text-left">
                 <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                 </div>
                 <div>
                    <p className="font-bold opacity-60 text-sm">ยอดผู้สมัครตามเงื่อนไข</p>
                    <p className="font-black text-lg">{filterLevel === 'all' ? 'ทุกระดับชั้น' : filterLevel}</p>
                 </div>
              </div>
              
              <div className="flex w-full md:w-auto justify-around md:justify-end md:space-x-8">
                 <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-blue-300">ชาย</p>
                    <p className="text-2xl font-black">{filteredStats.male}</p>
                 </div>
                 <div className="text-center">
                    <p className="text-[10px] uppercase font-bold text-pink-300">หญิง</p>
                    <p className="text-2xl font-black">{filteredStats.female}</p>
                 </div>
                 <div className="text-center pl-8 border-l border-white/20">
                    <p className="text-[10px] uppercase font-bold text-green-300">รวม</p>
                    <p className="text-4xl font-black text-green-400">{filteredStats.total}</p>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default PublicStats;
