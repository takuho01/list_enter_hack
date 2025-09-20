import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  // Shift+Enter
  const shiftEnter = vscode.commands.registerCommand("listEnter.shiftEnter", () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const document = editor.document;
    const selection = editor.selection;
    const line = document.lineAt(selection.start.line);
    const text = line.text;

    // リスト行判定
    const m = text.match(/^(\s*[-*+]\s+)/);
    if (m) {
      // 改行のみ（リストマークは付けない）
      const indent = " ".repeat(m[1].length);
      editor.edit(eb => eb.insert(selection.active, "\n" + indent));
    } else {
      // 普通の改行
      vscode.commands.executeCommand("type", { text: "\n" });
    }
  });

  // Ctrl+Enter
  const ctrlEnter = vscode.commands.registerCommand("listEnter.ctrlEnter", () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const document = editor.document;
    const selection = editor.selection;
    const line = document.lineAt(selection.start.line);
    const text = line.text;

    const m = text.match(/^(\s*[-*+]\s+)/);
    if (m) {
      // 既にリスト → 普通のEnter（次行もリストマーク継承）
      const prefix = m[1];
      editor.edit(eb => eb.insert(selection.active, "\n" + prefix));
    } else {
      // リストでない行 → 次行をリスト化
    const indentMatch = text.match(/^(\s*)/);
    let indent = indentMatch ? indentMatch[1] : "";

    // スペースを2つ削る（足りなければ0まで）
    if (indent.length >= 2) {
    indent = indent.slice(0, -2);
    } else {
    indent = ""; // 2未満なら空に
    }
      const prefix = indent + "- ";
      editor.edit(eb => eb.insert(selection.active, "\n" + prefix));
    }
  });

  context.subscriptions.push(shiftEnter, ctrlEnter);
}

export function deactivate() {}
