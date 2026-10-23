**Fluxo Criativo: aproveitamento no marketing do Sistema Zero**

15/10/2026. Análise da pasta C:/Users/tocha/Documents/fluxo-criativo, cruzada com a integração anterior e o código do Sistema Zero. Complementa a [proposta consolidada](2026-10-15-marketing-app-fluxo-editorial-proposta.md), referência normativa das decisões, e o [plano por lotes](../superpowers/plans/2026-10-15-marketing-desktop-colaborativo-lotes.md). Este documento registra o que existe na origem e como aproveitá-lo; não reabre escolhas de produto.

**Conclusão e decisão de produto**

Há bastante material útil, principalmente métodos, repertório de produção, scripts de coleta e acervo. A incorporação deve transformar essas capacidades em operações do app, com estado compartilhado, referências, versões e continuidade. Copiar comandos do workshop não cria automaticamente um aplicativo colaborativo.

O usuário confirmou que a edição será conduzida por IA. A experiência é fornecer material → pedir criação/ajuste → receber prévia → pedir nova alteração ou aprovar o resultado. Ajuste explícito em rascunho atual aplica nova revisão validada com Desfazer; alternativas aguardam escolha. Não exigir timeline manual, configuração de efeitos, terminal ou código.

Remotion é uma biblioteca React incorporável ao app. A ausência de um projeto pronto no Fluxo Criativo não exige construir outra plataforma: compartilhar composição entre Player e renderer, integrar parâmetros à bancada de pedidos e executar localmente. FFmpeg prepara mídia; Whisper.cpp transcreve; a timeline é o modelo interno operado pela IA. O usuário mantém direção criativa e escolha do resultado.

**Alcance e inventário verificado**

Foram examinados estrutura, pontos de entrada, documentação operacional e trechos de implementação pertinentes a vídeo, imagens, pesquisa, métricas, variações de copy e acervo. Não foram executados scripts da origem, instaladas dependências, abertas credenciais ou acionados serviços externos. A inspeção não equivale a auditoria completa de todo arquivo binário/código nem a teste de funcionamento dos scripts.

| Evidência | Resultado observado |
| --- | --- |
| Skills na origem | 54 arquivos SKILL.md diretamente nas pastas de skills |
| Papéis de agentes e comandos | 18 agentes; 80 comandos na raiz e 113 arquivos de comandos/referências recursivos |
| Scripts operacionais | 49 arquivos diretamente em scripts/ |
| Integração de 01/10 | 9 skills canônicas, 6 agentes e 17 comandos adaptados no Sistema Zero |
| Comparação com inventário anterior | 202 entradas registradas continuam com o mesmo SHA-256 |
| Código Remotion executável na origem | Não encontrados projetos remotion.config nem arquivos TSX fora de dependências/clone técnico |
| Dependências do Sistema Zero | Busca nos manifests/lockfiles examinados não encontrou Remotion; há FFmpeg no live-recorder, para outro fluxo |
| Desktop da origem | package.json aponta electron/main.js; esse arquivo/diretório não existe no checkout examinado |
| Acervo em meus-produtos | 561 arquivos, dos quais 558 dentro dos três produtos; não são 561 peças prontas |

O [registro de importação anterior](../../.agents/marketing/importacao-fluxo-criativo.md) confirma que a primeira adaptação priorizou metodologia e excluiu integrações externas, templates/assets e scripts de execução. Portanto, a lacuna atual é levar produção e acompanhamento para dentro do produto, além de completar a migração editorial.

**O que incorporar e como**

Os caminhos da coluna Origem são relativos ao Fluxo Criativo. “Aproveitar” significa adaptar e validar; não afirma que a função já exista no app.

| Capacidade | Origem examinada | Decisão para o app | Lote |
| --- | --- | --- | --- |
| Pesquisa de mercado | .claude/skills/pesquisa-mercado, dados-nicho, pesquisa-mercado-instagram | Fontes datadas, concorrentes, objeções e oportunidades vinculadas a hipóteses e peças | L4/L8/L10 |
| Posicionamento e oferta | Métodos já registrados em .agents/marketing e perfis em meus-produtos | Reusar adaptação local, separar histórico de direção vigente e catálogo real | L4/L8 |
| Copy e variações por referência | .claude/skills/copy-variacao-post, conteudo, revisora | “Criar variação desta referência”, com leitura de mídia/transcrição, objetivo, voz e comparação | L5/L10 |
| Direção visual e edição pontual | .claude/skills/carrossel-visual, usar-referencia-visual | Alterar componente/região por pedido e conservar identidade, referências e restantes | L5/L6A |
| Configuração estruturada de criativo | scripts/generate-creative.py, gerar-carrossel-foto.py | Reusar conceitos de configuração por slide e render seletivo; adaptar execução/provedor | L6A |
| Cenas, narrativa e animação | .claude/commands/video-remotion.md; .claude/skills/video-avancado | Roteiro temporal, lista de materiais e composições Remotion parametrizadas por marca/formato | L5/L6B–C |
| Edição de gravações | .claude/commands/video-editar.md | Cortes, junções, enquadramento, áudio, legenda, compressão e extração operados pela IA | L6B |
| Repertório de efeitos | .claude/commands/video-efeitos.md | Portar textos, identificação, contador, lista, CTA e transições para catálogo Remotion | L6C |
| Transcrição local | video-editar.md, referências Whisper.cpp | Provisionar pelo desktop; transcrever, corrigir por pedido e manter timestamps | L0/L6B |
| Prévia eficiente | scripts/otimizar-video-scrub.py | Usar ideia de derivado adequado à navegação; sem instalação improvisada por tarefa | L3/L6B |
| Perfil e concorrentes | .claude/skills/dashboard-social e dashboards por rede | Dados normalizados no backend e vistas integradas, sem dashboards HTML concorrentes | L4/L10 |
| Pesquisa de nicho por sinais sociais | pesquisa-mercado-instagram/scripts/pesquisar.py | Pipeline de descoberta/enriquecimento opcional, fontes e amostragem explícitas | L10 |
| Histórico de métricas | instagram-dashboard/scripts/atualizar.py | Reusar snapshots atuais, corrigir disponibilidade na entrega inicial e ampliar comparações/alertas depois | L7/L10 |
| Diagnóstico de campanha | trafego-analise, trafego-otimizar e métodos locais já adaptados | Relacionar criativo, objetivo, edição e funil; gerar proposta de teste, sem ação automática em orçamento | L10 |
| Materiais já produzidos | meus-produtos/comunidade-dos-criadores, desafio-primeiro-jogo, programando-com-diversao | Inventário/preparação cedo, reconciliação integral e ativação antes da liberação | L8A/L8B |

Os métodos já adaptados no Sistema Zero continuam canônicos. Não reinstalar outra versão das regras de copy, outro CRM, outro calendário ou outro publicador. Melhorias de método entram com versão e aplicação explícita aos projetos pertinentes.

**Achados que impedem uma cópia direta**

| Achado concreto | Consequência | Ajuste necessário |
| --- | --- | --- |
| video-remotion.md:11–17 fixa 9:16/25 fps, duração e TTS pago; :139 depende de ~/cple-videos | A instrução não é uma integração pronta nem genérica | Receita local completa, fps/formato por projeto, áudio fornecido/original; TTS externo opcional |
| video-remotion.md:145–151 fixa bordô/Inter/logo | Direção de outro projeto vazaria para as peças | Marca e referências do projeto governam aparência |
| video-maker.md:164–169 separa rigidamente avatar/animação e pede roteiro pronto fora do fluxo | Contradiz mistura de gravação e animação solicitada | IA cria/adapta roteiro e compõe mídia híbrida na mesma peça |
| video-editar.md traz comandos de corte e instalação dependentes de SO | Exemplos úteis não resolvem empacotamento, erros e precisão | Serviço de mídia com argumentos validados, cancelamento, limites e casos reais de celular |
| video-efeitos.md usa GSAP/CDN/Puppeteer/frames e FFmpeg | Segundo motor amplia divergência de prévia e manutenção | Portar repertório para Remotion; manter receita extra apenas se houver necessidade demonstrada |
| scripts/animar-criativo.py usa Replicate; generate-creative.py escolhe OpenRouter/Replicate/Freepik | “Animar” ou “gerar imagem” não significa execução coberta por assinatura | Não portar roteamento pago automático; imagem segue Codex validado; montagem/animação segue motor local |
| instagram-dashboard/SKILL.md proíbe agendamento automático (:323) | Nome do dashboard não comprova monitoramento contínuo | Worker recorrente novo, status e falhas explícitos |
| A skill do Instagram recomenda sync, mas atualizar.py:102–151 usa async/polling para posts | Documentação e execução divergem | Projetar conector a partir do contrato vigente e testar; não herdar workaround como regra |
| atualizar.py:201–268 converte ausências em zero, usa seguidores atuais e trunca legenda em 500 caracteres | Comparações e análise criativa podem ficar incompletas | Ausência tipada, cobertura, denominador/período e conteúdo completo quando disponível |
| pesquisar.py:242–287 também zera likes ocultos e trunca legenda | “Top posts” não é evidência suficiente de resultado comercial | Ranking exploratório com limites; validar hipótese no próprio público |
| copy-variacao-post chama conteúdo de “validado pelo algoritmo” | Exagera o significado de engajamento observado | “Referência com sinais observados”, indicando hipótese e dados ausentes |
| README descreve Electron, mas entrypoint não está no checkout | Não há shell pronto para incorporar | Implementar Electron do Sistema Zero, compartilhando UI e serviços atuais |

Outras afirmações da biblioteca, como penalidade universal por repetir imagem, percentuais gerais de consumo sem som, superioridade de avatar para conversão e thresholds universais de campanhas, não foram promovidas a fatos. São recomendações locais que precisam de evidência aplicável ou devem ser removidas da política do app.

O mesmo cuidado vale para preços, planos gratuitos e versões mencionadas nos scripts. Nenhum deles foi adotado como preço atual da integração.

**Como a IA vai editar o vídeo**

Exemplo de pedido: “Use minha gravação, tire as pausas, selecione o trecho em que demonstro o jogo, coloque legendas e intercale duas animações explicando a ideia. Mantenha a minha voz.”

| Etapa interna | Resultado persistido | Experiência do usuário |
| --- | --- | --- |
| Receber e preparar | Original, metadados, hashes e derivados necessários ao pedido | Upload e progresso; original preservado; proxy/transcrição sob demanda |
| Compreender | Transcrição e frames com timestamps, referências e limitações | App indica material compreendido e pendência real, quando houver |
| Planejar | Decisões de corte/cena/texto/efeito vinculadas a fontes | Uma intenção clara permite seguir para a prévia sem aprovar cada ferramenta |
| Executar | Timeline e composição versionadas; assets necessários | IA opera mídia e animação em segundo plano |
| Conferir | Duração, limites, sincronismo, textos, arquivos e diagnóstico | Resultado revisável; falhas têm recuperação ou explicação concreta |
| Ajustar | Patch na revisão/alvo solicitado | “Mude só o encerramento” preserva o restante |
| Entregar | Vídeo final + manifesto + fontes/receitas sincronizadas | Equipe consulta, aprova e continua em outro computador |

Remotion monta e anima, com a mesma composição, parâmetros, assets e fontes na prévia e no render; FFmpeg prepara/transcodifica quando preciso, sem duplicar o motor de montagem; Whisper.cpp transcreve localmente. Codex/Claude interpretam pedidos e produzem decisões/textos conforme capacidades verificadas. Não é necessário usar inferência para cada quadro, nem gerar novamente uma imagem quando basta alterar texto.

A primeira entrega usa composições e efeitos suficientes para as situações solicitadas. A IA pode ajustar código de composição em um escopo isolado, com validação antes de disponibilização; não é necessário criar um sistema de plugins ou outro serviço para isso. Não prometer efeito arbitrário ou execução de código desconhecido dentro da janela privilegiada. Uma operação inválida não pode apagar o original ou aplicar um corte em outra peça.

Frames e transcrição precisam corresponder ao asset/revisão e aos intervalos exatos. A IA não deve decidir que um momento visual existe apenas pela fala. Alterar cortes não deve inventar falas ou transformar o sentido do depoimento. Análise multimodal indisponível deve aparecer como limite; não simular inspeção do vídeo.

A timeline é um contrato interno com schema versionado, IDs estáveis, tempos/racional de fps, trilhas, fontes e dependências. Isso permite “desfazer a última mudança”, comparar versões e sincronizar edições entre pessoas. Uma timeline visual avançada não é requisito para a primeira liberação.

**Escolha técnica e custos**

| Opção | Avaliação |
| --- | --- |
| Biblioteca Remotion incorporada + bancada de pedidos à IA | Escolhida. Composições React compartilhadas entre Player e renderer; render local e UI de contexto/revisão do próprio produto |
| Editor Starter com timeline/canvas manuais | Pode acelerar um editor convencional, mas não é necessário para o fluxo confirmado. Não comprar/incluir como dependência inicial |
| Portar GSAP/Puppeteer e FFmpeg como segundo editor completo | Acrescenta motores e caminhos de render; aproveitar efeitos como referência e portar o necessário |
| Render hospedado como caminho principal | Contraria prioridade de processamento desktop e exige custos/capacidade separados; manter expansão condicionada |

Fontes oficiais consultadas em 15/10/2026:

- [Player](https://www.remotion.dev/docs/player): composição exibida em React e controlada por parâmetros; não equivale a editor completo.
- [Integração do Player](https://www.remotion.dev/docs/player/integration): reutilizar o componente para exibir, parametrizar e renderizar; bundler/renderer Node ficam fora do bundle do navegador.
- [Renderer](https://www.remotion.dev/docs/renderer): APIs de exportação; usar processo separado e versões compatíveis.
- [Vídeo no Remotion](https://www.remotion.dev/docs/media/video): clipes integrados à composição. A documentação atual usa trimBefore em frames e durationInFrames; trimAfter está depreciado. A skill local contém texto inconsistente sobre segundos/frames, portanto implementação segue versão fixada e referência oficial.
- [Whisper.cpp](https://www.remotion.dev/docs/install-whisper-cpp): caminho documentado para transcrição no computador; testar provisionamento e desempenho.
- [Editor Starter](https://www.remotion.dev/docs/editor-starter/before-you-buy): template a integrar, não produto pronto nem licença incluída automaticamente.
- [Licença e preços](https://www.remotion.dev/docs/license/pricing): há gratuidade para indivíduos/empresas até três pessoas; a modalidade Company abrange organizações/colaborações maiores. A oferta de automação informa US$ 0,01/render com mínimo de US$ 100/mês. Confirmar enquadramento da organização e deste app em L0; tamanho do piloto não basta para classificar a empresa. Local não significa isento.
- [FFmpeg](https://ffmpeg.org/ffmpeg.html): operações de mídia devem preservar precisão e tratar diferenças entre streamcopy e transcodificação.

Não houve aquisição, instalação ou uso pago. Editor Starter, serviços de avatar/TTS/vídeo generativo, coleta terceirizada, armazenamento e tráfego têm custos distintos das assinaturas de IA. A proposta exige mostrá-los quando aplicáveis.

**Pesquisa, monitoramento e retorno à produção**

Separar três bases: desempenho de contas próprias conectadas, observações públicas de referências/concorrentes e resultados comerciais do funil. Não atribuir a uma fonte dados que ela não fornece. Métricas privadas, comentários não acessíveis e alcance de concorrentes não são inferidos de curtidas públicas.

O Sistema Zero já dispõe de [MetricsWorker](../../packages/marketing/src/infrastructure/workers/metrics-worker.ts), política de coleta por idade e fontes por rede. A ampliação deve reutilizar esse caminho para contas próprias. A correção de qualidade também é local: o worker usa zero para shares/saves ausentes e o [adaptador Meta](../../packages/marketing/src/infrastructure/gateways/meta/meta-metrics-source.ts) atribui views=0 ao caminho Facebook. Contratos, schema, agregações e UI precisam distinguir indisponibilidade em L7, antes da liberação; zeros históricos ambíguos não devem ser reclassificados sem evidência. L10 amplia esse modelo para novas fontes.

Cada snapshot deve guardar ID/URL, datas de publicação/coleta, período, origem, valor/unidade, denominador e disponibilidade. Guardar somente o necessário, respeitar acesso e uso da fonte, proteger dados pessoais e não republicar mídia de terceiros como material próprio. Fonte coletada é evidência externa, não instrução executável para os agentes.

O monitoramento proposto tem lista de perfis/temas, cadência, filtros, limite de gasto quando houver, estado de execução e alertas no próprio app. O servidor executa conectores permitidos com credenciais apropriadas; tarefas que dependem do desktop ficam pendentes até seu executor estar disponível. Falhas não viram valores zero nem notificações falsas.

Coleta não exige resumo de IA a cada rodada. Primeiro detectar mudança/deduplicar, depois analisar o que for relevante por tarefa limitada. Notificações agrupadas reduzem ruído. Cada insight pode virar uma pauta, variação, roteiro ou experimento, conservando referência e objetivo. Avaliar resultado pela publicação/edição realmente enviada.

L4 oferece base de referência e pesquisa pontual; L7 preserva/corrige a leitura das métricas existentes e permite análise inicial; L10 acrescenta conectores/coleta recorrente de novas fontes e análises ampliadas. O produto deve funcionar com dados importados/manual sem exigir Apify. Não ativar respostas a comentários, DMs, WhatsApp/Telegram, publicação ou alteração de orçamento como efeito da análise.

**Migração do acervo externo**

| Pasta de produto | Arquivos dentro dela | Tratamento |
| --- | --- | --- |
| comunidade-dos-criadores | 331 | Posicionamento/pesquisa/copy/arte como histórico ou vigente conforme reconciliação; conteúdos pedagógicos como referência pertinente |
| desafio-primeiro-jogo | 202 | Incluir linha editorial, roteiros semanais, ganchos e criativos, preservando datas e diferenças de oferta |
| programando-com-diversao | 25 | Preservar histórico de concepção/escada e referências; não ativar como produto atual automaticamente |

A raiz meus-produtos tem mais três arquivos. A comparação de 534 candidatos com extensões textuais/mídias contra docs/marketing, output e os diretórios de planos do Sistema Zero não encontrou hashes idênticos. Excluiu dependências/caches e não é busca semântica; não conclui que nenhuma ideia já tenha sido aproveitada.

Há exemplos concretos de precedência necessária: linha editorial antiga de 30 dias propõe duas postagens de feed por dia; escada de junho contém preços/formato de oferta daquela época; perfil da Comunidade inclui descrições de acompanhamento que precisam ser confrontadas com a oferta atual. Esses materiais enriquecem o histórico, mas não devem substituir o calendário atual ou virar promessas comerciais.

Importar:

- Fontes, pesquisa, perfis e hipóteses com datas e grau de verificação.
- Copies, ganchos, roteiros, pautas, direção e referências como entidades editáveis pela IA.
- Imagens, montagens e arquivos finais com proveniência e vínculo às peças.
- Documentos que não tenham parser confiável como originais consultáveis, com estado de estruturação pendente.
- Materiais pedagógicos pertinentes como evidência do produto, sem duplicar cadastro de aulas.
- Conflitos/duplicatas semânticas e material sem contexto em fila de conferência.

Não importar .env, permissões, estado privado de agentes, node_modules, caches ou integrações de envio como configurações do produto. Scripts/templates são candidatos a receitas revisadas, nunca executados pelo ato de importar. As fontes originais permanecem intactas.

**Prioridade e verificação**

A primeira entrega permanece L0–L9: L6A entrega imagem; L6B incorpora Remotion com gravação/cortes/transcrição, prévia e render; L6C amplia efeitos e adaptação. L8A inventaria e carrega ambos os acervos em preparação após L1/L3/L4; L8B reconcilia e ativa a carga integral após L5/L6/L7. L9 comprova uso por duas pessoas sem terminal nem edição manual de timeline, com análise das métricas existentes. L10 amplia monitoramento e aprendizado; L11 contém efeitos avançados, serviços opcionais e outras plataformas.

O aceite precisa demonstrar:

- Pedido de alteração pontual conserva resto da copy/arte, aplica revisão do rascunho com Desfazer e permite conferir diferenças; alternativas aguardam escolha.
- Story de imagem vira vídeo real, com original recuperável.
- Gravação enviada é cortada, legendada e mesclada com animações por pedidos à IA.
- “Mude só a última cena” preserva cortes, voz e imagens restantes.
- Segundo computador continua projeto com originais, fontes, timeline e revisão corretos.
- Upload interrompido, render cancelado, cota e falta de mídia não causam perda/repetição cega.
- Métrica ausente, coleta parcial e execução duplicada não geram análise falsa.
- Pesquisa/observação vira pauta ou variante rastreável.
- Material antigo migra sem substituir direção vigente nem ser publicado automaticamente.

Nesta análise foram verificados arquivos, relações, hashes e documentação técnica. Não foi testado um editor inexistente, iniciado monitoramento ou importado conteúdo no app.
