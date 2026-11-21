# Transformando o vilão em aliado: publicação de 21/11/2026

O usuário autorizou a publicação do curso Kids para pais em staging e produção e a atualização do bloco do presente para quem já possui o curso.

## Conteúdo

| Item | Staging | Produção |
| --- | --- | --- |
| Curso | `780b2167-c74a-4f87-8dc7-305455b0230c` | `3edc936c-5b72-4dd9-9c33-0b66e44d5a8b` |
| Público | Kids, `learner=parents`, fora da Jornada | Kids, `learner=parents`, fora da Jornada |
| Situação do curso | Publicado: sete aulas | Publicado: sete aulas |
| Vídeos finalizados | 23 de 23, Vimeo do ambiente | 23 de 23, Vimeo do ambiente |
| Capas | 23 imagens enviadas; 23 partes com capas vinculadas | 23 imagens enviadas; 23 partes com capas vinculadas |
| Apostila | PDF privado de 19 páginas, capa nova e modelo do certificado | Mesmo PDF, armazenamento privado de produção |
| Certificado da Aula 7 | Imagem base fornecida pelo usuário | Mesma imagem, CDN de produção |

Origem: `C:/Users/tocha/Downloads/Transformando o vilão em aliado/FINALIZADAS`. A Aula 2 Parte 4, **Mais tempo de tela?**, foi entregue durante a operação, enviada aos dois ambientes e validada no Vimeo (125 segundos). As sete aulas foram publicadas pelo serviço canônico de autoria, sem erros de validação, antes da publicação do curso. Contagens de partes por aula: 2, 4, 3, 3, 4, 4, 3.

Capas dos vídeos aplicadas no Vimeo e nos posters dos blocos. Todos os uploads mantêm privacidade por domínio e download desabilitado. A autorização explícita de `kids.sistemazero.com.br` foi adicionada aos vídeos de produção. PDFs permanecem privados; uploads de materiais foram conferidos por SHA-256 após leitura do armazenamento. Foram removidas 20 cópias redundantes criadas por um processo de upload interrompido que continuou em segundo plano; os vídeos referenciados foram preservados.

## Presente

Campanha `vilao-em-aliado-cade`, oferta `cade-todo-mundo-7-dias`: sete dias contados desde a ativação, um perfil de criança, Cadê Todo Mundo e os direitos de Mural definidos pela oferta. O resgate gratuito usa o bloco `gift`; não abre compra nem solicita cartão. O preço comercial da oferta não foi alterado. O presente não integra os requisitos de conclusão nem do certificado.

O bloco consulta direitos ativos da conta. Uma chave ativa de todos os cursos da audiência, inclusive presente ou concessão manual, ou um direito pago/manual para o curso gera a apresentação **já incluído no seu acesso**, com acesso a Família no Kids. A assinatura adulta, o direito de comunidade e outros cursos não são confundidos com o Cadê Kids. Um presente anterior conserva seu histórico e sua data de fim. Falha na consulta impede novo resgate. A interface descarta respostas antigas e invalida o estado ao trocar de origem, modo ou prévia.

Em staging, uma conta sintética e um curso de QA arquivado confirmaram pela interface: presente disponível sem acesso prévio, repetição sem alterar vencimento, apresentação de acesso incluído e navegação para Família sem novo resgate. O curso de QA não foi colocado no catálogo público. As conferências de produção e a limpeza das contas ficam registradas nas evidências privadas da operação.

A política do gateway de produção ainda não incluía as leituras comerciais do responsável que já existiam em staging. Foi levada somente essa permissão: GET de `/members/commerce/access` e `/catalog/member-promotions`. A regressão falhou na versão anterior e passou com a correção. Os 323 testes do Gateway e a checagem de tipos passaram; dois testes opcionais que exigem Redis permaneceram ignorados.

Depois da implantação, o navegador de produção confirmou `included`, ausência de novo resgate e navegação para Família. A conferência foi feita também em celular. As duas contas sintéticas foram bloqueadas novamente, os dois cursos de QA permaneceram arquivados e as concessões temporárias foram revogadas. Nenhuma cobrança foi criada.

| Serviço da operação | Staging | Produção |
| --- | --- | --- |
| Members | `7ed60455-2d47-41ad-8cee-f91000cdc2ab`, SUCCESS | `822b89bd-1a5d-44b9-a06e-d0ab7492c045`, SUCCESS |
| Kids | `075dfe06-3a7f-4bc0-9424-d000f3ccfdbe`, SUCCESS | `ab2164e9-574e-46ab-8963-aef2f4b724e9`, SUCCESS |
| Payments | `c8d96c31-adf5-42fa-a067-fc4c41f66466`, SUCCESS | `5bbb8797-483f-4a96-8629-1011ee862363`, SUCCESS |
| Gateway | Permissão já publicada no ambiente | `83d29a5e-e3ff-42a8-aebe-d2e1954a9224`, SUCCESS |

A página `/kids/vilao-em-aliado` está publicada nos dois funis. A campanha `vilao-em-aliado` entrega exclusivamente o minicurso dos pais, sem expiração e sem Mural. A oferta operacional `transformando-o-vilao-em-aliado-presente` está pausada para impedir checkout; o centavo mínimo exigido pelo cadastro comercial não é cobrado no resgate. A campanha tem fim em 01/01/2030. O endereço comercial foi gravado no curso após conferir HTTP 200.

| Funil | Deployment |
| --- | --- |
| Staging | `6639f26f-4263-4c77-8401-61cc17bd47a2`, SUCCESS |
| Produção | `27ff426b-6b93-4552-9771-7866428ae5b6`, SUCCESS |

A conta indicada pelo usuário tinha a renovação paga de 14/11 e período confirmado até 14/12, mas os direitos ainda venciam em 17/11. A entrega do ciclo ao Gateway havia encerrado após oito respostas 401. A reentrega assinada do evento original, com o período já confirmado pelo Payments, passou pelo Gateway, Funil e Members e restaurou os direitos até 17/12 (período e carência vigentes). O catálogo da conta confirmou acesso liberado e o curso na lista própria. Não houve concessão manual, nova cobrança, alteração de plano, preço ou calendário financeiro. A auditoria dos demais períodos pagos Kids atuais não encontrou outra assinatura com direitos vencidos. Dados pessoais e comprovantes operacionais ficam no cache privado.

## Código e verificação

Fontes isoladas a partir das versões publicadas por ambiente. A atualização mais recente de staging foi incorporada para preservar as alterações concorrentes de cenários. Arquivos editoriais e provas foram excluídos dos arquivos de deploy com as mesmas regras do `.dockerignore`; nenhum segredo entrou no contexto. O upload inicial excessivo foi recusado antes de criar um deployment e foi corrigido pelo empacotamento do contexto canônico.

- PR de staging: https://github.com/informach/sistema-zero/pull/277, integrado em `9c275db45f2edf2462cdd03695587b4ca09c5e0a`.
- PR de produção: https://github.com/informach/sistema-zero/pull/278, integração automática habilitada após as checagens obrigatórias.
- 28 testes de rotas, acesso e formulário passaram antes da publicação; mais cinco casos de componente reproduziram as falhas de estado anterior e passaram após a correção.
- Integração com a versão recente de staging: 61 testes direcionados aprovados, incluindo as regras de cenários preservadas.
- Tipos de Members e Kids aprovados; build de produção do Kids aprovado sem desativar verificações.
- 32 testes editoriais dos cursos para pais aprovados. Capa, página do certificado e PDF de exemplo de emissão inspecionados visualmente.
- Cartão real conferido em desktop e celular, com os estilos compartilhados do Kids.
- Vimeo: duração, privacidade, domínio e capa das 23 partes conferidos em cada ambiente. Uma parte de cada uma das sete aulas reproduzida no navegador no domínio real do Kids de produção. As capas foram reativadas após o processamento, que havia substituído algumas por miniaturas automáticas.

Evidências e operadores privados: `.cache/vilao-publicacao-20261121/`. As senhas sintéticas e links temporários ficam somente no cache ignorado.

## Verificação final após publicação

- Sete aulas publicadas nos dois ambientes, com 23 vídeos disponíveis, capas e durações conferidas.
- Página pública: 680 testes do Funil passaram (cinco opcionais ignorados), tipos e build aprovados; navegador local em quatro larguras, cadastro e estados aprovados nos dois fontes isolados.
- A conferência real do download encontrou `STUDENT_SESSION_REQUIRED` para a sessão do responsável. Correção permite a sessão parental somente nos GETs de anexo e e-book, preservando os guards de uploads, identidade, validade e autorização de conteúdo do Members. Regressão reproduzida antes e aprovada depois.
- A conferência do navegador após essa correção e a limpeza final ficam nas evidências privadas da operação.

## Recuperação durável da renovação

O worker encerrava em DEAD uma renovação paga após oito falhas HTTP. O evento de 14/11 da conta indicada tinha parado assim, com HTTP 401. A assinatura e o período pago eram válidos; a reentrega atual confirmou a comunicação autenticada em todas as bordas.

`payment.paid` com `subscriptionId` e `payment.subscription_period_confirmed` agora permanecem PENDING após o teto, com backoff limitado a uma hora. O worker relê o consumer, assina cada tentativa, conserva o mesmo evento e grava `webhook.renewal_delivery_pending` em nível de erro. A retenção já preserva PENDING. Não se cria pagamento, período ou concessão manual. Destinos ausentes e eventos fora dessa regra mantêm o comportamento anterior.

Tipos de Payments aprovados; 442 testes passaram, 219 casos dependentes de infraestrutura permaneceram ignorados. As regressões reproduziram 401 e 500 no limite e passaram após a correção; a recuperação também foi testada após 1.000 tentativas com o mesmo corpo/evento. Em produção, a entrega original foi recolocada na fila pelo repositório canônico e o worker publicado a concluiu na tentativa 9, com HTTP 200, sem mudar o vencimento já restaurado. Nenhum outro período pago Kids vigente tinha acesso vencido na auditoria.

## Provas do curso real

Navegador autenticado em staging e produção: curso na Área dos pais, primeira aula, download privado da apostila com marca d’água, reprodução da Aula 2 Parte 4, emissão e download do certificado e cadastro público ativo. O certificado foi emitido antes de ativar o presente. O resgate em produção durou sete dias; o resgate antigo da conta sintética de staging manteve seu vencimento original. O estado `included` foi conferido na Aula 7 real nos dois ambientes com chave manual: desktop e celular, navegação para Família e nenhuma nova chamada de resgate.

As 16 verificações do curso para pais incluem explicitamente assinatura, chave manual e chave recebida de presente. Os três casos abrem catálogo, lista própria e aula. Os testes do bloco incluem as três origens da chave. A suíte do member-shell passou com 2.461 testes usando o diretório do pacote e seu preload canônico; o comando a partir da raiz não carrega esse preload e não é a forma válida da suíte. Os builds do Kids de staging e produção passaram.


Rollouts finais do Kids concluídos com SUCCESS. O estado incluído foi conferido novamente após a troca das instâncias. As duas contas sintéticas voltaram a bloqueadas, as cinco concessões temporárias dessa rodada foram revogadas e os dois certificados de ensaio ficaram revogados. O presente antigo de staging foi preservado. O curso usado para gravar a Aula 7 em staging (`qa-gravacao-vilao-aula7-20261120`) foi arquivado para sair do catálogo; matrículas existentes continuam válidas.

Formatação/lint global do fonte isolado: 14.775 arquivos conferidos, nenhum erro; 308 avisos e 245 informações preexistentes da base. Nenhuma regra foi desativada.
