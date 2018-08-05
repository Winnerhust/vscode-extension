var exec = require('child-process-promise').exec;
var iconv = require('iconv-lite');
import * as vscode from 'vscode';

function execute(command: string): Promise<Buffer> {
    var configuration = vscode.workspace.getConfiguration('codegnuglobal');
    var encoding = configuration.get<string>('encoding');
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
    valid: boolean;
    constructor(content :string){
        this.valid = false;
        if (content === null || content === ""){
            return;
        }

        try{
            const values = content.split(/ +/);
            const tag = values.shift();
            if (tag !== undefined){
                this.tag=tag;
            }
            
            const line = values.shift();
            if (line !== undefined){
                this.line = parseInt(line) - 1;
            }

            const path = values.shift();
            if (path !== undefined){
                this.path = path.replace("%20", " ");
            }

            this.info = values.join(' ');
            this.valid = true;
        } catch (ex) {
            console.error("Error: " + ex);
        }
        return;
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
            this.run(['-u']);
        }
    }

    parseLine(content: string): GlobalResult{
        return new GlobalResult(content);
    }

    private parseKind(info: string): vscode.SymbolKind {
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

    constructor(exec: string) {
        this.exec = exec;
    }
}
