/**
 * Disable native autolinking for packages that break assembleRelease
 * (worklets CMake linker errors). App screens do not use them.
 */
module.exports = {
  dependencies: {
    'react-native-reanimated': {
      platforms: {
        android: null,
        ios: null,
      },
    },
    'react-native-worklets': {
      platforms: {
        android: null,
        ios: null,
      },
    },
    '@expo/ui': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
