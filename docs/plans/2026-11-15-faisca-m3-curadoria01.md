# ARQUIPÉLAGO VAGALUME V2
## Faísca — Direção de Arte e Level Design | M3 / Curadoria 01

**Estado:** especificação **proposta para avaliação**; não representa montagem executada, aceite artístico final nem autorização para alterar a campanha.  
**Escopo desta curadoria:** Vila dos Criadores → Campos da Íris → Ponte do Lago, com leitura inicial das saídas para o Pátio, a Costa e o Farol.  
**Referências de código:** `informach/sistema-zero`, `staging` em `0f00486c0c92a7fcf347139522e34231e5b5a95c`.  
**Referências do acervo:** `informach/artes-3d`, `main` consultada em `4b7ab31c64a659aaf21ab60e5d1b91e0f35a3825`; o exportador do piloto V2 foi fixado anteriormente no commit `7816a7aca0ba6f7d93a90fe4c15f40638b01525f`. **Não presumir que os dois snapshots são idênticos:** verificar a existência dos itens escolhidos no commit efetivamente usado pelo exportador e atualizar manifesto/digests se a seleção mudar.  
**Gate:** complemento detalhado de curadoria ao Gate 1 de `docs/plans/2026-11-15-faisca-m3-composicao-design.md`. O Gate 2 permanece sujeito a validação das intenções e à execução da sessão de implementação.

**Documentos de partida:**
- [Mapa de composição M3, com oito nós](https://github.com/informach/sistema-zero/blob/staging/docs/plans/2026-11-15-faisca-m3/composicao-coracao.png)
- [Mapa de alcance e lacunas externas](https://github.com/informach/sistema-zero/blob/staging/docs/plans/2026-11-15-faisca-m3/alcance-m3.png)
- [Relatório QA e imagens reais V2](https://github.com/informach/sistema-zero/blob/staging/docs/qa/2026-11-15-faisca-blockout-artistico.md)
- [Layout, lugares, rotas e relevo](https://github.com/informach/sistema-zero/blob/staging/packages/arquipelago/src/sistemas/faisca.ts)
- [Implantação dos 23 modelos no piloto](https://github.com/informach/sistema-zero/blob/staging/packages/arquipelago/src/sistemas/composicao-faisca.ts)

---

## 1. A decisão artística principal

**Prioridade do acervo: Adventure Land → demais coleções já integradas à biblioteca → adaptação justificada de peças existentes.** Quando dois itens cumprem a mesma função e ambos se encaixam corretamente em escala, estilo, física e orçamento de desempenho, **usar o item do Adventure Land**. O objetivo não é somar modelos de todos os packs: é obter um mundo coerente e bem executado usando o que já temos.

Essa prioridade não deve forçar equivalências falsas:

- Os `caminho_01..04_pacote` do Adventure Land são **caminhos/pedras elevadas**; **não substituem automaticamente** a trilha contínua de terra que precisa encontrar outra superfície sem degrau. Para a trilha térrea o Reino oferece `caminho_terra_reto` e `caminho_terra_curvo`, com pontos de encaixe documentados. Eles precisam de prova visual antes da repetição.
- `agua_ilha_pacote` é a origem preferencial de linguagem/material da água; `reino/terreno/agua_mar` usa esse modelo como `base_pacote` e traz ladrilhos de 14 m. Escolher a representação **que funcione no Three.js** sem emendas aparentes e com superfície física coerente. Não usar uma água de aparência bonita cujo nado funcione em outra altura.
- As árvores do Adventure Land podem medir ~4–16 m; `arvore_04_pacote` (~4,22 m) pode servir ao coração habitado; `arvore_03_pacote` (~9,40 m) é melhor como marco ao fundo. Uma árvore de 15 m não deve ser usada na frente de uma casa pequena só por ter precedência comercial.
- O poço da praça é `reino/castelo/poco_manivela_baixa`: **não foi identificada uma peça equivalente** do Adventure Land nas categorias verificadas, e esta versão possui a manivela adaptada ao alcance do avatar.
- As pequenas margaridas e tulipas do Reino (~0,8–0,9 m) cumprem uma função distinta de `flor_01_pacote` (~3 m, flor cenográfica grande). A primeira categoria faz canteiros; a segunda só faria sentido como marco expressivo, após avaliação.

**Restrições:** não copiar a ilha de demonstração inteira de nenhum pack; não criar arte de chão, água, caminhos ou vegetação do zero por conveniência; não esticar uma peça de 130 m para cobrir os 520 m; não trocar o personagem por humanoide NPC; não alterar paleta/interface Kids/adulta como parte de uma correção ambiental. O terreno novo pode precisar de **adaptação técnica de encaixe** das peças de catálogo, mas ela deve ser justificada e **não virar novo desenho artístico improvisado**.

### Estado de implementação que NÃO deve ser confundido com arte aprovada

| Sistema / parte | O que existe na `staging` | O que esta curadoria solicita |
|---|---|---|
| Geografia e setores | Sete territórios, Faísca ~520 m, relevo contínuo e colisão por setor | Preservar contratos e âncoras; **substituir apenas a representação visual provisória em regiões de prova**, sem duplicar superfícies |
| Caminhos | `mundo/faisca/caminhos.tsx` gera faixas por vértices à altura do relevo +0,07 m | Ensaiar **peças de caminhos da biblioteca**; eliminar sobreposições e acabamento de fita reta |
| Oceano e lago | Oceano geométrico provisório; lago físico dos Campos separado | Provar material e geometrias de água de catálogo, com margem/colisão/nado alinhados |
| Composição | 23 modelos do Adventure Land e Reino no piloto | Preservar os que funcionam; melhorar colocação, paisagismo, ancoragem, função e variedade |
| Ponte dos Campos | `ponte_04_pacote` atravessada, com piso acertado | **Manter inicialmente a peça e sua física**; compor as cabeceiras |
| Íris | Coelha com clipes/parada/conversa | Evoluir no pipeline existente, sem fazer novo motor de NPC |
| Morada e progresso | Lote reservado; campanha/salvamento real não integrados | Não invadir o lote; não declarar sistemas de missão ou recompensa como implementados |

### Hierarquia de protagonismo

1. **Avatar, Zappy e experiências da criança** sempre legíveis no enquadramento normal de jogo.
2. **Praça/poço** como lugar de encontro e orientação, não uma cruz vazia.
3. **Farol e moinho** como marcos distantes, sem esconder o horizonte e nem apagar o protagonismo da vila.
4. **Campos** mais verdes e tranquilos; **Pátio** mais técnico e interrompido pelas ordens do Rei; **Costa** aberta e arejada.
5. **Detalhes de descoberta** perto de desvios, não distribuídos como recompensa automática por metro.

---

## 2. Implantação-base: não mover o que já está aprovado

Referencial: **coordenadas locais da Faísca**, `x,z` do código de `sistemas/faisca.ts`. **As posições abaixo são âncoras verificadas; novas posições de decoração são hipóteses e não coordenadas finais.** Obter `y` pelo piso realmente usado no trecho, pivô/contato do GLB e colisor, nunca por um deslocamento global fixo.

| Lugar / objeto | Âncora existente (x, z) | Papel na nova composição | Travamento |
|---|---:|---|---|
| Ponto de chegada / porta da futura Morada | `(0, 150)` | Visão inicial do mundo e acesso à praça | Preservar |
| Praça | `(0, 137)` | Nó de escolha e convívio | Preservar |
| Poço | `(-6, 143)` | Centro de permanência | Preservar como referência, aferir área livre |
| Horta | `(20, 139)` | Atividade de cultivo e saída verde | Preservar |
| Início do Pátio | `(-24, 132)` | Terceira linguagem visual do coração | Preservar |
| Correio / vizinho | `(-17, 123)` / `(-16, 144)` | Frentes de uso distintas | Volumes provisórios existentes |
| Descida para a Costa | `(22, 171)` | Terceira escolha visível do início | Preservar leitura inicial |
| Lago / ponte interna | `(58, 127)` | Marco e travessia | Preservar primeiro; aferir água/margens |
| Cabeceiras da ponte no grafo | `(58, 119)` e `(58, 135)` | Aproximações da ponte | Preservar conexão |
| Farol / implantação de arte | `(-3, 109)` / `(-3, 100)` | Destino e marco monumental | Preservar acesso seguro |
| Moinho | `(-24, 92)` | Marco secundário da subida | Preservar inicialmente |

O lote de Morada reservado é **x = −12…12, z = 154…178, 24 × 24 m**. Não colocar troncos, copas, raízes, bancos, pedras, caixas ou trilhas atravessando a área que precisa permanecer livre para crescer. A primeira foto deve usar **a posição prevista da porta**, deixando explícito que a casa real ainda não está integrada.

**Distâncias do coração que não devem aumentar para acomodar cenografia:** porta→praça ~13 m, praça→horta ~20 m, praça→Pátio ~25 m. A velocidade de ensaio de 1,5 m/s andando e 3,4 m/s correndo continua sendo objeto de teste perceptivo; não recriar problemas artificiais de distância.

---

## 3. Plano de composição — cena a cena

### Z1. Porta da Morada → Praça dos Criadores

**Experiência desejada:** ao sair de casa, a criança percebe um lugar acolhedor, mas com uma rotina estranha sob ordens do Croakus. Ela distingue **Campos, Pátio e descida para Costa** sem abrir mapa. O Farol fica visível como promessa de aventura, mas a praça convida a permanecer.

**Composição:**

- **Núcleo livre em torno do poço `(-6,143)`**: não cercar completamente o poço nem colocá-lo em cima da linha de circulação; criar uma borda de solo de uso com função clara. O poço do Reino está correto pela manivela à altura do avatar; não criar outro.
- **Frente de correio** junto à construção existente `(-17,123)`: usar objetos baixos de encomenda e sinal de circulação do Nico. **Preferir** barril `barril_01_pacote` do Adventure Land a barril equivalente do Reino, depois de conferir escala/encaixe; manter caixotes do Reino quando não houver equivalente já catalogado.
- **Frente de vizinhos** perto de `(-16,144)` e `(13,124)`: comparar **`casa_01_pacote` e `casa_02_pacote`** (mesma silhueta, variação de cor) com variação de posição e pequenos elementos de uso; se continuarem parecidas demais, **registrar lacuna arquitetônica**, não criar fileira de casas iguais.
- **Área reservada para Quadro das Conexões** na lateral oeste da praça, fora da linha porta→Farol; por ora apenas reserva espacial/volume técnico de estudo. O Quadro narrativo e seus seis desafios **não estão implementados no novo mundo**.
- **Vegetação em molduras**, não em grade: iniciar experimento com **`arvore_04_pacote`**, `arbusto_04_pacote` e `folhagem_01_pacote` do Adventure Land **somente onde a forma combinar**; usar árvore arredondada e flores pequenas do Reino quando o conjunto do Adventure Land for grande, geométrico ou expressivo demais para a Vila. Deixar o campo de visão frontal aberto.
- **Evitar a praça-fita:** em vez do entroncamento atual de tiras de material uniforme, usar área de encontro visualmente contínua que passa às trilhas modulares. Não sobrepor um tapete decorativo coplanar à malha existente; o piso precisa ter **uma superfície visual dominante por lugar**.

**Roteiro de câmera para aceite:** sair da porta → 5 s olhando livremente → caminhar até a praça → girar para os três destinos, sem HUD de teste. A criança deve perceber ao menos duas coisas interessantes sem receber instrução.

**Não fazer:** decorar o centro com uma fonte nova, empilhar 4 casas da mesma silhueta, copiar a praça do castelo do Reino, introduzir o chefe da missão ou trancar a área de construção da criança.

### Z2. Praça → Campos da Íris → Horta

**Experiência desejada:** transição rápida de espaço social para cultivo e tranquilidade. A horta mostra que há trabalho comunitário; os canteiros podem estar cuidados, mesmo que a oficina continue lacrada.

**Referências de passagem:** praça `(0,137)` → horta `(20,139)`; roteamento existente pelo centro. Propor trechos térreos de cerca de **2,4–2,8 m** de largura *fora das áreas de encontro*, sujeitos a câmera e colisão.

**Composição:**

- Preservar **seis canteiros `canteiro_horta`** já presentes, 3,54 × 2,04 m cada, em duas colunas × três linhas. Não anunciar um novo sistema de plantio: neste marco o tratamento é cenográfico.
- A horta deve ser reconhecida pelo agrupamento: cerca em trechos úteis, pequeno acesso aberto, plantio, sombra pontual, ferramentas **apenas se houver peça efetivamente disponível**.
- Preferir cerca `cerca_02_pacote` (Adventure Land) a versões equivalentes do Reino **se a altura ~0,58 m e a forma protegerem a borda da horta**. Se a peça do Reino de ~1,08 m caracterizar melhor o cultivo, registrar a exceção e a razão de escala.
- Preferir vegetação Adventure Land que não invada o caminho; misturar árvores mais altas somente fora da rota principal. Em torno dos canteiros, **flores pequenas do Reino** são mais adequadas do que a `flor_01_pacote` de aproximadamente 3 m.
- Manter uma área curta de pausa visual antes da água, sem forçar uma atividade obrigatória. Íris usa o modelo de coelha existente; a rotina completa de jardinagem fica para a etapa de personagem, sobre os sistemas atuais.

**Roteiro de câmera:** da praça o cultivo aparece como destino; da horta a ponte/lago desperta curiosidade; à noite o percurso continua compreensível sem poluição luminosa.

### Z3. Horta → Lago → Ponte dos Campos

**Experiência desejada:** um percurso gostoso até um elemento visual marcante. O modelo rosa de ponte **pode continuar**; a cor vira um acento de fantasia, não algo que precisa ser escondido. A paisagem explica por que a ponte foi construída.

**Anchors do caminho:** horta `(20,139)` → `(20,147)` → `(35,147)` → `(58,135)` → ponte até `(58,119)`; outra cabeceira leva ao anel do pomar.

**Composição:**

- **Manter a `ponte_04_pacote` do Adventure Land** (4,352 × 12,354 × 1,106 m) inicialmente centrada em `(58,127)`, com ajuste de origem de **3,45 m** já testado. Não esticar a peça para os 16 m do grafo; os ~1,82 m entre cada extremidade geométrica e seu nó de rota são aproximação das margens, não prova de buraco.
- Tornar as **duas cabeceiras simétricas em segurança, mas assimétricas na paisagem**: trilha usada até as tábuas, terra/grama com contato correto, pedras ou vegetação fora da passagem e vistas diferentes de cada lado.
- **Água: decisão condicionada a prova.** O modelo `reino/terreno/lago_nadavel` mede ~10,76 × 7,97 m, tem furo/margens definidos e física catalogada; já o protótipo usa outra forma de lago (água física com elipse `raioX:8`, `raioZ:4`, centro `(58,127)`). NÃO simplesmente sobrepor esse GLB à água e ao terreno atual, pois geometria, nível de nado e abertura da margem podem divergir. Comparar: (A) superfície com linguagem do `agua_ilha_pacote` e costa/margem construída com peças do catálogo; (B) uso do `lago_nadavel` inteiro, com mudança explícita e testada de forma/colisor/água após aprovação. **Somente uma representação final deve permanecer visível.**
- Usar `reino/terreno/agua_mar` (14 × 14 m, derivado da água do Adventure Land) ou água original do Adventure Land **apenas se** material, ondulação, transparência, luz e alinhamento de nado forem comprovados no navegador. Não assumir que material de outro motor já funciona em Three.js.
- Preferir rochas originais do Adventure Land **se estiverem em tamanho adequado** à margem; as grandes do `montanhas/` medem diversos metros. `reino/natureza/rocha_pequena` e `rocha_larga` são exceções coerentes para apoio pequeno de cabeceira.
- **Não pontilhar as margens com 30 arbustos idênticos em progressão aritmética.** Usar poucos grupos com variação estudada de densidade, escala e abertura de visão.

**Roteiro de câmera:** cabeceira sul → caminhar e correr até o outro lado → retornar → lateral baixa com piso, água e contato das margens → olhar do ponto de chegada, sem corte que esconda problemas.

### Z4. Primeiras saídas para Pátio, Costa e Farol — apenas legibilidade neste recorte

- **Pátio `(−24,132)`**: usar caixotes, barril Adventure Land e sinais da oficina **interrompida**, não máquinas plenamente restauradas; preservar caminho livre ao Farol pelo lado do Pátio.
- **Costa `(20,153)` → descida `(22,171)`**: precisa parecer um destino diferente das duas outras saídas já na praça. Fazer *somente* a linguagem inicial de abertura/horizonte e o começo da trilha; píer, porto, maré e distrito completo ficam para outro marco.
- **Farol `(-3,109)` / `(-3,100)`**: manter o modelo Adventure Land de quase 24 m e testar enquadramento inteiro. Nenhum acabamento dos seis compartimentos aqui. Não bloquear a chegada segura nem invadir o patamar com vegetação.

---

## 4. Biblioteca de modelos — escolhas reais e prioridades

Dimensões conforme os `catalogo.json` consultados em `informach/artes-3d` (largura × profundidade × altura, em metros). O número indica tamanho nativo do modelo, **não** escala final aprovada para toda a cena. `V2` = está no manifesto de 23 GLBs do piloto, `Acervo` = existe no catálogo, mas ainda exige exportação/integração se for selecionado. As imagens comerciais não são prova de que uma peça já esteja no jogo.

### P0 — Preferências Adventure Land (primeiro testar)

| ID exato e categoria do catálogo | Dimensão | Estado | Função proposta / observação |
|---|---:|---|---|
| `plataformas/casa_01_pacote` | 12,78 × 12,78 × 12,08 | V2 | Vizinho/correio/oficina de referência; hoje repetido com escalas diferentes |
| `plataformas/casa_02_pacote` | 12,78 × 12,78 × 12,08 | Acervo | Contraste de cor a testar em UMA frente, sem falsa variedade de silhuetas |
| `decoracao/farol_01_pacote` | 9,73 × 9,35 × 23,98 | V2 | Marco principal; manter forma e escala inicialmente |
| `decoracao/moinho_01_pacote` | 11,37 × 12,76 × 16,68 | V2 | Marco secundário distante da praça |
| `decoracao/moinho_pas_01_pacote` | 15,92 × 1,86 × 15,92 | V2 | Componente do moinho; pivô/alinhamento medidos antes de rodar |
| `construcao/ponte_04_pacote` | 4,35 × 12,35 × 1,11 | V2 | Ponte interna testada; preservar física no primeiro encaixe |
| `construcao/cerca_02_pacote` | 3,90 × 0,19 × 0,58 | Acervo | Cerca baixa da horta, *se* cumprir função e escala |
| `construcao/lampiao_01_pacote` | 1,90 × 1,90 × 2,75 | V2 | Iluminação/ponto de leitura, hoje escalado no piloto |
| `vegetacao/arvore_04_pacote` | 2,83 × 2,84 × 4,22 | Acervo | Árvore menor, candidata perto da Vila |
| `vegetacao/arvore_03_pacote` | 4,44 × 4,46 × 9,40 | Acervo | Árvore de fundo, não bloquear eixo da praça |
| `vegetacao/arbusto_04_pacote` | 2,04 × 2,08 × 2,23 | Acervo | Testar bordas; silhueta mais geométrica que arbusto do Reino |
| `vegetacao/folhagem_01_pacote` | 3,36 × 2,68 × 2,65 | Acervo | Agrupamento externo, não usar na passagem estreita |
| `tesouros/barril_01_pacote` | 1,10 × 1,10 × 1,14 | Acervo | Encomendas/Pátio, preferência sobre barril equivalente do Reino |
| `tesouros/bau_02_pacote` | 1,22 × 0,91 × 0,91 | Acervo | **Possibilidade futura**, não confirmar segredo/patins neste Gate 2 |
| `terreno/agua_ilha_pacote` | ~1.000 × 1.000, plano | Acervo | **Fonte prioritária da água** a investigar, não substituir automaticamente o oceano físico |
| `plataformas/caminho_01_pacote` | 7,74 × 3,91 × 1,78 | Acervo | Pedras/caminho elevado em ponto especial; não equivalente a trilha de terra contínua |

**Duas cautelas:** o `chao_ilha_pacote` do Adventure Land é terreno de demonstração de cerca de 1 km com ~325 mil triângulos — **não usá-lo como substituição automática de cada setor da Faísca**. As peças naturais do Adventure Land são frequentemente maiores e mais fantasiosas; testar a composição com o avatar de ~1,16 m antes de espalhá-las.

### P0/P1 — Reino, quando Adventure Land não cobre a mesma função

| ID exato e categoria | Dimensão | Estado | Motivo legítimo da exceção |
|---|---:|---|---|
| `reino/castelo/poco_manivela_baixa` | 3,12 × 2,12 × 2,60 | V2 | Poço real com manivela acessível ao avatar; não há equivalente AD constatado |
| `reino/terreno/caminho_terra_reto` | 7 × 2,60 × 0,15 | Acervo | **Caminho de terra térreo**, com extremidades documentadas |
| `reino/terreno/caminho_terra_curvo` | 4,80 × 4,80 × 0,15 | Acervo | Quarto de curva modular, raio 3,5 m, mesmo conjunto do caminho reto |
| `reino/terreno/canteiro_horta` | 3,54 × 2,04 × 0,87 | V2 | Horta legível; 6 canteiros já em cena |
| `reino/terreno/lago_nadavel` | 10,76 × 7,97 × 1,64 | Acervo | Lago com fundo e margens reais; **exige prova de geometria/água/colisão** |
| `reino/terreno/agua_mar` | 14 × 14 × 0,06 | Acervo | Superfície modular derivada de `agua_ilha_pacote` |
| `reino/terreno/lago_redondo` | 6,60 × 6,60 × 0,47 | Acervo | Pequeno lago decorativo; **não substituir** lago nadável se não servir ao mesmo gameplay |
| `reino/natureza/arvore_redonda_01` | 3,87 × 3,20 × 5,02 | V2 | Forma arredondada já usada; exceção por estilo/escalas |
| `reino/natureza/arvore_redonda_02` | 2,70 × 2,40 × 3,70 | V2 | Árvore pequena em transição, se AD não encaixar |
| `reino/natureza/arbusto_redondo_02` | 1,57 × 1,07 × 0,99 | V2 | Borda baixa natural, diferente do arbusto AD muito alto |
| `reino/natureza/flor_margarida_branca` | 0,48 × 0,50 × 0,88 | V2 | Detalhe pequeno de canteiro, diferente da flor AD de 3 m |
| `reino/natureza/rocha_pequena` | 0,96 × 0,82 × 0,94 | V2 | Pedra de borda/margem, tamanhos AD de montanha não equivalentes |
| `reino/objetos/caixote_medio` | 1 × 1 × 1 | V2 | Encomenda/oficina, sem equivalente direto identificado na seleção AD |
| `reino/objetos/placa_seta` | 1,26 × 0,31 × 1,75 | V2 | Orientação já usada; não depender de placa para legibilidade |

**Arquivos de origem:** `biblioteca_aventura/<categoria>/catalogo.json` ou `biblioteca_aventura/reino/<categoria>/catalogo.json`, com `glb/` e `miniaturas/` na mesma categoria. Há miniaturas oficiais do acervo que já foram inspecionadas nesta curadoria. **“Acervo” não significa modelo importado ou compatível com o novo renderer.**

### Referências de arte para os testes de composição

- [Adventure Land — vegetação](https://github.com/informach/artes-3d/tree/main/biblioteca_aventura/vegetacao/miniaturas), [construções e pontes](https://github.com/informach/artes-3d/tree/main/biblioteca_aventura/construcao/miniaturas), [casas e caminhos](https://github.com/informach/artes-3d/tree/main/biblioteca_aventura/plataformas/miniaturas).
- [Reino — terreno, trilhas, lago e água](https://github.com/informach/artes-3d/tree/main/biblioteca_aventura/reino/terreno/miniaturas), [natureza delicada](https://github.com/informach/artes-3d/tree/main/biblioteca_aventura/reino/natureza/miniaturas), [poço](https://github.com/informach/artes-3d/tree/main/biblioteca_aventura/reino/castelo/miniaturas).

---

## 5. Gramática de montagem: regras de qualidade não negociáveis

### 5.1. Caminhos de modelo real, sem “fitas” sobre o terreno

**Teste obrigatório A/B** em 20–30 m de percurso, sem refazer o restante da ilha:

1. Preparar uma cópia de ensaio da rota **praça → horta**, com `caminho_terra_reto` e `caminho_terra_curvo` do Reino na **escala nativa**, respeitando os pontos de encaixe do catálogo; onde a função pedir passagem elevada, testar `caminho_01_pacote` do Adventure Land como **variação localizada**, não como substituto indiscriminado.
2. Comparar os dois materiais/soluções e seu encontro com o gramado **na câmera normal de jogo** (dia e noite). As peças do Reino têm coloração terracota/rosada: não aprovar sem examinar a relação com construções, grama e ponte roxa.
3. Não encaixar peças sobrepostas/coplanares com o piso antigo. Evitar z-fighting por **geometria e composição**, não por ajuste aleatório de depth bias. Desativar ou remover a faixa provisória do mesmo corredor **somente no ensaio**, preservando a física aprovada e evitando dupla superfície visível.
4. Confirmar continuidade de altura no início, nas juntas e no fim, sem criar degrau que o avatar não deveria enfrentar. Conferir ângulo das curvas, câmera, toque e largura real caminhável.
5. Se o conjunto modular de 7 m não encaixar em um trecho curvo existente, propor ajustes **limitados aos pontos intermediários da rota** sem mover praça, horta, Pátio ou porta da Morada. Não esticar a malha e não inventar peça nova silenciosamente.

**Critério de aceite:** chão realista dentro da estética low-poly, borda limpa, continuidade do percurso, nenhuma cintilação, câmera legível, e corredores livres. O desenho do caminho deve parecer intencional, não uma régua sobre grama verde.

### 5.2. Terreno modular com a física V2 preservada

- A macrogeografia (520 m, seis saídas, setores, altura de colisão) **já foi testada**. Não trocar `relevoDaFaisca` e `setores-do-arquipelago` por uma ilha de demonstração de 130 m esticada.
- Para **acabamento visual**, testar peças de terreno do acervo que encaixem na topografia e no estilo. `plato_organico_g_3m` e `rampa_grama_3m` têm pontos/medidas documentados, mas **não são uma segunda pele universal do terreno**. Usá-los apenas quando a diferença de altura for justificada e todas as bordas/colisores forem conferidos.
- Cada modelo com base sólida deve tocar o chão em seus pontos relevantes. Calcular contato real pela malha e pelo pivô, especialmente em chão inclinado; não apoiar terreno em um único raio central e deixar as outras extremidades flutuando.
- Evitar atravessar o lote da Morada ou colocar grandes platôs que alterem o mapa/caminhos aprovados sem revisão. Toda alteração física requer regressão dos caminhos e do salvamento.

### 5.3. Água e transições de margem

- Prioridade à linguagem da água do Adventure Land; confirmar compatibilidade do material exportado com Three.js/WebGL.
- **Uma linha d’água consistente**: render, material, controlador de nado, colisores, espuma e margens devem concordar em altura e extensão.
- Não manter `circleGeometry` provisória e um segundo lago GLB **no mesmo espaço**, mesmo que um tenha pouca opacidade.
- `lago_nadavel` inclui fundo/margem com encaixe projetado para um **furo no chão**. Como não há esse furo catalogado no terreno atual do M3, a implantação só é aprovada se houver solução documentada para o encaixe da borda com o piso V2, sem degrau ou buraco de física.
- Ponte rosa existente primeiro; não alterar colisor nem ponto de chegada para encaixar visualmente um lago. Se a opção visual exigir mudança, fazer ensaio isolado A/B e repetir travessia, nado e chegada segura antes de substituir.

### 5.4. Colisão, z-fighting e flutuação

- **Flutuação:** conferir contato em perspectiva baixa do avatar, frente, trás e lateral. Verificar rotação e desnível em objetos com largura significativa. Copas/folhas podem oscilar, mas raízes e construções não devem flutuar.
- **Z-fighting:** nenhuma dupla malha coplanar de terreno/caminho, lago/água, adesivo/superfície ou duas peças repetidas no mesmo ponto. Inspecionar 5–10 segundos de vídeo com movimento de câmera; screenshot não detecta cintilação intermitente.
- **Colisão:** não criar barreiras invisíveis afastadas da base visível, nem permitir atravessar construções. Os modelos do catálogo podem ter caixas de colisão aproximadas; testar o espaço útil do avatar nativo e o acesso a portas, canteiros e ponte.
- **Instancing e descarregamento:** conservar a base técnica V2. A repetição de árvores e arbustos precisa ser feita em **grupos desenhados**, não em fileiras regulares geradas por índices.
- **Escala:** preservar o avatar de ~1,16 m e não duplicar o tamanho de um modelo apenas para preencher espaço. Há objetos originais deliberadamente monumentais; esse caráter deve servir à direção de arte, não à pressa de ocupar o mapa.

---

## 6. Primeiro passeio jogável: dois percursos e a escolha da criança

| Percurso | Batidas visuais (não são missões) | O que precisa ficar aparente |
|---|---|---|
| **Azul — cultivo e lago** | Porta `(0,150)` → praça `(0,137)` → horta `(20,139)` → curva do anel `(35,147)` → cabeceira `(58,135)` → ponte → `(58,119)` → retorno | Três escolhas desde a praça, canteiros com função, um desvio curioso, margem que conduz à ponte e vista de retorno diferente |
| **Cobre — invenções e Farol** | Praça `(0,137)` → Pátio `(−24,132)` → oficina `(−40,126)` → encosta `(−35,96)` → Farol `(-3,109)` → voltar à praça | Indícios do domínio de Croakus, oficina *parada*, vista gradual do Farol, retorno sem beco inútil |

Nesta entrega **o percurso azul recebe especificação artística completa**. O cobre recebe apenas linguagem inicial de entrada e preservação de circulação; os detalhes de Pátio e Farol são o próximo recorte, sem bloquear o Gate 2.

### Regra de interesse a cada trecho

O conceito original pedia algo reconhecível a cada ~40 m; **a 1,5 m/s isso são cerca de 27 segundos andando**. Nos percursos-piloto, trabalhar com interesse perceptível em intervalos menores de ~15–30 m, **sem exigir colecionáveis ou tarefas**. São hipóteses de level design para testar, não um padrão automático de espalhar objetos.

### O segredo dos patins e a mochila — não confundir com o acabamento M3

**Patins:** os sistemas `sistemas/patins.ts`, item de inventário e clipe `patinar` existem no jogo anterior. Propor um segredo exploratório opcional nos Campos após a ponte, associado a pistas discretas e acesso sem posto. **Neste documento, definir apenas reserva de espaço e intenção**; a localização final e mudança da origem do prêmio dependem de desenho narrativo/estado de campanha e regressão de salvamento (na V1, o prêmio veio da Vila Doce). Não conceder patins na conta real por uma ação do `/macro`.

**Mochila visível:** proposta de apresentação do inventário no avatar. Verificar catálogo/encaixe no esqueleto, compatibilidade com cabelo, capa, fantasia, roupas e ações de nado/sono. **Não existem provas de item de costas integrado só porque existe inventário**. A mochila pode ser uma peça futura de arte, mas não justifica atrasar o acabamento da praça.

---

## 7. Contrato para a sessão de implementação (somente depois de aprovar a curadoria)

**Objetivo da próxima entrega:** um **ensaio visual jogável** de Praça → Campos → Ponte do Lago, sem reescrever sistemas técnicos e sem declarar o restante da Faísca completo.

**Ordem de trabalho recomendada:**

1. **Auditar modelos**: confirmar IDs, dimensões, pivôs, materiais, pontos de encaixe, licenças, render em Three.js e instâncias; fixar commit da biblioteca; atualizar/exportar manifesto se necessários novos GLBs.
2. **Prova técnica curta de caminho**: montar reto/curva de catálogo em uma faixa curta, sem malha provisória coplanar; revisar nado/câmera apenas se interferir.
3. **Implantar Z1 Praça**: organização do centro, frentes de função, 3 saídas visíveis, paisagismo e zona de Morada intacta.
4. **Implantar Z2 Campos**: horta preservada, bordas, caminho de terra, leitura do destino; manter Íris do sistema atual.
5. **Implantar Z3 Ponte**: dois lados conectados, margens/vegetação, água sem duplicação visual, travessia física já testada.
6. **Capturar e comparar**: mesmas coordenadas de câmera do antes, dia/noite, câmera normal de jogo, fotos gerais e closes de contato; videoclipes de 20–40 s.
7. **Verificação e relatório**: testes já existentes, retomada, toque, colisão, entrada/saída de região, contadores de renderer; registrar diferenças e os pontos ainda provisórios.

**Fora do Gate 2:** reconstruir as sete ilhas, trocar o controlador Rapier, refazer setores, implementar toda a Morada, concluir campanha e Núcleo, desenhar todos os distritos, exigir a descoberta de patins, substituir o HUD Kids/adulto, criar outro motor de NPC.

### Evidências mínimas, com a mesma lente antes/depois

| Evidência | Por que existe |
|---|---|
| Vista da porta da Morada (posição-reserva) para a praça | Confirmar chegada e 3 saídas sem mapa |
| Praça do chão e superior próxima | Confirmar centro habitado, folgas, frentes e ausência de alinhamento mecânico |
| Rota praça→horta, vista caminhando | Testar inclinação, juntas de trilha, ritmo e clareza |
| Horta e seus seis canteiros | Confirmar proporção, leitura de cultivo e espaço útil |
| Entrada e saída da Ponte do Lago | Confirmar continuidade da trilha e cabeceiras distintas |
| Lateral baixa da ponte, 2–3 ângulos | Encontrar flutuação, z-fighting e separação entre água, ponte e margens |
| Farol completo e vista da praça | Manter marco monumental, sem recorte de topo ou obstrução |
| Video de caminho a pé/correndo/toque (20–40 s) | Verificar cintilação e movimento que screenshot não captura |

### Critérios de aceite — P0

- [ ] O centro não parece uma encruzilhada vazia, e a criança reconhece **Campos, Pátio e Costa** do ponto inicial.
- [ ] Nenhum objeto fixo flutua, intersecta absurdamente outra peça ou apresenta contato artificial em câmera baixa.
- [ ] **Zero z-fighting visualmente perceptível** durante caminhada/câmera em movimento nas áreas piloto.
- [ ] Caminhos do acervo montados com bordas e emendas coerentes, sem tiras de terreno sobrepostas; sem degraus inesperados.
- [ ] Ponte do Lago com duas cabeceiras caminháveis, apoio visual e colisão segura, sem modelo esticado ou suspenso.
- [ ] **Uma água visível por região**, com linha d'água igual para nado, margem e render.
- [ ] Modelo, folga de câmera e altura de interação compatíveis com avatar nativo e futuro crescimento da Morada.
- [ ] Sem nova implementação de missão, posto, Núcleo ou recompensa real, nem quebra dos testes de setores/câmera/salvamento.
- [ ] Um relatório separa **implementado**, **testado**, **provisório**, **pendência de arte** e **decisão não aprovada**.

### Critérios de aceitação de experiência — Gate 4, mais adiante

Apenas após aceite visual e prova de movimento, testar com crianças com autorização dos responsáveis. Observar se conseguem apontar duas escolhas a partir da praça, chegar à ponte sem ajuda repetitiva, reconhecer pelo ambiente que o Pátio está interrompido e sentir vontade de visitar outro lugar. A meta anteriormente proposta de **4/5 participantes** é hipótese, não resultado observado.

---

## 8. Decisões que ainda precisam de aceite artístico

1. **Caminho térreo:** aparência e encaixe de `caminho_terra_*` do Reino versus alternativas do acervo; o Adventure Land tem prioridade em sua função própria, mas não parece oferecer uma trilha térrea equivalente nesse catálogo.
2. **Lago:** manter forma física provisória e aplicar visual catalogado, ou testar troca completa para `lago_nadavel` com ajuste controlado de água/colisão; não cobrir com dois lagos.
3. **Árvores no coração:** quantidade e espécies AD/Kingdom, com vista do avatar; tamanho e silhueta devem prevalecer sobre prioridade comercial quando forem funções distintas.
4. **Frentes das casas:** se diferenciação de uso bastará com `casa_01_pacote`/`casa_02_pacote`, ou se falta um módulo arquitetônico adequado no acervo.
5. **Poço e Quadro:** zona de implantação sem obstrução do eixo principal, mantendo a distância porta→praça.
6. **Patins e mochila:** conceitos aceitos para estudo; não incluídos como prêmio efetivo nem personagem final do Gate 2 sem teste e aprovação específica.

### Resultado esperado desta etapa documental

Esta curadoria responde **quais peças usar primeiro, por quê, onde testar, como encaixar e o que comprovar**, mas não substitui inspeção dos GLBs em execução. O próximo passo não é colocar mais 500 objetos: é transformar a Praça, os Campos e a Ponte em um pequeno trecho que pareça realmente **feito por um diretor de arte e um level designer** e que sobreviva à câmera e à física do jogo.

**Princípio final:** em caso de dúvida, qualidade de composição > quantidade de objetos; Adventure Land primeiro quando há equivalência real; nenhuma nova coleção artística inventada por comodidade.
