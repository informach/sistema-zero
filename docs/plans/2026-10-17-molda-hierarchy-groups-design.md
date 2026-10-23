# Molda: organização de peças em grupos

Proposta aprovada pelo usuário em 17/10/2026: agrupar junto da lista de peças, grupos e subgrupos recolhíveis, renomeação direta e arrastar peças entre grupos, preservando posição e desfazer.

## Interface

- Levar Agrupar, Separar grupo e Escolher várias do detalhe lateral para a lista de peças.
- Manter pastas, indentação, visibilidade e cadeados com os tokens existentes.
- Renomear na árvore por duplo clique ou F2; Enter confirma e Escape cancela.
- Arrastar a seleção para uma pasta; oferecer um destino raiz para retirar peças dos grupos.
- Oferecer também Mover para grupo por um seletor nativo, utilizável por toque e teclado.

## Comportamento

Reutilizar os comandos de agrupamento e mudança de pai do documento. Cada organização deve gerar um único passo de desfazer e preservar as matrizes mundiais e os recursos das peças. Não aceitar ciclos, destinos travados ou mudanças incompatíveis com animações. Arrastos pertencem à versão da árvore em que começaram e não podem escrever depois que essa versão muda.

## Implementação e verificação

1. Preparar destinos válidos com as regras existentes do grafo e das animações.
2. Separar a organização e os eventos de arrasto da renderização das linhas.
3. Integrar controles junto da hierarquia e retirar os controles duplicados da coluna esquerda.
4. Testar agrupamento, subgrupos, renomeação, cancelamento, destinos inválidos e desfazer.
5. Testar arrastar e seletor no navegador real, comparar matrizes antes/depois e verificar layout em telas pequenas, temas claro/escuro e persistência do projeto.
