import { Server } from './ipc';
import { WorkerProtocol } from './protocol';

class Worker implements WorkerProtocol {
	async execute(source: string): Promise<string> {
		return (0, eval)(source);
	}
}

self.onmessage = event => {
	const port = event.data as MessagePort;
	self.onmessage = null;
	new Server(port, new Worker());
};
