import * as vscode from 'vscode';

const UNTITLED = "untitled";

function expandPath(path:string, date:Date|null, title:string|null): string{
	if (date !== null){
		path = path
			.replace(/(?<!%)%Y/g, date.getFullYear().toString())
			.replace(/(?<!%)%m/g, (date.getMonth()+1).toString().padStart(2, "0"))
			.replace(/(?<!%)%d/g, date.getDay().toString().padStart(2, "0"))
			.replace(/(?<!%)%H/g, date.getHours().toString().padStart(2, "0"))
			.replace(/(?<!%)%M/g, date.getMinutes().toString().padStart(2, "0"))
			.replace(/(?<!%)%S/g, date.getSeconds().toString().padStart(2, "0"));
	}
	if (title !== null){
		path = path.replace(/(?<!\\)\$\{title\}/g, title);
	}

	return path;
}

function timestamp(date: Date): string{
	return date.getFullYear().toString()
		+ "-" + (date.getMonth()+1).toString().padStart(2, "0")
		+ "-" + date.getDay().toString().padStart(2, "0")
		+ " " + date.getHours().toString().padStart(2, "0")
		+ ":" + date.getMinutes().toString().padStart(2, "0")
		+ ":" + date.getSeconds().toString().padStart(2, "0");
}

async function existsUri(uri: vscode.Uri){
	try{
		await vscode.workspace.fs.stat(uri);
		return true;
	}catch{
		return false;
	}
}

export function activate(context: vscode.ExtensionContext) {

	let disposable = vscode.commands.registerCommand('vscode-markdown-memo.daily-report', async () => {
		const config = vscode.workspace.getConfiguration("vscode-markdown-memo");
		let path = config.get<string>("daily-report-path");
		if (path === undefined || path === ""){
			vscode.window.showErrorMessage("invalid configuration value : vscode-markdown-memo.daily-report-path");
			return;
		}
		const now = new Date();
		path = expandPath(path, now, null);

		let uri = vscode.Uri.file(path);
		if (!await existsUri(uri)){
			uri = uri.with({scheme:"untitled"});
		}

		vscode.workspace.openTextDocument(uri).then(doc=>{
			vscode.window.showTextDocument(doc).then(editor=>{
				editor.edit(e=>{
					const ts = timestamp(now);
					e.insert(
						new vscode.Position(doc.lineCount+1, 0),
					    `\n# ${ts}\n`
					);
				});
			});
		});
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('vscode-markdown-memo.new-memo', async () => {
		const config = vscode.workspace.getConfiguration("vscode-markdown-memo");
		let path = config.get<string>("memo-path");
		if (path === undefined || path === ""){
			vscode.window.showErrorMessage("invalid configuration value : vscode-markdown-memo.memo-path");
			return;
		}

		const now = new Date();

		let title = UNTITLED;
		let uri = vscode.Uri.file(expandPath(path, now, title));
		let ok = false;
		for (let i=2; i++; i<100){
			if (!await existsUri(uri)){
				ok = true;
				break;
			}
			title = UNTITLED+i;
			uri = vscode.Uri.file(expandPath(path, now, title));
		}
		if (!ok){
			vscode.window.showErrorMessage("filename duplication error.");
			return;
		}
		uri = uri.with({scheme:"untitled"});

		vscode.workspace.openTextDocument(uri).then(doc=>{
			vscode.window.showTextDocument(doc).then(editor=>{
				editor.edit(e=>{
					const ts = timestamp(now);
					e.insert(
						new vscode.Position(0, 0),
					    `---\ntitle: ${title}\ncreated: ${ts}\n---\n`
					);
				});
			});
		});
	});
	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('vscode-markdown-memo.save-memo', async () => {
		const config = vscode.workspace.getConfiguration("vscode-markdown-memo");
		let path = config.get<string>("memo-path");
		if (path === undefined || path === ""){
			vscode.window.showErrorMessage("invalid configuration value : vscode-markdown-memo.memo-path");
			return;
		}
		if (vscode.window.activeTextEditor === undefined){
			return;
		}

		const now = new Date();

		const doc = vscode.window.activeTextEditor.document;
		let before = true;
		let title: string|null = null;
		for(let i=0; i<doc.lineCount; i++){
			if (doc.lineAt(i).text.startsWith("---")){
				if (before){
					before = false;
					continue;
				} else {
					break;
				}
			}

			let match = doc.lineAt(i).text.match(/^title\s*:\s*(.*)\s*$/);
			if (match !== null){
				title = match[1];
				break;
			}
		}
		if (title === null){
			title = UNTITLED;
		}

		doc.save();

		path = expandPath(path, now, title);
		vscode.window.showInformationMessage(path);

		let uri = vscode.Uri.file(path);
		await vscode.workspace.fs.rename(doc.uri, uri);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}
