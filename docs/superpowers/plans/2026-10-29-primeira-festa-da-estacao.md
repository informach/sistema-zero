# Primeira festa da estação, fase2-10

**Objetivo:** montar festas sazonais na Vila Doce, com pipoca feita na fogueira da Junina.
**Arquitetura:** calendário puro em São Paulo; montagem local de nós dos catálogos existentes;
receitas e necessidades existentes; aviso local por perfil, festa e ano. Nada novo no salvamento.
**Tecnologias:** TypeScript, React Three Fiber, Three, Rapier, Bun e Playwright.
**Especificação:** tarefa fase2-10 de 29/10/2026 e arte/festas/README.md.

O conector Artifact/action:read não está disponível nesta sessão. Os trechos fornecidos pela
dona são a referência da proposta. A página de acompanhamento também não foi localizada;
a nota de entrega ficará no relatório para atualização manual, conforme orientação anterior.

## Decisões

- Carnaval no dia calculado 47 dias antes da Páscoa. Não ampliar para outros dias sem decisão.
- Junina de 1 a 30 de junho. Fim de ano: propor 20/12 a 06/01, desativado até aprovação.
- Lanternas: sem data. Playground permite as quatro festas, por configuração da plataforma falsa.
- Pipoca: 1 milho, 1 porção, fome +15 e diversão +30 ao comer, inclusive depois da festa.
- A receita reaparece todo junho; nada expira, não há prêmio por presença nem penalidade por falta.
- Peças altas suspensas não ganham colisor; barracas, fogueira e objetos grandes usam formas simples.
- Sem Blender, serviço, contratos, salvamento, borrões, .env ou CI. VilaViva só recebe import e montagem.

## Execução e revisão

- [x] Calendário e receita: testes de Páscoa, virada de São Paulo, limites de junho e datas pendentes.
  Criar sistemas/festas.ts; acrescentar entradas em itens.ts e receitas.ts, e o lugar fogueira.
- [x] Catálogo e posições: mundo/catalogo-da-festa.ts e arranjo-da-festa.ts extraem só os nós pedidos;
  preservar tracks locais, ligar luzes à noite e emendar pontas dos varais. Testes com GLBs reais.
- [x] Montagem: mundo/festa-na-vila.tsx, estado/festas.ts e interface/fogueira-da-festa.tsx.
  Abrir ListaDeReceitas pela interação real; fechar painel ao terminar/sair; aviso por perfil/ano.
- [x] Playground: parâmetro festa só registra override na plataforma falsa; script verifica noite,
  fogueira animada, receita, inventário, aviso sem repetição e telas de computador/celular.
- [x] Revisar diff, rodar bun test, bun run typecheck, lint da raiz, navegador; documentar números,
  decisões pendentes e prints. Evidências em `docs/qa/2026-10-29-primeira-festa-da-estacao.md`.

Entrega Git: commit só dos arquivos deste lote; pull --rebase e push staging após os checks.
