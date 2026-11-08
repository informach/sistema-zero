import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import { createEmptyProject, type Project } from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { normalizeSZIR } from '../../../packages/studio/src/ir'
import { gameThreeDManifest } from '../../../packages/studio/src/official-extensions/game-3d/manifest'
import { parseJS } from '../../../packages/studio/src/parsers/js'
import { ILHA_ASSETS, ILHA_PADRAO, type IlhaObjeto, ilhaNome } from './ilha-do-farol-assets'
import type { IlhaPeca } from './publicar-ilha-modelos'

export const ILHA_CURSO = 'jornada-faisca-base-3d'
export const ILHA_PARTES = [
  'inicio',
  'movimento',
  'posicao',
  'recolher',
  'memoria',
  'aviso',
  'sem-chave',
  'decisao',
  'uma-vez',
  'aparencia',
  'personalizar',
] as const
export type IlhaParte = (typeof ILHA_PARTES)[number]
/**
 * Valores didáticos dos blocos: inteiros ou uma casa decimal. O Estúdio posiciona o CENTRO
 * da caixa e usa seu lado maior como tamanho. Os centros calculados das malhas do Blender
 * continuam precisos na biblioteca, mas não viram números para a criança copiar.
 * Todas as variações de cada objeto têm a mesma caixa. O personagem de tamanho 1,6 fica
 * apoiado no chão com o centro na altura 0,8; a altura 2,7 apoia o farol no cais.
 */
export const ILHA_PREPARO: Record<
  IlhaObjeto,
  { tamanho: number; posicao: [number, number, number] }
> = {
  cenario: { tamanho: 140, posicao: [0, 33.6, 0] },
  farol: { tamanho: 5.3, posicao: [5.2, 2.7, 0.1] },
  barco: { tamanho: 3.1, posicao: [13, 1.1, 4.5] },
  pedra: { tamanho: 4.5, posicao: [-2, 1.2, -0.5] },
  personagem: { tamanho: 1.6, posicao: [-6.5, 0.8, 0.8] },
  chave: { tamanho: 1.2, posicao: [-2, 1, -3] },
}
const placed = (
  escolhas: IlhaEscolhas,
  name: IlhaObjeto,
  position: [number, number, number] = ILHA_PREPARO[name].posicao,
) => {
  const asset = ilhaNome(escolhas[name] ?? ILHA_PADRAO[name])
  return `const ${name}=SZGame3D.createModelFile(cena,${JSON.stringify(asset)},${ILHA_PREPARO[name].tamanho});\nSZGame3D.setPosition(${name},${position.join(',')});`
}
/** Os modelos que a criança escolhe na personalização (o resto fica o do começo do curso). */
export type IlhaEscolhas = Partial<Record<IlhaObjeto, IlhaPeca>>
/** A combinação dos exemplos da personalização (a mesma que o vídeo monta). */
export const ILHA_ESCOLHAS_DO_VIDEO: IlhaEscolhas = {
  personagem: 'pirata',
  barco: 'barco-pirata',
  chave: 'chave-de-estrela',
  farol: 'farol-de-pedra',
  cenario: 'cenario-noite-na-ilha',
}
/** O barco chega perto do cais mantendo a mesma altura e profundidade do começo. */
const chegada = [6.6, ILHA_PREPARO.barco.posicao[1], ILHA_PREPARO.barco.posicao[2]]
/** Every rule is represented by extension/programming blocks; no raw JS blocks or page markup. */
export function ilhaSource(parte: IlhaParte, escolhas: IlhaEscolhas = {}): string {
  const n = ILHA_PARTES.indexOf(parte)
  return `
const cena=SZGame3D.createFullscreenScene("#94d5f5");
SZGame3D.frameScene(cena,24,7,14);
${placed(escolhas, 'cenario')}
${placed(escolhas, 'farol')}
${placed(escolhas, 'barco')}
${placed(escolhas, 'pedra')}
${placed(escolhas, 'personagem')}
${placed(escolhas, 'chave', n >= 2 ? [-3, 1, -2] : undefined)}
SZGame3D.walkArea(personagem,-11,1,-5,5);
SZGame3D.walkArea(personagem,0.6,4.1,0.4,1.1);
SZGame3D.walkArea(personagem,4,6.1,-0.5,1.7);
SZGame3D.setSolid(cenario);
SZGame3D.setSolid(pedra);
SZGame3D.walkAnimations(personagem,"parado","andando");
let ganhou=false;
let aviso="Encontre a chave e leve o personagem até o farol.";
${n >= 4 ? 'let temChave=false;' : ''}
SZGame3D.hudText("bottom-center","Setas ou WASD: andar. R: recomeçar.");
SZGame3D.onKey("KeyR",()=>{SZGame3D.restart();});
${
  n >= 3
    ? `SZGame3D.onTouch(personagem,chave,()=>{
  SZGame3D.setVisible(chave,"hide");
  ${n >= 4 ? 'temChave=true;' : ''}
  ${n >= 5 ? 'aviso="Você pegou a chave! Agora vá ao farol.";' : ''}
});`
    : ''
}
${
  n >= 6
    ? `SZGame3D.onTouch(personagem,farol,()=>{
  ${n >= 8 ? 'if(!ganhou){' : ''}
  if(temChave){
    ${
      n >= 7
        ? `SZGame3D.playAnimation(farol,"acender","uma-vez");
    ganhou=true;
    aviso="Você acendeu o farol! O barco pode chegar.";`
        : ''
    }
  }else{aviso="Falta a chave. Procure na ilha antes de voltar.";}
  ${n >= 8 ? '}' : ''}
});`
    : ''
}
SZGame3D.animate(cena,()=>{
  ${n >= 1 ? 'SZGame3D.topDown(personagem,4);' : ''}
  SZGame3D.hudText("top-center",aviso);
  if(ganhou){
    SZGame3D.moveTowards(barco,${chegada.join(',')},1.8);
    if(SZGame3D.animationDone(farol)){SZGame3D.playAnimation(farol,"aceso","repetir");}
  }
});`.trim()
}
export function montarProjetoIlha(
  parte: IlhaParte = 'inicio',
  escolhas: IlhaEscolhas = {},
): Project {
  const ir = normalizeSZIR({
    html: [],
    css: [],
    js: parseJS(ilhaSource(parte, escolhas)),
    extensions: [{ extensionId: 'game-3d' }],
  })
  return {
    ...createEmptyProject('manifest-ilha-farol', 'A Ilha do Farol'),
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: 'A Ilha do Farol' }),
    assets: ILHA_ASSETS,
    installedExtensions: [{ id: 'game-3d', version: gameThreeDManifest.version, installedAt: 0 }],
  }
}
