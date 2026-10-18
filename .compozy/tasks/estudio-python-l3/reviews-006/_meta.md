---
provider: manual
pr:
round: 6
created_at: 2026-10-16T23:01:24Z
---

## Summary

- Total: 3
- Resolved: 3
- Unresolved: 0

## Scope

Receita experimental de bytecode da stdlib, opção de build para ZIP derivado, metadados/licenças, golden de introspecção/traceback, limitador de rede e prova de cache frio. A otimização ainda não é padrão nem aprovação de catálogo. Rodadas anteriores resolvidas; os achados aqui são guardas e qualidade das provas, sem perda funcional observada nos artefatos existentes.

## Evidence

- Inspeção independente com CPython 3.14.2: 614 entradas originais preservadas byte a byte; 559 pyc novos, todos com magic correto, flags CHECKED_HASH=3 e hash da fonte válido; 18.159 objetos de código com dfile portátil. ZIPs das duas gerações idênticos, 7.112.499 bytes e SHA 02900077d6d689e6b179454059228f0cff91af254dd38442046acc61f5db80c4.
- Reprodução in-memory da receita confirmou remoção das guardas sob optimize=1; nenhuma saída de arquivo foi produzida.
- Totais do manifesto baseline: 14.882.529 bytes em todos os arquivos, 14.851.800 nos artefatos de execução; incompatíveis com a exigência fixa >15 MB.
- Anexos golden comparados: baseline em runs/2026-10-16T22-57-01.426Z/report.json, otimizada em runs/2026-10-16T22-57-56.004Z/report.json; hashes de fonte e traceback idênticos em Chrome/Edge. Rodada otimizada: 56 testes aprovados, sem falhas/flaky/skipped.
- Biome dos seis arquivos TypeScript e git diff --check passaram. As APIs de [py_compile](https://docs.python.org/3.14/library/py_compile.html) e [zipimport](https://docs.python.org/3.14/library/zipimport.html) sustentam a estratégia de bytecode com fontes preservadas, sem trocar o loader.

O builder mantém o ZIP oficial como padrão e identifica a receita no SOURCES.txt quando usa o derivado. Não foi confirmado outro defeito de integridade no artefato atual. As provas de rede permanecem pendentes; nenhum navegador foi iniciado por esta revisão.

## Revalidation

- Todos os três achados corrigidos e revalidados independentemente.
- Geração real CPython3.14.2 -I reproduziu o ZIP de 7.112.499 bytes/SHA 02900077… em .cache/studio-python-runtime/review006-fixed-yr8bm01p/normal-isolated.zip. Recusas reais de -O, -OO, PYTHONOPTIMIZE, hash incorreto e origem igual ao destino passaram, sem sobrescrever a origem ou criar saída inválida.
- A primeira revalidação com -O revelou diferença somente na serialização de functools.pyc: ZIP fc270af0…, 7.112.506 bytes; os atributos/constantes recursivos dos code objects comparados são iguais. A receita agora rejeita explicitamente os flags que produzem essa variação, preservando o contrato de build determinístico. Não se afirma equivalência geral de qualquer configuração do compilador.
- Floor do teste derivado do manifesto: 14.732.723 bytes baseline e 19.299.585 otimizada. Golden exato conferido contra quatro anexos baseline/otimizada Chrome/Edge.
- Nenhum Playwright foi iniciado. Aprovação da otimização como padrão e medições completas de rede permanecem responsabilidade dos gates documentados, não consequência do fechamento desta revisão.
