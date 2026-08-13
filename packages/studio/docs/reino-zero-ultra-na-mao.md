# Reino Zero Ultra (na mão)

Exemplo profissional de plataforma lateral do catálogo core. Ele usa somente os
blocos nativos de HTML, CSS, Canvas, Programação e Som: não instala extensão, não
carrega asset externo e não usa blocos de código bruto. A identidade visual e os
nomes são originais; a arte é desenhada vetorialmente no Canvas.

## Conteúdo jogável

- 8 mundos temáticos, com 4 fases em cada mundo (32 no total).
- As 32 fases são plantas autorais distintas, com validação de referências e
  busca conservadora de uma rota até a saída.
- Física em passo fixo de 60 Hz, coyote time, jump buffer, salto variável,
  aceleração, atrito, agachamento, natação, escadas, molas e plataformas móveis
  ou frágeis.
- Moedas, gemas persistentes, vidas extras, três estados de poder, checkpoints,
  portais, salas bônus, passagens secretas, oito arquétipos de inimigo e oito
  guardiões com padrões próprios.
- Solo, dois jogadores em turnos ou cooperativo simultâneo, com teclado, toque
  e gamepad físico.
- Save v2 com checksum, backup válido, checkpoint retomável, migração automática
  do v1 e quarentena do payload corrompido. O replay determinístico roda em
  sessão isolada e seu snapshot passa por validação estrutural antes de iniciar.
- Sons sintetizados por Web Audio; nenhuma mídia externa é necessária.

## Controles

No título, `1` escolhe solo, `2` turnos e `3` cooperativo; `Enter` começa. O
jogador 1 usa setas, `X`/espaço para pular e `Z`/Shift para correr ou agir. O
jogador 2 usa WASD, `G` e `F`. `P` ou Esc pausa, `R` reproduz o replay salvo e
Delete duas vezes em três segundos apaga o progresso. Em telas de toque, há
direção completa, pulo e ação independentes para P1 e P2, além de início e troca
de modo. No gamepad, o ombro direito alterna o modo na tela de título.

## Arquitetura

`reinoZeroUltraData.ts` é a fonte das fases e contém o validador estrito, limites
de tamanho e esquema versionado. `reinoZeroUltraSource.ts` é a fonte canônica do
motor. O gerador converte essa fonte para IR nativa, rejeita qualquer `rawJS`,
`rawHTML` ou `rawCSS`, valida a IR e grava `__gen_reinoZeroUltra.ts`.

O exemplo também motivou primitives genéricas que ficam disponíveis para outros
projetos sem extensão:

- literal, parse e serialização de JSON;
- leitura segura de gamepad com deadzone;
- ler, gravar e remover persistência com chave literal ou calculada;
- consultar movimento reduzido e identificar cada ponteiro multitoque;
- tons e ruído sintetizados;
- entrada de teclado aberta a qualquer `KeyboardEvent.key` válido.

O catálogo inicial guarda somente nome, descrição e tipo. A IR grande é importada
sob demanda quando o cartão é aberto, evitando carregar a campanha no primeiro
bundle da galeria.

## Regeneração e verificação

```sh
bun run gen:reino-zero-ultra
bun run check:reino-zero-ultra
bun run gen:core-example-catalog
bun test src/examples/reinoZeroUltraExample.test.ts
bun run e2e -- e2e/reino-zero-ultra.spec.ts --project=chromium
```

Edite as duas fontes canônicas, nunca o arquivo `__gen_reinoZeroUltra.ts`. Os
testes verificam 32 fases válidas, encadeamento, cobertura de mecânicas,
IR → código → parser, IR → Blockly → IR, ausência de blocos brutos e carregamento
sob demanda do catálogo.
