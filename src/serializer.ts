import { NotebookCellData, NotebookCellKind, NotebookData, NotebookSerializer } from 'vscode';

const enum RawLanguage {
	JavaScript = 'javascript',
	TypeScript = 'typescript',
}

interface RawNotebookCell {
	readonly language: RawLanguage;
	readonly value: string;
	readonly kind: NotebookCellKind;
}

export class JavaScriptNotebookSerializer implements NotebookSerializer {
	deserializeNotebook(content: Uint8Array): NotebookData {
		const contents = new TextDecoder().decode(content);
		let raw: RawNotebookCell[];

		try {
			raw = JSON.parse(contents) as RawNotebookCell[];
		} catch {
			console.warn('Failed to parse notebook');
			raw = [];
		}

		const cells = raw.map(item => new NotebookCellData(item.kind, item.value, item.language));

		return new NotebookData(cells);
	}

	serializeNotebook(data: NotebookData): Uint8Array {
		let raw = data.cells.map<RawNotebookCell>(cell => ({
			kind: cell.kind,
			language: cell.languageId as RawLanguage,
			value: cell.value,
		}));

		return new TextEncoder().encode(JSON.stringify(raw));
	}
}
