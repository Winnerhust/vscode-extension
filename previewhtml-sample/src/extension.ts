'use strict';

import * as vscode from 'vscode';
import CallGraphTextDocumentContentProvider from './callgraphProvider';
import { Global } from './global';


export function activate(context: vscode.ExtensionContext) {

	const global = new Global("cscope");

	const callgraphScheme=CallGraphTextDocumentContentProvider.scheme;
	const provider = new CallGraphTextDocumentContentProvider(global);
	const registration = vscode.workspace.registerTextDocumentContentProvider(callgraphScheme, provider);

	let disposable = vscode.commands.registerTextEditorCommand('callgraph.previewcalled', editor=> {
		let pos = vscode.window.activeTextEditor.selection;
		let range = vscode.window.activeTextEditor.document.getWordRangeAtPosition(pos.start);
		let symbol = vscode.window.activeTextEditor.document.getText(range);
		provider.setPreviewSymbol(symbol);
		return provider.previewCalledGraph(symbol);
	});

	vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
		if (e.document === vscode.window.activeTextEditor.document) {
			provider.update();
		}
	});

	vscode.window.onDidChangeTextEditorSelection((e: vscode.TextEditorSelectionChangeEvent) => {
		if (e.textEditor === vscode.window.activeTextEditor) {
			provider.update();
		}
	})
	context.subscriptions.push(disposable, registration);

	console.log("activating callgraph extension")
}

