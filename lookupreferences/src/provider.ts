'use strict';

import * as vscode from 'vscode';
import ReferencesDocument from './referencesDocument';

enum LookupRangeOption{
    InCurrentProcjet = 0,
    InCurrentFile = 1,
    All=2
}

export default class Provider implements vscode.TextDocumentContentProvider, vscode.DocumentLinkProvider {

    static scheme = 'references';

    private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
    private _documents = new Map<string, ReferencesDocument>();
    private _editorDecoration = vscode.window.createTextEditorDecorationType({ textDecoration: 'underline' });
    private _subscriptions: vscode.Disposable;
    private    _lookupOption:LookupRangeOption = LookupRangeOption.InCurrentProcjet;
    private _lookupUri: vscode.Uri|undefined;
    private _currPosIdx:number =-1;
    constructor() {

        // Listen to the `closeTextDocument`-event which means we must
        // clear the corresponding model object - `ReferencesDocument`
        this._subscriptions = vscode.workspace.onDidCloseTextDocument(doc => this._documents.delete(doc.uri.toString()));
    }

    dispose() {
        this._subscriptions.dispose();
        this._documents.clear();
        this._editorDecoration.dispose();
        this._onDidChange.dispose();
    }

    public getCurrReference():vscode.Location|undefined{
        let docs = Array.from(this._documents.values());

        if (docs.length === 0 || docs[0].locations.length === 0){
            return undefined;
        }
        if(this._currPosIdx < 0){
            this._currPosIdx = 0;
            return docs[0].locations[0];
        }

        if (this._currPosIdx >= docs[0].locations.length){
            this._currPosIdx = docs[0].locations.length-1;
            return docs[0].locations[-1];
        }

        return docs[0].locations[this._currPosIdx];
    }
    public getPreReference(): vscode.Location|undefined {
        this._currPosIdx -=1;
        return this.getCurrReference();
    }
    public getNextReference(): vscode.Location|undefined {
        this._currPosIdx +=1;
        return this.getCurrReference();
    }

    public gotoLocation(location:vscode.Location|undefined){
        if (location === undefined){
            return;
        }

        return vscode.workspace.openTextDocument(location.uri).then(doc =>{
            vscode.window.showTextDocument(doc,undefined,false).then(editor=>{
                editor.revealRange(location.range,vscode.TextEditorRevealType.InCenter);
            });
        });
    }
    public setLookupRange(range:string, uri: vscode.Uri) {
        if (range === "Current File"){
            this._lookupOption=LookupRangeOption.InCurrentFile;
            this._lookupUri=uri;
        }else if (range === "Current Project"){
            this._lookupOption=LookupRangeOption.InCurrentProcjet;
        }else{
            this._lookupOption=LookupRangeOption.All;
        }
    }

    // Expose an event to signal changes of _virtual_ documents
    // to the editor
    get onDidChange() {
        return this._onDidChange.event;
    }

    // Provider method that takes an uri of the `references`-scheme and
    // resolves its content by (1) running the reference search command
    // and (2) formatting the results
    provideTextDocumentContent(uri: vscode.Uri): string | Thenable<string> {

        // already loaded?
        let document = this._documents.get(uri.toString());
        if (document) {
            return document.value;
        }

        // Decode target-uri and target-position from the provided uri and execute the
        // `reference provider` command (http://code.visualstudio.com/docs/extensionAPI/vscode-api-commands).
        // From the result create a references document which is in charge of loading,
        // printing, and formatting references
        const [target, pos] = decodeLocation(uri);
        return vscode.commands.executeCommand<vscode.Location[]>('vscode.executeReferenceProvider', target, pos).then(locations => {
            if (locations === undefined || locations.length===0){
                return "";
            }
            // sort by locations and shuffle to begin from target resource
            locations = this._uniqLocations(locations);
            if (this._lookupOption === LookupRangeOption.InCurrentFile){
                locations = this._filterLocations(locations, this._lookupUri);
            }

            locations.sort(Provider._compareLocations);

            // create document and return its early state
            let document = new ReferencesDocument(uri, locations, this._onDidChange);
            this._documents.clear();
            this._documents.set(uri.toString(), document);
            return document.value;
        });
    }

    private static _compareLocations(a: vscode.Location, b: vscode.Location): number {
        if (a.uri.toString() < b.uri.toString()) {
            return -1;
        } else if (a.uri.toString() > b.uri.toString()) {
            return 1;
        } else {
            return a.range.start.line - b.range.start.line;
        }
    }
    private _uniqLocations(locations:vscode.Location[]):vscode.Location[]{
        let locs:vscode.Location[] = [];
        locations.forEach(a=>{
            let hasRepeated = locs.some(b=>{
                if (Provider._compareLocations(a,b)===0){
                    return true;
                }
                return false;
            });
            if (!hasRepeated){
                switch (this._lookupOption) {
                    case LookupRangeOption.InCurrentProcjet:
                        if ((vscode.workspace.rootPath)
                            && (a.uri.fsPath.startsWith(vscode.workspace.rootPath))){
                            locs.push(a);
                        }
                        break;
                    case LookupRangeOption.InCurrentFile:
                        if (this._lookupUri !== undefined && a.uri.fsPath === this._lookupUri.fsPath){
                            locs.push(a);
                        }
                        break;
                    default:
                        locs.push(a);
                        break;
                }
            }
        });
        return locs;
    }
    
    private _filterLocations(locations: vscode.Location[], uri:vscode.Uri|undefined): vscode.Location[] {
        let locs: vscode.Location[]=[];
        if (uri === undefined){
            return locations;
        }

        locations.forEach(loc=>{
            if (loc.uri.fsPath === uri.fsPath){
                locs.push(loc);
            }
        });

        return locs; 
    }

    provideDocumentLinks(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentLink[] {
        // While building the virtual document we have already created the links.
        // Those are composed from the range inside the document and a target uri
        // to which they point
        const doc = this._documents.get(document.uri.toString());
        if (doc) {
            return doc.links;
        }

        return [];
    }
}

let seq = 0;

export function encodeLocation(uri: vscode.Uri, pos: vscode.Position): vscode.Uri {
    const query = JSON.stringify([uri.toString(), pos.line, pos.character]);
    return vscode.Uri.parse(`${Provider.scheme}:References.locations?${query}#${seq++}`);
}

export function decodeLocation(uri: vscode.Uri): [vscode.Uri, vscode.Position] {
    let [target, line, character] = <[string, number, number]>JSON.parse(uri.query);
    return [vscode.Uri.parse(target), new vscode.Position(line, character)];
}
