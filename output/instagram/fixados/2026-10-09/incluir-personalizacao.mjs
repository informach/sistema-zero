import fs from 'node:fs'
import path from 'node:path'

const work = path.resolve('output/instagram/fixados/2026-10-09')
const file = path.join(work, 'planejamento.json')
const archive = path.join(work, 'historico/antes-personalizacao')
fs.mkdirSync(archive, { recursive: true })
for (const name of [
  'planejamento.json',
  'manifesto.json',
  'montar-carrosseis.mjs',
  'preparar-documentos.mjs',
]) {
  if (!fs.existsSync(path.join(archive, name)))
    fs.copyFileSync(path.join(work, name), path.join(archive, name))
}
const plan = JSON.parse(fs.readFileSync(file, 'utf8'))
const first = plan.carousels.find((c) => c.id === 'F01')
if (!first.slides.some((s) => s.topic === 'personalizacao'))
  first.slides.splice(6, 0, {
    topic: 'personalizacao',
    title: 'Agora, ele escolhe o visual.',
    body: [
      'Depois de entender as regras e fazer o jogo funcionar, seu filho pode personalizar a aventura.',
      'Ele escolhe entre opções de cenários, personagens, barcos, chaves e faróis.',
    ],
    type: 'photo',
    images: ['output/instagram/como-funciona/2026-10-09/capturas/05-personalizado.png'],
    demo: true,
    scene:
      'Captura real de uma versão personalizada do Farol, com cenário noturno, personagem robô e outro modelo de farol. Mostrar o jogo inteiro, preservando o personagem e o cenário. As opções correspondem ao catálogo do Dia 3.',
  })
first.objective =
  'Apresentar A Chave do Farol, mostrando experimentar, montar, testar e personalizar o jogo.'
const paragraph =
  'Depois de entender as regras e fazer o jogo funcionar, seu filho pode personalizar a aventura. Ele escolhe entre opções de cenários, personagens, barcos, chaves e faróis.'
if (!first.caption.includes(paragraph)) first.caption.splice(3, 0, paragraph)
first.caption = first.caption.map((p) =>
  p.replace(' As capturas do jogo e dos blocos são demonstrações da equipe.', ''),
)
fs.writeFileSync(file, JSON.stringify(plan, null, 2) + '\n')
console.log(
  JSON.stringify({
    F01: first.slides.length,
    total: plan.carousels.reduce((sum, c) => sum + c.slides.length, 0),
  }),
)
