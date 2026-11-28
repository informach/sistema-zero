/** Autoria local do Poder "Escudo temporário" (Construtor). Importação, gravação e publicação são etapas à parte. */
// A estrutura das aulas, o roteiro e os derivados saem do gerador comum dos Poderes (poder-gerador.ts).
import { escudoAjuda, escudoAulas, escudoExperiencia } from './escudo-conteudo'
import { escudoChecks } from './escudo-criterios'
import { ESCUDO_CURSO, ESCUDO_ETAPAS, montarProjetoEscudo } from './escudo-projeto'
import { escudoQuiz2d, escudoQuiz3d } from './escudo-quiz'
import { gerarPoder } from './poder-gerador'

const aulas = escudoAulas()

const help = `# Passo a passo do projeto: Escudo temporário\n\nPoder do Construtor. Aqui está o que investigar na experiência e cada montagem das duas aulas: o que a regra faz, o caminho na paleta, o bloco, onde encaixar e como testar. Você pode consultar quantas vezes quiser.\n\n## ${escudoExperiencia.title}\n\n**A ideia:** ${escudoExperiencia.idea}\n\n**O que investigar:**\n\n${escudoExperiencia.goals.map((g) => `- ${g}`).join('\n')}\n\n${escudoExperiencia.observe}\n\n${aulas
  .map(
    (a) =>
      `## ${a.dimension === '2d' ? 'Aula 1 · Nave Contra Asteroides (2D)' : 'Aula 2 · Patrulha Espacial (3D)'}: ${a.title}\n\n${escudoAjuda(
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
  )}\n\n## Entrega\n\nEm cada aula, o envio fecha a última montagem, a do prazo do escudo. Antes de enviar, jogue uma partida: pegue o item, deixe uma pedra bater com o escudo ligado, espere o Escudo chegar a 0 e deixe outra pedra bater. Clique em Verificar projeto e corrija o que faltar. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte. Depois vem o quiz da aula: escolha uma resposta, observe a explicação e, quando terminar, clique em Concluir aula. O Poder conta quando as duas aulas estão concluídas.\n`

await gerarPoder({
  nome: 'Escudo temporário',
  pasta: 'poder-escudo-temporario',
  trilha: 'construtor',
  prefixo: 'escudo',
  tipo: 'Poder do Construtor',
  curso: ESCUDO_CURSO,
  etapas: ESCUDO_ETAPAS,
  etapaFinal: 'acaba',
  montarProjeto: montarProjetoEscudo,
  checks: escudoChecks,
  quiz: { '2d': escudoQuiz2d, '3d': escudoQuiz3d },
  aulas,
  idBase: 'c0e5c001',
  jogoPronto: {
    title: 'Jogue com o escudo',
    instrucoes: {
      '2d': 'Clique no jogo e aperte Enter. As setas movem a nave e o Espaço dispara. Pegue o item que cai pelo meio, deixe uma pedra bater com o escudo ligado e veja o que acontece quando o Escudo chega a zero. Você pode seguir sem terminar.',
      '3d': 'Clique no jogo e aperte Enter. As setas movem a nave e o Espaço dispara. Pegue o item que vem pelo meio e deixe uma pedra bater com o escudo ligado. Você pode seguir sem terminar.',
    },
    palco: { '2d': { width: 800, height: 480 }, '3d': { width: 960, height: 600 } },
  },
  experiencia: {
    kind: 'interactive',
    required: true,
    title: 'O escudo que acaba',
    semPerguntaFinal: true,
    instructions:
      'Pegue o item do escudo, avance um segundo de cada vez e olhe o Escudo e as Vidas quando uma pedra bate. O Zappy te mostra o que testar, e você pode repetir quando quiser.',
    hints: [
      'Olhe o Escudo e as Vidas a cada segundo. O que muda quando uma pedra bate com o Escudo em 0 e com o Escudo maior que 0?',
      'Compare uma batida sem pegar o item com uma batida logo depois de pegar. Depois deixe o Escudo chegar a 0 antes da próxima pedra e pegue o item de novo com o Escudo descendo.',
      'Clique em Avançar até a próxima pedra sem pegar o item. Clique em Pegar o item do escudo e em Avançar até a próxima pedra. Clique em Avançar 1 segundo até o Escudo chegar a 0 e em Avançar até a próxima pedra. Por fim, pegue o item, clique em Avançar 1 segundo e pegue de novo.',
    ],
    activity: {
      type: 'experimentation',
      scene: 'timed-shield',
      cast: { hero: { name: 'nave', gender: 'f' }, obstacle: { name: 'asteroide', gender: 'm' } },
      cenario: 'nave',
      setup: {
        freeExploration: true,
        goals: ['hit-costs', 'shield-protects', 'shield-ends', 'shield-renews'],
        goalCopy: {
          'hit-costs': {
            label: 'Sem escudo, a batida tirou uma vida',
            pedido: 'Sem pegar o item, clique em Avançar até a próxima pedra e olhe as Vidas.',
          },
          'shield-protects': {
            label: 'Com o escudo ligado, a pedra só saiu',
            pedido:
              'Clique em Pegar o item do escudo e em Avançar até a próxima pedra. Olhe o Escudo e as Vidas.',
          },
          'shield-ends': {
            label: 'O escudo chegou a 0 e a pedra voltou a tirar vida',
            pedido:
              'Com o item pego, clique em Avançar 1 segundo até o Escudo chegar a 0 e depois em Avançar até a próxima pedra.',
          },
          'shield-renews': {
            label: 'Pegar de novo voltou o escudo a 5',
            pedido:
              'Com o Escudo entre 1 e 4, clique em Pegar o item do escudo de novo e olhe o número.',
          },
        },
      },
    },
  },
  cenaDoZappy: 'timed-shield',
  notaDoTeclado3D:
    'O jogo é de teclado: o robô dá o foco ao jogo (Rodar de novo no Estúdio, ou um toque no jogo pronto) antes das teclas. O item nasce a cada 4 s desde que o jogo abre; as esperas no Na tela são estimativas e se acertam no Verificar plano. ',
  ajuda: 'Ajuda livre no Passo a passo do projeto',
  passoAPasso: help,
  modulos:
    '# Escudo temporário\n\n**Título do curso:** Escudo temporário\n\n**Descrição curta:** Dê à nave um escudo que liga ao pegar um item, protege das pedras e acaba depois de 5 segundos, em 2D e em 3D.\n\n**Descrição longa:** Um Poder do posto Construtor. Você acrescenta um escudo com prazo ao jogo que montou na trilha: um item cai pelo meio, pegar o item liga o escudo, a batida pergunta se ainda há tempo e um relógio faz o escudo acabar. Na primeira aula o escudo nasce na Nave Contra Asteroides, em 2D; na segunda você o monta de novo na Patrulha Espacial, em 3D. Cada aula termina com o projeto enviado. Este curso não concede certificado.\n\n## Módulo 1 · Escudo temporário\n\n**Resumo:** Um escudo com prazo para a nave: o item que cai, o escudo que liga, a pedra que só sai e o tempo que acaba. Primeiro em 2D, depois em 3D; a última montagem de cada aula envia o projeto.\n\n' +
    aulas
      .map(
        (a, i) =>
          `### Aula ${i + 1}. ${a.title}\n\nIdentificador: ${a.slug}. Dimensão: ${a.dimension.toUpperCase()}.\n\n${a.trechos.map((t, n) => `${n + 1}. ${t.title}.`).join('\n')}\n\n[Manifesto](escudo-${a.slug}.manifesto.json) · [Roteiro](escudo-${a.slug}.roteiro.md).`,
      )
      .join('\n\n') +
    '\n\nUma entrega por aula, na última construção, e o quiz depois dela. O Poder conta com as duas aulas concluídas. Sem certificado nem publicação na comunidade. Produzir e anexar a mídia real antes de publicar; publicar o curso só depois da `aula-2`.\n\nPoder 1 do posto Construtor (`jornada-construtor-poder-1`). Módulo: **Escudo temporário**. Preservar o ID do curso, do módulo reservado e da `aula-1`; a `aula-2` é criada no Admin, no mesmo curso, antes da importação.\n',
  resumo:
    'Escudo: duas aulas, roteiros, voz, ajuda, inventário e quatro projetos portáteis gerados.',
})
