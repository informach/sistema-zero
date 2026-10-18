---
status: resolved
file: packages/member-shell/src/components/live/live-workspace.tsx
line: 674
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Abertura limpa cria recuperação por normalização do documento

## Review Comment

`apply()` compara o resultado de `prepareHandoff()` diretamente com os snapshots remotos, sem distinguir uma abertura limpa de uma edição local. O Studio aplica o leitor da linguagem e a política de modo do host ao abrir. Essas transformações não são edições e não marcam `isDirty`, mas uma diferença suficiente cria um novo journal, ativa `writingBlocked` e apresenta recuperação de conexão. Assim um projeto válido pode abrir sem o botão Guardar e com a mensagem falsa de que a internet caiu.

Reprodução independente: `bun test --tsconfig-override .cache/studio-python-l0/review048.tsconfig.json ./.cache/studio-python-l0/review049-initial-mode.test.tsx` — 1 pass, 0 fail, 10 verificações, exit 0. A prova monta `LiveContinuedWorkspace` e `StudioEditor`/`StudioCore` reais, substituindo somente a superfície Shell, IDB/journal e HTTP. Um Python Classic completo, previamente refinado e aceito integralmente por `validateLiveSnapshot`, está salvo em Ponte. A biblioteca passa `allowedModes=['blocks']`; a abertura coerente muda apenas `mode` para Blocos. Sem qualquer gesto, `isDirty=false`, mas a primeira aplicação cria um rascunho com essa única diferença, retira Guardar e mostra `A internet caiu por um tempo`. O caso não depende de asset incompleto da fixture do navegador nem de ignorar campos na comparação.

Manter a comparação canônica estrita. Antes de preservar uma divergência como trabalho novo, distinguir autoria efetiva de normalização inicial: depois do flush de `prepareHandoff`, considerar o estado sujo do editor e um rascunho durável ainda não confirmado. Cobrir tanto edição real ainda suja quanto save transiente que já limpou o dirty mas conserva o journal. Não usar igualdade parcial nem excluir assets, fontes ou modo globalmente da comparação.

## Triage

- Decision: `FIXED`
- Notes: Depois de `prepareHandoff`, a decisão exige `handle.isDirty() || staged.current !== null` antes de preservar uma diferença. A comparação canônica integral permanece intacta. O flush e a leitura síncrona da autoridade acontecem antes da decisão, sem tratar a adaptação de abertura como trabalho novo. A correção do asset da fixture é separada deste defeito de produção.

## Revalidation

- `bun test --tsconfig-override .cache/studio-python-l0/review048.tsconfig.json ./.cache/studio-python-l0/review049-revalidate.test.tsx` — 5 pass, 0 fail, 37 verificações, exit 0. Usa o mesmo StudioCore/live real da reprodução. Abertura limpa: `mode=blocks`, `dirty=false`, `stages=0`, Guardar presente, nenhuma recuperação falsa.
- Negativa independente de dirty: a prova suspende a persistência antes da edição para isolar o ramo sem journal anterior; o handoff retém exatamente a fonte `print(41)\n` e retira Guardar.
- Negativa de journal: a edição segue a persistência real, um autosave HTTP 503 retorna pelo caminho transiente e realmente limpa dirty; o journal continua retido. O handoff posterior preserva `print(42)\n`, apesar de dirty falso. Não há igualdade parcial nem campos de mídia ignorados.
- Não houve navegador, interpretador, TSC ou banco nesta revisão. O Bun emitiu o aviso interno `directory mismatch` com tsconfig externo, sem falha do teste. Nenhuma fonte de produção foi alterada pelo revisor.
