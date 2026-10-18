# Verificação independente — fatos estruturais Python

Revisão do sublote encerrada com **2 issues medium, VALID/resolved; metadata2/2/0**. Nenhum outro defeito confirmado após priorizar Core/extrator/transporte e revisar serviço/BFF. Sem conclusão da feature global, consumidores de atividades/Construir, desempenho ou Cloudflare remoto.

Provas executadas pelo revisor:

- Core python-structure/python-inspection/python-validation-input:9pass/58assertions, exit0.
- Studio readResult/inspection:13pass/55assertions, exit0.
- Serviço python-inspection/python-requests:20pass/103assertions, exit0.
- BFF wrapper + HappyDOM free-options:3pass/28assertions, filho nativo15pass/51assertions, exit0. Negativos/summary do wrapper atual:6pass/47assertions, exit0.
- `bun scripts/verify-python-structure.ts ../../.cache/studio-python-l0/cpython-3.14.2/python.exe`:20cenários CPython3.14.2 + reader/schema reais, exit0.
- `.cache/studio-python-l0/review078-type-parameter.py`:cinco genéricos + limite de nome/compile legado, exit0. `.cache/review078-structure-bounds.ts` (Studio):dez casos limites exatos/excedidos de categoria/total/calltarget/UTF16/nós/bytes, usando Corelimits/analyzer/wire/schema reais, exit0.
- Biome16arquivos do escopo:exit0, sem fixes.
- `.cache/review078-final-check.ts` (StudioRuntime):YAML/contagens/author/provider lidos e conferidos, exit0.

Provas reais executadas pelo implementador e revalidadas por leitura + Core/probes leves do revisor:

- SDKstructure1:38365209-973b-4a8c-9102-0595a1a0ce1e, dois módulos BOM/vazio, exit0.
- SDKstructure2:0a140be9-49ab-4c91-8cbe-4e511e57c336, quatro módulos incluindo generic[T]/comprehension/filter/alvos dinâmicos não resolvidos/Latin-1, exit0; report e metadata exatos, runtime0dc9d3b450a13930be19755d7cb33d187dc13c84d1eae1e4b2eb197c134e0783, revisãoeea67b8ff7b059ded4ac2692a48238602aca22806ab1f761fa96351d383e904c, remove200, cleanup.after[]. `.cache/review078-wasm-artifacts.ts <uuid>` confere report completo, SHA dos bytes e dos módulos de runtime relevantes, marker/deployment e nomes owned.
- Chrome/Edge: `.cache/studio-python-runtime/runs/l6-structure-browser-1/report.json`,6/6, zero skip/retry/errors. `.cache/review078-browser-artifacts.ts` confere todos os anexos e recria payloads com a fixture real e distribuição EXATA do browser para revalidar revisão/report/estrutura pelo Core. Cobre válido compile-only, structure(BOM/typeAlias/generic/comprehension/filter/calls/empty) e return inválido; o spec também exige zero pageerror, iframe removido e ausência de execução do programa. Browser runtime a2b0cb30604b5b2adaaef47426c39b54b9997ca25e880006e43e8eeeddd04bc2. Não substituir pela seleção SDK, que possui metadata de release distinta.

Correções somente em produção pelo implementador; o revisor alterou apenas issues/notas e caches. Probes iniciais de artefatos assumiram a seleção SDK para o browser e encontraram cache histórico incompatível; foram corrigidos para localizar a distribuição exata validada pelo Core. Nenhuma divergência real foi ignorada. O log browser contém avisos NO_COLOR/FORCE_COLOR; não há erro de teste. Tempos funcionais SDK/browser não representam30samples/performance.
