/**
 * One-off: prepare Nehru International School brand assets from the uploaded logo.
 * - public/nis-logo.png  → full logo (documents, print, certificates, settings)
 * - public/nis-mark.png  → cropped emblem (book + NIS shield + orange dot) for tiles/sidebars
 * - src/app/icon.png     → favicon
 */
import sharp from 'sharp'
import { copyFileSync } from 'fs'

const SRC = '/home/z/my-project/upload/pasted_image_1788947709324.png'

async function main() {
  const meta = await sharp(SRC).metadata()
  console.log('source:', meta.width, 'x', meta.height)

  // Full logo, trimmed of excess white margin, padding kept modest
  const full = sharp(SRC).trim({ threshold: 12 })
  await full.clone().toFile('/home/z/my-project/public/nis-logo.png')
  const fullMeta = await sharp('/home/z/my-project/public/nis-logo.png').metadata()
  console.log('full trimmed:', fullMeta.width, 'x', fullMeta.height)

  // Emblem = top portion of the trimmed logo (book + NIS + orange circle)
  const w = fullMeta.width!
  const h = fullMeta.height!
  const emblemH = Math.round(h * 0.56)
  await sharp('/home/z/my-project/public/nis-logo.png')
    .extract({ left: 0, top: 0, width: w, height: emblemH })
    .trim({ threshold: 12 })
    .toFile('/home/z/my-project/public/nis-mark.png')
  const markMeta = await sharp('/home/z/my-project/public/nis-mark.png').metadata()
  console.log('mark:', markMeta.width, 'x', markMeta.height)

  // Favicon: emblem centered on white square (opaque, 256px)
  const size = 256
  const pad = Math.round(size * 0.1)
  const inner = size - pad * 2
  const emblem = await sharp('/home/z/my-project/public/nis-mark.png')
    .resize(inner, inner, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer()
  await sharp({
    create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([{ input: emblem, left: pad, top: pad }])
    .png()
    .toFile('/home/z/my-project/src/app/icon.png')
  console.log('favicon written')

  copyFileSync('/home/z/my-project/public/nis-mark.png', '/home/z/my-project/public/apple-touch-icon.png')
  console.log('done')
}

main().catch(e => { console.error(e); process.exit(1) })
