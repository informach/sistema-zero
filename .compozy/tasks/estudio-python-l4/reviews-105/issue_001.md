---
status: resolved
file: packages/members/src/infrastructure/persistence/drizzle/studio-builder.repository.ts
line: 600
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Aceite grava preview expirado durante a espera do repositório

## Review Comment

verifyPreview confere reference.expiresAt usando o argumento now capturado antes da transação/account lock. Depois dos awaits de aquisição/leitura/verificação, assertPythonAcceptanceLease confere um clock fresco, mas somente lease/expiry/deadline do job. Uma referência válida no início pode vencer durante essa espera e ainda ser persistida em review, mesmo que o job continue válido. A mesma janela existe em checkpoint review e preview-checkpoint.

Probe independente packages/members/.cache/review105-acceptance-fences.test.ts: StudioBuilderService, DrizzleStudioBuilderRepository e verificadores/materialização Core reais, SQL transaction port controlado e relatórios CPython/playtest controlados. Gate na aquisição do terceiro account lock, após as duas leituras de authorize-validation; nenhum UPDATE ocorreu. Avançar o clock para preview.reference.expiresAt+1, preservando lease do job futura, e liberar a aquisição produz1UPDATE e aceite review (esperado erro/zeroUPDATE). Controles: candidato válido grava; lease do job expirada é recusada. Matriz dos dois achados:2pass/2fail/18asserts exit1. Nenhum PostgreSQL ou SDK foi executado pelo revisor.

Conferir a validade da referência com clock fresco imediatamente antes do UPDATE de aceite, após todos os awaits, junto do fence de lease. Preservar a semântica da lease de renovação em review. Acrescentar gate PostgreSQL real no último account lock. Não reabre103, que trata autorização da lease: esta validade é a do artefato aceito no novo checkpoint B2.6.

## Triage

- Decision: `VALID`
- Notes: VALID confirmado pelo implementador. Resolvido: assertPythonAcceptanceLease compara também preview.reference.expiresAt com clock fresco após verificação e imediatamente antes de update() em checkpoint review e preview-checkpoint. Matriz independente ampliada para ambos os comandos:8pass/0fail/40asserts exit0; aguarda transaction port terminar antes de verificar writes0. Com lifetimes/B1/freepolicy/coordinator:36pass/0fail/176asserts exit0. SQL5 permanente do implementador conferida por leitura:15pass/0fail/69asserts, incluindo referência vencida enquanto o terceiro advisory lock está comprovadamente bloqueado (pg_stat_activity), sem mudar phase/version/candidate. Biome7/diffcheck exit0. Nenhuma SQL/heavy, produção ou teste permanente alterado pelo revisor. Recorte backend ainda sem disponibilidade BFF/executor/UI.
