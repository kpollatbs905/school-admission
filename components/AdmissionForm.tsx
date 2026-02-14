
import React, { useState, useEffect } from 'react';
import { ApplicationData, Level, SystemSettings, ApplicationStatus } from '../types';
import { validateThaiID, formatPhone, calculateAge, searchThaiAddress } from '../utils/helpers';
import { StorageService } from '../services/storage';

interface Props {
  level: Level;
  settings: SystemSettings;
  onCancel: () => void;
  onFinish: (data: ApplicationData) => void;
}

const AdmissionForm: React.FC<Props> = ({ level, settings, onCancel, onFinish }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [existingNationalIds, setExistingNationalIds] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState<Partial<ApplicationData>>({
    id: StorageService.getNextId(level),
    level,
    status: ApplicationStatus.PENDING,
    submitDate: new Date().toISOString(),
    serviceArea: 'in',
    title: level === Level.M1 ? 'เด็กชาย' : 'นาย',
    firstName: '',
    lastName: '',
    nationalId: '',
    birthDate: '',
    age: 0,
    phone: '',
    fatherName: '',
    motherName: '',
    guardianName: '',
    address: { houseNo: '', village: '', moo: '', subDistrict: '', district: '', province: '', zipCode: '' },
    education: { 
      studentType: 'external', 
      schoolName: '', 
      schoolDistrict: '', 
      schoolProvince: '', 
      gpa: '',
      subGpa: '',
      subGpaSubject: '',
      m3Room: ''
    },
    track: '',
    trackType: 'regular', // Default
    talents: '',
    specialNeeds: '',
    files: { additional: [] }
  });

  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  const M1_TRACKS = {
    special: [
      { id: 'S1', name: 'ห้องเรียนพิเศษ วิทย์-คณิต (Talented Program)', subGpaLabel: 'ผลการเรียนเฉลี่ยวิชาวิทยาศาสตร์-คณิตศาสตร์' },
      { id: 'S2', name: 'ห้องเรียนพิเศษ ภาษาอังกฤษ (Mini English Program)', subGpaLabel: 'ผลการเรียนเฉลี่ยรายวิชาภาษาอังกฤษ' },
    ],
    regular: [
      { id: 'R1', name: 'ห้องเรียนปกติ', subGpaLabel: '' }
    ]
  };

  const M4_TRACKS = {
    special: [
      { id: 'S1', name: 'ห้องเรียนพิเศษ วิทยาศาสตร์-คณิตศาสตร์ (Talented Program)', subGpaLabel: 'ผลการเรียนเฉลี่ยวิชาวิทยาศาสตร์-คณิตศาสตร์' },
      { id: 'S2', name: 'ห้องเรียนพิเศษ วิทยาศาสตร์ (Gifted Science Program)', subGpaLabel: 'ผลการเรียนเฉลี่ยวิชาวิทยาศาสตร์และเทคโนโลยี' },
      { id: 'S3', name: 'ห้องเรียนพิเศษภาษาอังกฤษและการสื่อสาร (Gifted English and Communication Program)', subGpaLabel: 'ผลการเรียนเฉลี่ยรายวิชาภาษาอังกฤษ' },
    ],
    regular: [
      { id: '1', name: 'ห้องเรียนวิทยาศาสตร์-คณิตศาสตร์ (วิทยาศาสตร์สุขภาพ)', subGpaLabel: 'ผลการเรียนเฉลี่ยวิชาวิทยาศาสตร์-คณิตศาสตร์' },
      { id: '2', name: 'ห้องเรียนวิทยาศาสตร์-คณิตศาสตร์ (เตรียมวิศวกรรม)', subGpaLabel: 'ผลการเรียนเฉลี่ยวิชาวิทยาศาสตร์-คณิตศาสตร์' },
      { id: '3', name: 'ห้องเรียนวิทยาศาสตร์-คณิตศาสตร์ (วิทยาศาสตร์พลังสิบ)', subGpaLabel: 'ผลการเรียนเฉลี่ยวิชาวิทยาศาสตร์-คณิตศาสตร์' },
      { id: '4', name: 'ห้องเรียนวิทยาศาสตร์-คณิตศาสตร์ (ทั่วไป)', subGpaLabel: 'ผลการเรียนเฉลี่ยวิชาวิทยาศาสตร์-คณิตศาสตร์' },
      { id: '5', name: 'ห้องเรียนศิลป์-ภาษา (อังกฤษ จีน เกาหลี ญี่ปุ่น)', subGpaLabel: 'ผลการเรียนเฉลี่ยกลุ่มสาระฯภาษาต่างประเทศ' },
      { id: '6', name: 'ห้องเรียนศิลป์-สังคม (กีฬา Sport Talented Program)', subGpaLabel: '' },
      { id: '7', name: 'ห้องเรียนศิลป์-สังคม (ศิลป์ธุรกิจ: MOU ปัญญาภิวัฒน์)', subGpaLabel: '' },
      { id: '8', name: 'ห้องเรียนศิลป์-สังคม (ศิลป์ทั่วไป)', subGpaLabel: '' },
    ]
  };

  const currentTracks = level === Level.M1 ? M1_TRACKS : M4_TRACKS;

  useEffect(() => {
    // โหลดข้อมูลเก่าจากเครื่อง
    const localApps = StorageService.getApplications();
    const ids = new Set(localApps.map(a => a.nationalId));

    // โหลดข้อมูลจาก Google Sheet เพื่อตรวจสอบการสมัครซ้ำข้ามเครื่อง
    fetch("https://script.google.com/macros/s/AKfycbx3bxxSypIGOs76_JeNIiKm6iORFY6CPeox1GS5HyI_2M92w1b1RoeT1daepnYLlF5Syg/exec?action=read")
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          data.forEach((app: any) => {
             // ลบขีดออกเพื่อเทียบเลขล้วนๆ
             if (app.nationalId) ids.add(app.nationalId.replace(/-/g, ''));
          });
        }
        setExistingNationalIds(ids);
      })
      .catch(err => console.error("Could not fetch existing apps for duplicate check", err));
      
    // ใส่ข้อมูล Local ไว้ก่อนระหว่างรอ Network
    setExistingNationalIds(ids);
  }, []);

  useEffect(() => {
    if (formData.birthDate) {
      setFormData(prev => ({ ...prev, age: calculateAge(formData.birthDate!) }));
    }
  }, [formData.birthDate]);

  const handleAddressSearch = (query: string) => {
    if (query.length > 1) {
      setAddressSuggestions(searchThaiAddress(query));
    } else {
      setAddressSuggestions([]);
    }
  };

  const selectAddress = (item: any) => {
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address!,
        subDistrict: item.sub,
        district: item.dist,
        province: item.prov,
        zipCode: item.zip
      }
    }));
    setAddressSuggestions([]);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setValidationError("ไฟล์มีขนาดใหญ่เกินไป (จำกัด 2MB ต่อไฟล์)");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setPreviews(prev => ({ ...prev, [field]: base64 }));
        setFormData(prev => ({
          ...prev,
          files: { ...prev.files!, [field]: base64 }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTrackTypeChange = (type: 'special' | 'regular') => {
    setFormData(prev => ({
      ...prev,
      trackType: type,
      track: '', // Reset track selection when type changes
      education: {
        ...prev.education!,
        subGpaSubject: ''
      }
    }));
  };

  const handleTrackChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedTrackName = e.target.value;
    const trackObj = [...currentTracks.special, ...currentTracks.regular].find(t => t.name === selectedTrackName);
    
    setFormData(prev => ({
      ...prev,
      track: selectedTrackName,
      education: {
        ...prev.education!,
        subGpaSubject: trackObj?.subGpaLabel || ''
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Basic Validation
    if (!validateThaiID(formData.nationalId || '')) {
      setValidationError("เลขประจำตัวประชาชนไม่ถูกต้อง (ต้องเป็นตัวเลข 13 หลัก)");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Check for Duplicate Application
    const currentId = formData.nationalId?.replace(/-/g, '');
    let isDuplicate = false;
    
    // ตรวจสอบทั้งจากใน Set ที่โหลดมา และเช็ค Local Storage สดๆ อีกรอบกันพลาด
    if (currentId) {
      if (existingNationalIds.has(currentId)) isDuplicate = true;
      const freshLocalApps = StorageService.getApplications();
      if (freshLocalApps.some(app => app.nationalId.replace(/-/g, '') === currentId)) isDuplicate = true;
    }

    if (isDuplicate) {
      setValidationError("ท่านได้ทำการสมัครเรียบร้อยแล้ว ไม่สามารถสมัครซ้ำได้ หากต้องการตรวจสอบสถานะกรุณาไปที่เมนู 'ตรวจสอบสถานะ'");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    if (!formData.files?.photo) {
      setValidationError("กรุณาอัปโหลดรูปถ่ายหน้าตรงของผู้สมัคร");
      return;
    }

    if (!formData.track) {
      setValidationError("กรุณาเลือกแผนการเรียนที่ต้องการสมัคร");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // 1. บันทึกลง Local Storage ก่อนเพื่อเป็นข้อมูลสำรอง
      StorageService.saveApplication(formData as ApplicationData);
      
      // 2. ส่งข้อมูลไปยัง Google Cloud (Google Sheet + Drive)
      const cloudResult = await StorageService.submitToCloud(formData as ApplicationData);
      
      if (cloudResult.success) {
        setIsSubmitting(false);
        setShowSuccessMessage(true);
        setTimeout(() => {
          onFinish(formData as ApplicationData);
        }, 2000);
      } else {
        throw new Error(cloudResult.message || "ไม่สามารถบันทึกลง Google Sheet ได้");
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setValidationError(err.message || "เกิดข้อผิดพลาดในการส่งข้อมูล");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderFileSlot = (field: string, label: string) => (
    <div className={`p-4 bg-slate-50 border-2 border-dashed rounded-2xl relative group transition-all ${previews[field] ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-blue-300'}`}>
      <span className="text-[10px] font-black text-slate-400 block mb-2 uppercase group-hover:text-blue-500 transition-colors">{label}</span>
      <input type="file" accept="image/*" onChange={e => handleFile(e, field)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
      <div className={`h-8 flex items-center justify-center text-xs font-bold ${previews[field] ? 'text-green-600' : 'text-blue-600'}`}>
        {previews[field] ? '✓ เรียบร้อย' : '+ เลือกไฟล์'}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {isSubmitting && (
        <div className="fixed inset-0 bg-white/90 backdrop-blur-md z-[100] flex flex-col items-center justify-center animate-fade-in text-center p-6">
           <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
           <p className="font-black text-blue-900 text-xl">กำลังส่งข้อมูลไปยัง Google Sheet...</p>
           <p className="text-slate-500 text-sm mt-3 font-medium">ระบบกำลังอัปโหลดรูปภาพและบันทึกข้อมูล<br/>กรุณารอสักครู่ (อาจใช้เวลา 10-20 วินาที)</p>
        </div>
      )}

      {showSuccessMessage && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-xl z-[110] flex flex-col items-center justify-center animate-fade-in text-center p-6">
           <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mb-8 shadow-2xl animate-bounce">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
              </svg>
           </div>
           <h2 className="text-5xl font-black text-slate-900 tracking-tight mb-4">ส่งใบสมัครสำเร็จ!</h2>
           <p className="text-slate-500 text-xl font-bold">ข้อมูลถูกบันทึกลงฐานข้อมูลโรงเรียนเรียบร้อยแล้ว</p>
           <p className="text-blue-500 mt-4 font-medium animate-pulse">กำลังพาคุณไปดูใบสมัครฉบับเต็ม...</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
        {validationError && (
          <div className="bg-red-50 border-2 border-red-200 text-red-600 p-6 rounded-[2rem] flex items-center space-x-4 animate-shake shadow-lg shadow-red-50">
             <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             </div>
             <p className="font-black text-lg">{validationError}</p>
          </div>
        )}

        <div className={`p-10 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden ${level === Level.M1 ? 'bg-blue-600' : 'bg-orange-600'}`}>
          <div className="relative z-10">
            <h2 className="text-3xl font-black italic">ใบสมัครเข้าเรียน ชั้นมัธยมศึกษาปีที่ {level}</h2>
            <p className="opacity-80 font-bold">โรงเรียนท่าบ่อ จังหวัดหนองคาย ปีการศึกษา {new Date().getFullYear() + 543}</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-sm border space-y-4">
           <div className="flex flex-wrap gap-4">
              <label className={`flex-1 p-4 border-2 rounded-2xl cursor-pointer transition-all flex items-center space-x-3 ${formData.serviceArea === 'in' ? 'border-blue-600 bg-blue-50' : 'border-slate-100'}`}>
                 <input type="radio" checked={formData.serviceArea === 'in'} onChange={() => setFormData({...formData, serviceArea: 'in'})} />
                 <span className="font-black text-sm">นักเรียนในเขตพื้นที่บริการ</span>
              </label>
              <label className={`flex-1 p-4 border-2 rounded-2xl cursor-pointer transition-all flex items-center space-x-3 ${formData.serviceArea === 'out' ? 'border-blue-600 bg-blue-50' : 'border-slate-100'}`}>
                 <input type="radio" checked={formData.serviceArea === 'out'} onChange={() => setFormData({...formData, serviceArea: 'out'})} />
                 <span className="font-black text-sm">นักเรียนนอกเขตพื้นที่บริการ</span>
              </label>
           </div>
        </div>

        {/* Section 1: Personal Info */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border space-y-6">
          <h3 className="text-lg font-black text-blue-900 border-b pb-2 flex items-center">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3 text-sm italic">1</span>
            ข้อมูลส่วนตัวของผู้สมัคร
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
               <div className={`aspect-[3/4] bg-slate-50 border-2 border-dashed rounded-2xl flex items-center justify-center overflow-hidden relative shadow-inner transition-all ${previews.photo ? 'border-green-400' : 'border-slate-200'}`}>
                  {previews.photo ? <img src={previews.photo} className="w-full h-full object-cover" /> : <div className="text-center p-4"><div className="w-10 h-10 bg-slate-200 rounded-full mx-auto mb-2 flex items-center justify-center"><svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg></div><span className="text-[10px] text-slate-400 font-bold uppercase italic">ติดรูปถ่าย 1.5 นิ้ว</span></div>}
                  <input type="file" accept="image/*" onChange={e => handleFile(e, 'photo')} className="absolute inset-0 opacity-0 cursor-pointer" />
               </div>
            </div>
            <div className="md:col-span-3 space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">เลขประจำตัวประชาชน (13 หลัก)</label>
                    <input required maxLength={13} value={formData.nationalId} onChange={e => setFormData({...formData, nationalId: e.target.value})} className="w-full p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-black text-lg" placeholder="ใส่เฉพาะตัวเลข" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase">วัน/เดือน/ปีเกิด (พ.ศ.)</label>
                    <input required type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="w-full p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold" />
                  </div>
               </div>
               <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                  <div className="col-span-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase">คำนำหน้า</label>
                    <select value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold">
                       {level === Level.M1 ? (<><option>เด็กชาย</option><option>เด็กหญิง</option></>) : (<><option>นาย</option><option>นางสาว</option></>)}
                    </select>
                  </div>
                  <div className="col-span-2 md:col-span-3 grid grid-cols-2 gap-4">
                    <input required placeholder="ชื่อ" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold" />
                    <input required placeholder="นามสกุล" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold" />
                  </div>
               </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm font-bold">
            <input required placeholder="ชื่อบิดา" value={formData.fatherName} onChange={e => setFormData({...formData, fatherName: e.target.value})} className="w-full p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl" />
            <input required placeholder="ชื่อมารดา" value={formData.motherName} onChange={e => setFormData({...formData, motherName: e.target.value})} className="w-full p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl" />
            <input required placeholder="ชื่อผู้ปกครอง" value={formData.guardianName} onChange={e => setFormData({...formData, guardianName: e.target.value})} className="w-full p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl" />
            <input required value={formData.phone} onChange={e => setFormData({...formData, phone: formatPhone(e.target.value)})} className="w-full p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-black text-blue-600" placeholder="0XX-XXX-XXXX" />
          </div>
        </div>

        {/* Section 2: Address */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border space-y-4">
           <h3 className="text-lg font-black text-blue-900 border-b pb-2 flex items-center">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3 text-sm italic">2</span>
            ข้อมูลที่อยู่ปัจจุบัน
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <input placeholder="บ้านเลขที่" value={formData.address?.houseNo} onChange={e => setFormData({...formData, address: {...formData.address!, houseNo: e.target.value}})} className="p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold" />
             <input placeholder="ชื่อหมู่บ้าน" value={formData.address?.village} onChange={e => setFormData({...formData, address: {...formData.address!, village: e.target.value}})} className="p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold" />
             <input placeholder="หมู่ที่" value={formData.address?.moo} onChange={e => setFormData({...formData, address: {...formData.address!, moo: e.target.value}})} className="p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold" />
             <div className="relative">
                <input placeholder="ค้นหา ตำบล/อำเภอ" onChange={e => handleAddressSearch(e.target.value)} className="w-full p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold" />
                {addressSuggestions.length > 0 && (
                  <div className="absolute z-20 w-full bg-white border-2 border-blue-200 shadow-2xl rounded-2xl mt-1 max-h-40 overflow-y-auto p-2">
                     {addressSuggestions.map((item, idx) => (
                       <div key={idx} onClick={() => selectAddress(item)} className="p-3 hover:bg-blue-50 cursor-pointer text-xs rounded-xl transition-colors">
                          ต.<strong>{item.sub}</strong> อ.<strong>{item.dist}</strong> จ.{item.prov}
                       </div>
                     ))}
                  </div>
                )}
             </div>
          </div>
          <input readOnly value={formData.address?.subDistrict ? `ต.${formData.address.subDistrict} อ.${formData.address.district} จ.${formData.address.province} ${formData.address.zipCode}` : ''} className="w-full p-3 bg-slate-100 border-transparent rounded-xl text-slate-500 italic text-sm font-bold" placeholder="ระบบจะกรอกตำบล/อำเภอ/จังหวัดให้อัตโนมัติ" />
        </div>

        {/* Section 3: Education */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border space-y-6">
          <h3 className="text-lg font-black text-blue-900 border-b pb-2 flex items-center">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3 text-sm italic">3</span>
            การศึกษาและความประสงค์เข้าเรียน
          </h3>

          <div className="space-y-4">
             <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-2xl">
                {level === Level.M1 ? (
                  <>
                    <label className="flex items-center space-x-2 cursor-pointer">
                       <input type="radio" checked={formData.education?.studentType === 'internal'} onChange={() => setFormData({...formData, education: {...formData.education!, studentType: 'internal'}})} />
                       <span className="text-sm font-bold">กำลังเรียน ชั้น ป.6</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                       <input type="radio" checked={formData.education?.studentType === 'external'} onChange={() => setFormData({...formData, education: {...formData.education!, studentType: 'external'}})} />
                       <span className="text-sm font-bold">จบชั้น ป.6 แล้ว</span>
                    </label>
                  </>
                ) : (
                  <>
                    <label className="flex items-center space-x-2 cursor-pointer">
                       <input type="radio" checked={formData.education?.studentType === 'internal'} onChange={() => setFormData({...formData, education: {...formData.education!, studentType: 'internal', schoolName: 'โรงเรียนท่าบ่อ'}})} />
                       <span className="text-sm font-bold">นักเรียน รร.เดิม (ท่าบ่อ)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                       <input type="radio" checked={formData.education?.studentType === 'external'} onChange={() => setFormData({...formData, education: {...formData.education!, studentType: 'external'}})} />
                       <span className="text-sm font-bold">นักเรียนจาก รร.อื่น</span>
                    </label>
                  </>
                )}
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="ชื่อโรงเรียนเดิม" value={formData.education?.schoolName} onChange={e => setFormData({...formData, education: {...formData.education!, schoolName: e.target.value}})} className="p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold" />
                <div className="grid grid-cols-2 gap-4">
                   <input required placeholder="อำเภอโรงเรียน" value={formData.education?.schoolDistrict} onChange={e => setFormData({...formData, education: {...formData.education!, schoolDistrict: e.target.value}})} className="p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold" />
                   <input required placeholder="จังหวัดโรงเรียน" value={formData.education?.schoolProvince} onChange={e => setFormData({...formData, education: {...formData.education!, schoolProvince: e.target.value}})} className="p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold" />
                </div>
             </div>

             <div className="p-6 bg-blue-50 rounded-2xl border-2 border-blue-100">
                <label className="text-[10px] font-black text-blue-400 uppercase font-bold block mb-2">
                   {level === Level.M1 ? 'ผลการเรียนเฉลี่ยรวม ป.4-ป.5 (GPAX)' : 'ผลการเรียนเฉลี่ยรวม 5 ภาคเรียน (GPAX)'}
                </label>
                <input required type="number" step="0.01" value={formData.education?.gpa} onChange={e => setFormData({...formData, education: {...formData.education!, gpa: e.target.value}})} className="w-full p-4 bg-white border-2 border-transparent focus:border-blue-500 rounded-xl font-black text-3xl text-blue-600 shadow-sm" placeholder="0.00" />
             </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 space-y-6">
            <h3 className="text-lg font-black text-blue-900 border-b pb-2 flex items-center">
              <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3 text-sm italic">3.1</span>
              เลือกแผนการเรียน (Study Plan)
            </h3>

            {/* 1. Select Type */}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleTrackTypeChange('special')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${formData.trackType === 'special' ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-md scale-105' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-purple-200'}`}
              >
                <span className="text-2xl mb-1">💎</span>
                <span className="font-black">ห้องเรียนพิเศษ</span>
                <span className="text-[10px] opacity-70">Special Program</span>
              </button>

              <button
                type="button"
                onClick={() => handleTrackTypeChange('regular')}
                className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${formData.trackType === 'regular' ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-md scale-105' : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-orange-200'}`}
              >
                <span className="text-2xl mb-1">🎓</span>
                <span className="font-black">ห้องเรียนปกติ</span>
                <span className="text-[10px] opacity-70">Regular Program</span>
              </button>
            </div>

            {/* 2. Select Track Dropdown */}
            <div className="relative animate-fade-in">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">
                 {formData.trackType === 'special' ? 'รายชื่อห้องเรียนพิเศษ' : 'รายชื่อห้องเรียนปกติ'}
              </label>
              <select 
                value={formData.track} 
                onChange={handleTrackChange}
                className="w-full p-4 bg-slate-50 border-2 border-slate-200 focus:border-blue-500 rounded-2xl font-bold text-slate-700 outline-none appearance-none cursor-pointer hover:bg-white transition-colors"
              >
                <option value="">-- กรุณาเลือกแผนการเรียน --</option>
                {(formData.trackType === 'special' ? currentTracks.special : currentTracks.regular).map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-10 pointer-events-none text-slate-400">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>

            {/* 3. GPA Requirement */}
            {formData.education?.subGpaSubject && (
                <div className="p-6 bg-yellow-50 rounded-2xl border-2 border-yellow-200 animate-slide-up">
                   <div className="flex items-center mb-2 text-yellow-800">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-xs font-black uppercase">เกณฑ์คะแนนสะสมที่ใช้พิจารณา</span>
                   </div>
                   <label className="text-sm font-bold text-slate-700 block mb-2">{formData.education.subGpaSubject}</label>
                   <input required type="number" step="0.01" value={formData.education.subGpa} onChange={e => setFormData({...formData, education: {...formData.education!, subGpa: e.target.value}})} className="w-full p-3 bg-white border-2 border-yellow-200 focus:border-yellow-500 rounded-xl font-black text-2xl text-yellow-700 shadow-sm placeholder:text-yellow-200/50" placeholder="0.00" />
                </div>
            )}
          </div>
        </div>

        {/* Section 4: Files */}
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border space-y-6">
           <h3 className="text-lg font-black text-blue-900 border-b pb-2 flex items-center">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3 text-sm italic">4</span>
            หลักฐานที่แนบมาพร้อมใบสมัคร
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
             {renderFileSlot('photo', 'รูปถ่ายชุดนักเรียน')}
             {renderFileSlot('houseReg', 'สำเนาทะเบียนบ้าน')}
             {renderFileSlot('idCard', 'สำเนาบัตรประชาชน')}
             {renderFileSlot('transcript', 'ใบ ปพ.1 (ด้านหน้า)')}
             {renderFileSlot('transcriptBack', 'ใบ ปพ.1 (ด้านหลัง)')}
          </div>
        </div>

        <div className="flex flex-col space-y-4 p-8 bg-slate-900 rounded-[3rem] shadow-2xl">
           <div className="flex justify-between items-center w-full">
              <button type="button" onClick={onCancel} className="font-black text-slate-400 hover:text-white transition-colors">ย้อนกลับ</button>
              <button type="submit" disabled={isSubmitting || showSuccessMessage} className={`px-16 py-5 rounded-[1.5rem] font-black text-white shadow-2xl transition-all active:scale-95 disabled:opacity-50 text-lg ${level === Level.M1 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                 {isSubmitting ? 'กำลังส่งข้อมูล...' : 'ยืนยันการส่งใบสมัคร'}
              </button>
           </div>
        </div>
      </form>
    </div>
  );
};

export default AdmissionForm;
