const { spawn } = require('child_process');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const path = require('path');

const mainConfig = require('../webpack.main.config');
const rendererConfig = require('../webpack.renderer.config');

let electronProcess = null;

async function startRenderer() {
  const compiler = webpack(rendererConfig);
  const server = new WebpackDevServer(
    { port: 9080, hot: true, historyApiFallback: true },
    compiler
  );

  await server.start();
  console.log('✓ Renderer running on http://localhost:9080');
}

function startMain() {
  const compiler = webpack({ ...mainConfig, mode: 'development' });

  compiler.watch({}, (err) => {
    if (err) console.error(err);

    if (electronProcess) {
      electronProcess.kill();
    }

    startElectron();
  });
}

function startElectron() {
  const electronPath = require('electron');

  electronProcess = spawn(String(electronPath), [
    path.resolve(__dirname, '../dist/main/main.js'),
  ], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
    },
  });
}

(async () => {
  await startRenderer();
  startMain();
})();