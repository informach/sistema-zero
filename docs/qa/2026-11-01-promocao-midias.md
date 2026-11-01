# Mídias da promoção de cursos

Base local de inventário, remapeamento e cópia R2. O fluxo completo de promoção entre ambientes ainda não está concluído. Nenhum curso ou registro de aluno foi alterado nesta qualificação.

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

Ainda faltam o worker durável, suas rotas e o acompanhamento no Admin, a cópia Vimeo incorporada ao fluxo com reconciliação, a geração de voz e preparação de conhecimento no destino, a conferência dos hashes de cada pacote ediSVG e a publicação integrada. O ediSVG atual normaliza imagem, áudio e fonte dentro do próprio JSON; copiar seu payload preserva essas dependências embutidas, além do poster separado. O worker deverá conferir esses bytes contra a referência do módulo antes de publicar.
