
import * as vscode from 'vscode';
export default class CallGraphTextDocumentContentProvider implements vscode.TextDocumentContentProvider {
	static scheme = "callgraph-preview";
	private _previewUri:vscode.Uri;
	private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

	constructor(){
		this._previewUri = vscode.Uri.parse(CallGraphTextDocumentContentProvider.scheme+'://authority/callgraph'); 
	}
	get previewUri(){
		return this._previewUri;
	}
	public previewCalledGraph(editor:vscode.TextEditor) {
		const previewUri = this.previewUri;
		return vscode.commands.executeCommand('workbench.action.closeEditorsInOtherGroups').then(()=>{
			return vscode.commands.executeCommand('markdown.showLockedPreviewToSide', previewUri, 'CallGraph Preview').then((success) => {
			}, (reason) => {
				vscode.window.showErrorMessage(reason);
			});
		});
	}

	private findcallingFuncList(symbol:string):string[]{
		
		return [];
	}
	private snippet(str): string {
		return "```mermaid\n" +
			"graph TD;\n" +
			str + "\n" +
			"```";
	}
	public provideTextDocumentContent(uri: vscode.Uri): string {

		return this.snippet(`A-->B;
			A-->C;
			B-->D;
			C-->D;`);
	}

	get onDidChange(): vscode.Event<vscode.Uri> {
		return this._onDidChange.event;
	}

	public update() {
		this._onDidChange.fire(this.previewUri);
	}


}
