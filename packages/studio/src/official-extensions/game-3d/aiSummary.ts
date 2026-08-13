export const gameThreeDPromptSummary = `Jogo 3D expõe window.SZGame3D e uma paleta completa de blocos 3D para iniciantes.

COMEÇO RÁPIDO: prefira “Criar cena 3D em tela cheia”; ele cria e redimensiona o
canvas sozinho. Use “Criar cena no canvas” somente quando o projeto precisar de um
canvas HTML específico. Crie cena, objetos, luzes, modelos e enxames uma única vez,
fora de “A cada quadro 3D”. Dentro do quadro, mova, anime, aplique física e teste colisões.
Vários blocos “A cada quadro 3D” da mesma cena são combinados e rodam em ordem.

ÁREAS: o que só define uma receita fica em “🧩 Meus moldes”;
crie os recursos em “⚙️ Ao iniciar”; coloque chapéus de tecla/clique em
“⚡ Quando acontecer”; coloque “A cada quadro 3D” e cadências em
“🔁 Enquanto estiver rodando”.
Comandos contínuos ficam no corpo do quadro ou em funções/métodos chamados por
ele, nunca diretamente em Ao iniciar, eventos ou construtores.

COORDENADAS: os blocos genéricos usam x = direita, y = altura e z = profundidade.
Movimento no chão e distância usam X-Z. Os kits Travessia e Corrida preservam suas
coordenadas internas de grade, mas os blocos genéricos continuam seguindo X-Z.

DESEMPENHO E SEGURANÇA: o runtime ajusta movimento ao tempo do quadro, descarta GPU,
eventos e áudio ao reiniciar, e limita objetos, luzes, enxames, linhas, andares e
sons simultâneos. Grupo de inimigos e enxame são recursos diferentes e usam
seletores separados. Transformações genéricas aceitam objetos Three.js crus,
mas comandos ligados a um mundo usam somente objetos do Jogo 3D. Resultados de
clique e mira guardados em variáveis aparecem nesses seletores.
Crie recursos persistentes fora do loop. Cópias temporárias de enxame podem nascer
no quadro quando remove/prune também fizer parte do fluxo. A física é AABB leve,
feita na plataforma, sem biblioteca externa pesada.

RECURSOS: há primitivas, modelos compostos, materiais, luz/céu, controles, câmeras,
mira, corpos/colisões, enxames/som e kits Desvie, Travessia, Corrida, Empilhar e
Plataforma. O Kit Plataforma monta mapas de texto, temas, checkpoint, placar,
eventos, inimigos e câmera lateral; use-o como no exemplo Reino Cogumelo.
O último modo de câmera escolhido substitui o anterior. Travessia e Corrida
congelam depois da derrota até o comando de recomeçar. Cópias de enxame podem
ser selecionadas pelo ponteiro, e o comando de parar só cabe durante um loop,
evento ou função da partida. Use
assets apenas quando a criança escolher textura/modelo; exemplos visuais são feitos
com primitivas. Todos os blocos são iniciante-3d; cada aula filtra o subconjunto que
quer apresentar. Não use JS cru quando houver um bloco equivalente.`
