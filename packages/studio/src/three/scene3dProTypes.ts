/** Portable consumer contract. Runtime algorithms/types remain in the canonical loader. */
export const tiposDeCenas3DPro = `import type { Scene, Group, Camera, Vector3, Object3D, AnimationClip, AnimationMixer, Intersection } from 'three'
export interface Ponto { x:number; y:number; z:number }
export interface Opcoes { maxTextura?:number; aguaDinamica?:boolean; progresso?:(pronto:number,total:number)=>void }
export interface Ator { raiz:Object3D; animacoes:AnimationClip[]; mixer:AnimationMixer; animavel:boolean; descartar():void }
export interface Superficies {
  readonly arvores:number
  readonly limiteInferior:number|null
  resolver(pes:Vector3,altura:number,raio:number):{posicao:Vector3;normais:Vector3[];candidatos:number}
  rastrear(de:Vector3,ate:Vector3):{ponto:Vector3;normal:Vector3;distancia:number}|null
  apoio(x:number,z:number,raio:number,topo:number,fundo:number,normalMinima:number,incluiMinima?:boolean):{y:number;normal:Ponto}|null
}
export interface Cena3D {
  readonly cena:Scene
  readonly raiz:Group
  readonly dados:unknown
  readonly agua:unknown
  readonly entidades:ReadonlyMap<string,unknown>
  readonly atores:ReadonlyMap<string,readonly Ator[]>
  readonly instancias:ReadonlyMap<string,Ator>
  readonly alturas:(((x:number,z:number)=>number)&{temChao?:(p:{x:number;z:number})=>boolean})|undefined
  readonly colisoes:Superficies
  entidade(contato:Pick<Intersection,'object'|'faceIndex'>):string|null
  atualizar(delta:number,movimentoReduzido?:boolean):void
  quadro(camera:Camera,alvo:Vector3):void
  descartar():void
}
export interface CenaInstalada extends Cena3D {
  readonly fisica:{
    active():boolean
    resolve(pes:Ponto,altura:number,raio:number):{position:Ponto;normals:readonly Ponto[]}
    raycast(de:Ponto,ate:Ponto):{distance:number;normal:Ponto}|null
    apoio(x:number,z:number,raio:number,topo:number,fundo:number,normalMinima:number,incluiMinima?:boolean):{y:number;normal:Ponto}|null
  }
}
export declare function carregar(id:string,sinal:AbortSignal,opcoes?:Opcoes):Promise<Cena3D>
export declare function instalar(id:string,cena:Scene,sinal:AbortSignal,opcoes?:Opcoes):Promise<CenaInstalada>
export declare function instalado(cena:Scene):CenaInstalada|undefined
export declare function inicio(cena:Cena3D):{posicao:Vector3;giro:number;marcador:string|null}
export declare function encerrar():void
`
