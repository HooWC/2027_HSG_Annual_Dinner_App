/**
 * Expo SDK 57 / RN 0.86 must use NDK 27 + C++20.
 * Do NOT force NDK 25 / C++17 (that breaks Yoga ordinalCount templates).
 * This script only restores accidental NDK 25 patches if present.
 */
const fs = require('fs');
const path = require('path');

const files = [
  path.join(__dirname, 'node_modules', 'expo-modules-core', 'android', 'CMakeLists.txt'),
  path.join(__dirname, 'node_modules', 'react-native-screens', 'android', 'CMakeLists.txt'),
  path.join(__dirname, 'node_modules', 'react-native-safe-area-context', 'android', 'CMakeLists.txt'),
  path.join(__dirname, 'node_modules', 'react-native-gesture-handler', 'android', 'CMakeLists.txt'),
  path.join(__dirname, 'node_modules', 'expo-camera', 'android', 'CMakeLists.txt'),
];

const badBlock = /\r?\n# Force NDK 25 to avoid linker errors\r?\nset\(CMAKE_ANDROID_NDK_VERSION "25\.1\.8937393"\)\r?\nset\(ANDROID_NDK_VERSION "25\.1\.8937393"\)\r?\nset\(CMAKE_ANDROID_STL_TYPE c\+\+_shared\)\r?\n/;

let fixed = 0;
files.forEach((file) => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');
  const before = content;
  content = content.replace(badBlock, '\n');
  content = content.replace(
    /# Use C\+\+17 for NDK 25 compatibility\r?\nset\(CMAKE_CXX_STANDARD 17\)/,
    'set(CMAKE_CXX_STANDARD 20)'
  );
  if (content !== before) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('restored:', file);
    fixed += 1;
  }
});

console.log(fixed ? `Restored ${fixed} CMake file(s).` : 'No NDK 25 patches found.');
