
import { ApplicationData, SystemSettings, Level, ApplicationStatus, FileUploadMode } from '../types';

/**
 * ⚠️ ขั้นตอนสำคัญ:
 * 1. วางโค้ด V25.0 ใน Code.gs
 * 2. Deploy -> New Deployment -> Anyone
 */
const STORAGE_KEY_SETTINGS = 'thabo_admission_settings_v15';
const STORAGE_KEY_SCRIPT_URL = 'thabo_admission_script_url_v1';

const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby5EnKkxXyDYtWzWxv5yJ0nXjPaeuydPZG19s6KTn7BTHnibmJpmrNinKm5LBATMI74/exec';

const DEFAULT_SETTINGS: SystemSettings = {
  schoolName: 'โรงเรียนท่าบ่อ',
  admissionYear: (new Date().getFullYear() + 543).toString(),
  isOpen: true,
  startDate: '2024-01-01',
  endDate: '2025-12-31',
  photoMode: FileUploadMode.REQUIRED,
  paymentMode: FileUploadMode.OPTIONAL,
  schoolsList: ['โรงเรียนท่าบ่อ', 'โรงเรียนอนุบาลดารณีท่าบ่อท่าบ่อ', 'โรงเรียนเทศบาลเมืองท่าบ่อ', 'โรงเรียนโกมลวิทยาคาร'],
  additionalDocs: ['สำเนาทะเบียนบ้าน', 'สำเนาบัตรประชาชน', 'ใบปพ.1'],
  adminUsername: 'thabo',
  adminPassword: 'tbs@431728',
  contactLine: 'พัฒนาโดย นางชมัยพร ถิ่นสำราญ ครูชำนาญการพิเศษ โรงเรียนท่าบ่อ',
  contactPhone: '042-431728',
  enableLineNotify: true
};

export const StorageService = {
  getScriptUrl: () => {
    return localStorage.getItem(STORAGE_KEY_SCRIPT_URL) || DEFAULT_SCRIPT_URL;
  },
  
  saveScriptUrl: (url: string) => {
    localStorage.setItem(STORAGE_KEY_SCRIPT_URL, url);
  },
  
  getSettings: (): SystemSettings => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings: (settings: SystemSettings) => {
    try {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error("Settings save failed", e);
    }
  },

  stripImages: (app: ApplicationData): ApplicationData => {
    const strip = (val?: string) => {
      if (!val) return val;
      if (val.startsWith('data:image')) return 'UPLOADED';
      return val;
    };
    return {
      ...app,
      files: {
        ...app.files,
        photo: strip(app.files.photo),
        houseReg: strip(app.files.houseReg),
        idCard: strip(app.files.idCard),
        transcript: strip(app.files.transcript),
        transcriptBack: strip(app.files.transcriptBack)
      }
    };
  },

  submitToCloud: async (data: ApplicationData): Promise<{ success: boolean; message?: string; photoUrl?: string }> => {
    const scriptUrl = StorageService.getScriptUrl();
    if (!scriptUrl) return { success: false, message: "URL ไม่ถูกต้อง" };

    try {
      const payload = JSON.stringify(data);
      if (payload.length > 5.5 * 1024 * 1024) {
        return { success: false, message: "ขนาดข้อมูลใหญ่เกินไป (รวมไม่ควรเกิน 5MB) กรุณาย่อขนาดรูปภาพ" };
      }

      const response = await fetch(scriptUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: payload
      });

      const result = await response.json();
      return result;
    } catch (error: any) {
      console.error("Cloud Error:", error);
      return { success: false, message: "เกิดความล่าช้าในการส่งข้อมูล หรือไฟล์มีขนาดใหญ่เกินไป: " + error.message };
    }
  },

  getApplications: async (): Promise<ApplicationData[]> => {
    const scriptUrl = StorageService.getScriptUrl();
    if (!scriptUrl) throw new Error("Script URL is not configured");
    try {
      const response = await fetch(`${scriptUrl}?action=read&t=${Date.now()}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (data.success === false) throw new Error(data.error || "Unknown server error");
      return data;
    } catch (e: any) {
      console.error("Fetch Applications Error:", e);
      throw e;
    }
  },

  getNextId: (level: Level): string => {
    const prefix = level === Level.M1 ? 'M1' : 'M4';
    const settings = StorageService.getSettings();
    const num = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${settings.admissionYear}-${num}`;
  }
};
