# Transformando o vilão em aliado: publicação de 21/11/2026

O usuário autorizou a publicação do curso Kids para pais em staging e produção e a atualização do bloco do presente para quem já possui o curso.

## Conteúdo

| Item | Staging | Produção |
| --- | --- | --- |
| Curso | `780b2167-c74a-4f87-8dc7-305455b0230c` | `3edc936c-5b72-4dd9-9c33-0b66e44d5a8b` |
| Público | Kids, `learner=parents`, fora da Jornada | Kids, `learner=parents`, fora da Jornada |
| Situação do curso | Rascunho, aguardando Aula 2 Parte 4 | Rascunho, aguardando Aula 2 Parte 4 |
| Vídeos finalizados | 22 de 23, Vimeo do ambiente | 22 de 23, Vimeo do ambiente |
| Capas | 23 imagens enviadas; 22 partes com capas vinculadas | 23 imagens enviadas; 22 partes com capas vinculadas |
| Apostila | PDF privado de 19 páginas, capa nova e modelo do certificado | Mesmo PDF, armazenamento privado de produção |
| Certificado da Aula 7 | Imagem base fornecida pelo usuário | Mesma imagem, CDN de produção |

Origem: `C:/Users/tocha/Downloads/Transformando o vilão em aliado/FINALIZADAS`. Falta **Aula 2, Parte 4: Mais tempo de tela?**. O usuário informou que está localizando o arquivo e o colocará nessa pasta. Não se removeu a parte nem se reutilizou outro vídeo para liberar a publicação. As aulas 1, 3, 4, 5, 6 e 7 passaram na conferência do serviço de autoria nos dois ambientes; a Aula 2 acusa a mídia ausente.

Capas dos vídeos aplicadas no Vimeo e nos posters dos blocos. Todos os uploads mantêm privacidade por domínio e download desabilitado. A autorização explícita de `kids.sistemazero.com.br` foi adicionada aos vídeos de produção. PDFs permanecem privados; uploads de materiais foram conferidos por SHA-256 após leitura do armazenamento. Foram removidas 20 cópias redundantes criadas por um processo de upload interrompido que continuou em segundo plano; os 22 vídeos referenciados foram preservados.

## Presente

Campanha `vilao-em-aliado-cade`, oferta `cade-todo-mundo-7-dias`: sete dias contados desde a ativação, um perfil de criança, Cadê Todo Mundo e os direitos de Mural definidos pela oferta. O resgate gratuito usa o bloco `gift`; não abre compra nem solicita cartão. O preço comercial da oferta não foi alterado. O presente não integra os requisitos de conclusão nem do certificado.

O bloco consulta direitos ativos da conta. Uma chave de todos os cursos da audiência ou um direito pago/manual para o curso gera a apresentação **já incluído no seu acesso**, com acesso a Família no Kids. A assinatura adulta, o direito de comunidade e outros cursos não são confundidos com o Cadê Kids. Um presente anterior conserva seu histórico e sua data de fim. Falha na consulta impede novo resgate. A interface descarta respostas antigas e invalida o estado ao trocar de origem, modo ou prévia.

Em staging, uma conta sintética e um curso de QA arquivado confirmaram pela interface: presente disponível sem acesso prévio, repetição sem alterar vencimento, apresentação de acesso incluído e navegação para Família sem novo resgate. O curso de QA não foi colocado no catálogo público. As conferências de produção e a limpeza das contas ficam registradas nas evidências privadas da operação.

A política do gateway de produção ainda não incluía as leituras comerciais do responsável que já existiam em staging. Foi levada somente essa permissão: GET de `/members/commerce/access` e `/catalog/member-promotions`. A regressão falhou na versão anterior e passou com a correção. Os 323 testes do Gateway e a checagem de tipos passaram; dois testes opcionais que exigem Redis permaneceram ignorados.

## Código e verificação

Fontes isoladas a partir das versões publicadas por ambiente. A atualização mais recente de staging foi incorporada para preservar as alterações concorrentes de cenários. Arquivos editoriais e provas foram excluídos dos arquivos de deploy com as mesmas regras do `.dockerignore`; nenhum segredo entrou no contexto. O upload inicial excessivo foi recusado antes de criar um deployment e foi corrigido pelo empacotamento do contexto canônico.

- PR de staging: https://github.com/informach/sistema-zero/pull/277
- PR de produção: https://github.com/informach/sistema-zero/pull/278
- 28 testes de rotas, acesso e formulário passaram antes da publicação; mais cinco casos de componente reproduziram as falhas de estado anterior e passaram após a correção.
- Integração com a versão recente de staging: 61 testes direcionados aprovados, incluindo as regras de cenários preservadas.
- Tipos de Members e Kids aprovados; build de produção do Kids aprovado sem desativar verificações.
- 32 testes editoriais dos cursos para pais aprovados. Capa, página do certificado e PDF de exemplo de emissão inspecionados visualmente.
- Cartão real conferido em desktop e celular, com os estilos compartilhados do Kids.
- Vimeo: duração, privacidade, domínio e capa das 22 partes conferidos em cada ambiente. Uma parte de cada uma das sete aulas reproduzida no navegador no domínio real do Kids de produção. As capas foram reativadas após o processamento, que havia substituído algumas por miniaturas automáticas.

Evidências e operadores privados: `.cache/vilao-publicacao-20261121/`. As senhas sintéticas e links temporários ficam somente no cache ignorado.

## Retomada quando chegar a parte faltante

1. Conferir o arquivo final de Aula 2 Parte 4 e associá-lo exclusivamente a `video-a2-tempo`.
2. Enviar para os dois ambientes com a capa correspondente, aguardar Vimeo `available` e conferir a reprodução.
3. Vincular a mídia pelo rascunho com controle de revisão e recalcular a duração da Aula 2.
4. Validar as sete aulas pelo serviço de autoria, publicar as aulas e depois o curso em cada ambiente.
5. Conferir a oferta/campanha de entrada `vilao-em-aliado` e o endereço comercial antes de abrir o cadastro público do minicurso.
6. Conferir o curso real na Área dos pais, apostila, certificado e presente. Não tornar a bolsa requisito para concluir.
