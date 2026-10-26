# Jornada do Criador: implementação aprovada

Autorização: a proposta visual e suas revisões foram aprovadas na conversa de 25/10/2026. Implementar regras, duas comunidades, Admin, documentação e seed; posicionar cursos existentes preservando identidade, progresso e direitos. Base do trabalho: `875e143cdd086965d2ca26c0d798cd3f6218a12f`.

## Regras de produto

Sete postos de aprendizagem, seguidos da Lenda: Faísca, Construtor, Inventor, Explorador, Mestre dos Jogos, Arquiteto de Mundos, Gênio da Criação. Cada posto tem um gênero de jogo, bases 2D e 3D com o mesmo modelo lógico, missão de transferência com partes nas duas dimensões, Poderes que ampliam o jogo-base e extras opcionais.

1. A base 2D precede a base 3D. Concluir ambas abre missão, Poderes e extras daquele posto.
2. Promoção exige ambas as bases, missão concluída nas duas dimensões e Poderes distintos aplicados: um no Faísca, dois nos demais. Versões 2D e 3D de um mesmo Poder contam uma vez. Aplicação é critério dentro do curso, sem nova obrigação de publicação.
3. Cada curso concluído concede seus blocos ao Estúdio. Licença, capacidade da ferramenta e repertório curricular continuam conceitos distintos. A aula pode oferecer blocos curados antes do desbloqueio global.
4. Extras, XP, frequência e Mural não condicionam promoção. Projeto autoral extra não condiciona Lenda.
5. Farol e Cadê Todo Mundo comprados separadamente abrem com o direito específico ativo, mesmo sem assinatura e sem cumprir a jornada. Matrícula de assinatura não é compra avulsa. Preservar também presentes explícitos já prometidos. Expiração continua vigente; uma exceção não abre outros cursos.
6. Identidades dos cursos existentes, aulas, XP, entregas, posições alcançadas e capacidades adquiridas são preservadas. Nova regra não cria dívida retroativa. Novos cursos sem produção real são rascunhos, claramente identificados no Admin.

## Maestrias

Seis áreas: Python 2D, Python 3D, JavaScript 2D, JavaScript 3D, Arte 2D para Jogos e Modelagem e Animação 3D para Jogos. Blocos, Ponte e Pro são modos de criação dentro da área, sem separar certificações. Conceito avançado começa com representação em blocos e código correspondente, previsão, alteração e aplicação.

Três níveis por área. Cada nível pede um núcleo (ou crédito validado), duas oficinas distintas entre três e uma entrega aprovada em todos os critérios essenciais. A mesma criação pode integrar essas evidências. II depende de I; III de II; áreas irmãs não são pré-requisitos. Python abre após o par Explorador; JavaScript 2D e Arte após o par Construtor; JavaScript 3D e Modelagem após o par Inventor. Lenda torna todas as entradas elegíveis, sem conceder selos automaticamente.

Revisão registra versão da rubrica, evidência imutável, critérios, devolutiva e revisor. O carimbo existente de projeto conferido não significa aprovação. Selos são persistentes; acesso ao conteúdo continua sujeito à licença. Créditos precisam de evidência e justificativa auditáveis, sem equivalência automática entre linguagens.

## Arquitetura e apresentação

Manter políticas versionadas Kids e adulta como autoridades. Incorporar contrato de currículo compartilhado à própria política; política histórica sem currículo conserva interpretação histórica. O currículo novo identifica postos pelo slug do posto e cursos por UUID, sem reutilizar os tiers técnicos antigos como postos. A projeção pura comum alimenta autorização, API e interfaces. Publicação Kids mantém preparação, captura de coorte e CAS; adulto conserva piso e capacidades congeladas.

Kids conserva sua identidade. Adulto usa o Estúdio à noite atual: palco escuro para descoberta, bancada clara para trabalho, CTA amarelo, Bricolage/Atkinson, contraste e navegação já corrigidos no remoto. Componentes comuns apresentam dados sem duplicar regras.

O catálogo editorial completo está em `docs/design/jornada-criador-curriculo-2026-10-25.json`, exportado da proposta aprovada. Ele descreve conteúdo planejado; não declara que gravações e cursos novos já existem.

## Critérios de entrega

Regras testadas no servidor, telas coerentes nos dois públicos e Admin, seed idempotente com dry-run e identidade resolvida sem UUID inventado, migrações geradas pelo script do projeto, documentação operacional e evidência de validação. Não executar seed nem migrações em produção nesta implementação sem operação deliberada e auditável.
