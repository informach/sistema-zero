/** Autoria local do Poder "Inimigo que atira" (Construtor). Importação, gravação e publicação são etapas à parte. */
// A estrutura das aulas, o roteiro e os derivados saem do gerador comum dos Poderes (poder-gerador.ts).

import { inimigoAjuda, inimigoAulas, inimigoExperiencia } from './inimigo-conteudo'
import { inimigoChecks } from './inimigo-criterios'
import { INIMIGO_CURSO, INIMIGO_ETAPAS, montarProjetoInimigo } from './inimigo-projeto'
import { inimigoQuiz2d, inimigoQuiz3d } from './inimigo-quiz'
import { gerarPoder } from './poder-gerador'

const aulas = inimigoAulas()

const help = `# Passo a passo do projeto: Inimigo que atira\n\nPoder do Construtor. Aqui está o que investigar na experiência e cada montagem das duas aulas: o que a regra faz, o caminho na paleta, o bloco, onde encaixar e como testar. Você pode consultar quantas vezes quiser.\n\n## ${inimigoExperiencia.title}\n\n**A ideia:** ${inimigoExperiencia.idea}\n\n**O que investigar:**\n\n${inimigoExperiencia.goals.map((g) => `- ${g}`).join('\n')}\n\n${inimigoExperiencia.observe}\n\n${aulas
  .map(
    (a) =>
      `## ${a.dimension === '2d' ? 'Aula 1 · Nave Contra Asteroides (2D)' : 'Aula 2 · Patrulha Espacial (3D)'}: ${a.title}\n\n${inimigoAjuda(
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
  )}\n\n## Entrega\n\nEm cada aula, o envio fecha a última montagem, a da limpeza dos tiros. Antes de enviar, jogue uma partida: veja os tiros saírem da inimiga, deixe um tiro acertar a nave e recomece a partida. Clique em Verificar projeto e corrija o que faltar. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte. Depois vem o quiz da aula: escolha uma resposta, observe a explicação e, quando terminar, clique em Concluir aula. O Poder conta quando as duas aulas estão concluídas.\n`

await gerarPoder({
  nome: 'Inimigo que atira',
  pasta: 'poder-inimigo-que-atira',
  trilha: 'construtor',
  prefixo: 'inimigo',
  tipo: 'Poder do Construtor',
  curso: INIMIGO_CURSO,
  etapas: INIMIGO_ETAPAS,
  etapaFinal: 'limpeza',
  montarProjeto: montarProjetoInimigo,
  checks: inimigoChecks,
  quiz: { '2d': inimigoQuiz2d, '3d': inimigoQuiz3d },
  aulas,
  idBase: 'c0e5c003',
  jogoPronto: {
    title: 'Jogue contra a inimiga',
    instrucoes: {
      '2d': 'Clique no jogo e aperte Enter. As setas movem a nave e o Espaço dispara. Desvie dos tiros da nave inimiga, lá em cima, e acerte os asteroides. Você pode seguir sem terminar.',
      '3d': 'Clique no jogo e aperte Enter. As setas movem a nave e o Espaço dispara. Desvie dos tiros da inimiga, que vem lá da frente. Você pode seguir sem terminar.',
    },
    palco: { '2d': { width: 800, height: 480 }, '3d': { width: 960, height: 600 } },
  },
  experiencia: {
    kind: 'interactive',
    required: true,
    title: 'A inimiga que atira',
    semPerguntaFinal: true,
    instructions:
      'Escolha a Origem do tiro e clique em Avançar até o próximo tiro. Olhe de onde cada tiro sai, o que acontece quando um tiro chega até a nave e o que Recomeçar a partida faz. O Zappy te mostra o que testar, e você pode repetir quando quiser.',
    hints: [
      'Olhe onde a inimiga está a cada tiro e de onde o tiro sai. O que muda com a Origem do tiro?',
      'Compare dois tiros com a origem No meio e dois tiros com a origem Na inimiga. Depois deixe um tiro chegar até a nave e recomece a partida com tiros no ar.',
      'Com a origem No meio, clique em Avançar até o próximo tiro duas vezes. Depois escolha Na inimiga e clique em Avançar até o próximo tiro mais duas vezes. Deixe um tiro chegar até a nave e, com tiros no ar, clique em Recomeçar a partida.',
    ],
    activity: {
      type: 'experimentation',
      scene: 'enemy-fire',
      cast: { hero: { name: 'nave', gender: 'f' }, obstacle: { name: 'asteroide', gender: 'm' } },
      cenario: 'nave',
      setup: {
        freeExploration: true,
        goals: ['fixed-origin', 'enemy-origin', 'shot-hurts', 'restart-clears'],
        goalCopy: {
          'fixed-origin': {
            label: 'Com a origem no meio, todo tiro sai do mesmo lugar',
            pedido:
              'Com a origem No meio, clique em Avançar até o próximo tiro duas vezes. Veja de onde os tiros saem.',
          },
          'enemy-origin': {
            label: 'Na inimiga, o tiro sai de onde ela está',
            pedido:
              'Escolha Na inimiga e clique em Avançar até o próximo tiro duas vezes. Compare de onde os tiros saem.',
          },
          'shot-hurts': {
            label: 'O tiro que encosta na nave sai e tira uma vida',
            pedido:
              'Deixe um tiro chegar até a nave e olhe as Vidas. Se precisar, escolha Nave à esquerda, Nave no meio ou Nave à direita.',
          },
          'restart-clears': {
            label: 'Recomeçar a partida limpa os tiros',
            pedido: 'Com tiros no ar, clique em Recomeçar a partida e olhe os tiros e as Vidas.',
          },
        },
      },
    },
  },
  cenaDoZappy: 'enemy-fire',
  notaDoTeclado3D:
    'O jogo é de teclado: o robô dá o foco ao jogo (Rodar de novo no Estúdio, ou um toque no jogo pronto) antes das teclas. A inimiga atira a cada 1,5 s desde que o jogo abre; as esperas no Na tela são estimativas e se acertam no Verificar plano. ',
  ajuda: 'Ajuda livre no Passo a passo do projeto',
  passoAPasso: help,
  modulos:
    '# Inimigo que atira\n\n**Título do curso:** Inimigo que atira\n\n**Descrição curta:** Ponha no jogo uma nave inimiga que atira de onde está, com tiros que machucam e saem da tela, em 2D e em 3D.\n\n**Descrição longa:** Um Poder do posto Construtor. Você acrescenta um inimigo com tiros próprios ao jogo que montou na trilha: um relógio cria os tiros, a posição da inimiga decide de onde eles saem, o encontro com a nave tira vida e quem sai da tela sai do grupo. Na primeira aula a inimiga nasce na Nave Contra Asteroides, em 2D; na segunda você a monta de novo na Patrulha Espacial, em 3D. Cada aula termina com o projeto enviado. Este curso não concede certificado.\n\n## Módulo 1 · Inimigo que atira\n\n**Resumo:** Uma inimiga com tiros próprios: o relógio, a origem, o dano e a limpeza. Primeiro em 2D, depois em 3D; a última montagem de cada aula envia o projeto.\n\n' +
    aulas
      .map(
        (a, i) =>
          `### Aula ${i + 1}. ${a.title}\n\nIdentificador: ${a.slug}. Dimensão: ${a.dimension.toUpperCase()}.\n\n${a.trechos.map((t, n) => `${n + 1}. ${t.title}.`).join('\n')}\n\n[Manifesto](inimigo-${a.slug}.manifesto.json) · [Roteiro](inimigo-${a.slug}.roteiro.md).`,
      )
      .join('\n\n') +
    '\n\nUma entrega por aula, na última construção, e o quiz depois dela. O Poder conta com as duas aulas concluídas. Sem certificado nem publicação na comunidade. Produzir e anexar a mídia real antes de publicar; publicar o curso só depois da `aula-2`.\n\nPoder 3 do posto Construtor (`jornada-construtor-poder-3`). Módulo: **Inimigo que atira**. Preservar o ID do curso, do módulo reservado e das aulas `aula-1` e `aula-2`, já reservadas.\n',
  resumo:
    'Inimigo que atira: duas aulas, roteiros, voz, ajuda, inventário e quatro projetos portáteis gerados.',
})
