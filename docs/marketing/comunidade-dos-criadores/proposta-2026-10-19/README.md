# Proposta de 19/10/2026: duas páginas Kids, funil adulto, quizzes, bio e termos

Especificação aprovada pela dona no Canvas "Três páginas de oferta · proposta"
(https://claude.ai/artifact/NC2kD2E85g29CyM3Tn28AV) e implementada a partir de 20/10/2026.
Esta pasta guarda a fonte da implementação; o Canvas continua sendo a referência visual.

## O que mudou

- **Kids:** as cinco páginas de perfil da Comunidade dos Criadores deram lugar a duas: 9 a 17 anos
  (`/kids/comunidade-dos-criadores/oferta`) e menor de 9 criando junto (`/oferta/criar-junto`).
  A página `/oferta/continuar` ficou como estava.
- **Adulto:** funil novo `pro/comunidade-dos-criadores`, com página, quiz, resultado e checkout de
  assinatura mensal ou anual.
- **Quizzes:** Kids v6 (entrada filho ou filha, idade, ramo 9 a 17 e ramo menor de 9) e quiz adulto,
  os dois com o resultado em conversa.
- **Bio:** a raiz do funil passou a ter só dois caminhos, "É para mim" e "É para meu filho ou filha".
- **Termos e privacidade:** um Termo por oferta e uma Política de Privacidade única.

## Arquivos

| Arquivo | Conteúdo |
| --- | --- |
| `quiz-dados.json` | Perguntas, opções, entradas, calculadoras e perfis dos dois quizzes, mais a voz de cada público. Fonte única da copy dos quizzes |
| `resultado-exemplos.py.txt` | Os três exemplos de resultado em conversa do Canvas (perfil B de cada quiz). `[[...]]` marca a resposta devolvida |
| `canvas/*.html` | Os quadros do Canvas com os caminhos de imagem já apontando para `packages/funnel/public/img` |
| `auditoria-afirmacoes.md` | Auditoria de 243 afirmações das páginas contra o código, com fontes |

## Decisões da dona (19 e 20/10/2026)

- Nome da área adulta: Comunidade dos Criadores, o mesmo do Kids.
- Preço adulto inicial: R$ 97 por mês e R$ 797 por ano, como no Kids; o preço é lido ao vivo do catálogo.
- Uma Política de Privacidade, com capítulo para crianças e adolescentes e capítulo para adultos.
- Um Termo por oferta: Desafio do Primeiro Jogo, Comunidade Kids, Comunidade adultos e No Comando da IA.
- A página adulta usa prévias com dados de teste, com legenda; capturas reais antes de produção.
- Nenhum atalho "já conheço" na bio nem nos quizzes: nenhuma tela antes do resultado cita oferta.
- Os botões "Jogue um jogo" saem até haver link real autorizado.
- O nome da pessoa na tela de título do jogo é legítimo: ela escreve num texto de HUD.
- A Débora aparece como "aluna, 7 anos"; as fotos dos fundadores são as reais.

## Pendências para produção

Capturas reais da área adulta; cursos adultos publicados com os blocos da paleta; política da
jornada adulta; espaços adultos no Hub (Clube e Mural adulto); revisão jurídica dos Termos e da
Política; links do Instagram e do ManyChat que ainda apontam para as URLs antigas (funcionam por
redirecionamento).
