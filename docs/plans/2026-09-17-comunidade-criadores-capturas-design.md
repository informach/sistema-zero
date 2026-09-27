# Capturas atuais da Comunidade dos Criadores

## Objetivo

Atualizar a seção “Uma olhada por dentro” e as promessas de benefícios da página de oferta da Comunidade dos Criadores para refletir a interface e o contrato comercial atuais.

## Regra central da oferta

A assinatura inclui toda a plataforma kids:

- todos os cursos kids atuais e futuros;
- Estúdio, Pinta, Pensa e Molda;
- Clube e Mural dos Criadores;
- Carreira, missões, conquistas, Recados, avatar e quarto;
- até dois perfis de criança na mesma conta.

Os cursos e as ferramentas não são liberados todos de uma vez. A criança avança pela Carreira do Criador, conclui aventuras e publica projetos para conquistar novos postos e abrir recursos progressivamente. A copy deve distinguir com clareza “incluído na assinatura” de “já liberado para uso”.

## Alternativas consideradas

1. Capturar o staging público. Foi descartado porque há poucos dados e as telas não representam bem a experiência completa.
2. Semear toda a infraestrutura local e navegar no aplicativo real. É fiel, mas acopla a produção das imagens a banco, autenticação, gateway, Hub e Members, tornando a atualização frágil e lenta.
3. Criar uma prévia visual local reproduzível com dados fictícios e a identidade/componentes atuais. É a opção escolhida, seguindo o padrão já aprovado para o Desafio. Ela preserva a aparência vigente, não usa dados pessoais e pode ser recapturada por um único comando.

## Conjunto de capturas

1. Carreira: mostra o mapa de progressão e deixa visível que as liberações são conquistadas.
2. Cursos e aula: mostra a trilha de aprendizagem e o Estúdio dentro da aula.
3. Oficina: mostra Estúdio, Pinta, Pensa e Molda como partes incluídas, com estados coerentes de “liberado” e “abre no próximo posto”.
4. Mural: mostra jogos publicados, jogadas e ações de compartilhar.
5. Clube: mostra canais, conversas e moderação.
6. Recados: mostra a devolutiva do professor sobre uma entrega.
7. Meu espaço: mostra avatar, quarto, sequência e conquistas como camada de pertencimento.

## Dados fictícios

A aluna fictícia se chama Bia e está no posto Construtora. Ela concluiu o primeiro jogo, publicou no Mural e está avançando para Inventora. Os projetos, colegas, mensagens e números são fictícios e não devem reproduzir contas reais.

## Copy e alinhamento comercial

- Substituir “plataforma inteira liberada no dia em que entra” por “plataforma inteira incluída, com liberações conforme a carreira”.
- Atualizar o Kit de Criação Livre de três para quatro ferramentas, incluindo o Molda.
- Atualizar a âncora de valor individual de R$ 291 para R$ 388, com base nos quatro produtos de R$ 97 cadastrados no catálogo.
- Explicar a progressão como benefício pedagógico e de motivação, não como limitação escondida.
- Manter a comunicação dirigida aos pais, com trechos lúdicos compreensíveis para a criança.
- Não usar travessões na copy pública.

## Implementação

- Prévia em `packages/community-kids/tests/visual/comunidade-preview.tsx`.
- Servidor isolado em `packages/community-kids/tests/visual/serve-comunidade-preview.ts`.
- Captura determinística em `packages/community-kids/tests/visual/capture-comunidade-offer.ts`.
- Script `capturar:comunidade-oferta` no package kids.
- Imagens WebP em `packages/funnel/public/img/comunidade-dos-criadores/`.
- Atualização da seção visual, entregáveis, bônus e resumo final em `ComunidadeOfertaBody.astro`.
- Teste unitário para nomes de imagens e regras rígidas da copy.

## Verificação

- Executar o gerador duas vezes e conferir que todas as imagens esperadas são produzidas.
- Inspecionar as capturas em resolução original.
- Validar a oferta em desktop e celular, sem rolagem horizontal.
- Rodar testes, typecheck, check e build de `community-kids` e `funnel`.
- Fazer revisão de cada lote e uma revisão integral no final.
