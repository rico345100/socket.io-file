/* @flow */
declare class IOSocket {
	on(evName: string, listener: function): void;
	off(evName: string, listener: function): void;
	off(evName: string): void;
	once(evName: string, listener: function): void;
	emit(evName: string): void;
	emit(evName: string, ...arguments: any): void;	
}