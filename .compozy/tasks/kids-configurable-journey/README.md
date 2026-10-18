# Jornada Kids configurável

Status: desenho aprovado pelo agente principal; T1 puro antecipado por instrução explícita. Nenhum consumidor produtivo, serviço, tabela ou UI foi integrado.

Base inspecionada: `origin/staging` em `3d83a3f468502c44a8800c6e72ec7544380ab0f4`, em 18/10/2026. Worktree: `C:/Users/tocha/projects/sistema-zero-journey`, branch `feat/kids-configurable-journey`. A integração e T2+ dependem do checkpoint conciliado de Estúdio JavaScript/Python informado pelo agente principal. T1 foi autorizado antecipadamente sobre esta base; atualizar a base continua obrigatório antes de integrar. Não mesclar nem publicar esta branch por iniciativa própria.

## Leitura

1. [Evidências e mapa dos consumidores](./_evidence.md).
2. [Requisitos de produto](./_prd.md).
3. [Especificação técnica](./_techspec.md).
4. [Plano de tarefas](./_tasks.md).
5. [Plano de validação](./_test-plan.md).

## Decisão recomendada

Criar uma política própria do Kids, com os oito postos atuais, requisitos editáveis e capacidades por posto. A política padrão é um adaptador do legado de 49 posições, sem resolver posições apenas para os cursos que existem hoje. Blocos e extensões continuam sendo conquistas dos cursos; acesso comercial e contexto de aula continuam tendo suas próprias réguas.

Preservar conquistas exige materializar um baseline dos perfis com marcos antes de cada troca de política. Um processo limitado por lote prepara esse baseline sem trocar a política ativa; a publicação só ocorre depois da preparação e de nova validação/CAS. Congelar apenas durante GET não protege quem ficou sem visitar a plataforma.

Replays históricos por snapshot MVCC são uma alternativa ainda não aprovada nem comprovada. A migração `0074` atribuiu um `transaction_id` a linhas antigas; o código do ranking demonstra um cursor de curta duração, não a correção de histórico pedagógico permanente. O plano não depende dessa hipótese.

## Limites desta entrega

Foram feitas leituras de código, regras de package e contratos existentes, testes unitários focados do T1 e TSC completo do pacote core em janela autorizada. Não houve consulta ao banco, contagem de alunos, execução de SQL, benchmark, build, browser, Docker ou suíte global. Os cenários de banco no plano são verificações futuras obrigatórias, não resultados obtidos. O WIP Python foi lido apenas para compatibilidade: autorização/runtime/linguagem e níveis Python permanecem separados da jornada; nenhum arquivo daquele checkout foi alterado.

Validação final T1 após revisão de pausa/formatura: **50 testes passaram, 0 falhas, 2.716 asserções** nos três arquivos novos e `journey.test.ts`/`journey-state.test.ts`; **TSC do pacote core EXIT0**, com Node 24.22.0/TypeScript 5.9.3. Biome focado limpo. T1 puro verificado; T2+, integração e ativação aguardam checkpoint publicado. Ver detalhes em `_test-plan.md`.

Skills utilizadas: brainstorming, find-rules, creating-spec e writing-plans. As instruções explícitas de análise isolada, sem perguntas e sem novos agentes prevalecem sobre perguntas, aprovação intermediária e delegação prescritas por algumas dessas skills. A especificação segue TS/Zod e a arquitetura real do projeto; não introduz Effect-TS por causa de um template genérico.
