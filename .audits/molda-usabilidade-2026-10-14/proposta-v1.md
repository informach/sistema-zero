# Proposta de refatoração do Molda para crianças de 9–12 anos

Data: 14/10/2026. Estado: proposta para discussão, sem implementação no produto.

Público confirmado: crianças de 9–12 anos criando no computador. O projeto deve funcionar com mouse e touchpad, sem exigir botão do meio, teclado numérico ou atalhos.

## Recomendação

Transformar o Molda em uma oficina de peças com ferramentas que aparecem conforme a tarefa. Preservar o motor de modelagem, pintura e animação; refazer a entrada, os gestos, a hierarquia dos comandos e a maneira de apresentar ajustes avançados.

A experiência inicial precisa permitir: escolher uma peça, colocá-la onde se quer, mudar seu tamanho, pintar, experimentar um movimento e usar a criação no jogo. Cada uma dessas ações deve produzir um resultado visível sem exigir que a criança entenda coordenadas, canais de animação, UV ou estrutura de arquivos.

Os cinco prints oferecem uma boa direção visual. Recomendo adotar sua clareza de rótulos, destaque de seleção, organização por atividade e prévias das operações. A densidade de propriedades e a linha do tempo apresentada ainda são altas para a primeira experiência.

O critério de sucesso será a autonomia da criança em tarefas reais. Quantidade de botões e aparência são indicadores auxiliares.

## 1. O que foi analisado e até onde vai a evidência

- Os cinco JPEGs em `C:/Users/tocha/Downloads/molda`, todos com data e horário `2026-10-14 at 13.23.26`.
- Os pontos centrais da oficina atual em `packages/molda`: composição da interface, seleção, transformações, pintura, animação, comandos de cena, acesso por nível, histórico, persistência e abertura de documentos.
- O desenho original de 04/09 e o histórico documentado das mudanças de 11/09. A versão legada hoje também recebeu recursos; ela não deve ser tratada como uma cópia intacta da primeira versão simples.
- A integração com `community-kids`, o controle por jornada, o guia de tarefas e a ponte com o Estúdio.
- Os testes de inventário de controles, restrições por nível e layout, lidos como contratos existentes.
- Inspeção do playground local em Chromium, perfil `explorer`, nas resoluções 1366 × 768 e 1024 × 600. Criei somente modelos de demonstração em um contexto isolado do navegador de teste.

Capturas e roteiro reproduzível: [evidências locais](../../.audits/molda-usabilidade-2026-10-14/README.md).

O navegador integrado não estava disponível; a inspeção foi feita com o Playwright já instalado no projeto. O roteiro concluiu sem erros de página. Isso comprova os estados observados, não a qualidade geral do produto. Não houve teste com crianças, medição de desempenho, auditoria exaustiva do código ou validação da nuvem/produção. As conclusões sobre facilidade de uso são hipóteses fundamentadas que precisam de teste com o público.

## 2. Diagnóstico: por que a criação ficou difícil

### 2.1 Há redução por nível, mas o básico conserva a lógica de um editor técnico

O Molda já tem `Modelar | Pintar | Animar`, pintura direta, ferramentas recolhidas e famílias liberadas por jornada. Portanto, adicionar três abas ou esconder opções avançadas novamente não resolve a causa inteira.

Mesmo no básico, selecionar uma peça apresenta transformações por X/Y/Z, aplicação de ajustes, ferramentas de câmera, aparência e organização de peças. A criança precisa relacionar o que vê no palco com vários locais da interface.

Os testes atuais limitam a contagem aproximada de controles expostos no básico a 30 no cenário inicial de teste e 55 com uma peça. Esses números são tetos declarados em testes de DOM, não uma contagem de botões realmente visíveis na tela nem uma medida científica de carga cognitiva. Ainda assim, mostram que a interface já vinha sendo contida sem uma mudança suficiente no modelo de interação.

### 2.2 Dois controles chamados “Mover” não representam um único estado

Na conferência local, selecionei “Girar” na caixa de ferramentas: as alças de rotação apareceram no modelo, mas o painel lateral permaneceu em “Mover”.

O código explica o resultado: `SceneCanvas` mantém a ferramenta ativa, enquanto `SceneNodeProperties` mantém outro estado local de ajuste. Há duas formas de operar, com estados independentes, apresentadas com os mesmos nomes.

Além disso, o formulário lateral aplica deslocamentos e fatores: mover começa em `[0, 0, 0]` e escala em `[1, 1, 1]`. Não é um inspetor que simplesmente mostra posição e tamanho atuais. Uma criança pode interpretar o zero como a posição da peça, mesmo depois de movê-la.

**Mudança necessária:** uma ferramenta ativa compartilhada entre palco, painel, teclado e dicas; medidas absolutas claramente separadas de ações como “mover um passo”.

### 2.3 Adicionar uma peça pode parecer que não aconteceu

No fluxo observado, o modelo novo já contém uma caixa. As caixas acrescentadas pelos botões nascem na mesma posição, sobrepostas. A lista cresce, mas a silhueta no palco quase não muda.

Isso corresponde ao comando `addScenePrimitive`, que cria as novas formas com translação `[0, 1, 0]`. O comando não recebe um destino da interação.

**Mudança necessária:** criação com posição explícita, prévia visível e confirmação simples; duplicatas devem nascer deslocadas ou prontas para posicionar. Uma mensagem de sucesso não substitui ver a peça aparecer.

### 2.4 O palco perde espaço para explicar o próprio editor

Na animação, após criar um movimento, o canvas mediu 998 × 288 px na janela de 1366 × 768. As vistas, instruções e gravação de pose ainda ocupavam parte dessa área. Em 1024 × 600, a área de tempo continuava abaixo da dobra.

O problema não é apenas conseguir acessar cada controle. É conseguir ver a criação durante a tarefa. Os testes de layout atuais incluem verificações úteis de sobreposição, mas um piso de 150 px para o palco não representa uma boa área de trabalho infantil.

### 2.5 A animação exige entender a implementação antes de obter o primeiro resultado

O caminho manual expõe nome de movimento, tempo em segundos, canais separados, chave, pose, gravação e formas de interpolação. Os movimentos prontos existentes também abrem um formulário de nome, duração, intensidade e eixo antes da prévia.

O motor já oferece pular, balançar e girar. A oportunidade é transformar isso em escolha visual com valores iniciais sensatos, seguida de ajustes opcionais.

### 2.6 A orientação está mais próxima de um manual do que de uma ajuda na ação

`SceneFirstSteps` oferece dicas em sequência, mas seu estado é de leitura e não acompanha a realização da tarefa. Uma instrução genérica para arrastar alças pode aparecer quando nenhuma ferramenta de transformação está ativa.

O guia vindo do Pensa é uma integração distinta, com objetivo, etapas e resultado. Um novo tutorial precisa conversar com esse guia para evitar duas instruções competindo pelo mesmo espaço.

### 2.7 Parte dos contratos de interface preserva a complexidade atual

`SceneWorkshop.contract.test.tsx` contém a regra de que selecionar uma peça só pode acrescentar controles; apenas a troca de abas pode trocar o conjunto. Isso foi útil para impedir que comandos desaparecessem em reorganizações anteriores.

A nova interface precisa permitir substituição contextual: ao girar, mostrar os controles de giro; ao pintar, mostrar tinta; ao terminar uma operação, retirar seus controles. O contrato deve garantir que funções continuem alcançáveis no contexto correto, sem exigir que todas permaneçam simultaneamente montadas ou visíveis.

## 3. Leitura dos cinco prints

Os sufixos abaixo identificam os arquivos originais.

| Print | O que aproveitar | O que modificar para o público confirmado |
|---|---|---|
| `(3)` — Modelar / Mover | Grande área central, forma selecionada com contorno, ferramentas com nome, dica ligada à ação, recuperação da vista | Tirar os 12 campos de posição/tamanho/pivô/giro da primeira camada; retirar Face/Ponto, Pivô e Cortar do caminho inicial; recolher a árvore quando desnecessária; oferecer movimento no chão e subir/descer com alvos maiores |
| `(4)` — Pintar | Pintura sobre o modelo, paleta visível, tamanhos de pincel, ferramentas reconhecíveis, indicação de espelho | Paleta antes do seletor RGB/hex; iniciar com “Só esta peça”; “Todas as peças” exige uma implementação própria de pintura entre alvos; espelho deve explicar seu alcance; manter alternativa explícita para olhar o modelo |
| `(2)` — Pivô | Prévia “Assim ela vai girar” e posições prontas são didáticas | Apresentar como “Onde gira” dentro de Girar → Mais opções; mostrar Centro/Base/Canto visualmente; definir qual canto e em qual referência; deixar coordenadas para precisão; a prévia não altera a peça até confirmar |
| `(1)` — Cortar | Marcação de pontos, prévia colorida e Aplicar/Cancelar tornam a operação verificável | Levar para “Editar a forma”; distinguir criar uma divisão de remover um pedaço; fazer a seleção Peça/Face/Ponto refletir a operação; permitir corrigir ponto errado; não supor que o corte por dois pontos já existe no motor |
| Sem sufixo — Animar | Movimento escolhido evidente, destaque de pose, reprodução e sugestão de movimento pronto | Começar com cartões Pular/Balançar/Girar e, depois, poses com miniaturas; levar trilhas de Mover/Girar/Tamanho para edição detalhada; retirar gravação automática da primeira camada; não expor pivô como ferramenta diária |

Há duas ambiguidades específicas nos desenhos. No corte, “Peça inteira” permanece selecionado enquanto há pontos marcados. Na legenda dos eixos, “lado” e “frente e fundo” parecem direções da tela, embora dependam da orientação do modelo. Essas relações precisam aparecer na prévia, não depender de legenda fixa.

O botão “Salvar e exportar” também mistura duas intenções. Salvar protege o trabalho; exportar prepara uma saída. A proposta mantém salvamento automático com estado confiável e apresenta a saída pelo objetivo: “Usar no jogo”, “Baixar uma imagem” ou “Baixar o projeto”.

## 4. Alternativas consideradas

| Caminho | Benefício | Limitação | Decisão |
|---|---|---|---|
| Reorganizar os painéis seguindo os prints | Entrega visual mais rápida, pouco impacto no domínio | Conserva gestos técnicos, sobreposição de peças, estados independentes e dificuldade de animar | Útil como parte da primeira entrega, insuficiente sozinho |
| Manter um Molda simples e um Molda completo separados | Entrada muito enxuta | Duas experiências, manutenção duplicada e dificuldade de transição dos projetos | Não recomendado como arquitetura permanente |
| Uma oficina com revelação por tarefa sobre o motor atual | Mantém potência e documentos; aprende-se aos poucos; evolução contínua | Exige trabalho em estados e interação, além do layout | **Recomendado** |

Três níveis internos de apresentação: ações imediatas, ajustes contextuais e edição detalhada. A criança não precisa escolher “iniciante/intermediário/profissional” antes de começar. Ela encontra “Mais opções”, “Editar a forma” e “Ver linha do tempo” no lugar em que fazem sentido.

## 5. Organização da nova oficina

### 5.1 Uma entrada que já permite fazer algo

Na galeria, “Criar modelo” abre a oficina com nome provisório editável e uma caixa selecionada, pronta para mudar. “Começar de um modelo” apresenta os modelos existentes. Texturas e céus continuam disponíveis na galeria como tipos próprios de criação.

Não exigir tipo, continuar e nome antes da primeira interação quando a criança já escolheu criar um modelo. Uma tarefa do Pensa ou de aula pode fornecer o tipo e a base; o editor usa esse contexto.

A caixa inicial deve ser deliberada: selecionada, fácil de apagar e acompanhada de uma única sugestão útil. “Começar vazio” fica disponível como alternativa. Modelos prontos entram como cópias editáveis, preservando a criação de origem.

### 5.2 Regiões estáveis

```text
← Meus projetos  Minha criação · Guardado   Desfazer Refazer   Usar no jogo  ⋯

                    Modelar    Pintar    Animar

 PEÇAS           PALCO GRANDE E DESOBSTRUÍDO              AJUSTE ATUAL
 Caixa                                                   Caixa 2
 Rampa           peça selecionada e sua prévia            Mover/Girar/Tamanho
 Cilindro                                                só o ajuste escolhido
 Bola                                                    Cor · Duplicar · ⋯
 Mais peças

                 Frente · Lado · Cima · Ver tudo          Peças do modelo
                 −  Aproximar  +                         Mais opções

                 Uma dica curta, apenas quando útil
```

O desenho é um wireframe de organização, não uma especificação final de pixels. A posição dos comandos deve permanecer consistente; o painel da direita muda seu conteúdo conforme a ação, sem disputar com outro painel de propriedades.

- No Modelar, a coluna de peças permanece visível. Transformações ficam junto da seleção/painel; nenhum formulário X/Y/Z aberto por padrão.
- No Pintar, a mesma região de ferramentas recebe Pincel, Balde, Borracha e Pegar cor. Paleta e tamanho ficam próximos.
- No Animar, entram movimentos e poses. A coluna de formas desaparece.
- “Peças do modelo” abre uma lista compacta com identificação visual e nomes únicos. Hierarquia completa é uma expansão intencional.
- Ajuda, menus e dicas usam áreas reservadas; nenhum cartão permanente cobre o centro da criação.

Para 1366 × 768, estabelecer como alvo de projeto pelo menos 480 px de altura útil do palco no caminho básico, inclusive na animação simples. Para 1024 × 600, trabalhar com um único painel lateral recolhível e uma faixa curta de reprodução; alvo inicial de 340 px úteis. São orçamentos de layout a validar no protótipo, com o chrome real do kids, e não resultados já atingidos.

### 5.3 Ferramenta disponível e ferramenta exposta são decisões diferentes

O acesso por jornada já existente continua sendo o limite de autoria. A apresentação contextual só decide o que aparece agora entre as ferramentas permitidas. Uma criança com nível avançado também deve abrir uma oficina simples; ganhar um nível não deve preencher a tela com controles novos automaticamente.

Arquivos que já contenham ossos, materiais especiais ou animações continuam visíveis e reproduzíveis. A interface não simplifica o documento nem apaga dados de recursos escondidos. Essa proteção já aparece na arquitetura atual e deve permanecer.

## 6. Modelar: desenhar a interação a partir da peça

### 6.1 Adicionar e duplicar

Ao escolher uma forma, mostrar uma prévia translúcida em posição útil e oferecer dois caminhos equivalentes:

1. Clicar no chão ou em uma superfície para posicionar; a prévia acompanha o destino e um clique confirma.
2. Usar “Colocar ao lado”, com deslocamento calculado pelo tamanho da peça, sem precisar arrastar.

A prévia pode sugerir “Em cima” ou “Ao lado” quando houver uma seleção. Não confirmar uma peça escondida dentro de outra. Sobreposição continua possível por intenção explícita, porque é útil na modelagem.

Duplicar segue o mesmo comportamento: mostra a cópia deslocada, mantém a original visível e permite posicionar. Nome automático distinguível: Caixa 2, Caixa 3. A operação inteira ocupa um passo de desfazer.

Na primeira entrega, basta garantir inserção visível ao lado e comando “Colocar no chão”. Posicionamento por superfície e encaixes mais sofisticados vêm em seguida; não precisam bloquear a correção da sobreposição atual.

### 6.2 Mover

Mover deve ser a ação padrão da peça recém-criada ou selecionada. Arrastar seu corpo move no plano do chão; subir/descer usa uma alça grande e distinta. O deslocamento começa após um pequeno limiar para distinguir clique de movimento.

A prévia mostra a posição de destino e uma sombra/guia até o chão. Passos discretos de movimento devem existir por botões, além do teclado, para quem não consegue arrastar com precisão. As direções dos botões precisam corresponder à vista atual e à projeção mostrada, sem exigir interpretar letras X/Y/Z.

Encaixe à grade vem com configuração simples e consistente. Encaixe à superfície mostra o contato previsto antes de aplicar. O editor não muda de plano ou de suporte silenciosamente durante o mesmo gesto. Alterações de snap não arredondam o documento inteiro nem deformam arquivos importados.

“Colocar no chão” é uma ação visível, reversível e aplicada à seleção; não uma gravidade automática que derruba peças elevadas de propósito.

### 6.3 Mudar tamanho

Controles iniciais: Maior/Menor com proporção preservada e alças de largura/altura/comprimento quando a criança escolher esticar. A prévia diferencia aumentar tudo de alongar uma direção.

Manter a base apoiada ao aumentar a altura de peças comuns no chão. Para peças elevadas ou importadas, preservar a referência escolhida. Evitar tamanho zero ou inversão acidental. O painel deve dizer “Altura” e mostrar a altura resultante, em vez de apresentar o fator `1` sem contexto.

Coordenadas, escala relativa e medidas exatas ficam em “Medidas”, respeitando as famílias de ferramentas já liberadas.

### 6.4 Girar

Primeira camada: girar um quarto de volta e deitar/levantar, com indicação visual do eixo da ação. Arrasto de rotação entra como ajuste adicional, com encaixes previsíveis e possibilidade de desfazer.

“Onde gira” abre Centro/Base/Ponto escolhido e uma animação curta de prévia. Essa é uma das melhores ideias do print de pivô. Os campos numéricos continuam disponíveis na edição precisa.

Não assumir que o centro da caixa delimitadora é o pivô correto de toda peça importada. O caminho simples sugere; o documento preserva o pivô autoral até uma mudança explícita.

### 6.5 Selecionar, juntar e encontrar peças

Clique identifica a peça com contorno e nome curto. A seleção na lista e no palco é a mesma. “Escolher várias” é uma ação visível; Shift é apenas um atalho.

Com várias peças selecionadas, oferecer “Juntar para mover” com uma prévia. Isso cria um grupo reversível; não funde malhas. O comando de fundir geometria permanece distinto na edição detalhada.

A lista abre por “Peças do modelo”, com miniatura/ícone, nome e indicação de seleção. Ocultar/travar e organização de grupos aparecem quando solicitados. Peças ocultas têm um caminho claro para reaparecer; “Ver tudo” de câmera não deve mudar o estado de visibilidade das peças.

### 6.6 Editar a forma e cortar

“Editar a forma” é uma passagem explícita para faces, pontos e linhas. O cabeçalho passa a dizer “Editando a forma de Caixa 2” e oferece “Voltar às peças”.

Começar pelos verbos que geram uma mudança visível, como Puxar uma face. Cortar é uma ferramenta posterior, com prévia, escolha do lado e aplicação/cancelamento.

O print representa marcação em bordas, mas o componente atual `ScenePlaneCut` pede eixo e posição de um plano. Dois pontos em uma imagem 2D não determinam sozinhos qualquer corte 3D. O protótipo deve começar com uma vista/plano definido e mostrar exatamente o plano e o resultado. Cortes não suportados explicam o motivo sem alterar a peça.

Na presença de UV, pintura, animação ou deformação por ossos, a operação precisa demonstrar que preserva esses vínculos ou apresentar uma revisão explícita das consequências. Não é apenas trocar o formulário por um desenho.

## 7. Câmera: distinguir olhar de mexer

Contrato recomendado:

| Intenção | Interação principal | Alternativa sem arrasto |
|---|---|---|
| Escolher uma peça | Clique na peça ou na lista | Lista navegável pelo teclado |
| Mover no chão | Arrasto no corpo da peça com Mover ativo | Botões de pequenos passos |
| Subir/descer | Alça vertical | Botões Subir/Descer |
| Olhar ao redor | Arrasto iniciado no fundo; “Olhar” permite arrastar sobre o modelo | Botões de vista e giro da câmera |
| Aproximar/afastar | Roda do mouse ou gesto compatível do touchpad | Botões + e − |
| Recuperar o modelo | “Ver tudo” | O mesmo botão sempre acessível |
| Recuperar orientação | “Vista inicial” no controle de vista | O mesmo comando pelo teclado |

O gesto é decidido no início e permanece com o mesmo dono até soltar. Um traço de tinta que sai da peça não passa a girar a câmera; um arrasto de câmera que cruza a peça não pinta. Essa separação deve aproveitar os mecanismos atuais de captura de ponteiro.

“Ver tudo” enquadra todas as peças visíveis; quando há seleção, oferecer também “Ver esta peça”. Manter a câmera durante troca de abas e abertura de painéis. Não recentralizar automaticamente a cada seleção. Se o objeto sair da área visível, oferecer recuperação em vez de obrigar a aprender navegação 3D.

## 8. Pintar: uma ação com resultado imediato

Aba Pintar abre com a peça selecionada pronta para receber tinta e a última cor escolhida. Primeiro plano: Pincel, Balde, Borracha, Pegar cor, paleta e três tamanhos. O seletor completo de cores só abre em “Mais cores”.

As ferramentas extras atuais — girar pintura, espelhar, vestir com textura, camadas, carimbos, mapas e UV — recebem destinos claros em “Mais jeitos de pintar” e contextos especializados, conforme acesso. Pintar de perto deve continuar fácil de descobrir, como ação junto da face, porque ajuda com olhos, detalhes e touchpad.

O alvo inicial é “Só esta peça”, destacado na tela. Trocar de peça exige uma ação perceptível e preserva cor/pincel. “Todas as peças”, sugerido no print, é evolução opcional: exige roteamento entre alvos, preparação de superfícies e um único desfazer para um traço que atravesse várias peças. Não deve ser prometido como simples seletor já disponível.

Definir a semântica do balde: “Esta área” mantém preenchimento por cor; “Peça inteira” é uma opção separada com prévia. A borracha volta à base da pintura no caminho simples; transparência de materiais precisa ser explicitamente diferenciada.

Espelho de pintura informa “Também pinta o outro lado desta peça”. Ele não deve insinuar que duas peças separadas serão pintadas juntas. Na pintura de perto, mostrar claramente a limitação ou implementar o espelho equivalente antes de oferecer a opção.

Faces incompatíveis não devem apresentar uma ordem técnica para “triangular” como primeiro socorro. Explicar o resultado: “Esta parte precisa de um ajuste para receber a tinta”. Mostrar uma prévia e confirmar se houver alteração real de geometria; manter o caminho técnico para quem já o utiliza.

## 9. Animar: resultado primeiro, controle detalhado depois

### 9.1 Primeira experiência: escolher um movimento

Ao abrir Animar, apresentar Pular, Balançar, Girar e Criar meu movimento, com pequenas demonstrações. Os três primeiros usam o motor de presets existente.

Escolher Pular abre uma prévia imediatamente, com alvo explícito: “Esta peça” ou “O modelo todo”. Oferecer Lento/Normal/Rápido e Pouco/Médio/Muito. Nome, eixo, duração decimal e amplitude exata ficam em Mais opções. “Usar movimento” confirma; “Voltar” cancela a prévia.

Movimentar “O modelo todo” deve preservar as distâncias entre peças e usar uma referência comum. Aplicar a mesma rotação local separadamente em cada peça não equivale a girar o conjunto. Esse comando precisa de tratamento de conjunto no domínio e teste com grupos e importados; não pode ser uma suposição da interface.

Movimentos como Andar ou Girar rodas dependem de peças, eixos e articulação. O print não demonstra que o sistema identifica isso. Adiar esses presets para bases preparadas com alvos conhecidos ou um pequeno fluxo de escolha das rodas/pernas. Não prometer animação automática de qualquer modelo.

### 9.2 Criar meu movimento: poses com miniaturas

Criar um movimento manual guarda o estado inicial do alvo e abre dois momentos: Começo e Final, com miniaturas. A duração inicial pode ser 2 s, ajustável por velocidade. A criança escolhe Final, muda a peça e usa “Guardar pose”. O sistema registra os canais alterados juntos.

```text
Meu movimento                         ▶ Ver movimento     Repetir

[ Começo: miniatura ]  →  [ Final: miniatura ]  [+ Mais uma pose]

Selecionar um momento → mexer na peça → Guardar pose
                                          Cancelar ajuste
```

O estado “Pose ainda não guardada” fica próximo do botão, sem cobrir o modelo. Trocar de aba ou sair com essa prévia pendente oferece Guardar/Descartar/Continuar ajustando. Navegar sem alterações não abre confirmação.

Gravar ao soltar as alças é uma preferência de edição detalhada. A primeira experiência tem uma regra única e visível. Adicionar mais poses e ajustar sua duração são expansões graduais. Miniaturas devem corresponder à pose avaliada, não apenas à posição base da cena.

### 9.3 Edição detalhada

“Ver linha do tempo” expande trilhas por peça e canal, chaves, tempo exato, interpolação e curvas. Abrir ou fechar essa apresentação não converte nem reduz os dados do movimento.

Na tela simples, um movimento importado com canais/curvas que o storyboard não consegue editar com fidelidade continua reproduzível e recebe acesso ao editor adequado, conforme permissão. Não representar um arquivo complexo como duas poses se isso apagar o que acontece entre elas.

## 10. Linguagem, aparência e ajuda

O domínio visual é uma bancada de construção: peças, encaixes, tinta, carimbos, poses e modelos de partida. As cores de referência vêm desse espaço: papel claro, grafite, azul de peça, amarelo de marcação, verde de confirmação, vermelho de ação destrutiva. Usar a identidade existente, com cor forte principalmente na criação e no estado ativo.

A assinatura da experiência é **a prévia da ação sobre a peça**: onde vai entrar, como aumenta, onde gira, o que será cortado e como se move. O padrão se repete nessas cinco situações com aparência e regras consistentes.

Três escolhas estruturais:

- O inspetor permanente de propriedades dá lugar ao ajuste da ação atual.
- A árvore técnica dá lugar à seleção no modelo e à lista de peças sob demanda.
- O passeio por todos os botões dá lugar a uma tarefa curta com resultado próprio.

Ícone e nome nos comandos essenciais. Texto confortável, com referência inicial de 16 px para instruções e 14–16 px para rótulos. Alvos principais de 44–48 px são uma decisão de produto para esta experiência; não confundir com o mínimo de 24 px e suas exceções na WCAG 2.2. Contraste, foco e indicação de seleção devem funcionar sem depender só de cor. [W3C: tamanho de alvo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Arrastos precisam de alternativas acionáveis por clique; atalhos de teclado não substituem todas essas alternativas. [W3C: movimentos de arrastar](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html).

| Atual / técnico | Na primeira camada | Onde manter precisão |
|---|---|---|
| Enquadrar seleção | Ver esta peça / Ver tudo | Controles de câmera |
| Pivô | Onde gira | Mais opções de Girar |
| Escala X/Y/Z | Maior/Menor; largura/altura/comprimento | Medidas e escala |
| Locator / ponto de apoio | Mostrar quando a tarefa pede articulação | Ferramentas de articulação |
| Keyframe / chave | Pose / momento | Linha do tempo detalhada |
| UV / atlas | Não exigir para pintar | Encaixar pintura |
| Exportar GLB | Usar no jogo | Formatos de exportação |

Uma orientação inicial opcional pode propor: “Monte um bichinho com três peças”. Mostrar uma ação por vez e avançar quando a ação acontecer, permitindo pular e criar livremente. Ajudar a criar uma variante, não apenas copiar um tutorial. Modelos iniciais e tutoriais contextualizados têm um precedente útil nos recursos oficiais do Scratch. [Scratch Foundation](https://www.scratchfoundation.org/learn/learning-library/getting-started).

Para a faixa confirmada, evitar decoração infantil excessiva, mascotes permanentes, parágrafos de instrução e celebração após cada clique. A pesquisa de usabilidade com crianças reforça diferenças por idade, pouca leitura de explicações extensas e dificuldade com navegação redundante. Isso orienta a hipótese, mas não substitui testar o Molda. [NN/g: pesquisa com crianças](https://www.nngroup.com/articles/childrens-websites-usability-issues/).

Se uma tarefa veio do Pensa, usar um único espaço de orientação. O objetivo da tarefa permanece disponível recolhido; a dica local explica apenas a ação atual. Não inventar conclusão automática de uma tarefa criativa só porque a criança clicou nos botões esperados.

## 11. Salvamento, saída e confiança

O salvamento automático já existe, com debounce padrão de 600 ms. A nova UI deve comunicar o estado real e diferenciar “Guardado neste computador”, “Guardando na conta”, “Guardado na conta” e falha. Um selo verde não pode significar duas garantias diferentes.

Desfazer e Refazer ficam sempre acessíveis. Um arrasto, traço, aplicação de preset ou confirmação de corte corresponde a uma ação percebida no histórico. Prévia cancelada não modifica o projeto nem elimina o Refazer sem motivo.

Sair de uma criação já guardada deve levar à galeria diretamente, após resolver a gravação local e a política de sincronização. Perguntar somente quando há prévia não confirmada ou risco real de perda/erro. A política deve respeitar o fluxo atual de revisão da ponte com o Estúdio.

“Usar no jogo” usa o perfil de exportação adequado. Havendo limitações, a revisão explica a diferença concreta: o que a criança verá diferente no jogo. Mantém o projeto original. Backup e formatos de intercâmbio ficam no menu do projeto, acessíveis sem competir com criar.

## 12. Destino dos recursos existentes

| Família | Apresentação recomendada |
|---|---|
| Caixa, rampa, cilindro, bola | Primeira camada em Modelar |
| Mover, tamanho, girar, cor, duplicar, apagar | Contexto da peça; ações frequentes visíveis |
| Agrupar, espelhar, alinhar, apoiar | Mais opções, com prévias e requisitos claros; o que não existir vira trabalho explícito |
| Medidas e ponto de giro | Precisão / Mais opções de Girar, conforme acesso |
| Pontos, linhas, faces, extrusão, corte, bevel | Editar a forma; mostrar só ferramentas aplicáveis à seleção |
| Pincel, balde, borracha, pegar cor | Primeira camada em Pintar |
| Pintura de perto | Acesso próximo da face e ferramenta identificável |
| Texturas, espelho de pintura, carimbos, formas | Mais jeitos de pintar |
| Camadas, UV, mapas PBR, materiais e flipbook | Edição detalhada de pintura |
| Pular, balançar, girar | Entrada de Animar, com prévia |
| Movimento autoral | Poses visuais; linha do tempo por escolha |
| Curvas, ossos, pesos, IK e articulações | Contextos avançados dedicados |
| Imagem de referência | Ajuda para criar / Imagem de apoio |
| Céus e texturas independentes | Galeria e editores existentes; sem ocupar a oficina de modelos |
| Importar GLB/glTF/OBJ/bbmodel, revisar perdas, backup | Menu do projeto e fluxos dedicados, respeitando acesso |
| Levar ao Estúdio | Saída principal orientada ao objetivo |

“Mais opções” não deve virar um único depósito de tudo. Cada ferramenta tem um destino por atividade e uma forma de retorno. O padrão de revelação progressiva apoia essa organização de funções raras ou avançadas em camadas posteriores. [NN/g: revelação progressiva](https://www.nngroup.com/articles/progressive-disclosure/).

## 13. Arquitetura da refatoração

### 13.1 Preservar a base que já sustenta o produto

Manter `MoldaSceneDocument`, comandos puros de `scene/`, operações de pintura, workers, orçamento de histórico, persistência, importação/exportação, compatibilidade com o Estúdio e promoção de documentos legados.

A UI simples não requer um novo formato de projeto. Preferências de painel, dicas e densidade pertencem à sessão/perfil, separadas do documento. Qualquer novo dado autoral necessário deve ser justificado individualmente.

`MoldaApp` já distingue geração 1 e 2; o host kids liga `sceneWorkshop: true`. Projetos promovidos continuam abrindo na geração 2. Não voltar os documentos para a geração antiga para obter uma tela simples.

### 13.2 Unificar o estado de interação

Criar um controlador explícito da experiência, reaproveitando `useSceneWorkshop` e os stores pertinentes, com atividade, seleção, ferramenta ativa, contexto de edição e transação pendente. Os nomes exatos dos módulos ficam para a especificação técnica.

Estados como “colocando peça”, “movendo”, “pintando”, “ajustando pose” e “prévia de corte” devem ser mutuamente compatíveis por regra. Ao trocar de atividade, terminar/cancelar o gesto corretamente e resolver prévias pendentes. Formulários, alças e atalhos consultam o mesmo estado; o painel não mantém outro “Mover” independente.

Separar estado de navegação/câmera de autoria. Não remontar o viewport por trocar um painel. Usar seletores para que movimento do ponteiro não redesenhe toda a interface.

### 13.3 Separar três decisões

1. **Acesso:** a família pode ser editada por esse perfil? Continuar usando `toolAccess`.
2. **Aplicabilidade:** o comando faz sentido para esta peça, seleção e estado?
3. **Apresentação:** fica visível agora, em mais opções ou em edição detalhada?

O registro de comandos deve unir nome, ação, acesso, contexto, dica e atalho. Reaproveitar `sceneCommandRegistry` e `sceneCommandAccess`; evitar um catálogo paralelo de comandos que depois diverge.

### 13.4 Componentes e responsabilidades

| Área atual | Intervenção |
|---|---|
| `SceneWorkshop` / `SceneWorkshopBar` | Nova composição, saída orientada ao objetivo, áreas reservadas para contexto e ajuda |
| `SceneCanvas` / `SceneNodeProperties` | Ferramenta compartilhada e painel contextual; eliminar modos independentes com o mesmo nome |
| `SceneCreateMenu` / comandos de cena | Posição de inserção e duplicação explícitas; prévia e uma confirmação por operação |
| `SceneTransformGizmo` / navegação | Alças e alternativas simples sobre os mesmos comandos; preservar caminho preciso |
| `ScenePaintToolbox` / `ScenePaintKid` | Hierarquia simples e alvo evidente; aproveitar a captura de gesto existente |
| `SceneAnimationPresets` | Cartões com prévia e valores iniciais; formulário técnico em expansão |
| `SceneAnimationTimeline` / Inspector | Storyboard e edição detalhada como apresentações do mesmo movimento |
| `SceneFirstSteps` / `molda-task-guide` | Ajuda pelo contexto e espaço único de orientação |
| `SceneExitControl` / status do host | Saída direta quando segura; estado local e nuvem comunicados corretamente |

### 13.5 Diferenciar reapresentação de capacidade nova

Reapresentação: paleta, ferramentas com rótulo, reorganização da árvore, presets de animação existentes, salvamento e histórico.

Trabalho de interação/domínio: colocação visível e por superfície, movimento por plano, apoio no chão, escala ancorada, manipulação de conjunto, storyboard fiel e pivô visual.

Expansões opcionais: pintura contínua entre várias peças, corte livre por pontos e animações semânticas de andar/rodas. Não incluí-las como se já fossem apenas uma troca de layout.

## 14. Plano de entrega por resultados

| Etapa | Resultado revisável | Critério para avançar |
|---|---|---|
| 0. Linha de base e protótipo de tarefas | Mesmas tarefas na UI atual e um protótipo de colocar/mover/pintar/animar; especificação de gestos e estados | Fluxos compreensíveis em mouse e touchpad; decisões de alvo e câmera resolvidas |
| 1. Simplificar o caminho básico | Menos etapas para criar; peça inicial pronta; ferramenta única; painel contextual; nova peça visível; recuperação de câmera; saída clara | Criar, posicionar, redimensionar, colorir e desfazer sem X/Y/Z e sem estados contraditórios |
| 2. Facilitar montagem e pintura | Movimento no chão, subir/descer, encaixe previsível, duplicação visível, girar/deitar, pintura focada e de perto | Crianças montam um objeto de várias peças e pintam um detalhe sem intervenção |
| 3. Facilitar animação | Presets com prévia imediata e poses com miniaturas; reprodução compacta | Conseguem animar e explicar o que muda entre duas poses; palco preservado |
| 4. Reorganizar precisão e ferramentas avançadas | Pivô visual, malha, corte, UV, materiais e articulação em contextos próprios | Funções anteriores continuam alcançáveis; abrir/editar/exportar documentos existentes preserva conteúdo |
| 5. Piloto no kids e expansão | Chrome real, guia do Pensa, salvamento/nuvem, Estúdio e preferência de interface | Critérios de autonomia e regressão atingidos; retorno para a casca anterior possível sem downgrade do documento |

A primeira liberação precisa incluir correções de comportamento, especialmente inserção e estado compartilhado. Apenas recolher painéis pode esconder os mesmos obstáculos.

Estimativa de calendário depende da equipe e dos resultados do protótipo. O risco técnico maior está nos novos gestos, fidelidade do storyboard e operações em arquivos complexos; a troca visual da casca é uma parte menor. É mais útil estimar essas frentes separadamente após a etapa 0 do que prometer uma data única agora.

## 15. Validação com crianças e critérios de aceite

Recrutar inicialmente 8–12 crianças, divididas entre 9–10 e 11–12 anos, incluindo iniciantes reais em 3D e usuários atuais. Distribuir mouse e touchpad. Essa amostra serve à descoberta qualitativa; não sustenta conclusões estatísticas sobre toda a população.

Comparar tarefas equivalentes na versão atual e na proposta, alternando a ordem para reduzir efeito de aprendizagem. Registrar intervenção do adulto e distinguir ajuda de interface de instrução específica dada pelo moderador. Não explicar os botões antes da primeira tentativa.

Tarefas propostas:

1. Fazer uma casinha com caixa e telhado, começando sem modelo pronto.
2. Acrescentar uma peça em cima, mudar sua altura e duplicar para o lado.
3. Pintar uma janela sem pintar a peça errada.
4. Girar a vista, perder deliberadamente o enquadramento e recuperar a criação.
5. Desfazer uma mudança e refazê-la.
6. Fazer uma criação pular e criar um movimento simples de duas poses.
7. Sair, abrir novamente e usar a criação no jogo.
8. Criar livremente algo diferente por alguns minutos, para verificar transferência do aprendizado.

Metas iniciais de produto, ajustáveis após a linha de base:

| Indicador | Meta proposta |
|---|---|
| Primeiro resultado intencional | Até 60 s para alterar/criar a primeira peça |
| Criação com várias peças | Pelo menos 80% concluem a tarefa principal sem instrução direta do adulto |
| Recuperar câmera e desfazer | Pelo menos 90% encontram e executam as duas ações |
| Movimento pronto | Até 60 s entre abrir Animar e ver um movimento adequado |
| Ajuda do adulto | Redução de pelo menos 50% das intervenções em tarefas equivalentes |
| Segurança do conteúdo | Nenhuma perda de dados nos cenários de compatibilidade definidos |
| Confiança | A criança consegue mostrar como corrigir um erro sem recomeçar o projeto |

São alvos, não ganhos já comprovados. Informar resultados como contagens e tempos observados no piloto, além de percentuais, dada a amostra pequena. Um aumento no uso de Desfazer pode indicar exploração saudável; não tratá-lo isoladamente como falha.

Verificação técnica necessária antes de liberar:

- Fluxos completos em 1366 × 768 e 1024 × 600, zoom de interface e diferentes escalas do sistema; nenhum comando essencial exclusivamente por hover.
- Um gesto/uma ação no histórico; cancelar restaura conteúdo e mantém Refazer quando aplicável.
- Gesto de pintura e câmera não trocam de dono; seleção, ferramenta e painel permanecem coerentes.
- Abrir, editar o permitido e exportar projetos legados/promovidos e cenas com animação, skin, mapas, UV e importações, sem perda silenciosa.
- Snap e operações simples preservam transformações existentes, inclusive hierarquias e matrizes de importados.
- Autosave, offline, falha de armazenamento, saída durante salvamento e retomada com a conta correta.
- Contratos atualizados para alcance contextual de comandos, sem reduzir a proteção dos recursos existentes.
- Medir fluidez em notebook de entrada: feedback imediato, ausência de travamentos perceptíveis durante arrasto e manutenção do carregamento sob demanda. As metas técnicas exatas vêm da linha de base.

## 16. Decisões recomendadas para orientar o refactor

1. Manter um único motor/documento e refazer a experiência de entrada.
2. Preservar as três atividades Modelar, Pintar e Animar; tratar “Montar” como linguagem de ajuda, evitando uma renomeação ampla sem teste.
3. Retirar coordenadas, pivô, malha e timeline detalhada da primeira camada.
4. Unificar o estado da ferramenta antes de redesenhar seus controles.
5. Garantir que adicionar e duplicar sempre produzam um resultado visível.
6. Facilitar câmera e posicionamento com alternativas aos arrastos precisos.
7. Usar movimentos prontos e poses visuais como entrada da animação.
8. Tratar acesso por jornada e complexidade da apresentação separadamente.
9. Preservar projetos e recursos avançados, sem fazer conversões destrutivas para caber na interface simples.
10. Liberar cada etapa conforme tarefas com crianças e regressões de conteúdo, além de avaliação visual.

O Molda deve ensinar os conceitos de 3D enquanto a criança consegue construir algo. As ferramentas técnicas entram quando ampliam uma intenção que ela já tem: fazer a peça caber, dobrar, girar de outro jeito ou ganhar um movimento próprio.

## Referências locais principais

- [Abertura e gerações do documento](../../packages/molda/src/components/MoldaApp.tsx)
- [Host kids e ativação da oficina](../../packages/community-kids/src/components/kids/molda-client.tsx)
- [Famílias e acesso](../../packages/molda/src/core/toolFamilies.ts)
- [Casca da oficina](../../packages/molda/src/components/editor/scene/SceneWorkshop.tsx)
- [Estado da oficina](../../packages/molda/src/components/editor/scene/useSceneWorkshop.ts)
- [Ferramenta do palco](../../packages/molda/src/components/editor/scene/SceneCanvas.tsx)
- [Painel de propriedades](../../packages/molda/src/components/editor/scene/SceneNodeProperties.tsx)
- [Semântica dos ajustes](../../packages/molda/src/components/editor/scene/sceneAdjustment.ts)
- [Criação de peças](../../packages/molda/src/scene/commands.ts)
- [Pintura básica](../../packages/molda/src/components/editor/scene/ScenePaintToolbox.tsx)
- [Movimentos prontos](../../packages/molda/src/scene/animationPresets.ts)
- [Linha do tempo](../../packages/molda/src/components/editor/scene/SceneAnimationTimeline.tsx)
- [Corte atual por plano](../../packages/molda/src/components/editor/scene/ScenePlaneCut.tsx)
- [Histórico e salvamento](../../packages/molda/src/state/editorStore.ts)
- [Contrato de inventário](../../packages/molda/src/components/editor/scene/SceneWorkshop.contract.test.tsx)
- [Contrato do nível básico](../../packages/molda/src/components/editor/scene/SceneWorkshop.toolAccess.test.tsx)
- [Verificações de layout existentes](../../packages/molda/e2e/scene-workshop-layout.spec.ts)
