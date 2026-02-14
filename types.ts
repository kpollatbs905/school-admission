
export enum Level {
  M1 = 'ม.1',
  M4 = 'ม.4'
}

export enum ApplicationStatus {
  PENDING = 'รอตรวจสอบ',
  APPROVED = 'อนุมัติ',
  REJECTED = 'ปฏิเสธ/แก้ไข',
  DOC_ERROR = 'เอกสารไม่ถูกต้อง'
}

export enum FileUploadMode {
  REQUIRED = 'บังคับอัปโหลด',
  OPTIONAL = 'ไม่บังคับอัปโหลด',
  DISABLED = 'ปิดใช้งาน'
}

export interface Address {
  houseNo: string;
  village: string;
  moo: string;
  subDistrict: string;
  district: string;
  province: string;
  zipCode: string;
}

export interface ApplicationData {
  id: string;
  level: Level;
  status: ApplicationStatus;
  submitDate: string;
  serviceArea: 'in' | 'out'; // ในเขต / นอกเขต
  title: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  birthDate: string;
  age: number;
  phone: string;
  
  fatherName: string;
  motherName: string;
  guardianName: string;
  
  address: Address;
  
  education: {
    studentType: 'internal' | 'external'; // ม.4: รร.เดิม / รร.อื่น, ม.1: กำลังเรียน / จบ
    schoolName: string;
    schoolDistrict: string;
    schoolProvince: string;
    gpa: string;
    subGpa?: string; // เกรดเฉลี่ยเฉพาะวิชา
    subGpaSubject?: string; // ชื่อวิชาของเกรดเฉลี่ยเฉพาะ
    m3Room?: string; // สำหรับ ม.4 รร.เดิม
  };
  
  track: string;
  trackType: 'special' | 'regular';
  talents: string;
  specialNeeds: string;
  
  files: {
    photo?: string;
    houseReg?: string;
    idCard?: string;
    transcript?: string;
    transcriptBack?: string; // เพิ่มฟิลด์ใบ ปพ.1 ด้านหลัง
    paymentSlip?: string;
    additional: { name: string; url: string; }[];
  };
  
  adminNote?: string;
  updatedAt?: string;
}

export interface SystemSettings {
  schoolName: string;
  isOpen: boolean;
  startDate: string;
  endDate: string;
  photoMode: FileUploadMode;
  paymentMode: FileUploadMode;
  schoolsList: string[];
  additionalDocs: string[];
  adminUsername: string;
  adminPassword: string;
  contactLine: string;
  contactPhone: string;
  enableLineNotify: boolean;
}
