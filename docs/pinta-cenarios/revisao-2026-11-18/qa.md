# QA da revisão integral

O [relatório de verificação](qa/verification.md) registra comandos, resultados e limites por
ambiente. A [matriz da missão](cobertura.md) distingue capacidades implementadas, parciais
e pendentes. A [auditoria arquitetural](../../../.audits/pinta-2026-11-18.md) explica os
contratos e as correções.

As provas reproduzíveis ficam em `qa/`: resumo dos gates, hashes dos logs/pacotes,
capturas dos cenários e o ciclo real de bloqueio de camada no Tiled. Os casos detalhados
da revisão são mantidos na [rodada de issues](../../../.compozy/tasks/pinta-full-review-20261118/reviews-001/_meta.md).

Execuções locais e emuladas não equivalem a CI remoto, teste em aparelho físico ou
homologação autenticada em staging. A revisão não faz merge nem implantação.
