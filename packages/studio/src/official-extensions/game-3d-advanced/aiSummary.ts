/** Resumo operacional; o manual da API permanece disponível no provider sob demanda. */
export const gameKit3DPromptSummary = `Jogo 3D Avançado expõe window.SZGameKit3D.
Use blocos e os termos objeto, molde, tirar do jogo e jorro de faíscas com a criança.
A identidade das telas e das regras comuns é compartilhada com os outros jogos 3D.

RECEITA: setup em ⚙️ Ao iniciar; defineMold(nome,{health,speed},()=>{part(...)}) em
🧩 Meus moldes; setPhysics e receitas uma vez. onEnterState('jogando',()=>{...}) faz
nascer a partida com spawn. O ciclo de vida gerenciado registra a fábrica com
runProject e chama start uma vez; recomeçar recria a partida sem outro renderer.
Eventos em ⚡ Quando acontecer; onUpdate e cérebros em 🔁 Enquanto estiver rodando.
Não montar o mundo, registrar eventos ou criar moldes em onUpdate.

CENÁRIO DO MOLDA: loadScene("id-estavel") em Ao iniciar, após setup, traz a cena
completa. sceneStart(objeto) usa seu início; durante o preparo espera a base nova.
O primeiro preparo pausa a simulação; uma troca conserva a base até o sucesso.
Não sobrepor piso aos recortes. Os moldes, controles e câmera continuam do motor.
A água visual não acrescenta nado. Velocidades por segundo, coordenadas em metros,
Y vertical, chão X-Z. Não aumentar escala/velocidade para esconder defeitos.

OBJETOS: handles vivos por geração; recycle invalida o handle antigo, mesmo se
um mesh do pool for reutilizado. Use exists antes de guardar referências longas.
FSM por molde: onEnterEntityState, onEntityStateUpdate, setEntityState, stateOf.
setStateAnim vincula clipes aos estados; playAnim, stopAnim e onAnimEnd usam os
nomes reais dos clipes. Cópias de modelos possuem esqueleto/animação próprios.
setPhysics, fall, jump, onGround, makeSolid e makeTrigger preservam colisões,
rampas, plataformas móveis e sensores. moveWithKeys segue a câmera; faceVelocity
orienta o objeto. Não substituir a física por place a cada quadro.

CÂMERA: cameraFollow, cameraOrbit, cameraTop e primeira pessoa são modos existentes;
cameraLookAt/Point escolhem o foco, cameraSmooth a resposta. Não criar outra câmera
ou RAF. Mouse e seleção usam as consultas do motor. Inputs ficam nos eventos/quadro.

REGRAS: placar, vida, mochila, recorde local, fases, vitória, derrota, pausa,
temporizadores e sorteio usam as APIs/blocos existentes. Mochila é bag/bagValue;
não inventar armazenamento paralelo. Assets do projeto fornecem modelos, imagens,
HDR e áudio; não buscar recursos arbitrários na rede. Para assinaturas completas,
efeitos, otimização, limites e exemplos, carregar o manual detalhado da extensão.
`
