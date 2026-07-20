export const gameThreeDPromptSummary = `Jogo 3D expõe window.SZGame3D e uma paleta completa de blocos 3D para iniciantes.

COMEÇO RÁPIDO: prefira “Criar cena 3D em tela cheia”; ele cria e redimensiona o
canvas sozinho. Use “Criar cena no canvas” somente quando o projeto precisar de um
canvas HTML específico. Crie cena, objetos, luzes, modelos e enxames uma única vez,
fora de “A cada quadro 3D”. Dentro do quadro, mova, anime, aplique física e teste colisões.

ÁREAS: crie os recursos em “⚙️ Ao iniciar”; coloque chapéus de tecla/clique em
“⚡ Quando acontecer — Eventos”; coloque “A cada quadro 3D” e cadências em
“🔁 Enquanto estiver rodando — Loops”.

COORDENADAS: os blocos genéricos usam x = direita, y = altura e z = profundidade.
Movimento no chão e distância usam X-Z. Os kits Travessia e Corrida preservam suas
coordenadas internas de grade, mas os blocos genéricos continuam seguindo X-Z.

DESEMPENHO E SEGURANÇA: o runtime ajusta movimento ao tempo do quadro, descarta GPU,
eventos e contextos ao reiniciar, e limita objetos, luzes, enxames, linhas e andares.
Nunca crie recursos dentro do loop. Use remove/prune para itens temporários. A física
é AABB leve, feita na plataforma, sem biblioteca externa pesada.

RECURSOS: há primitivas, modelos compostos, materiais, luz/céu, controles, câmeras,
mira, corpos/colisões, enxames/som e kits Desvie, Travessia, Corrida e Empilhar. Use
assets apenas quando a criança escolher textura/modelo; exemplos visuais são feitos
com primitivas. Todos os blocos são iniciante-3d; cada aula filtra o subconjunto que
quer apresentar. Não use JS cru quando houver um bloco equivalente.`
