# Parecer sobre o remoto e os objetivos do Estúdio

**Recomendação: adotar o modelo único de objetivos por parte, com conclusão e XP decididos pelo servidor, corrigindo as falhas encontradas e preservando o feedback imediato do editor.** A recomendação é arquitetural e pedagógica; ainda não é uma comprovação de melhor aprendizagem ou de desempenho em uma turma.

A comparação inicial usa os commits `5fcb90157f1901ad7e9f985ee329c378a278d661` e `4be50bbcafa73296164b4934540312825ed06bb1`. As quatro frentes inventariaram os 1.109 caminhos alterados: Molda (204), comunidades e hosts (521), objetivos e infraestrutura relacionada (303), restante (81). Priorizamos a leitura completa das implementações centrais; arquivos menores, documentos e artefatos receberam triagem proporcional. A verificação estrutural dos PNGs não equivale a avaliar seus pixels. Os inventários, hashes, provas e limites de leitura estão nos relatórios locais `staging-review-20261018-*.{md,json}`. Os avanços posteriores até `a1e1829431ae098f19ea77d023bd5d139d5653ab` também foram lidos, revisados e integrados, com recibos separados de preservação do trabalho local.

Um novo fetch encontrou três branches de diagnóstico do Molda. Os deltas próprios foram revisados: consultas de estado de deploy, exposição de stdout de startup e CI temporário. Na branch mais recente, os arquivos de produto Kids e banco já são idênticos ao staging atual; a documentação é anterior aos dois últimos achados preservados. Não há nova implementação de Molda a integrar. Mesclar os workflows de diagnóstico substituiria os gates normais, portanto essas branches permanecem separadas. O relatório local `staging-molda-diagnostic-branches-review.md` registra referências e limites; nenhuma operação remota foi acionada.

## Por que a mudança faz sentido

Antes havia duas formas de avaliar o Estúdio: a atividade do bloco, com nota, pesos e resultados parcialmente reportados pelo navegador; e os critérios de conclusão da parte. A nova lista reúne a tarefa, o resultado e a progressão no mesmo lugar. O aluno vê o que precisa fazer, verifica e recebe uma dica quando faltar. Os desafios extras não bloqueiam a sequência. O servidor aplica a mesma regra para registrar conclusão e deduplicar os prêmios. Isso reduz a chance de o editor mostrar aprovação enquanto a aula usa outro critério.

A autocorreção continua existindo: mudou sua organização e quem tem autoridade para confirmar o resultado. O feedback de edição, sintaxe e execução do próprio jogo deve continuar imediato. Não há razão para abrir um navegador no servidor só para verificar um bloco ou uma ideia de programação; esse caminho fica reservado ao comportamento e às respostas de funções.

Uma regra precisa demonstrar a habilidade ensinada. Acrescentar uma função ao modelo e corrigir uma função existente são tarefas diferentes. A contagem de ideias acrescentadas ao inicial atende à primeira; para a segunda, a resposta da função ou o comportamento observável é mais adequado. Não recomendo introduzir uma opção genérica de “presença” sem exemplos concretos de aulas que precisem dela: isso pode permitir que o projeto inicial já cumpra o objetivo.

## O que precisou de correção

| Problema comprovado | Consequência | Correção no trabalho local |
| --- | --- | --- |
| Listas, objetos e console eram cortados durante a observação | Uma comparação podia aprovar ou reprovar dados incompletos | Transporte explícito de valores completos, com limites; observação incompleta vira erro do executor |
| Identidade do aluno adulto confundida com namespace local no Pro | Missões e execução recebiam a identidade de armazenamento | Identidade real e namespace separados no cliente e no carregador |
| Espera do parser continuava depois de retirar o editor | A tela abandonada podia iniciar uma verificação | Owner, sinal e identidade do handle conferidos antes e depois das esperas e antes do POST |
| Orçamento de análise encerrava a leitura silenciosamente | Ausência inferida de código não analisado era gravada como reprovação | Erro de análise inconclusiva; não grava objetivos, evidência ou XP |
| Tolerância numérica aceitava infinito como resposta finita | Função ou valor incorreto podia cumprir o objetivo | Tolerância apenas entre números finitos; igualdade estrita preservada nos outros casos |

A revisão independente encontrou ainda uma janela do primeiro problema: o console podia exceder o limite durante a espera pela captura do estado. A reprodução falhou no Chrome antes da correção e passou depois. Esse caso está no teste permanente, junto da distinção entre erro do programa do aluno e falha de observação.

Os onze achados dos cinco rounds foram resolvidos após os gates da conciliação e revisão independente. Isso aprova o checkpoint intermediário; os percursos completos de Python continuam com qualificação própria pendente.

## Gabarito e publicação

O código atual exige gabarito quando há objetivos de execução e confere sua estrutura durante a publicação. Ele não executa o jogo nessa operação e não exige comprovação persistida de “Testar agora”. Os textos do Admin e dos documentos foram ajustados para não prometer essa garantia inexistente. A equipe ainda precisa conferir os testes de execução antes de publicar.

Para tornar essa garantia obrigatória, recomendo uma etapa própria: guardar uma evidência de teste vinculada aos hashes das regras, inicial, gabarito, ambiente/modelo e versão do avaliador. Publicar conferiria a evidência vigente sem chamar o executor naquele instante. Mudança em qualquer entrada invalidaria a evidência; erro, análise incompleta ou resultado parcial não gerariam comprovação. Essa etapa ainda não foi implementada e não deve aparecer como proteção já disponível.

## Conciliação com Python, adulto e Molda

Python usa a mesma lista de objetivos, obrigatórios, extras, memória por revisão e progressão. A inspeção estrutural continua autorizada pelo servidor e vinculada à aula, ao projeto inicial admitido e, na sala ao vivo, ao workspace e à geração de escrita. A simulação da autoria é formativa e não concede conclusão nem XP. A entrega ao professor guarda projeto e recado; não recupera a antiga nota do bloco.

O remoto centralizou os editores em `member-shell` e adicionou políticas próprias para a comunidade adulta. A implementação Python precisa acompanhar essa centralização. Trocar apenas a palavra “kids” no navegador não autoriza um aluno adulto: audiência, conta e acesso precisam vir das bordas autenticadas e das políticas do servidor. Essa conciliação está incorporada ao checkpoint, com identidade e autorização separadas e provas específicas; a qualificação dos percursos completos continua nos lotes Python.

As mudanças de Molda revisadas não mostraram um defeito novo confirmado. Devem ser preservadas e revalidadas nos consumidores JavaScript. Turtle continua integrando imagens do Pinta; o consumo de modelos do Molda por Python pertence à futura extensão 3D, não a uma conversão improvisada de assets para Turtle.

## Evidências e o que ainda falta provar

### Atualização do checkpoint intermediário — 18/10/2026

O usuário autorizou publicar em staging a conciliação **com todo o trabalho Python implementado até agora**, e continuar a implementação após essa entrega. Em orientação posterior, pediu funcionamento normal das duas linguagens em staging, **sem flag temporária de liberação**; produção somente depois da validação completa. Esse checkpoint não encerra a feature. A base JavaScript permanece padrão. Catálogo, distribuição, serviços e autorizações por contexto são contratos normais do executor, não uma flag de rollout adicional.

Gates finais do checkpoint: Studio 9257 testes sem falhas, Core 1354, Admin oficial 651 (incluindo os loaders em src), member-shell 1591, runtime 191, serviço de linguagem 23, Molda oficial 3411, Community 8 e contratos de CI/release 33. Os quatro casos de shell Linux ignorados no Windows são skips existentes, não provas aprovadas nesta máquina. Studio/Admin/member-shell passaram os tipos finais; o serviço de linguagem passou suas três configurações e build. Biome CI terminou com código0, 12 avisos existentes e160 informações. Os gates SQL, Members e Kids colhidos anteriormente continuam registrados nos recibos próprios; o delta remoto a1e passou25 testes em banco vazio e136 hashes de migrações exatos. Os números são execuções separadas, não uma execução global única. As tentativas anteriores com falhas permanecem registradas: não houve aumento de deadlines, remoção de casos ou redução de asserções para obter aprovação. A auditoria final conferiu os recibos,49 hashes de fontes e as24 fixtures isoladas (255 casos); a revisão independente não encontrou bloqueio para o checkpoint.

A medição isolada inicial confirmou 15 arquivos JavaScript frente ao teto de 10 e 354563 bytes brutos frente ao teto de 350000. Imports sob demanda retiraram as dependências de sanitização de assets e criação Pro do boot. Dois contratos Core foram separados de seus produtores e módulos pequenos do editor foram agrupados por responsabilidade. A medição final passou com **8 arquivos/343569 bytes brutos/113693 gzip na lista**, e 19/18/19/18 arquivos na rota/Blocos/Ponte/Código, respectivamente, com todos os limites existentes intactos. O grafo inicial continua sem interpretador Python, Monaco ou Blockly. Os três percursos JavaScript de navegador real também passaram. Isso comprova os orçamentos e aquele smoke; não aprova latência global ou os hosts Next.

A revisão encontrou também um bloqueio COEP dos frames Python nas rotas Pro. Execução, análise e preview candidato agora configuram o iframe anônimo antes da navegação. A prova causal com CPython real falhou ao retirar somente o atributo e passou nos seis cenários de Chrome/Edge depois de restaurá-lo, mantendo a política do host e a origem opaca do aluno. O preview candidato ainda não tem qualificação completa de SDK/navegador; seu cache efêmero e o desempenho continuam gates de habilitação posteriores.

A configuração remota de staging foi conferida somente para leitura, com projeto, ambiente e serviço confirmados pelos identificadores do provedor. Em Members, Admin, Community e Community Kids estão ausentes o catálogo aprovado `STUDIO_AUTHORING_POLICY_JSON`, os hosts `STUDIO_RUNTIME_HOSTS_JSON` e os pares de serviço Python runtime/language. Sem o catálogo e os hosts aprovados, as superfícies analisadas não concedem execução Python. O recibo local `staging-python-config-presence.json` registra somente presença/ausência, sem valores ou credenciais. Não existe um kill switch único: retirar apenas credenciais de BFF não substitui a ausência do catálogo/hosts; a configuração deve ser conferida novamente antes da publicação caso o ambiente avance.

O perfil atual da imagem é `85b1ed90d4727e67c791a6a7349a554715700201ffa645a56438ec374bd09b8c`, gerado e conferido após os contratos Core. A imagem foi reconstruída e validada: audit sem vulnerabilidades, image-smoke e seis kits JavaScript reais com captura passaram. Manifest `898c034a547fe2c4aa41d39d2a17ff9cfed0a6bef3092742e7d56ccca63ff26a`. Isso preserva o executor JavaScript; as provas completas Python/SDK/exportação e desempenho continuam após o checkpoint. O ambiente staging receberá o funcionamento normal à medida que sua infraestrutura real for preparada, sem um gate artificial de liberação. Nada disso autoriza produção antes da validação completa.

Além dos gates acima, passaram as provas específicas do codec e julgamento, do analisador JavaScript, do serviço de progresso sem persistência/XP, do cartão em DOM, da autoria e dos contratos do executor. A captura real foi exercitada com Node 24 em Chrome e Edge. Essas provas específicas têm escopo próprio: não substituem a imagem atual nem o percurso completo de uma aula.

Os gates e a revisão final do checkpoint foram concluídos. Falta publicar e conferir o commit conciliado em staging. Para concluir Python, continuam pendentes os percursos completos de autoria/aluno/sala/Mural, exportações e as medições de desempenho e concorrência. Os tetos de 150 segundos do executor e 155 segundos da operação JavaScript são limites de falha, não metas aceitáveis de experiência. Python mantém 50 segundos por operação e 45 segundos de inspeção; isso também não aprova seu tempo percebido.

Devemos medir latência fria e quente, percentis de verificação, fila, consumo e custo sob carga de aula, além das metas de execução do Estúdio já previstas no plano Python. Para avaliar o ganho pedagógico, observar tentativas até cumprir, erros recorrentes, abandono e necessidade de ajuda. Não há evidência suficiente hoje para afirmar que a mudança já melhorou essas métricas. O teste no outro computador Windows de 8 GB permanece para depois da validação local, conforme a orientação do usuário.
