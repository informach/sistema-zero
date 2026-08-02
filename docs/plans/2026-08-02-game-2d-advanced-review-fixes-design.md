# Correções do full review de Jogo 2D Avançado

## Escopo

Resolver todos os achados do review de `game-2d-advanced` sem remover blocos,
alterar receitas existentes ou depender da quantidade de blocos liberada por aula.

## Decisões

1. Corrigir o ponteiro na origem: coordenadas usam a caixa de conteúdo do canvas;
   a liberação acontece mesmo fora dele; gestos nativos não interrompem o jogo.
2. Adicionar o bloco visível **Descrever o jogo para leitor de tela**, espelhando o
   contrato pedagógico da extensão básica em definição, IR, gerador, parser,
   runtime, documentação e contexto da IA.
3. Tratar as telas do motor como diálogos acessíveis. A tela ativa recebe nome e
   semântica, o foco vai ao botão principal e retorna ao canvas ao fechar.
4. Criar um contrato TypeScript canônico para `window.SZGameKit`, com tipos de
   domínio, inventário exato (inclusive `runProject`) e guarda de assinatura.
5. Reduzir o monólito extraindo shell, acessibilidade e entrada para um fragmento
   de runtime, preservando a string injetada e a API publicada.
6. Centralizar o contrato repetido dos testes de exemplos e os utilitários dos
   scripts `__gen_*`, sem esconder as asserções específicas de cada jogo.
7. Atualizar a documentação interna, remover código morto e manter Biome limpo.

## Compatibilidade

- IDs de blocos e tipos de IR existentes permanecem intactos.
- O novo bloco e o novo método de runtime são aditivos.
- A enumeração histórica dos métodos usados por blocos continua estável; o
  inventário canônico também registra `runProject`, que é deliberadamente não
  enumerável por ser infraestrutura do lifecycle.
- Projetos salvos, exemplos, preview e exportação continuam usando
  `window.SZGameKit`.

## Testes

- Regressões reais para borda + coordenadas, soltura fora do canvas, toque e
  captura do ponteiro.
- Pipeline completo e round-trip do novo bloco.
- Semântica, descrição e gerenciamento de foco das telas.
- Typecheck semântico do runtime injetado e guarda da ordem dos parâmetros.
- Suíte de exemplos usando harness compartilhado.
- Arquitetura, Biome, testes da extensão e E2E no Chromium.
