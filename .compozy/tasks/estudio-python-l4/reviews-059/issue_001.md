---
status: resolved
file: packages/studio/src/studio/tutor.ts
line: 532
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Draft Classic reintroduz arquivo privado na captura do tutor

## Review Comment

A captura live Classic só é aceita quando seu path passa por `!isStudioTutorSensitivePath`. Porém o fallback `visualDraft?.path` não passa pelo mesmo filtro. O arquivo de um draft salvo ativo, como `secrets.py` ou `credentials.py`, vira `pythonFile` e é enviado em `python.source` por `createStudioTutorExcerpts`. Essa função redige valores reconhecidos, mas não exclui arquivos privados por path. Conteúdo confidencial em uma variável genérica ou expressão continua intacto. O caminho Pro já exclui o arquivo inteiro antes de montar recortes; o comentário da política compartilhada diz que arquivos de credenciais nunca integram o contexto.

Prova independente `packages/studio/.cache/review059-python-tutor-capture.test.ts`: projeto Python Classic válido pelo schema Core, entrypoint main.py, helper secrets.py com `values = ["family-private-value-123"]`, e draft ativo desse helper criado pela função de produção `createPythonWorkspaceDraft`. `buildStudioTutorContext` seleciona secrets.py e contém o valor privado no JSON. Controle Pro com o mesmo arquivo sensível o exclui. `bun test ./.cache/review059-python-tutor-capture.test.ts`: 3 pass, 0 fail, 7 verificações, exit0; o caso candidato afirma o defeito. O outro controle confirma que o entrypoint Classic é fixo, portanto não depende de um documento inválido com entrypoint sensível. Não foi auditado o BFF/prompt ainda em execução: o achado é na montagem do payload que ZappyPanel fornece ao adapter.

Aplicar a mesma política de path a todas as origens do arquivo ativo, incluindo drafts/cache e fallback; não deixar topology/seleção de um draft privado contrariar a fonte pública escolhida. Se o arquivo visual atual é sensível, omitir seus recortes/blocos ou escolher um arquivo permitido com estado explicitamente indisponível. Preservar o draft e a fonte local sem alterações. Cobrir Classic/Pro, draft pendente/pronto, live capture recusada com fallback sensível e arquivos permitidos cujo texto ainda precisa de redação.

## Triage

- Decision: `VALID`
- Notes: Confirmado e corrigido pelo implementador: o draft salvo passa pelos mesmos filtros de arquivo permitido/não sensível antes da escolha de fonte e topologia; a seleção Python só permanece se pertence aos blocos atuais. Revalidação independente em 2026-10-17: reproduzidor cache adaptado cobre draft pendente/pronto e live capture com hash correto para secrets.py; todos escolhem main.py, omitem fonte/topologia/seleção privada e preservam os arquivos locais. Controle Pro mantém exclusão integral. Combinado `bun test ./.cache/review059-python-tutor-capture.test.ts ./.cache/review059-assistance-context.test.ts ./src/studio/tutorPython.test.ts ./src/studio/tutor.test.ts ./src/studio/tutorProContext.test.ts ./src/python/language/contextProvider.test.ts ./src/runtime/lessonEnvironment.test.ts ./src/components/tutor/ZappyPanel.test.tsx ./src/components/tutor/ZappyPanelBoundary.test.tsx`: 70 pass, 0 fail, 298 verificações, exit0. Prova adicional de assistência confirma captura fresca no turno da fila, liberação nos headers, corpo fora da fila, abort antes de envio e nenhum grant de execução. Biome dos sete arquivos do recorte: exit0, sem alterações. Nenhuma produção modificada pelo revisor; BFF/prompt/builder seguem fora deste recorte, sem navegador/build/TSC pesado.
