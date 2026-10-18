---
status: resolved
file: packages/studio-runtime/src/python-previews.ts
line: 68
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Opções mutáveis substituem o owner durante o preview

## Review Comment

storePythonPreview captura documentos, origem e fingerprint antes dos awaits, mas check/readProject/put/delete continuam lendo options.signal, assertCurrent, registry e bucket dinamicamente. Se o chamador reutiliza e altera esse objeto enquanto uma porta aguarda, a operação já admitida passa a obedecer outro signal/autoridade/storage. Trocar signal por um signal vivo e abortar o original depois da gravação do record permite publicar todos os arquivos e marker e retornar referência, apesar de o owner capturado na chamada ter sido retirado.

Reprodução independente: `bun test ./.cache/review085-previews.test.ts -t 'replacing the options signal'`, cwd Runtime. Fixture port sintética com store/Core/registry reais, sem browser/SDK/R2 real. onPut do record troca f.options.signal e aborta f.controller original; original.aborted=true passa, esperado retired, recebido published. Suite inicial dos três achados: exit1/0pass3fail. Nenhuma fonte/teste permanente alterado.

Capturar signal, callbacks e portas confiáveis antes do primeiro await, conservando propriedade/lifetime e cleanup do mesmo preview. Conferir consumidores irmãos serve/GC para que mutação de opções não redirecione autoridade ou recursos durante awaits.

## Triage

- Decision: `VALID`
- Notes: Correção revalidada: store captura portas/callbacks e lifetime combinado antes dos awaits; serve/GC também capturam opções. Probe original agora passa, sinal original abortado impede marker/referência mesmo se o objeto options é alterado. Suite própria completa9/24 exit0; permanente previews+distributions18/138 exit0 inclui captura de signal/ports/authorize. Core4/37 e Biome7 exit0. Sem alteração de produção pelo revisor ou qualificação browser/SDK preview.
