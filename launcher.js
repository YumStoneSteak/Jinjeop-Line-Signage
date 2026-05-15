const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_RESTARTS = 20;
const RESTART_DELAY_MS = 3000;
const RESTART_WINDOW_MS = 10 * 60 * 1000;

let restartCount = 0;
let firstRestartAt = 0;
let childProcess = null;
let shuttingDown = false;

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--pid-file') {
      args.pidFile = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === '--child-pid-file') {
      args.childPidFile = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

const options = parseArgs(process.argv.slice(2));

function writePidFile(filePath, pidValue) {
  if (!filePath) {
    return;
  }
  const fullPath = path.resolve(filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, String(pidValue), 'utf-8');
}

function removeFileSafe(filePath) {
  if (!filePath) {
    return;
  }
  try {
    fs.unlinkSync(path.resolve(filePath));
  } catch (_) {
    // Ignore cleanup errors.
  }
}

function cleanupPidFiles() {
  removeFileSafe(options.childPidFile);
  removeFileSafe(options.pidFile);
}

function log(message) {
  const now = new Date().toISOString();
  console.log(`[${now}] [watchdog] ${message}`);
}

function shouldThrottleRestart() {
  const now = Date.now();
  if (!firstRestartAt || now - firstRestartAt > RESTART_WINDOW_MS) {
    firstRestartAt = now;
    restartCount = 0;
  }
  restartCount += 1;
  return restartCount > MAX_RESTARTS;
}

function startApp() {
  if (shuttingDown) {
    return;
  }

  const isWindows = process.platform === 'win32';
  const appDir = path.resolve(__dirname);
  const electronBin = isWindows
    ? path.join(appDir, 'node_modules', 'electron', 'dist', 'electron.exe')
    : path.join(appDir, 'node_modules', '.bin', 'electron');
  const electronArgs = ['.'];

  if (!fs.existsSync(electronBin)) {
    log(`Electron executable not found: ${electronBin}`);
  }

  const child = spawn(electronBin, electronArgs, {
    cwd: appDir,
    stdio: 'inherit',
    shell: false
  });

  childProcess = child;
  writePidFile(options.childPidFile, child.pid);

  log(`Started app with PID ${child.pid} from ${appDir}`);

  child.on('exit', (code, signal) => {
    childProcess = null;
    removeFileSafe(options.childPidFile);
    log(`App exited (code=${code}, signal=${signal || 'none'})`);

    if (shuttingDown) {
      cleanupPidFiles();
      process.exit(0);
      return;
    }

    const normalExit = code === 0 && !signal;
    if (normalExit) {
      log('App exited normally. Watchdog will stop.');
      cleanupPidFiles();
      process.exit(0);
      return;
    }

    if (shouldThrottleRestart()) {
      log('Restart limit exceeded in time window. Exiting watchdog.');
      cleanupPidFiles();
      process.exit(1);
    }

    log(`Restarting in ${RESTART_DELAY_MS / 1000}s...`);
    setTimeout(startApp, RESTART_DELAY_MS);
  });

  child.on('error', (err) => {
    log(`Failed to start app: ${err.message}`);
    removeFileSafe(options.childPidFile);
    if (shuttingDown) {
      cleanupPidFiles();
      process.exit(0);
      return;
    }
    setTimeout(startApp, RESTART_DELAY_MS);
  });
}

function shutdown(signalName) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  log(`Shutdown requested (${signalName}).`);

  if (childProcess && !childProcess.killed) {
    try {
      childProcess.kill('SIGTERM');
      return;
    } catch (_) {
      // Continue with direct exit when kill fails.
    }
  }

  cleanupPidFiles();
  process.exit(0);
}

writePidFile(options.pidFile, process.pid);

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('exit', cleanupPidFiles);

startApp();
