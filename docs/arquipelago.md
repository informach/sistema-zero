# Arquipélago Vagalume

O jogo 3D das comunidades Kids e adulta. Proposta e decisões da dona no Canvas
<https://claude.ai/artifact/5eNo1oqsndxmV6MPLxaz1W>. Este documento descreve o que existe no
código depois da Fase 0 (27/10/2026).

## Decisões da dona

- Nome: **Arquipélago Vagalume**. A ilha da criança fica no **centro**, com a casa e o farol; as
  outras seis ilhas ficam em volta, cinza até a jornada colorir. Robôs não entram (os Lumis
  fazem esse papel). Física com **Rapier** (WASM liberado na página do jogo).
- **Tudo separado:** pastas e pacotes próprios. Mudar o jogo não pode afetar a plataforma, e mudar
  a plataforma não pode afetar o jogo. Só o **avatar** e o **quarto** são divididos, nos dois
  sentidos. O jogo lê dados da plataforma e, numa fase seguinte, grava moedas por uma porta
  interna do Members.
- **Ferramentas de verdade:** melhorar o Pinta, o Molda ou o Estúdio tem que melhorar o jogo
  também. Por isso o jogo nunca carrega uma cópia delas: pede `plataforma.abrirFerramenta()` e a
  página abre a ferramenta real por cima do jogo (Pinta, Molda e Estúdio, com o jogo pausado,
  respeitando os acessos da comunidade e entregando a criação só depois de confirmada na conta).
- **Tempo livre no Kids:** 30 minutos por dia por padrão; os pais mudam (10 a 240, passo 5). Na
  comunidade adulta não há limite.

## Pacotes

| Pacote | O que é |
|---|---|
| `packages/avatar-quarto` | Avatar 3D e quarto 3D (saíram do member-shell sem mudar comportamento; os caminhos antigos repassam) |
| `packages/arquipelago-contracts` | Zod: ilhas, limites, `SalvamentoV2`, a interface `Plataforma`, o manifesto do cliente e as respostas do serviço |
| `packages/arquipelago` | O jogo no navegador (R3F, drei, Rapier, zustand), com playground e plataforma de mentira |
| `packages/arquipelago-api` | O serviço do jogo (Bun, Elysia, Drizzle, schema `arquipelago`, porta 3015) |

Fronteira travada por teste (`packages/arquipelago/tests/fronteira.test.ts`): o jogo só importa
react, three, R3F/drei/Rapier, zustand, o contrato e o avatar-quarto; nenhum pacote da plataforma
importa o jogo nem o serviço (a plataforma importa só o contrato).

## Como o jogo chega à criança

```
navegador (/arquipelago, Kids)
  └─ ArquipelagoHost (member-shell) lê /api/arquipelago/cliente/manifesto.json
       └─ import() da entrada com hash → montarArquipelago(elemento, plataforma)
plataforma (o objeto que a página monta)
  ├─ avatar e quarto: /api/members/avatar e /api/members/room (as rotas das telas de sempre)
  ├─ jornada: /api/members/gamification/me (posto → posição 1 a 8)
  └─ serviço: /api/arquipelago/{acesso,salvamento,tempo}
        └─ member-shell (routes/arquipelago.ts) → gateway /arquipelago/* → arquipelago-api
```

- O cliente é compilado à parte (`bun run --filter @sistemazero/arquipelago build`): arquivos com
  hash em `dist/cliente/` e `manifesto.json` validado pelo contrato. O serviço publica esses
  arquivos (`/arquipelago/cliente/*`, manifesto sem cache, arquivos imutáveis). O build da
  plataforma não compila o jogo, e voltar uma versão é servir o manifesto anterior.
- O Dockerfile do serviço compila o cliente, então cada deploy do serviço traz a versão do jogo.

## Serviço do jogo

Rotas, identidade (perfil do Kids × conta adulta × responsável), suporte somente leitura,
salvamento por revisão e tempo livre: `packages/arquipelago-api/CLAUDE.md`.

**Quem vê o jogo** é decidido pelo serviço, sem deploy da plataforma: `ARQUIPELAGO_MODO`
(`desligado`, `lista`, `aberto`; em deploy nasce desligado), `ARQUIPELAGO_PUBLICOS` (`kids`,
`adulto`) e `ARQUIPELAGO_LISTA` (ids de perfil ou conta).

## Plataforma (o que mudou fora das pastas do jogo)

- **member-shell:** repasses de uma linha para o `avatar-quarto`; `routes/arquipelago.ts` (repasse
  do serviço e do cliente); `components/arquipelago-host.tsx` (a página que hospeda o jogo).
- **member-shell:** a porta (`components/arquipelago-porta.tsx`: a noite do arquipélago com a ilha
  e o farol nos estados abrindo, ainda não abriu e erro, e o aviso por cima do jogo quando uma
  ferramenta abre ou falha) e o diálogo da ferramenta (`arquipelago-creation-dialog.tsx`), que
  vestem a pele de cada comunidade pelos tokens e pela `sz-btn-gradient`.
- **community-kids:** página `/arquipelago` (fora do grupo com menu), item "Arquipélago" no menu
  (aba "Jogo" no celular, ícone de palmeira) só quando o serviço libera o perfil, cartão "Tempo
  livre no Arquipélago" na Família da área dos pais (escondido quando o serviço não responde),
  shims em `app/api/arquipelago/*` e `app/api/parents/arquipelago/limite` (portão dos
  pais), `/arquipelago` nos prefixos protegidos, `api/arquipelago/cliente` fora do matcher do proxy,
  CSP própria da página com `'wasm-unsafe-eval'` garantido.
- **community (adulto):** página `/arquipelago`, item no menu lateral e em "Mais" no celular, pela
  mesma liberação do serviço; sem limite de tempo.
- **api-gateway:** `src/infrastructure/config/arquipelago-routes.ts`, que só entra na config com
  `ARQUIPELAGO_URL` (sem a variável, o gateway fica idêntico). O escopo do Kids libera
  `/arquipelago/*` ao aluno (menos o limite da família) e só o limite ao responsável.
- **CI:** os quatro pacotes entram sozinhos no typecheck e nos testes; o `ci.yml` ganhou os testes
  de banco do serviço e o build do cliente; o deploy de staging mapeia `avatar-quarto` e o contrato.

## Ligado e pendente (27/10/2026)

Ligado no código: serviço registrado em `.railway/`, rotas do gateway, menu nas duas comunidades,
cartão do limite na área dos pais, ferramentas de verdade por cima do jogo e a porta interna de
moedas no Members (`POST /members/internal/arquipelago/coins`). Código pronto não confirma a
implantação nem o funcionamento em produção: a ordem da primeira implantação e as validações estão
em [arquipelago-first-deploy.md](operations/arquipelago-first-deploy.md).

Pendente:

1. Provisionar o serviço e as variáveis no Railway como manda o passo a passo e validar com contas
   reais (as três ferramentas, o tempo livre e o salvamento) antes de abrir.
2. As moedas dos desafios já saem pela porta do Members (`ServicoDosDesafios`, chave única, prêmio
   pendente cobrado de novo e o que bateu no teto semanal de 150 cobrado na semana seguinte).
   Outras recompensas do jogo (colheita, pedidos) ainda não pagam moedas: cada uma precisa ser
   autorizada no servidor antes de ligar.
3. O Estúdio de desafio já abre por cima do jogo com o molde do desafio (Quadro das Cores). O jogo
   já pede o Pinta e o Molda com o molde do objeto (o projeto azul do modo construção, 28/10/2026,
   `MoldeDeObjetoSchema`), mas a página ainda responde indisponível para ele: entra com o cartão do
   Pinta no molde. A paleta de blocos do desafio ainda é a completa das aulas.
4. A Capi e os bichos do Bosque (conversa, amizade, esconde-esconde, adotar, cuidar e seguir): plano
   em `docs/plans/2026-10-28-arquipelago-capi-e-bichos.md`.
5. Desafios e cartões dos Lumis (plano em `docs/plans/2026-10-27-arquipelago-desafios.md`): o
   token de leitura `ARQUIPELAGO_MEMBERS_TOKEN` (members e arquipelago-api) precisa ser criado no
   painel do Railway antes de entrar no `.railway/variables.ts`.

## Rodar sozinho

`bun run --filter @sistemazero/arquipelago dev` abre o playground em `http://127.0.0.1:4520`
(plataforma de mentira; parâmetros `posicao`, `publico`, `limite`, `liberado`, `novo`, `persistir`,
`em=x,z`, `adiantar`). O Zappy é modelado por script no Blender (`packages/arquipelago/arte/zappy`).
