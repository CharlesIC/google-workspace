const MAX_EXECUTION_MILLIS = 6 * 60 * 1000;
const TRIGGER_DELAY_MILLIS = 60 * 1000;
const CACHE_EXPIRATION_SECONDS = 5 * 60;

type IsProcessingComplete = boolean;
type StateRecord = Record<any, any>;
type BatchTaskRunner<State extends StateRecord> = () => BatchTask<State>;
type Execution<State> = { state: State, handler: string, batches: number, triggerId?: string };

abstract class BatchTask<State extends StateRecord> {
    private processingComplete = false;

    get name() {
        return this.constructor.name;
    }

    get completed() {
        return this.processingComplete;
    }

    abstract initialiseState(): State;

    protected abstract processBatch(state: State): IsProcessingComplete;

    processNextBatch(state: State) {
        this.processingComplete = this.processBatch(state);
    }

    initialise(runner: BatchTaskRunner<State>) {
        initialiseExecution(this, runner);
    }

    run(): BatchTask<State> {
        runBatchTask(this);
        return this;
    }
}

function initialiseExecution<State extends StateRecord>(task: BatchTask<State>, taskRunner: BatchTaskRunner<State>) {
    const execution = readExecution(task);

    if (execution) {
        throw new Error(`Execution already in progress for task ${taskRunner.name}`);
    }

    writeExecution(task, {state: task.initialiseState(), handler: taskRunner.name, batches: 0});
    Logger.log(`:: Initialised execution for task ${taskRunner.name}`);

    task.run();
}

function runBatchTask<State extends StateRecord>(task: BatchTask<State>) {
    const startMillis = Date.now();
    const execution = readExecution(task);

    if (!execution) {
        throw new Error(`Execution state for task ${task.name} not found in cache`);
    }

    while (!task.completed && canProcessNextBatch(startMillis, execution.batches)) {
        Logger.log(`:: Running batch ${++execution.batches} of task ${task.name}...`);
        task.processNextBatch(execution.state);
        Logger.log(`:: ${getRemainingTime(startMillis)} remaining`)
    }

    if (execution.triggerId) {
        deleteTrigger(execution.triggerId);
    }

    if (!task.completed) {
        scheduleNextTaskExecution(task, execution);
        return;
    }

    Logger.log(`:: Finished execution of task ${task.name}`);
    deleteExecution(task);
}

function canProcessNextBatch(startMillis: number, processedBatches: number) {
    const elapsed = Date.now() - startMillis;
    const remaining = MAX_EXECUTION_MILLIS - elapsed;
    const batchDuration = processedBatches > 0 ? elapsed / processedBatches : 0;
    return remaining > batchDuration + TRIGGER_DELAY_MILLIS;
}

function scheduleNextTaskExecution<State extends StateRecord>(task: BatchTask<State>, current: Execution<State>) {
    const trigger = ScriptApp.newTrigger(current.handler).timeBased().after(TRIGGER_DELAY_MILLIS).create();
    writeExecution(task, {...current, triggerId: trigger.getUniqueId()});
    Logger.log(`:: Scheduled execution for task ${task.name} with ID ${trigger.getUniqueId()}`);
}

function readExecution<State extends StateRecord>(task: BatchTask<State>): Execution<State> | null {
    const cache = CacheService.getUserCache();
    const execution = cache.get(task.name);
    return execution ? JSON.parse(execution) : execution;
}

function writeExecution<State extends StateRecord>(task: BatchTask<State>, state: Execution<State>) {
    const cache = CacheService.getUserCache();
    cache.put(task.name, JSON.stringify(state), CACHE_EXPIRATION_SECONDS);
}

function deleteExecution<State extends StateRecord>(task: BatchTask<State>) {
    const cache = CacheService.getUserCache();
    cache.remove(task.name);
}

function deleteTrigger(triggerId: string) {
    ScriptApp.getProjectTriggers()
        .filter(trigger => trigger.getUniqueId() == triggerId)
        .forEach(trigger => ScriptApp.deleteTrigger(trigger));

    Logger.log(`:: Deleted trigger with ID ${triggerId}`);
}

function getRemainingTime(startMillis: number) {
    const remainingSeconds = (startMillis + MAX_EXECUTION_MILLIS - Date.now()) / 1000;
    const minutes = remainingSeconds / 60;
    const seconds = remainingSeconds % 60;
    return `${minutes.toFixed()}m ${seconds.toFixed()}s`
    // return `(${startMillis} + ${MAX_EXECUTION_MILLIS} - ${now}) ${minutes.toFixed()}m ${seconds.toFixed()}s`
}

//--- Test ---//

type MyTaskState = { senders: Record<string, number>, count: number };

function runThreadBatch(state: MyTaskState): boolean {
    const threads = GmailApp.getInboxThreads(state.count, 500);

    if (!threads.length) {
        Logger.log(`Total senders: ${Object.getOwnPropertyNames(state.senders).length}`);
        Logger.log("Top senders:")

        Object.entries(state.senders)
            .sort((a, b) => a[1] < b[1] ? 1 : -1)
            .slice(0, 20)
            .forEach(sender => Logger.log(`\t${sender[1]}\t${sender[0]}`));

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

class ThreadTask extends BatchTask<MyTaskState> {
    initialiseState(): MyTaskState {
        return {senders: {}, count: 0};
    }

    protected processBatch(state: MyTaskState): IsProcessingComplete {
        return runThreadBatch(state);
    }
}

const threadTask = new ThreadTask();

function analyseThreads() {
    return threadTask.run();
}

function initialiseThreadTask() {
    threadTask.initialise(analyseThreads);
}
