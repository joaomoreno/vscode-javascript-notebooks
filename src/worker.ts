import { Server } from "./ipc";
import { WorkerProtocol } from "./protocol";

class Worker implements WorkerProtocol {
  constructor() {
    new Server(self, this as any);
  }

  async execute(source: string): Promise<string> {
    return (0, eval)(source);
  }
}

new Worker();
