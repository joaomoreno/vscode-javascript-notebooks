import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "jsnb" is now active in the web extension host!'
  );

  let disposable = vscode.commands.registerCommand("jsnb.helloWorld", () => {
    vscode.window.showInformationMessage(
      "Hello World from JavaScript Notebooks in a web extension host!"
    );
  });

  context.subscriptions.push(disposable);
}
