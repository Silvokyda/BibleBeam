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
  console.log('\x1b[32m✓ Renderer dev server on http://localhost:9080\x1b[0m');
}

function startMain() {
  return new Promise((resolve) => {
    const compiler = webpack({ ...mainConfig, mode: 'development', devtool: 'source-map' });

    let firstBuild = true;

    compiler.watch({}, (err, stats) => {
      if (err) {
        console.error(err);
        return;
      }

      if (stats.hasErrors()) {
        console.error(stats.toString({ colors: true, chunks: false, modules: false }));
        return;
      }

      console.log('\x1b[32m✓ Main process compiled\x1b[0m');

      if (electronProcess) {
        console.log('\x1b[33m↻ Restarting Electron...\x1b[0m');
        electronProcess.kill();
        electronProcess = null;
      }

      startElectron();

      if (firstBuild) {
        firstBuild = false;
        resolve();
      }
    });
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

  electronProcess.on('close', (code) => {
    if (code !== null && code !== 0) {
      console.log(`Electron exited with code ${code}`);
    }
    // Don't exit the dev script — let webpack keep watching
  });
}

(async () => {
  console.log('\x1b[36m⚡ BibleBeam dev mode\x1b[0m\n');
  await startRenderer();
  await startMain();
})();
