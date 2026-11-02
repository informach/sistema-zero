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
