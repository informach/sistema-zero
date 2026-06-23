import * as THREE from 'three'

/**
 * Geometrias unitárias COMPARTILHADAS (escaladas por peça via `<mesh scale>`). São
 * singletons de módulo — pequenas e reusadas em toda a cena, NÃO dispostas (recriá-las
 * após `dispose()` quebraria um remount do Canvas; o custo é constante e ínfimo). Só a
 * geometria ÚNICA que um builder cria é disposta lá mesmo. Importadas apenas pela árvore
 * client-only do `<Canvas>` (carregada via dynamic ssr:false).
 */
export const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1)
export const UNIT_CYLINDER = new THREE.CylinderGeometry(0.5, 0.5, 1, 14)
export const UNIT_CONE = new THREE.ConeGeometry(0.5, 1, 12)
export const UNIT_SPHERE = new THREE.IcosahedronGeometry(0.5, 1)
