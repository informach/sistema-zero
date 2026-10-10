import fs from 'node:fs'
import path from 'node:path'

const work = path.resolve('output/instagram/fixados/2026-10-09')
const manifest = JSON.parse(fs.readFileSync(path.join(work, 'manifesto.json'), 'utf8'))
const source = fs.readFileSync(path.resolve(manifest.source), 'utf8')
const esc = (s) =>
  String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
const lines = (s) => esc(s).replaceAll('\n', '<br>')
const cache = new Map()
function img(file) {
  if (!cache.has(file))
    cache.set(
      file,
      'data:image/png;base64,' + fs.readFileSync(path.resolve(file)).toString('base64'),
    )
  return cache.get(file)
}
const css = `
*{box-sizing:border-box}html,body{margin:0;background:#e5ebf3;font-family:'Segoe UI',Arial,sans-serif;color:#0f1a33}html{scrollbar-width:none}::-webkit-scrollbar{display:none}
.slide{position:relative;width:1080px;height:1350px;background:#fff;overflow:hidden;margin-bottom:24px}
.slide.cover{background:#1b5cf3;color:white}
.badge{position:absolute;top:60px;left:72px;background:#ffc02e;color:#0f1a33;padding:10px 24px 12px;border-radius:28px;font-size:24px;line-height:1;font-weight:750;letter-spacing:2.4px}
.content{position:absolute;left:72px;right:72px;top:148px;bottom:130px;display:flex;flex-direction:column;gap:30px}
.heading{flex:none}.title{font-size:78px;font-weight:750;letter-spacing:-2.7px;line-height:1.06;margin:0;white-space:normal}.role{font-size:30px;margin-top:10px;color:#496080;line-height:1.2}
.copy{flex:none;font-size:39px;line-height:1.30;letter-spacing:-.45px}.copy p{margin:0 0 20px}.copy p:last-child{margin:0}
.cover .title{font-size:86px;letter-spacing:-3px}.cover .copy{font-size:40px;line-height:1.28}.cover .role{color:white}
.visual{margin:0;min-height:0;flex:1;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:26px;background:#edf2fa}
.visual>img{display:block;width:100%;height:100%;object-fit:contain;min-height:0}.cover .visual{background:transparent}.cover .visual>img{border-radius:24px}
.photo .visual{background:transparent}.photo .visual>img{border-radius:24px}
.cta{flex:none;background:#ffc02e;color:#0f1a33;padding:20px 24px;border-radius:16px;font-size:30px;line-height:1.15;font-weight:700;text-align:center}
.footer{position:absolute;bottom:43px;left:72px;right:72px;display:flex;align-items:center;justify-content:space-between;gap:18px;font-size:23px;line-height:1.2;color:#536079}
.brand{max-width:560px}.cover .footer{color:#fff}.sequence{font-weight:700;white-space:nowrap}.progress{position:absolute;bottom:0;left:0;height:9px;background:#ffc02e}
.compare .visual{padding:24px;gap:24px;align-items:center;background:#edf2fa}.comparison{flex:1;min-width:0;margin:0}.comparison img{display:block;width:100%;height:auto;border-radius:16px}.comparison figcaption{font-size:30px;font-weight:650;line-height:1.2;margin:0 0 18px;color:#1b5cf3}
.gallery{display:grid;grid-template-columns:repeat(6,1fr);gap:14px;align-content:center;background:transparent!important}.gallery img{display:block;width:100%;height:auto;aspect-ratio:1;object-fit:contain;border-radius:20px;grid-column:span 2}.gallery.five img:nth-child(4){grid-column:2/span 2}.gallery.five img:nth-child(5){grid-column:4/span 2}
.student .content{gap:24px}.student .title{font-size:84px}.student .visual{background:transparent}.student .visual>img{border-radius:24px}.student .copy{font-size:43px;font-weight:550;line-height:1.2;color:#1b5cf3}
.text .copy{font-size:40px}.feature{flex:1;min-height:0;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center;background:#eef3ff;border-radius:28px;padding:34px;color:#1b5cf3;position:relative}.feature:before{content:'';height:8px;width:88px;background:#ffc02e;border-radius:8px;margin-bottom:24px;flex:none}.feature-main{font-size:65px;line-height:1.12;font-weight:700;letter-spacing:-1.9px}.feature.numeric .feature-main{font-size:174px;line-height:1;font-weight:800;letter-spacing:-7px}.feature-label{font-size:31px;line-height:1.25;margin-top:16px;color:#30415d}
.code .visual{background:#f0f3f8}.code .visual>img{padding:10px}
.F03 .title{font-size:75px}.F03 .copy{font-size:37px;line-height:1.30}.F03.cover .title{font-size:86px}.F03.cover .copy{font-size:38px}
.title{line-height:1.30}.student .copy{line-height:1.30}.feature-main{line-height:1.30}.feature.numeric .feature-main{line-height:1.32}
.F03 .content{gap:24px}.F03 .title,.F03.cover .title{font-size:68px;line-height:1.30;letter-spacing:-2px}.F03 .copy,.F03.cover .copy{font-size:36px;line-height:1.30}.F03 .copy p{margin-bottom:16px}.F03 .copy p:last-child{margin-bottom:0}#F03-01 .title{font-size:86px}
.compare .comparison{height:100%;display:flex;flex-direction:column}.comparison-crop{flex:1;min-height:0;border-radius:16px;overflow:hidden}.compare .comparison img{height:116%;object-fit:cover;object-position:right center;transform:translateY(-10%);border-radius:0}
`
let markup = ''
for (const c of manifest.carousels) {
  c.slides.forEach((s, i) => {
    const quoted = [
      s.title,
      ...s.body,
      s.role,
      ...(s.labels ?? []),
      s.feature,
      s.featureLabel,
      s.cta,
    ].filter(Boolean)
    for (const t of quoted)
      for (const line of t.split('\n'))
        if (!source.includes('> ' + line))
          throw Error(`Copy fora do roteiro: ${c.id}/${i + 1}: ${line}`)
    const id = `${c.id}-${String(i + 1).padStart(2, '0')}`
    const heading = `<div class="heading"><h1 class="title">${lines(s.title)}</h1>${s.role ? `<div class="role">${esc(s.role)}</div>` : ''}</div>`
    const body = `<div class="copy">${s.body.map((t) => `<p>${lines(t)}</p>`).join('')}</div>`
    let visual = ''
    if (s.type === 'text')
      visual = `<div class="feature ${s.feature.length < 10 ? 'numeric' : ''}"><div class="feature-main">${lines(s.feature)}</div>${s.featureLabel ? `<div class="feature-label">${esc(s.featureLabel)}</div>` : ''}</div>`
    else if (s.type === 'compare')
      visual = `<div class="visual">${s.images.map((f, j) => `<figure class="comparison"><figcaption>${esc(s.labels[j])}</figcaption><div class="comparison-crop"><img src="${img(f)}" alt="${esc(s.labels[j])}"></div></figure>`).join('')}</div>`
    else if (s.images.length > 1)
      visual = `<div class="visual gallery ${s.images.length === 5 ? 'five' : ''}">${s.images.map((f) => `<img src="${img(f)}" alt="Cena provisória de aluno em atividade.">`).join('')}</div>`
    else visual = `<div class="visual"><img src="${img(s.images[0])}" alt="${esc(s.scene)}"></div>`
    const content = s.type === 'student' ? heading + visual + body : heading + body + visual
    markup += `<article class="slide ${s.type} ${c.id}" id="${id}"><div class="badge">${c.badge}</div><main class="content">${content}${s.cta ? `<div class="cta">${esc(s.cta)}</div>` : ''}</main><footer class="footer"><span class="brand">Helena e Júlio · Comunidade dos Criadores</span><span class="sequence">${String(i + 1).padStart(2, '0')} / ${String(c.slides.length).padStart(2, '0')}${i < c.slides.length - 1 ? ' →' : ''}</span></footer><div class="progress" style="width:${((i + 1) / c.slides.length) * 100}%"></div></article>\n`
  })
}
fs.writeFileSync(
  path.join(work, 'montagem.html'),
  `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Fixados · Carrosséis 4:5</title><style>${css}</style><body>${markup}<script id="data" type="application/json">${JSON.stringify(manifest)}</script></body></html>`,
)
console.log(
  JSON.stringify({
    slides: manifest.carousels.reduce((n, c) => n + c.slides.length, 0),
    format: '1080x1350',
  }),
)
