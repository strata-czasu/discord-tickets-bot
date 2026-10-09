/* eslint-disable no-console */
const { execFileSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const {
	dirname,
	join,
} = require('node:path');

const cwd = dirname(require.resolve('@discord-tickets/settings/package.json'));
const handler = join(cwd, 'build/handler.js');

// Bun installs Git dependencies as source without running their prepack build.
if (!existsSync(handler)) {
	console.log('[settings] Building the custom portal');
	const options = {
		cwd,
		env: {
			...process.env,
			CI: 'true',
			NODE_ENV: 'development',
		},
		stdio: 'inherit',
	};

	// Bun migrates the portal's committed pnpm lockfile on the first install.
	execFileSync('bun', ['install', '--frozen-lockfile'], options);
	execFileSync('bun', ['run', 'build'], options);

	if (!existsSync(handler)) throw new Error('The settings portal build did not produce build/handler.js');
}
