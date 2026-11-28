/** Autoria local do Poder "Troca de arma" (Construtor). Importação, gravação e publicação são etapas à parte. */
// A estrutura das aulas, o roteiro e os derivados saem do gerador comum dos Poderes (poder-gerador.ts).

import { armaAjuda, armaAulas, armaExperiencia } from './arma-conteudo'
import { armaChecks } from './arma-criterios'
import { ARMA_CURSO, ARMA_ETAPAS, montarProjetoArma } from './arma-projeto'
import { armaQuiz2d, armaQuiz3d } from './arma-quiz'
import { gerarPoder } from './poder-gerador'

const aulas = armaAulas()

const help = `# Passo a passo do projeto: Troca de arma\n\nPoder do Construtor. Aqui está o que investigar na experiência e cada montagem das duas aulas: o que a regra faz, o caminho na paleta, o bloco, onde encaixar e como testar. Você pode consultar quantas vezes quiser.\n\n## ${armaExperiencia.title}\n\n**A ideia:** ${armaExperiencia.idea}\n\n**O que investigar:**\n\n${armaExperiencia.goals.map((g) => `- ${g}`).join('\n')}\n\n${armaExperiencia.observe}\n\n${aulas
  .map(
    (a) =>
      `## ${a.dimension === '2d' ? 'Aula 1 · Nave Contra Asteroides (2D)' : 'Aula 2 · Patrulha Espacial (3D)'}: ${a.title}\n\n${armaAjuda(
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
  )}\n\n## Entrega\n\nEm cada aula, o envio fecha a última montagem, a do Espaço que pergunta a arma. Antes de enviar, jogue uma partida: aperte E antes do item, pegue o item e troque, dispare com as duas armas e comece uma partida nova. Clique em Verificar projeto e corrija o que faltar. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte. Depois vem o quiz da aula: escolha uma resposta, observe a explicação e, quando terminar, clique em Concluir aula. O Poder conta quando as duas aulas estão concluídas.\n`

await gerarPoder({
  nome: 'Troca de arma',
  pasta: 'poder-troca-de-arma',
  trilha: 'construtor',
  prefixo: 'arma',
  tipo: 'Poder do Construtor',
  curso: ARMA_CURSO,
  etapas: ARMA_ETAPAS,
  etapaFinal: 'disparo',
  montarProjeto: montarProjetoArma,
  checks: armaChecks,
  quiz: { '2d': armaQuiz2d, '3d': armaQuiz3d },
  aulas,
  idBase: 'c0e5c005',
  jogoPronto: {
    title: 'Troque de arma',
    instrucoes: {
      '2d': 'Clique no jogo e aperte Enter. As setas movem a nave e o Espaço dispara. Pegue o item roxo que cai pelo meio, aperte E e dispare com o plasma. Você pode seguir sem terminar.',
      '3d': 'Clique no jogo e aperte Enter. As setas movem a nave e o Espaço dispara. O item vem pela esquerda: pegue, aperte E e dispare com o plasma. Você pode seguir sem terminar.',
    },
    palco: { '2d': { width: 800, height: 480 }, '3d': { width: 960, height: 600 } },
  },
  experiencia: {
    kind: 'interactive',
    required: true,
    title: 'A troca de arma',
    semPerguntaFinal: true,
    instructions:
      'Aperte E antes e depois de pegar o item, dispare com as duas armas e comece uma partida nova. O Zappy te mostra o que testar, e você pode repetir quando quiser.',
    hints: [
      'Olhe a placa da arma antes e depois de cada tecla.',
      'Compare a tecla E antes e depois do item. Depois dispare com o laser e com o plasma.',
      'Aperte E antes do item e veja a arma. Pegue o item, aperte E e dispare. Com o plasma escolhido, comece uma partida nova e olhe a arma.',
    ],
    activity: {
      type: 'experimentation',
      scene: 'weapon-swap',
      cast: { hero: { name: 'nave', gender: 'f' }, obstacle: { name: 'asteroide', gender: 'm' } },
      cenario: 'nave',
      setup: {
        freeExploration: true,
        goals: ['locked', 'unlocked-swap', 'shot-follows', 'new-match-laser'],
      },
    },
  },
  cenaDoZappy: 'weapon-swap',
  notaDoTeclado3D:
    'O jogo é de teclado: o robô dá o foco ao jogo (Rodar de novo no Estúdio, ou um toque no jogo pronto) antes das teclas. O item nasce a cada 4 s desde que o jogo abre, pela esquerda no 3D: o robô leva a nave à borda antes de esperar; as esperas no Na tela são estimativas e se acertam no Verificar plano. ',
  ajuda: 'Ajuda livre no Passo a passo do projeto',
  passoAPasso: help,
  modulos:
    '# Troca de arma\n\n**Título do curso:** Troca de arma\n\n**Descrição curta:** Dê à nave duas armas: um item libera o plasma, a tecla E troca e o Espaço pergunta qual arma está na mão, em 2D e em 3D.\n\n**Descrição longa:** Um Poder do posto Construtor. Você acrescenta um estado de equipamento ao jogo que montou na trilha: uma variável guarda a arma, um item libera a troca, a tecla E troca entre o laser e o plasma, a placa mostra a arma e o Espaço cria o tiro da arma escolhida. Uma partida nova volta ao laser. Na primeira aula a troca nasce na Nave Contra Asteroides, em 2D; na segunda você a monta de novo na Patrulha Espacial, em 3D. Cada aula termina com o projeto enviado. Este curso não concede certificado.\n\n## Módulo 1 · Troca de arma\n\n**Resumo:** Duas armas para a nave: o item, a troca, a placa e o Espaço que pergunta. Primeiro em 2D, depois em 3D; a última montagem de cada aula envia o projeto.\n\n' +
    aulas
      .map(
        (a, i) =>
          `### Aula ${i + 1}. ${a.title}\n\nIdentificador: ${a.slug}. Dimensão: ${a.dimension.toUpperCase()}.\n\n${a.trechos.map((t, n) => `${n + 1}. ${t.title}.`).join('\n')}\n\n[Manifesto](arma-${a.slug}.manifesto.json) · [Roteiro](arma-${a.slug}.roteiro.md).`,
      )
      .join('\n\n') +
    '\n\nUma entrega por aula, na última construção, e o quiz depois dela. O Poder conta com as duas aulas concluídas. Sem certificado nem publicação na comunidade. Produzir e anexar a mídia real antes de publicar; publicar o curso só depois da `aula-2`.\n\nPoder 5 do posto Construtor (`jornada-construtor-poder-5`). Módulo: **Troca de arma**. Preservar o ID do curso, do módulo reservado e das aulas `aula-1` e `aula-2`, já reservadas.\n',
  resumo:
    'Troca de arma: duas aulas, roteiros, voz, ajuda, inventário e quatro projetos portáteis gerados.',
})
