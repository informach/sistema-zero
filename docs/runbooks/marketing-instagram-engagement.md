# Operação das conversas do Instagram

O complemento pertence ao serviço marketing e à bancada compartilhada web/desktop. Não importa o backend do InstaAuto. Salvar texto, aprovar revisão, publicar e solicitar ativação são operações distintas. A instalação nasce com envio desligado. A entrega local não comprova capacidade de uma conta Meta nem autoriza um piloto público.

O protocolo mínimo do desktop passa a 2 porque o documento editorial estrito agora admite a ficha de conversa. Atualizar os clientes antes da liberação do servidor; clientes antigos bloqueiam a sincronização e preservam rascunhos. O cliente novo também consegue sincronizar com o protocolo anterior enquanto a implantação é coordenada.

## Preparação e prova externa C0

1. Aplicar as migrações do marketing pelo procedimento habitual. A identidade da conversa usa `MARKETING_ENGAGEMENT_IDENTITY_KEY`, independente da chave que sela tokens. Gerar uma chave aleatória de pelo menos 32 caracteres e guardá-la no mesmo inventário seguro de recuperação. Não trocá-la sem migrar as identidades de supressão.
2. Configurar o app Meta já usado pelo publicador, sua versão Graph e `META_ENGAGEMENT_VERIFY_TOKEN`. Habilitar `META_ENGAGEMENT_OAUTH_ENABLED` para solicitar os escopos adicionais e reconectar explicitamente a conta. A conexão nova invalida provas antigas; renovação normal de token conserva a identidade da conexão.
3. Configurar no painel Meta o webhook HTTPS exato `/marketing/webhooks/instagram`, passando pelo gateway. Confirmar o desafio GET e a assinatura POST. Inscrever a conta nos campos de comentários e mensagens/postbacks aplicáveis à modalidade Facebook Login utilizada. A configuração e a assinatura devem ser verificadas na documentação oficial vigente; a lista de permissões no código não substitui revisão do app ou liberação para o público pretendido.
4. Usando exclusivamente participantes que autorizaram o teste, comprovar: comentário no post da conta, resposta privada, botão interno, continuação após interação, resposta humana, recebimento durável e interrupções. Registrar conta, conexão, versão, público autorizado, responsável, data, identificadores dos testes e evidências. Verificar também ecos de respostas externas. Sem essa observação, selecionar “assumir aqui antes de responder fora”.
5. Registrar na configuração do canal a evidência e as janelas realmente comprovadas. A prova expira em até sete dias; os tetos técnicos são 168 horas para resposta privada e 24 horas após interação, sem ampliar o que foi comprovado. A documentação do provedor pode exigir limites menores. Falhas mantêm a capacidade indisponível.
6. Conceder permissões explícitas por conta. Administração global permite configurar o canal, mas não concede leitura das DMs. Leitura editorial não concede leitura de atendimento. Pessoas inativas não podem receber permissões nem despachar novas respostas manuais.

Os testes locais usam um adaptador controlado e **não são evidência C0**. A aplicação não testa uma conta real automaticamente nem envia mensagens ao salvar uma prova. `MARKETING_ENGAGEMENT_SEND_ENABLED=true` é uma configuração operacional separada e só deve ser aplicada após a prova real e a autorização do piloto.

## Piloto C3 e revisão C4

A conferência da oferta tem validade de no máximo sete dias ao aprovar. Reabrir o destino e verificar promessa, preço, disponibilidade e condições em cada renovação; uma mudança material exige pausar a ativação e criar outra revisão. A manutenção bloqueia planos vencidos automaticamente. O software não presume que um HTTP 200 comprova o conteúdo comercial de uma página.

Escolher uma única peça vigente MC01–MC14 e uma conta. Copiar os textos da fonte editorial, conferir a oferta e definir sua validade. O risco da palavra PRIMEIRO de MC08 permanece visível; não renomeá-la silenciosamente. As seis entradas históricas PASSO/APOIO/IDEIA/TESTE/CRIAR/ROTINA não devem ser importadas como campanhas ativas.

Aprovar a revisão exata. Selecionar sua publicação e conferir explicitamente palavra, promessa e oferta. A solicitação aguarda prova de propriedade do post; stories não são elegíveis. Quando já houver outra revisão ativa no post, pausar essa ativação antes de solicitar a substituição. Jornadas antigas mantêm a revisão original e param quando ela é suspensa ou vence. Edição do rascunho nunca altera mensagens em andamento.

Durante o piloto, manter operador disponível, limite inicial baixo (30 envios/hora por conta por padrão) e conferir a fila. O botão “Ver o projeto” é a única continuidade comercial automática. Texto livre encaminha à equipe. Silêncio não gera lembrete. Site externo não é evento de compra. Parar, aluno, criança, atendimento e conta indisponível impedem novas apresentações.

Para responder pelo Instagram ou outro aplicativo, assumir antes na bancada, salvo quando ecos externos tiverem sido comprovados. Uma chamada já iniciada pode terminar depois de uma pausa: conferir o histórico antes de tentar outra resposta. “Aceito pela Meta” não significa entregue ou lido. Uma falha inequívoca vai à equipe; timeout, resultado incompleto ou queda do executor ficam incertos, sem retry automático. Apenas rejeição explícita por limite de taxa admite até três tentativas, cada uma sujeita à revalidação.

Resolver envios incertos com evidência do histórico externo. Uma nova solicitação após supressão exige conferência humana dentro da janela. Criança e exclusão não podem ser revertidas. A retomada de uma abertura interrompida pede novo toque no botão e pode enviar R01 uma única vez; não libera DM2 por um clique antigo. Novo comentário no mesmo post não reinicia a resposta privada já tentada. Uma solicitação explícita no direct pode iniciar outra jornada após a conferência apropriada.

Não recarregar a tela enquanto houver comando sem confirmação: o botão “Consultar a mesma tentativa” reutiliza sua identidade sem duplicar a operação. Se a tela já tiver sido fechada, conferir o histórico do servidor antes de criar outra resposta. Comandos e mensagens privadas ficam apenas em memória no cliente; não entram no journal offline ou no cache editorial.

A expansão C4 exige avaliação da operação e dos resultados do piloto. Registrar amostra, período, falhas e motivos; não declarar aumento de conversão só porque o mecanismo funciona.

## Fila, métricas e limites de interpretação

O worker recebe no servidor mesmo com o desktop fechado. Verificar na inbox entradas pendentes, idade da mais antiga, respostas pendentes/em envio/incertas, falhas e atendimentos. Durante o piloto, investigar entrada pendente por mais de dois minutos, qualquer resultado incerto e falhas recorrentes. Pausar a conta se o responsável não puder acompanhar. Os logs `engagement.worker.failed` e `engagement.binding.unavailable` não contêm texto privado ou tokens. As contagens da fila não comprovam que a Meta está enviando todos os eventos; o teste externo periódico continua necessário.

O resumo da peça é uma coorte de jornadas iniciadas no período, com o estado atual dos envios e classificações. Temas e desfechos contam conversas distintas, escolhidos pela equipe; não são classificação por IA. O relatório comercial consulta somente agregados do funil por origem/campanha/conteúdo, sem IDs de pessoas. Sessões e leads preservam suas próprias primeiras origens. A janela de conversão é de sete dias após criação do lead; compra confirmada é deduplicada por pagamento. Leads antigos ou de outra origem aparecem separadamente, assim como pagamento sem identidade e valor ausente. Receita conhecida não inclui estornos, renovações ou valor não registrado. Coortes recentes ainda podem mudar; não comparar contagens como taxa de conversão individual.

Ausência de eventos observados mostra cobertura ausente, não zero sessões. Falha do serviço mostra indisponibilidade. Períodos são limitados a 90 dias; peças com mais de vinte combinações de campanha/conteúdo exigem consulta analítica mais específica. A interface mostra agregados por combinação e não deve somar o mesmo pagamento entre relatórios sobrepostos.

As origens consultáveis vêm dos planos imutáveis das ativações da peça; um rascunho não concede acesso a outra campanha. O relatório restringe `utm_source=instagram` e `utm_medium=dm`, evitando misturar anúncios com as conversas. A saída D02 usa sua própria origem `d02_comunidade`: seus resultados não são atribuídos à peça por inferência nem somados ao relatório da oferta principal.

## Retenção e exclusão

Mensagens são retidas no servidor por 1–90 dias configuráveis (padrão 90). O ciclo de manutenção remove payloads vencidos, IDs externos e destinatários cifrados inativos; mantém contadores e a identidade HMAC mínima necessária à supressão/deduplicação. Identidades de eventos expiram após 180 dias, quando o limite de idade já impede reprocessamento. Recibos de comandos contêm hash e resultado de estado, sem texto privado.

Excluir uma conversa remove conteúdo e mantém bloqueio mínimo. Identificação como criança remove conteúdo e categorias; conserva o destinatário cifrado somente enquanto a saída C01 já autorizada ainda estiver pendente/em execução. Nenhum dado recebido posteriormente reabre esse bloqueio. A exclusão do conteúdo nesta aplicação não apaga o histórico mantido pela Meta. Backups anteriores seguem o prazo de retenção de backups da instalação e precisam de acesso restrito.

## Parada e recuperação

Pausar a ativação interrompe aquela campanha. Desabilitar o canal cancela pendências da conta. Desligar globalmente os envios e reiniciar o serviço cancela pendências e bloqueia ativações no próximo ciclo; reabilitar a variável não retoma campanhas sozinho. Uma requisição HTTP já iniciada pode ter efeito externo e deve ser reconciliada.

Restaurar somente em banco vazio e serviço parado, pelo comando de backup existente. A quarentena desabilita contas e canais, apaga provas, pausa ativações, cancela pendências, transforma envios iniciados em incertos e impede replay de entradas restauradas. Recuperar ambas as chaves, manter envio global desligado, conferir os resultados externos posteriores ao snapshot, reconectar a conta, refazer C0 e solicitar retomada explícita. Não apagar linhas de supressão, recibos ou intenções para “destravar” a fila.

Rollback de código deve manter as migrações aditivas e os dados de supressão. Primeiro desligar envio e aplicar quarentena/pausa; depois reverter a versão do serviço. Não executar downgrade destrutivo das tabelas de conversa.
