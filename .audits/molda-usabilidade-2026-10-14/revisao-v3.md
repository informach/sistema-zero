# Revisão crítica da proposta do Molda

14/10/2026 · Revisão 3 · Resultado: proposta revisada; nenhuma implementação no produto.

Documentos: [proposta canônica](2026-10-14-molda-usabilidade-proposta.md), [telas e fluxos](2026-10-14-molda-usabilidade-fluxos.md), [primeira versão arquivada](../../.audits/molda-usabilidade-2026-10-14/proposta-v1.md) e [revisão 2 arquivada](../../.audits/molda-usabilidade-2026-10-14/proposta-v2.md).

## Parecer

A primeira proposta tinha um diagnóstico útil, mas **não estava suficientemente fiel aos prints nem fechada nos fluxos de interação**. Ela simplificava alguns controles criando outra organização de interface, principalmente em Modelar e Animar. Também deixava decisões importantes para depois: alvo de pintura, troca de contexto com prévia pendente, significado do corte, adaptação a telas menores e percursos fora do editor de modelos.

A revisão mantém a estrutura dos cinco prints e simplifica dentro dela. As lacunas identificadas receberam regras e destinos explícitos. Isso melhora a coerência da especificação; não demonstra, por si só, que uma criança já conseguirá usar a nova interface. Essa parte depende do protótipo e de observação com o público.

**A revisão 3 ainda encontrou ajustes necessários.** A revisão 2 estava melhor organizada, mas deixava tarefas essenciais dependentes de habilidade técnica: empilhar uma cabeça no corpo, colorir a base dentro de Pintar, animar o conjunto e encontrar um segundo instante para uma pose. Também fazia perguntas demais ao trocar de peça numa pose em preparação. Foram incorporados dez ajustes adicionais, R19–R28, preservando a estrutura visual e o acesso existentes. O registro consolidado agora tem 28 achados.

O percurso usado nesta revisão foi montar um bichinho, colorir corpo e cabeça, desenhar olhos, fazê-lo pular inteiro e criar um movimento próprio. Trata-se de um percurso analítico com consulta ao código, não de uma sessão observada com criança. Os prints de Pintar e Animar foram reinspecionados para conferir a localização das novas ações contextuais.

## Resposta aos cinco pontos pedidos

| Critério | Avaliação da primeira proposta | Resultado da revisão |
|---|---|---|
| Coerência e coesão | Havia conflito entre seguir os prints e redesenhar as regiões; acesso, detalhe e atividade ficavam próximos demais | Regiões estáveis; distinção entre atividade, acesso, detalhe e tipo; contratos comuns de ação, prévia, retorno e histórico |
| Intuitivo e fácil para a criança | A direção era plausível, mas ainda exigia precisão para empilhar e conhecimento de tempo/grupos para animar | Colocar em cima, fundo em Pintar, escolha por clique, Olhar visível, conjunto preparado e Próxima pose; rascunho sem perguntas a cada peça; validação infantil permanece necessária |
| Básico semelhante aos prints | Divergência relevante: árvore escondida, transformações deslocadas, timeline substituída | Trilho à esquerda, palco central, árvore/propriedades/cores à direita, timeline embaixo; detalhes recolhidos e diferenças por acesso documentadas |
| Outros modos com a mesma filosofia | Pintura e animação tinham boas intenções, mas não repetiam todas as convenções; avançados pouco especificados | Mesma localização, seleção, linguagem, prévia/aplicação e retorno; texturas/céus adaptam a filosofia ao próprio conteúdo |
| Fluxos e telas coerentes | Vários percursos principais descritos; estados de erro e transições incompletos | 45 telas/estados, 45 percursos, contratos de transição, subfluxos avançados e mapeamento das 23 famílias e dos 45 comandos registrados |

## Achados e correções

Prioridade alta significa risco de perda, erro de entendimento central ou divergência estrutural dos prints. Prioridade média significa descoberta, consistência ou operação incompleta. “Corrigido” aqui significa corrigido **na proposta**, não no código.

| ID | Prioridade | Problema | Decisão incorporada |
|---|---|---|---|
| R01 | Alta | Ferramentas de transformação mudavam de região em relação ao print | Trilho com Escolher/Mover/Girar/Tamanho; painel detalha a mesma ferramenta, sem seletor duplicado |
| R02 | Alta | Lista de peças inteira ficava sob demanda | Árvore permanente no desktop; alternância só quando o espaço efetivo exige |
| R03 | Média | Posição e hierarquia da paleta não estavam suficientemente fixadas | Cores e peças à direita em Pintar; tamanhos junto das ferramentas; nenhum rodapé novo de cores |
| R04 | Alta | Cartões de poses substituíam a timeline do print | Uma timeline desde a entrada, linha por peça e canais expansíveis; retirar storyboard como interface básica |
| R05 | Alta | “Básico” podia ser entendido como outro editor ou alteração de acesso | Separar atividade, apresentação, permissão e tipo; manter as 23 famílias e seus limites |
| R06 | Alta | Selecionar qualquer peça ativava Mover | Projeto existente começa em Escolher; selecionar preserva ferramenta aplicável; somente a adição ativa Mover deliberadamente |
| R07 | Média | Adicionar uma forma exigia prévia/confirmação em toda operação | Um clique cria em posição visível; inserção por superfície fica como expansão posterior |
| R08 | Alta | Regras de câmera não cobriam área/laço, pintura e vistas ortográficas | Tabela de gestos com dono fixo; Olhar explícito; fundo orbita na livre e desloca na ortográfica; seleção por área tem prioridade própria |
| R09 | Alta | Ajustes relativos e medidas absolutas continuavam ambíguos | Valores com referência indicada; ações de passos separadas; precisão e matrizes complexas tratadas sem conversão oculta |
| R10 | Alta | Pose pendente só tinha proteção clara na saída/troca de aba | Resolver também tempo, clip, reprodução, arquivos e alternância de gravação; troca de peça e histórico refinados em R25 |
| R11 | Alta | “Modelo todo” e presets semânticos sugeriam uma capacidade mais simples que a real | Conjunto precisa de referência comum fiel, com preparação explícita incorporada em R23; Andar/Rodas continuam posteriores |
| R12 | Alta | Corte sugeria remover parte, apesar de o motor só dividir superfícies | Manter ambos os lados; explicar Criar divisão; corte visual define plano; remover/fechar vira outro trabalho |
| R13 | Alta | Metas de palco não fechavam com cabeçalho e animação em notebook | Orçamento dimensional com alturas somadas, áreas brutas/livres distintas e adaptação ao chrome do host |
| R14 | Média | Texturas, céus e recursos avançados apareciam quase só como destinos genéricos | Catálogo de estados e subfluxos de malha, pesos, UV, materiais, flipbook, curvas e demais editores |
| R15 | Alta | Importação, restauração, exportação, imagem e apresentação eram agrupadas demais | Importação substitui; restauração cria projetos; exportação é por destino; HTML giratório não é vídeo nem link público |
| R16 | Alta | Salvo, nome amigável e saída direta podiam ocultar contratos do host | Status local/conta separado; nome compatível com Estúdio; flush, conflito e revisão antes de saída quando necessários |
| R17 | Média | Revelação progressiva podia virar um depósito único de “Mais opções” | Expansões por intenção e região; destinos para comandos e subfluxos; retorno e foco definidos |
| R18 | Alta | Aparência simples podia ser tomada como usabilidade já demonstrada | Separar coerência documental, fidelidade proposta, integridade técnica e autonomia observada; metas tratadas como hipóteses |
| R19 | Alta | Preservar Mover ao escolher outra peça não definia se o mesmo gesto também a deslocava; a cópia comum ainda admitia perguntas desnecessárias | Primeiro gesto em outro alvo só seleciona; duplicação simples sem confirmação, preservando a independência já existente de geometria/material/imagem |
| R20 | Alta | Colocar em cima estava adiado, embora empilhar seja central na montagem de um personagem | Incluir no núcleo: escolher peça, ação, apontar apoio plano, conferir prévia e clicar; um Desfazer e cancelamento explícito |
| R21 | Alta | “Preservar cor” e “Pegar cor” eram genéricos demais: o código usa cor da camada e pode ativar Borracha no vazio; mudança indexada/RGBA pode escolher cor padrão | Amostrar a cor composta, inclusive base, voltar ao Pincel e preservar a tinta visual entre alvos; definir recuperação quando não representável |
| R22 | Alta | Colorir a peça inteira nova exigia voltar a Modelar ou preencher faces uma a uma | Cor de fundo no contexto de Balde, reutilizando aparência isolada por peça; desenhos preservados e rótulo diferente de preenchimento de área |
| R23 | Alta | A animação do bichinho montado podia afetar só a última peça, exigindo descobrir agrupamento antes de animar | Alvo explícito Esta peça/Modelo inteiro; preparar grupo compatível e preset juntos; Cancelar não deixa grupo; caso complexo preservado |
| R24 | Alta | Criar duas poses ainda começava com a necessidade de escolher um tempo numérico ou descobrir a régua | Próxima pose no transporte leva ao final inicial; base preservada; repetição manual começa desligada; timeline continua única |
| R25 | Alta | Trocar de peça pedia confirmação; Desfazer cancelava a prévia inteira, mesmo que reunisse trabalho significativo | Rascunho por instante reúne várias peças; trocar seleção não pergunta; Desfazer/Refazer local por gesto; Marcar agrega o resultado numa ação |
| R26 | Média | Olhar ficava em caminhos distintos e podia depender do menu de vista | Um controle visível, junto da câmera nas três atividades, com estado e retorno; funciona com o palco ocupado |
| R27 | Média | Vários padrões iniciais estavam indefinidos, deixando espelho, repetição e orientação sujeitos à implementação | Definir pincel/tamanho, espelho, grade de pixels, repetição, gravação e fantasma; preservar escolhas e documentos existentes |
| R28 | Média | A faixa inferior de 40 px não comportava os alvos de 44–48 px prometidos | Reservar 48 px e recalcular alturas livres; timeline compacta com orçamento interno e validação visual ainda necessária |

## O que muda no núcleo, sem criar mais uma interface

As novas ações entram em lugares existentes: Colocar em cima no cartão de Mover; Cor de fundo nas opções do Balde; Modelo inteiro no alvo do preset; Próxima pose no transporte; Olhar junto de Vista. Não surgem novas abas principais, outro editor de animação ou uma sequência obrigatória de tutorial.

Trocar uma peça da pintura deixa de exigir um modo adicional; ajustar várias peças na mesma pose deixa de interromper o trabalho; alterar aparência básica não pede decisões sobre materiais compartilhados. A revisão acrescenta suporte no software para reduzir decisões exigidas da criança.

Essa redução de esforço não é gratuita na implementação. Colocar em cima, transação de conjunto/preset, preservação visual da cor e rascunho de pose composto têm contratos próprios e precisam de testes de comportamento. Não podem ser entregues apenas renomeando botões. O básico só está pronto quando esses percursos funcionarem, além de parecerem simples.

## Diferenças intencionais em relação à reprodução literal dos prints

Essas diferenças são necessárias para o público e os contratos atuais; não representam uma mudança de linguagem visual:

- **Campos:** não deixar posição, tamanho, pivô e giro todos abertos ao mesmo tempo. O cartão continua no mesmo lugar, mostrando a ação atual e expansão de medidas.
- **Ferramentas avançadas:** Pivô, Apoio, Cortar e interpolação aparecem conforme acesso. Os prints contêm recursos de faixas diferentes; copiar todos para o básico mudaria a jornada.
- **Pintura:** iniciar em uma peça. “Todas as peças” só entra quando houver suporte real a traços entre alvos, com histórico correto.
- **Animação:** conservar a timeline, começando com linhas de peça agregadas. Sua altura se ajusta ao notebook; expandir canais continua no mesmo local.
- **Corte:** explicar o resultado real e mostrar o plano. Dois pontos sem referência espacial deixam a operação ambígua.
- **Salvar e exportar:** conservar o grupo do cabeçalho, mas explicar salvamento automático e destinos distintos no menu.
- **Tela estreita:** permitir alternância do conteúdo lateral, sem reduzir textos e alvos até ficarem difíceis de usar.

## Coerência da experiência infantil

O desenho revisado oferece um ciclo repetível: **escolher algo → escolher uma ação → ver o efeito → desfazer ou continuar**. A criança aprende uma localização para cada tipo de tarefa e reutiliza esse conhecimento ao mudar de atividade. As ações de rotina não pedem confirmação; operações com prévia deixam claro quando algo ainda não faz parte do projeto.

O principal ganho esperado vem da previsibilidade, não apenas de reduzir contagem de botões. Uma lista de peças visível pode ser mais útil que um palco alguns pixels maior se permite achar uma roda escondida. Uma timeline simples e constante pode ser mais fácil que aprender cartões de poses e depois outro editor. Essas são escolhas fundamentadas para teste, não conclusões empíricas já obtidas.

Pontos que merecem especial atenção no piloto: distinguir selecionar, mover e olhar; colocar a cabeça sobre o corpo; entender Fundo versus Área no Balde; perceber que o primeiro clique em outra peça apenas a escolhe; distinguir Esta peça de Modelo inteiro; compreender Marcar pose e o retorno à forma inicial ao sair de Animar. São as tarefas centrais em que a experiência 3D continua exigindo aprendizado.

## O que permanece para validação

| Questão | Como resolver | O que não afirmar antes |
|---|---|---|
| Os controles e as regiões realmente cabem e se parecem com os prints? | Protótipo com dados reais e capturas lado a lado, inclusive notebook e zoom | Fidelidade visual final ou ausência de sobreposição |
| Crianças entendem seleção, câmera, alvo e pose? | Duas rodadas formativas com mouse/touchpad, tarefas e observação | “Já está intuitivo” ou redução comprovada de dificuldade |
| Novas interações preservam conteúdo complexo? | Testes de domínio/integração e projetos de regressão com hierarquia, matrizes, UV, skin e animação | Compatibilidade integral apenas porque a UI foi redesenhada |
| Estados de salvamento/Estúdio refletem o host real? | Testar conta, offline, conflito, edição aberta e saída na integração kids | Salvo na conta ou adicionado ao jogo antes de confirmação real |
| Pose pendente sobrevive a fechamento inesperado? | Implementar e validar rascunho separado ou declarar limitação; nunca marcar escondido | Proteção total de uma prévia não persistida |

## Verificação documental

A revisão deve conferir os identificadores contra o código, os destinos das 23 famílias e dos 45 comandos, as referências entre documentos, os IDs de telas/fluxos e a aritmética dos orçamentos de layout. O resultado reproduzível fica em [verificação documental](../../.audits/molda-usabilidade-2026-10-14/verificacao-proposta.json).

A coerência dos novos percursos também foi lida entre proposta e catálogo: F41 reúne criar–pintar–animar; F42 cobre fundo/desenho; F43 conjunto e cancelamento; F44 amostra/preservação da cor; F45 várias peças, Desfazer e marcação no mesmo instante. A checagem automática garante presença e referências, não a facilidade percebida pela criança.

Essas verificações não executam o editor nem substituem pesquisa de usabilidade. A proposta revisada é a base para prototipar e implementar; não é declaração de que o produto atual já foi corrigido.
