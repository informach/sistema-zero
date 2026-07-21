# Correções da revisão de HTML, CSS, SVG e Canvas

## Contexto

A revisão das quatro categorias confirmou o inventário e os pipelines, mas encontrou seis lacunas: perda semântica ao importar tipos de botão com capitalização diferente, defaults fracos para imagens, contradição na descrição acessível do Canvas, ausência de um estado CSS guiado para foco por teclado, falta de orientação para valores HTML inválidos e testes que ignoram linhas posteriores dos blocos.

A autoria em telas de celular não faz parte deste trabalho. O contrato principal continua sendo programar no computador.

## Abordagens consideradas

1. **Contratos centrais e blocos pedagógicos explícitos — escolhida.** Normalizar e validar HTML no catálogo compartilhado, oferecer um bloco CSS próprio para `:focus-visible` e fazer os testes percorrerem todas as linhas declaradas. Mantém parser, Blockly e geradores alinhados.
2. **Correções locais em cada codec.** É menor inicialmente, mas duplica regras de valores válidos e facilita divergências futuras.
3. **Converter qualquer caso incomum em código avançado.** Preserva texto, porém retira casos válidos da experiência guiada e não corrige os defaults criados pela criança.

## Desenho

### HTML

- O catálogo será a fonte de verdade para tipos válidos de botão, dimensões de imagem e tokens de `autocomplete`.
- Tipos de botão válidos serão normalizados sem diferenciar maiúsculas e minúsculas antes de chegar ao dropdown. Valores desconhecidos continuarão preservados como HTML avançado, em vez de mudar silenciosamente a ação do botão.
- A imagem inicial usará descrição vazia, largura `600` e altura `400`. Assim o diagnóstico pede uma descrição real ou a escolha explícita de imagem decorativa, e o exemplo remoto reserva a proporção correta.
- O diagnóstico avisará quando dimensões não forem inteiros positivos, quando apenas uma dimensão estiver presente ou quando um `autocomplete` preenchido não obedecer à gramática suportada.

### CSS

- Será adicionado um bloco infantil separado para `:focus-visible`, no mesmo grupo do hover. O bloco separado preserva o comportamento de projetos existentes que já usam `sz_css_hover`.
- O novo bloco seguirá o mesmo contrato forward-only dos atalhos CSS que convergem para uma regra genérica editável.

### Canvas

- A descrição deixará de ser apresentada como opcional. Rótulo e tooltip explicarão que ela descreve o jogo ou desenho para quem não consegue vê-lo, mantendo o aviso atual quando estiver vazia.

### Testes

- A reprodução de fidelidade atravessará parser, serialização Blockly e reconstrução da IR com tipos de botão em capitalizações diferentes.
- Defaults e diagnósticos HTML serão cobertos diretamente.
- O novo estado CSS será testado do bloco até a IR gerada.
- Utilitários pedagógicos percorrerão `message0…message5` e `args0…args5`, evitando novos pontos cegos quando um bloco for quebrado em mais linhas.
- O pipeline integral, typecheck, Biome, build e E2E das quatro categorias serão executados ao final.

## Compatibilidade

Nenhum tipo existente será removido ou terá sua semântica alterada. Projetos antigos com hover continuam gerando somente hover. HTML fora do vocabulário guiado continua preservado por fallback avançado. O novo bloco CSS aumenta o inventário web em uma unidade.
