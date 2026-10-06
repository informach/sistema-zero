# Reestruturação de Corre, Dino! · 05/10/2026

Aplicação das diretrizes pedagógicas seguindo a revisão de Nave Contra Asteroides. O curso conserva suas 13 aulas e seus 13 programas originais. Foram reescritos os 39 arquivos de proposta, roteiro e manifesto, agora derivados de `corre-dino.conteudo.json` por `gerar-corre-dino.ts`.

## Resultado editorial

- 13 aulas, 81 seções e 76 vídeos planejados. A apresentação jogável e o caderno abrem a primeira aula de construção.
- 24 experiências antes das aplicações dos conceitos, com os testes obrigatórios escritos nas instruções. Sem palpite obrigatório nem pergunta final automática.
- Montagens separadas por ideia, com contexto do próprio jogo, destino visível antes de buscar a peça, caminhos da paleta, valores, teste e verificação intermediária.
- Cinco quizzes, nas aulas 3, 6, 9, 11 e 13, isolados de vídeo e ferramenta, com explicações para correção.
- Descrição acessível ensinada nas aulas 2 e 13 e exigida também na conferência de envio dessas aulas. Foram retiradas instruções para apagar montagens provisórias que esta versão não pede para construir.
- Caderno com 52 páginas, 145 representações de blocos, cores e rótulos reais e capa capturada do jogo original.

Na primeira aula, o Dino fica criado e ainda não desenhado, exatamente como no marco anterior. A experiência de criar e mostrar explica essa diferença antes da montagem. A aula termina com tela preparada, borda e objeto criado, não apenas uma apresentação. O desenho começa na aula 2.

A experiência de uma vez e sempre usa o preset existente que permite comparar a mesma peça de movimento nas duas áreas, com elenco e cenário do Dino. A descrição acessível desse componente foi ajustada para respeitar o elenco também no texto. O teste de renderização confere tanto Dino quanto Nave.

`corre-dino-projetos-qa.ts` não foi alterado. A cadeia `corre-dino`, os slugs `aula-01` a `aula-13`, as regras e os valores dos 13 marcos permanecem preservados. Os projetos iniciais são alternativas para quem não tem envio anterior, sem substituir o trabalho salvo. O [mapa do curso](../modulos-corre-dino.md) detalha resultados, escolhas e implantação.

## Verificações executadas

| Verificação | Resultado |
| --- | --- |
| `bun test docs/aulas-interativas/qa packages/core/tests/learning.test.ts` | **185 aprovados**, 3.298 asserções. Inclui 40 testes específicos do Dino: marcos originais, geração estável, continuidade, paletas, critérios, quizzes, abertura e as 24 instruções executadas no motor real. A descrição vazia é recusada no envio das aulas 2 e 13. |
| Em `packages/studio`: `bun test src/blockly/__tests__/correDinoEditorial.test.ts` | **24 aprovados**, 130 asserções. Carregamento no Blockly, compilação e execução dos 13 marcos, pulo, som, cactos, limpeza, estados, colisões, pontos, reinício e dificuldade. A referência anterior também passou antes da reescrita. |
| Em `packages/member-shell`: `bun test tests/scene-corre-dino-once.test.tsx` | **2 aprovados**. Figura e descrição corretas na comparação de movimento do Dino e da Nave. |
| `bun docs/aulas-interativas/qa/validar-manifestos.ts corre-dino` | 13 válidos, zero avisos, reprovações ou cenas ausentes. |
| `python -X utf8 docs/aulas-interativas/validar-roteiros.py corre-dino` | 13 roteiros, 76 clipes correspondentes aos manifestos, tempos consistentes. |
| `bun docs/como-fazer/validar.ts` | 42 tutoriais válidos; sugestão não bloqueante de imagem no tutorial de envio pela galeria. |
| `bunx tsc --noEmit -p packages/core/tsconfig.json` | Aprovado. |
| Biome nos dez arquivos TypeScript envolvidos | Aprovado, sem ajustes pendentes. |
| `python -X utf8 docs/aulas-interativas/recursos/corre-dino/gerar-materiais.py` | PDF com 52 páginas e 145 blocos; fontes, imagens, cores e limites conferidos. |
| `git diff --check` nos arquivos do escopo | Aprovado; referência original sem diferença. |

O PDF foi renderizado e suas 52 páginas foram inspecionadas visualmente. A revisão corrigiu quebras que separavam a saída do último teste e diagramas cuja indicação de conteúdo anterior deixava ambígua a posição da descrição acessível. A captura da capa executou o projeto completo em Chromium, sem erros de JavaScript. Relatórios e imagens temporárias ficam em `tmp/corre-dino-retomada/` e `tmp/pdfs/corre-dino/`.

## Limites da verificação ampliada

`bun test packages/core/src/learning/scene` terminou com **762 aprovações e uma falha**. Em `questions-order.test.ts`, 15 de 22 perguntas escritas de experiências têm a alternativa correta na primeira posição: 68,2%, acima do máximo de 60%. As 22 pertencem a **O Jogo do Meu Jeito**. Corre Dino não declara esses palpites ou perguntas finais nesta versão. O limite foi preservado e o outro curso não foi reeditado para compensar a proporção.

Um teste de previsões ainda exigia um mínimo histórico de dez palpites, contrariando a opção pedagógica de não torná-los obrigatórios. Ele agora exige varredura não vazia e cobertura de todos os palpites efetivamente presentes, mantendo as verificações de revelação antes da conclusão e de metas dos casos autorais.

A tipagem completa de `packages/member-shell` continua falhando em cinco diagnósticos fora desta alteração: dois imports de `@sistemazero/studio/styles.css`, o import de CSS do xterm e duas uniões complexas em `reinoZero.ts`. Nenhum diagnóstico aponta para o componente ou teste alterado nesta revisão. Os testes aprovados deste escopo não equivalem a uma aprovação completa do monorepo.

## Produção pendente

Os vídeos permanecem como `plannedVideo`. Faltam gravação, hospedagem e vínculo do caderno, associação das mídias e aplicação dos manifestos no admin, com conferência dos envios, conclusões e acessos existentes. O mapa documenta essa sequência. Nenhum conteúdo remoto foi publicado por esta revisão.

Também falta o ensaio com crianças. Os testes conferem estrutura, regras, execução e instruções praticáveis; não demonstram compreensão infantil nem validam o ritmo da gravação.
