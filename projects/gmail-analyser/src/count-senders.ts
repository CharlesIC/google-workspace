import {Lib} from "lib/types/all";

namespace AnalyseEmail {
    const MAX_THREADS = undefined;
    const MAX_RANGE = 500;

    type State = { senders: Record<string, number>, count: number, nextPageToken: string | undefined };

    export class CountSenders extends Lib.BatchTasks.LongRunningTask<State> {
        initialiseState(): State {
            return {senders: {}, count: 0, nextPageToken: undefined};
        }

        protected processBatch(state: State): Lib.BatchTasks.IsProcessingComplete {
            return countSendersBatch(state);
        }
    }

    export class CountUnreadSenders extends CountSenders {
        protected processBatch(state: State): Lib.BatchTasks.IsProcessingComplete {
            return countUnreadSendersBatch(state);
        }
    }

    function countUnreadSendersBatch(state: State) {
        const range = MAX_THREADS ? Math.min(MAX_THREADS - state.count, MAX_RANGE) : MAX_RANGE;
        const messageList = Gmail.Users?.Messages?.list(
            "me", {maxResults: range, pageToken: state.nextPageToken, q: "in:inbox is:unread"});

        messageList?.messages?.forEach(message => {
            if (!message.id) {
                return;
            }

            Gmail.Users?.Messages
                ?.get("me", message.id, {format: "metadata", metadataHeaders: ["From"]})
                ?.payload?.headers?.filter(header => header.name == "From")
                .map(header => header.value)
                .forEach(sender => {
                    if (sender) {
                        state.senders[sender] ??= 0;
                        state.senders[sender]++;
                    }
                });
        });

        Logger.log(`Processed ${state.count += messageList?.messages?.length || 0} messages`);

        if (!messageList?.messages?.length || !messageList.nextPageToken || state.count === MAX_THREADS) {
            processResults(state.senders);
            return true;
        }

        state.nextPageToken = messageList.nextPageToken;
        return false;
    }

    function countSendersBatch(state: State): boolean {
        const range = MAX_THREADS ? Math.min(MAX_THREADS - state.count, MAX_RANGE) : MAX_RANGE;
        const threads = GmailApp.getInboxThreads(state.count, range);

        const senders = state.senders;
        threads.filter(thread => thread.isUnread())
            .flatMap(thread => thread.getMessages())
            .forEach(message => {
                const sender = message.getFrom();
                senders[sender] ??= 0;
                senders[sender]++;
            })

        Logger.log(`Processed ${state.count += threads.length} threads`)

        if (!threads?.length || state.count === MAX_THREADS) {
            processResults(state.senders);
            return true;
        }

        return false;
    }

    function processResults(senders: Record<string, number>) {
        const entries = Object.entries(senders).map(entry => [entry[1], entry[0]]);
        Logger.log(`Total senders: ${entries.length}`);

        if (entries.length) {
            getResultsRange(entries.length).setValues(entries).sort({column: 1, ascending: false});
            Logger.log(`Saved results to Sheets`);
        }
    }

    function getResultsRange(numRows: number) {
        const range = Lib.Spreadsheets.getEmptyRange("A:B", "Senders",
            Lib.Spreadsheets.getSpreadsheetID(PropertiesService.getUserProperties(), "SHEET_ID", "Gmail Analyser"),
            SpreadsheetApp.Dimension.COLUMNS);

        Lib.Spreadsheets.getCells(range, 0, 0, 1).merge()
            .setValue(new Date().toLocaleString("en-GB")).setNumberFormat("dd-MM-yyyy hh:mm")
            .setFontWeight("bold").setHorizontalAlignment("left");

        Lib.Spreadsheets.getCells(range, 1, 0, 1).setValues([["Count", "Sender"]]).setFontWeight("bold");
        return Lib.Spreadsheets.getCells(range, 2, 0, numRows);
    }
}

const countSendersTask = new AnalyseEmail.CountSenders();
const countUnreadSendersTask = new AnalyseEmail.CountUnreadSenders();

function countSenders() {
    return countSendersTask.run();
}

function initialiseCountSendersTask() {
    countSendersTask.initialise(countSenders);
}

function stopCountSendersTask() {
    countSendersTask.stop();
}

function countUnreadSenders() {
    return countUnreadSendersTask.run();
}

function initialiseCountUnreadSendersTask() {
    countUnreadSendersTask.initialise(countUnreadSenders);
}

function stopCountUnreadSendersTask() {
    countUnreadSendersTask.stop();
}
