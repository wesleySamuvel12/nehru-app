const fs = require('fs')
const path = require('path')

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

const standaloneNext = path.join(process.cwd(), '.next', 'standalone', '.next')
const staticDir = path.join(process.cwd(), '.next', 'static')
const publicDir = path.join(process.cwd(), 'public')
const standalonePublic = path.join(process.cwd(), '.next', 'standalone', 'public')

if (fs.existsSync(staticDir) && fs.existsSync(path.dirname(standaloneNext))) {
  copyDir(staticDir, path.join(standaloneNext, 'static'))
  console.log('✓ Copied .next/static to standalone build')
}

if (fs.existsSync(publicDir) && fs.existsSync(path.dirname(standalonePublic))) {
  copyDir(publicDir, standalonePublic)
  console.log('✓ Copied public to standalone build')
}

