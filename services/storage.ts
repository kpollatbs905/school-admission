
import { ApplicationData, SystemSettings, Level, ApplicationStatus, FileUploadMode } from '../types';

/**
 * GOOGLE APPS SCRIPT URL
 */
const SCRIPT_URL: string = 'https://script.google.com/macros/s/AKfycbzQ0b7EHYO6JfgyCaSO5pMCqtxxTvf9IPAQdcQFAn853WriWBskM9jCLVM_RZGPWm7aRQ/exec';

const STORAGE_KEY_APPS = 'thabo_admission_apps_v2';
const STORAGE_KEY_SETTINGS = 'thabo_admission_settings_v2';

const DEFAULT_SETTINGS: SystemSettings = {
  schoolName: 'โรงเรียนท่าบ่อ',
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
  getScriptUrl: () => SCRIPT_URL,
  
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
      console.error("Failed to save settings to local storage", e);
    }
  },

  getApplications: (): ApplicationData[] => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_APPS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn("Failed to read applications from local storage");
      return [];
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

  saveApplication: (app: ApplicationData) => {
    const apps = StorageService.getApplications();
    const index = apps.findIndex(a => a.id === app.id);
    const updatedApps = [...apps];
    if (index > -1) {
      updatedApps[index] = app;
    } else {
      updatedApps.push(app);
    }

    try {
      localStorage.setItem(STORAGE_KEY_APPS, JSON.stringify(updatedApps));
    } catch (e) {
      const strippedApps = updatedApps.map(item => StorageService.stripImages(item));
      try {
        localStorage.setItem(STORAGE_KEY_APPS, JSON.stringify(strippedApps));
      } catch (innerError) {
        console.error("LocalStorage critical failure");
      }
    }
  },

  deleteApplication: (id: string) => {
    try {
      const apps = StorageService.getApplications();
      const newApps = apps.filter(a => a.id !== id);
      localStorage.setItem(STORAGE_KEY_APPS, JSON.stringify(newApps));
    } catch (e) {
      console.error("Failed to delete from local storage", e);
    }
  },

  submitToCloud: async (data: ApplicationData): Promise<{success: boolean, message?: string}> => {
    if (!SCRIPT_URL) return { success: false, message: 'Script URL Invalid' };

    try {
      // Use text/plain to avoid CORS preflight issues with GAS
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ ...data, action: 'update' }) 
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, message: 'Cloud Error: ' + error.message };
    }
  },

  deleteFromCloud: async (id: string): Promise<{success: boolean, message?: string}> => {
     try {
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ id, action: 'delete' }) 
      });
      return { success: true };
    } catch (error: any) {
      return { success: false, message: 'Cloud Delete Error: ' + error.message };
    }
  },

  getNextId: (level: Level): string => {
    const apps = StorageService.getApplications().filter(a => a.level === level);
    const prefix = level === Level.M1 ? 'M1' : 'M4';
    const currentYear = new Date().getFullYear() + 543;
    const num = (apps.length + 1).toString().padStart(4, '0');
    return `${prefix}-${currentYear}-${num}`;
  }
};
