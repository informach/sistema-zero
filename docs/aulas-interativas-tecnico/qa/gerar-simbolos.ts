/** Autoria local do Poder "O baú dos símbolos". Importação, gravação e publicação são etapas à parte. */
// A estrutura das aulas, o roteiro e os derivados saem do gerador comum dos Poderes (poder-gerador.ts).
import { simbolosAjuda, simbolosAulas, simbolosExperiencia } from './simbolos-conteudo'
import { simbolosChecks } from './simbolos-criterios'
import { simbolosQuiz2d, simbolosQuiz3d } from './simbolos-quiz'
import { montarProjetoSimbolos, SIMBOLOS_CURSO, SIMBOLOS_ETAPAS } from './simbolos-projeto'
import { gerarPoder } from './poder-gerador'

const help = `# Passo a passo do projeto — O baú dos símbolos\n\nPoder do Faísca. Aqui está o que investigar na experiência e cada montagem das duas aulas: o que a regra faz, o caminho na paleta, o bloco, onde encaixar, como testar e o que conferir. Você pode consultar quantas vezes quiser.\n\n## ${simbolosExperiencia.title}\n\n**A ideia:** ${simbolosExperiencia.idea}\n\n**O que investigar:**\n\n${simbolosExperiencia.goals.map((g) => `- ${g}`).join('\n')}\n\n${simbolosExperiencia.observe}\n\n${simbolosAulas
  .map(
    (a) =>
      `## ${a.dimension === '2d' ? 'Aula 1 · Jogo 2D' : 'Aula 2 · Ilha 3D'}: ${a.title}\n\n${simbolosAjuda(
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
  )}\n\n## Entrega\n\nEm cada aula, jogue uma partida inteira: abra o baú na ordem certa, erre a ordem e recomece pelo sol. Toque na tecla R e confira que o baú volta fechado.\n\nDepois clique em Verificar projeto e corrija o que faltar.\n\nPor fim, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula. O Poder conta quando as duas aulas estão concluídas.\n`

await gerarPoder({
  nome: 'O baú dos símbolos',
  pasta: 'poder-o-bau-dos-simbolos',
  prefixo: 'simbolos',
  numero: 4,
  curso: SIMBOLOS_CURSO,
  etapas: SIMBOLOS_ETAPAS,
  etapaFinal: 'estrela',
  montarProjeto: montarProjetoSimbolos,
  checks: simbolosChecks,
  quiz: { '2d': simbolosQuiz2d, '3d': simbolosQuiz3d },
  aulas: simbolosAulas,
  idBase: 'fa15ca04',
  jogoPronto: {
    title: 'Jogue O baú dos símbolos',
    instrucoes: {
      '2d': 'Clique no jogo e use as setas do teclado. Toque os símbolos na ordem da placa e abra o baú; depois erre a ordem. R começa outra partida. Você pode seguir sem terminar.',
      '3d': 'Clique no jogo e use as setas ou W, A, S e D. Toque os símbolos na ordem da placa e abra o baú; depois erre a ordem. R começa outra partida. Você pode seguir sem terminar.',
    },
  },
  experiencia: {
          kind: 'interactive',
          required: true,
          title: 'A ordem dos símbolos',
          semPerguntaFinal: true,
          // ⭐ 08/11/2026 (proposta "Experiências do Faísca", aprovada): o personagem ANDA até as
          // pedras, chegar numa pedra é tocar o símbolo, e como o baú decide é uma peça que se troca.
          instructions:
            'Ande até as pedras e toque os símbolos, na ordem da placa e fora dela, e troque como o baú decide. O Zappy te mostra o que testar, e você pode repetir quando quiser.',
          hints: [
            'Olhe o caderninho depois de cada símbolo: em que passo da placa você está?',
            'Compare a ordem da placa com um símbolo fora da vez: o que acontece com o passo e com os símbolos acesos?',
            'Toque o sol, a lua e a estrela, nessa ordem. Jogue de novo, toque o sol e vá à estrela por cima da lua. Comece pela lua. Erre e siga a placa de novo. Troque a peça para "só quantos foram tocados" e toque fora da ordem.',
          ],
          activity: {
            type: 'experimentation',
            scene: 'symbol-sequence',
            cenario: 'farol',
            setup: {
              freeExploration: true,
              goalCopy: {
                'step-moves': {
                  pedido: 'Ande até o sol e depois até a lua, olhando o caderninho.',
                },
                'right-order': { pedido: 'Toque o sol, a lua e a estrela, na ordem da placa.' },
                'out-of-turn': { pedido: 'Com o sol aceso, vá à estrela pulando a lua.' },
                'middle-start': { pedido: 'Jogue de novo e comece pela lua.' },
                'restart-works': {
                  pedido: 'Erre a ordem e, sem jogar de novo, siga a placa até o fim.',
                },
                'count-vs-order': {
                  label: 'No baú que só conta, a ordem errada também abriu',
                  // O motor só conta a comparação depois de o baú da ordem responder.
                  pedido:
                    'Com o baú da ordem já testado, troque a peça para "só quantos foram tocados" e toque os símbolos fora da ordem.',
                },
              },
            },
          },
        },
  cenaDoZappy: 'symbol-sequence',
  passoAPasso: help,
  modulos:
    '# O baú dos símbolos — organização do curso\n\nPoder 4 do posto Faísca (`jornada-faisca-poder-4`). Módulo: **O baú dos símbolos**. Preservar o ID do curso, do módulo reservado e da `aula-1`; a `aula-2` é criada no Admin, no mesmo curso, antes da importação.\n\n' +
    simbolosAulas
      .map(
        (a, i) =>
          `## Aula ${i + 1}. ${a.title}\n\nIdentificador: ${a.slug}. Dimensão: ${a.dimension.toUpperCase()}.\n\n${a.trechos.map((t, n) => `${n + 1}. ${t.title}.`).join('\n')}\n\n[Manifesto](simbolos-${a.slug}.manifesto.json) · [Roteiro](simbolos-${a.slug}.roteiro.md).`,
      )
      .join('\n\n') +
    '\n\nUma entrega por aula. O Poder conta com as duas aulas concluídas. Sem certificado nem publicação na comunidade. Produzir e anexar a mídia real antes de publicar; publicar o curso só depois da `aula-2`.\n',
  resumo: 'Baú dos símbolos: duas aulas, roteiros, voz, ajuda, inventário e quatro projetos portáteis gerados.',
})
