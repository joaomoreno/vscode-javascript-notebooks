interface MessagePassingProtocol<T> {
  onmessage: ((this: any, ev: MessageEvent<T>) => any) | null;
  postMessage(message: T): void;
}

type Proxyable<T> = {
  readonly [_ in keyof T]: () => Promise<any>;
};

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

interface Request {
  resolve(result: any): void;
  reject(error: any): void;
}

export class Client {
  private REQUEST_ID = 0;
  private pending = new Map<number, Request>();

  constructor(private readonly protocol: MessagePassingProtocol<Message>) {
    protocol.onmessage = (e) => this.onMessage(e.data);
  }

  invoke(method: string, args: unknown[]): Promise<unknown> {
    const id = this.REQUEST_ID++;
    const promise = new Promise((c, e) => {
      this.pending.set(id, { resolve: c, reject: e });
    });

    this.protocol.postMessage({ type: MessageType.Call, id, method, args });
    return promise;
  }

  private onMessage(message: Message): void {
    switch (message.type) {
      case MessageType.Resolve: {
        const request = this.pending.get(message.id);

        if (request) {
          this.pending.delete(message.id);
          request.resolve(message.result);
        }

        return;
      }
      case MessageType.Reject: {
        const request = this.pending.get(message.id);

        if (request) {
          this.pending.delete(message.id);
          const error = new Error(message.message);
          error.stack = message.stack;
          request.reject(error);
        }

        return;
      }
    }
  }
}

export class Server<T extends Proxyable<T>> {
  constructor(
    private readonly protocol: MessagePassingProtocol<Message>,
    private readonly instance: T
  ) {
    protocol.onmessage = (e) => this.onMessage(e.data);
  }

  private async onMessage(message: Message): Promise<void> {
    if (message.type !== MessageType.Call) {
      return;
    }

    const id = message.id;

    try {
      const result = await (this.instance as any)[message.method].apply(
        this.instance,
        message.args
      );

      this.protocol.postMessage({
        type: MessageType.Resolve,
        id,
        result,
      });
    } catch (err: any) {
      this.protocol.postMessage({
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
