/* @flow */
export interface FileInfo {
	originalFileName: string;
	fileName: string;
	fileSize: number;
	mimeType: string;
}

export interface UploadInfo {
	uploadId: number;
	completed: boolean;
	fileInfo: FileInfo;
};

export type DirectoryStore = {
	[directoryName: string]: string;
}

export interface UploadSettings {
	directory: string | DirectoryStore;
	accepts?: string[];
	maxFileSize?: number;
	chunkSize?: number;
	transmissionDelay?: number;
	overwrite?: boolean;
}