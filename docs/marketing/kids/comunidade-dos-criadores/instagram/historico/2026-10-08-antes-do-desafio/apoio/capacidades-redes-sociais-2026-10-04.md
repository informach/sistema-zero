> VERSÃO HISTÓRICA, substituída em 08/10/2026. Para produção, use o [guia vigente](../../../README.md).

# O que posso produzir e operar para as redes sociais

> **APOIO À PRODUÇÃO.** Consultar para aprofundar uma captura ou recurso. Os textos das peças e o calendário vigentes estão no [guia do Instagram](../README.md). Capacidades e condições devem corresponder ao momento da produção.

Inventário verificado em **04/10/2026**, nesta máquina e nesta sessão. Este relatório distingue **capacidade disponível**, **implementação existente** e **serviço que ainda precisa de configuração ou teste**. Não houve geração paga, publicação ou renderização de um vídeo nesta tarefa de pesquisa.

## 1. Resposta prática

**Posso participar de toda a produção: pesquisar, planejar, escrever, criar artes, montar vídeos, editar gravações, legendar, preparar stories e analisar resultados.** Para a Comunidade, o melhor ponto de partida é combinar **gravações reais de vocês + captura da plataforma + edição e peças gráficas**. Isso permite mostrar a orientação integrada e as decisões de criação com provas do produto.

Também posso preparar os materiais para o app de marketing que já existe. Publicação e agendamento dependem de conta conectada, permissões e instrução para executar. A presença de uma skill não comprova que um serviço externo esteja autenticado.

## 2. Entregas por necessidade

| Necessidade | O que consigo entregar | Ferramentas e método | O que preciso / limite |
| --- | --- | --- | --- |
| Pesquisa de mercado | Matriz de concorrentes, ofertas, preços, objeções, evidências e implicações | Pesquisa web, navegação, `pesquisa-mercado`, agente pesquisador | Páginas públicas acessíveis; conteúdo fechado e métricas privadas continuam ausentes |
| Posicionamento | Proposta, públicos, provas, bio, destaques, fixados e jornada | `marketing-sistema-zero`, `estrategia-produto`, auditoria do produto | Verdade de oferta e decisões de negócio; não inventar resultado pedagógico |
| Calendário | Pautas, datas, responsáveis propostos, prova necessária e critério de leitura | `conteudo-editorial`, fluxo equivalente a `/copy-social` | Capacidade da equipe; ajustar com tempo real de produção |
| Reels com vocês | Roteiro, plano de captação, seleção de tomadas, cortes, reenquadramento, títulos, legendas e arquivo MP4 | Edição programática com FFmpeg; Remotion para composição | Arquivos de vídeo e áudio. Não consigo gravar fisicamente vocês; posso orientar a captação |
| Demonstração de plataforma | Capturas, sequência de ações, zoom no ponto relevante, narração e montagem | Navegador, gravação de tela acessível, FFmpeg/Remotion | Ambiente/conta e dados demonstrativos; não simular funcionalidade inexistente |
| Vídeo sem câmera | Animação de capturas, diagramas, texto, personagens e transições | Remotion e, quando adequado, Figma Motion | Preparar projeto de render; material verdadeiro para qualquer demonstração do produto |
| Stories | Sequência curta, texto/fala, imagens, vídeos, enquete sugerida e link | `conteudo-editorial`, imagem e edição | Sticker interativo é configurado no Instagram; ele não vira interativo só porque foi desenhado no MP4 |
| Carrossel | Texto slide a slide, composição, consistência visual, exportação e legenda | Skill editorial, design em código ou Figma, imagem quando útil | Identidade, imagens e prova; revisar ordem e legibilidade no celular |
| Capas e posts | Artes, variações de composição, ilustrações, fundo, recortes e formatos | Ferramenta `image_gen`, design e Figma | Revisar texto de imagem, identidade e detalhes; foto sintética não é prova de aluno real |
| Edição de imagem | Remover/trocar fundo, ajustar composição, criar variações e assets | `image_gen` disponível nesta sessão | Imagem fonte e intenção; resultado gerado precisa de inspeção |
| Legendas de vídeo | Transcrição revisada, SRT/VTT, quebras de linha e legendas incorporadas | `faster_whisper` encontrado + FFmpeg | Modelo de reconhecimento e execução precisam ser conferidos com o áudio; nomes próprios pedem revisão |
| Áudio | Cortes, volume, redução de ruído dentro do possível, trilha e sincronização | FFmpeg | Áudio fonte e licença de uso da trilha. Captação ruim limita recuperação |
| Narração sintética | Texto, marcação de pausas, geração e sincronização quando o provedor estiver configurado | Fluxo `promo-video` / ElevenLabs ou provedor disponível | Serviço, voz, credenciais e eventual custo. Não está pronto para execução automática nesta sessão |
| Reaproveitamento | Cortes de vídeo longo, versões vertical/quadrada, adaptações de legenda e CTA | FFmpeg/Remotion + revisão editorial | Material fonte; cada canal precisa de revisão de enquadramento e contexto |
| Respostas e comunidade | Modelos de resposta, FAQ, triagem de dúvidas e pautas a partir delas | `conteudo-editorial`, `revisao-copy` | Posso redigir; envio a pessoas exige instrução para isso e canal disponível |
| Anúncios | Ângulos, roteiro, versões, destino e proposta de teste | `criativos-anuncios`, `biblioteca-anuncios`, `analise-marketing` | Criar/publicar campanha depende de conta de anúncios e limites definidos; conta social não basta |
| Métricas | Relatório por peça e coorte, gargalos, hipóteses e próximos testes | Insights/exportações, app de marketing e medição do funil | Acesso aos dados; não confundir ausência com zero nem orgânico com experimento aleatório |

## 3. O que foi efetivamente conferido no ambiente

| Recurso | Evidência nesta sessão | Estado útil |
| --- | --- | --- |
| Geração/edição de imagens | Ferramenta `image_gen__imagegen` exposta | Disponível para uma tarefa de imagem; nenhuma imagem foi gerada nesta pesquisa |
| FFmpeg e FFprobe | Executáveis encontrados; `-version` executado com saída de versão | Base de edição/render de áudio e vídeo disponível |
| Node, Bun e Python | Executáveis encontrados | Base para composição, automação local e validação |
| Transcrição | Módulo Python `faster_whisper` encontrado | Caminho local viável; modelo, aceleração e transcrição ainda não testados nesta rodada |
| Remotion | Skills `remotion-best-practices` e `promo-video` lidas; pacote ausente do `node_modules` raiz | Sei preparar o projeto e renderizar; ainda requer instalação/configuração de projeto |
| Figma | Ferramentas de design, motion e exportação MP4 expostas | Capacidade condicional ao acesso ao arquivo, permissões e teste da operação |
| Weave/Figma | Ferramentas de descoberta de modelos e execução de geração expostas | Possibilidade adicional para geração visual/vídeo; modelos, acesso, créditos e qualidade não verificados |
| Pippit | Skill e scripts presentes; chaves do processo e cache padrão ausentes | Integração documentada, ainda não configurada nesta sessão |
| Nano Banana Pro | Skill presente; `uv` não encontrado no PATH; chave Gemini ausente do processo | Alternativa dependente de configuração. A ferramenta de imagem nativa já oferece um caminho sem esse setup |
| ElevenLabs | Skill `promo-video`; chaves usuais ausentes do processo; SDK Python não encontrado | Narração externa depende de configuração; voz gravada por vocês já pode ser editada |
| Trilhas de exemplo | Três MP3 presentes em `promo-video/music` | Arquivos existem; licença/aplicabilidade comercial deve ser conferida antes de usar numa peça |
| App de marketing | Código de pipeline, publicadores, mídia e métricas lido | Implementação existe; contas, credenciais e execução real não foram auditadas nesta tarefa |

A conferência de credenciais registrou somente presença/ausência; não leu nem exibiu valores. Ausência no processo não prova ausência em todos os cofres ou configurações da máquina. Nenhum serviço pago foi acionado para “testar capacidade”.

## 4. Como isso se encaixa no app existente

O código já representa **ideia → roteiro → gravação → edição → capa/legenda → revisão → aprovado**. Agendado e publicado são estados derivados das publicações. O checklist precisa estar completo para aprovar.

Fontes locais:

- [Etapas](../../../../../../../../packages/marketing/src/domain/content/stage.ts) e [checklists por formato](../../../../../../../../packages/marketing/src/domain/pipeline/checklist-templates.ts).
- [Tipos de publicação e modo manual de stories](../../../../../../../../packages/marketing/src/domain/publication/publication.ts).
- [Publicador Meta](../../../../../../../../packages/marketing/src/infrastructure/gateways/meta/meta-publisher.ts) e [capacidade da conta](../../../../../../../../packages/marketing/src/domain/social-account/social-account.ts).
- [Métricas Meta](../../../../../../../../packages/marketing/src/infrastructure/gateways/meta/meta-metrics-source.ts).
- [Medição do funil](../../../../../../medicao-funil.md).

Na implementação lida, feed, carrossel e Reels do Instagram têm caminho de publicação automática condicionado à conta e ao serviço. **Stories são manuais no app atual.** Isso descreve o Sistema Zero; não é uma afirmação de impossibilidade universal em APIs de terceiros. Há comentário antigo no código com essa generalização, que não foi adotado como fato nem alterado nesta tarefa editorial.

Posso preparar um pacote completo para esse fluxo: arquivos finais, texto, capa, destino, horário proposto e checklist. Para cadastrar ou agendar, preciso executar no app com acesso e instrução correspondentes. Nesta entrega, tudo permaneceu nos documentos.

As métricas implementadas não garantem que toda informação sugerida no calendário esteja disponível na conta. Retenção, respostas de stories e certos recortes podem exigir consulta aos Insights ou exportação adicional.

## 5. Três fluxos recomendados para vocês

### Uma gravação vira várias peças

Entrada: tomada de Helena/Júlio, captura da atividade e prova do antes/depois. Entrega: um Reel principal, uma versão curta, capa, legenda, arquivo de legendas e quatro stories derivados. O mesmo argumento ganha versões adequadas ao formato; não se resume a republicar o mesmo vídeo.

Exemplo imediato: F01 mostra a aula; S01 apresenta a sequência de aprendizagem e S04 mostra o projeto oferecido; F04 usa o antes/depois para conversar sobre autoria. Isso reaproveita captação e muda a pergunta respondida.

### Uma função vira uma demonstração de valor

Entrada: um recurso acessível e um caso real. Entrega: sequência visual que liga **situação → orientação → ação → resultado → próximo passo**. Exemplo: passo da aula, diálogo do Zappy, primeira visualização, liberação da prática e teste da regra. A edição precisa preservar as conexões para o adulto entender o acompanhamento.

### Um mês vira aprendizado editorial

Entrada: calendário executado, arquivos/URLs, Insights e dados do funil disponíveis. Entrega: relatório do que foi compreendido, do que trouxe visitas qualificadas, das dúvidas recorrentes e do que cabe produzir. O próximo mês usa essa evidência, sem prometer causalidade a partir de poucos posts.

## 6. Como pedir a próxima entrega

Pedidos suficientemente concretos para começar:

- “Edite estas gravações seguindo F01. Entregue Reel vertical, capa, legenda e os recortes de S01/S04, mantendo a identidade atual.”
- “Produza o carrossel F08 em sete slides, com capturas da orientação da aula e distinção entre os dois usos do Zappy.”
- “Transforme a captura deste projeto em duas versões do F10 e nos quatro stories S10.”
- “Use os dados dos últimos 28 dias para comparar os conteúdos por função e preparar o próximo calendário.”

Quando faltarem arquivos, acesso, identidade ou uma condição comercial, eu identifico a dependência específica. Roteiro não será apresentado como vídeo pronto; projeto editável não será apresentado como render conferido; arquivo final não será apresentado como publicação realizada.

## 7. Habilidades do Fluxo Criativo usadas nesta entrega

As skills **marketing-sistema-zero, pesquisa-mercado, conteudo-editorial, estrategia-produto e revisao-copy** orientaram a entrega; análise de métricas e criativos complementaram o plano de operação. Os procedimentos de `/marketing`, `/pesquisa-mercado`, `/copy-social` e `/carrossel` foram lidos e aplicados por meio das skills no Codex. Esses comandos são atalhos de método, não executáveis de publicação.

Três frentes delegadas seguiram os perfis locais: pesquisa de mercado, auditoria do produto e revisão do Instagram. A consolidação reescreveu os materiais executáveis e incorporou a correção de posicionamento sobre acompanhamento. O [inventário do pacote](../../../../../../../../.agents/marketing/README.md) explica a equivalência entre os agentes/comandos do Claude e as skills usadas aqui.

As skills de vídeo, imagens e Pippit foram **avaliadas para este relatório**, sem iniciar seus fluxos de geração. Ter essas instruções amplia o que posso preparar; configuração, mídia fonte e validação continuam parte de cada execução real.
