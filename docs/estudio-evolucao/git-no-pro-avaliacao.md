# Git no Estúdio Pro: avaliação (lote 7, 21/11/2026)

Seção 14 da missão: "Avalie integração opcional com Git no Pro, sem torná-la requisito para criar
ou salvar jogos. O histórico interno do Estúdio não deve ser apresentado como Git completo."

## Decisão

O Pro não ganha Git agora. O que a criança precisa do Git (ver o que mudou, voltar a uma versão,
não perder trabalho) vem do **Histórico do projeto**, aprovado em 21/11/2026, que guarda as versões
neste computador e nunca se chama Git. Quem quiser Git de verdade leva o projeto para fora: a
exportação do Pro sai com o `package-lock.json` do grafo aprovado e um LEIA-ME com `npm ci`, e um
`git init` nessa pasta funciona como em qualquer projeto Vite (conferido no lote 7 com os 14
modelos, `scripts/verify-exports.ts`).

## Por quê

1. **O ambiente não tem o programa `git`.** O Pro roda no WebContainer, que executa Node.js no
   navegador, sem programas nativos. Git dentro do Estúdio seria uma implementação em JavaScript
   (como a isomorphic-git) gravando no armazenamento do navegador: outro sistema de arquivos para
   manter em sincronia com o projeto, a fila de escritas e a nuvem, que hoje já têm regras próprias
   (`persistencia-matriz.md`).
2. **Enviar para fora pede conta e credencial.** Publicar num serviço como o GitHub exige uma conta
   nele (que pede idade mínima de 13 anos nos termos do serviço), uma credencial guardada no
   navegador e, para o navegador falar com o servidor Git, um intermediário de rede. Para o
   público Kids isso é dado de criança indo para fora da plataforma, contra a regra de não mandar
   dados a destinos que o usuário não escolheu.
3. **O que o Git resolveria já tem caminho mais simples.** Ver mudanças, voltar uma versão e
   recuperar uma operação cabem no Histórico do projeto, com o vocabulário do Estúdio e sem
   conceitos de ramo, conflito e área de preparação, que para uma criança viram obstáculo.
4. **Não pode ser requisito.** Qualquer integração ficaria ao lado do salvar de hoje, nunca no
   caminho dele: criar e salvar continuam sem Git.

## O que fica registrado para depois

- **"Baixar com o histórico"**: quando o Histórico do projeto existir, a exportação pode gerar uma
  pasta `.git` a partir das versões guardadas (local, sem conta e sem rede), para quem continuar no
  computador já começar com o histórico. É uma proposta nova, para a dona aprovar.
- **Comunidade adulta**: para adultos, um envio opcional a um serviço Git escolhido por eles pode
  ser reavaliado, com credencial guardada pelo próprio serviço (OAuth) e nunca pelo Estúdio.
