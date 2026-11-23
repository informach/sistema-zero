/**
 * Autoria local da missão "O Jardim Secreto". Importação, gravação e publicação são etapas à parte.
 * A estrutura das aulas, o roteiro e os derivados saem do gerador comum dos Poderes (poder-gerador.ts),
 * que tem o mesmo esqueleto, aqui sem a experiência.
 */
import { jardimAjuda, jardimAulas } from './jardim-conteudo'
import { jardimChecks } from './jardim-criterios'
import { JARDIM_CURSO, JARDIM_ETAPAS, montarProjetoJardim } from './jardim-projeto'
import { jardimQuiz } from './jardim-quiz'
import { gerarPoder } from './poder-gerador'

const help = `# Passo a passo do projeto: O Jardim Secreto\n\nMissão do Faísca. Aqui está cada montagem das duas aulas: o que a regra faz, o caminho na paleta, o bloco, onde encaixar, como testar e o que conferir. Você pode consultar quantas vezes quiser.\n\n${jardimAulas
  .map(
    (a) =>
      `## ${a.title}\n\n${jardimAjuda(a.dimension)
        .map(
          (h) =>
            `### ${h.title}\n\n**Relembre:** ${h.idea}\n\n${h.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n**Teste:** ${h.test}\n\n**Se não funcionar:** ${h.correction}`,
        )
        .join('\n\n')}`,
  )
  .join(
    '\n\n',
  )}\n\n## Entrega\n\nEm cada aula, o envio fecha a última montagem, a do lugar do regador. Antes de enviar, jogue uma partida inteira: vá à flor sem o regador e depois com ele. Toque na tecla R e confira que o regador volta e a flor volta fechada.\n\nDepois clique em Verificar projeto e corrija o que faltar. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar.\n\nNa Aula 1, quando aparecer Projeto enviado!, clique em Concluir aula. Na Aula 2, quando aparecer Projeto enviado!, clique em Próxima parte e responda às perguntas sobre o seu jardim. Quando terminar, clique em Concluir aula.\n\nA missão conta quando as duas aulas estão concluídas. Ela não dá certificado nem promove sozinha: a jornada também confere os dois cursos-base e um Poder.\n`

await gerarPoder({
  nome: 'O Jardim Secreto',
  pasta: 'o-jardim-secreto',
  prefixo: 'jardim',
  arquivoDaAula: (slug) => slug,
  tipo: 'Missão do Faísca',
  curso: JARDIM_CURSO,
  etapas: JARDIM_ETAPAS,
  etapaFinal: 'posicao',
  montarProjeto: montarProjetoJardim,
  checks: jardimChecks,
  quiz: { '3d': jardimQuiz },
  aulas: jardimAulas,
  idBase: 'fa15ca00',
  jogoPronto: {
    title: 'Jogue O Jardim Secreto',
    instrucoes: {
      '2d': 'Use as setas da tela ou, com um clique no jogo, as setas do teclado. Pegue o regador e leve o personagem até a flor. R começa outra partida. Você pode seguir sem terminar.',
      '3d': 'Clique no jogo e use as setas ou W, A, S e D. Pegue o regador e leve o personagem até a flor. R começa outra partida. Você pode seguir sem terminar.',
    },
    palco: { '2d': { width: 960, height: 600 }, '3d': { width: 960, height: 600 } },
  },
  passoAPasso: help,
  modulos:
    '# O Jardim Secreto: organização do curso\n\nMissão do posto Faísca. Módulo: **Faça o jardim florescer**. Renomear o módulo reservado Plano de produção, preservando seu ID e as duas aulas reservadas.\n\n' +
    jardimAulas
      .map(
        (a, i) =>
          `## Aula ${i + 1}. ${a.title}\n\nIdentificador: ${a.slug}. Dimensão: ${a.dimension.toUpperCase()}.\n\n${a.trechos.map((t, n) => `${n + 1}. ${t.title}.`).join('\n')}\n\n[Manifesto](${a.slug}.manifesto.json) · [Roteiro](${a.slug}.roteiro.md).`,
      )
      .join('\n\n') +
    '\n\nUma entrega por aula, na última montagem (a do lugar do regador); na Aula 2, o quiz fecha a aula depois do envio. A missão conta com as duas aulas concluídas. Sem certificado nem publicação na comunidade. Produzir e anexar a mídia real antes de publicar.\n',
  resumo:
    'Jardim: duas aulas, roteiros, voz, ajuda, inventário e quatro projetos portáteis gerados.',
})
