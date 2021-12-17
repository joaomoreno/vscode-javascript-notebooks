import { ExtensionContext, Uri, workspace } from "vscode";
import { Controller } from "./controller";
import { JavaScriptNotebookSerializer } from "./serializer";

export function activate(context: ExtensionContext) {
  const worker = new Worker(
    Uri.joinPath(context.extensionUri, "dist/worker.js").toString()
  );

  context.subscriptions.push(
    workspace.registerNotebookSerializer(
      "javascript-notebook",
      new JavaScriptNotebookSerializer()
    ),
    new Controller(worker)
  );
}
