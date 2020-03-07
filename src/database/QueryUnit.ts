"use strict";
import * as vscode from "vscode";
import { IConnection } from "../model/Connection";
import { Console } from "../common/OutputChannel";
import { SqlViewManager } from "./SqlViewManager";
import { ConnectionManager } from "./ConnectionManager";

export class QueryUnit {
    public static readonly maxTableCount = QueryUnit.getConfiguration().get<number>("maxTableCount");

    public static getConfiguration(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration("vscode-mysql");
    }

    public static queryPromise<T>(connection, sql: string): Promise<T> {
        return new Promise((resolve, reject) => {
            // Console.log(`Execute SQL:${sql}`)
            connection.query(sql, (err, rows) => {
                if (err) {
                    Console.log(err)
                    reject("Error: " + err.message);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    public static async runQuery(sql?: string, connectionOptions?: IConnection) {
        if (!sql && !vscode.window.activeTextEditor) {
            vscode.window.showWarningMessage("No SQL file selected");
            return;
        }
        let connection: any;
        if (!connectionOptions && !(connection = await ConnectionManager.getLastActiveConnection())) {
            vscode.window.showWarningMessage("No MySQL Server or Database selected");
            return;
        } else if (connectionOptions) {
            connectionOptions.multipleStatements = true;
            connection = await ConnectionManager.getConnection(connectionOptions)
        }

        if (!sql) {
            const activeTextEditor = vscode.window.activeTextEditor;
            const selection = activeTextEditor.selection;
            if (selection.isEmpty) {
                sql = activeTextEditor.document.getText();
            } else {
                sql = activeTextEditor.document.getText(selection);
            }
        }

        connection.query(sql, (err, data) => {
            if (Array.isArray(data)) {
                if (data.some(((row) => Array.isArray(row)))) {
                    // rows.forEach((row, index) => {
                    //     if (Array.isArray(row)) {
                    //         SqlViewManager.showQueryResult(row, 'result');
                    //     } else {
                    //         Console.log(JSON.stringify(row));
                    //     }
                    // });
                } else {
                    SqlViewManager.showQueryResult({ sql, data, splitResultView: true });
                }

            } else {
                Console.log(JSON.stringify(data));
            }

            if (err) {
                Console.log(err);
            } else {
            }
        });
    }

    public static async createSQLTextDocument(sql: string = "") {
        const textDocument = await vscode.workspace.openTextDocument({ content: sql, language: "sql" });
        return vscode.window.showTextDocument(textDocument);
    }


    private static sqlDocument: vscode.TextEditor;
    public static async showSQLTextDocument(sql: string = "") {

        if (this.sqlDocument && !this.sqlDocument.document.isClosed ) {
            this.sqlDocument.edit((editBuilder) => {
                let lastLine = this.sqlDocument.document.lineCount-1;
                editBuilder.replace(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(lastLine, this.sqlDocument.document.lineAt(lastLine).text.length)), sql);
            })
        } else {
            const textDocument = await vscode.workspace.openTextDocument({ content: sql, language: "sql" });
            this.sqlDocument = await vscode.window.showTextDocument(textDocument)
        }
        return this.sqlDocument;
    }

}
