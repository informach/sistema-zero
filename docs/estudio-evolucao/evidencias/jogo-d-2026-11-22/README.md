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
  objeto onde o herói aparece lá). A chegada fica no meio de uma peça fora da porta, para o herói
  não voltar na hora: no mundo, a peça abaixo da porta; nas cavernas e casas, duas peças acima da
  saída. O programa sabe que trocou de lugar quando a porta usada não está mais na cena. Se o
  destino não existe, o tocador avisa uma vez e nada muda (o herói fica onde está).
- **Os destinos ficam prontos antes.** Ao entrar num lugar, o tocador prepara os destinos das
  portas dele um por quadro; passar pela porta não lê nada (teste no motor de verdade).
- **Inimigos longe das chegadas.** Nenhum inimigo nasce a menos de 6 peças de uma chegada, do
  início ou do centro de uma região (ele persegue quem está a menos de 140 px).
- **O que foi pego fica pego.** Cada entidade tem a propriedade `chave` (`lugar/objeto`). Moeda
  pega, baú aberto e inimigo afastado entram numa lista; voltar a um lugar não traz nada de volta.
- **A cama guarda o jogo.** Deitar na cama de uma casa grava a lista (numa chave só, porque a
  prévia aceita no máximo 500 chaves) e os pontos, e o "salvo" por último. Um jogo novo lê o que
  foi guardado.
- **Efeitos.** Partículas ao pegar e abrir, esmaecer ao passar pela porta e ao dormir, uma música
  no mundo e outra nas cavernas e casas, placar e vidas em texto.

## Medidas no Windows local (Chromium do Playwright, 1280 × 720, palco 640 × 480, DPR 1)

| Medida | Valor | Limite |
|---|---|---|
| Trabalho por quadro andando pelas setas, p50 / p95 / p99 / máximo | 1,7 / 2,1 / 2,4 / 8,6 ms (1.216 quadros) | p95 ≤ 8 ms, p99 ≤ 16,7 ms |
| Intervalos acima de 20 ms | 0% | ≤ 1% |
| Herói andando no teste de desempenho | 3.348 px em 20 s | mais de 600 px |
| Pior passagem por porta (sessão de 60 s, 6 voltas, 84 passagens) | 7,8 ms | ≤ 50 ms |
| Memória depois do coletor (as 6 voltas) | 3,73 / 3,88 / 3,87 / 3,87 / 3,92 / 3,93 MB | a última volta até 10% acima da segunda |
| Imagens criadas | 11 em todas as voltas | param depois da primeira volta |
| Começos do jogo na sessão | 1 (o herói nunca morreu) | 1 |

Os arquivos: `desempenho-windows.json`, `sessao-60s-windows.json`, `recibo-previa-windows.json` e
`recibo-exportado-windows.json`. Medidos depois dos consertos da revisão do lote 8.

A sessão de 10 minutos roda no CI (`studio-engines.yml`, passo "Jogo D"); o número do CI entra
aqui quando a rodada terminar.

## Provas

- **Sem navegador** (`jogoD.test.ts`, 14 testes): os mesmos bytes a cada rodada; cada cena passa no
  leitor do Pinta e cabe nos tetos de cena e de projeto; toda porta tem destino, chegada e volta;
  cada ponto do mundo numa região só, com vizinhas em par; nenhum inimigo perto de uma chegada;
  603 entidades com chave única e no máximo 300 ligadas; textos sem travessão e sem "IA"; o
  programa abre nos blocos sem trecho opaco e volta ao mesmo código; e seis rodadas no motor de
  verdade (região, porta com chegada, moeda que não volta, cama que guarda e um jogo novo que lê;
  70 passagens sem aviso; destino quebrado; destinos prontos antes de passar; a cama com o teto de
  500 chaves da prévia; a porta cuja chegada falta).
- **Sabotagens que deixaram vermelho:** tirar a ida à chegada, ligar todas as entidades em
  qualquer região, esquecer a lista dos pegos, esquecer o que a cama guardou, tirar a guarda do
  destino quebrado; e, depois da revisão, o relógio das áreas com geração própria, uma chave por
  item, a guarda antiga da porta, inimigos em qualquer lugar e regiões com a borda incluída.
- **No navegador** (`jogo-d.flow.ts`, 7 provas, todas verdes no Windows local): recibo na prévia
  (quadro isolado, política `strict`) e no site exportado, sem rede e sem erro; desempenho com o
  herói andando; sessão longa (o robô PÕE o herói no centro de cada região e em cada porta; não
  anda) sem nenhum recomeço; volta com o estado e a cama que guarda depois de recarregar o site
  exportado; destino quebrado com um aviso só; e o jogo D importado no Estúdio do playground,
  aberto nos blocos e rodando na prévia.

## A revisão do lote 8

A revisão independente achou e o lote consertou, com teste vermelho antes: o herói apanhava ao
sair da caverna 3 (e na sessão de 10 minutos morreria e o jogo recomeçaria); a pré-carga das
portas nunca rodava num jogo com "Quando entrar em área" (o relógio das áreas abria uma geração
nova); a cama quebrava na prévia depois de uns 500 itens (uma chave por item); a prova do recorte
passaria sem o recorte (agora conta desenhos: 0 com os 400 sprites fora); a borda comum entre
regiões; a guarda da porta, que confundia destino quebrado com chegada ausente; "Ruínas" sem
acento; a sessão com 2 voltas, em que a régua da memória era vazia; e o teste de desempenho, que
não conferia se o herói andava. Fica registrado, sem conserto neste lote: quando o "Quando entrar
em área" troca de cena, a mesma passada continua conferindo os objetos da cena velha (já era
assim antes do lote; no jogo D nada cai nesse caso; o conserto pede bytes que o fragmento do
cenário não tem).

## A sonda da prova

O programa das provas de navegador ganha uma linha a mais no fim do "Ao iniciar", só de leitura:
`window.__jogoD` diz ao robô onde o herói está, o lugar, a região, os pontos e quantas entidades
estão vivas. O projeto que a prova do editor importa não tem essa linha.
