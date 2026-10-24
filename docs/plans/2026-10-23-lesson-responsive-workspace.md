# Aula responsiva e objetivos compactos

## Decisão aprovada

A orientação e a ferramenta usam a mesma árvore em todas as larguras. Onde as duas
colunas não cabem, a ferramenta vem abaixo da orientação, com 24 px de separação.
Saem as abas “Ver exemplo”/“Criar” e a cópia simplificada do diálogo. O Zappy original,
incluindo a opção de ouvir, continua no fluxo. Os editores permanecem montados durante
trocas de largura e de parte; a divisória só funciona no layout de duas colunas.

Os objetivos têm uma faixa com título, progresso e “Verificar esta parte” sempre
visíveis. O título é um controle acessível para abrir os detalhes, inicialmente
recolhidos. Uma verificação com objetivos pendentes abre a lista e suas dicas.
Resultados, desafios extras, XP e o aviso de edição posterior continuam funcionando.

O editor conserva a altura normal e ganha um piso de altura na tela expandida.
O contêiner expandido pode rolar, inclusive em janelas baixas, em vez de comprimir o
editor para acomodar objetivos, mensagens e envio. As cores e fontes seguem os tokens
existentes do Kids e do adulto; a separação acompanha o espaçamento de 24 px da aula.

## Implementação e verificação

- [x] Reproduzir a navegação por abas e a ausência de detalhes recolhíveis nos testes.
- [x] Unificar o empilhamento, preservar instâncias e remover o estado das abas.
- [x] Implementar a faixa de objetivos e proteger a altura útil do editor.
- [x] Exercitar progresso, dicas, resultados antigos e lifecycle nos testes existentes.
- [x] Medir layout, espaçamento, rolagem e expansão em navegador com tela larga,
  intermediária, estreita e baixa, sem alterar projetos reais do aluno.
- [ ] Revisar o diff, integrar em staging e acompanhar CI/deploy.
