# Aplicação da revisão pedagógica do Farol

**Data:** 04/10/2026. **Estado:** proposta aprovada pelo responsável e aplicada no repositório. Curso com cinco aulas, onze seções e dez vídeos planejados. Não publicado no Admin.

**Atualização após full review:** os dois achados foram corrigidos: contrato HTTP das ações de memória e orientação explícita de velocidade 3 na verificação do projeto. Manifestos regenerados; bateria ampliada com 2.447 testes aprovados e zero falhas. O [relatório de revisão](full-review.md#verificação-das-correções) registra as reproduções e a validação das correções. As verificações abaixo conservam o registro da aplicação inicial.

## Conteúdo aplicado

| Parte | Comportamento e atividade |
| --- | --- |
| Introdução | Convite para explorar; pode continuar sem vencer; saída da fala em Próxima seção. |
| Dia 1 | Movimento, previsão e comparação de velocidade 3 → 1 → 3 no próprio projeto, seguida de borda, teste e entrega. |
| Dia 2, contexto | Nova experiência `collect-and-remember`: recolher com e sem memória, afastar e reiniciar. A chave some e o mesmo aviso aparece nos dois modos. O mostrador expõe temChave. |
| Dia 2, montagem | Retoma a comparação; oferece texto próprio para o aviso depois do exemplo funcionar. Quem mantém a frase reinicia antes de repetir a coleta. |
| Dia 3, experiência | A porta mostra temChave, a pergunta e os dois ramos. Marca uma resposta somente depois de Testar a porta; mudar a chave limpa a marca anterior. |
| Dia 3, sem-chave | Nova seção e vídeo. Monta evento, condição e aviso em senão; aceita então vazio. Verifica sem exigir envio intermediário. |
| Dia 3, decisão | Completa então no mesmo projeto. Testa sem chave, busca e retorna na mesma partida; depois da vitória reinicia e testa sem chave novamente. Entrega única do dia. |
| Certificado | Quatro perguntas mantidas. A pergunta de memória agora diagnostica uma coleta que retirou a chave e mostrou aviso sem guardar verdadeiro. Novo id `q-memoria-coleta`; outras perguntas e emissão preservadas. |

As verificações são cumulativas: três critérios no Dia 1, oito no Dia 2, dez em sem-chave e quatorze na entrega final. Recusam movimento fora de A cada quadro, perda do movimento anterior, temChave começando verdadeiro e coleta que não guarda a informação. Continuam aceitando avisos com palavras próprias; o sentido do texto é conferido no teste jogado.

A experiência de memória só credita os gestos realizados. Mudar a regra sozinho não conta; não permite mudar retroativamente a regra depois da coleta. Recomeçar a partida preserva regra e descobertas, restaurando chave no chão e temChave falso. Retratos antigos continuam aceitos pela hidratação. As duas experiências do Farol dispensam palpite e pergunta final adicionais.

## Materiais e preservação

- [Organização do curso](../../modulos-desafio-primeiro-jogo.md), propostas, roteiros, gerador, manifestos, diretrizes e catálogo atualizados juntos.
- [Caderno do Aluno](../../../../output/pdf/desafio-farol-caderno.pdf): 19 páginas, com índice calculado pela composição efetiva, cores dos blocos do Estúdio e o padrão visual do Cadê Todo Mundo. Não contém gabarito do quiz.
- Comparação com o Git confirmou todos os identificadores anteriores de aula, seção e bloco. O acréscimo do Dia 3 usa `sem-chave`, `video-d3-sem-chave` e `ponte-d3-sem-chave`; a experiência do Dia 2 usa `experiencia-memoria`.
- Blocos `projeto`, cadeia `desafio-primeiro-jogo`, projetos iniciais, jogo pronto e bloco de certificado permanecem iguais à versão anterior. Não foi criado projeto paralelo entre as duas construções do Dia 3.
- Regenerar os cinco manifestos produz os mesmos arquivos. Os moldes de mídia permanecem `plannedVideo` e o vínculo do PDF depende do Admin.

## Verificações realizadas

| Verificação | Resultado |
| --- | --- |
| Core de aprendizagem, QA dos cursos e componentes de cenas afetados | **944 testes aprovados**, zero falhas, 72.271 verificações, 65 arquivos. |
| Regressões dos critérios | Os casos foram reproduzidos antes da correção; todos recusados depois. Projeto intermediário aceito sem então; entrega final exige os dois ramos. |
| Manifestos do acervo | 34 válidos, zero pendências de cena e zero avisos de convenção. |
| Roteiros do Farol | Cinco roteiros, dez vídeos, ordem e títulos coerentes com os manifestos. |
| Como Fazer | 42 tutoriais válidos; permanece sugestão de imagem em tutorial de galeria fora deste percurso. |
| TypeScript | Core e member-shell sem erros, usando o compilador instalado no repositório. |
| Biome | 28 arquivos TS/TSX alterados conferidos, sem erros. |
| PDF | 19 páginas renderizadas; fontes, imagens, cores e limites conferidos pelo gerador. Todas as páginas vistas em prancha; páginas da memória e do teste final também conferidas ampliadas. |
| Diff | Sem erros de whitespace. |

Comandos principais, a partir da raiz:

```powershell
bun docs/aulas-interativas/qa/gerar-desafio-farol.ts
bun test packages/core/src/learning docs/aulas-interativas/qa packages/member-shell/tests/scene-despacho.test.tsx packages/member-shell/tests/scene-display-samples.test.ts packages/member-shell/tests/scene-collect-and-remember.test.tsx packages/member-shell/tests/scene-lighthouse-key.test.tsx
bun docs/aulas-interativas/qa/validar-manifestos.ts
python docs/aulas-interativas/validar-roteiros.py desafio-
bun docs/como-fazer/validar.ts
bun packages/member-shell/node_modules/typescript/bin/tsc --noEmit -p packages/core/tsconfig.json
bun packages/member-shell/node_modules/typescript/bin/tsc --noEmit -p packages/member-shell/tsconfig.json
python docs/aulas-interativas/recursos/desafio-farol/gerar-materiais.py
```

## Produção e ensaio ainda necessários

O navegador de inspeção da sessão não estava disponível: a descoberta retornou lista vazia. A montagem local do ensaio foi preparada, mas não houve interação manual no navegador com os controles novos. Os testes de renderização são estáticos e não substituem conferir teclado, toque, tela estreita e continuidade no player autenticado.

O ensaio existente pode abrir as experiências reais dos manifestos com `bun packages/community-kids/e2e-scenes/fixtures/serve.ts`, em `http://127.0.0.1:5198/?course=farol&block=experiencia-memoria` e `http://127.0.0.1:5198/?course=farol&block=experiencia-porta`. O parâmetro `width=360` permite restringir a coluna da experiência. Esse ensaio isolado não cobre envio, publicação ou certificados de contas reais.

Conferir a sequência completa em conta nova e em conta com progresso, incluindo ida e volta entre sem-chave e decisao, envio único, publicação e certificado já emitido. Fazer o [ensaio de aprendizagem proposto](../revisao-pedagogica-desafio-2026-10-04.md#ensaio-para-avaliar-aprendizagem), ajustar o que exigir apoio do adulto e gravar os vídeos revisados e o novo vídeo sem-chave. Reconciliar mídia, PDF e progresso antes de atualizar as aulas remotas, conforme a organização do curso. Nenhum teste técnico desta aplicação comprova por si só compreensão infantil.
