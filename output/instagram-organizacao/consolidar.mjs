import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const _root = process.cwd()
const base = path.resolve('docs/marketing/kids/comunidade-dos-criadores/instagram')
const moves = JSON.parse(
  fs.readFileSync('output/instagram-organizacao/movimentos.json', 'utf8').replace(/^\uFEFF/, ''),
)
const original = Object.fromEntries(
  Object.entries(moves).map(([old, dest]) => [
    old,
    fs.readFileSync(path.join(base, dest), 'utf8').replace(/\r\n/g, '\n'),
  ]),
)
const read = (name) => original[name]
const section = (s, start, end) => {
  const a = s.indexOf(start),
    b = end ? s.indexOf(end, a + start.length) : s.length
  if (a < 0 || b < 0) throw new Error(`Seção ausente: ${start}`)
  return s.slice(a, b).trim()
}
const write = (name, text) => fs.writeFileSync(path.join(base, name), `${text.trim()}\n`)
const replace = (s, from, to) => {
  if (!s.includes(from)) throw new Error(`Trecho ausente: ${from}`)
  return s.replaceAll(from, to)
}
const mapping = new Map(
  Object.entries(moves).map(([a, b]) => [path.join(base, a), path.join(base, b)]),
)
mapping.set(path.join(base, 'README.md'), path.join(base, 'README.md'))

function rebase(text, oldFile, newFile) {
  return text.replace(/(!?\[[^\]\n]*\]\()([^\n)]+)(\))/g, (all, before, raw, after) => {
    const target = raw.replace(/^<|>$/g, '')
    if (/^(?:[a-z]+:|\/|#)/i.test(target)) return all
    const hash = target.indexOf('#')
    const rel = hash < 0 ? target : target.slice(0, hash)
    const fragment = hash < 0 ? '' : target.slice(hash)
    if (!rel) return all
    const absolute = path.resolve(path.dirname(oldFile), rel)
    if (oldFile === newFile && !mapping.has(absolute)) return all
    const destination = mapping.get(absolute) ?? absolute
    const next = path.relative(path.dirname(newFile), destination).replaceAll('\\', '/') + fragment
    return before + (raw.startsWith('<') ? `<${next}>` : next) + after
  })
}

// Rebase moved documents before adding navigation that is already in the new location.
for (const [old, dest] of Object.entries(moves)) {
  let content = rebase(read(old), path.join(base, old), path.join(base, dest))
  if (dest.startsWith('historico/')) {
    const status = old.startsWith('proposta-destaques')
      ? 'Proposta aprovada pelo responsável em 04/10/2026; preservada como registro da decisão.'
      : 'Registro anterior preservado para consulta.'
    content = content.replace(
      /^(# .+)\n/,
      `$1\n\n> **HISTÓRICO.** ${status} Para executar o Instagram, use o [guia atual](../README.md), com [Destaques](../01-destaques.md), [Fixados](../02-fixados.md) e [Postagens](../03-postagens.md). As instruções abaixo registram o estado da época.\n`,
    )
  } else if (dest.startsWith('pesquisas/')) {
    content = content.replace(
      /^(# .+)\n/,
      '$1\n\n> **PESQUISA DE REFERÊNCIA.** Observações e recomendações na data do estudo. A execução vigente está no [guia do Instagram](../README.md); este estudo não é uma segunda lista de tarefas.\n',
    )
  } else if (!old.startsWith('operacao-')) {
    content = content.replace(
      /^(# .+)\n/,
      '$1\n\n> **APOIO À PRODUÇÃO.** Consultar para aprofundar uma captura ou recurso. Os textos das peças e o calendário vigentes estão no [guia do Instagram](../README.md). Capacidades e condições devem corresponder ao momento da produção.\n',
    )
  }
  write(dest, content)
}

// Repair inbound Markdown links outside the reorganized folder.
const external = execFileSync('rg', ['--files', 'docs', '-g', '*.md'], { encoding: 'utf8' })
  .trim()
  .split(/\r?\n/)
for (const relative of external) {
  const absolute = path.resolve(relative)
  if (absolute.startsWith(base + path.sep)) continue
  const before = fs.readFileSync(absolute, 'utf8')
  let after = rebase(before, absolute, absolute)
  for (const [old, dest] of Object.entries(moves)) {
    if (old === 'README.md') continue
    const oldLiteral = `docs/marketing/kids/comunidade-dos-criadores/instagram/${old}`
    after = after.replaceAll(
      `\`${oldLiteral}\``,
      `\`docs/marketing/kids/comunidade-dos-criadores/instagram/${dest}\``,
    )
  }
  if (after !== before) fs.writeFileSync(absolute, after)
}

const proposal = read('proposta-destaques-e-fixados-2026-10-04.md')
const highlight = (heading, end) => section(proposal, heading, end).replace(/^### 4\.\d\. /, '## ')
const toc =
  '| Destaque | O que produzir |\n| --- | --- |\n| [Como funciona](#como-funciona) | Seis stories com uma atividade, da explicação ao teste |\n| [Projetos](#projetos) | Duas ou três telas por projeto ensinado nos cursos |\n| [Alunos](#alunos) | Clipes curtos de crianças fazendo aulas |\n| [Dúvidas](#dúvidas) | Dezoito respostas, organizadas em quatro blocos |\n| [Avaliações](#avaliações) | Relatos literais autorizados das famílias |\n| [Sobre nós](#sobre-nós) | Quatro stories com Helena e Júlio e a preparação das aulas |'
let highlights = `# 01 · Destaques: textos e montagem

**Vigente desde 04/10/2026. Estrutura e copy aprovadas pelo responsável.** Este é o documento para produzir os destaques. As datas estão em [Postagens](03-postagens.md#3-stories-e-formação-dos-destaques); os links para copiar estão em [Links e publicação](apoio/links-e-publicacao.md#links-prontos).

**Ordem no perfil:** Como funciona → Projetos → Alunos → Dúvidas → Avaliações → Sobre nós. Conferir a disposição no aplicativo depois de atualizar. Cada destaque funciona sozinho.

${toc}

Usar esses nomes nas capas, com a identidade visual do perfil, contraste legível e um símbolo simples. As frases entre aspas são o texto para a peça; as orientações de captação ficam fora da arte. Em vídeo apresentado, usar a copy como fala e legenda, com os complementos indicados. Conferir leitura no celular. Cada destaque tem o volume adequado ao assunto.

**Antes de editar:** separar cenas reais de aula para Alunos/F02, trechos literais para Avaliações e um projeto de curso disponível. O responsável confirmou projetos e relatos autorizados; ainda falta selecionar os arquivos e conferir se incluem cenas de aula. Os roteiros estão aprovados, mas os materiais finais ainda precisam ser montados.

${highlight('### 4.1. Como funciona', '### 4.2. Projetos')}

${highlight('### 4.2. Projetos', '### 4.3. Alunos')}

${highlight('### 4.3. Alunos', '### 4.4. Avaliações')}

${highlight('### 4.5. Dúvidas', '### 4.6. Sobre nós')}

${highlight('### 4.4. Avaliações', '### 4.5. Dúvidas')}

${highlight('### 4.6. Sobre nós', '## 5. Os três fixados')}

## Manutenção

Cada lançamento acrescenta um bloco a Projetos; novas cenas entram em Alunos; novos relatos entram em Avaliações. Mudanças de formato, acesso ou contratação atualizam a resposta correspondente em Dúvidas. Como funciona e Sobre nós mudam quando a experiência ou a história apresentada mudar. Retirar versões desatualizadas do destaque ao substituir uma informação.

Não abrir um destaque vazio. A seleção de vídeos e relatos é uma tarefa de produção: não preencher com falas inventadas nem apresentar demonstração da equipe como cena de aluno.

[Voltar ao guia](README.md) · [Produzir os fixados](02-fixados.md) · [Ver calendário](03-postagens.md)
`
highlights = highlights
  .replaceAll('Resposta proposta', 'Resposta')
  .replace('São dezoito respostas propostas', 'São dezoito respostas')
  .replace(
    'Como os relatos não foram fornecidos nesta conversa, esta proposta entrega a composição e a copy de apoio. Não contém depoimentos fictícios para ocupar os espaços. A montagem final depende de escolher os trechos já autorizados.',
    'A composição e a copy de apoio estão definidas. Para montar as peças, selecionar os trechos literais dos relatos já autorizados.',
  )
write('01-destaques.md', highlights)

let pins = section(
  proposal,
  '## 5. Os três fixados',
  '## 6. Como fazer a mudança sem duplicar o trabalho',
)
pins = pins.slice(pins.indexOf('\n') + 1).trim()
pins = pins.replace(
  /\| Posição \| Capa \| Função \| Mudança em relação à versão 3 \|[\s\S]*?(?=\n\n### F01)/,
  `| Ordem | Capa | Função |
| --- | --- | --- |
| F01 | **Como seu filho aprende aqui** | Mostrar uma atividade e a orientação durante a construção |
| F02 | **Alunos em aula** | Mostrar crianças usando a proposta |
| F03 | **Como funciona na sua casa** | Resumir requisitos, rotina e condições de acesso |`,
)
pins = pins.replace(/^### (F0\d)\. /gm, '## $1 · ').replaceAll('Legenda proposta', 'Legenda')
write(
  '02-fixados.md',
  `# 02 · Fixados: roteiros e legendas

**Vigente desde 04/10/2026. Estrutura e copy aprovadas pelo responsável.** Este é o documento para produzir F01, F02 e F03. Datas e situação das peças ficam em [Postagens](03-postagens.md); a revisão final está em [Links e publicação](apoio/links-e-publicacao.md#checklist-da-peça-final).

${pins}

## Montagem e conferência

Gravar F01 com uma atividade real e aproveitar as capturas em Como funciona e Projetos. Selecionar os vídeos de alunos para F02 e para Alunos; conferir autorização e contexto. Montar F03 com as oito telas acima. Se os vídeos de alunos ainda não estiverem disponíveis, manter F02 pendente e ajustar sua data no calendário, sem substituí-lo silenciosamente por uma demonstração da equipe.

Depois de publicar, fixar na ordem F01 → F02 → F03 e conferir o resultado no perfil. Registrar os URLs e datas reais no fluxo de publicação. Aprovação do roteiro não significa vídeo pronto ou post publicado.

[Voltar ao guia](README.md) · [Produzir os destaques](01-destaques.md) · [Ver calendário](03-postagens.md)
`,
)

let calendar = read('calendario-2026-10-03.md')
calendar = replace(
  calendar,
  '# Calendário editorial e produção do Instagram',
  '# 03 · Postagens: calendário e roteiros do mês',
)
calendar = replace(
  calendar,
  '**Versão 3, 04/10/2026.**',
  '**Consolidado em 04/10/2026 com os destaques e fixados aprovados.**',
)
calendar = replace(
  calendar,
  'São **12 posts e 12 sequências**, não 12 dias de publicação adicionais.',
  'São **12 posts e 12 dias de stories**, com quantidade de telas adequada a cada assunto. Este é o único calendário de execução.',
)
calendar = replace(calendar, 'Entender: uma aula por dentro', 'Como seu filho aprende aqui')
calendar = replace(
  calendar,
  '| Qua 07/10 | F02 · Reel fixado | Desejar: o jogo ganha escolhas | Duas versões e Jornada | Conhecer possibilidades / bio | Visitas ao perfil e interesse em criação própria |',
  '| Qua 07/10 | F02 · Reel fixado | Alunos em aula | Cenas reais de alunos; seleção pendente | Conhecer a experiência / bio | Visitas ao perfil e dúvidas sobre as aulas |',
)
calendar = replace(calendar, 'Decidir: funcionamento em casa', 'Como funciona na sua casa')
calendar = replace(calendar, 'destaque Família', 'destaque Dúvidas')
calendar = replace(calendar, 'destaque Orientação', 'destaque Como funciona')
calendar = replace(
  calendar,
  'F01 a F03 estão completos no [documento de perfil e fixados](copy-perfil-e-fixados-2026-10-03.md). Fixar nessa ordem e conferir a apresentação no aplicativo. As nove peças abaixo completam o mês.',
  'F01 a F03 estão completos em [Fixados](02-fixados.md). As nove peças abaixo completam o mês. Todos os horários e datas são planejamento; ainda não houve cadastro ou agendamento nesta tarefa. F02 depende da seleção de cenas reais de aula. Se o material não estiver pronto, ajustar a data aqui e manter o roteiro aprovado.',
)
calendar = calendar.replace(
  /\*\*Mudança de equilíbrio:\*\*[^\n]+/,
  '**Consulta por tarefa:** [Destaques](01-destaques.md) contém a copy dos stories permanentes; [Fixados](02-fixados.md) contém F01–F03; este documento contém as datas, F04–F12 e os stories complementares. Os [links e o checklist](apoio/links-e-publicacao.md) apoiam a publicação.',
)
calendar = replace(
  calendar,
  'Reaproveita F02, com novo recorte e função; não republicar o mesmo arquivo com outra capa.',
  'Produzir duas versões comparáveis de um projeto da equipe para F10/S10. F02 usa cenas de alunos e tem outra função.',
)
const story8 = section(calendar, '### S08 · Apoios na prática', '### S09 · Jornada')
const story10 = section(calendar, '### S10 · Duas versões', '### S11 · Comparar')
const story12 = section(calendar, '### S12 · Bastidor e próximo passo', '## 4. Produção em lotes')
const stories = `## 3. Stories e formação dos destaques

Três dias de stories por semana, nos mesmos dias do feed. A primeira quinzena forma os seis destaques; Dúvidas recebe quatro blocos ao longo do mês. O volume varia: não há obrigação de quatro telas por dia. Uma resposta longa pode ocupar duas telas. Stickers são aplicados no Instagram.

| Data | Sequência | Fonte única do texto | Volume inicial | Ação e onde salvar |
| --- | --- | --- | --- | --- |
| 05/10 | S01 · Como funciona | [Destaques: Como funciona](01-destaques.md#como-funciona) | 6 telas | L1; salvar em Como funciona |
| 07/10 | S02 · Alunos | [Destaques: Alunos](01-destaques.md#alunos) | Seleção curta, por exemplo 4–6 clipes | Mostrar uso real; salvar em Alunos |
| 09/10 | S03 · Dúvidas: adequação e rotina | [Destaques: Dúvidas](01-destaques.md#dúvidas), primeiro bloco | 6 respostas | Salvar em Dúvidas |
| 12/10 | S04 · Projetos | [Destaques: Projetos](01-destaques.md#projetos), P01–P03 | 3 telas | L1 para o exemplo Cadê Todo Mundo?; salvar em Projetos |
| 14/10 | S05 · Avaliações | [Destaques: Avaliações](01-destaques.md#avaliações) | 1–2 telas por relato selecionado | Salvar em Avaliações |
| 16/10 | S06 · Sobre nós | [Destaques: Sobre nós](01-destaques.md#sobre-nós) | 4 telas | L0; salvar em Sobre nós |
| 19/10 | S07 · Dúvidas: orientação e acompanhamento | [Destaques: Dúvidas](01-destaques.md#dúvidas), segundo bloco | 5 respostas | Salvar em Dúvidas |
| 21/10 | S08 · Apoios na prática | Roteiro S08 abaixo | 4 telas | Caixa para responsáveis; sequência complementar |
| 23/10 | S09 · Dúvidas: contratação | [Destaques: Dúvidas](01-destaques.md#dúvidas), terceiro bloco | 4 respostas | L5 nas telas indicadas; salvar em Dúvidas |
| 26/10 | S10 · Duas versões | Roteiro S10 abaixo | 4 telas | Enquete e resultado; sequência complementar |
| 28/10 | S11 · Dúvidas: participação e visibilidade | [Destaques: Dúvidas](01-destaques.md#dúvidas), quarto bloco | 3 respostas | Salvar em Dúvidas |
| 30/10 | S12 · Bastidor e próximo passo | Roteiro S12 abaixo | 4 telas | L5; sequência complementar |

S02 e S05 dependem dos arquivos autorizados selecionados. Se faltarem, registrar a pendência e remanejar o bloco neste calendário. Não criar destaque vazio nem transformar projetos prontos em cenas de aula. A apresentação de Sobre nós já entra na montagem inicial; F12 é um bastidor adicional.

As 18 respostas de Dúvidas estão divididas em 6 + 5 + 4 + 3. Os demais textos de destaques ficam somente no documento 01, para que uma revisão não gere duas copies diferentes. Usar os [links prontos](apoio/links-e-publicacao.md#links-prontos) conforme a sequência.

As frases entre aspas abaixo são o texto integral de cada tela. Em apresentação em vídeo, usar a mesma frase como fala e legenda sincronizada, com os complementos indicados. S08, S10 e S12 apoiam a conversa do mês; não precisam ser guardados automaticamente nos destaques.

${story8}

${story10}

${story12}

`
calendar =
  calendar.slice(0, calendar.indexOf('## 3. Stories:')) +
  stories +
  calendar.slice(calendar.indexOf('## 4. Produção em lotes'))
const batches = `| Lote | Captura e preparação | Peças atendidas |
| --- | --- | --- |
| A · Aula e projetos | Partida, experiência, regra, cenário preparado e explicação integrada | F01, F04; S01, S04 |
| B · Alunos e famílias | Selecionar cenas reais de aula e relatos literais, conferir contexto e autorização | F02; S02, S05 |
| C · Rotina e orientação | Computador, aula, ajuda, área da família, condições e controles | F03, F07, F08; S03, S07, S08, S09, S11 |
| D · Escolhas e ferramentas | Duas versões, Pinta, passagem ao Estúdio, Jornada e templates | F05, F06, F09, F10, F11; S10 |
| E · Fundadores e preparação | Casal, roteiro e bastidor real de uma decisão de aula | F12; S06, S12 |`
calendar = calendar.replace(
  /\| Lote \| Captura e preparação \| Peças atendidas \|[\s\S]*?(?=\n\n\*\*Preparação proposta)/,
  batches,
)
calendar = replace(
  calendar,
  'Priorizar conforme dúvidas recebidas: uso real de um aluno autorizado;',
  'Priorizar conforme dúvidas recebidas: novos momentos de alunos autorizados;',
)
write('03-postagens.md', calendar)

let ops = read('operacao-e-links-2026-10-04.md')
ops = replace(ops, '# Operação, destinos e primeiro ciclo', '# Links e publicação')
ops = ops.replace(
  '04/10/2026. Fonte de produto:',
  '**Consolidado em 04/10/2026.** Apoio aos três guias de execução. Copy em [Destaques](../01-destaques.md) e [Fixados](../02-fixados.md); datas em [Postagens](../03-postagens.md).\n\nFonte de produto:',
)
// Rebase the single existing local Markdown link; new navigation is already relative to apoio/.
ops = ops.replace('(../../../medicao-funil.md)', '(../../../../medicao-funil.md)')
const link = (url, content) => {
  const u = new URL(url)
  for (const [k, v] of Object.entries({
    utm_source: 'instagram',
    utm_medium: 'organic_social',
    utm_campaign: 'comunidade_202610',
    utm_content: content,
  }))
    u.searchParams.set(k, v)
  return `\`${u.href}\``
}
const destinations = [
  ['Bio', 'https://sistemazero.com.br/', 'bio'],
  [
    'S01 · Como funciona, tela 6',
    'https://sistemazero.com.br/como-funciona/#como-aprende',
    's01_como_funciona',
  ],
  [
    'Alunos · fecho opcional, sticker “Conhecer as aulas”',
    'https://sistemazero.com.br/como-funciona/#como-aprende',
    'alunos_aulas',
  ],
  [
    'S04 · Projetos, P03 de Cadê Todo Mundo?',
    'https://sistemazero.com.br/como-funciona/#como-aprende',
    's04_projeto_cade_todo_mundo',
  ],
  ['S06 · Sobre nós, tela 4', 'https://sistemazero.com.br/', 's06_sobre_nos'],
  [
    'S09 · Dúvidas, planos e condições',
    'https://sistemazero.com.br/kids/comunidade-dos-criadores/oferta#planos',
    's09_duvidas_planos',
  ],
  [
    'S12 · Bastidor e próximo passo',
    'https://sistemazero.com.br/kids/comunidade-dos-criadores/oferta#planos',
    's12_planos',
  ],
  [
    'Resposta complementar sobre apoio, quando solicitada',
    'https://sistemazero.com.br/como-funciona/#orientacao',
    'duvidas_orientacao',
  ],
]
ops = ops.replace(
  /\| Uso \| Link para copiar \|[\s\S]*?(?=\n\nOs demais stories)/,
  `| Uso | Link para copiar |\n| --- | --- |\n${destinations.map(([name, url, id]) => `| ${name} | ${link(url, id)} |`).join('\n')}`,
)
ops = replace(
  ops,
  'Os demais stories têm enquete, caixa ou observação como ação principal.',
  'Os demais stories apresentam respostas, relatos ou interações sem link obrigatório. O link opcional de Alunos pode encerrar uma seleção; não precisa aparecer em cada clipe.',
)
ops = ops.replace(
  /## Aplicação em ordem[\s\S]*?(?=## Conversas e respostas úteis)/,
  `## Aplicação em ordem

1. Separar os materiais: gravação do projeto, cenas reais de alunos, relatos literais e uma captação de Helena e Júlio. Nome e foto do perfil já foram atualizados pelo responsável. A referência de perfil está no [guia de entrada](../README.md#perfil-de-referência).
2. Produzir pelos documentos [Destaques](../01-destaques.md) e [Fixados](../02-fixados.md). Aproveitar as capturas nas peças relacionadas; manter as identificações de demonstração da equipe e de registros reais.
3. Conferir os destinos publicados em celular, conteúdo e rolagem das âncoras. Conferir o link completo da bio com UTMs. A publicação do site não é presumida pela existência da copy local.
4. Publicar conforme o [único calendário](../03-postagens.md). Formar Como funciona, Projetos, Alunos, Dúvidas, Avaliações e Sobre nós com os blocos indicados. Fixar F01, F02 e F03 depois de publicados; conferir ordem e leitura no perfil.
5. Guardar URL/ID real, data e versão de cada publicação no fluxo existente. Conferir disponibilidade dos comentários e caixas usados nas peças; se houver comentários limitados, usar a alternativa escrita em F10 com a enquete S10.
6. Prosseguir com os lotes do mês. Registrar tempo de produção e perguntas recebidas. Atualizar os textos no guia responsável quando uma condição mudar.

Cada peça continua em produção até haver arquivo final e revisão em celular. Datas de planejamento e aprovação editorial não equivalem a agendamento ou publicação.

`,
)
ops = ops.replace(
  /## Conversas e respostas úteis[\s\S]*?(?=## Registro semanal no fluxo existente)/,
  `## Conversas e respostas úteis

Consultar as respostas vigentes em [Dúvidas](../01-destaques.md#dúvidas), escolhendo a que responde à pergunta recebida. Essa é a fonte única do texto sobre formato, orientação, equipamento, perfis, contratação e visibilidade. Complementar com uma demonstração pertinente ou um link acima quando ajudar a família.

Para preço, informar o valor vigente junto do período, formas de pagamento e renovação. Conferir a oferta antes de responder. Dúvidas novas recorrentes entram no mesmo guia, evitando manter respostas divergentes em outro arquivo.

`,
)
ops = replace(
  ops,
  'Não houve mudança de perfil, publicação, agendamento, cadastro no app ou gasto de mídia nesta entrega.',
  'Esta organização não publicou, agendou nem cadastrou peças no app. As alterações de nome e foto do Instagram foram informadas pelo responsável.',
)
write('apoio/links-e-publicacao.md', ops)

write(
  'README.md',
  `# Instagram: comece por aqui

**Organizado em 04/10/2026. Proposta de destaques e fixados aprovada pelo responsável.** Perfil: **@criecomhelenaejulio**. Os três documentos abaixo são os guias de execução. Cada texto tem um único lugar de manutenção.

## O que abrir para executar

| Quero fazer | Documento | O que está pronto nele |
| --- | --- | --- |
| Montar os destaques | **[01 · Destaques](01-destaques.md)** | Ordem, função, copy por tela, cenas e montagem dos seis destaques |
| Produzir os três posts fixados | **[02 · Fixados](02-fixados.md)** | Roteiros, capas, legendas e materiais de F01, F02 e F03 |
| Fazer as próximas postagens | **[03 · Postagens](03-postagens.md)** | Calendário único de 05 a 30/10, roteiros F04–F12 e distribuição dos stories |

Na hora de colocar os links e publicar, consultar **[Links e publicação](apoio/links-e-publicacao.md)**. O calendário aponta para a copy de Destaques e Fixados, sem repetir esses roteiros.

## Ordem de trabalho

1. **Separar o material:** exemplo de curso disponível, cenas reais de crianças nas aulas, trechos literais de avaliações e gravação do casal. Há projetos e relatos autorizados; os arquivos ainda precisam ser selecionados, inclusive confirmar as cenas de aula.
2. **Montar os destaques pelo documento 01.** Como funciona → Projetos → Alunos → Dúvidas → Avaliações → Sobre nós. Projetos mostra o que os cursos ensinam; Alunos mostra crianças em aula; Avaliações reúne relatos das famílias.
3. **Produzir os fixados pelo documento 02.** Como seu filho aprende aqui → Alunos em aula → Como funciona na sua casa.
4. **Executar e acompanhar o documento 03.** Três posts e três dias de stories por semana. Os stories formam os destaques; as 18 respostas de Dúvidas entram em quatro blocos. As datas podem ser ajustadas nesse mesmo calendário conforme a produção.

**Situação da entrega:** estrutura e copy aprovadas; seleção de vídeos e relatos, captação, edição e publicação ainda são etapas de produção. Este material não representa publicações agendadas. A foto e o nome do Instagram já foram atualizados pelo responsável.

## Perfil de referência

**Nome:** Helena e Júlio | Programação Infantil. **Arroba:** @criecomhelenaejulio. **Foto:** a imagem do casal já aplicada ao Instagram. Conferir os dois rostos no recorte circular ao preparar variações. Os avatares continuam fazendo parte das aulas e da identidade da experiência infantil.

**Bio vigente de referência:**

\`\`\`text
🎮 Aulas online de programação • 9 a 14 anos
💡 Seu filho aprende criando os próprios jogos
👇 Veja como funciona
\`\`\`

**Título do link:** Veja como seu filho aprende. Copiar o URL da linha Bio em [Links e publicação](apoio/links-e-publicacao.md#links-prontos). Conferir quebra de linhas e a opção de categoria Educação disponível na conta. A bio já coincidia com essa redação na conferência registrada em 04/10; a organização dos documentos não alterou a conta.

## Onde ficaram os outros documentos

| Pasta | Para que consultar |
| --- | --- |
| [apoio/](apoio/) | Links, checklist, [demonstração da plataforma](apoio/valor-e-demonstracao-2026-10-03.md) e [recursos de produção](apoio/capacidades-redes-sociais-2026-10-04.md) |
| [pesquisas/](pesquisas/) | Análises da Kodland, pesquisas anteriores e auditoria que fundamentaram as decisões |
| [historico/](historico/) | Versões substituídas, [proposta aprovada original](historico/proposta-destaques-e-fixados-2026-10-04.md) e registros da página inicial |
| [evidencias/](evidencias/) | Capturas e dados usados nas pesquisas |

As pesquisas guardam o que foi observado e recomendado em cada data. O histórico guarda a evolução. Para executar, usar sempre os três guias desta página. A fundamentação da proposta aprovada está preservada no histórico; não é necessário reler os estudos para montar uma peça.

## Como manter organizado

- Melhorou uma frase de destaque: editar **01 · Destaques**.
- Mudou roteiro ou legenda de um fixado: editar **02 · Fixados**.
- Mudou data, pauta ou texto de F04 em diante: editar **03 · Postagens**. Manter esse arquivo como o calendário vigente ao iniciar outro ciclo.
- Mudou destino ou procedimento de publicação: editar **Links e publicação** e conferir as referências nas peças afetadas.
- Uma mudança substitui uma decisão importante: guardar a versão anterior em **historico/**, atualizar a data no guia vigente e seus vínculos. Revisões pequenas são feitas no próprio arquivo, sem criar outra proposta concorrente.

Os nomes dos guias permanecem estáveis. Aprovação editorial, arquivo final, agendamento e publicação devem ser registrados como etapas diferentes.
`,
)

// Replace entry points that previously told the reader to execute superseded plans.
const marketingIndex = path.resolve('docs/marketing/README.md')
let index = fs.readFileSync(marketingIndex, 'utf8')
index = index.replace(
  /^\| Kids \| Comunidade dos Criadores \| \[Reposicionamento do Instagram[^\n]+/m,
  '| Kids | Comunidade dos Criadores | **[Instagram: guia de execução](kids/comunidade-dos-criadores/instagram/README.md)**. Proposta aprovada e documentos consolidados em 04/10/2026: [Destaques](kids/comunidade-dos-criadores/instagram/01-destaques.md), [Fixados](kids/comunidade-dos-criadores/instagram/02-fixados.md) e [Postagens](kids/comunidade-dos-criadores/instagram/03-postagens.md). Links e publicação em apoio; pesquisas e versões anteriores em pastas próprias. Produção e publicação das peças ainda pendentes. |',
)
fs.writeFileSync(marketingIndex, index)
const positioningFile = path.resolve(
  'docs/marketing/kids/comunidade-dos-criadores/posicionamento.md',
)
let positioning = fs.readFileSync(positioningFile, 'utf8')
positioning = positioning.replace(
  'o [perfil e fixados](instagram/historico/copy-perfil-e-fixados-2026-10-03.md) e o [calendário de 04/10](instagram/historico/calendario-2026-10-03.md)',
  'os guias vigentes de [Destaques](instagram/01-destaques.md), [Fixados](instagram/02-fixados.md) e [Postagens](instagram/03-postagens.md)',
)
fs.writeFileSync(positioningFile, positioning)
const researchFile = path.resolve(
  'docs/marketing/kids/comunidade-dos-criadores/pesquisa-kodland-2026-10-04.md',
)
let research = fs.readFileSync(researchFile, 'utf8')
research = research.replace(
  'A consolidação dos destaques próprios usa “Comece”, “Na prática”, “Criações”, “Orientação” e “Família”. Planos e FAQ ficam nos destinos pertinentes. Prova pode começar com demonstração dos autores, identificada como tal.',
  'A consolidação inicial usava “Comece”, “Na prática”, “Criações”, “Orientação” e “Família”. Essa estrutura foi substituída pela proposta aprovada em 04/10: Como funciona, Projetos, Alunos, Dúvidas, Avaliações e Sobre nós. A copy vigente está em [Destaques](instagram/01-destaques.md).',
)
fs.writeFileSync(researchFile, research)
console.log(
  'Consolidação concluída: README, três guias, apoio, pesquisas, histórico e referências externas atualizados.',
)
