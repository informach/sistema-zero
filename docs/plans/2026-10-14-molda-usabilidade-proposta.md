# Molda: proposta revisada de usabilidade para crianças de 9–12 anos

14/10/2026 · Revisão 4 · Proposta de produto e interação, ainda sem implementação.

Atualização posterior à aprovação: a implementação e suas evidências estão no [relatório de entrega](2026-10-14-molda-usabilidade-entrega.md). O texto abaixo registra a especificação aprovada.

Público: crianças de 9–12 anos no computador, com mouse ou touchpad. Escopo confirmado: criar, pintar e animar modelos 3D. Esta versão substitui as anteriores. A [revisão crítica](2026-10-14-molda-usabilidade-revisao.md) explica as correções; o [catálogo de telas e fluxos](2026-10-14-molda-usabilidade-fluxos.md) especifica os estados e a cobertura funcional.

## 1. Decisão central

Adotar a estrutura dos prints como base da oficina: **ferramentas à esquerda, criação no centro, peças e propriedades à direita; linha do tempo abaixo do palco em Animar**. Simplificar a quantidade de informação apresentada dentro dessas regiões, mantendo os comandos em posições previsíveis.

A primeira proposta se afastava demais dessa base. Escondia a lista de peças, transferia transformações para o painel e substituía a linha do tempo por cartões de poses. Essas decisões foram retiradas. Não haverá um segundo editor de animação nem uma interface básica com outra organização espacial.

Preservar a estrutura dos prints não significa expor seus doze campos numéricos, ferramentas profissionais e todos os detalhes simultaneamente. A criança começa com ações diretas, vê o resultado e expande os ajustes quando precisa. A ferramenta selecionada, as alças, a dica e o painel sempre representam a mesma ação.

O critério de sucesso é conseguir criar, corrigir, reencontrar e recuperar o próprio trabalho com autonomia. A semelhança visual é necessária para esta proposta; sua facilidade real ainda precisa ser demonstrada com protótipo funcional e crianças.

### O percurso básico que a proposta precisa tornar fácil

| Intenção da criança | Caminho curto proposto | Conhecimento que não deve ser exigido |
|---|---|---|
| Montar corpo e cabeça | Criar modelo → ajustar caixa → adicionar bola → Colocar em cima → clicar no corpo | Coordenadas, pivô, hierarquia ou arrasto preciso em profundidade |
| Colorir e desenhar olhos | Pintar → escolher cor → Cor de fundo da peça → aplicar; depois Pincel e detalhes | Materiais, UV, camadas ou sair de Pintar para mudar a cor de base |
| Pintar outra peça | Clicar nela uma vez ou escolhê-la na lista; pintar no gesto seguinte | Entrar em um modo de seleção separado ou reaprender a paleta |
| Fazer a criação pular | Animar → indicar peça ou modelo inteiro → Pular → conferir prévia → Usar movimento | Agrupar manualmente antes de descobrir a animação, eixos ou canais |
| Inventar um movimento | Novo movimento → Próxima pose → mexer nas peças → Marcar pose → Reproduzir | Digitar segundos ou entender chaves de cada canal |
| Continuar um bichinho já animado em conjunto | Modelar → adicionar detalhe no conjunto indicado → Pintar → Animar → Reproduzir | Recriar o grupo ou refazer o movimento para incluir uma peça nova |

Esses caminhos são requisitos de entrega, não comportamentos já implementados. Colocar uma peça em cima de outra, preparar o conjunto para animar e entrar na próxima pose passam a fazer parte do núcleo simples. Não basta reorganizar botões e deixar essas tarefas dependentes de precisão técnica.

Padrões para uma criação nova: Mover após adicionar; Pincel Médio na primeira entrada em Pintar; Espelhar e Quadradinhos desligados; Marcar sozinho e Ver pose anterior desligados; movimento manual com 2 s e Repetir desligado. A primeira tinta deve ser distinguível da base; escolhas seguintes da criança são preservadas, sem trocar a cor a cada alvo. Presets usam a repetição adequada ao movimento. Esses padrões não redefinem preferências a cada troca de aba nem alteram movimentos existentes.

## 2. Evidência e diagnóstico

Foram examinados os cinco prints, a primeira proposta, o fluxo local do perfil básico, os componentes e comandos principais da oficina, as 23 famílias de acesso, os 45 comandos do registro da cena, os editores de textura e céu e as integrações de salvamento, importação, exportação e Estúdio. O registro de comandos não contém todas as funções: animação avançada, materiais e outros painéis também foram considerados separadamente.

As [capturas e o roteiro anterior](../../.audits/molda-usabilidade-2026-10-14/README.md) documentam a interface existente em 1366 × 768 e 1024 × 600. Não são mockups da proposta. A presente revisão é documental e de código; não houve nova execução do produto nem teste com crianças.

| Problema observado | Consequência | Resposta da proposta |
|---|---|---|
| Girar ativo no palco enquanto o painel continua em Mover | Dois lugares parecem controlar a mesma coisa de maneiras diferentes | Uma ferramenta ativa compartilhada |
| Campos de ajuste começam em zero ou fator 1, mesmo depois de transformar a peça | Deslocamento relativo parece posição/tamanho atual | Separar valores atuais de botões que aplicam passos |
| Novas caixas aparecem na mesma posição | A criança pode pensar que o clique falhou | Inserção e duplicação visíveis, com posição calculada |
| Em Animar, canvas observado com 288 px de altura em 1366 × 768 | Pouco espaço para ver e manipular o modelo | Orçamento vertical explícito, timeline compacta e expansível |
| Criação de movimentos começa com parâmetros técnicos | É preciso entender o formulário antes de ver uma animação | Prévia imediata de presets; edição manual na mesma timeline |
| Dicas de leitura não acompanham necessariamente a ação | A instrução pode não corresponder à ferramenta ativa | Dica derivada do estado e um único espaço para guia de tarefa |
| Alguns testes exigem que selecionar apenas acrescente controles | A interface acumula opções para preservar o contrato | Testar alcance e coerência contextual, sem exigir exposição simultânea |

O motor já oferece bastante da capacidade necessária. A refatoração principal é da interação e da apresentação. Inserção inteligente, alguns gestos, pivô visual e corte por pontos também exigem trabalho de domínio; não são apenas CSS.

## 3. Fidelidade aos cinco prints

Arquivos originais em `C:/Users/tocha/Downloads/molda`, com prefixo `WhatsApp Image 2026-10-14 at 13.23.26`.

| Referência | O que permanece | Simplificação deliberada |
|---|---|---|
| `(3).jpeg` — Modelar | Cabeçalho, abas, trilho com nomes, formas abaixo, árvore à direita, propriedades da seleção, controles de vista e dica inferior | Apenas o ajuste ativo aberto; precisão em expansão; Pivô, Cortar e Apoio conforme acesso e contexto |
| `(4).jpeg` — Pintar | Pincel/Balde/Borracha/Pegar cor à esquerda; cores e peças à direita; tamanho e espelho junto às ferramentas; alvo no palco | Paleta antes do seletor completo; hexadecimal em detalhes; começar por uma peça |
| `.jpeg` sem sufixo — Animar | Movimentos e peças à direita, ferramentas à esquerda, timeline abaixo do palco, Marcar pose, Repetir e Marcar sozinho | Uma linha por peça inicialmente; canais expansíveis na própria linha; timeline mais baixa em notebooks |
| `(2).jpeg` — Pivô | Ferramenta no trilho, ponto destacado, peça fantasma, frase “Assim ela vai girar”, posições prontas no contexto inferior | Acesso contextual; ponto escolhido explícito; coordenadas opcionais; prévia antes de aplicar |
| `(1).jpeg` — Cortar | Ferramenta no trilho, indicação dos pontos, prévia rosa, barra Cancelar/Aplicar | Explicitar plano e resultado; corrigir escopo Peça/Face/Ponto; não prometer remover material com o corte atual |

### Composição comum

```text
←  nome ✎  Salvo  ↶ ↷    Modelar | Pintar | Animar    ?  Trazer 3D*  Salvar e exportar ▾
┌───────────┬─────────────────────────────────────────┬──────────────────────────┐
│ ESCOLHER  │ Escopo contextual  Olhar  Vista livre ▾ │ PEÇAS / MOVIMENTOS       │
│ MOVER     │                           Enquadrar    │ árvore e seleção         │
│ GIRAR     │                                         ├──────────────────────────┤
│ TAMANHO   │                 PALCO                   │ PEÇA / POSE ESCOLHIDA    │
│ …         │                                         │ ajuste ativo             │
│ ADICIONAR │                                         │ detalhes recolhidos      │
│ Caixa     │                                         │ aparência ou cor         │
│ Rampa …   │ dica ou ação contextual             − + │                          │
│           ├─────────────────────────────────────────┤                          │
│           │ TIMELINE — somente na atividade Animar  │                          │
└───────────┴─────────────────────────────────────────┴──────────────────────────┘
```

`*` Trazer 3D aparece para quem tem acesso à importação. A localização é a dos prints; não há botão bloqueado ocupando o básico. O wireframe indica regiões, não pixels já validados.

### Regras que impedem a interface de voltar a ficar confusa

1. Escolher, Mover, Girar e Tamanho permanecem no trilho esquerdo, nessa ordem. O painel detalha a ferramenta; não contém outro seletor independente dessas ferramentas.
2. A lista de peças permanece visível no desktop. Grupos podem recolher seus filhos. A lista só vira painel alternável quando a largura realmente não comporta as regiões.
3. Cores permanecem à direita. Nenhuma faixa nova de paleta compete com a dica ou com a timeline.
4. Enquadrar, vista, zoom, Desfazer e Refazer conservam a posição entre atividades.
5. Uma expansão troca os detalhes de uma região; não abre uma segunda coluna empurrando o palco.
6. Operações especiais mantêm o modelo visível e oferecem retorno explícito. Diálogos ficam para decisões delimitadas, arquivos e conflitos.
7. Ações indisponíveis por acesso ficam fora da autoria. Ações temporariamente inaplicáveis mostram uma razão curta quando necessário: “Escolha uma peça”.

## 4. O que significa “básico” e como os outros modos evoluem

São quatro conceitos diferentes:

| Conceito | Exemplos | Regra |
|---|---|---|
| Atividade | Modelar, Pintar, Animar | Muda a tarefa dentro do mesmo modelo |
| Nível de acesso | basic, intermediate, professional | O host determina quais famílias podem ser usadas para autoria |
| Detalhamento da interface | Ajuste ativo, medidas, canais, curvas | Expande recursos permitidos sem trocar a organização da oficina |
| Tipo de criação | Modelo, textura, céu | Tem editor adequado ao conteúdo; não precisa fingir que tudo é um modelo 3D |

Não criar um seletor global “Básico/Avançado” que reorganize toda a tela. Mesmo alguém com todas as ferramentas começa com a apresentação simples; pode abrir detalhes dentro da atividade. Uma seleção que já usa um recurso avançado mostra seu resumo e o acesso ao detalhe permitido, sem abrir todos os formulários.

Os prints misturam recursos de níveis diferentes. Por exemplo, Apoio e Pivô são intermediários; o corte por plano é profissional no código atual. Portanto, o básico será semelhante no **layout e na linguagem**, sem reproduzir literalmente todos os comandos desses prints. Alterar essas liberações seria outra decisão de produto, não uma consequência silenciosa do redesign.

Em Modelar, “Mais ferramentas” no próprio trilho revela os recursos permitidos: Pivô, Editar a forma e Articulação. Ao entrar num desses contextos, suas ferramentas ocupam essa região e “Voltar às peças” permanece visível. Dentro de Editar a forma, Cortar aparece entre as operações da seleção. Apoio fica em Adicionar quando permitido. Expandir o trilho não reorganiza Escolher/Mover/Girar/Tamanho, e a rolagem não afasta permanentemente o comando de retorno.

Leitura, reprodução e preservação do arquivo independem da permissão de autoria. Uma criança com acesso básico pode abrir um projeto com recursos avançados sem que eles sejam apagados ou convertidos para caber na tela.

## 5. Entrada, criação e organização

Na galeria, “Criar modelo” abre diretamente uma criação com nome provisório válido e uma caixa inicial selecionada. A primeira ferramenta é Mover, com uma sugestão curta. “Começar vazio” e “Começar de um modelo” são alternativas explícitas; modelos prontos originam cópias editáveis.

Uma criação existente abre em Escolher, sem iniciar um arrasto de transformação por acidente. Tipo e base fornecidos por uma tarefa do Pensa são reaproveitados. Texturas e céus continuam como ações distintas na galeria.

O nome provisório respeita a normalização e a unicidade atuais. O nome do projeto hoje é usado pelo Estúdio para referências; não deve virar arbitrariamente um título livre. Renomear mostra o nome que será gravado e, se houver uso no jogo, depende de atualização segura das referências pelo host ou orienta criar uma cópia. Nomes das peças continuam livres e distinguíveis.

### Adicionar e duplicar

Um clique numa forma cria a peça imediatamente em posição visível, seleciona-a e ativa Mover. Não exigir uma segunda confirmação para toda adição simples.

A posição inicial fica ao lado da seleção, ou ao lado do conjunto visível se não houver seleção, usando seus limites e uma pequena folga. O algoritmo procura uma posição próxima sem interseção inicial, respeita os limites da cena e ajusta o enquadramento somente se a nova peça ficaria fora da tela. Se não houver lugar válido, informa a limitação e permite escolher outro destino; não cria uma peça invisível.

Duplicar aplica a mesma regra de visibilidade e gera nome distinguível, sem confirmação para a cópia comum. O comando atual já copia geometria, materiais e imagens com novos identificadores, além de remapear animação e vínculos. Preservar essa independência: pintar a cópia não modifica a original. Casos não suportados são recusados com motivo, sem apresentar uma cópia parcial como concluída.

**Continuar uma criação agrupada:** o bloco Adicionar indica o destino, por exemplo “No conjunto bichinho”, antes do clique. Com um grupo selecionado, criar dentro dele; com uma peça selecionada, usar seu grupo pai imediato. Sem seleção, usar o único grupo raiz quando ele já contém todo o modelo; havendo vários destinos possíveis, manter a raiz indicada como “Fora de conjunto”, com escolha de outro destino. Não escolher arbitrariamente um grupo animado. A duplicação mantém o pai da original.

Uma peça nova nesse conjunto herda seu movimento, sem copiar chaves para a peça. Calcular sua posição na forma inicial do modelo, convertendo para a referência do grupo, e preservar IDs, pivô e movimentos existentes. Adição e pertencimento formam uma única ação de Desfazer; grupo oculto, travado ou incompatível precisa ser resolvido antes de criar, sem inserir na raiz como substituição silenciosa. Isso amplia `addScenePrimitive`, que atualmente cria sempre na raiz. Não exige reparentear peças antigas nem ampliar automaticamente uma animação feita apenas para uma peça.

“Colocar no chão” calcula a base da seleção. **Colocar em cima faz parte da primeira entrega:** selecionar a peça que será colocada → clicar na ação no cartão de Mover → apontar a peça de apoio → ver prévia → clicar no apoio para aplicar. A peça de apoio não vira a seleção; a peça movida continua selecionada. Esc ou Cancelar abandona a preparação. Uma ação de Desfazer restaura a posição anterior.

A primeira versão desse encaixe atende às superfícies superiores planas das formas básicas, com prévia de contato e projeção da base. Uma cabeça pode ser colocada sobre um corpo em caixa sem ajuste numérico. Superfícies curvas, inclinadas ou incompatíveis não recebem uma promessa falsa de encaixe: mostrar a limitação e manter Mover disponível. Posicionamento livre em qualquer superfície continua posterior. Sobrepor peças deliberadamente permanece possível.

### Seleção e árvore

Selecionar no palco ou na lista produz o mesmo contorno, nome e painel. Selecionar outra peça preserva a ferramenta ativa aplicável; não muda automaticamente Escolher para Mover. Seleções inválidas para a ferramenta retornam a Escolher com indicação clara.

Um gesto iniciado sobre uma peça ainda não selecionada apenas a escolhe, mesmo com Mover ativo; não a desloca nesse mesmo gesto. As alças e o contorno mostram quando ela está pronta para a próxima ação. Em seleção múltipla, peças já selecionadas pertencem ao mesmo conjunto. Apontar realça discretamente o possível alvo; selecionar confirma seu nome no cartão. A lista permite encontrar peças pequenas ou encobertas.

A árvore mostra ícone, nome, olho e cadeado. Os controles têm área clicável e foco; não dependem de hover. Ocultar e travar não apagam. Uma peça travada pode ser localizada pela lista, mas não recebe autoria no palco. Enquadrar não torna peças ocultas visíveis. Isolar tem indicação persistente e “Mostrar as outras”.

“Escolher várias” é acessível sem Shift. Agrupar cria uma organização reversível, não funde geometria. Agrupar/desagrupar itens animados exige preservar as transformações avaliadas; quando isso não é suportado, explica a limitação antes de modificar. Apagar uma peça simples usa Desfazer; remoções com dependências relevantes mostram o que será afetado.

## 6. Modelar: controles diretos e precisão no mesmo lugar

Sem seleção, o painel mostra “Escolha uma peça ou adicione uma forma”. Não há doze campos vazios. Com seleção, a árvore fica acima e o cartão da peça abaixo: nome, duplicar, apagar, ajuste atual, aparência.

| Ferramenta | No palco | No painel, no básico | Detalhe permitido |
|---|---|---|---|
| Escolher | Contorno e nome; clicar não transforma | Resumo da peça, cor e acabamento | Organização e propriedades disponíveis |
| Mover | Arrastar o corpo no plano indicado pela vista; alça vertical para altura | Passos por eixo com setas correspondentes no palco; Colocar no chão; Colocar em cima | Posição atual X/Y/Z, com referência indicada |
| Girar | Anéis com áreas de captura maiores e eixo destacado | Botões de um quarto de volta por eixo, com prévia direcional | Ângulo atual, passo e referência |
| Tamanho | Alças de escala; proporção preservada inicialmente | Maior/Menor e opção Esticar em uma direção | Dimensões atuais e escala, sem confundi-las |

As alternativas por clique operam sobre o mesmo comando das alças. X/Y/Z têm letra e seta, além da cor. “Altura” corresponde a Y do mundo no movimento; “lado” e “frente” não são tratados como direções fixas da tela depois de girar a câmera. Em vistas ortográficas, a indicação do plano também muda.

O arrasto do corpo usa XZ na Vista livre e em Cima, XY em Frente e YZ em Lado. Assim, a vista frontal não tenta arrastar sobre um chão visto de perfil. A dica e as setas mostram esse plano antes do gesto, que o mantém até soltar. Se a câmera livre estiver quase paralela ao plano, oferecer uma vista adequada ou passos por clique, sem saltar a peça nem mudar de plano durante o arrasto.

Cor e acabamento em Modelar ajustam a base da peça; não equivalem ao preenchimento de uma área pintada. A ação básica usa `patchScenePieceAppearance`, que já isola materiais compartilhados e preserva as imagens. Não pedir à criança que entenda ou resolva compartilhamento para mudar a cor de sua peça. Só o editor avançado de material compartilha alterações conforme o alcance explicitado. Em Modelar, a paleta é rotulada “Cor da peça”; em Pintar, escolher uma amostra só seleciona a tinta e não altera o modelo por si só.

No básico, botões de passos não expõem um formulário de precisão disfarçado. Valores atuais podem ser apresentados como informação. A edição numérica exata respeita `model.precise` e fica em “Medidas”, no mesmo cartão. Nos perfis permitidos, só a seção da ferramenta ativa inicia aberta; posição, tamanho, pivô e giro não abrem juntas.

Campos absolutos identificam a referência: posição no mundo ou no grupo; dimensão real ou escala local. Arquivos com matrizes não representáveis fielmente não são convertidos só para preencher o formulário. O editor mantém seu caminho técnico e explica a indisponibilidade de uma edição simplificada específica.

Snap altera o gesto atual, não arredonda a cena inteira. O plano de arrasto e a referência são fixados no começo do gesto. A opção de manter a base ao redimensionar é explícita; nunca muda o pivô nem aplica gravidade escondida. Escala zero e inversão acidental ficam impedidas no caminho simples.

### Pivô, malha e corte

Pivô é uma ferramenta contextual no trilho, com o subtítulo “Onde gira”. Não fica escondida dentro de outra ferramenta de giro. Abre a composição do print: ponto destacado, Centro/Embaixo/Canto, coordenadas opcionais e fantasma mostrando o giro. “Canto” exige escolher o canto no modelo; não significa um canto arbitrário. Aplicar preserva a aparência atual. Em peças animadas, também precisa preservar o movimento existente; se o domínio não suportar essa compensação, bloquear essa alteração com motivo e alternativa, sem regravar o movimento silenciosamente.

“Editar a forma” muda o contexto para Peça/Face/Linha/Ponto no mesmo palco. O nome da peça e “Voltar às peças” permanecem visíveis. Converter uma primitiva em malha é alteração explícita, reversível e anterior às operações que dependem dela.

O corte atual **divide faces e mantém os dois lados; não separa sólidos nem remove ou fecha um pedaço**. O botão pode conservar “Cortar” no trilho para corresponder ao print, mas o painel e a confirmação devem dizer “Criar divisão”. Remover um lado com fechamento é uma capacidade futura separada.

Para reproduzir a marcação do print, a proposta é escolher uma vista ortográfica, marcar dois pontos distintos e extrudar a linha ao longo da direção dessa vista para definir o plano. A prévia mostra o plano inteiro e as faces que serão divididas. Corrigir pontos, encaixar no meio, cancelar e aplicar ficam na barra inferior. O escopo exibe “Definindo corte”; não permanece “Peça inteira” enquanto se editam pontos.

Esse corte visual ainda precisa ser implementado. Até lá, a ferramenta existente mantém eixo/posição dentro do mesmo painel. Peças incompatíveis, cortes degenerados, limites de malha e vínculos de UV/skin recebem validação antes de aplicar; nenhum resultado aproximado é adotado silenciosamente.

## 7. Câmera e propriedade dos gestos

| Contexto | Arrasto iniciado na peça | Arrasto iniciado no fundo | Alternativa por clique |
|---|---|---|---|
| Escolher | Seleciona; não transforma | Orbita na Vista livre; desloca nas vistas ortográficas | Lista; vistas prontas; botões de câmera |
| Mover | Na seleção, move no plano definido; em outra peça, apenas seleciona | Navega conforme a vista | Passos, Colocar no chão e Colocar em cima |
| Girar/Tamanho | Só transforma ao começar na alça; corpo seleciona | Navega conforme a vista | Passos de giro e tamanho |
| Pintar | Pinta somente o alvo permitido | Navega conforme a vista | Olhar; vistas prontas; zoom |
| Área/Laço | Inicia seleção de área | Também inicia seleção de área | Lista e Escolher várias; Olhar para câmera |
| Pivô/Corte/UV | Obedece à operação e sua prévia | Não marca pontos nem confirma fora do alvo | Olhar e controles de vista |
| Olhar ativo | Navega, mesmo sobre a peça | Navega | Sair de Olhar; Esc |

O dono do gesto é definido no pressionamento e mantido até soltar. Um traço que sai da peça não vira órbita; um arrasto de câmera que passa sobre a peça não pinta. Um clique usado para selecionar uma peça ainda não pronta para pintura não vira o primeiro ponto de um traço inesperado.

“Vista livre” contém Frente/Lado/Cima/Vista inicial. **Olhar fica visível junto desse controle nas três atividades**, sem depender de abrir o menu ou encontrar um pedaço vazio do palco. Olhar tem estado persistente visível — “Olhando o modelo · Voltar a pintar”, por exemplo — e não altera a ferramenta de autoria lembrada. Esc sai primeiro desse estado; não descarta uma pose pendente por acidente. Não duplicar o mesmo controle no trilho de Pintar.

Olhar é temporário: clicar numa ferramenta de autoria, em Voltar ou concluir uma troca de atividade encerra esse estado. A câmera fica onde a criança a deixou; a ferramenta escolhida ou lembrada passa a agir no próximo gesto. Abrir cores, escolher uma peça na lista e usar zoom não encerram Olhar por conta própria. Trocas bloqueadas por uma prévia pendente só encerram Olhar quando a transição for efetivada. Um clique no trilho não se propaga para o palco.

Enquadrar mostra todas as peças visíveis; a seta ao lado oferece “Só a escolhida”. Zoom +/− funciona sem roda ou gesto multitoque. A câmera não muda a cada seleção ou troca de atividade. Se uma nova peça precisar de reenquadramento para ser vista, a mudança é limitada e preserva a orientação.

## 8. Pintar: o mesmo desenho, com alvo evidente

Aba Pintar mantém Pincel, Balde, Borracha e Pegar cor à esquerda; três tamanhos, Espelhar e opções de detalhe ficam abaixo. À direita: cor escolhida, paleta, Minhas cores, recentes e lista de peças, como no print. O seletor completo de cor abre nessa região; hexadecimal fica em detalhes. Não há barra de cores no rodapé.

O alvo padrão é “Só a escolhida”, identificado no topo do palco. Se houver uma peça válida selecionada, ela entra pronta para pintar. Sem alvo válido, uma dica pede a escolha; clicar numa peça a seleciona e prepara a superfície, sem aplicar tinta nesse mesmo clique. A preparação só altera o documento no primeiro traço confirmado.

Para trocar o alvo, clicar numa peça diferente ou numa linha da lista. Esse gesto apenas escolhe e prepara: o nome e o contorno mudam, a dica diz “Agora pinte esta peça”, e somente o próximo gesto aplica tinta. Não é necessário entrar em outro modo para selecionar. Um traço já iniciado que atravessa outra peça continua preso ao alvo original e não muda a seleção ao terminar. Cor, ferramenta e tamanho permanecem. Uma seleção múltipla pede escolher uma peça para começar; não reduz a seleção silenciosamente. Pintar várias peças com um traço é uma expansão futura: só mostrar “Todas as peças” quando houver suporte real, incluindo histórico e preparação entre alvos.

O cursor mostra o tamanho aproximado e a cor do traço antes de pintar; alvo indisponível ou preparação pendente tem indicação própria e não acumula cliques para pintar depois. A cor lembrada é a cor visual escolhida, não apenas um índice de paleta: trocar entre pintura indexada e RGBA não pode trocar a tinta para verde ou outro padrão. Se não houver representação disponível, apresentar a escolha necessária sem aplicar aproximação silenciosa.

O Balde oferece duas intenções no mesmo painel: **Área desta face**, que mantém o preenchimento atual, e **Cor de fundo da peça**, que reaproveita a alteração de base já existente em Modelar. Escolher a cor e clicar na peça selecionada aplica o fundo, colorizando uma peça nova inteira sem sair de Pintar nem abrir confirmação adicional. Outra peça recebe apenas seleção nesse primeiro gesto. O rótulo explica “Mantém seus desenhos”; em peça já pintada, a prévia mostra o efeito da base alterada e não promete cobrir a pintura. Não implementar um preenchimento destrutivo de todas as texturas sob esse rótulo. O atalho de cor de fundo respeita `model.finish`; Área continua em `paint.brush`.

| Ferramenta/opção | Semântica visível |
|---|---|
| Pincel | Um traço completo corresponde a um Desfazer |
| Balde | Área desta face preenche a região da mesma cor; Cor de fundo da peça muda a base, preservando os desenhos e as outras peças |
| Borracha | Apaga tinta da camada ativa, revelando o que estiver abaixo; na criação simples, revela a cor de fundo. Textura independente pode revelar transparência |
| Pegar cor | Amostra a cor composta da superfície, incluindo a base nas áreas sem tinta, sem incorporar luz/sombra; atualiza a amostra e volta ao Pincel |
| Espelhar | “Também pinta o outro lado desta peça”; não promete pintar outra peça separada |
| Quadradinhos | Mostra a grade de pixels, sem alterar a resolução da pintura |
| Pintar de perto | Abre a face em espaço 2D, preserva alvo e cor; Voltar ao modelo restaura a vista |
| Vestir com textura / Girar pintura | Ficam em Mais jeitos de pintar, com alvo e prévia definidos |

Se Espelhar não funcionar em Pintar de perto, o estado explica a limitação e não simula estar ativo. A mudança de face encerra o gesto corrente antes de trocar o alvo.

Pegar cor não transforma um pixel vazio da camada em Borracha: a criança está apontando para a cor de fundo que vê. Como é uma ação de leitura, pode amostrar outra peça visível sem trocar o alvo de pintura; a regra de primeiro selecionar vale para aplicar tinta ou transformar, não para essa amostra. A borracha continua uma escolha explícita. Minhas cores e recentes aparecem quando têm conteúdo; a primeira entrada não mostra vários grupos vazios nem pede organizar uma paleta antes de pintar.

Borracha não pinta por cima com a cor de fundo nem apaga todas as camadas. No percurso simples, a única camada recebe os desenhos e a explicação é “Apaga a tinta”. Se o projeto tiver várias camadas, a dica identifica “Apagando em: nome da camada”; uma camada vazia, oculta ou travada não justifica atingir outra silenciosamente. Quem não tem autoria de camadas vê esse resumo e a limitação aplicável, sem fundir a pintura para simplificá-la.

Camadas, formas, carimbos e degradês ocupam detalhes do painel; folha de pintura e UV podem substituir o palco por um espaço de edição maior, com nome da peça e retorno. Materiais, mapas e flipbook têm contextos específicos. Transformar uma pintura indexada em RGBA é uma alteração de documento com consequência explicada; não acontece só por abrir um painel.

Flipbook significa quadros de uma textura. Sua pequena timeline aparece dentro desse contexto, identificado como “Quadros da pintura”. Não se mistura com a timeline de movimentos das peças na atividade Animar.

## 9. Animar: uma única linha do tempo desde o começo

### Organização

O trilho mantém Escolher, Mover, Girar e Tamanho. Formas e remoção estrutural saem desse contexto. A direita segue o print: Movimentos, Peças e propriedades da pose. A timeline fica sob o palco central, sem invadir o trilho nem a coluna direita.

Pivô continua alcançável em Mais ferramentas para quem tem acesso, preservando a localização do print. Essa operação pausa o movimento, resolve uma pose pendente e informa que altera o ponto de giro da peça, não uma chave da animação. Aplicar precisa preservar os movimentos existentes; ao terminar, retorna ao mesmo movimento e instante. Se isso não for suportado para o alvo, impedir a alteração e explicar, como em Modelar.

Mesmo sem movimento, a faixa inferior existe, com instrução curta e ações “Novo movimento” e “Usar um movimento pronto”. Ao criar, aparece a régua de segundos e uma linha por peça. Apenas peças com animação e a seleção atual precisam aparecer inicialmente; “Mostrar todas as peças” revela as demais. Uma seta na linha expande Mover/Girar/Tamanho. Curvas ficam na mesma região ampliável, conforme acesso.

Não há storyboard paralelo. Uma pose é uma representação dos valores registrados para a peça naquele instante. Pode reunir chaves de vários canais; selecionar esse marcador não significa apagar canais não editados. Se os canais têm propriedades diferentes, o painel informa “Valores diferentes” em vez de inventar uma interpolação única.

### Movimento pronto

“Usar um movimento pronto” abre Pular/Balançar/Girar no painel direito, com pequenas demonstrações. Escolher mostra uma prévia com valores iniciais úteis. Velocidade e intensidade têm passos simples; duração, eixo e amplitude exatos aparecem em detalhes permitidos. “Usar movimento” cria um novo movimento, com nome único; “Cancelar” restaura o estado anterior.

O alvo aparece **antes de criar um movimento pronto ou manual**, com nome e contorno: “Esta peça” ou “Modelo inteiro”. Uma única peça não exige outra pergunta. Em um modelo com várias peças, preservar a seleção inicial, mas deixar Modelo inteiro diretamente disponível. A prévia precisa tornar evidente se vai pular apenas a cabeça ou toda a criação.

Modelo inteiro usa um grupo comum existente quando adequado. Sem esse grupo, prepara uma prévia de “Juntar para animar”, preservando as posições e relações das peças. “Usar movimento” confirma conjunto e preset em uma transação; Cancelar não deixa um grupo vazio ou outras mudanças no projeto. A preparação reaproveita as validações de `groupSceneNodes`, com referência comum, sem girar cada peça ao redor do seu próprio centro. O grupo continua editável e as peças continuam separadas.

No caminho manual, Novo movimento confirma o grupo preparado e o movimento vazio juntos, depois da indicação de quais peças participarão. Não é preciso usar um preset primeiro para obter esse alvo. Escolher uma parte do grupo durante a edição continua possível, e não muda o conjunto que já foi criado.

Esse caminho entra na entrega básica para criações novas com formas comuns. Depende de `model.pieces` e `animate.create`; não libera famílias novas. Arquivos com vínculos, travas, movimentos ou referências que impeçam agrupamento fiel recebem explicação e mantêm a alternativa de animar uma peça ou grupo existente. Não reagrupar um importado silenciosamente. A lista de participantes inclui peças ocultas quando pertencem ao modelo; informar isso na prévia, sem fingir que um subconjunto visível é o modelo inteiro.

Andar e Girar rodas, vistos no print, podem existir como nomes de movimentos criados. Presets semânticos com esses nomes dependem de peças/articulações identificadas; ficam para modelos preparados ou fluxo específico posterior.

### Movimento manual

1. Novo movimento cria nome automático, duração inicial de 2 s e cursor em 0 s, com Repetir desligado. A duração permanece ajustável. A timeline marca “Início” e oferece **Próxima pose**, sem exigir que a criança escolha segundos.
2. Próxima pose apenas navega: vai ao próximo instante marcado no movimento ou ao final do intervalo se não houver outro. No movimento novo, leva de 0 s ao final em 2 s, sem copiar ou inventar chaves; a dica passa a “Mude a peça e marque a pose”. No final, indica “Fim do movimento” e fica indisponível. Para continuar, o cartão da pose oferece **Mais tempo**: acrescenta 2 s à duração e leva ao novo final, sem criar pose nem reescalar chaves existentes. É uma alteração imediata, reversível por um Desfazer; resolver qualquer pose pendente antes dela. A régua continua disponível para posicionamento livre e os detalhes conservam a duração exata.
3. Ao mexer nas peças com Marcar sozinho desligado, surge “Pose ainda não marcada”, junto de Marcar pose e Descartar ajuste. Apenas navegar no tempo não cria essa pendência. A prévia não é uma alteração permanente até marcar.
4. Marcar pose grava os canais efetivamente alterados em uma ação, incluindo todas as peças ajustadas naquele instante. Na primeira marcação após 0 s, se não houver valor inicial daquele canal, registra também o estado original em 0 s para que exista movimento desde o começo. “Início” é uma referência temporal, não um marcador de chave inexistente. Essa âncora não substitui chaves anteriores. Editar uma pose existente atualiza apenas os canais alterados no instante atual, conservando outros tempos e canais.
5. Reproduzir, acionado no final, começa em 0 s; assim a primeira pose recém-marcada pode ser vista em movimento com um clique. Se estiver pausado no meio, continua dali; o controle Voltar ao início permite assistir desde 0 s. Parar naturalmente no final mantém o instante visível. Repetir reinicia o intervalo; não cria automaticamente uma volta ao início nem suaviza a emenda. O estado desligado inicial evita uma volta brusca inesperada no primeiro movimento manual; movimentos existentes mantêm sua configuração. Reprodução e navegação não criam chaves.

Marcar sozinho fica visível no transporte, como no print, desligado ao iniciar uma sessão. A preferência não reaparece ligada sem indicação. Ao ativá-lo, cada gesto concluído grava uma pose e permite Desfazer. Não é possível alterná-lo enquanto há prévia pendente sem antes resolver essa prévia.

Suave/Reto/De uma vez permanecem no cartão da pose para quem tem `animate.pro`, conforme o acesso atual. No básico, preservar e reproduzir a interpolação existente; chaves novas seguem a política básica atual. O seletor do print não justifica mudar o gate de curvas. Expansões numéricas de tempo e pose já pertencentes a `animate.create` continuam alcançáveis.

“Ver pose anterior” mostra um fantasma da pose registrada anterior da seleção, sem autoria. No primeiro instante, informa que não existe pose anterior. Não usa uma imagem da base estática quando o movimento avaliado é diferente.

### Transições que não podem perder uma pose

Trocar de peça **no mesmo movimento e instante** mantém o rascunho da pose e permite ajustar outra peça, sem interromper com uma pergunta. O botão indica “Marcar pose · 2 peças”, por exemplo. A transformação continua restrita à seleção atual; não se transforma implicitamente tudo o que já foi ajustado. Isso exige evoluir o rascunho atual, que pertence a uma seleção, para reunir alterações por peça/canal naquele instante, com identidade e revisão comuns.

O rascunho respeita a hierarquia: depois de mover um grupo, ajustar sua cabeça usa a posição já avaliada desse grupo. Ao marcar, gravar os canais próprios alterados de cada alvo; o deslocamento herdado não vira uma segunda transformação na cabeça. Uma seleção contendo grupo e descendente não aplica o mesmo gesto duas vezes. O resultado antes e depois de Marcar deve coincidir; Desfazer local de um ajuste da cabeça mantém o ajuste anterior do grupo. Isso é regra de avaliação e histórico, sem novos controles para a criança.

Trocar de instante ou movimento, mudar de atividade, iniciar reprodução, importar, exportar ou sair resolve primeiro a pose pendente. A decisão única é **Marcar pose / Descartar ajuste / Continuar ajustando**, no espaço de contexto, usando diálogo apenas quando necessário para impedir a saída. A ação solicitada continua depois das duas primeiras opções; a terceira mantém a tela atual. Todos os alvos e o instante usados pela marcação são os de origem da prévia, não os da ação de destino. Olhar, zoom, ajuda, expansão de painéis e escolha de outra peça no mesmo instante não pedem essa decisão.

Desfazer durante uma prévia reverte somente o último gesto desse rascunho, inclusive quando há várias peças. Ao reverter todos os gestos, deixa de haver pose pendente; o próximo Desfazer atua no histórico confirmado. Descartar ajuste remove o rascunho inteiro de propósito. Refazer recupera os gestos desfeitos enquanto a revisão de origem permanece válida. Marcar agrega a pose em uma única entrada no histórico; cancelar o rascunho preserva o Refazer anterior ao rascunho quando aplicável. Esc cancela o arrasto em curso, sem apagar os ajustes já feitos em outras peças. Falha ao marcar mantém o rascunho para recuperação.

Ao sair de Animar para Modelar/Pintar, a edição volta à forma inicial do modelo; a pose avaliada não vira geometria permanente. O último movimento e instante válidos podem ser lembrados para retorno. A interface informa brevemente “Editando a forma inicial”.

Esse percurso funciona também depois de um movimento pronto: adicionar uma peça no conjunto segue o destino definido em Modelar, e pintar preserva os vínculos e as chaves. Um grupo selecionado não vira um alvo de pintura de todas as peças: pedir que a criança escolha a peça a pintar. Ao retornar a Animar, manter movimento e tempo válidos, com reprodução parada. A seleção atual continua identificada por nome; escolher a cabeça em Pintar não altera o alvo das chaves do grupo, e o grupo pode ser escolhido na árvore para o próximo ajuste do conjunto. Não recriar o movimento a cada visita.

Reduzir a duração não apaga poses fora do intervalo silenciosamente: oferecer manter duração ou revisar a mudança. Mudar velocidade de um preset em prévia é diferente de reescalar tempos de um movimento já autoral. Mover/copiar/apagar poses mostra colisões e canais afetados. O acesso detalhado nunca reamostra curvas importadas apenas para desenhar uma linha simples.

## 10. Texturas, céus e recursos avançados

Os editores de textura e céu também entram na revisão. Eles mantêm cabeçalho, status, histórico, comandos com nome, centro visual e ajustes à direita. Não recebem abas Modelar/Pintar/Animar que não façam sentido para seu tipo.

| Contexto | Entrada e centro | Detalhes e retorno |
|---|---|---|
| Textura independente | Galeria → Criar textura; desenho 2D central, ferramentas à esquerda, cores à direita | Prévia repetida/3D; tamanho e opções em detalhes; voltar à galeria com salvamento |
| Céu | Galeria → Criar céu; prévia grande e escolhas iniciais visuais | Sol, cores, nuvens e estrelas agrupados; um slider/gesto por Desfazer; fallback quando 3D indisponível |
| Malha avançada | Modelar → Editar a forma | Seleção por componente; extrusão/inset e operações profissionais no contexto adequado; Voltar às peças |
| Ossos e pesos | Modelar → Articulação, conforme acesso | Alvo/ossos e influência evidentes; resumo de vinculação, revisão e cancelamento; visualização 3D de vínculo é trabalho novo |
| UV | Pintar → Encaixar pintura, com acesso; atalho contextual na malha | Mapa grande, peça identificada, prévia/reversão; não altera UV só por entrar |
| Materiais e mapas | Pintar → detalhes de aparência | Material atual, imagens e canais; conversões explícitas; retorno preserva a pintura |
| Curvas e articulações | Animar → detalhes da peça/canal | Mesma timeline ampliada, sem outra convenção de ferramentas ou de salvamento |

Na textura, “pintar atravessando a borda” modifica pixels; “deslocar a prévia” apenas ajuda a examinar emendas. Os rótulos precisam separar essas duas ações. No céu, aplicar um preset é uma alteração; ajustar um valor depois disso indica personalização, sem fingir que o preset original continua intacto.

## 11. Salvamento, arquivos, saída e integração

Preservar o grupo “Salvar e exportar” do print. Ao abrir, explicar brevemente o salvamento automático e listar destinos claros: baixar projeto editável, preparar para o Estúdio, baixar imagem, baixar apresentação giratória; formatos adicionais conforme acesso. O grupo não obriga clicar em Salvar depois de cada operação.

O status mostra a garantia real: Salvando, Salvo neste computador, Sincronizando, Salvo na conta ou Falha ao salvar. “Sem internet” pode coexistir com arquivo local salvo. Não mostrar “Salvo na conta” quando apenas o armazenamento local confirmou. O debounce atual de 600 ms é uma implementação existente, não garantia de persistência instantânea.

Ao sair, terminar/cancelar o gesto, resolver a prévia, aguardar salvamento e cumprir a revisão exigida pelo host para sincronizar com o Estúdio. Sem pendências, voltar direto. Com erro, oferecer tentar novamente, baixar cópia e permanecer. Descartar alterações é uma escolha explícita e explica o que será perdido.

Fechar ou recarregar a aba pode não passar pelo botão Sair. O documento confirmado continua coberto pelo salvamento; uma pose ainda não marcada exige rascunho local recuperável separado, vinculado à revisão de origem. Essa recuperação é trabalho novo e não deve ser confundida com Marcar pose automaticamente. O [catálogo](2026-10-14-molda-usabilidade-fluxos.md) define o retorno e a limitação enquanto ela não existir.

Importar um 3D externo atualmente **substitui o conteúdo da criação aberta e mantém o nome**; não adiciona uma peça à cena. O fluxo mostra isso antes de confirmar, com prévia, adaptações e originais acessíveis. Oferecer criar uma nova criação como caminho de proteção exige integração explícita com a galeria; não mascarar substituição como adição. Formatos GLB/glTF, OBJ/MTL e bbmodel preservam suas opções e relatórios.

Restaurar um projeto Molda é outro fluxo: validar o documento/ZIP, criar identificadores e nomes adequados e mostrar resultado. Backup incompleto informa quantos arquivos foram recuperados e quais falharam. Formato futuro não suportado não é regravado como se fosse válido.

Exportação prepara uma saída da revisão atual e mostra adaptações antes da aceitação. Editar o documento invalida a prévia/aceitação anterior; preparar novamente. Falha no download não pode parecer download concluído. A apresentação atual é um HTML com vistas giratórias; não é vídeo animado nem publicação de um link. PNG precisa mostrar a captura que será baixada; não prometer que usa a câmera atual quando a implementação prepara outra vista.

“Preparar para o Estúdio” deve descrever o destino disponível naquele host. Só usar “Adicionar ao jogo” quando houver uma operação real para escolher o jogo e inserir o recurso. Revisão de compatibilidade e sincronização continuam claras. Um projeto aberto localmente não pode ser sobrescrito silenciosamente pela nuvem ou por outra aba.

## 12. Dimensões, linguagem e ajuda

### Orçamento de tela

Os números abaixo são metas de projeto para a área **interna do editor**, depois do chrome do host. Não são medidas de um protótipo pronto. O tamanho da janela, isoladamente, não garante esse espaço. O host deve oferecer a oficina expandida quando sua navegação reduzir a área disponível.

| Área interna | Cabeçalho | Trilho / painel | Palco central bruto em Modelar | Timeline inicial em Animar | Palco bruto em Animar |
|---|---:|---:|---:|---:|---:|
| 1440 × 900 | 64 px | 104 / 320 px | 1016 × 836 px | 200 px | 1016 × 636 px |
| 1366 × 768 | 64 px | 96 / 296 px | 974 × 704 px | 160 px | 974 × 544 px |
| 1024 × 600 | 104 px, duas linhas | 88 / 256 px | 680 × 496 px | 132 px | 680 × 364 px |

O palco reserva 48 px no alto para escopo/câmera e 48 px abaixo para contexto, sem empilhar outras barras. A barra inferior precisa comportar alvos de 44 px; os 40 px da revisão anterior não bastavam. A altura central livre resultante, nas três linhas, é 740/608/400 px em Modelar e 540/448/268 px em Animar. Se o conteúdo real não couber nesses orçamentos, o layout deve mudar — não encolher fonte nem sobrepor controles.

Nomes longos no cabeçalho têm largura limitada e nome completo acessível por foco/edição. O título não empurra Desfazer, as abas ou a saída para fora da tela. Em barras com duas linhas, cada grupo conserva a ordem, sem ícones soltos substituindo os rótulos essenciais.

Em 1024 × 600, o painel direito alterna Peças/Ajustes dentro da mesma coluna; ambas as opções continuam identificadas. Em Pintar, usa Cores/Peças; em Animar, Movimentos/Peças/Pose. Essa exceção por espaço é diferente de esconder a árvore no desktop inteiro. O trilho e o conteúdo lateral têm rolagem própria, com indicação de continuidade.

A timeline tem transporte e régua fixos, linhas com rolagem e altura ajustável por presets Compacta/Ampla, além de arrasto opcional. A altura inicial não precisa igualar os aproximadamente 300 px do print de 900 px; a região e sua lógica permanecem. A expansão não pode tornar o palco inutilizável. Se faltar altura, detalhes substituem temporariamente a região central com retorno explícito, em vez de crescer abaixo da dobra.

Na faixa compacta de 132 px, reservar 48 px ao transporte, 28 px à régua, uma linha de peça de 44 px e 12 px para espaçamento/bordas. Próxima pose ocupa o controle de avançar com rótulo acessível e dica visível no estado inicial; não acrescenta outra barra. Nomes e parâmetros extras ficam no painel existente. Esse orçamento ainda precisa de protótipo para provar legibilidade e ausência de colisões.

Em largura efetiva menor, inclusive com zoom, o painel vira uma área alternável por botões nomeados. Foco e seleção sobrevivem à mudança. Zoom de interface de 200% deve ser exercitado no protótipo; não declarar conformidade antes disso. Celular não é o cenário principal desta revisão, mas abrir um arquivo não deve causar perda nem prender a navegação.

### Linguagem e acessibilidade

Conservar os rótulos reconhecíveis dos prints: Escolher, Mover, Girar, Tamanho, Pivô, Enquadrar, Pegar cor, Marcar pose. Explicações curtas traduzem o conceito: “Pivô — onde gira”. Evitar várias palavras para a mesma ação, como alternar Guardar pose/Gravar pose/Marcar pose entre telas.

Usar nomes e ícones nas ações principais, texto de 14–16 px como referência inicial e alvos principais de 44–48 px. Esses tamanhos são uma decisão de produto, não uma citação do mínimo WCAG de 24 px com exceções. Cor nunca é a única identificação de eixo, seleção, erro ou gravação. [W3C: tamanho de alvo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Toda ação essencial por arrasto tem caminho por clique: mover, dimensionar, girar, selecionar várias, navegar no tempo e ajustar painéis. Atalhos complementam os controles. Campos de texto não disparam atalhos de exclusão ou transformação do modelo. [W3C: movimentos de arrastar](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html).

Uma dica por vez, na faixa contextual. Ações especiais substituem a dica por sua barra de confirmação. O guia do Pensa ocupa o mesmo sistema de orientação, preservando objetivo e progresso sem competir com um tutorial novo. A conclusão de uma atividade criativa não é inferida apenas de cliques em ferramentas.

Ajuda opcional pode propor uma criação com três peças e acompanhar ações efetivas; permite pular e criar livremente. Evitar parágrafos persistentes e celebração a cada clique. A literatura sobre crianças e revelação progressiva sustenta essas hipóteses de desenho, mas não demonstra a usabilidade específica do Molda. [NN/g: crianças](https://www.nngroup.com/articles/childrens-websites-usability-issues/), [NN/g: revelação progressiva](https://www.nngroup.com/articles/progressive-disclosure/).

## 13. Arquitetura e alcance técnico

Preservar o documento de cena, comandos puros, workers, histórico, persistência, importadores/exportadores e promoção de projetos legados. Não rebaixar um documento promovido para obter uma interface simples.

O controlador da oficina deve reunir atividade, seleção, ferramenta ativa, contexto especial, alvo de pintura, movimento/tempo, estado de reprodução e transação pendente. Câmera, preferências de painel e ajuda são estado da interface; não geram alterações no documento.

Há três filtros independentes: **acesso**, **aplicabilidade** e **apresentação**. Reaproveitar `sceneCommandRegistry` e `sceneCommandAccess`, que já separam parte dessas responsabilidades. Formulários, trilho, alças, menus e atalhos devem chamar os mesmos comandos. Não criar um catálogo paralelo para o básico.

| Área atual | Refatoração proposta |
|---|---|
| SceneWorkshop / useSceneWorkshop | Composição estável, transições explícitas e coordenação de contextos |
| SceneCanvas / SceneNodeProperties | Uma ferramenta ativa; valores atuais e ações relativas claramente separados |
| SceneCreateMenu / comandos de cena | Inserção visível no grupo indicado, posição na referência correta e duplicação independente |
| SceneTransformGizmo / viewportNavigation | Propriedade de gestos, alternativas por clique e regras de referência |
| ScenePaintToolbox / ScenePaintEditor | Layout dos prints, escolha do alvo e detalhes sem duplicação de painéis |
| SceneAnimationTimeline / Inspector / PoseGesture | Uma timeline, linhas agregadas fiéis, draft e transições comuns |
| SceneAnimationPresets | Prévia primeiro, confirmação única e alvo explícito |
| Importação / exportação / saída | Preservar revisão, vínculo à versão e prevenção de aplicação tardia |
| GalleryScreen / NewAssetDialog / host kids | Entrada direta, nomes válidos, estados de persistência e retorno correto |
| TextureEditor / SkyEditor | Mesma linguagem de comandos, ajuda, histórico e saída |

Na autoria imediata, um arrasto ou traço corresponde a uma entrada no histórico. Em uma pose manual, os gestos têm Desfazer/Refazer local até Marcar reunir o resultado numa entrada do documento. Prévia cancelada não destrói o Refazer anterior à preparação. Resposta assíncrona verifica documento, revisão, sessão e requisição antes de atualizar a tela ou adotar conteúdo. Troca de conta/host/editor invalida operações pertencentes à sessão anterior.

### Separar reordenação de capacidade nova

| Tipo de trabalho | Exemplos |
|---|---|
| Reapresentar capacidade existente | Regiões dos prints, paleta, lista de peças, nomes, expansão de canais; acesso à cor de fundo também em Pintar |
| Corrigir/coordenar interação | Ferramenta única, troca de alvo sem tinta, Olhar visível, cor preservada entre alvos, Pegar cor composto, salvamento e retorno |
| Ampliar interação/domínio do núcleo | Inserção visível no conjunto indicado, Colocar em cima de apoio plano, preparar conjunto e preset numa transação, navegação de poses e rascunho de várias peças respeitando hierarquia |
| Ampliar contextos específicos | Pivô visual com preservação, corte visual por dois pontos, recuperação de pose pendente |
| Posterior, fora da primeira entrega | Pintura contínua entre peças, encaixe em qualquer superfície, remover/fechar corte, Andar automático, reagrupamento de animações complexas incompatíveis, vídeo da animação |

Uma ferramenta que ainda depende de implementação não aparece como se estivesse pronta. A semelhança com os prints não autoriza trocar o significado de um comando existente.

## 14. Entrega e validação

| Etapa | Resultado concreto | Condição para avançar |
|---|---|---|
| 0 — Protótipo de interação | Composição das três atividades, seleção, pintura, poses e casos sem conteúdo | Comparação lado a lado com os prints e tarefas em mouse/touchpad |
| 1 — Base comum e Modelar | Ferramenta única, inserção visível, Colocar em cima, árvore, histórico, câmera e salvamento | Montar corpo e cabeça com clique, além de arrasto; selecionar não move por acidente |
| 2 — Pintar | Alvo explícito, cor de fundo, paleta direita, traços, Pegar cor composto e pintura de perto | Colorir corpo e desenhar detalhe sem sair de Pintar; trocar alvo sem tinta acidental ou troca de cor |
| 3 — Animar | Timeline única, conjunto preparado, navegação/mais tempo, rascunho de várias peças e reprodução | Animar o conjunto, criar poses sem digitar tempo e vê-las com um clique; adicionar/pintar um detalhe e retomar preserva o movimento |
| 4 — Detalhes e demais editores | Precisão, pivô, malha/corte, UV, materiais, skin, texturas e céus | Cobertura das 23 famílias e preservação dos documentos existentes |
| 5 — Integração e piloto | Galeria, tarefas, nuvem, Estúdio, recuperação e arquivos | Fluxos do catálogo validados e resultados de autonomia aceitáveis |

As etapas são ordem de construção, não autorização para liberar uma versão que abandone recursos existentes. Uma casca parcial pode ser experimentada em ambiente controlado; a substituição ampla só ocorre com destinos para as funções atuais. Retorno à casca anterior, se necessário, usa o mesmo documento sem downgrade.

### Tarefas com crianças

Realizar duas rodadas formativas propostas de 6–8 participantes, incluindo 9–10 e 11–12 anos, iniciantes e quem já conhece o Molda. Incluir mouse e touchpad. Isso é pesquisa qualitativa de produto, não amostra para comprovar ganhos populacionais. Tarefas equivalentes e ordem alternada ajudam a reduzir o efeito de aprender no primeiro editor.

Tarefas: criar um bichinho com corpo em caixa e cabeça em bola; empilhar sem coordenadas; colorir o fundo e desenhar olhos dentro de Pintar; pintar outra peça mantendo a cor; pegar a cor numa área sem tinta; recuperar a vista com a criação ocupando o palco; fazer o bichinho inteiro pular; criar duas poses, ajustando duas peças no mesmo instante; desfazer só o último ajuste; sair e reencontrar a criação; transferir o aprendizado para criação livre. Acrescentar percursos avançados com usuários elegíveis e dados preparados, sem impor todos aos iniciantes.

Distribuir entre sessões as variações de retorno: depois de animar o conjunto, acrescentar uma orelha, pintá-la e assistir novamente; criar uma terceira pose usando Mais tempo; ativar Olhar e retomar o pincel; apagar um detalhe. Não transformar todos esses casos numa longa prova para cada criança. Projetos com camadas e hierarquias complexas entram também na regressão técnica, sem exigir esses conceitos dos iniciantes.

Registrar conclusão, tempo, cliques sem resultado compreendido, mudança acidental de alvo/câmera, intervenções do adulto e explicação da criança sobre como corrigir um erro. Metas iniciais: primeira alteração intencional em até 60 s; pelo menos 80% concluindo a montagem principal sem instrução direta; pelo menos 90% recuperando vista e desfazendo; redução de intervenções frente à linha de base. Informar também contagens absolutas e observações, pois a amostra é pequena. São metas, não resultados desta revisão.

### Critérios de aceite técnico e visual

- Os cinco prints têm correspondência documentada, e as três atividades mantêm suas regiões e nomenclatura.
- O [catálogo de fluxos](2026-10-14-molda-usabilidade-fluxos.md) não contém ações sem destino, estados de espera sem saída ou confirmações sem retorno definido.
- Comandos permitidos continuam alcançáveis; acesso não altera leitura, reprodução ou conteúdo avançado.
- Um gesto tem um dono e uma unidade de histórico; cancelar realmente restaura a prévia.
- A primeira montagem permite empilhar formas básicas; Pintar permite mudar o fundo, desenhar e escolher outra peça sem sair da atividade; Animar permite preparar o conjunto e a próxima pose sem digitar coordenadas ou segundos.
- Selecionar uma peça diferente não move nem pinta nesse gesto. Pegar cor não ativa Borracha ao amostrar a base, e mudar entre alvos indexados/RGBA preserva a tinta escolhida.
- No mesmo instante, mudar a seleção de uma pose pendente não perde os ajustes anteriores nem pergunta a cada peça. Desfazer remove apenas o último gesto local, e Marcar grava a pose composta em uma ação.
- Adicionar e pintar uma peça no conjunto animado não a deixa fora dele nem recria o movimento; agrupamento, destino e seleção permanecem explícitos. Animação de peça isolada não amplia seu alcance silenciosamente.
- Próxima pose nunca altera duração; Mais tempo nunca cria chaves; Reproduzir no final reinicia em 0 s. Marcar ajustes de grupo e filho preserva exatamente a prévia, sem transformação duplicada.
- Borracha preserva camadas inferiores; clicar numa ferramenta ou concluir troca de atividade encerra Olhar, mantendo a câmera. Nenhuma dessas correções acrescenta regiões aos prints.
- As combinações de modelo legado/promovido, grupos, matrizes importadas, UV, materiais, skin e animação preservam dados em abrir/editar/exportar.
- Layout exercitado no host real em 1440 × 900, 1366 × 768, 1024 × 600 e zoom de 200%, incluindo nomes longos, listas grandes e painéis com erro.
- Falha de rede/armazenamento, saída durante salvamento, revisão desatualizada e download interrompido têm recuperação compreensível.
- Fluidez é medida em notebook representativo; interface não remonta o viewport a cada troca de painel nem redesenha toda a árvore por evento do ponteiro.

## 15. Referências locais principais

- [Evidências da observação](../../.audits/molda-usabilidade-2026-10-14/README.md) e [primeira proposta arquivada](../../.audits/molda-usabilidade-2026-10-14/proposta-v1.md).
- [Gerações e abertura](../../packages/molda/src/components/MoldaApp.tsx), [host kids](../../packages/community-kids/src/components/kids/molda-client.tsx) e [nomes e referências](../../packages/molda/src/core/names.ts).
- [Famílias](../../packages/molda/src/core/toolFamilies.ts), [registro de comandos](../../packages/molda/src/components/editor/scene/sceneCommandRegistry.ts) e [acesso por comando](../../packages/molda/src/components/editor/scene/sceneCommandAccess.ts).
- [Oficina](../../packages/molda/src/components/editor/scene/SceneWorkshop.tsx), [coordenação atual](../../packages/molda/src/components/editor/scene/useSceneWorkshop.ts), [canvas](../../packages/molda/src/components/editor/scene/SceneCanvas.tsx) e [propriedades](../../packages/molda/src/components/editor/scene/SceneNodeProperties.tsx).
- [Comandos da cena](../../packages/molda/src/scene/commands.ts), [corte real](../../packages/molda/src/scene/meshPlaneCut.ts) e [histórico/salvamento](../../packages/molda/src/state/editorStore.ts).
- [Pintura](../../packages/molda/src/components/editor/scene/ScenePaintEditor.tsx), [presets de movimento](../../packages/molda/src/scene/animationPresets.ts), [timeline](../../packages/molda/src/components/editor/scene/SceneAnimationTimeline.tsx) e [gestos de pose](../../packages/molda/src/components/editor/scene/useSceneAnimationPoseGesture.ts).
- [Aparência isolada por peça](../../packages/molda/src/scene/pieceAppearance.ts), [preparação da pintura](../../packages/molda/src/scene/paintSurface.ts), [cor e ferramenta de pintura atuais](../../packages/molda/src/components/editor/scene/useScenePaint.ts) e [rascunho atual de pose](../../packages/molda/src/state/SceneAnimationPoseGesture.ts).
- [Semântica de importação](../../packages/molda/src/core/nativeImportCopy.ts), [confirmação de importação](../../packages/molda/src/components/editor/scene/useSceneImportConfirmation.ts), [saída em imagem/HTML](../../packages/molda/src/components/editor/scene/ScenePhotoExportPanel.tsx).
- [Galeria](../../packages/molda/src/components/gallery/GalleryScreen.tsx), [textura](../../packages/molda/src/components/editor/texture/TextureEditor.tsx) e [céu](../../packages/molda/src/components/editor/sky/SkyEditor.tsx).
- [Contrato de inventário](../../packages/molda/src/components/editor/scene/SceneWorkshop.contract.test.tsx), [contrato de acesso](../../packages/molda/src/components/editor/scene/SceneWorkshop.toolAccess.test.tsx) e [layout existente](../../packages/molda/e2e/scene-workshop-layout.spec.ts).
