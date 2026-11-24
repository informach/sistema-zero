/** Projeta o texto único das aulas para o JSON de conteúdo do caderno visual. */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { formatarJson } from '../../qa/formatar-json'

const root = resolve(import.meta.dir, '../../../..')
const course = process.argv[2]
if (!['nave-contra-asteroides', 'patrulha-espacial'].includes(course))
  throw new Error('Informe nave-contra-asteroides ou patrulha-espacial.')
const dimension = course === 'patrulha-espacial' ? '3d' : '2d'
const folder = `construtor-${dimension === '2d' ? 'nave' : 'patrulha'}`
const path = resolve(root, 'docs/aulas-interativas/construtor', course)
const authored = JSON.parse(readFileSync(resolve(path, 'curso-autoria.json'), 'utf8'))
const lessons = authored.aulas
if (!Array.isArray(lessons) || !lessons.length)
  throw new Error('curso-autoria.json não contém as aulas.')
const e = (v: string) =>
  v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/`([^`]+)`/g, '<b>$1</b>')
type Item = Record<string, any>
type Page = {
  id: string
  kicker: string
  title: string
  subtitle: string
  lesson?: string
  part?: number
  items: Item[]
}
const pages: Page[] = []
const firstId = (lesson: any) => `${lesson.slug}-${lesson.trechos[0].key}`
const lastId = (lesson: any) => `${lesson.slug}-${lesson.trechos.at(-1).key}`
for (let i = 0; i < lessons.length; i += 3) {
  pages.push({
    id: `encontre-${i / 3 + 1}`,
    kicker: 'Seu passo a passo do projeto',
    title: i ? 'Continue sua missão' : 'Encontre seu passo',
    subtitle:
      dimension === '2d'
        ? 'Uma conquista de cada vez, até a nave completar a partida.'
        : 'As regras que você construiu na Nave agora ganham profundidade.',
    items: [
      ...(i
        ? []
        : [
            {
              kind: 'box',
              tone: 'azul',
              title: 'Use quando precisar',
              text: 'No alto de cada página estão a aula e a parte. Use este caderno para lembrar um encaixe, conferir um valor ou repetir um teste. Você pode voltar às experiências e rever os vídeos quantas vezes quiser.',
            },
          ]),
      ...lessons.slice(i, i + 3).map((lesson: any, offset: number) => ({
        kind: 'index',
        title: `Aula ${i + offset + 1}. ${lesson.title}`,
        text: e(lesson.outcome),
        pages: `Páginas {{pagina:${firstId(lesson)}}} a {{ultima-pagina:${lastId(lesson)}}}`,
      })),
      ...(i
        ? []
        : [
            {
              kind: 'note',
              text: 'As telas e o caminho para jogar outra vez já vêm preparados. A cada parte, você acrescenta uma regra ao jogo e testa o resultado.',
            },
          ]),
    ],
  })
}
for (const [lessonIndex, lesson] of lessons.entries()) {
  let stage = lesson.entryStage
  for (const [partIndex, part] of lesson.trechos.entries()) {
    const id = `${lesson.slug}-${part.key}`
    const items: Item[] = []
    const next = part.etapa ?? stage
    if (part.kind === 'experience') {
      items.push({
        kind: 'box',
        tone: 'azul',
        title: 'A ideia desta experiência',
        text: e(part.objective ?? part.ponte),
      })
      items.push({
        kind: 'box',
        tone: 'amarelo',
        title: 'Investigue na aula',
        text: 'Observe o que muda quando você age e quando espera. Conte para si o que aconteceu e por que aconteceu. O Zappy acompanha seus testes. Você pode repetir a experiência antes de continuar.',
      })
    }
    if (part.kind === 'intro')
      items.push({
        kind: 'box',
        tone: 'amarelo',
        title: 'Conheça o jogo pronto',
        text:
          dimension === '2d'
            ? 'Clique no jogo. Aperte Enter. Use as setas para a esquerda e para a direita e toque em Espaço para disparar. Observe de onde sai o laser e o que acontece quando ele encontra um asteroide.'
            : 'Clique no jogo. Aperte Enter. Mova a nave com as setas e toque em Espaço para disparar. Compare a posição da nave com a posição de onde sai o laser. Observe o caminho que entra no espaço.',
      })
    if (part.kind === 'material')
      items.push({
        kind: 'box',
        tone: 'azul',
        title: 'Seu apoio durante a construção',
        text: 'Este caderno acompanha o mesmo projeto da aula. Primeiro veja a explicação e experimente. Na montagem, procure a aula e a parte no alto da página para consultar os passos. Os links de Como Fazer ficam disponíveis na aula para ajudar quando você precisar.',
      })
    const steps: string[] = part.steps ?? []
    steps.forEach((step, index) => {
      items.push({ kind: 'step', number: index + 1, text: e(step) })
    })
    if (!steps.length && !['experience', 'intro', 'material', 'quiz'].includes(part.kind))
      items.push({ kind: 'text', text: e(part.objective ?? part.ponte) })
    if (['build', 'delivery'].includes(part.kind) && part.blockTypes?.length)
      items.push({
        kind: 'drawings',
        title: 'Confira os encaixes desta parte',
        before: stage,
        after: next,
        focus: part.blockTypes ?? [],
      })
    if (part.kind === 'quiz') {
      items.push({
        kind: 'box',
        tone: 'amarelo',
        title: 'Confira o que você descobriu',
        text: 'Responda à revisão na aula. Antes de escolher, imagine o que aconteceria no jogo. Se uma resposta não combinar com o resultado, leia a explicação e tente outra vez.',
      })
      const quiz = part.quiz?.quiz ?? part.quiz
      const questions = quiz?.questions ?? []
      for (const question of questions) {
        const prompt = question.question ?? question.prompt ?? question.title
        if (typeof prompt === 'string')
          items.push({ kind: 'box', tone: 'azul', title: 'Pense na situação', text: e(prompt) })
      }
    }
    if (part.tests?.length)
      items.push({ kind: 'tests', title: 'Teste e observe', tests: part.tests.map(e) })
    if (part.kind === 'delivery')
      items.push({
        kind: 'delivery',
        title: 'Verifique e envie',
        text: 'Clique em <b>Verificar projeto</b>. Se aparecer um aviso, volte ao encaixe indicado e teste novamente. Com a verificação concluída, clique em <b>Enviar meu projeto</b>, confirme em <b>Enviar</b> e espere <b>Projeto enviado!</b>. Depois, continue pela aula.',
      })
    // A lembrança geral fica na abertura; não criar uma folha só com um rodapé repetido.
    const firstSentence = (part.text ?? '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .match(/^(.{20,}?)[.!?](?:\s|$)/)?.[1]
    const subtitle =
      part.kind === 'intro'
        ? 'Experimente a missão antes de construir suas regras.'
        : part.kind === 'material'
          ? 'Os mesmos passos da aula, para consultar quando precisar.'
          : part.kind === 'quiz'
            ? 'Relembre o que aconteceu e explique as regras do seu jogo.'
            : part.objective && part.objective !== part.title
              ? part.objective
              : firstSentence
                ? `${firstSentence}.`
                : lesson.outcome
    pages.push({
      id,
      lesson: lesson.slug,
      part: partIndex + 1,
      kicker: `Aula ${lessonIndex + 1} · Parte ${partIndex + 1}`,
      title: part.title,
      subtitle,
      items,
    })
    stage = next
  }
}
if (dimension === '2d') {
  for (const [category, names] of Object.entries({
    Naves: ['nave-falcao-azul', 'nave-exploradora-coral', 'nave-arraia-lilas'],
    Cenários: ['cenario-aurora', 'cenario-orbita', 'cenario-nebulosa'],
    Asteroides: ['asteroide-rocha-lunar', 'asteroide-gelo-azul', 'asteroide-cristal-violeta'],
    Lasers: ['laser-ciano', 'laser-dourado', 'laser-lilas'],
  }))
    pages.push({
      id: `galeria-${names[0]}`,
      kicker: 'Galeria de aparências',
      title: category,
      subtitle: 'Três opções para o mesmo elemento do jogo.',
      items: [
        { kind: 'gallery', names },
        {
          kind: 'note',
          text: 'Escolha a aparência pelo seletor de imagem do bloco. O tamanho, a velocidade, as vidas e a meta continuam os mesmos. Se preferir, mantenha a primeira opção.',
        },
      ],
    })
} else {
  pages.push({
    id: 'galeria-modelos',
    kicker: 'Os modelos do seu projeto',
    title: 'As peças da Patrulha',
    subtitle: 'Os três modelos já estão no projeto inicial.',
    items: [
      {
        kind: 'gallery3d',
        names: [
          'patrulha-nave-provisoria',
          'patrulha-asteroide-provisorio',
          'patrulha-laser-provisorio',
        ],
      },
      {
        kind: 'note',
        text: 'A nave, o asteroide e o laser são modelos prontos. Nesta versão, construa e teste as regras com estas peças. O curso não pede que você desenhe ou monte um modelo.',
      },
    ],
  })
}
pages.push({
  id: 'revisao-ajuda',
  kicker: 'Seu jogo completo',
  title: 'Volte ao teste certo',
  subtitle: 'Você pode investigar uma regra por vez.',
  items: [
    {
      kind: 'box',
      tone: 'amarelo',
      title: 'O tiro não acompanha a nave?',
      text: 'Volte à parte que faz o laser nascer na nave. Confira a posição lida e faça um disparo em cada lado.',
    },
    {
      kind: 'box',
      tone: 'azul',
      title: 'O acerto conta mais de uma vez?',
      text: 'Volte ao encontro do tiro com o asteroide. Confira quais objetos saem e em que lugar o ponto é somado.',
    },
    {
      kind: 'box',
      tone: 'lilas',
      title: 'A partida não termina?',
      text: 'Confira as condições da vitória e da derrota. Observe os pontos e as vidas antes de testar cada resultado.',
    },
    {
      kind: 'box',
      tone: 'verde',
      title: 'Quer mostrar sua criação?',
      text: 'A publicação no Mural é uma escolha sua. A última parte da aula mostra o caminho. Você também pode concluir o curso e guardar seu projeto sem publicar.',
    },
  ],
})
const directory = resolve(root, 'docs/aulas-interativas-tecnico/recursos', folder)
mkdirSync(directory, { recursive: true })
const contentPath = resolve(directory, 'caderno-conteudo.json')
const serialized = formatarJson(pages)
const old = existsSync(contentPath) ? readFileSync(contentPath, 'utf8') : ''
if (old !== serialized) writeFileSync(resolve(directory, 'caderno-paginacao.json'), '{}\n')
writeFileSync(contentPath, serialized)
const meta = {
  course,
  resource: folder,
  dimension,
  title: dimension === '2d' ? 'Nave Contra Asteroides' : 'Patrulha Espacial',
  cover: dimension === '2d' ? 'capa-construtor-nave.jpg' : 'capa-construtor-patrulha.jpg',
  line1: dimension === '2d' ? 'Nave contra' : 'Patrulha',
  line2: dimension === '2d' ? 'Asteroides' : 'Espacial',
  phrase:
    dimension === '2d'
      ? 'Todos os passos para construir as regras da sua nave.'
      : 'Todos os passos para construir as regras da sua patrulha.',
  promise: 'Do primeiro tiro à partida completa',
  ui: {
    drawingTitle: 'Confira os encaixes desta parte',
    testsTitle: 'Teste e observe',
    continuation: 'continuação',
    earlierBlocks: 'Blocos anteriores',
    drawingContinuation: 'Confira os encaixes',
    galleryTitle: 'Escolha a aparência',
    pageLabel: 'Passo a passo do projeto',
  },
}
writeFileSync(resolve(directory, 'caderno-metadados.json'), formatarJson(meta))
console.log(
  JSON.stringify({ course, pages: pages.length, content: `${folder}/caderno-conteudo.json` }),
)
