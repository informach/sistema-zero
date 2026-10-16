# Retenção dos intermediários de execução — 16/10/2026

## Falha e correção

Os arquivos de cada execução já entravam no orçamento de disco do app, mas a limpeza disponível na interface só liberava mídia confirmada e trechos de render. Execuções concluídas continuavam ocupando espaço indefinidamente. A limpeza agora inclui diretórios de execução confirmados, sem apagar recibos SQLite, resultados compartilhados ou arquivos pendentes.

O controle existente `Espaço neste computador` serializa a manutenção com a produção. Para cada pasta UUID do projeto, o app exige journal local confirmado e consulta novamente a execução no servidor. Projeto, pedido, contexto e resultado completo precisam coincidir; falha de rede, recusa, divergência ou trabalho incompleto preservam os temporários. A operação remove até 50 execuções/cerca de 1 GB por acionamento e pode ser repetida. O orçamento global permanece em 20 GB e reserva 2 GB livres para o sistema; não foi aumentado para ocultar o problema.

Os caminhos vêm do diretório interno do projeto e de UUIDs válidos. A árvore é conferida antes da remoção, vínculos/junctions são recusados e a localização real é revalidada dentro da raiz imediatamente antes da operação. Pastas sem recibo conhecido permanecem intactas. Não existe limpeza das pastas originais de importação.

## Evidências

- Três testes com arquivos reais verificam confirmação idêntica, retomada pendente no mesmo projeto, repetição, originais externos, resultado/projeto/contexto divergentes, rede indisponível, cancelamento e junction para destino externo. **15 asserções Bun**, além de `node:assert` para recusas (`tests-execution-cache-final.exit=0`).
- Desktop completo: **94 testes/1.932 asserções**, zero falhas (`tests-desktop-retention.exit=0`). SQLite/Node: **19 testes**, zero falhas (`tests-desktop-retention-local.exit=0`). Build passou (`build-execution-cache.exit=0`). O primeiro typecheck encontrou chave Map estreita no teste; corrigida com tipo explícito de chave, sem cast. A repetição de tipos passou (`types-retention-final.exit=0`).
- Electron real, pelo botão do produto: **141,98 KB/6 arquivos** liberados no projeto isolado. Inclui duas cópias de mídia e quatro temporários de execuções concluídas. A pasta da execução `0f0d328e-63d3-4bf1-aa33-c9258de9e0b0` desapareceu; seu recibo SQLite e resultado remoto permaneceram iguais. Uma cópia foi baixada novamente do R2 e verificada: 66.397 bytes, SHA-256 `82988f948a252ed2ca5a064c47b5f6e4d868993d38cda405d45c7194f2444348`.
- Evidências: `packages/marketing-desktop/.cache/metrics-learning-proof/execution-cache.json` e `cache-cleanup-evidence.json`; screenshot inspecionado. `proof-execution-cache.exit=0`. Reabertura do Electron e leitura da análise/pauta após a limpeza passaram (`proof-learning-reopen-cleaned.exit=0`), conservando os mesmos IDs e sem nova inferência.

## Limites

A limpeza é solicitada na interface, não uma exclusão automática por idade. Recibos, histórico e execuções recuperáveis são conservados. O ensaio real usou trabalhos textuais concluídos; os testes de proteção usam fixtures explícitas. Isso não substitui o piloto físico de duas máquinas nem a prova do clique de recuperação após encerramento abrupto do cliente de IA.
