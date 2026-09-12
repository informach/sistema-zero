const fs = require('node:fs')
const path = require('node:path')
const manifest = require('./assets.json')
const root = path.resolve(__dirname, '../../..')
const relative = (p) => path.relative(__dirname, path.resolve(root, p)).replaceAll('\\', '/')
const escaparHtml = (s) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;')
const size = (f) => `${f.width} × ${f.height} · ${Math.round(f.bytes / 1024)} KB`
const adminCards = manifest.admin
  .map(
    (e) => `<article class="card upload">
  <a class="picture cover" href="${relative(e.upload.path)}"><img src="${relative(e.upload.path)}" alt="${escaparHtml(e.label)} com o Zap vagalume" width="${e.upload.width}" height="${e.upload.height}"></a>
  <div class="body"><h3>${escaparHtml(e.label)}</h3><p>${escaparHtml(e.field)}</p><p class="meta">${size(e.upload)}</p>
  <a class="button" href="${relative(e.upload.path)}" download>Baixar para upload</a> <a href="${relative(e.master.path)}">PNG mestre</a>${e.id.startsWith('certificado') ? ' <a href="qa/certificado-amostra-sem-validade.png">Ver amostra preenchida</a>' : ''}
  <details><summary>Comparar com o original</summary><img class="original" loading="lazy" src="${relative(e.original.path)}" alt="Arte original, antes da troca do mascote"><a href="${relative(e.original.path)}">Abrir original</a></details></div></article>`,
  )
  .join('\n')
const runtimeCards = manifest.runtime
  .map((e) => {
    const f = e.files[0]
    const pose = ['happy', 'celebrating', 'thinking', 'sleeping', 'speaking', 'coin'].includes(e.id)
    return `<article class="card"><a class="picture ${pose ? 'pose' : 'scene'}" href="${relative(f.path)}"><img src="${relative(f.path)}" alt="${escaparHtml(e.label)}" loading="lazy" width="${f.width}" height="${f.height}"></a><div class="body"><h3>${escaparHtml(e.label)}</h3><p class="meta">${size(f)}${f.alpha ? ' · transparente' : ''}</p><a href="${relative(e.master.path)}">Abrir PNG mestre</a><details><summary>${e.files.length} arquivo(s) no projeto</summary><ul>${e.files.map((f) => `<li><a href="${relative(f.path)}"><code>${escaparHtml(f.path)}</code></a></li>`).join('')}</ul></details></div></article>`
  })
  .join('\n')
const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Zap vagalume · Galeria de revisão</title>
<style>
*{box-sizing:border-box}body{margin:0;font:16px/1.55 system-ui,sans-serif;background:#f4f7fb;color:#19283a}main{max-width:1320px;margin:auto;padding:32px 24px 70px}a{color:#07589e;text-underline-offset:3px}a:focus-visible,button:focus-visible,summary:focus-visible{outline:3px solid #087cc4;outline-offset:4px}header{padding:20px 0 32px;max-width:900px}.eyebrow{font-size:.82rem;letter-spacing:.1em;text-transform:uppercase;font-weight:750;color:#486079}h1{font-size:clamp(2rem,5vw,3.5rem);line-height:1.12;letter-spacing:-.045em;margin:.35em 0}h2{font-size:1.75rem;margin:0}h3{font-size:1.08rem;margin:0 0 .45em}p{margin:.5em 0 1em}.lead{font-size:1.14rem;color:#415166}nav{display:flex;flex-wrap:wrap;gap:20px;margin-top:22px}.section-head{display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:36px 0 18px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}.uploads{grid-template-columns:repeat(2,minmax(0,1fr))}.card{border:1px solid #d5dfea;border-radius:16px;background:white;overflow:hidden;box-shadow:0 5px 18px #17253a06}.picture{display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--preview,#edf6fd);padding:18px}.picture img{display:block;max-width:100%;height:auto;object-fit:contain}.cover{padding:0;aspect-ratio:16/10;background:#e8edf5}.cover img{width:100%;height:100%;object-fit:contain}.pose{height:240px}.pose img{width:170px;height:170px}.scene{height:300px}.scene img{max-height:270px;width:auto}.body{padding:20px}.meta{font-size:.85rem;color:#5a6878}.body>a{font-size:.9rem;margin-right:12px}.button,button{display:inline-block;border:1px solid #aabfd0;border-radius:8px;padding:8px 12px;background:#edf6fd;font:inherit;color:#07589e;cursor:pointer;text-decoration:none}.button{background:#07589e;color:white;border-color:#07589e;margin-bottom:8px}details{margin-top:16px;border-top:1px solid #e0e6ed;padding-top:12px}summary{cursor:pointer;color:#36516e}.original{display:block;width:100%;height:auto;margin:12px 0}ul{padding-left:18px}code{font-size:.75rem;overflow-wrap:anywhere}.note{padding:16px 20px;background:#fff7d9;border:1px solid #ead391;border-radius:12px}.reference{max-width:720px;width:100%;border-radius:16px;margin-top:16px}footer{border-top:1px solid #d5dfea;margin-top:42px;padding-top:20px;color:#506175;font-size:.9rem}body[data-preview="dark"]{--preview:#162235}@media(max-width:650px){.uploads{grid-template-columns:1fr}main{padding:24px 16px}.cover{aspect-ratio:auto}}
</style></head><body><main>
<header><div class="eyebrow">Sistema Zero · 12 de setembro de 2026</div><h1>O novo Zap acendeu.</h1><p class="lead">As três capas e a base do certificado estão prontas para sua revisão. Abaixo, confira também as poses e as ilustrações aplicadas no projeto.</p><nav aria-label="Atalhos"><a href="#upload">Arquivos para o admin</a><a href="#plataforma">Plataforma e funis</a><a href="#referencia">Referência visual</a><a href="para-upload-admin/README.md">Guia de cadastro</a></nav></header>
<section id="upload"><div class="section-head"><h2>Para subir pelo admin</h2><a href="para-upload-admin/prontos/">Abrir pasta dos quatro arquivos</a></div><p class="note">O certificado é uma base vazia. Nome, texto, data, assinaturas e QR são preenchidos pelo sistema. Valide uma emissão em staging antes de promover.</p><div class="grid uploads">${adminCards}</div></section>
<section id="plataforma"><div class="section-head"><h2>Plataforma e funis</h2><button type="button" id="background-toggle" aria-pressed="false">Usar fundo escuro nas prévias</button></div><p>19 artes em 30 arquivos públicos. As poses abaixo também aparecem nos diálogos e no Pensa. Clique em uma imagem para abrir o arquivo aplicado.</p><div class="grid">${runtimeCards}</div></section>
<section id="referencia"><div class="section-head"><h2>Referência visual</h2></div><p>Cabeça grafite, olhos claros, antenas douradas, asas translúcidas e barriga luminosa.</p><a href="referencia-zap-vagalume.jpeg"><img class="reference" src="referencia-zap-vagalume.jpeg" width="1536" height="1024" loading="lazy" alt="Referência fornecida: Zap vagalume visto de frente, de lado e de costas"></a></section>
<footer>Arquivos locais para revisão. Nenhum upload no admin ou deploy foi feito. <a href="README.md">Documentação</a> · <a href="assets.json">Inventário</a> · <a href="prompts.json">Prompts de geração</a></footer>
</main><script>document.getElementById('background-toggle').addEventListener('click',function(){const dark=document.body.dataset.preview!=='dark';document.body.dataset.preview=dark?'dark':'light';this.setAttribute('aria-pressed',String(dark));this.textContent=dark?'Usar fundo claro nas prévias':'Usar fundo escuro nas prévias';});</script></body></html>`
fs.writeFileSync(path.join(__dirname, 'galeria.html'), html)
console.log('Galeria atualizada.')
