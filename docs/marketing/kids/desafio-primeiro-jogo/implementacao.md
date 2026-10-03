# Desafio do Primeiro Jogo — implementação do funil

**03/10/2026 · proposta v2 aprovada, implementação local concluída.**

O funil agora apresenta **A Chave do Farol**, com a identidade visual das ofertas da Comunidade. A raiz continua sendo a bio com os caminhos principais; `/como-funciona/` explica a experiência geral. O Desafio é uma entrada opcional: a família pode contratar a Comunidade diretamente.

## Páginas e encaminhamento

| Endereço | Papel |
| --- | --- |
| `/kids/desafio-primeiro-jogo/quiz` | Orientação gratuita para famílias que ainda não conhecem a plataforma. |
| `/kids/desafio-primeiro-jogo/resultado` | Resultado da sessão, sem dados pessoais na URL e sem exigir contato para ler. |
| `/kids/desafio-primeiro-jogo/oferta` | Oferta padrão: conhecer a construção do primeiro jogo. |
| `/kids/desafio-primeiro-jogo/oferta/tempo-de-tela` | Ênfase na aprendizagem dentro do tempo de tela combinado. |
| `/kids/desafio-primeiro-jogo/oferta/iniciacao-tecnologica` | Ênfase no movimento, na memória e na decisão que a criança programa. |

`/oferta/primeiro-jogo` é um alias com redirecionamento permanente ao padrão. Não existe uma oferta avulsa de desenho: C permanece registrado como expressão visual, mas o resultado explica a arte preparada do Farol. Quando a família procura desenhar como atividade principal, a orientação reconhece o desencontro e pode apresentar a página pertinente da Comunidade, sem tratá-la como solução para falta de computador ou exigência de aula ao vivo.

As três ofertas desenvolvem os mesmos assuntos essenciais, com aberturas, ordem, passagens e prioridades de FAQ próprias. Incluem demonstrações do jogo, montagem, aula com Estúdio, ajuda, caderno e publicação. São **19 respostas práticas**, separando programação de desenho. O rodapé e a ampliação de imagens são os mesmos componentes das outras páginas Kids.

## Quiz e resultado

- Versão `desafio-farol-v2`: oito questões principais e até duas ramificações. Equipamento aparece logo depois da idade; quem só dispõe de celular pode continuar a orientação com essa restrição mantida.
- Motivos do adulto, interesses observados na criança, experiência, preocupação, equipamento e formato permanecem separados. Não há pontuação por personalidade nem inferência de que gostar de jogar significa querer programar.
- Dois motivos abrem uma pergunta explícita de prioridade. Empate, exploração e outra procura não recebem um perfil forçado. O motivo da recusa do projeto abre uma explicação correspondente.
- O resultado combina orientação, convite copiável, apoio para a dúvida principal e demonstrações. Para quem recusa o projeto, o convite ajuda a esclarecer outra atividade, sem voltar a recomendar o Farol.
- É possível rever respostas e responder por outro filho. Alterações limpam ramos que deixaram de valer. A API confirma cada gravação, protege a revisão contra duas abas e impede que a aba de um filho escreva nas respostas de outro.
- Definições antigas abrem uma nova sessão; não se traduzem os antigos perfis de personalidade em motivos novos. Idade fora da faixa recebe orientação informativa, sem resultado comercial presumido.

## Preço, compra e continuidade

A referência editorial é **R$ 67, pagamento único, sem renovação automática**. O valor mostrado vem do catálogo, com desconto somente depois de cotação válida. O contrato continua exigindo `one_time/fixed/30/days` e garantia de sete dias. Os 30 dias começam na aprovação do pagamento; depois, o Mural é visitante para ver e jogar. A continuidade na Comunidade é opcional e separada.

O serviço compartilhado de catálogo mantém seu cache visual de 60 segundos e pode usar o último valor conhecido numa falha transitória. A cotação de cupom atualiza preço cheio e final imediatamente. A cobrança continua sendo cotada e validada no servidor; valor enviado pelo navegador não é fonte de preço. Sem oferta conhecida válida, as páginas devolvem 503. O quiz continua informativo e explica quando não consegue consultar o preço.

Capa do checkout, metadados de compartilhamento e confirmação agora acompanham o Farol. O pré-checkout identifica os dados como sendo do responsável. A confirmação respeita o pagamento e o prazo calculado a partir do snapshot da compra. A página de agradecimento também rejeita a sessão de outro produto.

Os textos locais de `challenge-access-approved`, lembretes de início, conclusão e encerramento foram alinhados em `packages/messaging/scripts/seed-templates.ts`. A introdução apresenta o jogo pronto; depois vêm três etapas de construção. Conclusão técnica não é descrita como prova de compreensão ou publicação. O encerramento explica o Mural visitante. **Nenhum seed, disparo ou nova automação foi executado.** As chaves, variáveis e regras de envio existentes foram preservadas.

## Integração com as métricas

O quiz usa a definição versionada e os snapshots de perguntas/opções do sistema de métricas compartilhado. A confirmação da resposta e o evento `quiz_answer_saved` são gravados atomicamente. `start_quiz` e `complete_quiz` seguem o mecanismo existente de deduplicação. O resultado registra motivo principal, estado, adequação, próximo passo e destino; repetir a mesma revisão não duplica esse registro.

As páginas e seções usam IDs estáveis. O resultado permanece `publicText:false`: cliques e destinos são medidos após consentimento, sem copiar sua prosa personalizada. Os links entre quiz, resultado, ofertas, bio, Como Funciona e Comunidade usam a atribuição sanitizada existente. Parâmetros de contato não são propagados. `?perfil` e `?quer` legados não mudam a copy do Desafio nem são registrados como motivo declarado no pré-checkout.

Nenhuma coleta paralela ou migração própria foi criada para esta implementação. Os arquivos de métricas em alteração na outra sessão foram preservados.

## Origem das imagens

| Arquivo | Evidência |
| --- | --- |
| `farol-jogo.png` | Captura do projeto concluído gerado por `docs/aulas-interativas/qa/desafio-farol-projeto.ts`, com o runtime real de Jogo 2D. |
| `farol-capa.webp` | Versão da mesma captura para checkout e compartilhamento; substitui a nave nas superfícies ativas. |
| `farol-blocos.png` | Trecho do Caderno do Aluno com as duas respostas da porta. Identificado como esquema do caderno, não como captura do editor. |
| `farol-caderno.png` | Página real do caderno com os testes com e sem chave. |
| Capturas compartilhadas | Aula/Estúdio, pedido de ajuda, Recados e publicação já usados na oferta da Comunidade. As legendas identificam a interface e, quando pertinente, o exemplo de Cadê Todo Mundo. |

Essas imagens demonstram o projeto e os recursos, não são depoimentos de clientes. Capturas da versão publicada do Farol poderão substituir os exemplos de interface após a conferência em staging.

## Verificação realizada

| Verificação | Resultado |
| --- | --- |
| Funil: suíte completa, com PostgreSQL local habilitado | **457 testes passaram**, zero falhas. Inclui lógica, contrato, pagamentos e as novas integrações de quiz. Não equivale a compra real em staging. |
| Funil: `bun run typecheck` | Zero erros; um hint do verificador Astro sobre variável usada nos retornos de redirecionamento. |
| Funil: `bun run check` | Zero erros; quatro avisos preexistentes de especificidade no CSS do quiz da Comunidade. |
| Funil: `bun run build --outDir ../../tmp/desafio-build` | Compilação concluída. Saída isolada para não substituir o servidor usado pela outra sessão. |
| Mensageria: `bun test` e `bun run typecheck` | **137 testes passaram**, zero erros de tipos. Somente conteúdo local de templates foi alterado. |
| Navegador em desenvolvimento e no build | Três ofertas, desktop/celular, imagens, 19 FAQs, zoom, rodapé, abertura do pré-checkout, cupom, atribuição, recuperação de rede, reinício, faixa etária, prioridade A, D, empate, equipamento e recusa. |
| Métricas no navegador | Clique do resultado registrado após consentimento, sem texto personalizado; definição própria do quiz e gravação pela API existente. |
| Cotação alterada durante a visita | Preço cheio e desconto atualizados pela cotação, mesmo com cache visual anterior. |

Testes principais: `tests/unit/desafio-quiz.test.ts`, `tests/unit/desafio-offer-copy.test.ts`, `tests/integration/api-desafio-quiz.test.ts` e `tests/browser/desafio-farol.ts`. As capturas de conferência ficam em `tmp/desafio-qa/`. Visitantes sintéticos usam `utm_source=qa_farol`, sem contatos ou cobranças.

### Como repetir a conferência de navegador

No pacote `packages/funnel`, execute `bun tests/browser/desafio-catalog-fixture.ts` em um terminal. A fixture serve apenas o catálogo de teste em `127.0.0.1:3347` e recusa pagamentos e mensageria. Em outro terminal, inicie uma instância isolada do funil com o `.env` local carregado, `GATEWAY_URL=http://127.0.0.1:3347` e porta `4347`; mantenha essas variáveis restritas ao processo de QA. O slug da fixture é `desafio-primeiro-jogo` e representa exclusivamente o contrato sintético de 30 dias, sem mudar o catálogo real.

Execute `node --import tsx tests/browser/desafio-farol.ts`, com `DESAFIO_QA_FIXTURE=1`. Para outra porta local, informe `DESAFIO_QA_URL`. O roteiro não preenche contato nem confirma pagamentos. A fixture não deve ser usada pelo servidor habitual ou por um ambiente de venda.

## Conferência operacional antes da publicação

O gateway configurado no servidor habitual, `http://localhost:3000`, estava indisponível nesta sessão. A navegação completa foi validada com o catálogo isolado, sem alterar `.env` nem oferecer preço fictício no aplicativo habitual. A oferta normal precisa do gateway e de um contrato válido para renderizar.

Antes de direcionar tráfego real, conferir:

1. Oferta pública de 30 dias configurada no ambiente; não reaproveitar ou modificar contratos vitalícios históricos. O slug previsto para venda é `desafio-primeiro-jogo-30-dias`.
2. Curso, manifestos, vídeos e recursos do Farol efetivamente publicados. Arquivo local não comprova disponibilidade no ambiente de venda.
3. Compra de teste, conta nova/existente, concessão de direitos, Mural durante/depois do prazo e combinação com assinatura ativa, no ambiente de staging.
4. Aplicação dos templates revisados pelo fluxo habitual de publicação da mensageria, sem criar uma sequência nova de campanhas. As condições e links dos marcos existentes continuam sendo responsabilidade dos serviços atuais.

Não houve publicação remota, teste financeiro real, alteração do catálogo remoto ou disparo de mensagens nesta entrega.
