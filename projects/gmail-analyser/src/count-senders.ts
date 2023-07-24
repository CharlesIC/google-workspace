import {Lib} from "lib/types/all";

namespace AnalyseEmail {
    const MAX_RANGE = 500;
    const MAX_THREADS = 20;

    type State = { senders: Record<string, number>, count: number };

    export class CountSenders extends Lib.BatchTasks.LongRunningTask<State> {
        initialiseState(): State {
            return {senders: {}, count: 0};
        }

        protected processBatch(state: State): Lib.BatchTasks.IsProcessingComplete {
            return countSendersBatch(state);
        }
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
        getResultsRange(entries.length).setValues(entries).sort({column: 1, ascending: false});
        Logger.log(`Total senders: ${entries.length}`);
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

function countSenders() {
    return countSendersTask.run();
}

function initialiseCountSendersTask() {
    countSendersTask.initialise(countSenders);
}

function stopCountSendersTask() {
    countSendersTask.stop();
}
