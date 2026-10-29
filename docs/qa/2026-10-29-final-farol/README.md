# Final no alto do Farol

Conferência local em 29/10/2026, no playground com plataforma falsa. Computador de 1280 × 720 e celular emulado de 390 × 844, com toque. Chrome com SwiftShader. Nenhum banco de staging ou produção foi acessado.

## Caminhos conferidos

- Na posição 7, a porta mostra o recado da Lenda e não revela o final.
- Na posição 8, E / Usar abre a sala. A cápsula apoia no piso. A caminhada real leva da chegada à mesa, sem teleporte dentro da sala.
- Os quatro trechos da página aparecem um por vez. Depois da leitura, a página fica no diário da sessão.
- A sequência para com o menu e continua ao fechar. Os seis fachos alcançam o anel. No celular, a preferência de menos movimento usa a vista final fixa.
- Voltar para casa devolve o corpo à ilha. A Íris aparece e conversa com o painel genérico de morador.
- Reentrar e apertar Esc durante a entrada termina a passagem e atende a saída. As geometrias retornam ao patamar anterior.
- Uma resposta 503 ao carregar a sala mantém a criança na ilha e oferece nova tentativa.
- Sem erro de JavaScript e sem rolagem horizontal nos dois tamanhos.

## Prints

| Cena | Computador | Celular emulado |
| --- | --- | --- |
| Sala | [Abrir](sala-computador.png) | [Abrir](sala-celular.png) |
| Página | [Abrir](pagina-computador.png) | [Abrir](pagina-celular.png) |
| Seis fachos | [Abrir](fachos-computador.png) | [Abrir](fachos-celular.png) |
| Volta da Íris | [Abrir](iris-computador.png) | [Abrir](iris-celular.png) |

Os arquivos `medidas-computador.json` e `medidas-celular.json` guardam o medidor antes, dentro, no final e depois da saída. Os quadros por segundo vêm de renderização por software e não representam um celular real.

Depois de carregar a Íris, as duas saídas comparadas ficaram em **388 geometrias**, tanto no computador quanto no celular emulado. Nenhuma ilha completa foi carregada pela vista panorâmica. As amostras de SwiftShader ficaram entre 1 e 5 quadros por segundo nesta máquina; são evidência funcional, não uma aprovação de desempenho em hardware real.

## Comandos e resultados

- `bun test` no pacote: **975 passaram, 1 pulado, 0 falhas**, em 111 arquivos. O teste pulado é a integração preexistente de tempo com Postgres, que exige `ARQUIPELAGO_TEMPO_TEST_DATABASE_URL` para banco local descartável. Esta tarefa não depende de banco.
- `NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit` no pacote: passou.
- `bunx biome check` nos 22 arquivos de código tocados e nos dois arquivos de medições: passou, sem correções pendentes.
- Compilação do verificador com `bun build --target=node --external playwright-core` e execução com Node: passaram em computador e celular, incluindo o bloqueio antes da Lenda, erro de carregamento, diário e comparação de memória.
- `git diff --check`: passou.

## Reproduzir

Dentro de `packages/arquipelago`:

```text
bun build playground/verificar-final-farol-browser.ts --target=node --external playwright-core --outfile .cache/verificar-final-farol-browser.mjs
node .cache/verificar-final-farol-browser.mjs
```

O script aceita `ARQUIPELAGO_CHROMIUM` e `ARQUIPELAGO_PRINTS` e inicia seu próprio servidor local. Usa `--use-angle=swiftshader --enable-unsafe-swiftshader`.

## Limites e continuação

O progresso final é só da sessão, conforme a tarefa. O booleano futuro e os pedidos dos colisores e âncoras definitivos estão no [plano](../../plans/2026-10-29-arquipelago-final-do-farol.md). Os colisores simples atuais permitem concluir o final sem regenerar arte. A porta exterior oferece a passagem, mas não ganha dobradiça animada nesta malha.

Ainda cabe uma conferência em celular físico, sobretudo fluidez, consumo de memória e conforto do controle por toque. A emulação não prova essas condições de hardware.
