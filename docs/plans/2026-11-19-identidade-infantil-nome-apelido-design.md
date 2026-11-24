# Nome completo privado e apelido público da criança

Direção aprovada na conversa de 19/11/2026: o responsável informa nome completo e apelido público. Certificados novos usam o nome completo real confirmado; as demais telas de identificação da criança usam o apelido. Sem inferir nomes a partir do cadastro antigo.

## Contrato

- `auth.profiles.name` continua sendo o nome completo privado; preservar o dado existente.
- Acrescentar `publicNickname` e `identityConfirmedAt`, ambos nulos no legado. O responsável confirma os dois campos juntos para habilitar novas emissões de certificado.
- O nome de exibição é `publicNickname` ou `Criador(a)`. Nunca usar nome completo como reserva de exibição, inclusive em tokens antigos e em consultas de nomes por lote.
- A view da própria família oferece `fullName` para edição e `identityConfirmed` para a orientação; seu campo histórico `name` passa a ser o nome de exibição. As identidades públicas e lotes sociais nunca oferecem `fullName`.
- Criança não pode alterar o nome completo. O responsável edita nome completo e apelido; demais preferências conservam suas políticas atuais.
  - **Revisão de 24/11/2026 (pedido da dona):** a criança passa a editar o PRÓPRIO apelido em "Meu perfil", sem aviso nem aprovação dos pais (eles seguem vendo e podendo corrigir na Família). Trocar só o apelido não mexe em `identityConfirmedAt`: o certificado continua liberado.
- Apelido: 2–40 caracteres, espaços normalizados, sem caracteres de controle; não exigir unicidade global. Nome completo mantém validação de nome, com campo e explicação explícitos. Não deduzir se um nome é real por quantidade de palavras.
- Perfil antigo: identificação pública genérica até escolher apelido; aviso na Família para confirmar os dois campos. Não impedir acesso aos cursos. Bloquear somente emissão nova de certificado enquanto faltar confirmação.
- Certificado novo: Members consulta Auth pela rede interna com perfil e conta autenticados. Nome enviado pelo cliente ou apelido do JWT nunca é a autoridade. Cursos para pais e adulto conservam a identificação da conta. Registros/PDFs já emitidos continuam imutáveis; correção histórica é operação administrativa distinta.
- Sessões novas carregam apelido explícito. Gateway e apps não exibem `pfl.name` de sessão antiga como reserva; token antigo sem apelido é genérico até renovar.
- Mural/Clube: nomes históricos não são autoridade pública. Projeção dos autores consulta identidade pública atual por lote via Members→Auth e usa identificação genérica em falhas. Metadados públicos do jogo também respeitam a regra. Consentimento de perfil público continua controlando o link, sem uma nova fila de aprovação de posts.
- Preservar autoria, IDs, progresso, conquistas, permissões, snapshots financeiros e aparências. Texto livre/artes produzidos pelo usuário não são reescritos automaticamente.

## Pendências da Aula 7 já decididas

- Presente usa bloco autenticado: ativar → criar/usar perfil → autorizar aparelho → abrir Cadê.
- Voz deve funcionar em produção; não condicionar a narração a um eventual interruptor. Manter a autorização individual do responsável.
- Oferta `cade-todo-mundo-7-dias`: um perfil explícito. Configuração aplicada por API administrativa em staging e produção, preservando outros atributos; evidências privadas de operação em `.cache/aula7-pendencias-20261119/`.
- Idade é recomendação, sem novo bloqueio mínimo.
- Roteiro, texto ElevenLabs, indicações de edição e apostila revisados em conjunto. Os três vídeos da Aula 7 serão gerados pelo responsável a partir desses textos.

## Implantação

Migration aditiva gerada por Drizzle. Nada preenche apelido com nome antigo. Members/certificados primeiro, depois Auth/identidades públicas, Gateway/Hub e UI; leitores novos degradam para genérico ao encontrar serviço antigo, nunca para nome completo. Não publicar alterações paralelas do Estúdio ou os blocos comerciais ainda não integrados como efeito colateral desta tarefa.
