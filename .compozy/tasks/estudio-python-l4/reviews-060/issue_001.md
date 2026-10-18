---
status: resolved
file: packages/studio/src/studio/tutorSafety.ts
line: 104
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Credenciais Python escapam por aspas triplas e anotações

## Review Comment

O novo caminho Python reutiliza o redator textual do tutor antes de capturar recortes e novamente em `member-shell/src/server/zappy-python.ts`. Esse redator reconhece somente um caractere como delimitador de string e exige `=` imediatamente depois do identificador sensível. Em `password = """family-private-marker"""`, fecha no segundo quote e deixa o valor intacto. Em `password: str = "family-private-marker"`, a anotação impede reconhecer a atribuição. São construções Python normais em arquivos permitidos, inclusive main.py; o segredo chega ao prompt enviado ao provedor. A redação repetida pelo BFF não recupera a proteção.

Prova independente `packages/member-shell/.cache/review060-python-prompt-privacy.test.ts`: dez variantes Classic/Pro atravessam `buildStudioTutorRequest`, rota BFF real, `AuthorizeLessonRuntimeService` e `AuthorizePythonAnalysisService` reais, com captura local do payload do modelo e nenhuma rede. Aspas triplas simples/duplas, literal multilinha e atribuição anotada deixam o marcador tanto na captura quanto no prompt final; controle com atribuição/aspas comuns o remove. As fontes dos projetos permanecem intactas. `bun test ./.cache/review060-python-prompt-privacy.test.ts`: 1 pass, 0 fail, 70 verificações, exit0; o teste candidato afirma o defeito original.

Reconhecer delimitadores Python completos e bindings anotados antes de qualquer truncamento, mantendo a mesma política no cliente e BFF. Preservar mapeamento de linhas ou degradar referência explicitamente quando necessário. Cobrir aspas triplas simples/duplas, multiline/CRLF, anotações e valores incompletos, com controles de sintaxe JavaScript existente. Este achado é distinto de059001: aqui o path é permitido e a atribuição é sensível, mas a sintaxe Python impede a redação;059 tratava fallback de arquivo privado.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e corrigiu delimitadores completos/prefixos e anotação; fortalecimento independente inicialmente encontrou quoted/parenthesized annotations ainda vazando, também corrigidas pelo scanner completo com limites de profundidade/propriedade. Revalidação independente final cobre22 variantes Classic/Pro pela captura→Request/Response da rota BFF in-process→prompt capturado, incluindo aspas triplas, prefixo rf, CRLF e anotações quoted/parenthesized/multiline/triple. Nenhum marcador privado chega à captura ou ao prompt, e a fonte local permanece intacta. Três caches Shell (privacy, freshness, curation/transport):4 pass,0 fail,173 verificações,exit0. Combinado anterior dos dois primeiros caches com regressões permanentes BFF JS/Python/native:92 pass,0 fail,629 verificações,exit0. Studio annotations/privacy/capture/JS/Pro/mode:35 pass,0 fail,221 verificações,exit0. Biome12 arquivos do recorte:exit0,sem alterações. Controles adicionais confirmam catálogo/retorno limitados pela curadoria real da aula, rejeição de blocos JS/fora da paleta, prefixo de stream antes da resposta, status429 tardio preservado, cancelamento sem escrita tardia e erro503 sanitizado. Sem alteração de produção pelo revisor, navegador/build/TSC ou modelo remoto; history/feedback/builder ainda em execução ficam fora deste recorte.
