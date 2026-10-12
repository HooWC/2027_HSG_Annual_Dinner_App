/**
 * Patch react-native-screens for Expo SDK 57 assembleRelease.
 * - Always link c++_shared (NDK 27).
 * - Always include src/fabric/java (screens 4.26 has no paper/).
 * - CMake: full NativeProxy when RNS_NEW_ARCH_ENABLED, else minimal (no Fabric JNI).
 */
const fs = require('fs');
const path = require('path');

const cmakePath = path.join(__dirname, 'node_modules', 'react-native-screens', 'android', 'CMakeLists.txt');
const gradlePath = path.join(__dirname, 'node_modules', 'react-native-screens', 'android', 'build.gradle');

const cmakeContents = `cmake_minimum_required(VERSION 3.9.0)

# Force shared STL (fixes undefined std::terminate / length_error on NDK 27)
set(CMAKE_ANDROID_STL_TYPE c++_shared)

project(rnscreens)

# When New Architecture is OFF, build the minimal InfoHSCP-style library
# (avoid Fabric NativeProxy which fails to link with newArchEnabled=false).
if(DEFINED RNS_NEW_ARCH_ENABLED AND RNS_NEW_ARCH_ENABLED)
  add_library(rnscreens
      SHARED
      ../cpp/RNScreensTurboModule.cpp
      ../cpp/RNSScreenRemovalListener.cpp
      ./src/main/cpp/jni-adapter.cpp
      ./src/main/cpp/NativeProxy.cpp
      ./src/main/cpp/OnLoad.cpp
  )
else()
  add_library(rnscreens
      SHARED
      ../cpp/RNScreensTurboModule.cpp
      ./src/main/cpp/jni-adapter.cpp
  )
endif()

include_directories(
    ../cpp
)

set_target_properties(rnscreens PROPERTIES
    CXX_STANDARD 20
    CXX_STANDARD_REQUIRED ON
    CXX_EXTENSIONS OFF
    POSITION_INDEPENDENT_CODE ON
)

target_compile_definitions(
    rnscreens
    PRIVATE
    -DFOLLY_NO_CONFIG=1
)

find_package(ReactAndroid REQUIRED CONFIG)
find_library(CPP_SHARED_LIB c++_shared)

if(DEFINED RNS_NEW_ARCH_ENABLED AND RNS_NEW_ARCH_ENABLED)
  find_package(fbjni REQUIRED CONFIG)
  target_link_libraries(rnscreens
      ReactAndroid::reactnative
      ReactAndroid::jsi
      fbjni::fbjni
      android
      \${CPP_SHARED_LIB}
  )
else()
  target_link_libraries(rnscreens
      ReactAndroid::jsi
      android
      \${CPP_SHARED_LIB}
  )
endif()
`;

if (!fs.existsSync(cmakePath)) {
  console.log('react-native-screens CMakeLists.txt not found, skip');
  process.exit(0);
}

fs.writeFileSync(cmakePath, cmakeContents, 'utf8');
console.log('Patched screens CMakeLists.txt');

if (fs.existsSync(gradlePath)) {
  let gradle = fs.readFileSync(gradlePath, 'utf8');
  let changed = false;

  if (!gradle.includes('def isNewArchitectureEnabled()')) {
    gradle = gradle.replace(
      'def REACT_NATIVE_MINOR_VERSION = REACT_NATIVE_VERSION.startsWith("0.0.0-") ? 1000 : REACT_NATIVE_VERSION.split("\\\\.")[1].toInteger()\n\nandroid {',
      `def REACT_NATIVE_MINOR_VERSION = REACT_NATIVE_VERSION.startsWith("0.0.0-") ? 1000 : REACT_NATIVE_VERSION.split("\\\\.")[1].toInteger()

// Same as InfoHSCP: respect root project's newArchEnabled flag
def isNewArchitectureEnabled() {
    return rootProject.hasProperty("newArchEnabled") && rootProject.getProperty("newArchEnabled") == "true"
}
def IS_NEW_ARCHITECTURE_ENABLED = isNewArchitectureEnabled()

android {`
    );
    // try without double-escaped dots (actual file content)
    if (!gradle.includes('def isNewArchitectureEnabled()')) {
      gradle = gradle.replace(
        /def REACT_NATIVE_MINOR_VERSION = REACT_NATIVE_VERSION\.startsWith\("0\.0\.0-"\) \? 1000 : REACT_NATIVE_VERSION\.split\("\\."\)\[1\]\.toInteger\(\)\r?\n\r?\nandroid \{/,
        `def REACT_NATIVE_MINOR_VERSION = REACT_NATIVE_VERSION.startsWith("0.0.0-") ? 1000 : REACT_NATIVE_VERSION.split("\\\\.")[1].toInteger()

// Same as InfoHSCP: respect root project's newArchEnabled flag
def isNewArchitectureEnabled() {
    return rootProject.hasProperty("newArchEnabled") && rootProject.getProperty("newArchEnabled") == "true"
}
def IS_NEW_ARCHITECTURE_ENABLED = isNewArchitectureEnabled()

android {`
      );
    }
    // Fix the split pattern - in file it's split("\\.")
    if (!gradle.includes('def isNewArchitectureEnabled()')) {
      const marker = 'def REACT_NATIVE_MINOR_VERSION = REACT_NATIVE_VERSION.startsWith("0.0.0-") ? 1000 : REACT_NATIVE_VERSION.split("\\\\.")[1].toInteger()';
      // Read raw and do simpler insert
      const idx = gradle.indexOf('android {\n    compileSdkVersion safeExtGet');
      const altIdx = gradle.indexOf('android {\r\n    compileSdkVersion safeExtGet');
      const insertAt = idx >= 0 ? idx : altIdx;
      if (insertAt >= 0 && !gradle.includes('IS_NEW_ARCHITECTURE_ENABLED = isNewArchitectureEnabled()')) {
        const inject = `// Same as InfoHSCP: respect root project's newArchEnabled flag
def isNewArchitectureEnabled() {
    return rootProject.hasProperty("newArchEnabled") && rootProject.getProperty("newArchEnabled") == "true"
}
def IS_NEW_ARCHITECTURE_ENABLED = isNewArchitectureEnabled()

`;
        gradle = gradle.slice(0, insertAt) + inject + gradle.slice(insertAt);
        changed = true;
      }
    } else {
      changed = true;
    }
  }

  if (!gradle.includes('-DRNS_NEW_ARCH_ENABLED=')) {
    gradle = gradle.replace(
      'arguments "-DANDROID_STL=c++_shared",\n                        "-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON"',
      'arguments "-DANDROID_STL=c++_shared",\n                        "-DRNS_NEW_ARCH_ENABLED=${IS_NEW_ARCHITECTURE_ENABLED}",\n                        "-DANDROID_SUPPORT_FLEXIBLE_PAGE_SIZES=ON"'
    );
    changed = true;
  }

  // RN Screens 4.26+ always ships FabricEnabledViewGroup in src/fabric/java (no paper/).
  // Do NOT gate fabric sources on newArch — only native CMake uses RNS_NEW_ARCH_ENABLED.
  const wrongSourceSets = /java \{\s*\n\s*\/\/ InfoHSCP-style:[\s\S]*?\n\s*\}\s*\n\s*res \{/;
  const correctSourceSets = `java {
            srcDirs += [
                "src/fabric/java",
            ]
        }
        res {`;
  if (wrongSourceSets.test(gradle)) {
    gradle = gradle.replace(wrongSourceSets, correctSourceSets);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(gradlePath, gradle, 'utf8');
    console.log('Patched screens build.gradle');
  } else {
    console.log('screens build.gradle already patched or unchanged');
  }
}

console.log('fix-screens-cmake done');
