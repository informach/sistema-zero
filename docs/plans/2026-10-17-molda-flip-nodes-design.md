# Virar peças e grupos no Molda

O usuário solicitou o equivalente a Transform > Flip X/Y/Z do Blockbench para peças e grupos inteiros. O painel da seleção terá uma seção Virar com três botões de eixo e a opção Manter no lugar. O padrão reflete a seleção através do eixo zero da oficina; a opção usa o centro dos limites da seleção.

A operação altera a transformação das raízes selecionadas, uma única vez, preservando a hierarquia, a geometria paramétrica, materiais, UVs, imagens, pivôs locais e identidades. Grupos levam seus filhos juntos. Os planos de espelhos procedurais da seleção também são refletidos quando necessário. Todos os itens afetados precisam estar destravados. Uma malha com ossos e seus ossos precisam participar da mesma reflexão.

Os campos de posição, tamanho, giro e pivô aceitam transformações refletidas. Tamanho continua positivo e seu ajuste conserva o sinal da reflexão; o canto de referência do pivô acompanha o eixo invertido. A decomposição estrita de gestos de animação mantém a regra existente de não atravessar uma escala zero ou mudar sua orientação implicitamente.

Usar uma transformação afim mantém a precisão de grupos rotacionados ou com cisalhamento; converter toda a malha para mover seus pontos perderia a edição paramétrica e complicaria recursos compartilhados. Uma cópia espelhada continua no recurso Espelhos existente. A ação passa pelo comando e histórico atuais, com uma entrada de desfazer.

Verificar os três eixos, reflexão repetida, seleção de pai e filho, pais transformados, recursos compartilhados, espelhos com deslocamento, bloqueios e vínculos de ossos. No navegador, virar uma peça e um grupo, manter no lugar, desfazer/refazer e testar o painel com os tokens existentes. Rodar testes, typecheck, Biome e build.
