# Full review da Jornada do Criador — 26/10/2026

Revisão da implementação local: regras compartilhadas, acesso comercial e pedagógico,
preservação de direitos, persistência, concorrência, seed, autoria, telas Kids/adulto/Admin,
entregas de Maestria e runtime. Os achados abaixo foram reproduzidos e corrigidos no workspace.
Não houve escrita no catálogo remoto, deploy ou publicação de política.

## Achados e correções

| Prioridade | Falha reproduzida | Correção |
| --- | --- | --- |
| P1 | Uma Maestria concedida depois de o aluno ser capturado pela preparação Kids, mas antes da publicação, podia abrir um curso que a política seguinte voltava a fechar. Crédito de núcleo também podia perder a ferramenta, mesmo sem selo final. | Revisão e concessão congelam os novos direitos na mesma transação, com a ordem de locks do fluxo de conclusão. Testes SQL intercalam captura, crédito/selo e mudança de política. |
| P1 | O hub de Maestrias considerava requisitos históricos, admissão e equivalências; as consultas de cursos/ferramentas consideravam apenas selos. Um núcleo antigo concluído ou validado pelo professor podia não liberar sua ferramenta. | Uma projeção comum consome definição preservada, admissão, revisão e selo. Cursos, ferramentas, hub e captura usam os mesmos fatos. Trocar o núcleo ou mover seu UUID para outro posto não revoga a admissão anterior. |
| P1 | Entregas de galeria chegavam ao avaliador como envelope de armazenamento, mas o preview esperava um projeto direto. Desenhos e jogos com assets não abriam; Python não conseguia autorizar o snapshot. | O avaliador materializa a cópia preservada e suas partes. O BFF assina somente referências da entrega autorizada; Members valida origem, caminhos, hashes e digest integral antes de executar ou interpretar o projeto. |
| P1 | Modelagem adulta anunciava faixas, mas o editor/Pensa liberavam todas; a lista de capacidades e o CHECK do banco descartavam as duas faixas avançadas, impedindo preservá-las. | As nove capacidades são representadas e persistidas. O currículo aplica as faixas nos consumidores; quem já tinha Molda na jornada adulta anterior conserva o acesso completo na captura. Migration `0140` gerada e exercitada localmente. |
| P2 | Excluir uma aula planejada ou seu módulo enquanto o curso estava em rascunho deixava um UUID obrigatório órfão, impedindo a publicação pelo Admin. | Exclusão dessas identidades é recusada também em rascunho, no serviço e sob lock no repositório. Título, conteúdo e ordem continuam editáveis; aulas extras podem ser removidas. |
| P2 | O catálogo/detalhe de uma oficina ou núcleo de Maestria bloqueado mandava concluir as bases do posto e voltava ao catálogo, omitindo a área e seu nível. | A apresentação lê o papel real no currículo e encaminha aos requisitos da Maestria correspondente. |
| P2 | Um curso arquivado, ainda acessível a quem tinha matrícula, podia ser concluído sem conceder seus blocos. O filtro antigo só aceitava `published`. | O predicado único de concessão, leitura e revisão de cache aceita `published` e `archived`. O marco congela os blocos sem Mural; `draft` continua excluído e a segregação entre públicos permanece. |

O caso de cursos arquivados já existia no caminho alterado; foi incluído porque contrariava
o contrato aprovado de concessão após cada conclusão. O acesso de equipe à configuração
adulta foi conferido e mantido conforme o contrato anterior, sem mudança incidental de papéis.

## Evidência de verificação

As falhas de retenção, requisitos históricos, galeria, exclusão de aulas e cursos arquivados
foram exercitadas antes da correção. Os testes de regressão usam os caminhos de aplicação e,
nos casos de persistência, PostgreSQL local com o histórico real de migrations. Um teste SQL
pulado por falta de variável de ambiente não conta como validação.

| Grupo | Resultado nesta revisão | Log local em `output/` |
| --- | --- | --- |
| Core: progressão, adaptadores, fatos de Maestria e políticas legadas | 108 testes; 3.038 assertions | `journey-review-core-20261026.log` |
| Members: sementes, acesso independente, revisão e runtime | 41 testes; 282 assertions | `journey-full-review-members-tests.log` |
| Members: conteúdo, clonagem e acesso | 52 testes; 209 assertions | `journey-review-content-tests.log` |
| Members: regressões de curso/ferramenta e fatos históricos | 53 testes; 271 assertions | `journey-review-members-20261026.log` |
| PostgreSQL: preparação/publicação Kids | 45 testes; 211 assertions | `review-kids-facts-regression-2026-10-26.log` |
| PostgreSQL: captura adulta, incluindo 501 pessoas e faixas Molda | 8 testes; 43 assertions | `journey-review-adult-sql-20261026.log` |
| PostgreSQL: retenção após captura | 2 testes; 10 assertions | `review-masteries-retention-shared-2026-10-26.log` |
| PostgreSQL: concorrência, pausa e exclusão de Maestrias | 4 testes; 22 assertions | `review-masteries-concurrency-2026-10-26.log` |
| PostgreSQL: entrega, revisão, selo e isolamento | 4 testes; 12 assertions | `journey-review-mastery-sql.log` |
| PostgreSQL: seed e autoria de aulas planejadas | 6 testes; 25 assertions | `journey-review-seed-green.log` |
| PostgreSQL + unidade: blocos de cursos arquivados | 29 testes; 68 assertions | `journey-review-archived-green.log` |
| PostgreSQL: elegibilidade, rascunho e segregação de público | 3 testes; 7 assertions | `journey-review-eligibility-sql.log` |
| Member Shell: jornada, submissão e BFF | 16 testes; 51 assertions | `journey-review-shell-tests.log` |
| Gateway: autenticação e limites de rotas | 59 testes; 377 assertions | `journey-review-gateway-tests.log` |
| Members: materialização gzip, hashes, origem, cotas e cancelamento | 6 testes; 33 assertions | `journey-review-gallery-source-tests.log` |
| Studio: execução/inspeção de revisão e regressão do runtime público | 7 testes; 49 assertions | `journey-review-runtime-tests.log` |

Os grupos de aplicação se sobrepõem; não são uma contagem de testes únicos. Foram exercitados
**74 casos SQL distintos**, sem skips, além dos testes de unidade e integração.

A rodada final das interfaces passou: Member Shell, 25 testes/80 assertions; Community,
10/41; Kids, 11/55. O Admin passou os três wrappers isolados que executam cinco casos do
viewer, oito do BFF e três de avaliação humana. Os logs são `packages/<pacote>/.cache/creator-review-unit.log`.
Os testes de bloqueio usam o corpo 423 real produzido por Members; não apenas um DTO inventado.

**32 cenários Playwright passaram** no harness local, em 390, 768 e 1440 px: mapa, posto,
áreas, Maestria e Admin. A revisão incluiu troca de desenho preservado, download correto,
fechamento do tutorial do Pinta, consulta de cada arquivo Python e ausência de overflow.
Descarte de resposta atrasada e retry foram verificados nos testes DOM do viewer.
Log: `packages/community/.cache/creator-review-playwright.log`. Capturas de mapa adulto,
Maestria Kids, galeria e arquivos Python também foram inspecionadas visualmente.
O preview local de Python informa a ausência do serviço de runtime; a autorização/materialização
foi exercitada separadamente nos testes acima, sem simular execução remota bem-sucedida.

`bun run typecheck` terminou com código zero nos oito pacotes: Core, Members, API Gateway,
Studio, Admin, Member Shell, Community Kids e Community. Logs de Core/Members/Gateway/Studio/
Member Shell estão em `output/journey-review-*-typecheck*.log`; os três frontends registram
`packages/<pacote>/.cache/creator-review-typecheck.log`.

Essas checagens encontraram e permitiram corrigir o ramo impossível de modo Python no
inspetor e os mapas de rótulos que ainda não incluíam as novas faixas do Molda. A rodada final
passou após as correções. Biome dos arquivos revisados passou e `git diff --check` terminou
com código zero. Os CRLF existentes da composição foram preservados.

Não ficou bloqueador conhecido pendente no escopo revisado. Isso não substitui o ensaio
de ativação e serviços remotos descrito abaixo.

## Operação e limites

- Aplicar `0139_creator_journey_masteries` e `0140_adult_molda_curriculum_bands` antes da
  ativação do código/currículo. A segunda amplia um CHECK; não exige backfill nem apaga dados.
  Ensaiar o tempo de lock em staging e manter as novas capacidades em eventual rollback.
- O seed continua criando planejamento em rascunho e preservando os cursos existentes.
  Novos cursos ainda exigem produção editorial, configuração dos blocos e publicação.
- A revisão de Python autoriza execução/pausa e interpretação do snapshot para leitura de
  blocos. Não concede edição, LSP, REPL ou autoridade de autoria. URLs privadas não vêm do navegador.
- Testes de componente e prévias locais não substituem o ensaio de autenticação, pagamentos,
  armazenamento e runtime remoto em staging. Produção não foi usada para esta revisão.
- Alterações simultâneas da tarefa de Cadê/quiz foram preservadas; não houve reset,
  limpeza ou formatação geral do repositório.

Referências: [contrato](jornada-do-criador.md), [seed e ativação](jornada-criador-seed.md),
[auditoria de conclusão](jornada-criador-auditoria-publicacao.md) e
[verificação inicial](jornada-criador-verificacao.md).
