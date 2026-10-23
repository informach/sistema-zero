---
status: resolved
file: packages/studio/src/state/projectStore.ts
line: 497
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Aplicar as cotas do host às edições Python

## Review Comment

Os ramos Python de commitPython e reconcileProFiles chamavam pythonProjectLayoutError somente com o documento. Essa validação aplicava os tetos internos, mas ignorava options.limits e options.proBuildLimits fornecidos pelo host. Assim um host com maxTotalChars=300 aceitava 360 caracteres; a prova real de Undo sob essa quota não produzia recusa em Classic nem Pro. O mesmo desvio abrangia tamanho por arquivo, contagem e orçamento de request configurados pelo host.

Achado identificado pelo implementador durante a ampliação da prova de issue_001, confirmado pela inspeção do fluxo anterior e do log l4-python-source-editor-browser-3.log. Centralizar a interseção das políticas do host com os tetos rígidos e aplicá-la antes de publicar qualquer edição/transação Python. Em Classic, o entrypoint e requirements.txt não são arquivos extras. Manter o documento anterior e impedir beforePublish quando a alteração for recusada.

## Triage

- Decision: `VALID`
- Notes: Corrigido pelo implementador com pythonEditLimits capturado na criação da store e limites opcionais em pythonProjectLayoutIssue. Math.min preserva os tetos rígidos, e commitPython/reconcileProFiles compartilham a mesma política. Correção revalidada independentemente, sem alterações de implementação pelo revisor.

## Verification

- pythonHostLimits.test.ts: Classic/Pro recusam 360 caracteres sob quota total 300, recusam arquivo de 201 sob quota 200 e não publicam transação parcial. Classic bloqueia extras com quota zero; Pro respeita maxFiles; cotas mais altas não ampliam o teto rígido de 256.000 caracteres.
- Prova independente Bun: arquivo com Unicode produz request de 312 bytes; Classic/Pro recusam quota 311 e aceitam 312. Configuração Infinity não permite arquivo de 256.001 caracteres. Com maxExtraFiles=0, main.py e requirements.txt continuam editáveis e helper.py é recusado.
- Suite focada: 36 pass, 0 fail, 187 verificações. Biome dos cinco arquivos passou. Browser do implementador, log l4-python-source-editor-browser-4.log: 8/8 casos Classic/Pro Chrome/Edge, inclusive Undo/Redo sob quota total. O revisor leu o log e não iniciou navegador.
