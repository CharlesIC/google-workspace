//--- Script config --//

// GmailAutoPurge Log spreadsheet address
LOG_SS_ADDRESS = "https://docs.google.com/spreadsheets/d/1ODCL3WFqkzBk545lkYk1yMG-vxNHkjyN4N4jQkleRO0/edit#gid=0"

LABEL_COL = 1
DATE_COL = 2
COUNT_COL = 3

ENTRIES_COL = 5
ENTRIES_ROW = 2

// Log properties
COLS_COUNT = 3
ENTRIES_OFFSET = 1
MIN_ENTRIES_ROW = 6
MAX_ENTRIES_ROW = 9


//--- Testing --//

function TestLogProvider() {
  var lp = new LogProvider();
  
  Logger.log("Testing entry write...");
  lp.WriteLogEntry("Another label", (new Date()).toUTCString(), 7);
  
  Logger.log("Log test complete");
}


//--- Script logic --//

function LogProvider() {
  
  //-- Private members --//
  var that = this;
  var sheet = GetSheet();
  var minEntriesSetting = GetMinEntriesNumber();
  var maxEntriesSetting = GetMaxEntriesNumber();
  
  //-- Public properties --//
  this.entriesCount = GetEntriesCount();
  
  
  // -- Public methods --//
  this.WriteLogEntry = function(labelName, date, removedMsgCount) {
    var nextFreeRow = this.entriesCount + 2;
    
    StoreField(labelName, nextFreeRow, "LabelName");
    StoreField(date, nextFreeRow, "Date");
    StoreField(removedMsgCount, nextFreeRow, "RemovedMsgCount");
    
    IncreaseEntriesCount();
  }
  
  this.CleanLog = function() {
    if (this.entriesCount <= maxEntriesSetting) return;
    
    var firstEntryRow = 1 + ENTRIES_OFFSET;
    var excessEntries = this.entriesCount - minEntriesSetting;
    var oldEntries = sheet.getRange(firstEntryRow, 1, excessEntries, COLS_COUNT);
    var latestEntries = sheet.getRange(firstEntryRow + excessEntries, 1, minEntriesSetting, COLS_COUNT);
    var topRange = sheet.getRange(firstEntryRow, 1, minEntriesSetting, COLS_COUNT);
    
    oldEntries.clearContent();
    latestEntries.moveTo(topRange);
    SetEntriesCount(minEntriesSetting);
  }
  
  
  //-- Private methods --//  
  function GetSheet() {
    // Get the GmailAutoPurge helper sheet
    var ss = SpreadsheetApp.openByUrl(LOG_SS_ADDRESS);
    var sheet = ss.getSheetByName("Sheet1");
    return sheet;
  }
  
  function GetEntriesCount() {
    return ReadValue(ENTRIES_ROW, ENTRIES_COL);
  }
  
  function IncreaseEntriesCount() {
    StoreValue(++that.entriesCount, ENTRIES_ROW, ENTRIES_COL);
  }
  
  function SetEntriesCount(numEntries) {
    StoreValue(numEntries, ENTRIES_ROW, ENTRIES_COL);
  }
  
  function GetMinEntriesNumber() {
    return ReadValue(MIN_ENTRIES_ROW, ENTRIES_COL);
  }
  
  function GetMaxEntriesNumber() {
    return ReadValue(MAX_ENTRIES_ROW, ENTRIES_COL);
  }
  
  function ReadValue(row, column) {
    var range = sheet.getRange(row, column);
    var data = range.getValue();
    return data;
  }
  
  function StoreValue(value, row, column) {
    var range = sheet.getRange(row, column);
    range.setValue(value);
    SpreadsheetApp.flush();
  }
  
  function StoreField(value, rowNumber, paramName) {
    var colNumber = GetColNumber(paramName);
    StoreValue(value, rowNumber, colNumber);
  }
  
  function GetColNumber(paramName) {
    var colNumber = 0;
    
    switch (paramName) {
      case "LabelName":
        colNumber = LABEL_COL;
        break;
      case "Date":
        colNumber = DATE_COL;
        break;
      case "RemovedMsgCount":
        colNumber = COUNT_COL;
        break;
      default:
        throw "Invalid parameter name in GetColNumber(paramName)";
    }
    
    return colNumber;
  }   
  
}
