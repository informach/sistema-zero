# Pausa e menos movimento no quarto

Lote A03a da auditoria de 30/10/2026. Base local: `165e94c10`. Sem acesso a banco ou serviço
remoto, sem alteração de modelos ou salvamento.

## Comportamento verificado

O quarto próprio e o visitado usam a mesma regra de pausa do jogo. Cada mixer conserva seu
instante e retoma sem reiniciar; menos movimento encerra a animação na pose neutra. O pet
conserva posição, giro e balanço na pausa. O pássaro conta apenas o tempo ativo. Sua posição
de montagem é estável, para uma renderização do React não sobrescrever a altura do balanço.

O padrão dos componentes compartilhados continua sem pausa, preservando os consumidores da
plataforma. Não há travessia de nós ou criação de arrays de poses no laço normal do jogo.

## Provas

- Teste de efeitos React com ações, mixer e trilha Three reais, em processo isolado: conserva
  pose, retoma do mesmo instante, não pausa outra peça, repousa com menos movimento e encerra
  ao desmontar. O callback real do pet é exercitado com vetores Three: 50 segundos pausados
  não mudam posição ou giro e não avançam a fase do pássaro.
- Contraprova: desabilitar o controle de `mixer.timeScale` fez o teste falhar na conservação
  da pose. A implementação foi restaurada antes da validação final.
- `verificar-quarto-pausa-browser.ts`: Chrome com SwiftShader, 1280 × 720 e 390 × 844 com
  toque. Onze cenários de poses por tamanho, sem erro de página. Resultados nos dois JSONs.
- A conferência lê as transformações dos modelos reais pelo medidor opcional. Espera quadros
  reais ao mudar a preferência do aparelho e aguarda os móveis da Ana carregarem. Assim, uma
  troca de modelo ainda em andamento não é confundida com animação durante a pausa.
- Prints de quarto e menu inspecionados nos dois tamanhos. Celular físico ainda não conferido.

## Comandos

No jogo:

```text
bun test tests/quarto-pausa.test.ts tests/pausa.test.ts
bun --smol test --timeout 30000
NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit
bun build playground/verificar-quarto-pausa-browser.ts --target=node --external playwright-core --outfile .cache/verificar-quarto-pausa.mjs
node .cache/verificar-quarto-pausa.mjs
```

Resultados finais: jogo com 1.297 testes aprovados, 1 ignorado (integração de Postgres local)
e 174.889 asserções em 150 arquivos. Avatar-quarto com 2 testes aprovados. Tipagem dos dois
pacotes aprovada com teto de 8 GB. Na raiz, Biome dos 10 arquivos TS/TSX e `git diff --check`
aprovados. Navegador repetido após a correção da posição inicial: 11 verificações por tamanho.

## Revisão

Pausa e preferência têm responsabilidades diferentes: desabilitar a animação para pausar
reiniciaria o clipe ao voltar. Os mixers são próprios das peças, e a cena original permanece
intacta. Menu, painéis, ferramenta, limite de tempo e bloqueios de salvamento usam a regra
`jogoPausado`, já coberta pelo teste das interrupções. No navegador foram exercitados menu e
painel de visitas; não foi aberta uma ferramenta real da plataforma nesta prova local.

O teste de exports do pacote compartilhado falhava no Windows por comparar barras invertidas
com as barras do package.json. Passou a usar caminho relativo normalizado, mantendo a mesma
verificação de todos os arquivos. Nenhum pedido de arte neste lote. Abertura e ritmo de cuidado
ficam nas partes A03b e A03c, com commits próprios. Sem push.
