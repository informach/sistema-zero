# Jornada Kids configurável

Status: T1/T2 são checkpoints intermediários testados no worktree isolado, fora da composição/consumidores. O usuário determinou um modelo canônico único com seed persistido; contrato/bootstrap/admissão serão ajustados antes da integração. Nenhuma política custom foi ativada.

Base atual: checkpoint conciliado publicado `ac85a7a323491b9b2416fcc3008b17140a328284`, em 18/10/2026. Os quatro commits T1 foram rebaseados sem conflitos; `range-diff` confirmou os quatro equivalentes. A base anterior `0fce18507` foi preservada em `backup/kids-journey-t1-before-ac85a7a-0fce18507`. Worktree: `C:/Users/tocha/projects/sistema-zero-journey`, branch `feat/kids-configurable-journey`. T1 começou antecipadamente sobre `3d83a3f46`; T2 foi autorizado pelo root após a publicação do checkpoint. Não mesclar nem publicar esta branch por iniciativa própria.

## Leitura

1. [Evidências e mapa dos consumidores](./_evidence.md).
2. [Requisitos de produto](./_prd.md).
3. [Especificação técnica](./_techspec.md).
4. [Plano de tarefas](./_tasks.md).
5. [Plano de validação](./_test-plan.md).

## Decisão recomendada

Criar uma política própria do Kids com oito postos, requisitos/capacidades e gates de acesso configuráveis. Seed persistido reproduz exatamente as 49 posições e todos os gates atuais, inclusive cursos futuros; runtime usa apenas a política publicada. O algoritmo anterior fica nas provas, sem fallback/segundo autorizador normal. Blocos/extensões, acesso comercial e contexto de aula mantêm suas próprias réguas.

Preservar conquistas exige baseline de toda a coorte antes de cada troca, incluindo crianças sem XP/arquivadas, posto, capacidades e 21 direitos limitados de acesso a tiers. Lotes preparam sem trocar política ativa; publicação exige baseline completo/revalidação/CAS. Novos perfis só ficam visíveis após admissão idempotente Members; não há lock entre databases nem congelamento apenas durante GET.

Replays históricos por snapshot MVCC são uma alternativa ainda não aprovada nem comprovada. A migração `0074` atribuiu um `transaction_id` a linhas antigas; o código do ranking demonstra um cursor de curta duração, não a correção de histórico pedagógico permanente. O plano não depende dessa hipótese.

## Limites desta entrega

Foram feitas leituras de código, regras de package e contratos existentes, testes focados T1/T2, TSC core e SQL T2 em bancos descartáveis da stack QA owned pelo root. Não houve consulta a dados reais, contagem de alunos, benchmark, build, browser, operação Docker ou suíte global. Cenários T3+ continuam verificações futuras obrigatórias. O checkout Python foi lido para compatibilidade e dependências já existentes: autorização/runtime/linguagem e níveis Python permanecem separados da jornada; nenhum arquivo daquele checkout foi alterado.

Validação T1 intermediária antes do rebase: **50 testes/2.716 asserções**, **TSC core EXIT0**. T2: **8 unitários/17 asserções**, **20 SQL Kids/69 asserções**, **3 SQL purge/24 asserções**, todos sem falhas/skips; regressões lifetime **RED 6 falhas→GREEN 6/11**. **TSC completo Members EXIT0** com Node24/TS5.9.3, Core/Members Zod4.3.6 e Studio4.5.4 legítimos, incluindo guard fixture companion `a85bcf327`. Migration gerada0136 e Biome focado limpos. Isso prova o checkpoint intermediário, não o modelo canônico/integração futuros. Ver `_test-plan.md`.

Skills utilizadas: brainstorming, find-rules, creating-spec e writing-plans. As instruções explícitas de análise isolada, sem perguntas e sem novos agentes prevalecem sobre perguntas, aprovação intermediária e delegação prescritas por algumas dessas skills. A especificação segue TS/Zod e a arquitetura real do projeto; não introduz Effect-TS por causa de um template genérico.
