# Oficinas ao vivo — infraestrutura existente e custo operacional

14/10/2026. Revisão da escolha técnica após a orientação de evitar outro fornecedor pago e aproveitar Railway/Cloudflare. Complementa o [produto](2026-10-14-aulas-ao-vivo-design.md) e a [arquitetura](2026-10-14-aulas-ao-vivo-arquitetura.md). Esta decisão substitui a preferência anterior pela Daily; nenhuma conta, contratação, implantação ou cobrança foi ativada.

## Recomendação atual

Desenvolver a aplicação de sala e o gravador do Sistema Zero, usando **Cloudflare Realtime SFU/TURN para transporte**, backend existente para autorização/negócio e **R2 privado para replay**. Validar o gravador em container isolado no Railway; Cloudflare Containers é alternativa dentro dos fornecedores existentes, sem presumir compatibilidade ou custo equivalentes.

Isso dispensa Daily como dependência principal. Continua sendo uma arquitetura com transporte gerenciado pela Cloudflare: não significa que construiremos codecs, protocolos de criptografia ou uma rede mundial de vídeo. Essas bases serão reaproveitadas de WebRTC e bibliotecas existentes. Se a intenção futura for operar também o servidor de distribuição de mídia, avaliar LiveKit self-hosted; é outro compromisso operacional.

O objetivo econômico é diminuir gasto recorrente aproveitando a infraestrutura existente, mantendo gravação automática e acompanhamento individual. Não prometer custo adicional zero: processamento, memória, armazenamento, tráfego e manutenção continuam existindo. A franquia de um produto Cloudflare não cobre automaticamente os demais.

## Alternativas avaliadas

| Caminho | O que construímos/operamos | Avaliação para este projeto |
| --- | --- | --- |
| **Aplicação própria + Cloudflare Realtime SFU** | Sala, autorização de mídia, reconexão, controles, gravador e replay; Cloudflare encaminha mídia | Preferência para a prova, aproveitando o fornecedor existente e cobrança por tráfego |
| LiveKit self-hosted | Sala integrada + servidor LiveKit, TURN, Redis, gravação e operação da infraestrutura | Alternativa se o objetivo incluir operar o SFU; exige ambiente de rede adequado |
| Daily / LiveKit Cloud / RealtimeKit | Integração com mais recursos gerenciados | Referências de comparação; contratação não é requisito da proposta revisada |

Cloudflare distingue o SFU de baixo nível do RealtimeKit, que oferece SDKs de reunião. O SFU aceita backend de sinalização na infraestrutura existente; salas e permissões são responsabilidade da aplicação. A própria documentação recomenda RealtimeKit para acelerar conferências e identifica o exemplo de sala sobre SFU como experimental. Portanto, usar exemplos como referência, sem apresentá-los como produto pronto. [Visão geral](https://developers.cloudflare.com/realtime/sfu/), [guia inicial](https://developers.cloudflare.com/realtime/sfu/get-started/).

O LiveKit pode ser hospedado por nós e tem serviço separado de gravação. Seu desenho de produção prevê portas de mídia e TURN. A documentação pública do Railway descreve exposição HTTP/TCP; não obtive evidência de suporte equivalente a um servidor com portas UDP públicas controláveis. Não declarar LiveKit impossível no Railway, mas também não equiparar um template baseado em TCP a uma implantação validada para oito telas. Uma VM com controle de rede pode ser necessária nessa alternativa. [LiveKit self-hosting](https://docs.livekit.io/transport/self-hosting/), [portas](https://docs.livekit.io/transport/self-hosting/ports-firewall/), [gravação](https://docs.livekit.io/transport/self-hosting/egress/), [rede Railway](https://docs.railway.com/networking/public-networking).

## Como os componentes se conectam

```text
Criança / professora
  ├─ HTTPS → BFF / Gateway / Members no Railway
  │            ├─ inscrição, admissão, supervisão e permissões
  │            ├─ agenda, projetos, chat e participação
  │            └─ operações autorizadas na API do SFU
  └─ WebRTC → Cloudflare SFU/TURN → destinatários autorizados
                                    └─ gravador da aula
                                         └─ arquivos/segmentos → R2 privado
                                                                  └─ replay com prazo
```

A mídia não atravessa o Gateway HTTP nem passa pelo servidor de aplicação para cada aluno. O backend autoriza quem pode publicar e receber. A criança recebe a demonstração e câmeras voluntárias autorizadas, mas não os compartilhamentos privados de colegas. A professora recebe as telas de sua turma. O gravador só recebe a professora e a demonstração.

Toda operação de criação/assinatura/fechamento de trilha passa por uma política de negócio e vínculo com sessão/dispositivo. Não expor uma rota genérica que repasse chamadas arbitrárias à API Cloudflare nem enviar App Secret ao navegador. Tirar uma trilha da lista não encerra assinaturas existentes: revogação deve fechar publicações/recepções e impedir recriação. Essas responsabilidades são documentadas no modelo de sessões/trilhas do fornecedor. [Sessões e trilhas](https://developers.cloudflare.com/realtime/sfu/concepts/sessions-tracks/), [API de conexão](https://developers.cloudflare.com/realtime/sfu/api/).

Moderação traduz políticas do Members para operações de mídia: silenciar agora coordena parada local e fechamento necessário; manter bloqueado nega novas publicações de áudio, inclusive após reconexão. A ação preserva câmera/tela quando permitido. Expulsão fecha todos os recursos associados à identidade removida e impede novos. Falha parcial de fechamento precisa de retry e estado visível, sem considerar comando enviado como aplicado.

Para orientação visual, usar DataChannels autorizados ou transporte próprio de eventos, mantendo a validação de autoria/destinatário já prevista. Chat durável e permissões permanecem em Members. Não introduzir Durable Objects apenas por disponibilidade: só adotar coordenador de sala próprio se a prova indicar necessidade, preservando a autoridade de acesso no backend.

## Contratos adicionais para operar o SFU

**Negociação:** cada sessão WebRTC tem uma fila única de operações, concluídas somente após a troca SDP necessária. Entradas simultâneas, câmera, tela e moderação passam por essa coordenação; checar também resultados individuais de uma resposta. Em timeout, o resultado pode ser incerto: não repetir criação cegamente. Registrar tentativa/geração e recursos conhecidos; reconstruir a conexão quando não houver recuperação segura, descartando respostas antigas no estado corrente e recolhendo alocações tardias. Encerramento urgente retira a conexão de uso e fecha recursos, sem reabrir sua fila depois. [Negociação e recuperação](https://developers.cloudflare.com/realtime/sfu/concepts/negotiation/).

**Ciclo de cada trilha:** distinguir desligada, bloqueada, interrompida, expirada e publicando. A Cloudflare documenta coleta após 30 segundos sem pacotes; uma conexão ainda existente não garante que a publicação continue válida. Restaurar exige recriar o necessário e reconstruir assinaturas autorizadas, inclusive do gravador. Não confundir esse limite com a tolerância pedagógica à ausência docente. [Limites de mídia](https://developers.cloudflare.com/realtime/sfu/platform/limits/).

**Qualidade:** o SFU pode selecionar camadas de simulcast que o publicador realmente enviar; não cria qualidade baixa porque o cartão ficou pequeno. Configurar e ensaiar camadas/fallback por assinatura, inclusive quando a preferida desaparece. Perfis iniciais de câmera, tela no mosaico, tela ampliada e gravação devem ter tetos medidos de resolução, quadros e bitrate. Simulcast também aumenta trabalho de codificação no aparelho infantil. Se uma fonte não suportar camadas adequadas, ensaiar publicação única limitada e troca de perfil autorizada, sem prometer alta resolução simultânea para todos. [Simulcast](https://developers.cloudflare.com/realtime/sfu/features/simulcast/).

**Orientação privada:** o contrato de canais por destinatário está na seção 8 da arquitetura. Compartilhamento coletivo de mensagens com filtro apenas no navegador não atende ao isolamento. Chat, consentimento, mãos e autoria continuam persistidos/autorizados em Members, independentemente do canal visual efêmero.

## Falha dos controles com transmissão ainda ativa

WebRTC pode continuar transportando mídia quando BFF/Members estiverem indisponíveis. Expirar nosso heartbeat não encerra automaticamente essa transmissão. [Limites do SFU](https://developers.cloudflare.com/realtime/sfu/platform/limits/).

Proposta operacional: manter estado explícito de disponibilidade dos controles. Sem confirmação recente, negar novas entradas/publicações, suspender assistência e não apresentar comandos como concluídos. Clientes cooperantes pausam comunicação após tolerância definida, conservam trabalho local e avisam quando não conseguem salvar na conta. Retorno reconcilia política, participação, revisões e recursos antes de liberar novas ações; não reativa dispositivos por padrão.

Antes do piloto infantil, validar um supervisor de limpeza independente da instância principal que caiu. Um Worker Cloudflare é candidato: recebe registros mínimos de conexões/recursos e limites da ocorrência, autenticados, antes de autorizar distribuição; pode fechar recursos conhecidos quando a concessão operacional deixa de ser renovada. Dados pedagógicos e autorização de novos acessos continuam em Members. O supervisor precisa tratar recursos tardios, encerramento parcial e sua própria indisponibilidade, com armazenamento/acionamento duráveis e medição de custo; um timer em memória no mesmo processo não basta. Se a prova exigir coordenação adicional, escolher seu mecanismo explicitamente, sem presumir que Redis ou Durable Objects já estão prontos.

Definir no ensaio os intervalos de heartbeat, suspeita, suspensão e encerramento, testando também abas em segundo plano para evitar falsos positivos. Não prometer revogação imediata contra clientes não cooperantes quando os controladores estiverem indisponíveis ou não conseguirem concluir operações no fornecedor; o SFU pode continuar transmitindo mesmo nessa situação. Registrar essa limitação, detectar falha e ter procedimento de encerramento/suporte. A prova só aprova o piloto quando os tempos observados e as falhas residuais forem conhecidos.

## Bibliotecas e recursos propostos

- **WebRTC nativo:** `RTCPeerConnection`, captura de câmera/tela e estatísticas. Construir o adapter de conexão, reconexão e seleção de qualidade sobre essas APIs e a API Cloudflare.
- **PartyTracks:** candidato de biblioteca auxiliar da Cloudflare para integração de trilhas. Avaliar versão, manutenção e capacidade de aplicar nossa autorização; não instalar nem depender de um proxy permissivo do exemplo. [Repositório](https://github.com/cloudflare/partykit/blob/main/packages/partytracks/README.md).
- **Gravador próprio:** candidato inicial com receptor WebRTC baseado em Pion e processamento/composição por FFmpeg; alternativa de composição em Chromium isolado a avaliar no ensaio. Pion implementa WebRTC em Go, enquanto FFmpeg entra no processamento de mídia; FFmpeg sozinho não substitui negociação e recepção WebRTC. [Pion](https://github.com/pion/webrtc), [FFmpeg](https://ffmpeg.org/documentation.html).
- **Desfoque/fundo:** processamento local com modelo de segmentação, candidato `@mediapipe/tasks-vision`, seguido de composição da câmera. Validar modelo/licença, consumo e compatibilidade; hospedar os recursos permitidos e evitar bloquear a thread do Estúdio. Não manter uma dependência Daily só para o efeito. [MediaPipe web](https://developers.google.com/edge/mediapipe/solutions/vision/image_segmenter/web_js).

Uma biblioteca de mídia pronta reduz trabalho, mas não garante nossa experiência: continuam necessárias as permissões por criança, ajuda com edição, identidade visual, preservação de projetos e integração com replay.

## Gravação automática sem aplicativo da professora

O botão **Iniciar encontro** também agenda um job de gravação. Um serviço isolado ingressa como receptor técnico, limitado às trilhas da professora/demonstração, e produz segmentos duráveis. Não recebe chat, nomes, câmeras ou áudio infantil. A aplicação mostra Gravando somente depois de confirmar recepção e escrita efetivas.

O gravador precisa tratar sincronização áudio/vídeo, codecs, troca de trilhas, pausas de atendimento, reconexão e encerramento. Salvar segmentos e manifestos progressivamente no R2, com sequência/checksum/idempotência e limite de buffer. Não manter a aula inteira em RAM nem aguardar o fim para a primeira cópia durável. Falha de upload deve preservar os trechos recuperáveis e alertar; não afirmar replay completo quando houver lacunas.

Vincular cada job/segmento à ocorrência de chamada, com exclusividade por geração para evitar dois gravadores capturando após retry/restart. O controle **Ajudar no projeto** espera a confirmação de interrupção; **Voltar à explicação gravada** retoma entradas autorizadas. A pausa exclui esse atendimento do replay, mas o áudio continua coletivo na V1. Diferenciar falha inesperada de uma pausa intencional e conferir a cobertura das explicações antes de publicar.

Encerrar encontro finaliza o job e os arquivos; seguem processamento, conferência e publicação já definidos. O prazo é o mesmo grant por aula. O usuário não instala programa nem precisa enviar o vídeo manualmente. Cópia local na máquina da professora pode ser contingência futura, mas não substitui o gravador de servidor no compromisso atual.

No Railway, esse serviço se conecta **como cliente** à rede de mídia; isso é diferente de hospedar o SFU com portas públicas. A prova deve confirmar conectividade de saída e fallback TURN, codecs e limites do container. Se usar Chromium, confirmar isolamento e recursos necessários, sem relaxar segurança para fazer um exemplo funcionar. Não reutilizar o sandbox de compilação do Estúdio para gravar aulas.

Processamento pesado deve existir somente durante gravação/finalização. Planejar preparação antecipada, fila, concorrência máxima e desligamento; um processo ocioso permanente ainda pode consumir RAM cobrada. Separar limites do gravador dos serviços de autenticação e projetos, para uma aula não esgotar a plataforma.

## Custo: o que pode ser coberto e o que precisa ser medido

O SFU/TURN da Cloudflare compartilha **1.000 GB gratuitos por mês**, com **US$ 0,05/GB excedente**. Workers, Durable Objects, Containers e outros produtos têm preços separados. Isso é um produto diferente do RealtimeKit e não usa a tabela por minuto de participante apresentada anteriormente. [Tarifas SFU/TURN](https://developers.cloudflare.com/realtime/sfu/platform/pricing/).

Simulação de tráfego, não previsão medida: se uma aula de 75 minutos gerar **25 Mb/s de saída agregada**, somando todos os destinatários e o gravador, serão cerca de **14,06 GB**. Vinte e quatro aulas assim consumiriam **337,5 GB**. Com 50 Mb/s, seriam **675 GB**. Ambos caberiam na franquia disponível; câmeras, resolução, compartilhamentos, retransmissões, outros usos da conta e número de turmas alteram o resultado. Conferir a medição faturável no painel; não usar apenas tráfego da professora como estimativa da turma.

Railway cobra CPU, RAM e saída de dados conforme uso. Na tabela de containers consultada, CPU é US$ 0,000463 por vCPU/min e RAM US$ 0,000231 por GB/min. Exemplo aritmético: um gravador que efetivamente use em média 2 vCPU e 2 GB por 75 minutos teria aproximadamente **US$ 0,104 de CPU/RAM**, antes de inicialização, finalização, ociosidade, armazenamento e rede. **Não é benchmark nem orçamento:** o gravador ainda não existe e pode precisar de mais recursos. A franquia restante do plano do usuário não foi consultada. [Preço Railway](https://docs.railway.com/pricing/plans).

R2 mantém cobrança própria de armazenamento/operações; sua tabela informa saída de dados sem tarifa de egress. Isso não elimina operações, Worker de entrega nem saída Railway no envio do arquivo. Incluir segmentos temporários e arquivos finais no cálculo; não multiplicar cada visualização pela tarifa de tráfego do SFU. [Preços R2](https://developers.cloudflare.com/r2/pricing/).

Preparar relatório por ocorrência com bytes, tempo de CPU/RAM, segmentos, tamanho final e falhas, seguido de projeção mensal. Medir separadamente gravação, consumo no navegador, polling, supervisor e armazenamento histórico de projetos. Alertas de orçamento devem avisar antes do limite; não derrubar uma aula em andamento silenciosamente para cumprir um teto.

O ganho potencial é trocar a tarifa do serviço completo por consumo da infraestrutura existente. O custo de desenvolvimento e manutenção aumenta, principalmente em reconexão, moderação efetiva e gravação. É preciso comparar custo total depois da prova; auto-hospedar não é automaticamente mais barato em todo volume.

## Critérios de robustez antes do piloto

1. Oito crianças e professora criando, compartilhando e usando câmera opcional com qualidade adaptativa, em equipamentos e redes comuns.
2. Isolamento de telas e gravação comprovado também por tentativa de solicitar trilha indevida; identidade não vem do payload do aluno.
3. Microfone bloqueado continua bloqueado em reconexão/segunda aba; encerramento e revogação fecham recursos reais.
4. Falha de rede recupera o trabalho e a chamada sem duplicar participantes ou permitir comandos de sessão antiga.
5. Matar/reiniciar o gravador preserva segmentos já confirmados, informa lacunas e impede publicação enganosa; testar sincronização do arquivo final.
6. Desfoque, gravação e Estúdio coexistem sem travamento; falha do efeito não expõe vídeo bruto.
7. Medição real de tráfego e compute, com limites de concorrência, detecção de sala/gravador abandonado e procedimento de suporte.
8. Negociações concorrentes e respostas perdidas não duplicam participação; após reconciliação/expiração dentro do prazo medido, não restam recursos órfãos conhecidos. Recursos ainda incertos permanecem visíveis para limpeza e custo. Publicação expirada é recuperada conforme a política vigente.
9. Interromper BFF/Members mantendo mídia conectada demonstra suspensão/limpeza, estado honesto dos controles e preservação local; testar também falha do supervisor.
10. Canal individual e tela de uma criança não são entregues a outra; troca de destinatário revoga recepções anteriores.
11. Projeto pesado não bloqueia controles da sala; checkpoints continuam restauráveis após novos commits e remoção de assets.

A próxima entrega técnica deve ser uma prova isolada dessas integrações, não o módulo inteiro. As escolhas de biblioteca do gravador e alocação de recursos permanecem condicionadas a esse resultado. Não fixar prazo ou economia garantida antes de medi-los.
