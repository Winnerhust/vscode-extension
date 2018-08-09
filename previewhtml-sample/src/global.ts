var exec = require('child-process-promise').exec;
var iconv = require('iconv-lite');
import * as vscode from 'vscode';

function execute(command: string): Promise<Buffer> {
    // var configuration = vscode.workspace.getConfiguration('codegnuglobal');
    // var encoding = configuration.get<string>('encoding');
    var encoding = "utf8"
    var output = 'utf8';
    if (encoding !== null && encoding !== "") {
        output = 'binary';
    }
    return exec(command, {
        cwd: vscode.workspace.rootPath,
        encoding: output,
        maxBuffer: 10*1024*1024
    //@ts-ignore
    }).then(function(result): Buffer {
        if (encoding !== null && encoding !== "") {
            var decoded = iconv.decode(result.stdout, encoding);
            console.log(decoded);
            return decoded;
        }
        return result.stdout;
    //@ts-ignore
    }).fail(function(error) {
        console.error("Error: " + error);
    //@ts-ignore
    }).progress(function(childProcess) {
        console.log("Command: " + command + " running...");
    });
}
export class GlobalResult{
    tag: string = "";
    line: number = -1;
    path: string = "";
    info: string = "";
    kind: vscode.SymbolKind = 0;
    valid: boolean = false;
    public static parseFromGlobal(content :string):GlobalResult{
        let g = new GlobalResult();
        g.valid = false;
        if (content === null || content === ""){
            return g;
        }

        try{
            const values = content.split(/ +/);
            const tag = values.shift();
            if (tag !== undefined){
                g.tag=tag;
            }
            
            const line = values.shift();
            if (line !== undefined){
                g.line = parseInt(line) - 1;
            }

            const path = values.shift();
            if (path !== undefined){
                g.path = path.replace("%20", " ");
            }
            g.info = values.join(' ');
            g.kind = GlobalResult.parseKind(g.info);
            g.valid = true;
        } catch (ex) {
            console.error("Error: " + ex);
        }
        return g;
    }
    private static parseKind(info: string): vscode.SymbolKind {
        var kind = vscode.SymbolKind.Variable;

        if (info.startsWith('class ')) {
            kind = vscode.SymbolKind.Class;
        } else if (info.startsWith('struct ')) {
            kind = vscode.SymbolKind.Class;
        } else if (info.startsWith('enum ')) {
            kind = vscode.SymbolKind.Enum;
        } else if (info.indexOf('(') !== -1) {
            kind = vscode.SymbolKind.Function;
        }
        return kind;
    }

    public static parseFromScope(content:string):GlobalResult{
        let g = new GlobalResult();
        g.valid = false;
        if (content === null || content === ""){
            return g ;
        }

        try{
            const values = content.split(/ +/);

            const path = values.shift();
            if (path !== undefined){
                g.path = path.replace("%20", " ");
            }

            const tag = values.shift();
            if (tag !== undefined){
                g.tag=tag;
            }
            
            const line = values.shift();
            if (line !== undefined){
                g.line = parseInt(line) - 1;
            }

            g.info = values.join(' ');
            g.kind = GlobalResult.parseKind(g.info);
            g.valid = true;
        } catch (ex) {
            console.error("Error: " + ex);
        }
        return g;
    }
}


export class Global {
    exec: string;

    run(params: string[]): Promise<Buffer> {
        return execute(this.exec + ' ' + params.join(' '));
    }

    updateTags() {
        var configuration = vscode.workspace.getConfiguration('codegnuglobal');
        var shouldupdate = configuration.get<boolean>('autoupdate', true);
        if (shouldupdate) {
            this.run([]);
        }
    }

    parseLine(content: string): GlobalResult{
        return GlobalResult.parseFromScope(content);
    }

    constructor(exec: string) {
        this.exec = exec;
    }
}
