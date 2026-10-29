# Ajustes da arte no Arquipélago

## Entrega por item

| Item | Implementação | Situação no mundo |
| --- | --- | --- |
| 02 | Emissão pelo relógio comum, material independente por cópia e liberação ao desmontar. Carregador de ilhas também aplica a regra. | Estrelinha e Búzio ativos. Recife e lanternas de festas preparados e conferidos com GLBs reais na sala. |
| 03 | `AvatarDoJogo comPatins` sobe só o desenho em 8,5 cm. A cápsula não muda. | Regra pronta; não existe sistema de calçar patins. O par é mostrado ao lado na sala, não vestido artificialmente. |
| 04 | Fase estável por id/clipe, reaplicada na troca de laços. Ações únicas começam do zero. | Capi, Nico, dois Lumis, quatro bichos e adotado ligados. |
| 05 | LoopOnce, uma repetição e clampWhenFinished para virar, abrir e estourar. | Borrão, baú e fogos conferidos. Mecânicas de captura, recompensa e festas ainda não montadas. |
| 06 | Altura de voo por espécie e margem acima dos obstáculos. | Pássaros e borboleta ainda não estão no mundo. Componentes e ciclo real do GLB testados. |
| 07 | Cápsula longitudinal no deslize, vertical ao voltar, sem duas cápsulas simultâneas. | Pinguins aguardam o Pico. Troca conferida no Rapier no navegador. |
| 08 | Posição marcada no grupo externo, animação no filho. | Barcos de Recife e movimento preparados. O barco estático do píer é outro modelo. |
| 09 | B/C/D sincronizados pelo texto nas três partes da cabeça da Íris. | Íris ainda não montada no mundo. Fala, fim e nova fala conferidos na sala. |

## Números

- Brilho noturno: zero de dia, força original do GLB à noite. Usa o mesmo ciclo de 16 minutos
  do jogo, 12 claros e 4 escuros, sem segundo relógio.
- Fase: hash FNV-1a dividido por 2³², multiplicado pela duração do clipe. Independe da montagem.
- Voo: borboleta 1,6 m, bem-te-vi 2,8 m e pássaro das Nuvens 3,2 m acima do chão.
  Usa o maior entre essa altura e o topo dos obstáculos mais 0,6 m. Quem implementar a rota
  deve fornecer o topo em cada ponto, na mesma coordenada vertical do chão.
- Pinguim adulto: raio 0,13 m; meia altura 0,11 m em pé e 0,12 m deitado; centro y 0,24/0,14 m,
  z 0/0,24 m e giro X 0/90 graus. Filhote: 60%. Colisão não é derivada das asas.
- Íris: 12 letras/s, peso máximo 0,8, uma forma por vez. Espaços, pontuação e fim fecham a boca.
  Pausa congela o tempo e o id da fala permite reiniciar o mesmo texto. Não usa áudio.

## Conferência

```powershell
# Em packages/arquipelago
bun test
bun run typecheck
bun run check
bun build playground/verificar-arte-browser.ts --target=node --external playwright-core --outfile .cache/verificar-arte-browser.mjs
$env:ARQUIPELAGO_TEST_PORT='4648'
node .cache/verificar-arte-browser.mjs
```

O navegador usa Chrome instalado no Windows, 1280 × 844 e 390 × 844 com toque habilitado.
A opção do Chromium Linux permanece disponível quando o executável indicado existir.
São 26 casos: 11 peças por largura e duas visitas à praia, de dia e à noite, por largura.
Testa materiais reais, âncora do barco, caixas de voo, morfos da Íris, ida/volta do colisor
do pinguim e igualdade do colisor do avatar com/sem elevação. Confere caminhada no jogo real,
ausência de erro JavaScript e de rolagem lateral na sala. Os dados são locais, sem banco.

A primeira tentativa recusou uma porta ocupada antes de abrir servidor. Outra tentativa
detectou que duas plataformas falsas independentes compartilhavam o diário IndexedDB:
o segundo jogo entrou corretamente em conflito de salvamento. O teste passou a usar contextos
separados, preservando o comportamento do produto. Logs negativos ficaram na cache local.

Na árvore compartilhada, uma execução geral encontrou dois testes que ainda exigiam V5,
enquanto outra sessão editava a V6. Esse trabalho não foi incluído no lote de arte.
A validação final usa a composição commitada mais os arquivos deste lote.

## Resultado final

Composição conferida sobre `6a9f075ac` (staging remoto conciliado):

- `bun test`: 561 passaram, zero falhas, 39.176 asserções; um teste de integração do diário
  de tempo foi pulado porque exige Postgres local. Nenhum teste dos ajustes de arte foi pulado.
- Dentro desse total, os 19 testes de arte passaram com 180 asserções e os GLBs reais.
- `bun run typecheck`: saída zero.
- `bun run check`: 263 arquivos, zero problemas.
- Navegador: 26 casos passaram novamente após a conciliação do remoto. Resultado legível por
  máquina em `assets/2026-10-29-ajustes-arte/resultado.json`.
- Prova adicional existente `verificar-presente-capi-browser.ts`: Kids e adulto passaram em
  conversa real, falas finais, presente único, salvamento V5 e reabertura sem duplicar. Essa
  prova foi feita sobre `0e4068fea` mais o lote, antes das alterações remotas de UI/medição;
  o código da Capi e das animações é o mesmo da composição final.
- Servidores próprios encerrados e porta 4648 liberada. Nenhum banco foi criado ou alterado.

Revisão completa: API dos componentes, separação entre âncora e mixer, fase apenas em laços,
recursos por instância, descarte, pausa sem rearmar clipe concluído, todos os morfos da cabeça,
colisão do pinguim e preservação da cápsula do jogador. Os modelos ainda não montados são
explicitados na tabela, sem afirmar ativação de mecânicas futuras.

## Prints

[Lumis no computador](assets/2026-10-29-ajustes-arte/lumis-noite-1280.png),
[Lumis no celular](assets/2026-10-29-ajustes-arte/lumis-noite-390.png),
[pinguim deslizando](assets/2026-10-29-ajustes-arte/pinguim-deslizando-1280.png),
[Íris falando](assets/2026-10-29-ajustes-arte/iris-falando-390.png),
[voo](assets/2026-10-29-ajustes-arte/voo-1280.png),
[patins e elevação](assets/2026-10-29-ajustes-arte/patins-1280.png).

## Limites e próxima montagem

Não foi necessário pedir novos nós ou formas ao Blender. Nenhum GLB ou script de arte mudou.
Recife, Pico, Nuvens, festas, captura de Lumis, patins equipáveis e a presença da Íris continuam
dependentes de suas mecânicas. O código compartilhado está preparado e testado, sem afirmar que
essas experiências já estão liberadas no jogo. A fase 02 já funciona nos Lumis da praia.

O celular foi emulado, não físico. Ainda é necessário conferir GPU, toque e fluidez em aparelhos
reais e testar os caminhos de voo contra a geometria definitiva das futuras ilhas. Não há prova
de desempenho em aparelho fraco nesta entrega.
