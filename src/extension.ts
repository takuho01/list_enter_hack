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
  // Ctrl+Shift+Enter
  // 仕様:
  // - 現在行が "- " で始まる → 改行し、同レベルインデントで "- " を付与
  // - 現在行が先頭2スペース以上 → 上へ最大20行スキャン
  //     - 途中で "- " のリスト行に当たれば、そのインデントで "- " を付与
  //     - インデント無し行（先頭カラム開始）に当たれば通常Enter
  //     - 20行スキャンしても判断できなければ通常Enter
  // - 上記以外 → 通常Enter
  const ctrlShiftEnter = vscode.commands.registerCommand("listEnter.ctrlShiftEnter", () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const document = editor.document;
    const selection = editor.selection;
    const curLineNo = selection.start.line;
    const curText = document.lineAt(curLineNo).text;

    // 1) 現在行が "- " で始まる（同レベルで継続）
    const listHere = curText.match(/^(\s*)- /);
    if (listHere) {
      const prefix = listHere[1] + "- ";
      editor.edit(eb => eb.insert(selection.active, "\n" + prefix));
      return;
    }

    // 2) 先頭が2つ以上スペース → 上方向スキャン
    if (/^ {2,}/.test(curText)) {
      for (let i = curLineNo - 1, hop = 0; i >= 0 && hop < 20; i--, hop++) {
        const t = document.lineAt(i).text;

        // 途中のリスト行（- のみ対象）
        const lm = t.match(/^(\s*)- /);
        if (lm) {
          const prefix = lm[1] + "- ";
          editor.edit(eb => eb.insert(selection.active, "\n" + prefix));
          return;
        }

        // 先頭カラム開始（インデント無しの行）に到達 → リスト文中ではないと判断
        if (/^\S/.test(t)) {
          vscode.commands.executeCommand("type", { text: "\n" });
          return;
        }
        // 空行やインデント行はスキャン継続
      }
      // 20行スキャンして結論出ず → 通常Enter
      vscode.commands.executeCommand("type", { text: "\n" });
      return;
    }

    // 3) その他 → 通常Enter
    vscode.commands.executeCommand("type", { text: "\n" });
  });

// Delete（スマート削除）
const smartDelete = vscode.commands.registerCommand("listEnter.smartDelete", async () => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;

  const doc = editor.document;
  const sel = editor.selection;
  const lineNo = sel.start.line;

  // 先頭行ならフォールバック
  if (lineNo === 0) {
    await vscode.commands.executeCommand("deleteLeft");
    return;
  }

  const line = doc.lineAt(lineNo);
  const text = line.text;

  const isIndentOnly = /^\s*$/.test(text);
  const isDashOnly   = /^\s*-\s*$/.test(text);

  // 前行の末尾位置
  const prevLineNo = Math.max(0, lineNo - 1);
  const prevLineEnd = doc.lineAt(prevLineNo).range.end;

  // インデントのみ行 → 行ごと削除 + 前行末尾へ
  if (isIndentOnly) {
    // 最終行かどうかで削除範囲を分岐
    const delRange = (lineNo < doc.lineCount - 1)
      ? new vscode.Range(line.rangeIncludingLineBreak.start, line.rangeIncludingLineBreak.end)
      : new vscode.Range(line.range.start, line.range.end);

    const ok = await editor.edit(eb => eb.delete(delRange));
    if (ok) {
      editor.selection = new vscode.Selection(prevLineEnd, prevLineEnd);
    } else {
      await vscode.commands.executeCommand("deleteLeft");
    }
    return;
  }

  // 「- 」のみ行 → 行ごと削除 + 前行末尾へ
  if (isDashOnly) {
    const delRange = (lineNo < doc.lineCount - 1)
      ? new vscode.Range(line.rangeIncludingLineBreak.start, line.rangeIncludingLineBreak.end)
      : new vscode.Range(line.range.start, line.range.end);

    const ok = await editor.edit(eb => eb.delete(delRange));
    if (ok) {
      editor.selection = new vscode.Selection(prevLineEnd, prevLineEnd);
    } else {
      await vscode.commands.executeCommand("deleteLeft");
    }
    return;
  }

  // それ以外 → 通常 Delete
  await vscode.commands.executeCommand("deleteLeft");
});


  context.subscriptions.push(shiftEnter, ctrlEnter, ctrlShiftEnter, smartDelete);
}

export function deactivate() {}
