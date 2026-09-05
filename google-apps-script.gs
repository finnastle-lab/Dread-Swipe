
/**
 * GOOGLE APPS SCRIPT BACKEND
 */

function doGet(e) {
  const action = e.parameter.action;
  
  if (action === 'get_history') {
    return ContentService.createTextOutput(JSON.stringify(getUserHistory()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput("CineSwipe API Ready");
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  
  if (action === 'record_swipe') {
    recordSwipe(data);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  } else if (action === 'undo_swipe') {
    undoSwipe(data);
    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function recordSwipe(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetName = getSheetNameForDirection(data.direction);
  
  if (!sheetName) return;
  
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["Movie ID", "Title", "Timestamp", "Weight"]);
    try { ss.addEditor("finnastle@gmail.com"); } catch(e) {}
  }
  
  const weight = data.direction === 'up' ? 2 : 1;
  sheet.appendRow([data.movieId, data.title, data.timestamp, weight]);
}

function undoSwipe(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetName = getSheetNameForDirection(data.direction);
  if (!sheetName) return;
  
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  
  const values = sheet.getDataRange().getValues();
  // Find the row with the matching movie ID (usually near the end)
  for (let i = values.length - 1; i >= 1; i--) {
    if (values[i][0] == data.movieId) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

function getSheetNameForDirection(direction) {
  if (direction === 'left' || direction === 'up') {
    return "Watched";
  } else if (direction === 'right') {
    return "Films I Have Not Liked";
  } else if (direction === 'down') {
    return "Watchlist";
  }
  return null;
}

function getUserHistory() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = {
    watched: ss.getSheetByName("Watched"),
    disliked: ss.getSheetByName("Films I Have Not Liked"),
    watchlist: ss.getSheetByName("Watchlist")
  };
  
  const history = {
    watched: [],
    disliked: [],
    watchlist: []
  };
  
  for (let key in sheets) {
    if (sheets[key]) {
      const data = sheets[key].getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        history[key].push(data[i][0]);
      }
    }
  }
  
  return history;
}
