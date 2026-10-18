---
status: resolved
file: packages/studio/src/python/language/editorCoordinates.ts
line: 27
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Reutilizar os índices de coordenadas durante uma resposta

## Review Comment

A correção de EOL reconstrói `sourcePositions(source)` dentro de cada chamada a `pythonDocumentRange`. O provider chama esse caminho para cada replacementSpan, edição adicional, símbolo e referência. Além disso, `session.range` chama `snapshot()` por item, repetindo a varredura de todos os modelos e a comparação/normalização de seus textos. A quantidade de trabalho passa a ser proporcional ao tamanho do projeto multiplicado pela quantidade de posições da resposta, embora fonte e revisão sejam as mesmas durante esse mapeamento síncrono.

Instrumentação independente de uma resposta com 1.000 completions (dentro do limite publicado), usando provider e conversor reais: uma fonte de 1.000 caracteres causa 1.000 reconstruções de índice e 1.000.000 caracteres varridos somente na indexação. Com o teto de 1 MiB por arquivo, a mesma estrutura implica aproximadamente 1 GiB de varredura síncrona, antes de contar os snapshots por item. Símbolos com `bodySpan` também fazem duas reconstruções por símbolo. Esta é uma contagem de trabalho comprovada; nenhuma latência ou meta de desempenho foi medida nesta revisão.

Capturar uma vez o snapshot validado para a resposta e reutilizar índices por arquivo durante todo o mapeamento. A fonte usada para ranges, criação de modelos de destino e hashes deve pertencer a essa resposta, conservando as guardas de versão/owner. Diagnósticos também devem indexar cada arquivo apenas uma vez. Evitar cache global sem limite; um contexto de resposta ou cache limitado à sessão/revisão preserva descarte e isolamento.

## Triage

- Decision: `VALID`
- Notes: Custo confirmado pelo implementador e correção revalidada independentemente. Cada resposta agora possui a projeção do snapshot capturado; os índices e modelos de destino são reutilizados por caminho durante o mapeamento. Não houve ampliação de limites nem atribuição de latência sem medição.

## Verification

- `bun run .cache/studio-python-l0/review035-ranges.ts`: exit 0; `{"suggestions":1000,"sourceCharacters":1000,"indexRebuilds":1000,"charactersScanned":1000000}`.
- O wrapper de instrumentação chama `sourcePositions` real e conta suas invocações; não substitui a indexação por uma resposta falsa. A fonte pequena evita competir com a prova de navegador do processo principal.

### Revalidação da correção

- `bun run .cache/studio-python-l0/review035-ranges-revalidate.ts`: exit 0. O harness usa `attachPythonEditorLanguage`, providers, cliente e indexador reais, buffer PieceTree do Monaco e transporte determinístico. Para fonte de 1.000 caracteres, 100 e 1.000 completions produzem igualmente 2 indexações (posição de entrada e projeção da resposta), 2 leituras da árvore e 2 varreduras dos modelos; o trabalho não aumenta com o número de itens.
- Na mesma prova, 300 símbolos com `bodySpan` (600 ranges) usam 1 índice; 1.000 referências para um único arquivo inicialmente fechado criam apenas 1 modelo e usam 2 índices; 100 diagnósticos e seus 100 markers compartilham 1 índice. A comparação continua sendo contagem de trabalho, sem medir latência.
- O primeiro ensaio do novo harness tinha expectativa incorreta de 4 varreduras para criar o modelo de destino; `reserveMonacoModelUri` faz duas consultas adicionais para preservar a identidade dos modelos. Após conferir esse fluxo, a expectativa foi corrigida para as 6 chamadas constantes observadas; nenhuma fonte de produção foi alterada pelo revisor.
- `bun run .cache/studio-python-l0/review035-revalidate.ts`: exit 0 após a otimização; diagnóstico visível sobre fonte EOL mista, consulta de workspace sem falsa divergência, definição no destino fechado em linha 4/coluna 1 e atualização A→B sem digitação permanecem corretos.
- `bun test src/modes/pro/workspace/ProCodeTools.test.tsx src/python/language/client.test.ts` em `packages/studio`: exit 0, 13 testes, 39 verificações.
- Biome dos 6 arquivos de coordenadas/sessão/providers/contrato e ferramentas Pro: exit 0, nenhuma alteração necessária.
