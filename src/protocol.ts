export interface WorkerProtocol {
	execute(source: string): Promise<string>;
}

export interface MainProtocol {}
