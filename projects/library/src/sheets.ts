import {Properties} from "lib/properties";

export namespace Spreadsheets {
    type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
    type Range = GoogleAppsScript.Spreadsheet.Range;
    type Dimension = GoogleAppsScript.Spreadsheet.Dimension;
    type Properties = GoogleAppsScript.Properties.Properties;

    export function create(name: string): string {
        const sheet = SpreadsheetApp.create(name);
        Logger.log(`Created the sheet '${sheet.getName()}' with ID ${sheet.getId()}`);
        return sheet.getId();
    }

    export function getSpreadsheetID(properties: Properties, property: string, defaultName: string): string {
        let sheetId = properties.getProperty(property);

        if (sheetId) {
            try {
                SpreadsheetApp.openById(sheetId);
            } catch (ignored) {
                sheetId = null;
            }
        }

        return sheetId ? sheetId : Properties.set(properties, property, create(defaultName));
    }

    export function getSheet(name: string, spreadsheetID: string): Sheet {
        const spreadsheet = SpreadsheetApp.openById(spreadsheetID);
        const sheet = spreadsheet.getSheetByName(name);
        return sheet ? sheet : spreadsheet.insertSheet(name);
    }

    export function getRange(a1Notation: string, sheetName: string, spreadSheetID: string): Range {
        return getSheet(sheetName, spreadSheetID).getRange(a1Notation);
    }

    export function getEmptyRange(a1Notation: string, sheetName: string, spreadSheetID: string,
                                  shift?: Dimension, margin = 1): Range {
        const range = getRange(a1Notation, sheetName, spreadSheetID);

        if (!range.isBlank()) {
            if (!shift) {
                throw new Error(`Range '${range.getSheet().getName()}!${range.getA1Notation()}' is not empty`);
            }

            if (shift == SpreadsheetApp.Dimension.COLUMNS) {
                range.getSheet().insertColumns(range.getColumn(), range.getNumColumns() + margin);
            }

            if (shift == SpreadsheetApp.Dimension.ROWS) {
                range.getSheet().insertRows(range.getRow(), range.getNumRows() + margin);
            }
        }

        return range;
    }

    export function getCells(range: Range, rowOffset = 0, columnOffset = 0,
                             numRows?: number, numColumns?: number): Range {
        return range.getSheet().getRange(range.getRow() + rowOffset, range.getColumn() + columnOffset,
            numRows ?? range.getNumRows(), numColumns ?? range.getNumColumns());
    }
}
