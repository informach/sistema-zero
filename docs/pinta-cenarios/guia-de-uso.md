# Criar um cenário no Pinta

Crie ou abra um **Mapa** na galeria. As peças, cores, botões e colunas seguem o padrão do Pinta.
No celular, abra **Peças, camadas e detalhes** para acessar a coluna de edição.

Use **Baixar tudo** para guardar juntos os mapas conectados e todos os desenhos da galeria.
Os pacotes de cenário também percorrem as portas cujos destinos estão disponíveis.

**Começar** oferece terrenos, biblioteca e teste; **Criar mais** acrescenta seleção,
conjuntos e animações; **Avançado** mostra as propriedades técnicas. Recursos já usados
pelo mapa continuam visíveis nos níveis mais simples.

O editor cria até 256×256 células, 32 camadas e 256 peças por folha, respeitando o orçamento
total de 2.097.152 células. Aulas podem manter limites menores: nelas, a atividade continua
limitada a 128×128 células, oito camadas e 64 peças por folha, com aviso antes de ultrapassar.

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
   Esse pincel espalha **peças em células**. Para artes da biblioteca, escolha um objeto
   e use **Espalhar desenhos** em Criar mais: ajuste densidade, distância entre centros,
   variação e giro/espelho. Arraste para conferir e solte para colocar; Esc cancela.
   Veja [espalhar objetos e conjuntos](missao-completa-2026-11-18/espalhar-objetos.md).
6. Crie uma camada de objetos. Escolha ponto, retângulo, elipse, polígono ou caminho. Edite os
   pontos, posição, tamanho, giro e espelhos. O papel indica início, perigo, porta, caminho,
   inimigo ou região. Propriedades podem ser texto, número, booleano, inteiro, decimal, cor ou
   referência a outro objeto/desenho.
   Enquanto arrasta um objeto ou ajusta a opacidade de uma camada, **Esc** descarta
   o gesto inteiro. Um toque cancelado pelo navegador também descarta o gesto.
   Ao terminar, uma ação de **Desfazer** volta ao começo do movimento. Se o cenário
   mudar durante o gesto, comece novamente; a revisão recebida é preservada.
7. Selecione vários objetos com Shift ou arrastando no espaço vazio. Copie, recorte, cole,
   alinhe ou distribua. Referências entre objetos copiados acompanham as novas cópias.
8. Use a biblioteca para colocar desenhos com miniatura real. Selecione uma área de peças e
   escolha **Guardar conjunto**, ou guarde o modelo de um objeto. As instâncias vinculadas
   acompanham o conjunto original. **Soltar o conjunto** cria conteúdo independente; restaure
   o tamanho original e use giro de 90° para materializar as peças na grade. Conjuntos dentro
   de conjuntos precisam ser soltos antes de outro recorte.
   A inserção da biblioteca funciona por clique ou arrasto com prévia e respeita o encaixe
   escolhido. Soltar fora do palco ou pressionar Esc cancela o arrasto.
   Para guardar peças deslocadas como conjunto, alinhe à grade
   as camadas que atravessam o recorte. O Pinta recusa recortes de meias peças explicitamente.
9. Selecione uma peça para configurar os quadros e a duração da animação, terrenos e
   propriedades. Os quadros apontam para peças da mesma folha.
10. Use o minimapa para navegar e acompanhe o orçamento de células. **Testar com personagem**
    abre a cena com fundo, frente, colisão e animação. Setas e botões movem o personagem.
    Com o foco no minimapa, as setas movem a janela visível, PageUp/PageDown movem
    uma janela vertical e Home/End levam aos extremos. Enter/Espaço mantêm o centro
    atual; para pintar pelo teclado, volte o foco à grade do palco.

Para uma porta, use papel **porta** e propriedade `destino` com o nome ou identificador do
mapa de chegada da biblioteca. O ponto de papel **início** define a chegada. O teste prepara
até 16 mapas ligados. **Jogar meu mapa** cria um projeto editável no Studio, preservando as
ligações da biblioteca para atualizar os desenhos sem substituir a programação.

**Baixar** oferece backup nativo, PNG com dados do Pinta e projetos externos. Guarde o
`.pinta.json` para conservar a edição completa. Veja o [guia de exportação](exportacao.md).

No Estúdio com **Python/Pygame**, escolha **Cenário com outros lugares** ao trazer um mapa
do Pinta. Essa opção leva também os destinos das portas e aparece quando o ambiente Python
do projeto já tem o leitor atualizado. Com um leitor anterior, mapas simples continuam
disponíveis. Se o cenário usar recursos que ele não lê, o Estúdio avisa e conserva a imagem
anterior e o programa.
Um editor sem execução conectada também pode preparar o mundo para exportação no computador.
**Mapa com camadas e objetos**
continua disponível para trazer apenas um lugar; a imagem simples continua como antes.
Revisar um material existente conserva a opção escolhida anteriormente.
Quando aparecer esse aviso, você pode escolher a imagem simples explicitamente ou usar
**Baixar fonte** para levar o jogo e o leitor atual ao computador. A imagem simples não leva
os objetos e as colisões; o mapa original continua editável no Pinta.

O programa pode usar `mapa = pinta.carregar_mapa('vila')` e `mapa.ponto_inicial()`.
Quando o jogador atravessar uma porta, o programa chama `outro = mapa.abrir_destino(porta)`;
recebe um novo mapa e decide como posicionar o personagem. Uma porta sem destino retorna
`None`. Um destino ausente gera um erro claro. O texto da porta não abre arquivos do computador.
Editar apenas o mapa de chegada também atualiza o material vinculado, preservando seu nome
e o programa. Para exportar esse jogo Python com o leitor e os mapas, use **Baixar fonte**.

Se outra janela salvar uma versão antiga, o Pinta conserva o cenário confirmado e guarda
as mudanças atrasadas em um desenho com `-copia` no nome. Um aviso explica a recuperação.
Se você estiver editando, poderá continuar na cópia; os dois desenhos ficam na galeria,
mesmo sem conexão. Confira-os antes de remover uma cópia de que não precise mais.
Quando faltar espaço e aparecer erro ao salvar, a gravação anterior continua protegida;
libere espaço e tente novamente. Fechar a página antes da confirmação pode deixar mudanças
ainda não salvas, como em qualquer autosave.
