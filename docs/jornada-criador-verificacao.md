# Verificação da Jornada do Criador — 25/10/2026

Este é o recibo da implementação inicial. A revisão posterior, suas correções e as novas
execuções estão em [Full review de 26/10/2026](jornada-criador-full-review-2026-10-26.md).

Implementação local do [contrato](jornada-do-criador.md) e do [seed](jornada-criador-seed.md).
Esta verificação não representa deploy, escrita no catálogo remoto ou publicação de cursos.
O workspace recebeu alterações de outra tarefa durante a execução; os arquivos dessa tarefa
foram preservados, sem reset, limpeza ou formatação geral do repositório.

## Comportamentos exercitados

- Os pares 2D/3D abrem missão, Poderes e extras. Promoção depende do par, da missão e do
  número de mecânicas distintas; variantes da mesma mecânica não duplicam a contagem.
- Conclusão concede blocos sem Mural. Compras avulsas de Farol/Cadê são encontradas mesmo
  quando há assinatura mais forte; matrícula gerada pela assinatura não cria essa exceção.
- Publicação de política preserva postos, capacidades e cursos abertos. A captura adulta
  percorre lotes, inclui quem nunca visitou a jornada e respeita exclusão concorrente.
- Maestrias exigem núcleo, duas oficinas distintas e aprovação de todos os critérios de uma
  mesma entrega. Créditos têm justificativa; outro revisor não sobrescreve uma avaliação.
- Snapshot de projeto/requisitos e admissão do nível iniciado sobrevivem a mudanças editoriais.
  Cursos preservados não abrem outra área ou antecipam um nível seguinte.
- Pausa/alteração de versão entre avaliação e gravação adia o selo sem desfazer a revisão.
  A exclusão não entra em deadlock com a captura adulta nem ressuscita concessões.
- Reenvio exige nova evidência. Uma resposta idempotente já revisada não anuncia uma nova fila.
  Trocar a comunidade no Admin descarta respostas pendentes da fila anterior.
- Python de revisão executa o snapshot autorizado; não recebe poderes de autoria/publicação.
- Seed reutiliza UUIDs existentes, mantém conteúdo e produz rascunhos. Repetir não duplica;
  mudança de versão invalida o plano. Curso planejado não publica com só uma parte pronta.

## Validação reproduzível

Os comandos abaixo rodam no pacote indicado. Testes SQL exigem banco local descartável
`kids_journey_*` explicitamente configurado; sem a variável eles são pulados e não constituem
evidência de persistência. As execuções desta entrega usaram PostgreSQL local com migrations reais.

| Pacote | Comando / grupo | Resultado observado |
| --- | --- | --- |
| Core | `creator-curriculum`, `creator-journey-adapters`, `journey-state`, `journey`, seis suítes `kids-journey-*` e `src/journey/adult-policy.test.ts` | 105 testes; 3.025 assertions, em duas execuções |
| Members | `bun test tests/unit/creator-journey-sharing-audit.test.ts tests/unit/creator-journey-seed.test.ts tests/unit/independent-course-access.test.ts tests/integration/creator-journey-access.test.ts tests/unit/studio-unlocks.test.ts` | 43 testes; 184 assertions |
| Members | `bun test tests/unit/mastery.test.ts tests/unit/mastery-routes.test.ts tests/unit/studio-mastery-review-runtime.test.ts` | 18 testes; 103 assertions |
| Members SQL | `tests/db/kids-journey.repository.test.ts` | 45 testes; 211 assertions |
| Members SQL | `tests/db/adult-journey-capture.test.ts` | 6 testes; 33 assertions |
| Members SQL | `tests/db/creator-journey-seed.test.ts` | 5 testes; 18 assertions |
| Members SQL | `tests/db/mastery.test.ts` | 4 testes; 12 assertions |
| Members SQL | `tests/db/mastery-concurrency.test.ts` | 4 testes; 22 assertions |
| Members SQL | Regressão de publicação/exclusão Kids | 2 testes; 21 assertions |
| Admin | `bun test tests/nav.test.ts tests/platform-transition.test.ts tests/kids-journey-navigation.test.ts tests/mastery-review.test.tsx` | 22 testes; 108 assertions; o wrapper de revisão executa mais 3 casos DOM isolados |
| Member Shell | `bun test tests/creator-journey-ui.test.tsx tests/masteries-routes.test.ts tests/mastery-submission.test.tsx` | 16 testes; 51 assertions |
| Gateway | `bun test tests/unit/config.test.ts tests/unit/kids-journey-config.test.ts tests/unit/mastery-config.test.ts` | 59 testes; 377 assertions |
| Studio | Revisão de Maestria e regressões de runtime público/autoria | 16 testes; 116 assertions |

`bun run typecheck` terminou com código zero em Core, Members, API Gateway, Admin,
Member Shell, Community Kids e Community. Biome foi aplicado somente aos arquivos desta implementação;
`git diff --check` terminou com código zero. Os avisos de conversão CRLF de arquivos de
outra tarefa não foram tratados com uma formatação geral.

A checagem isolada de Member Shell também inclui os arquivos de testes e a prévia importada
por eles. Foram corrigidas a leitura tipada das tuplas de oficinas do JSON editorial e a
assinatura completa do mock de `fetch`; os 16 testes foram repetidos após essas correções.

O plano offline foi executado com `bun run journey:seed-creator plan --offline`: sete postos
e seis áreas por público, 294 identidades de cursos e 740 aulas em outlines quando nenhum
curso existente está disponível para reutilização. Esse plano não confirma UUIDs remotos.
No ensaio SQL, um Farol existente foi preservado integralmente e a segunda execução retornou
zero criações e 294 registros preservados.

## Verificação visual

O harness `packages/member-shell/qa/creator-journey-serve.ts` monta os componentes reais,
as fontes e os estilos das comunidades com identidades e progresso fictícios. Não escreve
em contas nem registra avaliações. Execução em `packages/community`:

```powershell
bunx playwright test --config playwright.creator-journey.config.ts
```

Cobertura: mapa, posto, áreas e detalhe da Maestria em Kids/adultos, nas larguras 390, 768 e
1440; editor de revisão do Admin em 390 e 1440; ausência de overflow; cursos em preparação;
exceção de compra avulsa; critérios, devolutivas, acordeões e navegação. Screenshots ficam em
`packages/community/.cache/creator-journey-*.png` e não são assets da aplicação.

Resultado final: **28 cenários passaram**, sem falhas. As capturas do mapa Kids/adulto,
da Maestria no celular e da revisão no Admin também foram inspecionadas visualmente.

## Limites e ativação

- Conteúdos novos são planejamento editorial, não vídeos ou aulas produzidas. Configurar os
  blocos concedidos e os critérios reais, produzir as aulas e publicá-las antes da ativação.
- A auditoria dos cursos existentes usa os manifestos do repositório. O relatório do seed
  identifica os campos de Farol/Cadê a conferir no Admin remoto sem sobrescrever a árvore.
- A migration aditiva `0139_creator_journey_masteries` foi gerada pelo script do projeto e
  exercitada localmente. Aplicação remota e publicação de políticas seguem o roteiro do seed.
- Captura adulta foi ensaiada com 501 pessoas; o tempo de lock em uma coorte de produção
  ainda precisa ser medido em staging. O processamento tem memória limitada por lote.
- Não houve build/deploy de produção nesta verificação. Prévia de componentes não substitui
  o ensaio integrado de autenticação, pagamentos e runtime remoto no ambiente de staging.
