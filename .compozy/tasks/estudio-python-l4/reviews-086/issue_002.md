---
status: resolved
file: packages/studio-runtime/src/python-job-state.ts
line: 75
severity: medium
author: claude-code
provider_ref:
---

# Issue 002: Undefined apaga retirada monotônica do preview

## Review Comment

A nova previewRetired é opcional no estado e nas changes. O schema z.literal(true).optional() rejeita false, mas aceita propriedade presente com undefined. update espalha changes sobre current; {previewRetired:undefined} sobrescreve true, o schema de estado aceita novamente a ausência e a versão SQL é persistida. previewAvailable volta a true para um preview explicitamente descartado, quebrando a monotonicidade prometida pelo store.

Reprodução independente: `bun test ./.cache/review086-admission.test.ts -t 'optional undefined'`, cwd Runtime, exit1/0pass1fail/2assertions. Classe DO de produção e SQLite real com portas de handler/SDK controladas em processo isolado: validate→succeeded→discardPreview→previewAvailablefalse; store.update(current,{previewRetired:undefined}) faz previewAvailabletrue (expectedfalse). A mesma prova também confirmou que a flag persistida vira undefined. Não há caller atual observado passando essa mudança e undefined não é expressável em JSON HTTP; severidade medium de invariante interno, não alegação de exploit HTTP/browser.

Rejeitar qualquer tentativa explícita de retirar a flag játrue, ou preservar true na construção do próximo estado. Updates que omitem o campo continuam válidos. Cobrir undefined além de false para que o schema opcional não permita regredir a decisão persistida.

## Triage

- Decision: `VALID`
- Notes: Correção revalidada: guard rejeita current.previewRetiredtrue com campo presente e valor diferente de true; updates sem campo preservam flag. Suite própria DO+SQLite7/55 exit0 inclui reprodução original undefined, normalcancel/retention/discard/instância nova. Permanente controlledcontroller wrapper1/2 exit0, processo Bun isolado e nenhum workerd/SDK iniciado pelo revisor; Biome1 exit0. Scope interno preservado, sem alegação de exploit HTTP. Nenhuma fonte/teste permanente alterado pelo revisor.
