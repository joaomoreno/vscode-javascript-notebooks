import { NotebookCell, NotebookCellOutput, NotebookCellOutputItem, NotebookDocument, notebooks, Uri } from 'vscode';
import { Client, createProxy } from './ipc';
import { WorkerProtocol } from './protocol';

export class Controller {
	private readonly controller = notebooks.createNotebookController(
		'javascript-notebook-controller',
		'javascript-notebook',
		'JavaScript Notebook'
	);

	private order = 0;
	private readonly workers = new WeakMap<NotebookDocument, WorkerProtocol>();

	constructor(private readonly rootUri: Uri) {
		this.controller.supportedLanguages = ['javascript'];
		this.controller.supportsExecutionOrder = true;
		this.controller.executeHandler = this.executeCells.bind(this);
	}

	private async executeCells(cells: NotebookCell[], document: NotebookDocument): Promise<void> {
		let worker = this.workers.get(document);

		if (!worker) {
			const workerPath = Uri.joinPath(this.rootUri, 'dist/worker.js').toString();
			const webWorker = new Worker(workerPath);
			const { port1, port2 } = new MessageChannel();
			webWorker.postMessage(port2, [port2]);

			worker = createProxy<WorkerProtocol>(new Client(port1));
			this.workers.set(document, worker);
		}

		for (const cell of cells) {
			await this.executeCell(worker, cell);
		}
	}

	private async executeCell(worker: WorkerProtocol, cell: NotebookCell): Promise<void> {
		const execution = this.controller.createNotebookCellExecution(cell);
		execution.executionOrder = ++this.order;
		execution.start(Date.now());

		try {
			const result = await worker.execute(cell.document.getText());

			if (result === undefined) {
				execution.replaceOutput([]);
			} else {
				execution.replaceOutput([new NotebookCellOutput([NotebookCellOutputItem.text(result)])]);
			}

			execution.end(true, Date.now());
		} catch (err: any) {
			execution.replaceOutput([new NotebookCellOutput([NotebookCellOutputItem.error(err)])]);
			execution.end(false, Date.now());
		}
	}

	dispose(): void {
		this.controller.dispose();
	}
}
