/** Autoria local do Poder "O segredo da cabana". Importação, gravação e publicação são etapas à parte. */
// A estrutura das aulas, o roteiro e os derivados saem do gerador comum dos Poderes (poder-gerador.ts).
import { cabanaAjuda, cabanaAulas, cabanaExperiencia } from './cabana-conteudo'
import { cabanaChecks } from './cabana-criterios'
import { CABANA_CURSO, CABANA_ETAPAS, montarProjetoCabana } from './cabana-projeto'
import { cabanaQuiz2d, cabanaQuiz3d } from './cabana-quiz'
import { gerarPoder } from './poder-gerador'

const help = `# Passo a passo do projeto: O segredo da cabana\n\nPoder do Faísca. Aqui está o que investigar na experiência e cada montagem das duas aulas: o que a regra faz, o caminho na paleta, o bloco, onde encaixar, como testar e o que conferir. Você pode consultar quantas vezes quiser.\n\n## ${cabanaExperiencia.title}\n\n**A ideia:** ${cabanaExperiencia.idea}\n\n**O que investigar:**\n\n${cabanaExperiencia.goals.map((g) => `- ${g}`).join('\n')}\n\n${cabanaExperiencia.observe}\n\n${cabanaAulas
  .map(
    (a) =>
      `## ${a.dimension === '2d' ? 'Aula 1 · Jogo 2D' : 'Aula 2 · Ilha 3D'}: ${a.title}\n\n${cabanaAjuda(
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
  )}\n\n## Entrega\n\nEm cada aula, o envio fecha a última montagem, a da cabana. Antes de enviar, jogue uma partida inteira e tente a cabana sem nenhuma peça, com uma peça só e com as duas. Toque na tecla R e confira que as peças voltam e a cabana volta fechada.\n\nDepois clique em Verificar projeto e corrija o que faltar. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Próxima parte.\n\nNa última parte de cada aula, responda às perguntas sobre a cabana. Quando terminar, clique em Concluir aula. O Poder conta quando as duas aulas estão concluídas.\n`

await gerarPoder({
  nome: 'O segredo da cabana',
  pasta: 'poder-o-segredo-da-cabana',
  prefixo: 'cabana',
  numero: 2,
  curso: CABANA_CURSO,
  etapas: CABANA_ETAPAS,
  etapaFinal: 'porta',
  montarProjeto: montarProjetoCabana,
  checks: cabanaChecks,
  quiz: { '2d': cabanaQuiz2d, '3d': cabanaQuiz3d },
  aulas: cabanaAulas,
  idBase: 'fa15ca02',
  jogoPronto: {
    title: 'Jogue O segredo da cabana',
    instrucoes: {
      '2d': 'Clique no jogo e use as setas do teclado. Tente a cabana sem nada, com uma peça e com as duas. R começa outra partida. Você pode seguir sem terminar.',
      '3d': 'Clique no jogo e use as setas ou W, A, S e D. Tente a cabana sem nada, com uma peça e com as duas. R começa outra partida. Você pode seguir sem terminar.',
    },
  },
  experiencia: {
    kind: 'interactive',
    required: true,
    title: 'A porta com duas peças',
    semPerguntaFinal: true,
    // ⭐ 08/11/2026 (proposta "Experiências do Faísca", aprovada): passar na chave ou no
    // emblema é pegar, chegar à porta é a cabana perguntar, e o "e" se troca por "ou".
    instructions:
      'Vá até a cabana sem nada, com uma peça ou com as duas e troque o "e" pelo "ou". O Zappy te mostra o que testar, e você pode repetir quando quiser.',
    hints: [
      'Olhe o caderninho antes de ir à cabana: quais peças o personagem tem?',
      'Compare a cabana sem nenhuma peça, com uma e com as duas. Jogue de novo e pegue as peças na outra ordem.',
      'Vá até a cabana sem nada. Pegue a chave e volte. Pegue o emblema e volte. Jogue de novo, pegue o emblema e a chave e vá à cabana. Troque o "e" pelo "ou" e leve uma peça só.',
    ],
    activity: {
      type: 'experimentation',
      scene: 'two-pieces',
      cenario: 'farol',
      setup: {
        freeExploration: true,
        goalCopy: {
          'none-closed': { pedido: 'Vá até a cabana antes de pegar qualquer peça.' },
          'one-closed': { pedido: 'Pegue uma peça só e vá até a cabana.' },
          'both-open': { pedido: 'Pegue as duas peças e vá até a cabana.' },
          'any-order': {
            pedido: 'Jogue de novo e pegue as peças na outra ordem antes de ir à cabana.',
          },
          'and-vs-or': {
            label: 'Com "ou", uma peça só já abriu',
            pedido: 'Troque o "e" pelo "ou", pegue uma peça só e vá até a cabana.',
          },
        },
      },
    },
  },
  cenaDoZappy: 'two-pieces',
  passoAPasso: help,
  modulos:
    '# O segredo da cabana: organização do curso\n\nPoder 2 do posto Faísca (`jornada-faisca-poder-2`). Módulo: **O segredo da cabana**. Preservar o ID do curso, do módulo reservado e da `aula-1`; a `aula-2` é criada no Admin, no mesmo curso, antes da importação.\n\n' +
    cabanaAulas
      .map(
        (a, i) =>
          `## Aula ${i + 1}. ${a.title}\n\nIdentificador: ${a.slug}. Dimensão: ${a.dimension.toUpperCase()}.\n\n${a.trechos.map((t, n) => `${n + 1}. ${t.title}.`).join('\n')}\n\n[Manifesto](cabana-${a.slug}.manifesto.json) · [Roteiro](cabana-${a.slug}.roteiro.md).`,
      )
      .join('\n\n') +
    '\n\nUma entrega por aula, na última montagem (a da cabana); depois dela, o quiz fecha a aula. O Poder conta com as duas aulas concluídas. Sem certificado nem publicação na comunidade. Produzir e anexar a mídia real antes de publicar; publicar o curso só depois da `aula-2`.\n',
  resumo:
    'Cabana: duas aulas, roteiros, voz, ajuda, inventário e quatro projetos portáteis gerados.',
})
