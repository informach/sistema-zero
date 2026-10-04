/** Regenera os manifestos e o inventário do Desafio do farol. Não importa nem publica aulas. */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FAROL_LAYOUT } from '../../../packages/studio/src/arte/farol-assets'
import { coleta, movimento, portaCompleta, portaSemChave } from './desafio-farol-criterios'
import { montarProjetoFarol } from './desafio-farol-projeto'

import { farol } from './quizzes-cursos-curtos'

const DIR = resolve(import.meta.dir, '../aulas')
const CURSO = 'desafio-primeiro-jogo'
const video = (key: string, title: string, script: string, direction: string) => ({
  key,
  plannedVideo: `Título: ${title}\n\n${direction}\n\nRoteiro falado: ${script}. Gravar na plataforma atual; sem Pinta ou Estúdio completo.`,
})
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
            summary: 'Uma aventura para encontrar a chave e acender o farol para um barco chegar.',
          },
        }
      : {}),
    initialProject: montarProjetoFarol(etapa),
  },
})
const dia1 = {
  version: 5,
  courseSlug: CURSO,
  lessonSlug: 'dia-1',
  title: 'O personagem ganha movimento',
  retireBlockKeys: ['video-d1-chegada', 'video-d1-movimento'],
  blocks: [
    video(
      'video-d1-borda',
      'Faça o personagem andar dentro do mapa',
      'desafio-dia-1.roteiro.md',
      'Situar o projeto com cenário pronto e personagem parado. Guiar controles, movimento, comparação de velocidade 3 e 1 com retorno a 3, e borda. Mostrar todos os encaixes. Testar, Verificar esta etapa, conferir Objetivo da etapa cumprido!, Salvo, envio com confirmação e Concluir aula.',
    ),
    fala(
      'ponte-d1-borda',
      'Monte o movimento e compare as velocidades. Depois teste as quatro direções e as bordas. Use Verificar esta etapa antes de enviar o projeto.',
    ),
    projeto('dia-1'),
    ajudaComoFazer('ajuda-d1', 'Se precisar de ajuda', [
      ['plataforma-ampliar-a-atividade', 'Como dar mais espaço para a atividade'],
      ['plataforma-pedir-ajuda', 'Como pedir ajuda ao professor'],
    ]),
  ],
  sections: [
    secao(
      'borda',
      'Faça o personagem andar pelo mapa',
      'delivery',
      'Perceber o problema de sair da cena, manter o personagem dentro dela e enviar a atividade.',
      ['video-d1-borda', 'ponte-d1-borda', 'projeto', 'ajuda-d1'],
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
  title: 'A chave muda a aventura',
  retireBlockKeys: ['video-d2-teste'],
  blocks: [
    video(
      'video-d2-contexto',
      'O jogo guardou a chave?',
      'desafio-dia-2.roteiro.md',
      'Situar a coleta que falta e apresentar a experiência. Explicar variável no mostrador temChave. Orientar coleta sem memória, reinício, Guardar a coleta ligado, novo encontro, afastamento e reinício. Não executar a experiência nem antecipar resultados. Terminar em Próxima seção.',
    ),
    fala(
      'ponte-d2-contexto',
      'Compare o que some da tela com o que fica guardado no jogo. A experiência mostra a informação temChave durante cada tentativa.',
    ),
    {
      key: 'experiencia-memoria',
      content: {
        kind: 'interactive',
        required: true,
        title: 'O jogo guardou a chave?',
        semPerguntaFinal: true,
        instructions:
          'Deixe Guardar a coleta desligado e aperte Encostar na chave. Compare a chave, o aviso e temChave. Recomece a partida, ligue Guardar a coleta e encoste outra vez. Aperte Afastar e olhe o valor. Por último, recomece a partida e confira o que voltou ao começo.',
        hints: [],
        activity: { type: 'experimentation', scene: 'collect-and-remember', cenario: 'farol' },
      },
    },
    video(
      'video-d2-programar',
      'Faça o jogo guardar a chave',
      'desafio-dia-2.roteiro.md',
      'Retomar a memória observada na experiência. Guiar declaração falsa, encontro personagem/chave, retirada, memória verdadeira e aviso. Oferecer mensagem com palavras próprias, sem exigir a mudança. Testar, verificar inclusive o movimento anterior, Salvo, envio confirmado e Concluir aula.',
    ),
    fala(
      'ponte-d2-programar',
      'Programe a coleta: tirar a chave do chão, guardar a informação e mostrar o aviso. Teste seu jogo e use Verificar esta etapa antes de enviar.',
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
      'programar-chave',
      'Guarde que a chave foi encontrada',
      'delivery',
      'Criar a variável e programar o encontro com a chave no jogo real.',
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
    video(
      'video-d3-condicao',
      'Quando a porta pode abrir?',
      'desafio-dia-3.roteiro.md',
      'Explicar condição brevemente. Apontar temChave e as respostas ainda sem destaque. Orientar Testar a porta sem chave, Levar a chave e testar outra vez; comparar valor e ramo. Não executar nem revelar os resultados. Encerrar em Próxima seção.',
    ),
    fala(
      'ponte-d3-condicao',
      'A coleta já guarda uma informação. Veja como a porta usa essa informação para escolher uma resposta.',
    ),
    {
      key: 'experiencia-porta',
      content: {
        kind: 'interactive',
        required: true,
        title: 'A porta precisa da chave',
        semPerguntaFinal: true,
        instructions:
          'Aperte Testar a porta sem a chave. Depois escolha Levar a chave e aperte Testar a porta outra vez. Compare temChave e a resposta que ficou marcada em cada tentativa.',
        hints: [],
        activity: {
          type: 'experimentation',
          scene: 'lighthouse-key',
          cenario: 'farol',
        },
      },
    },
    video(
      'video-d3-sem-chave',
      'Avise quando faltar a chave',
      'desafio-dia-3.roteiro.md',
      'No projeto enviado no Dia 2, guiar evento separado personagem/farol, Se consultando temChave e aviso em senão. Explicitar então ainda vazio. Testar sem chave, Verificar esta etapa, corrigir pendências, esperar Salvo e Próxima seção. Não enviar nesta etapa intermediária.',
    ),
    fala(
      'ponte-d3-sem-chave',
      'Monte a resposta sem chave. Vá ao farol sem recolher a chave e confira o aviso. Verifique esta etapa antes de seguir.',
    ),
    video(
      'video-d3-decisao',
      'Acenda o farol com a chave',
      'desafio-dia-3.roteiro.md',
      'Continuar no mesmo Se e projeto da seção anterior. Completar então com ganhou, imagem e aviso. Testar sem chave, buscar e voltar na mesma partida, depois reiniciar e conferir sem chave. Verificação cumulativa, Salvo, envio único com confirmação e Próxima seção.',
    ),
    fala(
      'ponte-d3-decisao',
      'Complete a resposta com chave. Teste chegar sem ela, buscar e voltar, e começar outra partida. Depois verifique e envie seu jogo.',
    ),
    video(
      'video-d3-fecho',
      'Publique seu jogo',
      'desafio-dia-3.roteiro.md',
      'Usar o mesmo projeto da seção anterior. Compartilhar, manter título e resumo, Gerar capa, conferir, Publicar, esperar Seu jogo está no Mural!, Fechar e Concluir aula. Personalização e cópia do link ficam no Como Fazer.',
    ),
    fala(
      'ponte-d3-publicar',
      'Agora publique no Mural o jogo que você construiu. Espere a confirmação da publicação e feche a janela antes de clicar em Concluir aula.',
    ),
    projeto('dia-3'),
    ajudaComoFazer('ajuda-publicar', 'Para consultar ao publicar', [
      ['plataforma-publicar-no-mural', 'Como publicar seu jogo no Mural e copiar o link'],
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
      'delivery',
      'Completar então, testar os dois caminhos e o reinício e enviar o jogo preservando as regras anteriores.',
      ['video-d3-decisao', 'ponte-d3-decisao', 'projeto'],
      ['video-d3-decisao', 'projeto'],
      'projeto',
      portaCompleta,
    ),
    secao(
      'fecho',
      'Publique seu jogo',
      'closing',
      'Publicar o projeto construído no Mural e concluir a aula.',
      ['video-d3-fecho', 'ponte-d3-publicar', 'ajuda-publicar'],
      ['video-d3-fecho'],
      'projeto',
    ),
  ],
}

// Chaves antigas de mídia saem da introdução. O bloco de materiais antigo também sai para que
// um anexo do treino da nave não seja reutilizado por acidente neste novo jogo.
/** Ajuda opcional na mesma aba, com retorno à aula preservado pelo member-shell. */
function ajudaComoFazer(key: string, title: string, links: Array<[slug: string, label: string]>) {
  return {
    key,
    content: {
      kind: 'materials' as const,
      title,
      items: links.map(([slug, label]) => ({
        id: `link-${slug}`,
        kind: 'link' as const,
        url: `/como-fazer/${slug}`,
        label,
      })),
    },
  }
}

const introducao = {
  version: 5,
  courseSlug: CURSO,
  lessonSlug: 'boas-vindas',
  title: 'A aventura começa aqui',
  retireBlockKeys: [
    'treino',
    'video-abertura',
    'video-achar-a-aula',
    'video-por-dentro-da-aula',
    'fala-caminho',
    'fala-sem-play',
    'video-testar',
    'video-guardar-e-entregar',
    'fala-tres-destinos',
    'video-caderno',
    'materiais',
    'video-ajuda',
    'fala-pedido-bom',
    'fala-responsavel',
    'fala-fecho',
    'video-menu',
    'quiz',
    'video-abertura-v6',
    'video-percurso',
    'video-tela',
    'video-materiais',
    'video-salvar',
    'video-fecho-v6',
    'quiz-v6',
    'video-intro-voltar',
    'ajuda-como-fazer-voltar',
  ],
  blocks: [
    video(
      'video-intro-farol',
      'Seu primeiro jogo: A Chave do Farol',
      'desafio-introducao.roteiro.md',
      'Anunciar o jogo que será programado e o contexto do barco e do farol apagado; então convidar a jogar a versão pronta por toque ou teclado. Mostrar a cena inicial sem resolver o percurso. Não fazer tour de interface. A participação permite avançar; vencer não é requisito.',
    ),
    fala(
      'ponte-intro-farol',
      'Esta é a aventura que você vai programar. Jogue a versão pronta para conhecer o caminho da chave até o farol. Depois de experimentar, clique em Próxima seção.',
    ),
    {
      key: 'jogo-pronto',
      content: {
        kind: 'interactive',
        required: true,
        title: 'Jogue A Chave do Farol',
        instructions:
          'Use as setas da tela ou do teclado para explorar. Tente encontrar a chave e chegar ao farol. Você pode seguir depois de experimentar, mesmo sem terminar o jogo.',
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
    video(
      'video-intro-caderno',
      'Seu Caderno do Aluno',
      'desafio-introducao.roteiro.md',
      'Apresentar o Caderno do Aluno como consulta opcional que acompanha as seções do curso: montagem, testes, publicação e certificado. Não inventar material de mapa nem ensinar o leitor. Download e impressão são opcionais.',
    ),
    fala(
      'ponte-intro-caderno',
      'Consulte este caderno quando precisar lembrar um passo da montagem. Para continuar, clique em Concluir aula.',
    ),
    {
      key: 'materiais-farol',
      content: {
        kind: 'materials',
        title: 'Caderno do Aluno: A Chave do Farol',
        bookPreview: true,
        items: [],
      },
    },
    // Consultar a ajuda é opcional. O jogo e a tarefa vêm antes dos tutoriais de interface.
    ajudaComoFazer('ajuda-como-fazer-intro', 'Como Fazer: ajuda para usar a plataforma', [
      ['plataforma-baixar-materiais', 'Como ler o caderno na tela ou baixar os materiais'],
      ['plataforma-abrir-uma-aula', 'Como abrir uma aula e trocar de seção'],
      ['plataforma-ampliar-a-atividade', 'Como dar mais espaço para a atividade na aula'],
      ['plataforma-mostrar-o-menu', 'Como mostrar o menu dentro da aula ou da ferramenta'],
      ['plataforma-voltar-para-a-aula', 'Como voltar para a aula de onde parei'],
      ['plataforma-pedir-ajuda', 'Como pedir ajuda ao professor'],
    ]),
  ],
  sections: [
    secao(
      'apresentacao',
      'A Chave do Farol',
      'presentation',
      'Experimentar a aventura pronta antes de construir suas regras, sem exigir vitória.',
      ['video-intro-farol', 'ponte-intro-farol', 'jogo-pronto'],
      ['video-intro-farol', 'jogo-pronto'],
    ),
    secao(
      'caderno',
      'Seu Caderno do Aluno',
      'material',
      'Conhecer o caderno opcional que acompanha o conteúdo das aulas e a ajuda disponível.',
      ['video-intro-caderno', 'ponte-intro-caderno', 'materiais-farol', 'ajuda-como-fazer-intro'],
      ['video-intro-caderno'],
    ),
  ],
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
    video(
      'video-certificado-farol',
      'Comemore sua criação',
      'desafio-certificado.roteiro.md',
      'Reconhecer movimento, coleta e decisão programados pela criança. Mostrar Pegar meu certificado e encerrar em Concluir aula. Não incluir pitch comercial.',
    ),
    fala(
      'fala-certificado',
      'Você programou o movimento, a coleta da chave e a decisão do farol. Clique em Pegar meu certificado para guardar essa conquista. Depois, clique em Concluir aula.',
    ),
    {
      key: 'certificado',
      content: {
        kind: 'certificate',
        introLine: 'Certificamos que',
        coursePhrase: 'concluiu o Desafio do Primeiro Jogo',
        bodyText:
          'Criou A Chave do Farol: movimento, coleta da chave e uma decisão que acende a luz.',
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
      'Emitir e guardar o certificado da aventura concluída.',
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
  ['desafio-introducao', introducao],
  ['desafio-certificado', certificado],
] as const) {
  const target = resolve(DIR, `${name}.manifesto.json`)
  writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`)
  generatedFiles.push(target)
}

// O inventário atual não pode continuar descrevendo o antigo jogo de nave.
const inventory = resolve(DIR, '../blocos-desafio-primeiro-jogo.json')
writeFileSync(inventory, `${JSON.stringify({ blocks: [...studioBlocks].sort() }, null, 2)}\n`)
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
