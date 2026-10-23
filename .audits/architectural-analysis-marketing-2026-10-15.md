# Full review inicial — marketing desktop
Data: 15/10/2026. Escopo: todos os 27 arquivos da bancada L0, composição, scripts, configuração e testes; proposta e critérios dos lotes.
Checkout: C:/Users/tocha/projects/sistema-zero-marketing, branch feat/marketing-desktop-colaborativo, base 7981caf7a4fb6773ebb804405bf7ad6f6551814f. Alterações de Studio continuam no checkout original.

## Achados
| Prioridade | Achado | Resolução |
| --- | --- | --- |
| Alta | Prompt não limita ferramentas nativas. Configuração de MCP/hooks/plugins do usuário era herdada. | L0: desativar recursos e servidores por configuração do processo; testar o catálogo efetivo e inferência real. |
| Alta | Imagens nativas podiam ser lidas de qualquer caminho e o limite era conferido depois de alocar o arquivo. | L0: realpath dentro da pasta nativa, stat antes da leitura, limite de base64 antes da decodificação. |
| Média | Status/abertura nativa não eram canceláveis em todas as fases. Login escutava eventos só depois da resposta inicial. | L0: propagação de AbortSignal e captura de eventos desde o início. |
| Média | Erros de imagem não tinham código estável. | L0: erros tipados para ausência, falha, tamanho e caminho. |
| Alta para uso diário | Arquivos existiam em disco, mas registro e histórico não eram recuperados ao reabrir; URLs efêmeras eram persistidas. | L3: índice e fila duráveis, referências por ID/hash, reconstrução de URLs e migração da bancada. |
| Alta para uso diário | Não havia servidor compartilhado, identidade do Sistema Zero, idempotência ou autorização por objeto. | L1–L3. Ausência estava documentada e não deve ser chamada de recurso concluído. |
| Média | main.ts reúne IPC, janela, provas e supervisão de render; renderer reúne transporte e edição. | Extrair supervisão, protocolos e workbench nos lotes correspondentes. |
| Média | Testes não cobriam falha nativa de imagem, corrida de login ou reinício. | Acrescentar testes de protocolo e persistência e manter prova real separada. |
| Média | Composição única não é pipeline completo de vídeo. | L6: timeline validada, áudio, transcrição, legendas, efeitos e formatos. |
| Média | Copy do último resultado era usada como contexto, inclusive se o resultado anterior fosse de imagem. | L5: componentes distintos e revisões tipadas. |
| Baixa | Limites dispersos; métricas ainda só da prova. | Contratos compartilhados em L1 e execução em L3. |

Não foram encontrados arquivos completamente mortos nem ciclos entre os dois pacotes. Entrypoints de build, preload e render-worker são dinâmicos, portanto não são código morto por ausência de import estático. Não há acesso a banco no renderer. A composição é compartilhada e a deduplicação do Remotion permanece necessária.

## Execução contínua
O usuário determinou todos os lotes seguidos com review por lote, full review final, commit e merge em staging local. Essa instrução substitui a pausa entre lotes da skill executing-plans. Não fazer push ou deploy como consequência do merge local. L11 permanece condicionado às necessidades medidas previstas na proposta; não contratar serviços opcionais por inferência.

