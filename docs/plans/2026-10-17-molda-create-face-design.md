# Criar face ou linha

Pedido: criar uma face entre linhas selecionadas, como Create face or edge do Blockbench. O print mostra duas bordas separadas de uma abertura.

- Mostrar Criar face ou linha diretamente em Mudar a forma nos modos Linhas e Pontos, usando os componentes e tokens atuais.
- Dois pontos criam uma linha; três ou mais pontos criam uma face. Duas linhas separadas criam a face entre seus quatro extremos; linhas conectadas ou um contorno fechado também podem delimitar a face.
- A ordem segue um contorno existente quando possível, preservando concavidades e pontos intermediários. Seleções sem contorno completo usam ordenação espacial e devem respeitar todas as linhas explicitamente selecionadas.
- Reutilizar as validações de fechamento: área, plano, cruzamentos, orientação das faces vizinhas, duplicação, materiais, UV e orçamento. Preservar geometria e pintura existentes.
- Reutilizar a prévia das operações de malha, com Aplicar/Cancelar, seleção da parte criada e um passo de desfazer. Permissão model.mesh.
- Não copiar código do Blockbench: sua implementação GPL serve somente para entender o comportamento esperado.

Verificação: duas bordas opostas como no print; dois pontos; triângulo; contorno côncavo; seleção em ordem diferente; material misto; seleção inválida; cancelamento; histórico; criação seguida de Puxar no navegador.
