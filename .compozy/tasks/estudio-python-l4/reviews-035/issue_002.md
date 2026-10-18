---
status: resolved
file: packages/studio/src/python/language/editorSession.ts
line: 289
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Atualizar prioridade dos diagnósticos ao trocar de aba

## Review Comment

`diagnose` prioriza o arquivo ativo ao solicitar `projectDiagnostics`, cujo resultado é limitado a 100 itens. Entretanto, o listener de `editor.onDidChangeModel` chama somente `reveal`: alternar para outro modelo já criado não dispara `update` nem uma nova consulta. Se o arquivo A consumiu os 100 diagnósticos, B permanece sem marcadores ao se tornar ativo, até haver alguma edição ou outra alteração que provoque análise. A pré-criação dos modelos torna esse caminho normal ao alternar abas.

Reprodução independente: criar A e B antes da primeira análise, responder com os 100 diagnósticos permitidos em A e mudar o modelo ativo para B sem editar a árvore. Após a janela de debounce, a única consulta continua apontando para `a.py`; `b.py` tem zero marcadores apesar de ser o arquivo ativo. A política de priorização no servidor não é reaplicada.

Incluir a troca efetiva do modelo ativo na invalidação/agendamento da análise, conservando o debounce e o escopo desta instância. A regressão deve pré-criar ambas as abas, atingir o limite em A e comprovar que B passa a ser priorizado depois da troca sem digitação. Evitar nova análise quando apenas a seleção/cursor muda dentro do mesmo modelo.

## Triage

- Decision: `VALID`
- Notes: Corrigido chamando update na troca do modelo ativo, conservando o debounce e o teto de diagnósticos.

## Verification

- `.cache/studio-python-l0/review035-session.ts`, via `bun run`, antes das correções: exit 0; `{"case":"switch-existing-tab-after-diagnostic-cap","active":"b.py","queryPaths":["a.py"],"activeMarkers":0}`.
- Sessão e providers reais; registro de modelos/editor e resposta Pyright são controlados pelo harness. Nenhum navegador/TSC foi iniciado pelo revisor.

## Revalidation

- `bun run .cache/studio-python-l0/review035-revalidate.ts`: exit 0; `{"case":"switch-existing-tab-after-diagnostic-cap","active":"b.py","queryPaths":["a.py","b.py"],"activeMarkers":1}`.
- Ambas as abas já existem antes da primeira análise. A fonte de A contém 100 identificadores indefinidos distintos; o transporte controlado reproduz o resultado limitado de A. Trocar para B sem editar dispara a nova consulta após debounce e publica seu marcador.
