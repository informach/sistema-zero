# Revisão da proposta do quiz

Data: 01/10/2026. Escopo: perguntas, classificação, resultados, demonstrações, destino e validação. As correções foram aplicadas à **versão 2 da proposta**. Nenhuma página do app foi implementada nesta revisão.

## Conclusão da revisão

A direção de oferecer uma orientação útil e separar criança, responsável e condições práticas merece ser mantida. A versão anterior, porém, ainda tinha repetição, perda de informação e um desempate que contradizia essa direção. Também pedia à família que observasse uma atividade digital sem fornecer acesso a essa atividade.

A v2 passa a entregar uma experiência caseira executável pelo próprio texto e uma recomendação comercial com motivo explícito. Oito perguntas principais substituem as nove anteriores. Até três adicionais esclarecem prioridade e requisitos, mantendo o teto de onze. Essa redução do mínimo não comprova menor abandono; será preciso observar o percurso real.

## Problemas encontrados e correções aplicadas

| Impacto | Local/trecho da v1 | Problema e consequência | Correção na v2 |
| --- | --- | --- | --- |
| Alto | Lógica: QT incerta após divergência escolhia Q4 como principal. | A pessoa ainda não havia escolhido um vencedor, mas o sistema atribuía um. Isso prejudicava a explicação e contaminava dados sobre avatares. | Empate explícito mantém principal null e os dois objetivos. Resultado combina ambos; destino geral não é registrado como perfil A. |
| Alto | Q3: “mais de uma dessas possibilidades”. | Apagava justamente a combinação que o usuário queria reconhecer, como desenho e jogos. | Seleção múltipla com conjuntos reais e explicações para os três pares e os três interesses juntos. Ordem de clique não representa prioridade. |
| Alto | Q4/Q5 ofereciam somente quatro motivos ou incerteza. | Quem buscava outra coisa precisava se encaixar ou parecer indeciso. A coleta tenderia a confirmar artificialmente nossa própria segmentação. | Saída “o que procuro não aparece” separada de exploração. Resultado e registro próprios, sem inventar novo avatar. |
| Alto | Resultado: “execute o projeto” e “voltem à orientação”. | A família ainda não tinha projeto, aula ou acesso. A utilidade prometida dependia de algo que o quiz não entregava. | Quatro experiências concretas com papel/objetos, três passos e uma pergunta sobre o que acabou de ser feito. A ponte para o digital vem depois. |
| Alto | QB só para B; QC só para C. | Uma família D poderia exigir Roblox, ou uma A querer desenho sem jogos, e essas condições passariam despercebidas. | Ramificações consideram objetivos e interesses relatados, em qualquer perfil ou estado exploratório. |
| Médio | Q4, Q5 e QT decidiam motivos muito parecidos. | Repetição aumentava esforço e criava impressão de confirmação entre respostas do mesmo adulto. | Uma pergunta aceita até dois objetivos; outra só aparece para saber qual explorar primeiro. O antigo critério de continuidade sai. |
| Médio | Resultado A: “tempo de computador que já faz parte da rotina”. | A família poderia permitir telas, mas só dispor de celular/tablet. Era uma premissa não informada. | Usar tempo de tela permitido e conferir computador separadamente, antes da contratação. |
| Médio | Q8 antiga: aceitação, conhecer ou professor ao vivo. | Não reconhecia explicitamente quem prefere ao vivo, mas aceita conhecer o gravado. | Preferência e exigência têm respostas e tratamentos distintos. O texto explica pausa, repetição, horário e ajuda sem prometer atendimento imediato. |
| Médio | “Veja uma aula [...] na próxima página”. | Podia sugerir aula completa ou acesso experimental onde havia demonstrações por prints. | Informar que a pessoa verá as telas da aula, prática e ajuda. Nenhum acesso gratuito foi inventado. |
| Médio | Descrição do resultado podia somar muitos módulos repetidos. | Repetia ajuda, espera e equipamento, deixando a recomendação longa e burocrática. | Regras explícitas para combinar textos; requisitos importantes continuam visíveis. Incluídos exemplos completos de montagem. |
| Médio | Feedback “Em parte” sem caminho claro de correção. | Mediria insatisfação sem permitir consertar o entendimento. | Perguntar o que ajustar e voltar a interesses, objetivo ou apoio; a opinião isolada não recalcula o perfil. |
| Médio | Contrato técnico de respostas escalares. | A adoção de múltiplas escolhas exige mudança real de contrato e validação; não cabe numa reutilização automática do quiz atual. | Documentada a necessidade de conjuntos tipados, validação dos ramos ativos e versionamento. Sem alteração do app nesta etapa. |
| Baixo | Q7 antiga não admitia apoio que varia por atividade. | Um comportamento situacional poderia parecer uma característica fixa. | Acrescentada variação por tarefa e orientação para combinar tentativa, consulta e ajuda. |
| Baixo | Saída por idade podia soar como conclusão sobre capacidade. | O recorte comercial não mede habilidade individual. | Texto esclarece o alcance da orientação e permite conhecer a proposta de forma informativa. |

## Decisões preservadas

- Quatro motivos familiares e quatro páginas de oferta, sem rótulos de personalidade para a criança.
- Público da oferta de 9 a 14 anos, uma resposta por filho e demonstrações com os prints existentes.
- Separação entre gostar de jogar e querer criar jogos; entre desenhar e querer integrar o desenho a jogos.
- Aulas gravadas, apoio por mensagens, computador e liberações por progresso explicados com suas condições reais.
- Resultado sem exigir cadastro, caminhos diretos às ofertas preservados e nenhum parâmetro antigo do Desafio.
- Sem promessa de ganho cognitivo, duração de aprendizagem, autonomia garantida ou precisão científica do quiz.

## Alternativas consideradas nesta revisão

Manter duas perguntas muito parecidas e apenas suavizar a redação preservaria a redundância. Criar uma pontuação entre todas as respostas misturaria desejo adulto, comportamento infantil e requisito de equipamento. A opção escolhida é declarar objetivos, esclarecer prioridade quando necessário e usar as demais respostas para personalizar e conferir condições.

Seleção múltipla também tem limites: pode haver omissão ou marcação ampla demais. Por isso, Q3 preserva interesses sem usá-los como escala de intensidade; Q4 pede até dois objetivos, com instrução explícita. O [adendo metodológico](pesquisa-e-estrategia.md#decisões-metodológicas-da-revisão) registra a escolha e o contraponto das fontes. Não alegamos que múltipla escolha melhora a precisão por si só.

## Conferência realizada

A regra v2 foi simulada em JavaScript isolado, conforme as tabelas de [lógica e validação](logica-e-validacao.md). Não é código implantado nem teste da renderização do funil.

| Conferência | Resultado observado |
| --- | --- |
| Caminhos de motivação | 24: quatro escolhas únicas, seis pares com três respostas de prioridade cada, exploração e outra procura. |
| Interesses possíveis | 17 conjuntos válidos de Q3. |
| Motivos × observação × interesses | 3.264 combinações, preservando motivo e destino e verificando a ativação das perguntas adicionais. |
| Ordem de seleção | 3.264 inversões de conjuntos, sem mudança indevida no resultado. |
| Condições práticas | 7.680 combinações, preservando o motivo e classificando condições e pendências. |
| Casos dirigidos | 34 variações lógicas, incluindo campos ausentes, opções exclusivas misturadas, terceira prioridade inválida, ramos inativos e restrições fora de B/C. |
| Asserções da simulação | 35.003 verificações, sem falhas. O número descreve operações de conferência, não entrevistas ou precisão comercial. |

Os percursos artificiais produziram quatro principais de cada perfil e oito casos com principal null. A distribuição é consequência da enumeração, não estimativa de mercado. Os oito null são seis empates, exploração e outra procura. Encaminhá-los à página padrão não aumenta a contagem de A identificado.

O verificador mecânico de Light Copy passou nos dois arquivos públicos, sem ocorrências. A revisão editorial conferiu a coerência entre resposta, justificativa, atividade, condições e CTA. Os exemplos de resultado tornam essa montagem legível antes da implementação.

As condições de produto foram reconferidas nas ofertas locais, incluindo gravadas/Recados, requisitos de leitura e computador, entrada guiada, posto Construtor e distinção do Roblox. As páginas e recursos continuam sujeitos às verificações operacionais previstas para a implementação; texto e screenshot não substituem teste de uso.

## O que ainda precisa ser aprendido

Precisamos observar se a promessa desperta interesse, se a família entende as escolhas múltiplas e se consegue propor a atividade a partir do resultado. As brincadeiras podem ser simples para algumas crianças; o adulto deve poder ajustar o tema ou partir de um projeto existente, sem transformar idade em nível técnico.

Também será preciso medir a frequência real de empate e outra procura. Se forem recorrentes, isso pode indicar problema de redação ou insuficiência da segmentação. Não corrigir esse sinal forçando mais pessoas para A. A matriz de perfis continua aberta a evidência.

Não houve entrevistas próprias, implementação, teste de navegação ou experimento de conversão nesta revisão. O protocolo para essas etapas está documentado. A simulação aprova a consistência da regra proposta dentro dos cenários conferidos; não demonstra que ela encontra o público mais rentável.

## Leitura da versão corrigida

- [Visão geral](README.md).
- [Perguntas revisadas](../copy/quiz-comunidade.md).
- [Biblioteca dos resultados](../copy/resultados-quiz.md).
- [Exemplos completos de resultado](exemplos-de-resultado.md).
- [Regras, rotas, prints e protocolo](logica-e-validacao.md).
