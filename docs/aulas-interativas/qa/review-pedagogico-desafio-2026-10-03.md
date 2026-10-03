# Review pedagógico do Desafio do Primeiro Jogo

**Data:** 03/10/2026. **Escopo:** curso inteiro A Chave do Farol, da introdução ao certificado. A referência a “número 8” foi corrigida pelo usuário e não identifica uma aula.

## Parecer

A sequência de cinco aulas e nove seções faz sentido para esta versão: conhecer a aventura, construir movimento, guardar a coleta, decidir pela chave e compartilhar a conquista. Não encontrei justificativa para acrescentar outra aula, um tour obrigatório ou uma cena genérica de variável.

Havia problemas concretos na verificação do projeto e lacunas nas explicações. As correções deste review estão nos materiais locais: propostas, roteiros, gerador, manifestos, inventário de blocos e caderno. A estrutura foi mantida; a ligação entre o que se explica, o que a criança monta e o que se verifica ficou mais precisa.

Isso é um parecer de autoria e consistência técnica. Ainda não comprova que as crianças compreendem os conceitos ou conseguem concluir sem ajuda: é necessário observar um ensaio com o curso e as gravações revisadas.

## Base da revisão

- [Briefing pedagógico](../BRIEFING.md), [especificação dos roteiros](../ESPEC-ROTEIRO.md) e skill `aula-roteiro`.
- [Organização do curso](../modulos-desafio-primeiro-jogo.md), propostas, manifestos e roteiros das cinco aulas.
- Modelo atual do Cadê Todo Mundo e orientações explícitas do usuário: contexto antes da tarefa; ajuda de interface no Como Fazer; caderno fiel às aulas, sem mapa adicional.
- Código da paleta e valores iniciais dos blocos, progressão das seções, verificação do projeto, experiência `lighthouse-key`, materiais, publicação e certificado.
- [Gerador dos manifestos](gerar-desafio-farol.ts), [projetos de partida e conclusão](desafio-farol-projeto.ts), testes e [gerador do caderno](../recursos/desafio-farol/gerar-materiais.py).

Não foi necessária pesquisa externa para decidir se a autoria corresponde às diretrizes e ao funcionamento desta plataforma. As conclusões abaixo se apoiam nessas fontes locais, e não em uma alegação de eficácia pedagógica já medida.

## Achados e correções

### 1. A coleta podia ser aprovada com a memória no encontro errado

**Prioridade alta.** No Dia 2, a verificação aceitava um projeto que retirava a chave, mas só alterava `temChave` ao encostar no farol. O critério anterior conferia que a alteração estava em algum evento de encontro; não vinculava a ação ao encontro com a chave. A criança poderia receber aprovação para uma regra diferente da ensinada.

**Correção:** retirada da chave e alteração da memória precisam estar no corpo do encontro personagem/chave. O teste desloca a alteração para outro evento e verifica que a etapa não é aprovada. Esse caso falhou antes da correção e passou depois.

### 2. Os avisos ensinados e a localização das respostas não eram verificados suficientemente

**Prioridade alta.** Um projeto sem mensagem de coleta passava no Dia 2. No Dia 3, remover o aviso da resposta com chave ou o aviso da resposta sem chave também não impedia aprovação. No segundo caso, o ramo `senão` podia ficar vazio.

**Correção:** a coleta exige um aviso textual no encontro com a chave. A decisão exige os avisos nos respectivos ramos, dentro do encontro com o farol. Acender o farol e ativar a chegada do barco também ficam vinculados a `então`, na condição que consulta `temChave`.

Os testes reproduziram as três omissões antes da correção. Um teste positivo conserva a liberdade de escrever mensagens com palavras próprias: não se exige copiar literalmente o roteiro. A verificação confere a estrutura, não julga se o texto escrito pela criança comunica bem a situação. Por isso, o teste jogado continua necessário.

### 3. A explicação de variável e evento estava afastada do uso

**Prioridade média.** O Dia 2 concentrava explicações conceituais em um vídeo separado da montagem. Também tratava evento como uma instrução, definição que confundia o acontecimento com a resposta programada.

**Correção:** a primeira seção mostra somente o problema real: o personagem passa pela chave, mas não a recolhe. Na segunda, variável é explicada ao criar `temChave`; evento, ao programar o encontro. O acontecimento dispara as ações encaixadas no bloco.

Foi explicitado que **falso significa estar sem a chave**, e não que a criança errou. **Verdadeiro significa estar com ela.** A mensagem informa a coleta, enquanto `temChave` guarda o estado. Uma coisa não serve como prova automática da outra.

**Limite observado:** não há um monitor da variável nessa etapa. A criança vê a retirada da chave e a mensagem; no Dia 3, vê a consequência de conservar essa informação até chegar ao farol. A compreensão dessa permanência precisa entrar no ensaio infantil.

### 4. Alguns termos e encaixes dependiam de inferência da criança

**Prioridade média.** “Sprite” aparecia antes de sua explicação. A montagem da mensagem de vitória não descrevia completamente, na fala, a substituição do valor inicial pelo bloco de texto.

**Correção:** a definição curta de sprite aparece antes do primeiro uso no Dia 1. O Dia 2 explicita a troca do nome inicial `contador` por `temChave`, a área do evento e o significado dos valores. O Dia 3 nomeia o ramo, o campo e a substituição do número pelo texto do aviso. O caderno acompanha as mesmas instruções.

Os testes finais orientam reiniciar a partida, ir ao farol sem chave, recolher a chave em outra tentativa, afastar-se do ponto de coleta e voltar ao farol. Conferem mensagens, luz e chegada do barco, com orientações de correção relacionadas ao sintoma observado.

### 5. Faltava ajuda direta para o caderno, e uma ponte repetia a experiência

**Prioridade média.** Ao retirar o tour do leitor, a introdução ficava sem um link direto para consultar seus controles. No Dia 3, a fala de ponte repetia os comandos já presentes na atividade interativa.

**Correção:** a ajuda opcional da introdução inclui o tutorial de leitura e download dos materiais. O conjunto tem nove links para tutoriais existentes. A consulta não bloqueia a conclusão. A ponte do Dia 3 conecta a coleta à decisão; a própria experiência conserva a instrução dos botões e da ordem dos testes.

### 6. O inventário de blocos ainda descrevia o curso antigo de nave

**Prioridade média.** O arquivo atual `blocos-desafio-primeiro-jogo.json` não correspondia ao Farol, o que poderia orientar incorretamente uma nova edição ou conferência.

**Correção:** o gerador agora produz o inventário junto dos manifestos, a partir dos blocos disponíveis no Estúdio deste curso. Ele inclui os blocos preparados, não apenas os montados pelo aluno. O inventário histórico da nave permanece no acervo legado.

### 7. A documentação não registrava toda a justificativa pedagógica

**Prioridade menor.** As propostas não continham a triagem completa dos conceitos exigida pelo briefing. Dois trechos do briefing ainda diziam começar diretamente pela tarefa, em conflito com a orientação posterior do usuário sobre contexto inicial pertinente.

**Correção:** as cinco propostas registram triagem, diagnóstico, função de cada seção, experiências, gravações e continuidade. O briefing foi alinhado à orientação: situar brevemente o jogo ou o problema e encaminhar para a tarefa. A clarificação sobre o caderno também está registrada.

## Revisão das nove seções

| Aula e seção | Função pedagógica e decisão | Evidência ou cuidado necessário |
| --- | --- | --- |
| Introdução: A Chave do Farol | Apresentar o jogo e o barco que precisa chegar antes do convite para jogar. Manter. | A versão pronta exige participação, não vitória; fica fora da cadeia do projeto construído pelo aluno. Não gravar a partida resolvida. |
| Introdução: Seu Caderno do Aluno | Apresentar um apoio que acompanha a montagem. Manter curto e opcional. | Mostrar o PDF real, sem tour do leitor; não exigir download, impressão, preenchimento ou mapa adicional. |
| Dia 1: montagem do movimento e das bordas | Construir controles, movimento e limite no próprio jogo. Manter uma seção. | Explicar sprite antes do uso; preservar velocidade inicial 3; testar as direções e bordas antes de verificar e enviar. |
| Dia 2: Encostar ainda não é pegar | Tornar a falta de coleta observável. Manter como problema breve antes da ferramenta. | Mostrar a retomada real, sem simular defeito e sem antecipar a montagem completa. |
| Dia 2: Guarde que a chave foi encontrada | Construir memória, encontro e resposta no mesmo contexto. Manter. | Declaração falsa, coleta, memória verdadeira e aviso; conceitos explicados no momento do uso. |
| Dia 3: O que a porta precisa? | Comparar duas respostas para a mesma pergunta. Manter a experiência existente. | A cena exige testar a porta sem chave e com chave. Trocar o estado sozinho não conclui; não antecipar o resultado nem acrescentar pergunta redundante. |
| Dia 3: Faça a porta conferir a chave | Transferir a relação observada para os blocos do jogo. Manter. | Consultar `temChave`; montar `então` e `senão`; testar os dois caminhos em partidas reiniciadas. |
| Dia 3: Publique seu jogo | Dar destino real à criação. Manter após o envio. | Mesmo Estúdio e mesmo projeto; ensinar o fluxo até a confirmação. Publicar é a tarefa, mas não foi criado bloqueio técnico de conclusão por publicação. |
| Certificado: Comemore sua criação | Reconhecer o que a criança efetivamente programou. Manter. | Distinguir regras construídas de arte e movimento do barco preparados; preservar emissão e conclusão, sem pitch obrigatório para a criança. |

## Por que não acrescentar outras atividades agora

O movimento, a borda, a retirada da chave e a troca da imagem já podem ser observados no jogo que a criança está construindo. Outra demonstração repetiria esses efeitos. O conceito de condição já tem uma experiência pertinente, seguida de aplicação no projeto.

A cena genérica de variável trabalha pontuação numérica, incremento e exibição de placar. Colocá-la entre a chave e a porta acrescentaria outro problema para explicar uma memória de verdadeiro/falso. A decisão neste review foi aproximar a explicação da montagem e verificar a compreensão no ensaio. Se as crianças confundirem memória com mensagem, essa evidência pode justificar uma demonstração específica em uma próxima revisão.

O caderno conserva visão geral, navegação útil, montagem, testes, publicação, certificado e ajuda. “Mapa” continua podendo nomear o cenário do jogo; o que não existe é um material ou exercício separado de mapa que não acompanha as aulas.

## Validação executada

| Verificação | Resultado |
| --- | --- |
| Testes de manifestos e projeto | **20 passaram, 0 falharam, 238 verificações.** Incluem o jogo executado, estrutura, continuidade e os projetos incorretos descritos acima. |
| Reprodução antes das correções | Quatro casos de projeto incorreto eram aprovados; os testes os expuseram. O caso com mensagens próprias permaneceu válido. |
| Validador dos manifestos | Cinco válidos; nenhuma cena ausente, reprovação ou aviso de convenção. |
| Validador dos roteiros | Cinco roteiros, cobrindo nove vídeos, com tempo declarado. Ordem das seções e vídeos também conferida pelos testes. |
| Como Fazer | Lote de 42 tutoriais em cinco coleções válido. Os nove links usados pelo curso existem e são opcionais. |
| Biome | Dois arquivos TypeScript alterados aprovados. |
| Regeneração | Cinco manifestos e inventário regenerados sem alteração dos seis hashes. |
| Caderno | PDF de dez páginas regenerado, renderizado e inspecionado; texto dentro dos limites, sem sobreposições observadas. |

Comandos reproduzíveis estão na [organização do curso](../modulos-desafio-primeiro-jogo.md#verificações). O Bun emitiu o diagnóstico de ambiente `Cannot read file C:\Users\tocha\: EPERM` em parte dos comandos, que concluíram com código 0 e os resultados acima. O validador do Como Fazer mantém uma sugestão editorial preexistente de imagem em `plataforma-enviar-trabalho-da-galeria`, tutorial não utilizado aqui.

## Ensaio e produção ainda necessários

1. **Gravação:** gravar os nove vídeos com os roteiros atuais, sem acelerar a montagem para cumprir uma duração artificial. Conferir a legibilidade de nomes, menus e encaixes. Anexar o caderno antes de apresentá-lo.
2. **Ensaio do fluxo:** usar uma conta nova e outra com progresso; conferir retomada do trabalho da criança, retorno do Como Fazer na mesma aba, toque e teclado, tela estreita, verificação, envio, publicação e certificado já emitido.
3. **Ensaio de aprendizagem:** observar crianças iniciantes sem conduzir cada clique. Registrar onde pausam, voltam ao vídeo, consultam o caderno, pedem ajuda ou abandonam a tentativa. Separar dificuldade de interface de dificuldade de conceito.
4. **Compreensão da memória:** após a coleta, perguntar em conversa o que faz o jogo continuar sabendo da chave quando ela desaparece. Ver se a criança distingue `temChave` da mensagem, sem transformar a resposta em nova prova obrigatória na plataforma.
5. **Compreensão da condição:** pedir que explique o que espera ao ir ao farol com e sem chave e que localize a resposta correspondente nos blocos. Observar se consegue corrigir uma troca entre `então` e `senão`.
6. **Autonomia e autoria:** observar se o aluno retoma um encaixe pelo material, testa novamente após corrigir e reconhece quais regras montou. Publicar e conseguir abrir o próprio jogo são parte do ensaio, não prova de domínio de todos os conceitos.
7. **Aplicação no admin:** reconciliar vídeos, anexos, seções aposentadas e progresso antes de aplicar os manifestos. Não substituir mídia existente cegamente por `plannedVideo`.

Não houve importação no admin, gravação ou publicação nesta revisão. O [caderno atualizado](../../../output/pdf/desafio-farol-caderno.pdf) e as fontes locais estão prontos para a conferência editorial e a preparação dessas etapas.
