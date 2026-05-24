/* eslint-disable @typescript-eslint/no-require-imports */
const { existsSync } = require('fs');
const { homedir } = require('os');
const { join } = require('path');
const { spawn } = require('child_process');

const nextBin = require.resolve('next/dist/bin/next');
const caPath = join(homedir(), '.codex', 'certs', 'avast-web-mail-shield-root.pem');

if (!process.env.NODE_EXTRA_CA_CERTS && existsSync(caPath)) {
  process.env.NODE_EXTRA_CA_CERTS = caPath;
}

const child = spawn(process.execPath, [nextBin, ...process.argv.slice(2)], {
  env: process.env,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
