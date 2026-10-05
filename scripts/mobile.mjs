import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const web = join(root, 'apps', 'web');
const command = process.argv[2] ?? 'sync';
const local = process.argv.includes('--local');
const origin =
  process.env.NATIVE_API_ORIGIN ?? (local ? 'http://127.0.0.1:3010' : '');
if (!origin)
  throw new Error(
    'Set NATIVE_API_ORIGIN to your HTTPS web origin, or use --local for USB development.',
  );
const url = new URL(origin);
if (
  url.username ||
  url.password ||
  url.pathname !== '/' ||
  url.search ||
  url.hash ||
  (url.protocol !== 'https:' &&
    !(
      local &&
      url.protocol === 'http:' &&
      ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
    ))
) {
  throw new Error(
    'Native builds require an HTTPS origin. --local permits loopback HTTP only.',
  );
}
const env = { ...process.env, VITE_NATIVE_API_ORIGIN: url.origin };
env.ANDROID_HOME ??=
  process.platform === 'win32' && process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, 'Android', 'Sdk')
    : process.env.ANDROID_SDK_ROOT;
const studioJava = 'C:/Program Files/Android/Android Studio/jbr';
if (process.platform === 'win32' && existsSync(join(studioJava, 'bin', 'java.exe')))
  env.JAVA_HOME = studioJava;
else if (env.JAVA_HOME && !existsSync(join(env.JAVA_HOME, 'bin', 'java.exe')))
  delete env.JAVA_HOME;
const pathKey =
  Object.keys(env).find((key) => key.toLowerCase() === 'path') ?? 'PATH';
if (env.JAVA_HOME)
  env[pathKey] =
    join(env.JAVA_HOME, 'bin') +
    (process.platform === 'win32' ? ';' : ':') +
      (env[pathKey] ?? '');

function run(executable, args, cwd = root, capture = false) {
  const result = spawnSync(executable, args, {
    cwd,
    env,
    encoding: 'utf8',
    stdio: capture ? 'pipe' : 'inherit',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(
      `${executable} failed (${result.status}): ${capture ? result.stderr : 'see output above'}`,
    );
  return result.stdout ?? '';
}
const cap = (...args) =>
  run(
    process.execPath,
    [join(root, 'node_modules/@capacitor/cli/bin/capacitor'), ...args],
    web,
  );
const adb = env.ANDROID_HOME
  ? join(
      env.ANDROID_HOME,
      'platform-tools',
      process.platform === 'win32' ? 'adb.exe' : 'adb',
    )
  : 'adb';
function selectDevice() {
  const devices = run(adb, ['devices'], root, true)
    .split(/\r?\n/)
    .slice(1)
    .filter((line) => /\sdevice$/.test(line.trim()))
    .map((line) => line.split(/\s/)[0]);
  if (env.ANDROID_SERIAL && devices.includes(env.ANDROID_SERIAL))
    return env.ANDROID_SERIAL;
  if (devices.length !== 1)
    throw new Error(
      'Connect and authorize one Android device, or set ANDROID_SERIAL to choose one.',
    );
  return devices[0];
}
if (!['sync', 'android', 'install'].includes(command))
  throw new Error('Use sync, android, or install.');
const device = command === 'install' ? selectDevice() : undefined;
run(process.execPath, [
  join(root, 'node_modules/typescript/bin/tsc'),
  '--noEmit',
  '-p',
  join(web, 'tsconfig.json'),
]);
run(
  process.execPath,
  [
    join(root, 'node_modules/vite/bin/vite.js'),
    'build',
    '--mode',
    'native',
    '--outDir',
    'dist-native',
  ],
  web,
);
for (const platform of ['android', 'ios']) {
  if (!existsSync(join(web, platform))) cap('add', platform);
  cap('sync', platform);
}
if (command !== 'sync') {
  const android = join(web, 'android');
  if (process.platform === 'win32')
    run(
      process.env.ComSpec ?? 'C:/Windows/System32/cmd.exe',
      ['/d', '/c', 'gradlew.bat', 'assembleDebug', '--console=plain'],
      android,
    );
  else run('./gradlew', ['assembleDebug', '--console=plain'], android);
  const apk = join(android, 'app/build/outputs/apk/debug/app-debug.apk');
  console.log('Android APK: ' + apk);
  if (device) {
    if (local) {
      const port = url.port || (url.protocol === 'https:' ? '443' : '80');
      run(adb, ['-s', device, 'reverse', `tcp:${port}`, `tcp:${port}`]);
    }
    run(adb, ['-s', device, 'install', '-r', apk]);
    run(adb, [
      '-s',
      device,
      'shell',
      'am',
      'start',
      '-W',
      '-n',
      'dev.yearbook.mobile/.MainActivity',
    ]);
  }
}
