# Mural de visitante no presente do embaixador

## Decisão de produto

Cada **novo** resgate pelo link do embaixador concede dois direitos independentes à conta: sete dias no curso Kids **Cadê Todo Mundo?**, contados do cadastro pelo link, e visita ao **Mural dos Criadores** sem data de expiração. A visita permite ver a vitrine e jogar os projetos publicados. Ela não permite comentar, reagir, publicar nem usar **Fazer a minha versão**. Os resgates criados antes desta mudança não recebem o novo direito por migração ou backfill.

Uma assinatura ativa da Comunidade dos Criadores continua a conceder os produtos e ferramentas do plano, inclusive o acesso completo ao Mural. O direito completo prevalece sobre o de visitante enquanto estiver ativo. Se a assinatura terminar, a conta conserva somente a visita recebida pela indicação. Uma compra ou concessão independente do Mural ou do Estúdio segue suas próprias regras; a visita não libera o Estúdio nem o remix por si só. O direito de visita acompanha a conta até sua exclusão ou revogação explícita.

## Modelo de acesso

O serviço de membros registra uma matrícula de comunidade própria para **visitar** o Mural, com chave distinta de `mural-dos-criadores` e `expiresAt: null`. A chave atual do Mural continua a representar acesso completo. A concessão de visitante usa a infraestrutura de matrículas e a procedência do resgate, sem transformar o curso de sete dias em acesso sem prazo e sem conceder o produto completo por engano.

O hub distingue capacidade de leitura da capacidade de interação. A leitura do Mural aceita tanto a chave completa quanto a de visitante; comentários e reações exigem a chave completa e são recusados no servidor quando a conta só possui a de visitante. As demais comunidades conservam a regra atual. O app Kids mostra a vitrine e o player ao visitante, mas oculta as ações que ele não pode executar. O remix requer, além do Estúdio e do nível adequados, acesso completo ao Mural. O player público continua público; a regra governa a navegação e as ações da conta, não promete impedir extração técnica de um projeto publicado.

## Resgate e falhas

O registro de cada resgate congela se ele pertence à nova oferta com visita ao Mural. Linhas anteriores mantêm o valor antigo. A concessão do curso e a concessão de visitante usam identificadores de entrega distintos e estáveis, com progresso persistido por etapa. Um retry retoma a etapa faltante sem duplicar matrículas nem reiniciar o prazo do curso. O fluxo só confirma o presente e envia as boas-vindas após concluir ambas as concessões exigidas pelo resgate. Falhas transitórias permanecem diagnosticáveis e retomáveis; conflito de matrícula exige intervenção, sem anunciar um acesso que não foi entregue.

## Comunicação e verificação

As páginas de embaixador e de indicação/resgate, os textos compartilháveis e as boas-vindas distinguem claramente os **sete dias do curso** da **visita ao Mural enquanto a conta existir**. A comunicação não promete ferramentas, cópias, comentários ou assinatura como parte do presente. Os modelos e resgates antigos mantêm sua interpretação histórica.

Testes cobrem novo versus antigo resgate, retry de cada concessão, validade independente, visitante sem escrita, assinante com acesso completo, retorno à visita após o fim da assinatura e o botão de remix ausente para quem só visita. A implantação exige verificar o novo direito no members, a política de leitura/escrita no hub e a comunicação do funil antes de um teste real com cadastro novo.
