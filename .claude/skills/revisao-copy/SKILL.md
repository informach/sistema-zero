---
name: revisao-copy
description: Revisa copy comercial do Sistema Zero quanto a Light Copy, clareza, argumento, evidências e verdade da oferta. Use para feedback de páginas, anúncios, posts e revisão final de textos de marketing.
---

# Revisão de copy

Leia [o contexto](../marketing-sistema-zero/references/contexto.md). As doze regras em `packages/marketing/src/domain/copy/light-copy-rules.ts` são a fonte da voz comercial. Não replique a lista em outro arquivo de regras.

## Passagens de revisão

1. **Oferta e provas:** compare promessa com entrega, suporte, acesso, preço, renovação, garantia e disponibilidade. Confira a fonte de números, depoimentos, comparações e alegações educacionais. Não transforme hipótese em certeza nem corrija uma promessa exagerada inventando outra.
2. **Argumentação:** verifique situação, mecanismo, resultado e consequência. Remova generalizações, repetições e acusações contra alternativas. Um nome bonito não substitui uma explicação. Demonstração de interface não comprova resultado pedagógico.
3. **Voz:** aplique as regras locais, português natural, fluidez e especificidade. Perguntas de FAQ ou quiz têm função própria; a restrição de pergunta no gancho não elimina perguntas legítimas. Citações literais permanecem fiéis, mesmo quando não seguem a voz da marca.
4. **Jornada:** anúncio, página e CTA devem conduzir à mesma oferta. Confira texto de botões, modal, checkout, confirmação e variantes. Imagens, legendas, alt text e metadados também podem conter promessas.

## Apoio mecânico

Para um arquivo de texto comercial limpo, a partir da raiz:

```powershell
bun .agents/skills/revisao-copy/scripts/check-copy.ts caminho/da/copy.md
```

O comando usa `lintLightCopy` do backend, retorna JSON, sai com código 1 quando encontra ocorrências e 2 quando não consegue ler/verificar. Pode receber vários arquivos. Não passe código, Markdown com imagens, relatório de pesquisa ou notas técnicas como se fossem uma única peça: pontuação e perguntas nesses materiais podem gerar falsos positivos. Avalie a copy extraída nesses casos.

O hook do Claude lembra a revisão ao editar arquivos de marketing. Ele não bloqueia edições nem aprova a veracidade de uma promessa. No Codex, use esta skill e o comando diretamente; não suponha execução dos hooks do Claude.

## Entrega

Quando solicitado feedback, apresente problemas por impacto com trecho/local, razão e correção proposta; indique também o que merece ser mantido. Quando solicitada correção, entregue o texto ajustado e um resumo útil das mudanças. Separe pendências de prova da copy final. Não introduza marcadores editoriais na página pública.

Finalize distinguindo revisão editorial, verificação funcional e teste de conversão. Só declare o que efetivamente foi conferido.
