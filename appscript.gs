// CarsRUs Transporter Check-In System — Apps Script Backend
// Version: appscript-v1.gs
// Deploy as Web App: Execute as Me, Anyone can access

const SHEET_NAME = "TransporterLog";
const HEADERS = [
  "Date", "Driver Name", "Driver Phone", "Carrier", "Carrier Phone",
  "Lane", "Time In", "Time Out", "Drop Off", "Pickup",
  "Status", "Vehicle Types", "Comments", "Queue Position",
  "Est. Wait (min)", "Signed In By", "Signed Out By", "Row ID"
];

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    const params = e.parameter || {};
    const body = e.postData ? JSON.parse(e.postData.contents || "{}") : {};
    const action = params.action || body.action;

    let result;
    switch (action) {
      case "getAll":       result = getAllRecords(); break;
      case "checkIn":      result = checkIn(body); break;
      case "checkOut":     result = checkOut(body); break;
      case "updateStatus": result = updateStatus(body); break;
      case "updateRecord": result = updateRecord(body); break;
      case "getQueue":     result = getQueueInfo(); break;
      default:             result = { error: "Unknown action: " + action };
    }
    output.setContent(JSON.stringify(result));
  } catch (err) {
    output.setContent(JSON.stringify({ error: err.message }));
  }

  return output;
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    // Style header row
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground("#1a1a2e");
    headerRange.setFontColor("#ffffff");
    headerRange.setFontWeight("bold");
  }
  return sheet;
}

function getAllRecords() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { records: [] };

  const headers = data[0];
  const records = data.slice(1).map((row, i) => {
    const obj = {};
    headers.forEach((h, j) => {
      obj[h] = row[j] instanceof Date ? Utilities.formatDate(row[j], Session.getScriptTimeZone(), "MM/dd/yyyy") : row[j];
    });
    obj._rowIndex = i + 2; // 1-indexed, +1 for header
    return obj;
  });

  return { records };
}

function checkIn(data) {
  const sheet = getSheet();
  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "MM/dd/yyyy");
  const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "hh:mm a");

  // Calculate queue position
  const allData = sheet.getDataRange().getValues();
  const activeRows = allData.slice(1).filter(r => r[10] === "Waiting" || r[10] === "In Progress");
  const queuePos = activeRows.length + 1;
  const estWait = (queuePos - 1) * 20; // 20 min per transporter estimate

  const rowId = "CR-" + now.getTime();
  const row = [
    dateStr,                           // Date
    data["Driver Name"] || "",         // Driver Name
    data["Driver Phone"] || "",        // Driver Phone
    data["Carrier"] || "",             // Carrier
    data["Carrier Phone"] || "",       // Carrier Phone
    data["Lane"] || "",                // Lane
    timeStr,                           // Time In
    "",                                // Time Out
    data["Drop Off"] || 0,             // Drop Off
    data["Pickup"] || 0,               // Pickup
    "Waiting",                         // Status
    data["Vehicle Types"] || "",       // Vehicle Types
    data["Comments"] || "",            // Comments
    queuePos,                          // Queue Position
    estWait,                           // Est. Wait
    data["Signed In By"] || "Self",    // Signed In By
    "",                                // Signed Out By
    rowId                              // Row ID
  ];

  sheet.appendRow(row);
  return { success: true, rowId, queuePosition: queuePos, estWait, timeIn: timeStr };
}

function checkOut(data) {
  const sheet = getSheet();
  const allData = sheet.getDataRange().getValues();
  const rowId = data["rowId"] || data["Row ID"];

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][17] == rowId) { // Row ID is index 17
      const now = new Date();
      const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "hh:mm a");
      const rowNum = i + 1;
      sheet.getRange(rowNum, 8).setValue(timeStr);        // Time Out
      sheet.getRange(rowNum, 11).setValue("Completed");   // Status
      sheet.getRange(rowNum, 17).setValue(data["Signed Out By"] || ""); // Signed Out By
      return { success: true, timeOut: timeStr };
    }
  }
  return { error: "Record not found" };
}

function updateStatus(data) {
  const sheet = getSheet();
  const allData = sheet.getDataRange().getValues();
  const rowId = data["rowId"];

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][17] == rowId) {
      sheet.getRange(i + 1, 11).setValue(data["status"]);
      return { success: true };
    }
  }
  return { error: "Record not found" };
}

function updateRecord(data) {
  const sheet = getSheet();
  const allData = sheet.getDataRange().getValues();
  const rowId = data["rowId"];
  const headers = allData[0];

  for (let i = 1; i < allData.length; i++) {
    if (allData[i][17] == rowId) {
      const rowNum = i + 1;
      // Update allowed fields
      const updatable = ["Lane", "Drop Off", "Pickup", "Comments", "Vehicle Types", "Status"];
      updatable.forEach(field => {
        if (data[field] !== undefined) {
          const colIndex = headers.indexOf(field) + 1;
          if (colIndex > 0) sheet.getRange(rowNum, colIndex).setValue(data[field]);
        }
      });
      return { success: true };
    }
  }
  return { error: "Record not found" };
}

function getQueueInfo() {
  const allData = getSheet().getDataRange().getValues();
  const active = allData.slice(1).filter(r => r[10] === "Waiting" || r[10] === "In Progress");
  return {
    queueLength: active.length,
    nextPosition: active.length + 1,
    estWait: active.length * 20
  };
}
