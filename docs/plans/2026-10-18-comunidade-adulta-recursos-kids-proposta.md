# Proposta para ensinar programação com jogos na comunidade adulta

Este documento registra a proposta anterior. Júlio esclareceu que o escopo atual é exclusivamente de ferramentas, plataforma e gamificação. A recomendação vigente está na [proposta de paridade técnica](2026-10-18-comunidade-adulta-paridade-tecnica-proposta.md); ementas, preços e operação pedagógica abaixo não fazem parte dessa etapa.

Data: 18 de outubro de 2026. Público definido por Júlio: adultos iniciantes que querem criar jogos e projetos digitais. Direção pedagógica definida: começar com blocos, construir fundamentos, fazer a transição para código e introduzir inteligência artificial no avançado.

A recomendação é transformar a comunidade adulta em um percurso de criação de jogos com prática dentro da aula, projetos guardados na conta, devolutivas e continuidade entre cursos. O primeiro produto deve entregar um jogo 2D completo e compreensível para o aluno. A expansão deve acompanhar a capacidade de produzir cursos e atender alunos.

A base técnica permite começar com investimento concentrado: o adulto já usa o motor compartilhado de aulas, exercícios, Estúdio embarcado, entregas, recados, certificados e oficinas ao vivo. O trabalho inicial mais importante é completar a integração de salvamento e entrega, produzir uma experiência adulta consistente e colocar um curso real à venda.

O [mapeamento técnico](../../.audits/architectural-analysis-2026-10-18-comunidade-adulta.md) contém a matriz de 29 recursos, as diferenças de integração, as fontes e os critérios de verificação. Esta proposta trata de produto, pedagogia, operação e sequência de implantação. Preços, prazos de produção e metas abaixo são hipóteses de planejamento, não condições já cadastradas ou resultados comprovados.

## A direção pedagógica

Ensinar programação com jogos desde o início é coerente com o ativo que o Sistema Zero já construiu. Um jogo torna a lógica observável: a pessoa altera uma condição e vê o resultado; muda uma variável e percebe a dificuldade; encontra um erro e precisa explicar o comportamento. Isso dá propósito a conceitos que, isolados, podem parecer abstratos.

Blocos são uma representação inicial de programação. O aluno deve aprender eventos, sequência, estado, condições, repetição, decomposição e teste. O cuidado é não transformar o curso em uma sequência de encaixes que só funciona quando o professor diz exatamente onde clicar.

O Scratch informa que, embora tenha foco principal em crianças e adolescentes, é usado por pessoas de todas as idades. Isso sustenta a adequação de considerar blocos para adultos, sem demonstrar por si só a eficácia do curso proposto. [Fonte oficial do Scratch](https://scratch.mit.edu/help/parents/).

A transição para texto precisa ser ensinada. Uma pesquisa acompanhou 26 estudantes de 12 a 16 anos na passagem de Scratch para Python e identificou dificuldades de sintaxe e tipos, inclusive após a retirada do editor estruturado. A implicação para nosso desenho é preparar e verificar essa passagem. O estudo não permite projetar resultados quantitativos para adultos do Sistema Zero. [Kazemitabaar e colaboradores, 2023](https://arxiv.org/abs/2302.05708).

O percurso proposto tem quatro movimentos:

1. **Criar com blocos:** compreender a regra, montar, executar, observar e corrigir.
2. **Relacionar blocos e código:** reconhecer como a mesma regra aparece em JavaScript, com o modo Ponte.
3. **Criar e depurar com código:** escrever trechos, organizar projetos e testar alterações sem depender da representação em blocos.
4. **Usar IA com critério:** pedir mudanças delimitadas, inspecionar o que foi gerado, testar e manter responsabilidade pelo projeto.

A entrada da IA depende de competência demonstrada: conseguir explicar uma função, interpretar uma condição, localizar um erro simples, testar uma hipótese e avaliar uma alteração. Não é necessário saber toda a programação antes de usar IA; é necessário ter base suficiente para conferir a tarefa em questão. Essa distinção evita tanto dependência prematura quanto um pré-requisito impossível de cumprir.

No início, o assistente generativo fica fora da experiência didática. Feedback de exercícios, dicas preparadas, verificação de objetivos e ajuda humana continuam presentes. A dificuldade deve vir do raciocínio que estamos ensinando, com apoio suficiente para o aluno conseguir avançar.

## O que muda para o adulto

O método pode ser o mesmo do Kids. A experiência precisa reconhecer que o adulto escolheu aprender, tem pouco tempo e deseja perceber progresso real.

| Elemento | Aplicação na comunidade adulta |
| --- | --- |
| Linguagem | Curso, aula, exercício, projeto, revisão e próximos passos |
| Estética | Jogos e criação com identidade adulta; preservar diversão e cores com apresentação mais sóbria |
| Orientação | Explicar o conceito, a decisão e o motivo da tarefa |
| Ritmo | Aulas curtas, retomada simples, prática em blocos de tempo e desafios opcionais |
| Autonomia | Tarefa guiada seguida de uma variação que o aluno precisa resolver |
| Reconhecimento | Jogo concluído, regra explicada, problema corrigido e projeto melhorado |
| Comunidade | Compartilhar tentativas, pedir teste e conversar sobre decisões de criação |
| Progressão | Competências e projetos; não copiar os 49 slots da jornada Kids como obrigação adulta |

Adultos também podem gostar de avatar, conquistas e ranking. Esses recursos podem ser testados depois. No primeiro lançamento, o valor central é conseguir criar e compreender um jogo, com trabalho preservado e ajuda disponível.

Quem já possui base pode demonstrá-la por uma atividade curta e receber uma recomendação de entrada. Esse diagnóstico pode ser operado pela equipe no piloto; não exige construir agora um motor de certificação de competências.

## Diagnóstico da plataforma atual

A distância entre as comunidades tem três componentes: integração técnica, experiência apresentada ao aluno e conteúdo comercial disponível. Uma oferta precisa dos três.

| Situação | Recursos encontrados | Consequência para a proposta |
| --- | --- | --- |
| Já consumidos pelo adulto | Cursos, seções, vídeos, quiz, interativos, Estúdio e Pinta embarcados, entregas, recados, materiais, certificados, fórum e helpdesk | Produzir e configurar o curso sobre a base atual |
| Presentes com integração incompleta | Estúdio Pro, salvamento de rascunho na conta, publicação especializada e uso livre das ferramentas | Completar apenas o que a oferta inicial promete |
| Experiências ainda exclusivas do Kids | Criar, Estúdio livre, Pensa, Pinta livre, Molda, Como fazer, Mural jogável e gamificação visual | Adaptar em fases, com política adulta de acesso |
| Infraestrutura comercial existente | Catálogo, ofertas, pagamento, matrículas e funis | Criar um produto de curso adulto e validar a jornada de compra |
| Produto atual informado | PDF que não está sendo vendido | Tratar como material de apoio ou ativo para fase avançada; não como centro da nova oferta |

O repositório contém o funil `pro/no-comando-da-ia`, com entrega de e-book e kit prático. Isso confirma uma integração comercial anterior, não vendas em andamento nem um curso adulto pronto. O cadastro de exemplo de cursos também não comprova catálogo publicado de produção.

### Diferenças que merecem prioridade

**O rascunho precisa acompanhar o aluno.** No adulto, o contexto da aula não liga a mesma sincronização em nuvem do Kids. Progresso e entregas enviadas têm persistência, mas a edição em andamento não recebe a mesma experiência entre aparelhos. Para um curso prático, essa é a primeira melhoria técnica.

**O aluno precisa concluir um projeto, além de concluir aulas.** O adulto já tem entregas e devolutivas. Falta organizar isso como parte visível da oferta: qual projeto será produzido, o que será revisado e como melhorar depois da resposta.

**A ajuda deve ser encontrada no ponto da dificuldade.** Há recados e helpdesk. A biblioteca Como fazer ainda não tem páginas adultas; o renderer adulto desativa esses links. Transferir os tutoriais úteis reduz repetição de dúvidas e melhora a autonomia.

**Publicação e criação livre precisam de integração própria.** O Mural tem destino infantil fixo no código examinado. Pensa e voz têm regras de sessão Kids. O Estúdio livre depende de capacidades da jornada infantil. Essas políticas precisam de uma versão adulta; copiar telas não basta.

**Oficinas ao vivo já existem no adulto.** A sala pode ser aproveitada posteriormente. A venda de vagas e os direitos de turma devem ser verificados separadamente do checkout de um curso gravado.

## Alternativas de implantação

| Caminho | Vantagem | Custo e risco | Avaliação |
| --- | --- | --- | --- |
| Curso 2D com blocos, prática e devolutivas; expansão progressiva | Aproveita o motor atual, permite testar aprendizagem e venda | Exige bom primeiro curso e integração confiável de rascunhos | **Recomendado** |
| Paridade completa com Kids antes de lançar | Adulto recebe muitas ferramentas de uma vez | Adia receita, amplia QA e mistura recursos sem uso didático imediato | Reservar para evolução após validação |
| Começar por turma ao vivo | Permite observar dúvidas e ensinar com apoio direto | Agenda, capacidade humana, gravação e operação comercial de vagas | Alternativa se a equipe tiver disponibilidade confirmada |

O caminho recomendado preserva a visão de uma comunidade completa e reduz o número de dependências da primeira oferta. A recorrência entra quando houver continuidade demonstrável e uma operação capaz de mantê-la.

## Primeiro curso para vender

Nome de trabalho: **Programação com Jogos — Meu Primeiro Jogo 2D**.

Resultado proposto: o aluno cria no navegador um jogo com movimento, pontuação, colisão e reinício; consegue explicar suas regras principais e fazer uma alteração sem repetir o passo a passo do professor.

O projeto inicial pode ser um jogo de coletar objetos e evitar obstáculos. Ele deve ser escolhido pela clareza dos conceitos, não pelo número de efeitos. Assets, cenário inicial e configuração do editor vêm preparados; o aluno constrói e modifica o comportamento.

Público: adultos sem experiência em programação, com interesse em jogos e disposição para praticar. Requisito de lançamento: computador ou notebook, internet e navegador validado. Celular pode servir para assistir e consultar materiais; autoria completa no celular só deve ser prometida após testes específicos.

Formato inicial proposto: oito aulas, divididas em seções curtas, com vídeos de aproximadamente três a oito minutos e prática no Estúdio. Carga estimada de seis a dez horas, incluindo exercícios; percurso sugerido de quatro semanas, ajustável ao ritmo individual. Essas estimativas devem ser recalibradas com os primeiros usuários.

| Aula | O aluno faz | Conceito principal | Evidência de compreensão |
| --- | --- | --- | --- |
| 1 Conhecer e alterar o jogo | Joga a referência, abre o projeto e modifica um comportamento | Programa como conjunto de regras; observar e testar | Prevê e confere o efeito de uma mudança |
| 2 Fazer o personagem responder | Monta movimento e resposta à entrada | Eventos, sequência e coordenadas | Muda direção ou velocidade sem copiar a montagem inteira |
| 3 Controlar pontos | Cria e atualiza pontuação | Variável e estado | Explica quando o valor muda e quando deve zerar |
| 4 Definir colisão e resultado | Coleta, perde ou vence conforme as regras | Condição e comparação | Corrige uma condição que provoca resultado errado |
| 5 Controlar o que se repete | Organiza comportamento contínuo e execução única | Repetição, tempo e eventos | Diferencia inicialização de ação repetida |
| 6 Criar uma variação própria | Ajusta regra, dificuldade e apresentação | Decomposição e escolhas de projeto | Implementa uma variação proposta sem tutorial completo |
| 7 Testar e corrigir | Executa um roteiro de teste e investiga um defeito | Depuração e casos de teste | Registra problema, hipótese, mudança e resultado |
| 8 Entregar e melhorar | Envia o jogo e uma explicação breve; aplica a devolutiva | Comunicação e revisão | Entrega funcional, explica regras e faz uma melhoria |

Pinta pode aparecer como experiência opcional para personalizar um personagem. A conclusão do primeiro curso não deve exigir domínio de arte, modelagem 3D ou planejamento com IA. Funções e organização mais elaborada ganham espaço no segundo curso, antes da transição mais intensa para texto.

### Padrão de cada aula

O aluno primeiro entende o objetivo e vê o comportamento esperado. Faz uma previsão ou uma pequena exploração, recebe a explicação, constrói uma parte e testa. Depois resolve uma variação e registra o que conseguiu fazer. A próxima aula retoma o mesmo projeto quando isso for pedagogicamente útil.

Uma boa tarefa final é “faça a pontuação voltar a zero quando reiniciar e explique por que isso deve acontecer nesse momento”. Ela mostra mais compreensão do que reproduzir a posição de um bloco.

### Avaliação e devolutiva

Usar verificações automáticas existentes para requisitos objetivos que a plataforma realmente consegue conferir. A equipe avalia a explicação e a qualidade do projeto. O piloto pode ter duas revisões por participante: uma intermediária e uma final.

Rubrica proposta: movimento responde como previsto; regras de coleta/colisão estão coerentes; pontuação e reinício preservam o estado correto; aluno consegue explicar uma condição; aluno faz uma variação e demonstra como a testou.

Concluir aula, enviar projeto e receber revisão são estados diferentes. A interface e o certificado devem respeitar essa diferença. Se o certificado automático comprovar apenas conclusão, a copy não pode apresentá-lo como atestado de projeto aprovado por professor.

## O percurso depois do primeiro curso

Cada etapa abaixo é uma proposta curricular. Não representa cursos já gravados ou compromisso de lançar todos em um prazo fixo.

| Etapa | Produto possível | Ferramenta e fundamento | Condição de passagem |
| --- | --- | --- | --- |
| 1 Primeiros passos | Meu Primeiro Jogo 2D | Blocos, eventos, condições, estado e teste | Alterar regra simples e explicar seu efeito |
| 2 Base mais sólida | Novos Jogos 2D e Lógica | Blocos, funções, repetição, organização e dificuldade | Construir pequena mecânica sem roteiro completo |
| 3 Exploração 3D | Meu Primeiro Mundo 3D | Blocos 3D, posição, câmera, interação e coordenadas | Aplicar fundamentos em outro contexto |
| 4 Transição para texto | Dos Blocos ao JavaScript com Jogos | Modo Ponte e correspondência entre representações | Ler e alterar trechos de código com compreensão |
| 5 Criação com código | Jogos em JavaScript | Projeto Pro, organização de arquivos, depuração e testes | Produzir e manter jogo pequeno em código |
| 6 Recursos de produção | Arte 2D, Modelagem 3D e Projetos Autorais | Pinta, Molda, integração de assets e planejamento | Criar e integrar recurso a um jogo próprio |
| 7 Avançado | Desenvolver Jogos com Apoio de IA | Tutor e geração delimitada, revisão e testes | Conferir alterações e manter autonomia técnica |

As etapas 3 e 6 podem funcionar como ramificações. A pessoa não precisa dominar modelagem 3D para aprender JavaScript. A linha principal continua sendo programação, e a sequência dos cursos deve ser ajustada ao que os alunos demonstram conseguir fazer.

A IA pode ajudar a explicar um erro, sugerir testes, comparar implementações e acelerar tarefas repetitivas. O exercício avançado deve cobrar avaliação do resultado: o aluno identifica uma sugestão inadequada e justifica a correção. O PDF No Comando da IA se encaixa melhor nessa etapa, revisado conforme o conteúdo real.

## Experiência da comunidade adulta

A home deve responder a três necessidades: onde continuar, o que estou criando e o que preciso fazer depois. Manter o catálogo e acrescentar contexto de projeto, sem encher a primeira tela com ferramentas ainda não usadas pelo curso.

| Área | Primeira versão | Evolução após o piloto |
| --- | --- | --- |
| Início | Continuar aula, objetivo atual e acesso à devolutiva | Projeto recente, marco conquistado e recomendação de próximo curso |
| Cursos | Cursos comprados e catálogo com resultado/pré-requisitos claros | Percursos por competência e ramificações 2D/3D |
| Projetos | Projeto contínuo acessível pela aula, com estado de salvamento | Biblioteca privada e Estúdio livre com modelos de partida |
| Comunidade | Espaço adulto com apresentações, dúvidas e teste de jogos | Mostra jogável, remix autorizado e desafios temáticos |
| Ajuda | Recados pedagógicos e helpdesk de acesso | Biblioteca Como fazer com busca e links dentro da aula |
| Oficinas | Oferta separada quando houver operação pronta | Turmas e aprofundamentos com venda de vagas integrada |

Publicar projeto deve ser opcional. O aluno pode concluir e aprender mantendo o jogo privado. A passagem de etapa deve se apoiar em aprendizagem, não em exposição pública obrigatória.

Para o piloto, bastam poucos canais: comece aqui; dúvidas e soluções; mostre seu jogo; teste o jogo de um colega. A equipe precisa iniciar conversas e propor tarefas específicas. Um fórum vazio não entrega o valor de comunidade só por estar disponível.

## Recursos Kids a transferir por prioridade

| Prioridade | Recurso | Transferência proposta | Benefício principal |
| --- | --- | --- | --- |
| P0 | Salvamento de rascunho na conta | Extrair transporte e integrar contexto/rotas no adulto | Preservar o trabalho e permitir retomada |
| P0 | Aula prática e projeto contínuo | Configurar Estúdio clássico, atividades, carryover e devolutivas | Entregar aprendizagem e projeto concreto |
| P0 | Orientação de tarefa e progresso | Objetivo, estado da entrega e próximo passo em linguagem adulta | Evitar que aluno se perca |
| P0 | Acesso e venda do curso | Produto, oferta, funil, matrícula e verificação completa | Tornar o curso comprável e acessível |
| P1 | Como fazer | Base de tutoriais e apresentação adulta | Resolver dúvidas de uso sem depender de atendimento |
| P1 | Biblioteca e Estúdio livre | Host adulto e capacidades por oferta/curso | Continuar criando fora da sequência da aula |
| P1 | Mostra de jogos | Publicação com destino adulto e visibilidade explícita | Mostrar resultado e criar interação |
| P1 | Marcos de criação | Projetos e competências concluídos | Dar continuidade visível ao aprendizado |
| P2 | Pinta e Molda livres | Hosts adultos e integração com o Estúdio | Sustentar cursos específicos de arte e 3D |
| P2 | Pensa | Adaptar conta e acesso ao planejamento de jogos para adultos | Organizar projetos autorais maiores |
| P2 | Cursos ao vivo | Operação de turmas e acesso comercial próprio | Aprofundar projetos com acompanhamento |
| P3 | IA e voz | Política adulta, contexto, limites e operação de custo | Apoiar o nível avançado e acessibilidade |
| Opcional | Ranking, moedas, avatar e quarto | Testar somente se houver uso e interesse | Engajamento complementar |

Pensa é citado como recurso futuro de planejamento de jogos. Seu fluxo atual usa IA; ele não será introduzido no início apenas para aproveitar uma ferramenta disponível. Um roteiro simples de projeto pode cumprir esse papel até a etapa apropriada.

## Oferta e modelo comercial

Começar com compra de curso avulso. O comprador deve entender o resultado, o acesso e a ajuda incluída antes de encontrar uma proposta de assinatura.

### Condição proposta para o piloto

| Item | Proposta inicial |
| --- | --- |
| Produto | Curso gravado adulto Meu Primeiro Jogo 2D |
| Pagamento | Compra única; preço inicial a testar de R$ 297 |
| Capacidade | Até 20 participantes, limitada pela capacidade de revisão |
| Acesso | 12 meses às aulas, materiais e Estúdio dentro das aulas |
| Apoio pedagógico | Dúvidas e duas revisões durante as primeiras seis semanas de cada participante |
| Suporte de acesso | Canal para problemas de conta/compra durante a vigência do acesso |
| Comunidade | Espaço adulto do curso pelo prazo incluído no produto |
| Equipamento | Computador/notebook e navegador validado |
| Entrega final | Jogo salvo na conta e enviado à equipe; download incluído somente após integração e verificação |
| Ao vivo | Não incluído nesta oferta; turma ao vivo terá produto e contrato próprios |

R$ 297 é hipótese para uma oferta com prática e revisão, não preço deduzido de demanda comprovada. Antes de fechar a condição pública, ouvir adultos do público pretendido e estimar o custo do atendimento. A capacidade de 20 pessoas só deve aparecer como limite de vagas se a operação realmente impuser esse teto.

O prazo de seis semanas do apoio exige regra operacional clara e contagem a partir da compra. O sistema atual de recados não deve ser apresentado como se já aplicasse automaticamente esse limite. Garantia, cancelamento e demais condições precisam ser configurados de forma coerente com catálogo e checkout antes da venda; esta proposta não altera condições existentes.

Não oferecer acesso vitalício a professor, IA ou ferramentas com custo contínuo. Para o primeiro curso, a ferramenta necessária funciona dentro da aula por direito do curso. Se a oferta futura incluir Estúdio livre, Pinta, Molda ou Pensa, essas entregas precisam de direitos próprios.

### Papel do PDF atual

O PDF não precisa sustentar a oferta inicial. O No Comando da IA trata de um tema que o usuário decidiu colocar no avançado; forçá-lo como entrada criaria uma expectativa diferente da experiência do primeiro curso.

Pode ser revisado e incorporado ao curso avançado, preservando acessos já concedidos. Para o iniciante, um material de apoio mais coerente é um mapa dos conceitos do jogo e um roteiro de teste. Não é preciso produzir um grande e-book para começar.

### Quando oferecer assinatura

Uma assinatura faz sentido quando existir continuidade de uso: cursos concluíveis, próximos projetos claros, criação livre útil, atividade de comunidade e capacidade de manter a entrega. Como critério interno, avaliar a assinatura depois de dois ou três cursos completos, da segunda turma paga e de alunos retornando para criar novamente.

A futura Comunidade Sistema Zero pode combinar biblioteca de cursos gravados, acesso às ferramentas previstas e desafios de criação. Oficinas ao vivo e revisão individual podem continuar sendo ofertas separadas, com capacidade definida. A chave-mestra atual não inclui automaticamente curso ao vivo nem todas as ferramentas.

Faixa meramente exploratória para essa fase: R$ 59 a R$ 99 mensais, sujeita a pesquisa, uso e custo. Não anunciar recorrência antes de definir e conseguir manter a entrega. Quem comprou curso avulso mantém as condições da própria compra.

## Posicionamento e comparação com alternativas

Proposta de posicionamento: **aprender programação criando jogos, começar com blocos e avançar até compreender e escrever código, com prática e orientação dentro da plataforma**.

O argumento deve ser demonstrado: mostrar a regra sendo construída, o jogo respondendo e o aluno explicando uma mudança. Evitar promessas de emprego, renda, domínio rápido ou de que qualquer adulto vai concluir no mesmo prazo.

| Alternativa observada | O que oferece | Implicação para o Sistema Zero |
| --- | --- | --- |
| Scratch | Programação visual e comunidade criativa, usada por diversas idades | Blocos e compartilhamento, isoladamente, não sustentam diferenciação |
| GDevelop | Editor de eventos com condições e ações, com documentação para criar jogos | Acesso a uma ferramenta visual precisa vir acompanhado de percurso e apoio claros |
| Construct | Sistema de eventos e possibilidade de combinar com JavaScript | A passagem entre visual e texto também existe em outras ferramentas; demonstrar a qualidade da nossa orientação |
| Tutoriais e cursos gratuitos | Conteúdo e exemplos com diferentes níveis de organização | O curso pago deve reduzir dúvidas de sequência, oferecer prática consistente e entregar o apoio prometido |

Referências primárias consultadas em 18/10/2026: [Scratch](https://scratch.mit.edu/help/parents/), [editor de eventos do GDevelop](https://wiki.gdevelop.io/gdevelop5/interface/events-editor/), [eventos no Construct](https://www.construct.net/en/make-games/manuals/construct-3/project-primitives/events). A comparação é de capacidades e posicionamento; não foi feito levantamento comparável de preços, participação de mercado ou disposição a pagar de adultos brasileiros.

A diferenciação proposta está na combinação de sequência, prática contextualizada, projeto preservado, devolutiva e transição acompanhada. Essa combinação precisa ser validada com alunos; não deve ser anunciada como exclusividade de mercado.

### Objeções a tratar com produto e prova

| Hipótese de objeção | Resposta de produto | Evidência a produzir |
| --- | --- | --- |
| Blocos parecem coisa de criança | Explicar a lógica construída e mostrar sua correspondência em código | Demonstração Blocos/Ponte e linguagem adulta |
| Nunca programei | Começar com projeto e assets preparados, introduzir uma regra por vez | Primeira aula testada com iniciantes reais |
| Não tenho muito tempo | Aulas curtas e retomada confiável | Duração observada de tarefas e salvamento verificado |
| Vou travar sozinho | Dicas, tutorial de uso, recados e revisões delimitadas | Exemplo real de dúvida e devolutiva, com autorização |
| Vou apenas copiar | Variação sem roteiro e explicação da regra | Projeto do aluno diferente do exemplo |
| Já existe ferramenta gratuita | Entregar percurso, prática e apoio definidos | Comparação factual de entregas, sem desqualificar alternativas |

Essas objeções são hipóteses para entrevistas e testes de oferta, não frases atribuídas a clientes existentes.

## Caminho da demonstração até a compra

1. Conteúdo mostra uma regra do jogo e seu resultado: pontuação, colisão ou reinício.
2. A pessoa vê uma demonstração curta do curso e entende para quem ele serve.
3. A página apresenta projeto final, conteúdo, requisitos, acesso e apoio.
4. Checkout cobra a oferta do catálogo e concede o curso adulto correto.
5. Primeiro acesso leva à primeira tarefa, com configuração mínima.
6. Aluno faz uma mudança, executa e vê o estado de salvamento.
7. Entrega intermediária gera devolutiva e uma ação de melhoria.
8. Entrega final conduz à revisão e à recomendação de continuidade.

O funil não precisa começar com um quiz longo. Um vídeo demonstrativo pode cumprir a etapa gratuita. Se houver aula prática gratuita autenticada, será necessário confirmar ou implementar o fluxo de matrícula apropriado; oferta a R$ 0 não pode ser presumida, pois a ativação de ofertas pagas exige preço positivo.

Para a primeira divulgação, priorizar exemplos concretos: “por que o placar não zera?”, “o que acontece quando trocamos esta condição?” e “como fazer o jogo ficar mais difícil sem quebrar a regra?”. A página de venda fala diretamente com o adulto que vai estudar, sem reutilizar argumentos destinados aos responsáveis Kids.

Não assumir que a base de pais quer aprender programação. Caso a equipe teste esse público, medir interesse de forma separada da aquisição de adultos iniciantes por outros canais.

## Arquitetura de reaproveitamento

Manter os aplicativos adulto e Kids separados, com bibliotecas compartilhadas. As melhorias de comportamento, salvamento, validação e transporte devem beneficiar os dois públicos; apresentação e regras pedagógicas continuam específicas.

| Responsabilidade | Onde deve ficar |
| --- | --- |
| Curso, aulas, exercícios, entregas, progresso e revisão | `members`, contratos em `core` e autoria no `admin` |
| Editor e recursos de criação | Bibliotecas `studio`, `pinta`, `molda` e `pensa` |
| Player, BFF e transporte reutilizável | `member-shell` |
| Navegação, linguagem e composição adulta | `community` |
| Identidade familiar, jornada e gamificação Kids | `community-kids` |
| Preço, prazo e itens entregues | `catalog` |
| Cobrança e confirmação | `payments` |
| Apresentação, aquisição e checkout | `funnel` |
| Espaços, discussões e publicação comunitária | `hub`, com autorização por público e acesso |

A extração de salvamento deve ter identidade e linguagem configuráveis. A publicação deve receber destino adulto validado no servidor. Ferramentas livres adultas devem resolver acesso pelo produto e por requisitos do percurso adulto, sem exigir postos infantis.

O primeiro curso usa projeto clássico em Blocos. O modo Ponte pode aparecer como demonstração orientada; Projeto Pro, runtime avançado, tutor IA e Pensa não são dependências de lançamento. O mesmo código de publicação não deve apontar adultos para o Mural Kids.

Reaproveitar ideias, cenas e projetos de referência reduz autoria, mas não torna vídeos infantis adequados automaticamente. Revisar instrução, narração, arte, tarefa, dificuldade e direitos de uso antes de reutilizar cada peça. O clone de curso no Admin pode servir de ponto de partida em rascunho, nunca como publicação automática do curso adulto.

## Plano de implantação em até 90 dias

Os intervalos abaixo são uma organização de trabalho. Dependem de disponibilidade de equipe e de aprovação da oferta; não são compromisso de prazo de desenvolvimento.

| Período de referência | Entrega | Responsáveis necessários | Critério para seguir |
| --- | --- | --- | --- |
| Dias 1 a 10 | Projeto de referência, plano das oito aulas, primeira aula e entrevistas com 8 a 12 adultos | Júlio/produto, autoria e desenvolvimento | Cinco iniciantes conseguem usar a primeira atividade; problemas observados estão registrados |
| Dias 11 a 30 | Salvamento adulto, curso completo, oferta/funil e materiais mínimos | Desenvolvimento, autoria, revisão e operação comercial | Compra, prática, retomada e devolutiva aprovadas em QA |
| Dias 31 a 60 | Piloto pago e acompanhamento de até 20 pessoas | Professor/revisor e atendimento | Aprendizagem, dificuldades, horas de suporte e reembolsos medidos |
| Dias 61 a 90 | Ajustes, segunda turma e início do segundo curso | Produto, autoria, desenvolvimento e marketing | Primeiro curso consistente e segunda venda testada antes de ampliar catálogo |

A produção de conteúdo e a integração técnica podem avançar simultaneamente. O caminho crítico é: atividade inicial utilizável → salvamento e entregas confiáveis → curso completo → compra e acesso verificados → piloto.

### Estimativa de esforço inicial

Hipótese: uma pessoa de desenvolvimento experiente no monorepo, ambiente funcional e dedicação relevante; autoria e operação com responsáveis disponíveis. Estimativa de planejamento a refinar após o teste vertical, sem reconstrução do editor.

| Frente | Faixa inicial |
| --- | --- |
| Completar nuvem e retomada adulta | 3 a 6 dias de desenvolvimento |
| Configurar experiência de curso/projeto e ajustes adultos essenciais | 2 a 4 dias de desenvolvimento |
| Oferta, funil e integração de acesso | 2 a 3 dias de desenvolvimento |
| QA completo e correções do fluxo inicial | 3 a 5 dias de desenvolvimento |
| Total técnico do lançamento concentrado | 10 a 18 dias de desenvolvimento |
| Autoria, gravação, edição, montagem, materiais e revisão das oito aulas | 50 a 90 horas de trabalho de conteúdo |
| Atendimento durante o piloto | Reservar inicialmente 4 a 6 horas por semana e ajustar ao uso |

Estúdio livre, Mural adulto completo, Como fazer completo, Molda/Pensa e venda automatizada de vagas não estão embutidos nessa estimativa. Exportação/download, se incluídos, precisam de escopo próprio confirmado no teste vertical. A estimativa técnica mede esforço, não dias corridos nem preço de contratação.

### Capacidade de revisão

Com 20 participantes e duas revisões de 12 minutos, são 8 horas apenas de avaliação de projetos. Dúvidas, reenvios, leitura de contexto e problemas técnicos acrescentam tempo. Medir duração real nas primeiras cinco revisões antes de ampliar a turma.

Uma promessa pública de prazo de resposta só deve ser definida depois de reservar a capacidade correspondente. No piloto, manter rotina interna de leitura da fila em dias úteis e um responsável por cada pendência.

### Leitura econômica

Com todas as 20 vagas pagas a R$ 297, a receita bruta aritmética é R$ 5.940. Isso não é previsão de vendas nem lucro: ainda existem reembolsos, taxas, tributos, aquisição, infraestrutura, conteúdo e atendimento.

Para decidir preço e escala, calcular receita efetivamente retida menos custos variáveis, horas de atendimento e investimento de produção. Medir a contribuição por participante e a recuperação do investimento inicial; não usar faturamento bruto como prova de viabilidade.

## Medição e critérios do piloto

As metas seguintes são limites internos propostos para aprender com a primeira turma. Uma amostra de 20 pessoas ajuda a encontrar problemas, mas não demonstra demanda de mercado ou retenção em escala.

| Medida | Definição | Referência proposta para 20 compradores |
| --- | --- | --- |
| Ativação | Comprador faz primeira alteração prática salva em até sete dias | Pelo menos 16 pessoas |
| Entrega intermediária | Comprador envia projeto intermediário dentro da janela de apoio | Pelo menos 12 pessoas |
| Resultado final | Comprador entrega jogo funcional e explica uma regra em até seis semanas | Pelo menos 10 pessoas |
| Autonomia | Participante faz variação sem repetir roteiro e demonstra teste | Avaliar por rubrica, registrando quantidade e dificuldades |
| Confiabilidade | Falhas de acesso, perda de trabalho ou confirmação falsa de salvamento | Investigar e corrigir cada ocorrência antes de ampliar a venda |
| Apoio | Minutos por revisão, tempo até resposta e dúvidas por aluno | Caber na capacidade reservada sem fila crescente |
| Reembolso | Quantidade, valor e motivo entre compradores | Investigar cada caso; motivo recorrente exige revisão da oferta/entrega |
| Continuidade | Aluno inicia novo projeto ou compra próximo curso quando disponível | Registrar ações e compras; intenção em pesquisa fica separada |

Ativação usa todos os compradores no denominador. No analytics existente, `started` significa concluir ao menos uma aula e a taxa de conclusão usa essa população. Preservar o significado do relatório atual; medir ativação e resultado entre compradores separadamente para não esconder abandono antes da primeira conclusão.

Reusar dados de pagamentos, progresso e entregas. Para primeira alteração salva e retomada, verificar instrumentação e acrescentar somente os eventos que faltarem. Registrar produto, curso, versão e origem de aquisição sem inserir dados pessoais desnecessários em relatórios.

Interpretação operacional: pouca compra com boa aprendizagem pede revisão de público, oferta ou preço; compra com pouca ativação pede revisão do primeiro acesso; ativação com pouca entrega pede revisão de dificuldade e apoio; conclusão sem variação autônoma pede revisão pedagógica; fila crescente pede ajuste de capacidade antes de mais aquisição.

## Critérios de liberação

Antes de vender, o curso anunciado deve estar completo e revisado, com primeiro e último projeto funcionando. A presença de aulas “em breve” na trilha obrigatória precisa ser resolvida antes de apresentar o curso como pronto.

Verificar com conta adulta comum o pagamento em ambiente apropriado, confirmação, matrícula correta, acesso, execução, salvamento local e em conta, retomada em outro navegador, entrega, revisão e expiração. A equipe deve conseguir abrir exatamente o que o aluno enviou. Essas verificações ainda são trabalho de execução posterior.

A oferta precisa especificar duração de acesso, janela de apoio, quantidade de revisões, ferramentas incluídas e equipamento necessário. O catálogo é fonte de preço e direitos; a página e o checkout devem corresponder a ele.

Incluir testes de regressão dos contratos compartilhados e dos caminhos adultos implementados. Preservar sessão, permissões e isolamento Kids. Publicação, Pro e ferramentas livres só entram nas promessas depois de terem seus próprios caminhos verificados.

## Principais riscos e respostas

| Risco | Resposta proposta |
| --- | --- |
| Curso parece infantil | Testar primeira aula com adultos e revisar voz, exemplos e apresentação |
| Aluno só copia | Inserir variação, previsão, explicação e depuração em cada etapa |
| Transição para texto vira uma ruptura | Usar Ponte e retomar o mesmo conceito nas duas representações |
| Muitas ferramentas atrasam lançamento | Limitar primeiro curso a Estúdio clássico, aprendizagem e devolutiva |
| Aluno perde trabalho | Completar nuvem, conflito e retomada antes da aquisição |
| Assinatura gera promessa maior que a entrega | Validar curso avulso e continuidade antes de recorrência |
| Professor vira gargalo | Duas revisões delimitadas, rubrica e capacidade medida |
| Adultos recebem conteúdo ou direitos Kids | Políticas e destinos por público com verificação de acesso |
| IA entra antes da base | Manter o iniciante sem geração e definir critérios de entrada no avançado |

## Decisões propostas

Adotar programação com jogos como linha principal adulta. Lançar Meu Primeiro Jogo 2D em Blocos, com oito aulas práticas e duas revisões no piloto. Priorizar salvamento na conta e jornada de entrega. Organizar a evolução para lógica mais sólida, Ponte e código, deixando IA para o avançado.

Validar preço, quantidade de vagas e duração de apoio com capacidade real antes de publicar. Iniciar o trabalho concreto pelo projeto de referência e por uma aula adulta completa: ela permitirá verificar, em uma única experiência, conteúdo, editor, salvamento, exercício, entrega e devolutiva.

O sucesso inicial será ter adultos comprando, criando, compreendendo e terminando um jogo. Esse resultado orienta quais recursos do Kids transferir em seguida e dá sustentação à futura comunidade por assinatura.
