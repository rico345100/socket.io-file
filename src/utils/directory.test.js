/* @flow */
const { existsSync } = require('fs');
const { makeDirectoryRecursively, createDirectoryRecursivelyIfNotExists } = require('./directory');

describe('Directory Utility Modules', () => {
	it('should be make directory recursively', () => {
		const testPath = 'test/directory';

		makeDirectoryRecursively(testPath, 0o755);
		const isPathExists = existsSync(testPath);

		expect(isPathExists).toBe(true);
	});

	it('should be create directory recursively if not exists', () => {
		const testPath = 'test/directory';

		createDirectoryRecursivelyIfNotExists(testPath);
		const isPathExists = existsSync(testPath);

		expect(isPathExists).toBe(true);
	});
});