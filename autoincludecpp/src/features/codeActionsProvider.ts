import * as vscode from 'vscode';
import { Global, GlobalResult } from '../global';

/**
 * 1. 工程启动时初始化gtags
 * 
 * 2. 寻找头文件
 * 			global  -xd symbol
 * 			if(result.some.path == "*.h"|"*.inc"){
 * 				return output result.path
 * 			}else{
 * 				global  -xr symbol
 * 				if (result.path == "*.h"|"*.inc"){
 *					return output result.path;	
 *  			}	
 * 			}
 * 		}
 * 3. 执行命令插入头文件语句
 */

export default class GlobalCodeActionsProvider implements vscode.CodeActionProvider{
	private _global: Global;
	constructor(global:Global){
		this._global = global;
	}

	provideCodeActions(document: vscode.TextDocument, range: vscode.Range | vscode.Selection, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<(vscode.Command | vscode.CodeAction)[]> {
		let diag: undefined|vscode.Diagnostic = undefined;
		context.diagnostics.some(item => {
			if (item.message.includes("undefined") || item.message.includes("找不到")){
				console.log(item.message,item.tags);
				diag = item;
				return true;
			}

			return false;
		});
		
		if (diag === undefined ){
			return null;
		}
		return Promise.all([{
			title: '自动添加头文件',
			command: 'autoIncludeHeadFile.run',
			args: [document,range,context]
		}]);
	}
	public autoIncludeHeadFile(document:vscode.TextDocument, range:vscode.Range|vscode.Selection){
		const symbol= document.getText(range);
		if (symbol.trim().length===0){
			return;
		}
	
		return this._formartFixText(document.uri.fsPath, symbol).then(fixText=>{
			if (fixText === ""){
				return;
			}

			const lineNo = this._findLastIncludeLine(document);
			const line = document.lineAt(lineNo);
			const fixRange = line.range;
			let text=line.text+fixText;
			let edit = new vscode.TextEdit(fixRange, text);

			let workspaceEdit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();
			workspaceEdit.set(document.uri, [edit]);
			vscode.workspace.applyEdit(workspaceEdit);
		});
	}

	private _findLastIncludeLine(doc: vscode.TextDocument):number {
		let lineNo :number=0;
		let lastIncludeLineNo: number=0;
		for (lineNo =0; lineNo <doc.lineCount; lineNo++){
			let line=doc.lineAt(lineNo);
			if (line.text.match("^\s*#include.*")){
				lastIncludeLineNo = line.lineNumber;
			}
		}
		return lastIncludeLineNo;
	}
	private async _formartFixText(path:string, symbol:string): Promise<string> {
		let includePaths:string[]=[];
		await this._getHeadFileList(symbol, includePaths);

		let fixText:string ="";
		if (includePaths.length === 0){
			vscode.window.showErrorMessage(`错误：没有找到${symbol}对应的头文件`);
			return "";
		}

		if (includePaths.length === 1){
			return this._formatIncludeStmt(includePaths[0]);
		}
		const option : vscode.QuickPickOptions= {
			placeHolder:'选择下面需要添加的头文件路径'
		};

		await vscode.window.showQuickPick(includePaths,option).then(item=>{
			if (item === undefined){
				return "";
			}

			console.log(item);

			fixText=this._formatIncludeStmt(item); 
		});

		return fixText;
	}
	private async _getHeadFileList(symbol:string, includePaths:string[]) :Promise<string[]>{
		await this._getDefinitionHeadFileList(symbol,includePaths);
		if (includePaths.length !==0){
			return includePaths;
		}

		await this._getReferenceHeadFileList(symbol,includePaths);

		return includePaths;
	}

	private	_collectPaths (output: Buffer, includePaths:string[]) {
		let self = this;
		if (output !== null && output.toString() !== "") {
			console.log(output);
			let bucket = new Set<string>();
			output.toString().split(/\r?\n/)
				.forEach(function (value, index, array) {
					let result = new GlobalResult(value);
					if (result.valid === false) {
						return;
					}
					if (self._isHeaderFile(result.path)) {
						bucket.add(result.path);
					}
				});
			if (bucket.size !== 0) {
				bucket.forEach(element => {
					includePaths.push(element);
				});
				return;
			}
		}
	}
	
	private async _getDefinitionHeadFileList(symbol: string, includePaths:string[] ):Promise<string[]> {
		let self=this;
		await this._global.run(['--encode-path', '" "', '-xa', symbol])
		.then(output=>{
				self._collectPaths(output,includePaths);
		});
		return includePaths;
	}

	private async _getReferenceHeadFileList(symbol: string, includePaths:string[]):Promise<string[]> {
		let self=this;
		await this._global.run(['--encode-path', '" "', '-xr', symbol])
		.then(output=>{
			self._collectPaths(output,includePaths);
		});
		return includePaths;
	}

	private _isHeaderFile(path:string):boolean{
		if (path.endsWith(".h")|| path.endsWith(".inc")|| path.endsWith(".hpp")){
			return true;
		}

		return false;
	}

	private _getHeadFileRelativePath(headerFile:string):string{
		const path = vscode.workspace.asRelativePath(headerFile);

		return path;
	}
	private _formatIncludeStmt(headerFile: string):string{
		const path = this._getHeadFileRelativePath(headerFile);

		return "\n"+"#include \""+path+"\"";
	}
}