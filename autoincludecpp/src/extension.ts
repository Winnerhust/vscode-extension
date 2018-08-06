'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { Global } from './global';
import GlobalCodeActionsProvider from './features/codeActionsProvider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "autoincludecpp" is now active!');

    const global = new Global("global");

    const provider = new GlobalCodeActionsProvider(global);

    context.subscriptions.push(vscode.languages.registerCodeActionsProvider(['c','cpp'], provider));

    const autoincludeHeadFileCmd=vscode.commands.registerTextEditorCommand("autoIncludeHeadFile.run",editor=>{
        console.log(editor.document.uri);
        provider.autoIncludeHeadFile(editor.document, editor.selection);
    });

    context.subscriptions.push(autoincludeHeadFileCmd);
}

// this method is called when your extension is deactivated
export function deactivate() {
}