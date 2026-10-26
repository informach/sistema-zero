# Cadastro da Jornada do Criador revisada

O manifesto editorial está em `docs/design/jornada-criador-curriculo-2026-10-25.json`.
O seed cria o planejamento no Admin e vincula as políticas aos UUIDs dos cursos. Não publica
aulas nem transforma exemplos de jogos em cursos gravados. A publicação do currículo e a
publicação de cada curso são operações diferentes.

Cada público recebe sete pares 2D/3D, sete missões, 34 Poderes, 20 extras e seis Maestrias
com três níveis, um núcleo e três oficinas por nível: 147 registros por público, 294 no total.
No catálogo existente, os dez cursos conhecidos são reutilizados pelo slug exato e público.
Sem catálogo, o plano offline é somente uma simulação de identidades novas.

| Slug Kids (adulto acrescenta `-adulto`) | Vínculo |
| --- | --- |
| `desafio-primeiro-jogo` | Faísca, base 2D |
| `cade-todo-mundo` | Faísca, extra |
| `nave-contra-asteroides` | Construtor, base 2D |
| `o-jogo-do-meu-jeito` | Construtor, extra |
| `corre-dino` | Inventor, base 2D |

O seed preserva integralmente os cursos existentes: UUID, versão, título, aulas, blocos,
publicação, metadata e progresso. As posições antigas continuam como histórico; o novo
currículo define o papel por UUID. O Dino existente conserva suas 13 aulas até revisão editorial.
Não reduzir o curso para seis aulas pelo seed.

Os novos registros têm `status=draft`, aulas `isPublished=false`, slot legado nulo, tag histórica
neutra `journeyRole=reward` (válida também para Adulto/Lenda) e outline
editorial. A descrição inclui conceito, aplicação, critérios e escopo. Produzir vídeos,
atividades, curadoria de blocos, critérios automáticos e entregas antes da publicação.
Uma aula planejada não equivale a uma aula pronta. O seed nunca inventa blocos que o curso
concederia: a autoria configura `studioUnlockBlocks` após definir o repertório ensinado.

O metadata tipado `creatorSeed.requiredLessonIds` preserva os UUIDs de todas as aulas do
outline. O Admin exige todas publicadas antes de publicar o curso novo e informa os títulos
que faltam. Assim, publicar só a aplicação 2D não libera a missão 2D/3D. As identidades das
aulas planejadas são preservadas também em rascunho: excluir uma delas ou seu módulo é
recusado, pois deixaria uma referência impossível de satisfazer na publicação. Revise título,
conteúdo e ordem mantendo a aula. Aulas extras fora do planejamento podem ser excluídas.
Para despublicar uma aula planejada durante a revisão, despublique o curso primeiro.
Esse gate confere cobertura editorial, não inventa aprendizagem: a autoria de cada aula ainda
precisa cumprir os critérios normais de conteúdo, verificação e envio. Cursos preexistentes
sem esse metadata mantêm sua estrutura e progresso. Os campos não são apagados pelo PATCH
normal do curso nem transformados em configuração editável pelo aluno.

## Comandos

Executar em `packages/members`. A conexão exige `CREATOR_JOURNEY_DATABASE_URL` explícita;
não existe fallback para `DATABASE_URL`. Os comandos de escrita conferem o nome do banco
com `--expect-database`. Usar uma conexão local dedicada para ensaiar primeiro.

```powershell
bun run journey:seed-creator plan --offline
# Defina CREATOR_JOURNEY_DATABASE_URL pelo gerenciador de ambiente usado pela equipe.
bun run journey:seed-creator plan
bun run journey:seed-creator apply --expect-database NOME_DO_BANCO
```

`plan` não grava. `apply` insere somente rascunhos novos e seus outlines numa transação.
Reexecutar com o catálogo atual preserva todos os registros e retorna zero criações. Uma
identidade de outro público/modalidade ou mudança de versão durante o plano provoca erro;
não há merge silencioso nem alteração de curso do aluno.

`plan` e `apply` também retornam `editorialReviews`: Farol/Cadê reutilizados pedem conferência
dos três campos de encerramento identificados pelos manifestos oficiais. O relatório informa
UUID, slug e versão do curso. O catálogo não contém a revisão da aula: a correção remota deve
abrir o rascunho atual, confirmar os campos e usar o CAS de autoria, sem importar a árvore inteira
por cima de uma aula já editada. Textos já corrigidos não devem ser alterados. Vídeos, critérios,
IDs e progresso permanecem. A auditoria está em `docs/jornada-criador-auditoria-publicacao.md`.

Depois do cadastro, preparar a nova política Kids pelo protocolo canônico:

```powershell
bun run journey:seed-creator prepare-kids --expect-database NOME_DO_BANCO --actor UUID_REAL_DA_EQUIPE
bun run journey:seed-creator advance-kids --expect-database NOME_DO_BANCO --preparation UUID_DA_PREPARACAO
# Repetir advance-kids enquanto houver captura/preparação pendente.
bun run journey:seed-creator publish-kids --expect-database NOME_DO_BANCO --preparation UUID_DA_PREPARACAO --actor UUID_REAL_DA_EQUIPE
bun run journey:seed-creator publish-adult --expect-database NOME_DO_BANCO
```

A preparação Kids usa captura bounded de coorte, congelamento dos direitos anteriores,
hashes de catálogo/coorte e CAS da versão. `publish-kids` exige estado `ready`; preparação
desatualizada precisa de novo preparo. Não escrever `kids_journey_policy` diretamente.
Se ainda não existe a política Kids publicada, realizar primeiro o bootstrap documentado
em `docs/jornada-do-criador-legado.md`, incluindo a admissão de perfis Auth. O seed novo não simula
esse bootstrap nem fabrica um ator da equipe.

O caminho adulto chama o mesmo `AdultJourneyService.configure` do Admin, com a versão
atual e preservação da política anterior. Políticas já iguais são no-op. O seed antigo
`journey:seed-adult` representa a jornada anterior e não deve ser usado para substituir
este currículo. O boot continua sem sobrescrever uma política existente.

## Regras de acesso e evidência

- Bases 2D e 3D completas abrem missão, Poderes e extras do posto.
- Promoção exige as duas bases, missão completa nas duas dimensões e um Poder distinto no
  Faísca ou dois nos demais. Alternativas 2D/3D do mesmo Poder não duplicam a contagem.
- Cada conclusão concede os blocos do curso; publicar no Mural é opcional. Cursos arquivados
  que continuam acessíveis também concedem os blocos quando concluídos. Rascunhos não geram
  concessões novas; os blocos já conquistados permanecem no ledger.
- Farol/Cadê com compra específica ativa, concessão manual independente ou presente válido
  mantêm acesso direto. Matrícula de curso gerada por assinatura não é compra independente.
- Créditos e aprovações de Maestria vêm do fluxo de revisão humana, com evidência e rubrica
  congeladas. O seed não aprova pessoas, não atribui créditos e não exige publicação pública.
- A primeira entrega persistida fixa a definição do nível antes de deduplicar novas entregas.
  Concessões conferem novamente a versão da política sob trava; pausa ou edição concorrente
  adia o selo e preserva a revisão aprovada. Exclusão cerca novas escritas antes de apagar
  entregas/conquistas, na mesma ordem usada pela captura de direitos.
  Revisões e selos Kids também congelam os direitos que abrem na mesma transação, inclusive
  se a preparação já capturou aquele aluno. Cursos/ferramentas usam os mesmos fatos preservados
  de definição, admissão e crédito que a tela de Maestrias.
- Estúdio/Pinta entram após Farol; Molda básico após a primeira base 3D. IA/Pensa/Ponte após
  o par do Construtor e Pro após a introdução Python no Explorador. Faixas avançadas do Molda
  são ensinadas e concedidas nos núcleos II/III da Maestria de Modelagem.
  Na migração da jornada adulta anterior, quem já podia usar Molda conserva as três faixas;
  alunos novos do currículo passam pelas liberações básico, intermediário e profissional.
- Conquistas, ferramentas e cursos pedagogicamente abertos são preservados em ledgers.
  A autorização comercial permanece independente e respeita validade e revogação.

## Verificação local

```powershell
bun test tests/unit/creator-journey-seed.test.ts tests/unit/independent-course-access.test.ts tests/integration/creator-journey-access.test.ts tests/unit/studio-unlocks.test.ts
# CREATOR_JOURNEY_TEST_DATABASE_URL deve apontar a localhost e banco vazio kids_journey_*.
bun test tests/db/creator-journey-seed.test.ts
```

O teste SQL aplica o histórico real de migrations no banco local descartável explicitamente
nomeado. Sem a variável, ele é pulado; esse skip não comprova persistência. A migration do
ledger e das revisões de Maestria deve preceder a ativação do novo código e currículo.
Aplicar também `0140_adult_molda_curriculum_bands`, gerada pelo script do projeto: amplia
o CHECK das capacidades adultas para aceitar as duas faixas avançadas. Não cria conquistas
por conta própria; a preservação do acesso anterior ocorre na troca normal da política.
O ALTER adquire lock na tabela de concessões e valida seus registros: ensaiar a duração em
staging. Em rollback de aplicação, manter essa ampliação e os recibos já gravados; restringir
o CHECK aos sete valores antigos depois de conceder as novas faixas seria inválido.
