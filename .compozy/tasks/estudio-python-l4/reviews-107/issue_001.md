---
status: resolved
file: packages/studio/src/components/preview/PythonCandidatePreview.tsx
line: 158
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Sandbox externo impede enviar stdin da proposta Python

## Review Comment

O novo iframe externo usa `allow-scripts allow-same-origin allow-downloads`, omitindo `allow-forms`. O launcher standalone envia stdin pelo evento submit de `#input-form`. A restrição de sandbox do ancestral se aplica mesmo com o CSP do serviço permitindo forms; o navegador bloqueia a submissão antes do listener que usa preventDefault e provideInput.

Evidência causal real já preservada em `.cache/studio-python-l0/l6-python-preview-browser-2.log`: Chrome chegou ao input Python, registrou `Blocked form submission ... allow-forms permission is not set`, e não produziu `ola Bia` após clicar Enviar. O harness foi corrigido naquela etapa, mas o novo consumidor UI recriou o mesmo sandbox restritivo. Probe independente atual `packages/studio/.cache/review107-python-preview-lifecycle.test.tsx` confirma o atributo efetivamente criado pelo componente: 2 pass/1 fail/11 asserts (os dois passes são deadline60s e readonly ABA). Log `.cache/studio-python-l0/review107-preview-before.log`. HappyDOM não executa páginas; seu NotSupportedError de page-loading desativado é explícito e essa probe só comprova o atributo, enquanto a consequência funcional vem do navegador histórico.

Compartilhar o sandbox externo confiável entre componente e harness, incluindo a permissão necessária para o form controlado. Preservar origem separada e frame interno opaco, sem acrescentar privilégios ao programa do aluno. Revalidar stdin com o sandbox real do componente.

## Triage

- Decision: `VALID`
- Notes: VALID/resolved. UI e harness compartilham STUDIO_PYTHON_PREVIEW_SANDBOX com allow-forms; frame interno permanece allow-scripts allow-pointer-lock e opaco. Probe DOM própria após correção3pass/0fail/11asserts (sandbox/deadline60s/readonlyABA). Suite UI/legado27/169 e Biome11 arquivos passaram. Prova fresca do implementador l6-python-builder-preview-browser-1.log/preview-browser/efb534f6-552d-498f-ac08-546345b5c355 conferida por leitura e helper independente review107-browser-artifacts.ts: Core valida manifest/report/referência, todos10 arquivos têm bytes/SHA corretos, captura protegida2602B, template/metadado parent idêntico ao Core atual, ACK loading/ready com nonce/id correto e forged learner ACK recusado nos dois browsers. Driver confere stdinBia, tecla/click, captura, stop/restart e largura390; usa exatamente o sandbox compartilhado. Runtime8cc75ad355736cfde2df5cb9ad67fe4d65f09c895c04c9e4e8fde88350810107. Limite: CPython/browser locais reais, storage/availability controlados; não SDK/DO/fullReactUI/quatrohosts/performance. Warnings HappyDOM page-loading desativado e CSP/TrustedTypes negativos permanecem explícitos.
