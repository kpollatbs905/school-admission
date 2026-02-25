
import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { ApplicationData, ApplicationStatus, Level, SystemSettings, Scores } from '../types';
import { StorageService } from '../services/storage';
import AdmissionForm from './AdmissionForm';

interface Props {
  onBack: () => void;
}

const M1_TRACKS = [
  'ห้องเรียนพิเศษ วิทย์-คณิต (Talented Program)',
  'ห้องเรียนพิเศษ ภาษาอังกฤษ (Mini English Program)',
  'ห้องเรียนปกติ'
];

const M4_TRACKS = [
  'ห้องเรียนพิเศษ วิทยาศาสตร์-คณิตศาสตร์ (Talented Program)',
  'ห้องเรียนพิเศษ วิทยาศาสตร์ (Gifted Science Program)',
  'ห้องเรียนพิเศษภาษาอังกฤษและการสื่อสาร (Gifted English and Communication Program)',
  'ห้องเรียนวิทยาศาสตร์-คณิตศาสตร์ (วิทยาศาสตร์สุขภาพ)',
  'ห้องเรียนวิทยาศาสตร์-คณิตศาสตร์ (เตรียมวิศวกรรม)',
  'ห้องเรียนวิทยาศาสตร์-คณิตศาสตร์ (วิทยาศาสตร์พลังสิบ)',
  'ห้องเรียนวิทยาศาสตร์-คณิตศาสตร์ (ทั่วไป)',
  'ห้องเรียนศิลป์-ภาษา (อังกฤษ จีน เกาหลี ญี่ปุ่น)',
  'ห้องเรียนศิลป์-สังคม (กีฬา Sport Talented Program)',
  'ห้องเรียนศิลป์-สังคม (ศิลป์ธุรกิจ: MOU ปัญญาภิวัฒน์)',
  'ห้องเรียนศิลป์-สังคม (ศิลป์ทั่วไป)'
];

const AdminDashboard: React.FC<Props> = ({ onBack }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [tab, setTab] = useState<'apps' | 'rooms' | 'scores-m1' | 'scores-m4' | 'classes-m1' | 'classes-m4' | 'settings'>('apps');
  const [settings, setSettings] = useState<SystemSettings>(StorageService.getSettings());
  const [tempScriptUrl, setTempScriptUrl] = useState(StorageService.getScriptUrl());
  const [apps, setApps] = useState<ApplicationData[]>([]);
  const [selectedApp, setSelectedApp] = useState<ApplicationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [syncStatus, setSyncStatus] = useState<'online' | 'error' | 'checking'>('checking');
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Scoring State
  const [scoreLevel, setScoreLevel] = useState<string>(Level.M1);
  const [scoreTrack, setScoreTrack] = useState<string>('all');
  const [editingScores, setEditingScores] = useState<Record<string, Scores>>({});
  const [selectedRoomForScores, setSelectedRoomForScores] = useState<string>('');

  // Class Assignment State
  const [classLevel, setClassLevel] = useState<string>(Level.M1);
  const [classTrack, setClassTrack] = useState<string>('all');
  const [studentsPerClass, setStudentsPerClass] = useState<number>(40);
  const [maxClasses, setMaxClasses] = useState<number>(14);
  const [startRoom, setStartRoom] = useState<number>(1);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTrack, setFilterTrack] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    setSyncStatus('checking');
    setFetchError(null);
    try {
      const data = await StorageService.getApplications();
      setApps(data);
      setSyncStatus('online');
    } catch (err: any) {
      setSyncStatus('error');
      setFetchError(err.message || "ไม่สามารถโหลดข้อมูลได้");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editingApp, setEditingApp] = useState<ApplicationData | null>(null);

  useEffect(() => {
    if (isLoggedIn) fetchData();
  }, [isLoggedIn]);

  const handleLogin = (e: any) => {
    e.preventDefault();
    if (e.target.user.value === settings.adminUsername && e.target.pass.value === settings.adminPassword) {
      setIsLoggedIn(true);
    } else {
      showNotification("❌ รหัสผ่านไม่ถูกต้อง", "error");
    }
  };

  const updateStatus = async (status: ApplicationStatus) => {
    if (!selectedApp) return;
    setIsLoading(true);
    const payload = { ...selectedApp, status, adminNote };
    try {
      const result = await StorageService.submitToCloud(payload as ApplicationData);
      if (result.success) {
        setSelectedApp(null);
        alert(`ดำเนินการ "${status}" เรียบร้อยแล้ว`);
        fetchData(true);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsLoading(false);
    }
  };

  const trackOptions = useMemo(() => {
    if (filterLevel === Level.M1) return M1_TRACKS;
    if (filterLevel === Level.M4) return M4_TRACKS;
    return Array.from(new Set([...M1_TRACKS, ...M4_TRACKS])).sort();
  }, [filterLevel]);

  const filteredApps = useMemo(() => {
    setCurrentPage(1); // Reset to first page when filters change
    return apps.filter(app => {
      if (filterLevel !== 'all') {
        const lvl = String(app.level || '').trim();
        const target = String(filterLevel).trim();
        if (lvl !== target && lvl.replace('.', '') !== target.replace('.', '')) return false;
      }
      if (filterType !== 'all' && app.trackType !== filterType) return false;
      if (filterTrack !== 'all' && app.track !== filterTrack) return false;
      if (filterStatus !== 'all' && app.status !== filterStatus) return false;
      if (filterDate) {
        try {
          if (!app.submitDate) return false;
          const appDate = new Date(app.submitDate);
          if (isNaN(appDate.getTime())) return false;
          const appDateStr = appDate.toISOString().split('T')[0];
          if (appDateStr !== filterDate) return false;
        } catch (e) {
          return false;
        }
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          `${app.firstName} ${app.lastName}`.toLowerCase().includes(term) || 
          app.id.toLowerCase().includes(term) || 
          app.education.schoolName.toLowerCase().includes(term) ||
          app.nationalId.toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [apps, filterLevel, filterType, filterTrack, filterStatus, filterDate, searchTerm]);

  const paginatedApps = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredApps.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredApps, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredApps.length / itemsPerPage);

  // Exam Room Management State
  const [roomLevel, setRoomLevel] = useState<string>(Level.M1);
  const [roomTrack, setRoomTrack] = useState<string>('all');
  const [roomCapacity, setRoomCapacity] = useState<number>(30);
  const [roomMax, setRoomMax] = useState<number>(20);
  const [viewingRoom, setViewingRoom] = useState<string | null>(null);

  // Exam Room Logic
  const appsByRoom = useMemo(() => {
    const grouped: Record<string, ApplicationData[]> = {};
    
    // Group everything that has a room property and is approved
    apps.forEach(app => {
      const status = (app.status || '').toString().trim();
      const isApproved = status === ApplicationStatus.APPROVED || 
                         status === 'อนุมัติ' || 
                         status === 'อนุมัติแล้ว' || 
                         status === 'ผ่าน' ||
                         status.includes('อนุมัติ');
      
      if (app.room && isApproved) {
        if (!grouped[app.room]) grouped[app.room] = [];
        grouped[app.room].push(app);
      }
    });

    // Sort students within each room by ID
    Object.keys(grouped).forEach(room => {
      grouped[room].sort((a, b) => a.id.localeCompare(b.id));
    });

    return grouped;
  }, [apps]);

  const approvedWithoutRoom = useMemo(() => {
    return apps.filter(app => {
      const status = (app.status || '').toString().trim();
      const isApproved = status === ApplicationStatus.APPROVED || 
                         status === 'อนุมัติ' || 
                         status === 'อนุมัติแล้ว' || 
                         status === 'ผ่าน' ||
                         status.includes('อนุมัติ');
      return isApproved && !app.room;
    });
  }, [apps]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    apps.forEach(a => {
      const s = (a.status || 'ไม่ระบุ').toString().trim();
      counts[s] = (counts[s] || 0) + 1;
    });
    return counts;
  }, [apps]);

  const approvedCount = useMemo(() => {
    return apps.filter(a => {
      const status = (a.status || '').toString().trim();
      return status === ApplicationStatus.APPROVED || 
             status === 'อนุมัติ' || 
             status === 'อนุมัติแล้ว' || 
             status === 'ผ่าน' ||
             status.includes('อนุมัติ');
    }).length;
  }, [apps]);

  const handleSetupHeaders = async () => {
    // if (!confirm("⚠️ คุณแน่ใจหรือไม่ว่าต้องการตั้งค่าหัวข้อ Sheet ใหม่?\nระบบจะสร้างคอลัมน์ที่จำเป็นทั้งหมดให้โดยไม่ลบข้อมูลเดิม")) return;
    setIsLoading(true);
    try {
      const response = await fetch(StorageService.getScriptUrl(), {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: 'setupHeaders' })
      });
      const result = await response.json();
      if (result.success) {
        showNotification("✅ " + result.message, "success");
        fetchData();
      } else {
        showNotification("❌ " + result.error, "error");
      }
    } catch (e: any) {
      showNotification("❌ เกิดข้อผิดพลาด: " + e.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteApplication = async (id: string) => {
    // if (!confirm(`⚠️ คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนักเรียนรหัส ${id}?\nการดำเนินการนี้ไม่สามารถย้อนกลับได้`)) return;
    
    try {
      setIsLoading(true);
      const scriptUrl = StorageService.getScriptUrl();
      const response = await fetch(scriptUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: 'delete', id })
      });
      
      const result = await response.json();
      if (result.success) {
        alert("✅ ลบข้อมูลเรียบร้อยแล้ว");
        setSelectedApp(null);
        fetchData();
      } else {
        throw new Error(result.error || "ลบข้อมูลไม่สำเร็จ");
      }
    } catch (e: any) {
      alert("❌ เกิดข้อผิดพลาด: " + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditApplication = (app: ApplicationData) => {
    setEditingApp(app);
    setIsEditing(true);
    setSelectedApp(null);
  };

  const handleFinishEdit = async (updatedData: ApplicationData) => {
    // AdmissionForm already submitted to cloud, just refresh and close
    showNotification("✅ แก้ไขข้อมูลเรียบร้อยแล้ว", "success");
    setIsEditing(false);
    setEditingApp(null);
    fetchData();
  };

  const handleAutoAssignRooms = async () => {
    if (roomCapacity <= 0) {
      showNotification("❌ กรุณาระบุจำนวนคนต่อห้องให้ถูกต้อง (มากกว่า 0)", "error");
      return;
    }

    // const msg = roomLevel === 'all' && roomTrack === 'all' 
    //   ? `ระบบจะจัดห้องสอบอัตโนมัติสำหรับนักเรียนทุกคนที่อนุมัติแล้ว (${roomCapacity} คน/ห้อง) ยืนยันหรือไม่?`
    //   : `ระบบจะจัดห้องสอบอัตโนมัติสำหรับ ${roomLevel === 'all' ? 'ทุกระดับชั้น' : 'ม.' + roomLevel} ${roomTrack === 'all' ? 'ทุกแผนการเรียน' : 'แผน ' + roomTrack} (${roomCapacity} คน/ห้อง) ยืนยันหรือไม่?`;
    
    // if (!confirm(msg)) return;
    
    setIsLoading(true);
    
    try {
      const scriptUrl = StorageService.getScriptUrl();
      if (!scriptUrl) {
        showNotification("❌ ไม่พบ Script URL กรุณาตรวจสอบการตั้งค่า", "error");
        return;
      }

      const response = await fetch(scriptUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ 
          action: 'autoAssign', 
          level: roomLevel,
          track: roomTrack,
          capacity: roomCapacity,
          maxRooms: roomMax
        })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error (${response.status}): ${text.substring(0, 100)}`);
      }

      let result;
      try {
        const text = await response.text();
        result = JSON.parse(text);
      } catch (e) {
        throw new Error("Server returned invalid data (Not JSON). Please check Script deployment.");
      }

      if (result.success) {
        showNotification(`✅ ${result.message}`, "success");
        await fetchData();
      } else {
        showNotification(`❌ ${result.error || "เกิดข้อผิดพลาดในการจัดห้องสอบ"}`, "error");
      }
    } catch (e: any) {
      showNotification("❌ เกิดข้อผิดพลาด: " + e.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const exportToExcel = (roomName: string) => {
    const students = appsByRoom[roomName];
    if (!students) return;

    const data = students.map((s, idx) => ({
      'ลำดับ': idx + 1,
      'รหัสสมัคร': s.id,
      'ระดับชั้น': s.level,
      'คำนำหน้า': s.title,
      'ชื่อ': s.firstName,
      'นามสกุล': s.lastName,
      'เลขบัตรประชาชน': s.nationalId,
      'โรงเรียนเดิม': s.education.schoolName,
      'แผนการเรียน': s.track,
      'GPAX': s.education.gpa,
      'ห้องสอบ': roomName
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายชื่อผู้เข้าสอบ");
    XLSX.writeFile(wb, `รายชื่อผู้เข้าสอบ_${roomName}.xlsx`);
  };

  const exportClassToExcel = (fileName: string) => {
    const approvedApps = apps.filter(a => 
      a.assignedClass && 
      a.level === classLevel &&
      (classTrack === 'all' || a.track === classTrack)
    ).sort((a, b) => {
      // Sort by class then by ave score
      if (a.assignedClass !== b.assignedClass) {
        return (a.assignedClass || '').localeCompare(b.assignedClass || '');
      }
      return (b.scores?.ave || 0) - (a.scores?.ave || 0);
    });

    if (approvedApps.length === 0) {
      showNotification("❌ ไม่พบข้อมูลนักเรียนที่จัดห้องเรียนแล้ว", "error");
      return;
    }

    const data = approvedApps.map((s, idx) => ({
      'ลำดับ': idx + 1,
      'รหัสสมัคร': s.id,
      'ระดับชั้น': s.level,
      'คำนำหน้า': s.title,
      'ชื่อ': s.firstName,
      'นามสกุล': s.lastName,
      'แผนการเรียน': s.track,
      'คะแนนเฉลี่ย': s.scores?.ave?.toFixed(2),
      'ห้องเรียนที่จัดได้': s.assignedClass
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "รายชื่อการจัดห้องเรียน");
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const handleScoreChange = (id: string, field: keyof Scores, value: string) => {
    const num = parseFloat(value) || 0;
    setEditingScores(prev => {
      const current = prev[id] || { math: 0, science: 0, english: 0, thai: 0, sum: 0, ave: 0 };
      const updated = { ...current, [field]: num };
      
      const app = apps.find(a => a.id === id);
      const isSpecial = app?.trackType === 'special';
      
      if (isSpecial) {
        updated.sum = updated.math + updated.science + updated.english;
        updated.ave = updated.sum / 3;
      } else {
        updated.sum = updated.math + updated.science + updated.english + updated.thai;
        updated.ave = updated.sum / 4;
      }
      
      return { ...prev, [id]: updated };
    });
  };

  const handleSaveScores = async () => {
    if (Object.keys(editingScores).length === 0) return;
    setIsLoading(true);
    try {
      for (const [id, scores] of Object.entries(editingScores)) {
        const app = apps.find(a => a.id === id);
        if (app) {
          await StorageService.submitToCloud({ ...app, scores });
        }
      }
      showNotification("✅ บันทึกคะแนนเรียบร้อยแล้ว", "success");
      setEditingScores({});
      fetchData();
    } catch (e) {
      showNotification("❌ เกิดข้อผิดพลาดในการบันทึกคะแนน", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClassAllocation = async () => {
    // if (!confirm(`ระบบจะจัดชั้นเรียนโดยเรียงลำดับตามคะแนนเฉลี่ย (สูงสุดไปต่ำสุด) ห้องละ ${studentsPerClass} คน รวม ${maxClasses} ห้อง ยืนยันหรือไม่?`)) return;
    setIsLoading(true);
    try {
      const approvedApps = apps.filter(a => 
        a.status === ApplicationStatus.APPROVED && 
        a.level === classLevel &&
        (classTrack === 'all' || a.track === classTrack)
      );
      
      if (approvedApps.length === 0) {
        showNotification(`❌ ไม่พบนักเรียนชั้น ม.${classLevel} ${classTrack !== 'all' ? 'แผน ' + classTrack : ''} ที่มีสถานะ 'อนุมัติ'\nกรุณาตรวจสอบสถานะนักเรียนในเมนู 'ใบสมัคร' ก่อนครับ`, "error");
        return;
      }

      const withScores = approvedApps.filter(a => a.scores?.ave);
      if (withScores.length === 0) {
        showNotification(`❌ นักเรียนชั้น ม.${classLevel} ที่อนุมัติแล้ว ยังไม่มีคะแนนสอบ\nกรุณากรอกคะแนนสอบในเมนู 'กรอกคะแนน' ก่อนจัดชั้นเรียนครับ`, "error");
        return;
      }

      // Sort by ave descending
      const sorted = [...withScores].sort((a, b) => (b.scores?.ave || 0) - (a.scores?.ave || 0));
      
      const updates: { id: string; value: string }[] = [];
      
      if (classLevel === Level.M1 && classTrack === 'ห้องเรียนปกติ') {
        // Special logic for M.1 Regular Track: Rooms 4-7 sorted, Rooms 8-14 (or more) randomized
        const topRooms = [4, 5, 6, 7];
        const randomRooms = [];
        for (let i = 8; i <= maxClasses; i++) {
          randomRooms.push(i);
        }
        
        const topCapacity = topRooms.length * studentsPerClass;
        const topStudents = sorted.slice(0, topCapacity);
        const remainingStudents = sorted.slice(topCapacity);

        // Shuffle remaining students for random allocation
        const shuffledRemaining = [...remainingStudents].sort(() => Math.random() - 0.5);

        // Assign top students to rooms 4-7
        topStudents.forEach((s, i) => {
          const roomIdx = Math.floor(i / studentsPerClass);
          if (roomIdx < topRooms.length) {
            updates.push({ id: s.id, value: `ห้อง ${topRooms[roomIdx]}` });
          }
        });

        // Assign remaining students to rooms 8 and above
        shuffledRemaining.forEach((s, i) => {
          const roomIdx = Math.floor(i / studentsPerClass);
          if (roomIdx < randomRooms.length) {
            updates.push({ id: s.id, value: `ห้อง ${randomRooms[roomIdx]}` });
          }
        });
      } else {
        // Default logic: Sequential allocation by score starting from startRoom
        let currentClass = startRoom;
        let countInCurrentClass = 0;
        
        for (const student of sorted) {
          if (currentClass > maxClasses) break;
          
          updates.push({ id: student.id, value: `ห้อง ${currentClass}` });
          
          countInCurrentClass++;
          if (countInCurrentClass >= studentsPerClass) {
            currentClass++;
            countInCurrentClass = 0;
          }
        }
      }

      // Send batch update to cloud
      const response = await fetch(StorageService.getScriptUrl(), {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ action: 'batchUpdate', updates, field: 'Class' })
      });

      const result = await response.json();
      if (result.success) {
        showNotification(`✅ จัดชั้นเรียนสำเร็จ (${result.count} คน)`, "success");
        fetchData();
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (e: any) {
      showNotification("❌ เกิดข้อผิดพลาดในการจัดชั้นเรียน: " + e.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const getDisplayImg = (val?: string) => {
    if (!val || val === 'UPLOADED') return null;
    if (val.startsWith('data:image')) return val;
    if (val.includes('drive.google.com')) {
      const idMatch = val.match(/\/d\/([a-zA-Z0-9_-]+)/) || val.match(/id=([a-zA-Z0-9_-]+)/);
      if (idMatch) return `https://drive.google.com/thumbnail?id=${idMatch[1]}&sz=w1000`;
    }
    return val;
  };

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto mt-20 p-10 bg-white shadow-2xl rounded-[2.5rem] text-center border">
        <h2 className="text-2xl font-black text-blue-900 mb-6 uppercase tracking-tight italic">Admin Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <input name="user" placeholder="ชื่อผู้ใช้งาน" className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 font-bold outline-none" />
          <input name="pass" type="password" placeholder="รหัสผ่าน" className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 font-bold outline-none" />
          <button className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all">เข้าสู่ระบบ</button>
          <button type="button" onClick={onBack} className="text-slate-400 font-bold mt-2">ย้อนกลับ</button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-20 space-y-8 text-left">
      {/* Notification Toast */}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[20001] animate-slide-down">
          <div className={`px-8 py-4 rounded-2xl shadow-2xl flex items-center space-x-3 border-2 ${
            notification.type === 'success' ? 'bg-green-600 border-green-400 text-white' :
            notification.type === 'error' ? 'bg-red-600 border-red-400 text-white' :
            'bg-blue-600 border-blue-400 text-white'
          }`}>
            <span className="text-xl">
              {notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <p className="font-black whitespace-pre-line">{notification.message}</p>
            <button onClick={() => setNotification(null)} className="ml-4 opacity-70 hover:opacity-100 font-black">✕</button>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-white/60 z-[20000] flex flex-col items-center justify-center backdrop-blur-[2px]">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-black text-blue-900 text-lg">กำลังดำเนินการ...</p>
        </div>
      )}

      {/* Admin Toolbar */}
      <div className="flex flex-wrap items-center gap-4 no-print sticky top-20 z-40 bg-yellow-100/90 backdrop-blur-sm py-3 px-4 rounded-2xl border border-yellow-200">
        <div className="flex items-center space-x-2 mr-4">
           <div className={`w-3 h-3 rounded-full ${syncStatus === 'online' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}></div>
           <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{syncStatus === 'online' ? 'Connected' : 'Offline'}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setTab('apps')} className={`px-4 py-2 rounded-xl font-black transition-all ${tab === 'apps' ? 'bg-blue-600 text-white shadow-md' : 'bg-white border text-slate-400 hover:text-blue-500'}`}>ใบสมัคร</button>
          <button onClick={() => setTab('rooms')} className={`px-4 py-2 rounded-xl font-black transition-all ${tab === 'rooms' ? 'bg-purple-600 text-white shadow-md' : 'bg-white border text-slate-400 hover:text-purple-500'}`}>จัดห้องสอบ</button>
          <button onClick={() => setTab('settings')} className={`px-4 py-2 rounded-xl font-black transition-all ${tab === 'settings' ? 'bg-slate-800 text-white shadow-md' : 'bg-white border text-slate-400 hover:text-slate-800'}`}>ตั้งค่าระบบ</button>
          
          <div className="h-10 w-[1px] bg-slate-200 mx-1 hidden md:block"></div>
          
          <div className="flex bg-white rounded-xl border p-1 shadow-sm">
            <button 
              onClick={() => { setTab('scores-m1'); setScoreLevel(Level.M1); setSelectedRoomForScores(''); }} 
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${tab === 'scores-m1' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-emerald-500'}`}
            >
              คะแนน ม.1
            </button>
            <button 
              onClick={() => { setTab('scores-m4'); setScoreLevel(Level.M4); setSelectedRoomForScores(''); }} 
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${tab === 'scores-m4' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-emerald-500'}`}
            >
              คะแนน ม.4
            </button>
          </div>

          <div className="flex bg-white rounded-xl border p-1 shadow-sm">
            <button 
              onClick={() => { setTab('classes-m1'); setClassLevel(Level.M1); }} 
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${tab === 'classes-m1' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-orange-500'}`}
            >
              จัดห้อง ม.1
            </button>
            <button 
              onClick={() => { setTab('classes-m4'); setClassLevel(Level.M4); }} 
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black transition-all ${tab === 'classes-m4' ? 'bg-orange-600 text-white' : 'text-slate-400 hover:text-orange-500'}`}
            >
              จัดห้อง ม.4
            </button>
          </div>
        </div>
        <div className="flex-grow"></div>
        <button onClick={() => fetchData()} className="bg-white text-blue-600 px-4 py-2 rounded-xl font-bold flex items-center space-x-2 hover:bg-blue-50 border shadow-sm">
          <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
          <span>Refresh</span>
        </button>
        <button onClick={handleSetupHeaders} className="bg-white text-emerald-600 px-4 py-2 rounded-xl font-bold flex items-center space-x-2 hover:bg-emerald-50 border shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          <span>Setup Sheet</span>
        </button>
        <button onClick={() => setIsLoggedIn(false)} className="text-red-500 font-bold bg-white px-4 py-2 rounded-xl border border-red-100 shadow-sm hover:bg-red-50">Logout</button>
      </div>

      {syncStatus === 'error' && (
        <div className="bg-red-50 border-2 border-red-200 p-6 rounded-[2rem] text-red-600 flex items-center justify-between shadow-lg animate-shake">
           <div className="flex items-center space-x-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <div>
                <p className="font-black text-lg">เกิดข้อผิดพลาดในการโหลดข้อมูล</p>
                <p className="text-sm font-bold opacity-80">{fetchError}</p>
              </div>
           </div>
           <button onClick={() => fetchData()} className="bg-red-600 text-white px-6 py-2 rounded-xl font-black shadow-md hover:bg-red-700 transition-all active:scale-95">ลองใหม่อีกครั้ง</button>
        </div>
      )}

      {tab === 'settings' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-xl p-10 border">
            <h2 className="text-3xl font-black text-slate-800 italic uppercase mb-2">System Settings</h2>
            <p className="text-slate-500 font-bold mb-8">ตั้งค่าการเชื่อมต่อ Google Apps Script และข้อมูลพื้นฐานของระบบ</p>
            
            <div className="space-y-8">
              <div className="p-8 bg-blue-50 rounded-[2rem] border-2 border-blue-100">
                <h3 className="text-lg font-black text-blue-900 mb-4 flex items-center">
                  <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center mr-3 text-xs italic">URL</span>
                  Google Apps Script URL
                </h3>
                <p className="text-xs text-blue-700 font-bold mb-4 opacity-70">
                  วาง URL ที่ได้จากการ Deploy (New Deployment to Anyone) เพื่อเชื่อมต่อกับ Google Sheets
                </p>
                <div className="flex flex-col md:flex-row gap-3">
                  <input 
                    type="text" 
                    value={tempScriptUrl} 
                    onChange={e => setTempScriptUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 p-4 rounded-2xl border-2 border-blue-200 focus:border-blue-500 outline-none font-bold text-blue-900"
                  />
                  <button 
                    onClick={() => {
                      StorageService.saveScriptUrl(tempScriptUrl);
                      showNotification("✅ บันทึก Script URL เรียบร้อยแล้ว", "success");
                      fetchData();
                    }}
                    className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all active:scale-95"
                  >
                    บันทึก URL
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-black text-slate-800 border-b pb-2">ข้อมูลโรงเรียน</h3>
                  <div className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-slate-100 shadow-sm">
                    <div>
                      <p className="font-black text-slate-800">สถานะระบบรับสมัคร</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">เปิด/ปิด การรับสมัครออนไลน์</p>
                    </div>
                    <button 
                      onClick={() => {
                        const newSettings = {...settings, isOpen: !settings.isOpen};
                        setSettings(newSettings);
                        StorageService.saveSettings(newSettings);
                        showNotification(`✅ ${newSettings.isOpen ? 'เปิด' : 'ปิด'}ระบบรับสมัครเรียบร้อยแล้ว`, "success");
                      }}
                      className={`w-16 h-8 rounded-full p-1 transition-all duration-300 ${settings.isOpen ? 'bg-green-500' : 'bg-slate-300'}`}
                    >
                      <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${settings.isOpen ? 'translate-x-8' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1">ชื่อโรงเรียน</label>
                    <input 
                      value={settings.schoolName} 
                      onChange={e => setSettings({...settings, schoolName: e.target.value})}
                      className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 font-bold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1">ปีการศึกษา</label>
                    <input 
                      value={settings.admissionYear} 
                      onChange={e => setSettings({...settings, admissionYear: e.target.value})}
                      className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-blue-500 font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-black text-slate-800 border-b pb-2">การจัดการ Sheet</h3>
                  <div className="p-6 bg-yellow-50 rounded-2xl border-2 border-yellow-100">
                    <p className="text-xs text-yellow-700 font-bold mb-4">
                      หากคอลัมน์ใน Google Sheet ไม่ครบ หรือต้องการรีเซ็ตหัวข้อคอลัมน์ใหม่ (ไม่ลบข้อมูลเดิม)
                    </p>
                    <button 
                      onClick={handleSetupHeaders}
                      disabled={isLoading}
                      className="w-full bg-yellow-500 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-yellow-600 transition-all active:scale-95 flex items-center justify-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      <span>Setup Sheet Headers</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t flex justify-end">
                <button 
                  onClick={() => {
                    StorageService.saveSettings(settings);
                    showNotification("✅ บันทึกการตั้งค่าระบบเรียบร้อยแล้ว", "success");
                  }}
                  className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-black shadow-2xl hover:bg-slate-800 transition-all active:scale-95"
                >
                  บันทึกการตั้งค่าทั้งหมด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'apps' && (
        <div className="space-y-6">
          {/* Filters Section */}
          <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border no-print">
            <div className="p-8 bg-slate-50/50 border-b space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1 italic">ค้นหาข้อมูล</label>
                  <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="ชื่อ, รหัสสมัคร, รร.เดิม..." className="w-full p-3 rounded-xl border-2 font-bold outline-none focus:border-blue-500 bg-white" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1">ระดับชั้น</label>
                  <select value={filterLevel} onChange={e => { setFilterLevel(e.target.value); setFilterTrack('all'); }} className="w-full p-3 rounded-xl border-2 font-bold outline-none bg-white">
                    <option value="all">ทั้งหมด</option>
                    <option value={Level.M1}>ม.1</option>
                    <option value={Level.M4}>ม.4</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1">ประเภทห้องเรียน</label>
                  <select value={filterType} onChange={e => setFilterType(e.target.value)} className="w-full p-3 rounded-xl border-2 font-bold outline-none bg-white">
                    <option value="all">ทั้งหมด</option>
                    <option value="special">ห้องเรียนพิเศษ</option>
                    <option value="regular">ห้องเรียนปกติ</option>
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1">แผนการเรียน</label>
                  <select value={filterTrack} onChange={e => setFilterTrack(e.target.value)} className="w-full p-3 rounded-xl border-2 font-bold outline-none bg-white">
                    <option value="all">ทุกแผนการเรียน</option>
                    {trackOptions.map((t, i) => <option key={i} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1">สถานะ</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full p-3 rounded-xl border-2 font-bold outline-none bg-white">
                    <option value="all">ทุกสถานะ</option>
                    <option value={ApplicationStatus.PENDING}>รอตรวจสอบ</option>
                    <option value={ApplicationStatus.APPROVED}>อนุมัติแล้ว</option>
                    <option value={ApplicationStatus.DOC_ERROR}>แจ้งแก้ไขเอกสาร</option>
                    <option value={ApplicationStatus.REJECTED}>ปฏิเสธใบสมัคร</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t pt-6">
                <div className="flex-1 max-w-sm">
                   <label className="text-[10px] font-black text-slate-400 uppercase ml-1 block mb-1">กรองวันที่สมัคร</label>
                   <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="w-full p-3 rounded-xl border-2 font-bold outline-none focus:border-blue-500 bg-white" />
                </div>
                <button onClick={() => { setSearchTerm(''); setFilterLevel('all'); setFilterType('all'); setFilterStatus('all'); setFilterDate(''); setFilterTrack('all'); }} className="text-xs font-black text-blue-600 bg-blue-50 px-6 py-3 rounded-xl hover:bg-blue-100 transition-all border border-blue-200">ล้างตัวกรองทั้งหมด</button>
              </div>
            </div>

            <div className="bg-blue-900 px-8 py-4 text-white flex justify-between items-center shadow-inner">
              <div className="flex items-center space-x-6">
                 <div className="text-xs uppercase font-black opacity-60 tracking-widest italic">Applicant Summary</div>
                 <div className="text-2xl font-black">พบผู้สมัคร {filteredApps.length} รายการ</div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400 border-b">
                  <tr>
                    <th className="p-6">วันที่ / รหัส</th>
                    <th className="p-6">ชื่อ-นามสกุล / โรงเรียนเดิม</th>
                    <th className="p-6">แผนการเรียน</th>
                    <th className="p-6 text-center">ห้องสอบ</th>
                    <th className="p-6 text-center">GPAX</th>
                    <th className="p-6 text-center">สถานะ</th>
                    <th className="p-6 text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm bg-white">
                  {paginatedApps.length > 0 ? paginatedApps.map(app => (
                    <tr key={app.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="p-6">
                        <div className="font-black text-blue-600">{app.id}</div>
                        <div className="text-[10px] text-slate-400 font-bold">{new Date(app.submitDate).toLocaleDateString('th-TH')}</div>
                      </td>
                      <td className="p-6">
                        <div className="font-bold text-slate-800">{app.title}{app.firstName} {app.lastName}</div>
                        <div className="text-xs text-slate-400 font-medium italic line-clamp-1">{app.education.schoolName}</div>
                      </td>
                      <td className="p-6">
                        <div className="text-xs font-bold text-slate-600 line-clamp-1">{app.track}</div>
                        <div className={`text-[9px] uppercase font-black mt-1 ${app.trackType === 'special' ? 'text-purple-500' : 'text-orange-500'}`}>{app.trackType === 'special' ? 'Special' : 'Regular'}</div>
                      </td>
                      <td className="p-6 text-center">
                        <div className="text-xs font-black text-purple-600 bg-purple-50 px-2 py-1 rounded-lg border border-purple-100 inline-block">
                          {app.room || (app.examRoom ? `ห้องสอบที่ ${app.examRoom}` : '-')}
                        </div>
                      </td>
                      <td className="p-6 text-center font-black text-blue-700 text-lg">{app.education.gpa}</td>
                      <td className="p-6 text-center">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black ${
                          app.status === ApplicationStatus.APPROVED ? 'bg-green-100 text-green-700' : 
                          app.status === ApplicationStatus.REJECTED ? 'bg-red-100 text-red-700' : 
                          app.status === ApplicationStatus.DOC_ERROR ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="p-6 text-right">
                        <button 
                          onClick={(e) => { 
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedApp(app); 
                            setAdminNote(app.adminNote || ''); 
                            document.body.style.overflow = 'hidden';
                          }} 
                          className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg hover:bg-blue-600 transition-all hover:scale-105 active:scale-95"
                        >
                          ตรวจสอบข้อมูล
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="p-20 text-center text-slate-300 font-black italic text-xl">
                        ไม่พบข้อมูลตามที่ค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-6 bg-slate-50 border-t flex items-center justify-between">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Page {currentPage} of {totalPages} ({filteredApps.length} items)
                </div>
                <div className="flex space-x-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="px-4 py-2 rounded-xl border-2 font-black text-xs disabled:opacity-30 hover:bg-white transition-all"
                  >
                    Previous
                  </button>
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                      let pageNum = currentPage;
                      if (currentPage <= 3) pageNum = i + 1;
                      else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                      else pageNum = currentPage - 2 + i;
                      
                      if (pageNum < 1 || pageNum > totalPages) return null;

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 h-10 rounded-xl font-black text-xs transition-all ${currentPage === pageNum ? 'bg-blue-600 text-white shadow-md' : 'bg-white border text-slate-400 hover:text-blue-600'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="px-4 py-2 rounded-xl border-2 font-black text-xs disabled:opacity-30 hover:bg-white transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'rooms' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border no-print">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
              <div>
                <h2 className="text-2xl font-black text-purple-900 italic uppercase">Exam Room Management</h2>
                <p className="text-slate-500 font-bold">ตั้งค่าและจัดห้องสอบแยกตามระดับชั้นและแผนการเรียน</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-[10px] font-black text-green-700 uppercase tracking-widest">
                      อนุมัติแล้ว: {approvedCount} คน
                    </span>
                  </div>
                  {Object.entries(statusCounts).map(([status, count]) => (
                    <div key={status} className="bg-slate-50 px-3 py-1 rounded-full border border-slate-200 flex items-center space-x-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{status}: {count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="w-full lg:w-auto flex flex-wrap items-end gap-4 bg-purple-50 p-6 rounded-[2rem] border border-purple-100 shadow-sm">
                <div className="flex-grow lg:flex-grow-0">
                  <label className="text-[10px] font-black text-purple-400 uppercase mb-1 block">ระดับชั้น</label>
                  <select 
                    value={roomLevel} 
                    onChange={e => {
                      setRoomLevel(e.target.value);
                      setRoomTrack('all');
                    }} 
                    className="w-full p-3 rounded-xl border-2 font-black outline-none bg-white focus:border-purple-500"
                  >
                    <option value="all">ทั้งหมด (All Levels)</option>
                    <option value={Level.M1}>ม.1 (Grade 7)</option>
                    <option value={Level.M4}>ม.4 (Grade 10)</option>
                  </select>
                </div>
                <div className="flex-grow lg:flex-grow-0">
                  <label className="text-[10px] font-black text-purple-400 uppercase mb-1 block">แผนการเรียน</label>
                  <select 
                    value={roomTrack} 
                    onChange={e => setRoomTrack(e.target.value)} 
                    className="w-full p-3 rounded-xl border-2 font-black outline-none bg-white focus:border-purple-500 min-w-[180px]"
                  >
                    <option value="all">ทั้งหมด (All Tracks)</option>
                    {(roomLevel === Level.M1 ? M1_TRACKS : roomLevel === Level.M4 ? M4_TRACKS : []).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-purple-400 uppercase mb-1 block">จำนวนคน/ห้อง</label>
                  <input 
                    type="number" 
                    value={roomCapacity} 
                    onChange={e => setRoomCapacity(parseInt(e.target.value) || 30)} 
                    className="w-24 p-3 rounded-xl border-2 font-black outline-none bg-white focus:border-purple-500 text-center" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-purple-400 uppercase mb-1 block">จำนวนห้องสูงสุด</label>
                  <input 
                    type="number" 
                    value={roomMax} 
                    onChange={e => setRoomMax(parseInt(e.target.value) || 20)} 
                    className="w-24 p-3 rounded-xl border-2 font-black outline-none bg-white focus:border-purple-500 text-center" 
                  />
                </div>
                <button 
                  onClick={handleAutoAssignRooms}
                  disabled={isLoading}
                  className={`bg-purple-600 text-white px-8 py-3.5 rounded-xl font-black shadow-lg hover:bg-purple-700 active:scale-95 transition-all flex items-center justify-center space-x-2 flex-grow lg:flex-grow-0 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>กำลังประมวลผล...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                      <span>จัดห้องสอบอัตโนมัติ</span>
                    </>
                  )}
                </button>
              </div>
            </div>

              <div className="space-y-8">
                {/* Eligibility Info */}
                <div className="bg-blue-50 border-2 border-blue-100 p-6 rounded-[2rem] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <h4 className="font-black text-blue-900">คำแนะนำการจัดห้องสอบ</h4>
                      <p className="text-sm text-blue-700 font-medium">
                        ระบบจะแสดงเฉพาะนักเรียนที่มีสถานะ <span className="font-black underline">"อนุมัติแล้ว"</span> เท่านั้น <br/>
                        พบนักเรียนที่อนุมัติแล้วแต่ยังไม่มีห้องสอบ: <span className="text-red-600 font-black">{approvedWithoutRoom.length} คน</span>
                      </p>
                    </div>
                  </div>
                  {approvedWithoutRoom.length > 0 && (
                    <button 
                      onClick={() => fetchData()}
                      className="text-xs font-black text-blue-600 bg-white px-4 py-2 rounded-xl border border-blue-200 shadow-sm hover:bg-blue-50 transition-all"
                    >
                      รีเฟรชข้อมูล
                    </button>
                  )}
                </div>

              <div className="flex items-center space-x-4 bg-slate-50 p-6 rounded-[2rem] border">
                <div className="flex-grow">
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">เลือกดูรายชื่อห้องสอบ</label>
                  <select 
                    value={viewingRoom || ''} 
                    onChange={e => setViewingRoom(e.target.value || null)}
                    className="w-full p-4 rounded-2xl border-2 font-black outline-none bg-white focus:border-purple-500"
                  >
                    <option value="">-- เลือกห้องสอบที่ต้องการดู --</option>
                    {Object.keys(appsByRoom).sort().map(room => (
                      <option key={room} value={room}>{room} ({appsByRoom[room].length} คน)</option>
                    ))}
                  </select>
                </div>
                {viewingRoom && (
                  <div className="flex space-x-2 pt-5">
                    <button 
                      onClick={() => exportToExcel(viewingRoom)}
                      className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black shadow-lg hover:bg-emerald-700 transition-all flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      <span>Export XLS</span>
                    </button>
                    <button 
                      onClick={() => window.print()}
                      className="bg-purple-600 text-white px-6 py-4 rounded-2xl font-black shadow-lg hover:bg-purple-700 transition-all flex items-center space-x-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                      <span>Print PDF</span>
                    </button>
                  </div>
                )}
              </div>

              {viewingRoom ? (
                <div className="bg-white rounded-[2.5rem] border-2 border-purple-100 overflow-hidden shadow-inner animate-slide-up">
                  <div className="p-8 bg-purple-50/50 border-b flex justify-between items-center">
                    <h3 className="text-xl font-black text-purple-900">{viewingRoom}</h3>
                    <span className="bg-white px-4 py-1 rounded-full text-xs font-black text-purple-600 border border-purple-200">{appsByRoom[viewingRoom].length} รายชื่อ</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b bg-slate-50">
                        <tr>
                          <th className="p-5">ลำดับที่</th>
                          <th className="p-5">รหัสสมัคร (ID)</th>
                          <th className="p-5">ชื่อ-นามสกุล</th>
                          <th className="p-5">โรงเรียนเดิม</th>
                          <th className="p-5 text-center">GPAX</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {appsByRoom[viewingRoom].map((s, idx) => (
                          <tr key={s.id} className="hover:bg-purple-50/30 transition-colors">
                            <td className="p-5 font-black text-slate-400">{idx+1}</td>
                            <td className="p-5 font-black text-blue-600">{s.id}</td>
                            <td className="p-5 font-bold text-slate-800">{s.title}{s.firstName} {s.lastName}</td>
                            <td className="p-5 text-xs font-medium text-slate-500">{s.education.schoolName}</td>
                            <td className="p-5 text-center font-black text-slate-700">{s.education.gpa}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-slate-300 font-black italic text-2xl bg-slate-50 rounded-[3rem] border-4 border-dashed">
                  {Object.keys(appsByRoom).length > 0 ? 'กรุณาเลือกห้องสอบที่ต้องการดูรายชื่อ' : 'ยังไม่ได้จัดห้องสอบ หรือไม่พบรายชื่อที่อนุมัติ'}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW ROOM MODAL */}
      {viewingRoom && (
        <div className="fixed inset-0 bg-slate-900/80 z-[20000] flex items-center justify-center p-4 backdrop-blur-sm no-print">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-8 border-b bg-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-black text-slate-800">{viewingRoom}</h2>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">รายชื่อผู้มีสิทธิ์สอบ ({appsByRoom[viewingRoom]?.length || 0} คน)</p>
              </div>
              <div className="flex space-x-3">
                <button 
                  onClick={() => window.print()}
                  className="bg-purple-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-purple-700 transition-all flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                  <span>พิมพ์รายชื่อ</span>
                </button>
                <button onClick={() => setViewingRoom(null)} className="bg-slate-200 text-slate-500 p-3 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            </div>
            <div className="p-8 overflow-y-auto flex-grow">
              <table className="w-full text-left">
                <thead className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                  <tr>
                    <th className="pb-4">ลำดับ</th>
                    <th className="pb-4">รหัสสมัคร</th>
                    <th className="pb-4">ชื่อ-นามสกุล</th>
                    <th className="pb-4">โรงเรียนเดิม</th>
                    <th className="pb-4 text-center">GPAX</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {appsByRoom[viewingRoom]?.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-4 font-black text-slate-400">{idx+1}</td>
                      <td className="py-4 font-black text-blue-600">{s.id}</td>
                      <td className="py-4 font-bold text-slate-800">{s.title}{s.firstName} {s.lastName}</td>
                      <td className="py-4 text-xs font-medium text-slate-500">{s.education.schoolName}</td>
                      <td className="py-4 text-center font-black text-slate-700">{s.education.gpa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PRINT VERSION OF ROOM LIST */}
      {viewingRoom && (
        <div className="print-only p-10 bg-white text-black font-['Sarabun']">
          <div className="text-center mb-10 space-y-2">
             <h1 className="text-2xl font-black">ใบรายชื่อผู้มีสิทธิ์สอบคัดเลือกเข้าเรียน</h1>
             <p className="text-xl font-bold">โรงเรียนท่าบ่อ จังหวัดหนองคาย ปีการศึกษา {settings.admissionYear}</p>
             <div className="text-lg font-black bg-slate-100 py-2 rounded-xl mt-4 border-2 border-black inline-block px-10">
               {viewingRoom}
             </div>
          </div>
          <table className="w-full border-collapse border-2 border-black">
            <thead>
              <tr className="bg-slate-50">
                <th className="border-2 border-black p-3 text-center w-16">ลำดับ</th>
                <th className="border-2 border-black p-3 text-center w-32">รหัสสมัคร</th>
                <th className="border-2 border-black p-3 text-left">ชื่อ-นามสกุล</th>
                <th className="border-2 border-black p-3 text-left">โรงเรียนเดิม</th>
                <th className="border-2 border-black p-3 text-center w-24">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody>
              {appsByRoom[viewingRoom]?.map((s, idx) => (
                <tr key={s.id}>
                  <td className="border-2 border-black p-3 text-center font-bold">{idx+1}</td>
                  <td className="border-2 border-black p-3 text-center font-black">{s.id}</td>
                  <td className="border-2 border-black p-3 font-bold">{s.title}{s.firstName} {s.lastName}</td>
                  <td className="border-2 border-black p-3 text-sm">{s.education.schoolName}</td>
                  <td className="border-2 border-black p-3"></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-10 flex justify-between text-sm font-bold">
            <p>จำนวนนักเรียนทั้งหมด {appsByRoom[viewingRoom]?.length || 0} คน</p>
            <p>พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}</p>
          </div>
        </div>
      )}

      {(tab === 'scores-m1' || tab === 'scores-m4') && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border no-print">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h2 className="text-2xl font-black text-emerald-900 italic uppercase">Score Entry System (ม.{scoreLevel})</h2>
                <p className="text-slate-500 font-bold">บันทึกคะแนนสอบแยกตามห้องสอบและประเภทแผนการเรียน</p>
              </div>
              <div className="flex flex-wrap items-end gap-3 bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100">
                <div>
                  <label className="text-[10px] font-black text-emerald-400 uppercase mb-1 block">เลือกห้องสอบ</label>
                  <select 
                    value={selectedRoomForScores} 
                    onChange={e => setSelectedRoomForScores(e.target.value)}
                    className="p-3 rounded-xl border-2 font-black outline-none bg-white focus:border-emerald-500 min-w-[200px]"
                  >
                    <option value="">-- เลือกห้องสอบ --</option>
                    {Object.keys(appsByRoom)
                      .filter(r => {
                        const roomApps = appsByRoom[r];
                        return roomApps.length > 0 && String(roomApps[0].level).trim() === String(scoreLevel).trim();
                      })
                      .sort()
                      .map(r => <option key={r} value={r}>{r}</option>)
                    }
                  </select>
                </div>
                <button 
                  onClick={handleSaveScores}
                  disabled={Object.keys(editingScores).length === 0}
                  className="bg-emerald-600 text-white px-8 py-3.5 rounded-xl font-black shadow-lg hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50"
                >
                  บันทึกคะแนน
                </button>
              </div>
            </div>

            {selectedRoomForScores ? (
              <div className="overflow-x-auto rounded-[2rem] border-2 border-emerald-100 shadow-inner">
                <table className="w-full text-left">
                  <thead className="bg-emerald-50 text-[10px] uppercase font-black text-emerald-600 border-b">
                    <tr>
                      <th className="p-5">ลำดับ / ชื่อ-นามสกุล</th>
                      <th className="p-5 text-center">คณิต (100)</th>
                      <th className="p-5 text-center">วิทย์ (100)</th>
                      <th className="p-5 text-center">อังกฤษ (100)</th>
                      {appsByRoom[selectedRoomForScores]?.[0]?.trackType !== 'special' && (
                        <th className="p-5 text-center">ภาษาไทย (100)</th>
                      )}
                      <th className="p-5 text-center bg-emerald-100/50">รวม</th>
                      <th className="p-5 text-center bg-emerald-200/50">เฉลี่ย</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm bg-white">
                    {appsByRoom[selectedRoomForScores].map((s, idx) => {
                      const sc = editingScores[s.id] || s.scores || { math: 0, science: 0, english: 0, thai: 0, sum: 0, ave: 0 };
                      const isSpecial = s.trackType === 'special';
                      return (
                        <tr key={s.id} className="hover:bg-emerald-50/30 transition-colors">
                          <td className="p-5">
                            <div className="font-bold text-slate-800">{idx+1}. {s.firstName} {s.lastName}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{s.id}</div>
                          </td>
                          <td className="p-5">
                            <input 
                              type="number" 
                              value={sc.math} 
                              min="0"
                              max="100"
                              onChange={e => handleScoreChange(s.id, 'math', e.target.value)}
                              className="w-20 p-3 border-2 rounded-xl text-center font-black focus:border-emerald-500 outline-none bg-slate-50" 
                            />
                          </td>
                          <td className="p-5">
                            <input 
                              type="number" 
                              value={sc.science} 
                              min="0"
                              max="100"
                              onChange={e => handleScoreChange(s.id, 'science', e.target.value)}
                              className="w-20 p-3 border-2 rounded-xl text-center font-black focus:border-emerald-500 outline-none bg-slate-50" 
                            />
                          </td>
                          <td className="p-5">
                            <input 
                              type="number" 
                              value={sc.english} 
                              min="0"
                              max="100"
                              onChange={e => handleScoreChange(s.id, 'english', e.target.value)}
                              className="w-20 p-3 border-2 rounded-xl text-center font-black focus:border-emerald-500 outline-none bg-slate-50" 
                            />
                          </td>
                          {!isSpecial && (
                            <td className="p-5">
                              <input 
                                type="number" 
                                value={sc.thai} 
                                min="0"
                                max="100"
                                onChange={e => handleScoreChange(s.id, 'thai', e.target.value)}
                                className="w-20 p-3 border-2 rounded-xl text-center font-black focus:border-emerald-500 outline-none bg-slate-50" 
                              />
                            </td>
                          )}
                          <td className="p-5 text-center font-black text-emerald-700 bg-emerald-50/30 text-lg">{sc.sum.toFixed(1)}</td>
                          <td className="p-5 text-center font-black text-emerald-900 bg-emerald-100/20 text-lg">{sc.ave.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-32 text-center text-slate-300 font-black italic text-2xl bg-slate-50 rounded-[3rem] border-4 border-dashed">
                กรุณาเลือกห้องสอบเพื่อเริ่มบันทึกคะแนน
              </div>
            )}
          </div>
        </div>
      )}

      {(tab === 'classes-m1' || tab === 'classes-m4') && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-xl p-8 border no-print">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
              <div>
                <h2 className="text-2xl font-black text-orange-900 italic uppercase">Class Allocation (ม.{classLevel})</h2>
                <p className="text-slate-500 font-bold">จัดชั้นเรียนตามลำดับคะแนนสอบเฉลี่ย (สูงสุดไปต่ำสุด)</p>
                <div className="mt-4 flex space-x-2">
                  <button 
                    onClick={() => exportClassToExcel(`Class_Allocation_M${classLevel}`)}
                    className="bg-emerald-50 border-2 border-emerald-100 text-emerald-600 px-4 py-2 rounded-xl font-black text-xs hover:bg-emerald-100 transition-all flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <span>Export Excel</span>
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-3 bg-orange-50 p-6 rounded-[2rem] border border-orange-100">
                <div>
                  <label className="text-[10px] font-black text-orange-400 uppercase mb-1 block">แผนการเรียน</label>
                  <select 
                    value={classTrack} 
                    onChange={e => setClassTrack(e.target.value)}
                    className="w-full p-3 rounded-xl border-2 font-black outline-none bg-white focus:border-orange-500 min-w-[180px]"
                  >
                    <option value="all">ทั้งหมด (ทุกแผน)</option>
                    {(classLevel === Level.M1 ? M1_TRACKS : M4_TRACKS).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-orange-400 uppercase mb-1 block">จำนวนคน/ห้อง</label>
                  <input 
                    type="number" 
                    value={studentsPerClass} 
                    onChange={e => setStudentsPerClass(parseInt(e.target.value) || 40)}
                    className="w-24 p-3 rounded-xl border-2 font-black outline-none bg-white focus:border-orange-500 text-center" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-orange-400 uppercase mb-1 block">เริ่มที่ห้อง</label>
                  <input 
                    type="number" 
                    value={startRoom} 
                    onChange={e => setStartRoom(parseInt(e.target.value) || 1)}
                    className="w-20 p-3 rounded-xl border-2 font-black outline-none bg-white focus:border-orange-500 text-center" 
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-orange-400 uppercase mb-1 block">จำนวนห้องเรียน</label>
                  <input 
                    type="number" 
                    value={maxClasses} 
                    onChange={e => setMaxClasses(parseInt(e.target.value) || 14)}
                    className="w-24 p-3 rounded-xl border-2 font-black outline-none bg-white focus:border-orange-500 text-center" 
                  />
                </div>
                <button 
                  onClick={handleClassAllocation}
                  className="bg-orange-600 text-white px-8 py-3.5 rounded-xl font-black shadow-lg hover:bg-orange-700 active:scale-95 transition-all"
                >
                  เริ่มจัดชั้นเรียน
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: maxClasses }).map((_, i) => {
                const classNum = i + 1;
                const classStudents = apps.filter(a => a.assignedClass === `ห้อง ${classNum}` && a.level === classLevel);
                return (
                  <div key={classNum} className="bg-white rounded-[2rem] p-6 border-2 border-slate-100 shadow-sm hover:border-orange-200 transition-all flex flex-col group">
                    <div className="flex justify-between items-center mb-4 border-b pb-3">
                      <h3 className="font-black text-orange-800 text-lg group-hover:text-orange-600 transition-colors">ห้องที่ {classNum}</h3>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-full">{classStudents.length} คน</span>
                        <button 
                          onClick={() => window.print()}
                          className="p-1.5 text-slate-300 hover:text-orange-500 transition-colors"
                          title="พิมพ์รายชื่อห้อง"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1.5 flex-grow overflow-y-auto max-h-72 pr-1 custom-scrollbar">
                      {classStudents.sort((a,b) => (b.scores?.ave || 0) - (a.scores?.ave || 0)).map((s, idx) => (
                        <div key={s.id} className="text-[11px] flex justify-between items-center p-2 hover:bg-orange-50 rounded-xl transition-colors border border-transparent hover:border-orange-100">
                          <span className="font-bold text-slate-600 truncate mr-2">{idx+1}. {s.firstName} {s.lastName}</span>
                          <span className="font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full text-[9px]">{s.scores?.ave?.toFixed(2)}</span>
                        </div>
                      ))}
                      {classStudents.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-10 opacity-20">
                           <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                           <p className="text-[10px] font-black uppercase tracking-widest">Empty</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditing && editingApp && (
        <div className="fixed inset-0 bg-slate-900/90 z-[20000] flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl relative animate-slide-up text-left overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-black text-slate-800 uppercase italic">แก้ไขข้อมูลนักเรียน: {editingApp.id}</h2>
              <button 
                onClick={() => { setIsEditing(false); setEditingApp(null); }}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="overflow-y-auto p-2">
              <AdmissionForm 
                level={editingApp.level}
                settings={settings}
                initialData={editingApp}
                onCancel={() => { setIsEditing(false); setEditingApp(null); }}
                onFinish={handleFinishEdit}
              />
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL - FIXED Z-INDEX AND DISPLAY */}
      {selectedApp && (
        <div 
          className="fixed inset-0 bg-slate-900/90 z-[15000] flex items-center justify-center p-4 backdrop-blur-md no-print overflow-y-auto"
          onClick={() => {
            setSelectedApp(null);
            document.body.style.overflow = 'auto';
          }}
        >
          <div 
            className="bg-white w-full max-w-6xl rounded-[3rem] shadow-2xl relative animate-slide-up text-left overflow-hidden border-t-[12px] border-blue-600 max-h-[95vh] flex flex-col"
            onClick={e => e.stopPropagation()} 
          >
            {/* Modal Header */}
            <div className="p-8 border-b bg-white flex justify-between items-start flex-shrink-0">
              <div className="flex items-center space-x-8">
                <div className="w-24 h-32 bg-slate-100 rounded-2xl border-4 border-white shadow-xl overflow-hidden flex-shrink-0">
                  {getDisplayImg(selectedApp.files.photo) ? (
                    <img src={getDisplayImg(selectedApp.files.photo)!} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 italic"><span className="text-[10px] font-black uppercase">No Photo</span></div>
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-3 mb-2">
                     <span className={`px-4 py-1 rounded-full text-[10px] font-black text-white ${selectedApp.level === Level.M1 ? 'bg-blue-600' : 'bg-orange-600'}`}>ชั้น ม.{selectedApp.level}</span>
                     <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID: {selectedApp.id}</span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900">{selectedApp.title}{selectedApp.firstName} {selectedApp.lastName}</h2>
                  <p className="text-md text-slate-500 font-bold italic">เดิม: {selectedApp.education.schoolName}</p>
                  <div className="flex items-center space-x-4 mt-2">
                    <p className="text-sm font-black text-blue-600 tracking-widest">{selectedApp.phone}</p>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEditApplication(selectedApp)}
                        className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-blue-100 transition-all flex items-center space-x-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        <span>แก้ไขข้อมูล</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteApplication(selectedApp.id)}
                        className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-red-100 transition-all flex items-center space-x-1"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        <span>ลบข้อมูล</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => {
                  setSelectedApp(null);
                  document.body.style.overflow = 'auto';
                }} 
                className="bg-slate-100 text-slate-400 w-12 h-12 rounded-2xl flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all shadow-sm active:scale-90"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-10 overflow-y-auto flex-grow bg-slate-50">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                <div className="lg:col-span-8 space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 text-center shadow-sm">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">GPAX เฉลี่ยรวม</p>
                      <p className="text-5xl font-black text-emerald-600 leading-none">{selectedApp.education.gpa}</p>
                    </div>
                    <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 text-center shadow-sm">
                      <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">{selectedApp.education.subGpaSubject || 'เกรดเฉลี่ยรายวิชา'}</p>
                      <p className="text-5xl font-black text-blue-600 leading-none">{selectedApp.education.subGpa || '-'}</p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-[2rem] text-center text-white shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">สถานะใบสมัคร</p>
                      <p className="text-xl font-black text-yellow-400 pt-2 italic">{selectedApp.status}</p>
                    </div>
                  </div>

                  <div className="bg-white border rounded-[2.5rem] p-8 space-y-8 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">แผนการเรียนที่สมัคร</p>
                        <p className="text-xl font-black text-slate-800 underline decoration-blue-500 decoration-4 underline-offset-4">{selectedApp.track}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">เลขประจำตัวประชาชน</p>
                        <p className="text-xl font-black text-slate-800 tracking-tighter">{selectedApp.nationalId}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">วันเวลาที่สมัคร</p>
                        <p className="text-sm font-bold text-slate-600">{new Date(selectedApp.submitDate).toLocaleString('th-TH')}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">ที่อยู่ตามทะเบียนบ้าน</p>
                        <p className="text-xs font-bold text-slate-500">
                          ต.{selectedApp.address?.subDistrict || '-'} อ.{selectedApp.address?.district || '-'} จ.{selectedApp.address?.province || '-'} {selectedApp.address?.zipCode || ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border shadow-sm">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 block">บันทึกหมายเหตุจากเจ้าหน้าที่</label>
                    <textarea 
                      value={adminNote} 
                      onChange={e => setAdminNote(e.target.value)} 
                      placeholder="เช่น เอกสารไม่ชัดเจน..."
                      className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl h-32 font-bold text-sm outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner" 
                    />
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-8">
                  <div className="bg-white p-6 rounded-[2.5rem] border shadow-sm">
                    <h3 className="font-black text-slate-900 uppercase text-[10px] tracking-widest border-b pb-4 mb-4 flex items-center">
                       เอกสารหลักฐานประกอบ
                    </h3>
                    <div className="space-y-3">
                      {[
                        { field: 'houseReg', label: 'ทะเบียนบ้าน' },
                        { field: 'idCard', label: 'บัตรประชาชน' },
                        { field: 'transcript', label: 'ปพ.1 (หน้า)' },
                        { field: 'transcriptBack', label: 'ปพ.1 (หลัง)' }
                      ].map(doc => {
                        const url = getDisplayImg((selectedApp.files as any)[doc.field]);
                        return (
                          <div key={doc.field} className="p-4 rounded-2xl border-2 bg-slate-50 flex items-center justify-between group hover:border-blue-200 transition-all">
                            <span className="text-[11px] font-black text-slate-600 uppercase italic">{doc.label}</span>
                            {url ? (
                              <a href={url} target="_blank" rel="noreferrer" className="bg-blue-600 text-white text-[9px] px-4 py-2 rounded-xl font-black uppercase shadow-md hover:bg-blue-700 active:scale-90 transition-all">ดูไฟล์</a>
                            ) : (
                              <span className="text-[9px] font-black text-slate-300 uppercase">ไม่มีข้อมูล</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-black text-slate-900 uppercase text-[10px] tracking-widest italic text-center mb-4">ปรับปรุงสถานะ</h3>
                    <button onClick={() => updateStatus(ApplicationStatus.APPROVED)} className="w-full bg-green-500 text-white py-5 rounded-[1.5rem] font-black shadow-xl shadow-green-100 hover:bg-green-600 active:scale-95 transition-all flex items-center justify-center space-x-3">
                      <span>อนุมัติใบสมัคร</span>
                    </button>
                    <button onClick={() => updateStatus(ApplicationStatus.DOC_ERROR)} className="w-full bg-yellow-400 text-yellow-900 py-5 rounded-[1.5rem] font-black shadow-xl shadow-yellow-100 hover:bg-yellow-500 active:scale-95 transition-all flex items-center justify-center space-x-3">
                      <span>แจ้งแก้ไขเอกสาร</span>
                    </button>
                    <button onClick={() => updateStatus(ApplicationStatus.REJECTED)} className="w-full bg-red-500 text-white py-5 rounded-[1.5rem] font-black shadow-xl shadow-red-100 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center space-x-3">
                      <span>ปฏิเสธใบสมัคร</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-white border-t flex justify-end flex-shrink-0">
               <button 
                 onClick={() => {
                   setSelectedApp(null);
                   document.body.style.overflow = 'auto';
                 }} 
                 className="px-12 py-4 bg-slate-100 rounded-2xl font-black text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all active:scale-95 shadow-sm"
               >
                  ปิดหน้าต่างนี้
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
