/**
 * Windows long-path notice. Autolinking rewrite was removed — it breaks when
 * .cxx stays on the long D: path. Use npm run build:apk instead.
 */
const path = require('path');

const projectRoot = __dirname;
if (process.platform === 'win32' && projectRoot.length > 60 && !process.env.HSGAD_SHORT_BUILD) {
  console.log('[fix-win-maxpath] Project path is long. Prefer: npm run build:apk');
}
