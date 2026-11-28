/** Autoria local do Poder "Chefão com resistência" (Construtor). Importação, gravação e publicação são etapas à parte. */
// A estrutura das aulas, o roteiro e os derivados saem do gerador comum dos Poderes (poder-gerador.ts).

import { chefaoAjuda, chefaoAulas, chefaoExperiencia } from './chefao-conteudo'
import { chefaoChecks } from './chefao-criterios'
import { CHEFAO_CURSO, CHEFAO_ETAPAS, montarProjetoChefao } from './chefao-projeto'
import { chefaoQuiz2d, chefaoQuiz3d } from './chefao-quiz'
import { gerarPoder } from './poder-gerador'

const aulas = chefaoAulas()

const help = `# Passo a passo do projeto: Chefão com resistência\n\nPoder do Construtor. Aqui está o que investigar na experiência e cada montagem das duas aulas: o que a regra faz, o caminho na paleta, o bloco, onde encaixar e como testar. Você pode consultar quantas vezes quiser.\n\n## ${chefaoExperiencia.title}\n\n**A ideia:** ${chefaoExperiencia.idea}\n\n**O que investigar:**\n\n${chefaoExperiencia.goals.map((g) => `- ${g}`).join('\n')}\n\n${chefaoExperiencia.observe}\n\n${aulas
  .map(
    (a) =>
      `## ${a.dimension === '2d' ? 'Aula 1 · Nave Contra Asteroides (2D)' : 'Aula 2 · Patrulha Espacial (3D)'}: ${a.title}\n\n${chefaoAjuda(
        a.dimension,
      )
        .map(
          (h) =>
            `### ${h.title}\n\n**A regra:** ${h.idea}\n\n${h.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n**Teste:**\n\n${h.tests.map((t) => `- ${t}`).join('\n')}`,
        )
        .join('\n\n')}`,
  )
  .join(
    '\n\n',
  )}\n\n## Entrega\n\nEm cada aula, o envio fecha a última montagem, a do prêmio que vale uma vez. Antes de enviar, jogue uma partida: acerte o chefão uma vez e veja a vida descer, derrote o chefão e confira que o placar ganha 10 e para. Clique em Verificar projeto e corrija o que faltar. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte. Depois vem o quiz da aula: escolha uma resposta, observe a explicação e, quando terminar, clique em Concluir aula. O Poder conta quando as duas aulas estão concluídas.\n`

await gerarPoder({
  nome: 'Chefão com resistência',
  pasta: 'poder-chefao-com-resistencia',
  trilha: 'construtor',
  prefixo: 'chefao',
  tipo: 'Poder do Construtor',
  curso: CHEFAO_CURSO,
  etapas: CHEFAO_ETAPAS,
  etapaFinal: 'uma-vez',
  montarProjeto: montarProjetoChefao,
  checks: chefaoChecks,
  quiz: { '2d': chefaoQuiz2d, '3d': chefaoQuiz3d },
  aulas,
  idBase: 'c0e5c004',
  jogoPronto: {
    title: 'Derrote o chefão',
    instrucoes: {
      '2d': 'Clique no jogo e aperte Enter. As setas movem a nave e o Espaço dispara. O chefão espera lá em cima: acerte até a barra dele acabar e veja o prêmio. Você pode seguir sem terminar.',
      '3d': 'Clique no jogo e aperte Enter. As setas movem a nave e o Espaço dispara. O chefão espera lá na frente: acerte até a vida dele, no alto à esquerda, chegar a 0. Você pode seguir sem terminar.',
    },
    palco: { '2d': { width: 800, height: 480 }, '3d': { width: 960, height: 600 } },
  },
  experiencia: {
    kind: 'interactive',
    required: true,
    title: 'A resistência do chefão',
    semPerguntaFinal: true,
    instructions:
      'Clique em Disparar e olhe a vida, a barra e o placar a cada laser. Depois que o chefão cair, clique em Avançar um quadro e compare o placar com a Guarda do prêmio Ligada e Desligada. O Zappy te mostra o que testar, e você pode repetir quando quiser.',
    hints: [
      'Olhe a vida do chefão antes e depois de cada laser. O que acontece quando a vida chega a 0?',
      'Derrote o chefão e olhe o placar quadro a quadro. Compare com a Guarda do prêmio Ligada e Desligada.',
      'Clique em Disparar uma vez e depois mais duas vezes. Continue até a vida chegar a 0 e clique em Avançar um quadro. Depois troque a Guarda do prêmio, derrote o chefão de novo e clique em Avançar um quadro.',
    ],
    activity: {
      type: 'experimentation',
      scene: 'boss-health',
      cast: { hero: { name: 'nave', gender: 'f' }, obstacle: { name: 'chefão', gender: 'm' } },
      cenario: 'nave',
      setup: {
        freeExploration: true,
        goals: ['one-not-enough', 'count-down', 'falls-at-zero', 'falls-once'],
        goalCopy: {
          'one-not-enough': {
            label: 'Um laser só não derrota o chefão',
            pedido:
              'Com a vida do chefão em 5, clique em Disparar uma vez. Olhe a vida, a barra e o chefão.',
          },
          'count-down': {
            label: 'Cada laser tira 1 da vida do chefão',
            pedido:
              'Na mesma partida, clique em Disparar mais duas vezes. Olhe a vida a cada laser.',
          },
          'falls-at-zero': {
            label: 'No 0, o chefão cai e o placar ganha o prêmio',
            pedido: 'Clique em Disparar até a vida chegar a 0. Olhe o chefão e o placar.',
          },
          'falls-once': {
            label: 'Com a guarda, o prêmio vale uma vez só',
            pedido:
              'Derrote o chefão com a Guarda do prêmio Ligada e com a Guarda Desligada. Depois de cada vez, clique em Avançar um quadro e olhe o placar.',
          },
        },
      },
    },
  },
  cenaDoZappy: 'boss-health',
  notaDoTeclado3D:
    'O jogo é de teclado: o robô dá o foco ao jogo (Rodar de novo no Estúdio, ou um toque no jogo pronto) antes das teclas. O chefão fica parado no meio, onde a nave começa: cada Espaço com a nave parada é um acerto. ',
  ajuda: 'Ajuda livre no Passo a passo do projeto',
  passoAPasso: help,
  modulos:
    '# Chefão com resistência\n\n**Título do curso:** Chefão com resistência\n\n**Descrição curta:** Ponha no jogo um chefão que aguenta cinco lasers, com a vida na tela e um prêmio que vale uma vez só, em 2D e em 3D.\n\n**Descrição longa:** Um Poder do posto Construtor. Você dá vida a um chefão no jogo que montou na trilha: uma variável guarda a resistência dele, cada laser que acerta tira 1, no zero ele cai e dá um prêmio, e uma guarda faz o prêmio valer uma vez só. Na primeira aula o chefão aparece na Nave Contra Asteroides, em 2D; na segunda você o monta de novo na Patrulha Espacial, em 3D. Cada aula termina com o projeto enviado. Este curso não concede certificado.\n\n## Módulo 1 · Chefão com resistência\n\n**Resumo:** Um chefão com vida própria: a variável, o acerto, o fim no zero e a guarda do prêmio. Primeiro em 2D, depois em 3D; a última montagem de cada aula envia o projeto.\n\n' +
    aulas
      .map(
        (a, i) =>
          `### Aula ${i + 1}. ${a.title}\n\nIdentificador: ${a.slug}. Dimensão: ${a.dimension.toUpperCase()}.\n\n${a.trechos.map((t, n) => `${n + 1}. ${t.title}.`).join('\n')}\n\n[Manifesto](chefao-${a.slug}.manifesto.json) · [Roteiro](chefao-${a.slug}.roteiro.md).`,
      )
      .join('\n\n') +
    '\n\nUma entrega por aula, na última construção, e o quiz depois dela. O Poder conta com as duas aulas concluídas. Sem certificado nem publicação na comunidade. Produzir e anexar a mídia real antes de publicar; publicar o curso só depois da `aula-2`.\n\nPoder 4 do posto Construtor (`jornada-construtor-poder-4`). Módulo: **Chefão com resistência**. Preservar o ID do curso, do módulo reservado e das aulas `aula-1` e `aula-2`, já reservadas.\n',
  resumo:
    'Chefão com resistência: duas aulas, roteiros, voz, ajuda, inventário e quatro projetos portáteis gerados.',
})
