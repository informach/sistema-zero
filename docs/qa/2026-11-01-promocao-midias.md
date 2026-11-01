# Mídias da promoção de cursos

Inventário, remapeamento e cópia integrados ao worker durável. A promoção foi exercitada com dois bancos locais separados. As provas de provedores reais abaixo usam somente recursos temporários, sem alterar cursos ou registros de alunos.

## Inventário e remapeamento

Contrato puro em `@sistemazero/core/course/publication-media`. Varre referências explícitas em campos, textos Markdown, HTML, arquivos de código e chaves de dicionários. Reconhece mídia pública da origem configurada, `r2priv:` e vídeos Vimeo. Agrupa URLs diferentes do mesmo objeto ou vídeo para não multiplicar transferências.

O remapeamento usa destinos preparados, nunca a troca global de um hostname. Conserva opções de reprodução do Vimeo, usando o ID e o hash de autorização novos. Mantém privadas as referências privadas. Referências explícitas restantes ao armazenamento de origem, escapes não suportados que ainda exponham seu domínio e colisões de chaves recusam a publicação. Não interpreta nem executa programas para descobrir URLs calculadas dinamicamente. A inspeção não clona a árvore inteira; apenas o remapeamento constrói a cópia.

A preparação operacional Kids para adulto passa a incluir o inventário no recibo privado. Isso não transfere arquivos entre ambientes por conta própria.

## Cópia R2

`r2CopyCourseObject` usa `CopyObject` no próprio armazenamento com `CopySourceIfMatch`, preservando os cabeçalhos de conteúdo e acrescentando a proveniência. Destinos derivados da versão não colidem entre preparações diferentes. Uma resposta perdida é reconciliada pelo objeto já gravado; repetir não gera outro arquivo. Confere tamanho, proveniência e a versão retornada pelo armazenamento. Não chama um ETag multipart de SHA-256.

Qualificação real em 01/11/2026 com arquivos próprios e temporários de **68 bytes**:

| Origem | Destino | Resultado |
| --- | --- | --- |
| `testes` | `comunidade-sistema-zero` | Bytes idênticos; reutilização confirmada |
| `testes-privado` | `comunidade-sistema-zero-privado` | Bytes idênticos; reutilização confirmada |

Nos dois pares, a condição com ETag errado retornou recusa e não criou objeto. A qualificação final executou o adapter local empacotado no serviço Admin de produção, usando as credenciais do próprio serviço. Os objetos de origem e destino foram apagados e a ausência conferida. Não houve escrita em banco.

Uma primeira tentativa falhou ao carregar uma dependência por um caminho inexistente na imagem do Admin, antes de qualquer operação de armazenamento. A segunda qualificou a API e a terceira o adapter implementado. Os registros privados foram preservados em `.cache/course-audience-sync/r2-copy-qualification-r1`, `r2` e `r3`. Não transportar essas suposições de layout da imagem para a aplicação.

Documentação primária consultada: [compatibilidade S3 do R2, CopyObject](https://developers.cloudflare.com/r2/api/s3/api/). A API suporta a condição da origem; a implementação não pressupõe uma condição de criação do destino inexistente nesse método.

## Verificação e limites

Testes causais cobrem resposta perdida, origem alterada, recusa entre HEAD e cópia, destino alheio, tamanho divergente, destinos por versão, referências duplicadas e escapes. Typechecks completos Core e Admin aprovados durante o desenvolvimento. A prova real é pequena: não mede desempenho de cursos grandes.

O worker, suas rotas, o acompanhamento no Admin, a preparação de voz e conhecimento no destino e a publicação integrada estão implementados e conferidos localmente. O ediSVG mantém imagem, áudio e fonte incorporados no JSON; a preparação confere payload, poster, tamanho, SHA e validador portátil antes de publicar. A prova do navegador tem provedores externos determinísticos e está em `2026-11-01-publicacao-cursos/README.md`.

## Cópia Vimeo real

O adapter real foi executado com a configuração do Admin de produção e um vídeo de origem disponível. A cópia nativa preservou os arquivos e as transcrições, recebeu a pasta e a whitelist de produção e passou na reconferência de privacidade e endereço. Repetir a preparação reutilizou o mesmo vídeo. A busca paginada encontrou o marcador exato, sem depender de indexação textual.

A qualificação revelou duas diferenças concretas do provedor: a whitelist canonicaliza `www`, e a seleção de campos da lista usa `uri,name`, não `data.uri,data.name`. Ambos foram corrigidos no adapter. O registro usa reserva e fases privadas imutáveis `.video` e `.complete`, com reconciliação de resposta perdida.

Resultado final privado em `.cache/course-audience-sync/video-real-adapter-r4.log`: PASS, marcador encontrado, reutilização confirmada, uma cópia e três registros temporários removidos, ausência conferida e origem inalterada. As tentativas negativas anteriores também tiveram os recursos removidos; os logs foram conservados.

Isso comprova os adapters reais e a composição local do fluxo, sem representar uma promoção integral de um curso real nem uma medição de desempenho com muitos vídeos. A publicação de Cadê staging sobre produção não foi usada como teste, pois o material de produção foi atualizado pela dona.
