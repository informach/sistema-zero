# A02: cor conquistada sem depender do catálogo

Base integrada: `00adca1df`, incluindo a rede de barcos, os primeiros passos e o descarte
animado do A01. Playground local, plataforma falsa, Chrome headless com SwiftShader. Sem banco
remoto, publicação, mudança de salvamento ou arte.

## Resultado no navegador

Sete cenários passaram em 1280 × 720 e 390 × 844. O celular emulado usa movimento reduzido.
O verificador observa os uniforms reais usados na pintura, além do contador do HUD e do painel.
Nenhum erro de página. As posições vêm da âncora de chegada real do Bosque e da regra do quadro.

| Cenário | Posições coloridas do Bosque |
| --- | --- |
| Primeiro acesso com serviço fora do ar | Nenhuma |
| Catálogo disponível, antes de concluir | Nenhuma |
| Concluir o primeiro desafio pelo botão do quadro | 1 |
| Remontar sem conexão, conservando a fotografia local | 1 |
| Retirar publicações, com a conclusão histórica da fixture na posição 3 | 1 e 3 |
| Host antigo, sem a rota nova | 1 e 3 |
| Catálogo desligado, leitura histórica disponível | 1 e 3 |

Em todos os cenários, os pedaços ainda não conquistados conservam os 30% da ponte aberta.
As outras ilhas continuam fechadas. Arquivar não produz botão para um desafio inexistente.
O quadro informa que a cor conquistada continua ali; o catálogo desligado não diz que a pessoa
perdeu suas cores. A fotografia não aprova desafios nem concede moedas.

Capturas `antes-*`, `conquistada-*`, `recarga-offline-*`, `arquivadas-*`, `quadro-arquivadas-*`,
`host-antigo-*`, `catalogo-desligado-*` e `primeiro-offline-*`. Medidas completas em
`medidas-computador.json` e `medidas-celular.json`.

O verificador mantém localStorage entre contextos, isolando o IndexedDB de salvamento: a
plataforma falsa reinicia suas revisões ao montar, o que provocava conflito de salvamento entre
cenários. A reserva das cores é exercitada pelo cache real e por nova montagem do jogo.
O HUD superior é intencionalmente oculto no celular; seu texto é conferido no DOM, e o contador
visível do painel é conferido por interação. Isso não equivale a testar celular físico ou login
nas comunidades publicadas.

Comandos:

```text
bun build playground/verificar-cores-browser.ts --target=node --external playwright-core --outfile .cache/verificar-cores.mjs
node .cache/verificar-cores.mjs
```

`ARQUIPELAGO_CHROMIUM` permite escolher o executável; `ARQUIPELAGO_PRINTS` troca a pasta de
capturas; `ARQUIPELAGO_TELA=computador|celular` limita uma repetição. Sem essas opções, roda ambos
os tamanhos em uma porta local reservada. A execução integrada final retornou código 0.

## Provas e revisão

- Contratos: 196 testes passaram, 8.274 expectativas. Schema estrito, posições de 1 a 6,
  duplicatas, versão, campos extras e isolamento dos dados.
- Serviço, regras e integração HTTP sem banco: 246 testes passaram, 975 expectativas.
  Arquivamento, mudança de posição, isolamento de pessoa/público, acesso e suporte sem escrita.
  A consulta real foi revisada: usa a revisão publicada guardada na conclusão; refazer mantém
  essa revisão pelo conflito que não substitui a primeira conclusão.
- Host/BFF: 41 testes passaram, 229 expectativas. Gateway: três testes dirigidos passaram,
  53 expectativas. Caminho exato, identidade da sessão, GET, repasse nos dois públicos e
  `private, no-store`, incluindo a correção detectada pelo teste do cabeçalho.
- O teste de mover uma publicação reproduziu uma comemoração falsa na posição nova. Depois da
  correção, a festa também depende das posições novas confirmadas, e o mesmo teste passou.
- Suíte completa integrada do jogo: 1.296 passaram, um ignorado por depender de Postgres,
  zero falhas; 174.887 expectativas em 149 arquivos. `bun --smol test --timeout 30000`.
- Suíte completa de member-shell: 2.002 passaram, zero falhas; 14.055 expectativas em 252 arquivos.
- Suíte completa do gateway: 314 passaram, dois ignorados por depender de Redis real,
  zero falhas; 1.487 expectativas em 42 arquivos.
- Tipagem do jogo, serviço, contratos, gateway, member-shell, Kids e adulto passou com teto de
  8 GB (`bunx tsc --noEmit` em cada pacote, com `NODE_OPTIONS=--max-old-space-size=8192`).
- Biome dos 33 arquivos TypeScript tocados passou; revisão completa do diff e `git diff --check`
  concluídas. Nenhum teste foi removido ou relaxado para obter esses resultados.

A revisão incluiu os dois conflitos de imports ao incorporar o staging, preservando os primeiros
passos e a rede de barcos. A pintura inicial não herda uniforms de outro perfil. Cancelamento e
resposta antiga não repõem dados, armazenamento indisponível não impede jogar, suporte não grava
cache. Não há consulta ou alocação nova no laço da física.

## Implantação e limites

Serviço, gateway e portas Kids/adulto precisam oferecer `/desafios/cores` para recuperar posições
arquivadas no primeiro acesso de outro aparelho. Um host antigo conserva o cache e usa conclusões
do catálogo quando a rota não existe; não inventa posições a partir do contador agregado.
Nenhum push ou acesso a banco remoto faz parte deste lote. Nenhum pedido de arte.
