# Levantamento da publicação — 26/11/2026

Recursos publicados e conferidos em produção. O CI completo, o merge protegido e a publicação oficial do PR 296 terminaram. [Recibo consolidado](publicacao-consolidada-2026-11-26.json).

## Curso da Vivianne e link pessoal

Link sem data final: **https://sistemazero.com.br/i/vivianne-e8ez/frustracoes**. É da Vivianne Lima, já cadastrada como embaixadora, e identifica as vendas do curso para acompanhamento no Admin. Nenhuma campanha foi criada para esse link, e não há oferta de presente do curso da Vivianne.

O curso está cadastrado para responsáveis, fora da Jornada da criança, nos dois ambientes: cinco aulas e doze partes, com vídeos, capas e descrições resumidas. A Aula 1, Parte 2 fica em uma coluna: vídeo, materiais com a apostila para baixar e o resumo original. O bloco do livro 3D foi removido.

Capas do curso e das partes, apostila, certificado, imagens do checkout e três ilustrações da oferta ficam em `docs/aulas-interativas/pais/como-ajudar-seu-filho-autista-nas-frustracoes/`, com os manifestos, roteiros, originais e cópias para a web. A capa do curso é limpa e com enquadramento ajustado; a da apostila não fixa a quantidade de aulas. O PDF tem dez páginas; os nove miolos foram preservados. O certificado tem duas composições laterais baixas, espaço para os dados dinâmicos e as assinaturas oficiais de Helena Oliveira e Júlio Felipe, conferidas no serviço real nos dois ambientes. Registros de certificados antigos foram preservados na regeneração dos PDFs.

A Aula 5, Parte 2 foi substituída pelo MP4 corrigido em staging e produção, conservando os IDs do Vimeo e reaplicando as capas. A conferência dos roteiros cobriu os vinte tópicos dos nove slides apresentados no arquivo da aula dos pais.

## Ofertas e acesso

| Oferta de venda | Valor | Acesso |
| --- | ---: | --- |
| Cadê Todo Mundo Kids | R$ 37 | Um ano, com Mural Kids |
| Cadê Todo Mundo adulto | R$ 37 | Um ano, com Mural adulto |
| Transformando o vilão em aliado | R$ 27 | Um ano |
| Curso da Vivianne sobre frustrações | R$ 67 | Seis meses |

As vendas têm garantia de sete dias, aceitam cupom e não renovam automaticamente. Ao terminar o Cadê, o curso fecha e o Mural correspondente continua como visitante, para ver e jogar. Nos presentes com prazo, são quinze dias reais, sete divulgados e o aviso dos oito extras; os termos já registrados em resgates antigos são preservados.

As ofertas principais das páginas foram marcadas no catálogo, e os dois cursos dos pais têm sua Oferta de venda preenchida. As listas dos embaixadores têm as ofertas do público correto. Checkout e páginas usam as imagens do curso e preços do catálogo. A operação mantém onze opções nas listas de embaixadores e vinte e um modelos de mensagens ativos.

## Campanhas e benefício do guia

Em produção ficaram somente as campanhas reais Laopa de 13/11 e Guia de presente. A Laopa de 6/11 inexistente foi excluída do banco com backup e conferência de zero resgates, vendas, conversões e convites ligados a ela.

O Cadê da última aula do guia é um benefício permanente do curso, sem calendário de campanha. Quem tem acesso ao guia, comprado ou recebido de presente, pode ativar o benefício na conta autenticada. A ativação concede o prazo da oferta do Cadê e não renova ao revisitar a aula. Não depende do certificado.

A conversão preserva o código `vilao-em-aliado-cade`, os resgates e seus termos, arquiva o histórico e tira a campanha interna da lista de campanhas. O manifesto usa `benefitCode`. Os endereços antigos desse benefício levam ao curso autenticado, sem liberar resgate avulso público.

## Onde acompanhar e quais origens aparecem

Em **Admin → Origem das vendas**, selecionar o Cadê permite comparar resgates por campanha, link de embaixador e dentro do curso. Cada aquisição guarda sua própria origem; o primeiro contato do funil continua sendo outra informação.

No cadastro do guia, a aba **Benefícios** mostra totais, quem resgatou, quando, filtro por período, ficha da conta e exportação da página de resultados. O período filtra a consulta; não limita a disponibilidade do benefício.

Há duas informações separadas: a origem imediata do resgate do Cadê e a origem do acesso ao guia. A segunda usa a matrícula que realmente abriu a aula, ligada ao pagamento, resgate ou assinatura correspondente. Quando falta referência histórica, aparece “Origem não identificada”. O benefício não herda uma campanha ou embaixador por suposição. Dados pessoais e faturamento ficam restritos à administração.

O link pessoal atribui a venda do curso à Vivianne. A comissão automática continua seguindo a regra da primeira Comunidade elegível; comprar um curso avulso não cria automaticamente essa comissão. O prazo de atribuição por link é trinta dias, com a última origem válida registrada para aquela aquisição.

## Links que já foram divulgados

- `/kids/vilao-em-aliado`: até 26/12/2026 às 9h52 (Brasília), leva à campanha de presente; depois, à oferta paga do guia. São trinta dias de redirecionamento a partir da configuração.
- `/i/vilao-em-aliado`: continua seguindo o cadastro da campanha, até 31/12/2029.
- `/bolsa/laopa-20261113`: continua encaminhando ao presente do Cadê. Resgates até 12/12/2026 às 23h59 (Brasília).
- Link completo do cupom Laopa, com `oferta`, `publico` e `event_code`: continua encaminhando à oferta com desconto, com validade até 19/12/2026 às 23h59 (Brasília). A campanha identificada pelo evento também chega à origem da compra.

## Código, infraestrutura e publicação

A promoção foi seletiva. Os commits solicitados e os ajustes revisados de campanhas, ofertas, quarto, construção, páginas do guia/Vivianne e bio foram levados à produção sem promover a staging inteira. A revisão corrigiu problemas de reembolso/atribuição, expiração de cache, assinaturas de outro produto, origem financeira, navegação e salvamento do quarto. As mudanças da Nave e demais trabalhos não selecionados da outra frente ficaram fora dessa promoção.

As três variáveis novas do serviço de indicações foram cadastradas. O benefício permanente não exige variável nova. A configuração de infraestrutura desta leva tem zero alterações, mantém os disparos nativos de produção desligados e a versão canônica 4. Os leitores e escritores compatíveis sobem antes da conversão administrativa dos dados.

Os PRs 290, 291, 292 e 293 possuem seus recibos. O PR 293 concluiu a publicação oficial no run 45869619738, com CI aprovado. O benefício do guia e a atribuição dos links antigos de cupom estão publicados manualmente no commit 6c245bf73; a fonte ca7d5c6b2 difere somente no teste da última aula. O PR 294 foi substituído pelo PR 296, que reúne a fonte mais recente; o estado atual está no fechamento abaixo. O CI do PR 294 teve uma falha Windows ao iniciar um processo auxiliar em 500 ms; a repetição foi cancelada para consolidar a promoção. O CI completo do PR 296 passou nas treze etapas, incluindo as nove verificações exigidas, antes do merge protegido e da publicação oficial. Falhas históricas de acompanhamento que tiveram recuperação somente leitura ficam preservadas na auditoria; nenhuma mutação foi repetida para obter um recibo verde.

Os commits desta frente foram integrados à staging local para a publicação coordenada pela outra sessão. O benefício, seu manifesto e a oferta de seis meses foram conferidos na staging remota após essa publicação; o curso, as imagens, o certificado e o vídeo corrigido já haviam sido conferidos nos dois ambientes.

## Validação

Mais de onze mil testes nas sete suítes envolvidas, checagem de tipos dos sete pacotes e build do Funil. PostgreSQL real provou migração, concorrência, preservação de histórico e idempotência. O conversor operacional foi ensaiado pela API real em banco isolado. O navegador conferiu materiais, checkout sem cobrar, imagens, origens, filtros, CSV, bio e navegação/salvamento do quarto. Nenhum pagamento real nem mensagem de ensaio foi enviado.


[Registro do benefício e das duas origens](beneficio-permanente-guia.json). Backups com dados pessoais ficam fora do Git; o recibo registra somente hashes de integridade. Nenhum pagamento real ou e-mail de ensaio foi enviado.


## Workshop da Vivianne: seis meses e compartilhamento

O Funil foi publicado no commit `2237b3ea61118badaf0494bfcfe2325c78cc50d2`, deployment `d709a4b8-55e2-4b62-baa6-cf2cf9de6a32`. Após a saúde confirmada e retirada da versão anterior, a oferta existente passou de doze para seis meses, preservando identificador, preço de R$ 67 e garantia de sete dias. Nenhum pagamento ou acesso já concedido foi alterado. O nome técnico `-1-ano` foi mantido para preservar os vínculos; o prazo exibido e concedido às novas compras vem do catálogo.

Os selos dos cursos para pais dizem “Workshop para pais”. Onze páginas e sete cartões JPEG de compartilhamento foram conferidos; oferta e checkout reais mostram seis meses em 390 e 1440 px. Os textos de compartilhamento aprovados chegam também ao robô do WhatsApp, inclusive no endereço exato `/i/vivianne-e8ez/frustracoes/pagamento`, sem “Pagamento”. A variante `?utm_content=whatsapp-20261126` conserva a origem da Vivianne e o destino do checkout; pode ser testada em uma mensagem nova para solicitar outra prévia. Não foi feita verificação dentro do aplicativo WhatsApp, nem envio de mensagem.

O CI completo, o merge protegido e a publicação oficial da promoção consolidada também terminaram. O build manual desta atualização selecionou somente `funnel`. A regularização dos PRs 294 e 295 foi consolidada no PR 296, que contém os ajustes mais recentes. [Recibo desta atualização](publicacao-workshop-2026-11-26.json).


## Promoção consolidada e Jardim Secreto

O CI completo, o merge protegido e a publicação oficial do PR 296 terminaram. Os PRs 294 e 295 foram fechados e substituídos pelo [PR 296](https://github.com/informach/sistema-zero/pull/296), que reúne as mudanças selecionadas na fonte `fd8923232b6a73e925c176261664d5f652c0b891`. Os resultados anteriores e os cancelamentos ficam preservados no [recibo consolidado](publicacao-consolidada-2026-11-26.json). A staging inteira não foi promovida.

O objetivo do regador agora reconhece a memória gravada dentro de uma condição que pode abrir no primeiro encontro. No executor 3D, o personagem termina a aproximação com as caixas sobrepostas e aguarda os quadros do encontro. Os cenários corretos e os controles sem memória/sem guarda passaram localmente. O cenário de produção com o regador em outra posição e a coleta protegida passou nos cinco objetivos no próprio Worker de produção, sem alterar progresso de aluno.

A imagem Linux qualificada foi publicada nas duas classes de contêiner, com o mesmo digest dos testes. O primeiro envio expirou após publicar o código do Worker; o estado parcial foi inspecionado, e a retomada conhecida terminou com as duas imagens saudáveis. Os dois aquecimentos reais também passaram. A conferência de sete variáveis públicas não encontrou alterações; os segredos foram preservados.

As cinco aplicações da etapa final no Railway passaram pela saúde, pela retirada das versões anteriores e pela barreira canônica 4. As páginas, o checkout de seis meses e os links antigos foram reconferidos. Nenhum pagamento real ou mensagem de ensaio foi enviado. O código e a correção de tipo foram integrados à staging local. Após a publicação compatível pela outra frente, o novo benefício, seu manifesto e os seis meses também foram conferidos na staging remota.
