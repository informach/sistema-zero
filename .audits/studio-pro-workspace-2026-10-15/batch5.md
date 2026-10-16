# Lote 5 — construção independente da aba

Revisão integrada em 16/10/2026. Decisão documentada antes de alterar o fluxo em `docs/architecture/studio-pro-builder-coordinator.md`: Members coordena pela fila persistida no Postgres; member-shell executa uma etapa autenticada por segredo de serviço. A criação grava o contexto imutável junto do job; não há janela entre criar e enfileirar. Browser não envia mais `advance`; polling é limitado e não autoriza inferência.

Achados corrigidos na revisão:

- Jobs terminais com registro de consumo pendente precisam permanecer elegíveis para conclusão idempotente. As consultas alternam execução e conclusão financeira sem repetir modelo.
- Encerrar Members deve aguardar também a leitura de fila, além de abortar/aguardar entregas.
- O proxy de sessão/CSRF do Kids bloquearia a chamada interna: a rota foi explicitamente excluída e mantém autenticação própria. Gateway restringe a consulta de disponibilidade a HMAC member-shell.
- Consultar estado durante polling precisava reiniciar a consulta depois da operação explícita; o efeito agora acompanha o estado ocupado e descarta respostas de gerações anteriores.
- Removidos adapters antigos de testes e fixtures; não há suporte paralelo a `advance` de navegador.

Migration `0125_opposite_guardian.sql` gerada por `bun run db:generate`, revisada: apenas contexto de execução obrigatório e índice parcial de fila. Sem backfill porque não há jobs Pro existentes, conforme instrução do usuário.

Evidências:

- 5 testes do coordenador, 11 asserções: entrega falha, nova instância, concorrência limitada, retry financeiro e shutdown.
- 48 testes de ProBuilderPanel/recuperação/Zappy, 206 asserções, incluindo cancelamento vencendo polling atrasado.
- 36 testes de BFF/executor/ferramentas, 170 asserções; nova rota interna + BFF: 28 testes, 113 asserções.
- PostgreSQL 16.15 nativo, cluster exclusivo `.cache/studio-pro-review-pg`, porta 15458, banco `studio_pro_review`: 20 testes ledger/conta/builder passaram; após adicionar cenários de fila/contexto, 12 testes builder passaram, 69 asserções. As migrations foram executadas no banco real. Nenhuma chamada paga de IA.
- Teste com o matcher real do Next confirmou executor fora do proxy e rotas do aluno dentro (3 asserções). Configuração Gateway: 36 testes, 165 asserções.
- Typecheck Members passou; typechecks completos e cenários de navegador do conjunto são repetidos no lote final.

Configurações de implantação estão no ADR e nos `.env.example`; não houve implantação ou alteração de segredos. A ausência de configuração impede aceitar novas construções.
