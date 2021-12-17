import {
  NotebookCell,
  NotebookCellOutput,
  NotebookCellOutputItem,
  notebooks,
  Uri,
} from "vscode";
import { Client, createProxy } from "./ipc";
import { WorkerProtocol } from "./protocol";

export class Controller {
  private readonly controller = notebooks.createNotebookController(
    "javascript-notebook-controller",
    "javascript-notebook",
    "JavaScript Notebook"
  );

  private order = 0;
  private readonly worker: WorkerProtocol;

  constructor(rootUri: Uri) {
    this.controller.supportedLanguages = ["javascript"];
    this.controller.supportsExecutionOrder = true;
    this.controller.executeHandler = this.executeCells.bind(this);

    const workerPath = Uri.joinPath(rootUri, "dist/worker.js").toString();
    const worker = new Worker(workerPath);
    const { port1, port2 } = new MessageChannel();
    worker.postMessage(port2, [port2]);

    this.worker = createProxy(new Client(port1));
  }

  private async executeCells(cells: NotebookCell[]): Promise<void> {
    for (const cell of cells) {
      await this.executeCell(cell);
    }
  }

  private async executeCell(cell: NotebookCell): Promise<void> {
    const execution = this.controller.createNotebookCellExecution(cell);
    execution.executionOrder = ++this.order;
    execution.start(Date.now());

    try {
      const result = await this.worker.execute(cell.document.getText());

      if (result === undefined) {
        execution.replaceOutput([]);
      } else {
        execution.replaceOutput([
          new NotebookCellOutput([NotebookCellOutputItem.text(result)]),
        ]);
      }

      execution.end(true, Date.now());
    } catch (err: any) {
      execution.replaceOutput([
        new NotebookCellOutput([NotebookCellOutputItem.error(err)]),
      ]);
      execution.end(false, Date.now());
    }
  }

  dispose(): void {
    this.controller.dispose();
  }
}
