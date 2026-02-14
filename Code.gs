
/**
 * GOOGLE APPS SCRIPT BACKEND V6.3 (Final GPA & Fetch Fix)
 */

const MAIN_FOLDER_NAME = "ระบบรับสมัครนักเรียน_ไฟล์แนบ";

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const appSheet = ss.getSheetByName('Applications');
  
  // Action for reading data
  if (e.parameter.action === 'read') {
    if (!appSheet) return responseJSON([]);
    const data = appSheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const result = rows.map(row => {
      let obj = {};
      // Map columns back to ApplicationData structure
      obj.id = row[0];
      obj.level = row[1];
      obj.status = row[2];
      obj.submitDate = row[3];
      obj.title = row[4];
      obj.firstName = row[5];
      obj.lastName = row[6];
      obj.nationalId = String(row[7]).replace(/'/g, '');
      obj.birthDate = row[8];
      obj.phone = String(row[9]).replace(/'/g, '');
      obj.track = row[10];
      
      // Reconstruct education object
      obj.education = {
        gpa: row[16],
        schoolName: row[17],
        subGpa: row[22], // New column SubGPA
        subGpaSubject: row[23] // New column SubGPA Subject
      };
      
      obj.trackType = String(row[10]).includes('พิเศษ') ? 'special' : 'regular';
      
      // Files (URLs)
      obj.files = {
        photo: row[11],
        houseReg: row[18],
        idCard: row[19],
        transcript: row[20],
        transcriptBack: row[21]
      };

      try {
        obj.address = JSON.parse(row[12]);
      } catch(e) {
        obj.address = {};
      }
      
      obj.guardianName = row[13];
      obj.fatherName = row[14];
      obj.motherName = row[15];
      
      return obj;
    });
    
    return responseJSON(result);
  }

  // Default landing page
  return HtmlService.createHtmlOutput(`
    <div style="font-family: 'Sarabun', sans-serif; padding: 40px; line-height: 1.6; max-width: 600px; margin: auto; text-align: center;">
      <div style="font-size: 80px; margin-bottom: 20px;">🏫</div>
      <h1 style="color: #1e40af; margin-bottom: 10px; font-weight: 800;">Backend V6.3 Ready</h1>
      <p style="font-size: 1.2em; color: #16a34a; font-weight: bold;">🟢 เชื่อมต่อสำเร็จ พร้อมดึงข้อมูล</p>
    </div>
  `).setTitle('Admission Backend');
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName('SystemLogs');
  if (!logSheet) {
    logSheet = ss.insertSheet('SystemLogs');
    logSheet.appendRow(['Timestamp', 'Action', 'ID', 'Details']);
  }

  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action || 'update';

    if (action === 'delete') {
       const res = deleteApplication(data.id);
       logSheet.appendRow([new Date(), 'DELETE', data.id, res.success ? 'Success' : res.message]);
       return responseJSON(res);
    } else {
       const res = submitApplication(data);
       logSheet.appendRow([new Date(), 'UPDATE/ADD', data.id, res.success ? 'Success' : res.message]);
       return responseJSON(res);
    }
  } catch (err) {
    logSheet.appendRow([new Date(), 'ERROR', 'Unknown', err.toString()]);
    return responseJSON({ success: false, message: err.toString() });
  }
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let appSheet = ss.getSheetByName('Applications');
  if (!appSheet) {
    appSheet = ss.insertSheet('Applications');
    const headers = [
      'ID', 'ระดับชั้น', 'สถานะ', 'วันที่สมัคร', 'คำนำหน้า', 'ชื่อ', 'นามสกุล', 
      'เลขบัตรประชาชน', 'วันเกิด', 'เบอร์โทร', 'แผนการเรียน', 'รูปถ่าย', 'ที่อยู่', 
      'ชื่อผู้ปกครอง', 'ชื่อบิดา', 'ชื่อมารดา', 'GPAX', 'โรงเรียนเดิม', 
      'ทะเบียนบ้าน', 'บัตรประชาชน', 'ปพ1_หน้า', 'ปพ1_หลัง', 'SubGPA', 'SubGPA_Subject'
    ];
    appSheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#e2e8f0');
    appSheet.setFrozenRows(1);
  }
  return "✅ ตั้งค่าเรียบร้อย! คอลัมน์ครบ 24 คอลัมน์";
}

function findRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) return i + 1;
  }
  return -1;
}

function deleteApplication(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const appSheet = ss.getSheetByName('Applications');
  const rowIndex = findRowById(appSheet, id);
  if (rowIndex !== -1) {
    appSheet.deleteRow(rowIndex);
    return { success: true };
  }
  return { success: false, message: 'ID not found' };
}

function submitApplication(formData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const appSheet = ss.getSheetByName('Applications') || ss.getSheets()[0];
  
  let mainFolder;
  const folders = DriveApp.getFoldersByName(MAIN_FOLDER_NAME);
  if (folders.hasNext()) mainFolder = folders.next();
  else mainFolder = DriveApp.createFolder(MAIN_FOLDER_NAME);

  const existingRowIndex = findRowById(appSheet, formData.id);
  let currentValues = [];
  if (existingRowIndex !== -1) {
    currentValues = appSheet.getRange(existingRowIndex, 1, 1, 24).getValues()[0];
  }

  const safeSave = (base64, name, oldVal) => {
    if (base64 === 'UPLOADED') return oldVal || "";
    if (!base64 || !base64.startsWith('data:image')) return base64 || "";
    
    const studentFolderName = `${formData.id}_${formData.firstName}`;
    let studentFolder;
    const sFolders = mainFolder.getFoldersByName(studentFolderName);
    if (sFolders.hasNext()) studentFolder = sFolders.next();
    else studentFolder = mainFolder.createFolder(studentFolderName);

    const splitData = base64.split('base64,');
    const contentType = splitData[0].split(':')[1].split(';')[0];
    const byteData = Utilities.base64Decode(splitData[1]);
    const blob = Utilities.newBlob(byteData, contentType, name);
    const file = studentFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  };

  const rowData = [
    formData.id,
    formData.level,
    formData.status || 'รอตรวจสอบ',
    formData.submitDate || new Date(),
    formData.title,
    formData.firstName,
    formData.lastName,
    "'" + formData.nationalId,
    formData.birthDate,
    "'" + formData.phone,
    formData.track,
    safeSave(formData.files.photo, "รูปถ่าย", currentValues[11]),
    JSON.stringify(formData.address),
    formData.guardianName,
    formData.fatherName,
    formData.motherName,
    formData.education.gpa,
    formData.education.schoolName,
    safeSave(formData.files.houseReg, "ทะเบียนบ้าน", currentValues[18]),
    safeSave(formData.files.idCard, "บัตรประชาชน", currentValues[19]),
    safeSave(formData.files.transcript, "ปพ1_หน้า", currentValues[20]),
    safeSave(formData.files.transcriptBack, "ปพ1_หลัง", currentValues[21]),
    formData.education.subGpa,
    formData.education.subGpaSubject
  ];

  if (existingRowIndex !== -1) {
    appSheet.getRange(existingRowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    appSheet.appendRow(rowData);
  }

  return { success: true, id: formData.id };
}
