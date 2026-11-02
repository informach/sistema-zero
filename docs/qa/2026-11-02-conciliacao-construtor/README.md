# Revisão da conciliação do Construtor

Base: `52797249a44898375b0f68f6f2baa3d8b22a767c`, com o merge concluído da Nave e de
O Jogo do Meu Jeito e as correções que acompanham esta nota. A revisão incluiu os contratos
de ação, abertura da cena, preservação das descobertas, guias, controles, validação do
Members, manifesto, roteiro, fontes de voz e adaptação do painel.

## Achados corrigidos

1. `restart-case` era aceito em `setup.actions`. Abrir um caso desses chamava o reinício
   do próprio caso até lançar `RangeError`. O RED teve oito falhas nos quatro cenários.
   A régua de ações iniciais agora mora em `scene/actions.ts`, é usada pela validação e
   pelo motor, e recusa reinícios. Chamadas diretas com configuração inválida ignoram
   essas ações. O botão de reinício durante a interação continua preservando descobertas.
2. Dois tipos de gesto agrupavam discriminantes em um mesmo membro da união. Isso impedia
   o compilador de refinar `cor` e `nome` nos testes, embora os valores fossem válidos.
   As variantes agora têm discriminantes individuais, sem cast nem supressão.

Os três erros anteriores dos testes de memória, símbolos e cabana foram corrigidos em
`52797249a`, usando os tipos de gesto no lugar de `string` para os resultados esperados.

## Verificação local

- `bun test packages/core/src/learning/scene packages/core/tests/learning.test.ts`:
  1.778 testes, zero falhas, 86.593 asserções.
- Os 43 arquivos `scene-*.test.tsx` do MemberShell: 521 testes, zero falhas, 5.142 asserções.
- `bun run --filter @sistemazero/core typecheck` e o typecheck completo do MemberShell,
  incluindo testes: código de saída zero, com heap de até 4.096 MiB.
- `validar-manifestos.ts`: 51 válidos, nenhum reprovado ou aviso de convenção.
- `validar-roteiros.py`: 289 clipes em 51 aulas, zero erros.
- `gerar-falas-elevenlabs.ts --check`: derivados conferidos, sem chamadas de geração de voz.
- `sync-arquipelago-repertorio-planejado.mjs --check`: cinco fontes e 92 blocos conferidos.
- Biome dos arquivos corrigidos e `git diff --check`: sem erros.

## Navegador

`scene-workspace.spec.ts` executado com Chromium 1223, um worker, nenhuma repetição,
fixture local em `127.0.0.1:5398`: **30 testes passaram em 1,7 minuto**. Cobriu ampliação,
recolhimento, foco e Escape, preservação da execução e das descobertas, divisão do painel,
palpite, fontes maiores e larguras de 320 a 1.920 px. Porta liberada ao terminar.

Esta é uma prova local com o componente real e dados de exemplo. Não é uma sessão
autenticada de staging ou produção, nem um teste em aparelho físico. Nenhum dado remoto
ou progresso de aluno foi gravado por essas verificações.

![Experiência ampliada no computador](nave-ampliada.png)

![Experiência em largura de celular](nave-celular.png)

As evidências da publicação dos desafios e dos deploys pertencem à operação posterior
ao CI. Esta nota não afirma que a versão já tenha sido implantada.

## Correção do painel em 320 px

O CI da composição `3954bf8ce` encontrou rolagem horizontal em 320 × 568. O HUD
impunha a largura mínima dos filhos flexíveis, que dependia da fonte. A regressão local
com fonte monoespaçada, espaçamento de letras de 0,12 em e de palavras de 0,16 em
reproduziu 330 px de conteúdo numa janela de 320 px. O painel agora permite quebrar
linhas e reduzir a largura mínima. Não corta conteúdo, reduz fonte ou esconde a rolagem.

Após a correção, a suíte completa `e2e-scenes` passou: **86 testes, zero falhas e nenhuma
repetição, em 3,9 minutos**, com um worker e o navegador padrão do Playwright 1.60.0
(Chromium headless shell 1223). A porta local 5398 foi liberada ao terminar. O novo teste
de espaçamento e o caso exato reprovado no CI passaram. Biome e o typecheck focado do
arquivo de testes também passaram. Os typechecks completos de Kids e Members da base
`3954bf8ce` terminaram com código zero.

A primeira tentativa local, com o executável completo do Chrome indicado explicitamente,
parou no arrasto do vídeo: depois de capturar o ponteiro, não recebeu os movimentos nem
a soltura. A investigação preservou o negativo; usando o navegador padrão da configuração,
o teste original e a suíte inteira passaram. Nenhuma alteração no player, espera arbitrária
ou omissão de teste foi necessária. Isso não afirma que todo navegador físico foi validado.

Recibos locais preservados em `.cache/course-audience-sync/`: `hud-wide-font-red-r2.log`,
`hud-wide-font-green-r1.log`, `video-drag-pointer-r1.log`,
`video-drag-default-browser-r1.log` e `hud-default-all-scenes-r1.log`.
