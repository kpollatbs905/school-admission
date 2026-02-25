
import React, { useState, useEffect } from 'react';
import { ApplicationData, Level, SystemSettings, ApplicationStatus } from '../types';
import { validateThaiID, formatPhone, calculateAge, searchThaiAddress } from '../utils/helpers';
import { StorageService } from '../services/storage';

interface Props {
  level: Level;
  settings: SystemSettings;
  initialData?: ApplicationData;
  onCancel: () => void;
  onFinish: (data: ApplicationData) => void;
}

const AdmissionForm: React.FC<Props> = ({ level, settings, initialData, onCancel, onFinish }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false);
  
  const [formData, setFormData] = useState<Partial<ApplicationData>>(initialData || {
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
    trackType: 'regular',
    talents: '',
    specialNeeds: '',
    files: { additional: [] }
  });

  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData?.files) {
      const p: Record<string, string> = {};
      Object.entries(initialData.files).forEach(([k, v]) => {
        if (typeof v === 'string' && (v.startsWith('data:') || v.startsWith('http'))) {
          p[k] = v;
        }
      });
      setPreviews(p);
    }
  }, [initialData]);

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

  // Removed heavy pre-fetch of all IDs to improve loading speed

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
      if (file.size > 2.5 * 1024 * 1024) {
        alert("ไฟล์มีขนาดใหญ่เกินไป (จำกัด 2.5MB ต่อไฟล์) กรุณาย่อขนาดไฟล์ภาพ");
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!validateThaiID(formData.nationalId || '')) {
      setValidationError("เลขประจำตัวประชาชนไม่ถูกต้อง");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const currentId = formData.nationalId?.replace(/\D/g, '');
    if (!initialData && currentId) {
      try {
        setIsCheckingDuplicate(true);
        const scriptUrl = StorageService.getScriptUrl();
        const checkRes = await fetch(`${scriptUrl}?action=checkDuplicate&id=${currentId}&t=${Date.now()}`);
        const checkResult = await checkRes.json();
        
        if (checkResult.exists) {
          setValidationError("ท่านได้ทำการสมัครเรียบร้อยแล้ว ไม่สามารถสมัครซ้ำได้ หากต้องการแก้ไขข้อมูลกรุณาติดต่อเจ้าหน้าที่");
          setIsCheckingDuplicate(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      } catch (err) {
        console.error("Duplicate check failed:", err);
        // If check fails, we might want to proceed or show error. 
        // Proceeding is riskier for duplicates but better for UX if script is slow.
      } finally {
        setIsCheckingDuplicate(false);
      }
    }
    
    if (!formData.files?.photo && !initialData) {
      setValidationError("กรุณาอัปโหลดรูปถ่าย");
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await StorageService.submitToCloud(formData as ApplicationData);
      
      if (result.success) {
        setIsSubmitting(false);
        setShowSuccessMessage(true);
        setTimeout(() => {
          onFinish(formData as ApplicationData);
        }, 2000);
      } else {
        throw new Error(result.message || "เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setValidationError(err.message || "การส่งข้อมูลล้มเหลว กรุณาลองใหม่อีกครั้ง");
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderFileSlot = (field: string, label: string) => (
    <div className={`p-4 bg-slate-50 border-2 border-dashed rounded-2xl relative group transition-all ${previews[field] ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-blue-300'}`}>
      <span className="text-[10px] font-black text-slate-400 block mb-2 uppercase group-hover:text-blue-500 transition-colors">{label}</span>
      <input type="file" accept="image/*" onChange={e => handleFile(e, field)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
      <div className={`h-8 flex items-center justify-center text-xs font-bold ${previews[field] ? 'text-green-600' : 'text-blue-600'}`}>
        {previews[field] ? '✓ พร้อมอัปโหลด' : '+ เลือกไฟล์'}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {(isSubmitting || isCheckingDuplicate) && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-md z-[100] flex flex-col items-center justify-center text-center p-6 animate-fade-in">
           <div className="relative mb-8">
             <div className="w-24 h-24 border-8 border-slate-100 rounded-full"></div>
             <div className="w-24 h-24 border-8 border-blue-600 border-t-transparent rounded-full animate-spin absolute top-0"></div>
             <div className="absolute inset-0 flex items-center justify-center text-blue-600 font-black">TBS</div>
           </div>
           <p className="font-black text-blue-900 text-3xl italic mb-2">{isCheckingDuplicate ? 'กำลังตรวจสอบข้อมูล...' : 'กำลังอัปโหลดไฟล์...'}</p>
           <p className="text-slate-500 font-bold mb-4 text-lg">{isCheckingDuplicate ? 'โปรดรอสักครู่ ระบบกำลังตรวจสอบเลขบัตรประชาชน' : 'โปรดอย่าปิดหน้าจอนี้ จนกว่าจะบันทึกสำเร็จ'}</p>
           <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-600 animate-[progress_4s_infinite]"></div>
           </div>
           <style>{`
             @keyframes progress { 0% { width: 0%; transform: translateX(-100%); } 100% { width: 100%; transform: translateX(100%); } }
           `}</style>
        </div>
      )}

      {showSuccessMessage && (
        <div className="fixed inset-0 bg-white/95 backdrop-blur-xl z-[110] flex flex-col items-center justify-center animate-fade-in text-center p-6">
           <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mb-8 shadow-2xl animate-bounce">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
              </svg>
           </div>
           <h2 className="text-5xl font-black text-slate-900 tracking-tight mb-4">บันทึกข้อมูลสำเร็จ!</h2>
           <p className="text-slate-500 text-xl font-bold italic">ระบบตรวจสอบไฟล์แนบเรียบร้อยแล้ว</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8 animate-slide-up">
        {validationError && (
          <div className="bg-red-50 border-2 border-red-200 text-red-600 p-6 rounded-[2rem] flex items-center space-x-4 shadow-lg">
             <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
             </div>
             <p className="font-black text-lg">{validationError}</p>
          </div>
        )}

        <div className={`p-10 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden ${level === Level.M1 ? 'bg-blue-600' : 'bg-orange-600'}`}>
          <div className="relative z-10">
            <h2 className="text-3xl font-black italic">{initialData ? 'แก้ไขใบสมัคร' : 'ใบสมัครเข้าเรียน'} ชั้นมัธยมศึกษาปีที่ {level}</h2>
            <p className="opacity-80 font-bold">โรงเรียนท่าบ่อ จังหวัดหนองคาย ปีการศึกษา {settings.admissionYear}</p>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-sm border space-y-6">
          <h3 className="text-lg font-black text-blue-900 border-b pb-2 flex items-center">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3 text-sm italic">1</span>
            ข้อมูลส่วนตัวของผู้สมัคร
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
               <div className={`aspect-[3/4] bg-slate-50 border-2 border-dashed rounded-2xl flex items-center justify-center overflow-hidden relative shadow-inner transition-all ${previews.photo ? 'border-green-400' : 'border-slate-200'}`}>
                  {previews.photo ? <img src={previews.photo} className="w-full h-full object-cover" loading="lazy" /> : <div className="text-center p-4"><div className="w-10 h-10 bg-slate-200 rounded-full mx-auto mb-2 flex items-center justify-center"><svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4"/></svg></div><span className="text-[10px] text-slate-400 font-bold uppercase italic">ติดรูปถ่าย 1.5 นิ้ว</span></div>}
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
                    <label className="text-[10px] font-black text-slate-400 uppercase">วัน/เดือน/ปีเกิด</label>
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

        <div className="bg-white p-8 rounded-[2rem] shadow-sm border space-y-4">
           <h3 className="text-lg font-black text-blue-900 border-b pb-2 flex items-center">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3 text-sm italic">2</span>
            ข้อมูลที่อยู่ปัจจุบัน
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <input placeholder="บ้านเลขที่" value={formData.address?.houseNo} onChange={e => setFormData({...formData, address: {...formData.address!, houseNo: e.target.value}})} className="p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold" />
             <input placeholder="หมู่บ้าน" value={formData.address?.village} onChange={e => setFormData({...formData, address: {...formData.address!, village: e.target.value}})} className="p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold" />
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
          <input readOnly value={formData.address?.subDistrict ? `ต.${formData.address.subDistrict} อ.${formData.address.district} จ.${formData.address.province} ${formData.address.zipCode}` : ''} className="w-full p-3 bg-slate-100 border-transparent rounded-xl text-slate-500 italic text-sm font-bold" placeholder="ระบบจะกรอกข้อมูลให้อัตโนมัติ" />
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-sm border space-y-6">
          <h3 className="text-lg font-black text-blue-900 border-b pb-2 flex items-center">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3 text-sm italic">3</span>
            การศึกษาและความประสงค์เข้าเรียน
          </h3>

          <div className="space-y-4">
             {/* แสดงประเภทนักเรียนเฉพาะ ม.4 เท่านั้น */}
             {level === Level.M4 && (
                <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-2xl">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="radio" checked={formData.education?.studentType === 'internal'} onChange={() => setFormData({
                        ...formData, 
                        education: {
                          ...formData.education!, 
                          studentType: 'internal', 
                          schoolName: 'โรงเรียนท่าบ่อ',
                          schoolDistrict: 'ท่าบ่อ',
                          schoolProvince: 'หนองคาย'
                        }
                      })} />
                      <span className="text-sm font-bold">นักเรียน รร.เดิม (ท่าบ่อ)</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="radio" checked={formData.education?.studentType === 'external'} onChange={() => setFormData({
                        ...formData, 
                        education: {
                          ...formData.education!, 
                          studentType: 'external',
                          schoolName: '',
                          schoolDistrict: '',
                          schoolProvince: ''
                        }
                      })} />
                      <span className="text-sm font-bold">นักเรียนจาก รร.อื่น</span>
                    </label>
                </div>
             )}

             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input required placeholder="ชื่อโรงเรียนเดิม" value={formData.education?.schoolName} onChange={e => setFormData({...formData, education: {...formData.education!, schoolName: e.target.value}})} className="p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold" />
                <div className="grid grid-cols-2 gap-4">
                   <input required placeholder="อำเภอโรงเรียน" value={formData.education?.schoolDistrict} onChange={e => setFormData({...formData, education: {...formData.education!, schoolDistrict: e.target.value}})} className="p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold" />
                   <input required placeholder="จังหวัดโรงเรียน" value={formData.education?.schoolProvince} onChange={e => setFormData({...formData, education: {...formData.education!, schoolProvince: e.target.value}})} className="p-3 bg-slate-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold" />
                </div>
             </div>

             <div className="p-6 bg-blue-50 rounded-2xl border-2 border-blue-100">
                <label className="text-[10px] font-black text-blue-400 uppercase font-bold block mb-2">
                   ผลการเรียนเฉลี่ยรวม (GPAX)
                </label>
                <input required type="number" step="0.01" value={formData.education?.gpa} onChange={e => setFormData({...formData, education: {...formData.education!, gpa: e.target.value}})} className="w-full p-4 bg-white border-2 border-transparent focus:border-blue-500 rounded-xl font-black text-3xl text-blue-600 shadow-sm" placeholder="0.00" />
             </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 space-y-6">
            <h3 className="text-lg font-black text-blue-900 border-b pb-2 flex items-center">
              <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3 text-sm italic">3.1</span>
              เลือกแผนการเรียน
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <button type="button" onClick={() => setFormData({...formData, trackType: 'special', track: ''})} className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${formData.trackType === 'special' ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-md scale-105' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                <span className="text-2xl mb-1">💎</span>
                <span className="font-black">ห้องเรียนพิเศษ</span>
              </button>
              <button type="button" onClick={() => setFormData({...formData, trackType: 'regular', track: ''})} className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${formData.trackType === 'regular' ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-md scale-105' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                <span className="text-2xl mb-1">🎓</span>
                <span className="font-black">ห้องเรียนปกติ</span>
              </button>
            </div>

            <div className="relative">
              <select value={formData.track} onChange={e => {
                const trackName = e.target.value;
                const trackObj = [...currentTracks.special, ...currentTracks.regular].find(t => t.name === trackName);
                setFormData({
                  ...formData, 
                  track: trackName, 
                  education: {...formData.education!, subGpaSubject: trackObj?.subGpaLabel || ''}
                });
              }} className="w-full p-4 bg-slate-50 border-2 border-slate-200 focus:border-blue-500 rounded-2xl font-bold text-slate-700 outline-none">
                <option value="">-- กรุณาเลือกแผนการเรียน --</option>
                {(formData.trackType === 'special' ? currentTracks.special : currentTracks.regular).map(t => (
                  <option key={t.id} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>

            {formData.education?.subGpaSubject && (
                <div className="p-6 bg-yellow-50 rounded-2xl border-2 border-yellow-200">
                   <label className="text-sm font-bold text-slate-700 block mb-2">{formData.education.subGpaSubject}</label>
                   <input required type="number" step="0.01" value={formData.education.subGpa} onChange={e => setFormData({...formData, education: {...formData.education!, subGpa: e.target.value}})} className="w-full p-3 bg-white border-2 border-yellow-200 focus:yellow-500 rounded-xl font-black text-2xl text-yellow-700 shadow-sm" placeholder="0.00" />
                </div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2rem] shadow-sm border space-y-6">
           <h3 className="text-lg font-black text-blue-900 border-b pb-2 flex items-center">
            <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center mr-3 text-sm italic">4</span>
            หลักฐานที่แนบมาพร้อมใบสมัคร
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
             {renderFileSlot('photo', 'รูปถ่าย')}
             {renderFileSlot('houseReg', 'ทะเบียนบ้าน')}
             {renderFileSlot('idCard', 'บัตรประชาชน')}
             {renderFileSlot('transcript', 'ปพ.1 (หน้า)')}
             {renderFileSlot('transcriptBack', 'ปพ.1 (หลัง)')}
          </div>
        </div>

        <div className="flex flex-col space-y-4 p-8 bg-slate-900 rounded-[3rem] shadow-2xl">
           <div className="flex justify-between items-center w-full">
              <button type="button" onClick={onCancel} className="font-black text-slate-400 hover:text-white transition-colors">ยกเลิก</button>
              <button type="submit" disabled={isSubmitting || showSuccessMessage || isCheckingDuplicate} className={`px-16 py-5 rounded-[1.5rem] font-black text-white shadow-2xl transition-all active:scale-95 disabled:opacity-50 text-lg ${level === Level.M1 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-orange-600 hover:bg-orange-700'}`}>
                 {isSubmitting ? 'กำลังส่งข้อมูล...' : isCheckingDuplicate ? 'กำลังตรวจสอบ...' : (initialData ? 'บันทึกการแก้ไข' : 'ยืนยันการส่งใบสมัคร')}
              </button>
           </div>
        </div>
      </form>
    </div>
  );
};

export default AdmissionForm;
