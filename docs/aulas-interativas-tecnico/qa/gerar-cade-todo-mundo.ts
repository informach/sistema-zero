/** Gera apenas os três manifestos derivados deste curso. Não altera catálogo nem outros cursos. */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { discoverySpeechSteps } from '../../../packages/core/src/learning/scene/discovery-guidance'
import { JARDIM_PARES, jardimSpriteRect } from '../../../packages/studio/src/arte/jardim-assets'
import {
  montarProjetoCadeTodoMundo,
  montarProjetoCadeTodoMundoCompleto,
} from './cade-todo-mundo-projeto'
import { gravarArquivo } from './gravar-arquivo'
import { cadeTodoMundo } from './quizzes-cursos-curtos'
import { extrairPartesElevenLabs, sincronizarRecadosNaPagina } from './roteiro-elevenlabs'

const DIR = resolve(import.meta.dir, '../../aulas-interativas/cade-todo-mundo')
const CURSO = 'cade-todo-mundo'
/** Alvos seguem os sprites do projeto, inclusive após personalização. */
const tocar = (n: number) => ({
  action: 'clickTarget' as const,
  target: { kind: 'sprite' as const, path: `esconderijo${n}`, groupPath: 'esconderijos' },
})
const valor = (path: string, value: number, compare = 'equals') => ({
  target: { kind: 'value', path },
  compare,
  value,
})
const revelaEscolhido = {
  id: 'revelar-ao-toque',
  label: 'O toque revela só o personagem daquele esconderijo.',
  hint: 'No teste das pedras, só as pedras devem ficar invisíveis. Confira qual esconderijo a reação altera.',
  rule: {
    type: 'behavior',
    steps: [tocar(2)],
    expect: valor('esconderijo2.opacity', 0),
    checkpoints: [
      { afterStep: 1, expect: valor('esconderijo1.opacity', 0, 'notEquals') },
      { afterStep: 1, expect: valor('esconderijo3.opacity', 0, 'notEquals') },
    ],
  },
}
const outrosEsconderijos = {
  id: 'outros-esconderijos',
  label: 'Outros esconderijos também respondem aos próprios toques.',
  hint: 'Teste outros esconderijos: cada um precisa revelar o próprio personagem.',
  rule: {
    type: 'behavior',
    steps: [tocar(1), tocar(3)],
    expect: valor('esconderijo3.opacity', 0),
    checkpoints: [
      { afterStep: 1, expect: valor('esconderijo1.opacity', 0) },
      { afterStep: 2, expect: valor('esconderijo2.opacity', 0, 'notEquals') },
    ],
  },
}
const textoFinal = { kind: 'text', selector: '#sz-game-hud-status [data-sz-hud-kind="label"]' }
const mensagemTres = {
  id: 'mensagem-tres-achados',
  label: 'A mensagem aparece depois dos três achados.',
  hint: 'Com dois achados, a mensagem ainda não deve aparecer. Ela aparece quando os três foram encontrados.',
  rule: {
    type: 'behavior',
    steps: [
      { action: 'wait', ms: 600 },
      tocar(1),
      { action: 'wait', ms: 600 },
      tocar(2),
      { action: 'wait', ms: 600 },
      tocar(3),
      { action: 'wait', ms: 600 },
    ],
    expect: { target: textoFinal, compare: 'notEquals', value: '' },
    checkpoints: [
      { afterStep: 1, expect: { target: textoFinal, compare: 'equals', value: '' } },
      { afterStep: 3, expect: { target: textoFinal, compare: 'equals', value: '' } },
      { afterStep: 5, expect: { target: textoFinal, compare: 'equals', value: '' } },
      { afterStep: 7, expect: valor('achados', 3) },
    ],
  },
}

const EXEMPLOS = {
  inicio: 'ca000001-0000-4000-8000-000000000001',
  revelar: 'ca000002-0000-4000-8000-000000000002',
  contar: 'ca000003-0000-4000-8000-000000000003',
}
const video = (key: string, title: string) => {
  for (const nome of [
    'cade-todo-mundo-aula-1',
    'cade-todo-mundo-aula-2',
    'cade-todo-mundo-certificado',
  ]) {
    const parte = extrairPartesElevenLabs(
      readFileSync(resolve(DIR, `${nome}.roteiro.md`), 'utf8'),
    ).find((p) => p.clipe === key)
    if (parte)
      return {
        key,
        plannedVideo:
          'Título: ' +
          title +
          '\n\nMaster integral da professora. Roteiro: ' +
          nome +
          '.roteiro.md. Substituições kids: ' +
          JSON.stringify(parte.intervencoes),
      }
  }
  throw new Error(`Clipe sem roteiro de produção: ${key}`)
}
const dialogue = (key: string, text: string) => ({
  key,
  content: { kind: 'dialogue', pose: 'speaking', text },
})
const section = (
  key: string,
  title: string,
  intent: string,
  objective: string,
  blockKeys: string[],
  requiredBlocks: string[],
  workspaceKey: string | null = null,
  projectChecks?: unknown[],
) => ({
  key,
  title,
  intent,
  objective,
  blockKeys,
  workspaceKey,
  externalTool: null,
  pendingMedia: [],
  completion: {
    version: 1,
    blockIds: requiredBlocks,
    ...(projectChecks ? { projectChecks } : {}),
  },
})
/**
 * Envio em dia (10/10/2026): a parte só fecha quando o último envio é igual ao projeto de agora.
 * Vai na ÚLTIMA parte que muda o jogo antes de publicar (ESPEC-MANIFESTO §6).
 */
const comEnvioEmDia = <S extends { completion: object }>(s: S) => ({
  ...s,
  completion: { ...s.completion, submissionUpToDate: true as const },
})
const { blocks: allowed } = JSON.parse(
  readFileSync(
    resolve(import.meta.dir, '../../aulas-interativas/cade-todo-mundo/blocos.json'),
    'utf8',
  ),
) as { blocks: string[] }
const studio = (
  initialProject: ReturnType<typeof montarProjetoCadeTodoMundo>,
  publishOnMural = false,
) => ({
  key: 'projeto',
  content: {
    kind: 'studio',
    purpose: 'submission',
    chain: CURSO,
    level: 'iniciante-2d',
    allowedModes: ['blocks'],
    allowLevelReveal: false,
    allowBlocks: allowed,
    ...(publishOnMural
      ? {
          showcase: {
            enabled: true,
            title: 'Cadê Todo Mundo?',
            summary: 'Um jogo de encontrar personagens escondidos no jardim.',
          },
        }
      : {}),
    initialProject,
    projectExamples: publishOnMural
      ? {
          version: 1,
          examples: {
            [EXEMPLOS.revelar]: montarProjetoCadeTodoMundo(true),
            [EXEMPLOS.contar]: montarProjetoCadeTodoMundoCompleto(),
          },
          sections: {
            'contar-achados': {
              entryExampleId: EXEMPLOS.revelar,
              solutionExampleId: EXEMPLOS.contar,
            },
          },
        }
      : {
          version: 1,
          examples: {
            [EXEMPLOS.inicio]: montarProjetoCadeTodoMundo(),
            [EXEMPLOS.revelar]: montarProjetoCadeTodoMundo(true),
          },
          sections: {
            'primeiro-achado': {
              entryExampleId: EXEMPLOS.inicio,
              solutionExampleId: EXEMPLOS.revelar,
            },
          },
        },
  },
})

const aula1 = {
  version: 5,
  courseSlug: CURSO,
  lessonSlug: 'aula-1',
  title: 'O primeiro achado',
  blocks: [
    video('video-a1-abertura', 'Vamos procurar!'),
    dialogue(
      'ponte-a1-jogo',
      'Sua vez! Jogue a versão pronta e encontre os três personagens. Depois, clique em Próxima parte.',
    ),
    {
      key: 'jogo-pronto',
      content: {
        kind: 'interactive',
        required: true,
        title: 'Experimente o jogo pronto',
        instructions: 'Toque nos esconderijos até encontrar os três personagens.',
        hints: [],
        activity: {
          type: 'project-play',
          project: montarProjetoCadeTodoMundoCompleto(),
          stage: { width: 640, height: 360 },
          targets: JARDIM_PARES.map(({ esconderijo, centroX }) => {
            const { x, y, w, h } = jardimSpriteRect(esconderijo, centroX)
            return {
              id: esconderijo,
              label: esconderijo === 'arbusto' ? 'no arbusto' : `nas ${esconderijo}`,
              x,
              y,
              width: w,
              height: h,
            }
          }),
        },
      },
    },
    video('video-a1-caderno', 'Seu passo a passo do projeto'),
    dialogue(
      'ponte-a1-caderno',
      'Este é o seu Passo a passo do projeto! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.',
    ),
    {
      key: 'caderno',
      content: {
        kind: 'materials',
        title: 'Passo a passo do projeto: Cadê Todo Mundo?',
        bookPreview: true,
        items: [],
      },
    },
    video('video-a1-toque', 'Um toque pode chamar uma ação'),
    dialogue(
      'ponte-a1-toque',
      'Sua vez! Investigue a ligação entre o toque e a reação no jardim. Você escolhe a ordem dos testes, e o Zappy sugere o que observar.',
    ),
    {
      key: 'experiencia-toque',
      content: {
        kind: 'interactive',
        required: true,
        semPerguntaFinal: true,
        title: 'O toque faz o jogo responder',
        instructions:
          'Compare os toques com a reação ligada e desligada. Escolha qual esconderijo testar e repita quando quiser.',
        hints: [],
        activity: {
          type: 'experimentation',
          scene: 'touch-response',
          cenario: 'jardim',
          setup: { freeExploration: true, goals: ['no-response', 'responds', 'second-target'] },
        },
      },
    },
    video('video-a1-programar', 'Faça o primeiro personagem aparecer'),
    dialogue(
      'ponte-a1-programar',
      'Agora monte a regra do toque no seu jogo! Depois, teste nos esconderijos e clique em Verificar projeto antes de enviar o seu projeto.',
    ),
    studio(montarProjetoCadeTodoMundo()),
  ],
  sections: [
    section(
      'apresentacao',
      'Bem-vindo ao jardim',
      'presentation',
      'Jogar a versão pronta e encontrar os três personagens antes de construir o próprio jogo.',
      ['video-a1-abertura', 'ponte-a1-jogo', 'jogo-pronto'],
      ['video-a1-abertura', 'jogo-pronto'],
    ),
    section(
      'seu-caderno-do-aluno',
      'Seu passo a passo do projeto',
      'material',
      'Conhecer o caderno e saber onde consultá-lo durante a construção do jogo.',
      ['video-a1-caderno', 'ponte-a1-caderno', 'caderno'],
      ['video-a1-caderno'],
    ),
    section(
      'toque-e-resposta',
      'O que um toque faz?',
      'exploration',
      'Comparar o mesmo toque antes e depois de ligar uma ação, sem palpite obrigatório.',
      ['video-a1-toque', 'ponte-a1-toque', 'experiencia-toque'],
      ['video-a1-toque', 'experiencia-toque'],
    ),
    section(
      'primeiro-achado',
      'Faça alguém aparecer',
      'delivery',
      'Encaixar a reação no evento preparado e tocar num esconderijo do próprio jogo.',
      ['video-a1-programar', 'ponte-a1-programar', 'projeto'],
      ['video-a1-programar', 'projeto'],
      'projeto',
      [revelaEscolhido, outrosEsconderijos],
    ),
  ],
}

const aula2 = {
  version: 5,
  courseSlug: CURSO,
  lessonSlug: 'aula-2',
  retireBlockKeys: ['caderno'],
  title: 'Complete a busca',
  blocks: [
    video('video-a2-retomada', 'Quem você já encontrou?'),
    dialogue(
      'ponte-a2-retomada',
      'Seus personagens já aparecem, mas Achados ainda fica em zero. Então vamos ensinar o jogo a contar: clique em Próxima parte para começar.',
    ),
    video('video-a2-variavel', 'Um número que acompanha a busca'),
    dialogue(
      'ponte-a2-variavel',
      'Sua vez! Acompanhe o valor guardado durante a busca. Você escolhe a ordem dos testes, e o Zappy sugere o que observar.',
    ),
    {
      key: 'experiencia-achados',
      content: {
        kind: 'interactive',
        required: true,
        semPerguntaFinal: true,
        title: 'Quantos você já encontrou?',
        instructions: 'Encontre um personagem. Olhe o valor guardado em achados e o placar.',
        hints: [],
        activity: {
          type: 'experimentation',
          scene: 'found-counter',
          cenario: 'jardim',
          setup: {
            freeExploration: true,
            goals: ['first-find', 'second-find', 'no-find', 'repeat', 'back-to-zero'],
          },
        },
      },
    },
    video('video-a2-contagem', 'Cada descoberta conta'),
    dialogue(
      'ponte-a2-contagem',
      'Agora faça o seu jogo contar os achados! Depois, teste os três esconderijos e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
    ),
    studio(montarProjetoCadeTodoMundo(true), true),
    // Personalização antes de publicar (05/10/2026): todos os bichos e esconderijos têm a mesma
    // caixa, então trocar a imagem de um sprite não muda tamanho nem lugar. O campo da imagem
    // mostra o NOME (FieldAssetPicker) e, ao trocar, ajusta largura e altura à imagem nova
    // mantendo o canto de cima (applySuggestedSize): por isso a correção do outro tipo de imagem.
    video('video-a2-personalizar', 'Deixe o jogo com a sua cara'),
    dialogue(
      'ponte-a2-personalizar',
      'A surpresa chegou! Escolha os personagens e prepare os esconderijos da sua brincadeira: troque a imagem clicando no nome dela, no fim de cada bloco Criar sprite. Se quiser, escreva também a sua mensagem do final. Depois encontre todo mundo de novo, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.',
    ),
    video('video-a2-fecho', 'Seu jogo está pronto'),
    dialogue(
      'ponte-a2-publicar',
      'Seu jogo está pronto! Se quiser, publique no Mural, copie o link de jogar e compartilhe com a sua família e os seus amigos. Se precisar, peça ajuda a um adulto. Você pode concluir a aula e continuar a jornada sem publicar.',
    ),
    {
      key: 'ajuda-a2-publicar',
      content: {
        kind: 'rich_text',
        markdown:
          'Quer rever como publicar? Abra [o passo a passo do Como fazer](/como-fazer/plataforma-publicar-no-mural), a área de ajuda.',
      },
    },
  ],
  sections: [
    section(
      'retomada',
      'Volte ao seu jardim',
      'presentation',
      'Ver que o jogo já revela os personagens, mas ainda não conta os achados.',
      ['video-a2-retomada', 'ponte-a2-retomada'],
      ['video-a2-retomada'],
    ),
    section(
      'variavel-achados',
      'Um número que acompanha a busca',
      'exploration',
      'Observar quando o valor atual de Achados muda e quando continua igual durante uma busca.',
      ['video-a2-variavel', 'ponte-a2-variavel', 'experiencia-achados'],
      ['video-a2-variavel', 'experiencia-achados'],
    ),
    section(
      'contar-achados',
      'Cada personagem vale um achado',
      'application',
      'Somar um no contador no mesmo evento do toque e testar até a mensagem de vitória.',
      ['video-a2-contagem', 'ponte-a2-contagem'],
      ['video-a2-contagem'],
      'projeto',
      [
        revelaEscolhido,
        {
          id: 'somar-achado',
          label: 'Cada novo personagem acrescenta 1 a Achados.',
          hint: 'Encontre personagens diferentes: Achados deve passar por 1, 2 e 3. Somar 1 é diferente de colocar 1.',
          rule: {
            type: 'behavior',
            steps: [tocar(1), tocar(2), tocar(3)],
            expect: valor('achados', 3),
            checkpoints: [
              { afterStep: 1, expect: valor('achados', 1) },
              { afterStep: 2, expect: valor('achados', 2) },
            ],
          },
        },
        {
          id: 'nao-recontar',
          label: 'Toques no vazio ou no mesmo lugar mantêm a contagem.',
          hint: 'Depois de achar alguém, teste o mesmo lugar e o vazio. Nenhum desses toques deve executar outra soma.',
          rule: {
            type: 'behavior',
            steps: [
              tocar(1),
              { action: 'clickTarget', target: { kind: 'lastPoint' } },
              { action: 'clickTarget', target: { kind: 'outsideGroup', path: 'esconderijos' } },
            ],
            expect: valor('achados', 1),
            checkpoints: [
              { afterStep: 1, expect: valor('achados', 1) },
              { afterStep: 2, expect: valor('achados', 1) },
            ],
          },
        },
        mensagemTres,
      ],
    ),
    comEnvioEmDia(
      section(
        'personalizar',
        'Deixe o jogo com a sua cara',
        // Único ponto de entrega da Aula 2 (11/10/2026), depois de personalizar. A contagem usa
        // o mesmo workspace antes daqui, com verificação intermediária e salvamento automático.
        // Envio em dia impede avançar com uma versão anterior se editar após enviar nesta parte.
        'delivery',
        'Escolher os bichos, esconderijos e a mensagem do final, testar e enviar o jogo completo.',
        ['video-a2-personalizar', 'ponte-a2-personalizar', 'projeto'],
        ['video-a2-personalizar', 'projeto'],
        'projeto',
      ),
    ),
    section(
      'conclusao',
      'Seu jogo está pronto',
      'closing',
      'Concluir a aula com o projeto enviado; compartilhar no Mural é uma escolha.',
      ['video-a2-fecho', 'ponte-a2-publicar', 'ajuda-a2-publicar'],
      ['video-a2-fecho'],
      'projeto',
    ),
  ],
}

const certificado = {
  version: 5,
  courseSlug: CURSO,
  lessonSlug: 'certificado',
  title: 'Seu certificado',
  blocks: [
    dialogue('fala-revisao-final', cadeTodoMundo.intro),
    { key: 'quiz-revisao-final', content: cadeTodoMundo.content },
    video('video-certificado', 'Comemore sua criação'),
    dialogue(
      'ponte-certificado',
      'Parabéns, você terminou o seu jogo! Agora clique em Baixar meu certificado para guardar essa conquista e, quando ele baixar, clique em Concluir aula.',
    ),
    {
      key: 'certificado',
      content: {
        kind: 'certificate',
        title: 'Certificado de Criador',
        introLine: 'Certificamos que',
        coursePhrase: 'completou o curso Cadê Todo Mundo?',
        bodyText: 'Programou o toque que revela os personagens e a contagem dos achados.',
      },
    },
  ],
  sections: [
    section(
      'revisao-final',
      cadeTodoMundo.title,
      'explanation',
      'Conferir as regras do próprio jogo e corrigir dúvidas antes do certificado.',
      ['fala-revisao-final', 'quiz-revisao-final'],
      ['quiz-revisao-final'],
    ),
    section(
      'certificado',
      'Comemore sua criação',
      'delivery',
      'Assistir à mensagem final e emitir o certificado do curso.',
      ['video-certificado', 'ponte-certificado', 'certificado'],
      ['video-certificado', 'certificado'],
    ),
  ],
}

// O bloco de Estúdio mora fora de blockKeys e entra pela workspaceKey, como nos manifestos v5.
const generatedFiles: string[] = []
for (const [name, manifest] of [
  ['cade-todo-mundo-aula-1', aula1],
  ['cade-todo-mundo-aula-2', aula2],
  ['cade-todo-mundo-certificado', certificado],
] as const) {
  const target = resolve(DIR, `${name}.manifesto.json`)
  gravarArquivo(target, `${JSON.stringify(manifest, null, 2)}\n`)
  const roteiroPath = target.replace('.manifesto.json', '.roteiro.md')
  gravarArquivo(
    roteiroPath,
    sincronizarRecadosNaPagina(readFileSync(roteiroPath, 'utf8'), manifest),
  )
  generatedFiles.push(target)
}

const formatted = Bun.spawnSync({
  cmd: [process.execPath, 'x', 'biome', 'format', '--write', ...generatedFiles],
  cwd: resolve(import.meta.dir, '../../..'),
  stdout: 'pipe',
  stderr: 'pipe',
})
if (formatted.exitCode !== 0) {
  throw new Error(`Biome não conseguiu formatar os manifestos: ${formatted.stderr.toString()}`)
}

await gravarArquivo(
  resolve(DIR, 'zappy-etapas.json'),
  `${JSON.stringify(
    {
      version: 1,
      experiences: {
        'experiencia-toque': discoverySpeechSteps().filter((s) => s.id.startsWith('touch-')),
        'experiencia-achados': discoverySpeechSteps().filter((s) => s.id.startsWith('count-')),
      },
    },
    null,
    2,
  )}\n`,
)
