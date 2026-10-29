# O filhote do Vale e o museu dos fósseis (fase4-03)

Data: 29/10/2026. Regras e textos em `docs/arquipelago-regras.md`, seção da fase4-03.

## O que entrou

- **Salvamento V15** (`arquipelago-contracts/src/salvamento.ts`): `vale.filhote`
  (`FilhoteDoValeSchema`), `null` até a Jade entregar o ovo. A V14 migra com `null` (`migrarDaV14`).
  Para o pior caso de 64 KB caber (sobravam 29 bytes), o id de uma aparência guardada passou a ter
  até `ID_DA_APARENCIA_MAXIMO` (40) caracteres; a migração tira das guardadas o que passar disso (a
  em uso vira `null`). Os ids de hoje (galeria, Pinta, Molda, criação) cabem nisso. Margem medida
  depois: 4579 bytes, com o filhote no máximo (`salvamento-v10.test.ts`). Os testes das versões
  antigas montam a base pela V14 (`tests/ajuda-salvamento.ts`, `inicialV14`).
- **Regras puras** (`src/sistemas/filhote-do-vale.ts`): aquecer (um dia por vez, três dias),
  nome, comida (alface, tomate ou milho), carinho, o dia cuidado que conta uma vez, o tamanho, o
  passeio (`PASSEIO_DO_FILHOTE`, `passoDoPasseio`) e `juntarFilhotes` para a conciliação de duas
  sessões. A entrega do ovo está na conversa da Jade (`sistemas/jade.ts`).
- **No mundo** (`src/mundo/filhote-do-vale.tsx`, montado pelo `ValeVivo`): o chão quente na âncora
  `pe-do-vulcao` com o `ovo-dino` do GLB de props e, depois, o filhote (`triceratops-filhote.glb`)
  passeando. Nada colide.
- **Painel** (`src/interface/filhote.tsx`, `PAINEL_DO_FILHOTE`, loja `estado/filhote.ts`): o nome
  e, depois, comida e carinho com o que já foi feito hoje.
- **Museu**: chega em `ganharProjetos` com `vale.escavacao === 3`; o painel do objeto mostra a
  coleção do Vale (`interface/museu.tsx`, `colecaoDoVale`), que ganhou o filhote.

## Decisões

- Sem fome que cai nem tristeza: o filhote só avança, como as outras descobertas do Vale.
- O ovo do GLB (0,78 m) aparece com 0,47 m (escala 0,6); o filhote vai da escala 1 à 1,8 (o crescido com
  0,86 m). Nenhum GLB novo nem regerado.
- O filhote não colide (é miúdo e anda em volta, como o bicho adotado passa pela criança). O
  passeio é uma lista fixa de pontos, conferida contra o GLB no teste, em vez de uma grade montada
  no jogo.
- A comida sai da mochila na ordem alface, tomate, milho, sem escolha: um toque só.

## Conferência

- `bun test` no jogo, no contrato e no serviço (`http.test.ts`: a V14 na rota e a V15 guardando o
  filhote); `tsc` e `biome` nos três.
- Navegador: `playground/verificar-filhote-browser.ts` (a Jade entrega o ovo e o chão quente
  esquenta, no computador; o ovo choca, o nome, a comida e o carinho, no computador e no celular).

## Depois

- A montaria do Vale é a fase4-04 (`dino-montaria.glb`).
