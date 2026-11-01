# Publicar um curso a partir do Kids de staging

## Fluxo habitual

1. Concluir e publicar o curso e todas as aulas no Kids de staging. Um rascunho diferente do publicado impede a cópia.
2. Na lista de cursos Kids do Admin de staging, abrir **Mais ações → Promover para produção**. Conferir os ambientes, o endereço e as retiradas da grade antes de confirmar.
3. Acompanhar o trabalho até terminar. A janela pode ser fechada. Arquivos, vídeos e material do tutor ficam prontos antes da transação que publica o curso Kids de produção.
4. Usar **Publicar e atualizar no adulto** no ambiente desejado. Staging copia Kids de staging; produção copia Kids de produção. A cópia adulta não usa o Vimeo de outro ambiente.

O curso adulto recebe `/pro/` no lugar de `/kids/` da URL comercial. A promoção muda o domínio do funil configurado, preservando a rota Kids. Não cadastrar uma URL de outro destino no navegador. A origem sem URL comercial conserva a URL já existente no destino.

A grade ativa passa a seguir a origem inteira. Aulas excedentes são arquivadas, com seu histórico. Progresso, conclusões, certificados e conquistas não são apagados. Aulas correspondentes mantêm IDs; novas aulas podem alterar o percentual da grade atual. Transcrições e PDFs marcados para o Zappy são preparados com as revisões do destino. Conversas e entregas de alunos não são copiadas.

## Retomada e concorrência

- A prévia não publica. A confirmação usa versão e hash. Editar o curso depois dela exige outra prévia.
- Cancelar impede a publicação, inclusive se uma resposta de provedor chegar depois. Arquivos de cache já preparados podem ser reutilizados por outro trabalho.
- Retomar reconfere a captura e recria as tarefas derivadas com o perfil de mídia atual. Não repete sínteses disponíveis no cache oficial nem cópias Vimeo confirmadas no registro privado.
- Espera de processamento é persistida por recurso, com intervalo de 30 segundos. Outros recursos podem avançar. O prazo total é de duas horas; a execução usa lease de 90 segundos, renovado a cada 20 segundos.
- Cópia Vimeo com confirmação incerta é procurada pelo marcador reservado antes do POST. Se a reserva existe e nenhum vídeo foi confirmado, não apagar o registro nem repetir o POST manualmente. Conferir o registro e a conta Vimeo primeiro. O trabalho pode ficar aguardando e depois encerrar pelo prazo, mantendo o curso anterior.
- Alterar origem, destino, arquivo ou configuração durante a preparação impede a transação. Nunca tratar falha de provedor como material pronto.

## Configuração dos serviços

As portas S2S ficam no Admin público já existente. O Members permanece apenas na rede privada. Cada Admin aponta `COURSE_PUBLICATION_MEMBERS_URL` para o Members do próprio ambiente, por referência a `api-gateway.MEMBERS_URL`.

| Serviço | Variáveis |
| --- | --- |
| Members, ambos | `COURSE_PUBLICATION_ENVIRONMENT`, `COURSE_PUBLICATION_ADMIN_URL`, `COURSE_PUBLICATION_MEDIA_TOKEN`, `COURSE_PUBLICATION_PEER_TOKEN`, `COURSE_PUBLICATION_SOURCE_TOKEN` |
| Members staging | `COURSE_PUBLICATION_PRODUCTION_ADMIN_URL` |
| Members produção | `COURSE_PUBLICATION_STAGING_ADMIN_URL` |
| Admin, ambos | `COURSE_PUBLICATION_ENVIRONMENT`, `COURSE_PUBLICATION_MEDIA_TOKEN`, `COURSE_PUBLICATION_MEMBERS_URL` |
| Admin staging | `COURSE_PUBLICATION_SOURCE_TOKEN` |
| Admin produção | `COURSE_PUBLICATION_PEER_TOKEN`, `COURSE_PROMOTION_SOURCE_PUBLIC_URL`, `COURSE_PROMOTION_SOURCE_BUCKET`, `COURSE_PROMOTION_SOURCE_PRIVATE_BUCKET`, `COURSE_PROMOTION_SOURCE_FUNNEL_URL`, `COURSE_PROMOTION_TARGET_FUNNEL_URL` |

O token de mídia de cada ambiente deve coincidir apenas entre seu Members e Admin. Delegação e leitura usam credenciais distintas, compartilhadas pelos participantes da respectiva direção. Nunca colocar esses valores no navegador, em argumentos de shell ou no Git.

O Admin de produção precisa ler os buckets de staging e escrever nos de produção, além das configurações normais de Vimeo e ElevenLabs. A pasta e a whitelist Vimeo são as de produção. A animação ediSVG e seu poster têm destinos imutáveis, com hash conferido. PDFs privados continuam privados.

Implantar as migrations Members 0145, 0146, 0147 e 0148 antes de ativar a versão nova. Elas acrescentam arquivamento e filas; não promovem cursos nem arquivam aulas sozinhas. Conferir o plano IaC antes de aplicar e não remover variáveis alheias.

## Operador do mesmo serviço

`packages/members/scripts/publish-course.ts` chama `CoursePublicationService` e o mesmo worker do Admin. Só aceita o Members Railway do ambiente solicitado. Não é chamado por requisições web.

O pedido é um arquivo JSON privado. Exemplo de prévia:

```json
{
  "action": "preview",
  "operation": "promote-kids",
  "environment": "staging",
  "sourceCourseId": "UUID_DO_CURSO_KIDS_STAGING",
  "targetSlug": "meu-curso",
  "requestKey": "UUID_NOVO_PARA_ESTA_OPERACAO",
  "actorId": "UUID_DA_CONTA_ADMINISTRATIVA"
}
```

Os campos UUID devem conter UUIDs reais. No container Members correto, executar `bun --no-env-file packages/members/scripts/publish-course.ts /tmp/pedido.json`. A resposta é a mesma visão limitada do trabalho que o Admin mostra. Aprovação, cancelamento e retomada usam `action`, `environment`, `id`, `version` e `planHash`; consulta usa `action: "view"`, `environment` e `id`. Reutilizar `requestKey` somente para repetir o mesmo pedido.

O operador direto Kids para adulto anterior continua documentado em `sincronizar-curso-kids-adulto.md`. Ele usa a mesma regra canônica, com recibos e backup por SSH. A aplicação web não executa esse operador.

## Verificação e estado da implantação

Os testes usam somente Postgres local descartável. A fixture completa exige `COURSE_SYNC_TEST_DATABASE_URL` com banco `sistemazero_course_sync_test` e `COURSE_PROMOTION_TEST_DATABASE_URL` com banco separado `sistemazero_course_promotion_test`, no mesmo host local. Não apontar esses testes para Railway.

Evidência de interface em `docs/qa/2026-11-01-publicacao-cursos/`. As cópias reais de R2 e Vimeo têm qualificação separada. O plano `docs/superpowers/plans/2026-11-01-publicacao-unica-de-cursos.md` registra o estado atual; configuração de variáveis não significa deploy concluído.
