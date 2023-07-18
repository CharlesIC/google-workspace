//--- Script config --//

// GmailAutoPurge spreadsheet address
var SS_ADDRESS = "https://docs.google.com/spreadsheets/d/1sqKKZ3eIu9H5CK-ZAhNWu98zxlKoZ8ZWJy5QteIiEdw/edit#gid=0";  // prod

// Spreadsheet coordinates
var STORAGE_COUNT_ROW = 2;
var STORAGE_COUNT_COL = 6;

var NEXT_ROW = 6
var NEXT_COL = 6

var STRING_COL = 1;
var LAST_RUN_COL = 2;
var NEXT_RUN_COL = 3;
var TRIGGER_COL = 4;



//--- Script logic --///


// Spreadsheet interface

function SearchInfoStorage() { 
  
  //-- Private members --//
  var that = this;
  var sheet = GetSheet();
  var next = GetNextPointer();
  
  
  //-- Public properties --//
  this.count = GetCount();
  
  
  // -- Public methods --//
  this.PushSearchInfo = function(searchString, lastRun, nextRun, triggerId) {
    var nextFreeRow = this.count + next;
    
    StoreField(searchString, nextFreeRow, "SearchString");
    StoreField(lastRun, nextFreeRow, "LastRun");
    StoreField(nextRun, nextFreeRow, "NextRun");
    StoreField(triggerId, nextFreeRow, "TriggerId");
    
    IncreaseCount();
  }
  
  this.PopNextSearchInfo = function() {
    if (this.count < 1) {
      throw "No pending searches";
    }
    
    var searchString = ReadField(next, "SearchString");
    var lastRun = ReadField(next, "LastRun");
    var nextRun = ReadField(next, "NextRun");
    var triggerId = ReadField(next, "TriggerId");
    
    RemoveNextSearch();
    
    return {
      searchString : searchString,     
      lastRun : lastRun,  
      nextRun : nextRun,
      triggerId : triggerId 
    };
  }
  
  this.GetLatestScheduledRunDate = function() {
    if (this.count < 1) {
      return (new Date()).toUTCString();
    }
    
    return ReadValue(this.count + next - 1, NEXT_RUN_COL);
  }
  
  
  //-- Private methods --//  
  function GetSheet() {
    // Get the GmailAutoPurge helper sheet
    var ss = SpreadsheetApp.openByUrl(SS_ADDRESS);
    var sheet = ss.getSheetByName("Sheet1");
    return sheet;
  }
  
  function GetCount() {
    return ReadValue(STORAGE_COUNT_ROW, STORAGE_COUNT_COL);
  }
  
  function GetNextPointer() {
    return ReadValue(NEXT_ROW, NEXT_COL);
  }
  
  function IncreaseCount() {
    StoreValue(++that.count, STORAGE_COUNT_ROW, STORAGE_COUNT_COL);
  }
  
  function DecreaseCount() {
    if (that.count === 0) {
      throw "Cannot decrease count, as it's already 0";
    }
    
    StoreValue(--that.count, STORAGE_COUNT_ROW, STORAGE_COUNT_COL);
  }
  
  function MoveNextPointer() {
    if (that.count === 0) {
      next = 2;
    }
    else {
      next++;
    }
    
    StoreValue(next, NEXT_ROW, NEXT_COL);
  }
  
  function RemoveNextSearch() {
    // Remove search info from spreadsheet
    StoreField("", next, "SearchString");
    StoreField("", next, "LastRun");
    StoreField("", next, "NextRun");
    StoreField("", next, "TriggerId");
    
    // Update counter and queue pointer
    DecreaseCount();
    MoveNextPointer();
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
  
  function ReadField(rowNumber, paramName) {
    var colNumber = GetColNumber(paramName);
    return ReadValue(rowNumber, colNumber);
  }
  
  function StoreField(value, rowNumber, paramName) {
    var colNumber = GetColNumber(paramName);
    StoreValue(value, rowNumber, colNumber);
  }
  
  function GetColNumber(paramName) {
    var colNumber = 0;
    
    switch (paramName) {
      case "SearchString":
        colNumber = STRING_COL;
        break;
      case "LastRun":
        colNumber = LAST_RUN_COL;
        break;
      case "NextRun":
        colNumber = NEXT_RUN_COL;
        break;
      case "TriggerId":
        colNumber = TRIGGER_COL;
        break;
      default:
        throw "Invalid parameter name in GetColNumber(paramName)";
    }
    
    return colNumber;
  }
  
}
