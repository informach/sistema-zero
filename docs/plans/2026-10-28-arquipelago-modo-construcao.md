# Modo construção, quintal e projeto azul (Arquipélago Vagalume, Fase 1)

Cartões da página de acompanhamento: **fase1-10** (grade, paredes que se esticam, porta e janela,
corte das paredes), **fase1-11** (quintal, cerca, caminho, canteiro e cabana) e **fase1-12**
(projeto azul, a função pronta, e os moldes dos objetos). A galeria, o Pinta no molde e o
aconchego dos cômodos são os cartões seguintes (fase1-13 a fase1-15) e ficam fora daqui.

## O que a proposta pede (texto do Canvas, "Modo criação · a casa")

- O quarto da plataforma é o único cômodo com cor quando a criança chega. Daqui ela abre uma porta
  e desenha o resto: cozinha, sala, banheiro, quintal, cabana no bosque.
- **Construir é simples de propósito:** grade no chão e paredes que se esticam arrastando, como no
  quarto de hoje. Porta e janela em qualquer parede. O resto da casa nasce de uma porta nova no
  quarto. Fora de casa também: cercas, caminhos, canteiros, cabanas nas outras ilhas. Corte
  automático das paredes para ver dentro.
- A interface mostra os modos **Viver** e **Construir** (o Mapa é de outra fase).
- **Projeto azul:** o objeto chega com a função pronta e já funciona como holograma; fica completo
  quando ganha aparência. Exemplo da geladeira: veio do primeiro pedido, agora guarda 4 alimentos,
  com aparência guarda 12 e conserva. As saídas: comprar pronta na galeria, pintar no Pinta (a
  frente, os lados e o topo da caixa), modelar no Molda (abre no posto Explorador(a) de Mundos),
  usar uma criação guardada que cabe no molde. Feito por você não custa moeda.
- **Molde:** o objeto chega com o molde no tamanho e na proporção dele, a frente marcada e a função
  explicada. A moeda compra o visual pronto; a função vem dos pedidos e desafios.

## Decisões (a proposta não diz; escolhi o mínimo coerente)

| Pergunta | Decisão | Por quê |
|---|---|---|
| Onde se constrói | Num **lote** com grade de 1 célula em volta da casa, de x -13 a 14 e de z -12 a 8 (coordenadas do mundo, inteiras, alinhadas ao quarto) | É onde o chão da ilha é plano (medido com `alturaDaIlha`); o resto da ilha ondula e o piso da casa ficaria enterrado ou solto |
| O que já ocupa o lote | Varanda, horta, bancada, a árvore de (-9, 4) e o pé do farol ficam como **células ocupadas** (não se constrói em cima). Um teste confere que todo colisor do lote cai numa célula ocupada | Nada fica dentro de parede, e nada some |
| A casa de hoje (`casa.glb`) | Continua igual até a criança fazer a primeira obra. Na primeira obra, as paredes da frente e do lado direito do quarto viram paredes do kit (com a porta nova e as duas janelas no mesmo lugar), e dali em diante a casa é desenhada pelo kit. O quarto da plataforma, o revestimento de fora das paredes do quarto, o telhado do quarto e a varanda continuam vindo do `casa.glb` | O `casa.glb` tem as paredes num nó só: não dá para abrir uma porta nova nelas. As paredes da esquerda e do fundo são da plataforma (o papel de parede do Meu quarto) |
| Paredes do quarto | As da esquerda e do fundo são fixas (sem porta, sem janela). As da frente e da direita aceitam porta e janela, mas não se apagam | O quarto é o da plataforma e precisa continuar fechado |
| Lambri ou lisa | O jogo decide: parede com cômodo dos dois lados é **lisa**; com cômodo de um lado só, **lambri**, com a fachada para fora | A criança só desenha a parede; a casa fica certa sozinha |
| Cômodo | Células fechadas por paredes (o jogo acha sozinho, a partir da borda do lote). Cômodo novo nasce com piso de tábua; a ferramenta Piso troca o piso do cômodo inteiro | É como o quarto de hoje, onde o piso é do quarto todo |
| Porta | Abre sozinha quando a pessoa chega perto e fecha quando ela se afasta. Na porta de fora (lambri), abre para fora | Sem tecla nova para a criança; o vão nunca prende ninguém |
| Corte das paredes | No **Construir**, todas as paredes ficam cortadas (as peças `-baixa`). No **Viver**, dentro de casa, ficam cortadas as que estão entre a câmera e a pessoa; fora de casa, nenhuma | É o corte automático da proposta, como nos jogos de casa |
| Câmera no Construir | Uma câmera de obra (alta, gira, aproxima e anda pelo lote), que toma o lugar da câmera do jogo só enquanto o Construir está aberto | A câmera do jogo é de outra frente; o Construir não mexe nela |
| Peças que faltam no kit | **Cerca** e **canteiro do quintal** não existem em `arte/casa`: entram com formas do código (como as peças de antes) e ficam anotadas no README de `arte/casa` | Não mexo nos scripts de arte |
| Cabana | Um segundo lote, no Bosque dos Bichos, com o mesmo kit | "Cabana no bosque" (proposta) |
| Função de cada objeto | Geladeira: guarda 4 alimentos no projeto azul e 12 com aparência. "Conserva" fica para quando a comida estragar (hoje nada estraga). Forno, aquário, lareira, banda, fliperama, museu e casinha entram no catálogo com o molde e a função escrita; a função jogável de cada um entra com a ilha de cada um | Só a geladeira tem número na proposta |
| De onde vem cada objeto | Geladeira: o primeiro pedido entregue (hoje o da Capi, o único pedido do jogo). Casinha: adotar o bicho no Bosque. Os outros: com a ilha de cada um | "Veio do primeiro pedido da sua ilha"; "o Bosque dos Bichos a casinha" (README de `arte/objetos`) |
| Pinta e Molda | O painel do objeto pede `abrirFerramenta` com o molde do contrato. Ligar a criação à aparência é o cartão do Pinta no molde | A página ainda responde indisponível para esse molde |

## Onde cada parte mora

- **Contrato** (`arquipelago-contracts`): `objetos.ts` (os objetos da casa, o molde de cada um e a
  função) e `SalvamentoV4` em `salvamento.ts` (a construção e os projetos azuis), com
  `migrarDaV3`. O serviço guarda a V4 sem mudar nada além do contrato (ele valida pelo
  `SalvamentoSchema`).
- **Regras puras** (`arquipelago/src/sistemas/construcao/`): `grade.ts` (lote, células ocupadas,
  arestas), `paredes.ts` (esticar, apagar, juntar trechos), `comodos.ts` (cômodos fechados,
  lambri ou lisa, lado de dentro), `pecas.ts` (as peças do kit com posição e giro, as quinas e o
  corte), `aberturas.ts` (porta e janelas), `colisao.ts` (colisores da obra), `quintal.ts`,
  `objetos.ts` (projeto azul).
- **Mundo** (`src/mundo/obra.tsx` e vizinhos): a casa construída com as peças do kit, montada pela
  `Casa` (a `Cena` não muda).
- **Interface** (`src/interface/construir.tsx`): o botão Viver e Construir, as ferramentas e a
  câmera de obra.

## Etapas (cada uma fecha sozinha, com testes e print do playground)

1. **Salvamento V4 e catálogo dos objetos.** Contrato com a construção vazia, os projetos azuis e
   os moldes; migração da V3; testes do contrato e do serviço.
2. **Regras da grade.** Lote, células ocupadas, esticar parede, apagar, cômodos, lambri ou lisa,
   quinas, porta e janelas, colisores. Só funções puras com testes.
3. **A casa construída no mundo.** As peças do kit (paredes, quinas, portas, janelas, pisos), a
   colisão, a porta que abre ao chegar perto, as janelas acesas à noite e a troca da casa de antes
   pela construída.
4. **O modo Construir.** Viver e Construir no HUD; o personagem para; a câmera de obra; a grade; as
   ferramentas Parede (arrastar), Porta, Janela, Piso e Apagar; toque e teclado.
5. **Corte das paredes e telhado.** O corte no Construir e no Viver; o telhado dos cômodos
   retangulares, escondido dentro de casa e no Construir.
6. **Quintal.** Cerca, caminho de pedra, grama e canteiro que planta e rega como a horta.
7. **Cabana no Bosque.** O lote do Bosque com o mesmo kit. Em 28/10/2026 a dona aprovou crescer o
   Bosque para o lado de fora (a ponta de campo do −x do modelo, longe da chegada da ponte): o lote
   fica lá, de x −18 a −12 e de z −4 a 4 (6 × 8 células), com as âncoras `lote-cabana-a` e `-b`. O
   Construir na cabana trabalha no referencial da ilha (girada no mundo) e grava em
   `construcao.cabanas.bosque`.
8. **Projeto azul.** Ganhar a geladeira e a casinha, pôr o objeto no Construir, o holograma
   funcionando (a geladeira guarda 4), o painel do objeto com a função, o molde e o pedido ao Pinta
   e ao Molda.

## Riscos

- **Salvamento grande:** o teto é 64 KB. Paredes e cercas vão em trechos, o piso é por cômodo e
  cada lote tem tetos de quantidade no jogo, conferidos por teste no pior caso.
- **Desempenho:** cada peça é uma cópia do nó do GLB. Os tetos do lote seguram o número de peças;
  se pesar, as paredes viram `InstancedMesh`.
- **Enfeites do terreno:** capim e flores do `terreno.glb` podem aparecer por cima do piso. Se
  aparecer, fica anotado no README de `arte/mundo` (não mexo nos scripts).
