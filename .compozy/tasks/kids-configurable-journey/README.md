# Jornada Kids configurável

Status: desenho para revisão; nenhuma alteração produtiva implementada.

Base inspecionada: `origin/staging` em `3d83a3f468502c44a8800c6e72ec7544380ab0f4`, em 18/10/2026. Worktree: `C:/Users/tocha/projects/sistema-zero-journey`, branch `feat/kids-configurable-journey`. A implementação depende do checkpoint conciliado de Estúdio JavaScript/Python informado pelo agente principal. Não mesclar nem publicar esta branch por iniciativa própria.

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

Foram feitas leituras de código, regras de package e contratos existentes. Não houve consulta ao banco, contagem de alunos, execução de SQL, benchmark, TSC, build, browser, Docker ou suíte global. Os cenários de banco no plano são verificações futuras obrigatórias, não resultados obtidos. Não foi inspecionado o WIP do checkout Python.

Skills utilizadas: brainstorming, find-rules, creating-spec e writing-plans. As instruções explícitas de análise isolada, sem perguntas e sem novos agentes prevalecem sobre perguntas, aprovação intermediária e delegação prescritas por algumas dessas skills. A especificação segue TS/Zod e a arquitetura real do projeto; não introduz Effect-TS por causa de um template genérico.
