
export const validateThaiID = (id: string): boolean => {
  const cleaned = id.replace(/\D/g, ''); // ลบอักขระที่ไม่ใช่ตัวเลขออกทั้งหมด
  if (cleaned.length !== 13) return false;
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i)) * (13 - i);
  }
  const check = (11 - (sum % 11)) % 10;
  return check === parseInt(cleaned.charAt(12));
};

export const formatPhone = (val: string): string => {
  const cleaned = val.replace(/\D/g, '');
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
};

export const calculateAge = (birthDate: string): number => {
  if (!birthDate) return 0;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

// จำลองฐานข้อมูลที่อยู่ไทยเบื้องต้น
export const searchThaiAddress = (query: string) => {
  const mockData = [
    { sub: 'ท่าบ่อ', dist: 'ท่าบ่อ', prov: 'หนองคาย', zip: '43110' },
    { sub: 'โพนสา', dist: 'ท่าบ่อ', prov: 'หนองคาย', zip: '43110' },
    { sub: 'บ้านถ่อน', dist: 'ท่าบ่อ', prov: 'หนองคาย', zip: '43110' },
    { sub: 'กองนาง', dist: 'ท่าบ่อ', prov: 'หนองคาย', zip: '43110' },
    { sub: 'โคกคอน', dist: 'ท่าบ่อ', prov: 'หนองคาย', zip: '43110' },
    { sub: 'บ้านเดื่อ', dist: 'ท่าบ่อ', prov: 'หนองคาย', zip: '43110' }
  ];
  return mockData.filter(d => d.sub.includes(query) || d.dist.includes(query));
};
