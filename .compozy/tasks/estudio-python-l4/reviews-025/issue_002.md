---
status: resolved
file: packages/studio/src/modes/python/PythonClassicWorkspace.tsx
line: 98
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Mapear seleção do Monaco sobre a fonte com EOL misto

## Review Comment

O novo vínculo de cursor ao texto usa position.source===source. Porém Monaco normaliza as quebras de linha do modelo. Um arquivo Python válido importado com CRLF e LF misturados mantém bytes originais no store e parser, mas model.getValue() retorna EOL uniforme; todo evento explícito de cursor é então recusado, embora conteúdo e posição por linha correspondam.

Prova com Monaco createModel real: 'x = 1\r\ny = 2\nprint(x + y)\r\n' vira CRLF uniforme no modelo. Prova adicional com React/store/composição reais e filhos visuais capturados: evento linha2,coluna1 com model.getValue() não produz sourceCursor; o mesmo evento com fonte original produz offset7. Resultado: actualModelRejected=true, rawTextControlOffset=7, modelChangedEOL=true.

Reconhecer somente a equivalência de terminações CRLF/CR/LF entre modelo e fonte, mantendo a conversão line/column sobre a fonte original e recusando qualquer outra divergência. Não reescrever o documento ao abrir.

Na qualificação browser, o implementador identificou uma segunda parte da mesma fronteira: sincronizar prop externa com model.setValue emitia onChange com EOL normalizado e alterava o store sem gesto do aluno. A correção reutiliza synchronizeMonacoModel para suprimir somente esse eco externo. A comparação de equivalência de EOL também impede reset repetido do buffer/histórico quando o modelo já representa a fonte.

## Triage

- Decision: `VALID`
- Notes: Helper pythonModelPositionToOffset aceita somente equivalência de CRLF/CR/LF, calcula a posição na fonte original e recusa diferenças reais ou posições inválidas. A composição reutiliza esse helper. Nenhuma implementação alterada pelo revisor.

## Verification

- Mesma prova independente com Monaco createModel real e composição React: actualModelAccepted=true, rawTextControlOffset=7, modelChangedEOL=true. Fonte original continua intacta.
- Regressão permanente cobre LF/CRLF/CR, Unicode, linha inexistente, posição dentro de surrogate pair e divergência real de caracteres/espaços. Suíte sourceEdits+commitWorkspace: 11 pass, 0 fail, 91 expect() calls.
- Correção adicional de eco examinada e revalidada: `bun test src/monaco/__tests__/MonacoTabs.test.tsx src/python/language/sourceEdits.test.ts` — 30 pass, 0 fail, 144 expect() calls. O novo teste de componente simula normalização e emissão síncrona em setValue, exige nenhum onChange externo e somente uma escrita após rerender equivalente.
- Prova independente complementar com Monaco createModel real, em Python e JavaScript: evento síncrono de setValue ocorre sob a guarda, não publica edição; guarda é removida ao terminar; edição posterior via applyEdits publica normalmente. externalEchoSuppressed=true e learnerEditPublished=true para ambas as linguagens. Sem efeito colateral novo confirmado no recorte; não substitui a qualificação browser em andamento.
