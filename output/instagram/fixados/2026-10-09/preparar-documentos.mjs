import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd(),
  work = path.resolve('output/instagram/fixados/2026-10-09')
const plan = JSON.parse(fs.readFileSync(path.join(work, 'planejamento.json'), 'utf8'))
const target = path.resolve(
  'docs/marketing/kids/comunidade-dos-criadores/instagram/producao/fixados',
)
const quote = (s) =>
  s
    .split('\n')
    .map((line) => '> ' + line)
    .join('\n')
const intro = `# Fixados: carrosséis 4:5 com copy completa

**Revisão: 09/10/2026.** Os três fixados são carrosséis de **1080 × 1350 pixels (4:5)**, conforme orientação do responsável. F01 apresenta o primeiro jogo, F02 apresenta os alunos e F03 explica como começar. Fazem parte do mesmo calendário de 12 posts; não são publicações adicionais.

Todas as frases destinadas às artes estão nos blocos de citação de cada slide. Títulos, textos, destaques visuais e chamadas entram na imagem. As notas de cena são internas. As legendas completas acompanham cada carrossel. O destino é sempre a página da bio (LB), seguida do botão **Desafio do Primeiro Jogo**, que abre a oferta (L0).

**Direção visual:** manter azul, branco e amarelo dos destaques; redesenhar o conteúdo para 4:5. Capas independentes e reconhecíveis, texto grande, margens generosas, sequência numerada e uma ideia por slide. Conforme orientação do usuário, as capturas dos três fixados não levam o rótulo Demonstração da equipe. A origem das imagens permanece registrada nas notas de produção. F01 acrescenta a personalização no slide 7, depois do jogo funcionar e antes do convite final. Os carrosséis encaminham para a bio; não desenhar um sticker como se fosse clicável.

**Imagens dos alunos:** este lote reaproveita as cenas provisórias geradas com as referências de Rafael, Jeffrey, Débora, André e Fernando, autorizadas para Alunos. A identificação é nome e Aluno/Aluna, sem parentesco. A legenda de F02 informa a origem gerada das imagens; elas não são gravações das atividades. Ao substituir pelas mídias reais, conferir se as frases correspondem às ações mostradas e atualizar a última frase da legenda. Não inventar depoimentos ou resultados.

**Como começar:** os nove slides de F03 têm cenas geradas com referências da família e do produto. Capa: Débora descobrindo o Farol no notebook, com o rosto e o jogo em destaque. Faixa etária: André e Débora juntos. Equipamento: mãos no mouse e teclado. Aula gravada: André pausando o vídeo. Ajuda: Débora escrevendo pela aula. Prazo: calendário e atividade. Após o prazo: jogar sem abrir a edição. Garantia: Helena acompanhando Débora. Convite: Júlio conversando com André. As telas dentro das cenas são composições baseadas nas capturas, não capturas novas da plataforma. Manter essa origem nas notas internas e no texto alternativo. Não usar cartelas que repitam o texto no lugar de imagens.

**Produção:** [Pasta dos três carrosséis](producao/fixados/). Cada subpasta contém os PNGs numerados, a legenda completa, o texto alternativo de cada slide e as orientações de publicação. A versão anterior em Reels e a alternativa F02B estão preservadas na cópia de trabalho de 09/10/2026; não fazem parte da execução atual.
`
let doc = intro
for (const c of plan.carousels) {
  const folder = path.join(target, c.slug)
  fs.mkdirSync(folder, { recursive: true })
  doc += `\n## ${c.id} · ${c.title}\n\n**Formato:** carrossel de ${c.slides.length} slides, 4:5. **Objetivo:** ${c.objective} **Destino:** bio LB → botão Desafio do Primeiro Jogo → oferta L0.\n`
  const alts = []
  c.slides.forEach((s, i) => {
    const file = String(i + 1).padStart(2, '0') + '-' + (i === 0 ? 'capa' : 'slide') + '.png'
    s.file = file
    const parts = [s.title, ...s.body]
    doc += `\n### Slide ${i + 1} · ${i === 0 ? 'Capa' : s.title.replaceAll('\n', ' ')}\n\n${parts.map(quote).join('\n>\n')}\n`
    if (s.role) doc += `\n**Identificação:**\n\n${quote(s.role)}\n`
    if (s.labels) doc += `\n**Rótulos das imagens:**\n\n${s.labels.map(quote).join('\n>\n')}\n`
    if (s.feature)
      doc += `\n**Destaque visual:**\n\n${quote(s.feature)}${s.featureLabel ? '\n>\n' + quote(s.featureLabel) : ''}\n`
    if (s.cta) doc += `\n**Chamada:**\n\n${quote(s.cta)}\n`
    doc += `\n**Cena:** ${s.scene}\n`
    const visible = [
      s.title,
      s.role,
      ...s.body,
      ...(s.labels ?? []),
      s.feature,
      s.featureLabel,
      s.cta,
    ]
      .filter(Boolean)
      .join(' ')
      .replaceAll('\n', ' ')
    const origin = s.generated
      ? ' Cena gerada com referências. ' + s.imageDescription
      : c.provisional && s.images?.some((f) => f.includes('/alunos/'))
        ? ' Cena provisória gerada a partir de referências dos alunos.'
        : s.images?.some((f) => f.includes('/quem-somos/'))
          ? ' Cena gerada de Helena e Júlio no computador.'
          : s.demo
            ? ' Captura do produto.'
            : ''
    alts.push(`${file}\n${visible}${origin}`)
  })
  doc += `\n### Legenda completa\n\n${c.caption.map(quote).join('\n>\n')}\n`
  fs.writeFileSync(path.join(folder, 'legenda.txt'), c.caption.join('\n\n') + '\n')
  fs.writeFileSync(path.join(folder, 'texto-alternativo.txt'), alts.join('\n\n') + '\n')
  fs.writeFileSync(
    path.join(folder, 'publicacao.txt'),
    `${c.id} · ${c.title}\nCarrossel 4:5 · ${c.slides.length} slides · 1080 × 1350\n\nEnviar os PNGs na ordem dos nomes, começando por 01-capa.png. Usar legenda.txt como legenda da publicação e texto-alternativo.txt para a descrição de cada imagem. Manter a proporção 4:5 e conferir o recorte da capa na prévia do perfil.\n\nDestino da chamada: link da bio → botão Desafio do Primeiro Jogo. Não há sticker de link nos PNGs.\nPágina da bio: https://sistemazero.com.br/?utm_source=instagram&utm_medium=organic_social&utm_campaign=desafio_instagram_ciclo01&utm_content=bio\nOferta: https://sistemazero.com.br/kids/desafio-primeiro-jogo/oferta\n\n${c.provisional ? 'As imagens dos alunos são provisórias, geradas a partir de suas fotos. A legenda registra essa origem. Ao substituir pelos vídeos ou fotos reais, ajustar a legenda e manter as ações descritas coerentes com os registros.\n\n' : ''}Depois de publicar, fixar este post junto de F01, F02 e F03, mantendo três fixados. Estes arquivos estão preparados localmente; a publicação no Instagram ainda será feita pela equipe.\n`,
  )
}
doc +=
  '\n**Conferência final:** imagens e copy legíveis em 4:5; títulos e legendas coerentes quando vistos sozinhos; aulas gravadas, equipamento, ajuda, prazo e garantia conforme a oferta; identificação dos alunos sem parentesco; nenhuma imagem gerada descrita como registro real. Conferir os três posts no perfil depois da publicação.\n\n[Guia e bio](README.md) · [Destaques](01-destaques.md) · [Calendário](03-postagens.md)\n'
fs.writeFileSync(path.resolve(plan.source), doc)
fs.writeFileSync(path.join(work, 'manifesto.json'), JSON.stringify({ ...plan, target }, null, 2))
fs.writeFileSync(
  path.join(work, 'copy-revisao.txt'),
  plan.carousels
    .flatMap((c) => [
      ...c.slides.map((s) =>
        [s.title, ...s.body, s.role, ...(s.labels ?? []), s.feature, s.featureLabel, s.cta]
          .filter(Boolean)
          .join('\n'),
      ),
      c.caption.join('\n\n'),
    ])
    .join('\n\n'),
)
fs.writeFileSync(
  path.join(target, 'LEIA-ME.txt'),
  `FIXADOS · TRÊS CARROSSÉIS 4:5\n\n${plan.carousels.map((c) => `${c.slug}: ${c.slides.length} slides — ${c.title}`).join('\n')}\n\nTotal: 24 imagens de 1080 × 1350. Cada pasta contém legenda, texto alternativo e instruções. Os arquivos estão numerados na ordem de publicação dentro do carrossel. F02 usa as imagens provisórias já autorizadas dos cinco alunos.\n\nFixar os três posts após publicar. O link da bio permanece na página inicial, com o botão Desafio do Primeiro Jogo apontando para a oferta. Não usar os PNGs como stories sem adaptar a proporção.\n`,
)
console.log(
  JSON.stringify({
    carousels: plan.carousels.map((c) => ({ id: c.id, slides: c.slides.length })),
    target,
  }),
)
