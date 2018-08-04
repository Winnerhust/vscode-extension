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

	const referencePickItems :vscode.QuickPickItem[]=initReferencePickItems();

	// register content provider for scheme `references`
	// register document link provider for scheme `references`
	const providerRegistrations = vscode.Disposable.from(
		vscode.workspace.registerTextDocumentContentProvider(ContentProvider.scheme, provider),
		vscode.languages.registerDocumentLinkProvider({ scheme: ContentProvider.scheme }, provider),
	);

	// register command that crafts an uri with the `references` scheme,
	// open the dynamic document, and shows it in the next editor
	const commandRegistration = vscode.commands.registerTextEditorCommand('references.showAll', editor => {
		const uri = encodeLocation(editor.document.uri, editor.selection.active);
		let pos = editor.document.getWordRangeAtPosition(editor.selection.active);
		let symbol = editor.document.getText(pos);
		let options: vscode.QuickPickOptions={
			placeHolder:'lookup '+symbol+' references in'
		};
		vscode.window.showQuickPick(referencePickItems,options).then(item=>{
			if (item === undefined){
				return;
			}

			provider.setLookupRange(item.label, editor.document.uri);
			return vscode.workspace.openTextDocument(uri).then(doc => {
            	if(editor !== undefined && editor.viewColumn !== undefined){
            	    vscode.window.showTextDocument(doc, editor.viewColumn,false);
           	 }
        	});
		});
	});
	const preReferenceCmd= vscode.commands.registerCommand('references.pre', editor => {
		let loc = provider.getPreReference();
		provider.gotoLocation(loc);
	});
	const nextReferenceCmd= vscode.commands.registerCommand('references.next', editor => {
		let loc = provider.getNextReference();
		provider.gotoLocation(loc);
	});

	context.subscriptions.push(
		provider,
		commandRegistration,
		providerRegistrations,
		preReferenceCmd,
		nextReferenceCmd
	);
}

function initReferencePickItems(){
	let pickitems :vscode.QuickPickItem[]=[];

	pickitems.push({label:'Current Project',description:'lookup references in current project'});
	pickitems.push({label:'Current File',description:'lookup references in current file'});

	return pickitems;
}
// this method is called when your extension is deactivated
export function deactivate() {
}