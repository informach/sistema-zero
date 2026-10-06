/** Regenera os manifestos e o inventário do Desafio do farol. Não importa nem publica aulas. */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FAROL_LAYOUT } from '../../../packages/studio/src/arte/farol-assets'
import {
  chaveRecolhida,
  coleta,
  coletaGuardada,
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
// O Dia 1 começa pela versão pronta e pelo caderno, como a Aula 1 do Cadê Todo Mundo?.
// Até 05/10/2026 essas duas seções formavam a aula separada `boas-vindas`; toda aula agora
// termina numa construção. A aula antiga sai do curso no Admin, sem apagar progresso.
const aberturaBlocks = [
  video(
    'video-intro-farol',
    'Seu primeiro jogo: A Chave do Farol',
    'desafio-dia-1.roteiro.md',
    'Anunciar o jogo que será programado e o contexto do barco e do farol apagado. Demonstração na primeira pessoa com um gesto só (Olha aqui: quando eu seguro a seta da tela para a direita…), sem resolver o percurso; só no fim passar a vez: jogar até o farol acender e o barco chegar. Não fazer tour de interface. A participação permite avançar; vencer não é requisito.',
  ),
  fala(
    'ponte-intro-farol',
    'Jogue a versão pronta. Pegue a chave, leve o personagem até o farol e clique em Próxima seção.',
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
    'Seu Caderno do Aluno',
    'desafio-dia-1.roteiro.md',
    'Apresentar o Caderno do Aluno como consulta opcional que acompanha as seções do curso: montagem, testes, publicação e certificado. Não inventar material de mapa nem ensinar o leitor. Download e impressão são opcionais.',
  ),
  fala(
    'ponte-intro-caderno',
    'Este caderno fica aqui para consultar quando precisar de um passo da montagem. Para continuar, clique em Próxima seção.',
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
    'Seu Caderno do Aluno',
    'material',
    'Conhecer o caderno opcional que acompanha o conteúdo das aulas e a ajuda disponível.',
    ['video-intro-caderno', 'ponte-intro-caderno', 'materiais-farol', 'ajuda-como-fazer-intro'],
    ['video-intro-caderno'],
  ),
]

/**
 * Uma experiência da cena `lighthouse-walk`, configurada pelas metas do caso. A mesma cena mostra
 * os três conceitos do Dia 1: andar a cada quadro, o tanto que anda e o limite da tela.
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
  retireBlockKeys: ['video-d1-chegada', 'video-d1-movimento'],
  blocks: [
    ...aberturaBlocks,
    video(
      'video-d1-quadro',
      'Como o personagem anda',
      'desafio-dia-1.roteiro.md',
      'Abrir com o conceito (Esta é uma experiência para a gente entender…) e demonstrar na primeira pessoa (Olha aqui:…; o narrador faz os testes e só no fim passa a vez), explicando enquanto faz: o jogo é como um desenho animado, quadro a quadro. Fazer cada gesto no ritmo da fala, sem a seta (o x fica igual) e com a seta (o x sobe), depois Rodar, nomeando o que aconteceu e por quê. Terminar com Agora é a sua vez e Próxima seção.',
    ),
    fala('ponte-d1-quadro', 'Agora veja como o personagem anda, um quadro de cada vez.'),
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
      'Começar pela retomada: a experiência mostrou o andar a cada quadro; no jogo, o personagem está parado e não há setas. No projeto inicial, guiar com o destino à vista: controles com só as quatro direções no fim de Ao iniciar e o movimento dentro de A cada quadro do jogo, logo abaixo de Desenhar o cenário, com velocidade 3. Testar as setas, Verificar esta etapa, Salvo e Próxima seção, sem envio.',
    ),
    fala(
      'ponte-d1-andar',
      'Faça as setas aparecerem e coloque o movimento dentro de A cada quadro do jogo. Teste as setas e clique em Verificar esta etapa.',
    ),
    video(
      'video-d1-tanto',
      'O tanto que ele anda',
      'desafio-dia-1.roteiro.md',
      'Abrir com o conceito (Esta é uma experiência para a gente entender…) e demonstrar na primeira pessoa (Olha aqui:…; o narrador faz os testes e só no fim passa a vez), explicando enquanto faz: a velocidade é o tamanho do passo. Mostrar Velocidade 3 e Velocidade 1 avançando quadros, com o x e as marcas, e dizer a diferença. Terminar com Agora é a sua vez e Próxima seção.',
    ),
    fala('ponte-d1-tanto', 'Agora compare as duas velocidades.'),
    experienciaAndar(
      'experiencia-velocidade',
      'O tanto que ele anda',
      'Com Velocidade 3, ligue Segurar a seta para a direita e clique em Avançar 1 quadro algumas vezes. Veja quanto o x muda. Depois clique em Recomeçar, escolha Velocidade 1 e clique em Avançar 1 quadro de novo. Compare.',
      ['step-speed-3', 'step-speed-1'],
    ),
    video(
      'video-d1-velocidade',
      'Escolha a velocidade',
      'desafio-dia-1.roteiro.md',
      'Mexa e veja numa seção própria. Começar pela retomada: no jogo, segurar uma seta e notar o tanto que ele anda com 3. Com o bloco de movimento à vista, trocar o 3 por um número de 1 a 6, testar alguns e deixar o preferido; a escolha fica no jogo. Verificar esta etapa (confere só o movimento, com qualquer velocidade), Salvo e Próxima seção, sem envio.',
    ),
    fala(
      'ponte-d1-velocidade',
      'Escolha a velocidade do seu personagem: troque o 3 por um número de 1 a 6, teste e deixe o que você mais gostar. Depois clique em Verificar esta etapa.',
    ),
    video(
      'video-d1-limite',
      'Até onde ele pode ir?',
      'desafio-dia-1.roteiro.md',
      'Abrir com o conceito (Esta é uma experiência para a gente entender…) e demonstrar na primeira pessoa (Olha aqui:…; o narrador faz os testes e só no fim passa a vez), explicando enquanto faz: a tela é uma janela, e o limite, uma parede invisível. Rodar sem o limite até o personagem sair e depois com Manter dentro da tela ligado. Terminar com Agora é a sua vez e Próxima seção.',
    ),
    fala('ponte-d1-limite', 'Agora veja o que acontece na borda, sem o limite e com ele.'),
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
      'Começar pela retomada: a experiência mostrou o limite; no jogo, ainda sem limite, mostrar o personagem saindo pela beirada. Depois deixar à vista o bloco de movimento e encaixar Manter o sprite dentro da tela logo abaixo. Testar as quatro beiradas, Verificar esta etapa, Objetivo da etapa cumprido!, Salvo, envio com confirmação e Concluir aula.',
    ),
    fala(
      'ponte-d1-borda',
      'Coloque o limite da tela logo abaixo do movimento. Teste as quatro beiradas e clique em Verificar esta etapa antes de enviar para o professor.',
    ),
    projeto('dia-1'),
    ajudaComoFazer('ajuda-d1', 'Se precisar de ajuda', [
      ['plataforma-ampliar-a-atividade', 'Como dar mais espaço para a atividade'],
      ['plataforma-pedir-ajuda', 'Como pedir ajuda ao professor'],
    ]),
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
      ['video-d1-andar', 'ponte-d1-andar', 'ajuda-d1'],
      ['video-d1-andar'],
      'projeto',
      movimentoSemBorda,
    ),
    secao(
      'tanto',
      'O tanto que ele anda',
      'exploration',
      'Comparar quanto o personagem anda a cada quadro com velocidade 3 e com velocidade 1.',
      ['video-d1-tanto', 'ponte-d1-tanto', 'experiencia-velocidade'],
      ['video-d1-tanto', 'experiencia-velocidade'],
    ),
    secao(
      'velocidade',
      'Escolha a velocidade',
      'application',
      // Mexa e veja (05/10/2026): a criança fica com a velocidade que escolher. A verificação só
      // confere que o movimento continua no lugar; nenhum critério exige um número de velocidade.
      'Escolher a velocidade do personagem no próprio jogo e ficar com ela.',
      ['video-d1-velocidade', 'ponte-d1-velocidade'],
      ['video-d1-velocidade'],
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
      'Situar a coleta que falta. Abrir com o conceito (Esta é uma experiência para a gente entender…) e demonstrar na primeira pessoa (Olha aqui:…; o narrador faz os testes e só no fim passa a vez), explicando enquanto faz: encostar na chave é um evento, e guardar é como anotar num caderno. Mostrar a coleta sem memória, o recomeço, Guardar a coleta ligado, o afastamento e o recomeço, nomeando temChave em cada um. Terminar com Agora é a sua vez e Próxima seção.',
    ),
    fala(
      'ponte-d2-contexto',
      'Agora compare o que some da tela com o que fica guardado em temChave.',
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
      'Começar pela retomada: no jogo, o personagem passa pela chave e nada acontece, porque nenhuma ação está ligada ao encontro. No projeto enviado no Dia 1, que ainda não tem a área Quando acontecer: criá-la por Áreas do projeto e, com o destino à vista, montar o encontro personagem/chave dentro dela e Destruir o sprite chave dentro dele. Testar a chave sumindo e voltando com Atualizar. Verificar esta etapa, Salvo e Próxima seção, sem envio.',
    ),
    fala(
      'ponte-d2-recolher',
      'Programe o encontro com a chave e faça a chave sair do chão. Teste e clique em Verificar esta etapa.',
    ),
    video(
      'video-d2-guardar',
      'Guarde que a chave foi encontrada',
      'desafio-dia-2.roteiro.md',
      'Começar pela retomada: como na experiência com Guardar a coleta desligado, a chave some, mas nada guarda a coleta. Criar temChave começando em falso no fim de Ao iniciar e mudar para verdadeiro dentro do encontro, logo abaixo de Destruir o sprite. Verificar esta etapa, Salvo e Próxima seção, sem envio.',
    ),
    fala(
      'ponte-d2-guardar',
      'Crie temChave começando em falso e mude para verdadeiro no encontro com a chave. Depois clique em Verificar esta etapa.',
    ),
    video(
      'video-d2-programar',
      'Avise quem está jogando',
      'desafio-dia-2.roteiro.md',
      'Começar pela retomada: no jogo, a chave some, mas a mensagem continua a inicial. Mudar o aviso dentro do encontro, logo abaixo de temChave, com o texto de coleta. Testar, verificar inclusive o movimento anterior, Salvo, envio confirmado e Concluir aula.',
    ),
    fala(
      'ponte-d2-programar',
      'Mostre um aviso quando a chave for encontrada. Teste a coleta e clique em Verificar esta etapa antes de enviar para o professor.',
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
      'Abrir com o conceito (Esta é uma experiência para a gente entender…) e demonstrar na primeira pessoa (Olha aqui:…; o narrador faz os testes e só no fim passa a vez), explicando enquanto faz: condição é a pergunta que a porta confere, como a porta de casa que só abre com a chave. Testar a porta sem a chave (senão) e com a chave (então), nomeando temChave. Terminar com Agora é a sua vez e Próxima seção.',
    ),
    fala('ponte-d3-condicao', 'Agora teste a mesma porta sem a chave e com a chave.'),
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
      'Começar pela retomada: no jogo, o personagem chega ao farol e nada acontece. No projeto enviado no Dia 2, guiar evento separado personagem/farol, Se consultando temChave e aviso em senão. Explicitar então ainda vazio. Testar sem chave, Verificar esta etapa, corrigir pendências, esperar Salvo e Próxima seção. Não enviar nesta etapa intermediária.',
    ),
    fala(
      'ponte-d3-sem-chave',
      'Monte o aviso de que falta a chave. Vá ao farol sem pegar a chave e clique em Verificar esta etapa antes de seguir.',
    ),
    video(
      'video-d3-decisao',
      'Acenda o farol com a chave',
      'desafio-dia-3.roteiro.md',
      'Começar pela retomada: no jogo, com a chave, a luz não acende porque então está vazio. Continuar no mesmo Se e projeto da seção anterior. Completar então com ganhou, imagem e aviso. Testar sem chave, buscar e voltar na mesma partida, depois reiniciar e conferir sem chave. Verificação cumulativa, Salvo, envio único com confirmação e Próxima seção.',
    ),
    fala(
      'ponte-d3-decisao',
      'Complete a parte então para acender o farol. Teste sem a chave, com a chave e numa nova partida. Depois clique em Verificar esta etapa e envie para o professor.',
    ),
    video(
      'video-d3-personalizar',
      'Deixe o jogo com a sua cara',
      'desafio-dia-3.roteiro.md',
      'Mexa e veja numa seção própria, com mudanças que ficam no jogo. Com o destino à vista, mostrar a área Ao iniciar e o bloco Criar sprite personagem; no fim dele, clicar no nome da imagem e escolher outro personagem. Dizer que todos têm o mesmo tamanho, então andar, pegar a chave e chegar ao farol continuam iguais. Depois, em Quando acontecer, escrever os avisos com as próprias palavras. Ensinar a voltar a um personagem se outra imagem for escolhida. Testar a aventura e terminar em Próxima seção. As escolhas não viram critério.',
    ),
    fala(
      'ponte-d3-personalizar',
      'Escolha outro personagem no bloco Criar sprite e escreva os avisos do seu jeito. Depois teste a aventura e clique em Próxima seção.',
    ),
    video(
      'video-d3-fecho',
      'Publique seu jogo',
      'desafio-dia-3.roteiro.md',
      'Usar o mesmo projeto da seção anterior. Compartilhar, manter o resumo (na aula o título vem do curso e não aparece), Gerar capa, conferir, Publicar e comemorar com a criança (Seu jogo está no Mural! Agora a família e os amigos podem jogar), Copiar link de jogar e convidar a mandar para a família e os amigos, com ajuda de um adulto se precisar, Fechar e Concluir aula. Outra capa fica no Como Fazer.',
    ),
    fala(
      'ponte-d3-publicar',
      'Publique seu jogo no Mural, copie o link de jogar e mande para a sua família e seus amigos. Depois clique em Fechar e em Concluir aula.',
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
      'personalizar',
      'Deixe o jogo com a sua cara',
      // Mexa e veja numa seção própria (05/10/2026). Fechamento: depois da entrega, só seções de
      // fechamento (o projeto já foi enviado).
      'closing',
      'Trocar o personagem e escrever os avisos do próprio jogo e testar.',
      ['video-d3-personalizar', 'ponte-d3-personalizar'],
      ['video-d3-personalizar'],
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
