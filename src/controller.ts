import {
  NotebookCell,
  NotebookCellOutput,
  NotebookCellOutputItem,
  notebooks,
} from "vscode";

export class Controller {
  private readonly controller = notebooks.createNotebookController(
    "javascript-notebook-controller",
    "javascript-notebook",
    "JavaScript Notebook"
  );

  private order = 0;

  constructor() {
    this.controller.supportedLanguages = ["javascript"];
    this.controller.supportsExecutionOrder = true;
    this.controller.executeHandler = this.executeCells.bind(this);
  }

  private executeCells(cells: NotebookCell[]): void {
    for (const cell of cells) {
      this.executeCell(cell);
    }
  }

  private executeCell(cell: NotebookCell): void {
    const execution = this.controller.createNotebookCellExecution(cell);
    execution.executionOrder = ++this.order;
    execution.start(Date.now());

    try {
      const result = eval(cell.document.getText());

      execution.replaceOutput([
        new NotebookCellOutput([NotebookCellOutputItem.text(result)]),
      ]);
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
