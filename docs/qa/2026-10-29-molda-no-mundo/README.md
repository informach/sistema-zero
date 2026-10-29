# Aparências autorais no mundo

Conferência local de 29/10/2026, Chrome com SwiftShader e movimento reduzido.

| Ambiente | Casos | Resultado |
| --- | --- | --- |
| Computador, 1280 × 720 | Colocar, Molda, Pinta, trocar, mesmo id, galeria, falha, método ausente | Passaram |
| Celular emulado, 390 × 844 | Os mesmos casos, com o botão Usar | Passaram |

Em cada ambiente, cinco aparências carregadas, quatro liberadas e uma em uso antes de testar
as reservas. Nenhum erro de página. Os contadores estão em [resultado.json](resultado.json).
A proximidade do avatar é preparada pelo medidor; colocação, oficina e troca usam os controles
reais. A oficina é falsa: reaproveita o GLB da planta de interior e uma planificação colorida.
A plataforma real é coberta por testes de autorização, recusa e exportação nativa do Molda.
Não houve acesso a banco remoto nem teste em celular físico ou conta publicada.

## Prints

| Estado | Computador | Celular |
| --- | --- | --- |
| Projeto azul colocado | [Abrir](computador-01-projeto-azul.png) | [Abrir](celular-01-projeto-azul.png) |
| Modelo do Molda | [Abrir](computador-02-molda.png) | [Abrir](celular-02-molda.png) |
| Planificação do Pinta | [Abrir](computador-03-pinta.png) | [Abrir](celular-03-pinta.png) |
| Falha, modelo de reserva | [Abrir](computador-04-falha.png) | [Abrir](celular-04-falha.png) |
| Método ausente, modelo de reserva | [Abrir](computador-04-sem-metodo.png) | [Abrir](celular-04-sem-metodo.png) |

## Reprodução

No pacote do jogo:

```sh
bun build playground/verificar-aparencias-browser.ts --target=node --external playwright-core --outfile .cache/verificar-aparencias-browser.mjs
node .cache/verificar-aparencias-browser.mjs
```

`ARQUIPELAGO_CHROMIUM` escolhe o executável; `ARQUIPELAGO_PRINTS` escolhe a pasta de evidências.
O verificador abre e encerra seu servidor local. `?aparencias=pronto|falha|sem-metodo` também
permite a conferência manual junto de `?obra=exemplo&posicao=5`.

## Validação

- `bun test`: jogo 930 passaram, um teste opcional de Postgres ignorado; contrato 128 passaram;
  plataforma 1.973 passaram.
- `NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit`: passou nos três pacotes.
- `bunx biome check`: passou nos arquivos alterados. A execução dos três pacotes completos
  encontra uma falha preexistente de formatação no relatório gerado `arte/ilhas-b/relatorio.json`,
  que não foi alterado por esta tarefa.
- Revisão: posse e sessão, tetos reais, frente e encaixe, faces por material do GLB, reserva,
  leitura renovada ao voltar da oficina, descarte privado e aconchego intacto.

Pedidos de faces para os outros sete objetos estão reunidos no
[plano](../../plans/2026-10-29-arquipelago-molda-no-mundo.md). Não falta arte para o Molda nem
para a pintura da geladeira e da tela do fliperama.
