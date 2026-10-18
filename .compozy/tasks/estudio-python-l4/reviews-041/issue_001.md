---
status: resolved
file: packages/members/src/domain/studio/authoring-policy.ts
line: 122
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Hash recalculado não prova a resolução dos requisitos

## Review Comment

A publicação confere o hash real de `requirements.txt` e verifica que cada pacote presente no lock pertence ao catálogo. Porém não confere que o lock resolve os requisitos declarados. O documento controla o próprio `requirementsSha256`; recalculá-lo não equivale à resolução autorizada das dependências.

Reprodução independente: `bun .cache/studio-python-l0/review041-authoring-lock.ts`, exit0. Nas variantes Python Classic e Pro, um catálogo com `packages: []` e um lock também vazio recusam inicialmente `requirements.txt = "requests==2.0.0\n"` por divergência de hash. Após alterar apenas o SHA no documento para corresponder ao texto, `assertBlockCoherent` aceita a publicação. Nenhum pacote foi aprovado ou resolvido para essa declaração. A aula pode assim declarar uma dependência indisponível e ainda receber aprovação de publicação.

A entrega atual deliberadamente não instala pacotes externos; Turtle é uma extensão do runtime. Aplicar esse limite explicitamente na política servidora: aceitar requisitos vazios/comentários e lock de pacotes vazio, recusando requisitos efetivos ou pacotes externos até existir uma resolução específica homologada. Manter a possibilidade de guardar o rascunho incompatível para recuperação. Não transformar o hash autocontrolado em autorização nem implementar um resolvedor pip genérico neste lote.

## Triage

- Decision: `FIXED`
- Notes: Implementador adicionou a política compartilhada `core/src/studio/python-dependency-policy.ts` na publicação e no snapshot de execução Python. A política recusa declarações efetivas e locks de pacotes não vazios nesta entrega; mantém a conferência de hash, rascunhos legíveis e exportação de fonte. Não houve execução de pacote arbitrário demonstrada: o achado original era aprovação incorreta de dependências indisponíveis. Revisor não alterou código de produção.

## Revalidation

- `bun .cache/studio-python-l0/review041-authoring-revalidate.ts` — exit0. Classic e Pro recusam pin, `-r`, `--index-url`, caminho local e URL de wheel mesmo com SHA correto, na publicação normal, galeria e snapshot de execução. Lock não vazio é recusado. Rascunho e exportação de fonte continuam disponíveis; vazio/comentários, inclusive CR/LF/CRLF, são aceitos.
- `bun test tests/unit/studio-authoring-policy.test.ts tests/integration/studio-authoring.test.ts` em `packages/members` — 12 pass, 0 fail, 70 verificações; quatro variantes preservadas, catálogo ausente/retirado/revogado e JS legado cobertos.
- `bun test src/runtime/python/snapshot.test.ts` em `packages/studio` — 6 pass, 0 fail, 27 verificações.
