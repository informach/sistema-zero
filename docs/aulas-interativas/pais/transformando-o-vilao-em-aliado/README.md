# Transformando o vilão em aliado

Minicurso gratuito **para pais e responsáveis**, com a Helena na câmera, em **Cursos para pais** na área dos pais do Kids. Refação de 18/11/2026: o curso passa a ser o conteúdo integral do encontro de 13/11/2026, na voz da Helena, organizado em sete aulas na mesma ordem em que foi apresentado.

**Regra desta versão:** tudo o que foi dito no encontro está no curso, com os mesmos exemplos, argumentos e jeito de explicar. Saíram apenas as repetições, as perguntas a quem assistia ao vivo, a logística do encontro e a segunda oferta. A ordem foi corrigida onde o encontro se adiantou ou deixou uma promessa sem fechar; as correções estão listadas em Fontes. As explicações da psicóloga que participou do encontro viraram fala da Helena; os casos de consultório são contados como relatos da psicóloga que acompanha o André, sem nome. O detalhamento está em [Fontes](fontes.md).

**Convite único:** o Cadê Todo Mundo por sete dias, na Aula 7. Nenhuma outra aula oferece nada, e nenhum outro projeto, cupom ou plano é oferecido.

| Material | Arquivo |
| --- | --- |
| Título, descrições e organização | [Módulos](modulos.md) |
| Fonte, regra de adaptação e matriz de cobertura | [Fontes](fontes.md) |
| Consulta opcional | [Apostila](apostila.pdf) |

| Aula | Conteúdo | Roteiro | Importação no Admin |
| --- | --- | --- | --- |
| 1. O vilão que não dá para tirar | [Conteúdo](transformando-o-vilao-em-aliado-aula-1.md) | [Fala e produção](transformando-o-vilao-em-aliado-aula-1.roteiro.md) | [Manifesto](transformando-o-vilao-em-aliado-aula-1.manifesto.json) |
| 2. Assistir, jogar ou criar | [Conteúdo](transformando-o-vilao-em-aliado-aula-2.md) | [Fala e produção](transformando-o-vilao-em-aliado-aula-2.roteiro.md) | [Manifesto](transformando-o-vilao-em-aliado-aula-2.manifesto.json) |
| 3. De onde veio essa ideia e por onde começar | [Conteúdo](transformando-o-vilao-em-aliado-aula-3.md) | [Fala e produção](transformando-o-vilao-em-aliado-aula-3.roteiro.md) | [Manifesto](transformando-o-vilao-em-aliado-aula-3.manifesto.json) |
| 4. Programar não é um bicho de sete cabeças | [Conteúdo](transformando-o-vilao-em-aliado-aula-4.md) | [Fala e produção](transformando-o-vilao-em-aliado-aula-4.roteiro.md) | [Manifesto](transformando-o-vilao-em-aliado-aula-4.manifesto.json) |
| 5. Será que meu filho consegue? | [Conteúdo](transformando-o-vilao-em-aliado-aula-5.md) | [Fala e produção](transformando-o-vilao-em-aliado-aula-5.roteiro.md) | [Manifesto](transformando-o-vilao-em-aliado-aula-5.manifesto.json) |
| 6. Como nasce um jogo | [Conteúdo](transformando-o-vilao-em-aliado-aula-6.md) | [Fala e produção](transformando-o-vilao-em-aliado-aula-6.roteiro.md) | [Manifesto](transformando-o-vilao-em-aliado-aula-6.manifesto.json) |
| 7. Um presente para vocês experimentarem | [Conteúdo](transformando-o-vilao-em-aliado-aula-7.md) | [Fala e produção](transformando-o-vilao-em-aliado-aula-7.roteiro.md) | [Manifesto](transformando-o-vilao-em-aliado-aula-7.manifesto.json) |

## Gravação e edição

- São **23 clipes**. Desde 19/11/2026 a voz é gerada no ElevenLabs e a apresentadora é o avatar da Helena (HeyGen), durante toda a aula. Cada roteiro traz a **Fala para ElevenLabs** com as tags de direção, e cada aula tem o seu `.elevenlabs.txt`: é abrir, selecionar tudo e colar. As partes vêm separadas por `[long pause]`.
- O `.elevenlabs.txt` é derivado do roteiro. Mudou a fala? Mude no `.roteiro.md` e gere o `.txt` de novo (o `validar-roteiros.py` recusa o arquivo desatualizado).
- O **Na tela** de cada parte cita trechos da fala e indica as imagens a inserir, que correspondem aos slides usados no encontro.
- Os **depoimentos são fixos**: os mesmos cortes exibidos no encontro entram no ponto marcado em cada roteiro, com a Helena apresentando e comentando. A transcrição de cada corte está no roteiro para localizar o arquivo. Identificar nome e vínculo de quem fala, distinguindo Débora, mãe do Bernardo, da filha da Helena.
- **Isabela:** a história e o corte estão na Aula 5. A autorização dada pela família foi para a apresentação; confirmar a autorização de nome e imagem para o curso antes de publicar.
- **Demonstração (Aula 6, Parte 2):** clipe só de captura de tela, com a fala por cima. A tela é gravada pelo robô do EdiAula no palco de gravação, no Estúdio da Aula 1 do Cadê (Parte 4: o jardim, Achados em zero e o Quando clicar ou tocar vazio), com os gestos no "Na tela" do roteiro, na mão da professora. Edição automática pelo fluxo `apps/ediaula/scripts/aula-automatica` do informach-apps (curso `vilao`).
- **Plataforma (Aula 7):** a área dos pais é gravada pelo robô no staging, com uma conta de ensaio por tomada em nome de uma responsável fictícia (Mariana Alves Costa) e crianças fictícias (Bia; Luquinha), numa aula de QA com o presente e o certificado reais. A área da criança (ferramentas, entrada com o código, Cursos, Mural) entra por prints na edição. Os gestos e os trechos de edição estão no "Na tela" de cada parte.

| Aula | Chave do clipe | Título da parte |
| --- | --- | --- |
| 1 | `video-a1-abertura` | O maior vilão dos pais |
| 1 | `video-a1-pergunta` | A pergunta que muda tudo |
| 2 | `video-a2-tres-usos` | Assistir, jogar ou criar |
| 2 | `video-a2-funcoes` | Função executiva e o exemplo do Lego |
| 2 | `video-a2-criar` | Criar em vez de só consumir |
| 2 | `video-a2-tempo` | Mais tempo de tela? |
| 3 | `video-a3-historia` | De onde veio tudo isso |
| 3 | `video-a3-reconhece` | Você reconhece o seu filho aqui? |
| 3 | `video-a3-mundo` | Entrar no mundo dele |
| 4 | `video-a4-blocos` | Programar não é um bicho de sete cabeças |
| 4 | `video-a4-passo` | Um passo a passo para chegar a um objetivo |
| 4 | `video-a4-olhar` | O que esse vai e volta treina |
| 5 | `video-a5-foco` | "Será que ele vai ter foco?" |
| 5 | `video-a5-dificil` | "Será que não vai ser difícil?" |
| 5 | `video-a5-escola` | Também ajuda na escola |
| 5 | `video-a5-feliz` | O que a gente mais deseja: que eles sejam felizes |
| 6 | `video-a6-ciclo` | O ciclo de criação de um jogo |
| 6 | `video-a6-demonstracao` | Uma regra de cada vez |
| 6 | `video-a6-causa` | Fui eu que causei isso |
| 6 | `video-a6-familia` | O assunto que abre a conversa |
| 7 | `video-a7-plataforma` | Você no controle |
| 7 | `video-a7-ferramentas` | O que tem na área da criança |
| 7 | `video-a7-presente` | O presente: sete dias de Cadê Todo Mundo |

As chaves de clipe mudaram em relação à versão de 17/11, porque as partes são outras. Nenhum vídeo havia sido gravado ou vinculado. Os manifestos listam as chaves antigas em `retireBlockKeys`.

## Publicação

1. No Admin, usar audiência Kids e **Para quem: Pais**, fora da Jornada, no formato gravado. O slug do curso foi mantido. Criar a sétima aula com o slug `transformando-o-vilao-em-aliado-aula-7`.
2. Atualizar títulos e descrições conforme [Módulos](modulos.md) e importar os sete manifestos.
3. Os vídeos estão como `plannedVideo`. Vincular as gravações novas.
4. O bloco `apostila` continua na Aula 1.
5. Na Aula 7, o bloco `presente` usa o tipo `gift` com `benefitCode: vilao-em-aliado-cade`, resolvido no próprio ambiente. É benefício do curso, disponível enquanto a pessoa tem acesso ao guia, comprado ou recebido de presente; não depende do certificado. Publicar os serviços compatíveis e converter a antiga campanha antes de atualizar o bloco. A oferta `cade-todo-mundo-7-dias` conserva o identificador, com 15 dias reais, 7 divulgados e aviso dos 8 extras, sem cartão e sem renovar ao revisitar a aula. Inclui o Mural pelo mesmo prazo, seguido de acesso de visitante. O resgate utiliza a conta autenticada, sem formulário externo. O roteiro e o texto do ElevenLabs da Aula 7 foram revisados em 19/11: ativação na conta logada, criação ou uso de perfil, nome completo privado, apelido público e autorização do aparelho.

   O Admin mostra os resgates em **Curso → Benefícios**, com pessoas, datas e filtro por período. Em **Origem das vendas**, a origem imediata é “Dentro do curso”, separada da origem do acesso ao guia (campanha, embaixador, compra ou outra fonte). Referência antiga ausente aparece como “Origem não identificada”; não reconstruir por suposição. O código anterior e seus resgates são preservados na conversão.
6. O bloco `certificado` passou para a Aula 7 e registra a conclusão. O presente não depende do certificado.

## Página de divulgação

A porta de entrada do curso é a página pública `/kids/vilao-em-aliado`, no funil
(`packages/funnel`, ver o `CLAUDE.md` de lá). O responsável conhece o curso e se cadastra de graça;
o presente da Aula 7 continua em segredo na página. Para ela abrir o cadastro, é preciso, no Admin:

1. Publicar o curso com o slug `transformando-o-vilao-em-aliado`.
2. Criar no catálogo a oferta sem prazo do curso.
3. Criar a campanha de presente Kids com o código `vilao-em-aliado`, ligada a essa oferta, com
   data final distante. Enquanto a campanha não existir, a página mostra "As inscrições abrem em
   breve".
4. Preencher o endereço da página no campo de página de vendas do curso.

O mesmo e-mail que se cadastra no curso consegue resgatar o presente da Aula 7: o curso para pais
não ocupa a vaga do presente Kids no serviço de presentes.

## Estado desta entrega

Roteiros, resumos de aula e manifestos refeitos em 18/11/2026. Curso publicado em staging e produção em 21/11: sete aulas, 23 vídeos finalizados, incluindo a Aula 2 Parte 4, com as capas fornecidas. As sete aulas passaram na validação do serviço de autoria nos dois ambientes. As fontes Vimeo e os materiais privados são próprios de cada ambiente; os manifestos locais mantêm as chaves de autoria.

A página `/kids/vilao-em-aliado` está publicada nos dois funis, com campanha Kids `vilao-em-aliado`, entrega sem prazo somente do curso para pais e sem checkout. O endereço da página foi vinculado ao curso. A oferta operacional fica pausada para compra; o cadastro é gratuito pela campanha. Ver [registro da publicação](../../../operations/publicacao-vilao-em-aliado-2026-11-21.md).

**Tema visual (18/11/2026):** a ilustração da capa (a menina com o tablet e a sombra que aponta para os blocos e o jogo) define as cores do curso: roxo, lilás, rosa e amarelo, com o painel azul-marinho. A arte fica em `docs/aulas-interativas-tecnico/recursos/caderno-visual/arte/capa-transformando-o-vilao-em-aliado.jpg`, recortada da capa enviada pela dona (1049 px de largura; se houver o original maior, basta trocar o arquivo e gerar de novo).

**Apostila:** refeita em 18/11/2026 para espelhar as sete aulas e atualizada em 21/11 com a capa integral fornecida pelo responsável e uma página com o modelo do certificado. São 19 páginas, sem campos para preencher. A emissão do certificado na Aula 7 é independente da ativação do presente. O texto mora em `docs/aulas-interativas-tecnico/recursos/transformando-o-vilao-em-aliado/caderno-conteudo.json`; as imagens fornecidas ficam no mesmo diretório, em `capa-apostila.png` e `certificado.png`. Para gerar o PDF, `bun docs/aulas-interativas-tecnico/recursos/transformando-o-vilao-em-aliado/gerar-caderno.ts` (usa Chrome ou Edge no Windows, ou o Chromium do ambiente no Linux).
