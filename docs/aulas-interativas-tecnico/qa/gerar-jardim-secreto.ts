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

const help = `# Passo a passo do projeto — O Jardim Secreto\n\nMissão Faísca. Ajuda opcional: comece pelo resultado, relembre a ideia e abra a montagem se precisar. Você pode programar em outra ordem, repetir testes e escolher mensagens e posições.\n\n${jardimAulas
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
  )}\n\n## Entrega\n\nEm cada aula, verifique os objetivos, aguarde Salvo, clique em Enviar meu projeto e confirme em Enviar. Quando aparecer Projeto enviado!, clique em Concluir aula. Não precisa publicar na comunidade. Concluir a missão não concede certificado nem promove sozinho: a jornada também confere os dois cursos-base e um Poder distinto.\n`

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
      '2d': 'Clique no jogo e use as setas do teclado. Recolha o regador e leve o personagem à flor. R começa outra partida. Você pode seguir sem terminar.',
      '3d': 'Clique no jogo e use as setas do teclado. Recolha o regador e leve o personagem à flor. R começa outra partida. Você pode seguir sem terminar.',
    },
    palco: { '2d': { width: 960, height: 600 }, '3d': { width: 960, height: 600 } },
  },
  passoAPasso: help,
  modulos:
    '# O Jardim Secreto — organização do curso\n\nMissão do posto Faísca. Módulo: **Faça o jardim florescer**. Renomear o módulo reservado Plano de produção, preservando seu ID e as duas aulas reservadas.\n\n' +
    jardimAulas
      .map(
        (a, i) =>
          `## Aula ${i + 1}. ${a.title}\n\nIdentificador: ${a.slug}. Dimensão: ${a.dimension.toUpperCase()}.\n\n${a.trechos.map((t, n) => `${n + 1}. ${t.title}.`).join('\n')}\n\n[Manifesto](${a.slug}.manifesto.json) · [Roteiro](${a.slug}.roteiro.md).`,
      )
      .join('\n\n') +
    '\n\nUma entrega por aula. Sem certificado, Poder obrigatório ou publicação na comunidade. Produzir e anexar a mídia real antes de publicar.\n',
  resumo:
    'Jardim: duas aulas, roteiros, voz, ajuda, inventário e quatro projetos portáteis gerados.',
})
