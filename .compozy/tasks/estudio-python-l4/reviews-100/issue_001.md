---
status: resolved
file: packages/members/src/application/studio-pro/studio-builder.service.ts
line: 259
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Admissão recusa material Python portátil dentro de dist

## Review Comment

A admissão escolhe isStudioPortablePath para assets Python, mas aplica em seguida a lista adicional de diretórios npm (`node_modules`/`dist`) a ambas as linguagens. `dist` é permitido pelo contrato portátil Python e por isStudioPythonAssetPath; um projeto canônico com material `dist/sprite.png` passa pelo refinador e pela captura da revisão, mas o Builder o recusa antes de chamar o autorizador do host. Isso impede propostas sobre um projeto Python válido por uma restrição específica do caminho JavaScript.

Reprodução independente `packages/members/.cache/review100-builder-portable.test.ts`: mesmo PNG real, dois caminhos `assets/sprite.png` (controle aceito) e `dist/sprite.png` (recusado). Ambos são capturados por capturePythonProRevisionPayload e recompostos por createStudioProRevision com hash idêntico. O segundo recebe "A revisão-base é inválida." em vez de admissível; nenhum callback de autorização ou enqueue ocorre. Própria prova+permanentes de revisão/coordinator:13pass1fail/43asserts exit1. Nenhuma produção ou teste permanente alterado pelo revisor.

Limitar o filtro npm adicional ao ramo JavaScript. Python deve seguir os validadores portáteis compartilhados, preservando suas recusas canônicas de traversal, nomes reservados e node_modules. Acrescentar regressão permanente com asset em dist e manter a prova v1 JavaScript.

Este é um novo consumidor de admissão Members, distinto do runner Node/dotfiles em069 e da política de arquivos sensíveis das ferramentas em064. Não se aponta ausência de wiring/callback em produção: B1 é a fundação explicitamente delimitada, B2/B3 ainda pendentes.

## Triage

- Decision: `VALID`
- Notes: Resolvido após confirmação do implementador e prova independente. Guard adicional node_modules/dist agora está condicionado a !python; validadores Core portáteis e verificação dos bytes/hash permanecem. Próprio teste original mantém controle assets/sprite.png e dist/sprite.png com proPath real, PNG real e recomposição Corehashigual; ambos admitem uma autorização/um enqueue. Com permanente reforçado+coordinator:15pass0fail/56asserts exit0, incluindo missing/denysemqueue, tamperSource/Binary/Configurationantesauthorizer, emptydirs e JSv1semcallback. Biome2arquivos exit0/no fixes. Fonte/permanentes intocados pelo revisor. Nenhum outroachado confirmado no recorteB1. Não qualifica callback wired emprodução, BuilderPython disponível, BFF/model/runtime/UI B2/B3, SDK/browser ou performance.
