# L10 — análise, monitoramento e processo produtivo

Implementação funcional demonstrada na web e no renderer nativo do Electron, com revisão dos pacotes concluída para este lote. Não constitui deploy, liberação do piloto L9 nem encerramento dos critérios anteriores. A revisão integrada continua.

## Resultados e aprendizado

- `GET /projects/:id/analytics?days=1..365` lê publicação, edição aprovada e snapshot de métricas em uma transação `repeatable read` autorizada. Objetivo, necessidade, série e formato vêm da edição aprovada, não do rascunho atual. Repostagens conservam edições distintas. Limite explícito de 500 publicações.
- Agrupamento separa rede, formato, origem, versão da coleta e idade na coleta. Totais só somam métricas observadas; a razão salvamentos/visualizações usa pares válidos e denominador positivo. Sem ranking causal, saldo de assinatura ou estimativa de conversão.
- Evidências podem conter `observation`: origem pública/importada, janela, data da coleta, amostra, cobertura, dimensões e até 30 métricas com definição/unidade/denominador/disponibilidade. CSV/JSON importa esse objeto junto da referência. A edição dos metadados da fonte conserva as observações. O relatório apresenta até 200 fontes coletadas no período, com revisão exata, separadas das contas conectadas; valores históricos ambíguos e ausentes não viram zero.
- O comando `learning-pieces` de L9 liga análise/hipótese/critério à pauta de próximo ciclo. A revisão atual também fecha uma lacuna de proveniência: evidências recém-anexadas a uma análise passam a integrar sua base imutável, inclusive quando análise e evidência são criadas no mesmo batch e em ordem inversa. Referências históricas explícitas continuam históricas.

## Acompanhamento

- RSS/Atom via servidor, pesquisa pessoal via desktop e registro manual/importado. Cadência em horas decorridas; fuso controla dia do orçamento e apresentação, não é uma agenda cron de horário fixo. Não duplica MetricsWorker das contas próprias.
- Worker compartilhado por réplicas, lock por projeto, concessão de 60 segundos, consulta de até 15 segundos, orçamento cobrado por tentativa, máximo de três tentativas, retry limitado/Retry-After, cancelamento e revisão de configuração. Revalida membro/fonte e atividade do responsável antes/depois da rede. Perda de permissão ou lease impede aplicar resultado tardio.
- HTTPS público, DNS resolvido e fixado no socket, rejeição de redes privadas/especiais e endereços IPv6 fora do espaço público, sem redirecionamento, proxy configurado, cookies ou credenciais pessoais. Cabeçalhos limitados a 16 KiB e corpo a 1 MiB; exige UTF-8 e encoding identity. XML recusa DTD/ENTITY, limita profundidade e trata texto como texto. Guarda no máximo 25 entradas por consulta e informa cobertura/truncamento. Fontes são referências não verificadas, nunca instruções ao servidor.
- Callback de DNS compatível com Node/Bun (`options.all`), validado com o feed real do Remotion. XML preserva entidades padrão sem aceitar declarações externas. Datas de publicação e consulta são distintas; o texto guardado é explicitamente um trecho de até 10.000 caracteres.
- Deduplicação compara o último conteúdo da identidade. A → B → A produz duas alterações, e repetir A novamente não produz outra. Retomar o mesmo lease não duplica. Reanexar a mesma revisão manual não atualiza falsamente a última coleta. Observação manual nova da mesma evidência é uma alteração.
- Painel “Novidades observadas” reúne estados e observações do projeto, com limites de 100 fontes/50 entradas e continuação pelo histórico paginado de cada acompanhamento. Abre a fonte após sincronizar. Erro de ação não desaparece com o próximo polling.
- Nenhuma integração Apify/coletor pago foi ativada: importação e feeds atendem o percurso sem custo adicional. Uma integração futura exige escolha explícita, credencial própria e limite; não há fallback pago nem mensagem/publicação automática.

## Processo produtivo

- Relatório por provedor/capacidade, até 500 pedidos, com tentativas, retomadas concluídas após interrupção, resultados desfeitos e avaliações humanas de utilidade/descarte/retrabalho. Não presume que um resultado não aplicado foi descartado.
- Tokens e duração somam somente resultados confirmados. Um pedido só admite uma tentativa concluída; checkpoints e retomadas de transferência não duplicam o resultado. Tentativas interrompidas sem resultado são cobertura ausente, não custo zero. O relatório informa o denominador de tentativas com dado disponível.
- Tempo humano é **declarado**, não inferido do tempo em que a janela ficou aberta ou da espera pela IA. Intervalos de 1 minuto a 24 horas, concluídos, sem sobreposição da mesma pessoa inclusive entre projetos (advisory lock por autor). Período do relatório corta o intervalo exibido; ausência de registros é “Não registrado”.
- Registro, correção, reavaliação e anulação usam recibos idempotentes e journal IndexedDB. Correção mantém original e vínculo de substituição. Anulação conserva corpo/autor/data. Somente o autor corrige/anula seu tempo. A avaliação compartilhada exige o ID anterior; dois revisores não substituem um ao outro silenciosamente.

## Evidências

- Backend completo: **378 testes / 2.167 assertions**, PostgreSQL nativo, antes da adição do painel geral. Suíte adicional de monitoramento/paginação: **6 testes / 49 assertions**. Bancada: **28 testes / 112 assertions**. Transportes: **7 testes / 48 assertions**. Tipos backend/bancada/desktop passaram; revisão final e provas adicionais serão registradas abaixo.
- Coleta real web: `scripts/prove-monitoring.ts`, `proof-monitoring.{out,err}.log`, `monitoring-proof/evidence.json`: 20 entradas do feed oficial, uma chamada, pausa feita pela UI, executor desktop ausente. As 20 referências não são 20 publicações recentes: a fonte inclui histórico.
- Tempo pela UI: `scripts/prove-production.ts`, `proof-production.{out,err}.log`, `production-proof/evidence.json`: cria 15 minutos, corrige para 10 e anula; só o registro ativo compõe o relatório. Captura `recorded.png` inspecionada.
- Dados importados/painel: `scripts/prove-intelligence.ts`, `proof-intelligence.{out,err}.log`, `intelligence-proof/evidence.json`: importa JSON pela UI, mostra 0 observado e null indisponível, abre relatório preenchido e fonte pelo painel. Configuração/vínculo manual do acompanhamento são fixtures via API; não alegar que essa parte foi operada pela UI. Capturas do relatório e painel inspecionadas. Primeiro ensaio corrigiu uma chamada inválida de Promise no harness; produto não alterado para esconder a falha.
- Electron: build completo passou; `electron . --smoke-native-import --smoke-intelligence` passou com renderer/preload/allowlist IPC/sessão pareada/SQLite reais. Consultou os três relatórios e abriu suas telas no mesmo projeto da prova web. `proof-native-intelligence.{out,err}.log`, `intelligence-proof/native-evidence.json`. Nenhuma geração ou publicação externa neste ensaio.

### Fechamento da revisão dos pacotes

- A rodada simultânea de backend/desktop falhou por timeout em três cenários de entrega e dois de importação; também houve timeout de conexão PostgreSQL e ENOENT depois do timeout de limpeza da fixture. As falhas estão preservadas em `tests-l10-{backend,desktop}-complete.log`, com código 1. Não foram removidas as asserções nem aumentados os prazos.
- Investigação: log do PostgreSQL sem erro de consulta ou deadlock no intervalo, com encerramento de conexão pelo cliente. Os nove cenários de entrega passaram isolados em 1,2 s e os oito de importação em 0,74 s, sem alteração de código (`tests-l10-{delivery,import}-diagnostic`). A causa específica da interrupção do ambiente não foi demonstrada; não afirmar que a concorrência entre suítes foi comprovadamente a causa.
- As suítes completas executadas separadamente passaram: backend **379 testes / 2.173 assertions**, desktop **67 testes / 1.736 assertions**, zero falhas e zero erros (`tests-l10-{backend,desktop}-serial`). Contratos **6/21** e bancada **28/112** também passaram. Não houve teste Docker.
- Check e TypeScript de backend, desktop, contratos e bancada passaram. Builds de produção web e Electron passaram (`build-l10-{web,desktop}`, código 0). O build do Electron mantém o aviso de tamanho dos chunks de captura Studio; não foi suprimido.
- As provas de relatórios na web e no Electron acima conferem o caminho integrado. A publicação real e os critérios físicos/operacionais ainda abertos não são inferidos desses testes.

## Migração, compatibilidade e reversão

- Geradas pelos scripts Drizzle, sem editar SQL: `0028` monitores/entradas; `0029` registros de produção; `0030` retira unicidade de conteúdo histórico para aceitar reversões da fonte; `0031` índice de última observação por identidade. Aplicação somente em bancos nativos de revisão/teste. Tabelas novas nesta entrega, ainda não implantadas; a primeira implantação deve aplicar o conjunto antes de iniciar o worker. Não usar a geração ordinária de índice como procedimento para uma tabela grande já em produção: nesse cenário, pré-criar o índice de forma concorrente e reconciliar a migração antes da atualização.
- Não remover/recriar dados para reverter. Pausar monitores pela UI, conservar evidências/recibos/edições e atualizar clientes junto do backend. Campos JSON opcionais novos pertencem ao protocolo 2 ainda não liberado desta implementação.
- Node/Bun DNS: https://nodejs.org/api/dns.html#dnslookuphostname-options-callback e https://bun.com/reference/node/net/LookupFunction. Transporte: https://nodejs.org/api/http.html. Parser oficial: https://github.com/NaturalIntelligence/fast-xml-parser (tipos e limites da versão instalada conferidos).

L9 continua sem piloto físico em duas máquinas e sem todos os ensaios de carga. Instalação/atualização assinada, arquivos grandes, recuperação operacional e pendências de vídeo dos lotes anteriores não são encerradas por este lote. Commit/merge local somente após a revisão integrada; sem push/deploy e sem Docker.
