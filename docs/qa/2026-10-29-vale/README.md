# Vale dos Dinos e Jade

Conferência da fase4-01 no playground local, em 29/10/2026. Chrome com SwiftShader, computador
1280 × 720 e celular emulado 390 × 844, usando `?novo=1&posicao=6`. Serviço falso local;
nenhum banco de staging ou produção foi usado.

## O que foi conferido

- Carregar a ilha completa, esperar a montagem inicial das tábuas e caminhar pelo trecho final
  da ponte até a chegada. A condição exige proximidade da entrada e corpo apoiado acima da água.
- Abrir a conversa com E no computador e tocar em Usar no celular. Ler as duas falas, avançar
  e fechar por “Tchau, Jade”. A coruja aparece com chapéu, lupa e animação na conversa.
- Ficar de pé no segundo degrau da entrada do observatório, usando o colisor real do GLB.
  A torre é fechada. Não há acesso ao interior nem subida à varanda nesta fase.
- Voltar à ilha central, confirmar zero ilhas completas carregadas, retornar ao Vale e
  conversar novamente com a Jade. Esc fecha a apresentação reaberta.
- Sem erros JavaScript capturados. A interface não ultrapassou a largura de 390 px.

O roteiro usa o transporte do medidor para preparar a posição inicial na ponte, as aproximações
da Jade e do observatório e a saída e retorno. A chegada é caminhada com W; a abertura da conversa
no celular usa toque. O teste não representa uma caminhada manual por toda a ilha.

Na revisão do roteiro herdado do Pico, a condição de chegada aceitava deslocamento mesmo na água.
Ela foi substituída pela condição acima, e o teste passou depois de esperar a animação da ponte,
que dura 4,5 segundos. Não foi necessário alterar a física do jogo.

## Reprodução

No pacote `packages/arquipelago`, com `ARQUIPELAGO_CHROMIUM` apontando para o Chrome:

```sh
bun build playground/verificar-vale-browser.ts --target=node --external playwright-core --outfile .cache/verificar-vale-browser.mjs
node .cache/verificar-vale-browser.mjs
```

O script abre seu próprio playground numa porta livre. Usa `--use-angle=swiftshader` e
`--enable-unsafe-swiftshader`. `ARQUIPELAGO_PRINTS` permite escolher outra pasta de capturas.

## Capturas

| Cena | Computador | Celular emulado |
|---|---|---|
| Chegada pela ponte | [Imagem](vale-computador-chegada.png) | [Imagem](vale-celular-chegada.png) |
| Conversa com Jade | [Imagem](vale-computador-jade.png) | [Imagem](vale-celular-jade.png) |
| Degraus do observatório | [Imagem](vale-computador-observatorio.png) | [Imagem](vale-celular-observatorio.png) |

## Testes e revisão

- `bun test`: 848 aprovados, um ignorado, zero falhas, em 97 arquivos.
- `NODE_OPTIONS=--max-old-space-size=8192 bun run typecheck`: passou.
- `bunx biome check` nos 13 arquivos TypeScript tocados: passou.
- Revisão do diff: registros da ilha, conversa, colisão, medidas, descarte, textos e testes.

Os comandos foram conferidos numa cópia isolada de staging com as alterações desta tarefa,
pois outras sessões estavam alterando o mergulho e o contrato na pasta compartilhada. A primeira
bateria completa na pasta compartilhada também passou. O teste ignorado exige Postgres local
descartável e não se aplica à integração visual desta fase.

## Limites da conferência

Na repetição isolada, o medidor registrou amostras de 2 quadros/s no computador e 6 no celular emulado, durante a
chegada com renderização por software. Esses números não medem desempenho em placa de vídeo
nem em celular real. Toque prolongado, temperatura e desempenho em aparelho físico continuam
sendo uma conferência de dispositivo, não coberta por esta emulação.

Nenhum GLB ou gerador foi modificado. Não há arte ou âncora pendente para esta fase.
