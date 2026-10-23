# Implementação e reviews por lote

> Revisão posterior à integração: [full review de 16/10/2026](full-review-2026-10-16.md). Este documento preserva a evidência histórica da primeira entrega; a nova rodada registra os achados adicionais e suas correções.

Base inicial: staging `1e5b0debc`. Branch isolada `feat/marketing-instagram-engagement`. Plano executável: `docs/superpowers/plans/2026-10-15-marketing-instagram-implementacao-lotes.md`.

## Lote 1 — Contratos e política

Ficha incorporada como propriedade opcional da peça editorial. Revisão, sync e aplicação de propostas continuam no protocolo existente. Copy pode ajustar exclusivamente abertura/apresentação; destino, palavra e respostas de saída não são alterados por esse comando. Contratos validam identificação automática, tamanho, destino próprio e UTMs sem identidade individual.

Review encontrou uma inferência TypeScript inadequada na lista de palavras retornada por regex; corrigida com tipo explícito de lista, sem cast. Política testa acentos/limites de palavra, direct explícito, pausa, supressão, postback válido e janela por instante de origem. Salvar não tem vínculo com envio. Validação deste lote: teste de política (4 casos/18 assertions) e typecheck dos contratos; typecheck final do backend registrado após correção.

## Lote 2 — Persistência e autorização

Migrações aditivas geradas e aplicadas no PostgreSQL exclusivo `127.0.0.1:15465/marketing_review`. Configuração, equipe de canal, aprovação por revisão, ativação, conversa, jornada, entradas, intenções e recibos persistidos. A aprovação editorial e a solicitação de ativação são operações distintas; ativação fica aguardando prova de posse do post.

Review: acesso de leitura/edição ao projeto não concede leitura da inbox. Comandos concorrentes iguais retornam o mesmo resultado; reutilizar o identificador com outro payload é recusado. Configuração com versão antiga é recusada. Configuração global desligada bloqueia ativação. Reconexão OAuth recebe identidade nova, preservada na renovação de token. O teste inicial revelou um valor incorreto de enum na fixture (`post`); corrigido para o contrato real `static_post`, sem alterar schema de produto. Três testes PostgreSQL passaram; backend passou no typecheck após esse lote e no início do lote 3.

## Lote 3 — Webhook e entrega

Integração montada no composition root, com envios desligados por padrão, escopos adicionais opt-in e identidade de supressão independente da chave de criptografia. Webhook específico no gateway preserva o stream original; serviço verifica HMAC antes de interpretar JSON e só confirma após persistência. Adaptador usa conta explícita e o fluxo Facebook Login já empregado pelo publicador. Documentação consultada: coleção oficial `fbsamples/messenger-platform-samples/postman/instagram-platform-api.postman_collection.json` (private replies e button templates); isso não substitui C0 real.

Review corrigiu: data de quota serializada em ISO para postgres.js; eventos de botão/eco recebidos durante envio aguardam resultado; envio incerto não recebe retry; exclusão não readmite dados nem restaura identificador externo de chamada em execução; fila bloqueada por quota é adiada para não monopolizar os primeiros candidatos; resumo distingue encerramento de supressão. A classificação de texto livre permanece humana.

Evidências antes do lote 4: sete testes PostgreSQL passaram (23 assertions), seis testes de webhook/política passaram (28 assertions), dois testes de adaptador passaram (12 assertions), backend passou no typecheck. Cobertos replay concorrente, dois claims, duas mensagens comerciais, silêncio, botão antecipado, triagem, perda de lease, exclusão durante envio, acesso de conta, controle global, HMAC sobre bytes alterados, ACK após falha de banco e verificação de propriedade. Sem chamadas à Meta real. Testes adicionais e avaliação completa seguem no lote 5.

## Lote 4 — Bancada e operação

Ficha editorial, prévia das duas mensagens/saídas, aprovação da revisão, conferência da publicação e solicitação de ativação incorporadas à mesma bancada web/desktop. Inbox por conta com equipe explícita, fila, estados, janela, tomada humana, respostas aprovadas, classificação e reconciliação. Mensagens privadas e comandos de atendimento não entram no armazenamento offline. Relatório comercial usa contrato agregado e autenticado do funil, preservando origem inicial e deduplicando pagamentos.

Review deste lote corrigiu submissão dos formulários ao usar o botão compartilhado, consulta de aprovação após recarregar a peça, paginação da inbox, resultado IPC que preserva status/código de erro e classificação de DMs sem origem. A prova automatizada no Edge exercitou salvar sem ativar, aviso MC08, aprovação/ativação separadas, conferência de publicação, tomada humana, perda de resposta HTTP e replay da mesma tentativa. Passou sem erro de runtime, sem DMs no local/session storage e sem overflow em 1440px/390px. Fixtures são exclusivamente locais; evidência em `ui-validation.json` e screenshots.

Review de operação corrigiu quarentena de backup, supressão irreversível de criança/exclusão, minimização de conteúdo de criança, invalidação por reconexão/permissão do operador, prioridade de entradas pendentes sobre envio e ausência de replay após parada global. Treze cenários PostgreSQL passaram (49 assertions). A instância Docker de teste ficou sem resposta a DDL; a verificação foi transferida para PostgreSQL 17.11 nativo descartável em `127.0.0.1:15466/marketing_review`, sem reiniciar o Docker compartilhado.

Ao iniciar o full review, staging já havia avançado para `39408f052`. Esses commits foram incorporados por fast-forward antes da bateria final, sem conflitos ou sobrescrita de trabalho de terceiros.

## Pendências externas

Não foram enviados DMs, publicados posts ou configurada conta real. Capacidade externa e piloto comercial exigem evidência real; testes com doubles/servidor controlado não serão registrados como prova Meta. A entrega local contempla software e controles para impedir ativação prematura.

## Lote 5 — Full review

Revisão concluída contra a proposta v2, o plano de reestruturação e a implementação integrada da staging. A base avançou de `1e5b0debc` para `39408f052`, `3fda95d10` e `fbf830506` durante o trabalho. Todos esses avanços foram incorporados antes do commit; os últimos alteram runtime e testes do Molda, sem conflito com os arquivos desta entrega.

### Correções feitas no review completo

- A consulta comercial passou a aceitar somente origens de planos imutáveis das ativações, sem conceder acesso analítico por edição de rascunho. O funil restringe também `utm_medium=dm`, preserva a primeira origem e deduplica por pagamento. A saída D02 conserva sua origem própria, sem atribuição artificial à peça.
- Aplicar e desfazer copy foi exercitado pelo serviço editorial real com PostgreSQL. Abertura/apresentação podem mudar em nova revisão; palavra, destino, publicação e ativação existente permanecem vinculados à revisão original. O executor local recebeu as mesmas regras, além dos contratos e da prévia.
- Quota passou a usar o instante de despacho, incluindo intenções antigas que ficaram na fila. Lease vencido leva a incerteza e atendimento; resolver e retomar não repete a abertura nem libera oferta por clique antigo. Postback exige formato exato e jornada da mesma pessoa.
- Responder, usar saída salva ou retomar revalida disponibilidade global/da conta antes de aceitar a intenção, além da revalidação no envio. Textos de oferta vencida não são usados por atalhos. Pausa, supressão, entrada pendente e operador desativado são verificados sob os locks pertinentes.
- Erros inesperados de SQL nas rotas privadas deixam de enviar exceção/parametrização a logs ou Sentry, pois podem conter mensagens. A resposta continua genérica; diagnóstico operacional mantém evento/código sem conteúdo privado. Criança/exclusão não recuperam identificadores em respostas tardias.
- A UI conserva o mesmo `operationId` quando uma resposta HTTP se perde e a pessoa passa por um intervalo offline. Um comando confirmado pelo servidor não vira falha de envio porque a atualização visual falhou. Ajustes de formulário e layout foram exercitados no Edge, incluindo saídas longas e painéis abertos em celular.
- O documento editorial estrito exige protocolo 2: clientes antigos bloqueiam sync antes de consumir o novo documento; cliente novo aceita servidor anterior durante a implantação. O runner de testes SQLite foi alinhado ao empacotamento real de dependências workspace, removendo falha de resolução de TypeScript pelo Node.

### Matriz de compatibilidade e evidência

| Área | Implementação e evidência local | Limite externo |
| --- | --- | --- |
| Editorial e acervo | Ficha opcional em `piece`, revisão existente, copy/Desfazer, MC08 visível, ativação separada; PostgreSQL e browser | Equipe escolhe a MC vigente e confere a oferta publicada |
| Acesso e identidade | JWT/dispositivo existentes, permissões separadas por conta, conta explícita, recibos com versão/hash; testes de acesso e replay | Concessão operacional a pessoas autorizadas |
| Vínculo de publicação | Revisão aprovada, mesma peça/conta, confirmação explícita, posse verificada pelo adaptador, stories bloqueados | C0 demonstra posse e elegibilidade com a Meta |
| Webhook | HMAC sobre bytes, envelope múltiplo, persistência antes de ACK, isolamento de rota no gateway; testes HTTP | Subscrição e público real dependem de C0 |
| Concorrência e envio | Locks, idempotência de entrada/intenção/comando, lease, incerteza e reconciliação; PostgreSQL real | Aceite externo não prova entrega/leitura; chamada iniciada não pode ser recolhida |
| Percurso e saídas | Duas mensagens comerciais, palavra inteira/direct explícito, silêncio, supressão, R01 uma vez e texto livre humano; política e PostgreSQL | Sem IA livre respondendo ou envio por silêncio |
| Atendimento e conta | Inbox, tomada humana, pausa, janela, exclusão, classificação, reconexão e operador ativo; browser/SQL | Ecos externos precisam ser comprovados; caso contrário, assumir antes na bancada |
| Web e desktop | Componentes compartilhados, ponte restrita, erro IPC tipado, comandos somente online, ausência de DM no storage; browser e SQLite nativo | Teste visual foi da bancada no Edge; não equivale a instalação assinada ou sessão Meta no Electron |
| Medição | Contrato agregado HMAC, campanha/conteúdo, primeira origem, janela de sete dias, pagamento deduplicado, cobertura explícita; PostgreSQL do funil | Não prova causalidade, lift comercial, entrega ou clique individual |
| Retenção e recuperação | Expurgo, HMAC de supressão, minimização de criança, exclusão durante envio, quarentena após restauração; PostgreSQL | Backups antigos e histórico Meta seguem seus próprios procedimentos |
| Operação | Worker servidor, estados/contadores visíveis, limite por conta, envio desligado, runbook | Piloto inicial de uma conta/peça; expansão requer C4 e avaliação de capacidade |

### Verificações finais

Execução em Windows, Bun 1.3.11, Node 24.15.0 e PostgreSQL 17.11 descartável. Todas as migrações aditivas `0017`–`0020` foram aplicadas. Os testes de banco usaram exclusivamente `127.0.0.1:15466/marketing_review`, protegido por validação de host/porta/nome. Não foi alterado banco de desenvolvimento compartilhado ou produção.

| Comando/pacote | Resultado |
| --- | --- |
| `bun test` — marketing, com URLs de PostgreSQL | 340 passaram, 0 falhas, 1.576 assertions |
| `bun test` — funnel, com URLs de PostgreSQL | 473 passaram, 0 falhas, 4.664 assertions |
| `bun test` — api-gateway | 244 passaram, 0 falhas, 762 assertions |
| `bun test` — marketing-desktop | 37 passaram, 0 falhas, 1.512 assertions |
| `bun test` — marketing-app | 84 passaram, 0 falhas, 287 assertions |
| `bun test` — marketing-workbench | 14 passaram, 0 falhas, 51 assertions |
| `bun test` — marketing-contracts | 6 passaram, 0 falhas, 21 assertions |
| `bun run test:local` — desktop/SQLite nativo | 10 passaram, 0 falhas |
| Browser — `node .audits/insta-p8-marketing-2026-10-15/verify-ui.mjs` | 10 verificações; Edge, 1440px e 390px; evidência em `ui-validation.json` e screenshots |

Total: **1.208 testes passaram**, nenhum falhou ou foi pulado nesta bateria. Os testes de PostgreSQL estão incluídos nos totais dos pacotes, sem dupla contagem. A prova visual usa os componentes reais com transporte simulado; não é evidência de integração externa. Os logs completos permanecem em `.cache/engagement-*-final*.txt` no worktree da execução.

Os builds web/desktop simultâneos encontraram falta de memória do ambiente (exit 9), depois de testes aprovados. A validação de build foi retomada em série; resultados finais registrados abaixo, sem considerar uma execução interrompida como sucesso.

- Typecheck aprovado em marketing, contratos, workbench, desktop e gateway. `astro check` do funil terminou com zero erros/avisos e dois hints preexistentes de variável sem uso. O build Next também concluiu sua verificação TypeScript.
- Builds finais aprovados: marketing-app (Next), marketing-desktop (main/preload/renderer, captura e composição) e funnel (Astro). Web/desktop foram executados separadamente com `RAYON_NUM_THREADS=2`; nenhuma configuração do produto foi alterada para contornar o consumo de memória. O desktop conserva o aviso de chunks acima de 500 kB, sem erro de build.
- Biome aprovou os 69 arquivos TypeScript/TSX/JSON de código/configuração alterados. Snapshots Drizzle gerados e artefatos de auditoria seguem as exclusões do projeto. `git diff --cached --check` passou. O lockfile contém somente a nova dependência workspace do funil; instalação congelada foi validada durante a execução.
- PostgreSQL descartável encerrado após os testes. Nenhum serviço compartilhado foi reiniciado. O review não identificou bloqueio local restante; os limites externos abaixo continuam explícitos.

### Liberação e integração

A entrega implementa o software de C1/C2 com controles inativos por padrão. **C0 real, piloto C3 e decisão C4 permanecem pendentes**, com procedimento no [runbook](../../docs/runbooks/marketing-instagram-engagement.md). Não houve push, deploy, reconexão OAuth ou comunicação com terceiros. A compatibilidade local foi verificada na base atualizada; autorização/cobertura da Meta e ganho de marketing dependem de operação real.
