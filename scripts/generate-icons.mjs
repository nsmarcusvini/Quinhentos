import sharp from 'sharp'

const tile = (x, y, s, o = 1) =>
  `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * 0.24}" fill="#22C55E" opacity="${o}"/>`

/** grid 3x3 dentro de uma caixa */
function grid(cx, cy, box) {
  const gap = box * 0.08
  const s = (box - gap * 2) / 3
  const x0 = cx - box / 2
  const y0 = cy - box / 2
  const op = [1, 0.45, 1, 0.45, 1, 0.45, 1, 0.45, 1]
  let out = ''
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      out += tile(x0 + c * (s + gap), y0 + r * (s + gap), s, op[r * 3 + c])
    }
  }
  return out
}

function svg({ size, maskable }) {
  const bgRadius = maskable ? 0 : size * 0.22
  // zona segura do maskable: conteúdo dentro dos 80% centrais
  const box = maskable ? size * 0.46 : size * 0.58
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${bgRadius}" fill="#0A0C10"/>
    ${grid(size / 2, size / 2, box)}
  </svg>`
}

const jobs = [
  ['public/icon-192.png', 192, false],
  ['public/icon-512.png', 512, false],
  ['public/icon-maskable-512.png', 512, true],
  ['public/apple-touch-icon.png', 180, false],
]

for (const [file, size, maskable] of jobs) {
  const buf = Buffer.from(svg({ size, maskable }))
  await sharp(buf).png().toFile(file)
  console.log('gerado', file, size)
}

// Open Graph 1200x630
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#0A0C10"/>
  ${grid(250, 315, 260)}
  <text x="470" y="288" font-family="Segoe UI, Inter, sans-serif" font-size="64" font-weight="700" fill="#E8ECF3">Desafio 500</text>
  <text x="470" y="366" font-family="Segoe UI, Inter, sans-serif" font-size="40" font-weight="600" fill="#4ADE80">Junte R$ 125.250</text>
  <text x="470" y="420" font-family="Segoe UI, Inter, sans-serif" font-size="28" fill="#96A2B6">riscando um numero por vez</text>
</svg>`
await sharp(Buffer.from(og)).png().toFile('public/og-image.png')
console.log('gerado public/og-image.png')
