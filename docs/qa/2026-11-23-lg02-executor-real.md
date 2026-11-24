# LG02 — prova no executor real de staging

23/11/2026. **Não qualificado para produção. O aquecimento e a reutilização permanecem fora da candidata LG01 do PR #283.**

O Worker de staging foi implantado a partir do código `f8910ee05`, após conferir o perfil da imagem e repetir 39 testes de contratos. Versão Cloudflare: `da46b655-88d9-4832-9229-039ed7e0f18b`. Nenhuma implantação de produção foi feita nesta prova.

O teste abriu duas abas reais do Chrome. As páginas chamaram um relay restrito a loopback, que enviou os pedidos ao executor real a partir do Members de staging por SSH. O bearer ficou no serviço remoto. Os jogos e as identidades de execução eram sintéticos, sem login em contas de crianças ou alteração de seus projetos. Isso qualifica a concorrência do executor; não substitui o percurso autenticado inteiro da aula pelo Members.

## Resultados

| Prova | Resultado |
| --- | --- |
| Primeira verificação de um HTML pequeno | 200; objetivo passou; 6.992 ms |
| Aquecimento do mesmo contêiner | 200; 2.273 ms |
| Repetição da verificação | 200; objetivo passou; 2.551 ms |
| Duas abas, mesma identidade, projetos com marcas diferentes | Ambas 200, com suas marcas corretas; 4.748 e 7.543 ms |
| Pedido de aquecimento inválido | 400; a verificação seguinte passou |
| Programa que entra em laço infinito | 500 `CHECK_FAILED`; a verificação seguinte recuperou |
| Uma aba falha enquanto a outra faz uma verificação válida mais longa, mesma identidade | **As duas falham**: 500 `CHECK_FAILED` em 19.703 ms e 500 `BUILD_FAILED` em 19.594 ms |
| Contraprova: mesma sobreposição, identidades diferentes | A aba inválida falhou como esperado; a válida **passou os dois objetivos**, 200 em 23.238 ms |
| Executor da LG01, mesma identidade e falha sobreposta | A aba inválida falhou; a válida **passou os dois objetivos**, 200 em 22.871 ms; recuperação seguinte 200 |

Esses números pertencem a um projeto pequeno e a poucas execuções. Não são uma estimativa de p95, de todos os jogos ou da latência do aplicativo completo.

## Achado R12: falha de uma aba interrompe a outra

O Worker reutiliza `objetivos-${executionId}` por perfil. `runProjectCheck` e `warmProjectCheck` podem operar ao mesmo tempo nessa instância. No caminho de falha, `finishCheckSandbox`/aquecimento destroem a instância inteira. As pastas aleatórias separam arquivos, mas não dão a uma execução propriedade exclusiva sobre a vida do contêiner.

A contraprova com outra identidade preserva o pedido válido. O defeito reproduzido está na vida compartilhada do contêiner, não no projeto longo, no limite de espera do objetivo ou numa falha geral do executor.

**Proteção da LG01:** os três commits de aquecimento/reutilização foram revertidos na candidata. Ela conserva um contêiner exclusivo por pedido. Não reintroduzir apenas o aquecimento da UI nem tratar uma repetição bem-sucedida como qualificação de concorrência.

Após a reprodução, o Worker de staging foi substituído pelo executor da LG01, versão `29dac658-1fa6-4aa2-8778-e887cd8d2d1d`. A mesma prova de sobreposição passou para a execução válida. O endpoint de aquecimento voltou a responder 404 por estar ausente da candidata; essa ausência é esperada nesta versão. A reutilização defeituosa não permaneceu ativa no Worker de staging.

**Para retomar LG02:** definir exclusão/propriedade das execuções no próprio recurso compartilhado, incluindo aquecimento, falha e limpeza. Uma trava só na memória de um processo do Members não coordena réplicas. Uma operação não pode destruir uma instância que outra ainda usa. Repetir esta reprodução após a correção e exercitar falha de limpeza, suspensão, capacidade e o fluxo autenticado completo antes de decidir uma promoção.

## Evidências locais

- [Instrumento da prova](../../.audits/review-7-dias-2026-11-23/lg02-real-executor.mjs).
- [Execução inicial e concorrência simples](../../.audits/review-7-dias-2026-11-23/lg02-real/results.json).
- [Falha sobreposta na mesma identidade](../../.audits/review-7-dias-2026-11-23/lg02-real/reuse-overlap-failure-results.json).
- [Contraprova com identidades diferentes](../../.audits/review-7-dias-2026-11-23/lg02-real/isolated-failure-results.json).
- [Proteção da LG01 no executor real](../../.audits/review-7-dias-2026-11-23/lg02-real/lg01-isolated-overlap-results.json).
- [Aba A](../../.audits/review-7-dias-2026-11-23/lg02-real/tab-a.png) e [aba B](../../.audits/review-7-dias-2026-11-23/lg02-real/tab-b.png).

O código do aquecimento foi preservado na branch `work/lg02-aquecimento-20261123`, baseada em `f8910ee05`, para correção e nova qualificação. A correção de tipos R11 já foi registrada nessa branch no commit `e10542acb`: a ausência do aluno é representada por `null`, conforme o contrato. O wrapper da UI passou e o typecheck completo do member-shell terminou com código zero no checkout dessa branch; Biome aprovou a fixture. Logs locais: `.audits/review-7-dias-2026-11-23/lg02-fixture-green.log` e `lg02-fixture-typecheck.log`. Esse ajuste preserva a correção da auditoria para a retomada; não corrige a concorrência R12. Os executores da candidata LG01, inclusive o implantado em staging ao final desta prova, excluem a reutilização.

A versão operacional posterior `96d176d0-4055-4f1a-9b35-3cf5338f3a76` conserva o código e a imagem seguros da LG01, com o catálogo Python anterior correto `05294b0…` restaurado. A troca temporária incorreta para o catálogo histórico `f69814b…` foi desfeita após corrigir a leitura cronológica dos deployments. A alteração de catálogo não é uma nova qualificação do aquecimento; veja a configuração efetiva e a correção do diagnóstico no [acompanhamento LG01](2026-11-23-lg01-melhorias-prontas.md).
