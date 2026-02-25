
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

export interface Scores {
  math: number;
  science: number;
  english: number;
  thai: number;
  sum: number;
  ave: number;
}

export interface ApplicationData {
  id: string;
  level: Level;
  status: ApplicationStatus;
  submitDate: string;
  serviceArea: 'in' | 'out';
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
    studentType: 'internal' | 'external';
    schoolName: string;
    schoolDistrict: string;
    schoolProvince: string;
    gpa: string;
    subGpa?: string;
    subGpaSubject?: string;
    m3Room?: string;
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
    transcriptBack?: string;
    paymentSlip?: string;
    additional: { name: string; url: string; }[];
  };
  
  adminNote?: string;
  updatedAt?: string;

  room?: string; // Renamed from examRoom
  examRoom?: number;
  assignedClass?: string;
  scores?: Scores;
}

export interface SystemSettings {
  schoolName: string;
  admissionYear: string;
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
