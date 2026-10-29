# Vale dos Dinos: pegadas, escavação e ninhos

Conferência local de 29/10/2026, fase4-02. Chrome com SwiftShader, computador 1280 × 720 e
celular emulado 390 × 844 com toque. O celular também usa prefers-reduced-motion.

## Roteiro conferido

- Chegar pela ponte e percorrer o rastro com entradas do controle, sem transporte pelo trajeto.
  Passar pelo Quadro das Cores, contornar as costelas e entrar pela abertura da cerca.
- Conferir o registro das pegadas no diário. Abrir o diário pausa: E não avança a escavação.
- Tirar a areia, reabrir a página com a etapa parcial salva, limpar com o pincel e observar.
  O registro do fóssil aparece no diário.
- Preparar a aproximação de cada ninho com o transporte do playground, usar E no computador
  ou Usar no celular e se afastar caminhando com o controle. Os três cuidados ficam registrados.
- Conversar com Jade, avançar as duas falas e fechar. Ficar de pé no observatório.
- Sair da ilha, conferir o descarregamento, voltar e reabrir a conversa de reconhecimento.
- Conferir os cinco registros, largura do texto no diário e ausência de rolagem horizontal
  no celular. Nenhum pageerror durante os dois roteiros.

O transporte só prepara cenários distantes e a volta à ilha. A prova de acesso a pé desde a
chegada até cada ninho é a busca em grade dos testes, com os colisores reais do GLB. O rastro
inteiro e o afastamento de cada ninho foram caminhados no navegador.

## Capturas

| Conferência | Computador | Celular |
| --- | --- | --- |
| Fóssil revelado | [Abrir](vale-computador-fossil.png) | [Abrir](vale-celular-fossil.png) |
| Cuidado de um ninho | [Abrir](vale-computador-ninho-3.png) | [Abrir](vale-celular-ninho-3.png) |
| Diário completo | [Abrir](vale-computador-diario-5.png) | [Abrir](vale-celular-diario-5.png) |
| Jade | [Abrir](vale-computador-jade.png) | [Abrir](vale-celular-jade.png) |

Também há capturas da chegada, do observatório, dos outros ninhos e do diário em andamento.
Os prints foram inspecionados visualmente. A coluna estreita do diário detectada na revisão
foi corrigida usando o mesmo ícone, corpo de texto e espaçamento dos cartões existentes.

## Verificação

- `bun test` em arquipelago: 916 passaram, 1 ignorado, nenhuma falha na execução final.
  O ignorado depende de Postgres local. Uma execução concorrente anterior atingiu o timeout
  de um teste geométrico da Vila; a suíte completa passou ao repetir sem aquela disputa.
- `bun test` em arquipelago-contracts: 122 passaram, nenhuma falha.
- `bun test packages/arquipelago-api/tests/integration/http.test.ts`: 34 passaram, nenhuma falha.
  Repositório em memória, sem gravar em banco. Inclui V11 para V12, Recife preservado e Vale completo.
- `NODE_OPTIONS=--max-old-space-size=8192 bun run typecheck` no jogo e nos contratos: passou.
- `bunx biome check` nos arquivos tocados: passou.
- Compilar e executar `playground/verificar-vale-browser.ts`: passou nos dois tamanhos.

Os pontos de medição desta execução registraram 3 e 5 quadros/s no computador e 6 e 6 no
celular emulado. São números de renderização por software com SwiftShader nesta máquina,
não uma medição de desempenho de GPU ou de celular real. Não foi feita comparação antes/depois.

Nenhum modelo, âncora ou gerador precisa ser feito ou regenerado. Teste em celular físico
permanece uma conferência de dispositivo, fora da emulação executada aqui. Filhote e museu
não pertencem a esta fase. Não houve acesso a banco de staging ou produção.

## Reproduzir

No pacote packages/arquipelago:

```powershell
bun build playground/verificar-vale-browser.ts --target=node --external playwright-core --outfile .cache/verificar-vale-browser.mjs
$env:ARQUIPELAGO_CHROMIUM='C:/Program Files/Google/Chrome/Application/chrome.exe'
node .cache/verificar-vale-browser.mjs
```

ARQUIPELAGO_PRINTS pode escolher outra pasta de capturas.
