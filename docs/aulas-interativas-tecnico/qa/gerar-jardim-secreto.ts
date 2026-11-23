/**
 * Autoria local da missão "O Jardim Secreto". Importação, gravação e publicação são etapas à parte.
 * A estrutura das aulas, o roteiro e os derivados saem do gerador comum dos Poderes (poder-gerador.ts),
 * aqui sem a experiência e sem o quiz. Desde 24/11/2026 é uma missão do posto: o vídeo mostra o que o
 * jogo precisa fazer, sem montar, e o Passo a passo chega no fim de cada aula, depois do envio.
 */
import { jardimAjuda, jardimAulas } from './jardim-conteudo'
import { jardimChecks } from './jardim-criterios'
import { JARDIM_CURSO, JARDIM_ETAPAS, montarProjetoJardim } from './jardim-projeto'
import { gerarPoder } from './poder-gerador'

const help = `# Passo a passo do projeto: O Jardim Secreto\n\nMissão do Faísca. Aqui está um jeito de montar cada etapa das duas aulas: o que a regra faz, o caminho na paleta, o bloco, onde encaixar, como testar e o que conferir. Ele chega no fim de cada aula, depois do envio, para conferir o jogo e entender cada escolha. O seu jeito pode ser diferente e estar certo também.\n\n${jardimAulas
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
  )}\n\n## Entrega\n\nEm cada aula, o envio fecha a última montagem, a do lugar do regador. Antes de enviar, jogue uma partida inteira: vá à flor sem o regador e depois com ele. Toque na tecla R e confira que o regador volta e a flor volta fechada.\n\nDepois clique em Verificar projeto e corrija o que faltar. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar.\n\nQuando aparecer Projeto enviado!, clique em Próxima parte: lá está este Passo a passo. Depois clique em Concluir aula.\n\nA missão conta quando as duas aulas estão concluídas. Ela não dá certificado nem promove sozinha: a jornada também confere os dois cursos-base e um Poder.\n`

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
  quiz: {},
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
  notaDeProducao:
    'Missão do posto: o vídeo mostra o que o jogo precisa fazer (o jogo do começo da etapa e as animações da edição) e diz em que aula do curso base aquilo foi ensinado. Nenhum bloco é montado nem enviado no vídeo; o Estúdio fica aberto para a criança.',
  ajuda:
    'Sem dicas: quem tiver dúvida volta na aula do curso base; o Passo a passo do projeto chega no fim da aula, depois do envio',
  passoAPasso: help,
  modulos:
    '# O Jardim Secreto: organização do curso\n\nMissão do posto Faísca. Módulo: **Faça o jardim florescer**. Renomear o módulo reservado Plano de produção, preservando seu ID e as duas aulas reservadas.\n\n' +
    jardimAulas
      .map(
        (a, i) =>
          `## Aula ${i + 1}. ${a.title}\n\nIdentificador: ${a.slug}. Dimensão: ${a.dimension.toUpperCase()}.\n\n${a.trechos.map((t, n) => `${n + 1}. ${t.title}.`).join('\n')}\n\n[Manifesto](${a.slug}.manifesto.json) · [Roteiro](${a.slug}.roteiro.md).`,
      )
      .join('\n\n') +
    '\n\nUma entrega por aula, na última montagem (a do lugar do regador); depois do envio, a última parte entrega o Passo a passo do projeto. Sem dicas nem quiz. A missão conta com as duas aulas concluídas. Na publicação, anexar o PDF nas duas aulas sem a marca de caderno do Zappy. Sem certificado nem publicação na comunidade. Produzir e anexar a mídia real antes de publicar.\n',
  resumo:
    'Jardim: duas aulas, roteiros, voz, ajuda, inventário e quatro projetos portáteis gerados.',
})
