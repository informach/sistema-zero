# Lógica, resultados, destinos e validação do quiz

Versão vigente: `comunidade-orientacao-v2`, revisada e implementada localmente em 01/10/2026. Ver [implementação e verificação](implementacao.md). Esta versão substitui a regra Q4/Q5/QT da v1. Os IDs devem sempre ser interpretados junto da versão: Q5–Q8 foram renumerados.

Textos públicos: [perguntas](../copy/quiz-comunidade.md) e [resultados](../copy/resultados-quiz.md). Fundamentos: [pesquisa](pesquisa-e-estrategia.md). Mudanças e problemas corrigidos: [revisão da proposta](revisao-proposta.md).

## 1. Significado do perfil

| Código | Motivo da família | Argumento de entrada |
| --- | --- | --- |
| A | Aprendizagem no tempo de tela permitido | Uma criação para acompanhar dentro dos combinados da rotina. |
| B | Criação dos próprios jogos | Começar por uma ideia pequena e conhecer como construí-la. |
| C | Expressão visual | Conhecer a ponte entre desenhos, personagens e jogos interativos. |
| D | Formação tecnológica complementar | Conhecer sequência, prática e acompanhamento da iniciação em programação. |

Os quatro perfis são motivações familiares, não tipos de criança. As páginas apresentam o mesmo produto. O quiz usa três registros separados: interesses relatados, prioridades do responsável e condições para participar.

Não calcular talento, personalidade, autonomia, estilo de aprendizagem, nível técnico ou porcentagem de compatibilidade. Uma resposta fornecida pelo adulto permanece relato do adulto. Não tratar ausência de marcação como rejeição a uma área.

## 2. Percurso mais curto e perguntas com função definida

Ordem: Q1 → Q2 → Q3 → Q4 → QT quando houver dois objetivos → Q5 → Q6 → Q7 → Q8 → QB quando pertinente → QC quando pertinente → resultado.

Oito perguntas principais, com até três adicionais. Percurso de oito a onze perguntas para a faixa da oferta. A v1 tinha nove perguntas principais e podia repetir a mesma decisão em Q4, Q5 e QT. A pergunta sobre critério de continuidade foi retirada; a versão atual pede os objetivos uma vez e só esclarece sua prioridade quando dois foram escolhidos.

| ID | Conteúdo | Formato | Efeito |
| --- | --- | --- | --- |
| Q1 | Faixa etária | Uma opção. | Confere o recorte 9–14. |
| Q2 | Atividade espontânea mais observada no último mês | Uma opção, com alternativas para variação e desconhecimento. | Contexto factual e identificação de temas a conferir em QB/QC. |
| Q3 | Vontades já expressas | Seleção múltipla. | Preserva combinações reais, escolhe contexto e também informa QB/QC. |
| Q4 | Objetivos mais importantes para a família | Um ou dois objetivos, ou uma saída exclusiva. | Define motivo ou candidatos. |
| QT | Qual dos dois objetivos explorar primeiro | Uma opção entre os dois, ou mesmo peso. | Escolhe prioridade sem presumir desempate. |
| Q5 | Principal dúvida de escolha | Uma opção. | Seleciona orientação útil ao adulto. |
| Q6 | Apoio procurado pela criança | Uma opção. | Orienta como acompanhar a primeira tentativa. |
| Q7 | Adequação do acompanhamento gravado com mensagens | Uma opção. | Distingue abertura, preferência e exigência de ao vivo. |
| Q8 | Computador disponível | Uma opção. | Orienta equipamento e organização. |
| QB | Exigência de ferramenta para jogos | Uma opção, se ativa. | Confere requisito que pode aparecer em qualquer perfil. |
| QC | Papel do desenho | Uma opção, se ativa. | Confere se a integração com jogos corresponde à procura. |

O quiz identifica o Sistema Zero e sua proposta. Q7 explica o funcionamento antes de pedir a avaliação da família. O resultado é entregue na tela, sem exigir nome, telefone ou e-mail. Não prometer duração em minutos antes de medir.

## 3. IDs e valores válidos

Os textos e a ordem editorial estão no arquivo de perguntas. IDs são independentes da posição visual.

| Pergunta | Respostas |
| --- | --- |
| Q1 | `ate_8`, `9_a_11`, `12_a_14`, `15_mais` |
| Q2 | `jogar`, `desenhar`, `criar_jogo`, `investigar_programas`, `videos`, `outra`, `variado`, `nao_sei` |
| Q3 | Conjunto de `jogo`, `visual`, `programacao`, `outro`; ou somente `nao_expressou`; ou somente `nao_sei`. |
| Q4 | Conjunto de um ou dois valores de A/B/C/D; ou somente `outro`; ou somente `explorar`. |
| QT | Um dos dois objetivos de Q4; ou `iguais`. |
| Q5 | `interesse`, `comeco`, `ajuda`, `aprendizagem`, `rotina`, `investimento`, `sem_duvida` |
| Q6 | `rever`, `pessoa`, `experimentar`, `varia`, `nao_observou` |
| Q7 | `pode_funcionar`, `prefere_ao_vivo`, `conhecer`, `exige_ao_vivo` |
| Q8 | `disponivel`, `organizar`, `celular_tablet`, `verificar` |
| QB | `roblox`, `minecraft`, `outra_especifica`, `flexivel`, `conversar` |
| QC | `interativo`, `sem_jogos`, `ver_exemplo`, `nao_condiciona` |

Q3 aceita os quatro interesses positivos juntos. Q4 limita-se aos dois objetivos mais importantes, conforme instrução visível. Essa diferença precisa ser clara na interface.

Não permitir conjunto vazio, IDs desconhecidos, duplicações ou mistura de saída exclusiva com outros valores. Q3 admite 17 conjuntos válidos; Q4 admite 12. A ordem de seleção não expressa prioridade. Campo ausente é incompleto, não desconhecimento.

## 4. Decisão do motivo e do destino

| Q4 | QT | Perfil principal | Estado | Destino |
| --- | --- | --- | --- | --- |
| Um objetivo A/B/C/D | Inativa. | O objetivo declarado. | `prioridade_declarada` | Página desse perfil. |
| Dois objetivos | Um dos dois. | QT. | `prioridade_esclarecida` | Página desse perfil. |
| Dois objetivos | `iguais`. | null. | `misto_sem_prioridade` | Página padrão, com apresentação geral. |
| Somente `explorar` | Inativa. | null. | `exploratorio` | Página padrão, para exploração. |
| Somente `outro` | Inativa. | null. | `fora_das_opcoes` | Página padrão, para conferência da proposta. |
| Resposta ausente ou inválida | Inclusive QT obrigatória ausente. | Não calcular. | `incompleto` | Retomar a pergunta aplicável. |

QT exibe **apenas os dois objetivos escolhidos e “os dois têm o mesmo peso”**. O botão de rever volta a Q4; não adiciona opções escondidas a um segundo seletor. Se a família mudar os objetivos, QT é invalidada.

Os campos da copy são preenchidos por esta lista fechada, sem texto livre. Para QT, usar inicial maiúscula; na frase de objetivo complementar, inicial minúscula. A ordem de apresentação acompanha a ordem visual das opções de Q4, nunca vira evidência de prioridade.

| Código | Nome público do objetivo |
| --- | --- |
| A | aprendizagem no tempo de tela combinado |
| B | criação dos próprios jogos |
| C | desenho em novas criações |
| D | uma sequência de iniciação em programação |

Na pergunta, preencher primeiro_objetivo e segundo_objetivo com os dois escolhidos. No resultado de prioridade definida, preencher objetivo_complementar com o outro selecionado. Omitir o bloco inteiro quando só houver um objetivo. Não publicar chaves de template nem mostrar as quatro alternativas em QT.

Para dois objetivos com prioridade, o outro é registrado como complementar. Para empate, os dois ficam em `objetivos_declarados`, sem inventar principal ou secundário. Para exploração e outro objetivo, não registrar A como perfil. Guardar separadamente `perfil_principal`, `estado` e `destino_oferta`.

A página padrão como destino desses estados é uma política de navegação. O resultado explica a incerteza ou a combinação. Não apresenta a família como avatar A identificado. Um clique também não transforma o estado em classificação confirmada.

Q2/Q3 personalizam o contexto e acionam qualificações, mas não substituem a prioridade do responsável. Q5–Q8 e QB/QC não alteram o perfil para tentar adequar a família ao produto.

## 5. Interesses combinados e explicação fiel

Usar o bloco público **O que pesou na sugestão** do perfil escolhido. Em seguida, selecionar o contexto de Q3:

- Apenas um interesse conhecido: frase correspondente.
- Dois entre jogo, visual e programação: bloco específico do par.
- Os três: bloco dos três interesses.
- `outro` junto de algum interesse conhecido: acrescentar a frase de outro tipo de criação, sem nomear a área.
- Somente `outro`: usar apenas essa frase e ouvir como a criança descreveria a ideia.
- `nao_expressou` ou `nao_sei`: bloco correspondente. Eles não afirmam desinteresse definitivo.

Q2 permite uma frase factual sobre o mês observado. Dizer, por exemplo, “No último mês, você observou que ele procurou desenhar com mais frequência”. Não converter “jogar” em “quer criar jogos”, nem “investigar programas” em “quer estudar programação”. Para vídeos, outra atividade, variação e desconhecimento, não inventar área criativa.

Quando Q2=`criar_jogo`, usar também o convite a conversar sobre um projeto atual, se existir. Isso não pressupõe experiência avançada e não dispensa a entrada da Comunidade. Nos demais casos, omitir essa adaptação.

Se Q2 e Q3 trouxerem temas diferentes, podem coexistir. Comportamento mais frequente e vontade expressa não são a mesma pergunta. Não exigir que se confirmem.

Preservar o segundo objetivo de Q4 no resultado: acrescentar a frase “Você também marcou...” com seu nome público, usando a opção correspondente de QT. Não substituir o nome por “outro objetivo” quando já sabemos qual é. Seleção múltipla não cria ranking entre interesses; não escolher o primeiro clique como o mais forte.

## 6. Qualificações atravessam os quatro perfis

**QB fica ativa se:** B estiver entre os objetivos de Q4; ou Q3 contiver jogo; ou Q2 for criar_jogo.

**QC fica ativa se:** C estiver entre os objetivos de Q4; ou Q3 contiver visual; ou Q2 for desenhar.

As regras valem inclusive nos estados misto, exploratório ou fora das opções. As duas perguntas podem aparecer na mesma sessão. Gostar apenas de jogar em Q2, sem os demais sinais, não basta para acionar QB. As qualificações perguntam sobre a procura, não declaram que o produto já serve.

| Resposta | Estado de adequação | Ação |
| --- | --- | --- |
| QB Roblox ou Minecraft indispensável | Condição não atendida. | Explicar que os cursos/ferramentas são outros. |
| QB outra ferramenta específica | Precisa conferir. | A ferramenta não foi identificada; não afirmar correspondência nem incompatibilidade comprovada. |
| QB conversar | Precisa conferir. | Conversar com o filho sobre a ferramenta e o que quer criar. |
| QC sem jogos | Condição não atendida. | Explicar que a expressão visual da Comunidade se integra a jogos. |
| QC ver exemplo | Precisa conferir. | Mostrar a integração e seus requisitos. |
| QC não condiciona | Não cria restrição. | O interesse visual não determina a escolha da atividade. |
| Q7 exige ao vivo | Condição não atendida. | Informar que o formato não cumpre essa exigência. |
| Q7 prefere ao vivo ou conhecer | Precisa conferir. | Explicar vantagens e funcionamento, sem tratar preferência como rejeição. |
| Q8 celular/tablet | Condição não atendida. | Resolver acesso a computador antes de contratar. |
| Q8 organizar/verificar | Precisa conferir. | Organizar ou confirmar disponibilidade. |

Agregação: se houver condição não atendida, `condicao_nao_atendida`; caso contrário, se houver pendência, `precisa_conferir`; caso contrário, `sem_incompatibilidade_declarada`. Não chamar este último de “apto” ou “encaixe confirmado”: leitura, uso efetivo e apoio necessário não foram avaliados.

Condições não atendidas aparecem abertas perto do início, antes da ponte comercial. Se houver várias, mostrar todas. Para outra ferramenta específica, mostrar a pendência antes do botão. Nunca ocultar requisito para limitar tamanho do resultado.

Esses módulos valem para qualquer perfil. Exemplo: família D com filho interessado em criar jogos e Roblox indispensável continua D, mas vê essa diferença. Se também exigir ao vivo, ambas permanecem visíveis.

Na presença de condição não atendida, manter a atividade caseira como sugestão e substituir o bloco comercial do perfil pelo aviso pertinente e pelos requisitos comuns. Não apresentar a plataforma como solução comprovada daquela condição. Usar CTA neutro, conservando o destino original.

## 7. Resultado útil antes da oferta

Os textos formam uma biblioteca condicional. Não concatenar todos os blocos.

Os [exemplos completos](exemplos-de-resultado.md) demonstram uma montagem com interesses combinados e outra com empate e requisito não atendido. Títulos como “Resultado A” e nomes técnicos de módulos são identificadores editoriais; a interface publica apenas o título dirigido à família e o texto escolhido.

### Prioridade definida

1. Título do perfil, introdução breve e condição não atendida, se houver.
2. Explicação da prioridade, contexto Q3 e segundo objetivo conhecido, se existir.
3. Experiência completa de três passos e pergunta de observação.
4. Adaptação para projeto atual, quando Q2 indicar tentativa de criação.
5. Uma orientação de apoio Q6 e resposta à dúvida Q5, sem repetir explicações.
6. Demonstração e ponte para a Comunidade, condicionadas à adequação.
7. Formato, equipamento, requisitos comuns e CTA. Conservar os fatos essenciais, podendo combinar textos repetidos.
8. Reconhecimento opcional e caminhos de revisão.

As atividades propostas usam papel e objetos simples. Não dependem de cadastro, aula grátis, plataforma paga ou saber programar. São convites para conversar e experimentar, não avaliações de conhecimento. Um responsável pode usá-las em qualquer idade do recorte e ajustar a complexidade ao interesse observado; idade não define nível técnico.

### Dois objetivos com o mesmo peso

Usar título/abertura de empate e a justificativa específica do par. Reaproveitar somente a atividade e a pergunta de observação da tabela abaixo, nunca “O que pesou” de um perfil que não foi escolhido.

| Par sem ordem | Atividade reaproveitada | Demonstração |
| --- | --- | --- |
| A+B | Regra de jogo, de B. | B. |
| A+C | Personagem em dois momentos, de C. | C. |
| A+D | Instruções na grade, de D. | D. |
| B+C | Personagem em dois momentos, de C. | C. |
| B+D | Regra de jogo, de B. | B. |
| C+D | Personagem em dois momentos, de C. | C. |

A escolha da atividade não estabelece perfil dominante. Acrescentar contexto Q3, apoio, dúvida e condições pelo mesmo critério dos resultados principais. A ponte comercial usa a legenda da demonstração e os requisitos comuns; não reutiliza uma justificativa de prioridade. CTA: **Conhecer a proposta completa da Comunidade**, para a página padrão.

### Procura aberta ou fora das opções

Usar os textos próprios, com suas atividades independentes da plataforma. Não inserir justificativa A. Q3 e Q2 podem contextualizar a conversa. Apoio, dúvida e condições continuam aplicáveis. A demonstração geral A é facultativa em “fora das opções” e não comprova adequação à procura desconhecida.

### Redução de repetição e condições de leitura

- Se Q5=ajuda e Q6=pessoa, usar o bloco de apoio a quem procura uma pessoa e acrescentar somente a informação de espera, se ainda não apareceu.
- Q5=rotina e Q8=organizar: combinar horário, acesso ao computador e salvamento num único trecho.
- Q5=sem_duvida: omitir a dúvida principal.
- Q7=pode_funcionar: incorporar seu conteúdo aos requisitos comuns se o formato já foi explicado.
- Q8=disponivel: não criar um parágrafo adicional de equipamento.
- Q3 com um interesse que repete o foco do resultado: incorporar o relato à justificativa, em vez de repetir dois parágrafos iguais. Combinações e informação desconhecida continuam visíveis.
- Requisitos comuns podem ser distribuídos no texto. Devem estar presentes antes do CTA: leitura, computador/internet/mouse/teclado, aulas gravadas, mensagens com possível espera e liberações por progresso.
- Quando B/C explicar o uso livre, manter curso obrigatório, publicação exigida e posto Construtor. Não sugerir que a criação livre da demonstração está disponível imediatamente.
- Não anunciar preços fixos, aula experimental gratuita, vídeo completo de aula ou liberação imediata. As ofertas atuais têm prints; “ver as telas da aula” é diferente de assistir à aula.
- Priorizar atividade, justificativa e demonstração na leitura. Orientações complementares podem ficar em “Para organizar o começo”, com títulos concretos. Condições não atendidas permanecem abertas.
- Não inventar rótulos psicológicos, urgência ou falsa análise por IA.

### Feedback que permite corrigir

“Sim”, “Em parte” e “Não representa” são respostas opcionais de reconhecimento, não alteram o perfil sozinhas. Nas duas últimas, oferecer os caminhos da copy: interesses (Q2/Q3), objetivo (Q4/QT), apoio (Q6/Q7) ou apenas registrar a opinião. O botão de rever todas as respostas permanece disponível para idade, dúvida e equipamento.

Mostrar “Sua opinião foi registrada” somente após confirmação real de salvamento. Se falhar, informar a falha e permitir tentar novamente. Reconhecimento não confirma validade científica nem satisfação com a plataforma.

## 8. Prints, prova e destinos

Manter design e identidade das ofertas atuais. Usar os arquivos em `packages/funnel/public/img/comunidade-dos-criadores/`, incluindo versões @2x quando apropriado.

| Demonstração | Arquivos | Legenda | Limite da prova |
| --- | --- | --- | --- |
| A | tela-aula-estudio.webp | A orientação e a área de criação aparecem na mesma atividade. A criança pode consultar o passo enquanto trabalha. | Interface; não comprova aprendizagem individual. |
| B | tela-regra-desligada.webp; tela-regra-ligada.webp | Compare o exemplo com a regra desligada e ligada. A mudança mostra o efeito do comando nesta demonstração. | Exemplo da equipe; não atribuir resultado a aluno. |
| C | tela-pinta.webp; tela-trazer-do-pinta.webp; tela-materiais.webp | O Pinta é o espaço de criação visual. No Estúdio, o caminho para trazer uma arte permite usá-la no projeto. | Interfaces; não declarar que uma mesma criança executou a sequência nem conversão automática em jogo. |
| D | tela-aprendizagem.webp; tela-jornada.webp | Os registros da atividade e a Jornada ajudam a localizar o percurso. Converse também com seu filho sobre o que ele fez. | Registro e progressão; não prova domínio ou catálogo futuro publicado. |

Uma demonstração central, com sequência quando pertinente. Na implementação, conferir recortes, alt text e legibilidade no celular. Prints existentes não garantem disponibilidade operacional de todos os recursos em qualquer etapa.

| Perfil/estado | Botão normal | Caminho |
| --- | --- | --- |
| A | Ver a proposta para aprender criando no tempo de tela | /kids/comunidade-dos-criadores/oferta |
| B | Ver como funciona a criação de jogos na Comunidade | /kids/comunidade-dos-criadores/oferta/criacao-de-jogos |
| C | Ver como desenho e jogos se encontram na Comunidade | /kids/comunidade-dos-criadores/oferta/expressao-visual |
| D | Conhecer o percurso de aprendizagem da Comunidade | /kids/comunidade-dos-criadores/oferta/formacao-tecnologica |
| Misto sem prioridade | Conhecer a proposta completa da Comunidade | /kids/comunidade-dos-criadores/oferta |
| Exploratório | Conhecer a proposta da Comunidade | /kids/comunidade-dos-criadores/oferta |
| Fora das opções | Conhecer a proposta e conferir o que ela oferece | /kids/comunidade-dos-criadores/oferta |
| Idade fora do recorte, acesso informativo | Conhecer a proposta para 9 a 14 anos | /kids/comunidade-dos-criadores/oferta |

Com condição não atendida, trocar o texto por **Conhecer a proposta e conferir seus requisitos**, sem alterar a rota. Usar o domínio do ambiente atual. Não incluir respostas na URL, não substituir as rotas por ?perfil=, não reintroduzir origem=desafio.

A página /oferta/continuar atende relacionamento anterior com o produto e não é saída de avatar. O quiz não faz redirecionamento automático nem impede acesso direto às ofertas.

## 9. Implementação posterior: implicações reais

Rotas previstas: /kids/comunidade-dos-criadores/quiz e /kids/comunidade-dos-criadores/resultado. Na versão local consultada, quiz e resultado estão desativados na Comunidade. Esta revisão é documental.

Fontes: `packages/funnel/src/funnels/comunidade-dos-criadores/index.ts`, `packages/funnel/src/funnels/registry.ts`, `packages/funnel/src/content/quiz-config.ts`, `packages/funnel/src/pages/[audience]/[produto]/resultado.astro` e `packages/funnel/src/funnels/comunidade-dos-criadores/oferta/index.ts`.

| Estado atual observado | Necessidade desta proposta |
| --- | --- |
| QuizAnswers admite string ou number por chave. | Modelar Q3/Q4 como conjuntos validados. Não concatenar opções em strings improvisadas; alterar contrato/serialização/schema com escopo compatível e conferir consumidores. |
| Etapas atuais não declaram ramificação. | Representar QT/QB/QC, com validação do caminho ativo no cliente e servidor. |
| isQuizComplete usa etapas configuradas. | Validar campos ativos, ignorar inativos e não transformar ausência em resposta negativa. |
| Resultado pode priorizar perfil persistido. | Versionar e recalcular após edições; não reutilizar classificação v1 como v2. |
| Resultado compartilhado usa ?perfil=. | Aplicar mapa explícito para esta Comunidade e preservar o Desafio. |
| Resultado depende da sessão do funil. | Permitir identificação técnica sem barreira de cadastro para revelar a orientação. |

IDs A/B/C/D são da proposta. Na implementação, mapear explicitamente para tempo-de-tela, criacao-de-jogos, expressao-visual e formacao-tecnologica. Não passar A/B/C/D diretamente ao helper existente.

Navegação e persistência:

- Nenhuma alternativa pré-selecionada. Uma decisão por tela, seleção múltipla apenas onde indicada. Explicar opções exclusivas e limites.
- Alternar a ordem das opções nominais pertinentes e preservá-la ao voltar. Faixas etárias mantêm ordem; alternativas de desconhecimento/outra procura ficam no fim. QT não usa posição como prioridade.
- Alterar Q4 invalida QT. Alterar Q2/Q3/Q4 recalcula a ativação de QB/QC: apagar resposta quando o ramo se torna inativo, exigir resposta quando volta a ficar ativo. Manter uma resposta de qualificação válida se a pergunta continuar ativa.
- Alterar QT não muda as condições de ativação QB/QC, que dependem do conjunto de objetivos, não só do principal.
- Qualquer edição recalcula resultado, condições e link. Mudar Q1 para fora do recorte invalida o resultado e leva à mensagem própria.
- Exigir todos os campos ativos. Não completar por tempo de espera, fallback de rede ou respostas de sessão anterior.
- Mostrar progresso por etapas: Sobre seu filho / O que vocês procuram / Como funcionaria. Não anunciar um total fixo que muda silenciosamente.
- Controles acessíveis por teclado, mensagens junto ao campo e foco previsível. Ao selecionar opção exclusiva, informar que ela substitui as outras.
- Novo filho inicia um conjunto separado de respostas. Tratar retorno/atualização de página sem misturar irmãos.
- Dados mínimos, sem nome, escola, renda, diagnóstico ou texto livre sobre a criança. Definir retenção antes de lançar e separar abandono de incompatibilidade.
- Não preservar dados sensíveis em URL ou eventos genéricos. Instrumentar somente categorias necessárias, versão e identificador técnico mínimo.
- Conferir novamente o código antes de implementar; há trabalho paralelo nas ofertas.

## 10. Casos de aceitação

São cenários artificiais, não famílias entrevistadas. Considerar demais respostas válidas, computador disponível e formato possível, salvo indicação.

| Caso | Entrada relevante | Resultado esperado |
| --- | --- | --- |
| 1 | Q2 jogar, Q3 não sei, Q4 A. | A; não afirmar vontade de criar jogos. QB inativa. |
| 2 | Q3 jogo, Q4 B, QB flexível. | B com atividade de regra de jogo. |
| 3 | Q3 visual, Q4 C, QC interativo. | C com personagem em dois momentos. |
| 4 | Q3 jogo+visual, Q4 D. | D, preservar ambos os interesses; QB e QC ativas. |
| 5 | Q4 A+B, QT B. | B principal, A complementar. |
| 6 | Q4 C+D, QT iguais. | Perfil null; atividade do par, destino geral A; não registrar C nem D dominante. |
| 7 | Inverter ordem de A+B e repetir QT B. | Mesmo principal, complementar e destino. |
| 8 | Q4 explorar, Q3 jogo+visual. | Perfil null, interesses preservados, QB/QC ativas. |
| 9 | Q4 outro. | Fora das opções; não traduzir em A ou em desconhecimento. |
| 10 | Q4 A+B, QT D. | Inválido: D não está entre as opções ativas. |
| 11 | Q4 D, Q3 jogo, QB Roblox. | D com condição não atendida e CTA neutro para D. |
| 12 | Q4 A, Q2 desenhar, QC sem jogos. | A com diferença visual explícita. |
| 13 | Q7 prefere ao vivo. | Precisa conferir; não marcar condição não atendida. |
| 14 | Q7 exige ao vivo. | Condição não atendida, explicar diferença. |
| 15 | Q8 celular/tablet. | Resolver computador; não pressupor que já usava computador. |
| 16 | Q1 até 8 ou 15+. | Sem perfil; orientação de faixa, não inferência sobre capacidade. |
| 17 | Q3 não expressou, Q4 B. | B como motivo adulto e convite sem atribuir desejo à criança. |
| 18 | QB Minecraft, QC sem jogos, Q7 exige ao vivo, Q8 celular/tablet. | Mostrar quatro condições; nenhuma oculta pelo limite de texto. |
| 19 | QB outra específica. | Pendência a conferir, sem alegar ferramenta identificada. |
| 20 | Q3 vazio, desconhecido+visual ou Q4 com três objetivos. | Inválido, sem resultado presumido. |
| 21 | Falta QT, QB ou QC ativa. | Incompleto; perguntar o campo faltante. |
| 22 | Respostas antigas em QT/QB/QC agora inativas. | Não interferem no resultado; devem ser limpas na edição. |
| 23 | Q3 jogo+visual+programação+outro. | Preservar conjunto, sem escolher primeiro clique como maior interesse. |
| 24 | Q2 criar_jogo. | QB ativa e adaptação para conversar sobre projeto atual, sem afirmar nível avançado. |
| 25 | Feedback “não representa”. | Não mudar perfil automaticamente; oferecer revisão das respostas. |
| 26 | Q4 outro ou explorar com Q7 exige ao vivo. | Perfil null e condição não atendida; não alegar prioridade A. |
| 27 | Todos os seis pares em empate. | Usar atividade do par e CTA geral, sem justificativa de prioridade individual. |
| 28 | Q4 apenas A com QT antigo B. | A por declaração; QT inativa ignorada. |

### Evidência de conferência

A simulação v1 não verifica esta revisão. A conferência v2 enumerou 24 caminhos de motivo, cruzou oito respostas Q2 com 17 conjuntos Q3, inverteu a ordem dos conjuntos e verificou ramificações e condições fora de B/C. Foram 3.264 combinações de interesses, 3.264 inversões, 7.680 combinações de condições e 34 casos dirigidos, sem falhas nas asserções executadas. O [registro da revisão](revisao-proposta.md#conferência-realizada) detalha o alcance. Simulação de decisão não comprova renderização, persistência ou conversão.

## 11. Validação com responsáveis

Primeira etapa proposta: duas rodadas qualitativas de seis a oito responsáveis, revisando entre elas. É uma escolha operacional para descobrir problemas, não tamanho de amostra que garanta validade ou represente a população.

Incluir famílias com interesses combinados, criança que só quer jogar, vontade de outra criação, procura ainda aberta, preferência por ao vivo, exigência de ao vivo e computador compartilhado. Buscar também pessoas fora do grupo de testadores gratuitos. Não explicar os quatro perfis antes do exercício.

Observar e depois perguntar:

1. O que esperava receber na abertura?
2. Em que situação pensou para responder sobre o que observa e o que a criança comentou?
3. A seleção múltipla e o limite de dois objetivos ficaram claros?
4. Encontrou o que procura entre as alternativas? O que faltou?
5. Consegue fazer a atividade do resultado usando apenas suas instruções?
6. Que parte parece representar sua família e que parte parece presumir algo?
7. O que entendeu sobre as aulas, a ajuda, o computador e a liberação das ferramentas?
8. O que espera encontrar no botão da oferta?
9. Quando há empate, sentiu que os dois motivos permaneceram representados?
10. A criança reconhece o interesse que o adulto relatou, numa conversa posterior?

Não tratar pouca participação na brincadeira como diagnóstico de adequação ao formato digital. Não confundir gosto pelo resultado com intenção de compra.

No tráfego real, acompanhar conclusão, tempo, abandono por pergunta/ramo, objetivos declarados, interesses, estado, adequação, revisão e clique. Separar perfil null de A nos relatórios; distinguir “outro objetivo” de exploração. “Faz sentido” é reconhecimento do texto, não prova de aprendizagem.

Medir também utilidade: depois de ler, o adulto sabe o que poderia experimentar e o que observar? Conversão sozinha pode esconder confusão. Conforme surgirem compradores, relacionar entrada, contratação e experiência inicial sem declarar causalidade pela simples correlação.

Depois de corrigir problemas de compreensão, comparar quiz opcional e chegada direta em tráfego comparável. Com volume suficiente, avaliar oferta recomendada versus padrão entre famílias elegíveis. Definir métrica, janela e amostra antes; não estimar ganho agora. As quatro motivações continuam hipóteses comerciais até haver evidência de compra e uso.
