# Full review — modo de edição da impersonação

**Data:** 21/08/2026  
**Escopo:** implementação do modo `readonly`/`write` da impersonação, incluindo auth,
API Gateway, member-shell, Community, Community Kids, migration e testes.  
**Arquivos da mudança revisados:** 54  
**Método:** inspeção de fluxo e trust boundaries, análise de rotação/revogação,
comparação linha a linha com o desenho aprovado, busca de usos/dead code e execução das
suítes relevantes.  
**Alterações durante a inspeção inicial:** nenhuma; as remediações descritas abaixo foram aplicadas
depois da emissão do relatório original.

## Status após remediação

Os achados F1–F8 foram corrigidos no código local em 21/08/2026:

- F1: política única revalida ator e alvo frescos em exchange, refresh, troca de modo,
  select e exit de perfil; refresh inválido encerra a família.
- F2: a troca de modo passou a atualizar a família canônica sem consumir o refresh; retries
  são idempotentes e o BFF serializa mode/refresh/logout, seguindo o sucessor vigente.
- F3: logout revoga a família inteira; select/exit só instalam os novos cookies depois da
  confirmação; o logout mantém cookies e banner se a revogação não for confirmada.
- F4: a ativação de `write` grava auditoria persistente e fail-closed no auth. A auditoria das
  mutações permanece formalmente best-effort, e a interface não promete o contrário.
- F5: o Kids usa o nome do perfil ativo e mantém o banner também em `/perfis`.
- F6: foram adicionados testes de revalidação, retry/corrida, revogação, cookies, banner e
  reenvio mais recente do Studio.
- F7: troca de senha usa `IMPERSONATION_CREDENTIALS_FORBIDDEN` em todas as camadas.
- F8: contexto de emissão coeso, tipos de modo centralizados e documentação atualizada.

Verificação pós-remediação: auth 207, gateway 207, member-shell 405, community 5,
community-kids 471 e recorte Studio/members 80 testes aprovados, sem falhas. Typecheck passou
nos seis pacotes; Biome passou integralmente em auth, gateway, member-shell, community e members.
No Kids, os quatro arquivos da implementação passaram no check direcionado; o check integral
continua fora do escopo por alterações paralelas já existentes no player/controles.

**Operação:** este status descreve o código local. A correção só entra em produção depois de
aplicar as migrations `0014`/`0015` e publicar auth, gateway, member-shell, Community e Kids.

## Veredito original (histórico, superado pela remediação)

O texto desta seção registra o estado encontrado antes das correções F1–F8. Ele não descreve o
código local atual, cujo status está consolidado no início deste documento.

**Não recomendo publicar esta versão antes de corrigir os três achados HIGH.**

O caminho principal do incidente está correto: uma sessão elevada chega ao BFF, passa pelo
gateway, alcança o members e o members mantém a semântica “último reenvio prevalece” e devolve
a atividade à fila do professor. Claims antigas também falham de forma segura em `readonly`.

O risco está no ciclo de vida da credencial. Retries e rotações concorrentes podem revogar a
sessão recém-elevada, e mudanças de papel do ator/alvo não são revalidadas em todo ponto que
reemite tokens. A revogação usada ao trocar/sair do perfil também confirma apenas a linha de
refresh apresentada, não a família que representa a sessão.

## Achados priorizados

### F1 — HIGH — refresh e seleção de perfil não revalidam a matriz de impersonação

**Evidência**

- `packages/auth/src/application/refresh/refresh.service.ts:57-72` relê o ator e verifica
  somente `actor.isActive()`. Não chama `canImpersonate(actor.role, user.role)`.
- `packages/auth/src/application/profiles/select-profile.service.ts:56-64` também verifica
  somente se o ator está ativo.
- A validação correta já existe em
  `packages/auth/src/application/impersonation/change-impersonation-mode.service.ts:48-53`,
  no exchange e no exit de perfil, portanto a política ficou aplicada de forma desigual.

**Impacto**

- Um administrador rebaixado para um papel sem permissão pode continuar renovando uma sessão
  `write` enquanto permanecer ativo.
- Se o alvo mudar de `customer/staff` para `admin/superadmin`, o refresh usa o
  `UserAggregate` fresco e emite o novo papel do alvo, mas preserva a impersonação. Isso pode
  contornar a regra que proíbe um `admin` de impersonar outro `admin/superadmin`.
- O TTL de duas horas é deslizante (`AuthTokenService` calcula a expiração a partir de
  `Date.now()` em cada rotação), portanto o acesso pode ser prolongado continuamente.

**Recomendação**

Centralizar a resolução da sessão de suporte em um serviço/policy único, usado por exchange,
change-mode, refresh, select e exit. Toda reemissão deve validar ator ativo +
`canImpersonate(actor.role, target.role)` e revogar a família em qualquer falha. Adicionar testes
para ator rebaixado e alvo promovido depois da ativação de `write`.

### F2 — HIGH — a troca de modo não é idempotente e concorre com o refresh

**Evidência**

- O desenho aprovado declara que a rota é idempotente.
- `ChangeImpersonationModeService` consome o refresh com `claimForRotation` e, quando recebe o
  mesmo token novamente, executa `revokeFamily` (`change-impersonation-mode.service.ts:40-43`).
- O teste de integração em `packages/auth/tests/integration/http-server.test.ts:1649-1659`
  codifica o retry como `401`, em vez de testar idempotência.
- O BFF chama `changeImpersonationMode` diretamente em
  `packages/member-shell/src/server/gateway.ts:270-275`; essa rotação não participa do
  single-flight de `packages/member-shell/src/server/refresh.ts:57-75`.

**Impacto**

- Resposta perdida, dois cliques em abas diferentes ou retry do cliente: a primeira chamada
  pode emitir o refresh `write`; a segunda vê o token antigo rotacionado e revoga a família,
  inclusive o refresh recém-emitido.
- Uma ativação concorrente com o refresh automático produz o mesmo resultado: uma operação
  vence o claim e a outra trata a corrida como roubo/reuso, derrubando a sessão inteira.
- O admin pode ver o banner mudar e ser deslogado na requisição seguinte.

**Recomendação**

Não modelar a mudança de capacidade como replay destrutivo do mesmo refresh sem uma estratégia
idempotente. Opções aceitáveis: atualizar atomicamente o modo da sessão/família e emitir apenas
novo access mantendo o refresh apresentado; ou usar chave de idempotência + cache seguro da
resposta. A operação precisa compartilhar a serialização usada pelo refresh e ter testes com
duas ativações concorrentes e com `change-mode × refresh`.

### F3 — HIGH — sair/trocar perfil não garante revogação da sessão write anterior

**Evidência**

- `profileSelect` e `profileExit` capturam o refresh antes da chamada ao auth
  (`packages/member-shell/src/routes/index.ts:1450` e `:1487`) e depois consideram a sessão
  encerrada quando `logoutRequest` devolve 2xx.
- `packages/auth/src/application/logout/logout.service.ts:28-29` revoga somente o registro
  apresentado, não a família.
- Logout de um token já rotacionado é idempotente e devolve 200, mas não revoga o sucessor ativo.
- `packages/member-shell/src/server/gateway.ts:278-281` transforma qualquer 2xx em `true`, então
  o BFF não distingue “família encerrada” de “linha antiga já estava revogada”.
- O botão `Encerrar` ignora o resultado do auth e sempre limpa os cookies
  (`packages/member-shell/src/routes/index.ts:327-332`).

**Impacto**

Uma rotação concorrente pode criar `R1` enquanto a troca de perfil tenta revogar `R0`. O logout
de `R0` responde 200 sem tocar `R1`; dependendo da ordem das respostas, outra aba/requisição pode
regravar `R1` e restaurar a sessão write que deveria ter terminado. Em indisponibilidade do auth,
o browser limpa os cookies, mas a credencial server-side continua válida até expirar.

**Recomendação**

Encerrar a família, não apenas a linha. A transição de perfil deve consumir/revogar a sessão
anterior no auth de maneira atômica ou por endpoint dedicado que receba o refresh corrente e
confirme `revokeFamily`. Testar refresh concorrente com select, exit e logout, verificando que
nenhum sucessor da família antiga continua aceito.

### F4 — MEDIUM — a promessa de auditoria é mais forte que a garantia implementada

**Evidência**

- O banner afirma que as ações “ficarão registradas na auditoria”
  (`packages/member-shell/src/components/impersonation-banner.tsx:151-152`).
- O gateway dispara a auditoria sem `await` (`audit.stage.ts`) e o emissor é explicitamente
  best-effort; sem `AUTH_INTERNAL_TOKEN` vira no-op e erros/timeout são apenas logados
  (`http-audit-emitter.ts:14-27`).
- A própria elevação/redução de modo não entra em `auth.audit_logs`: a rota é pública para o
  gateway e `ChangeImpersonationModeService` emite apenas `logger.info`
  (`change-impersonation-mode.service.ts:90-96`).

**Impacto**

Uma mutação pode responder 2xx sem registro durável se o auth estiver indisponível, se o processo
terminar antes da promise fire-and-forget ou se faltar configuração. Também não existe registro
consultável de quando/por quem o modo foi ativado.

**Recomendação**

Registrar a elevação/redução diretamente no store de auditoria usando a identidade revalidada do
refresh. Para as mutações, adotar outbox/retry durável ou assumir formalmente best-effort e mudar a
copy/critério de aceite. Adicionar métricas/alerta para perda de eventos.

### F5 — MEDIUM — banner não identifica nem acompanha corretamente o perfil Kids

**Evidência**

- `packages/community-kids/src/app/(app)/layout.tsx:124` passa `firstName + lastName`, que são da
  conta responsável. O nome do perfil já existe em `session.activeProfile?.name`.
- `/perfis` fica fora de `(app)` e não renderiza `ImpersonationBanner`; a única ocorrência no
  Kids está no layout `(app)`.

**Impacto**

No caso real de Rafa, o banner vermelho pode mostrar o responsável em vez de “Rafa Daibert”. Ao
navegar pela grade de perfis, o aviso desaparece embora a sessão de impersonação ainda exista.
Isso reduz justamente a proteção humana contra alterações no perfil errado.

**Recomendação**

Usar `session.activeProfile?.name ?? nomeDaConta` no banner e renderizar a faixa também na rota
autenticada `/perfis` (idealmente em um layout comum de sessão, sem duplicar lógica). Cobrir os dois
casos com teste de layout.

### F6 — MEDIUM — os testes verdes não cobrem os riscos de ciclo de vida

Cobertura ausente:

- ator rebaixado e alvo promovido durante refresh/select;
- retry idempotente da mudança de modo;
- duas mudanças de modo concorrentes e mudança de modo concorrente com refresh;
- revogação real da família após select/exit/logout (os testes do BFF usam mock booleano);
- sucesso completo do banner, reload e nome do perfil ativo;
- E2E auth → gateway → BFF → members reproduzindo o reenvio sob impersonação.

O teste atual de retry inclusive aceita `401`, escondendo a violação de idempotência. Os testes do
members provam corretamente “último reenvio vence” e “reenvio volta à fila”, mas estão separados
da autorização de impersonação.

### F7 — LOW — troca de senha devolve código/mensagem incorretos em modo write

O BFF bloqueia qualquer `user.act` com `IMPERSONATION_READONLY`
(`packages/member-shell/src/routes/index.ts:379-385`), enquanto o gateway usa o código correto
`IMPERSONATION_CREDENTIALS_FORBIDDEN`. Em modo write, a resposta “somente leitura” orienta o admin
a ativar um modo que já está ativo e que nunca liberará credenciais.

**Recomendação:** usar o mesmo código e a mesma mensagem do gateway no BFF.

### F8 — LOW — invariantes e documentação podem divergir novamente

- `IssueContext` aceita `impersonatorUserId` e `impersonatorAct` de forma independente
  (`auth-token.service.ts:25-27`). O tipo permite emitir access sem `act` mas refresh marcado como
  impersonação, ou access `write` com refresh normal. Os call sites atuais passam o par correto,
  porém a segurança depende de disciplina informal. Preferir uma união discriminada.
- A união `'readonly' | 'write'` aparece em cinco contratos locais. A validação em cada trust
  boundary é correta, mas um tipo/constante compartilhado dentro de cada camada reduziria drift.
- `ImpersonationMode` é exportado em `change-impersonation-mode.service.ts`, mas não é importado
  fora do próprio arquivo (export público desnecessário).
- `community/CLAUDE.md`, `member-shell/CLAUDE.md` e comentários de rotas ainda afirmam que toda
  impersonação é somente leitura; a documentação também descreve logout/revogação com garantias
  mais fortes que o código.

## Pontos corretos da implementação

- Compatibilidade fail-closed: claims antigas ou modo desconhecido viram `readonly` no auth,
  gateway e member-shell.
- O modo não é controlado por `localStorage`/estado React; vem de JWT assinado e do refresh opaco.
- A migration é aditiva (`boolean NOT NULL DEFAULT false`) e o pre-deploy do auth executa as
  migrations antes do start.
- O gateway aplica autorização/RBAC antes da barreira de impersonação; write não amplia as
  permissões do usuário efetivo.
- Chamada direta ao gateway não contorna o readonly.
- Troca de senha fica proibida mesmo em write.
- Uploads/mutações locais que falam com R2 usam o guard de mídia, portanto não ficaram fora da
  política readonly/write.
- O members já implementa corretamente overwrite da entrega, snapshot anterior e retorno à fila
  do professor.
- Não foram encontrados arquivos inteiramente mortos, ciclos novos ou violações de camada nos
  componentes adicionados.

## Verificação fresca do review

Testes executados em 21/08/2026:

| Pacote/escopo | Resultado |
|---|---:|
| auth | 196 pass, 0 fail |
| api-gateway | 207 pass, 0 fail |
| member-shell | 401 pass, 0 fail |
| community | 5 pass, 0 fail |
| community-kids (`bun test tests`) | 455 pass, 0 fail |
| members — Studio/reenvio | 48 pass, 0 fail |
| **Total executado** | **1.312 pass, 0 fail** |

Typecheck passou nos seis pacotes. Biome passou integralmente em auth, gateway, member-shell,
community e members. No Community Kids, os três arquivos desta implementação passaram no check
direcionado; o check integral do pacote está atualmente bloqueado por cinco erros e um warning em
alterações paralelas de `public-player`, `console-controls` e seus testes, fora deste escopo.

## Ordem recomendada de correção

1. F1 — centralizar e revalidar a matriz em toda reemissão de sessão.
2. F2/F3 — redesenhar mudança de modo e encerramento como operações idempotentes e por família.
3. F4 — tornar o contrato de auditoria verdadeiro ou explicitamente best-effort.
4. F5/F7 — corrigir identidade/abrangência do banner e semântica de erro.
5. Completar os testes de corrida, revogação e E2E antes de qualquer deploy.
