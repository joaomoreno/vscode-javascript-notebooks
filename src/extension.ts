import { ExtensionContext, workspace } from "vscode";
import { Controller } from "./controller";
import { JavaScriptNotebookSerializer } from "./serializer";

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    workspace.registerNotebookSerializer(
      "javascript-notebook",
      new JavaScriptNotebookSerializer()
    ),
    new Controller(context.extensionUri)
  );
}
