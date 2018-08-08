'use strict';

import * as vscode from 'vscode';
import CallGraphTextDocumentContentProvider from './callgraphProvider';


export function activate(context: vscode.ExtensionContext) {

	const callgraphScheme=CallGraphTextDocumentContentProvider.scheme;
	const provider = new CallGraphTextDocumentContentProvider();
	const registration = vscode.workspace.registerTextDocumentContentProvider(callgraphScheme, provider);

	let disposable = vscode.commands.registerTextEditorCommand('callgraph.previewcalled', editor=> {
		return provider.previewCalledGraph(editor);
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

