//--- Script config --//

// Only retain messages received within the last PURGE_AFTER_DAYS days
var PURGE_AFTER_DAYS = 30;

// GmailAutoPurge Label Config spreadsheet address
var LC_SS_ADDRESS = "https://docs.google.com/spreadsheets/d/1UJs0Lbz97ntOUNqF_2FN3OiUH7vzKifO3MOctuL9g9M/edit#gid=0";  // prod

var LABEL_NAME_COL = 1;
var DAYS_COL = 2;


//--- Testing --//

function TestLabelProvider() {
  var lcp = new LabelConfigProvider();
  var lc = lcp.ReadLabels();
  
  for (var i = 0; i < lc.length; i++) {
    Logger.log(lc[i].labelName + ' ' + lc[i].purgeAfterDays);
  }
}


//--- Script logic --//

function LabelConfigProvider() {
  
  //-- Private members --//
  var sheet = GetSheet();
  
  
  // -- Public methods --//
  this.ReadLabels = function() {
    var labelConfigs = [];
    
    var currentRow = 2;
    var labelName = ReadValue(currentRow, LABEL_NAME_COL);
    
    while (labelName != '') {
      var label = GmailApp.getUserLabelByName(labelName);
      
      if (label === null) {
        throw "Invalid label name: " + labelName;
      }
      
      var purgeAfter = ReadValue(currentRow, DAYS_COL);
      var labelConfig = new LabelConfig(label.getName(), purgeAfter);
      labelConfigs.push(labelConfig);
      
      labelName = ReadValue(++currentRow, LABEL_NAME_COL);
    }
    
    return labelConfigs;
  }
  
  
  //-- Private methods --//  
  function GetSheet() {
    // Get the GmailAutoPurge helper sheet
    var ss = SpreadsheetApp.openByUrl(LC_SS_ADDRESS);
    var sheet = ss.getSheetByName("Sheet1");
    return sheet;
  }
  
  function ReadValue(row, column) {
    var range = sheet.getRange(row, column);
    var data = range.getValue();
    return data;
  }
  
}


//--- Objects --//

function LabelConfig(name, days) {
  this.labelName = name;
  this.purgeAfterDays = PURGE_AFTER_DAYS;
  
  if (days != null && days != '') {
    this.purgeAfterDays = days;
  }
}
