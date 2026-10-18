---
status: resolved
file: packages/studio/src/runtime/python/inspection.ts
line: 72
severity: high
author: claude-code
provider_ref:
---

# Issue 001: Relatório carimba versão declarada como versão do compilador

## Review Comment

A inspeção copia snapshot.configuration.python.dependencyLock.pythonVersion para o relatório sem vinculá-la à versão efetiva da sessão de análise. O worker real aceita apenas Pyodide314.0.7/CPython3.14.2, enquanto o snapshot pode declarar3.13.0 mantendo o SHA da release3.14.2 e um digest de conteúdo válido. Core verifica relatório contra o mesmo campo declarado, portanto a comparação fecha sobre a declaração do documento, sem provar qual compilador foi usado. inspectStandalone só confere o sufixo SHA da URL do módulo e também não recusa essa incompatibilidade.

Prova independente `packages/studio/.cache/review068-inspection-version.test.ts`: usa catálogo real da fixture com releasePython3.14.2, conserva seu SHA, altera o lock para3.13.0 e prepara o snapshot real. inspectPythonSnapshot abre a fronteira de análise e resolve relatório passed com3.13.0. O teste espera recusa e falha:exit1,0 pass,1 fail,4 verificações, Expected promise that rejects / Received promise that resolved. A fronteira parse desta prova é fake, portanto ela comprova a aceitação/contrato; a versão realmente imposta pelo worker foi conferida em src/python/language/worker.ts, não inferida desse fake.

Vincular a inspeção à versão efetiva do analisador/distribuição aprovada, validar o lock contra essa identidade e construir o relatório usando a versão confirmada pela sessão. Recusar releases/sessões antigas sem confirmação suficiente na inspeção, sem necessariamente retirar sua compatibilidade para edição. O relatório continua sem conceder autoridade e não substitui a futura recomputação no serviço isolado.

## Triage

- Decision: `VALID`
- Notes: Implementador confirmou e implementou constantes leaf/pin, conferência do vendor no build e ACK efetivo worker→frame→session. A inspeção recusa lock incompatível antes de abrir sessão, exige ACK Python/Pyodide correto e compileBytes, captura a versão confirmada e a usa no relatório. Probes independentes adaptados (`review068-inspection-version.test.ts`, `review068-analysis-session.test.ts` e controles nativos em `review068-inspection-encoding.test.ts` no cache Studio):21 pass,0 fail,194 verificações,exit0. Confirma lock3.13 recusado antes do worker; ausência de ACK/API e versões erradas recusadas com descarte e zero compilações; ACK parcial/incompatível fecha preparePythonAnalysisSession real; ACK correto é imutável; editor legado sem ACK continua parse-compatible; compileBytes preserva BOM/bytes no transporte e não aceita AST como confirmação. Fonte1MiB+1 com digest válido também é recusada antes do worker. Studio permanente22/109, Core7/46, Biome15 arquivos:exit0. Nenhuma produção alterada pelo revisor. Provas unit/DOM e CPython3.14.2 nativo; navegador/Pyodide/Docker não executados pelo revisor. LotesB/C continuam fora do escopo.
