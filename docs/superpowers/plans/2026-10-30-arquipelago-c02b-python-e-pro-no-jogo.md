# C02b: os desafios em Python e Pro abrem dentro do jogo (30/10/2026)

O C02 entregou os desafios em Python (Recife, Pico) e Pro (Nuvens), mas o Estúdio de desafio do
jogo recusava abrir os dois (`arquipelago-challenge-dialog.tsx`). A dona pediu para abrir. Os
projetos Python passaram a apontar a release ativa em staging e produção
(`2026-10-25-integrated-games-2`), provada no executor publicado.

## Por que não o Estúdio livre

O Python do Estúdio livre (`/api/studio/free-runtime`) e o Pro livre (WebContainer local) exigem o
produto Estúdio Completo, que é vendido à parte. O desafio é gamificação nuclear: não pode depender
dele (regra dos produtos vendidos à parte). Por isso o desafio tem autorização PRÓPRIA, dada pelo
desafio aberto, no molde da aula.

## Python: o contexto `arquipelago`

- **Core** (`studio/runtime-authorization.ts`): `StudioArquipelagoRuntimeContextSchema`
  `{kind: 'arquipelago', audience, desafioId, revisao, projectId}`, o pedido e a decisão (mesma forma
  da decisão de aula), dentro de `StudioRuntimeDecisionSchema`. Não entra no contexto de análise
  remota: o Python clássico no modo Ponte usa a análise do próprio ambiente (o serviço de linguagem
  só serve o Python Pro).
- **Estúdio**: `@sistemazero/studio/challenge-runtime` = o núcleo contextual sem análise remota.
- **Members**: `POST /members/internal/arquipelago/ambiente` (token do Arquipélago), serviço que
  confere o pedido contra o projeto INICIAL do desafio (mesmo projeto e ambiente, Python clássico,
  extensões do inicial) e autoriza pela política de runtime com a curadoria do desafio
  (`CURADORIA_DO_DESAFIO_PYTHON`, a mesma da conferência). Capacidades: editar, executar, pausar.
- **Serviço do jogo**: `POST /arquipelago/desafios/:id/ambiente` `{revisao, pedido}` com as mesmas
  conferências do `verificar` (publicado, público, ilha aberta ou feito) e o inicial do desafio.
- **Gateway** e **member-shell**: a rota nova repassada como o `verificar`; o diálogo monta o
  ambiente (`useArquipelagoChallengeRuntime`) e o passa ao `StudioLesson`.

## Pro: compilar pelo desafio

- **member-shell**: `POST /api/arquipelago/desafios/:id/pro` `{revisao, operation?, project}`. O BFF
  abre o desafio no serviço do jogo (mesmas conferências de quem joga), exige a mesma revisão e
  tira o modelo Pro do projeto INICIAL, nunca do enviado. Compila no executor como a aula
  (`prepareStudioProToolchain` / `buildStudioProProject`), com execução opaca por desafio.
- O diálogo passa o adaptador `proRuntime` e liga o modo profissional só no Pro.

## Fora

- Publicação continua `false` nos quatro; importação é da dona.
- Zappy, exportação e REPL não entram no desafio.

## Verificação

- Testes do core (schemas), do Members (aceita o inicial, recusa outro ambiente, outro projeto,
  Pro e Python Pro), do serviço do jogo (rota e conferências), do gateway e do member-shell
  (repasse e a rota Pro com o modelo do inicial).
- Biome dos arquivos tocados. Tipagem conforme a regra de uma sessão só.
- Navegador: depende do runtime publicado e da pilha inteira; fica listado para a dona se não der
  para subir aqui.
