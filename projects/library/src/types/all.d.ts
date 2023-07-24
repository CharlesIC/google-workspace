import {Properties as PropertyUtils} from "lib/properties";
import {BatchTasks as BatchTaskUtils} from "../batch-tasks";
import {Spreadsheets as SpreadsheetUtils} from "../sheets";
import {Optional as OptionalUtils} from "../optional";

declare namespace Lib {
    export import Optional = OptionalUtils;
    export import Properties = PropertyUtils;
    export import BatchTasks = BatchTaskUtils;
    export import Spreadsheets = SpreadsheetUtils;
}
