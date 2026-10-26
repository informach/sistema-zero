/** Optional preparation for offline visual QA. Only public font files, kept outside version control. */
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'

const cache = resolve(import.meta.dir, '../../community/.cache/creator-preview-fonts')
const url =
  'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;500;600;700;800&family=Baloo+2:wght@400;600;700;800&family=Bricolage+Grotesque:wght@400;600;700;800&family=Nunito:wght@400;600;700;800&family=Silkscreen&display=swap'
const response = await fetch(url, {
  headers: { 'User-Agent': 'Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36' },
})
if (!response.ok) throw new Error(`Font CSS: ${response.status}`)
let css = await response.text()
const urls = [
  ...new Set(
    [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map((match) => match[1]!),
  ),
]
for (const source of urls) {
  const name = `${createHash('sha256').update(source).digest('hex').slice(0, 24)}.woff2`
  const result = await fetch(source)
  if (!result.ok) throw new Error(`Font file: ${result.status}`)
  await Bun.write(resolve(cache, name), await result.arrayBuffer())
  css = css.replaceAll(source, `/preview-fonts/${name}`)
}
await Bun.write(resolve(cache, 'fonts.css'), css)
console.log(`Cached ${urls.length} public font files for local visual QA.`)
