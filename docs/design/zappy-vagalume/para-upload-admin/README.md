# Imagens para subir pelo admin

Use os **quatro arquivos em [prontos/](prontos/)**. A [galeria](../galeria.html) mostra as versões prontas e os originais para comparação.

| Arquivo | Onde usar | Formato |
| --- | --- | --- |
| [capa-o-jogo-do-meu-jeito.webp](prontos/capa-o-jogo-do-meu-jeito.webp) | Curso **O Jogo do Meu Jeito** → editar → **Imagem de capa** | 1600 × 900, WebP |
| [capa-corre-dino.webp](prontos/capa-corre-dino.webp) | Curso **Corre, Dino!** → editar → **Imagem de capa** | 1600 × 900, WebP |
| [capa-desafio-primeiro-jogo.webp](prontos/capa-desafio-primeiro-jogo.webp) | Curso **Desafio do Primeiro Jogo** → editar → **Imagem de capa** | 1600 × 900, WebP |
| [certificado-desafio-primeiro-jogo-base.png](prontos/certificado-desafio-primeiro-jogo-base.png) | Aula do certificado do desafio → bloco **Certificado** → **Imagem base do certificado** | 1492 × 1055, PNG, proporção A4 paisagem |

Se uma dessas capas também é usada na abertura de uma aula, o campo correspondente fica no bloco Vídeo → **Capa do vídeo**. Esse envio vai diretamente ao Vimeo. Não é necessário colocar a mesma capa em todas as aulas: substitua onde a imagem antiga já é utilizada. Foram geradas as quatro imagens fornecidas nesta conversa; outras thumbnails específicas de aulas não fazem parte deste pacote.

## Certificado

A imagem entregue é uma **base vazia**: o título e as ilustrações fazem parte da arte; nome, texto de conclusão, data, assinaturas e QR são acrescentados pelo sistema. O Zap ficou pequeno na borda inferior para liberar a área do preenchimento. Não envie a prévia preenchida do certificado que aparece no funil como imagem base.

No cadastro, mantenha/configure os textos e as assinaturas nos campos próprios do bloco. Após salvar em staging, emita um certificado de teste e confira nome longo, texto do curso, assinaturas e QR. O QR precisa continuar validando o certificado emitido. A aprovação dessa emissão em staging precede o upload em produção.

Veja a [amostra preenchida](../qa/certificado-amostra-sem-validade.png), gerada localmente pelo renderizador do sistema com nome longo e duas assinaturas de exemplo. Ela serve somente para visualizar o posicionamento; não é um certificado válido nem um arquivo para upload. O [PDF da amostra](../qa/certificado-amostra-sem-validade.pdf) também está guardado.

## Para guardar e editar

- `prontos/`: versões otimizadas para upload; todos os arquivos têm menos de 5 MB.
- `mestres/`: PNGs das artes novas, na resolução gerada, para futuras alterações.
- `originais/`: cópias intactas dos quatro arquivos fornecidos, renomeadas para identificar o curso. Os arquivos em Downloads foram preservados.

| Nome recebido | Cópia guardada em `originais/` |
| --- | --- |
| `ChatGPT Image 17 de ago. de 2026, 15_31_03.png` | `capa-o-jogo-do-meu-jeito.png` |
| `75e34ba4-4467-4c81-9cfb-f0b9f59b2c96.webp` | `capa-desafio-primeiro-jogo.webp` |
| `200ab06e-8bd4-4352-8eba-bd94636d80cf.webp` | `capa-corre-dino.webp` |
| `certificado-V2.png` | `certificado-desafio-primeiro-jogo-base.png` |

Nada foi enviado ao admin nem publicado em produção. Este é o pacote local para revisão e promoção manual.
