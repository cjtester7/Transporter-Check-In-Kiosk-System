// CarsRUs Transporter Check-In System — Apps Script Backend
// Version: appscript-v9.gs
// Deploy as Web App: Execute as Me, Anyone can access

// ============================================================
// CONFIGURATION — paste your Google Sheet URL here
const SHEET_URL = "YOUR_GOOGLE_SHEET_URL_HERE";
// ============================================================

const SHEET_NAME = "TransporterLog";
const HEADERS = [
  "Date", "Driver Name", "Driver Phone", "Carrier", "Carrier Phone",
  "Lane", "Time In", "Time Out", "Drop Off", "Pickup",
  "Status", "Vehicle Types", "Comments", "Gate", "Queue Position",
  "Est. Wait (min)", "Signed In By", "Signed Out By", "Row ID"
];

// Column index map (0-based) — update if HEADERS order changes
const COL = {};
HEADERS.forEach((h, i) => COL[h] = i);

function doGet(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  try {
    const params = e.parameter || {};
    let action, body;
    if (params.data) {
      body = JSON.parse(params.data);
      action = body.action;
    } else {
      action = params.action;
      body = params;
    }
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

function doPost(e) {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  try {
    const body = e.postData ? JSON.parse(e.postData.contents || "{}") : {};
    const action = body.action;
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
  const ss = SpreadsheetApp.openByUrl(SHEET_URL);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
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
  if (data.length <= 1) return { records: [], _v: 9 };
  const headers = data[0];
  const tz = Session.getScriptTimeZone();
  const timeColumns = ["Time In", "Time Out"];
  const dateColumns = ["Date"];
  const records = data.slice(1).map((row, i) => {
    const obj = {};
    headers.forEach((h, j) => {
      if (row[j] instanceof Date) {
        if (timeColumns.includes(h)) {
          obj[h] = Utilities.formatDate(row[j], tz, "hh:mm a");
        } else if (dateColumns.includes(h)) {
          obj[h] = Utilities.formatDate(row[j], tz, "MM/dd/yyyy");
        } else {
          obj[h] = Utilities.formatDate(row[j], tz, "MM/dd/yyyy hh:mm a");
        }
      } else {
        obj[h] = row[j];
      }
    });
    obj._rowIndex = i + 2;
    return obj;
  });
  return { records, _v: 9 };
}

function checkIn(data) {
  const sheet = getSheet();
  const now = new Date();
  const dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "MM/dd/yyyy");
  const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "hh:mm a");
  const allData = sheet.getDataRange().getValues();
  const activeRows = allData.slice(1).filter(r => r[COL["Status"]] === "Waiting" || r[COL["Status"]] === "In Progress");
  const queuePos = activeRows.length + 1;
  const estWait = (queuePos - 1) * 20;
  const rowId = "CR-" + now.getTime() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();

  // Build row using HEADERS order so columns always align
  const row = HEADERS.map(h => {
    switch(h) {
      case "Date":           return dateStr;
      case "Driver Name":    return data["Driver Name"] || "";
      case "Driver Phone":   return data["Driver Phone"] || "";
      case "Carrier":        return data["Carrier"] || "";
      case "Carrier Phone":  return data["Carrier Phone"] || "";
      case "Gate":           return data["Gate"] || "";
      case "Lane":           return data["Lane"] || "";
      case "Time In":        return timeStr;
      case "Time Out":       return "";
      case "Drop Off":       return data["Drop Off"] || 0;
      case "Pickup":         return data["Pickup"] || 0;
      case "Status":         return "Waiting";
      case "Vehicle Types":  return data["Vehicle Types"] || "";
      case "Comments":       return data["Comments"] || "";
      case "Queue Position": return queuePos;
      case "Est. Wait (min)":return estWait;
      case "Signed In By":   return data["Signed In By"] || "Self";
      case "Signed Out By":  return "";
      case "Row ID":         return rowId;
      default:               return "";
    }
  });

  sheet.appendRow(row);
  return { success: true, rowId, queuePosition: queuePos, estWait, timeIn: timeStr };
}

function checkOut(data) {
  const sheet = getSheet();
  const allData = sheet.getDataRange().getValues();
  const rowId = data["rowId"] || data["Row ID"];
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][COL["Row ID"]] == rowId) {
      const now = new Date();
      const timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "hh:mm a");
      const rowNum = i + 1;
      sheet.getRange(rowNum, COL["Time Out"] + 1).setValue(timeStr);
      sheet.getRange(rowNum, COL["Status"] + 1).setValue("Completed");
      sheet.getRange(rowNum, COL["Signed Out By"] + 1).setValue(data["Signed Out By"] || "");
      resequenceQueue(sheet);
      return { success: true, timeOut: timeStr };
    }
  }
  return { error: "Record not found" };
}

function updateStatus(data) {
  const sheet = getSheet();
  const allData = sheet.getDataRange().getValues();
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][COL["Row ID"]] == data["rowId"]) {
      sheet.getRange(i + 1, COL["Status"] + 1).setValue(data["status"]);
      resequenceQueue(sheet);
      return { success: true };
    }
  }
  return { error: "Record not found" };
}

// Renumbers Queue Position for all active (Waiting/In Progress) records
// in the order they appear in the sheet (chronological by row).
// Completed records are set to 0 to indicate they are no longer in queue.
function resequenceQueue(sheet) {
  const allData = sheet.getDataRange().getValues();
  let queueNum = 1;
  for (let i = 1; i < allData.length; i++) {
    const status = allData[i][COL["Status"]];
    const rowNum = i + 1;
    if (status === "Waiting" || status === "In Progress") {
      sheet.getRange(rowNum, COL["Queue Position"] + 1).setValue(queueNum);
      sheet.getRange(rowNum, COL["Est. Wait (min)"] + 1).setValue((queueNum - 1) * 20);
      queueNum++;
    }
  }
}

function updateRecord(data) {
  const sheet = getSheet();
  const allData = sheet.getDataRange().getValues();
  for (let i = 1; i < allData.length; i++) {
    if (allData[i][COL["Row ID"]] == data["rowId"]) {
      const rowNum = i + 1;
      const updatable = ["Gate", "Lane", "Drop Off", "Pickup", "Comments", "Vehicle Types", "Status"];
      updatable.forEach(field => {
        if (data[field] !== undefined) {
          sheet.getRange(rowNum, COL[field] + 1).setValue(data[field]);
        }
      });
      return { success: true };
    }
  }
  return { error: "Record not found" };
}

function getQueueInfo() {
  const allData = getSheet().getDataRange().getValues();
  const active = allData.slice(1).filter(r => r[COL["Status"]] === "Waiting" || r[COL["Status"]] === "In Progress");
  return {
    queueLength: active.length,
    nextPosition: active.length + 1,
    estWait: active.length * 20
  };
}
