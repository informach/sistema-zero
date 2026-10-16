# Full review do Helpdesk IA — segunda rodada

Revisão da implementação `ccef726b6`, já integrada anteriormente, sobre a staging local `b37fc3f72`. As correções desta rodada estão na branch `fix/helpdesk-full-review`. A revisão anterior permanece em [review da implementação](review-implementacao-2026-10-16.md); este documento registra os achados adicionais e sua validação.

## Escopo e método

O inventário da entrega anterior contém 142 arquivos: 89 de código/configuração, 29 de testes e fakes, 9 de documentação/avaliação, 8 de migrações/journal e 7 snapshots gerados. A revisão cruzou os fluxos do backend, console, portal adulto e Área dos Pais, contratos, gateway/BFF, persistência e operação. Snapshots foram verificados por geração do Drizzle e aplicação da cadeia de migrações, sem edição manual de SQL gerado.

A staging avançou desde a primeira entrega. O worktree de correção foi criado a partir da staging atual; as mudanças posteriores de configuração e limite de corpo do gateway foram mantidas. O workspace original, com trabalho de outras funcionalidades, não foi usado para as alterações. Durante a revisão, a staging avançou novamente para `a3ce614c0`, incorporando correções do Studio Pro; o delta foi conferido e não sobrepõe as mudanças do Helpdesk.

Foram procuradas falhas de comportamento, concorrência e integração, além de código sem consumidor. Casos confirmados receberam testes de regressão quando havia comportamento a proteger. A revisão não presume que testes sintéticos atestem qualidade editorial de um modelo real.

## Achados corrigidos

| ID | Problema e causa | Correção e evidência |
| --- | --- | --- |
| R1 | Transferências após uma resposta concluída e intervenções da equipe não apareciam no diagnóstico. A métrica dependia de jobs em `handoff`; um job já concluído não mudava de estado e a intervenção humana o tornava `superseded`. | Evento `automation_handoffs` gravado na mesma transação da transição assistente → humano, com o estado anterior sob lock. Cliente, watchdog, patch, nota, takeover e resposta usam a mesma regra. Índice único por ticket impede duplicação; confirmação explícita de resolução não é transferência. Diagnóstico e latência humana passam a usar o evento. Regressões verificam resposta já concluída, repetição, CAS malsucedido, intervenção durante inferência, primeira resposta humana e retenção. |
| R2 | Reabertura pela equipe não invalidava a resolução durável. Apenas uma nova mensagem do cliente registrava `reopened`. | Registro compartilhado de reabertura para cliente e patch da equipe, preservando a origem automatizada da confirmação anterior. Teste confirma que uma resolução reaberta não conta como durável após a maturação de sete dias. |
| R3 | A chamada ao provedor podia começar depois do prazo se a reserva ou a gravação de telemetria demorasse. A validação existia antes desses `await`s. | Nova conferência imediatamente antes de iniciar a rede. Dois testes vencem o prazo durante os hooks e exigem zero chamadas a `fetch`. Ambos falharam antes da correção. |
| R4 | Claim e reserva usavam a hora recebida antes de esperar pelos locks. Um job já vencido podia ser reivindicado ou receber reserva de custo. | Relógio reavaliado após os locks, preservando a mesma regra já usada na publicação da resposta. Dois testes com hora anterior à espera falham sem esses guards e passam com eles; reserva recusada não consome orçamento. |
| R5 | O modelo podia declarar `reason=clarification` com `clarification=false`, escapando do contador de esclarecimentos. | Validação de coerência na resposta estruturada e novamente no publicador transacional. Os dois pares inconsistentes são recusados; o teste de limite de um esclarecimento continua passando. |
| R6 | Refresh da conversa podia saltar para as últimas 50 mensagens e avançar o cursor, tornando inacessíveis mensagens intermediárias. Polling e refresh também podiam aplicar cursores fora de ordem. | Console e portais fazem refresh incremental. O merge de páginas é compartilhado em `helpdesk-contracts`, preserva páginas anteriores, acesso ao histórico inicial e versões, e só avança o cursor usado pela própria requisição. Teste DOM com 60 novas mensagens falhou antes e passou depois; testes puros cobrem respostas tardias, outro ticket e hidratação inicial. |
| R7 | Uma revisão da base podia vencer enquanto a publicação esperava por locks, mas ainda ser marcada como publicada. | Validade conferida com a hora atual depois de adquirir os locks do artigo e revisão. Regressão em PostgreSQL reproduziu a publicação indevida e agora exige rejeição. A busca já recusava fontes vencidas. |
| R8 | O pipeline do copiloto calculava e devolvia fatos sem consumidor e recebia um resumo ignorado. Comentários do editor ainda descreviam preenchimento automático. | Removidos `lastInbound`, `hasOutbound` e o parâmetro não utilizado; comentários descrevem inserção explícita e preservação do texto. Os 14 testes do serviço/worker e o typecheck foram repetidos após essa limpeza. |

Todos os achados acima foram corrigidos. Não foi necessário acrescentar dependências, serviços ou uma camada de compatibilidade entre versões.

## Revisão cruzada das correções

- Eventos só são gravados depois de uma mutação bem-sucedida, dentro da mesma transação. O estado anterior é lido sob lock; tentativas com versão incorreta não geram métricas falsas. Atendimento humano e modo sombra não geram transferência de assistente.
- A ordem de locks continua política → ticket → job nas operações automáticas, e ticket → job/mensagem nas operações humanas. Não há chamada de rede dentro dessas transações.
- O atendimento continua humano depois de uma transferência. O índice único por ticket expressa essa regra; uma futura funcionalidade de retorno ao bot exigiria rever explicitamente o modelo de eventos.
- Os eventos de transferência não dependem da permanência dos jobs ou das execuções da IA. Têm retenção de 90 dias, assim como os eventos de resolução, e não armazenam conteúdo ou identidade do cliente.
- O merge de páginas não interpreta o cursor opaco e não usa a data da mensagem para avançá-lo. A sequência persistida continua sendo a autoridade para atualização incremental, inclusive em entregas confirmadas tardiamente.
- Ownership, sessão parental, bloqueio de impersonação readonly, papéis de publicação, fontes autorizadas, seleção do canal, SLA e limites da automação continuam cobertos pelas suítes existentes.
- Relatórios de avaliação permanecem vinculados a modelo, prompt, índice e parâmetros da política. As correções não habilitam o piloto nem substituem avaliação editorial.

## Verificações executadas

| Verificação | Resultado |
| --- | --- |
| Backend completo, PostgreSQL 16.15 dedicado | 296 testes, 962 asserções, zero falhas, 41 arquivos |
| Contratos compartilhados | 9 testes, 27 asserções, zero falhas |
| Console Helpdesk | 26 testes, 193 asserções; typecheck e build Next aprovados |
| Gateway: configuração, registry e ambiente | 90 testes, 351 asserções; typecheck aprovado |
| Member-shell: Helpdesk, paginação, API, HMAC, refresh e readonly | 28 testes, 76 asserções; typecheck aprovado |
| Kids: conversa, portão parental, superfícies e vocabulário | 50 testes, 239 asserções, zero falhas; typecheck aprovado; inclui 4 testes DOM da conversa |
| Estática | Typechecks de backend, contratos, console, gateway, member-shell e Kids aprovados; lint do backend, Biome dos 24 arquivos TypeScript alterados e `git diff --check` aprovados |
| Migrações | `0020` aplicada sobre o banco de teste existente; cadeia `0000–0020` aplicada também em banco vazio; nova geração sem drift |

As suítes acima somam **499 testes distintos**. A suíte completa do backend foi repetida após as últimas correções no banco recém-migrado. Os testes do pipeline e de conversa repetidos durante a revisão não foram somados novamente. A suíte completa de todos os módulos do monorepo não faz parte dessa contagem. Os logs e o inventário local estão em `.audits/helpdesk-implementation-2026-10-15/full-review-*` e não entram no commit.

## Migração e operação

`0020_colossal_madrox` é aditiva: cria a tabela de eventos de transferência, uma chave estrangeira com exclusão em cascata e índices de unicidade/data. Não transforma nem apaga dados existentes. Como o Helpdesk ainda não foi utilizado, não há backfill de histórico artificial. A migração deve preceder a execução do backend corrigido.

Em um eventual rollback de código, a tabela adicional pode permanecer; não é necessário apagar eventos. Desligar a política é a ação operacional para interromper novas respostas automáticas. O [guia de operação](operacao-ia.md) foi atualizado com a origem das métricas e a retenção.

Não houve chamada a LLM real, envio Gmail real, push, deploy ou ativação do piloto. Os testes de interface usaram React em DOM de teste; não constituem uma sessão de navegador com todos os serviços conectados. A ativação continua dependendo de fontes/corpus aprovados, avaliação real revisada, limites de custo/coorte e capacidade da equipe.
