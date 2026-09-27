# Caderno único de Cadê Todo Mundo?

## Objetivo

Apresentar o Caderno do Aluno uma única vez, na segunda seção da Aula 1, como apoio de consulta para os passos das duas aulas. A Aula 2 apenas lembra onde encontrá-lo. Na seção de apresentação, a criança pode baixar o PDF junto ao vídeo ou folheá-lo num leitor 3D na outra coluna quando houver largura; nenhuma dessas ações condiciona o avanço.

## Decisões pedagógicas e de conteúdo

- A seção passa a se chamar **Seu Caderno do Aluno**. O vídeo mostra onde consultar o material, a capa, a página de orientação e como voltar à seção. As páginas com os passos existem para consulta, mas não são abertas no vídeo antes da primeira experiência para não antecipar a descoberta. Não chama o caderno de mapa nem trata o panorama do jogo como função principal.
- A capa e a página de panorama do próprio PDF deixam de usar “mapa do jogo” como rótulo. O panorama pode continuar, mas se apresenta como orientação breve antes das páginas com o passo a passo das Aulas 1 e 2.
- A fala da Aula 2 deixa de dizer que o PDF está naquela seção. Ela remete à seção **Seu Caderno do Aluno**, na Aula 1. Não há segundo bloco, anexo ou upload na Aula 2.
- Ler no navegador, baixar e imprimir são escolhas, não requisitos de conclusão. A seção continua exigindo somente o vídeo.

## Comportamento da interface

- O mesmo PDF privado, anexado uma vez à Aula 1, alimenta o item de download e o leitor. A referência ao arquivo continua sendo `attachmentId`; a localização privada não chega ao navegador.
- O bloco `materials` do caderno recebe uma opção explícita de prévia em livro. Na coluna de conteúdo, ele mostra o download sob o vídeo. Na coluna de consulta, o player mostra o livro 3D com alternativa de leitura por páginas, reaproveitando o leitor existente.
- A divisão usa a mesma régua responsiva e a mesma alça de redimensionamento das seções com Estúdio e cena. Sem largura suficiente, vídeo/download vêm primeiro e o livro depois. O leitor não vira uma aba “Criar”, pois é consulta, não ferramenta de criação.
- Antes de anexar o PDF, a prévia de autoria deve indicar que falta vinculá-lo, sem criar uma área vazia ou um erro opaco. Se o 3D não abrir no aparelho, a criança pode ler por páginas ou baixar.

## Implementação e dados

O manifesto e a importação continuam criando um só bloco `materials` na Aula 1, inicialmente com `items: []`. A opção de prévia pertence a esse bloco, não exige um `ebook` separado nem um segundo arquivo. O admin vincula um PDF ao item de arquivo como já faz hoje. O player identifica o PDF desse bloco e usa a rota autenticada de anexos para a leitura, mantendo a marca d'água existente. A Aula 2 retira o bloco `caderno` do manifesto e a importação aposenta sua chave antiga para que uma reimportação não deixe um bloco órfão no rascunho.

Os roteiros, notas de produção, documentação do curso, gerador dos manifestos e testes devem refletir a mesma sequência. Nenhum material ou trecho da Aula 2 deve afirmar que o download fica nela.

## Alternativas consideradas

1. **Repetir o PDF nas duas aulas:** simples na tela, mas exige dois vínculos/uploads e contradiz o ponto único de consulta. Rejeitada.
2. **Criar um bloco `ebook` separado na Aula 1:** reaproveita o visual existente, mas o manifesto não aceita `ebook` e o arquivo ainda não tem `attachmentId` na importação; obrigaria autoria manual adicional ou ampliação desnecessária do formato. Rejeitada.
3. **Um bloco de materiais com prévia de livro (escolhida):** um único arquivo e uma única configuração editorial, com dois modos de acesso na mesma seção. Exige adaptar a separação visual do player sem duplicar dados.

## Verificação

Validar o manifesto e o gerador, testar que só a Aula 1 contém o bloco, conferir a coluna do livro em largura larga e a ordem empilhada em largura estreita, o download/leitura do mesmo PDF protegido e a conclusão após 90% do vídeo sem abrir nem baixar. Conferir também a prévia antes do upload e a alternativa de leitura por páginas.
