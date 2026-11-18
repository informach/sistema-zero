# Criar um cenário no Pinta

Crie ou abra um **Mapa** na galeria. As peças, cores, botões e colunas seguem o padrão do Pinta.
No celular, abra **Peças, camadas e detalhes** para acessar a coluna de edição.

Use **Baixar tudo** para guardar juntos os mapas conectados e todos os desenhos da galeria.
Os pacotes de cenário também percorrem as portas cujos destinos estão disponíveis.

**Começar** oferece terrenos, biblioteca e teste; **Criar mais** acrescenta seleção,
conjuntos e animações; **Avançado** mostra as propriedades técnicas. Recursos já usados
pelo mapa continuam visíveis nos níveis mais simples.

O editor cria até 128×128 células, oito camadas e 64 peças por folha. Projetos importados
podem conservar até 256×256, 32 camadas e 256 peças, respeitando o orçamento do documento;
isso não libera criar novas camadas acima do limite de autoria.

1. Escolha **Começar**, **Criar mais** ou **Avançado** em **Criar do meu jeito**. As ferramentas
   permitidas pela atividade continuam valendo em todos os níveis.
2. Escolha uma camada e as peças dela. Pinte com lápis, linha, retângulo ou balde. Use os
   controles de espelho/giro para orientar o carimbo antes de pintar.
3. Em **Camadas**, crie grupos e camadas, dê nomes, mude a ordem e escolha o grupo. O cadeado
   protege o conteúdo. Opacidade, deslocamento e distância permitem compor planos. Marque
   **frente** para passar por cima do personagem; use uma camada de colisão para limites invisíveis.
4. Em **Terreno inteligente**, escolha ou configure um terreno de canto, borda ou misto. As
   peças precisam ter as combinações Wang correspondentes. Pincel, linha, retângulo, balde e
   borracha atualizam também os vizinhos. Uma combinação ausente é informada antes de gravar.
5. Para distribuir detalhes, ative **Espalhar com o pincel**, escolha densidade e semente. A
   mesma semente reproduz a distribuição da prévia.
   Esse pincel espalha **peças em células**. Espalhar objetos com afastamento ainda está pendente.
6. Crie uma camada de objetos. Escolha ponto, retângulo, elipse, polígono ou caminho. Edite os
   pontos, posição, tamanho, giro e espelhos. O papel indica início, perigo, porta, caminho,
   inimigo ou região. Propriedades podem ser texto, número, booleano, inteiro, decimal, cor ou
   referência a outro objeto/desenho.
7. Selecione vários objetos com Shift ou arrastando no espaço vazio. Copie, recorte, cole,
   alinhe ou distribua. Referências entre objetos copiados acompanham as novas cópias.
8. Use a biblioteca para colocar desenhos com miniatura real. Selecione uma área de peças e
   escolha **Guardar conjunto**, ou guarde o modelo de um objeto. As instâncias vinculadas
   acompanham o conjunto original. **Soltar o conjunto** cria conteúdo independente; restaure
   o tamanho original e use giro de 90° para materializar as peças na grade. Conjuntos dentro
   de conjuntos precisam ser soltos antes de outro recorte.
   A inserção da biblioteca é por clique e respeita o encaixe escolhido; arrasto com prévia
   ainda não está disponível. Para guardar peças deslocadas como conjunto, alinhe à grade
   as camadas que atravessam o recorte. O Pinta recusa recortes de meias peças explicitamente.
9. Selecione uma peça para configurar os quadros e a duração da animação, terrenos e
   propriedades. Os quadros apontam para peças da mesma folha.
10. Use o minimapa para navegar e acompanhe o orçamento de células. **Testar com personagem**
    abre a cena com fundo, frente, colisão e animação. Setas e botões movem o personagem.

Para uma porta, use papel **porta** e propriedade `destino` com o nome ou identificador do
mapa de chegada da biblioteca. O ponto de papel **início** define a chegada. O teste prepara
até 16 mapas ligados. **Jogar meu mapa** cria um projeto editável no Studio, preservando as
ligações da biblioteca para atualizar os desenhos sem substituir a programação.

**Baixar** oferece backup nativo, PNG com dados do Pinta e projetos externos. Guarde o
`.pinta.json` para conservar a edição completa. Veja o [guia de exportação](exportacao.md).
