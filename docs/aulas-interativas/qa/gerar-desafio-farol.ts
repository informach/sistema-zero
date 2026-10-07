/** Regenera os manifestos e o inventário do Desafio do farol. Não importa nem publica aulas. */
import { writeFileSync } from 'node:fs'
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
import { montarProjetoFarol } from './desafio-farol-projeto'

import { farol } from './quizzes-cursos-curtos'

const DIR = resolve(import.meta.dir, '../aulas')
const CURSO = 'desafio-primeiro-jogo'
const video = (key: string, title: string, script: string, direction: string) => ({
  key,
  plannedVideo: `Título: ${title}\n\n${direction}\n\nRoteiro falado: ${script}. Gravar na plataforma atual; sem Pinta ou Estúdio completo. Falar como numa conversa contínua com a criança: frases ligadas, o porquê de cada resultado e um chamado para a tela (Olha aqui, Olha só, Repare, Tá vendo?) nos momentos que importam.`,
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
// O Dia 1 começa pela versão pronta e pelo caderno, como a Aula 1 do Cadê Todo Mundo?.
// Até 05/10/2026 essas duas seções formavam a aula separada `boas-vindas`; toda aula agora
// termina numa construção. A aula antiga sai do curso no Admin, sem apagar progresso.
const aberturaBlocks = [
  video(
    'video-intro-farol',
    'Seu primeiro jogo: A Chave do Farol',
    'desafio-dia-1.roteiro.md',
    'Anunciar o jogo que será programado e o contexto do barco e do farol apagado. Demonstração na primeira pessoa com um gesto só (Olha aqui: quando eu seguro a seta da tela para a direita…), sem resolver o percurso. Antes de passar a vez, plantar a surpresa do final, sem dizer o que é (Ah, e guarda este segredo: no fim da aventura tem uma surpresa esperando por você. Ela vai deixar o seu jogo ainda mais seu.); só no fim passar a vez: jogar até o farol acender e o barco chegar. Não fazer tour de interface. A participação permite avançar; vencer não é requisito.',
  ),
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
  video(
    'video-intro-caderno',
    'Seu Mapa da Aventura',
    'desafio-dia-1.roteiro.md',
    'Chamar a atenção para o caderno, que a criança conhece como Mapa da Aventura (Olha aqui: este é o seu Mapa da Aventura!), a consulta que acompanha as seções do curso: montagem, testes, publicação e certificado. Oferecer as duas escolhas como convite: ler aqui mesmo ou clicar em Baixar para guardar o mapa e consultar onde quiser. Não dizer que não precisa baixar ou imprimir: soa como uma ordem para não fazer. Apontar Baixar sem demonstrar o download. Não inventar material de mapa nem ensinar o leitor.',
  ),
  fala(
    'ponte-intro-caderno',
    'Este é o seu Mapa da Aventura! Quando precisar de um passo, você pode ler aqui mesmo ou baixar para guardar. Para continuar, clique em Próxima parte.',
  ),
  // UM bloco de materiais por fase (07/10/2026, decisão da dona): o Mapa da Aventura e, logo
  // abaixo, a ajuda do Como Fazer, sob o selo "Consulte". O PDF do Mapa é anexado no Admin e a
  // importação o mantém à frente dos itens do manifesto. Consultar a ajuda é opcional: o jogo e a
  // tarefa vêm antes dos tutoriais de interface.
  {
    key: 'materiais-farol',
    content: {
      kind: 'materials',
      title: 'Mapa da Aventura: A Chave do Farol',
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
          ['plataforma-baixar-materiais', 'Como abrir o Mapa da Aventura e os materiais'],
          ['plataforma-abrir-uma-aula', 'Como abrir uma fase e trocar de parte'],
          ['plataforma-ampliar-a-atividade', 'Como dar mais espaço ao jogo e à experiência'],
          ['plataforma-mostrar-o-menu', 'Como mostrar o menu e a lista de fases'],
          ['plataforma-voltar-para-a-aula', 'Como continuar uma fase'],
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
    'Experimentar a aventura pronta antes de construir suas regras, sem exigir vitória.',
    ['video-intro-farol', 'ponte-intro-farol', 'jogo-pronto'],
    ['video-intro-farol', 'jogo-pronto'],
  ),
  secao(
    'caderno',
    'Seu Mapa da Aventura',
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
const experienciaAndar = (key: string, title: string, instructions: string, goals: string[]) => ({
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
      setup: { goals },
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
    video(
      'video-d1-quadro',
      'Como o personagem anda',
      'desafio-dia-1.roteiro.md',
      'Abrir com o conceito (Esta é uma experiência para a gente entender…) e demonstrar na primeira pessoa (Olha aqui:…; o narrador faz os testes e só no fim passa a vez), explicando enquanto faz: o jogo é como um desenho animado, quadro a quadro. Fazer cada gesto no ritmo da fala, sem a seta (o x fica igual) e com a seta (o x sobe), depois Rodar, nomeando o que aconteceu e por quê. Terminar com Agora é a sua vez e Próxima parte.',
    ),
    fala(
      'ponte-d1-quadro',
      'Sua vez! Avance um quadro de cada vez e fique de olho no x. Quando terminar, clique em Próxima parte.',
    ),
    experienciaAndar(
      'experiencia-quadro',
      'Como o personagem anda',
      'Deixe Segurar a seta para a direita desligado e clique em Avançar 1 quadro. Olhe o x. Depois ligue Segurar a seta para a direita e clique em Avançar 1 quadro algumas vezes. Por último, clique em Rodar.',
      ['still-without-arrow', 'moves-each-frame'],
    ),
    video(
      'video-d1-andar',
      'Faça o personagem andar',
      'desafio-dia-1.roteiro.md',
      'Começar pela retomada, curta e nesta ordem: o problema no jogo (não há setas na tela e o personagem fica parado), a lembrança da experiência (com a seta segurada, ele andava a cada quadro) e o anúncio colado ao primeiro passo. No projeto inicial, guiar com o destino à vista: controles com só as quatro direções no fim de Ao iniciar e o movimento dentro de A cada quadro do jogo, logo abaixo de Desenhar o cenário praia-tropical, com velocidade 3. Testar as setas, Verificar esta parte, Salvo e Próxima parte, sem envio.',
    ),
    fala(
      'ponte-d1-andar',
      'Hora de fazer o seu personagem andar! Faça as setas aparecerem e coloque o movimento dentro de A cada quadro do jogo. Depois teste e clique em Verificar esta parte.',
    ),
    video(
      'video-d1-limite',
      'Até onde ele pode ir?',
      'desafio-dia-1.roteiro.md',
      'Abrir com o conceito (Esta é uma experiência para a gente entender…) e demonstrar na primeira pessoa (Olha aqui:…; o narrador faz os testes e só no fim passa a vez), explicando enquanto faz: a tela é uma janela, e o limite, uma parede invisível. Rodar sem o limite até o personagem sair e depois com Manter dentro da tela ligado. Terminar com Agora é a sua vez e Próxima parte.',
    ),
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
    video(
      'video-d1-borda',
      'Mantenha o personagem na tela',
      'desafio-dia-1.roteiro.md',
      'Começar pela retomada, curta e nesta ordem: o problema no jogo (o personagem sai pela beirada, porque ainda não há limite), a lembrança da experiência (com Manter dentro da tela ligado, ele parava na borda) e o anúncio colado ao primeiro passo. Depois deixar à vista o bloco de movimento e encaixar Manter o sprite dentro da tela logo abaixo. Testar as quatro beiradas, Verificar esta parte, Objetivo cumprido!, Salvo, envio com confirmação e Concluir fase.',
    ),
    fala(
      'ponte-d1-borda',
      'Agora mantenha o personagem na tela! Coloque o limite logo abaixo do movimento, teste as quatro beiradas e clique em Verificar esta parte antes de enviar o seu projeto.',
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
  title: 'A chave muda a aventura',
  retireBlockKeys: ['video-d2-teste'],
  blocks: [
    video(
      'video-d2-contexto',
      'O jogo guardou a chave?',
      'desafio-dia-2.roteiro.md',
      'Situar a coleta que falta. Abrir com o conceito (Esta é uma experiência para a gente entender…) e demonstrar na primeira pessoa (Olha aqui:…; o narrador faz os testes e só no fim passa a vez), explicando enquanto faz: encostar na chave é um evento, e guardar é como anotar num bloquinho. Mostrar a coleta sem memória, o recomeço, Guardar a coleta ligado, o afastamento e o recomeço, nomeando temChave em cada um. Terminar com Agora é a sua vez e Próxima parte.',
    ),
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
    video(
      'video-d2-recolher',
      'Recolha a chave',
      'desafio-dia-2.roteiro.md',
      'Começar pela retomada, curta e nesta ordem: o problema no jogo (o personagem passa pela chave e nada acontece, porque o jogo não sabe o que fazer nesse encontro), a lembrança da experiência (ao encostar, a chave saía do chão) e o anúncio colado ao primeiro passo. No projeto enviado no Dia 1, que ainda não tem a área Quando acontecer: criá-la por Áreas do projeto e, com o destino à vista, montar o encontro personagem/chave dentro dela e Destruir o sprite chave dentro dele. Testar a chave sumindo e voltando com Atualizar. Verificar esta parte, Salvo e Próxima parte, sem envio.',
    ),
    fala(
      'ponte-d2-recolher',
      'Agora faça o seu personagem pegar a chave! Programe o encontro e faça a chave sair do chão. Depois teste e clique em Verificar esta parte.',
    ),
    video(
      'video-d2-guardar',
      'Guarde que a chave foi encontrada',
      'desafio-dia-2.roteiro.md',
      'Começar pela retomada, curta: como o efeito não aparece no jogo, só a lembrança (com Guardar a coleta desligado, a chave sumia, mas temChave continuava falso; o jogo está assim) e o anúncio colado ao primeiro passo. Criar temChave começando em falso no fim de Ao iniciar e mudar para verdadeiro dentro do encontro, logo abaixo de Destruir o sprite. Verificar esta parte, Salvo e Próxima parte, sem envio.',
    ),
    fala(
      'ponte-d2-guardar',
      'Agora ensine o seu jogo a lembrar da chave! Crie temChave começando em falso e mude para verdadeiro no encontro com a chave. Depois clique em Verificar esta parte.',
    ),
    video(
      'video-d2-programar',
      'Avise quem está jogando',
      'desafio-dia-2.roteiro.md',
      'Começar pela retomada, curta e nesta ordem: o problema no jogo (a chave some, mas a mensagem continua a inicial), a lembrança da experiência (o aviso mudava) e o anúncio colado ao primeiro passo. Mudar o aviso dentro do encontro, logo abaixo de temChave, com o texto de coleta. Testar, verificar inclusive o movimento anterior, Salvo e envio confirmado. Antes de Concluir fase, comemorar o que a criança programou e lembrar a surpresa uma vez só, sem mostrar nada dela (E lembra da surpresa que eu te contei? Ela está chegando: vem na próxima fase.). Terminar em Concluir fase.',
    ),
    fala(
      'ponte-d2-programar',
      'Agora avise quem está jogando! Mostre uma mensagem quando a chave for encontrada. Teste a coleta e clique em Verificar esta parte antes de enviar o seu projeto.',
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
    video(
      'video-d3-condicao',
      'Quando a porta pode abrir?',
      'desafio-dia-3.roteiro.md',
      'Abrir com o conceito (Esta é uma experiência para a gente entender…) e demonstrar na primeira pessoa (Olha aqui:…; o narrador faz os testes e só no fim passa a vez), explicando enquanto faz: condição é a pergunta que a porta confere, como a porta de casa que só abre com a chave. Testar a porta sem a chave (senão) e com a chave (então), nomeando temChave. Terminar com Agora é a sua vez e Próxima parte.',
    ),
    fala(
      'ponte-d3-condicao',
      'Sua vez! Teste a mesma porta sem a chave e com a chave e repare na resposta que fica marcada. Quando terminar, clique em Próxima parte.',
    ),
    {
      key: 'experiencia-porta',
      content: {
        kind: 'interactive',
        required: true,
        title: 'A porta precisa da chave',
        semPerguntaFinal: true,
        instructions:
          'Clique em Testar a porta sem a chave. Depois clique em Levar a chave e em Testar a porta de novo. Compare temChave e a resposta marcada nas duas vezes.',
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
      'Começar pela retomada, curta e nesta ordem: o problema no jogo (o personagem chega ao farol e nada acontece), a lembrança da experiência (a porta conferia temChave) e o anúncio colado ao primeiro passo. No projeto enviado no Dia 2, guiar evento separado personagem/farol, Se consultando temChave e aviso em senão. Explicitar então ainda vazio. Testar sem chave, Verificar esta parte, corrigir pendências, esperar Salvo e Próxima parte. Não enviar nesta etapa intermediária.',
    ),
    fala(
      'ponte-d3-sem-chave',
      'Agora ensine o farol a avisar quando falta a chave! Monte o aviso, vá ao farol sem pegar a chave e clique em Verificar esta parte antes de seguir.',
    ),
    video(
      'video-d3-decisao',
      'Acenda o farol com a chave',
      'desafio-dia-3.roteiro.md',
      'Começar pela retomada, curta e nesta ordem: o problema no jogo (com a chave, a luz não acende, porque o espaço do então está vazio), a lembrança da experiência (com temChave verdadeiro, a porta acendia o farol) e o anúncio colado ao primeiro passo. Continuar no mesmo Se e projeto da seção anterior. Completar então com ganhou, imagem e aviso. Testar sem chave, buscar e voltar na mesma partida, depois reiniciar e conferir sem chave. Verificação cumulativa, Salvo, envio único com confirmação e Próxima parte.',
    ),
    fala(
      'ponte-d3-decisao',
      'Agora acenda o farol! Complete o espaço do então e teste sem a chave, com a chave e numa nova partida. Depois clique em Verificar esta parte e envie o seu projeto.',
    ),
    video(
      'video-d3-personalizar',
      'Deixe o jogo com a sua cara',
      'desafio-dia-3.roteiro.md',
      'Revelar a surpresa plantada na abertura do Dia 1: começar com Chegou a hora da surpresa!, dizer que o jogo não precisa ficar igual ao do vídeo e mostrar as galerias do Mapa da Aventura (A surpresa do final); depois voltar ao Estúdio. Uma ideia só: trocar cada imagem por outra do mesmo tipo, pelos nomes da galeria do Mapa. No projeto enviado, em Ao iniciar, trocar a imagem de Criar sprite personagem, barco e chave; o farol em par, o modelo apagado no Criar sprite farol e o mesmo modelo aceso no Trocar imagem do sprite farol, dentro de então; o cenário em Desenhar o cenário, dentro de A cada quadro do jogo. Demonstrar pirata, barco-pirata, chave-de-estrela, farol-de-pedra e noite-na-ilha, mantendo nomes dos sprites, posição, largura e altura. Testar sem a chave e com a chave na mesma partida e dizer que é com essa cara que o jogo vai para o Mural; conferir uma vez só, depois do teste. Verificar esta parte, Salvo e Próxima parte. As escolhas ficam no jogo e não viram critério.',
    ),
    fala(
      'ponte-d3-personalizar',
      'Chegou a hora da surpresa! O seu jogo não precisa ficar igual ao do vídeo: escolha seu personagem, barco, chave, farol e cenário. Teste a combinação, clique em Verificar esta parte e depois em Próxima parte.',
    ),
    video(
      'video-d3-farol-mensagens',
      'Escreva seus avisos',
      'desafio-dia-3.roteiro.md',
      'Duração alvo: 90 a 120 segundos. Uma ideia só: os avisos do jogo com as palavras da pessoa. Mudar só o texto dos quatro avisos: o de Ao iniciar, o do encontro com a chave e os de senão e então no encontro com o farol, com frases curtas. Testar os quatro na mesma partida; conferir uma vez só, depois do teste. Esperar Salvo e terminar em Próxima parte. As frases ficam livres.',
    ),
    fala(
      'ponte-d3-farol-mensagens',
      'Agora escreva os avisos do seu jeito! Mude o texto dos quatro avisos, teste o jogo e clique em Próxima parte.',
    ),
    video(
      'video-d3-posicao',
      'Como escolher um lugar para a chave',
      'desafio-dia-3.roteiro.md',
      'Demonstrar na primeira pessoa a experiência lighthouse-position: observar x211/y53, mudar só Posição horizontal x para 160, depois só Posição vertical y para 250. Explicar enquanto faz: x leva para os lados, y para cima e para baixo; números maiores levam à direita e para baixo. Manter o outro valor visível, mostrar que tamanho e desenho não mudam. Só no fim passar a vez para repetir os dois testes; terminar em Próxima parte.',
    ),
    fala(
      'ponte-d3-posicao',
      'Sua vez! Mude o x e observe a chave. Depois mude o y, sem mexer no x, e compare. Quando terminar, clique em Próxima parte.',
    ),
    {
      key: 'experiencia-posicao',
      content: {
        kind: 'interactive',
        required: true,
        title: 'Como escolher um lugar para a chave',
        semPerguntaFinal: true,
        instructions:
          'Em Posição horizontal x, troque 211 por 160 e observe a chave. Deixe o x em 160 e, em Posição vertical y, troque 53 por 250. Compare a direção de cada mudança. Use Recomeçar para repetir os testes.',
        hints: [],
        activity: {
          type: 'experimentation',
          scene: 'lighthouse-position',
          cenario: 'farol',
          setup: { goals: ['mover-horizontal', 'mover-vertical'] },
        },
      },
    },
    video(
      'video-d3-posicionar-chave',
      'Escolha onde fica a chave',
      'desafio-dia-3.roteiro.md',
      'Retomar a experiência de x/y e mostrar a chave no jogo. Em Ao iniciar, no Criar sprite chave, trocar só x/y, mantendo nome, imagem, largura e altura. Oferecer pontos do Mapa: perto da trilha 211/53, na parte de baixo 160/250 e perto da ponte 280/160. Testar se a chave está inteira e visível, alcançável, separada do personagem e da porta, sem esconder sob árvores ou objetos; testar sem chave, coleta, volta ao farol e reinício. Se o lugar não funciona, escolher um ponto sugerido. As escolhas não viram critério. Esperar Salvo e terminar em Próxima parte.',
    ),
    fala(
      'ponte-d3-posicionar-chave',
      'Agora escolha onde fica a chave! Mude o x e o y no bloco Criar sprite chave e teste o caminho até ela e até o farol. Depois clique em Próxima parte.',
    ),
    video(
      'video-d3-fecho',
      'Publique seu jogo',
      'desafio-dia-3.roteiro.md',
      'Usar o mesmo projeto da seção anterior. Compartilhar, manter o resumo (na aula o título vem do curso e não aparece), Gerar capa, conferir, Publicar e comemorar com a criança (Seu jogo está no Mural! Agora a família e os amigos podem jogar), Copiar link de jogar e convidar a mandar para a família e os amigos, com ajuda de um adulto se precisar, Fechar e Concluir fase. Outra capa fica no Como Fazer.',
    ),
    fala(
      'ponte-d3-publicar',
      'Hora de mostrar o seu jogo! Publique no Mural, copie o link de jogar e mande para a sua família e os seus amigos. Se precisar, peça ajuda a um adulto. Depois clique em Fechar e em Concluir fase.',
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
      'delivery',
      'Completar então, testar os dois caminhos e o reinício e enviar o jogo preservando as regras anteriores.',
      ['video-d3-decisao', 'ponte-d3-decisao', 'projeto'],
      ['video-d3-decisao', 'projeto'],
      'projeto',
      portaCompleta,
    ),
    secao(
      'personalizar',
      'Deixe o jogo com a sua cara',
      // Personalização depois do envio e antes da publicação, no mesmo projeto. Uma ideia só
      // (decisão da dona, 06/10/2026): trocar imagens pelas do mesmo tipo, o farol em par. A
      // verificação confere só que o farol continua acendendo, com qualquer modelo.
      'closing',
      'Escolher personagem, barco, chave, o par do farol e cenário com imagens do mesmo tipo e testar.',
      ['video-d3-personalizar', 'ponte-d3-personalizar'],
      ['video-d3-personalizar'],
      'projeto',
      farolEscolhido,
    ),
    secao(
      // A chave fica a mesma desde 06/10/2026: a parte só perdeu o farol, que foi para
      // `personalizar`, e manter a chave preserva o id da seção e dos blocos no Admin.
      'farol-mensagens',
      'Escreva seus avisos',
      'closing',
      'Escrever os quatro avisos do jogo com as próprias palavras e testar.',
      ['video-d3-farol-mensagens', 'ponte-d3-farol-mensagens'],
      ['video-d3-farol-mensagens'],
      'projeto',
    ),
    secao(
      'posicao',
      'Como escolher um lugar para a chave',
      'closing',
      'Experimentar a posição horizontal e vertical antes de escolher onde a chave fica no jogo.',
      ['video-d3-posicao', 'ponte-d3-posicao', 'experiencia-posicao'],
      ['video-d3-posicao', 'experiencia-posicao'],
    ),
    secao(
      'posicionar-chave',
      'Escolha onde fica a chave',
      'closing',
      'Escolher uma posição visível e alcançável para a chave e testar o percurso completo.',
      ['video-d3-posicionar-chave', 'ponte-d3-posicionar-chave'],
      ['video-d3-posicionar-chave'],
      'projeto',
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

/** Links do Como Fazer: abrem na mesma aba, com retorno à fase preservado pelo member-shell. */
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
    video(
      'video-certificado-farol',
      'Comemore sua criação',
      'desafio-certificado.roteiro.md',
      'Reconhecer movimento, coleta e decisão programados pela criança. Mostrar Pegar meu certificado e encerrar em Concluir fase. Não incluir pitch comercial.',
    ),
    fala(
      'fala-certificado',
      'Parabéns! Você programou o movimento, a coleta da chave e a decisão do farol. Agora clique em Pegar meu certificado para guardar essa conquista e, depois, em Concluir fase.',
    ),
    {
      key: 'certificado',
      content: {
        kind: 'certificate',
        title: 'Certificado de Criador',
        introLine: 'Certificamos que',
        coursePhrase: 'completou o Desafio do Primeiro Jogo',
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
