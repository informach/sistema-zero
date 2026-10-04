# Diretrizes pedagógicas das aulas Kids

Referência consolidada em 03/10/2026 a partir das decisões do Cadê Todo Mundo? e de sua aplicação ao Desafio do Primeiro Jogo. Leia junto do [BRIEFING](BRIEFING.md), da [especificação do roteiro](ESPEC-ROTEIRO.md) e do [contrato do manifesto](ESPEC-MANIFESTO.md). Este documento organiza as decisões vigentes; modelos antigos não substituem essas decisões.

## Como decidir o formato de um curso

Antes de escrever aulas, registre na proposta do curso: o que a pessoa já sabe, o que vem preparado, o que ela construirá, ferramentas e paletas disponíveis, sequência das conquistas, conceitos que precisam de experiência, distribuição dos quizzes e critérios de conclusão. Mantenha título, descrição curta, descrição, nome e **resumo de cada módulo**, aulas e ordem em `modulos-*.md`.

O Cadê Todo Mundo é referência de clareza, instrução completa e coerência entre materiais. Não é um molde que obriga todo curso a ter o mesmo número de aulas, seções, experiências ou quizzes. Uma diferença precisa de motivo pedagógico explícito e de correspondência nos materiais e na plataforma. Não exige nova autorização para cada decisão rotineira de autoria; instruções do usuário prevalecem.

| Decisão | Regra geral | Aplicação que depende do curso |
| --- | --- | --- |
| Contexto | Situar a tarefa antes de pedir uma ação | Uma frase pode bastar; não inventar recapitulação ou agenda |
| Zappy | Orientar a atividade; após vídeo, fazer a ponte imediatamente | Na seção sem vídeo, apresentar diretamente o que fazer |
| Montagem | Ensinar todos os gestos necessários | Artes, cenário e partes prontas podem reduzir a montagem inicial |
| Experiência | Tornar concreto um conceito que realmente precisa disso | Não criar uma cena para cada operação ou palavra nova |
| Paletas | Usar apenas ferramentas disponíveis e necessárias | Jogos iniciais: Programação e Jogo 2D; outros cursos podem ensinar outras paletas |
| Quiz | Retomar raciocínio já ensinado, em seção própria | Cursos curtos: revisão final; cursos maiores: revisões distribuídas por aula ou etapa |
| Caderno | Acompanhar a aula, com o mesmo padrão visual | Extensão e conteúdo acompanham o percurso real |
| Entrega | Conferir o trabalho, reconhecer a autoria e encerrar | Publicação, certificado e atividades dependem da proposta do curso |

## 1. Contexto, vídeo, Zappy e atividade

Cada seção tem uma tarefa compreensível e uma saída clara. No ensaio do Cadê Todo Mundo, uma das duas crianças entendeu apenas que o professor apertou botões: o tour havia escondido o convite para jogar. A clareza é avaliada pelo que a pessoa consegue fazer sem receber uma explicação extra do adulto. Na abertura, apresente **qual jogo será construído e o que acontece nele**, antes de convidar a jogar a versão pronta. Não transforme introdução em tour da plataforma. Uma introdução pode continuar existindo quando apresenta o projeto ou o material com uma função real.

Quando há vídeo, a ordem editorial é **vídeo → diálogo curto do Zappy → atividade ou encaminhamento**. Há no máximo um vídeo e um diálogo externo por seção. A ponte identifica a ação seguinte, sem repetir a aula, dar respostas da experiência ou acrescentar obrigação de conclusão. Registre a fala também na proposta e no roteiro como **texto da página, não gravar**. Consulta opcional continua opcional.

Uma experiência pode ter sua própria fala do Zappy junto aos controles. Ela ensina o gesto específico; a ponte liga o vídeo a essa tarefa. Não repetir o mesmo comando nas duas nem adicionar uma terceira instrução genérica.

Uma seção sem vídeo também precisa de contexto e orientação. No quiz, a fala vem **antes das perguntas** e diz o que será retomado, que haverá explicações e que é possível corrigir. Não inventar um vídeo para preencher o modelo.

Ordem dos blocos não é regra de bloqueio do player. A opção de assistir antes da atividade pertence à configuração do curso (`videoBeforeActivity`). Se estiver ativada, o player libera após o limiar de visualização; se estiver desativada, a atividade fica disponível junto do vídeo. Seção de quiz não tem vídeo e não recebe essa espera. Não escrever instruções que contrariem a configuração usada.

## 2. Montagem guiada e conceito concreto

Na montagem, ensinar caminho da paleta, nome literal do bloco, encaixe com referência visível, campo, valor, o que manter, teste e correção do erro provável. Não pedir que a pessoa adivinhe uma peça nem usar “faça como eu fiz” como substituto. Se um valor já está certo, explicar e mantê-lo. Aguardar os gestos; encurtar linguagem não significa acelerar a montagem. Quando a plataforma exige verificação, ensinar a sequência completa: testar o jogo, **Verificar esta etapa**, corrigir e verificar novamente se necessário, conferir **Objetivo da etapa cumprido!**, esperar **Salvo**, **Enviar para o professor**, confirmar **Enviar** e avançar ou concluir. Uma instrução omitida pode impedir a conclusão mesmo com o jogo certo.

Explicar palavras novas quando necessárias e usar o próprio jogo como exemplo. Analogias são opcionais. Na experiência, orientar todos os testes obrigatórios, sem fazê-los pela pessoa ou antecipar cada resultado. Pistas são ajuda adicional, nunca o único lugar com um passo obrigatório. Palpite só entra quando comparar hipótese e observação ensina algo; não vale nota e não aparece automaticamente em toda seção.

“Dor antes da solução” cabe quando existe um problema reproduzível no jogo. Conferir se o problema aparece de verdade. Não encenar um defeito encoberto pelo cenário nem usar a sequência como obrigação para qualquer conceito.

Agrupar gestos que produzem uma conquista; um encaixe não precisa de uma seção. Conceito e experiência que o concretiza ficam juntos. O estado entregue por uma aula deve ser exatamente o que a seguinte assume, preservando o projeto de quem está aprendendo.

## 3. Projetos iniciais: só Programação e Jogo 2D

Cadê Todo Mundo e Desafio do Primeiro Jogo são jogos iniciais com paleta limitada. Não usar blocos de HTML, CSS, Estrutura, Aparência ou outras paletas indisponíveis. Isso vale para o projeto preparado, a versão pronta para jogar, as retomadas, o projeto final, `allowBlocks`, roteiros, critérios e desenhos no caderno. Esconder a categoria não resolve se o projeto ainda depende de um bloco dela.

As áreas do projeto e os blocos de valor continuam disponíveis como estrutura de Programação. O preparo da tela usa os recursos de Jogo 2D. Não confundir blocos de HTML/CSS que o aluno manipula com os arquivos internos gerados pelo motor para executar o jogo: esses arquivos não são conteúdo a ensinar nem a apagar indiscriminadamente.

Um curso posterior pode ensinar HTML, CSS, Pinta, outras extensões ou código quando isso fizer parte de seu objetivo e estiver liberado naquele ponto da jornada. Registrar a escolha e conferir a paleta real. Não ampliar o acesso só para acomodar um roteiro antigo.

Reconhecer o que veio pronto e o que a pessoa programou. Não atribuir a ela o desenho de artes preparadas ou todas as regras de um jogo que recebeu parcialmente montado.

## 4. Quizzes: quantidade, lugar e correção

**A seção do quiz contém exatamente diálogo do Zappy → quiz. Sem vídeo, Estúdio, experiência, texto adicional, materiais ou certificado na mesma seção.**

Nos dois cursos curtos atuais, há **um quiz por curso**, na aula final, imediatamente antes da seção do certificado: três perguntas no Cadê Todo Mundo e quatro no Farol. A publicação já foi ensinada; não é uma nova condição para fazer o quiz ou emitir o certificado.

Em cursos maiores, distribuir quizzes por aula ou etapa quando houver raciocínio novo a retomar. Um por aula pode ser adequado, mas não é obrigação para uma aula de consulta, abertura ou celebração. Justificar quantidade e posição na proposta. Em uma aula de construção, o quiz pode anteceder a entrega ou o teste final; nos dois cursos curtos, antecede o certificado. Não repetir uma pergunta que só duplica o palpite ou a experiência.

Cada questão aborda uma situação concreta ensinada, uma relação ou decisão. Alternativas erradas representam confusões compreensíveis, sem pegadinhas. Não cobrar memória de menu, velocidade de resposta, assunto futuro ou leitura de um tutorial opcional. A explicação mostra **por que** a regra funciona no jogo e ajuda a corrigir.

Nos quizzes finais atuais, a seção exige 100% com tentativas sem limite e sem espera artificial. O quiz entra em `completion.blockIds`, usando a revisão formativa já existente na plataforma. Acertar de primeira não é requisito; a correção é parte da aprendizagem. Não aplicar essa nota automaticamente a todos os cursos nem inventar uma propriedade de manifesto para ativar a revisão. Verificar submissão, retorno à aula, preservação de acertos e avanço ao certificado.

Manter certificados emitidos e aulas já concluídas. Adicionar uma seção não autoriza retirar conquistas anteriores ou recriar a aula com outro identificador.

## 5. Caderno, ajuda e publicação

O caderno acompanha o conteúdo real, com passo a passo completo. Pode conter visão geral, navegação, experiências, testes, publicação, quiz e certificado. Não inventar um “mapa” que a aula não ensina. O mapa separado para responsáveis foi retirado destes cursos.

Usar o padrão visual do Cadê Todo Mundo: tipografia, cartões, ilustrações e blocos com encaixes desenhados. **Cada bloco deve ter a cor exata da definição final no Estúdio**, inclusive áreas, famílias e valores encaixados. Não aproximar pela cor geral da categoria. Gerar e conferir o PDF renderizado, legibilidade e cortes.

Apresentar o caderno na seção 2 da primeira aula; anexar uma vez, com consulta, leitura e download opcionais. As outras aulas podem indicar onde encontrá-lo. O caderno não ganha um gabarito antecipado da revisão: orienta a retomar o trabalho e responder na aula.

Como Fazer recebe tutoriais de pausar, rever, ampliar, leitor, download e alternativas de interface. Links dentro das aulas abrem na **mesma aba**, com retorno à aula de origem. Conferir destino e retorno; não exigir visita a toda a biblioteca. Para uma dúvida sobre a atividade, indicar **Preciso de ajuda?** no rodapé da aula conforme o fluxo existente.

Se publicar é a tarefa da seção, a aula ensina o caminho mínimo: Compartilhar, título e resumo, Gerar capa, conferir, Publicar, aguardar confirmação, Fechar e Concluir aula. Personalização e problemas ficam no Como Fazer. Nos dois cursos atuais, publicação é ensinada sem virar bloqueio técnico adicional. Conferir o acesso real ao Mural durante a oferta; não prometer ação indisponível.

## 6. Linguagem e encerramento

Falar com “você”, em português brasileiro, com contexto concreto, acentuação e frases naturais. Sem travessões nas falas, metáforas não marcadas, perguntas retóricas que escondem uma ordem, excesso de elogios ou linguagem comercial. A referência de público atual é de 9 a 14 anos; não chamar quem assiste de “criança” na narração.

Encerrar na ação real: Próxima seção, envio e confirmação, ou Concluir aula. Na seção do certificado, orientar Pegar meu certificado; quem já emitiu encontra Baixar certificado (PDF). Não antecipar a próxima tarefa depois da saída, atribuir autoria exagerada ou inserir venda na celebração infantil. Continuidade comercial é dirigida ao responsável fora dessa tarefa.

Não localizar a ferramenta como “aqui ao lado” ou “aí embaixo”: a posição muda com o tamanho da tela. Mostrar e nomear a atividade. Posições internas estáveis e encaixes continuam sendo descritos. Na gravação, conferir que o efeito citado está realmente visível; não fabricá-lo na edição. Na ferramenta externa, comparar o trabalho com sinais observáveis; assistir ao vídeo não comprova a criação.

## 7. Como manter as decisões vivas

1. Ao aprovar uma mudança pedagógica, registrar aqui a regra, motivo e escopo. Se depender do curso, registrar também sua aplicação em `modulos-*.md` e na proposta. Atualizar orientações antigas que a contradigam.
2. Atualizar juntos proposta, roteiro, gerador, manifesto, caderno e critérios. O manifesto gerado não pode ser a única edição: regenerá-lo precisa conservar a decisão.
3. Regras estruturais verificáveis entram no validador e em testes com casos inválidos: ordem do Zappy, isolamento do quiz, paletas e preservação do certificado. Qualidade da explicação e pertinência da experiência exigem leitura humana.
4. Rodar geradores, validadores de manifesto/roteiro/Como Fazer, testes dos cursos e dos fluxos alterados. Conferir cores e diagramação dos PDFs e testar como aluno: revisão, erro, correção, retorno e avanço.
5. Antes de atualizar conteúdo remoto, reconciliar identificadores e anexos. `plannedVideo` e `items: []` são moldes locais, não substitutos para vídeos e PDFs publicados. Conferir a prévia da importação, preservar conteúdo existente e registrar o ambiente atualizado.
6. Marcar o que foi validado localmente, o que foi aplicado no Admin, o que precisa de gravação e o que ainda precisa de ensaio com crianças. Teste automatizado não comprova compreensão infantil.

Os oito manifestos destes dois cursos têm cobertura das regras novas. Os demais cursos precisam de revisão própria; estarem no repositório não comprova conformidade com todas as decisões desta revisão.

**Aplicação ao Farol, 04/10/2026:** a experiência de memória separa retirada do objeto, aviso e informação guardada, com o mesmo sumiço e aviso nos dois modos. A experiência da porta torna visíveis valor, pergunta e resposta escolhida. A construção de senão precede a de então, com teste e verificação intermediários no mesmo projeto e envio ao final. As verificações conservam as regras essenciais dos dias anteriores; o teste jogado inclui reiniciar depois da vitória. A comparação de velocidade acontece na própria montagem e a edição do aviso é opcional. Essas escolhas respondem às dificuldades deste jogo; não fixam uma quantidade de seções ou experiências para os demais cursos.

## Origem das decisões

Consulta histórica opcional; não é preciso reconstruir as regras a partir desses relatos.

- [Revisão de linguagem do Cadê Todo Mundo, 27/09](REVISAO-LINGUAGEM-CADE-TODO-MUNDO-2026-09-27.md): teste com duas crianças, tarefa escondida pelo tour, passos completos, verificação e destino dos tutoriais.
- [Revisão de roteiros, 20/09](REVISAO-ROTEIROS-2026-09-20.md): âncoras, rótulos reais, tempo para gestos, autoconferência e efeitos visíveis.
- [Review pedagógico do Farol, 03/10](qa/review-pedagogico-desafio-2026-10-03.md): continuidade entre projetos, critérios vinculados ao evento e ramo corretos, contextos e caderno.
- [Revisão do Farol, 04/10](qa/revisao-pedagogica-desafio-2026-10-04.md): comparação, memória observável, construção em duas etapas e diagnóstico da coleta; [registro da aplicação local](qa/revisao-desafio-2026-10-04/aplicacao.md).
- [Quizzes dos cursos curtos, 03/10](proposta-quizzes-cursos-curtos-2026-10-03.md): aplicação específica da revisão antes do certificado.
