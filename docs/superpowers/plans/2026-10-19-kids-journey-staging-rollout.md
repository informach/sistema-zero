# Kids staging rollout Implementation Plan

**Goal:** publicar o checkpoint integrado no staging sem expor consumidores Kids antes do seed canônico e da preservação da coorte.

**Architecture:** uma onda CI limitada a staging usa o deploy GraphQL já existente e a CLI Railway5.62.1 para executar os comandos canônicos dentro do container Members. Não há RPC novo, alteração de policy por JSON/SQL, fallback legado, flagPython ou dependência de banco público. O workflow só dispara os apps após a barreira published.

**Tech Stack:** Node24 para orquestração CI; Bun do artefato Members para o CLI existente; RailwayCLI5.62.1; testes Bun com transports locais injetados.

**Spec:** `.compozy/tasks/kids-configurable-journey/_techspec.md`, seção rollout/coorte; `packages/members/scripts/bootstrap-kids-journey.ts` e sua prova Auth7/45.

## Contrato para review antes de alterar workflow

1. Preflight antes de apply/deploy: projeto/ambiente staging fixos, SHA40hex, CLI5.62.1 e `ssh`, credencial API e chaveSSH CI explicitamente fornecida. Testa execução/Bun/contexto com nonce no artefato antigo, sem exigir nele o token novo aplicado por skipDeploys. A configuração nova é exigida nos containers novos antes da captura. A execução não registra/copia valores de variáveis remotas.
2. Quando Members ou Auth estiverem no conjunto afetado, a onda incorpora ambos. Deploy Members no SHA solicitado, espera SUCCESS e `activeDeployments` exclusivamente do deployment/SHA esperado; erro/timeout/antigo ainda ativo aborta. O preDeploy atual executa Members migrations; um comando remoto explícito `db:migrate` também pode confirmar a fase idempotente antes de initialize, sem alterar histórico.
3. `railway ssh -p <project> -e <staging> -s <members> -i <identity-file> -- bun scripts/release/kids-journey-bootstrap.mjs ...` executa uma operação fechada. Antes de qualquer chamada, o wrapper remoto confere `RAILWAY_ENVIRONMENT_ID`, `RAILWAY_SERVICE_ID`, `RAILWAY_DEPLOYMENT_ID` e `RAILWAY_GIT_COMMIT_SHA` contra os IDs/SHA esperados. Isso evita o default da CLI apontar para uma instância antiga. Todos os argumentos aceitos são UUID/SHA/enum, sem shell livre, JSONdepolicy ou segredo.
4. O wrapper remoto chama o CLI produtivo `initialize --confirm-rollout-order`, captura seu JSON permitido e retém o preparationId. Se já published, preserva a versão/política corrente; não recarrega seed nem reescreve conquistas. Não executa RPC de coorte antes de Authnovo.
5. Deploy Authnovo no mesmo SHA; exigir SUCCESS e activeDeployments sem antigos. A captura só começa após essa evidência de retirada/drain. Perfis anteriores continuam ready, novos são pending e não autorizam sessão; falha Members mantém jobs duráveis.
6. Avançar pelo CLI com `--steps 20`, mesmo preparationId, até ready. Cada avanço é bounded e persistido; prazo global e limite de avanços evitam job infinito. Hash readonly dos cursores/etapa canônicos detecta no-progress sem classificar processed0 como falha. Rechecar Auth antes dos batches/publicação e depois dela. Erro/saída malformada, IDdivergente, stale, busy/CAS ou falta de progresso falham o job. Não repetir automaticamente operações que falharam nem recriar preparação para esconder erro.
7. Chamar `publish` e confirmar novamente `initialize` como already-published/V>=1. Só então retornar a barreira de sucesso ao workflow. A repetição explícita de um run retoma a preparação persistida pelo initialize ou reconhece a política publicada.
8. O laço atual só dispara Admin/Community/Kids após a barreira. Falha preserva apps antigos e declara a indisponibilidade operacional do backend se já foi migrado; não faz rollback de dados e não anuncia staging atualizado. Não expor um fallback antigo. Interrupção/cancelamento exige rerun explícito com os serviços necessários, não apenas diff de um push posterior.
9. Push apenas de apps, sem Auth/Members afetados: gate readonly published no Members já ativo (usando o mesmo adapter canônico em operação remota fechada) antes de liberar apps; não redeployar backend sem necessidade. Na primeira integração, o diff inclui Auth+Members e passa pela onda completa. O guard pré-apply recusa mudançasIaC que iniciem Auth/Members OU Admin/Community/Kids antes dessa barreira; ondasIaC incompatíveis são operacionais explícitas.

Exclusividade operacional durante TODA a carga é requisito: sem deploy/rollback externo, criador antigo, import/backfill ou autoria de catálogo. Rechecagens de metadata não são lock distribuído. Se violado, interromper e investigar coorte antes de retomar cursor. Não prometer zero downtime. Root provisionou a credencial admission em ambos staging com skipDeploys; SSHCI/host confiável continuam preparação operacional.

## Disponibilidade e segurança do transporte

CLI local confirmou `railway 5.62.1` e a sintaxe `ssh -- <command>`, com `--identity-file` e contexto explícito. Documentação oficial: https://docs.railway.com/cli/ssh . Ela exige chaveSSH cadastrada; tokenAPI sozinho não a substitui. Consulta readonly de nomes GitHub encontrou somente `RAILWAY_TOKEN`, portanto o root precisará provisionar uma identidade CI cadastrada e o secretSSH antes do rollout. Este lote não cria chave/secret nem altera Railway.

Não usar registro automático de chave, prompt interativo, `--session`/tmux, hostkey desligada, valores de variáveis em logs ou `railway run` com proxy público do banco. O arquivo temporário da chave tem permissão0600 e limpeza em finally; o subprocesso tem stdinfechado e timeout. Hostkey conhecida precisa vir de fonte confiável/documentada; não aceitar cegamente uma chave recebida no primeiro contato.

O root confirmou uma entrada Ed25519 de `ssh.railway.com` no truststore local já existente. Esse é o caminho de confiança disponível neste ambiente, sem keyscan/TOFU novo e sem alegar fingerprint oficial publicado. Identidade dedicada e secretsSSH ainda dependem da execução operacional pelo root.

Há dois requisitos operacionais que não podem ser fabricados por mocks: SSH do CI realmente autenticado no container e o provedor confirmar a retirada dos deployments anteriores. Falhar claramente se indisponíveis. Tests locais provam a orquestração, não qualificam esse transporte remoto antes da execução controlada staging.

## Arquivos propostos

- `scripts/ci/kids-journey-rollout.mjs`: valida contexto, orquestra GraphQL/SSH, deadlines, progress e JSON permitido; expõe função testável com transports injetados.
- `scripts/release/kids-journey-bootstrap.mjs`: executável somente dentro do Members esperado; chama CLI canônico sem shell e emite apenas recibos de fase/status/versão/ID/contagem. Operação readonly published usa o repositório canônico, sem motor alternativo.
- `scripts/ci/kids-journey-rollout.test.ts` e `scripts/release/kids-journey-bootstrap.test.ts`: ordem, recusa e idempotência, subprocessos locais isolados; nenhuma conexão externa.
- `.github/workflows/ci.yml`: preflight e barreira antes do laço que libera apps; preserva seleção/diff e demais serviços.
- `.railway/README.md`: ordem, recuperação, nomes de segredos SSH/admission e limites. Não alterar variables.ts nem serviço/credencial remotos.

## Execução em lotes

- [x] Review root deste contrato, inclusive transporteSSH e published-only em pushapps.
- [x] REDs locais: semcredencial→0deploy; ordem completa; initializealready-published; retomada mesmoID; Authantigo ativo; erro/stale/CAS; malformed/IDdivergente; limite semprogresso; verificação de artifact/contexto; appsnãodisparados emfalha.
- [x] Implementar wrappers mínimos e GREEN focado; nenhuma execução remota.
- [x] Integrar workflow após review do contrato; testar o wiring/ordem com transports locais e Bun.YAML.
- [x] Biome focado e reciboSHAs; revisão readonly final em andamento. Sem commit/push/deploy por este agente.

O checkpoint continua explicitamente intermediário para Python; esse gate trata somente inicialização canônica e ordem de publicação do staging.
