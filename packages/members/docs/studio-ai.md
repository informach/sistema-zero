# IA do Estúdio: conexão, reservas e operação

O Members é dono da política por família, das credenciais criptografadas e do registro de uso. O BFF autentica a sessão, prepara o contexto do Zappy e chama o OpenRouter somente depois de receber uma permissão de uso único. A biblioteca Studio nunca recebe uma chave. Pensa e as demais ferramentas mantêm suas políticas próprias; a conexão opcional cobre as operações do Estúdio.

## Estado e cobrança

- Uma pergunta corresponde a uma operação identificada pelo UUID da pergunta persistida. Repetir a pergunta com o mesmo `clientMessageId` devolve o histórico ou informa que ela está em andamento.
- A operação reserva uma interação incluída e o orçamento das tentativas previstas. A primeira permissão converte a reserva em uma interação consumida. Reparos não incrementam novamente esse contador.
- Cada tentativa recebe uma permissão uma única vez. Nem um timeout do Members nem uma resposta perdida autorizam reenviar a inferência. Somente confirmações idempotentes do uso podem ser repetidas.
- O registro distingue custo confirmado, estimativa de uma chamada sem confirmação e saldo reservado para trabalho ainda não executado. Os valores são inteiros em milionésimos de dólar; custos menores que essa precisão arredondam para cima. Não são preços cobrados pela assinatura.
- A estimativa considera os bytes UTF-8 do contexto e schema, instruções de reparo, margem de tokens e limite de saída. A chamada usa também `provider.max_price`, sem plugins ou serviços adicionais. Trata-se de uma reserva conservadora; o custo confirmado pelo provedor prevalece mesmo se exceder a estimativa. A conta OpenRouter pode ter limites adicionais no próprio provedor.
- A fonte fica fixa na operação. Desconectar, trocar a chave ou mudar a fonte impede novas tentativas dessa operação. Reduzir um limite externo também é verificado antes da próxima tentativa. Chamadas já autorizadas podem concluir; desconectar localmente não revoga uma chave no OpenRouter.
- Rejeição conhecida antes da geração devolve a interação, mantendo a reserva enquanto a operação continua aberta. Resposta válida com custo zero ainda constitui uma interação. Timeout, cancelamento durante a chamada e falha ambígua preservam a estimativa; não são convertidos em custo zero.
- A reserva vence após cinco minutos. Seu saldo não utilizado deixa de bloquear a família, mas chamadas já despachadas continuam contabilizadas. Duas operações simultâneas por família são o padrão, inclusive com conexão externa e contas de equipe.
- Dia e mês usam o calendário de São Paulo. A operação permanece atribuída ao dia em que foi reservada, inclusive se terminar após a meia-noite. A franquia de interações e os limites de custo são controles diferentes.

## Configuração

No Members, a franquia existente continua em `AI_LIMIT_DAILY` e `AI_LIMIT_MONTHLY`. Os limites técnicos do Estúdio têm configuração independente:

| Variável | Padrão | Unidade |
| --- | --- | --- |
| `STUDIO_AI_DAILY_MICRO_USD` | 1000000 | micro-USD por família/dia, fonte incluída |
| `STUDIO_AI_MONTHLY_MICRO_USD` | 10000000 | micro-USD por família/mês, fonte incluída |
| `STUDIO_AI_MAX_CONCURRENT` | 2 | operações em andamento |
| `STUDIO_AI_EXTERNAL_DAILY_RUNS` | 200 | operações externas por família/dia |
| `STUDIO_AI_MAX_PROMPT_PRICE` | 1 | USD por milhão de tokens de entrada |
| `STUDIO_AI_MAX_COMPLETION_PRICE` | 4 | USD por milhão de tokens de saída |

Esses padrões são limites operacionais, não uma nova oferta comercial. O modelo configurado no BFF (`OPENROUTER_ZAPPY_MODEL`, depois `OPENROUTER_PENSA_MODEL`, depois `OPENROUTER_MODEL`) precisa ter um provedor compatível com os tetos e saída estruturada. A fonte incluída usa `OPENROUTER_API_KEY` do BFF. Não há troca silenciosa de modelo ou fonte para contornar um teto.

Para habilitar a conexão opcional, configurar os três valores no Members:

- `STUDIO_AI_VAULT_KEYS`: objeto JSON de versões e chaves AES-256 de 64 caracteres hexadecimais, geradas especificamente para essa finalidade.
- `STUDIO_AI_VAULT_ACTIVE_ID`: versão usada para novas gravações. Manter as versões anteriores enquanto houver credenciais e verificadores criptografados com elas. Removê-las antes disso torna essas conexões indisponíveis.
- `STUDIO_AI_CALLBACK_ORIGINS`: origens HTTPS exatas, separadas por vírgula. O callback é sempre `/api/parents/openrouter/callback`. HTTP é aceito somente em localhost para desenvolvimento.

O BFF precisa de `APP_PUBLIC_URL` correspondente à origem. Somente a sessão real do responsável pode conectar ou alterar a política; perfis de crianças e impersonação são recusados. O fluxo usa PKCE S256, estado descartável, cookie HttpOnly e vínculo com a sessão do responsável. Conectar não seleciona automaticamente a fonte externa: o responsável salva sua preferência e limites diário/mensal em seguida.

## Reconciliação

Configurar `STUDIO_AI_RECONCILE_CRON_SECRET` no BFF e executar a cada minuto `POST /api/internal/studio-ai/reconcile` no host Kids, com `Authorization: Bearer <segredo>`. Não colocar esse segredo em URL, variável pública ou cliente.

Cada invocação obtém até quatro tarefas com lease PostgreSQL e faz consultas de uso em paralelo, com dez segundos por consulta. Workers concorrentes usam `SKIP LOCKED`; leases vencem após noventa segundos. Há backoff exponencial e oito consultas por tentativa. São consultas de metadados de geração, sem nova inferência. O retorno público do worker contém apenas contagens.

O mesmo cron remove fisicamente até 100 revisões do construtor com retenção vencida (sete dias), usando `SKIP LOCKED`. `expiredBuilderJobs: null` indica falha de limpeza e deve gerar alerta; não impede reconciliação de custo. Snapshots não dependem de o aluno voltar para serem removidos. O ledger conserva sua política própria e não é apagado por essa limpeza.

Sem identificador de geração não é possível obter o custo real pela API. Chave desconectada, custo indisponível ou esgotamento das tentativas mantêm o valor como não confirmado. Isso aparece separadamente no painel do responsável e no administrativo, sem inventar um custo nem liberar saldo duvidoso. A consulta posterior não armazena prompts, respostas ou novas cópias da credencial.

## Migrações e implantação

As migrações geradas `0116` a `0119` criam as quatro tabelas, índices e restrições. A `0119` aperta a nulabilidade lógica de custos confirmados nas tabelas novas, ainda não implantadas. Não há transformação de dados antigos. Aplicar antes de atualizar Members/BFF: a leitura da franquia passa a considerar reservas do Estúdio.

O construtor acrescenta `0120`–`0122` (jobs, binários da revisão e notas limitadas). São uma unidade de implantação antes de habilitar o BFF; `0121` torna obrigatórios campos da tabela nova ainda sem tráfego. Não executar `0120` com uma versão intermediária escrevendo jobs e só depois `0121` sem uma migração de dados específica. No BFF, configurar `STUDIO_PRO_RUNTIME_URL`, `STUDIO_PRO_RUNTIME_TOKEN` e, opcionalmente, `OPENROUTER_STUDIO_BUILDER_MODEL`; o fallback é o modelo de síntese do Pensa. A rota do construtor exige sessão ativa, acesso ao Estúdio, Pro e Zappy liberados, além da autorização interna no Members.

O adendo integrado exige também `0123` (metadados limitados da assistência por job) e `0124` (cerca de exclusão por conta/perfil/projeto, com expiração e índice). Aplicar toda a sequência `0116`–`0124` antes de habilitar esta versão. A cerca impede que uma criação tardia de job ultrapasse a exclusão do projeto. Preservar essas tabelas no rollback de aplicação; o cliente mantém a intenção de exclusão pendente até a confirmação do servidor. A suíte PostgreSQL dedicada cobre as duas migrações finais, além de conta, ledger e builder.

Cada job tem revisão-base imutável, até três inferências, três validações, cinco minutos totais, lease de 150 segundos e no máximo dez snapshots retidos por família. A criação e as permissões são idempotentes. Fechar o painel permite retomar pela consulta; cancelar invalida respostas tardias. O modelo só propõe patches/consultas limitados. O runtime prepara locks a partir do grafo da imagem e verifica tipos, build, navegador e captura. Nenhum script do projeto é executado no servidor. Aplicar e desfazer conferem novamente código, materiais e perfil; edições concorrentes impedem a substituição.

As dependências remotas são as versões exatas publicadas no contrato `STUDIO_PRO_REMOTE_PACKAGES`. A rota privada `/v1/dependencies` prepara o lock sem acesso ao registry nem boot de container. Isso não instala bibliotecas no terminal do aluno: após aplicar uma proposta que altera o manifesto, ele executa `npm ci`. Capturas expiram em 24 horas; a proposta e seus metadados expiram em sete dias. Playtest de kits cobre o cenário do kit original; projetos sem driver recebem somente prova de inicialização, explicitamente descrita na evidência. Captura não equivale a aprovação visual automática.

As alterações são aditivas; a criação de índices e validação de checks ocorre nas tabelas novas. Para rollback de aplicação, impedir novas operações, aguardar as reservas expirarem e preservar tabelas/credenciais/ledger. Não apagar as tabelas durante tráfego. Uma versão anterior que ignore as reservas não pode concorrer com a versão nova autorizando chamadas.

Os locks de uso seguem `members-account` e depois `ai-usage`. A exclusão de conta compartilha o primeiro lock, instala a cerca existente e remove a configuração; OAuth, operações e tentativas são removidos por cascata. As rotas privadas aceitam apenas HMAC do consumer `member-shell`, têm `Cache-Control: no-store` e não habilitam auditoria de corpos com credenciais.

## Evidência local

Os testes em `tests/db/studio-ai-usage.test.ts` só aceitam um PostgreSQL local explicitamente indicado por `STUDIO_REVIEW_DATABASE_URL`, com banco descartável chamado `studio_pro_review`. Executam as migrações geradas e testam concorrência, isolamento de perfis, reservas, reparos, expiração, reembolso e leases. Testes de transporte usam respostas controladas e não consomem IA paga. Uma ativação externa ainda exige configurar os segredos e o agendamento acima e validar OAuth/inferência no ambiente de destino.

Referências: [OAuth OpenRouter](https://openrouter.ai/docs/guides/overview/auth/oauth), [limites de preço por provedor](https://openrouter.ai/docs/guides/routing/provider-selection), [metadados de geração](https://openrouter.ai/docs/api/api-reference/generations/get-request-%26-usage-metadata-for-a-generation).
