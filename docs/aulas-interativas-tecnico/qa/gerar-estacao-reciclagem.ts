/**
 * Autoria local da missão do Construtor, "A Estação de Reciclagem". Importação, gravação e
 * publicação são etapas à parte. A estrutura das aulas, o roteiro e os derivados saem do gerador
 * comum (`poder-gerador.ts`), sem experiência e sem quiz, como a missão do Faísca (O Jardim
 * Secreto): missão do posto, o vídeo mostra o que o jogo precisa fazer, sem montar, e o Passo a
 * passo chega no fim da Aula 1 (2D), depois do envio.
 *
 *   bun docs/aulas-interativas-tecnico/qa/gerar-estacao-reciclagem.ts
 */
import { estacaoAjuda, estacaoAulas } from './estacao-conteudo'
import { estacaoChecks } from './estacao-criterios'
import {
  ESTACAO_CURSO,
  ESTACAO_ETAPAS,
  ESTACAO_REGRAS,
  montarProjetoEstacao,
} from './estacao-projeto'
import { gerarPoder } from './poder-gerador'

const R2 = ESTACAO_REGRAS['2d']
const R3 = ESTACAO_REGRAS['3d']

export const ESTACAO_PASSO_A_PASSO = `# Passo a passo do projeto: A Estação de Reciclagem\n\nMissão do Construtor. Aqui está um jeito de montar cada etapa das duas aulas: o que a regra faz, os blocos, onde encaixar, como testar e o que conferir. Ele chega no fim da Aula 1, depois do envio, para conferir o jogo e entender cada escolha. O seu jeito pode ser diferente e estar certo também.\n\n${estacaoAulas
  .map(
    (a) =>
      `## ${a.title}\n\n${estacaoAjuda(a.dimension)
        .map(
          (h) =>
            `### ${h.title}\n\n**Relembre:** ${h.idea}\n\n${h.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n**Teste:** ${h.test}\n\n**Se não funcionar:** ${h.correction}`,
        )
        .join('\n\n')}`,
  )
  .join(
    '\n\n',
  )}\n\n## Entrega\n\nEm cada aula, o envio fecha a última etapa, a da meta nova. Antes de enviar, jogue uma partida inteira: espere na abertura sem nada nascer, aperte Enter, recolha recicláveis numa esteira da borda e deixe uma pilha chegar no meio. Depois teste os dois finais.\n\nClique em Verificar projeto e corrija o que faltar. Quando aparecer Objetivo cumprido!, clique em Enviar meu projeto e confirme em Enviar.\n\nQuando aparecer Projeto enviado!, clique em Próxima parte. Na Aula 1, lá está este Passo a passo; na Aula 2, a última parte comemora a missão cumprida. Depois clique em Concluir aula.\n\nA missão conta quando as duas aulas estão concluídas. Ela não dá certificado nem promove sozinha: a jornada também confere os dois cursos da trilha e dois Poderes.\n`

await gerarPoder({
  nome: 'A Estação de Reciclagem',
  trilha: 'construtor',
  pasta: 'estacao-de-reciclagem',
  prefixo: 'estacao',
  arquivoDaAula: (slug) => slug,
  tipo: 'Missão do Construtor',
  curso: ESTACAO_CURSO,
  etapas: ESTACAO_ETAPAS,
  etapaFinal: 'meta-nova',
  montarProjeto: montarProjetoEstacao,
  checks: estacaoChecks,
  quiz: {},
  aulas: estacaoAulas,
  idBase: 'c0e5ac00',
  jogoPronto: {
    title: 'Jogue A Estação de Reciclagem',
    instrucoes: {
      '2d': `Clique no jogo e aperte Enter. As setas movem o coletor: recolha as peças do aro verde e desvie das pilhas e lâmpadas, as do aro vermelho. Junte ${R2.meta} peças antes de perder as três vidas. Você pode seguir sem terminar.`,
      '3d': `Clique no jogo e aperte Enter. As setas movem o coletor no galpão: recolha as peças do aro verde e desvie das pilhas e lâmpadas. Junte ${R3.meta} peças antes de perder as três vidas. Você pode seguir sem terminar.`,
    },
    palco: { '2d': { width: 800, height: 480 }, '3d': { width: 960, height: 600 } },
  },
  notaDeProducao:
    'Missão do posto: o vídeo mostra o que o jogo precisa fazer (o jogo do começo da etapa e as animações da edição) e diz em que aula do curso base aquilo foi ensinado. Nenhum bloco é montado nem enviado no vídeo; o Estúdio fica aberto para a criança.',
  notaDoTeclado3D:
    'O jogo é de teclado: o robô dá o foco ao jogo (Rodar de novo no Estúdio, ou um toque no jogo pronto) antes de apertar Enter e segurar as setas. O coletor anda 7 unidades por segundo e chega à borda em menos de 1 s; os tempos das setas se acertam no Verificar plano. ',
  ajuda:
    'Sem dicas: quem tiver dúvida volta na aula do curso base; o Passo a passo do projeto chega no fim da Aula 1, depois do envio',
  passoAPasso: ESTACAO_PASSO_A_PASSO,
  modulos:
    '# A Estação de Reciclagem\n\n**Título do curso:** A Estação de Reciclagem\n\n**Descrição curta:** A missão do Construtor: programe sozinho a esteira de reciclagem, com pontos, vidas e os dois finais, em 2D e no galpão 3D.\n\n**Descrição longa:** A missão do posto Construtor. Uma esteira traz peças recicláveis e pilhas e lâmpadas, que não podem ir para a reciclagem comum. Você programa sozinho os relógios que trazem as peças, o coletor que recolhe as certas e perde vida com as outras, o placar, a vitória e a derrota, primeiro numa tela plana e depois num galpão em três dimensões. Cada etapa mostra o que o jogo precisa fazer e diz em qual aula da Nave Contra Asteroides ou da Patrulha Espacial você aprendeu aquilo. No fim, a equipe pede uma meta nova. O Passo a passo do projeto chega no fim da primeira aula, depois do envio. Este curso não concede certificado.\n\n## Módulo 1 · Monte a estação\n\n**Resumo:** A missão do Construtor. Programe sozinho a partida da esteira de reciclagem, primeiro em 2D e depois no galpão 3D. Cada etapa mostra o que o jogo precisa fazer e em que aula você aprendeu, e a última, a meta nova pedida pela equipe, envia o projeto.\n\n' +
    estacaoAulas
      .map(
        (a, i) =>
          `### Aula ${i + 1}. ${a.title}\n\nIdentificador: ${a.slug}. Dimensão: ${a.dimension.toUpperCase()}.\n\n${a.trechos.map((t, n) => `${n + 1}. ${t.title}.`).join('\n')}\n\n[Manifesto](${a.slug}.manifesto.json) · [Roteiro](${a.slug}.roteiro.md).`,
      )
      .join('\n\n') +
    '\n\nUma entrega por aula, na última etapa (a meta nova); depois do envio, a última parte da Aula 1 entrega o Passo a passo do projeto, e a da Aula 2 comemora a missão cumprida. Sem dicas nem quiz. A missão conta com as duas aulas concluídas. Na publicação, anexar o PDF só na Aula 1, marcado como caderno do aluno para o Zappy. Sem certificado nem publicação na comunidade. Produzir e anexar a mídia real antes de publicar.\n\nMissão do posto Construtor. Módulo: **Monte a estação**. Renomear o módulo reservado Plano de produção, preservando seu ID e as duas aulas reservadas.\n',
  resumo:
    'Estação de Reciclagem: duas aulas, roteiros, voz, ajuda, inventário e quatro projetos portáteis gerados.',
})
