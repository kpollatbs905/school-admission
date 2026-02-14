
import React, { useState } from 'react';
import { ApplicationData, Level } from '../types';

interface Props {
  data: ApplicationData;
}

const PrintLayout: React.FC<Props> = ({ data }) => {
  const currentYear = new Date().getFullYear() + 543;
  const [imgError, setImgError] = useState(false);
  const logoUrl = "https://drive.google.com/thumbnail?id=1IjjdJpQYPGN2DlNa7QGHznqRjCu-oE1D&sz=w1000";

  // Helper to get viewable image source
  const getDisplayImg = (val?: string) => {
    if (!val || val === 'UPLOADED') return null;
    if (val.startsWith('data:image')) return val;
    if (val.startsWith('http')) {
      // Convert Google Drive view links to direct thumbnail links
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

  const studentPhoto = getDisplayImg(data.files.photo);

  const getCheckmark = (field?: string) => {
    if (field && (field.startsWith('data:image') || field.startsWith('http') || field === 'UPLOADED')) return '✓';
    return '';
  };

  return (
    <div className="print-only mx-auto bg-white text-[11pt] text-left leading-relaxed font-['Sarabun']" style={{ width: '100%', minHeight: '290mm' }}>
      <div className="flex justify-between items-start mb-2">
        <div className="text-[10pt] space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border border-black flex items-center justify-center font-bold">
              {data.serviceArea === 'in' ? '✓' : ''}
            </div>
            <span>นักเรียนในเขตพื้นที่บริการ</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border border-black flex items-center justify-center font-bold">
              {data.serviceArea === 'out' ? '✓' : ''}
            </div>
            <span>นักเรียนนอกเขตพื้นที่บริการ</span>
          </div>
        </div>
        <div className="text-right">
          <div className="border border-black p-1 w-44 text-center">
            <span className="text-[9pt] font-bold block">รหัสอ้างอิงใบสมัคร</span>
            <span className="text-xl font-black">{data.id}</span>
          </div>
        </div>
      </div>

      <div className="border-2 border-black p-4 mb-6">
        <div className="flex items-center justify-center space-x-6">
          <div className="w-20 h-20 flex items-center justify-center overflow-hidden">
            {!imgError ? (
              <img 
                src={logoUrl} 
                alt="โลโก้โรงเรียน" 
                className="w-full h-full object-contain"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full border border-black flex items-center justify-center font-bold text-lg">TB</div>
            )}
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-black">ใบสมัครเข้าเรียน ชั้นมัธยมศึกษาปีที่ {data.level === Level.M1 ? '1' : '4'}</h1>
            <p className="text-xl font-bold">โรงเรียนท่าบ่อ จังหวัดหนองคาย ปีการศึกษา {currentYear}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        <div className="flex-grow space-y-3">
          <h2 className="font-black border-b border-black inline-block mb-2 uppercase italic text-blue-800">1. ข้อมูลส่วนตัว</h2>
          <div>ชื่อ-นามสกุล: <span className="font-bold text-lg">{data.title}{data.firstName} {data.lastName}</span></div>
          <div>เลขประจำตัวประชาชน: <span className="font-bold text-lg tracking-[2px]">{data.nationalId}</span></div>
          <div>วัน/เดือน/ปีเกิด: <span className="font-bold">{new Date(data.birthDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</span> อายุ {data.age} ปี</div>
          <div>เบอร์โทรศัพท์: <span className="font-bold">{data.phone}</span></div>
          <div>ที่อยู่ปัจจุบัน: <span className="font-bold">{data.address.houseNo} {data.address.village ? `ม.${data.address.moo} ${data.address.village}` : ''} ต.{data.address.subDistrict} อ.{data.address.district} จ.{data.address.province} {data.address.zipCode}</span></div>
          <div>ชื่อผู้ปกครอง: <span className="font-bold">{data.guardianName}</span></div>
          
          <h2 className="font-black border-b border-black inline-block mb-2 mt-6 uppercase italic text-blue-800">2. ข้อมูลการศึกษาและความประสงค์</h2>
          <div>โรงเรียนเดิม: <span className="font-bold">{data.education.schoolName}</span></div>
          <div>อำเภอ/จังหวัด: <span className="font-bold">{data.education.schoolDistrict} / {data.education.schoolProvince}</span></div>
          <div>ผลการเรียนเฉลี่ยสะสม (GPAX): <span className="font-bold text-xl">{data.education.gpa}</span></div>
          <div className="mt-4 p-4 border-2 border-black bg-slate-50">
            <div className="font-black text-sm mb-1 uppercase italic text-slate-500">แผนการเรียนที่สมัคร:</div>
            <div className="font-bold text-2xl underline text-slate-900">{data.track}</div>
            {data.education.subGpaSubject && (
              <div className="mt-2 text-blue-800 font-bold">
                <span>{data.education.subGpaSubject}: </span>
                <span className="font-black text-2xl">{data.education.subGpa}</span>
              </div>
            )}
          </div>
        </div>
        <div className="w-40 flex-shrink-0">
          <div className="border-2 border-black w-36 h-48 mx-auto flex flex-col items-center justify-center text-center p-2 text-[10pt] bg-white overflow-hidden">
            {studentPhoto ? (
              <img src={studentPhoto} className="w-full h-full object-cover" />
            ) : (
              <div className="text-slate-400 italic flex flex-col items-center justify-center h-full">
                {data.files.photo === 'UPLOADED' ? (
                  <>
                    <svg className="w-10 h-10 mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                    <span className="text-[8pt] font-bold">กำลังประมวลผลรูปถ่าย</span>
                  </>
                ) : (
                  <span>ติดรูปถ่าย<br/>ขนาด 1.5 นิ้ว</span>
                )}
              </div>
            )}
          </div>
          <div className="mt-4 text-[9pt] font-bold text-center border p-2 bg-slate-50">
            สถานะ: {data.status}
          </div>
        </div>
      </div>

      <div className="mt-8 border-t border-black pt-4">
        <h3 className="font-bold text-blue-800 underline mb-3">รายการหลักฐานที่แนบ (ตรวจสอบเบื้องต้น)</h3>
        <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-[10pt]">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border border-black flex items-center justify-center font-bold">{getCheckmark(data.files.photo)}</div>
            <span>รูปถ่ายหน้าตรงชุดนักเรียน</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border border-black flex items-center justify-center font-bold">{getCheckmark(data.files.houseReg)}</div>
            <span>สำเนาทะเบียนบ้าน</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border border-black flex items-center justify-center font-bold">{getCheckmark(data.files.idCard)}</div>
            <span>สำเนาบัตรประชาชน</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border border-black flex items-center justify-center font-bold">{getCheckmark(data.files.transcript)}</div>
            <span>ใบ ปพ.1 (ด้านหน้า)</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border border-black flex items-center justify-center font-bold">{getCheckmark(data.files.transcriptBack)}</div>
            <span>ใบ ปพ.1 (ด้านหลัง)</span>
          </div>
        </div>
      </div>

      <div className="mt-12 grid grid-cols-2 gap-12 text-center">
        <div className="space-y-16">
          <p className="font-bold">ลงชื่อ......................................................<br/>( {data.firstName} {data.lastName} )<br/>ผู้สมัคร</p>
        </div>
        <div className="space-y-16">
          <p className="font-bold">ลงชื่อ......................................................<br/>( {data.guardianName} )<br/>ผู้ปกครอง</p>
        </div>
      </div>

      <div className="mt-16 border-t-2 border-dashed border-slate-300 pt-8">
        <div className="grid grid-cols-3 gap-6">
          <div className="border-2 border-black p-4 h-32 flex flex-col items-center justify-center italic text-slate-400 font-bold border-dashed">
            <span className="text-[8pt] uppercase">School Seal</span>
            <span>ประทับตราโรงเรียน</span>
          </div>
          <div className="col-span-2 space-y-4 border-2 border-black p-4">
            <h3 className="font-bold underline text-center">สำหรับเจ้าหน้าที่รับสมัคร</h3>
            <p className="font-bold">ผลการตรวจสอบเอกสาร: [ ] ครบถ้วน [ ] ไม่ครบ (ระบุ)..................................</p>
            <p className="font-bold">ลงชื่อ............................................................เจ้าหน้าที่รับสมัคร</p>
          </div>
        </div>
      </div>
      
      <div className="mt-4 text-[8pt] text-slate-400 italic text-center">
        พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')} | พัฒนาโดย ระบบรับสมัครนักเรียนโรงเรียนท่าบ่อ
      </div>
    </div>
  );
};

export default PrintLayout;
