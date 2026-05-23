import { spawn } from 'node:child_process';

const port = process.env.E2E_WEB_PORT || '5182';
const apiUrl = process.env.E2E_API_URL || 'http://127.0.0.1:4000';
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const args = ['--filter', 'web', 'exec', 'vite', '--host', '127.0.0.1', '--port', port];
const command =
  process.platform === 'win32'
    ? [process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `${pnpm} ${args.join(' ')}`]]
    : [pnpm, args];

const child = spawn(command[0], command[1], {
  stdio: 'inherit',
  shell: false,
  env: {
    ...process.env,
    VITE_APP_MODE: 'demo',
    VITE_API_URL: apiUrl,
  },
});

const stop = (signal) => {
  if (!child.killed) child.kill(signal);
};

process.on('SIGINT', () => stop('SIGINT'));
process.on('SIGTERM', () => stop('SIGTERM'));

child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
