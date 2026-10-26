/** Regenera os manifestos e o inventário do Desafio do farol. Não importa nem publica aulas. */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FAROL_LAYOUT } from '../../../packages/studio/src/arte/farol-assets'
import {
  chaveRecolhida,
  coleta,
  coletaGuardada,
  farolEscolhido,
  movimento,
  movimentoSemBorda,
  portaCompleta,
  portaSemChave,
} from './desafio-farol-criterios'
import { montarProjetoFarol, montarProjetoFarolDaParte } from './desafio-farol-projeto'
import { gravarArquivo } from './gravar-arquivo'
import { farol } from './quizzes-cursos-curtos'
import { extrairPartesElevenLabs, sincronizarRecadosNaPagina } from './roteiro-elevenlabs'

const DIR = resolve(import.meta.dir, '../../aulas-interativas/desafio-primeiro-jogo')
const CURSO = 'desafio-primeiro-jogo'
const EXEMPLOS = {
  inicio: 'fa000001-0000-4000-8000-000000000001',
  andar: 'fa000002-0000-4000-8000-000000000002',
  borda: 'fa000003-0000-4000-8000-000000000003',
  recolher: 'fa000004-0000-4000-8000-000000000004',
  guardar: 'fa000005-0000-4000-8000-000000000005',
  aviso: 'fa000006-0000-4000-8000-000000000006',
  semChave: 'fa000007-0000-4000-8000-000000000007',
  aceso: 'fa000008-0000-4000-8000-000000000008',
}

const video = (key: string, title: string, script: string) => {
  const parte = extrairPartesElevenLabs(readFileSync(resolve(DIR, script), 'utf8')).find(
    (p) => p.clipe === key,
  )
  if (!parte) throw new Error(`${script}: clipe sem roteiro de produção: ${key}`)
  return {
    key,
    plannedVideo:
      'Título: ' +
      title +
      '\n\nMaster integral da professora. Roteiro: ' +
      script +
      '. Substituições kids: ' +
      JSON.stringify(parte.intervencoes),
  }
}
const fala = (key: string, text: string) => ({
  key,
  content: { kind: 'dialogue', pose: 'speaking', text },
})
const secao = (
  key: string,
  title: string,
  intent: string,
  objective: string,
  blockKeys: string[],
  required: string[],
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
  completion: { version: 1, blockIds: required, ...(projectChecks ? { projectChecks } : {}) },
})
/**
 * Envio em dia (10/10/2026): a parte só fecha quando o último envio é igual ao projeto de agora.
 * Vai na ÚLTIMA parte que muda o jogo antes de publicar (ESPEC-MANIFESTO §6).
 */
const comEnvioEmDia = <S extends { completion: object }>(s: S) => ({
  ...s,
  completion: { ...s.completion, submissionUpToDate: true as const },
})

const studioBlocks = [
  'sz_frame_start',
  'sz_frame_events',
  'sz_frame_loops',
  'sz_g2d_setup_stage',
  'sz_g2d_create_image_sprite',
  'sz_g2d_create_sprite',
  'sz_g2d_clear',
  'sz_g2d_draw_backdrop',
  'sz_g2d_draw_sprite',
  'sz_g2d_draw_label',
  'sz_g2d_update_each_frame',
  'sz_g2d_enable_classic_controls',
  'sz_g2d_top_down',
  'sz_g2d_clamp_to_screen',
  'sz_g2d_on_overlap',
  'sz_g2d_destroy_sprite',
  'sz_g2d_set_image',
  'sz_g2d_sprite_x',
  'sz_g2d_set_velocity',
  'sz_g2d_apply_velocity',
  'sz_js_var_create',
  'sz_js_var_assign',
  'sz_js_if_else',
  'sz_val_bool',
  'sz_val_compare',
  'sz_val_number',
  'sz_val_text',
  'sz_val_variable',
]
const projeto = (etapa: 'dia-1' | 'dia-2' | 'dia-3') => ({
  key: 'projeto',
  content: {
    kind: 'studio',
    purpose: 'submission',
    chain: CURSO,
    level: 'iniciante-2d',
    allowedModes: ['blocks'],
    allowLevelReveal: false,
    allowBlocks: studioBlocks,
    ...(etapa === 'dia-3'
      ? {
          showcase: {
            enabled: true,
            title: 'A Chave do Farol',
            summary: 'Um curso para encontrar a chave e acender o farol para um barco chegar.',
          },
        }
      : {}),
    initialProject: montarProjetoFarol(etapa),
    projectExamples:
      etapa === 'dia-1'
        ? {
            version: 1,
            examples: {
              [EXEMPLOS.inicio]: montarProjetoFarol('dia-1'),
              [EXEMPLOS.andar]: montarProjetoFarolDaParte('andar'),
              [EXEMPLOS.borda]: montarProjetoFarolDaParte('borda'),
            },
            sections: {
              andar: { entryExampleId: EXEMPLOS.inicio, solutionExampleId: EXEMPLOS.andar },
              borda: { entryExampleId: EXEMPLOS.andar, solutionExampleId: EXEMPLOS.borda },
            },
          }
        : etapa === 'dia-2'
          ? {
              version: 1,
              examples: {
                [EXEMPLOS.borda]: montarProjetoFarolDaParte('borda'),
                [EXEMPLOS.recolher]: montarProjetoFarolDaParte('recolher'),
                [EXEMPLOS.guardar]: montarProjetoFarolDaParte('guardar'),
                [EXEMPLOS.aviso]: montarProjetoFarolDaParte('programar-chave'),
              },
              sections: {
                recolher: { entryExampleId: EXEMPLOS.borda, solutionExampleId: EXEMPLOS.recolher },
                guardar: { entryExampleId: EXEMPLOS.recolher, solutionExampleId: EXEMPLOS.guardar },
                'programar-chave': {
                  entryExampleId: EXEMPLOS.guardar,
                  solutionExampleId: EXEMPLOS.aviso,
                },
              },
            }
          : {
              version: 1,
              examples: {
                [EXEMPLOS.aviso]: montarProjetoFarolDaParte('programar-chave'),
                [EXEMPLOS.semChave]: montarProjetoFarolDaParte('sem-chave'),
                [EXEMPLOS.aceso]: montarProjetoFarolDaParte('decisao'),
              },
              sections: {
                'sem-chave': {
                  entryExampleId: EXEMPLOS.aviso,
                  solutionExampleId: EXEMPLOS.semChave,
                },
                decisao: { entryExampleId: EXEMPLOS.semChave, solutionExampleId: EXEMPLOS.aceso },
                personalizar: { entryExampleId: EXEMPLOS.aceso, solutionExampleId: EXEMPLOS.aceso },
              },
            },
  },
})
// O Dia 1 começa pela versão pronta e pelo caderno, como a Aula 1 do Cadê Todo Mundo?.
// Até 05/10/2026 essas duas seções formavam a aula separada `boas-vindas`; toda aula agora
// termina numa construção. A aula antiga sai do curso no Admin, sem apagar progresso.
const aberturaBlocks = [
  video('video-intro-farol', 'Seu primeiro jogo: A Chave do Farol', 'desafio-dia-1.roteiro.md'),
  fala(
    'ponte-intro-farol',
    'Sua vez! Jogue a versão pronta: pegue a chave e leve o personagem até o farol. Depois, clique em Próxima parte.',
  ),
  {
    key: 'jogo-pronto',
    content: {
      kind: 'interactive',
      required: true,
      title: 'Jogue A Chave do Farol',
      instructions:
        'Segure as setas da tela ou, no computador, clique no jogo e use as setas do teclado. Pegue a chave e leve o personagem até o farol. Você pode seguir mesmo sem terminar a partida.',
      hints: [],
      activity: {
        type: 'project-play',
        project: montarProjetoFarol('concluido'),
        stage: { width: FAROL_LAYOUT.palco.w, height: FAROL_LAYOUT.palco.h },
        completion: 'participation',
        targets: [],
      },
    },
  },
  video('video-intro-caderno', 'Seu passo a passo do projeto', 'desafio-dia-1.roteiro.md'),
  fala(
    'ponte-intro-caderno',
    'Este é o seu Passo a passo do projeto! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.',
  ),
  // UM bloco de materiais por fase (07/10/2026, decisão da dona): o Passo a passo do projeto e, logo
  // abaixo, a ajuda do Como Fazer, sob o selo "Consulte". O PDF do Mapa é anexado no Admin e a
  // importação o mantém à frente dos itens do manifesto. Consultar a ajuda é opcional: o jogo e a
  // tarefa vêm antes dos tutoriais de interface.
  {
    key: 'materiais-farol',
    content: {
      kind: 'materials',
      title: 'Passo a passo do projeto: A Chave do Farol',
      bookPreview: true,
      items: [
        {
          id: 'texto-ajuda',
          kind: 'text',
          markdown:
            'Precisa de ajuda com a plataforma? Abra um destes passo a passo do Como fazer.',
        },
        // Rótulo = título EXATO do tutorial em docs/como-fazer/como-fazer.json (full review 06/10/2026).
        ...linksComoFazer([
          ['plataforma-baixar-materiais', 'Como abrir o Passo a passo do projeto e os materiais'],
          ['plataforma-abrir-uma-aula', 'Como abrir uma aula e trocar de parte'],
          ['plataforma-ampliar-a-atividade', 'Como dar mais espaço ao jogo e à experiência'],
          ['plataforma-mostrar-o-menu', 'Como mostrar o menu e a lista de fases'],
          ['plataforma-voltar-para-a-aula', 'Como continuar uma aula'],
          ['plataforma-pedir-ajuda', 'Como pedir ajuda à equipe'],
        ]),
      ],
    },
  },
]
const aberturaSections = [
  secao(
    'apresentacao',
    'A Chave do Farol',
    'presentation',
    'Experimentar o curso pronta antes de construir suas regras, sem exigir vitória.',
    ['video-intro-farol', 'ponte-intro-farol', 'jogo-pronto'],
    ['video-intro-farol', 'jogo-pronto'],
  ),
  secao(
    'caderno',
    'Seu passo a passo do projeto',
    'material',
    'Conhecer o caderno opcional que acompanha o conteúdo das aulas e a ajuda disponível.',
    ['video-intro-caderno', 'ponte-intro-caderno', 'materiais-farol'],
    ['video-intro-caderno'],
  ),
]

/**
 * Uma experiência da cena `lighthouse-walk`, configurada pelas metas do caso. A mesma cena mostra
 * os dois conceitos do Dia 1: andar a cada quadro e o limite da tela.
 */
const experienciaAndar = (
  key: string,
  title: string,
  instructions: string,
  goals: string[],
  // As descobertas da cena dizem "o sprite" (a palavra dos blocos); antes da parte 4, que explica
  // a palavra, a experiência do quadro troca o rótulo por "personagem" (revisão de 13/10/2026).
  goalCopy?: Record<string, { label: string }>,
) => ({
  key,
  content: {
    kind: 'interactive',
    required: true,
    title,
    semPerguntaFinal: true,
    instructions,
    hints: [],
    activity: {
      type: 'experimentation',
      scene: 'lighthouse-walk',
      cenario: 'farol',
      setup: { goals, ...(goalCopy ? { goalCopy } : {}) },
    },
  },
})

// Uma ideia por seção (05/10/2026): cada conceito ganha uma experiência e, logo depois, a montagem
// que o aplica. As etapas intermediárias verificam sem envio; o envio do dia fica em `borda`.
const dia1 = {
  version: 5,
  courseSlug: CURSO,
  lessonSlug: 'dia-1',
  title: 'O personagem ganha movimento',
  retireBlockKeys: [
    'video-d1-chegada',
    'video-d1-movimento',
    'video-d1-tanto',
    'ponte-d1-tanto',
    'experiencia-velocidade',
    'video-d1-velocidade',
    'ponte-d1-velocidade',
    // 07/10/2026: a ajuda do Como Fazer entrou no bloco do Mapa (um bloco de materiais por fase).
    'ajuda-como-fazer-intro',
    'ajuda-d1',
  ],
  blocks: [
    ...aberturaBlocks,
    video('video-d1-quadro', 'Como o personagem anda', 'desafio-dia-1.roteiro.md'),
    fala(
      'ponte-d1-quadro',
      'Sua vez! Teste sem a seta e com a seta e repare no que acontece com o x. Quando terminar, clique em Próxima parte.',
    ),
    experienciaAndar(
      'experiencia-quadro',
      'Como o personagem anda',
      'Deixe Segurar a seta para a direita desligado e clique em Avançar 1 quadro. Olhe o x. Depois ligue Segurar a seta para a direita e clique em Avançar 1 quadro algumas vezes. Por último, clique em Rodar.',
      ['still-without-arrow', 'moves-each-frame'],
      {
        'still-without-arrow': { label: 'Sem a seta, o personagem ficou parado' },
        'moves-each-frame': { label: 'Com a seta, o personagem andou a cada quadro' },
      },
    ),
    video('video-d1-andar', 'Faça o personagem andar', 'desafio-dia-1.roteiro.md'),
    fala(
      'ponte-d1-andar',
      'Hora de fazer o seu personagem andar! Faça as setas aparecerem e coloque o movimento dentro de A cada quadro do jogo. Depois teste e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
    ),
    video('video-d1-limite', 'Até onde ele pode ir?', 'desafio-dia-1.roteiro.md'),
    fala(
      'ponte-d1-limite',
      'Sua vez! Teste sem o limite e com ele e repare no que acontece na borda. Quando terminar, clique em Próxima parte.',
    ),
    experienciaAndar(
      'experiencia-limite',
      'Até onde ele pode ir?',
      'Deixe Manter dentro da tela desligado, ligue Segurar a seta para a direita e clique em Rodar. Veja o que acontece na borda. Depois clique em Recomeçar, ligue Manter dentro da tela e clique em Rodar de novo.',
      ['left-the-screen', 'stayed-inside'],
    ),
    video('video-d1-borda', 'Mantenha o personagem na tela', 'desafio-dia-1.roteiro.md'),
    fala(
      'ponte-d1-borda',
      'Agora mantenha o personagem na tela! Coloque o limite logo abaixo do movimento, teste as quatro beiradas e clique em Verificar projeto. Depois clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.',
    ),
    projeto('dia-1'),
  ],
  sections: [
    ...aberturaSections,
    secao(
      'quadro',
      'Como o personagem anda',
      'exploration',
      'Ver que o jogo repete a cada quadro e que, com a seta, o personagem anda um pouco em cada repetição.',
      ['video-d1-quadro', 'ponte-d1-quadro', 'experiencia-quadro'],
      ['video-d1-quadro', 'experiencia-quadro'],
    ),
    secao(
      'andar',
      'Faça o personagem andar',
      'application',
      'Ativar as quatro setas e mover o personagem dentro de A cada quadro do jogo.',
      ['video-d1-andar', 'ponte-d1-andar'],
      ['video-d1-andar'],
      'projeto',
      movimentoSemBorda,
    ),
    secao(
      'limite',
      'Até onde ele pode ir?',
      'exploration',
      'Ver o personagem sair da tela sem limite e ficar inteiro com o limite ligado.',
      ['video-d1-limite', 'ponte-d1-limite', 'experiencia-limite'],
      ['video-d1-limite', 'experiencia-limite'],
    ),
    secao(
      'borda',
      'Mantenha o personagem na tela',
      'delivery',
      'Manter o personagem dentro da tela, depois do movimento, e enviar a atividade.',
      ['video-d1-borda', 'ponte-d1-borda', 'projeto'],
      ['video-d1-borda', 'projeto'],
      'projeto',
      movimento,
    ),
  ],
}

const dia2 = {
  version: 5,
  courseSlug: CURSO,
  lessonSlug: 'dia-2',
  title: 'A chave muda o curso',
  retireBlockKeys: ['video-d2-teste'],
  blocks: [
    video('video-d2-contexto', 'O jogo guardou a chave?', 'desafio-dia-2.roteiro.md'),
    fala(
      'ponte-d2-contexto',
      'Sua vez! Faça os testes e fique de olho em temChave: compare o que some da tela com o que fica guardado. Quando terminar, clique em Próxima parte.',
    ),
    {
      key: 'experiencia-memoria',
      content: {
        kind: 'interactive',
        required: true,
        title: 'O jogo guardou a chave?',
        semPerguntaFinal: true,
        instructions:
          'Deixe Guardar a coleta desligado e clique em Encostar na chave. Olhe a chave, o aviso e temChave. Clique em Recomeçar a partida, ligue Guardar a coleta e clique em Encostar na chave de novo. Depois clique em Afastar e, por último, em Recomeçar a partida. Acompanhe temChave em cada teste.',
        hints: [],
        activity: { type: 'experimentation', scene: 'collect-and-remember', cenario: 'farol' },
      },
    },
    video('video-d2-recolher', 'Recolha a chave', 'desafio-dia-2.roteiro.md'),
    fala(
      'ponte-d2-recolher',
      'Agora faça o seu personagem pegar a chave! Programe o encontro e faça a chave sair do chão. Depois teste e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
    ),
    video('video-d2-guardar', 'Guarde que a chave foi encontrada', 'desafio-dia-2.roteiro.md'),
    fala(
      'ponte-d2-guardar',
      'Agora ensine o seu jogo a lembrar da chave! Crie temChave começando em falso e mude para verdadeiro no encontro com a chave. Depois clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
    ),
    video('video-d2-programar', 'Avise quem está jogando', 'desafio-dia-2.roteiro.md'),
    fala(
      'ponte-d2-programar',
      'Agora avise quem está jogando! Mostre uma mensagem quando a chave for encontrada. Teste a coleta e clique em Verificar projeto. Depois clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula.',
    ),
    projeto('dia-2'),
  ],
  sections: [
    secao(
      'contexto',
      'O jogo guardou a chave?',
      'exploration',
      'Distinguir retirada, aviso e memória; observar a informação ao afastar e ao recomeçar.',
      ['video-d2-contexto', 'ponte-d2-contexto', 'experiencia-memoria'],
      ['video-d2-contexto', 'experiencia-memoria'],
    ),
    secao(
      'recolher',
      'Recolha a chave',
      'application',
      'Programar o encontro entre personagem e chave e tirar a chave da partida.',
      ['video-d2-recolher', 'ponte-d2-recolher'],
      ['video-d2-recolher'],
      'projeto',
      chaveRecolhida,
    ),
    secao(
      'guardar',
      'Guarde que a chave foi encontrada',
      'application',
      'Criar temChave em falso e guardar verdadeiro no encontro com a chave.',
      ['video-d2-guardar', 'ponte-d2-guardar'],
      ['video-d2-guardar'],
      'projeto',
      coletaGuardada,
    ),
    secao(
      'programar-chave',
      'Avise quem está jogando',
      'delivery',
      'Mostrar o aviso da coleta, testar a coleta inteira e enviar a atividade.',
      ['video-d2-programar', 'ponte-d2-programar', 'projeto'],
      ['video-d2-programar', 'projeto'],
      'projeto',
      coleta,
    ),
  ],
}

const dia3 = {
  version: 5,
  courseSlug: CURSO,
  lessonSlug: 'dia-3',
  title: 'A luz do farol',
  blocks: [
    video('video-d3-condicao', 'Quando a porta pode abrir?', 'desafio-dia-3.roteiro.md'),
    fala(
      'ponte-d3-condicao',
      'Sua vez! Teste a mesma porta sem a chave e com a chave e repare em qual resposta a porta escolhe. Quando terminar, clique em Próxima parte.',
    ),
    {
      key: 'experiencia-porta',
      content: {
        kind: 'interactive',
        required: true,
        title: 'A porta precisa da chave',
        semPerguntaFinal: true,
        instructions:
          'Sem levar a chave, clique em Testar a porta. Depois clique em Levar a chave e em Testar a porta de novo. Compare temChave e a resposta escolhida nas duas vezes.',
        hints: [],
        activity: {
          type: 'experimentation',
          scene: 'lighthouse-key',
          cenario: 'farol',
        },
      },
    },
    video('video-d3-sem-chave', 'Avise quando faltar a chave', 'desafio-dia-3.roteiro.md'),
    fala(
      'ponte-d3-sem-chave',
      'Agora ensine o farol a avisar quando falta a chave! Monte o encontro com o farol, o Se e o aviso no senão. Depois vá até a porta do farol sem pegar a chave e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
    ),
    video('video-d3-decisao', 'Acenda o farol com a chave', 'desafio-dia-3.roteiro.md'),
    fala(
      'ponte-d3-decisao',
      'Agora acenda o farol! Complete o espaço do então e teste sem a chave, com a chave e numa nova partida. Depois clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
    ),
    video('video-d3-personalizar', 'Deixe o jogo com a sua cara', 'desafio-dia-3.roteiro.md'),
    fala(
      'ponte-d3-personalizar',
      'A surpresa chegou! Que combinação você vai criar? Troque o que quiser: personagem, barco, chave, farol ou cenário. Se trocar o farol, use o mesmo modelo apagado e aceso. Teste a combinação e clique em Verificar projeto. Quando aparecer Objetivo cumprido!, clique em Próxima parte.',
    ),
    video('video-d3-farol-mensagens', 'Escreva seus avisos', 'desafio-dia-3.roteiro.md'),
    fala(
      'ponte-d3-farol-mensagens',
      'Agora escreva os avisos do seu jeito! Mude o texto dos quatro avisos, teste o jogo e clique em Próxima parte.',
    ),
    video('video-d3-posicao', 'Como escolher um lugar para a chave', 'desafio-dia-3.roteiro.md'),
    fala(
      'ponte-d3-posicao',
      'Sua vez! Mude um número de cada vez e repare para onde a chave vai. Quando terminar, clique em Próxima parte.',
    ),
    {
      key: 'experiencia-posicao',
      content: {
        kind: 'interactive',
        required: true,
        title: 'Como escolher um lugar para a chave',
        semPerguntaFinal: true,
        instructions:
          'Clique no número de Posição horizontal x, apague o 211, escreva 160 e clique fora do campo. Observe para onde a chave foi. Depois, sem mexer no x, faça o mesmo em Posição vertical y: troque 53 por 250 e clique fora do campo. Compare as duas mudanças. Se quiser repetir, clique em Recomeçar.',
        hints: [],
        activity: {
          type: 'experimentation',
          scene: 'lighthouse-position',
          cenario: 'farol',
          setup: { goals: ['mover-horizontal', 'mover-vertical'] },
        },
      },
    },
    video('video-d3-posicionar-chave', 'Escolha onde fica a chave', 'desafio-dia-3.roteiro.md'),
    fala(
      'ponte-d3-posicionar-chave',
      'Agora escolha onde fica a chave! Mude o x e o y no bloco Criar sprite chave, como x 160 e y 250 para a parte de baixo. Teste o caminho até a chave e até a porta do farol. Depois clique em Enviar meu projeto e confirme em Enviar. Se mudar alguma coisa depois de enviar, clique em Enviar de novo e confirme em Reenviar. Quando aparecer Projeto enviado!, clique em Próxima parte.',
    ),
    video('video-d3-fecho', 'Seu jogo está pronto', 'desafio-dia-3.roteiro.md'),
    fala(
      'ponte-d3-publicar',
      'Seu jogo está pronto! Se quiser, publique no Mural, copie o link de jogar e compartilhe com a sua família e os seus amigos. Se precisar, peça ajuda a um adulto. Você pode concluir a aula e continuar a jornada sem publicar.',
    ),
    projeto('dia-3'),
    ajudaComoFazer('ajuda-publicar', 'Para consultar ao publicar', [
      ['plataforma-publicar-no-mural', 'Como publicar seu jogo no Mural'],
    ]),
  ],
  sections: [
    secao(
      'condicao',
      'O que a porta precisa?',
      'exploration',
      'Experimentar a mesma porta sem e com chave antes de programar a condição.',
      ['video-d3-condicao', 'ponte-d3-condicao', 'experiencia-porta'],
      ['video-d3-condicao', 'experiencia-porta'],
    ),
    secao(
      'sem-chave',
      'Avise quando faltar a chave',
      'application',
      'Programar o encontro com o farol e a resposta sem chave, mantendo então vazio por enquanto.',
      ['video-d3-sem-chave', 'ponte-d3-sem-chave'],
      ['video-d3-sem-chave'],
      'projeto',
      portaSemChave,
    ),
    secao(
      'decisao',
      'Acenda o farol com a chave',
      'application',
      'Completar então, testar os dois caminhos e o reinício e verificar as regras antes de personalizar.',
      ['video-d3-decisao', 'ponte-d3-decisao'],
      ['video-d3-decisao'],
      'projeto',
      portaCompleta,
    ),
    secao(
      'personalizar',
      'Deixe o jogo com a sua cara',
      // Personalização antes do envio e da publicação, no mesmo projeto. Uma ideia só
      // (decisão da dona, 06/10/2026): trocar imagens pelas do mesmo tipo, o farol em par. A
      // verificação confere só que o farol continua acendendo, com qualquer modelo.
      'application',
      'Escolher personagem, barco, chave, o par do farol e cenário com imagens do mesmo tipo e testar.',
      ['video-d3-personalizar', 'ponte-d3-personalizar'],
      ['video-d3-personalizar'],
      'projeto',
      farolEscolhido,
    ),
    secao(
      // A chave fica a mesma desde 06/10/2026: a parte só perdeu o farol, que foi para
      // `personalizar`, e manter a chave preserva o id da parte e dos blocos no Admin.
      'farol-mensagens',
      'Escreva seus avisos',
      // Avisos livres no projeto já verificado: fechamento sem novo critério de texto.
      'closing',
      'Escrever os quatro avisos do jogo com as próprias palavras e testar.',
      ['video-d3-farol-mensagens', 'ponte-d3-farol-mensagens'],
      ['video-d3-farol-mensagens'],
      'projeto',
    ),
    secao(
      'posicao',
      'Como escolher um lugar para a chave',
      'exploration',
      'Experimentar a posição horizontal e vertical antes de escolher onde a chave fica no jogo.',
      ['video-d3-posicao', 'ponte-d3-posicao', 'experiencia-posicao'],
      ['video-d3-posicao', 'experiencia-posicao'],
    ),
    // Envio único (11/10/2026): só depois das imagens, avisos e posição da chave. O envio em dia
    // impede avançar com uma versão antiga se a criança editar novamente após enviar aqui.
    comEnvioEmDia(
      secao(
        'posicionar-chave',
        'Escolha onde fica a chave',
        'delivery',
        'Escolher uma posição visível e alcançável para a chave, testar o percurso completo e enviar o jogo.',
        ['video-d3-posicionar-chave', 'ponte-d3-posicionar-chave', 'projeto'],
        ['video-d3-posicionar-chave', 'projeto'],
        'projeto',
      ),
    ),
    secao(
      'fecho',
      'Seu jogo está pronto',
      'closing',
      'Concluir a aula com o projeto enviado; compartilhar no Mural é uma escolha.',
      ['video-d3-fecho', 'ponte-d3-publicar', 'ajuda-publicar'],
      ['video-d3-fecho'],
      'projeto',
    ),
  ],
}

/** Links do Como Fazer: abrem na mesma aba, com retorno à aula preservado pelo member-shell. */
function linksComoFazer(links: Array<[slug: string, label: string]>) {
  return links.map(([slug, label]) => ({
    id: `link-${slug}`,
    kind: 'link' as const,
    url: `/como-fazer/${slug}`,
    label,
  }))
}

/** Ajuda opcional numa fase sem Mapa: o único bloco de materiais dela. */
function ajudaComoFazer(key: string, title: string, links: Array<[slug: string, label: string]>) {
  return {
    key,
    content: { kind: 'materials' as const, title, items: linksComoFazer(links) },
  }
}

const certificado = {
  version: 5,
  courseSlug: CURSO,
  lessonSlug: 'certificado',
  title: 'Seu certificado',
  retireBlockKeys: ['video-pitch', 'fala-pitch', 'video-pitch-farol', 'link-comunidade'],
  blocks: [
    fala('fala-revisao-final', farol.intro),
    { key: 'quiz-revisao-final', content: farol.content },
    video('video-certificado-farol', 'Comemore sua criação', 'desafio-certificado.roteiro.md'),
    fala(
      'fala-certificado',
      'Parabéns! Você programou o personagem que anda, a coleta da chave e o farol que confere se você tem a chave. Agora clique em Baixar meu certificado para guardar essa conquista e, quando ele baixar, clique em Concluir aula.',
    ),
    {
      key: 'certificado',
      content: {
        kind: 'certificate',
        title: 'Certificado de Criador',
        introLine: 'Certificamos que',
        coursePhrase: 'completou o Desafio do Primeiro Jogo',
        bodyText:
          'Criou A Chave do Farol: o personagem que anda, a coleta da chave e o farol que acende com a chave.',
      },
    },
  ],
  sections: [
    secao(
      'revisao-final',
      farol.title,
      'explanation',
      'Conferir as regras do próprio jogo e corrigir dúvidas antes do certificado.',
      ['fala-revisao-final', 'quiz-revisao-final'],
      ['quiz-revisao-final'],
    ),
    secao(
      'certificado',
      'Comemore sua criação',
      'delivery',
      'Emitir e guardar o certificado do curso concluída.',
      ['video-certificado-farol', 'fala-certificado', 'certificado'],
      ['video-certificado-farol', 'certificado'],
    ),
  ],
}

const generatedFiles: string[] = []
for (const [name, manifest] of [
  ['desafio-dia-1', dia1],
  ['desafio-dia-2', dia2],
  ['desafio-dia-3', dia3],
  ['desafio-certificado', certificado],
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

// O inventário atual não pode continuar descrevendo o antigo jogo de nave.
const inventory = resolve(DIR, 'blocos.json')
gravarArquivo(inventory, `${JSON.stringify({ blocks: [...studioBlocks].sort() }, null, 2)}\n`)
generatedFiles.push(inventory)

const formatted = Bun.spawnSync({
  cmd: [process.execPath, 'x', 'biome', 'format', '--write', ...generatedFiles],
  cwd: resolve(import.meta.dir, '../../..'),
  stdout: 'pipe',
  stderr: 'pipe',
})
if (formatted.exitCode !== 0) {
  throw new Error(`Biome não conseguiu formatar os manifestos: ${formatted.stderr.toString()}`)
}
