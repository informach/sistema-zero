# Jornada Kids configurável

Status: contrato, seed e persistência canônicos estão escritos e em verificação no worktree isolado, fora da composição/consumidores. O usuário determinou um modelo Kids único com seed persistido; admissão Auth, serviços integrados e consumidores ainda faltam. Nenhuma política custom foi ativada na plataforma.

Checkpoint canônico `e8be66021` sobre remoto `2e76fb448`, rebase sem conflitos; range-diff confirma seis commits Kids equivalentes e retirada somente do companion guard já publicado. Backup anterior `backup/kids-journey-canonical-before-2e76-a4e4babb5`. Core canônico: **58/0/2.763** focados após RED/GREEN de entrada preservada→expansão e **TSC EXIT0**. Persistência/0136 regenerada: primeira matriz real **25/1/105**, achado de ordenação INSERT/UPSERT corrigido na fronteira; foco veteran **1/0/7**. Auth+XP sem Gamma/earned teve RED causal→GREEN2/9 com owner capturado e conflitos tardios.

Persistência canônica alcançou **SQL30/0/135** e **purge3/0/25**. Harness recebeu fila/ownership/drain com unidades **3/0/8**; repetição SQL com essa fonte passou **30/0/135, EXIT0, 38,12 s**, sem timeout/deadlock. **TSC Core e Members canônicos EXIT0** com Node24/TS5.9.3 e versões legítimas. Members apontou um import de tipo ausente, corrigido antes da repetição verde; negativo preservado. Negativos e correções causais estão no plano de testes; não são prova de integração/Auth/consumidores.

Base atual `2e76fb448`, após rebases conciliados `ac85a7a32` e `f664cfa51`, em 18/10/2026. Os commits Kids foram preservados sem conflitos, com `range-diff` equivalente; base anterior `0fce18507` em `backup/kids-journey-t1-before-ac85a7a-0fce18507`. Worktree: `C:/Users/tocha/projects/sistema-zero-journey`, branch `feat/kids-configurable-journey`. T1 começou antecipadamente sobre `3d83a3f46`; T2 foi autorizado pelo root após a publicação do checkpoint. Não mesclar nem publicar esta branch por iniciativa própria.

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

Foram feitas leituras de código, regras de package e contratos existentes, testes focados T1/T2, TSC core e SQL T2 em bancos descartáveis da stack QA owned pelo root. Não houve consulta a dados reais, contagem de alunos, benchmark, build, browser, operação Docker ou suíte global. Cenários T3+ continuam verificações futuras obrigatórias. O checkout Python foi lido para compatibilidade e dependências já existentes: autorização/runtime/linguagem e níveis Python permanecem separados da jornada; nenhum arquivo daquele checkout foi alterado.

Validação T1 intermediária antes do rebase: **50 testes/2.716 asserções**, **TSC core EXIT0**. T2: **8 unitários/17 asserções**, **20 SQL Kids/69 asserções**, **3 SQL purge/24 asserções**, todos sem falhas/skips; regressões lifetime **RED 6 falhas→GREEN 6/11**. **TSC completo Members EXIT0** com Node24/TS5.9.3, Core/Members Zod4.3.6 e Studio4.5.4 legítimos, incluindo guard fixture companion `a85bcf327`. Migration gerada0136 e Biome focado limpos. Isso prova o checkpoint intermediário, não o modelo canônico/integração futuros. Ver `_test-plan.md`.

Skills utilizadas: brainstorming, find-rules, creating-spec e writing-plans. As instruções explícitas de análise isolada, sem perguntas e sem novos agentes prevalecem sobre perguntas, aprovação intermediária e delegação prescritas por algumas dessas skills. A especificação segue TS/Zod e a arquitetura real do projeto; não introduz Effect-TS por causa de um template genérico.
