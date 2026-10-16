# Coordenação durável do construtor Pro

Decisão de implementação, 16/10/2026. O Members já é um processo Bun de longa duração e dono do Postgres, leases, cota e ledger. O member-shell já é dono da inferência e da integração com o runtime. Preservar essas responsabilidades.

## Protocolo

1. O BFF autentica e autoriza o pedido, valida o snapshot e grava o job com contexto de execução imutável (origem do preview e autorização privilegiada recebida do host). Nenhum cookie, sessão do navegador ou chave de provedor entra no job.
2. A própria linha ativa do job é a intenção durável de execução. Não existe um segundo envio obrigatório após o commit. O coordenador Members consulta essa fila ao iniciar e periodicamente; entrega falha continua elegível para nova consulta até o prazo total.
3. O coordenador chama um endpoint interno do member-shell autenticado por segredo de serviço. A URL de destino vem somente da configuração do servidor. O endpoint executa uma etapa limitada reutilizando o lease de trabalho atômico existente. Réplicas ou entregas duplicadas não autorizam outra inferência.
4. Leases e versões continuam nos checkpoints. Um processo perdido antes do claim permite nova entrega; uma geração interrompida após claim encerra como incerta/falha quando o lease expira, sem repetir automaticamente uma chamada paga. Validação pode ser retomada dentro do limite existente. O prazo de cinco minutos e os limites 3+3 permanecem.
5. A varredura também reconcilia expiração mesmo se o executor estiver indisponível. Cancelamento e exclusão persistidos vencem checkpoints tardios. Encerrar o navegador apenas interrompe consultas da UI.
6. A UI faz polling limitado, sem comando `advance`. Retomar uma tarefa significa consultar seu estado; criar outro pedido exige envio explícito. Disponibilidade de execução é conferida nos serviços antes de aceitar trabalho novo.

## Operação e validação

A configuração é um par URL/segredo no Members e o mesmo segredo no member-shell. A origem do preview é capturada pelo BFF autenticado, validada e armazenada no job; nunca usada como URL de despacho. Requests internos têm prazo e resposta mínima, sem snapshot, segredo ou conteúdo do aluno em logs. O coordenador tem concorrência limitada, impede ciclos sobrepostos e é encerrado junto ao serviço. Um restart retoma pela consulta Postgres.

Mudança de schema gerada por Drizzle, sem backfill fictício: o usuário informou que não há jobs nem usuários Pro existentes. Aplicar a migration antes dos novos serviços; manter os demais schemas/intérpretes do Sistema Zero. Não há implantação nesta tarefa.

Testes devem provar falha de entrega, retomada por nova instância do coordenador, disputa de claim, expiração com executor fora do ar, cancelamento durante validação, polling da UI e ausência de inferência duplicada. Inspecionar migration e executar testes Postgres em banco local dedicado quando disponível.

### Configuração de implantação

- Members: `STUDIO_BUILDER_EXECUTOR_URL` aponta para `https://<host-kids>/api/internal/studio-builder/execute`; `STUDIO_BUILDER_EXECUTOR_SECRET` é um segredo exclusivo de pelo menos 32 caracteres. HTTP é aceito somente para localhost fora de produção. URLs com credenciais, query ou fragmento são recusadas.
- Community Kids/member-shell: configurar o mesmo `STUDIO_BUILDER_EXECUTOR_SECRET` junto das configurações existentes do runtime. A rota fica fora do proxy de sessão/CSRF do navegador e exige o segredo próprio; não aceita cookies como autenticação.
- Gateway: disponibilizar o endpoint HMAC `POST /members/internal/studio-ai/builder/availability` somente para o consumidor member-shell. BFF e Members recusam criações quando a configuração necessária está ausente; consultas, cancelamento e limpeza continuam disponíveis.
- Ordem: migration gerada `0125_opposite_guardian.sql`, código/configuração dos serviços e verificação de conectividade. A disponibilidade informada representa configuração, não uma garantia de saúde contínua da rede. Entrega indisponível permanece pendente até o prazo do job e gera `studio.builder_delivery_failed`, sem conteúdo do aluno.
- Jobs terminais com ledger ainda aberto também entram na varredura, alternados com execução ativa. Concluir esse registro é idempotente e não chama o modelo. O encerramento do Members aguarda a consulta de fila e cancela/aguarda entregas em andamento.

Para verificação local, usar somente `STUDIO_REVIEW_DATABASE_URL` apontando para `localhost`/`127.0.0.1`, banco `studio_pro_review`. A suite real de ledger aplica as migrations de cota; em seguida a suite builder aplica suas migrations. Não há backfill nem suporte ao antigo `advance` de navegador.
