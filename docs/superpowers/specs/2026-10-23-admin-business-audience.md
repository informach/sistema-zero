# Comunidades em Negócio e carga inicial da jornada adulta

Decisões da responsável em 23/10/2026:

- Catálogo (produtos, ofertas, cupons), Campanhas e Zappy/Pensa devem seguir a mesma lente
  Kids/Adultos das outras áreas. Revisar também as demais telas de Negócio.
- Listas, totais, seletores, formulários, paginação, URLs diretas e operações devem conservar a
  comunidade correta. Trocar a lente cancela leituras antigas e fecha rascunhos de outra comunidade.
- Pré-carregar as etapas adultas, bloqueadas até vincular cursos. Não inventar cursos, matrículas
  ou conclusão; preservar ferramentas e posições já conquistadas.
- Retirar o curso No Comando da IA. Conferir vínculos comerciais e históricos antes de excluir;
  não apagar compras, pagamentos ou conquistas para remover um curso.

## Constatações

Base aprovada e implantada: `f1f68b72896726c625c6f0f5c1618b4e307c277f`.
O Admin marca Negócio como global. Produtos/cupons não têm comunidade própria; ofertas herdam o
produto principal e precisam manter coerentes bônus, combos e ofertas irmãs. Produção tem 19
produtos, 12 ofertas e zero cupons. A classificação dos produtos existentes será explícita e
conferida pelas referências de entrega e pelas definições de seed, sem adivinhar pelo título.

A jornada adulta de produção está na versão 0, sem etapas. Seu único curso publicado é o
avulso No Comando da IA, excluído do seed atual. O seed para no primeiro nível vazio.
O projetor atual pressupõe requisitos não vazios: relaxar o schema exige bloquear explicitamente
a conclusão e as concessões de uma etapa vazia, inclusive no servidor.

## Contratos

1. Uma comunidade persistida para cada produto/cupom; oferta deriva da comunidade do produto.
   Preservar identificadores, preços, resgates e snapshots de compras existentes.
2. Cotas de IA continuam com sua semântica de conta; separar a medição por comunidade não duplica
   créditos ou limites. Histórico sem origem comprovável será preservado e identificado, sem
   atribuição fictícia a Kids ou Adultos.
3. Uma conta que participa das duas comunidades pode aparecer nos dois recortes, com os dados
   correspondentes. Métricas de infraestrutura compartilhada não serão atribuídas ficticiamente
   a uma audiência. Itens de negócio identificáveis seguem a lente até o serviço dono do dado.
4. Etapa adulta sem curso: indisponível, não concluída por vacuidade, não concede capacidades.
   Etapas seguintes também aguardam a cadeia real; o piso histórico e os grants congelados permanecem.
5. Seed idempotente: inicializa somente política ausente; não sobrescreve autoria do Admin.
6. IA/Pensa exigem curso avançado efetivamente concluído. A estrutura planejada pode guardar
   capacidades de uma etapa ainda sem curso, mas não as libera.
7. Migrações comerciais usam expansão, backfill verificado e contrato; não classificar
   silenciosamente registros ambíguos nem quebrar checkout ou apagar registros financeiros.

## Aceite

Regressões de servidor e UI para troca Kids/Adultos, totais e paginação corretos, formulários
escopados, referências cruzadas recusadas e respostas antigas descartadas. Testes reais de
persistência para novos campos. Seed com zero cursos mostra a estrutura completa e concede
zero capacidades novas; curso associado e concluído libera somente o que a etapa define.
Validação em staging antes da promoção e conferência das configurações efetivamente carregadas.
