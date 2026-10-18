---
provider: manual
pr:
round: 4
created_at: 2026-10-16T22:44:26Z
---

## Summary

- Total: 2
- Resolved: 2
- Unresolved: 0

## Scope

Manifesto e política Python compartilhados no Core, armazenamento e entrega de distribuições no serviço runtime, integração opcional do handler, builder e harness provider/server. Revisões 001–003 lidas e resolvidas; os achados desta rodada são novos. Catálogo de produto, UI e lotes posteriores não são tratados como concluídos nem como ausências indevidas desta fatia.

## Evidence

- `bun test tests/python-distributions.test.ts`, em packages/studio-runtime: 6 testes, 53 verificações, nenhuma falha.
- Biome dos oito arquivos prioritários passou sem correções; git diff --check passou.
- Reprodução independente da inicialização com lista de aprovações alterada após a chamada: a release acrescentada passou a ser servida com HTTP 200.
- Reprodução independente dos caminhos de erro após GET: HTTP 404, dois streams abertos e apenas o marcador cancelado, tanto para status que lança na segunda consulta quanto para HTTP não local recusado pela CSP.
- Conferida a documentação primária [R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/): put condicional retorna null em conflito; o checksum fornecido no upload é validado e fica disponível em checksums no objeto retornado. A estratégia de gravação imutável com marcador por último corresponde a esse contrato.

Não foram executados probes concorrentes de navegador nem alteradas fontes. Não se afirma validação em R2 remoto: as reproduções e os seis testes usam armazenamento local instrumentado. O handler mantém o caminho Python desabilitado quando não recebe uma distribuição aprovada.

## Revalidation

- Os dois achados foram corrigidos e revalidados independentemente. Configuração estática capturada antes dos awaits; streams não entregues cancelados em finally.
- bun test tests/python-distributions.test.ts: 8 testes, 60 verificações, nenhuma falha. Biome dos dois arquivos e git diff --check passaram.
- A reprodução de aprovação tardia agora retorna 404. Os caminhos de status que lança e CSP que recusa agora registram 2 streams abertos e 2 cancelados. Rejeição do próprio cancelamento também preserva a resposta 404.
- Rodada encerrada com 2 resolvidos e 0 pendentes. Não foram executados probes de navegador concorrentes nem ampliada esta conclusão para L3 completo.
