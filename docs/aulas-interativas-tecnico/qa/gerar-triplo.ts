/** Autoria local do Poder "Tiro triplo" (Construtor). Importação, gravação e publicação são etapas à parte. */
// A estrutura das aulas, o roteiro e os derivados saem do gerador comum dos Poderes (poder-gerador.ts).
import { gerarPoder } from './poder-gerador'
import { triploAjuda, triploAulas, triploExperiencia } from './triplo-conteudo'
import { triploChecks } from './triplo-criterios'
import { montarProjetoTriplo, TRIPLO_CURSO, TRIPLO_ETAPAS } from './triplo-projeto'
import { triploQuiz2d, triploQuiz3d } from './triplo-quiz'

const aulas = triploAulas()

const help = `# Passo a passo do projeto: Tiro triplo\n\nPoder do Construtor. Aqui está o que investigar na experiência e cada montagem das duas aulas: o que a regra faz, o caminho na paleta, o bloco, onde encaixar e como testar. Você pode consultar quantas vezes quiser.\n\n## ${triploExperiencia.title}\n\n**A ideia:** ${triploExperiencia.idea}\n\n**O que investigar:**\n\n${triploExperiencia.goals.map((g) => `- ${g}`).join('\n')}\n\n${triploExperiencia.observe}\n\n${aulas
  .map(
    (a) =>
      `## ${a.dimension === '2d' ? 'Aula 1 · Nave Contra Asteroides (2D)' : 'Aula 2 · Patrulha Espacial (3D)'}: ${a.title}\n\n${triploAjuda(
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
  )}\n\n## Entrega\n\nEm cada aula, o envio fecha a última montagem, a do prazo do tiro triplo. Antes de enviar, jogue uma partida: dispare antes do item, pegue o item e dispare com o Triplo ligado, espere o Triplo chegar a 0 e dispare de novo. Clique em Verificar projeto e corrija o que faltar. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte. Depois vem o quiz da aula: escolha uma resposta, observe a explicação e, quando terminar, clique em Concluir aula. O Poder conta quando as duas aulas estão concluídas.\n`

await gerarPoder({
  nome: 'Tiro triplo',
  pasta: 'poder-tiro-triplo',
  trilha: 'construtor',
  prefixo: 'triplo',
  tipo: 'Poder do Construtor',
  curso: TRIPLO_CURSO,
  etapas: TRIPLO_ETAPAS,
  etapaFinal: 'volta',
  montarProjeto: montarProjetoTriplo,
  checks: triploChecks,
  quiz: { '2d': triploQuiz2d, '3d': triploQuiz3d },
  aulas,
  idBase: 'c0e5c002',
  jogoPronto: {
    title: 'Jogue com o tiro triplo',
    instrucoes: {
      '2d': 'Clique no jogo e aperte Enter. As setas movem a nave e o Espaço dispara. Pegue o item que cai pelo meio, dispare com o tiro triplo e veja o que acontece quando o Triplo chega a zero. Você pode seguir sem terminar.',
      '3d': 'Clique no jogo e aperte Enter. As setas movem a nave e o Espaço dispara. Pegue o item que vem pela esquerda e dispare com o tiro triplo. Você pode seguir sem terminar.',
    },
    palco: { '2d': { width: 800, height: 480 }, '3d': { width: 960, height: 600 } },
  },
  experiencia: {
    kind: 'interactive',
    required: true,
    title: 'O leque de tiros',
    semPerguntaFinal: true,
    instructions:
      'Escolha o Tiro triplo e o desvio, clique em Disparar e depois em Ver os lasers chegarem. Olhe quantos lasers saem e onde cada laser chega. O Zappy te mostra o que testar, e você pode repetir quando quiser.',
    hints: [
      'Olhe quantos lasers saem da nave e onde cada laser chega. O que muda com o Tiro triplo ligado?',
      'Com o Tiro triplo ligado, compare o Desvio 0 com o Desvio 2. Depois troque para o Desvio 1.',
      'Clique em Disparar com o Tiro triplo desligado. Depois ligue o Tiro triplo e dispare com o Desvio 0, com o Desvio 2 e, por fim, com o Desvio 1. Depois de cada disparo, clique em Ver os lasers chegarem.',
    ],
    activity: {
      type: 'experimentation',
      scene: 'spread-shot',
      cast: { hero: { name: 'nave', gender: 'f' }, obstacle: { name: 'asteroide', gender: 'm' } },
      cenario: 'nave',
      setup: {
        freeExploration: true,
        goals: ['single-one', 'triple-stacked', 'triple-spread', 'deviation-matters'],
        goalCopy: {
          'single-one': {
            label: 'Com o tiro simples, sai um laser só',
            pedido:
              'Com o Tiro triplo desligado, clique em Disparar e em Ver os lasers chegarem. Conte quantos lasers saem.',
          },
          'triple-stacked': {
            label: 'Com desvio 0, os três lasers seguem juntos',
            pedido:
              'Ligue o Tiro triplo, escolha Desvio 0, clique em Disparar e em Ver os lasers chegarem.',
          },
          'triple-spread': {
            label: 'Com desvio 2, cada laser segue o seu caminho',
            pedido:
              'Com o Tiro triplo ligado, escolha Desvio 2, clique em Disparar e em Ver os lasers chegarem. Olhe onde cada laser chega.',
          },
          'deviation-matters': {
            label: 'Com desvio 1, os lasers dos lados passam entre as pedras',
            pedido:
              'Com o Tiro triplo ligado, escolha Desvio 1, clique em Disparar de novo e em Ver os lasers chegarem. Os lasers dos lados chegam às pedras?',
          },
        },
      },
    },
  },
  cenaDoZappy: 'spread-shot',
  notaDoTeclado3D:
    'O jogo é de teclado: o robô dá o foco ao jogo (Rodar de novo no Estúdio, ou um toque no jogo pronto) antes das teclas. O item nasce a cada 4 s desde que o jogo abre (no 3D, pela esquerda); as esperas no Na tela são estimativas e se acertam no Verificar plano. ',
  ajuda: 'Ajuda livre no Passo a passo do projeto',
  passoAPasso: help,
  modulos:
    '# Tiro triplo\n\n**Título do curso:** Tiro triplo\n\n**Descrição curta:** Dê à nave um tiro triplo que liga ao pegar um item, abre três lasers em leque e acaba depois de 5 segundos, em 2D e em 3D.\n\n**Descrição longa:** Um Poder do posto Construtor. Você acrescenta vários projéteis com trajetórias diferentes ao jogo que montou na trilha: um item cai, pegar o item liga o tiro triplo, o Espaço pergunta se ele está ligado e cria três lasers, cada um numa direção, e um relógio faz o tiro triplo acabar. Na primeira aula ele nasce na Nave Contra Asteroides, em 2D; na segunda você o monta de novo na Patrulha Espacial, em 3D. Cada aula termina com o projeto enviado. Este curso não concede certificado.\n\n## Módulo 1 · Tiro triplo\n\n**Resumo:** Três lasers de uma vez: o item que cai, o Espaço que pergunta, as direções de cada laser e o tempo que acaba. Primeiro em 2D, depois em 3D; a última montagem de cada aula envia o projeto.\n\n' +
    aulas
      .map(
        (a, i) =>
          `### Aula ${i + 1}. ${a.title}\n\nIdentificador: ${a.slug}. Dimensão: ${a.dimension.toUpperCase()}.\n\n${a.trechos.map((t, n) => `${n + 1}. ${t.title}.`).join('\n')}\n\n[Manifesto](triplo-${a.slug}.manifesto.json) · [Roteiro](triplo-${a.slug}.roteiro.md).`,
      )
      .join('\n\n') +
    '\n\nUma entrega por aula, na última construção, e o quiz depois dela. O Poder conta com as duas aulas concluídas. Sem certificado nem publicação na comunidade. Produzir e anexar a mídia real antes de publicar; publicar o curso só depois da `aula-2`.\n\nPoder 2 do posto Construtor (`jornada-construtor-poder-2`). Módulo: **Tiro triplo**. Preservar o ID do curso, do módulo reservado e da `aula-1`; a `aula-2` é criada no Admin, no mesmo curso, antes da importação.\n',
  resumo:
    'Tiro triplo: duas aulas, roteiros, voz, ajuda, inventário e quatro projetos portáteis gerados.',
})
