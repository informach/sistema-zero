# Política de regularização — persistência e seed

Base adicionada sem ativação automática: configuração única com versão, prazo,
lembretes, instante de ativação e autor. Cada mudança grava uma entrada de auditoria
na mesma transação. Casos existentes continuam com sua própria política congelada.

O seed `bun run db:seed:recovery-policy --environment local|staging|production`
mostra uma prévia; `--apply` inicializa somente se estiver ausente. Ele cria sete
dias/D3/D6 desativados, preserva configuração já editada e não manda mensagens nem
cancela assinatura. Produção/staging exigem IDs Railway de projeto e ambiente
correspondentes; local exige host de banco local. Não imprime conexão ou segredos.
As migrations devem ter sido aplicadas antes do seed.

Migration 0011 gerada pelo Drizzle. Quatro testes em PostgreSQL real / 19 asserções:
seed idempotente após alteração, concorrência de operadores com CAS, rollback da
política quando a auditoria falha e recusa de configuração incoerente/sem autor.
Suíte Payments com esta base e o ajuste de disponibilidade do cartão: 416 testes /
1.089 asserções, zero falhas/skip; typecheck e Biome passaram. CLI local provou
preview, inicialização desativada e segunda execução sem sobrescrever.

Rotas/editor administrativo e conexão da política à admissão/scheduler ainda não
foram implementados. Isso não é uma prova de ativação financeira, de entrega de
mensagens ou de comportamento no provedor.
