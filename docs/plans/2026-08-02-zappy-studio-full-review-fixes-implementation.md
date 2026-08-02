# Plano de implementação — correções do Zappy no Estúdio Completo

1. Criar regressões no `member-shell` para classificação, cota, piloto, `allowBlocks`, chamada única ao provider e orçamento do prompt; confirmar que falham pelo comportamento atual.
2. Extrair a política server-only do piloto, usá-la no BFF e nas páginas Full/Pro do Community Kids e passar `zappyEnabled` aos clientes.
3. Reordenar reserva, resposta determinística e cota; substituir a normalização por IA por busca textual local e refinar as intenções de Pinta, Pensa e conteúdo externo.
4. Montar o catálogo efetivo com `allowBlocks`; implementar recuperação determinística de blocos/manuais e orçamento total em bytes UTF-8, preservando bloco selecionado e contexto prioritário.
5. Criar regressões do Studio para retry idempotente, encerramento do cooldown, abertura por `blockType` e renderização de referências de aula; implementar os quatro fluxos no contrato e no painel.
6. Propagar `courseSlug` autoritativo por `members` → gateway/BFF → resposta persistida e configurar o host Kids para abrir a aula em nova aba com `noopener,noreferrer`.
7. Criar uma regressão de aula com vários vídeos e corrigir o health report para detectar qualquer transcrição ausente.
8. Reproduzir a consulta de métricas com os dois limites temporais, trocar o SQL cru pelo comparador tipado e testar a rota. Separar os estados e erros dos três painéis do Admin.
9. Atualizar documentação e contratos afetados, revisar compatibilidade de respostas históricas e executar Biome nos arquivos alterados.
10. Rodar testes direcionados, suites completas de `studio`, `community-kids`, `member-shell`, `members` e `admin`, typecheck, builds de Community Kids/Admin e Playwright do Zappy.
11. Revisar o diff final contra os onze achados, confirmar worktree e registrar limitações de integrações externas.
