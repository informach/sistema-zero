# ARQUIPÉLAGO VAGALUME V2
## Projeto artístico de produção — Praça dos Criadores → Horta da Íris → Lago dos Campos

**Situação:** proposta de direção de arte e level design, **não implementada nem aprovada artisticamente**.  
**Objetivo:** produzir uma mudança visual inequívoca em um trecho jogável existente, sem refazer sistemas que já passaram por QA.  
**Fontes verificadas:** `informach/sistema-zero`, `staging` em `a300c5f2e23bb888417baf29f3581e530f323aef`; `informach/artes-3d`, catálogos e miniaturas disponíveis em `main` em 15/11/2026. O `main` da biblioteca avançou depois das primeiras exportações: **manter o pin e verificar SHA-256** dos GLBs usados na implementação.  
**Documento anterior:** [`docs/qa/2026-11-15-faisca-m3-gate2.md`](https://github.com/informach/sistema-zero/blob/staging/docs/qa/2026-11-15-faisca-m3-gate2.md).

> **Decisão de direção:** sim, **terreno, caminhos e água entram no redesenho artístico**. Não é uma rodada para simplesmente adicionar mais vegetação às mesmas superfícies. O alvo é transformar a experiência visual do trecho. A geometria/física de base que já funciona deve ser preservada até a validação conjunta de uma substituição.

## 1. Princípios obrigatórios

1. **Adventure Land primeiro**, quando o item tiver a mesma função e se encaixar em escala, estilo e física. Usar as demais coleções somente quando oferecerem função distinta ou melhor solução objetiva. Registrar exceções.
2. **Modelos de catálogo, não arte improvisada.** Não considerar `BoxGeometry`, planos com cor uniforme, wireframes, sprites técnicos ou uma nova pintura procedural como substitutos finais de mobiliário, caminhos e água.
3. **Uma superfície visual dominante por trecho.** Não sobrepor caminho antigo + caminho de GLB, água antiga + água nova, ou pisos coplanares. As substituições precisam ser atômicas por região e reversíveis para QA.
4. **Montagem profissional.** Sem objetos flutuando, mergulhados sem motivo, superfícies piscando (z-fighting), frestas, bordas sem apoio, quebras de escala, portas obstruídas ou caminho terminando abruptamente.
5. **Vivência antes de fotografia.** Aprovar por câmera normal em caminhada/corrida, além de capturas fixas; enquadramentos não podem esconder defeitos. Não confundir 2.119 testes com aprovação estética.
6. **Preservar os contratos V2:** Faísca ~520 m, seis distritos e seis cabeceiras, avatar humano Cute Characters em escala nativa, moradores animais/criaturas, física Rapier, setor/streaming, Morada reservada, ritmo 1,5/3,4 m/s em ensaio, mapa que já acompanha o ritmo ativo, interfaces da plataforma e campanha não integrada.
7. **Não copiar cenas demonstrativas inteiras** nem descaracterizar a Faísca com um bioma de outro pacote. A atmosfera é uma vila fantástica acolhedora com sinais narrativos do controle de Croakus.

## 2. Estado comprovado versus lacuna

| Área | Comprovado na `staging` | Por fazer neste projeto |
|---|---|---|
| Terreno | Geografia e altura/colisão por setores; patamares locais ajustados; `pintura-do-solo.tsx` aplica textura de cor ao terreno | Trocar a **linguagem visual** de superfície no corredor piloto usando arte de biblioteca e transições sem z-fighting. A malha física continua até substituição testada |
| Caminhos | Rotas funcionam; caminhos principais pintados no terreno, ~2,6 m, atalhos ~1,7 m | Compor trechos com materiais e módulos reais do acervo, demonstrando encontros, curvas e ligações no mundo, sem a aparência de faixa ou tapete sobreposto |
| Água | Oceano e elipse do lago funcionam no ensaio; ponte rosa `ponte_04_pacote` atravessável | Comparar **superfície + margens + fundo + nado** com componentes de catálogo. Não sobrepor outro lago à água atual |
| Vila | Poço, canteiros, casas, vegetação, Quadro/bancos de referência | Melhorar hierarquia arquitetônica, solo, enquadramento, escala, presença de moradores, funções das frentes sem ativar campanha |
| Curadoria A/B | Trilha pintada e 26,5 m de módulos `caminho_terra_*` testados em área isolada; 8 GLBs extras só nos ensaios | Selecionar um tratamento coerente e **aplicá-lo à rota real Praça → Horta**. O ensaio B não é automaticamente arte aprovada |
| Itens | Patins existentes no V1; mochila em investigação | Não são escopo de implementação do ambiente piloto; podem ganhar prévia de arte quando sistema visual estiver pronto |

**Diagnóstico visual de Gate 2:** praça ainda aberta e repetitiva, fachadas muito parecidas, lago com aspecto de mancha plana; caminhos suaves por pintura, mas sem detalhe material de acervo. O B testou corretamente juntas reais, porém a faixa laranja de ~0,12–0,15 m parece uma passarela destacada, e não trilha assentada no chão.

## 3. Recorte e âncoras — não deslocar para acomodar decoração

### Zonas de produção

- **Z1 — Primeira vista:** `(0,150)` futura saída da Morada → `(0,137)` Praça. Lote protegido de `x=-12…12, z=154…178` deve ficar livre de troncos, copas, fundações e interativos.
- **Z2 — Nó social:** Praça `(0,137)`, poço `(-6,143)`, quadro provisório `(-10,137)`; conexões claras com Pátio `(-24,132)` e Costa `(20,153)`.
- **Z3 — Caminho do cultivo:** Praça `(0,137)` → Horta `(20,139)`, aproximadamente 20 m. Incluir a visão contínua dos canteiros a partir do caminho, sem ocultá-los com arbustos altos.
- **Z4 — Continuidade para descoberta:** Horta `(20,139)` → `(20,147)` → `(35,147)` → Lago/Ponte `(58,135)`, com ponte centrada `(58,127)` e retorno pela outra cabeceira `(58,119)`. **Lago e ponte são subentrega específica com teste físico**, não concluir apenas pelas fotos da Praça.

**Travas:** porta→praça ~13 m; praça→horta ~20 m; praça→Pátio ~25 m. Preservar piers, outras ilhas e posição do Farol. A construção da Morada ainda não está integrada; a câmera `(0,150)` é somente referência.

### Leitura desejada

A partir da porta, a criança percebe que a praça é um lugar de encontro; o Farol continua identificável ao fundo. Do centro, três saídas possuem pistas ambientais **diferentes**: o cultivo (Campos), o trabalho interrompido (Pátio), e a abertura costeira (Costa). O caminho da Horta deve levar a um pequeno motivo de curiosidade — vista para o lago/ponte — sem exigir uma missão nova.

## 4. Seleção de peças com ID real — prioridade Adventure Land

Dimensões são do catálogo, em metros: `[largura, profundidade, altura]` conforme `dims` (último valor é altura). **Disponível no acervo não significa integrado ao `/macro`**.

| Prioridade | ID real / coleção | Dimensões | Função e decisão |
|---|---|---:|---|
| Manter | `decoracao/farol_01_pacote` — Adventure Land | 9,73 × 9,35 × 23,98 | Marco distante; não mover durante Z1/Z3 |
| Manter | `decoracao/moinho_01_pacote` — Adventure Land | 11,37 × 12,76 × 16,68 | Marco secundário; preservar escala implantada |
| Manter / variar | `plataformas/casa_01_pacote`, `casa_02_pacote` — Adventure Land | 12,78 × 12,78 × 12,08 | Já há casa 01; casa 02 tem mesma silhueta, só muda cor. Diferenciar função por implantação sem criar falsa variedade |
| Preferir | `vegetacao/arvore_04_pacote` — Adventure Land | 2,83 × 2,84 × 4,22 | Árvore pequena, em molduras laterais. Não colocar no eixo central nem dentro do lote |
| Preferir onde adequado | `vegetacao/arvore_03_pacote` — Adventure Land | 4,44 × 4,46 × 9,40 | Fundo/entrada dos Campos, sem esconder Farol ou horta |
| Preferir onde adequado | `vegetacao/arbusto_04_pacote` — Adventure Land | 2,04 × 2,08 × 2,23 | Arbusto alto: não usar como borda contínua baixa do caminho |
| Preferir | `vegetacao/folhagem_01_pacote` — Adventure Land | 3,36 × 2,68 × 2,65 | Pontuação vegetal em grupos, afastada de passagem e interativos |
| Preferir | `construcao/cerca_02_pacote` — Adventure Land | 3,90 × 0,19 × 0,58 | Cercamento baixo dos canteiros, com abertura livre e sem postes duplicados |
| Manter | `construcao/lampiao_01_pacote` — Adventure Land | 1,90 × 1,90 × 2,75 | Referência de luz e passeio; escala implantada deve permanecer conferida |
| Candidata | `construcao/mesa_02_pacote` — Adventure Land | 2,45 × 4,44 × 2,30 | **Somente** se cumprir função de mesa comunitária e escala visual; não substituir automaticamente bancos pequenos |
| Candidata | `construcao/mesa_01_pacote` — Adventure Land | 4,50 × 4,50 × 2,30 | Mesa de evento/área externa, **não** encostar em praça estreita por ser grande |
| Manter | `reino/castelo/poco_manivela_baixa` — Reino | 3,12 × 2,12 × 2,60 | Exceção necessária: manivela acessível ao avatar e sem equivalente confirmado no Adventure Land |
| Manter | `reino/terreno/canteiro_horta` — Reino | 3,54 × 2,04 × 0,865 | Seis canteiros existentes, 2 colunas × 3 linhas; preservar sem criar novo plantio |
| Exceção | `reino/natureza/flor_margarida_branca` — Reino | 0,48 × 0,50 × 0,875 | Flores pequenas perto dos pés do avatar; flor original grande do Adventure Land seria outra função |
| Manter | `construcao/ponte_04_pacote` — Adventure Land | 4,35 × 12,35 × 1,11 | Ponte rosa, preservar posição e colisão inicial |

### Caminhos — escolha ainda **condicionada a três testes visuais**

| Variação | Modelos da biblioteca | Medidas | Questão artística a resolver |
|---|---|---|---|
| T1 — Reino corrigido | `reino/terreno/caminho_terra_reto` + `caminho_terra_curvo` | reto 7 × 2,60 × 0,152 m; curva 4,8 × 4,8 × 0,149 m | A prova B revelou superfície muito alta/laranja. Testar assentamento sem degrau aparente e a mesma cor/iluminação que a paisagem. **Não simplesmente baixar o GLB até atravessar o chão** |
| T2 — Faroeste | `faroeste/terreno/trilha_terra_reta` + `trilha_terra_curva` | reto 7 × 2,573 × 0,10 m; curva 4,6 × 4,64 × 0,10 m | Candidato menos alto; conferir material marrom, coerência da vila e juntas. É exceção estética apenas se Reino não servir |
| T3 — Templo | `templo/terreno/caminho_lajes_reto` + `caminho_lajes_curvo` | reto 6,922 × 2,363 × 0,05 m; curva 4,654 × 4,635 × 0,05 m | Candidato para **detalhes e entradas** (poço, horta), não necessariamente como revestimento de todo o percurso. Ver se remete demais a ruínas |

**Adventure Land primeiro foi avaliado:** `plataformas/caminho_01_pacote` e `caminho_04_pacote` são peças de caminho/plataforma elevadas, com altura ~1,78 m e ~1,64 m; não cumprem a mesma função de trilha de terra **rente ao solo**. Por isso, para Z3 é justificada a consulta às outras coleções.

**Decisão de projeto:** criar ensaios T1/T2/T3 **no caminho real entre praça e horta**, não numa bancada isolada; preservar a mesma câmera, geometria física e pontos de rota. Como a trilha tem cerca de 20 m e o módulo padrão mede 7 m, será necessário detalhar entrada/saída, curvas e praça sem falsificar comprimentos, sobrepor faces ou quebrar alinhamento. Registrar qualquer pedaço onde um kit sozinho não resolve a junção; **não improvisar um quadrado pintado como arte final**.

### Terreno — camada visível versus base física

- O `terreno/chao_ilha_pacote` original do Adventure Land tem aproximadamente **1.010 × 1.011 m** e geometria própria; não pode substituir por encaixe direto uma Faísca V2 de 520 m com colina, lago e rotas fixas. **Não reduzir/esticar indiscriminadamente o terreno original**.
- Manter a malha de setores/colisão como base de locomoção enquanto se usa **arte de chão e modulação dos pacotes** para construir a composição local. Para relevo elevado planejado, comparar platôs orgânicos existentes (`reino/terreno/plato_organico_*`), cientes de que muitas peças têm 3 ou 6 m de altura e não são apropriadas para uma praça plana sem rampa.
- Se o acabamento visual não puder usar uma peça pronta sem criar frestas ou superfícies duplicadas, registrar um limite real do kit e propor **adaptação técnica de encaixe**, reaproveitando malha e material do pacote, sem gerar novos objetos decorativos improvisados. Apresentar antes de aplicar.
- Pedras, raiz e vegetação marcam bordas, mas não devem disfarçar degraus/falhas. Manter visuais em contato exato com os colisores; respeitar `pisoDaFaisca` e a malha de setores.

## 5. Direção de composição: três momentos, com diferença visual evidente

### Momento A — Saída de casa e praça

- **Composição:** poço `(-6,143)` torna-se centro de convivência; preservar área livre no eixo da Morada; Quadro na lateral oeste fora da linha de visão frontal; fachadas contam funções, não apenas exibem casas iguais. A frente do correio comunica entregas por caixas/barril Adventure Land e uma estação de trabalho; não introduzir NPC novo nesta fase.
- **Chão:** praça definida por uma área central com material/peça do kit que se conecte a trilhas por transição coerente. **Não usar apenas um círculo de tinta como acabamento definitivo.** A borda deve parecer passagem do solo habitado para gramado, sem superfícies coplanares.
- **Vegetação:** molduras assimétricas de árvores Adventure Land em 2–3 agrupamentos; áreas menores de flores Reino; gramado aberto suficiente para avatar, Zappy e visibilidade dos três destinos.
- **Câmera:** uma vista da futura porta `(0,150)`, câmera normal, e outra a partir da praça. Um visitante deve reconhecer o poço, ao menos duas frentes distintas e três direções, sem abrir mapa.

### Momento B — Caminho de aproximadamente 20 m até horta

- **T1/T2/T3:** escolher um sistema de trilha principal (não misturar todos) e, se fizer sentido, uma linguagem discreta de lajes só nos pontos de pausa/entrada. O **travessamento deve ser contínuo** desde a praça, sem começar com uma borda cortada de peça.
- **Enquadramento:** perto do jogador, vegetação pequena no lado do caminho e sombra de árvore mais afastada; no horizonte próximo, canteiros reconhecíveis. Não colocar arbustos de 2,23 m bloqueando o avatar ou escondendo horta.
- **Controle de gabarito:** caminho principal alvo ~2,4–2,8 m, mas não estreitar por aparência sem validar giros/câmera/fluxo.
- **Horta:** seis canteiros intactos; cerca Adventure Land baixa em trechos laterais, **entrada aberta**; uma área livre para Íris conversar sem atravessar o canteiro. Mesa de kit só se aprovada para a função e altura.
- **Personalidade:** a horta é cuidada pela comunidade, enquanto a oficina, vista à distância, permanece lacrada. Não antecipar restauração nem criar nova atividade de plantio.

### Momento C — Prolongamento para lago e ponte (pacote de aceite de água)

- O jogador consegue reconhecer água e ponte desde a horta, mas sua integração exige **separar um teste visual/físico antes de promover**.
- **Preferência Adventure Land:** avaliar material e aparência de `terreno/agua_ilha_pacote` (grande plano com geometria mínima, porém escala e materiais de origem exigem validação no Three.js). A coleção Reino fornece `reino/terreno/agua_mar` (módulos 14 × 14 m) derivado de `agua_ilha_pacote`, com especificação de encaixe. **Não tratar esses GLBs como lago pronto.**
- **Lago próprio do Reino:** `reino/terreno/lago_nadavel`, aproximadamente **10,758 × 7,973 m**, contém água e margens para *buraco correspondente no terreno*. A elipse física atual da Faísca tem raio aproximado **8 × 4 m** (largura ~16 m); isto é incompatível com substituição 1:1. Uma implementação do lago pronto só é candidata se o terreno for recortado/ajustado de maneira validada, a faixa de água real corresponder ao desenho e as cabeceiras da ponte não forem comprometidas.
- Entregar **dois tratamentos lado a lado**: L1 — manter forma aprovada e aplicar material de água da biblioteca com tratamento de margem compatível; L2 — usar `lago_nadavel` com a geometria de recorte e nado coerentes (somente ensaio). **Escolher antes de substituir a água atual**.
- Ponte do Adventure Land (`ponte_04_pacote`) no centro `(58,127)`, altura de origem 3,45 m aprovada tecnicamente; rota de 16 m inclui margens de acesso (~1,82 m além de cada extremidade do modelo). Verificar duas cabeceiras com câmera baixa, corrida, retorno e mergulho. Ao testar novo lago, não mexer no colisor da ponte sem prova.

## 6. Instruções de implementação, sem autonomia artística irrestrita

A outra sessão deverá:

1. Ler esta especificação e conferir os IDs, dimensões, origem, digest e licença no commit de arte fixado pelo exportador; não pressupor que o `main` atualizado seja idêntico ao acervo exportado.
2. Criar **variações reversíveis no `/macro`**, com estado de ensaio separado e sem tocar a campanha/conta ou itens reais.
3. Substituir o **visual** provisório apenas nas zonas que receberam alternativa. A física de base permanece até teste conjunto. Nunca empilhar planos, tapetes ou água antiga e nova sem regra explícita.
4. Priorizar modelos Adventure Land e explicar a exceção de Reino/Faroeste/Templo quando ela for necessária por função/altura/encaixe.
5. **Não preencher ambientes com blocos de teste como arte final.** O Quadro e os bancos atuais são placeholders e podem permanecer identificados como tal apenas na área que ainda não recebeu aceite final.
6. Produzir **comparativos honestos** de mesma câmera, hora, distância, FOV e HUD; incluir vídeo de câmera normal a partir da porta até a horta e ida/volta na ponte.
7. Não alterar a animação/câmera/velocidade do avatar para tornar o cenário visualmente melhor; são linhas de validação distintas. Avatares e NPCs preservados.
8. Manter testes automáticos existentes de ponte, nado, retomada, caminho, toque e descarregamento; registrar delta de recursos do renderer, comparando mesmas posições com o Gate 2 anterior. Não declarar mobile aprovado sem aparelho real.
9. Relatar separadamente **arte instalada**, **arte ainda em ensaio**, **arte aprovada pela direção**, **limites do kit** e **regressões técnicas**.

## 7. Critérios de aceite artístico do recorte

### Praça + horta (P0)

- [ ] Da porta, a praça comunica acolhimento e atividade; três direções são legíveis sem placa flutuante.
- [ ] A transformação visual do trecho é inequívoca no **mesmo enquadramento** antes/depois; não se resume a acrescentar mais árvores ou alterar saturação.
- [ ] O caminho aprovado é feito com arte da biblioteca, aparece assentado no terreno e se une visualmente à praça e à horta, sem ponta cortada, degrau artificial ou z-fighting.
- [ ] Há variação intencional de arquitetura, nível de uso e vegetação; nenhuma copa invade a Morada protegida.
- [ ] Cada objeto/GLB tem pivô/contato revisado de 2–3 ângulos e altura física coerente.
- [ ] A rota continua fácil de caminhar e correr com câmera normal e toque.

### Água + ponte (P0 independente)

- [ ] A água usa arte de catálogo validada no motor; nenhum segundo plano de água disputa profundidade.
- [ ] A margem e o fundo são coerentes com a forma e com a física de nado, saída e colisão.
- [ ] A ponte mantém entrada/saída por ambos os lados e tem apoio visual suficiente nas cabeceiras.
- [ ] O resultado melhora perceptivelmente a aparência atual de **mancha plana** sem quebrar a travessia já testada.
- [ ] Vistas fixas e vídeos evidenciam água, ponte e chão sem esconder defeitos.

### Interdições

**Não aprovar** uma entrega que apresente somente novo relatório técnico, mais testes, mais vegetação dispersa, pintura de caminho mais suave, ou 26,5 m de bancada isolada. A arte precisa aparecer **na rota real**. Não expandir aos seis distritos até que este padrão esteja aceito.

## 8. Pacote final para revisão pela direção de arte

- Capturas **antes/depois** da porta, da praça, do começo e do meio da trilha, da horta e da ponte, em câmeras idênticas.
- Uma comparação **T1/T2/T3** de caminho *na rota real*, com tomada baixa da junção entre peças e terreno.
- Uma comparação **L1/L2** do lago no contexto da ponte, distinguindo ensaio e escolha.
- Vídeo contínuo ~30–60 s em câmera de jogo: porta → praça → horta, com giros para as saídas.
- Vídeo ida/volta pela ponte com câmera baixa e uma entrada na água, além do verificador automático.
- Tabela de arte: ID, coleção, papel, posição, rotação, escala, malha de contato, colisor, hash, estado (integrado/ensaio/aprovado).
- Relatório de regressões + recursos sob mesma máquina/câmera, sem extrapolar performance de desktop para celular.

## 9. Fora deste marco

Morada integrada, campanha, Missão do Núcleo, seis compartimentos definitivos do Farol, acabamento dos seis distritos, travessias oceânicas definitivas e população completa. **Mochila visual e patins escondidos** continuam aprovados para especificação própria e não devem bloquear o aceite do recorte ambiental. A narrativa aprovada permanece intacta: posto no Estúdio → Missão do Núcleo → instalação no Farol → ponte reconstruída.

---

**Parecer de direção:** a prioridade não é preencher quilômetros de mapa, mas demonstrar que **um caminho, uma praça e uma borda de lago** podem ser belos, coerentes e jogáveis usando os recursos que já foram produzidos. Quando esse padrão for aprovado, ele se torna a gramática de composição do restante da Faísca.
