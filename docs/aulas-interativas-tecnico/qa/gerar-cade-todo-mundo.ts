/** Gera apenas os três manifestos derivados deste curso. Não altera catálogo nem outros cursos. */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type {
  ProjectBlockPattern,
  SectionStructureRule,
} from '../../../packages/core/src/learning/section-progression'
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
/** A reação precisa pertencer ao evento do grupo ensinado, com seu membro escolhido. */
const noToqueDosEsconderijos = (body: ProjectBlockPattern): SectionStructureRule => ({
  type: 'usesBlock',
  blockType: 'sz_g2d_on_group_click',
  area: 'events',
  fields: { GROUP: 'esconderijos', ITEM: 'escolhido' },
  inputBlocks: { BODY: body },
})
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
      'Sua vez! Faça os dois testes no mesmo arbusto e repare no que muda. Quando terminar, clique em Próxima parte.',
    ),
    {
      key: 'experiencia-toque',
      content: {
        kind: 'interactive',
        required: true,
        semPerguntaFinal: true,
        title: 'O toque faz o jogo responder',
        instructions:
          'Toque no arbusto. Depois clique em Ligar a reação ao toque e toque no arbusto de novo. Compare as duas vezes.',
        hints: [],
        activity: { type: 'experimentation', scene: 'touch-response', cenario: 'jardim' },
      },
    },
    video('video-a1-programar', 'Faça o primeiro personagem aparecer'),
    dialogue(
      'ponte-a1-programar',
      'Agora monte a regra do toque no seu jogo! Depois, teste nos esconderijos e clique em Verificar esta parte antes de enviar o seu projeto.',
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
      [
        {
          id: 'revelar-ao-toque',
          label: 'Revele o personagem tocado deixando o esconderijo escolhido invisível.',
          rule: noToqueDosEsconderijos({
            blockType: 'sz_g2d_set_opacity',
            fields: { SPRITE: 'escolhido' },
            inputs: { PERCENT: 0 },
          }),
        },
      ],
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
      'Sua vez! Procure no jardim e fique de olho no número Achados. Quando terminar, clique em Próxima parte.',
    ),
    {
      key: 'experiencia-achados',
      content: {
        kind: 'interactive',
        required: true,
        semPerguntaFinal: true,
        title: 'Quantos você já encontrou?',
        instructions:
          'Toque em um esconderijo e olhe Achados. Toque em outro. Depois toque num espaço vazio do jardim. Por último, clique em Recomeçar a busca.',
        hints: [],
        activity: { type: 'experimentation', scene: 'found-counter', cenario: 'jardim' },
      },
    },
    video('video-a2-contagem', 'Cada descoberta conta'),
    dialogue(
      'ponte-a2-contagem',
      'Agora faça o seu jogo contar os achados! Depois, teste os três esconderijos e clique em Verificar esta parte. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
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
    video('video-a2-fecho', 'Publique seu jogo'),
    dialogue(
      'ponte-a2-publicar',
      'Hora de mostrar o seu jogo! Publique no Mural, copie o link de jogar e mande para a sua família e os seus amigos. Se precisar, peça ajuda a um adulto. Depois clique em Fechar e em Concluir aula.',
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
        // A verificação conserva a regra da Aula 1: sem ela, contaria o mesmo personagem.
        {
          id: 'revelar-ao-toque',
          label: 'Revele o personagem tocado deixando o esconderijo escolhido invisível.',
          rule: noToqueDosEsconderijos({
            blockType: 'sz_g2d_set_opacity',
            fields: { SPRITE: 'escolhido' },
            inputs: { PERCENT: 0 },
          }),
        },
        {
          id: 'somar-achado',
          label: 'Some 1 em achados dentro do evento de clicar ou tocar no esconderijo.',
          rule: noToqueDosEsconderijos({
            blockType: 'sz_js_var_increment',
            fields: { NAME: 'achados', DELTA: 1 },
          }),
        },
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
      'Publique seu jogo',
      'closing',
      'Publicar o jogo com o resumo pronto e a capa gerada; fechar a confirmação e concluir a aula.',
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
