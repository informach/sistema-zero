from pathlib import Path
import shutil,re
w=Path(__file__).parent
b=Path('docs/marketing/kids/comunidade-dos-criadores/instagram')
target=b/'producao/postagens/p01-nao-consigo'
archive=b/'historico/2026-10-12-antes-revisao-de-clareza/p01-nao-consigo'
if not archive.exists():
    archive.parent.mkdir(parents=True,exist_ok=True)
    shutil.copytree(target,archive)
    (archive.parent/'LEIA-ME.md').write_text('# Versão substituída\n\nPrimeiro P01 sobre o “não consigo”, anterior à revisão de clareza, interesse e variedade de entregas. Não publicar esta versão. O material vigente está em `producao/postagens/p01-nao-consigo/`.\n',encoding='utf-8')
t=(w/'montar-p01.mjs').read_text(encoding='utf-8')
start=t.index('const assets=');end=t.index('const source=',start)
t=t[:start]+'''const assets=[['exec-f391471a-1c82-4bff-b224-17223005a168.png','04-mostrar-apoio.png'],['exec-302692d0-472e-4f80-a456-8cc3fc9e052d.png','05-tentar-apoio.png']];
for(const [src,dest]of assets)fs.copyFileSync(path.join(generated,src),path.join(target,'apoio',dest));
'''+t[end:]
start=t.index('const paper=');end=t.index('const css=',start)
graphics=r'''const frame=(inner)=>`<svg viewBox="0 0 900 500" xmlns="http://www.w3.org/2000/svg"><rect width="900" height="500" rx="28" fill="#edf2ff"/><g font-family="Segoe UI,Arial" font-size="34" fill="#193967">${inner}</g></svg>`;
const stack=(x,y=300)=>`<g stroke="#173b95" stroke-width="3"><rect x="${x}" y="${y}" width="120" height="32" rx="4" fill="#2c5bda"/><rect x="${x}" y="${y+34}" width="120" height="32" rx="4" fill="#fff"/><rect x="${x}" y="${y+68}" width="120" height="32" rx="4" fill="#2c5bda"/></g>`;
const paper=frame(`<text x="225" y="68" text-anchor="middle" font-weight="700">Amassou</text><text x="675" y="68" text-anchor="middle" font-weight="700">Escorregou</text>${stack(35)}${stack(300)}${stack(485)}${stack(750)}<path d="M65 300H175L194 340L215 315L243 356L267 302H388" fill="none" stroke="#b0b5c3" stroke-width="17"/><path d="M65 296H175L194 336L215 311L243 352L267 298H388" fill="none" stroke="#fff" stroke-width="11"/><path d="M510 294H640Q683 294 704 365" fill="none" stroke="#b0b5c3" stroke-width="17"/><path d="M510 290H640Q683 290 704 361" fill="none" stroke="#fff" stroke-width="11"/><path d="M450 90V430" stroke="#cbd6ee" stroke-width="3"/><text x="225" y="465" text-anchor="middle" font-size="28">O papel cedeu no meio.</text><text x="675" y="465" text-anchor="middle" font-size="28">Uma ponta ficou sem apoio.</text>`);
const supports=frame(`<text x="225" y="68" text-anchor="middle" font-weight="700">Antes</text><text x="675" y="68" text-anchor="middle" font-weight="700">Nova tentativa</text>${stack(28)}${stack(310)}${stack(510)}${stack(710)}<path d="M55 294H190Q227 294 264 362" fill="none" stroke="#b0b5c3" stroke-width="17"/><path d="M55 290H190Q227 290 264 358" fill="none" stroke="#fff" stroke-width="11"/><path d="M535 294H802" stroke="#b0b5c3" stroke-width="17"/><path d="M535 290H802" stroke="#fff" stroke-width="11"/><path d="M450 90V430" stroke="#cbd6ee" stroke-width="3"/><path d="M527 210H580M805 210H752" stroke="#2453d9" stroke-width="9"/><path d="M565 194L583 210L565 226M767 194L749 210L767 226" fill="none" stroke="#2453d9" stroke-width="9"/><text x="225" y="465" text-anchor="middle" font-size="28">A ponta escorrega.</text><text x="675" y="465" text-anchor="middle" font-size="28">Os apoios ficam mais perto.</text>`);
const avatar=(x,y)=>`<g transform="translate(${x} ${y})"><circle cy="-26" r="28" fill="#ffc633" stroke="#18396d" stroke-width="3"/><circle cx="-9" cy="-30" r="3" fill="#18396d"/><circle cx="9" cy="-30" r="3" fill="#18396d"/><rect x="-28" y="5" width="56" height="47" rx="16" fill="#2453d9"/><path d="M-15 43V63M15 43V63" stroke="#18396d" stroke-width="10" stroke-linecap="round"/></g>`;
const goal=(y)=>`<path d="M770 ${y+65}V${y-65}L825 ${y-40}L770 ${y-15}" fill="#ffc633" stroke="#18396d" stroke-width="4"/>`;
const movement=frame(`<text x="40" y="53" font-weight="700">Foi para a esquerda.</text><path d="M48 192H850M48 420H850" stroke="#c9d7ef" stroke-width="5"/>${avatar(340,127)}${goal(127)}<path d="M272 125H136M162 101L134 125L162 149" fill="none" stroke="#be4343" stroke-width="12" stroke-linecap="round"/><text x="40" y="282" font-weight="700">Mudou a direção e testou.</text>${avatar(500,355)}${goal(355)}<path d="M560 355H696M670 331L698 355L670 379" fill="none" stroke="#2453d9" stroke-width="12" stroke-linecap="round"/><text x="730" y="470" font-size="28">Destino</text>`);
const img=(src,cls='')=>`<img class="scene ${cls}" src="apoio/${src}" alt="">`;
const visuals=[img('04-mostrar-apoio.png'),paper,img('04-mostrar-apoio.png'),supports,movement,`<div class="finish">${img('05-tentar-apoio.png')}<div class="path"><span>Encontrar o problema</span><b>→</b><span>Escolher uma mudança</span><b>→</b><span>Conferir</span></div></div>`];
'''
t=t[:start]+graphics+t[end:]
t=t.replace("font-size:80px;line-height:1.1","font-size:76px;line-height:1.1").replace('font-size:22px;line-height:1.25;color:#60718e','font-size:26px;line-height:1.25;color:#60718e')
t=t.replace('P01 · Uma próxima tentativa','P01 · A tarefa é do seu filho').replace('Uma próxima tentativa','Ajudar a investigar')
t=t.replace('P01 · O “não consigo” pode estar escondendo uma dúvida.','P01 · A tarefa é do seu filho. Mas é você que acaba fazendo.')
t=t.replace('max-height:460px;object-fit:cover;object-position:center 65%','max-height:500px;object-fit:contain;object-position:center')
start=t.index("fs.writeFileSync(path.join(target,'texto-alternativo.txt')");end=t.index('const browser=',start)
t=t[:start]+r'''const diagramText={1:'Amassou. O papel cedeu no meio. Escorregou. Uma ponta ficou sem apoio.',3:'Antes. A ponta escorrega. Nova tentativa. Os apoios ficam mais perto.',4:'Foi para a esquerda. Mudou a direção e testou. Destino.',5:'Encontrar o problema. Escolher uma mudança. Conferir.'};
fs.writeFileSync(path.join(target,'texto-alternativo.txt'),slides.map((s,i)=>`SLIDE ${i+1}\n${[1,3,4].includes(i)?'Diagrama editorial original.':'Ilustração editorial gerada de personagens fictícios; não é registro de alunos.'} ${alts[i]}\nTexto da arte: ${s.join(' ')} ${diagramText[i]||''}`).join('\n\n')+'\n');
fs.writeFileSync(path.join(target,'publicacao.txt'),'P01 vigente após revisão de clareza, 12/10/2026. Publicar somente 01-p01.png a 06-p01.png, nesta ordem, com legenda.txt e texto-alternativo.txt. 1080 × 1350, 4:5.\nAbertura: a tarefa do filho acaba nas mãos do adulto. O exemplo acompanha uma ponte de papel e uma decisão deixada com a criança. Programação entra no slide 5. Legenda completa sem automação; PASSO só após configurar e testar o fluxo.\nDuas novas ilustrações de personagens fictícios e três diagramas editoriais. Não são registros de alunos nem capturas de uma funcionalidade. Nenhuma mídia de concorrente.\nMontagem editável em montagem.html. Prompts em apoio/prompts-revisao.txt. A versão anterior foi arquivada em historico/2026-10-12-antes-revisao-de-clareza. Não agendado nem publicado.\n');
'''+t[end:]
(w/'montar-p01-revisado.mjs').write_text(t,encoding='utf-8')
print('Montagem nova preparada; versão anterior preservada.')
