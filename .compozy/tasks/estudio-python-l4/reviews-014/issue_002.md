---
status: resolved
file: packages/studio/src/state/projectStore.ts
line: 1193
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Material aceito pode receber caminho inválido para Python

## Review Comment

O novo ramo Python de addAsset derivava proPath com projectAssetFileExtension, cujo fallback é bin, mas publicava o documento sem validar esse caminho pela política Python. O guard genérico isValidAssetDataUrl aceita outros MIME image/audio, enquanto isStudioPythonAssetPath não aceita .bin. Além disso, o MIME não era convertido para minúsculas antes da consulta. Assim, incluir um material podia informar sucesso e deixar o projeto incapaz de reabrir.

Reprodução independente antes da correção: addAsset({name:'sample',kind:'audio',dataUrl:'data:audio/aac;base64,AA=='}) retornou null e criou assets/sample.bin; refinePythonProjectDocument rejeitou $.assets[0].proPath, porque o sanitizer descartava o caminho e a guarda de preservação recusava a perda. image/PNG apresentou o mesmo resultado; image/png e audio/flac foram controles que reabriram. Os bytes sintéticos do ensaio apenas isolam a política de caminho; não constituem qualificação do decoder de mídia.

Normalizar o MIME e recusar formatos sem extensão portátil antes de publicar a alteração no store. Preservar o estado anterior em caso de recusa; não alterar o fallback histórico JavaScript.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador e revalidado independentemente antes da integração de staging, em 2026-10-17. O ramo Python normaliza MIME com toLowerCase e valida proPath com isStudioPythonAssetPath antes de commitPython. Oito controles com APIs reais: em Classic e Pro, AAC é recusado sem trocar a referência do projeto; image/PNG, audio/FLAC e image/png recebem caminhos png/flac corretos e passam novamente pelo leitor. O decoder e o fallback JavaScript permaneceram fora da alteração. Biome do conjunto de dez arquivos do recorte terminou com exit 0.
