# Revisão de convites, embaixadores e campanhas

Data: 02/10/2026.

Revisão do código e das mudanças da implementação aprovada: domínio, banco e HTTP de referrals; gestão de campanhas; páginas públicas e painel privado; resgate; autoinscrição dos pais; templates; gateway; QR; testes e documentação. As correções de atribuição exigiram uma leitura interna adicional no Payments. Alterações paralelas do Estúdio e do quiz não fazem parte desta revisão.

## Achados corrigidos

| Prioridade | Problema e efeito | Correção e evidência |
| --- | --- | --- |
| Bloqueador | A implementação consultava colunas novas sem migration gerada. Com o schema antigo, inclusive consultas existentes falhariam. | Gerada `0004_material_hellion.sql`, com snapshot e journal, pelo script Drizzle. Aplicação e testes com PostgreSQL local aprovados. Preservadas linhas e políticas históricas. |
| Alta | Duas abas podiam editar a mesma campanha e a aba antiga sobrescrever uma pausa ou encerramento recente. | `expectedUpdatedAt` obrigatório no PATCH, conferido sob lock da linha. Versão avança a cada gravação. HTTP 409 preserva a campanha e orienta recarregar. Teste de duas escritas concorrentes prova que apenas uma vence; histórico não registra a tentativa recusada. |
| Alta | Uma família com assinatura anterior ao presente podia ter a renovação posterior atribuída ao convite, gerando conversão ou bônus indevido. | Consulta autenticada à data original da assinatura, além da data do pagamento. Compra anterior é descartada. Sem comprovação, o webhook pede reentrega. Pagamento anual avulso continua elegível pela sua própria data. Testados convite pessoal, campanha e indisponibilidade da consulta. |
| Alta | Falha de rede na conferência de estorno depois de gravar a conversão era apenas registrada; o evento terminava como processado. | Falha pede reentrega; a conferência também roda quando o INSERT já existe. Reentrega de pagamento já estornado cancela conversão pendente ou institucional. Teste reproduz falha após INSERT e confirmação posterior do estorno. |
| Média | Resposta antiga de busca podia substituir a campanha buscada mais recentemente. Falha de atualização mantinha resultados antigos visíveis. | Guarda de sequência na lista e nos detalhes, limpeza em erro e botão Atualizar. Teste de interação com respostas em ordem invertida e falha posterior. |
| Média | Nome muito longo do operador podia cortar o identificador no histórico de auditoria. | Limitação do nome antes de compor a identificação; ID preservado. Teste HTTP com nome de 200 caracteres. |
| Média | E-mail aceito pelo serviço podia aparecer como falha se apenas a gravação do recibo local falhasse. | A resposta mantém a aceitação real; falha do recibo é registrada separadamente. Retry não reemite token nem duplica mensagem. Teste de falha de persistência. |
| Média | Durante o envio, os campos do resgate podiam mudar; a confirmação usava o e-mail atual do campo, não necessariamente o enviado. Erros e mudança de etapa também tinham pouco apoio a teclado/leitor de tela. | Dados bloqueados durante a chamada, guarda contra envio duplicado e e-mail confirmado guardado junto do resultado. Limites iguais aos do servidor, erros ligados aos campos e foco no primeiro erro ou no resultado. Typecheck, testes do funil e build aprovados; interação assistiva real ainda precisa do navegador. |
| Média | Resposta parcial do gateway podia liberar um formulário com código ausente/divergente ou origem incoerente. | Conferência do código solicitado, tipo/nome de origem e período válido. Resposta inconsistente fecha o formulário. Seis variações inválidas cobertas pelo teste. |
| Editorial | “Cursos e ferramentas contratados separadamente” podia sugerir compra avulsa de cada recurso. | Copy esclarece que fazem parte da assinatura da Comunidade, cuja contratação é separada do presente. Confirmação de envio também ganhou linguagem mais simples. |

## Regras verificadas e preservadas

- Início inclusivo e fim exclusivo para novos cadastros, com revalidação transacional.
- Sete dias contados da aceitação original; encerramento não reinicia nem encurta esse prazo.
- Um resgate por e-mail; novo link e retomada preservam origem, curso, política e vencimento.
- Campanha sem pessoa fictícia, sem chave Pix e sem bônus. Conversão institucional fica fora da fila financeira mesmo após estorno; prova adicional em PostgreSQL.
- Código imutável, duplicação com novo código, separação entre título público e nome interno e preview sem cadastro.
- Guards internos, leitura staff e escrita admin. O novo endpoint de assinatura exige token interno e devolve somente ID e data, sem cartão ou cliente.
- Painel do embaixador privado, canonical sem capability, política de referrer restritiva e compartilhamento pelo link público.
- Mural visitante descrito como acesso para ver e jogar. Capturas de assinante têm explicação dos controles que não fazem parte do presente.
- Sem cobrança automática, prazo de aprendizagem garantido, depoimentos inventados ou promessa de professor ao vivo.

## Verificação executada

| Superfície | Resultado |
| --- | --- |
| Referrals | 138 testes, zero falhas, incluindo as duas suítes de banco real; typecheck e Biome aprovados. |
| Payments | 329 testes, zero falhas; typecheck e Biome aprovados. Rota interna testada com token ausente, incorreto e correto. |
| Funil | 412 testes, zero falhas; Astro check em 224 arquivos sem erros/avisos; Biome e build aprovados. |
| Admin | Três testes específicos: datas, interação da lista e conformance dos status. Typecheck aprovado; Biome sem erros, com aviso preexistente sobre imagem no editor de aulas. |
| Mensagens | Testes de templates/renderização e de copy/seed aprovados; valores HTML escapados pelo renderizador existente. Nenhum e-mail real enviado. |
| Área dos pais | Seis testes de superfície aprovados. |
| Gateway | 27 testes de registro de rotas aprovados. |
| Contratos compartilhados | Typecheck de core e member-shell aprovado. |
| QR | Helper real gerou PNG válido de 640 × 640 para link público e recusou protocolo inadequado. Não foi testada a leitura por câmera. |
| HTTP local | `/bolsa/previa` e `/kids/embaixadores` responderam 200, com rodapé, sem IDs duplicados e sem formulário indevido. As dez imagens distintas referenciadas, incluindo a logo, existem. |
| Diff | `git diff --check` sem erros no escopo revisado. |

Algumas execuções Bun emitiram `EPERM` ao tentar ler `C:\Users\tocha\`, apesar de completarem as asserções e retornarem código 0. Isso ocorreu nos testes de superfícies dos pais, gateway e execução do QR. O bloqueio anterior no Drizzle não se repetiu: migration e suites de PostgreSQL foram efetivamente executadas.

## Limites e publicação

A conexão com o navegador expirou. Portanto, inspeção visual desktop/mobile, uso real do formulário/painel, ampliação de prints e leitura de QR por câmera continuam pendentes. A checagem HTTP e os testes de DOM não substituem esse ensaio. Também não houve cadastro integrado com os serviços reais de staging nem entrega real de e-mail. A revisão editorial não comprova taxa de conversão; isso depende do piloto.

Os indicadores de primeira atividade, conclusão por campanha, coortes e custo por ativação continuam fora do relatório inicial, conforme o escopo documentado na implementação. Nenhuma métrica sem medição foi apresentada como zero.

Na publicação, disponibilizar a leitura interna de assinaturas do Payments e os templates, aplicar a migration pelo processo normal de deploy e coordenar referrals/admin/funil. A conferência de versão do PATCH é obrigatória, por isso o admin anterior não deve editar campanhas novas. Não foram feitos deploy, migração remota ou commit nesta revisão.
