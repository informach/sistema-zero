---
status: resolved
file: packages/members/src/application/studio/authorize-lesson-runtime.service.ts
line: 48
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Autorização de runtime recusa documentos locais válidos

## Review Comment

O endpoint recebe o projeto inteiro e reaproveita `validateLiveSnapshot`, uma fronteira de armazenamento da sala com profundidade máxima 100, 50.000 nós e 2.000.000 bytes. O transporte também herda aproximadamente 2 MB de Members/Gateway. Esses limites não descrevem o candidato necessário para uma autorização e divergem dos documentos/caches aceitos pelo editor e dos materiais aceitos pelo executor Python. Como resultado, acrescentar um cache confirmado ou um material válido impede a decisão de execução mesmo sem mudar o ambiente, a fonte executável ou o direito do aluno.

Reprodução independente: `bun .cache/studio-python-l0/review044-runtime-boundaries.ts`, exit 0. A prova monta HTTP real de Members, admite uma baseline Python e usa Blockly real para serializar uma cadeia de 55 comandos. `readPythonWorkspaceState` e `preparePythonExecutionSnapshot` aceitam o documento de 38.951 bytes; `studio-runtime` devolve 400, com a mensagem de JSON inválido. A mesma fonte, removendo somente o cache, retorna 200. Outro caso materializa um WAV PCM válido de 1.600.044 bytes: o snapshot local conserva os bytes, mas o documento JSON de 2.134.373 bytes recebe 413 antes da autorização. Não houve execução de código do aluno nem mudança de produção na reprodução.

Separar o assunto de autorização do documento completo: enviar identidade, ambiente, modo, extensões, template e as informações de dependências necessárias à operação, com schema e cotas próprias. A revisão declarada deve ser vinculada ao snapshot efetivamente validado pelo executor; não pode se tornar prova de fonte/material verificados pelo servidor. Fontes, caches e mídia não precisam trafegar para decidir acesso. Preservar os tetos de armazenamento existentes e não resolver a divergência apenas elevando indiscriminadamente o corpo global. Cobrir cache profundo, materiais acima do teto de upload e adulteração do assunto compacto.

## Triage

- Decision: `FIXED`
- Notes: Implementador acrescentou `StudioRuntimeSubjectSchema`/`studioRuntimeSubject` no Core e substituiu o documento integral por `{baselineId, operation, subject, revision}`. O serviço não usa mais `validateLiveSnapshot`; identidade e continuidade são verificadas sobre o assunto estrito. A resposta distingue `subjectSha256` da revisão declarada e retorna apenas o catálogo da release aprovada. Esta issue se limita à nova autorização contextual; não reabre os limites históricos de persistência da sala. O revisor não alterou produção.

## Revalidation

- `bun .cache/studio-python-l0/review044-runtime-revalidate.ts` — execução independente, exit 0, sem avisos. Repete o cache real de 55 blocos (documento 38.951 bytes) e o WAV PCM de 1.600.044 bytes (documento 2.134.373 bytes). Ambos agora recebem 200 por requisição menor que 2.500 bytes, sem enviar fonte, cache ou mídia. A revisão retornada é igual à calculada por `preparePythonExecutionSnapshot` real; `subjectSha256` é igual ao SHA-256 de `canonicalJson(studioRuntimeSubject(project))`.
- O mesmo harness prova que campos de documento integral (`assets`, `blocksState`, `files`) injetados no assunto continuam recusados, assim como ID emprestado, baseline antiga e extensão desconhecida. A reprodução anterior foi preservada em `review044-runtime-boundaries.ts` como evidência da versão anterior.
- `bun test tests/unit/studio-runtime-hosts.test.ts tests/integration/studio-runtime.test.ts tests/unit/studio-authoring-policy.test.ts tests/integration/studio-authoring.test.ts`, em `packages/members` — 21 pass, 0 fail, 201 verificações, exit 0. Inclui autorização fresca, baseline original, release retirada versus revogada e publicação das quatro variantes.
- A revisão é declarada pelo cliente, não uma atestação servidora de fonte ou mídia. O confronto do assunto/revisão com o snapshot imutável imediatamente antes do despacho pertence à integração do host ainda pendente; este fechamento não afirma que essa ligação já esteja implementada ou provada.
