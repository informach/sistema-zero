/** Regenera só os cinco manifestos do Desafio do farol. Não importa nem publica aulas. */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { montarProjetoFarol } from './desafio-farol-projeto'

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
  'sz_frame_structure',
  'sz_frame_appearance',
  'sz_html_canvas',
  'sz_css_rule',
  'sz_css_decl',
  'sz_css_body_background',
  'sz_css_align',
  'sz_css_justify',
  'sz_g2d_setup_stage',
  'sz_g2d_create_image_sprite',
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
  'sz_js_var_create',
  'sz_js_var_assign',
  'sz_js_if_else',
  'sz_js_member_set',
  'sz_math_arithmetic',
  'sz_val_bool',
  'sz_val_compare',
  'sz_val_member_get',
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
const check = (id: string, label: string, rule: Record<string, unknown>) => ({ id, label, rule })

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
      'Situar o projeto com cenário pronto e personagem parado antes da tarefa. Mostrar paleta, encaixe, campos e valores dos três blocos: controles só direções, movimento e borda. Testar, Verificar esta etapa, conferir Objetivo da etapa cumprido!, Salvo, Enviar para o professor e confirmação Enviar. Encerrar em Concluir aula.',
    ),
    fala('ponte-d1-borda', 'Faça o personagem andar nas quatro direções sem sair da tela.'),
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
      [
        check('direcional', 'Mostre somente as quatro direções.', {
          type: 'usesBlock',
          blockType: 'sz_g2d_enable_classic_controls',
          area: 'start',
          fields: { MODE: 'directions' },
        }),
        check('andar', 'Faça o personagem andar antes de conferir a borda.', {
          type: 'usesBlock',
          blockType: 'sz_g2d_top_down',
          area: 'loops',
          fields: { SPRITE: 'personagem' },
          inputs: { SPEED: 3 },
          beforeBlock: 'sz_g2d_clamp_to_screen',
        }),
        check('borda', 'Mantenha o personagem dentro da tela.', {
          type: 'usesBlock',
          blockType: 'sz_g2d_clamp_to_screen',
          area: 'loops',
          fields: { SPRITE: 'personagem' },
        }),
      ],
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
      'A chave precisa fazer diferença',
      'desafio-dia-2.roteiro.md',
      'Retomar o mesmo jogo e mostrar a necessidade da tarefa: encostar ainda não recolhe a chave. Explicar evento e variável pelo próprio jogo, sem analogia obrigatória ou chamada para outra aula.',
    ),
    video(
      'video-d2-programar',
      'Faça o jogo guardar a chave',
      'desafio-dia-2.roteiro.md',
      'Guiar variável temChave falso, encontro personagem/chave, retirada da chave, temChave verdadeiro e aviso. Incluir teste, verificação, Salvo, envio com confirmação e Concluir aula.',
    ),
    fala(
      'ponte-d2-programar',
      'O personagem já anda. Agora você vai fazer o encontro com a chave mudar o jogo.',
    ),
    projeto('dia-2'),
  ],
  sections: [
    secao(
      'contexto',
      'Encostar ainda não é pegar',
      'explanation',
      'Perceber que o encontro com a chave precisa chamar uma ação e que o jogo deve se lembrar dela.',
      ['video-d2-contexto'],
      ['video-d2-contexto'],
    ),
    secao(
      'programar-chave',
      'Guarde que a chave foi encontrada',
      'delivery',
      'Criar a variável e programar o encontro com a chave no jogo real.',
      ['video-d2-programar', 'ponte-d2-programar', 'projeto'],
      ['video-d2-programar', 'projeto'],
      'projeto',
      [
        check('memoria', 'Crie temChave começando em falso.', {
          type: 'usesBlock',
          blockType: 'sz_js_var_create',
          area: 'start',
          fields: { NAME: 'temChave' },
          inputs: { VALUE: false },
        }),
        check('encontro-chave', 'Recolha a chave no encontro certo.', {
          type: 'usesBlock',
          blockType: 'sz_g2d_on_overlap',
          area: 'events',
          fields: { A: 'personagem', B: 'chave' },
          inputBlocks: {
            BODY: {
              blockType: 'sz_g2d_destroy_sprite',
              fields: { SPRITE: 'chave' },
              beforeBlock: 'sz_js_var_assign',
            },
          },
        }),
        check('recolher', 'Retire a chave depois do encontro.', {
          type: 'usesBlock',
          blockType: 'sz_g2d_destroy_sprite',
          area: 'events',
          withinBlock: 'sz_g2d_on_overlap',
          fields: { SPRITE: 'chave' },
        }),
        check('lembrar', 'Guarde que agora tem a chave.', {
          type: 'usesBlock',
          blockType: 'sz_js_var_assign',
          area: 'events',
          withinBlock: 'sz_g2d_on_overlap',
          fields: { NAME: 'temChave' },
          inputs: { VALUE: true },
        }),
      ],
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
      'Explicar condição brevemente. Orientar Testar a porta sem chave, Levar a chave e Testar a porta de novo. Não executar nem revelar os resultados antes de a criança experimentar. Encerrar em Próxima seção.',
    ),
    fala(
      'ponte-d3-condicao',
      'Teste a mesma porta sem a chave e depois com a chave. Observe o que muda.',
    ),
    {
      key: 'experiencia-porta',
      content: {
        kind: 'interactive',
        required: true,
        title: 'A porta precisa da chave',
        semPerguntaFinal: true,
        instructions:
          'Aperte Testar a porta sem a chave. Depois escolha Levar a chave e aperte Testar a porta outra vez. Observe o que mudou.',
        hints: [],
        activity: {
          type: 'experimentation',
          scene: 'lighthouse-key',
          cenario: 'farol',
        },
      },
    },
    video(
      'video-d3-decisao',
      'Faça a porta decidir',
      'desafio-dia-3.roteiro.md',
      'Guiar encontro personagem/farol, Se temChave, ramos então e senão, imagem e avisos. Testar sem e com chave, verificar a etapa e enviar com confirmação antes de Próxima seção. A prévia atualiza automaticamente; Atualizar reinicia os testes.',
    ),
    fala(
      'ponte-d3-decisao',
      'Você testou duas situações na porta. Agora vai montar a pergunta que o jogo faz.',
    ),
    video(
      'video-d3-fecho',
      'Publique seu jogo',
      'desafio-dia-3.roteiro.md',
      'Usar o mesmo projeto da seção anterior. Compartilhar, manter título e resumo, Gerar capa, conferir, Publicar, esperar Seu jogo está no Mural!, Fechar e Concluir aula. Personalização e cópia do link ficam no Como Fazer.',
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
      'decisao',
      'Faça a porta conferir a chave',
      'delivery',
      'Criar o encontro com o farol, conferir temChave, acender a luz e concluir o jogo.',
      ['video-d3-decisao', 'ponte-d3-decisao', 'projeto'],
      ['video-d3-decisao', 'projeto'],
      'projeto',
      [
        check('encontro-farol', 'Reaja ao encontro com o farol.', {
          type: 'usesBlock',
          blockType: 'sz_g2d_on_overlap',
          area: 'events',
          fields: { A: 'personagem', B: 'farol' },
          inputBlocks: {
            BODY: {
              blockType: 'sz_js_if_else',
              inputBlocks: {
                COND: { blockType: 'sz_val_variable', fields: { NAME: 'temChave' } },
                THEN: {
                  blockType: 'sz_js_var_assign',
                  fields: { NAME: 'ganhou' },
                  inputs: { VALUE: true },
                  beforeBlock: 'sz_g2d_set_image',
                },
              },
            },
          },
        }),
        check('condicao', 'Faça o Se consultar temChave no encontro com o farol.', {
          type: 'usesBlock',
          blockType: 'sz_js_if_else',
          area: 'events',
          withinBlock: 'sz_g2d_on_overlap',
          inputBlocks: { COND: { blockType: 'sz_val_variable', fields: { NAME: 'temChave' } } },
        }),
        check('acender', 'Troque a imagem do farol quando a condição for verdadeira.', {
          type: 'usesBlock',
          blockType: 'sz_g2d_set_image',
          area: 'events',
          withinBlock: 'sz_js_if_else',
          fields: { SPRITE: 'farol', IMAGE: 'farol-aceso' },
        }),
        check('vitoria', 'Guarde que o farol acendeu para o barco chegar.', {
          type: 'usesBlock',
          blockType: 'sz_js_var_assign',
          area: 'events',
          withinBlock: 'sz_js_if_else',
          fields: { NAME: 'ganhou' },
          inputs: { VALUE: true },
        }),
      ],
    ),
    secao(
      'fecho',
      'Publique seu jogo',
      'closing',
      'Publicar o projeto construído no Mural e concluir a aula.',
      ['video-d3-fecho', 'ajuda-publicar'],
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
          stage: { width: 640, height: 360 },
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
    ajudaComoFazer('ajuda-como-fazer-intro', 'Para rever depois, no Como fazer', [
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
      ['video-intro-farol', 'jogo-pronto'],
      ['video-intro-farol', 'jogo-pronto'],
    ),
    secao(
      'caderno',
      'Seu Caderno do Aluno',
      'material',
      'Conhecer o caderno opcional que acompanha o conteúdo das aulas e a ajuda disponível.',
      ['video-intro-caderno', 'materiais-farol', 'ajuda-como-fazer-intro'],
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
    video(
      'video-certificado-farol',
      'Comemore sua criação',
      'desafio-certificado.roteiro.md',
      'Reconhecer movimento, coleta e decisão programados pela criança. Mostrar Pegar meu certificado e encerrar em Concluir aula. Não incluir pitch comercial.',
    ),
    fala(
      'fala-certificado',
      'Você programou o movimento, a coleta da chave e a decisão do farol. Pegue seu certificado para guardar essa conquista.',
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

const formatted = Bun.spawnSync({
  cmd: [process.execPath, 'x', 'biome', 'format', '--write', ...generatedFiles],
  cwd: resolve(import.meta.dir, '../../..'),
  stdout: 'pipe',
  stderr: 'pipe',
})
if (formatted.exitCode !== 0) {
  throw new Error(`Biome não conseguiu formatar os manifestos: ${formatted.stderr.toString()}`)
}
