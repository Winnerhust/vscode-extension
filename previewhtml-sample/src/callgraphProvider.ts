
import * as vscode from 'vscode';
import { Global, GlobalResult } from './global';
export default class CallGraphTextDocumentContentProvider implements vscode.TextDocumentContentProvider {
	static scheme = "callgraph-preview";
	private _previewUri:vscode.Uri;
	private _global: Global;
	private _symbol:string="";
	private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

	constructor(global:Global){
		this._global=global;
		this._previewUri = vscode.Uri.parse(CallGraphTextDocumentContentProvider.scheme+'://authority/callgraph'); 
	}
	get previewUri(){
		return this._previewUri;
	}
	public setPreviewSymbol(symbol:string){
		this._symbol = symbol;
	}
	public previewCalledGraph(symbol:string) {
		if(symbol ==="" || symbol === null){
			return;
		}
		this.setPreviewSymbol(symbol);

		const previewUri = this.previewUri;
		return vscode.commands.executeCommand('workbench.action.closeEditorsInOtherGroups').then(()=>{
			return vscode.commands.executeCommand('markdown.showLockedPreviewToSide', previewUri, 'CallGraph Preview').then((success) => {
			}, (reason) => {
				vscode.window.showErrorMessage(reason);
			});
		});
	}

	private async findcallingFuncList(symbol:string):Promise<Set<string>>{
		let bucket: Set<string> = new Set<string>();
		if (symbol === ""|| symbol === null){
			return bucket;
		}

		let output = await this._global.run(["-d","-L","-3",symbol]);
		if (output === undefined|| output === null){
			return bucket;
		}
		output.toString().split(/[\r\n]/g).forEach(function(item){
			let result=GlobalResult.parseFromScope(item);
			if (result.valid !== true){
				return;
			}

			bucket.add(symbol+"-->"+result.tag+";");
		});

		return bucket;
	}

	private async findcallingFuncListDepth(symbol:string, depth:number):Promise<Set<string>>{
		const self = this;
		let result :Set<string> = new Set<string>();
		if (depth === 0){
			return result;
		}else if (depth === 1){
			return self.findcallingFuncList(symbol);
		}else{
			let list = await self.findcallingFuncList(symbol);
			let listStmt = Array.from(list.values());
			let i = 0;
			for(i=0; i < listStmt.length; i++){
				let nextSymbol = listStmt[i].split(/(-->)|;/)[2];
				let li = await self.findcallingFuncListDepth(nextSymbol,depth-1);
				li.forEach(function(item){
					list.add(item);
				});
			}

			return list;
		}

	}
	private snippet(str): string {
		return "```mermaid\n" +
			"graph LR;\n" +
  			str + "\n" +
			"```";
	}

	public  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
		if(this._symbol ==="" || this._symbol === null){
			return null;
		}
		let list = await this.findcallingFuncListDepth(this._symbol, 3).then()
		let liststr = Array.from(list.values()).join("\n");
		return this.snippet(liststr);
	}

	get onDidChange(): vscode.Event<vscode.Uri> {
		return this._onDidChange.event;
	}

	public update() {
		this._onDidChange.fire(this.previewUri);
	}


}
