---
status: resolved
file: packages/studio/src/studio/StudioCore.tsx
line: 391
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Revisão observada restaura modo fora da curadoria do host

## Review Comment

A abertura inicial intersecta `modesForKind` com `config.allowedModes` e aplica a coerção de modo documentada. `applyObservedRevision`, porém, refina o documento e hidrata diretamente `prepared`, sem aplicar essa mesma política. Na primeira sincronização live ou numa troca de autoria, uma revisão salva em Ponte substitui a abertura em Blocos mesmo quando o host permite somente Blocos. `ModeArea` escolhe o conteúdo pelo modo do projeto, sem outro filtro da allowlist.

O harness independente `.cache/studio-python-l0/review049-initial-mode.test.tsx` monta o StudioCore real. Além do falso recovery do issue001, confirma após a aplicação: `config.allowedModes=['blocks']` e `project.mode='bridge'`, com `isDirty=false`. O snapshot é completo, válido no servidor e idempotente no leitor Python. A divergência é a entrada de revisão observada, não um campo adulterado nem efeito do parser de assets. O comando documentado no issue001 passou com 10 verificações.

Reutilizar a política de modo de abertura na aplicação de revisões observadas, sem alterar os demais campos nem marcar uma adaptação de apresentação como edição do aluno. Cobrir revisão Bridge aplicada em host blocks-only, host que permite Bridge e Pro/code, preservando a comparação e a fonte integrais. A guarda de dirty/journal do issue001 não resolve esta segunda causa.

## Triage

- Decision: `FIXED`
- Notes: `projectInAllowedMode` centraliza a mesma política e é chamado tanto na abertura quanto na hidratação de uma revisão observada. A coerção não marca dirty nem modifica o documento fornecido pelo host.

## Revalidation

- `bun test --tsconfig-override .cache/studio-python-l0/review048.tsconfig.json ./.cache/studio-python-l0/review049-revalidate.test.tsx` — 5 pass, 0 fail, 37 verificações, exit 0. O caso original termina com Blocos permitido, dirty falso e fonte integral. Dois casos adicionais aplicam revisões observadas com Ponte permitida e com Pro/code, conferindo igualdade integral do projeto e ausência de dirty.
- `bun test src/studio/Studio.test.tsx`, em packages/studio — 16 pass, 0 fail, 69 verificações, exit 0. Inclui novas regressões JavaScript/Python de curadoria em revisão observada, identidade por instância, preservação de edição no rerender, coerção quando o host restringe modos e ausência de gravação na abertura.
- Confirmação em React/StudioCore com a superfície Shell substituída. Não qualifica renderização Monaco/Blockly em navegador nem desempenho. Não houve alteração de produção pelo revisor.
