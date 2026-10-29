# Levantamento técnico: física 3D profissional com Rapier

**Tema:** água, troncos, cipós, escorregadores, casas na árvore e cenários interativos 3D  
**Foco:** jogos para navegador com JavaScript/TypeScript, Three.js e Rapier  
**Atualizado em:** 28 de outubro de 2026

## 1. Visão geral

Os jogos 3D profissionais normalmente **não simulam a natureza por completo**. Eles combinam três camadas:

1. **Física simulada:** gravidade, massa, colisões, atrito, forças, impulsos e articulações.
2. **Física controlada:** regras de jogo que corrigem ou substituem a simulação para obter movimentos divertidos, previsíveis e estáveis.
3. **Representação audiovisual:** shaders, ondulações, partículas, animações, som e efeitos que tornam o comportamento convincente sem uma simulação física completa.

**Princípio central:** buscar **realismo percebido**, e não necessariamente realismo científico. Uma corda precisa balançar de maneira coerente; um tronco precisa boiar e reagir ao peso; um escorregador precisa gerar uma descida suave. Tudo isso pode ser feito com física seletiva.

### 1.1. Papéis das bibliotecas

- **Rapier:** motor de física para corpos rígidos, colisões, juntas, sensores, forças e, nas versões atuais documentadas, corpos deformáveis.
- **Three.js:** renderização 3D, modelos, materiais, câmeras, iluminação, efeitos visuais e shaders.
- **Código do jogo:** água, flutuação, correnteza, estados do personagem, quebra de objetos, regras de interação e sincronização entre física e gráficos.

> Atenção: a documentação atual do Rapier menciona `SoftBodyDesc.rope(...)`, `World.createSoftBody(...)` e anexação de partículas a corpos rígidos. Antes de implementar, confirmar a versão exata de `@dimforge/rapier3d` instalada e a disponibilidade dessas APIs no pacote usado.

## 2. Como os jogos profissionais trabalham

| Necessidade | Técnica comum | Estratégia com Rapier |
|---|---|---|
| Objetos caindo ou rolando | Corpo rígido + colisores | `RigidBody` dinâmico + `Collider` |
| Piso, árvore e terreno | Colisores estáticos | Cubo, cápsula, malha triangular ou terreno |
| Personagem caminhando | Controle cinemático | `CharacterController` + regras de movimento |
| Portas, balanços e mecanismos | Restrições e articulações | `RevoluteJoint`, `SphericalJoint` e outras juntas |
| Rio ou lago | Shader + aproximação da flutuação | Renderização da água + forças por pontos de empuxo |
| Cordas e cipós | Partículas e restrições | `SoftBody` ou cadeia de corpos/juntas |
| Escorregadores | Gravidade, atrito e movimento assistido | Collider da rampa + estado `sliding` |
| Objetos quebráveis | Fragmentação preparada | Partes rígidas ativadas quando ocorrer ruptura |
| Tecidos e redes | Física deformável | `SoftBody` nas versões compatíveis |
| Vento | Forças e animações | Campo de vento + forças seletivas + shader |
| Fogo e materiais reativos | Sistema de estados próprio | Lógica do jogo, partículas e mudanças de materiais |

**Referências de mercado:**

- **The Legend of Zelda: Breath of the Wild:** a equipe buscou regras físicas coerentes, mas precisou limitar certos resultados excessivamente realistas que prejudicavam a experiência. A lição é criar regras gerais consistentes, com ajustes deliberados de jogabilidade.
- **Assassin's Creed IV: Black Flag:** a navegação foi projetada para transmitir peso, movimento das ondas e ação do vento sem exigir controles náuticos excessivamente complexos. A lição é separar plausibilidade física de dificuldade de controle.
- **Unreal Engine:** o componente de flutuação utiliza *pontoons* (esferas distribuídas pelo objeto) para aproximar o empuxo de forma econômica. O componente de cabos utiliza partículas e restrições de distância.

## 3. Água, rios e lagos

### 3.1. Divisão em quatro sistemas

**A. Aparência da água (Three.js)**

- Superfície com material ou shader.
- Ondas, reflexos, transparência, espuma e variação de cor por profundidade.
- Ondulação e respingos nos pontos onde objetos encostam na água.

**B. Volume e detecção (Rapier)**

- Uma região/sensor representa o volume de água.
- O jogo detecta quando um objeto entra, permanece ou sai desse volume.
- O sensor não precisa ser a mesma geometria usada para renderizar a superfície.

**C. Flutuação (código do jogo + Rapier)**

- Aproximação do volume submerso por um ou mais pontos, esferas ou segmentos.
- Cálculo de forças ascendentes, aplicadas aos corpos dinâmicos.
- Amortecimento vertical e angular para evitar oscilações exageradas.

**D. Correnteza (código do jogo + Rapier)**

- Um campo de velocidade descreve a direção e intensidade do rio em cada posição.
- Uma força depende do movimento relativo entre a água e o objeto.
- Podem existir regiões de redemoinho, correnteza mais forte e águas calmas.

### 3.2. Física da flutuação

A lei de Arquimedes oferece a referência:

`F_empuxo = densidade_agua × gravidade × volume_submerso`

Na prática, em vez de determinar o volume exato de uma malha 3D complicada, usamos aproximações.

**Exemplo: tronco comprido boiando**

1. O tronco é um corpo rígido dinâmico, com collider de cápsula ou cilindro, conforme o formato.
2. Quatro pontos de flutuação ficam distribuídos ao longo do objeto.
3. Em cada passo físico, calculamos quanto cada ponto está submerso.
4. Aplicamos forças ascendentes nesses pontos; forças aplicadas fora do centro de massa também influenciam a rotação.
5. Aplicamos amortecimento e força de correnteza.
6. Atualizamos efeitos de ondas e respingos no renderizador.

**Resultados desejados:** tronco que cai, bate na água, boia, inclina quando recebe peso, gira e é carregado rio abaixo. Uma pedra densa deve tender a afundar; uma caixa de madeira vazia pode permanecer à superfície.

**Cuidados:** densidade, massa e volume precisam ser coerentes; não devemos assumir que todo objeto de madeira sempre flutua, nem que massa isoladamente determina se algo afunda.

### 3.3. Personagem nadando

O personagem pode ter estados de movimento específicos:

`grounded -> falling -> entering_water -> swimming -> exiting_water`

No modo de natação:

- Reduzir o efeito da gravidade sobre o movimento controlado.
- Aplicar resistência e aceleração próprias da água.
- Permitir subir, descer e mover-se horizontalmente.
- Incorporar correnteza.
- Usar animações, respingos e áudio.

Se o personagem for cinemático, essas regras devem ser implementadas no controlador: a água não vai empurrá-lo automaticamente como faria com um corpo dinâmico.

**Não é necessário começar com fluidos por partículas (SPH/FLIP).** Essas abordagens podem consumir muito processamento e aumentar muito a complexidade do projeto. Para rios e lagos de jogos web, superfície visual + empuxo + correnteza costumam oferecer uma relação melhor entre custo e resultado.

## 4. Cipós, cordas, balanços e pontes suspensas

Existem três níveis possíveis:

### 4.1. Cipó jogável com pêndulo controlado

- Ponto de fixação no alto da árvore.
- Comprimento máximo do cipó.
- Movimento do jogador projetado para respeitar esse comprimento.
- Gravidade gerando balanço.
- Controle limitado para ganhar impulso.
- Soltura preservando a velocidade tangencial.

**Indicação:** personagem que agarra um cipó e atravessa um abismo. É a alternativa mais estável para uma mecânica de plataforma.

### 4.2. Cipó físico com juntas

- Representar o cipó por segmentos rígidos curtos.
- Conectar segmentos por juntas esféricas ou outras restrições apropriadas.
- Prender uma extremidade a um corpo fixo.
- Usar renderização suavizada para esconder a aparência segmentada.

**Vantagem:** funciona mesmo sem o recurso de corpos deformáveis da versão instalada.  
**Desvantagem:** muitos segmentos e juntas podem afetar estabilidade e desempenho.

### 4.3. Corda deformável com SoftBody

A documentação atual do Rapier JavaScript apresenta:

- `SoftBodyDesc.rope(...)` para criar cordas.
- `setPinnedParticles(...)` para prender partículas.
- `setSoftness(...)` para ajustar restrições/deformação.
- `World.createSoftBody(...)` para inserir no mundo físico.
- `attachParticle(...)` para conectar a corda a um corpo rígido.

**Indicação:** cipós soltos, cordas, redes ou estruturas em que a própria deformação seja importante. É necessário verificar a versão instalada e a interação com o controle do personagem.

### 4.4. Pontes de madeira e corda

- Tábuas como corpos rígidos.
- Juntas entre tábuas ou conexão das tábuas a cabos.
- Cabos visuais ou deformáveis, conforme a importância da interação.
- Oscilação limitada para não causar instabilidade.
- Pontos de ruptura para tábuas e fixações.

**Regra de desempenho:** nem toda corda precisa colidir com todos os objetos. Colisões de partículas, autorcolisão e muitas juntas devem ser habilitadas apenas quando realmente necessárias.

## 5. Escorregadores, rampas e tobogãs

### 5.1. Física básica

Em uma rampa reta, uma aproximação da aceleração durante o deslizamento, considerando atrito cinético, é:

`a = g × (sen(theta) - mu × cos(theta))`

Onde:

- `g` = aceleração da gravidade.
- `theta` = ângulo da rampa.
- `mu` = coeficiente de atrito cinético.

Isso descreve uma situação idealizada. Curvas, contato variável, impactos e o controle do personagem exigem regras adicionais.

### 5.2. Objetos físicos

Caixas, pedras e outros corpos dinâmicos podem descer uma rampa usando gravidade, contato e atrito. Ajustamos os materiais físicos e os colliders.

### 5.3. Personagem jogável

Um `CharacterController` cinemático **não é acelerado automaticamente pela gravidade e pelo atrito** como um corpo dinâmico. Por isso, propomos um estado `sliding`:

1. Detectar a entrada na superfície de deslizamento.
2. Identificar a direção descendente local da rampa.
3. Calcular e acumular velocidade ao longo da superfície.
4. Aplicar curva, frenagem ou impulso quando fizer sentido.
5. Resolver o movimento contra a geometria, evitando atravessar paredes.
6. Sair do estado ao chegar ao solo, saltar ou perder contato com a pista.

**Indicação:** tobogãs curvos, escorregadores infantis, rampas com lançamentos e descidas por troncos ocos.

**Cuidado:** evitar colliders formados por triângulos muito finos, quinas e emendas que prendem o personagem. Em cenários estáticos, um collider de malha triangular pode ser adequado; para obstáculos dinâmicos complexos, preferir formas convexas ou composição de colliders.

## 6. Casas na árvore e construções interativas

Não é necessário simular cada peça estrutural da casa em tempo integral.

| Parte da casa | Solução recomendada |
|---|---|
| Tronco principal | Collider estático |
| Piso e paredes | Colliders estáticos simplificados |
| Porta | Corpo dinâmico + junta de rotação |
| Escada fixa | Collider + modo de subida |
| Escada de cordas | Estrutura simples, animação ou soft body conforme necessidade |
| Ponte suspensa | Tábuas rígidas + juntas/cabos |
| Plataforma móvel | Corpo cinemático |
| Elevador | Movimento controlado, com efeitos de roldana |
| Caixas e barris | Corpos dinâmicos |
| Galho quebrável | Mudança de estado + ativação de fragmentos físicos |
| Alçapão | Junta de rotação com trava/destrava |

### 6.1. Quebra e destruição

Para quebrar uma tábua ou um galho, uma técnica econômica é:

1. Exibir inicialmente o objeto inteiro.
2. Definir uma condição de quebra: impacto, peso, dano ou gatilho.
3. Substituir o objeto por peças já preparadas ou liberar juntas.
4. Ativar os corpos dinâmicos das partes soltas.
5. Aplicar impulsos e efeitos de poeira, lascas e som.

Esse sistema é muito mais previsível que tentar fraturar arbitrariamente qualquer malha durante o jogo.

## 7. Outros elementos do cenário

| Elemento | Ideia de implementação |
|---|---|
| Pedras rolando | Corpos dinâmicos, atrito e inclinação |
| Frutas caindo | Corpo dinâmico ativado quando desprendido |
| Caixas empilhadas | Colliders convexos e massa ajustada |
| Balanço preso a árvore | Juntas ou pêndulo controlado |
| Galhos flexíveis | Animação, mola simplificada ou soft body |
| Folhas ao vento | Shader, partículas ou animação; sem collider por folha |
| Cachoeira | Shader/partículas + campo de força na água |
| Roda d'água | Junta de rotação + torque calculado |
| Ponte que desaba | Juntas rompíveis ou partes pré-fragmentadas |
| Elevador de madeira | Corpo cinemático + controles de início e parada |
| Caverna com terreno irregular | Collider estático de malha/heightfield conforme geometria |

## 8. Físicas nativas e sistemas que precisam ser criados

| Funcionalidade | O Rapier fornece? | Trabalho nosso |
|---|---|---|
| Gravidade e colisão | Sim | Configurar corpos e colliders |
| Força, torque e impulso | Sim | Calcular quando aplicar |
| Atrito e restituição | Sim | Definir valores por material |
| Juntas e mecanismos | Sim | Projetar conexões e limites |
| Sensores de áreas | Sim | Interpretar eventos |
| Personagem cinemático | Sim, como base | Programar estados e controles |
| Cordas deformáveis | Sim, nas APIs atuais documentadas | Validar versão, ajustar e renderizar |
| Flutuação em rio | Não pronta como sistema universal | Calcular empuxo e amortecimento |
| Correnteza | Não pronta como rio completo | Implementar campo de velocidade |
| Ondas/reflexos da água | Não | Shader e efeitos no Three.js |
| Natação | Não pronta | Implementar locomoção aquática |
| Escorregador jogável | Parcialmente | Estado próprio de deslizamento |
| Destruição de construções | Parcialmente | Regras e fragmentos |
| Propagação de fogo | Não | Sistema de materiais e estados |

## 9. Arquitetura sugerida para o projeto

```text
GameWorld
├── PhysicsWorld (Rapier)
│   ├── RigidBodies
│   ├── Colliders
│   ├── Sensors
│   ├── Joints
│   └── SoftBodies (quando disponíveis)
├── CharacterSystem
│   ├── Walk / Run / Jump
│   ├── Swim
│   ├── Slide
│   ├── Climb
│   └── Swing
├── EnvironmentPhysics
│   ├── WaterVolume
│   ├── BuoyancySystem
│   ├── CurrentField
│   ├── WindField
│   ├── BreakableObjects
│   └── PhysicalMaterials
├── RenderWorld (Three.js)
│   ├── WaterShader
│   ├── RopeMeshes
│   ├── ParticleEffects
│   └── SceneMeshes
└── InteractionSystem
    ├── Grab / Release
    ├── Push / Pull
    ├── Enter / Exit Zones
    └── Trigger Mechanisms
```

### 9.1. Catálogo de materiais físicos

Definir propriedades reutilizáveis por tipo de material:

| Material | Propriedades de projeto |
|---|---|
| Madeira | Densidade configurável, atrito, possibilidade de boiar, resistência |
| Pedra | Densidade maior, baixa flutuação, impacto forte |
| Metal | Densidade, restituição, som próprio |
| Borracha | Atrito elevado e elasticidade |
| Gelo | Atrito muito baixo |
| Corda | Flexibilidade, resistência e limite de ruptura |
| Água | Densidade, correnteza, viscosidade simplificada |

Esses valores devem ser **calibrados** para o mundo e para a jogabilidade; não basta escolher uma etiqueta de material. Um tronco oco, por exemplo, pode ter comportamento diferente de um bloco maciço.

### 9.2. Ordem de atualização por passo físico

1. Ler entradas do jogador e atualizar o estado de locomoção.
2. Calcular forças ambientais para corpos dinâmicos: empuxo, correnteza e vento.
3. Aplicar forças e impulsos conforme a API do Rapier.
4. Resolver o movimento desejado dos personagens cinemáticos.
5. Avançar o mundo físico em um **passo de tempo fixo**.
6. Ler posições/rotações, colisões e eventos.
7. Interpolar e sincronizar os modelos 3D com os resultados da física.
8. Atualizar partículas, ondulações, animações e áudio.

**Recomendação:** começar com passo de física fixo de `1/60 s` e testar desempenho/estabilidade. Usar coordenadas em metros e escala coerente entre mundo físico e renderizado. Não acoplar a velocidade da simulação diretamente ao FPS variável do navegador.

## 10. Regras de projeto para o personagem

A escolha mais importante é entre **controle cinemático** e **corpo dinâmico**:

- **Cinemático:** maior precisão para correr, subir degraus, saltar e parar. Não reage automaticamente a forças físicas; exige lógica própria para água, empurrões e cipós.
- **Dinâmico:** reage naturalmente a gravidade, impactos e juntas, mas requer ajustes para não tombar, tremer ou perder a responsividade.
- **Híbrido por estados:** controle cinemático como padrão; regras especiais para natação, deslizamento e balanço; em situações específicas, pode haver transição planejada para dinâmica ou simulação auxiliar.

**Recomendação inicial:** personagem cinemático com máquina de estados. Não alternar entre cinemático e dinâmico sem controlar cuidadosamente posição, velocidade, colisão e transições.

## 11. Otimizações importantes para jogos web

- Priorizar colliders simples: caixas, cápsulas, cilindros e formas convexas.
- Usar malhas triangulares principalmente para geometria **estática** do cenário.
- Não simular fisicamente tudo que é apenas decorativo.
- Deixar objetos em repouso dormirem (*sleeping*) quando apropriado.
- Limitar o número de segmentos de cordas e pontes.
- Usar sensores e forças locais: só calcular água para objetos que estão na água.
- Evitar autorcolisão de tecidos/cordas quando não for essencial.
- Empregar colisão contínua (*CCD*) nos objetos rápidos quando necessário, após medir o custo.
- Separar frequência de física e renderização.
- Testar estabilidade em computadores modestos e celulares.

## 12. Plano de implementação sugerido

### Etapa 1 — Fundação física

- Mundo Rapier com gravidade, objetos dinâmicos e colliders estáticos.
- Materiais físicos e sistema de interações.
- Personagem com caminhar, correr, pular e detectar o solo.

**Critério de sucesso:** caixas, pedras e troncos caem, rolam e colidem sem atravessar objetos.

### Etapa 2 — Casa na árvore

- Piso, escadas, portas, alçapão, plataforma móvel e objetos empurráveis.
- Primeiro mecanismo com junta.

**Critério de sucesso:** o personagem sobe, abre uma porta, movimenta caixas e interage com mecanismos.

### Etapa 3 — Escorregadores

- Rampa reta com objetos dinâmicos.
- Estado de deslizamento do personagem.
- Tobogã curvo com saída para o rio.

**Critério de sucesso:** descida suave e previsível, sem travar nas emendas.

### Etapa 4 — Água e troncos

- Volume de água e shader.
- Empuxo por pontos e correnteza.
- Troncos flutuantes com interação do personagem.
- Natação e respingos.

**Critério de sucesso:** tronco entra no rio, boia, gira e é carregado pela correnteza; o jogador consegue nadar.

### Etapa 5 — Cipós e pontes

- Balanço com pêndulo controlado.
- Ponte de tábuas e juntas.
- Teste separado de `SoftBody.rope` na versão disponível.

**Critério de sucesso:** o jogador atravessa um vão pelo cipó e a ponte reage à passagem.

### Etapa 6 — Mundo emergente

- Objetos quebráveis, vento e mecanismos ligados.
- Propriedades reutilizáveis entre diferentes cenários.
- Otimização e testes integrados.

**Critério de sucesso:** o jogador resolve uma situação combinando mais de um sistema — por exemplo, soltar um tronco, deixá-lo boiar e usá-lo como apoio.

## 13. Demonstração integrada sugerida: aventura na floresta

Uma única fase de demonstração pode apresentar toda a tecnologia:

1. O personagem aparece perto de uma **casa na árvore**.
2. Sobe por uma escada e abre uma **porta com dobradiça física**.
3. Empurra uma **caixa** para ativar um mecanismo.
4. Solta uma **ponte suspensa** que balança com o peso.
5. Agarra um **cipó** e atravessa um vão.
6. Desce por um **escorregador** que termina no rio.
7. Entra na água, **nada** e sente a correnteza.
8. Sobe sobre um **tronco flutuante** que inclina e gira.
9. Empurra o tronco até a margem para alcançar uma nova plataforma.

Esse protótipo testa colisões, estados do personagem, empuxo, juntas, objetos dinâmicos e efeitos visuais sem exigir um mapa muito grande.

## 14. Conclusões

1. **Rapier é uma base viável para física 3D de jogos web:** oferece corpos rígidos, colisores, juntas, sensores, forças e controladores.
2. **Água convincente não depende de um simulador de fluidos completo:** superfície visual, empuxo, correnteza e efeitos respondem por grande parte do resultado percebido.
3. **Cipós e cordas podem ser implementados com pêndulos, juntas ou corpos deformáveis**, escolhendo a opção conforme o impacto na jogabilidade.
4. **Escorregadores com personagem precisam de lógica de movimento:** a física do collider sozinha não é suficiente para um controlador cinemático.
5. **Casas na árvore ficam mais eficientes com estrutura estática e apenas partes móveis dinâmicas.**
6. **O aspecto profissional está na integração e na consistência:** regras comuns para madeira, pedra, água, vento e mecanismos produzem interações emergentes.

**Recomendação final:** construir primeiro um pequeno laboratório físico jogável com uma casa na árvore, um cipó, um escorregador, um rio e dois troncos. Esse cenário é suficiente para validar as principais decisões antes de expandir o mundo.

## 15. Referências e documentação

### Rapier (documentação oficial)

- [Corpos rígidos, forças e impulsos](https://rapier.rs/docs/user_guides/javascript/rigid_body_forces_and_impulses/)
- [Colisores e geometria](https://rapier.rs/docs/user_guides/javascript/colliders/)
- [Juntas físicas](https://rapier.rs/docs/user_guides/javascript/joints/)
- [Controlador de personagem](https://rapier.rs/docs/user_guides/javascript/character_controller/)
- [Corpos deformáveis](https://rapier.rs/docs/user_guides/javascript/soft_bodies/)
- [Criação de corpos deformáveis](https://rapier.rs/docs/user_guides/javascript/soft_body_creation_and_insertion/)
- [Fixação de cordas a corpos rígidos](https://rapier.rs/docs/user_guides/javascript/soft_body_attachments/)
- [Erros comuns e escala física](https://rapier.rs/docs/user_guides/javascript/common_mistakes/)
- [API JavaScript 3D: SoftBodyDesc](https://rapier.rs/javascript3d/classes/SoftBodyDesc.html)

### Unreal Engine (práticas profissionais documentadas)

- [Water Buoyancy Component: empuxo por pontos](https://dev.epicgames.com/documentation/unreal-engine/water-buoyancy-component-in-unreal-engine)
- [Cable Components: cordas por partículas](https://dev.epicgames.com/documentation/unreal-engine/cable-components-in-unreal-engine)
- [Physics Components: juntas, forças e animação física](https://dev.epicgames.com/documentation/unreal-engine/physics-components-in-unreal-engine)

### Referências de design de jogos

- [Breath of the Wild: equilíbrio entre realismo e jogabilidade (entrevista com Eiji Aonuma)](https://www.nintendolife.com/news/2017/01/eiji_aonuma_outlines_the_challenges_in_developing_the_legend_of_zelda_breath_of_the_wild)
- [Assassin's Creed IV: Black Flag: navegação baseada em física com controles simplificados](https://www.forbes.com/sites/danielnyegriffiths/2013/08/29/assassins-creed-iv-black-flag-interview-game-director-ashraf-ismail/)

---

*Nota técnica: este é um levantamento arquitetural e de viabilidade, não uma garantia de desempenho ou compatibilidade imediata em qualquer versão. Validar as APIs e perfis de desempenho na versão específica do Rapier e no navegador-alvo.*
