/**
 * Build release APK from short path C:\hsgad\app (avoids Windows 260-char MAX_PATH).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SRC = path.resolve(__dirname, '..');
const DEST = 'C:\\hsgad\\app';

function run(cmd, args, opts = {}) {
  console.log(`> ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      HSGAD_SHORT_BUILD: '1',
      GRADLE_USER_HOME: path.join(process.env.USERPROFILE || '', '.gradle'),
    },
    ...opts,
  });
  if (r.status) process.exit(r.status);
}

function rm(p) {
  try {
    if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
  } catch (e) {
    console.warn('clean skip', p, e.message);
  }
}

function sync() {
  fs.mkdirSync(DEST, { recursive: true });
  // Drop stale native caches at destination so CMake regenerates under short paths
  rm(path.join(DEST, 'android', 'app', '.cxx'));
  rm(path.join(DEST, 'android', 'app', 'build', 'intermediates', 'cxx'));

  const r = spawnSync(
    'robocopy',
    [
      SRC,
      DEST,
      '/E',
      '/XD',
      '.cxx',
      '.gradle',
      '.expo',
      'android\\.gradle',
      'android\\app\\.cxx',
      'android\\app\\build',
      'android\\build',
      '/MT:8',
      '/R:1',
      '/W:1',
      '/NFL',
      '/NDL',
      '/NJH',
      '/NJS',
      '/nc',
      '/ns',
      '/np',
    ],
    { stdio: 'inherit', shell: true }
  );
  if ((r.status || 0) >= 8) {
    console.error('robocopy failed', r.status);
    process.exit(1);
  }
}

console.log('Building from short path', DEST);
sync();
run('node', ['fix-screens-cmake.js'], { cwd: DEST });
run('node', ['fix-native-link.js'], { cwd: DEST });
run('gradlew.bat', ['assembleRelease', '-PreactNativeArchitectures=arm64-v8a', '--no-daemon'], {
  cwd: path.join(DEST, 'android'),
});

const apk = path.join(DEST, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
if (!fs.existsSync(apk)) {
  console.error('APK not found:', apk);
  process.exit(1);
}
const outDir = path.join(SRC, 'android', 'app', 'build', 'outputs', 'apk', 'release');
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(apk, path.join(outDir, 'app-release.apk'));
console.log('APK:', apk);
console.log('Copied:', path.join(outDir, 'app-release.apk'));
