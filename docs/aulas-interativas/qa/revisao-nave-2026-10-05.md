# Retomada de Nave Contra Asteroides · 05/10/2026

A sessão interrompida deixou uma reorganização em nove aulas, geradores, projetos intermediários e um primeiro caderno. A retomada recuperou o pedido original e completou a revisão editorial, as experiências, o material de consulta e a verificação local. O curso segue como curso normal, sem calendário por dias, com o código original do jogo preservado.

## Entrega

- [Mapa do curso](../modulos-nave-contra-asteroides.md): nove aulas em três módulos, com 52 seções, 48 vídeos planejados, 19 experiências e quatro revisões por quiz.
- [Fonte editorial](nave-contra-asteroides.conteudo.json) e [gerador](gerar-nave-contra-asteroides.ts): produzem os nove conjuntos de proposta, roteiro e manifesto. A fonte concentra também as instruções das experiências e os critérios de cada montagem.
- [Projetos intermediários](nave-contra-asteroides-etapas.ts): os cinco resultados antigos continuam exatamente iguais; quatro etapas menores preparam a nave, os asteroides, a pontuação e o início da partida.
- [Caderno do Aluno](../../../output/pdf/nave-contra-asteroides-caderno.pdf): 39 páginas, derivadas das mesmas falas, com esquemas dos encaixes e 86 representações de blocos nas cores do Estúdio.

As experiências agora antecedem a aplicação dos conceitos. Criar e desenhar a nave, mover e limpar a imagem, e preparar vidas e programar a batida têm montagens próprias. As falas retomam o que foi observado e localizam o destino do encaixe antes de buscar cada bloco. A experiência de movimento do Farol aceita o cenário explícito da nave; seus controles, limites e motor permanecem os mesmos.

Cada montagem termina com a verificação da etapa e a espera por Salvo. O fechamento de cada aula orienta envio, confirmação e conclusão. Os identificadores das cinco aulas antigas e a cadeia de projetos foram mantidos; a aplicação no admin ainda exige a conferência de progresso descrita no mapa do curso.

## Evidências locais

| Verificação | Resultado |
| --- | --- |
| `bun test docs/aulas-interativas/qa packages/core/tests/learning.test.ts` | 145 testes aprovados. Inclui os 31 testes da Nave, continuidade dos projetos, critérios, quizzes e os caminhos narrados das 19 experiências. |
| Em `packages/studio`: `bun test src/blockly/__tests__/naveEditorial.test.ts` | 17 testes aprovados. Reconstrução dos cinco projetos originais, disparo, colisões, pontuação, vitória real em 26 pontos, derrota, reinício e rejeição de erros de montagem. |
| Em `packages/member-shell`: `bun test tests/scene-nave-walk.test.tsx tests/scene-lighthouse-walk.test.tsx` | 14 testes aprovados. Representação da nave, posição e rastro reais, saída sem limite, parada na borda com limite e comportamento anterior do Farol. |
| `bun docs/aulas-interativas/qa/validar-manifestos.ts nave-contra-asteroides` | Nove manifestos válidos; zero avisos, reprovações ou cenas ausentes. |
| `python -X utf8 docs/aulas-interativas/validar-roteiros.py nave-contra-asteroides` | Nove roteiros, com 48 clipes correspondentes aos manifestos. |
| `bun docs/como-fazer/validar.ts` | 42 tutoriais válidos; sugestão não bloqueante de imagem para o tutorial de envio pela galeria. |
| `bunx tsc --noEmit -p packages/core/tsconfig.json` | Aprovado. |
| Biome nos 11 arquivos TypeScript envolvidos nesta retomada | Aprovado. |
| `python -X utf8 docs/aulas-interativas/recursos/nave-contra-asteroides/gerar-materiais.py` | PDF gerado: 39 páginas, 86 blocos, sem fontes ou imagens ausentes, cores divergentes ou conteúdo fora dos limites. |

O PDF foi renderizado e inspecionado visualmente, incluindo as páginas ajustadas depois da revisão de paginação. O gerador também abriu o jogo original em Chromium, iniciou uma partida e capturou a imagem da capa sem erros de JavaScript. Os artefatos temporários de conferência ficam em `tmp/pdfs/nave-contra-asteroides/`.

## Limites da verificação ampliada

A execução de `bun test packages/core/src/learning/scene` terminou com **762 aprovações e uma falha**. O teste `questions-order.test.ts`, que exige no máximo 60% das respostas corretas na primeira posição, encontrou 25 de 35 perguntas (71,4%). Essas perguntas escritas pertencem a Corre Dino e Meu Jeito; a Nave atual não declara palpites nem perguntas finais nas experiências. O limite do teste foi preservado, e os outros cursos não foram reeditados para compensar a proporção. Dois testes desatualizados foram corrigidos para localizar a experiência movida à primeira aula e reconhecer os 37 manifestos atuais.

A verificação TypeScript completa de `packages/member-shell` também não passou: há declarações ausentes de imports CSS do Estúdio e xterm, duas uniões complexas em `reinoZero.ts` e dois conflitos entre lista somente leitura e lista mutável no teste do Farol. Nenhum diagnóstico aponta para o teste da Nave ou para a adaptação visual feita nesta retomada. Isso não equivale a uma validação completa do monorepo.

## Etapas de produção

Os vídeos continuam como `plannedVideo`. Ainda faltam gravação, hospedagem e vínculo do caderno, associação das mídias e aplicação dos manifestos no admin com conferência de acesso, envios e conclusões existentes. O mapa do curso descreve a sequência de aplicação.

Também falta o ensaio com crianças. Os testes verificam estrutura, execução e instruções praticáveis; não demonstram compreensão infantil nem adequação do ritmo de gravação. Esta entrega não publica o curso.
