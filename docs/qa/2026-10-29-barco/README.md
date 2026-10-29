# Barco entre as ilhas, fase3-04

Conferência em 29/10/2026 no playground local, com plataforma de mentira. Nenhum banco remoto
foi usado. As âncoras do commit f3f99157d foram consumidas sem alterar arte ou gerar GLBs.

## Resultado

Viagem guiada entre o píer central e o Recife, nos dois sentidos, pelo teclado e pelo botão
Usar. O personagem embarca, permanece no convés e desembarca em pé no cais. O teste percorre
a rota inteira, sem teleporte para encurtar a viagem. Ilha fechada não oferece o barco.

A pausa preserva a distância e a posição da âncora animada. Andar e pular não soltam o
personagem. No celular emulado foi usada a preferência de movimento reduzido. Uma demora
artificial de 8 s na carga da ilha exercita a fase de espera pelo Recife no navegador.
O retorno automático após 20 s sem carga é coberto pelos testes puros.

A revisão corrigiu o atraso de um quadro entre o barco e o avatar, o enquadramento estreito
no celular, a gravação de posição em alto-mar e o tratamento de obstrução durante o embarque.
Um pedido antigo também é cancelado se um teleporte tirar a criança do cais antes do passo.

## Comandos e evidências

- `bun test --timeout 30000`: 834 passaram, 1 ignorado, 0 falhas. O ignorado exige Postgres local descartável.
  O limite de 30 s evita os estouros de 5 s vistos nos testes de geometria sob carga;
  nenhuma asserção foi removida. Rodada final após integrar o remoto até 678fd0cea.
- `bun run typecheck`, com `NODE_OPTIONS=--max-old-space-size=8192`: passou.
- `bun run lint` na raiz: passou sem erros, com 151 avisos e 196 informações do repositório.
- `bunx biome check` nos arquivos desta tarefa: passou.
- `bun build playground/verificar-barco-browser.ts --target=node --external playwright-core --outfile .cache/verificar-barco-browser.mjs`
  e `node .cache/verificar-barco-browser.mjs`: passaram, computador 1280 × 720 e celular emulado
  390 × 844, Chrome com SwiftShader. `ARQUIPELAGO_CHROMIUM` permite indicar outro executável.
- `bun run build`: passou, 90 arquivos, 27,00 MB.
- `git diff --cached --check`, somente a entrega do barco: passou.

Os cenários com postos diferentes usam contextos separados do navegador, incluindo o
IndexedDB. Reabrir outra massa com `persistir=0` no mesmo contexto deixa uma fila local de
outra versão e aciona corretamente o painel de conflito de salvamento.

## Medidor

Valores pontuais da rodada, também guardados em [medidas.json](medidas.json):

| Ambiente | Antes de embarcar | Durante a viagem | Depois de voltar |
| --- | ---: | ---: | ---: |
| Computador, SwiftShader | 2 FPS | 4 FPS | 3 FPS |
| Celular emulado, SwiftShader | 6 FPS | 8 FPS | 6 FPS |

Estes números medem renderização por software nesta máquina compartilhada, não desempenho
em um celular real, nem uma comparação antes e depois da implementação. O ciclo liberou o
Recife depois da volta: o medidor voltou a zero ilhas completas nos dois ambientes.

## Números propostos

Rota de aproximadamente 524,44 m, arco externo a 120 m do centro. Até 12 m/s no mar, com
aproximação de 2 m/s nos cais. Embarque e saída de 1,5 s, elevação de até 0,6 m para passar a
amurada, alcance de 1,25 m. Aberturas nas boias com 5 m de meia largura. Espera a 27 m do
centro do Recife, retorno após 20 s sem carga. Câmera com distância mínima de 13 m e inclinação
mínima de 0,55 radiano para caber na tela estreita. As justificativas estão no plano e em regras.

## Prints

[Computador, embarque](computador-embarque.png), [viagem](computador-viagem.png),
[chegada ao Recife](computador-ida-chegada.png), [volta](computador-volta-chegada.png),
[Recife fechado](computador-fechado.png).

[Celular, embarque](celular-embarque.png), [viagem](celular-viagem.png),
[chegada ao Recife](celular-ida-chegada.png), [volta](celular-volta-chegada.png),
[Recife fechado](celular-fechado.png).

## Limite da conferência

Falta medir em aparelhos físicos Android e iOS: FPS com GPU real, aquecimento, memória,
resposta ao toque e pausa ao alternar de aplicativo. Não há modelo ou âncora pendente para
esta entrega. Nenhum formato de salvamento foi alterado.
