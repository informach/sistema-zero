---
status: resolved
file: packages/members/src/application/learning/gallery-delivery.service.ts
line: 245
severity: medium
author: claude-code
provider_ref:
---

# Issue 003: Commit concorrente devolve nota diferente da entrega aceita

## Review Comment

O callback gallery.authorize aguarda prepare fresco, mas ignora seu resultado completed. Se outro attempt do mesmo requestId termina durante a inspeção, a operação antiga continua com sua própria nota e responde com ela. O guard idempotente do repositório preserva corretamente a entrega vencedora; a resposta HTTP, porém, pode dizer reprovado enquanto o registro desse mesmo pedido está aprovado. A comparação de geração e os namespaces isolados corrigem099002, mas não essa divergência de receipt.

Reprodução independente no segundo caso de `packages/members/.cache/review099-copy-generation.test.ts`: A, fonte sem loop, suspende no transporte da inspeção; B usa a mesma seleção/requestId e outra geração, é aprovado score100/passedtrue e persistido. Liberar A faz suas reautorizações encontrarem completed; ainda assim A devolve score0/passedfalse. O snapshot persistido continua exatamente B antes/depois, confirmado pela prova. Resultado antes do fix:1pass1fail/25asserts exit1, falha na igualdade late.passed vs accepted.passed. O primeiro caso de isolamento físico permanece verde1/16.

Usa Gallery/Submit/policies, materialização TCP gzip, snapshots e verificadores reais com repos e transporte do compilador controlados. Não demonstra regressão da persistência transacional nem execução CPython/R2 real.

Ao encontrar completed nas reautorizações, interromper o fluxo antigo e devolver o receipt vencedor do mesmo pedido. Conferir também o receipt após Submit para cobrir conclusão concorrente entre a última autorização e o upsert idempotente. Manter distinção entre pedido idêntico e seleção/revisão conflitante e não expor exceção interna de controle na borda HTTP.

## Triage

- Decision: `VALID`
- Notes: Resolvido após revalidação independente. GalleryAlreadyCommitted é DomainError interno, transporta receipt e é capturado só no GalleryDeliveryService; fresh authorize interrompe a operação perdedora, sem expor erro de controle ao HTTP. Leitura após execute devolve receipt persistido se outra geração venceu entre a última autorização e upsert. Própria prova ampliada para ambas janelas (inspeção e persistência) junto do isolamento físico:3pass0fail/36asserts exit0 (`bun test ./.cache/review099-copy-generation.test.ts`, cwdMembers). Ambas respostas tardias passaram a score100/passedtrue, snapshot persistido B permanece exato. Wrapper permanente races1pass0fail/1assert exit0, child isolado preservado. Só probes cache/docs alteradas pelo revisor. Compilador/repos/storage controlados, reader TCP/verificadores/policies/consumidores reais; sem qualificação SQL/R2/SDK por esses testes. Novo registro durável/GC em revisão separada dentro do recorte, não inferir completude da feature.
