/** Autoria local do Poder "A ponte apressada". Importação, gravação e publicação são etapas à parte. */
// A estrutura das aulas, o roteiro e os derivados saem do gerador comum dos Poderes (poder-gerador.ts).

import { gerarPoder } from './poder-gerador'
import { ponteAjuda, ponteAulas, ponteExperiencia } from './ponte-conteudo'
import { ponteChecks } from './ponte-criterios'
import { montarProjetoPonte, PONTE_CURSO, PONTE_ETAPAS, PONTE_IDS } from './ponte-projeto'
import { ponteQuiz2d, ponteQuiz3d } from './ponte-quiz'

const help = `# Passo a passo do projeto: A ponte apressada\n\nPoder do Faísca. Aqui está o que investigar na experiência e cada montagem das duas aulas: o que a regra faz, o caminho na paleta, o bloco, onde encaixar, como testar e o que conferir. Você pode consultar quantas vezes quiser.\n\n## ${ponteExperiencia.title}\n\n**A ideia:** ${ponteExperiencia.idea}\n\n**O que investigar:**\n\n${ponteExperiencia.goals.map((g) => `- ${g}`).join('\n')}\n\n${ponteExperiencia.observe}\n\n${ponteAulas
  .map(
    (a) =>
      `## ${a.dimension === '2d' ? 'Aula 1 · Jogo 2D' : 'Aula 2 · Ilha 3D'}: ${a.title}\n\n${ponteAjuda(
        a.dimension,
      )
        .map(
          (h) =>
            `### ${h.title}\n\n**Relembre:** ${h.idea}\n\n${h.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n**Teste:** ${h.test}\n\n**Se não funcionar:** ${h.correction}`,
        )
        .join('\n\n')}`,
  )
  .join(
    '\n\n',
  )}\n\n## Entrega\n\nEm cada aula, o envio fica na última montagem: Os avisos da ponte, na Aula 1, e Os avisos da ponte da ilha, na Aula 2. Antes de enviar, jogue uma partida inteira: atravesse a tempo, chegue atrasado e puxe a alavanca de novo. Toque na tecla R e confira que a ponte volta levantada. Clique em Verificar projeto e corrija o que faltar. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.\n\nDepois do envio vem o quiz da aula: escolha uma resposta em cada pergunta e veja a explicação. Você pode tentar de novo. Quando terminar, clique em Concluir aula. O Poder conta quando as duas aulas estão concluídas.\n`

await gerarPoder({
  nome: 'A ponte apressada',
  pasta: 'poder-a-ponte-apressada',
  prefixo: 'ponte',
  curso: PONTE_CURSO,
  etapas: PONTE_ETAPAS,
  idEtapas: PONTE_IDS,
  etapaFinal: 'atravessar',
  montarProjeto: montarProjetoPonte,
  checks: ponteChecks,
  quiz: { '2d': ponteQuiz2d, '3d': ponteQuiz3d },
  aulas: ponteAulas,
  idBase: 'fa15ca03',
  jogoPronto: {
    title: 'Jogue A ponte apressada',
    instrucoes: {
      // ⭐ 23/11/2026: como o vídeo da abertura, o que a alavanca faz fica para a criança descobrir.
      // Na ilha (27/11/2026), a regra já é da Aula 1: a criança só atravessa a tempo.
      '2d': 'Use as setas da tela ou, no computador, clique no jogo e use as setas do teclado. Descubra o que a alavanca faz e tente atravessar a ponte. A tecla R começa outra partida.',
      '3d': 'Clique no jogo e use as setas ou W, A, S e D. Encoste na alavanca e atravesse a ponte até a pedra do sino antes que ela suba. A tecla R começa outra partida.',
    },
  },
  experiencia: {
    kind: 'interactive',
    required: true,
    title: 'A ponte apressada',
    semPerguntaFinal: true,
    // ⭐ 08/11/2026 (proposta "Experiências do Faísca", aprovada): o personagem ANDA até a
    // alavanca e até a ponte, o relógio do jogo anda sozinho e onde ele começa é uma peça que
    // se troca. A instrução, as pistas e os pedidos falam a língua dessa tela.
    instructions:
      'Ande até a alavanca e até a ponte, olhe o relógio do jogo e troque onde ele começa. O Zappy te mostra o que testar, e você pode repetir quando quiser.',
    hints: [
      'Olhe a ponte e o relógio do jogo antes e depois de cada teste.',
      'Compare ir até a ponte antes de puxar a alavanca, logo depois de puxar e quando o relógio já chegou a 4. Compare também o relógio começando com a partida.',
      'Ande até a ponte sem puxar a alavanca. Ande até a alavanca e corra até a ponte. Jogue de novo, puxe a alavanca e espere o relógio chegar a 4; saia e volte à alavanca. Troque a peça para "quando a partida começa", puxe a alavanca e espere.',
    ],
    activity: {
      type: 'experimentation',
      scene: 'timed-bridge',
      cenario: 'farol',
      setup: {
        freeExploration: true,
        // O "Ainda falta" e o relatório da equipe com os botões desta tela.
        goalCopy: {
          'closed-start': { pedido: 'Ande até a ponte antes de puxar a alavanca.' },
          'lever-opens': { pedido: 'Ande até a alavanca e olhe a ponte.' },
          'in-time': {
            pedido: 'Puxe a alavanca e chegue à ponte antes de o relógio chegar a 4.',
          },
          'rises-alone': { pedido: 'Puxe a alavanca e espere o relógio chegar a 4.' },
          'pull-again': {
            pedido: 'Depois que a ponte subir sozinha, saia e volte à alavanca.',
          },
          'timer-place': {
            label: 'Com o relógio começando junto com a partida, a ponte não subiu mais',
            pedido:
              'Troque a peça para "quando a partida começa", puxe a alavanca e espere 4 segundos.',
          },
        },
      },
    },
  },
  cenaDoZappy: 'timed-bridge',
  passoAPasso: help,
  modulos:
    '# A ponte apressada\n\n**Título do curso:** A ponte apressada\n\n**Descrição curta:** Puxe a alavanca e atravesse antes que a ponte suba: programe um tempo que desfaz a ação sozinho, em 2D e em 3D.\n\n**Descrição longa:** Um Poder do posto Faísca. A alavanca baixa uma ponte levadiça, e 4 segundos depois ela sobe sozinha. Com a ponte baixada, o personagem atravessa até a pedra do sino, no meio de um laguinho. Você programa a alavanca, o "depois de 4 segundos" e a travessia, primeiro no Farol 2D e depois na Ilha 3D, com menos instruções. Cada aula termina com o projeto enviado. Este curso não concede certificado.\n\n## Módulo 1 · A ponte apressada\n\n**Resumo:** Baixe a ponte com a alavanca, faça ela subir sozinha depois de 4 segundos e deixe o personagem atravessar só enquanto ela está baixada. Primeiro no Farol 2D, depois na Ilha 3D; a última montagem de cada aula envia o projeto.\n\n' +
    ponteAulas
      .map(
        (a, i) =>
          `### Aula ${i + 1}. ${a.title}\n\nIdentificador: ${a.slug}. Dimensão: ${a.dimension.toUpperCase()}.\n\n${a.trechos.map((t, n) => `${n + 1}. ${t.title}.`).join('\n')}\n\n[Manifesto](ponte-${a.slug}.manifesto.json) · [Roteiro](ponte-${a.slug}.roteiro.md).`,
      )
      .join('\n\n') +
    '\n\nUma entrega por aula, na última montagem; o quiz vem depois do envio e fecha a aula. O Poder conta com as duas aulas concluídas. Sem certificado nem publicação na comunidade. Produzir e anexar a mídia real antes de publicar; publicar o curso só depois da `aula-2`.\n\nPoder 3 do posto Faísca (`jornada-faisca-poder-3`). Módulo: **A ponte apressada**. Preservar o ID do curso, do módulo reservado e da `aula-1`; a `aula-2` é criada no Admin, no mesmo curso, antes da importação.\n',
  resumo:
    'Ponte: duas aulas, roteiros, voz, ajuda, inventário e quatro projetos portáteis gerados.',
})
