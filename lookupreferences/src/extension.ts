'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import ContentProvider, { encodeLocation } from './provider';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "lookupreferences" is now active!');

	const provider = new ContentProvider();

	// register content provider for scheme `references`
	// register document link provider for scheme `references`
	const providerRegistrations = vscode.Disposable.from(
		vscode.workspace.registerTextDocumentContentProvider(ContentProvider.scheme, provider),
		vscode.languages.registerDocumentLinkProvider({ scheme: ContentProvider.scheme }, provider),
	);

	// register command that crafts an uri with the `references` scheme,
	// open the dynamic document, and shows it in the next editor
	const commandRegistration = vscode.commands.registerTextEditorCommand('editor.printReferences', editor => {
		const uri = encodeLocation(editor.document.uri, editor.selection.active);
		return vscode.workspace.openTextDocument(uri).then(doc => {
            if(editor !== undefined && editor.viewColumn !== undefined){
                vscode.window.showTextDocument(doc, editor.viewColumn + 1);
            }
        });
	});

	context.subscriptions.push(
		provider,
		commandRegistration,
		providerRegistrations
	);
}

// this method is called when your extension is deactivated
export function deactivate() {
}