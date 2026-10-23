# Qualificar a API de linguagem hospedada

Este runner testa o Worker hospedado depois do cutover. Não implanta código,
descobre credenciais, configura serviços nem executa Python. O protocolo e o
bootstrap vêm dos contratos atuais do Core. Os oráculos de Turtle, stdlib,
`sz_audio` e erro de argumento seguem a prova da imagem em `verify-container.ts`.

Plano do recorte: validar argumentos e bootstrap antes de rede; reservar diretório
novo e recibo RUNNING; verificar admissão, análise e negativas; aguardar Close de
todos os IDs conhecidos; registrar separadamente cancelamento e provas externas.
Os testes inertes cobrem o comportamento do runner e não qualificam Pyright remoto.

Da raiz do checkout, com Bun fixado pelo repositório, informe **todos** os campos:

```text
bun --no-env-file packages/studio-language-service/scripts/qualify-remote.ts preflight --environment=staging --base-url=https://sistemazero-studio-language-staging.helena-bcc.workers.dev --bootstrap=BOOTSTRAP-PUBLICO.json --deployment=DEPLOYMENT-PUBLICO.json --distribution-sha256=SHA256-DISTRIBUICAO --manifest-sha256=SHA256-MANIFESTO --profile-id=PROFILE --release-id=RELEASE --out=DIRETORIO-NOVO-PREFLIGHT
```

Os marcadores de arquivos e hashes são intencionalmente inválidos. O bootstrap público tem
`{protocolVersion:1,runtimeRelease}`; o manifesto é recalculado e confrontado com
os pins externos de SHA, profile e release. O deployment público tem
`{release,distribution}`, extraído do plano canônico aprovado. O verificador Core
recalcula o SHA da distribuição, confere os artefatos e exige a mesma release do
bootstrap. O arquivo precisa ser regular, sem symlink, com até 2 MB. Os dois
arquivos são lidos com orçamento antes de qualquer rede. A release precisa prover `sz_audio`.
Não usar uma fixture sintética ou recibo histórico. O diretório pai de `--out`
deve existir, mas o diretório final nunca pode existir. Nenhuma leitura de token
ou rede ocorre no preflight. O input validado é copiado para `bootstrap.json`.

Depois de conferir Worker, imagem, namespace e autorização operacional, trocar
`preflight` por `run` e escolher **outro** diretório novo. O único credential input
é `STUDIO_PYTHON_LANGUAGE_TOKEN` no ambiente herdado do processo, provisionado pelo
operador sem shell echo/CLI argument/arquivo. `--no-env-file` impede leitura
automática de `.env`; o runner não consulta Railway. Nunca anexar o ambiente.
Não há destino padrão. `--environment=staging` aceita somente a origem acima;
`--environment=production` aceita somente
`https://sistemazero-studio-language.helena-bcc.workers.dev`. Trocar somente o
ambiente ou a URL é recusado, inclusive na chamada programática. Os pins e
arquivos correspondentes devem vir da implantação escolhida; não usar um recibo
staging para qualificar produção. A origem não atesta versão, imagem ou namespace
do Worker: a leitura externa continua obrigatória. Ambos os ambientes usam os
mesmos oráculos, prazos, limites e regras de cleanup.

A sequência usa owner/projeto aleatórios próprios, duas reservas sem iniciar a
segunda, terceira reserva recusada por quota, release ausente/forjada recusadas,
binding errado recusado, um Start, Sync e consultas estáticas. Confere completions
Turtle/stdlib, assinatura de áudio, erro `reportArgumentType` causado por `123` no
lugar do path e seu desaparecimento depois de editar, além de revisão obsoleta.
O binding aqui é isolado da prova: não afirma autorização real de Members/BFF.

Cancelamento usa uma única consulta `projectDiagnostics` sobre 7.000 linhas e um
cancel concorrente, sem retry, sleep fixo ou aumento de carga. Só a resposta
`cancelled` do próprio alvo qualifica o cancelamento. Se a consulta terminar antes,
a API básica pode passar, mas `cancellationQualified=false`. Isso nunca prova
interrupção de uma fase nativa ocupada nem cancelamento durante bootstrap.

O teto é 300 segundos: até 240 de trabalho e 60 de cleanup, sem exceder o total.
Start usa os 40 segundos e queries os 15 segundos do contrato. SIGINT/SIGTERM
interrompem trabalho, preservando a tentativa de cleanup com prazo separado.
DELETE aguarda `closed:true` e Start posterior exige 410. Falhas de operação e
de cada cleanup são preservadas juntas; não impedem a tentativa dos demais IDs.
Resposta perdida de Open marca `remoteOutcomeUnknown=true`: sem ID não se inventa
um Close. Não há retry automático ou inferência de limpeza por TTL.

O recibo exclusivo é escrito antes do primeiro fetch. Guarda somente pins,
hashes, IDs QA, etapas/status e resultados limitados; não grava token, binding,
fonte, resposta inteira ou mensagem de erro do provider. O código de saída é zero
somente para preflight ou API básica aprovada; **não é aceite completo**:
`overallQualified`, `physicalCleanupVerified`, `hostedUiVerified`,
`contextualAuthorizationVerified` e `deployedVersionVerified` permanecem falsos.
O operador precisa ligar esse recibo à versão implantada e à inspeção externa da
aplicação exata com zero containers vivos/pendentes. Depois executar os percursos
autenticados de Admin/aula/live/Estúdio Completo; esta API interna não os substitui.

Controle local, sem rede/servidor/Pyright:

```text
bun test packages/studio-language-service/tests/remote-qualifier.test.ts
```
