# Jogo D: o 2D de grande porte (lote 8, 22/11/2026)

O jogo D é o exemplo "Mundo das Portas": um mundo do Pinta de 96 × 72 peças (3.072 × 2.304 px)
com seis regiões (Vila, Floresta, Montanha, Lago, Campo, Ruínas), três cavernas e quatro casas,
ligados por 14 portas. São 603 entidades: 450 no mundo (57 moedas, 15 inimigos e 3 baús por região)
e o resto dentro das cavernas e das casas. O programa usa só blocos que já existem no Jogo 2D.

## Onde mora cada parte

| Parte | Arquivo |
|---|---|
| Arte (peças de 32 px, personagens, prévia) | `packages/studio/scripts/jogo-d/arte.ts` |
| Cenas do Pinta v2 (mundo, cavernas, casas, regiões, portas, entidades) | `packages/studio/scripts/jogo-d/cenas.ts` |
| Sons e músicas (WAV feito por código) | `packages/studio/scripts/jogo-d/sons.ts` |
| Gerador (`bun run gen:jogo-d`, `check:jogo-d`) | `packages/studio/scripts/gen-jogo-d.ts` |
| Programa (JavaScript → IR estruturada) | `packages/studio/src/examples/jogoDSource.ts` → `__gen_jogoD.ts` |
| Materiais gerados (22: 8 cenas, 7 imagens, 7 sons; 1,75 milhão de caracteres) | `packages/studio/src/examples/jogoD.generated.ts` |
| O exemplo (a galeria entra no lote 9) | `packages/studio/src/examples/jogoDExample.ts` |
| Testes sem navegador | `packages/studio/src/examples/jogoD.test.ts` |
| Provas no navegador | `packages/studio/e2e/jogo-d.flow.ts`, `playwright.jogo-d.config.ts`, `scripts/serve-jogo-d-proof.ts` |

## Como o jogo funciona

- **Regiões.** A região onde o herói está e as vizinhas dela ligam as entidades: o "Quando entrar em
  área" do tipo `region` lê a propriedade `vizinhas` e cria os sprites só delas. No pior caso
  (Floresta ou Campo, com três vizinhas) são 300 vivas. Cavernas e casas ligam tudo o que têm.
- **Portas com chegada.** Cada porta tem `destino` (o desenho do outro lugar) e `chegada` (o id do
  objeto onde o herói aparece lá). A chegada fica no meio da peça logo abaixo da porta, fora dela,
  para o herói não voltar na hora. Se o destino não existe, o tocador avisa uma vez e o programa
  não muda nada (o herói fica onde está).
- **O que foi pego fica pego.** Cada entidade tem a propriedade `chave` (`lugar/objeto`). Moeda
  pega, baú aberto e inimigo afastado entram numa lista; voltar a um lugar não traz nada de volta.
- **A cama guarda o jogo.** Deitar na cama de uma casa grava a lista e os pontos no armazenamento
  do navegador. Um jogo novo lê o que foi guardado.
- **Efeitos.** Partículas ao pegar e abrir, esmaecer ao passar pela porta e ao dormir, uma música
  no mundo e outra nas cavernas e casas, placar e vidas em texto.

## Medidas no Windows local (Chromium do Playwright, 1280 × 720, palco 640 × 480, DPR 1)

| Medida | Valor | Limite |
|---|---|---|
| Trabalho por quadro andando pelas setas, p50 / p95 / p99 / máximo | 1,5 / 2,0 / 2,5 / 5,8 ms (1.210 quadros) | p95 ≤ 8 ms, p99 ≤ 16,7 ms |
| Intervalos acima de 20 ms | 0% | ≤ 1% |
| Pior passagem por porta (sessão de 30 s, 3 voltas, 42 passagens) | 6,9 ms | ≤ 50 ms |
| Memória depois do coletor (sessão de 20 s, 2 voltas) | 3,74 → 3,88 MB | a última volta até 10% acima da segunda |
| Imagens criadas | 11 → 11 | param depois da primeira volta |

A sessão de 10 minutos roda no CI (`studio-engines.yml`, passo "Jogo D"); o número do CI entra
aqui quando a rodada terminar.

## Provas

- **Sem navegador** (`jogoD.test.ts`, 10 testes): os mesmos bytes a cada rodada; cada cena passa no
  leitor do Pinta e cabe nos tetos de cena e de projeto; toda porta tem destino, chegada e volta;
  regiões sem sobreposição e com vizinhas em par; 603 entidades com chave única e no máximo 300
  ligadas; textos sem travessão e sem "IA"; o programa abre nos blocos sem trecho opaco e volta ao
  mesmo código; e três rodadas no motor de verdade (região, porta com chegada, moeda que não volta,
  cama que guarda e um jogo novo que lê; 70 passagens sem aviso; destino quebrado).
- **Sabotagens que deixaram a rodada vermelha:** tirar a ida à chegada, ligar todas as entidades
  em qualquer região, esquecer a lista dos pegos, esquecer o que a cama guardou e tirar a guarda do
  destino quebrado.
- **No navegador** (`jogo-d.flow.ts`, 7 provas, todas verdes no Windows local): recibo na prévia
  (quadro isolado, política `strict`) e no site exportado, sem rede e sem erro; desempenho;
  sessão longa; volta com o estado e a cama que guarda depois de recarregar o site exportado;
  destino quebrado com um aviso só; e o jogo D importado no Estúdio do playground, aberto nos
  blocos e rodando na prévia.

## A sonda da prova

O programa das provas de navegador ganha uma linha a mais no fim do "Ao iniciar", só de leitura:
`window.__jogoD` diz ao robô onde o herói está, o lugar, a região, os pontos e quantas entidades
estão vivas. O projeto que a prova do editor importa não tem essa linha.
