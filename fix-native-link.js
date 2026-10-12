/**
 * Always link c++_shared for NDK 27 (fixes __cxa_* / std::terminate / bad_variant_access).
 * Patches library CMakeLists AND app-autolinked jni CMakeLists (codegen .so built by :app).
 */
const fs = require('fs');
const path = require('path');

function patchFile(filePath, transform, label) {
  if (!fs.existsSync(filePath)) {
    console.log(`skip missing: ${label}`);
    return;
  }
  const before = fs.readFileSync(filePath, 'utf8');
  const after = transform(before);
  if (after !== before) {
    fs.writeFileSync(filePath, after, 'utf8');
    console.log(`patched: ${label}`);
  } else {
    console.log(`ok: ${label}`);
  }
}

function ensureCppSharedLink(content) {
  let next = content;

  if (!next.includes('set(CMAKE_ANDROID_STL_TYPE c++_shared)')) {
    next = next.replace(
      /cmake_minimum_required\([^\)]*\)/,
      (m) => `${m}\nset(CMAKE_ANDROID_STL_TYPE c++_shared)`
    );
  }

  if (!next.includes('find_library(CPP_SHARED_LIB c++_shared)')) {
    if (next.includes('find_package(ReactAndroid REQUIRED CONFIG)')) {
      next = next.replace(
        'find_package(ReactAndroid REQUIRED CONFIG)',
        'find_package(ReactAndroid REQUIRED CONFIG)\nfind_library(CPP_SHARED_LIB c++_shared)'
      );
    } else if (next.includes('find_package(fbjni REQUIRED CONFIG)')) {
      next = next.replace(
        'find_package(fbjni REQUIRED CONFIG)',
        'find_package(fbjni REQUIRED CONFIG)\nfind_library(CPP_SHARED_LIB c++_shared)'
      );
    } else if (next.includes('add_library(')) {
      // App-autolinked codegen CMake (safe-area / screens jni) — no find_package
      next = next.replace(
        /add_library\s*\(/,
        'find_library(CPP_SHARED_LIB c++_shared)\n\nadd_library('
      );
    }
  }

  // Append ${CPP_SHARED_LIB} to every target_link_libraries(...) if missing
  next = next.replace(/target_link_libraries\s*\(([\s\S]*?)\)/g, (match, body) => {
    if (body.includes('${CPP_SHARED_LIB}') || body.includes('c++_shared')) {
      return match;
    }
    const trimmed = body.replace(/\s+$/, '');
    return `target_link_libraries(${trimmed}\n  \${CPP_SHARED_LIB}\n)`;
  });

  return next;
}

// gesture-handler: rootProject newArch
patchFile(
  path.join(__dirname, 'node_modules/react-native-gesture-handler/android/build.gradle'),
  (content) => {
    let next = content;
    const good = `def isNewArchitectureEnabled() {
    // Read from ROOT project so android/gradle.properties newArchEnabled is respected
    return rootProject.hasProperty("newArchEnabled") && rootProject.getProperty("newArchEnabled") == "true"
}`;
    if (next.includes('project.hasProperty("newArchEnabled") && project.newArchEnabled == "true"')) {
      next = next.replace(
        /def isNewArchitectureEnabled\(\) \{[\s\S]*?return project\.hasProperty\("newArchEnabled"\) && project\.newArchEnabled == "true"\r?\n\}/,
        good
      );
    }
    return next;
  },
  'gesture-handler build.gradle (rootProject newArch)'
);

const cmakeTargets = [
  ['node_modules/react-native-gesture-handler/android/src/main/jni/CMakeLists.txt', 'gesture-handler jni CMake'],
  ['node_modules/react-native-screens/android/CMakeLists.txt', 'screens CMake'],
  ['node_modules/react-native-screens/android/src/main/jni/CMakeLists.txt', 'screens jni CMake (app autolink)'],
  ['node_modules/react-native-safe-area-context/android/src/main/jni/CMakeLists.txt', 'safe-area jni CMake (app autolink)'],
  ['node_modules/expo-modules-core/android/CMakeLists.txt', 'expo-modules-core CMake'],
];

for (const [rel, label] of cmakeTargets) {
  patchFile(path.join(__dirname, rel), ensureCppSharedLink, label);
}

const expoMainCmake = path.join(__dirname, 'node_modules/expo-modules-core/android/cmake/main.cmake');
if (fs.existsSync(expoMainCmake)) {
  patchFile(expoMainCmake, ensureCppSharedLink, 'expo-modules-core main.cmake');
}

// Patched generated RNGH codegen cmake if present
const ghCodegenCmake = path.join(
  __dirname,
  'node_modules/react-native-gesture-handler/android/build/generated/source/codegen/jni/CMakeLists.txt'
);
if (fs.existsSync(ghCodegenCmake)) {
  patchFile(ghCodegenCmake, ensureCppSharedLink, 'gesture-handler codegen jni CMake');
}

console.log('fix-native-link done');
