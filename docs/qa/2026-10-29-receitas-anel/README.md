# Receitas das amizades e da coleção

Conferência local em 29/10/2026, sobre staging `6461f19c0` mais o trabalho ainda sem commit.
Nenhum serviço de staging/produção nem banco remoto foi usado. A fonte do navegador é
`packages/arquipelago/playground/verificar-receitas-anel-browser.ts`.

## Resultado observado

Quatro cenários passaram: Kids/computador, Kids/celular, adulto/computador e adulto/celular.
Em cada cenário, a pessoa abriu a bancada por E ou Usar e preparou os cinco pratos novos,
um por botão real. O teste esperou cada resultado no salvamento canônico do playground,
conferiu a recusa de repetir sem ingredientes, abriu o diário (8 de 12 receitas), recarregou
e leu de novo os cinco pratos. Não houve erro de página/console nem rolagem horizontal.

| Tela | Área da bancada | Conteúdo horizontal |
|---|---:|---:|
| Computador, 1280 × 720 | 560 px | 560 px |
| Celular emulado, 390 × 844 | 350 px | 350 px |

Saída: [resultado.json](r2/resultado.json). Prints da [bancada no Kids](r2/kids-computador-bancada.png),
[diário no Kids](r2/kids-computador-diario.png), [Kids no celular](r2/kids-celular-bancada.png),
[bancada adulta](r2/adulto-computador-bancada.png), [adulto no celular](r2/adulto-celular-bancada.png)
e [diário adulto no celular](r2/adulto-celular-diario.png). Os demais prints estão na mesma pasta.

Comando a partir do pacote, com Chrome instalado:

```powershell
bun build playground/verificar-receitas-anel-browser.ts --target=node --external playwright-core --outfile .cache/receitas-anel-browser.mjs
$env:ARQUIPELAGO_PRINTS = '../../docs/qa/2026-10-29-receitas-anel/nova-tentativa'
node .cache/receitas-anel-browser.mjs
```

O programa escolhe uma porta local livre, usa Chrome/SwiftShader, reduz movimento e fecha
contexto, navegador e servidor próprios no `finally`. `ARQUIPELAGO_CHROMIUM` permite indicar
outro executável. Não usar a mesma pasta para sobrescrever uma tentativa anterior.

## Negativo preservado e limites

A tentativa r1 parou antes de cozinhar: o seletor exigia exatamente “Ver as receitas”, mas a
HUD inclui “E” no mesmo elemento. O print r1 mostra a instrução presente. Corrigido o seletor,
r2 executou os quatro cenários e saiu com código 0. Nenhum resultado de r1 conta como aprovado.

Os corações, coleção e ingredientes iniciais são fixtures locais. Conquistar a receita e
receber a cesta diária são provados por testes de regra; este roteiro não refaz essa jornada
inteira nem autentica uma pessoa real. Celular emulado/SwiftShader não prova desempenho em
telefone físico. Os fluxos publicados ficam para a qualificação integrada.

Verificação adicional: 1.122 testes do jogo passaram, um teste de banco ficou pulado;
177 testes dos contratos passaram. A tipagem do jogo passou. O cenário combinado de obra,
aparências, rotinas, amizades e todos os 30 itens a 999 ocupa 63.055 bytes, com 2.481 bytes
abaixo do teto. Os logs locais têm prefixo `.cache/arquipelago-colheita-`.
