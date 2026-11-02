// Starts the mock OpenAI server and the app on test ports, runs the end-to-end checks, then stops both.
const { spawn } = require('child_process');
const path = require('path');
const root = path.join(__dirname, '..');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const mock = spawn(process.execPath, ['test/mock-openai.js'], { cwd: root, env: { ...process.env, MOCK_PORT: '4010' } });
  const app = spawn(process.execPath, ['server.js'], { cwd: root, env: { ...process.env, PORT: '3999', OPENAI_API_KEY: 'test', OPENAI_BASE_URL: 'http://localhost:4010/v1' } });
  await wait(1000);
  const run = spawn(process.execPath, ['test/run-flow.js'], { cwd: root, env: { ...process.env, APP: 'http://localhost:3999' }, stdio: 'inherit' });
  run.on('exit', (code) => { mock.kill(); app.kill(); process.exit(code); });
})();
