# Galeria de aparências do Arquipélago (fase1-13): conferência no navegador

29/10/2026. Playground do jogo (`packages/arquipelago`, plataforma de mentira com a galeria de
mentira, a mesma régua do serviço), Chrome sem tela com SwiftShader. Obra de exemplo
(`?obra=exemplo`), jogo novo e sem guardar (`?novo=1&persistir=0`), saldo pela URL (`?moedas=`).
O personagem é levado para perto da geladeira (`__arquipelagoLevar`) e o painel abre pelo E.

## Computador (1280 × 800)

| Foto | O que mostra |
|---|---|
| `assets/2026-10-29-arquipelago-galeria/computador-1-cartao.png` | O cartão "Da galeria" ao lado do Pinta e do Molda: miniatura, "Geladeira clássica: 60 moedas", "Você tem 100 moedas." e "Comprar". |
| `assets/2026-10-29-arquipelago-galeria/computador-2-confirmar.png` | A confirmação: "Comprar a Geladeira clássica por 60 moedas", "Sobram 40 moedas.", "Comprar" (com o foco) e "Agora não". |
| `assets/2026-10-29-arquipelago-galeria/computador-3-comprada.png` | Depois de pago: selo "Completo", "Guardados: 0 de 12", "Você tem 40 moedas.", "Em uso" e "Pronto. A Geladeira clássica é sua e já está no lugar." |
| `assets/2026-10-29-arquipelago-galeria/sem-saldo-1-falta.png` | Com 10 moedas: o botão diz "Faltam 50 moedas" e o cartão sugere "Um desafio do Quadro das Cores paga 20 moedas." |
| `assets/2026-10-29-arquipelago-galeria/troca-1-pintada.png` | Comprou e depois pintou no Pinta: "Suas aparências" com as duas, a pintada em uso; o cartão da galeria diz "Usar, já é sua". |
| `assets/2026-10-29-arquipelago-galeria/troca-2-de-volta.png` | Voltou para a da galeria pela lista, sem cobrar (o saldo continua 40): "Agora em uso: Geladeira clássica." |

## O holograma vira o modelo (câmera de obra do Construir)

| Foto | O que mostra |
|---|---|
| `assets/2026-10-29-arquipelago-galeria/mundo-1-holograma.png` e `-perto.png` | Antes: a geladeira em holograma azul no cômodo da frente. |
| `assets/2026-10-29-arquipelago-galeria/mundo-2-modelo.png` e `-perto.png` | Depois de comprar: o modelo do Blender no mesmo lugar. |

## Celular (390 × 844, toque)

| Foto | O que mostra |
|---|---|
| `assets/2026-10-29-arquipelago-galeria/celular-1-cartao.png` | Os três cartões um embaixo do outro; o da galeria com a largura toda (306 px). |
| `assets/2026-10-29-arquipelago-galeria/celular-2-confirmar.png` | A confirmação inteira no cartão, os dois botões lado a lado. |

Medido: a página tem 390 px de largura e 390 px de rolagem (nenhuma rolagem para o lado).
Nenhum erro no console nos três roteiros.

## Ajuste feito durante a conferência

As listas do painel do objeto (a geladeira e "Suas aparências") começavam 18 px para dentro: a
regra geral `.arq-menu ul{padding-left:18px}` vencia o `padding:0` delas. Agora
`.arq-menu .arq-objeto-itens{padding:0}`.

## Pedido de arte (variações)

Hoje há uma aparência por objeto, e ela é o modelo do Blender que o jogo já tem. Para vender mais
de uma (outras cores e estilos), a arte pede, por variação:

- o GLB em `packages/arquipelago/src/assets/objetos/` (mesmas medidas e a mesma frente do objeto);
- a miniatura em `src/assets/casa/miniaturas/` (como as de `arte/casa/miniaturas.py`);
- o nome para a criança e o preço (dentro da faixa de 20 a 75 moedas).

O código já recebe: uma entrada nova em `IDS_DA_GALERIA` e `GALERIA` com um `modelo` novo em
`MODELOS_DA_GALERIA`, e a escolha do arquivo pelo `modelo` em `mundo/objetos-da-casa.tsx`.

## Roteiros (fora do git)

`galeria-browser.mjs`, `galeria-mundo.mjs` e `galeria-troca.mjs` no scratchpad da sessão, com o
playground em `PORTA=4531 bun playground/servidor.ts` (a 4520 estava com o playground de outra
sessão).
