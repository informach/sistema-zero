# Conferir o programa inteiro, não a janela acessível do Monaco

A CI `44611610377`, recorte `linux-chromium-3`, falhou antes da medição
de isolamento: o teste esperava todo o programa no textarea do Monaco,
mas recebeu apenas `("carga-casca-terminou"); }, 150);`. O campo estava
marcado com `data-mprt="7"`. Esse textarea é uma janela acessível em
torno do cursor, não uma API para ler o modelo inteiro. O helper já
tratava essa diferença no Firefox, mas ainda pressupunha que o Chromium
sempre exporia o arquivo completo.

A verificação por seleção e cópia nativas foi estendida ao Chromium.
O teste limpa a área de transferência, seleciona e copia o conteúdo do
editor, confere **todo** o programa e recoloca o cursor no final. Não lê
um modelo privado do Monaco, não altera o código por API e não aceita
apenas um fragmento. O caminho WebKit continua com a inserção e a
verificação que seu ambiente suporta. Não houve mudança de produto,
timeout, limite de CPU ou critério de responsividade.

Depois da alteração, os testes funcional e de desempenho da casca
passaram no Chromium e Firefox; o funcional passou no WebKit:
**cinco aprovações e um skip explícito**, sem retries. O skip é o teste
de isolamento de CPU no WebKit, capacidade que continua indisponível.
Log: `packages/studio/.cache/mission/shell-whole-document.txt`.

```powershell
cd packages/studio
bunx --no-install playwright test e2e/preview-shell.spec.ts e2e/preview-shell-performance.spec.ts --project=chromium --project=firefox --project=webkit --retries=0
```

Ensaio local Windows. O novo helper ainda precisa de qualificação na
rodada Linux da CI; essas aprovações locais não encerram a missão.
