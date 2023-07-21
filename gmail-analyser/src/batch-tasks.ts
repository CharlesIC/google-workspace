const MAX_EXECUTION_MILLIS = 6 * 60 * 1000;
const TRIGGER_DELAY_MILLIS = 60 * 1000;
const CACHE_EXPIRATION_SECONDS = 5 * 60;

export namespace BatchTasks {
    export type IsProcessingComplete = boolean;
    type StateRecord = Record<any, any>;
    type BatchTaskRunner<State extends StateRecord> = () => LongRunningTask<State>;
    type Execution<State> = { state: State, handler: string, batches: number, triggerId?: string };

    export abstract class LongRunningTask<State extends StateRecord> {
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

        run(): LongRunningTask<State> {
            runBatchTask(this);
            return this;
        }
    }

    function initialiseExecution<State extends StateRecord>(task: LongRunningTask<State>, taskRunner: BatchTaskRunner<State>) {
        const execution = readExecution(task);

        if (execution) {
            throw new Error(`Execution already in progress for task ${taskRunner.name}`);
        }

        writeExecution(task, {state: task.initialiseState(), handler: taskRunner.name, batches: 0});
        Logger.log(`:: Initialised execution for task ${taskRunner.name}`);

        task.run();
    }

    function runBatchTask<State extends StateRecord>(task: LongRunningTask<State>) {
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

    function scheduleNextTaskExecution<State extends StateRecord>(task: LongRunningTask<State>, current: Execution<State>) {
        const trigger = ScriptApp.newTrigger(current.handler).timeBased().after(TRIGGER_DELAY_MILLIS).create();
        writeExecution(task, {...current, triggerId: trigger.getUniqueId()});
        Logger.log(`:: Scheduled execution for task ${task.name} with ID ${trigger.getUniqueId()}`);
    }

    function readExecution<State extends StateRecord>(task: LongRunningTask<State>): Execution<State> | null {
        const cache = CacheService.getUserCache();
        const execution = cache.get(task.name);
        return execution ? JSON.parse(execution) : execution;
    }

    function writeExecution<State extends StateRecord>(task: LongRunningTask<State>, state: Execution<State>) {
        const cache = CacheService.getUserCache();
        cache.put(task.name, JSON.stringify(state), CACHE_EXPIRATION_SECONDS);
    }

    function deleteExecution<State extends StateRecord>(task: LongRunningTask<State>) {
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
    }

    function canProcessNextBatch(startMillis: number, processedBatches: number) {
        const elapsed = Date.now() - startMillis;
        const remaining = MAX_EXECUTION_MILLIS - elapsed;
        const batchDuration = processedBatches > 0 ? elapsed / processedBatches : 0;
        return remaining > batchDuration + TRIGGER_DELAY_MILLIS;
    }
}
