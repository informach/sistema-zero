# Correções do full review da extensão Jogo 2D

## Objetivo

Corrigir os sete defeitos encontrados no review da versão 0.72.0 e restaurar as
checagens do escopo Jogo 2D, sem alterar formatos serializados de blocos existentes.

## Desenho aprovado

- Centralizar teclado, ponteiro, teclado focado e ativação assistiva no mesmo
  fluxo de ações clássicas. A pausa deixa de ser efeito colateral do botão e
  passa por um evento semântico que continua ativo enquanto o jogo está pausado.
- Expor o evento "Quando a ação ... for apertada" como adição compatível ao
  catálogo, codec, IR, gerador, parser e runtime.
- Oferecer a ação `up` nos controles visuais e suportar ativação por teclado,
  clique assistivo e perda de captura do ponteiro.
- Fazer cascos consultarem todos os tipos de inimigo registrados, mantendo o
  tipo do casco apenas como origem da atualização.
- Completar o combate do Reino Zero com dano corporal para todos os tipos,
  colisão dos tiros do chefe e pausa pelo evento semântico.
- Validar enums no codec antes de criar IR tipada e impedir que os caminhos de
  recuperação do modo Blocos aceitem resultados com erros sintáticos ou
  semânticos.
- Limitar tentativas enfileiradas de transição, inclusive ciclos duplicados, e
  percorrer a fila por cursor em vez de `shift()`.
- Corrigir o manual e fazer a geração do índice de exemplos terminar com código
  formatado.
- Ampliar **Virar o sprite** para as quatro direções cardeais. Cima e baixo
  giram o desenho em torno do centro sem alterar a caixa física; esquerda e
  direita preservam o comportamento já publicado.

## Compatibilidade

Nenhum campo de bloco existente será adicionado, removido ou renomeado. O novo
evento é um tipo adicional. Código inválido de enums será preservado como bloco
genérico/avançado em vez de ser convertido silenciosamente para outra opção.

## Verificação

Cada defeito receberá uma regressão automatizada que falha antes da correção.
Depois serão executados os testes direcionados, integrações de Blockly/parser,
typecheck, Biome do escopo, o check global para detectar pendências externas e
o E2E móvel do Reino Zero.
