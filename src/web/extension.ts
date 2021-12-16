import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "javascript-notebooks.helloWorld",
    () => {
      vscode.window.showInformationMessage(
        "Hello World from JavaScript Notebooks in a web extension host!"
      );
    }
  );

  context.subscriptions.push(disposable);
}
