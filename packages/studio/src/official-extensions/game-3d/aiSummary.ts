export const gameThreeDPromptSummary = `Jogo 3D expõe window.SZGame3D e uma paleta de blocos 3D para iniciantes, em famílias:
Cena, céu e câmera · Objetos · Movimento · Controles · Encostar · Grupos · Placar, vida e
telas · Tempo e sorteio · Som · Kits prontos (Desvie, Travessia, Corrida, Empilhar e Plataforma).

COMEÇO RÁPIDO: prefira “Criar cena 3D em tela cheia”; ele cria e redimensiona o
canvas sozinho. Crie cena, objetos, luzes, modelos e grupos uma única vez, fora de
“A cada quadro da cena”. Dentro do quadro, mova, anime, aplique física e teste se
encostou. Vários blocos “A cada quadro” da mesma cena rodam em ordem.

FAÍSCA: use topDown(personagem, velocidade) no quadro: ele já anda, sem grupo.
walkArea(personagem,minX,maxX,minZ,maxZ) define caminhos em Ao iniciar; walkAnimations
escolhe parado/andando. onTouch(personagem,chave,()=>{...}) registra o encontro direto.
frameScene(cena,largura,altura,profundidade) enquadra o jogo também em painéis estreitos; quem joga dá zoom (rodinha), gira (arrastar) e volta (duplo clique), e as setas andam em relação à câmera.
Não usar listas, objetos literais, propriedades genéricas ou blocos intermediários no Faísca.
controlWithKeys mantém o contrato antigo de somente definir velocidade.

UNIDADES: velocidades são POR SEGUNDO (andar 3, pulo 5, gravidade 36) e ângulos em
GRAUS (girar 120 graus por segundo; 90 = um quarto de volta). “Mover/Girar de uma vez”
agem uma vez só; o giro contínuo é o “Girar … sem parar”.

CÂMERA: um bloco só, “Câmera da cena: ⟨modo⟩ ⟨objeto⟩” (segue de trás, segue de longe,
vê de cima, isométrica, 1ª pessoa, gira em volta). É um modo: escolha uma vez, em Ao
iniciar ou num evento; o último escolhido vale. “Distância da câmera” ajusta a que segue.

ÁREAS: o que só define uma receita (funções) fica em “🧩 Meus moldes”; crie os
recursos em “⚙️ Ao iniciar”; chapéus de tecla/clique em “⚡ Quando acontecer”;
“A cada quadro” e “A cada N segundos” em “🔁 Enquanto estiver rodando”.

MODELOS DO MOLDA: “Criar o objeto … com o modelo” (tamanho = lado maior); “Tocar a
animação ⟨nome⟩ em ⟨objeto⟩ repetindo/uma vez” usa os clipes feitos no Molda (no quadro,
pedir de novo só continua), “Parar a animação” e “⟨objeto⟩ terminou a animação?”. Cópias
de grupo animam sozinhas e a pintura animada do Molda anda sozinha.
Comandos contínuos ficam no corpo do quadro ou em funções chamadas por ele.

COORDENADAS: x = direita, y = altura, z = profundidade; chão e distância usam X-Z.

GRUPOS: “Criar grupo” guarda vários objetos; “Criar uma cópia de ⟨molde⟩ no grupo”
multiplica um molde escondido. Contar, para cada, tirar, esvaziar e podar valem para
todos. “está encostando em algum do grupo?” mede a caixa real de cada objeto.

DESEMPENHO E SEGURANÇA: o runtime ajusta o movimento ao tempo do quadro, descarta
GPU, eventos e áudio ao reiniciar e limita objetos, cópias, luzes, linhas, andares e
sons. Comandos ligados a um mundo usam só objetos do Jogo 3D; resultados de clique e
mira guardados em variáveis aparecem nesses seletores.

RECURSOS: o Kit Plataforma monta mapas de texto, temas, checkpoint, placar, eventos,
inimigos e câmera lateral; use-o como no exemplo Reino Cogumelo. Travessia e Corrida
congelam depois da derrota até o comando de recomeçar.

REGRAS DE JOGO: “Escrever no canto … da tela”, pontos, vida com corações (“Dar/Machucar/
Curar”, “Quando a vida de … acabar”), contagem, “Depois de N segundos”, sorteio, telas de
início/fim/vitória, “Fim de jogo: você perdeu/ganhou” e “Recomeçar o jogo” (os dois só
durante um laço, evento ou função), tremer a câmera e piscar. “Quando apertar a tecla”,
“Quando clicar ou tocar em” e “Quando … encostar em algum do grupo” são eventos. O núcleo é iniciante-3d e o resto aparece no
intermediário-3d. Não use JS cru quando houver um bloco equivalente.`
