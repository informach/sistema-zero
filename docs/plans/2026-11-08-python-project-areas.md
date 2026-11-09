# Proposta: áreas de projeto para Python

Status: implementação local em `fix/python-classic-performance-20261108`, autorizada em 08/11/2026. Qualificação e medições em `docs/qa/2026-11-08-python-classic-performance.md`.

Revisão de 08/11: os dois achados de rascunhos foram corrigidos, com armazenamento independente da fonte e navegação de funções/classes externas; detalhes em `docs/qa/2026-11-08-python-program-areas-review.md`. O usuário esclareceu que não há alunos usando Python: compatibilidade com projetos antigos não é requisito. Os exemplos prontos da galeria devem nascer dentro de Programa; todos os 104 exemplos clássicos foram qualificados, e a apresentação inicial agora é salva automaticamente.

## Recomendação

Usar a mesma linguagem visual das áreas do JavaScript, com uma área principal **Programa · main.py**. Dentro dela, mostrar o programa na ordem em que aparece no arquivo, com funções e classes recolhíveis. A área delimita o que pertence ao programa e torna explícito que sua execução começa de cima para baixo.

```text
┌ Programa · main.py ──────────────────────────────────┐
│ Executado de cima para baixo                         │
│                                                     │
│ ▾ Preparação                                        │
│   importar turtle, time…                            │
│   CELULA = 28; INTERVALO = 16                        │
│                                                     │
│ ▸ função mover(ator, distancia)                      │
│ ▸ função coletar(casa)                               │
│ ▸ função atualizar(tempo)                            │
│ ▾ função quadro()                                   │
│   atualizar → desenhar → atualizar a tela → agendar  │
│                                                     │
│ ▾ Início                                            │
│   preparar(); iniciar(); tela.mainloop()             │
└─────────────────────────────────────────────────────┘

┌ Rascunhos · não executam ────────────────────────────┐
│ Peças novas que ainda não entraram no programa       │
└─────────────────────────────────────────────────────┘
```

O desenho é conceitual; os títulos e agrupamentos do exemplo não substituem o código real do Pac-Man.

## Como se comporta

- **Programa:** área obrigatória por arquivo `.py`, com nome do arquivo e indicação de ordem. Mover a área muda só a posição na tela. Reordenar instruções exige um encaixe explícito.
- **Funções/classes:** mantêm sua posição no arquivo. Cada definição tem título, parâmetros e ação de expandir/recolher. Um índice permite encontrar `mover`, `coletar` ou `quadro` sem atravessar milhares de blocos.
- **Seções:** títulos de apresentação para trechos contíguos, como preparação e início. Nunca classificam e reordenam instruções automaticamente. Arquivos com importações, definições e efeitos intercalados continuam exatamente na mesma ordem.
- **Rascunhos:** peças novas soltas ficam claramente fora da execução. Para remover uma instrução existente do programa, o gesto precisa deixar isso explícito e participar de desfazer/refazer. Rascunhos precisam de armazenamento próprio, separado do código executável e do buffer de recuperação de edições inválidas.
- **Ponte:** selecionar uma definição ou instrução mostra seu trecho real. Recolher, navegar ou mover uma área não modifica o texto Python.
- **Projetos grandes:** exemplos podem abrir com funções recolhidas e o trecho inicial visível. A busca abre a função que contém o resultado. A implementação precisa limitar os blocos efetivamente desenhados/montados, por trecho ou função; esconder os milhares de elementos já existentes não resolve sozinho. Uma opção técnica é editar a função selecionada em um workspace de escopo, mantendo o índice e a área Programa como contexto. A fonte completa continua autoritativa e o commit altera apenas o trecho escolhido.

## Alternativas

| Alternativa | Benefício | Limite |
| --- | --- | --- |
| Apenas envolver os blocos em “Programa” | Resolve rapidamente a falta de contexto visual | Mantém o problema de navegar por um programa enorme |
| **Programa + definições recolhíveis + rascunhos** | Continuidade com JavaScript e leitura fiel do Python | Exige cuidar da migração, do histórico e da ligação com a Ponte |
| Repetir as seis áreas do JavaScript | Aparência familiar | As áreas JS organizam geração/execução; aplicá-las literalmente pode alterar a ordem e os efeitos do Python, além de não servir igualmente a Turtle, Pygame e Pygame Zero |

## Migração e critérios de aceite

1. Envolver os blocos já existentes mantendo a ordem registrada e todos os arquivos byte a byte. Nenhuma raiz existente pode virar rascunho silenciosamente.
2. Introduzir recolhimento e índice sem mudar AST, execução, seleção cruzada ou histórico de código. Persistir apresentação separadamente.
3. Adicionar rascunhos com regras próprias de encaixe, execução e recuperação. Um bloco desconectado não pode desaparecer nem se tornar código executável por acidente.
4. Validar projetos vazios, arquivos importados, funções aninhadas, múltiplos arquivos, blocos de código preservado, salvar/reabrir, desfazer/refazer e modo observador.
5. Comparar carregamento, arraste, busca e edição do Pac-Man com a versão anterior. Executar os mesmos testes de teclado, colisão e apresentação de pixels.

Entrega implementada: contorno Programa, índice pesquisável de funções/classes, definições recolhidas ao abrir, montagem dos corpos sob demanda e rascunhos persistentes fora da execução. O menu de cada instrução permite retirar um bloco para Rascunhos; o menu de uma pilha de rascunho permite inseri-la no fim do Programa. Ambos participam do histórico.

Os títulos “Preparação” e “Início” no desenho são ilustrativos: a interface conserva o encadeamento original do arquivo e usa as definições reais como pontos de navegação, sem inventar categorias semânticas para instruções intercaladas.

## Evidência de desempenho

No experimento inicial, usar somente o recolhimento nativo de funções do Blockly ainda deixou uma tarefa de 296 ms ao arrastar a raiz. A implementação retira do DOM os SVGs dos corpos recolhidos, mantendo o modelo completo para serialização, histórico e análise. Navegação, seleção na Ponte e tutor remontam os ancestrais necessários antes de revelar o alvo. Ao excluir/desfazer uma definição, a montagem verifica a identidade do novo SVG, além do ID do bloco.

O Pac-Man mantém seus 2.021 blocos e ganha a área Programa; na visão inicial, 147 dos 2.022 SVGs ficam montados. A migração e a navegação preservam a fonte. O relatório registra as medidas de interação e os limites do teste local.
