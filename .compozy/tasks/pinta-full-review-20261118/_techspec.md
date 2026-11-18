# Contrato técnico da revisão

Fontes: `docs/pinta-cenarios/`, CLAUDE.md dos pacotes e requisitos de `_prd.md`.
Ler os contratos reais antes de corrigir. O formato rico inteiro é schema/envelope 4;
offsets fracionários exigem 5, pois o leitor 4 os arredondava. O 3 descreve camadas;
a versão de nuvem é independente e passa a 4. Contrato de cena fica no core,
conversão autoral no Pinta e hosts nos motores do Studio. Os limites atuais de criação e
leitura são distintos e não devem ser ampliados sem medição repetível.

Primeiro mapear implementação e falhas; depois reproduzir e corrigir por causa raiz, com
regressões. Usar o harness Playwright existente para fluxos críticos, sem provas baseadas
somente em mocks. Render/export devem concordar; bibliotecas externas são contratos reais.
Preservar tokens/componentes visuais e programação salva. Não implementar projeção somente
como seletor: requer modelo, geometria, render, edição, colisão e adaptadores coerentes.

Artefatos de aceite e QA: `docs/pinta-cenarios/revisao-2026-11-18/`.
Revisão estruturada: `.compozy/tasks/pinta-full-review-20261118/reviews-NNN/`.
Executar uma verificação pesada por vez. Revisores independentes fazem leitura/provas leves;
o agente principal coordena mutações, testes completos, navegador e documentação.
