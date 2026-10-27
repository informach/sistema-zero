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
  página abre a ferramenta real por cima do jogo, respeitando os acessos da comunidade.
- **Tempo livre no Kids:** 30 minutos por dia por padrão; os pais mudam (10 a 240, passo 5). Na
  comunidade adulta não há limite.

## Pacotes

| Pacote | O que é |
|---|---|
| `packages/avatar-quarto` | Avatar 3D e quarto 3D (saíram do member-shell sem mudar comportamento; os caminhos antigos repassam) |
| `packages/arquipelago-contracts` | Zod: ilhas, limites, `SalvamentoV1`, a interface `Plataforma`, o manifesto do cliente e as respostas do serviço |
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
- **community-kids:** página `/arquipelago`, item de menu condicionado à liberação do serviço,
  shims em `app/api/arquipelago/*` e `app/api/parents/arquipelago/limite` (portão dos
  pais), `/arquipelago` nos prefixos protegidos, `api/arquipelago/cliente` fora do matcher do proxy,
  CSP própria da página com `'wasm-unsafe-eval'` garantido.
- **community:** página e menu equivalentes para adultos, com as permissões próprias da comunidade
  e sem limite de tempo familiar.
- **api-gateway:** `src/infrastructure/config/arquipelago-routes.ts`, que só entra na config com
  `ARQUIPELAGO_URL` (sem a variável, o gateway fica idêntico). O escopo do Kids libera
  `/arquipelago/*` ao aluno (menos o limite da família) e só o limite ao responsável.
- **CI:** os quatro pacotes entram sozinhos no typecheck e nos testes; o `ci.yml` ganhou os testes
  de banco do serviço e o build do cliente; o deploy de staging mapeia `avatar-quarto` e o contrato.

## Implantação e validação

O código inclui entrada nas duas comunidades, cartão de limite familiar, ferramentas reais e
porta interna de moedas no Members. A existência do código não confirma sua implantação ou o
funcionamento em produção. A ordem da primeira implantação e as validações ainda necessárias estão
em [arquipelago-first-deploy.md](operations/arquipelago-first-deploy.md). A ligação de recompensas
às ações do jogo continua pendente e deve ser autorizada no servidor.

## Rodar sozinho

`bun run --filter @sistemazero/arquipelago dev` abre o playground em `http://127.0.0.1:4520`
(plataforma de mentira; parâmetros `posicao`, `publico`, `limite`, `liberado`, `novo`, `persistir`,
`em=x,z`, `adiantar`). O Zappy é modelado por script no Blender (`packages/arquipelago/arte/zappy`).
