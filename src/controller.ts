import {
  NotebookCell,
  NotebookCellOutput,
  NotebookCellOutputItem,
  notebooks,
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

  constructor(worker: Worker) {
    this.controller.supportedLanguages = ["javascript"];
    this.controller.supportsExecutionOrder = true;
    this.controller.executeHandler = this.executeCells.bind(this);

    const client = new Client(worker);
    this.worker = createProxy(client);
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
