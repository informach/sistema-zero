/** Gera apenas os três manifestos derivados deste curso. Não altera catálogo nem outros cursos. */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { montarProjetoCadeTodoMundo } from './cade-todo-mundo-projeto'

const DIR = resolve(import.meta.dir, '../aulas')
const CURSO = 'cade-todo-mundo'
const video = (key: string, title: string, direction: string) => ({
  key,
  plannedVideo: `Título: ${title}\n\n${direction}\n\nRoteiro falado completo: ${CURSO}-${key.includes('cert') ? 'certificado' : key.includes('a2') ? 'aula-2' : 'aula-1'}.roteiro.md. Gravar no Estúdio atual, sem Pinta ou Estúdio completo.`,
})
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
const allowed = [
  'sz_frame_start',
  'sz_frame_events',
  'sz_frame_loops',
  'sz_g2d_setup_stage',
  'sz_g2d_create_image_sprite',
  'sz_g2d_create_group',
  'sz_g2d_add_to_group',
  'sz_g2d_on_group_click',
  'sz_g2d_update_each_frame',
  'sz_g2d_clear',
  'sz_g2d_draw_backdrop',
  'sz_g2d_draw_sprite',
  'sz_g2d_draw_group',
  'sz_g2d_draw_score',
  'sz_g2d_draw_label',
  'sz_g2d_set_opacity',
  'sz_js_var_create',
  'sz_js_var_increment',
  'sz_js_if',
  'sz_val_number',
  'sz_val_variable',
]
const studio = (initialProject: ReturnType<typeof montarProjetoCadeTodoMundo>) => ({
  key: 'projeto',
  content: {
    kind: 'studio',
    purpose: 'submission',
    chain: CURSO,
    level: 'iniciante-2d',
    allowedModes: ['blocks'],
    allowLevelReveal: false,
    allowBlocks: allowed,
    initialProject,
  },
})

const aula1 = {
  version: 5,
  courseSlug: CURSO,
  lessonSlug: 'aula-1',
  title: 'O primeiro achado',
  blocks: [
    video(
      'video-a1-abertura',
      'Vamos procurar!',
      'Mostrar brevemente o jogo pronto e contar a missão de hoje: fazer o primeiro personagem aparecer ao tocar num esconderijo. Apresentar as seções como pequenas partes da aula, cada uma com um vídeo. Demonstrar pausa e replay do vídeo e apontar Próxima seção ao encerrar. Não mostrar a experiência, o Estúdio, o caderno ou outros controles nesta abertura. Alvo: 40–60 segundos.',
    ),
    video(
      'video-a1-toque',
      'Um toque pode chamar uma ação',
      'Ao chegar à segunda seção, mostrar Anterior em uma frase para quem quiser rever. Explicar toque e ação com a analogia da campainha e dar contexto do jogo. Mostrar onde está a experiência sem revelar seus resultados. Demonstrar Ampliar experiência e Voltar à aula apenas se necessário para enxergar os controles; em tela estreita, a experiência aparece abaixo. A criança descobre a diferença na atividade. Alvo: 60–75 segundos.',
    ),
    dialogue(
      'ponte-a1-toque',
      'Agora é sua vez de descobrir o que faz o esconderijo responder ao toque.',
    ),
    {
      key: 'experiencia-toque',
      content: {
        kind: 'interactive',
        required: true,
        title: 'O toque faz o jogo responder',
        instructions: 'Toque no esconderijo. Depois ligue a reação ao toque e experimente de novo.',
        hints: [],
        activity: { type: 'experimentation', scene: 'touch-response', cenario: 'jardim' },
      },
    },
    video(
      'video-a1-programar',
      'Faça o primeiro personagem aparecer',
      'Apresentar o Estúdio incorporado ao chegar à prática. Mostrar Expandir e Reduzir no momento em que a criança precisar de espaço, sem tour separado. Depois mostrar a paleta, a área Quando acontecer já preparada, o bloco Deixar o sprite com 0% de visibilidade, o nome escolhido e o teste. Repetir cada passo na narração; não presumir familiaridade com blocos. Ao final, mostrar o mapa do jogo como material opcional para consultar em casa, sem tornar o download requisito. Alvo: 3–4 minutos.',
    ),
    dialogue(
      'ponte-a1-programar',
      'O jardim já está montado. Agora você vai criar a reação que faz aparecer o primeiro personagem.',
    ),
    studio(montarProjetoCadeTodoMundo()),
    {
      key: 'caderno',
      content: { kind: 'materials', title: 'Mapa do jogo Cadê Todo Mundo?', items: [] },
    },
  ],
  sections: [
    section(
      'apresentacao',
      'Bem-vindo ao jardim',
      'presentation',
      'Conhecer o jogo e a missão de hoje, aprender a pausar/rever o vídeo e avançar à próxima seção.',
      ['video-a1-abertura'],
      ['video-a1-abertura'],
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
      ['video-a1-programar', 'ponte-a1-programar', 'projeto', 'caderno'],
      ['video-a1-programar', 'projeto'],
      'projeto',
      [
        {
          id: 'revelar-ao-toque',
          label: 'Revele o personagem tocado deixando o esconderijo escolhido invisível.',
          rule: {
            type: 'usesBlock',
            blockType: 'sz_g2d_set_opacity',
            area: 'events',
            withinBlock: 'sz_g2d_on_group_click',
            fields: { SPRITE: 'escolhido' },
            inputs: { PERCENT: 0 },
          },
        },
      ],
    ),
  ],
}

const aula2 = {
  version: 5,
  courseSlug: CURSO,
  lessonSlug: 'aula-2',
  title: 'Complete a busca',
  blocks: [
    video(
      'video-a2-retomada',
      'Quem você já encontrou?',
      'Reabrir o mesmo projeto e mostrar que um toque já revela um personagem, mas o número Achados ainda fica em zero. Contextualizar a missão de hoje sem ensinar o bloco antes da próxima seção. Alvo: 35–45 segundos.',
    ),
    video(
      'video-a2-contagem',
      'Cada descoberta conta',
      'Explicar contador com a analogia de marcar achados numa folha, mostrar o bloco Somar 1 em variável achados dentro do evento, abaixo da reação, e testar os três esconderijos. A tela de vitória já foi preparada. Alvo: 2–3 minutos.',
    ),
    dialogue(
      'ponte-a2-contagem',
      'Sua reação já revela os personagens. Agora faça o jogo contar cada descoberta.',
    ),
    studio(montarProjetoCadeTodoMundo(true)),
    video(
      'video-a2-fecho',
      'Sua busca está completa',
      'Mostrar o teste final com o contador 1, 2 e 3, a mensagem de vitória e o botão de enviar atividade. Não vender nem pedir compartilhamento. Preparar a ida ao certificado. Alvo: 45–60 segundos.',
    ),
  ],
  sections: [
    section(
      'retomada',
      'Volte ao seu jardim',
      'presentation',
      'Retomar o projeto salvo e perceber que revelar não está contando os achados ainda.',
      ['video-a2-retomada'],
      ['video-a2-retomada'],
    ),
    section(
      'contar-achados',
      'Cada personagem vale um achado',
      'delivery',
      'Somar um no contador no mesmo evento do toque e testar até a mensagem de vitória.',
      ['video-a2-contagem', 'ponte-a2-contagem', 'projeto'],
      ['video-a2-contagem', 'projeto'],
      'projeto',
      [
        {
          id: 'somar-achado',
          label: 'Conte um achado depois de revelar o personagem.',
          rule: {
            type: 'usesBlock',
            blockType: 'sz_js_var_increment',
            area: 'events',
            withinBlock: 'sz_g2d_on_group_click',
            fields: { NAME: 'achados', DELTA: 1 },
          },
        },
      ],
    ),
    section(
      'conclusao',
      'Veja o jogo que você criou',
      'closing',
      'Conferir que os três personagens aparecem, o contador chega a três e a vitória aparece.',
      ['video-a2-fecho'],
      ['video-a2-fecho'],
    ),
  ],
}

const certificado = {
  version: 5,
  courseSlug: CURSO,
  lessonSlug: 'certificado',
  title: 'Seu certificado',
  blocks: [
    video(
      'video-certificado',
      'Você criou seu primeiro jogo!',
      'Celebrar a autoria da criança: toque, reação e contagem. Mostrar como emitir e guardar o certificado. Sem oferta, pitch, chamada para compra ou convite à criança para vender a um responsável. Alvo: 40–55 segundos.',
    ),
    dialogue(
      'ponte-certificado',
      'Você fez o jogo responder aos seus toques. Seu certificado está pronto!',
    ),
    {
      key: 'certificado',
      content: {
        kind: 'certificate',
        introLine: 'Certificamos que',
        coursePhrase: 'concluiu Cadê Todo Mundo?',
        bodyText: 'Criou um jogo de procurar personagens com toque, reação e contagem de achados.',
      },
    },
  ],
  sections: [
    section(
      'certificado',
      'Comemore sua criação',
      'delivery',
      'Assistir à mensagem final e emitir o certificado do primeiro jogo criado.',
      ['video-certificado', 'ponte-certificado', 'certificado'],
      ['video-certificado', 'certificado'],
    ),
  ],
}

// O bloco de Estúdio mora fora de blockKeys e entra pela workspaceKey, como nos manifestos v5.
for (const [name, manifest] of [
  ['cade-todo-mundo-aula-1', aula1],
  ['cade-todo-mundo-aula-2', aula2],
  ['cade-todo-mundo-certificado', certificado],
] as const) {
  writeFileSync(resolve(DIR, `${name}.manifesto.json`), `${JSON.stringify(manifest, null, 2)}\n`)
}
