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

## Revisão de 06/10/2026: vídeos como demonstração

Aplicação da regra das Diretrizes (seção 2) e da ESPEC (seção 4): o vídeo da experiência é uma demonstração.

- **24 experiências.** A primeira frase diz o conceito. Nas aulas 4 e 10, onde a cena volta, a abertura é "Esta é a mesma experiência…". A demonstração começa em "Olha aqui:": o narrador faz os testes na primeira pessoa, mostra o resultado real e o liga ao bloco da montagem seguinte. O fecho "Agora é a sua vez: faça esses mesmos testes na experiência. Quando terminar, clique em Próxima seção." é acrescentado pelo gerador. Vinte experiências têm uma comparação do dia a dia, com meme ilustrado descrito na nota de tela (campo `meme`).
- **Resultados conferidos no motor.** Cada percurso de `corre-dino.test.ts` foi executado passo a passo em `packages/core/src/learning/scene`, lendo a faixa (`sceneReadout`) e a situação (`sceneSituation`). As falas citam só esses resultados, como 30 cactos por segundo sem relógio, as marcas 68 e 163 do impulso, o BATEU com vão de 10 entre os desenhos e a base que para em -9.
- **Nota "Na tela".** O modelo das experiências fica em `telaSecao`: o narrador faz cada gesto no ritmo da fala, com o resultado à vista. Saiu a orientação antiga de não antecipar resultados.
- **Jogo pronto.** Apresenta o jogo (corrida que acelera e pontos que crescem na partida) e mostra um exemplo só: começar e pular um cacto. Não joga a partida até o fim, e a vez passa no fim.
- **Publicação na aula 13.** A fala diz que o resumo já vem preenchido, comemora "Seu jogo está no Mural! Que conquista!" e convida a mandar o link com **Copiar link de jogar**. O Compartilhar da aula não mostra o campo Título.
- **Rótulos corrigidos nas instruções da página e no caderno.** Na cena de reinício com o cenário do Dino, os rótulos são **Tocar na tela** e **No fim, o toque faz**; **Apertar Enter** é do cenário da nave. Na cena de nascimento, o relógio aparece como **No relógio, a cada 1 s**, com a opção **1,4 s**. A cena do sorteio não escreve as contas -5 - 0 e -5 - 1. O pedido para lê-las saiu da instrução, e o vídeo mostra as contas numa legenda, porque a montagem seguinte as retoma. Na revisão do mesmo dia, também passaram aos rótulos reais: **Apertar Espaço** e **Tocar para pular** (aula 4), **Quando apertar a tecla**, **Apertar Enter** e **Voltar ao início** (aula 8), **Apertar a tecla** (aula 4) e **valor da base** (aula 13). Na aula 12, a fala cita os botões pelo nome inteiro: **Sortear lugar (velocidade fica −5)** e **Sortear velocidade (lugar fica 500)**.
- **Cena sem som.** A `once-vs-always` não toca som: o palco só escreve "♪ N vezes" (`sceneEmitsSound` é falso). A fala da aula 4 diz que aparece a notinha ♪, e um teste impede que uma cena muda prometa som.
- **Caderno.** Onde o vídeo é demonstração, o caderno imprime os passos no imperativo do campo `caderno`. O PDF foi regenerado com 52 páginas e 145 blocos. Mudaram só as páginas 15, 17, 27, 32, 45, 47 e 50, que foram inspecionadas.
- **Durações.** Pela contagem de palavras, as 24 experiências passaram de cerca de 1 para 2 minutos de fala. A entrega da aula 13 passou de 2 para 3 minutos. As montagens não mudaram.

| Verificação | Resultado |
| --- | --- |
| `bun docs/aulas-interativas/qa/gerar-corre-dino.ts` | 13 trios gerados. |
| `bun test docs/aulas-interativas/qa/corre-dino.test.ts docs/aulas-interativas/qa/diretrizes-pedagogicas.test.ts` | **48 aprovados**, 1.559 asserções. Inclui três testes novos: abertura, primeira pessoa e fecho das experiências; exemplo único do jogo pronto; montagens no imperativo, sem "mexa e veja", e publicação com o link. |
| `bun docs/aulas-interativas/qa/validar-manifestos.ts corre-dino` | 13 válidos, zero avisos. |
| `python docs/aulas-interativas/validar-roteiros.py corre-dino` | 13 roteiros, 76 clipes, tempos consistentes. |
| `python -X utf8 docs/aulas-interativas/recursos/corre-dino/gerar-materiais.py` | 52 páginas e 145 blocos; fontes, imagens, cores e limites conferidos. |
| Biome nos arquivos alterados | Aprovado. |

Continuam pendentes a gravação dos vídeos com os memes desenhados e a legenda das contas na aula 12, além do ensaio com crianças.
