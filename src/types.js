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

export interface UploadSettings {
	directory: string;
	accepts?: string[];
	maxFileSize?: number;
	chunkSize?: number;
	transmissionDelay?: number;
	overwrite?: boolean;
}