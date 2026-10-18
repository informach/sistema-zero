---
status: resolved
file: packages/studio/src/runtime/python/turtle/renderer.ts
line: 98
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Hit testing atravessa objetos e ignora polígonos sem fill

## Review Comment

`hit()` filtra a cena pelos bindings antes de escolher o item superior e exige `item.fill` para testar polígonos. No Tk, a seleção do item atual considera a geometria/ordem da cena, independentemente de o item possuir callback; um item superior sem handler pode impedir que o inferior receba o clique. Além disso, o interior de um polígono continua selecionável mesmo com fill e outline vazios.

Prova independente CPython 3.14.2/Tk: duas tartarugas quadradas sobrepostas, apenas a inferior vinculada. Um clique gerado no centro não chama a inferior enquanto a superior está visível; escondendo a superior, chama. Tornando a superior transparente e vinculando-a, ela recebe o clique. Outra prova com fill='' e outline='' também dispara seu callback. Um double de Canvas exercitando a função real do renderer devolveu o item inferior nos casos coberto e transparente.

Separar seleção geométrica do item superior e entrega por bindings, preservar semântica dos polígonos transparentes e considerar a oclusão pelos demais tipos de item. Acrescentar pares Tk/browser com dois objetos sobrepostos, item sem handler e forma transparente. O double confirma o caminho lógico; não foi usado como evidência de rasterização.

## Triage

- Decision: `VALID`
- Notes: Corrigido: hit seleciona primeiro o item geométrico superior, sem filtro prévio de bindings/fill, e contempla linha/texto/imagem. Provas reais Chrome/Edge conferidas em runs/2026-10-16T23-33-04.863Z/report.json: ocultação, descoberta e forma sem fill aprovadas nos dois navegadores. A seleção do polígono com fill/outline vazios segue o mesmo ramo geométrico. Nenhum browser iniciado pelo revisor.
