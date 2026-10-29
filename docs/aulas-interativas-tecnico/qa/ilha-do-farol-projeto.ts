import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import { createEmptyProject, type Project } from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { normalizeSZIR } from '../../../packages/studio/src/ir'
import { gameThreeDManifest } from '../../../packages/studio/src/official-extensions/game-3d/manifest'
import { parseJS } from '../../../packages/studio/src/parsers/js'
import {
  ILHA_ASSETS,
  ILHA_MODELS,
  ILHA_PADRAO,
  type IlhaObjeto,
  ilhaNome,
} from './ilha-do-farol-assets'
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
  'aparencia',
  'personalizar',
] as const
export type IlhaParte = (typeof ILHA_PARTES)[number]
/**
 * Põe o modelo onde o Blender o desenhou: o jogo centraliza a caixa do modelo na posição do
 * objeto, então a posição recebe o centro da caixa (`centered` = a posição já é o centro).
 * O tamanho é o lado maior da caixa, o mesmo em todas as variações de cada objeto.
 */
const placed = (
  escolhas: IlhaEscolhas,
  name: IlhaObjeto,
  position: [number, number, number],
  centered = false,
) => {
  const model = ILHA_MODELS[name],
    p = position.map((v, i) => +(v + (centered ? 0 : model.center[i]!)).toFixed(4)),
    asset = ilhaNome(escolhas[name] ?? ILHA_PADRAO[name])
  return `const ${name}=SZGame3D.createModelFile(cena,${JSON.stringify(asset)},${model.size});\nSZGame3D.setPosition(${name},${p.join(',')});`
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
/** Onde o barco para quando o farol acende (o mesmo referencial do `placed`). */
const chegada = [6.6, -0.1, 4.5].map((v, i) => +(v + ILHA_MODELS.barco.center[i]!).toFixed(4))
/** Every rule is represented by extension/programming blocks; no raw JS blocks or page markup. */
export function ilhaSource(parte: IlhaParte, escolhas: IlhaEscolhas = {}): string {
  const n = ILHA_PARTES.indexOf(parte)
  return `
const cena=SZGame3D.createFullscreenScene("#94d5f5");
SZGame3D.frameScene(cena,24,7,14);
${placed(escolhas, 'cenario', [0, 0, 0])}
${placed(escolhas, 'farol', [5.2, 0, 0.1])}
${placed(escolhas, 'barco', [13, -0.1, 4.5])}
${placed(escolhas, 'pedra', [-2, 0, -1])}
${placed(escolhas, 'personagem', [-6.5, 0.8, 0.75], true)}
${placed(escolhas, 'chave', n >= 2 ? [-3, 1, -2] : [-2, 1, -3], true)}
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
  if(temChave){
    ${
      n >= 7
        ? `SZGame3D.playAnimation(farol,"acender","uma-vez");
    ganhou=true;
    aviso="Você acendeu o farol! O barco pode chegar.";`
        : ''
    }
  }else{aviso="Falta a chave. Procure na ilha antes de voltar.";}
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
