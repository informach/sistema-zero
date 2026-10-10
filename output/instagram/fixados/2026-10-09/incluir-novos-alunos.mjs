import fs from 'node:fs'
import path from 'node:path'

const base = 'docs/marketing/kids/comunidade-dos-criadores/instagram/'
function update(file, pairs) {
  let s = fs.readFileSync(file, 'utf8')
  for (const [a, b] of pairs) {
    if (!s.includes(a)) throw Error('Trecho ausente em ' + file + ': ' + a.slice(0, 90))
    s = s.replaceAll(a, b)
  }
  fs.writeFileSync(file, s)
}
const planning = 'output/instagram/fixados/2026-10-09/planejamento.json'
const plan = JSON.parse(fs.readFileSync(planning, 'utf8')),
  f02 = plan.carousels.find((c) => c.id === 'F02')
const jeffrey = 'output/instagram/alunos/2026-10-09/cenas-provisorias/AL03-jeffrey-explorando.png'
const fernando = 'output/instagram/alunos/2026-10-09/cenas-provisorias/AL07-fernando-mostrando.png'
f02.slides.splice(2, 0, {
  title: 'Jeffrey',
  role: 'Aluno',
  body: ['Jeffrey explorando o que muda quando faz uma escolha.'],
  type: 'student',
  images: [jeffrey],
  scene: 'Cena provisória gerada com a foto fornecida do Jeffrey, explorando o jogo no computador.',
})
f02.slides.splice(-1, 0, {
  title: 'Fernando',
  role: 'Aluno',
  body: ['Fernando mostrando o que fez no jogo.'],
  type: 'student',
  images: [fernando],
  scene: 'Cena provisória gerada com a foto fornecida do Fernando, mostrando uma parte do jogo.',
})
f02.slides[0].images = f02.slides.filter((s) => s.type === 'student').map((s) => s.images[0])
f02.slides[0].scene =
  'Montagem com as cinco cenas provisórias de Rafael, Jeffrey, Débora, André e Fernando.'
f02.caption[0] =
  'Conheça Rafael, Jeffrey, Débora, André e Fernando, alunos da Comunidade dos Criadores.'
plan.carousels.find((c) => c.id === 'F03').slides[1].body[0] =
  'A proposta é aprender a criar jogos, fazendo cada vez mais por conta própria.'
fs.writeFileSync(planning, JSON.stringify(plan, null, 2))
update('output/instagram/fixados/2026-10-09/preparar-documentos.mjs', [
  [
    'Rafael, Débora e André, autorizadas para Alunos. Jeffrey fica para uma próxima inclusão.',
    'Rafael, Jeffrey, Débora, André e Fernando, autorizadas para Alunos.',
  ],
  ['Jeffrey foi adiado. ', ''],
  ['Total: 21 imagens de 1080 × 1350.', 'Total: 23 imagens de 1080 × 1350.'],
  [
    'F02 usa as imagens provisórias já autorizadas; Jeffrey não está neste lote.',
    'F02 usa as imagens provisórias já autorizadas dos cinco alunos.',
  ],
])
update(base + '01-destaques.md', [
  [
    'A seleção inicial indicada pelo responsável tem quatro vídeos, nesta ordem: **Rafael, Jeffrey, Débora e André**.',
    'A seleção atual indicada pelo responsável reúne **Rafael, Jeffrey, Débora, André e Fernando**.',
  ],
  [
    'Débora mudando o jogo do jeito dela e André jogando para conferir o que fez.',
    'Débora mudando o jogo do jeito dela, André jogando para conferir o que fez e Fernando mostrando a criação.',
  ],
  [
    'a pedido do responsável, este lote usa imagens provisórias geradas com as referências de Rafael, Débora e André, para substituir depois pelos vídeos. São cinco stories: AL01 → AL02 → AL04 → AL05 → AL06. Jeffrey (AL03) fica para uma próxima inclusão.',
    'a pedido do responsável, este lote usa imagens provisórias geradas com as referências de Rafael, Jeffrey, Débora, André e Fernando, para substituir depois pelos vídeos. São sete stories: AL01 → AL02 → AL03 → AL04 → AL05 → AL07 → AL06. As fotos de Jeffrey e Fernando foram fornecidas na ampliação do lote.',
  ],
  [
    'Os PNGs completos e as três molduras transparentes',
    'Os PNGs completos e as cinco molduras transparentes',
  ],
  [
    '### AL06 · Conhecer um primeiro passo',
    '### AL07 · Fernando\n\n**Vídeo real do Fernando mostrando uma parte da criação. Identificação:** Fernando · Aluno. Preservar o registro original, sem narração comercial acrescentada. **Texto completo sobreposto:**\n\n> Fernando mostrando o que fez no jogo.\n\n### AL06 · Conhecer um primeiro passo',
  ],
  [
    'As seis telas AL01 a AL06 formam apenas o lote inicial; AL06 é o convite desse lote e não impede novos vídeos depois dele.',
    'As sete telas AL01 a AL07 formam o lote atual, com AL07 antes do convite AL06. AL06 não impede novos vídeos depois dele; os IDs permanecem estáveis quando novos alunos entram.',
  ],
])
const alunos = 'output/instagram/alunos/2026-10-09/'
update(alunos + 'montar-stories.mjs', [
  ["['finais-com-imagens','molduras-videos']", "['finais-ampliados','molduras-ampliadas']"],
  [
    " AL04:{file:'03-debora-personalizando.png',overlayFile:'03-debora-moldura.png'",
    " AL03:{file:'03-jeffrey-explorando.png',overlayFile:'03-jeffrey-moldura.png',scene:'AL03-jeffrey-explorando.png',kind:'student',name:'Jeffrey',role:'Aluno',emphasis:['explorando o que muda']},\n AL04:{file:'04-debora-personalizando.png',overlayFile:'04-debora-moldura.png'",
  ],
  [
    "AL05:{file:'04-andre-testando.png',overlayFile:'04-andre-moldura.png'",
    "AL05:{file:'05-andre-testando.png',overlayFile:'05-andre-moldura.png'",
  ],
  [
    " AL06:{file:'05-conhecer-o-desafio.png'",
    " AL07:{file:'06-fernando-mostrando.png',overlayFile:'06-fernando-moldura.png',scene:'AL07-fernando-mostrando.png',kind:'student',name:'Fernando',role:'Aluno',emphasis:['mostrando o que fez']},\n AL06:{file:'07-conhecer-o-desafio.png'",
  ],
  [".filter(([,id])=>id!=='AL03')", ''],
  [
    "stories.length!==5)throw Error('Esperadas cinco peças; Jeffrey adiado')",
    "stories.length!==7)throw Error('Esperadas sete peças')",
  ],
  [
    "excluded:[{id:'AL03',name:'Jeffrey',reason:'Adiado pelo responsável; não produzir neste lote.'}]",
    'excluded:[]',
  ],
  ['Cinco stories completos', 'Sete stories completos'],
  ['Rafael, Débora e André aparecem', 'Rafael, Jeffrey, Débora, André e Fernando aparecem'],
  [
    'Jeffrey fica para uma próxima inclusão.',
    'Jeffrey e Fernando foram incluídos com as referências fornecidas pelo responsável.',
  ],
  ['contém três PNGs', 'contém cinco PNGs'],
  ['Na imagem 05 (AL06)', 'Na imagem 07 (AL06)'],
  ["completeImages:5,overlays:3,deferred:'Jeffrey'", 'completeImages:7,overlays:5'],
])
update(alunos + 'renderizar-e-conferir.mjs', [
  ["'finais-com-imagens'", "'finais-ampliados'"],
  ["'molduras-videos'", "'molduras-ampliadas'"],
  ['stories.length===5', 'stories.length===7'],
  [
    "completeImages:5,provisionalGeneratedScenes:3,videoOverlays:3,deferred:'AL03 · Jeffrey'",
    'completeImages:7,provisionalGeneratedScenes:5,videoOverlays:5',
  ],
  ['finais-com-imagens/', 'finais-ampliados/'],
  ["'conferencia-com-imagens.png'", "'conferencia-ampliada.png'"],
])
update(alunos + 'verificar-entrega.mjs', [
  ["'finais-com-imagens'", "'finais-ampliados'"],
  ["'molduras-videos'", "'molduras-ampliadas'"],
  [
    "finalPngs.length===5&&overlays.length===3&&!finalPngs.some(f=>f.includes('jeffrey'))&&!overlays.some(f=>f.includes('jeffrey'))",
    "finalPngs.length===7&&overlays.length===5&&finalPngs.some(f=>f.includes('jeffrey'))&&finalPngs.some(f=>f.includes('fernando'))",
  ],
])
console.log('Cinco alunos incorporados aos roteiros e à montagem.')
