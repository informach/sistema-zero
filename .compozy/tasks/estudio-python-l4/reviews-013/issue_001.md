---
status: resolved
file: packages/studio/src/preview/renderProject.ts
line: 51
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Import lazy desloca captura do projeto e da política de leitura

## Review Comment

A separação do adaptador JavaScript v3 introduz uma suspensão antes da captura de argumentos que antes eram consumidos sincronamente. renderProjectToPreviewDocAsync verifica kind, aguarda import() e só depois passa o objeto original ao refiner; uma alteração imediata da fonte passa a mudar o HTML daquela chamada. prepareEditableStudioProject captura corretamente o documento antes do import, mas repassa options.proBuildLimits original após a espera, mudando a política usada para validar aquele snapshot.

Reproduções independentes com as funções reais: (1) chamar o renderer com documento v3 clássico e trocar files['script.js'] imediatamente depois; os scripts decodificados do HTML contêm o marcador novo MUTATED_AFTER_CALL. Antes do import lazy o refiner v3 executava e copiava a fonte antes do primeiro await. (2) documento JavaScript Pro com options.proBuildLimits.maxFileChars=1 é recusado pelo refiner síncrono; iniciar prepareEditableStudioProject e aumentar esse mesmo campo para o default antes do await permite o documento. Portanto os dados e a política podem corresponder a instantes diferentes da chamada.

Capturar o projeto e as opções necessárias antes da primeira suspensão, mantendo objetos/arrays internos separados do chamador; no leitor comum, capturar também proBuildLimits antes de carregar o módulo. Revalidar kind/formato a partir do snapshot. Cobrir mutação dos argumentos logo após a chamada, inclusive substituição do objeto de limites. O problema não exige abandonar import lazy nem reunir o envelope no bundle inicial. Tratam-se de objetos mutáveis recebidos do host, sem alegar alteração de políticas por JSON executado pelo aluno.

## Triage

- Decision: `VALID`
- Notes: Resolvido e revalidado independentemente em 2026-10-17T01:19:25Z. O leitor captura proBuildLimits antes do import e o renderer captura projeto/opções antes de qualquer await. Quatro negativos (formatos 2/3, mutação do limite/substituição do objeto) continuaram recusados pela política original. Nos formatos 2 e 3, alterar fonte, kind, origem do host, array de origens, mapa runtimeImports, diagnóstico e orçamento logo após a chamada produziu HTML byte a byte igual ao da entrada original. Suíte focada fresca: 27 pass, 0 fail, 138 verificações; Biome dos quatro arquivos corrigidos exit 0. A questão preexistente de opções do renderer também foi corrigida sem novo achado separado.
