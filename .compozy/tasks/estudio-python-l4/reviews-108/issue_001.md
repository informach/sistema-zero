---
status: resolved
file: packages/studio/src/components/tutor/ProRevisionDiff.tsx
line: 74
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Diff Python depende de contribuição carregada pelo editor

## Review Comment

DiffSurface cria seus dois modelos em plaintext e chama setModelLanguage com a linguagem inferida pelo path. Para .py, os helpers retornam corretamente python, mas este consumidor não registra a contribuição Python antes de pedir a linguagem ao Monaco. configureMonacoWorkers registra os serviços JS/TS; a contribuição Python é importada separadamente por PythonProCodeEditor. Assim, abrir a revisão antes desse editor ou em um host que renderiza somente o painel deixa ambos os modelos plaintext. O diff perde a linguagem/tokenização Python por uma dependência de ordem externa ao componente.

Confirmado por leitura dos arquivos e prova real fornecida pelo implementador `.cache/studio-python-l0/l6-python-builder-review-browser-1.log`: Chrome e Edge criaram os dois modelos reais, mas reportaram plaintext,plaintext em vez de python,python. Os dois controles JavaScript passaram. Traces e error-context foram preservados em builder-review-browser nos casos pro-builder-review-Python...-chrome/edge. O fixture usa Panel/Monaco/estado reais, adapter controlado e não carrega PythonProCodeEditor; isso isola a contribuição ausente. O teste falhou antes de aplicar, portanto essa execução não qualifica ainda o reload/undo Python.

O consumidor do diff deve carregar a contribuição Python sob demanda para caminhos Python antes de setModelLanguage, preservando o caminho JS. Capturar o par de modelos e retirar continuacões antigas quando path mudar, o componente desmontar ou StrictMode refizer a montagem. Falhas de carregamento devem ficar observáveis, sem editar fontes nem impor uma importação Python ao fluxo JavaScript.

## Triage

- Decision: `VALID`
- Plano do implementador: registrar a contribuição oficial Python por import dinâmico no efeito da linguagem do diff; capturar o par e invalidar a continuação na retirada/troca de path. Manter JavaScript síncrono e sem esse download. Mostrar falha de carregamento junto da comparação. Repetir o browser real sem relaxar a linguagem esperada; testar retirada/erro em recorte isolado.
- Notes: VALID/resolved. Patch importa contribuição só no path Python antes de selecionar linguagem; captura par/active e exige models.current===pair, erro de import vira alerta observável. Próprios caches passaram3/8(successJS/Python/StrictMode/pathstale/cleanup) e1/6(falhaimport/alerta/recuperaJS/dispose). Counterfactual isolado restaurando SOMENTE o efeito antigo falha2pass/1fail/6asserts com plaintext/plaintext, log review108-diff-before.log. Permanentes autorizados em novos ProRevisionDiff.test.ts+fixtures/pro-revision-diff.cases.tsx isolam os mocks por subprocesso e preservam os4casos; combo wrapper+PanelPy8/58 exit0, Biome2. Browser2 fresco (l6-python-builder-review-browser-2.log; artifacts builder-review-browser-2) passou a seleção real python,python em Chrome/Edge e avançou até reload, onde falhou por causa QA independente: fixture registrava persistence na função hook em vez da StoreApi. Probe própria review108-persistence-identity.test.tsx+wrapper3/14 exit0 confirmou objetos com métodos comuns mas chaves WeakMap distintas; produto usa a API real. Isso não reabre o diff nem qualifica apply/reload/undo: browser3 de QA ainda era subsequente ao fechamento específico do diff. Revisor não editou produção e não se alega BFF/SDK por browser com adapter controlado. Erro de sintaxe inicial na cópia cache foi corrigido antes da reprodução causal final e não é defeito do produto.
