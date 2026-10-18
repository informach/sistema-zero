---
status: resolved
file: packages/studio/src/runtime/python/inspection.ts
line: 46
severity: high
author: claude-code
provider_ref:
---

# Issue 002: Inspeção aprova AST quando os bytes não compilam no CPython

## Review Comment

inspectPythonSnapshot decodifica os bytes e pede compilable:true ao serviço de análise. O serviço faz ast.parse de uma string Unicode e compile do AST, operações que ignoram a declaração de encoding do arquivo. O executor, em contraste, usa Path.read_bytes() e compile desses bytes. Assim a inspeção pode declarar passed para uma revisão que o próprio CPython da mesma versão recusa antes de executar o programa. A decodificação também remove BOM UTF-8 por padrão; apenas trocar compile(AST) por compile(source.encode('utf8')) sem preservar esse prefixo ainda aprovaria casos incompatíveis.

Prova independente `packages/studio/.cache/review068-inspection-encoding.test.ts`: inspectPythonSnapshot real, analyzer.py exato executado no CPython3.14.2 nativo já fixado no cache, readPythonAnalysisResult real e controle compile dos bytes originais do snapshot via base64. Quatro casos: cookieascii com texto ação; encoding inexistente; BOM UTF-8 com cookielatin-1; cookielatin-1 com identificador é. Todos têm compile(bytes) recusado, mas relatório passed. `bun test ./.cache/review068-inspection-encoding.test.ts` no pacote Studio:exit1,0 pass,4 fail,24 verificações, Expected failed / Received passed. Nenhum programa/import autoral foi executado; somente o serviço confiável e compile. Não é prova Pyodide/browser/Docker.

Confirmar a compilação dos bytes efetivos de cada arquivo, respeitando BOM e declaração de encoding, sem executar o código nem normalizar/redigir a fonte. Preservar a análise Unicode usada pelo editor quando necessário, mas não apresentá-la sozinha como compilação dos bytes. Incluir os quatro casos na regressão e manter os controles Unicode/UTF-8 válidos.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e acrescentou operação compile separada com bytesbase64/compile(bytes), ACK compiledBytes:true e diagnóstico sem range; a inspeção não decodifica mais a fonte. Prova independente adaptada em `packages/studio/.cache/review068-inspection-encoding.test.ts` usa o analyzer.py atual no CPython3.14.2 nativo real e compara a operação nova com compile dos mesmos bytes originais. Dez casos: quatro encoding/BOM originais, return/yield fora de função, vazio, Unicode/CRLF, BOM UTF-8 válido e import/raise que precisam compilar sem executar. Relatórios passed/failed coincidem com CPython; arquivos .py/.pyi são cobertos, README é excluído, bytes/hash/revisão/fonte permanecem intactos e sessão é descartada. parse/render lançariam se usados pela inspeção, portanto os positivos não passam por ausência da API nova. Combinado com negativos de versão/transporte:21 pass,0 fail,194 verificações,exit0. Studio permanente22/109, Core7/46, Biome15 arquivos:exit0. Nenhuma produção alterada pelo revisor; não qualifica navegador/Pyodide/Docker. Não duplica026, que trata de preservar cookie durante edição visual.
