**Revisão da proposta de gravador e editor de aulas com IA — 14/10/2026**

**Parecer:** a direção do produto é coerente com o problema, mas a proposta anterior não estava suficientemente delimitada para iniciar uma implementação extensa ou assumir prazo e retorno. Havia requisitos essenciais pouco definidos, uma ausência funcional confirmada e critérios de validação que precisavam de correção. A [proposta principal](2026-10-14-editor-aulas-ia-proposta.md) foi ajustada nesta revisão.

O documento revisado permite organizar ensaios técnicos e uma decisão de arquitetura. A revisão documental não comprova que o software terá desempenho, qualidade ou economia de tempo suficientes: isso depende dos marcos e do piloto descritos.

**Base da revisão**

Foram examinados o documento completo, as correções de escopo do usuário, os pontos de integração no repositório e documentação oficial sobre captura Windows, áudio por processo, composição de vídeo, clientes de IA e licenças. Não houve execução de um protótipo, teste de edição, benchmark, uso das contas do usuário ou teste do Cap. Os números de produtividade continuam sendo estimativas informadas pelo usuário.

Durante a revisão, o usuário confirmou que o avatar do HeyGen chega com fundo verde e que a remoção acontece na edição. Essa informação transforma chroma key em requisito de substituição, e não em uma possibilidade futura.

**O que estava coerente e foi preservado**

- Gravação no próprio aplicativo, com inserção automática na linha do tempo e cursor editável separado.
- HeyGen e materiais de apoio produzidos externamente, sem integração de geração por API.
- Foco em aulas curtas e repetitivas, com roteiro, demonstração e recursos visuais.
- Edição por ferramentas controladas, projeto preservado, prévia e desfazer.
- Proteção de gestos e tempos de aprendizagem, evitando cortar todo silêncio.
- Desenvolvimento por etapas, mantendo a meta de reduzir o trabalho com qualidade equivalente.
- Independência entre edição local, renderização e disponibilidade do serviço de IA.

**Achados e ajustes**

“Bloqueante” abaixo significa que o ponto impediria aceitar a substituição do Camtasia se não fosse resolvido. Não indica defeito em um software já implementado. Todos os ajustes estão no planejamento; a verificação técnica continua pendente.

| ID | Prioridade | Lacuna encontrada | Ajuste realizado |
| --- | --- | --- | --- |
| R01 | Bloqueante | O escopo falava em importar o avatar, mas não definia a remoção do fundo usada atualmente | Chroma key, bordas, verde residual, máscara simples e presets passaram a ser obrigatórios |
| R02 | Bloqueante | A captura era descrita principalmente pelo resultado ao apertar Parar | Persistência durante a gravação, fragmentos recuperáveis, estados de finalização e testes de interrupção |
| R03 | Bloqueante | O limite de 150–250 ms confundia sincronismo técnico com intenção pedagógica | Meta técnica em quadros; janela editorial específica por cena; testes com referências independentes |
| R04 | Bloqueante | Compartilhar tecnologia não demonstrava equivalência entre prévia e arquivo exportado | Mesmo modelo de composição, parâmetros e tempo; cache de chroma key versionado e comparação de quadros |
| R05 | Bloqueante | Sincronização automática ainda aparecia como capacidade ampla sem contrato de entrada suficiente | Cenas e falas estruturadas, ocorrências, marcadores, trechos protegidos e tratamento explícito de impossibilidades |
| R06 | Relevante | O modo guiado sugeria fones sem definir como evitar duplicação na captura do áudio do sistema | Exclusão/seleção de processos ou captura sem áudio do sistema quando dispensável |
| R07 | Bloqueante | A lista de recursos subestimava operações manuais necessárias para terminar a aula | Agrupamento, fechamento de espaços, camadas, recorte, volume, keyframes e conclusão sem IA como etapa técnica |
| R08 | Relevante | A avaliação de componentes privilegiava editores e composição, sem uma referência forte de captura com cursor | Cap incluído para avaliação, com separação explícita das licenças por módulo |
| R09 | Relevante | Publicação integrada e instrumentação da plataforma aumentavam o escopo inicial | Exportação e envio pelo fluxo atual; eventos do Blockly como melhoria opcional |
| R10 | Bloqueante | Ferramentas tipadas de edição não garantiam que o cliente de IA estivesse sem acesso amplo ao computador | Instância dedicada, restrições efetivas, teste de permissões e de interrupção/cota |
| R11 | Relevante | A faixa de prazo agrupava uma e duas pessoas sem explicitar capacidade produtiva | Frentes de trabalho, reserva, capacidade mensal e calendários separados |
| R12 | Relevante | O exemplo de retorno podia parecer representativo de toda a faixa; a mediana do piloto não sustentava sozinha a projeção de horas | Sensibilidade por investimento, custo mensal explicitamente hipotético e avaliação do total de horas do lote |
| R13 | Relevante | Formatos, resolução de captura, hardware, instalação e atualização estavam pouco definidos | Contrato inicial de mídia, máquina de referência, qualidade dos zooms, instalador e recuperação de versão |
| R14 | Bloqueante | Uma prova pequena podia ser confundida com evidência de substituição e produtividade | Marcos M0–M4 com condições distintas; a substituição só é aceita no piloto completo |

**R01: chroma key precisa influenciar a escolha do motor**

Remover verde é parte do trabalho diário confirmado. O protótipo deve usar o avatar real, com inspeção do contorno sobre fundos claros e escuros e em movimento. A IA pode aplicar um preset ou sugerir ajustes; a remoção em si pode ser determinística, sem serviço de geração.

A documentação do FFmpeg oferece chroma key e despill. Isso comprova a existência de componentes técnicos, não a equivalência visual com a edição atual. A comparação deve observar cabelo, roupa, mãos, transparência e resíduos verdes. A exportação precisa reproduzir o recorte aprovado. [Filtros do FFmpeg](https://ffmpeg.org/ffmpeg-filters.html#chromakey).

**R02–R04: gravação confiável exige mais que uma trilha de coordenadas**

É necessário sincronizar vídeo, estado/posição do cursor e áudio, além de converter coordenadas entre desktop, janela, captura e composição. O cursor deve conservar o ponto ativo ao mudar de tamanho. Suavizar um arrasto não pode fazer o ponteiro se separar do bloco que já aparece no vídeo.

A meta de um quadro, cerca de 33 ms em 30 fps, foi introduzida como critério proposto para ensaios técnicos. Ela não foi medida. A sincronização pedagógica segue outra lógica: o destino pode precisar aparecer antes da fala ou um resultado permanecer visível depois dela. Não há um único atraso ideal para todas as cenas.

Também foi explicitado que salvar a montagem não protege, por si só, a captura em andamento. A gravação deve persistir dados continuamente, informar falhas e recuperar o estado consistente. Não há promessa de perda zero antes dos testes.

Para o chroma key e outras transformações, parâmetros comuns não bastam se prévia e exportação processarem as imagens de formas diferentes. Transparência pode exigir configuração específica no render. Por isso, a decisão de motor inclui uma composição real e quadros de referência. [Transparência no Remotion](https://www.remotion.dev/docs/transparent-videos).

**R05–R06: sincronizar a aula precisa preservar a gravação real**

A primeira versão não deve depender de compreensão perfeita de qualquer vídeo. Deve usar roteiro estruturado, transcrição, marcadores de cena e seleção manual, acrescentando reconhecimento quando ele passar em avaliação. Frases repetidas precisam ser resolvidas por cena e ocorrência. Tempos por palavra não autorizam cortar sem conferir a fronteira do áudio.

Se a demonstração precisar durar mais, uma pausa pode mostrar a tela sem o avatar e depois retomar a fala. Congelar o rosto no meio de uma palavra ou fabricar uma ação faltante não são soluções aceitáveis. Uma lacuna real pode exigir regravação, apontada precisamente pelo editor.

No modo guiado, fones não impedem duplicação via loopback do sistema. A Microsoft documenta captura e exclusão por processo, cuja disponibilidade precisa ser validada no Windows da equipe. O plano agora inclui esse teste e uma opção sem áudio do sistema quando ele não for necessário. [Captura por processo](https://learn.microsoft.com/en-us/samples/microsoft/windows-classic-samples/applicationloopbackaudio-sample/).

**R08–R10: reaproveitamento e autenticação são escolhas condicionadas**

O Cap é uma referência mais próxima para gravação local com cursor editável e deve entrar na comparação. A documentação de seu Studio Mode descreve controles que dependem dos metadados capturados. Isso ainda não estabelece que seu editor cumpra o fluxo completo de aula. [Studio Mode](https://cap.so/docs/recording/studio-mode).

A licença lida separa famílias MIT de conteúdo AGPLv3. Antes de adotar um componente, identificar licença, dependências, forma de distribuição e custo de integrar. Não foi recomendado copiar o produto inteiro ou assumir que todos os módulos têm a mesma licença. [Licença do Cap](https://github.com/CapSoftware/Cap/blob/main/LICENSE).

Os caminhos de conta pessoal descritos na proposta continuam condicionados aos clientes oficiais e às regras do fornecedor. Não surgiu fundamento para prometer uma API universal usando assinatura de chat. O ponto novo da revisão é de arquitetura: disponibilizar MCP não restringe automaticamente todas as outras ferramentas do agente. A prova deve testar o limite de acesso e a recuperação, além do login. O app-server documenta mecanismos de sandbox e também interfaces experimentais com características distintas; a integração escolhida deve especificar quais utiliza. [Codex app-server](https://learn.chatgpt.com/docs/app-server).

**R11–R12: esforço e retorno foram apresentados com mais precisão sobre a incerteza**

A revisão detalhou frentes antes pouco visíveis: chroma key, editor manual utilizável, recuperação da captura, dependências e instalador. O esforço preliminar passou para 760–1.340 horas antes de reserva; com 25%, são 950–1.675 horas, arredondadas para 950–1.700. São estimativas de planejamento, sem dados de implementação para calibrá-las.

Com 120 horas produtivas mensais de uma pessoa, o cenário é aproximadamente 8–15 meses. Com 220 horas mensais conjuntas de duas pessoas, aproximadamente 5–8 meses. Essas contas distinguem capacidade, mas não eliminam dependências sequenciais, aprendizado ou disponibilidade editorial.

O primeiro lote recomendado ficou separado: M0, de 40–60 horas, para decisões e ensaios mínimos. Não se espera um editor completo nesse lote. Seu resultado deve reduzir a incerteza sobre o trabalho seguinte. Não houve contratação nem autorização de gasto executada nesta revisão.

O retorno de 13,2 meses exige simultaneamente investimento de R$100 mil, redução efetiva de 70%, hora avaliada em R$100 e custo incremental de R$1.500/mês. Com R$200 mil, o mesmo cenário vai a 26,3 meses; com R$340 mil, a 44,7 meses. O custo mensal precisa ser apurado: 24 horas de manutenção a R$100 já excedem R$1.500 antes de serviços. A capacidade liberada não é automaticamente dinheiro economizado.

**Sequência de decisão revisada**

1. M0: obter amostras, medir o fluxo atual e identificar um caminho técnico e de licença viável.
2. M1: demonstrar captura própria, cursor separado, chroma key, cortes, reabertura e exportação.
3. M2: concluir uma parte de aula com os controles manuais essenciais, sem Camtasia.
4. M3: acrescentar edição inteligente por texto/voz e alinhamento assistido pelo roteiro.
5. M4: medir um lote de produção, validar qualidade, confiabilidade e tempo total.

O objetivo do usuário permanece completo. M2 é uma etapa de construção; somente M4 pode sustentar a decisão de substituir o Camtasia na rotina. Publicação direta no Vimeo e coleta extensa de eventos do Blockly podem evoluir depois, pois o fluxo atual já recebe arquivos finais.

**Pendências reais antes de uma especificação de implementação**

| Decisão pendente | Evidência necessária | Marco |
| --- | --- | --- |
| Sistema e hardware suportados | Máquina de edição, monitores, escala, CPU/GPU, memória e espaço | M0 |
| Formatos e qualidade de imagem | Bruto de tela, avatar com verde, recursos ilustrativos e exportação atual de referência | M0 |
| Núcleo de captura/composição | Ensaio representativo, licença e esforço de integração | M0–M1 |
| Uso da conta de IA | Autenticação oficial, ferramenta real do editor, limites e isolamento | M0–M3 |
| Economia de trabalho | Tempos registrados por tarefa, revisão incluída e lotes comparáveis | M0–M4 |
| Substituição operacional | Dez vídeos consecutivos completos com qualidade e recuperação verificadas | M4 |

Essas pendências não exigem reabrir as decisões já informadas: gravação integrada, cursor editável, avatar com fundo verde e geração externa dos materiais estão confirmados.

**Verificação desta revisão**

A revisão alterou documentação, não o produto. Foram reconferidos os contratos locais de autoria, os eventos de Blockly e as funções de Vimeo/Zappy mencionados. Foram verificados os cálculos das faixas e cenários, a consistência das etapas e os links locais. Não foram executados testes de captura, chroma key, autenticação, exportação ou desempenho; os documentos deixam esses resultados como pendentes.
