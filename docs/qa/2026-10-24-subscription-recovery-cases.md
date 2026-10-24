# Casos duráveis de regularização — domínio e PostgreSQL

Lote de base, ainda sem conexão com o scheduler, Messaging ou rotas administrativas.
Não inicia mensagens, cobranças ou cancelamentos reais.

O caso conserva origem, consumidor, assinatura/cobrança, público e política
versionada. A falha fica separada do aceite identificado do primeiro aviso; só esse
aceite inicia a janela. A agenda D3/D6/D7 não reinicia por reentrega, e lembretes
acumulados se agrupam no mais recente. Pagamento confirmado encerra o caso; resultado
incerto ou contato falho exige revisão. D7 solicita cancelamento, sem declará-lo
concluído antes da confirmação. O caso não concede acesso nem executa débito.

Migration `0010_subscription_recovery_cases` gerada pelo Drizzle, sem SQL manual.
O repositório recusa primeira compra sem ciclo pago, origem alheia/valor divergente,
caso ativo duplicado e gravação por lease vencido/obsoleto. A posse é por UUID e
versão, adquirida com SKIP LOCKED em transação curta; eventos e estado são atômicos.
As chaves do lease não entram no snapshot do domínio.

Verificação local: 20 testes de domínio + seis de PostgreSQL real, 79 asserções.
Suíte Payments completa: 411 testes / 1.067 asserções, zero falhas/skip; typecheck
passou. Os testes incluem duas réplicas, fencing, reabertura, outbox, prazo sem
aviso e NULL em política JSON. A prova usa banco novo descartável com migrações
desde o início. O banco da primeira geração não commitada ficou preservado.

Uma tentativa inicial identificou SQL `FOR SHARE OF` com nome qualificado emitido
pelo ORM. A consulta passou a usar `FOR SHARE` nas suas duas tabelas de origem,
que são precisamente as duas linhas a proteger; o negativo e o resultado posterior
foram preservados. Não há transação aberta durante chamada externa.

Pendentes: política administrativa/ativação, admissão de falhas novas e campanha
revisada das históricas, recibos de comunicação e reconciliação, exclusão mútua com
retry financeiro, auditoria dos motivos humanos de cancelamento, aplicação do D7
e experiência integrada nos dois públicos. Este lote não conclui o primeiro full
review nem a entrega financeira.
