---
status: resolved
file: packages/studio/src/python/language/editorSession.ts
line: 55
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Mapear a fonte preservada e o texto normalizado do Monaco

## Review Comment

O snapshot de análise substitui a fonte documental pelo `model.getValue()` dos arquivos abertos. O Monaco normaliza finais de linha mistos ao criar um buffer, enquanto o Studio preserva os bytes originais sem tratar essa normalização como edição. O adapter mistura esses dois sistemas de coordenadas: hashes de diagnósticos são calculados sobre o modelo normalizado, operações `requestForTree` exigem igualdade literal com o documento e resultados de arquivos fechados são aplicados diretamente ao novo modelo, que pode normalizar seu texto ao abrir.

Reprodução independente com `PieceTreeTextBufferBuilder` real do Monaco e `attachPythonEditorLanguage`/providers reais, substituindo apenas UI e transporte: `x=1\r\ny=2\nproblema\n` produz um diagnóstico, mas `currentProDiagnostics` descarta-o porque o hash difere da fonte salva; `requestForTree(..., 'symbols')` recusa a operação como código alterado sem qualquer edição. Na segunda prova, uma definição em `helper.py` fechado, com texto `#a\r\n#b\n#c\nvalor = 1\n`, navega à linha 4, coluna 2 em vez da coluna 1 após criar o modelo normalizado.

Estabelecer uma fonte/coordenada canônica por snapshot e mapear explicitamente posições entre o modelo Monaco e a fonte preservada quando a única diferença for EOL. Hashes e edições de workspace devem continuar vinculados ao documento capturado. Navegação, completion e demais ranges de apresentação precisam usar coordenadas do modelo atual; não normalizar silenciosamente o arquivo salvo como solução. A mesma composição deve respeitar as guardas do painel comum (`ProCodeTools`) antes de aceitar uma operação.

## Triage

- Decision: `VALID`
- Notes: Uma única causa para os três sintomas, corrigida pela preservação da fonte original e conversão explícita de posições. A regressão de custo da nova conversão está registrada separadamente na issue 003.

## Verification

- `.cache/studio-python-l0/review035-session.ts`, via `bun run`, antes das correções: exit 0. Saídas: `reported=1`, `visible=0`, `workspaceFailure="O código mudou. Abra a operação novamente."`; destino fechado com `startLineNumber=4,startColumn=2`, esperado coluna 1.
- O harness usa o construtor de buffer instalado do Monaco, portanto a normalização de EOL não é inventada pelo fake de UI. O transporte fornece spans válidos da fonte que a sessão realmente enviou; esta prova não substitui um ensaio visual do Monaco/Pyright completos.

## Revalidation

- `bun run .cache/studio-python-l0/review035-revalidate.ts`: exit 0. A mesma fonte original com CRLF/LF continua intacta, o modelo permanece normalizado, o diagnóstico aparece (`reported=1,visible=1`) e `requestForTree` aceita a fonte não editada. A definição em arquivo fechado passa a apontar para linha 4, coluna 1, comprimento 5.
- `bun test src/modes/pro/workspace/ProCodeTools.test.tsx src/python/language/client.test.ts`, no Studio: 13 passaram, 0 falharam, 39 verificações. Inclui o painel real React usando `documentOffset`, listagem de símbolos e busca de referências no offset da fonte preservada, além de regressões do painel JS e respostas antigas.
- Biome focal dos seis arquivos de coordenadas/sessão/providers/painel: `Checked 6 files in 24ms. No fixes applied.`. A conclusão funcional não certifica o custo por resposta, tratado na issue 003.
