---
status: resolved
file: experiments/studio-python-l0/resources.ts
line: 197
severity: medium
author: claude-code
provider_ref:
---

# Issue 001: Falha tardia deixa parecer de aprovação no relatório

## Review Comment

Após concluir as asserções, resources.ts e entrypoint.ts atribuíam qualification aprovado. Se browser.close falhasse ou a verificação final de hashes encontrasse alteração, o JSON mantinha a aprovação junto de failure/cleanupFailure. security.ts, reference.ts e termination.ts tinham variantes da mesma inconsistência. A saída do processo era não zero, mas consumidores do JSON podiam interpretar aprovação. Centralizar a invalidação antes de persistir, preservando as amostras e a causa.

## Triage

- Decision: `VALID`
- Notes: Corrigido por finalizeEvidence em checks.ts, chamado pelos cinco probes após verificações finais. Teste cobre limpeza, integridade/perfil e preservação das amostras. 10 testes do harness passam; TypeScript e Biome passam. Revisor readonly reavaliou chamadas e executou quatro testes checks.test.ts, sem achados adicionais. Também garantido fechamento do servidor de termination.ts em finally se browser.close rejeitar. Nenhum runtime/protocolo foi alterado por essa correção.
