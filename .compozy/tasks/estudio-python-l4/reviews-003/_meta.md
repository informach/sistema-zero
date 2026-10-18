---
provider: manual
pr:
round: 3
created_at: 2026-10-16T23:42:44Z
---

## Summary

- Total: 2
- Resolved: 2
- Unresolved: 0

## Scope

Perfil versionado limits.json, geração Python, guardas de tartarugas/itens, contrapressão por comandos/bytes/pontos/texto, protocolo/renderer, integração opcional e builder. Implementação somente leitura. Sem novos jogos, áudio, catálogo/UI ou conclusão de L4; nenhuma execução Playwright pelo revisor.

## Evidence

- Leitura integral de limits.json, _sz_turtle_limits.py, derive.py, screen.py.inc, backend, graphicsProtocol/tests, renderer, images, contract, interpreter.ts, workerEvents, builder e queue-limits.py; inspeção das regiões construtor/clone/clear do engine gerado.
- Unitários executados nesta rodada:18 pass,0 fail,113 verificações em workerEvents.test.ts, workerSupervisor.test.ts e turtle/graphicsProtocol.test.ts, exit0.
- Derivação executada somente em memória até antes de OUTPUT.mkdir: saída byteidêntica ao engine atual, SHA256540bc0433b14b0a62a4a59314127e237d58d1dabaa0e3e831935fa8a4d901e01. Perfil Python gerado comparado por AST com limits.json: iguais. Nenhum fonte foi gravado.
- queue-limits.py repetido com CPython3.14.2 -I -B:357 trocas,17.892 operações preservadas, maior pedido1.038.908bytes; exit0. Prova de transporte controlado, sem afirmar desempenho ou renderização browser.
- Builds Bun independentes em memória: worker1.148.829bytes e frame1.149.092bytes não minificados; parser/renderer/decoder e dados do perfil ausentes dos bundles iniciais, referências dinâmicas turtle-protocol.mjs/turtle-renderer.mjs presentes.
- Relatório engine-1792193807973911600.json inspecionado: dez pares aprovados, processos desktop e browser-engine exit0. Log l4-limits-browser.log inspecionado:22 testes reais aprovados em Chrome/Edge, incluindo preservação de entrada após imagem inválida. Essas provas não cobrem os dois casos registrados nesta rodada.
- Reproduções independentes dos achados usam CPython fixado, engine/backend reais e transporte controlado, não mocks para alegar equivalência gráfica. Fonte da implementação não foi alterada; somente estes registros de revisão foram criados.

## Revalidation

- Dois achados corrigidos e revalidados independentemente. Viewport 3840×2160 aceita Screen padrão e proporções dentro do teto; dimensões absolutas excessivas continuam recusadas sem mutar o tamanho anterior.
- Capacidade de itens verificada com cotas reais: construtor e clone sem linha requerem exatamente 3 vagas; clone com linha requer 4. Todas as recusas preservam a cena Python e permitem update, e cada sucesso atinge exatamente 100.000 itens com duas tartarugas completas. Processo exit 0; detalhes nos issues.
- Receita executada em memória após correção produziu SHA256 6c72e4f441b715ab7c4df12934dee81d6da141eec018ac69bed2736cf6063d36, byteidêntico ao engine atual. Constantes do perfil Python ainda coincidem com limits.json.
- Nenhum Playwright executado pelo revisor. Mudanças posteriores na política de assets Python/áudio e seus limites pertencem ao próximo recorte; não estão aprovadas neste fechamento.
