import sharp from 'sharp'
const SRC = '/home/z/my-project/public/nis-mark.png'
async function main() {
  const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true })
  const px = (x: number, y: number) => {
    const i = (y * info.width + x) * info.channels
    return `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`
  }
  // sample orange circle (top center) and blue book (center)
  console.log('orange circle:', px(150, 12), px(148, 18))
  console.log('blue book:', px(150, 120), px(120, 100), px(180, 140))
  // scan for most common saturated colors
  const counts = new Map<string, number>()
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    if (max - min > 60 && max > 120) {
      const key = `${Math.round(r / 16) * 16},${Math.round(g / 16) * 16},${Math.round(b / 16) * 16}`
      counts.set(key, (counts.get(key) || 0) + 1)
    }
  }
  console.log([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6))
}
main()
