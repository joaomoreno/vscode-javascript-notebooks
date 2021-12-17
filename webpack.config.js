/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

//@ts-check
'use strict';

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

const path = require('path');

/** @type WebpackConfig */
const base = {
	mode: 'none',
	target: 'webworker',
	output: {
		filename: '[name].js',
		path: path.join(__dirname, './dist'),
		libraryTarget: 'commonjs',
	},
	resolve: {
		mainFields: ['browser', 'module', 'main'], // look for `browser` entry point in imported node modules
		extensions: ['.ts', '.js'], // support ts-files and js-files
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				exclude: /node_modules/,
				use: [
					{
						loader: 'ts-loader',
					},
				],
			},
		],
	},
	externals: {
		vscode: 'commonjs vscode', // ignored because it doesn't exist
	},
	performance: {
		hints: false,
	},
};

/** @type WebpackConfig[] */
module.exports = [
	{
		...base,
		entry: {
			extension: './src/extension.ts',
		},
		output: {
			filename: '[name].js',
			path: path.join(__dirname, './dist'),
			libraryTarget: 'commonjs',
		},
	},
	{
		...base,
		entry: {
			worker: './src/worker.ts',
		},
		output: {
			filename: '[name].js',
			path: path.join(__dirname, './dist'),
			libraryTarget: 'self',
		},
	},
];
