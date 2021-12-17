const enum MessageType {
	Call,
	Resolve,
	Reject,
}

interface BaseMessage {
	readonly type: MessageType;
	readonly id: number;
}

interface CallMessage extends BaseMessage {
	readonly type: MessageType.Call;
	readonly method: string;
	readonly args: unknown[];
}

interface ResolveMessage extends BaseMessage {
	readonly type: MessageType.Resolve;
	readonly result: unknown;
}

interface RejectMessage extends BaseMessage {
	readonly type: MessageType.Reject;
	readonly message: string;
	readonly stack: string | undefined;
}

type Message = CallMessage | ResolveMessage | RejectMessage;

function isIPCMessage(message: any): message is Message {
	return Number.isInteger(message.type) && Number.isInteger(message.id);
}

interface Request {
	resolve(result: any): void;
	reject(error: any): void;
}

type Proxyable<T> = {
	readonly [_ in keyof T]: (..._: any[]) => Promise<unknown>;
};

export class Client {
	private REQUEST_ID = 0;
	private pending = new Map<number, Request>();
	readonly dispose: () => void;

	constructor(private readonly port: MessagePort) {
		const callback = this.onMessage.bind(this);
		port.addEventListener('message', callback);
		this.dispose = () => port.removeEventListener('message', callback);
		port.start();
	}

	invoke(method: string, args: unknown[]): Promise<unknown> {
		const id = this.REQUEST_ID++;
		const promise = new Promise((c, e) => {
			this.pending.set(id, { resolve: c, reject: e });
		});

		this.port.postMessage({ type: MessageType.Call, id, method, args });
		return promise;
	}

	private onMessage(event: MessageEvent): void {
		if (!isIPCMessage(event.data)) {
			return;
		}

		switch (event.data.type) {
			case MessageType.Resolve: {
				const request = this.pending.get(event.data.id);

				if (request) {
					this.pending.delete(event.data.id);
					request.resolve(event.data.result);
				}

				return;
			}
			case MessageType.Reject: {
				const request = this.pending.get(event.data.id);

				if (request) {
					this.pending.delete(event.data.id);
					const error = new Error(event.data.message);
					error.stack = event.data.stack;
					request.reject(error);
				}

				return;
			}
		}
	}
}

export class Server<T extends Proxyable<T>> {
	readonly dispose: () => void;

	constructor(private readonly port: MessagePort, private readonly instance: T) {
		const callback = this.onMessage.bind(this);
		port.addEventListener('message', callback);
		this.dispose = () => port.removeEventListener('message', callback);
		port.start();
	}

	private async onMessage(event: MessageEvent): Promise<void> {
		if (!isIPCMessage(event.data)) {
			return;
		}

		if (event.data.type !== MessageType.Call) {
			return;
		}

		const id = event.data.id;

		try {
			const result = await (this.instance as any)[event.data.method].apply(this.instance, event.data.args);

			this.port.postMessage({
				type: MessageType.Resolve,
				id,
				result,
			});
		} catch (err: any) {
			this.port.postMessage({
				type: MessageType.Reject,
				id,
				message: err.message,
				stack: err.stack,
			});
		}
	}
}

export function createProxy<T extends Proxyable<T>>(client: Client): T {
	return new Proxy({} as any as T, {
		get: (_, method) => {
			return (...args: unknown[]) => client.invoke(method as string, args);
		},
	});
}
