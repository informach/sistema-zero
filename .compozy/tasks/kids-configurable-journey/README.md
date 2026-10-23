# Jornada Kids configurável

Status em 19/10/2026: recortes implementados e qualificados localmente no worktree isolado, incluindo contrato, seed persistido, preservação, admissão Auth, leitores/consumidores canônicos, editor Admin e Cleanup1. A branch incorporou 3190d9e08 por merge local 0e20ea3bc, sem conflitos. A cadeia backend real passou 7 cenários / 43 asserções com JWT RS256/JWKS, Gateway, Members e PostgreSQL. Next/sessão/BFF real e Chrome/Edge passaram dez cenários / 42 checks do harness, A prova complementar Auth real passou sete cenários / 45 checks: bootstrap de coorte com Construtor, perfil sem XP e arquivado, seguido de admissão pending→Members→ready e sessão Kids real. Os seis pacotes passaram nos tipos pós-merge. Revisão/incorporação principal e ativação controlada ainda estão pendentes; nenhuma política custom foi ativada na plataforma.

O caminho Kids usa uma política canônica com oito postos/49 posições e direitos permanentes de posto, ferramentas e acesso pedagógico. Licenças, matrícula, paletas e contexto de aula continuam separados. Auth pending→Members→ready, captura da coorte e publicação com baseline/CAS têm provas próprias em `_evidence.md`; essas provas não substituem ativação integrada ou validação em staging.

Os últimos lotes de apresentação qualificados são P6A (timeline/recompensas), P6B (mapa/agrupamento/trilha por tierAccess) e P6C (celebrações por capacidades reais). O recibo P6C captura **59 testes/193 asserções, Kids TSC EXIT0** e o negativo anterior de uma fixture desatualizada. Seu snapshot tem SHA `20e4aa4872ce590ebea943812bf2db4d248df8d8b430cdcae2176e58407301a9`.

D1 e o cartão de recompensa foram qualificados no snapshot delta `badge-reward-qualified`: **59 testes/253 asserções**, Biome4/0 e Kids TSC0. Ausência visual de posto não vira Faísca, e a recompensa informa o posto exigido pelo servidor; conquistas e currículo permanecem separados. O caso público é defesa interna: a rota atual exige posto não nulo. D2 transporta resolvedCourseId da mesma captura e oferece requisitos fora da trilha; Core68/2833 e UI70/225 passaram, com Core/Members/Kids tipos0. O transporte BFF Admin passou fixture7/171, wrapper e pós-formatação8/172, Biome11/0; Admin TSC0. Composição Members e allowlist/RBAC gateway também passaram nos gates locais (52/323 gateway,19/116 Members,tipos0); a qualificação integrada local do editor/JWT/forwarding/DB e bootstrap com Auth real foi concluída nos recibos ao fim de _evidence.md. Build/deploy, operação em staging, retenção terminal e incorporação principal continuam separados desse aceite local.

## Editor Admin C

Editor Admin C: sete avanços e acesso por etapa em painéis separados, comparação do servidor, motivo, preparação retomável por URL e publicação manual com versão/três hashes da mesma preparação. Matriz UI/contratos20/97; matriz afetada Admin30/140 e Members13/98; Biome13/0; Admin/Members TSC EXIT0. Os wrappers isolados da matriz têm filhos próprios (editor12/64 e BFF7/171); não somar seus números como testes novos. Esses testes isolados não comprovam JWT/banco/navegador por si; as cadeias reais posteriores estão descritas ao fim de _evidence.md. A permissão visual vem da mesma guarda de escrita do Members e não substitui sua revalidação em cada operação.

## Histórico dos checkpoints de fundação

Checkpoint canônico `e8be66021` sobre remoto `2e76fb448`, rebase sem conflitos; range-diff confirma seis commits Kids equivalentes e retirada somente do companion guard já publicado. Backup anterior `backup/kids-journey-canonical-before-2e76-a4e4babb5`. Core canônico: **58/0/2.763** focados após RED/GREEN de entrada preservada→expansão e **TSC EXIT0**. Persistência/0136 regenerada: primeira matriz real **25/1/105**, achado de ordenação INSERT/UPSERT corrigido na fronteira; foco veteran **1/0/7**. Auth+XP sem Gamma/earned teve RED causal→GREEN2/9 com owner capturado e conflitos tardios.

Persistência canônica alcançou **SQL30/0/135** e **purge3/0/25**. Harness recebeu fila/ownership/drain com unidades **3/0/8**; repetição SQL com essa fonte passou **30/0/135, EXIT0, 38,12 s**, sem timeout/deadlock. **TSC Core e Members canônicos EXIT0** com Node24/TS5.9.3 e versões legítimas. Members apontou um import de tipo ausente, corrigido antes da repetição verde; negativo preservado. Negativos e correções causais estão no plano de testes; não são prova de integração/Auth/consumidores.

Base atual `3190d9e08`, incorporada pelo merge local `0e20ea3bc`. Histórico anterior: `2e76fb448`, após rebases conciliados `ac85a7a32` e `f664cfa51`, em 18/10/2026. Os commits Kids foram preservados sem conflitos, com `range-diff` equivalente; base anterior `0fce18507` em `backup/kids-journey-t1-before-ac85a7a-0fce18507`. Worktree: `C:/Users/tocha/projects/sistema-zero-journey`, branch `feat/kids-configurable-journey`. T1 começou antecipadamente sobre `3d83a3f46`; T2 foi autorizado pelo root após a publicação do checkpoint. Não mesclar nem publicar esta branch por iniciativa própria.

## Leitura

1. [Evidências e mapa dos consumidores](./_evidence.md).
2. [Requisitos de produto](./_prd.md).
3. [Especificação técnica](./_techspec.md).
4. [Plano de tarefas](./_tasks.md).
5. [Plano de validação](./_test-plan.md).

## Decisão recomendada

Criar uma política própria do Kids com oito postos, requisitos/capacidades e gates de acesso configuráveis. Seed persistido reproduz exatamente as 49 posições e gates atuais, inclusive futuros; runtime Kids usa apenas política publicada. Referência anterior Kids fica nas provas, sem fallback/segundo autorizador. Helpers compartilhados ainda necessários a Adult ficam exclusivamente nesse uso após inventário. Blocos/extensões, matrícula e contexto mantêm suas próprias réguas.

Preservar conquistas exige baseline de toda a coorte antes de cada troca, incluindo crianças sem XP/arquivadas, posto, capacidades e 21 direitos limitados de acesso a tiers. Lotes preparam sem trocar política ativa; publicação exige baseline completo/revalidação/CAS. Novos perfis só ficam visíveis após admissão idempotente Members; não há lock entre databases nem congelamento apenas durante GET.

Replays históricos por snapshot MVCC são uma alternativa ainda não aprovada nem comprovada. A migração `0074` atribuiu um `transaction_id` a linhas antigas; o código do ranking demonstra um cursor de curta duração, não a correção de histórico pedagógico permanente. O plano não depende dessa hipótese.

## Limites desta entrega

Foram feitas leituras de código, regras de package e contratos existentes, testes focados T1/T2, TSC core e SQL T2 em bancos descartáveis da stack QA owned pelo root. Não houve consulta a dados reais, contagem de alunos, benchmark, build, browser, operação Docker ou suíte global. Os gates de cada lote T3+ estão discriminados em `_evidence.md`; os cenários integrados/operacionais ainda pendentes continuam obrigatórios. O checkout Python foi lido para compatibilidade e dependências já existentes: autorização/runtime/linguagem e níveis Python permanecem separados da jornada; nenhum arquivo daquele checkout foi alterado.

Validação T1 intermediária antes do rebase: **50 testes/2.716 asserções**, **TSC core EXIT0**. T2: **8 unitários/17 asserções**, **20 SQL Kids/69 asserções**, **3 SQL purge/24 asserções**, todos sem falhas/skips; regressões lifetime **RED 6 falhas→GREEN 6/11**. **TSC completo Members EXIT0** com Node24/TS5.9.3, Core/Members Zod4.3.6 e Studio4.5.4 legítimos, incluindo guard fixture companion `a85bcf327`. Migration gerada0136 e Biome focado limpos. Isso prova o checkpoint intermediário, não o modelo canônico/integração futuros. Ver `_test-plan.md`.

Skills utilizadas: brainstorming, find-rules, creating-spec e writing-plans. As instruções explícitas de análise isolada, sem perguntas e sem novos agentes prevalecem sobre perguntas, aprovação intermediária e delegação prescritas por algumas dessas skills. A especificação segue TS/Zod e a arquitetura real do projeto; não introduz Effect-TS por causa de um template genérico.
