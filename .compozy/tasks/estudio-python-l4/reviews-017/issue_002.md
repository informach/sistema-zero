---
status: resolved
file: packages/studio/src/cover/thumbCapture.ts
line: 130
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Preservar o perfil da miniatura durante a captura assíncrona

## Review Comment

`captureAndStoreProjectThumb()` deixava `writeProjectThumb()` capturar o perfil ativo somente depois dos awaits da captura e do redimensionamento. Se o perfil mudasse nesse intervalo e o mesmo ID de projeto existisse nos dois bancos, a miniatura do perfil original era escrita no perfil novo. A origem do padrão é anterior à integração Python, mas o novo caminho de captura Python o reutilizava. `storeChosenCoverThumb()` possuía a mesma fronteira quando não recebia `options.storageScope` explícito.

Reprodução independente com persistência real sobre fake-indexeddb: gravar um projeto Python Classic nos namespaces A e B; iniciar a captura em A; suspender `runtimeCapture.capture()`; ativar B; completar a captura. Antes da correção, a operação retornava true, a miniatura de A permanecia null e B recebia a imagem de A. Foram simulados apenas Image/Canvas para o resize; os adaptadores de persistência, as transações e a leitura das miniaturas eram os reais.

Capturar `ProjectStorageScope` antes da primeira suspensão e passá-lo explicitamente a `writeProjectThumb()` em ambos os caminhos. A escrita deve preservar a origem da operação, mesmo que outro perfil esteja ativo ao terminar o encoder.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador: o caminho comum captura o scope antes de resolver a miniatura, e `storeChosenCoverThumb()` captura o scope opcional/default antes do resize. Reproduções independentes posteriores confirmaram gravação em A e ausência de alteração em B em ambos os caminhos. Nenhuma fonte foi modificada pelo revisor.

## Verification

- Script independente por stdin (`bun -`), com `fake-indexeddb/auto`, fixture Python Classic, `persistProject()` e `loadProjectThumb()` reais: captura runtime suspensa durante troca A→B passou; capa escolhida com Image.onload suspenso durante a mesma troca também passou. Ambas retornaram true, thumbA=JPEG e thumbB=null.
- `bun test src/cover/__tests__/thumbCapture.test.ts src/cover/__tests__/coverCaptureIsolation.test.ts src/cover/__tests__/coverCaptureHarness.test.ts`: 19 pass, 0 fail, 44 verificações, exit 0.
- A reprodução detalhada foi enviada ao implementador para incorporação como regressão permanente. A prova independente desta rodada não cria arquivos de teste nem modifica implementação.
