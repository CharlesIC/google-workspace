import {BatchTasks} from "./batch-tasks";

const MAX_RANGE = 500;

namespace CountSenders {
    type State = { senders: Record<string, number>, count: number };

    export class Task extends BatchTasks.LongRunningTask<State> {
        initialiseState(): State {
            return {senders: {}, count: 0};
        }

        protected processBatch(state: State): BatchTasks.IsProcessingComplete {
            return countSendersBatch(state);
        }
    }

    function countSendersBatch(state: State): boolean {
        const threads = GmailApp.getInboxThreads(state.count, MAX_RANGE);

        if (!threads.length) {
            processResults(state.senders);
            return true;
        }

        const senders = state.senders;
        threads.filter(thread => thread.isUnread())
            .flatMap(thread => thread.getMessages())
            .forEach(message => {
                const sender = message.getFrom();
                senders[sender] ??= 0;
                senders[sender]++;
            })

        Logger.log(`Processed ${state.count += threads.length} threads`)
        return false;
    }

    function processResults(senders: Record<string, number>) {
        Logger.log(`Total senders: ${Object.getOwnPropertyNames(senders).length}`);
        Logger.log("Top senders:")
        Object.entries(senders)
            .sort((a, b) => a[1] < b[1] ? 1 : -1)
            .slice(0, 20)
            .forEach(sender => Logger.log(`\t${sender[1]}\t${sender[0]}`));
    }
}

const countSendersTask = new CountSenders.Task();

function countSenders() {
    return countSendersTask.run();
}

function initialiseCountSendersTask() {
    countSendersTask.initialise(countSenders);
}
