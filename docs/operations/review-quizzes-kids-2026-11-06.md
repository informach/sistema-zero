# Quizzes Kids e administração do funil — revisão de 06/11/2026

## Escopo

Implementação da proposta V5 aprovada para Desafio do Primeiro Jogo e Comunidade dos
Criadores. Dez perguntas SPIN, com exemplos para menores de 9, 9–12 e 13–17 anos.
O produto aparece apenas no resultado, que relaciona o contexto da família ao treinamento
de habilidades e explica formato, equipamento, acompanhamento e condições. O resultado
usa destaques, listas e uma captura real da Chave do Farol. Quizzes adultos preservados.

## Integração e compatibilidade

- Versões `desafio-vida-v6` e `comunidade-vida-v7`; entrada filho/filha fora das dez perguntas.
- Motor compartilhado e validação no servidor; mantém sessão, revisão, atribuição e cupom.
- Mudanças de idade, situação ou prioridade retiram respostas que perderam contexto.
- Chave própria para cada variante; evento compartilhado apenas entre variantes da mesma
  pergunta e idade. Assim, Performance não inventa etapas entre caminhos exclusivos.
- Snapshots preservam perguntas e alternativas. Respostas usa o snapshot da versão
  respondida, em ordem, com fallback para registros anteriores aos snapshots.
- Perfis identifica habilidade e idade. Os perfis antigos permanecem rotulados como históricos.
- O filtro de versão atual começa ligado; o histórico continua acessível.
- Nenhuma migração ou regravação de leads. Uma aba desatualizada recebe conflito e pode
  retomar uma sessão nova sem sobrescrever respostas anteriores.

## Achados corrigidos

1. Contagem técnica incluía a entrada e deslocava a numeração exibida. Metadado explícito
   distingue Entrada e Perguntas 1–10, inclusive em Métricas.
2. Variantes contextuais poderiam virar etapas consecutivas em Performance. O agrupamento
   usa o evento da pergunta; as métricas conservam cada variante.
3. JSONB não preserva a ordem de inserção das respostas. A listagem agora usa a ordem do
   snapshot, preservando também os textos e opções arquivados. Cada definição é consultada
   uma vez por página de leads, não uma vez por lead.
4. Abas antigas enviando chaves retiradas podiam receber erro genérico de pergunta desconhecida.
   A barreira de versão agora precede essa validação, permitindo a retomada explícita.
5. Estilos antigos sobrepunham as cores do CTA aprovado. As regras Kids ficam isoladas e
   após as regras legadas. O print real usa sua proporção integral e ampliação centralizada.

## Evidências locais

- 617 testes passam, dois skips existentes; contrato da API executado para os dois produtos.
- Os 58 resultados aprovados mantêm o hash da copy V5. A matriz cobre todas as combinações
  de idade, situação e prioridade, além de neutralidade, condições e acompanhamento.
- Navegador sobre o build real e PostgreSQL local isolado: seis jornadas completas,
  58 resultados, 232 layouts a 320/390/768/1440 px, texto a 200%, entrada por teclado,
  revisão das respostas, ampliação da imagem, UTMs/campanha/cupom e páginas adultas.
- Admin autenticado com identidade local sintética: filtros, perfis atuais/históricos,
  respostas na ordem e Métricas com visualizações reais e respostas confirmadas no servidor.
- A falha intermitente de coleta no teste foi rastreada a HTTP 429: vários visitantes
  simulados compartilhavam o IP em menos de um minuto. Separados os IPs dos visitantes
  locais, as 110 chamadas analíticas retornaram 200. O limite de produção foi preservado.
- Capturas e relatório técnico em `.cache/quizzes-vida-browser/`; nenhum contato, compra
  ou e-mail real foi realizado nessa validação.

Publicação e verificações dos ambientes são registradas no PR e nos workflows da entrega.
