# Infraestrutura Railway

Esta pasta substitui os 17 arquivos `packages/*/railway.json`. O formato antigo deixa de ser lido em 01/12/2026. O projeto usa a mesma definição para staging e produção, com variáveis e domínios próprios de cada ambiente.

- `railway.ts`: projeto, serviços, Postgres, Evolution e volumes existentes.
- `services/*.json`: Dockerfile, padrões de arquivos, preDeploy, comando inicial e healthcheck de cada aplicação.
- `production-sources.ts`: origens literais dos 18 serviços após desligamento nativo, sem defaults de branch.
- `variables.ts`: nomes das variáveis que devem permanecer no Railway. Não contém valores nem credenciais.
- `package-lock.json`: SDK Railway 3.11.0. A automação fixa a CLI em 5.62.1 e usa Node 24.

O Railway usa `ON_FAILURE` como política padrão de reinício. O importador omite esse padrão; os serviços mantêm três tentativas em `restartPolicyMaxRetries`. Os nomes e tamanhos dos volumes refletem recursos existentes, sem recriação. Staging tem origem na branch staging, com autodeploy nativo desligado. Em produção, o controlador valida main e envia o commit SHA explícito; o mapa de origens preserva exatamente a presença ou ausência de branch observada após o desligamento nativo.

## Próximo deploy

1. Integrar o trabalho em staging. O CI executa todos os testes, aplica a configuração de staging e publica os serviços afetados.
2. Abrir PR de staging para main. Além dos testes, `railway-config-plan` salva o plano de produção, vinculado ao SHA da pasta `.railway/` e ao estado remoto.
3. Antes da primeira promoção, desligar os triggers nativos de produção e conferir `enabled=false` para todos os serviços. A mutação oficial pode remover `source.checkSuites` e também `source.branch`. O mapa literal preserva essa forma exata sem restaurar branch nem usar o default do helper GitHub. Ausência desses campos não substitui a leitura do toggle. Congelar operações externas durante a onda.
4. Fazer merge commit. O workflow de configuração somente confere o plano salvo e a deriva, sem apply. Um plano real não vazio exige uma onda operacional de configuração por fase; não está resolvido automaticamente por este lote.
5. Executar `Deploy produção` na ref `main`, com o SHA completo e CSV explícito. O controlador confere os nove jobs da mesma tentativa CI do PR, igualdade da árvore promovida, plano aprovado e triggers desligados. Publica Members/Auth na ordem canônica e só libera os aplicativos após V1. Selecione Members e Auth juntos quando houver mudança de backend.
6. Conferir os deployments e os fluxos reais. O recibo preserva checkpoints e ACKs; falha parcial não autoriza repetir POST desconhecido nem presumir rollback.

Não usar Wait for CI como barreira de dados: ele aguarda workflows completos e pode esperar o próprio job que aguarda os deployments. Fiscal mantém seleção deliberada e validação do certificado. A primeira implantação do gravador existente exige `initialize_recorder=true` e sua seleção no CSV; UUID, ausência de ativos/pendentes e barreira V1 são conferidos. Os demais serviços exigem deployment anterior saudável.

O [plano do dono único de CD](../docs/superpowers/plans/2026-10-22-production-cd-owner.md) registra as tarefas pendentes da primeira promoção, inclusive aplicação de configuração por fases com adoção dos ACKs iniciados pelo apply. O gate atual recusa essas mudanças antes de qualquer apply. Não há alegação de configuração conciliada ou produção pronta apenas porque um plano vazio passou.

O secret `RAILWAY_TOKEN` existente é um token de conta. A CLI o recebe como `RAILWAY_API_TOKEN` e vincula explicitamente o projeto e o ambiente antes de cada operação. O gate confere o ambiente do plano e a definição recusa IDs desconhecidos. Nenhuma credencial é gravada no repositório.

## Alterar configuração

Edite o JSON do serviço e teste em staging. Mudanças em `.railway/` acionam todos os serviços da aplicação, pois podem alterar configurações compartilhadas. O preDeploy continua executando as migrações antes de iniciar cada serviço. Não volte a criar arquivos `railway.json` nem vínculos `railwayConfigFile`.

O apply do Railway pode iniciar deployments quando altera build ou deploy. Por isso, staging só aplica após os testes, usa sua própria branch como origem e depois confere a publicação do SHA validado. Alterações incompatíveis de infraestrutura ou de contrato precisam de rollout específico por ondas. Na migração inicial, o Fiscal teve apenas sua configuração migrada: o certificado vencido impede seu redeploy, e a validação de staging usa CSV explícito dos outros 16 serviços.

Ao adicionar uma variável pelo painel, inclua seu nome em `variables.ts`, na lista comum ou na lista específica do ambiente. Use `preserve()` para manter seu valor no Railway. Se o nome estiver ausente, o plano mostrará uma exclusão e o gate impedirá a aplicação. Alterar apenas o valor de uma variável preservada não exige editar o repositório.

O gate automático aceita somente alterações seguras de build e deploy das aplicações existentes. Toda alteração de origem é recusada, inclusive main sem checkSuites: mudanças de repo, branch ou trigger exigem operação explícita, com nova leitura dos 18 toggles e da configuração. Também recusa mudanças em variáveis, domínios, bancos, volumes, Evolution e operações destrutivas. Não omitir source para tentar preservá-lo: a CLI pode traduzir isso em source:null.

## Conferir localmente

Use Node 24 e Railway CLI 5.62.1, com `railway` dessa versão no PATH:

```sh
npm ci --prefix .railway --ignore-scripts
railway link --project 415d5a1c-5f75-432c-8445-b395d0977ce3 --environment staging
railway config plan
```

Para conferir produção, vincule explicitamente `--environment production`. `plan` não modifica o ambiente. Não use `--include-variables`, `--decrypt-variables` ou `--show-values` em logs ou arquivos versionados.

O script de CI exige `.railway/` commitada e limpa:

```sh
node scripts/ci/railway-config.mjs plan staging /tmp/railway-staging-plan.json
node scripts/ci/railway-config.mjs apply staging /tmp/railway-staging-plan.json
```

Guarde os planos fora da pasta `.railway/`, pois ela é fixada por hash. O apply recusa estado remoto alterado ou árvore diferente. Se isso ocorrer antes do merge, reexecute o job de plano do PR. Depois do merge, investigue o drift e abra um novo PR para gerar um plano atualizado; não desative a verificação nem passe `--confirm-destructive` para contorná-la.

Referências: [IaC Railway](https://docs.railway.com/infrastructure-as-code), [Wait for CI](https://docs.railway.com/deployments/github-autodeploys#wait-for-ci).


## Jornada Kids — credencial de admissão

Auth e Members precisam do mesmo `MEMBERS_PROFILE_ADMISSION_TOKEN`, dedicado ao initializer privado
Auth→Members. Os nomes estão em `variables.ts`; os valores devem ser provisionados no ambiente antes
do rollout. Nenhuma credencial foi criada, consultada ou aplicada por esta implementação. Não reutilizar
`MEMBERS_INTERNAL_TOKEN`, não publicar o valor no browser e não registrar headers/body com o segredo.
Os dois serviços recusam boot de produção sem essa configuração; o initializer também nega token
não configurado/ausente/incorreto fora de produção. Erro remoto mantém o mesmo perfil pending e job
para retry durável, sem nova cobrança/ID nem fallback de concessão.

A ativação depende do runbook da jornada: provisionar seed V0, retirar criadores Auth antigos,
capturar todos os perfis anteriores (inclusive arquivados e sem XP), materializar baseline e publicar V1
antes de liberar o tráfego migrado. As migrations Auth preservam existentes ready; somente futuros
nascem pending. Não habilitar rollout parcial só porque migrations, token e processos iniciaram.
CI habilita as suites SQL Kids e Auth admission com URLs explícitas em bancos descartáveis separados;
Auth usa um banco novo para provar a expansão sobre perfis reais anteriores à migration0023.

## Primeiro rollout canônico Kids no staging

O CI usa `scripts/ci/kids-journey-rollout.mjs`, exclusivamente no projeto/ambiente staging
fixados no script. Não existe flagPython, política de fallback ou INSERT de earned no runner.
O token dedicado de admissão foi provisionado nos dois serviços staging em19/10/2026 com
`skipDeploys:true`; isso não muda o ambiente de containers antigos já em execução. O root
mantém o recibo operacional local; nenhum valor está neste repositório.

A ordem é: preflightSSH readonly no artefato antigo → planoIaC que não antecipa backends/apps
→ deployMembers+migrations → initializeV0 → deployAuth/retirada dos antigos → captura/baseline
bounded na mesma preparação → publishV1/verificação → apps. `SUCCESS` e `/readyz` sozinhos
não comprovam preservação ou retirada. O runner exige `REMOVED` de cada deployment anterior
observado, conservando os IDs mesmo quando somem de activeDeployments; confere Auth de novo
durante a captura e antes/depois da publicação. O container Members confirma seu SHA, service,
ambiente e deployment antes de executar o CLI produtivo.

O deploy de staging e o controlador de produção reservam até 60 minutos por espera de
backend e 140 minutos para a onda canônica inteira, incluindo migrações, captura e
publicação. Em 22/10 Members levou 24min25s e Auth cerca de 56 minutos até `SUCCESS`;
os limites anteriores de dez e trinta minutos interrompiam o operador enquanto o
Railway ainda construía ou provisionava a réplica. Depois da barreira, os apps
são disparados em paralelo e compartilham uma espera de 20 minutos reais, com cada chamada
HTTP limitada a 15 segundos. O job reserva 180 minutos ao todo; os limites dos testes e do
produto não mudam. Expirar continua bloqueando a liberação e exige retomada explícita,
sem cancelar ou repetir automaticamente um deployment de resultado pendente.

Para reaproveitar uma imagem já implantada, um operador explícito pode fornecer
`createRailwayPorts(..., { adoptDeployments: { members: { id, commitSha, imageDigest, previousIds } } })`
ao mesmo `runKidsJourneyRollout`. A porta confere novamente destino, SHA e digest reais, único
deployment `SUCCESS`, ausência de qualquer outro deployment pendente e `REMOVED` de todos os
predecessores indicados. A adoção não faz POST de deploy nem substitui o probe SSH de admissão,
as migrações, a verificação da jornada ou a barreira dos aplicativos. Não há flag de CLI nem
adoção automática; sem essa opção, a porta continua criando um deployment novo normalmente.

**Janela operacional:** manter congelados deploys/rollbacks externos, criadores antigos,
import/backfill e autoria do catálogo durante toda a carga inicial. O trigger nativo staging
fica desligado e o CI serializa sua própria onda, mas isso não é um lock contra um operador
externo. As rechecagens detectam deriva observada, sem atomicidade crossDB. Se esse contrato
for violado, parar e investigar a integridade da coorte antes de retomar; não assumir que um
cursor avançado incluiu um perfil criado por uma instância antiga durante a violação. Não
prometer zero downtime: se a onda parar após migrar o backend, apps antigos podem apresentar
indisponibilidade explícita até a retomada controlada.

Um erro/stale/CAS/recibo malformado ou progresso canônico repetido falha o job sem liberar
apps. O hash de progresso inclui os cursores reais e a etapa de captura, mantendo IDs privados
no container; `processed:0` durante a passagem Auth→Members não é erro. Reexecução explícita
normal usa initialize para recuperar a mesma preparação persistida ou reconhecer a policy já
publicada; não reseed/reset. Após cancelamento, usar dispatch explícito com
`services=members,auth,admin,community-kids,community` e SHA/range corretos. Push só de apps faz
verificação readonly de published, sem migrar/republicar a política.

O applyIaC pode iniciar deployments: o guard anterior ao apply recusa mudanças de build,
deploy ou source em Auth, Members, Admin, Community e Kids. Essas mudanças exigem uma onda
operacional própria; não remover o guard para contornar o primeiro bootstrap. Os demais
gates de segurança do plano continuam valendo.

### Identidade SSH do CI

RailwayCLI5.62.1 usa o OpenSSH do sistema, com argumentos preservados e stdin não interativo.
Referências: [comando oficial](https://docs.railway.com/cli/ssh) e
[transporte da versão pinada](https://github.com/railwayapp/cli/blob/v5.62.1/src/commands/ssh/native.rs).
A chave precisa estar cadastrada no mesmo usuário/workspace usado pelo tokenAPI do CI.
ChavesRailway não têm escopo nativo de ambiente: usar a menor autoridade disponível; o nosso
wrapper exige destino explícito de produção com IDs reais quando usado fora de staging;
o default permanece staging. O runner não registra
chaves automaticamente, não usa tmux e não desliga a verificação do host.

Procedimento do operador, em terminal confiável, sem imprimir valores privados:

1. Criar uma identidadeEd25519 dedicada ao CI em diretório temporário privado; não reutilizar
   chave pessoal. `ssh-keygen -t ed25519 -N '' -f <arquivo-privado>` gera também `<arquivo-privado>.pub`.
2. Registrar **somente a pública** com `railway ssh keys add --key <arquivo-privado>.pub
   --name github-staging-rollout`, sob a identidade/workspace correta. O fingerprint público
   pode ser conferido com `ssh-keygen -lf <arquivo-privado>.pub`.
3. Enviar a privada diretamente por stdin: `gh secret set RAILWAY_SSH_PRIVATE_KEY
   --repo informach/sistema-zero < <arquivo-privado>` (sintaxe de shell POSIX; em PowerShell,
   usar pipe de `Get-Content -Raw -LiteralPath` para o mesmo comando). Nunca colar em comando,
   log, comentário, arquivo versionado ou saída de ferramenta. Retirar a cópia temporária
   depois da conferência, preservando um processo de rotação/revogação da identidadeCI.
4. Obter uma entrada `ssh.railway.com <tipo> <chave-pública-do-host>` de um known_hosts já
   autenticado ou confirmá-la com Railway por canal confiável. `ssh-keyscan` pode coletar um
   candidato, mas não autentica sua origem: comparar o fingerprint com a referência confiável
   antes de adotá-lo. Não inventar fingerprint nem aceitar cegamente o primeiro contato.
   `ssh-keygen -lf <known-hosts-verificado>` confere o fingerprint; enviar o arquivo por stdin
   a `gh secret set RAILWAY_SSH_KNOWN_HOSTS --repo informach/sistema-zero`.
5. Conferir apenas nomes/presença com `gh secret list --repo informach/sistema-zero`; os
   valores não são recuperáveis pelo GitHub. Executar o preflight do workflow antes de
   qualquer apply/deploy. Ele exige nonce, Bun e contexto do container, pois o relay pode
   responder exit0 antes de executar o comando. Falha de autenticação/host/contexto bloqueia
   a onda, sem fallback para proxy público de banco ou outro protocolo.

Neste ambiente, o operador confirmou uma entrada Ed25519 de `ssh.railway.com` já existente
no truststore local `~/.ssh/known_hosts`. Essa referência permite preparar o arquivo do CI
sem um novo primeiro contato; conferir e transferir somente a entrada desse host. Isso não
equivale a um fingerprint oficial publicado pelo Railway. O registro da identidade dedicada
e os secretsSSH continuam ações operacionais separadas, a confirmar pelo operador.

O CI grava a identidade e known_hosts temporários com permissão0600 e um bloco OpenSSH
temporário `BatchMode yes`, `StrictHostKeyChecking yes`, `IdentitiesOnly yes`. Restaura a
configuração anterior e tenta retirar os arquivos privados mesmo se a restauração falhar.
Os testes locais provam essa limpeza e a ordem/recusa da onda; não substituem o primeiro
preflightSSH real e a validação staging. Esta implementação não fez deploy nem criou
segredos/chaves remotos.
