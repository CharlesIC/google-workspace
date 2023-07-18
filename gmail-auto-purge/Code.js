var BATCH_SIZE = 100

function Info() {
  console.log("Select the PurgeOldMessages function to run the script")
}

function PurgeOldMessages() {
  var labelConfigProvider = new LabelConfigProvider();
  var logProvider = new LogProvider();
  var searchInfoStorage = new SearchInfoStorage();
  
  logProvider.CleanLog();
  var labelConfigs = labelConfigProvider.ReadLabels();
  
  for (var i = 0; i < labelConfigs.length; i++) {
    var purgeBeforeDate = GetCutoffDate(labelConfigs[i].purgeAfterDays);
    var search = 'label:"' + labelConfigs[i].labelName + '" before:' + purgeBeforeDate + ' -is:important -is:starred is:unread';
    var threads = GmailApp.search(search, 0, BATCH_SIZE);
    
    if (threads.length > 0) {
      SchedulePurge(search, searchInfoStorage);
    }
    
    Utilities.sleep(1000*2);
  }
}

function PurgeNextSavedSearch() {
  var searchInfoStorage = new SearchInfoStorage();
  var searchInfo = searchInfoStorage.PopNextSearchInfo();
  
  var triggerId = searchInfo.triggerId;
  var searchString = searchInfo.searchString;
  
  if (searchString === null || searchString === "") {
    throw "No search info found.";
  }
  
  DeleteMessages(searchString, searchInfoStorage);
  DeleteTrigger(triggerId);
}

function DeleteMessages(searchString, searchInfoStorage) {
  try {
    var threads = GmailApp.search(searchString, 0, BATCH_SIZE); 
    var messages = GmailApp.getMessagesForThreads(threads);
    var purgeBeforeDate = ExtractDateFromSearchString(searchString);
    var labelName = ExtractLabelNameFromSearchString(searchString);
    var date = (new Date()).toUTCString();
    var logProvider = new LogProvider();
    var deletedMessages = 0;
    
    if (threads.length == BATCH_SIZE) {
      SchedulePurge(searchString, searchInfoStorage);
    }
    
    for (var i = 0; i < messages.length; i++) {
      var msg = messages[i];
      
      for (var j = 0; j < msg.length; j++) {
        var email = msg[j];
        
        if (email.getDate() < purgeBeforeDate) {
          email.moveToTrash();
          deletedMessages++;
        }
      }
    }
    
    logProvider.WriteLogEntry(labelName, date, deletedMessages);
  } 
  catch (e) {
    throw e + "; SearchString: " + searchString;
  }
}

function SchedulePurge(searchString, searchInfoStorage) { 
  // For large batches, create another time-based
  // trigger that will activate autopurge after 15 minutess
  
  if ( !(ScriptApp.getProjectTriggers().length < 19) ) {
    return;
  }
  
  var lastRun = new Date();
  var latestScheduledRunDate = new Date(Date.parse(searchInfoStorage.GetLatestScheduledRunDate()));
  var nextRun = new Date(latestScheduledRunDate.getTime() + 1000*60*10);
  
  var newTrigger = ScriptApp.newTrigger("PurgeNextSavedSearch").timeBased().at(nextRun).create();
  
  searchInfoStorage.PushSearchInfo(searchString, lastRun.toUTCString(), nextRun.toUTCString(), newTrigger.getUniqueId());
}

function DeleteTrigger(triggerId) {
  var found = false;
  var triggers = ScriptApp.getProjectTriggers();
  
  for (var i = 0; i < triggers.length; i++) {
    var trigger = triggers[i];
    if (trigger.getUniqueId() === triggerId) {
      found = true;
      ScriptApp.deleteTrigger(trigger);
      return;
    }
  }
  
  if (!found) {
    throw "Could not delete auto-created trigger";
  }
}
    
function GetCutoffDate(days) {
  var cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  return Utilities.formatDate(cutoffDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function ExtractDateFromSearchString(searchString) {
  var idx = searchString.indexOf("before");
  var subSearchString = searchString.slice(idx, searchString.length);
  var dateParams = subSearchString.split(" ")[0].split(":")[1].split("-");
  var date = new Date(dateParams[0], dateParams[1] - 1, dateParams[2]);
  return date;
}

function ExtractLabelNameFromSearchString(searchString) {
  var startIdx = searchString.indexOf("label");
  var endIdx = searchString.indexOf("before");
  var subSearchString = searchString.slice(startIdx, endIdx);
  var labelName = subSearchString.split(":")[1];
  return labelName;
}
