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
    initialProject: montarProjetoFarol(etapa),
  },
})
const check = (id: string, label: string, rule: Record<string, unknown>) => ({ id, label, rule })

const dia1 = {
  version: 5,
  courseSlug: CURSO,
  lessonSlug: 'dia-1',
  title: 'O personagem ganha movimento',
  blocks: [
    video(
      'video-d1-chegada',
      'Uma luz precisa acender',
      'desafio-dia-1.roteiro.md',
      'Mostrar o jogo concluído, o personagem, a chave, o farol apagado e o barco. Não atribuir à criança a arte já preparada.',
    ),
    video(
      'video-d1-movimento',
      'Como o personagem vai andar?',
      'desafio-dia-1.roteiro.md',
      'Explicar movimento em quatro direções e o cuidado com as bordas usando o mapa pronto, sem mostrar ainda os blocos.',
    ),
    video(
      'video-d1-borda',
      'Faça o personagem andar dentro do mapa',
      'desafio-dia-1.roteiro.md',
      'Mostrar o caminho exato dos três blocos: controles só direções, mover em quatro direções e manter dentro da tela. Testar toque e teclado. Ensinar Salvo e Enviar para o professor no primeiro uso.',
    ),
    fala(
      'ponte-d1-borda',
      'Você já viu para onde o personagem pode ir. Agora faça o jogo ouvir suas direções.',
    ),
    projeto('dia-1'),
  ],
  sections: [
    secao(
      'chegada',
      'A aventura começa no farol',
      'presentation',
      'Conhecer o jogo e distinguir o cenário preparado da primeira regra que a criança construirá.',
      ['video-d1-chegada'],
      ['video-d1-chegada'],
    ),
    secao(
      'movimento',
      'Quatro caminhos para seguir',
      'explanation',
      'Entender as quatro direções do mapa e por que o personagem deve ficar dentro da cena.',
      ['video-d1-movimento'],
      ['video-d1-movimento'],
    ),
    secao(
      'borda',
      'O mapa tem uma borda',
      'delivery',
      'Perceber o problema de sair da cena, manter o personagem dentro dela e enviar a atividade.',
      ['video-d1-borda', 'ponte-d1-borda', 'projeto'],
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
      'Retomar o mesmo jogo. Mostrar que encostar na chave ainda não a recolhe; explicar acontecimento e memória com analogia cotidiana, sem antecipar o teste.',
    ),
    video(
      'video-d2-programar',
      'Faça o jogo guardar a chave',
      'desafio-dia-2.roteiro.md',
      'Guiar, sem pular gesto, Criar variável temChave com falso em Ao iniciar e o evento Quando o sprite personagem começar a encostar no sprite chave; destruir chave e alterar temChave para verdadeiro.',
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
      'Explicar uma condição com exemplo próximo da criança e o objetivo do jogo. Não narrar a sequência de botões ou o resultado da experiência.',
    ),
    fala(
      'ponte-d3-condicao',
      'No vídeo, você ouviu falar de uma condição. Agora veja o que a chave muda na porta do farol.',
    ),
    {
      key: 'experiencia-porta',
      content: {
        kind: 'interactive',
        required: true,
        title: 'A porta precisa da chave',
        instructions: 'Teste a porta com e sem a chave. O que muda?',
        hints: [],
        activity: { type: 'experimentation', scene: 'lighthouse-key', cenario: 'farol' },
      },
    },
    video(
      'video-d3-decisao',
      'Faça a porta decidir',
      'desafio-dia-3.roteiro.md',
      'Guiar o evento de contato personagem/farol, Se temChave, ganhou verdadeiro e trocar imagem do farol. Testar sem chave e com chave; ver barco chegar, salvar e enviar.',
    ),
    fala(
      'ponte-d3-decisao',
      'Você testou duas situações na porta. Agora vai montar a pergunta que o jogo faz.',
    ),
    video(
      'video-d3-fecho',
      'O barco encontrou o caminho',
      'desafio-dia-3.roteiro.md',
      'Celebrar as três regras que a criança montou sem atribuir a ela cenário ou barco preparados. Apontar o certificado.',
    ),
    projeto('dia-3'),
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
      'Você guiou o barco',
      'closing',
      'Reconhecer as regras que construiu e seguir ao certificado.',
      ['video-d3-fecho'],
      ['video-d3-fecho'],
    ),
  ],
}

// Chaves antigas de mídia saem da introdução. O bloco de materiais antigo também sai para que
// um anexo do treino da nave não seja reutilizado por acidente neste novo jogo.
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
  ],
  blocks: [
    video(
      'video-intro-farol',
      'Seu primeiro jogo: A Chave do Farol',
      'desafio-introducao.roteiro.md',
      'Demonstrar o jogo pronto por toque e teclado e a navegação real da aula, conversando com a criança e mostrando cada botão.',
    ),
    video(
      'video-intro-caderno',
      'Um mapa para acompanhar a aventura',
      'desafio-introducao.roteiro.md',
      'Mostrar o caderno opcional e o mapa para responsáveis; conferir nomes dos anexos no admin antes de gravar.',
    ),
    {
      key: 'materiais-farol',
      content: { kind: 'materials', title: 'Caderno e mapa da aventura', items: [] },
    },
    video(
      'video-intro-voltar',
      'Como continuar amanhã',
      'desafio-introducao.roteiro.md',
      'Mostrar o caminho para voltar ao curso e Preciso de ajuda no lugar real. Não ensinar Salvo/Enviar antes de fazer o jogo.',
    ),
  ],
  sections: [
    secao(
      'apresentacao',
      'A Chave do Farol',
      'presentation',
      'Conhecer o jogo, o vídeo, as seções e como abrir uma atividade ou o Estúdio dentro da aula.',
      ['video-intro-farol'],
      ['video-intro-farol'],
    ),
    secao(
      'caderno',
      'Seu mapa da aventura',
      'material',
      'Encontrar os materiais opcionais e saber qual é para a criança e qual é para a família.',
      ['video-intro-caderno', 'materiais-farol'],
      ['video-intro-caderno'],
    ),
    secao(
      'voltar',
      'Como voltar e pedir ajuda',
      'explanation',
      'Saber retornar ao curso e pedir ajuda sem se perder na plataforma.',
      ['video-intro-voltar'],
      ['video-intro-voltar'],
    ),
  ],
}

const certificado = {
  version: 5,
  courseSlug: CURSO,
  lessonSlug: 'certificado',
  title: 'Seu certificado e próximos passos',
  retireBlockKeys: ['video-pitch'],
  blocks: [
    fala(
      'fala-certificado',
      'Você guiou o personagem, encontrou a chave e acendeu o farol. Toque em Pegar meu certificado e guarde o arquivo com um responsável.',
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
    fala(
      'fala-pitch',
      'Esta próxima parte é para quem cuida de você. Chame um responsável para assistir junto.',
    ),
    video(
      'video-pitch-farol',
      'Para a família: próximos caminhos de criação',
      'desafio-certificado.roteiro.md',
      'Começar pedindo para chamar um responsável. Dirigir a explicação da Comunidade ao adulto. Mostrar a oferta externa sem preço fixo no vídeo; compra nunca é requisito da aula.',
    ),
    {
      key: 'link-comunidade',
      content: {
        kind: 'rich_text',
        markdown:
          '[Conhecer a Comunidade dos Criadores](https://sistemazero.com.br/kids/comunidade-dos-criadores/oferta)',
      },
    },
  ],
  sections: [
    secao(
      'certificado',
      'Seu certificado',
      'delivery',
      'Emitir e guardar o certificado da aventura concluída.',
      ['fala-certificado', 'certificado'],
      ['certificado'],
    ),
    secao(
      'proximos-passos',
      'Uma conversa com a família',
      'closing',
      'Apresentar ao responsável as possibilidades de continuar criando, sem exigir compra.',
      ['fala-pitch', 'video-pitch-farol', 'link-comunidade'],
      ['video-pitch-farol'],
    ),
  ],
}

for (const [name, manifest] of [
  ['desafio-dia-1', dia1],
  ['desafio-dia-2', dia2],
  ['desafio-dia-3', dia3],
  ['desafio-introducao', introducao],
  ['desafio-certificado', certificado],
] as const) {
  writeFileSync(resolve(DIR, `${name}.manifesto.json`), `${JSON.stringify(manifest, null, 2)}\n`)
}
