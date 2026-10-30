# A abertura espera a leitura

Parte A03b, sobre a base local `297e95fd1`. As oito imagens e o roteiro foram preservados.
Agora são nove passos de leitura, porque a última imagem tem duas falas. Sem alteração de
arte, salvamento, banco ou publicação.

## O que mudou

- Leitura manual por padrão, sem prazo. Anterior e Próxima percorrem uma fala de cada vez.
  Começar aparece depois da apresentação do Zappy, sem pular sua fala.
- Passar sozinho liga a sequência automática existente. Pausar leitura conserva o instante.
  Navegar manualmente desliga o automático, sem deixar um prazo escondido para a fala nova.
- Enter e Espaço acionam o controle focado; no palco, Enter avança e Espaço segurado pula.
  As setas navegam por fala. Perder o foco ou esconder a aba cancela o gesto de pular.
- Botões no estilo existente: ação de avançar em amarelo; anterior e automático no estilo
  leve. Contador de falas separado das oito marcas de imagens. Menos movimento preservado.
- O fechamento ainda distingue concluir/pular, rever, desmontar e interrupção pelo tempo ou
  pelo salvamento. A integração com os primeiros passos do Zappy foi preservada.

## Conferência local

`playground/verificar-leitura-browser.ts`, Chrome com SwiftShader: 1280 × 720 e 390 × 844 com
toque e movimento reduzido. Em cada tamanho: mais de oito segundos na mesma fala em modo
manual, próxima com Enter, anterior com Espaço, ligar e pausar o automático, esperar nove
segundos pausado, retomar, percorrer as nove falas, voltar da última, começar o jogo, abrir o
Diário e rever em modo manual, pular segurando Espaço. Sem erros de página.

O verificador também confere a área mínima de 44 px dos botões, seu enquadramento e a legenda
acima dos controles. Prints e resultados por tamanho nesta pasta. Não substitui um celular
físico ou uma sessão com leitor de tela real.

## Comandos e revisão

```text
bun test tests/abertura.test.ts tests/abertura-lifecycle.test.ts tests/primeiros-passos.test.ts tests/primeiros-passos-loja.test.ts
bun --smol test --timeout 30000
NODE_OPTIONS=--max-old-space-size=8192 bunx tsc --noEmit
bun build playground/verificar-leitura-browser.ts --target=node --external playwright-core --outfile .cache/verificar-leitura.mjs
node .cache/verificar-leitura.mjs
```

Na raiz, Biome dos arquivos TS/TSX alterados e `git diff --check`. A prova antiga do HUD foi
atualizada para avançar explicitamente até a segunda fala do Zappy. O verificador novo é a
prova executada neste lote. A suíte completa passou com 1.298 testes, 1 ignorado (Postgres
local) e 174.897 asserções em 150 arquivos. Os 50 testes dirigidos de abertura e primeiros
passos foram repetidos depois da revisão final e passaram, com 2.366 asserções. Tipagem com
8 GB, Biome dos seis arquivos TS/TSX e diff sem espaços incorretos aprovados.

Na revisão, os atalhos foram separados da ativação nativa dos botões. Soltar Espaço sempre
cancela a espera, mesmo depois de mudar o foco para outro controle. A leitura automática usa
apenas tempo ativo, e o texto aprovado não foi reescrito. Nenhum pedido de arte. Sem push.
