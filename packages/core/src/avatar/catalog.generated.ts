// Gerado por `bun run avatar:migrar` (scripts/avatar). Não edite à mão o que vem da arte;
// preço, faixa e marca de menina ou menino de uma peça já migrada podem ser corrigidos aqui.
import type { AvatarCatalog } from './types'

export const AVATAR_CATALOG: AvatarCatalog = {
  "version": 1,
  "source": {
    "repo": "informach/artes-3d",
    "ref": "origin/main",
    "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
    "syncedAt": "2026-11-13",
    "rulesBlob": "f4592eacb68e88a7ddbc5df4ce74784d7ec13643"
  },
  "base": {
    "skeleton": {
      "file": "base/esqueleto.8f0aaa27a781.glb",
      "blob": "5737da8475dfdc7af297d195290d6091db325b06",
      "clips": [
        "parado_relaxado",
        "parado_olhando",
        "correr_frente",
        "chute",
        "soco",
        "pulo_no_ar",
        "defender_com_as_maos",
        "pose_a"
      ],
      "catalogBlob": "0189cc33e322a8fa1caa688bddd0bfc5028c3ac8",
      "bones": {
        "Root": {
          "parent": null,
          "head": [
            0,
            0,
            0
          ]
        },
        "Hips": {
          "parent": "Root",
          "head": [
            0,
            0.3139,
            -0.0003
          ]
        },
        "LeftUpLeg": {
          "parent": "Hips",
          "head": [
            0.0695,
            0.3389,
            -0.0056
          ]
        },
        "LeftLeg": {
          "parent": "LeftUpLeg",
          "head": [
            0.0695,
            0.1915,
            0.0194
          ]
        },
        "LeftFoot": {
          "parent": "LeftLeg",
          "head": [
            0.068,
            0.033,
            -0.0254
          ]
        },
        "LeftToeBase": {
          "parent": "LeftFoot",
          "head": [
            0.068,
            0.0201,
            0.0535
          ]
        },
        "Spine": {
          "parent": "Hips",
          "head": [
            0,
            0.407,
            0
          ]
        },
        "Spine1": {
          "parent": "Spine",
          "head": [
            0,
            0.4929,
            -0.0019
          ]
        },
        "Neck": {
          "parent": "Spine1",
          "head": [
            0,
            0.5668,
            -0.007
          ]
        },
        "Head": {
          "parent": "Neck",
          "head": [
            0,
            0.6225,
            0.0095
          ]
        },
        "LeftShoulder": {
          "parent": "Spine1",
          "head": [
            0.011,
            0.5472,
            0.0045
          ]
        },
        "LeftArm": {
          "parent": "LeftShoulder",
          "head": [
            0.0897,
            0.535,
            -0.008
          ]
        },
        "LeftForeArm": {
          "parent": "LeftArm",
          "head": [
            0.2139,
            0.4721,
            -0.0303
          ]
        },
        "LeftHand": {
          "parent": "LeftForeArm",
          "head": [
            0.3061,
            0.4043,
            -0.012
          ]
        },
        "LeftHandIndex1": {
          "parent": "LeftHand",
          "head": [
            0.381,
            0.3623,
            0.025
          ]
        },
        "LeftHandIndex2": {
          "parent": "LeftHandIndex1",
          "head": [
            0.3961,
            0.3438,
            0.0248
          ]
        },
        "LeftHandMiddle1": {
          "parent": "LeftHand",
          "head": [
            0.3783,
            0.3633,
            0.0001
          ]
        },
        "LeftHandMiddle2": {
          "parent": "LeftHandMiddle1",
          "head": [
            0.3926,
            0.3463,
            0
          ]
        },
        "LeftHandPinky1": {
          "parent": "LeftHand",
          "head": [
            0.3715,
            0.3636,
            -0.0425
          ]
        },
        "LeftHandPinky2": {
          "parent": "LeftHandPinky1",
          "head": [
            0.3816,
            0.3516,
            -0.0443
          ]
        },
        "LeftHandProp": {
          "parent": "LeftHand",
          "head": [
            0.3475,
            0.3444,
            -0.0096
          ]
        },
        "LeftHandRing1": {
          "parent": "LeftHand",
          "head": [
            0.3787,
            0.3643,
            -0.0222
          ]
        },
        "LeftHandRing2": {
          "parent": "LeftHandRing1",
          "head": [
            0.3895,
            0.3469,
            -0.0232
          ]
        },
        "LeftHandThumb1": {
          "parent": "LeftHand",
          "head": [
            0.3243,
            0.3748,
            0.0267
          ]
        },
        "LeftHandThumb2": {
          "parent": "LeftHandThumb1",
          "head": [
            0.3466,
            0.3452,
            0.0475
          ]
        },
        "RightShoulder": {
          "parent": "Spine1",
          "head": [
            -0.011,
            0.5472,
            0.0045
          ]
        },
        "RightArm": {
          "parent": "RightShoulder",
          "head": [
            -0.0897,
            0.535,
            -0.008
          ]
        },
        "RightForeArm": {
          "parent": "RightArm",
          "head": [
            -0.2139,
            0.4721,
            -0.0303
          ]
        },
        "RightHand": {
          "parent": "RightForeArm",
          "head": [
            -0.3061,
            0.4043,
            -0.012
          ]
        },
        "RightHandIndex1": {
          "parent": "RightHand",
          "head": [
            -0.381,
            0.3623,
            0.025
          ]
        },
        "RightHandIndex2": {
          "parent": "RightHandIndex1",
          "head": [
            -0.3961,
            0.3438,
            0.0248
          ]
        },
        "RightHandMiddle1": {
          "parent": "RightHand",
          "head": [
            -0.3783,
            0.3633,
            0.0001
          ]
        },
        "RightHandMiddle2": {
          "parent": "RightHandMiddle1",
          "head": [
            -0.3926,
            0.3463,
            0
          ]
        },
        "RightHandPinky1": {
          "parent": "RightHand",
          "head": [
            -0.3715,
            0.3636,
            -0.0425
          ]
        },
        "RightHandPinky2": {
          "parent": "RightHandPinky1",
          "head": [
            -0.3816,
            0.3516,
            -0.0443
          ]
        },
        "RightHandProp": {
          "parent": "RightHand",
          "head": [
            -0.3475,
            0.3444,
            -0.0096
          ]
        },
        "RightHandRing1": {
          "parent": "RightHand",
          "head": [
            -0.3787,
            0.3643,
            -0.0222
          ]
        },
        "RightHandRing2": {
          "parent": "RightHandRing1",
          "head": [
            -0.3895,
            0.3469,
            -0.0232
          ]
        },
        "RightHandThumb1": {
          "parent": "RightHand",
          "head": [
            -0.3243,
            0.3748,
            0.0267
          ]
        },
        "RightHandThumb2": {
          "parent": "RightHandThumb1",
          "head": [
            -0.3466,
            0.3452,
            0.0475
          ]
        },
        "RightUpLeg": {
          "parent": "Hips",
          "head": [
            -0.0695,
            0.3389,
            -0.0056
          ]
        },
        "RightLeg": {
          "parent": "RightUpLeg",
          "head": [
            -0.0695,
            0.1915,
            0.0194
          ]
        },
        "RightFoot": {
          "parent": "RightLeg",
          "head": [
            -0.068,
            0.033,
            -0.0254
          ]
        },
        "RightToeBase": {
          "parent": "RightFoot",
          "head": [
            -0.068,
            0.0201,
            0.0535
          ]
        }
      },
      "sockets": {
        "mao_esquerda": "LeftHandProp",
        "mao_direita": "RightHandProp"
      },
      "height": 1.156,
      "game": {
        "file": "base/animacoes-do-jogo.b448925e3f75.glb",
        "clips": [
          {
            "id": "parado_relaxado",
            "duration": 4.3,
            "loop": true,
            "stride": 0,
            "rise": 0
          },
          {
            "id": "andar_frente",
            "duration": 0.8,
            "loop": true,
            "stride": 0.492,
            "rise": 0
          },
          {
            "id": "correr_frente",
            "duration": 0.633,
            "loop": true,
            "stride": 0.701,
            "rise": 0
          },
          {
            "id": "agachado_frente",
            "duration": 1,
            "loop": true,
            "stride": 0.6,
            "rise": 0.005
          },
          {
            "id": "pulo_inicio",
            "duration": 0.6,
            "loop": false,
            "stride": 0.071,
            "rise": 0.97
          },
          {
            "id": "pulo_no_ar",
            "duration": 1.267,
            "loop": true,
            "stride": 0,
            "rise": 0
          },
          {
            "id": "pulo_fim",
            "duration": 0.833,
            "loop": false,
            "stride": 0.071,
            "rise": -0.971
          },
          {
            "id": "cair",
            "duration": 2.8,
            "loop": false,
            "stride": 0,
            "rise": 0
          },
          {
            "id": "subir_escada",
            "duration": 1.133,
            "loop": true,
            "stride": 0.027,
            "rise": 0.498
          }
        ]
      }
    },
    "textures": {
      "4ac8d6fb85e0": "base/textura.4ac8d6fb85e0.webp"
    }
  },
  "parts": {
    "barba_cavanhaque_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Barba com cavanhaque",
      "audience": "boy",
      "tier": "coins",
      "price": 70,
      "band": "especial",
      "review": true,
      "file": "pecas/barba_cavanhaque_pacote.533ffb42466d.glb",
      "thumb": "miniaturas/barba_cavanhaque_pacote.43ae0e75f017.webp",
      "tris": 362,
      "origin": {
        "blob": "619d7e46a582ec60803acff481761eb751ed6cbf",
        "thumbBlob": "3fb571c52f1b62eb46deef380b174aa6e0cc1b9d",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "barba_cheia_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Barba cheia",
      "audience": "boy",
      "tier": "coins",
      "price": 70,
      "band": "especial",
      "review": true,
      "file": "pecas/barba_cheia_pacote.cf2da92730fe.glb",
      "thumb": "miniaturas/barba_cheia_pacote.b4f2c9a7154a.webp",
      "tris": 320,
      "origin": {
        "blob": "219022c49034cf51b3e6c883032c8fa1857dbc5c",
        "thumbBlob": "5d5cb1a73774a5c73d3d8d8fd3ac8846b7f9fb1a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "barba_dentes_vampiro_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Barba com dentes de vampiro",
      "audience": "boy",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/barba_dentes_vampiro_pacote.fc2903d638d8.glb",
      "thumb": "miniaturas/barba_dentes_vampiro_pacote.2f21d5a3d101.webp",
      "tris": 278,
      "origin": {
        "blob": "77b18df5654b08e37efc1a5cfbfca87b8a9b8e28",
        "thumbBlob": "79f7af283282bf56f87b51e4236eaa1b655e9be2",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "bermuda_branca_pacote": {
      "slot": "bermuda",
      "group": "bermuda",
      "label": "Bermuda branca",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/bermuda_branca_pacote.e58e0e80921d.glb",
      "thumb": "miniaturas/bermuda_branca_pacote.bd31be2281f3.webp",
      "tris": 416,
      "origin": {
        "blob": "0f894611ff7cbe4401dfc4d197ef2abec5939bbf",
        "thumbBlob": "7f6f907e308ac14540363e2c715ccdd206a89691",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "bermuda_short_vermelho_pacote": {
      "slot": "bermuda",
      "group": "bermuda",
      "label": "Short vermelho",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/bermuda_short_vermelho_pacote.412871db9be9.glb",
      "thumb": "miniaturas/bermuda_short_vermelho_pacote.81659665e8ec.webp",
      "tris": 196,
      "origin": {
        "blob": "498e05edfaa2a2fd029c23a4c9720f8052082a09",
        "thumbBlob": "5c4cae1c262e8aaaf4c6989ff931ce4f6d09076b",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "bermuda_verde_pacote": {
      "slot": "bermuda",
      "group": "bermuda",
      "label": "Bermuda verde",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/bermuda_verde_pacote.cabc9c92f09e.glb",
      "thumb": "miniaturas/bermuda_verde_pacote.e4d488d1b6c0.webp",
      "tris": 284,
      "origin": {
        "blob": "6aac57de3b9e24cbfa9f2df3524d91815938cbb2",
        "thumbBlob": "073741ba60d2b7a5caad5659a46889e6232417ba",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "bigode_01_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Bigode 1",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/bigode_01_pacote.c3b3b491c5ff.glb",
      "thumb": "miniaturas/bigode_01_pacote.493dc7641716.webp",
      "tris": 352,
      "origin": {
        "blob": "c81df830eb2032552382a1221b168ff90db95a2c",
        "thumbBlob": "9f178e753ebd9b447e0ee48bef36ec2fbb3fe282",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "bigode_02_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Bigode 2",
      "audience": "boy",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/bigode_02_pacote.e251af1e1f49.glb",
      "thumb": "miniaturas/bigode_02_pacote.c949e8192321.webp",
      "tris": 352,
      "origin": {
        "blob": "57ce0222595a34019eb9beb3d0c0a12280f608bd",
        "thumbBlob": "a00d3e1a58c883e64610c7af76fb2a9c9ace221a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "bigode_03_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Bigode 3",
      "audience": "boy",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/bigode_03_pacote.10fe7a829b59.glb",
      "thumb": "miniaturas/bigode_03_pacote.89b92e6e3dd1.webp",
      "tris": 448,
      "origin": {
        "blob": "fd1a0c962614514b2ea4b638a60218afc04660eb",
        "thumbBlob": "108f36e9e48d9eb973b84a294ebcb0547a936875",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "bigode_04_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Bigode 4",
      "audience": "boy",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/bigode_04_pacote.1ec07ee5b916.glb",
      "thumb": "miniaturas/bigode_04_pacote.9a0b4fb713e1.webp",
      "tris": 800,
      "origin": {
        "blob": "df5780ce7190c0ebea1bc73d581db6cb86bc199d",
        "thumbBlob": "59bc80ef07847843ec444cf8dd715aaf39eee372",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "bigode_05_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Bigode 5",
      "audience": "boy",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/bigode_05_pacote.d3b152ad6602.glb",
      "thumb": "miniaturas/bigode_05_pacote.133837e7bf7a.webp",
      "tris": 128,
      "origin": {
        "blob": "a3e500e49f74c03cba159902e127c8debec47ea5",
        "thumbBlob": "8b8996752f195175794ea9c40d184e93ba7b6e69",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "bigode_06_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Bigode 6",
      "audience": "boy",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/bigode_06_pacote.04cd4a4aed1c.glb",
      "thumb": "miniaturas/bigode_06_pacote.118d9f9556e9.webp",
      "tris": 288,
      "origin": {
        "blob": "19dec70844066971223134261a037f838b9f54ec",
        "thumbBlob": "191f51e5f8ebfd5bcbfddf96a5fe53b37b87c0e3",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "bigode_07_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Bigode 7",
      "audience": "boy",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/bigode_07_pacote.cdae70f97a7a.glb",
      "thumb": "miniaturas/bigode_07_pacote.48e15afd319c.webp",
      "tris": 72,
      "origin": {
        "blob": "ec1e641b0ad2e5b56aec89ae1c34ca475b442d3d",
        "thumbBlob": "af21bba8c8115fa185f99c6f6beb6e86dd8d3953",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "bigode_08_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Bigode 8",
      "audience": "boy",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/bigode_08_pacote.d8a26478e722.glb",
      "thumb": "miniaturas/bigode_08_pacote.a71e1533fc19.webp",
      "tris": 304,
      "origin": {
        "blob": "6b8166bbc4490407b50114b1995dde360e8b0335",
        "thumbBlob": "1d0cae28c3f385e1245645bde02bce006711b7a9",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "bigode_09_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Bigode 9",
      "audience": "boy",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/bigode_09_pacote.cda4bb272c99.glb",
      "thumb": "miniaturas/bigode_09_pacote.b77b04ac0d5c.webp",
      "tris": 352,
      "origin": {
        "blob": "4a51a96066349d5caadbb4609973648a75f3ec0c",
        "thumbBlob": "29f45568778988a64d6819c604f2fc4cf20ce90e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "bigode_10_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Bigode 10",
      "audience": "boy",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/bigode_10_pacote.41868421246d.glb",
      "thumb": "miniaturas/bigode_10_pacote.3a65c710787b.webp",
      "tris": 432,
      "origin": {
        "blob": "1d7a9888765bbecec1611492c1352e94b0bd7824",
        "thumbBlob": "b96856df0cabbbf97df4ac34c1c7c8f9e728321c",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "bigode_11_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Bigode 11",
      "audience": "boy",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/bigode_11_pacote.ed8ce58d4af3.glb",
      "thumb": "miniaturas/bigode_11_pacote.fb347d5568b8.webp",
      "tris": 128,
      "origin": {
        "blob": "a7fcffb00f06bdc50ba8dc7142895359caf7e57f",
        "thumbBlob": "0589f2530d4792290cc4f4e96b1c3da3baf5aba6",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "bigode_12_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Bigode 12",
      "audience": "boy",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/bigode_12_pacote.c5be35f805e7.glb",
      "thumb": "miniaturas/bigode_12_pacote.7779f2cf4057.webp",
      "tris": 224,
      "origin": {
        "blob": "ca269d0d921072617b5c780088cc92cf504c287f",
        "thumbBlob": "3330f9d008cf96fb708e6c7521a5b8ba2233c341",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "bigode_13_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Bigode 13",
      "audience": "boy",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/bigode_13_pacote.4bf2f6036ad2.glb",
      "thumb": "miniaturas/bigode_13_pacote.5e7eda8059a2.webp",
      "tris": 352,
      "origin": {
        "blob": "ce36ce6c2828f3d12c3178ad35c889f87fd6b5d9",
        "thumbBlob": "fa21937d377b7a7de3283345c8d63a9fb907e83a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "bigode_14_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Bigode 14",
      "audience": "boy",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/bigode_14_pacote.8ef0394f547b.glb",
      "thumb": "miniaturas/bigode_14_pacote.11a88ac004a6.webp",
      "tris": 288,
      "origin": {
        "blob": "231acef0f9433f85d765d64c56ab0a44815083a0",
        "thumbBlob": "3cc43a6b94b3c3b6610b4c13bff011e72ea7dc82",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "bigode_15_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Bigode 15",
      "audience": "boy",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/bigode_15_pacote.38a307588ae4.glb",
      "thumb": "miniaturas/bigode_15_pacote.cb44a8ac1a42.webp",
      "tris": 140,
      "origin": {
        "blob": "69dacd4aa430ac924105af9755d29692a9abb574",
        "thumbBlob": "4f6342ce1d2a7e33cc68c2988a641d74b0894147",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "brincos_argola_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Brincos de argola",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/brincos_argola_pacote.d8788c682b1d.glb",
      "thumb": "miniaturas/brincos_argola_pacote.5ae4926a5312.webp",
      "tris": 160,
      "origin": {
        "blob": "8e9569784e3d2b50bbcfdf05ab0f7c3de1709a57",
        "thumbBlob": "8fad6dd752fb6d4243b7da6a354d2aa7e59dfa63",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_arco_iris_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo arco-íris",
      "audience": "both",
      "tier": "coins",
      "price": 120,
      "band": "raro",
      "review": true,
      "file": "pecas/cabelo_arco_iris_pacote.d8a60f5af80e.glb",
      "thumb": "miniaturas/cabelo_arco_iris_pacote.8435867f3da3.webp",
      "tris": 368,
      "origin": {
        "blob": "e8baa95900bbb272037139bd3de23aa9b0c1ea07",
        "thumbBlob": "57776d24044c5227ff0650637780d5b1f09745b2",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_black_power": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo black power castanho-escuro",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/cabelo_black_power.f875d97cf37e.glb",
      "thumb": "miniaturas/cabelo_black_power.f188617bae24.webp",
      "tris": 6330,
      "origin": {
        "blob": "9f01ad4c3993c13a746e6cc7c50995bc964ef7fc",
        "thumbBlob": "d8eb2ebc8ad6f8e88193c1de09f0ffbd50fd663e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_cacheado_curto_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo cacheado curto",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/cabelo_cacheado_curto_pacote.a62d76d25bec.glb",
      "thumb": "miniaturas/cabelo_cacheado_curto_pacote.cb32d6d7482e.webp",
      "tris": 3367,
      "origin": {
        "blob": "99c00a8d0b077afff1947d7e846bfa8bae257041",
        "thumbBlob": "261863b67fb8400c329c1a2562db10742bae5830",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_cacheado_grisalho_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo cacheado grisalho",
      "audience": "girl",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/cabelo_cacheado_grisalho_pacote.ee262ed936a9.glb",
      "thumb": "miniaturas/cabelo_cacheado_grisalho_pacote.ad045273ede4.webp",
      "tris": 3638,
      "origin": {
        "blob": "be0592ab66e0e5cf64e24cea50ef94797cf89177",
        "thumbBlob": "13f0ddbf7702a3de87affdca8a27e79021c2d154",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_cacheado_rosa_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo cacheado rosa",
      "audience": "girl",
      "tier": "coins",
      "price": 120,
      "band": "raro",
      "review": true,
      "file": "pecas/cabelo_cacheado_rosa_pacote.ca7cc56b6589.glb",
      "thumb": "miniaturas/cabelo_cacheado_rosa_pacote.e1718c6f3dc6.webp",
      "tris": 1962,
      "origin": {
        "blob": "f3c0521f0ac4281c0d008d623b338f250dbd7c42",
        "thumbBlob": "409d059062286f347187ce8ee8e1c0d02c21d750",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_cachos_longos_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo cachos longos (crespo)",
      "audience": "girl",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/cabelo_cachos_longos_pacote.f10f64ea4c7a.glb",
      "thumb": "miniaturas/cabelo_cachos_longos_pacote.3128dac6cfcd.webp",
      "tris": 6330,
      "origin": {
        "blob": "d55599acbc9cfa2acc3e987656b2c35424bcd0a0",
        "thumbBlob": "7cd31f45a2a7171ef311b1abb2c4ae89d2a38a76",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_chanel_castanho_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo chanel castanho",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/cabelo_chanel_castanho_pacote.f9bea16a766c.glb",
      "thumb": "miniaturas/cabelo_chanel_castanho_pacote.9755041c1ccb.webp",
      "tris": 1650,
      "origin": {
        "blob": "2067addef197fc3e121c971fba63539cad5a000c",
        "thumbBlob": "db6f0f2645922fa00522e82b14ec73c8a26ba6f8",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_chanel_franja_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo chanel com franja",
      "audience": "girl",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/cabelo_chanel_franja_pacote.7f4592de4dc7.glb",
      "thumb": "miniaturas/cabelo_chanel_franja_pacote.b819bb3c6309.webp",
      "tris": 536,
      "origin": {
        "blob": "7a1727acbd8a0b945201a495bb5b6891f8e602ac",
        "thumbBlob": "a963329f778478151df8419dd8641ec5480071f0",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_coque_alto_loiro_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo coque alto loiro",
      "audience": "girl",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/cabelo_coque_alto_loiro_pacote.668c5adaaaa2.glb",
      "thumb": "miniaturas/cabelo_coque_alto_loiro_pacote.6db28097233b.webp",
      "tris": 986,
      "origin": {
        "blob": "8628f19f54ff8d8e8463ddb20f34c138177d1d12",
        "thumbBlob": "ffbf987eee8536cf75c3c1162e9fee1c33e08b81",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_coque_baixo_sob_chapeu": {
      "slot": "cabelo",
      "group": "cabelo_sob_chapeu",
      "label": "Coque baixo (para chapéu e enfeite)",
      "audience": "girl",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/cabelo_coque_baixo_sob_chapeu.a6251d16d01a.glb",
      "thumb": "miniaturas/cabelo_coque_baixo_sob_chapeu.b5c54ced12c0.webp",
      "tris": 867,
      "origin": {
        "blob": "6dc3003ea99308d9c4a4c8e5c25aecaa850ec776",
        "thumbBlob": "2127bc10b661f6a55c7c56cac5b558714fb51e7a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_coque_crespo": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Coque crespo",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/cabelo_coque_crespo.b02d18700ad6.glb",
      "thumb": "miniaturas/cabelo_coque_crespo.0199fe3b332c.webp",
      "tris": 5325,
      "origin": {
        "blob": "601c6e9f3db5d3d36a00e4feda0c631bce6a882f",
        "thumbBlob": "55162860a19f4022d79828941e4b3bf953b48372",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_coque_faixa_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo coque com faixa",
      "audience": "girl",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/cabelo_coque_faixa_pacote.28e61e8b7c96.glb",
      "thumb": "miniaturas/cabelo_coque_faixa_pacote.f3c8eaac204c.webp",
      "tris": 635,
      "origin": {
        "blob": "aeaa5edc403fd6f552490092e480069676463441",
        "thumbBlob": "74b4e0247ae67ccadacbf7765ee1d538da661c3a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_crespo_sob_chapeu": {
      "slot": "cabelo",
      "group": "cabelo_sob_chapeu",
      "label": "Cabelo crespo (para chapéu e enfeite)",
      "audience": "both",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/cabelo_crespo_sob_chapeu.cbadea6b646f.glb",
      "thumb": "miniaturas/cabelo_crespo_sob_chapeu.a7dd0b6dcc7e.webp",
      "tris": 1553,
      "origin": {
        "blob": "e1f91059d7c46e17b6d0ba8813182be4a88468bf",
        "thumbBlob": "fb4693630a972d4eddec95e0df108c6b829ab450",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_curto_castanho_pacote": {
      "slot": "cabelo",
      "group": "cabelo_sob_chapeu",
      "label": "Cabelo curto castanho (sob chapéu)",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/cabelo_curto_castanho_pacote.063900b4445b.glb",
      "thumb": "miniaturas/cabelo_curto_castanho_pacote.a0d9850aceb2.webp",
      "tris": 748,
      "origin": {
        "blob": "cfc4e21f9e5dca3ba2a8a3438c62274448ade85c",
        "thumbBlob": "97f8ad537c04f90015968ae0c8c17a042fedbd3c",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_curto_escuro_1_pacote": {
      "slot": "cabelo",
      "group": "cabelo_sob_chapeu",
      "label": "Cabelo curto escuro 1 (sob chapéu)",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/cabelo_curto_escuro_1_pacote.740b5eb269d8.glb",
      "thumb": "miniaturas/cabelo_curto_escuro_1_pacote.ce2db5f9a144.webp",
      "tris": 692,
      "origin": {
        "blob": "00ab767d55faa402e288007aaace926eeed3050e",
        "thumbBlob": "ff5fcc1c91fc09e100cf5901d8e3014f49ae9201",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_curto_escuro_2_pacote": {
      "slot": "cabelo",
      "group": "cabelo_sob_chapeu",
      "label": "Cabelo curto escuro 2 (sob chapéu)",
      "audience": "boy",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/cabelo_curto_escuro_2_pacote.d91935982c1d.glb",
      "thumb": "miniaturas/cabelo_curto_escuro_2_pacote.c9887a10ebf3.webp",
      "tris": 668,
      "origin": {
        "blob": "45de80084a61b7f3cd717298683830e4d5a1ee78",
        "thumbBlob": "cc7ff12644493cf5ace9c9ab5dcbfd4101dda34e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_curto_loiro_1_pacote": {
      "slot": "cabelo",
      "group": "cabelo_sob_chapeu",
      "label": "Cabelo curto loiro 1 (sob chapéu)",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/cabelo_curto_loiro_1_pacote.eb4fb325b52a.glb",
      "thumb": "miniaturas/cabelo_curto_loiro_1_pacote.978409b2bc5a.webp",
      "tris": 692,
      "origin": {
        "blob": "73de607c2fe0a564435aaf8e6c140924da78cb9d",
        "thumbBlob": "87af2294c56fc1ae88b49069f7d207d8a3d85dcc",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_curto_loiro_2_pacote": {
      "slot": "cabelo",
      "group": "cabelo_sob_chapeu",
      "label": "Cabelo curto loiro 2 (sob chapéu)",
      "audience": "boy",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/cabelo_curto_loiro_2_pacote.ab41cd7ccbde.glb",
      "thumb": "miniaturas/cabelo_curto_loiro_2_pacote.a046cd71414b.webp",
      "tris": 668,
      "origin": {
        "blob": "d131765059a3cafb51dd4b07bcbc29b474db1fbc",
        "thumbBlob": "55d126010cda62d371b0550aea64e4f751684d72",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_curto_loiro_3_pacote": {
      "slot": "cabelo",
      "group": "cabelo_sob_chapeu",
      "label": "Cabelo curto loiro 3 (sob chapéu)",
      "audience": "boy",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/cabelo_curto_loiro_3_pacote.97a8e5e39d77.glb",
      "thumb": "miniaturas/cabelo_curto_loiro_3_pacote.bad9d8db9df1.webp",
      "tris": 748,
      "origin": {
        "blob": "83edcb7d05a14f58b8db8773b32efe1a6709c582",
        "thumbBlob": "d82b4c6e0e941b174279b729fd94d63b761fd18e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_dreadlocks_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo dreadlocks",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/cabelo_dreadlocks_pacote.a216ba039735.glb",
      "thumb": "miniaturas/cabelo_dreadlocks_pacote.9c70b8306a2d.webp",
      "tris": 5828,
      "origin": {
        "blob": "608485a9bf6aecc36b80e0ae893d558c2d6ec9a1",
        "thumbBlob": "6a9d48a712ede67122a086416d7e03602f20fe87",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_franja_ruiva_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo franja ruiva",
      "audience": "boy",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/cabelo_franja_ruiva_pacote.74e6ff975dbe.glb",
      "thumb": "miniaturas/cabelo_franja_ruiva_pacote.7abcf68542ee.webp",
      "tris": 1509,
      "origin": {
        "blob": "dfe6a11ebbbb89a8fca463614fec7b36630d0fe2",
        "thumbBlob": "b68ef503abd77677624ad85cab8b37c6127d757e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_liso_branco_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo liso branco",
      "audience": "boy",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/cabelo_liso_branco_pacote.ec75d068e9ec.glb",
      "thumb": "miniaturas/cabelo_liso_branco_pacote.eb24ad00f179.webp",
      "tris": 2034,
      "origin": {
        "blob": "48146fabc17b0c0088cfe1521cf406a46ee9a7ed",
        "thumbBlob": "718263b32adb41ab94d814cde4206220386cb760",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_liso_cinza_04_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo liso cinza",
      "audience": "girl",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/cabelo_liso_cinza_04_pacote.5a5a146356dc.glb",
      "thumb": "miniaturas/cabelo_liso_cinza_04_pacote.9f4511c19f68.webp",
      "tris": 858,
      "origin": {
        "blob": "2dc3596a6ba7438489fe8e08fff23afb7c94399b",
        "thumbBlob": "2191300d6d285e4de6f0b29fa9d3ada3191c6e2b",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_liso_cinza_05_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo liso cinza",
      "audience": "boy",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/cabelo_liso_cinza_05_pacote.495cae74c6eb.glb",
      "thumb": "miniaturas/cabelo_liso_cinza_05_pacote.8116754db225.webp",
      "tris": 872,
      "origin": {
        "blob": "f8bd18d8476365baa2ccb8af7687ab629582a7bf",
        "thumbBlob": "c1cb4c65bd3fd5f1881993b241b3b6934bd89685",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_liso_grisalho_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo liso grisalho",
      "audience": "boy",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/cabelo_liso_grisalho_pacote.02f35db6030f.glb",
      "thumb": "miniaturas/cabelo_liso_grisalho_pacote.e42a24d5e82a.webp",
      "tris": 630,
      "origin": {
        "blob": "26ae3cd18d66d564f39e00f23b4bee1dcf4f7cbd",
        "thumbBlob": "3372215e0c000f536f521851b1c568fc4d7ca9c2",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_liso_preto_branco_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo liso preto e branco",
      "audience": "girl",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/cabelo_liso_preto_branco_pacote.727386c57047.glb",
      "thumb": "miniaturas/cabelo_liso_preto_branco_pacote.10fd605e36dd.webp",
      "tris": 2818,
      "origin": {
        "blob": "4ce3575ae709f2c488bb24fbb59e8a7a58a89362",
        "thumbBlob": "37eb4b95b2f114b9e83ee78d2c8a038304afe13a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_loiro_curto_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo loiro curto",
      "audience": "boy",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/cabelo_loiro_curto_pacote.d405cf1ffadf.glb",
      "thumb": "miniaturas/cabelo_loiro_curto_pacote.4aaa8d390f3e.webp",
      "tris": 288,
      "origin": {
        "blob": "dc4e3267256b1211ea2140cbfe10614ba07ea09b",
        "thumbBlob": "dc66a07e9f7fbdf9eee2820e294cee115e9ba6f7",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_maria_chiquinha": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Maria-chiquinha",
      "audience": "girl",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/cabelo_maria_chiquinha.926419d16d87.glb",
      "thumb": "miniaturas/cabelo_maria_chiquinha.cac884b531ad.webp",
      "tris": 1800,
      "origin": {
        "blob": "0fc794d98ffa41089869cb290cfa36a216fdf9f0",
        "thumbBlob": "e596e1a1590a70c4465a5dd366cb74f72e4ed5cf",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_mecha_lateral_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo mecha lateral",
      "audience": "boy",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/cabelo_mecha_lateral_pacote.0adf4ba1c352.glb",
      "thumb": "miniaturas/cabelo_mecha_lateral_pacote.6e59a92a5229.webp",
      "tris": 124,
      "origin": {
        "blob": "2c41613437d4dfe6166e8b148c90b958efdbdd05",
        "thumbBlob": "ab0ff55a716efcd6ecb2fdd3234576bc499a0ae9",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_ondulado_castanho_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo ondulado castanho",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/cabelo_ondulado_castanho_pacote.bfa0c71ffa24.glb",
      "thumb": "miniaturas/cabelo_ondulado_castanho_pacote.2d0003d3a669.webp",
      "tris": 914,
      "origin": {
        "blob": "2244db1b15e416148a92f48cf9140ceb7aa8fcdb",
        "thumbBlob": "e0ffa95e0f309314576d962b3dc43b5671815bda",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_ondulado_escuro_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo ondulado escuro",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/cabelo_ondulado_escuro_pacote.31cde8998966.glb",
      "thumb": "miniaturas/cabelo_ondulado_escuro_pacote.eae5f64644f9.webp",
      "tris": 1469,
      "origin": {
        "blob": "fdefb4b884a20f04b444a939cac963ffc99c3444",
        "thumbBlob": "daa67509475829516a4e29625494085b3000a6e9",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_orelhinhas_rato_loiro_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo orelhinhas de rato loiro",
      "audience": "girl",
      "tier": "coins",
      "price": 120,
      "band": "raro",
      "review": true,
      "file": "pecas/cabelo_orelhinhas_rato_loiro_pacote.aab866773d86.glb",
      "thumb": "miniaturas/cabelo_orelhinhas_rato_loiro_pacote.1a1089f6bbdc.webp",
      "tris": 1800,
      "origin": {
        "blob": "a1eaf891a4675f1a3fbf1ef78d78076da778e51c",
        "thumbBlob": "47b275888e8f882eff8d440650c3d228d3915e38",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_peruca_cachos_branca_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo peruca de cachos branca",
      "audience": "boy",
      "tier": "coins",
      "price": 120,
      "band": "raro",
      "review": true,
      "file": "pecas/cabelo_peruca_cachos_branca_pacote.c65a23354f3e.glb",
      "thumb": "miniaturas/cabelo_peruca_cachos_branca_pacote.ec2416ff8818.webp",
      "tris": 1336,
      "origin": {
        "blob": "36387d14a52485fe4cd24447cf3e2bb1cf295d05",
        "thumbBlob": "e7f8aca346c1f41281c23579cccaeb6124b6791c",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_rabo_cavalo_sob_chapeu": {
      "slot": "cabelo",
      "group": "cabelo_sob_chapeu",
      "label": "Rabo de cavalo (para chapéu e enfeite)",
      "audience": "girl",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/cabelo_rabo_cavalo_sob_chapeu.46f39a7d6671.glb",
      "thumb": "miniaturas/cabelo_rabo_cavalo_sob_chapeu.53630e4c79dc.webp",
      "tris": 1204,
      "origin": {
        "blob": "e02ab82756e5b46508f119e1a28ba069b882c64c",
        "thumbBlob": "01dbd68a4e87ed09c19b661b4783d215f105f1e9",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_solto_sob_chapeu": {
      "slot": "cabelo",
      "group": "cabelo_sob_chapeu",
      "label": "Cabelo comprido solto (para chapéu e enfeite)",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/cabelo_solto_sob_chapeu.2e797d0240ce.glb",
      "thumb": "miniaturas/cabelo_solto_sob_chapeu.541589d720a1.webp",
      "tris": 1430,
      "origin": {
        "blob": "a334fc372c2cbba36c9121c2f003b1c9810f35ec",
        "thumbBlob": "fd9d115eb48aaa1166445a17eb2a5b0bf9d78c52",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_topete_branco_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo topete branco",
      "audience": "boy",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/cabelo_topete_branco_pacote.30dc9f94a788.glb",
      "thumb": "miniaturas/cabelo_topete_branco_pacote.5740c248e70f.webp",
      "tris": 975,
      "origin": {
        "blob": "58d503fa243ced66631232a449ac89bb697743ad",
        "thumbBlob": "7047240baef7026e950d7dbf46cd97b4d5f83c08",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_topete_ruivo_pacote": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Cabelo topete ruivo",
      "audience": "boy",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/cabelo_topete_ruivo_pacote.6205608d659d.glb",
      "thumb": "miniaturas/cabelo_topete_ruivo_pacote.01d184c73e8e.webp",
      "tris": 1372,
      "origin": {
        "blob": "fe6df5088c2ead47c6328139dd037d3788b3e9f0",
        "thumbBlob": "aa4708468505cc65395132bac781603f92526c04",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_trancas_nago": {
      "slot": "cabelo",
      "group": "cabelo",
      "label": "Tranças nagô",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/cabelo_trancas_nago.76fdff5b1f43.glb",
      "thumb": "miniaturas/cabelo_trancas_nago.983e83b5ecb5.webp",
      "tris": 3716,
      "origin": {
        "blob": "f654c3216b1818ee656b98bd70b008d511bd90af",
        "thumbBlob": "dbe2118e67373438b4631a35cf99531f032be4f6",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "cabelo_trancas_sob_chapeu": {
      "slot": "cabelo",
      "group": "cabelo_sob_chapeu",
      "label": "Duas tranças (com ou sem chapéu)",
      "audience": "both",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/cabelo_trancas_sob_chapeu.c3f40b24ea6c.glb",
      "thumb": "miniaturas/cabelo_trancas_sob_chapeu.824623dd7a9e.webp",
      "tris": 2996,
      "origin": {
        "blob": "b1c46f71539cad1dc700ec628cd05fc4815aea7f",
        "thumbBlob": "be4f908d48815f774d24d4b1f4c7fb5cf2bd5f40",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calca_amarela_faixa_pacote": {
      "slot": "calca",
      "group": "calca",
      "label": "Calça amarela de faixa",
      "audience": "both",
      "tier": "coins",
      "price": 80,
      "band": "especial",
      "review": true,
      "file": "pecas/calca_amarela_faixa_pacote.0a0f68233370.glb",
      "thumb": "miniaturas/calca_amarela_faixa_pacote.a79b1a547690.webp",
      "tris": 1174,
      "origin": {
        "blob": "38323513f8335a81673af8b4ac711a0b76336ba5",
        "thumbBlob": "07566fef28a7beaad333bef037363227bc6f44ac",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calca_amarela_pacote": {
      "slot": "calca",
      "group": "calca",
      "label": "Calça amarela",
      "audience": "both",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/calca_amarela_pacote.4fa57ab55b60.glb",
      "thumb": "miniaturas/calca_amarela_pacote.61ec318693aa.webp",
      "tris": 656,
      "origin": {
        "blob": "765dae32ad9980ed3775615ac923c0aa3381c23e",
        "thumbBlob": "b94b610ab32ad500baecf4554f9f73024fd40e56",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calca_azul_cinto_pacote": {
      "slot": "calca",
      "group": "calca",
      "label": "Calça azul com cinto",
      "audience": "both",
      "tier": "coins",
      "price": 80,
      "band": "especial",
      "review": true,
      "file": "pecas/calca_azul_cinto_pacote.d79bb4427d13.glb",
      "thumb": "miniaturas/calca_azul_cinto_pacote.82d7b33e74a3.webp",
      "tris": 1124,
      "origin": {
        "blob": "9fecfd34631f7ad487715bd328184c530ddf379b",
        "thumbBlob": "47e187e43fa6ac73e22e206626cb16ec6235e0b1",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calca_azul_clara_pacote": {
      "slot": "calca",
      "group": "calca",
      "label": "Calça azul-clara",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/calca_azul_clara_pacote.b552b9106e75.glb",
      "thumb": "miniaturas/calca_azul_clara_pacote.c3cf72cfda23.webp",
      "tris": 548,
      "origin": {
        "blob": "dc8609bb6e429cfb7b3cd68971e91553ac4cc91d",
        "thumbBlob": "5260ce9be69c066069e8d4b860420b1a4c33cce0",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calca_azul_petroleo_rasgada_pacote": {
      "slot": "calca",
      "group": "calca",
      "label": "Calça azul-petróleo rasgada",
      "audience": "both",
      "tier": "coins",
      "price": 80,
      "band": "especial",
      "review": true,
      "file": "pecas/calca_azul_petroleo_rasgada_pacote.662c085eff3c.glb",
      "thumb": "miniaturas/calca_azul_petroleo_rasgada_pacote.842a4209e29c.webp",
      "tris": 470,
      "origin": {
        "blob": "8d54cc9c39d702088dfe66f8fe1f3f6b1e39c2e1",
        "thumbBlob": "500ced65eacee6f60d2f58d88d32db2cc8f398a7",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calca_bermuda_cargo_cinza_pacote": {
      "slot": "calca",
      "group": "calca",
      "label": "Bermuda cargo cinza",
      "audience": "both",
      "tier": "coins",
      "price": 80,
      "band": "especial",
      "review": true,
      "file": "pecas/calca_bermuda_cargo_cinza_pacote.e1fdadbd3837.glb",
      "thumb": "miniaturas/calca_bermuda_cargo_cinza_pacote.b8ef6c866827.webp",
      "tris": 984,
      "origin": {
        "blob": "b5dc9f6bf26712273c8335d32e5e0894dfff51d6",
        "thumbBlob": "8b52cb48a1e5b3ff7b73cb5f94c24c46b63c9762",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calca_branca_pacote": {
      "slot": "calca",
      "group": "calca",
      "label": "Calça branca",
      "audience": "both",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/calca_branca_pacote.220dbbbee5f6.glb",
      "thumb": "miniaturas/calca_branca_pacote.1dc2b1ac6c03.webp",
      "tris": 636,
      "origin": {
        "blob": "6765131acdbc58b27721cd84724da9e38fb0f94b",
        "thumbBlob": "1db8d875a5e4d20c2884d602f70651105513e5a6",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calca_joelheiras_pacote": {
      "slot": "calca",
      "group": "calca",
      "label": "Calça com joelheiras",
      "audience": "both",
      "tier": "coins",
      "price": 80,
      "band": "especial",
      "review": true,
      "file": "pecas/calca_joelheiras_pacote.a3e4f2142817.glb",
      "thumb": "miniaturas/calca_joelheiras_pacote.b037749e9174.webp",
      "tris": 1128,
      "origin": {
        "blob": "6b25d7c3ca640b74adc757babd69819763f93927",
        "thumbBlob": "deaae5624d4d7ff90c54965c46bdb15e9086ee2d",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calca_listrada_roxa_pacote": {
      "slot": "calca",
      "group": "calca",
      "label": "Calça listrada roxa",
      "audience": "both",
      "tier": "coins",
      "price": 80,
      "band": "especial",
      "review": true,
      "file": "pecas/calca_listrada_roxa_pacote.fdc4096ebb49.glb",
      "thumb": "miniaturas/calca_listrada_roxa_pacote.f246b33345f3.webp",
      "tris": 580,
      "origin": {
        "blob": "f31ba132431e6882a381c5c17a45d34921002b20",
        "thumbBlob": "251ec802a08f22383067479a0d71805e5f427666",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calca_marrom_meias_pacote": {
      "slot": "calca",
      "group": "calca",
      "label": "Calça marrom com meias",
      "audience": "both",
      "tier": "coins",
      "price": 80,
      "band": "especial",
      "review": true,
      "file": "pecas/calca_marrom_meias_pacote.d35695860dbe.glb",
      "thumb": "miniaturas/calca_marrom_meias_pacote.91ea010e2f5f.webp",
      "tris": 844,
      "origin": {
        "blob": "07c5dfc622b10ac46d2cdf802f41797fddfda116",
        "thumbBlob": "7dcce1621bb960a59b1896c2d49f0e7b70504ca1",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calca_marrom_pacote": {
      "slot": "calca",
      "group": "calca",
      "label": "Calça marrom",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/calca_marrom_pacote.4a264124eb3d.glb",
      "thumb": "miniaturas/calca_marrom_pacote.d29c0a0f747c.webp",
      "tris": 656,
      "origin": {
        "blob": "6a6d80a329c013b97991d6e223208dbaf2ca0fee",
        "thumbBlob": "b24e30ae998d4c3c3960c784e3b7101bde26dde0",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calca_rosa_bolinhas_pacote": {
      "slot": "calca",
      "group": "calca",
      "label": "Calça rosa de bolinhas",
      "audience": "both",
      "tier": "coins",
      "price": 80,
      "band": "especial",
      "review": true,
      "file": "pecas/calca_rosa_bolinhas_pacote.bb5af76d79de.glb",
      "thumb": "miniaturas/calca_rosa_bolinhas_pacote.5a17336dae1f.webp",
      "tris": 3436,
      "origin": {
        "blob": "37a1aba586f3e635b2e1abc92d77652c04178e6f",
        "thumbBlob": "47f24290a52985cb4892544f92a3a8697ca5abef",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calca_roxa_pacote": {
      "slot": "calca",
      "group": "calca",
      "label": "Calça roxa",
      "audience": "both",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/calca_roxa_pacote.10fca3f4f4e6.glb",
      "thumb": "miniaturas/calca_roxa_pacote.92b9308f9648.webp",
      "tris": 904,
      "origin": {
        "blob": "541ba4e6139f2034bcd83bdcb020794536873216",
        "thumbBlob": "9be0af74198a6bd0b2813318d044fe6f2c56d964",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calca_saia_longa": {
      "slot": "calca",
      "group": "calca",
      "label": "Saia longa",
      "audience": "girl",
      "tier": "coins",
      "price": 80,
      "band": "especial",
      "review": true,
      "file": "pecas/calca_saia_longa.9ec46d1931d1.glb",
      "thumb": "miniaturas/calca_saia_longa.de62cc007be7.webp",
      "tris": 448,
      "origin": {
        "blob": "04e72d1aacd0e6f191f046ec337c91ab1632db7b",
        "thumbBlob": "0f22f1d0f1feb7e835464235ef7e57d75c09d36c",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calca_verde_remendada_pacote": {
      "slot": "calca",
      "group": "calca",
      "label": "Calça verde remendada",
      "audience": "both",
      "tier": "coins",
      "price": 80,
      "band": "especial",
      "review": true,
      "file": "pecas/calca_verde_remendada_pacote.0a22191208a1.glb",
      "thumb": "miniaturas/calca_verde_remendada_pacote.3ef04d0fa9a3.webp",
      "tris": 1006,
      "origin": {
        "blob": "176b5fe251f3f41ceee44f11cf2ecaad3a93b6be",
        "thumbBlob": "32c60f850cad41108084cfe5ed0c84f200acaf8d",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calca_vermelha_pacote": {
      "slot": "calca",
      "group": "calca",
      "label": "Calça vermelha",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/calca_vermelha_pacote.3de8e07aa485.glb",
      "thumb": "miniaturas/calca_vermelha_pacote.36d8133294f5.webp",
      "tris": 612,
      "origin": {
        "blob": "dcb2d72208dbcc934d29afd4260f30e925a1a19d",
        "thumbBlob": "d622472c7f61ce4e3cf49340dcc605f5bde6feb4",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_bota_marrom_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Bota marrom",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/calcado_bota_marrom_pacote.c991152f168b.glb",
      "thumb": "miniaturas/calcado_bota_marrom_pacote.0e09d042fa2d.webp",
      "tris": 5112,
      "origin": {
        "blob": "751661c42413382e73fbe7e827404990fed84bf0",
        "thumbBlob": "93572c4a767733d7b93ecc79b17e156e3b958026",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_chinelo_amarelo_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Chinelo amarelo",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/calcado_chinelo_amarelo_pacote.a14f33c0d1c7.glb",
      "thumb": "miniaturas/calcado_chinelo_amarelo_pacote.0cf74a0eeefb.webp",
      "tris": 320,
      "origin": {
        "blob": "bbca55b58df61bdfeac7527dac32103cf5b33f23",
        "thumbBlob": "4bf72bdde68a430bf21cb91c14cdf9cc1bc78bdf",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_chinelo_listrado_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Chinelo listrado",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/calcado_chinelo_listrado_pacote.16596ba9e77b.glb",
      "thumb": "miniaturas/calcado_chinelo_listrado_pacote.33bef5267f18.webp",
      "tris": 400,
      "origin": {
        "blob": "ec51b4f804bd8090e8fb4a3e9c214281737e3e85",
        "thumbBlob": "29e4e641c6c33b300dcdc40adb438b78ff3e5850",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_chinelo_rosa_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Chinelo rosa",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/calcado_chinelo_rosa_pacote.50f341920491.glb",
      "thumb": "miniaturas/calcado_chinelo_rosa_pacote.957fe2c3b24e.webp",
      "tris": 576,
      "origin": {
        "blob": "f889ba8d6cfbb669a3f79245cd74b2f1db8dda91",
        "thumbBlob": "4241520954ec156f73dd4162f5d75e59c4a89948",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_mocassim_castanho_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Mocassim castanho",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/calcado_mocassim_castanho_pacote.7bc5a289af90.glb",
      "thumb": "miniaturas/calcado_mocassim_castanho_pacote.70ad52146a6e.webp",
      "tris": 1086,
      "origin": {
        "blob": "65effdb1ae4ca72653414af8e32b4ef0538779cf",
        "thumbBlob": "228cce534a3cc62910abfcafdea46a72f721d047",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_mocassim_marrom_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Mocassim marrom",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/calcado_mocassim_marrom_pacote.989d36caeae9.glb",
      "thumb": "miniaturas/calcado_mocassim_marrom_pacote.4336cf17eec2.webp",
      "tris": 542,
      "origin": {
        "blob": "4dd5e8a307c640ee5bfd9819dfc889e701f5c770",
        "thumbBlob": "81e7537029c0aeb6a4bbfb26681944e0108423d0",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_pantufa_azul_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Pantufa azul",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/calcado_pantufa_azul_pacote.032c6bd4cf49.glb",
      "thumb": "miniaturas/calcado_pantufa_azul_pacote.bb2c47668fab.webp",
      "tris": 480,
      "origin": {
        "blob": "3f4007fc9813fa59bd4cd79c8a30a70eac90587d",
        "thumbBlob": "a111e5e65f9dec70ffc855f73096fe797fa6bd47",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_pantufa_sapo_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Pantufa de sapo",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/calcado_pantufa_sapo_pacote.582cd8fe792e.glb",
      "thumb": "miniaturas/calcado_pantufa_sapo_pacote.68d8d2e0b92e.webp",
      "tris": 728,
      "origin": {
        "blob": "bd82b67a65f4b63d13ad7044713d616879bd7f5a",
        "thumbBlob": "87f1dea25ff0cd2014f81d766fba1935ac16bd52",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_sandalia_azul_petroleo_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Sandália azul-petróleo",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/calcado_sandalia_azul_petroleo_pacote.ee8c9ebd4f8e.glb",
      "thumb": "miniaturas/calcado_sandalia_azul_petroleo_pacote.951611e925c0.webp",
      "tris": 824,
      "origin": {
        "blob": "09212d7fe08e48bb87de73ab01ec74b2b1d02649",
        "thumbBlob": "5d0d9f2331f96ea1e3f703b8391358e654e927bf",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_sandalia_laranja_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Sandália laranja",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/calcado_sandalia_laranja_pacote.1fcce5a13da9.glb",
      "thumb": "miniaturas/calcado_sandalia_laranja_pacote.00989a22b698.webp",
      "tris": 780,
      "origin": {
        "blob": "ab5c655e723c6407f6a124ae517b2a61565d6649",
        "thumbBlob": "38330389b7e603bfd39fb32b39d1219c98e856d7",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_sapato_bege_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Sapato bege",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/calcado_sapato_bege_pacote.0b7a2f3b1ef5.glb",
      "thumb": "miniaturas/calcado_sapato_bege_pacote.8d48182f50b3.webp",
      "tris": 1196,
      "origin": {
        "blob": "11afc2e51a4ab2dca59122bcc5d915db23350f49",
        "thumbBlob": "c9020d9dbdb7f98006e4132c35a3189c5a5f1adc",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_sapato_marrom_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Sapato marrom",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/calcado_sapato_marrom_pacote.ca95ccba7ad0.glb",
      "thumb": "miniaturas/calcado_sapato_marrom_pacote.3bddccb1757d.webp",
      "tris": 1682,
      "origin": {
        "blob": "4f6688865343a245c658d1e7f72818865d31dda9",
        "thumbBlob": "1e7e833a1ad7c5f73f8064a04216a58c935eaab1",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_sapato_preto_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Sapato preto",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/calcado_sapato_preto_pacote.48c6920ed61a.glb",
      "thumb": "miniaturas/calcado_sapato_preto_pacote.e20d898a2ee2.webp",
      "tris": 564,
      "origin": {
        "blob": "7479d933220836b99852003f37de586b09e61d5a",
        "thumbBlob": "240a03cb546e79940b91ff19037bec23afc5ebf2",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_tenis_bege_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Tênis bege",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/calcado_tenis_bege_pacote.17febb547615.glb",
      "thumb": "miniaturas/calcado_tenis_bege_pacote.04a78d717205.webp",
      "tris": 5232,
      "origin": {
        "blob": "15d6b1cd8cc6f90b8f976cb4f5d3076c4668ec8d",
        "thumbBlob": "b4d79aff0dce6637e66a67df1ab3325d48af6b17",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_tenis_branco_cano_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Tênis branco de cano",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/calcado_tenis_branco_cano_pacote.4042ff301e0d.glb",
      "thumb": "miniaturas/calcado_tenis_branco_cano_pacote.1a14f7ffe6a4.webp",
      "tris": 2388,
      "origin": {
        "blob": "5be6af3982a73a48ad703fc07d3d03afd923023e",
        "thumbBlob": "4a91ea13dbe76dc472ad89b969a29f142115bbe8",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_tenis_branco_liso_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Tênis branco liso",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/calcado_tenis_branco_liso_pacote.d9de2d45d1af.glb",
      "thumb": "miniaturas/calcado_tenis_branco_liso_pacote.02a792825fd3.webp",
      "tris": 2654,
      "origin": {
        "blob": "1a746703c7e08e1fcbe05a5caca1786b79bf935f",
        "thumbBlob": "aa88ce0e748076ee1887bf3331bf941a49e5211b",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_tenis_branco_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Tênis branco",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/calcado_tenis_branco_pacote.3f9cdf9fee02.glb",
      "thumb": "miniaturas/calcado_tenis_branco_pacote.6115257d207f.webp",
      "tris": 3612,
      "origin": {
        "blob": "74da6ad70577322d3073f26682c5787537e5a2f1",
        "thumbBlob": "0d15b2fa535d6f36b065deadca0e49c4aa7af7e7",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_tenis_cinza_claro_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Tênis cinza-claro",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/calcado_tenis_cinza_claro_pacote.4ac9544e2f2f.glb",
      "thumb": "miniaturas/calcado_tenis_cinza_claro_pacote.651036c2be00.webp",
      "tris": 3830,
      "origin": {
        "blob": "53233891f125eb7bcf658a621c0ea3dcdeb3c2c6",
        "thumbBlob": "c9d0f42de9ebb42f75f6a8f95aea455e4b27685e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_tenis_cinza_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Tênis cinza",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/calcado_tenis_cinza_pacote.a0d3acdc2fc7.glb",
      "thumb": "miniaturas/calcado_tenis_cinza_pacote.9262ab96b60f.webp",
      "tris": 5216,
      "origin": {
        "blob": "beee5c56fb3e6be15231e174025a3932b90d93d6",
        "thumbBlob": "551f2869f23eb41acf0787a16dea1ca0eedf79cf",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_tenis_preto_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Tênis preto",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/calcado_tenis_preto_pacote.22c305f91258.glb",
      "thumb": "miniaturas/calcado_tenis_preto_pacote.9fb33a0e7836.webp",
      "tris": 3438,
      "origin": {
        "blob": "4b33561f641c08e5a24ed2011ddb5e67e305eabb",
        "thumbBlob": "d9d649da7612f1913b23dd840271f45df1f53f5e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_tenis_rosa_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Tênis rosa",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/calcado_tenis_rosa_pacote.34af9d962e09.glb",
      "thumb": "miniaturas/calcado_tenis_rosa_pacote.4f40df73da48.webp",
      "tris": 2388,
      "origin": {
        "blob": "da6af8f4317a17a6f0ae92f3206b8b304d2e3395",
        "thumbBlob": "0ac96d1dac9bc935765175ab7d918e171bece712",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "calcado_tenis_vermelho_pacote": {
      "slot": "calcado",
      "group": "calcado",
      "label": "Tênis vermelho",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/calcado_tenis_vermelho_pacote.bde34af457d2.glb",
      "thumb": "miniaturas/calcado_tenis_vermelho_pacote.595b659cb3c1.webp",
      "tris": 3438,
      "origin": {
        "blob": "cc1cfe13b7a6cd96544e0991345fa242c3889fcc",
        "thumbBlob": "b9260b5386913256351da73dc757c5e94ff41cde",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_abobora_pacote": {
      "slot": "chapeu",
      "group": "capuz",
      "label": "Abóbora",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_abobora_pacote.b227e256ba4c.glb",
      "thumb": "miniaturas/chapeu_abobora_pacote.797c781a0a1c.webp",
      "tris": 928,
      "origin": {
        "blob": "7f829b979b12acb6d83ac6d2bf4e2160a4ec8e0f",
        "thumbBlob": "b016d37ebc81a07a93661114a58041a8f222bfe6",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_bobo_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Chapéu de bobo",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_bobo_pacote.422a5d7febea.glb",
      "thumb": "miniaturas/chapeu_bobo_pacote.7e448923aa0c.webp",
      "tris": 1268,
      "origin": {
        "blob": "36618c786fea2c58b93208b67bf4f86de51112fc",
        "thumbBlob": "1736255e303a36ee5acb8e36e297df941106ad4b",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_boia_coelho_rosa_pacote": {
      "slot": "chapeu",
      "group": "chapeu_sobre_cabelo",
      "label": "Boia de coelho rosa",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_boia_coelho_rosa_pacote.c9176d7935c8.glb",
      "thumb": "miniaturas/chapeu_boia_coelho_rosa_pacote.e0b52ff3cd42.webp",
      "tris": 1424,
      "origin": {
        "blob": "8324ad8832209594b2f9ca0b01e9b1177c432b63",
        "thumbBlob": "29b33fdafa152c77bf5e63ce35746584dd58bda5",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_boia_patinho_pacote": {
      "slot": "chapeu",
      "group": "chapeu_sobre_cabelo",
      "label": "Boia de patinho",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_boia_patinho_pacote.c0b49e1706e8.glb",
      "thumb": "miniaturas/chapeu_boia_patinho_pacote.c811ef76d1fb.webp",
      "tris": 1754,
      "origin": {
        "blob": "ee868838179bba8c3f5eda1e3cc840a545608bbd",
        "thumbBlob": "eba331caf67b2fe2e803283aa43ed88d49a139e3",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_boina_vermelha_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Boina vermelha",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/chapeu_boina_vermelha_pacote.dc826d981f00.glb",
      "thumb": "miniaturas/chapeu_boina_vermelha_pacote.43967dec1b15.webp",
      "tris": 373,
      "origin": {
        "blob": "8574c619ae2420e5b54c79aa07218296b138eefd",
        "thumbBlob": "da3fcef686c4ad96005a0e374aae758ffb00a507",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_bone_branco_bolinhas_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Boné branco com bolinhas",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/chapeu_bone_branco_bolinhas_pacote.ecdb5ef11665.glb",
      "thumb": "miniaturas/chapeu_bone_branco_bolinhas_pacote.031602a556fa.webp",
      "tris": 500,
      "origin": {
        "blob": "09cce9209383f978c2dad24f8e0c30915fb9f07e",
        "thumbBlob": "acd3967fb6812320a72843fa0f92244fe37cdf29",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_bone_helice_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Boné de hélice",
      "audience": "both",
      "tier": "coins",
      "price": 100,
      "band": "especial",
      "review": true,
      "file": "pecas/chapeu_bone_helice_pacote.a004bffff18e.glb",
      "thumb": "miniaturas/chapeu_bone_helice_pacote.2e7bea5e33ac.webp",
      "tris": 814,
      "origin": {
        "blob": "360bcfd5b57b0dfb52cae14165fd7aa6b7d55aab",
        "thumbBlob": "4b6388ce5de8396d6e2e3ee0d48a4fb0b1d04916",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_bone_orelhas_gato_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Boné de orelhas de gato",
      "audience": "both",
      "tier": "coins",
      "price": 100,
      "band": "especial",
      "review": true,
      "file": "pecas/chapeu_bone_orelhas_gato_pacote.17394527e6cb.glb",
      "thumb": "miniaturas/chapeu_bone_orelhas_gato_pacote.bfff13fb17b2.webp",
      "tris": 580,
      "origin": {
        "blob": "c9ba814abd8506cbc2fd553ad61d794b2aaf0b50",
        "thumbBlob": "d0ce390c82050e20bd53cc59af3263eeeddb59d0",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_caixa_brinquedo": {
      "slot": "chapeu",
      "group": "chapeu_sobre_cabelo",
      "label": "Caixa de brinquedo",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_caixa_brinquedo.d8569d97298e.glb",
      "thumb": "miniaturas/chapeu_caixa_brinquedo.0faa9a71145c.webp",
      "tris": 1601,
      "origin": {
        "blob": "872deeaa8ad21e2262357433d839981b4383b1da",
        "thumbBlob": "f310459aec5af235511089401fef38bf19e5accc",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_caixa_brinquedo_pacote": {
      "slot": "chapeu",
      "group": "chapeu_sobre_cabelo",
      "label": "Caixa de brinquedo (com texto em inglês)",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_caixa_brinquedo_pacote.0ac010b05418.glb",
      "thumb": "miniaturas/chapeu_caixa_brinquedo_pacote.e69317d5c40b.webp",
      "tris": 1581,
      "hidden": true,
      "origin": {
        "blob": "99e46dad888565fbe2ab5df7fd4dd5eab3509735",
        "thumbBlob": "496473ee7e50b63659a5d3db31ffe66a1c28c824",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_capacete_aviador_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Capacete de aviador",
      "audience": "both",
      "tier": "coins",
      "price": 100,
      "band": "especial",
      "review": true,
      "file": "pecas/chapeu_capacete_aviador_pacote.fb1cfdb2afbd.glb",
      "thumb": "miniaturas/chapeu_capacete_aviador_pacote.7b39bbfde315.webp",
      "tris": 1358,
      "origin": {
        "blob": "17742f1c14a4253e0d46c18fc5735483e8b279da",
        "thumbBlob": "bd7d68adfb370f474608634bf76363b22478e23e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_capacete_chifres_rena_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Capacete de chifres de rena",
      "audience": "both",
      "tier": "coins",
      "price": 100,
      "band": "especial",
      "review": true,
      "file": "pecas/chapeu_capacete_chifres_rena_pacote.bde84711dddf.glb",
      "thumb": "miniaturas/chapeu_capacete_chifres_rena_pacote.6034bbb81cd5.webp",
      "tris": 908,
      "origin": {
        "blob": "a8c6019057bec8126138ae9beb2d128c92f17d21",
        "thumbBlob": "9a34dc72e6abee458d70df1a4820ce8093af516c",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_capacete_corrida_pacote": {
      "slot": "chapeu",
      "group": "capuz",
      "label": "Capacete de corrida",
      "audience": "both",
      "tier": "coins",
      "price": 100,
      "band": "especial",
      "review": true,
      "file": "pecas/chapeu_capacete_corrida_pacote.23039e44ca1e.glb",
      "thumb": "miniaturas/chapeu_capacete_corrida_pacote.4b03ff1327dd.webp",
      "tris": 1268,
      "origin": {
        "blob": "04ace37c87be4b737288f438ab6ae2189a5d563d",
        "thumbBlob": "f98ccd8bf66094a4d3908489927b802b6228cb3a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_capacete_militar_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Capacete militar",
      "audience": "both",
      "tier": "coins",
      "price": 100,
      "band": "especial",
      "review": true,
      "file": "pecas/chapeu_capacete_militar_pacote.497d7cc07cd1.glb",
      "thumb": "miniaturas/chapeu_capacete_militar_pacote.594f4acdd12e.webp",
      "tris": 1004,
      "origin": {
        "blob": "30bdbb0a85fc628a3050ad9bbf1a3a3f6846d35a",
        "thumbBlob": "bbfb5e462716a6571729bc746669ab7b905b4d54",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_capacete_mineiro_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Capacete de mineiro",
      "audience": "both",
      "tier": "coins",
      "price": 100,
      "band": "especial",
      "review": true,
      "file": "pecas/chapeu_capacete_mineiro_pacote.ca2385f7390c.glb",
      "thumb": "miniaturas/chapeu_capacete_mineiro_pacote.5ec7f7bb9317.webp",
      "tris": 1146,
      "origin": {
        "blob": "3ddf48ad013e4836f2d5565bc1a31409e1f72063",
        "thumbBlob": "79095d2d62b84901c92fb7371d37fae952fecf73",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_capacete_moto_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Capacete de moto",
      "audience": "both",
      "tier": "coins",
      "price": 100,
      "band": "especial",
      "review": true,
      "file": "pecas/chapeu_capacete_moto_pacote.c82f2e590855.glb",
      "thumb": "miniaturas/chapeu_capacete_moto_pacote.2dde8995fcbf.webp",
      "tris": 2576,
      "origin": {
        "blob": "7abafc85c5dda3bbac06a4e05bc8e3af05348c91",
        "thumbBlob": "d329129bbd2219dbfdc09edc0ee24db3b8f65a2f",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_capelo_formatura_pacote": {
      "slot": "chapeu",
      "group": "chapeu_sobre_cabelo",
      "label": "Capelo de formatura",
      "audience": "both",
      "tier": "coins",
      "price": 100,
      "band": "especial",
      "review": true,
      "file": "pecas/chapeu_capelo_formatura_pacote.2053ce006d8a.glb",
      "thumb": "miniaturas/chapeu_capelo_formatura_pacote.f120159b28ee.webp",
      "tris": 244,
      "origin": {
        "blob": "58327c4561aa140efe09dd7396462e5ee08e068e",
        "thumbBlob": "fc76211aa6331602c5cd501a9253c5ddad6980e2",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_capuz_coala_pacote": {
      "slot": "chapeu",
      "group": "capuz",
      "label": "Capuz de coala",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_capuz_coala_pacote.aaab32e3bf0c.glb",
      "thumb": "miniaturas/chapeu_capuz_coala_pacote.e8e07632056d.webp",
      "tris": 1290,
      "origin": {
        "blob": "18f24f51cbb370c4c72a83c18182cb6b153569d7",
        "thumbBlob": "d89e1a93244c580625a2b13d6ce3e813d3b75802",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_capuz_galinha_pacote": {
      "slot": "chapeu",
      "group": "capuz",
      "label": "Capuz de galinha",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_capuz_galinha_pacote.0846603bee2c.glb",
      "thumb": "miniaturas/chapeu_capuz_galinha_pacote.3e2937683d71.webp",
      "tris": 1202,
      "origin": {
        "blob": "1af6b6d6c0d2bfd147686b5a38ef92a5d239a1d6",
        "thumbBlob": "56470994ee8bf8ab548d1c9be63a3e6fb34b4a1a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_capuz_gato_preto_pacote": {
      "slot": "chapeu",
      "group": "capuz",
      "label": "Capuz de gato preto",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_capuz_gato_preto_pacote.83d72fc224de.glb",
      "thumb": "miniaturas/chapeu_capuz_gato_preto_pacote.742c4aef60c6.webp",
      "tris": 1718,
      "origin": {
        "blob": "ef12c93785ae4ebcdf539985083be50aa935e69d",
        "thumbBlob": "5ede7bee77d19810c8868fa29d0cee90a0274480",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_capuz_raposa_pacote": {
      "slot": "chapeu",
      "group": "capuz",
      "label": "Capuz de raposa",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_capuz_raposa_pacote.118e8a412423.glb",
      "thumb": "miniaturas/chapeu_capuz_raposa_pacote.242cf4bf7074.webp",
      "tris": 1618,
      "origin": {
        "blob": "9030291bd0e4aa9c0cb30749068464e81208832b",
        "thumbBlob": "40deeffc3191779b407889eeee09219fa903479f",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_capuz_tubarao_pacote": {
      "slot": "chapeu",
      "group": "chapeu_sobre_cabelo",
      "label": "Capuz de tubarão",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_capuz_tubarao_pacote.bda1e1a5f190.glb",
      "thumb": "miniaturas/chapeu_capuz_tubarao_pacote.4ca9afd7574c.webp",
      "tris": 1080,
      "origin": {
        "blob": "a603df57df83c89b00c53a41b229359914ab4f91",
        "thumbBlob": "31267d232b93a940fba678098acfab0df309f38f",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_caracol_cabeca_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Caracol na cabeça",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_caracol_cabeca_pacote.af7ed09a91f0.glb",
      "thumb": "miniaturas/chapeu_caracol_cabeca_pacote.32c5d5eeac98.webp",
      "tris": 1562,
      "origin": {
        "blob": "08dce6e294ec2a745c5b392838056bb2ffb4f01b",
        "thumbBlob": "712de09691f339222da224dc2248e4a7f003771c",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_caranguejo_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Chapéu de caranguejo",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_caranguejo_pacote.3036af31abc8.glb",
      "thumb": "miniaturas/chapeu_caranguejo_pacote.535f64882295.webp",
      "tris": 1766,
      "origin": {
        "blob": "be2fd7aaccf1258b67ce412e70b536538dce1f79",
        "thumbBlob": "3698aa881478230159e324c94a23a90164dbb870",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_cartola_cinza_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Cartola cinza",
      "audience": "both",
      "tier": "coins",
      "price": 100,
      "band": "especial",
      "review": true,
      "file": "pecas/chapeu_cartola_cinza_pacote.99ae47483448.glb",
      "thumb": "miniaturas/chapeu_cartola_cinza_pacote.ca5a67c74a7d.webp",
      "tris": 552,
      "origin": {
        "blob": "59e8c06269d348246e49b53f191c33c4e1ac3a64",
        "thumbBlob": "224b7a407cb6a68d36cfe46a57474d7439a8b689",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_cartola_colorida_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Cartola colorida",
      "audience": "both",
      "tier": "festa",
      "price": 0,
      "review": true,
      "file": "pecas/chapeu_cartola_colorida_pacote.6bac571cb904.glb",
      "thumb": "miniaturas/chapeu_cartola_colorida_pacote.9ffcc7317789.webp",
      "tris": 320,
      "festa": "carnaval",
      "origin": {
        "blob": "5d1c18c51113911152eab647544bf831c7310352",
        "thumbBlob": "cb40869ac6e54fb4b6f90a78c80d161fe838f26e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_cartola_listrada_estrelas_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Cartola listrada de estrelas",
      "audience": "both",
      "tier": "coins",
      "price": 100,
      "band": "especial",
      "review": true,
      "file": "pecas/chapeu_cartola_listrada_estrelas_pacote.931208e8bb28.glb",
      "thumb": "miniaturas/chapeu_cartola_listrada_estrelas_pacote.fe3a8dea7d67.webp",
      "tris": 1324,
      "origin": {
        "blob": "d89bfef34da636cdeb433419dc4ed917c5883877",
        "thumbBlob": "d8704aefa583981191052b68a5b2a31987e2096f",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_cauboi": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Chapéu de caubói",
      "audience": "both",
      "tier": "coins",
      "price": 100,
      "band": "especial",
      "review": true,
      "file": "pecas/chapeu_cauboi.6a9225c79ac0.glb",
      "thumb": "miniaturas/chapeu_cauboi.032f0066f823.webp",
      "tris": 1792,
      "origin": {
        "blob": "fb4da5c60d5e6fcb1dcde2b8b8096a4851c4f675",
        "thumbBlob": "6612d5cbbdf6b7b0a2e5a2ba66350b1ea83120a7",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_cerveja_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Chapéu de cerveja (com canudo)",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_cerveja_pacote.a16d9de4b83e.glb",
      "thumb": "miniaturas/chapeu_cerveja_pacote.4223dc128303.webp",
      "tris": 1645,
      "origin": {
        "blob": "c8e2fe7d7872588dabf610a5ea6af23a82906988",
        "thumbBlob": "7deeb1b44d0a2d60d7d99cac533315124235c266",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_coco_cinza_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Chapéu-coco cinza",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/chapeu_coco_cinza_pacote.2bf83a25eb44.glb",
      "thumb": "miniaturas/chapeu_coco_cinza_pacote.56aa9c5dcae2.webp",
      "tris": 232,
      "origin": {
        "blob": "7f52494966310e919047de41469355c023f70255",
        "thumbBlob": "f0d08c682bd0bc9adaa97891c1007292be31e1d5",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_cogumelo_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Chapéu de cogumelo",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_cogumelo_pacote.0d8eb636c936.glb",
      "thumb": "miniaturas/chapeu_cogumelo_pacote.7c8dd8b5fb5e.webp",
      "tris": 2064,
      "origin": {
        "blob": "d63003fef66eb01c19453a739e6464bec9699a8a",
        "thumbBlob": "58e3179a28e2fe9c49d942d54f5ca29c87dc1873",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_cone_transito_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Cone de trânsito",
      "audience": "both",
      "tier": "coins",
      "price": 100,
      "band": "especial",
      "review": true,
      "file": "pecas/chapeu_cone_transito_pacote.8c9c05366e6c.glb",
      "thumb": "miniaturas/chapeu_cone_transito_pacote.8e19cc4aceda.webp",
      "tris": 298,
      "origin": {
        "blob": "880a10ac5b1a8d5ce580d57257a5db12d142c511",
        "thumbBlob": "86eb1cb8a408c47c15f766d1e45b142d0eca15ac",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_coroa_flores": {
      "slot": "chapeu",
      "group": "chapeu_sobre_cabelo",
      "label": "Coroa de flores",
      "audience": "both",
      "tier": "coins",
      "price": 100,
      "band": "especial",
      "review": true,
      "file": "pecas/chapeu_coroa_flores.a9c09c813e57.glb",
      "thumb": "miniaturas/chapeu_coroa_flores.ad36f103c586.webp",
      "tris": 1368,
      "origin": {
        "blob": "829db171a3b8b4fdea803193a040ba622d37d88d",
        "thumbBlob": "4add3b4cf5ea953eced97975445d4614f329439c",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_coroa_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Coroa",
      "audience": "both",
      "tier": "coins",
      "price": 100,
      "band": "especial",
      "review": true,
      "file": "pecas/chapeu_coroa_pacote.c1bb89cf60d6.glb",
      "thumb": "miniaturas/chapeu_coroa_pacote.08ade440607c.webp",
      "tris": 1732,
      "origin": {
        "blob": "a411c1b9b7ab21af620e7cbb444466f2725fb450",
        "thumbBlob": "e0169b48211a23b7771c01f2a4b76061ba9abc3a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_desentupidor_cabeca_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Desentupidor na cabeça",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_desentupidor_cabeca_pacote.daf54d8fa658.glb",
      "thumb": "miniaturas/chapeu_desentupidor_cabeca_pacote.e76a490e4f90.webp",
      "tris": 484,
      "origin": {
        "blob": "e13e787aacd5be546ad75a293ffe26f16c8e3cdf",
        "thumbBlob": "1769ace2fe389737becc59060a2552b948d6d4d1",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_dinossauro_verde_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Chapéu de dinossauro verde",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_dinossauro_verde_pacote.2ed1ebd5d329.glb",
      "thumb": "miniaturas/chapeu_dinossauro_verde_pacote.0aaa4a8274c6.webp",
      "tris": 944,
      "origin": {
        "blob": "85c6390551fdd0504f3abf7934ffb9b8fccb388d",
        "thumbBlob": "2d92a0b3c50c0c4708e9d72d1c51b6bc960de9f2",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_elmo_viking_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Elmo viking",
      "audience": "both",
      "tier": "coins",
      "price": 100,
      "band": "especial",
      "review": true,
      "file": "pecas/chapeu_elmo_viking_pacote.1946baf6aa08.glb",
      "thumb": "miniaturas/chapeu_elmo_viking_pacote.2851df5abadc.webp",
      "tris": 580,
      "origin": {
        "blob": "86db80a70d55023e56ecde3bb733e474c63a50e3",
        "thumbBlob": "e8a15f1b3d502910a6efcabc98c6afaf0cadb86b",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_escafandro_pacote": {
      "slot": "chapeu",
      "group": "capuz",
      "label": "Escafandro",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_escafandro_pacote.44162e223d42.glb",
      "thumb": "miniaturas/chapeu_escafandro_pacote.86ea25027b3c.webp",
      "tris": 2220,
      "origin": {
        "blob": "61a6dd3f2f0d77522540c8f6f320ac24afe88940",
        "thumbBlob": "9dc8777e754e863fb78a41a00fcc4a482b73e486",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_galinha_assada_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Chapéu de galinha assada",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_galinha_assada_pacote.d67f899741fe.glb",
      "thumb": "miniaturas/chapeu_galinha_assada_pacote.434cddd4be7c.webp",
      "tris": 506,
      "origin": {
        "blob": "8610641f76fcaa34c759a46d035cfcb6006c74fb",
        "thumbBlob": "8789b4b69e42d1a6e9bc3867e34efb64a3b7dc84",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_gorro_cinza_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Gorro cinza",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/chapeu_gorro_cinza_pacote.23271f29be6b.glb",
      "thumb": "miniaturas/chapeu_gorro_cinza_pacote.394b8d4bc68b.webp",
      "tris": 272,
      "origin": {
        "blob": "0b001ad05db8279fa603de8c00dfc87cf5ff5f70",
        "thumbBlob": "fdf8287a8ec19b2031c4586ea21b237a1f0dac2c",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_gorro_curto_vermelho_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Gorro curto vermelho",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/chapeu_gorro_curto_vermelho_pacote.a8740c588765.glb",
      "thumb": "miniaturas/chapeu_gorro_curto_vermelho_pacote.57d4e2484646.webp",
      "tris": 204,
      "origin": {
        "blob": "078de978ef27c32ff3ec057b5c4cfe315888ce1c",
        "thumbBlob": "40810aea5bafae910a171fc4e96ee79e40d5e405",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_gorro_gelatina_sorridente_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Gorro de gelatina sorridente",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_gorro_gelatina_sorridente_pacote.3f071d3deec7.glb",
      "thumb": "miniaturas/chapeu_gorro_gelatina_sorridente_pacote.3c7f9a94d117.webp",
      "tris": 864,
      "origin": {
        "blob": "801afac6398f8e3d31ed4bdf13773d28329152dc",
        "thumbBlob": "68e080b8720c9ee691a8d74464839e1337ee5acc",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_gorro_papai_noel_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Gorro de Papai Noel",
      "audience": "both",
      "tier": "festa",
      "price": 0,
      "review": true,
      "file": "pecas/chapeu_gorro_papai_noel_pacote.98d514ccef4c.glb",
      "thumb": "miniaturas/chapeu_gorro_papai_noel_pacote.77dd1f45475b.webp",
      "tris": 800,
      "festa": "fim_de_ano",
      "origin": {
        "blob": "6c1e19cfa1b890d2b38b98781ed8f11c7d3456c1",
        "thumbBlob": "6200bb0787c7eff9f2758cce830a478c36a7b703",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_gorro_trico_pacote": {
      "slot": "chapeu",
      "group": "chapeu_sobre_cabelo",
      "label": "Gorro de tricô (só com cabelo)",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/chapeu_gorro_trico_pacote.d8cd8fccfb20.glb",
      "thumb": "miniaturas/chapeu_gorro_trico_pacote.c604ff180163.webp",
      "tris": 292,
      "origin": {
        "blob": "f7b71d1bf445dc8473a90b2d0a6bc7f80f7cc234",
        "thumbBlob": "9cee16af7f19bc13deb146f685e77cd39b702d03",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_guarda_chuva_pacote": {
      "slot": "chapeu",
      "group": "chapeu_sobre_cabelo",
      "label": "Chapéu-guarda-chuva",
      "audience": "both",
      "tier": "coins",
      "price": 100,
      "band": "especial",
      "review": true,
      "file": "pecas/chapeu_guarda_chuva_pacote.f1afd8bcf514.glb",
      "thumb": "miniaturas/chapeu_guarda_chuva_pacote.2b50ef396826.webp",
      "tris": 704,
      "origin": {
        "blob": "61df562d1e901ecf83c8656b69564a112985c96f",
        "thumbBlob": "c4c2f607a1f23f1ebe6257a5883c77d1054b02dc",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_laco": {
      "slot": "chapeu",
      "group": "chapeu_sobre_cabelo",
      "label": "Laço",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/chapeu_laco.5600214eb783.glb",
      "thumb": "miniaturas/chapeu_laco.fa4ed95c0f30.webp",
      "tris": 916,
      "origin": {
        "blob": "2893175aa97fc8e3088a6a81e70eb8c69c4888b1",
        "thumbBlob": "f85c2bd46a8c5b8a56a493fb6172aa340141182e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_mascara_gas_pacote": {
      "slot": "chapeu",
      "group": "capuz",
      "label": "Máscara de gás",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_mascara_gas_pacote.3f3fed25faec.glb",
      "thumb": "miniaturas/chapeu_mascara_gas_pacote.9b110b1f7611.webp",
      "tris": 1040,
      "origin": {
        "blob": "0b9cd992b3bc91d81f820eb3c2923307f8d310bc",
        "thumbBlob": "c6b9cc750c63e4b2c78e2f7ef198d67ebe57cd2c",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_palha_baixo_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Chapéu de palha baixo",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/chapeu_palha_baixo_pacote.9b0cebacba9b.glb",
      "thumb": "miniaturas/chapeu_palha_baixo_pacote.055d7220b4c4.webp",
      "tris": 224,
      "origin": {
        "blob": "b011c9f5e0ff47dad09d70d34bbe3cfca9b6b4f9",
        "thumbBlob": "347000381e048db04822f008f79ca82d01413e9b",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_palha_claro_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Chapéu de palha claro",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/chapeu_palha_claro_pacote.2e15ad39fe68.glb",
      "thumb": "miniaturas/chapeu_palha_claro_pacote.ce4736956b7e.webp",
      "tris": 208,
      "origin": {
        "blob": "e71c9cc9f89bc619fcc1bfe5926af7ef7137fef2",
        "thumbBlob": "d1f079d05fc0efbb4f574f13578a95ebc0d83222",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_palha_fita_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Chapéu de palha com fita",
      "audience": "both",
      "tier": "festa",
      "price": 0,
      "review": true,
      "file": "pecas/chapeu_palha_fita_pacote.f2c464cc1448.glb",
      "thumb": "miniaturas/chapeu_palha_fita_pacote.1c7af859548c.webp",
      "tris": 384,
      "festa": "junina",
      "origin": {
        "blob": "0d2fad79e53bae77ec1383e60b7a3ef92bbf2d34",
        "thumbBlob": "85995ade2738c370e0762eef66083833b4ef48ff",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_palha_marrom_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Chapéu de palha marrom",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/chapeu_palha_marrom_pacote.a4e8856357a5.glb",
      "thumb": "miniaturas/chapeu_palha_marrom_pacote.14c9da9ec962.webp",
      "tris": 240,
      "origin": {
        "blob": "d19f2c06cc3cdddf802d343a7545f8c4f7289ea1",
        "thumbBlob": "c915de3b8afbfe9eeaeba886be0a8e00330c6935",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_peixe_lanterna_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Chapéu de peixe-lanterna",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_peixe_lanterna_pacote.dc49c52bccf7.glb",
      "thumb": "miniaturas/chapeu_peixe_lanterna_pacote.98a62f6f2a54.webp",
      "tris": 2216,
      "origin": {
        "blob": "39ec9bd28a483e7c214eb84b1f9ce96eb94f55b0",
        "thumbBlob": "f99b6a61f043213740c8070a07eb28b709463704",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_pescador_azul_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Chapéu de pescador azul",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/chapeu_pescador_azul_pacote.67e2ca641d40.glb",
      "thumb": "miniaturas/chapeu_pescador_azul_pacote.d8ddeb96ae56.webp",
      "tris": 408,
      "origin": {
        "blob": "8a5e7be536f10e50a1a9a7bcf770aa7382ed789b",
        "thumbBlob": "507e2f3b8e394c1afede051a400361e34eb7afbc",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_presilhas_estrela": {
      "slot": "chapeu",
      "group": "chapeu_sobre_cabelo",
      "label": "Presilhas de estrela",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/chapeu_presilhas_estrela.3010f7d3924a.glb",
      "thumb": "miniaturas/chapeu_presilhas_estrela.9db8825289fe.webp",
      "tris": 624,
      "origin": {
        "blob": "250bf2d9493b29ab0a2552f739e20a141934bd37",
        "thumbBlob": "c47c753bf2913c4f35316190d78551773b8d3e7a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_quepe_marinheiro_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Quepe de marinheiro",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/chapeu_quepe_marinheiro_pacote.c83b681f4e42.glb",
      "thumb": "miniaturas/chapeu_quepe_marinheiro_pacote.a1499dbf1d2b.webp",
      "tris": 246,
      "origin": {
        "blob": "e907761d00c5da3ff6d7a08451b5d94b0c028255",
        "thumbBlob": "da4d23ca846ec448de0bf0474ff22d5a07d768cb",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_quepe_policial_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Quepe de policial",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/chapeu_quepe_policial_pacote.fb638037864d.glb",
      "thumb": "miniaturas/chapeu_quepe_policial_pacote.a2e72fec6317.webp",
      "tris": 306,
      "origin": {
        "blob": "3376dff47575ae3f987b068c16714bdf27ea4730",
        "thumbBlob": "0065c414c7bbc1518964e970021cb6cfc6ba301b",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_saco_papel_pacote": {
      "slot": "chapeu",
      "group": "capuz",
      "label": "Saco de papel",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_saco_papel_pacote.db5d892c1074.glb",
      "thumb": "miniaturas/chapeu_saco_papel_pacote.382b6ad29d18.webp",
      "tris": 1056,
      "origin": {
        "blob": "13eb0669257bd3e95864af87a270d197b35079e3",
        "thumbBlob": "ac8fc94473a6d9b9a4d11ce722f521666f545b61",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_sapo_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Chapéu de sapo",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_sapo_pacote.5e24d6b632c0.glb",
      "thumb": "miniaturas/chapeu_sapo_pacote.bab47186e8e0.webp",
      "tris": 1030,
      "origin": {
        "blob": "8bdd6ed7c1ade201ca20028ca73cd52fa4709f75",
        "thumbBlob": "db2efe33100a816de1db8b37acdb8a4229906ea7",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_sombreiro_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Sombreiro",
      "audience": "both",
      "tier": "coins",
      "price": 100,
      "band": "especial",
      "review": true,
      "file": "pecas/chapeu_sombreiro_pacote.8d93ccb09f04.glb",
      "thumb": "miniaturas/chapeu_sombreiro_pacote.fb939471750d.webp",
      "tris": 650,
      "origin": {
        "blob": "aa6c222d60f75d69ff9dc207afa2e34ed74adb80",
        "thumbBlob": "84f68ef88a00e5f73483237a004ce23f20727739",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_televisao_cabeca_pacote": {
      "slot": "chapeu",
      "group": "chapeu_sobre_cabelo",
      "label": "Televisão na cabeça",
      "audience": "both",
      "tier": "coins",
      "price": 150,
      "band": "raro",
      "review": true,
      "file": "pecas/chapeu_televisao_cabeca_pacote.bcaebfcb3ff4.glb",
      "thumb": "miniaturas/chapeu_televisao_cabeca_pacote.103e808e6e82.webp",
      "tris": 1042,
      "origin": {
        "blob": "37ba09617a43cc8527fb16719145e6ca25a4acad",
        "thumbBlob": "a7b60676add023d2e2210df04e99604e4ae79284",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_tiara": {
      "slot": "chapeu",
      "group": "chapeu_sobre_cabelo",
      "label": "Tiara",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/chapeu_tiara.37fa4ac53577.glb",
      "thumb": "miniaturas/chapeu_tiara.88a1c105d9ad.webp",
      "tris": 444,
      "origin": {
        "blob": "6999f6e8ab98304d779ef9361177e41e26257c96",
        "thumbBlob": "37e6098edf37e4c629bf267543f18fe0fd582b16",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_tiara_fones_ouvido_pacote": {
      "slot": "chapeu",
      "group": "chapeu_sobre_cabelo",
      "label": "Tiara de fones de ouvido",
      "audience": "both",
      "tier": "coins",
      "price": 100,
      "band": "especial",
      "review": true,
      "file": "pecas/chapeu_tiara_fones_ouvido_pacote.526ad725cc00.glb",
      "thumb": "miniaturas/chapeu_tiara_fones_ouvido_pacote.d29bd1b87938.webp",
      "tris": 816,
      "origin": {
        "blob": "95b06b1aa84d769da6396257b2d088bacc1c823b",
        "thumbBlob": "fa3e05b8896e1f3ae357690ff9bb40e0945d4e3b",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_tiara_lanterninhas": {
      "slot": "chapeu",
      "group": "chapeu_sobre_cabelo",
      "label": "Tiara de lanterninhas",
      "audience": "both",
      "tier": "festa",
      "price": 0,
      "file": "pecas/chapeu_tiara_lanterninhas.1cea64b07588.glb",
      "thumb": "miniaturas/chapeu_tiara_lanterninhas.f534cd16c342.webp",
      "tris": 1110,
      "origin": {
        "blob": "a1b2f2d1d763efab8fd5c826303c44c1327cb281",
        "thumbBlob": "ccbed1fb949bce6be2847a99f4b4094fc8f33206",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_tiara_orelhas_coelho_pacote": {
      "slot": "chapeu",
      "group": "chapeu_sobre_cabelo",
      "label": "Tiara de orelhas de coelho",
      "audience": "both",
      "tier": "coins",
      "price": 100,
      "band": "especial",
      "review": true,
      "file": "pecas/chapeu_tiara_orelhas_coelho_pacote.e4f8c1309995.glb",
      "thumb": "miniaturas/chapeu_tiara_orelhas_coelho_pacote.012fa833b43a.webp",
      "tris": 624,
      "origin": {
        "blob": "457dae0d89ce0ae2b5b177a402cefc12ebaf090d",
        "thumbBlob": "f3f672f06d11bf9f723289d070ff2d3794df3a36",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_touca_cozinheiro_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Touca de cozinheiro",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/chapeu_touca_cozinheiro_pacote.05f6519f3603.glb",
      "thumb": "miniaturas/chapeu_touca_cozinheiro_pacote.6244dc29b2b1.webp",
      "tris": 436,
      "origin": {
        "blob": "05b22400d98e65abbb734d5b48d67445386514c4",
        "thumbBlob": "f0f8ad2bf4657db3c4cdc2468a39961944fb42b0",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chapeu_verde_pena_pacote": {
      "slot": "chapeu",
      "group": "chapeu",
      "label": "Chapéu verde de pena",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/chapeu_verde_pena_pacote.418828cc4ba5.glb",
      "thumb": "miniaturas/chapeu_verde_pena_pacote.cd8767f707d3.webp",
      "tris": 600,
      "origin": {
        "blob": "fc50b29cf55bf4b7630f6191280485b710c98173",
        "thumbBlob": "8594add435914f09e48570f1eb33a861de048f9c",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "chupeta_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Chupeta",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/chupeta_pacote.e46451269a08.glb",
      "thumb": "miniaturas/chupeta_pacote.87b03a443912.webp",
      "tris": 312,
      "origin": {
        "blob": "fb50c55c79a80d537b76269d426f8df26a26af30",
        "thumbBlob": "6aa309c61f7e97a674668f7abb516659872a0a6b",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "corpo_amarelo_limao_pacote": {
      "slot": "corpo",
      "group": "corpo",
      "label": "Corpo amarelo-limão",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/corpo_amarelo_limao_pacote.dc9f60b8c032.glb",
      "thumb": "miniaturas/corpo_amarelo_limao_pacote.8bf4bf1f238a.webp",
      "tris": 3404,
      "swatch": "#aaa728",
      "ears": "orelhas_corpo_amarelo_limao_pacote",
      "origin": {
        "blob": "a55d4bf801e52d15a863d4d3cbe3c9e396255797",
        "thumbBlob": "37fb41c1c1fc0fe0c20da5623b5c490c93aca9cd",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "corpo_amarelo_pacote": {
      "slot": "corpo",
      "group": "corpo",
      "label": "Corpo amarelo",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/corpo_amarelo_pacote.8e92113d8f70.glb",
      "thumb": "miniaturas/corpo_amarelo_pacote.4233902ecdc0.webp",
      "tris": 3404,
      "swatch": "#fd9904",
      "ears": "orelhas_corpo_amarelo_pacote",
      "origin": {
        "blob": "4e4de0669e597e1df07cc1bf4ed9616f29eba3b1",
        "thumbBlob": "fc61aab02836231813b9e9f1c6bb0fda6bc5a8e8",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "corpo_azul_pacote": {
      "slot": "corpo",
      "group": "corpo",
      "label": "Corpo azul",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/corpo_azul_pacote.9777a7878fea.glb",
      "thumb": "miniaturas/corpo_azul_pacote.820aa592a8f9.webp",
      "tris": 3404,
      "swatch": "#2846a8",
      "ears": "orelhas_corpo_azul_pacote",
      "origin": {
        "blob": "8af414e05b0d389e695fe0a01a8890e3fcdecce5",
        "thumbBlob": "800a01dce310df042c03ecf4a4661216ad8e14f6",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "corpo_azul_petroleo_pacote": {
      "slot": "corpo",
      "group": "corpo",
      "label": "Corpo azul-petróleo",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/corpo_azul_petroleo_pacote.cb6ee9882f34.glb",
      "thumb": "miniaturas/corpo_azul_petroleo_pacote.62c91dcbd5d5.webp",
      "tris": 3404,
      "swatch": "#00878f",
      "ears": "orelhas_corpo_azul_petroleo_pacote",
      "origin": {
        "blob": "0ce726095fad0d3e6eec6cd8c0ceddd64ec6dc5a",
        "thumbBlob": "020e7b4212c70c4f8431c4943917ec4ae397f416",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "corpo_branco_pacote": {
      "slot": "corpo",
      "group": "corpo",
      "label": "Corpo branco",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/corpo_branco_pacote.8224a40c63ea.glb",
      "thumb": "miniaturas/corpo_branco_pacote.66f5f2536aba.webp",
      "tris": 3404,
      "swatch": "#efeeee",
      "ears": "orelhas_corpo_branco_pacote",
      "origin": {
        "blob": "2ae7be3901e2d7996110f833309007f9510bbcba",
        "thumbBlob": "63bae977cd9a798b5d5e3afee96b8b5422bd6bb9",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "corpo_cinza_pacote": {
      "slot": "corpo",
      "group": "corpo",
      "label": "Corpo cinza",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/corpo_cinza_pacote.b48466cca78c.glb",
      "thumb": "miniaturas/corpo_cinza_pacote.34768f89a0fb.webp",
      "tris": 3404,
      "swatch": "#898a8b",
      "ears": "orelhas_corpo_cinza_pacote",
      "origin": {
        "blob": "f3134fb992b84c21f434905d47fb17690fad6594",
        "thumbBlob": "81887e63802d896e602bcf95720156592f88d2c4",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "corpo_laranja_pacote": {
      "slot": "corpo",
      "group": "corpo",
      "label": "Corpo laranja",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/corpo_laranja_pacote.944e036ddf6e.glb",
      "thumb": "miniaturas/corpo_laranja_pacote.dfb8fb9eef9d.webp",
      "tris": 3404,
      "swatch": "#d14916",
      "ears": "orelhas_corpo_laranja_pacote",
      "origin": {
        "blob": "d00f6640980a89273e73597e67dc0cfcd604b96a",
        "thumbBlob": "44fa005665949f7290cfd25b4b58c5e0c46c32b5",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "corpo_pele_clara_pacote": {
      "slot": "corpo",
      "group": "corpo",
      "label": "Corpo pele clara",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/corpo_pele_clara_pacote.b2778f23e24a.glb",
      "thumb": "miniaturas/corpo_pele_clara_pacote.9101b27ecad3.webp",
      "tris": 3404,
      "swatch": "#fcac79",
      "ears": "orelhas_corpo_pele_clara_pacote",
      "origin": {
        "blob": "0f5b4908d325902a0436972e3a02adfcbd2c8683",
        "thumbBlob": "f47f0dbea8c6a25e7c880b6eb10293735438f880",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "corpo_pele_escura_pacote": {
      "slot": "corpo",
      "group": "corpo",
      "label": "Corpo pele escura",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/corpo_pele_escura_pacote.b1339dbf287b.glb",
      "thumb": "miniaturas/corpo_pele_escura_pacote.0780b18fbb6f.webp",
      "tris": 3404,
      "swatch": "#452e28",
      "ears": "orelhas_corpo_pele_escura_pacote",
      "origin": {
        "blob": "fd9ad6b99445a8f1dabd148c94186823afcb6d61",
        "thumbBlob": "2ece49b17f21f44b06b0869df7ad95eb00b46e45",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "corpo_pele_media_clara_pacote": {
      "slot": "corpo",
      "group": "corpo",
      "label": "Corpo pele média-clara",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/corpo_pele_media_clara_pacote.4a6c74f12c7d.glb",
      "thumb": "miniaturas/corpo_pele_media_clara_pacote.01579698c49f.webp",
      "tris": 3404,
      "swatch": "#f79b5d",
      "ears": "orelhas_corpo_pele_media_clara_pacote",
      "origin": {
        "blob": "b6a941ec4a87731176b8422cbf27deadb0bf1233",
        "thumbBlob": "974fb5a575ab2f2a1e1621963c314b9ab109a99f",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "corpo_pele_media_pacote": {
      "slot": "corpo",
      "group": "corpo",
      "label": "Corpo pele média",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/corpo_pele_media_pacote.e0db96d8a6e9.glb",
      "thumb": "miniaturas/corpo_pele_media_pacote.fc7a0282069c.webp",
      "tris": 3404,
      "swatch": "#e87c56",
      "ears": "orelhas_corpo_pele_media_pacote",
      "origin": {
        "blob": "2562e89c8f29af06864c7f93805d0d0853f2a075",
        "thumbBlob": "31a65296a9a1a05bac3e15e6a090b80260b36e2c",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "corpo_pele_morena_pacote": {
      "slot": "corpo",
      "group": "corpo",
      "label": "Corpo pele morena",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/corpo_pele_morena_pacote.d7eb4a074080.glb",
      "thumb": "miniaturas/corpo_pele_morena_pacote.10d5cb90dce9.webp",
      "tris": 3404,
      "swatch": "#8d452e",
      "ears": "orelhas_corpo_pele_morena_pacote",
      "origin": {
        "blob": "be0e6258c90826e2f901fef3e14d291d8df9eaca",
        "thumbBlob": "4e93c3c418d7fc9b76fb30cfc6c2324c042b075a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "corpo_preto_pacote": {
      "slot": "corpo",
      "group": "corpo",
      "label": "Corpo preto",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/corpo_preto_pacote.d13943e9014a.glb",
      "thumb": "miniaturas/corpo_preto_pacote.34a428054f9f.webp",
      "tris": 3404,
      "swatch": "#2b2a2a",
      "ears": "orelhas_corpo_preto_pacote",
      "origin": {
        "blob": "3fd8ac447e78102b79383e3d4259d1a6e68d0db4",
        "thumbBlob": "08491bceb926577965ee487d70c2504d1440aece",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "corpo_roxo_pacote": {
      "slot": "corpo",
      "group": "corpo",
      "label": "Corpo roxo",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/corpo_roxo_pacote.39f213611553.glb",
      "thumb": "miniaturas/corpo_roxo_pacote.637b891bb265.webp",
      "tris": 3404,
      "swatch": "#6426a4",
      "ears": "orelhas_corpo_roxo_pacote",
      "origin": {
        "blob": "8cd299173a0707e2d705d8e148dc1ea03f806abb",
        "thumbBlob": "4ba00f1ebe0ba799beb8b17ed0b360c007a0dcdb",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "corpo_verde_pacote": {
      "slot": "corpo",
      "group": "corpo",
      "label": "Corpo verde",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/corpo_verde_pacote.94f0e5e5eedd.glb",
      "thumb": "miniaturas/corpo_verde_pacote.c2e56476d190.webp",
      "tris": 3404,
      "swatch": "#418d39",
      "ears": "orelhas_corpo_verde_pacote",
      "origin": {
        "blob": "b8f1822b4218dea6e44020ffce24d42bf4340b18",
        "thumbBlob": "6919821f93cb24cb8b9af64f8bf2a3710703a76a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "corpo_vermelho_pacote": {
      "slot": "corpo",
      "group": "corpo",
      "label": "Corpo vermelho",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/corpo_vermelho_pacote.8e9ef67383cc.glb",
      "thumb": "miniaturas/corpo_vermelho_pacote.200d823494b9.webp",
      "tris": 3404,
      "swatch": "#d02c32",
      "ears": "orelhas_corpo_vermelho_pacote",
      "origin": {
        "blob": "98cc2abe26611d0afecf6ea647d2ad1e66a9240d",
        "thumbBlob": "16683da6780ddd0965ecc530fb8854370bd5abba",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "costas_capa_estrelas": {
      "slot": "costas",
      "group": "costas",
      "label": "Capa de estrelas",
      "audience": "both",
      "tier": "festa",
      "price": 0,
      "file": "pecas/costas_capa_estrelas.caa3e5f5f7d4.glb",
      "thumb": "miniaturas/costas_capa_estrelas.bc3e2399eacc.webp",
      "tris": 1684,
      "origin": {
        "blob": "946e456af53458e5c38e20b1e59776a9216b5ff3",
        "thumbBlob": "8a722480a668243a1cc3d438d8c1484e8e70612b",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_abelha_asas_pacote": {
      "slot": "roupa_inteira",
      "group": "fantasia",
      "label": "Abelha: asas",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_abelha_asas_pacote.e3ffff072f09.glb",
      "thumb": "miniaturas/fantasia_abelha_asas_pacote.54a1f80933f3.webp",
      "tris": 848,
      "set": "fantasia_abelha",
      "origin": {
        "blob": "481b970faecb7fd23568c0d6dbae962b9eb31201",
        "thumbBlob": "dc9826bb1a831e5214db97d60733974cbda961be",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_abelha_blusa_listrada_pacote": {
      "slot": "fantasia",
      "group": "fantasia",
      "label": "Abelha: blusa listrada",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_abelha_blusa_listrada_pacote.ec6b381f80b6.glb",
      "thumb": "miniaturas/fantasia_abelha_blusa_listrada_pacote.7d7e44792a93.webp",
      "tris": 1076,
      "set": "fantasia_abelha",
      "origin": {
        "blob": "68c069699939021c61f8aa3ea4d00ee6f3cf71b7",
        "thumbBlob": "24ed267816274e7de9604559e9ea9fa0615089f1",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_abelha_cabeca_antenas_pacote": {
      "slot": "chapeu",
      "group": "fantasia",
      "label": "Abelha: cabeça com antenas",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_abelha_cabeca_antenas_pacote.97c44af43282.glb",
      "thumb": "miniaturas/fantasia_abelha_cabeca_antenas_pacote.4ca6aa42abae.webp",
      "tris": 1880,
      "set": "fantasia_abelha",
      "origin": {
        "blob": "89007fcc0b8b722d3051b2321d35812b0f1ec00a",
        "thumbBlob": "fda293c6142e4dfe5c8db57bb46088f90ddad0d0",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_abelha_calca_pacote": {
      "slot": "calca",
      "group": "fantasia",
      "label": "Abelha: calça",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_abelha_calca_pacote.af04fc9383d4.glb",
      "thumb": "miniaturas/fantasia_abelha_calca_pacote.9236a785522c.webp",
      "tris": 548,
      "set": "fantasia_abelha",
      "origin": {
        "blob": "20c787b9acdd2cb958289ca27becd364dc414757",
        "thumbBlob": "c774acab0ddbb5aa84706f6ced018db68d4cfa79",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_astronauta_botas_pacote": {
      "slot": "calcado",
      "group": "fantasia",
      "label": "Astronauta: botas",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_astronauta_botas_pacote.e3998868a4d6.glb",
      "thumb": "miniaturas/fantasia_astronauta_botas_pacote.3a9685d0c87f.webp",
      "tris": 534,
      "set": "fantasia_astronauta",
      "origin": {
        "blob": "c55fb3c9646b648aaeb5e0f7baaa51e4d9d3986b",
        "thumbBlob": "9b0c642edd3c6b33c2e7a7ab7705fd1888fc4ea8",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_astronauta_calca_pacote": {
      "slot": "calca",
      "group": "fantasia",
      "label": "Astronauta: calça",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_astronauta_calca_pacote.e9eb758e7ca8.glb",
      "thumb": "miniaturas/fantasia_astronauta_calca_pacote.c7a57be2f7b6.webp",
      "tris": 540,
      "set": "fantasia_astronauta",
      "origin": {
        "blob": "0a284ba6b706ecad5cb2353d55d63937d152b991",
        "thumbBlob": "0dc8cdf96aede3afde75ec589d881806015f164e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_astronauta_capacete_pacote": {
      "slot": "chapeu",
      "group": "fantasia",
      "label": "Astronauta: capacete",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_astronauta_capacete_pacote.6f9072f21d3b.glb",
      "thumb": "miniaturas/fantasia_astronauta_capacete_pacote.2dbb799d6998.webp",
      "tris": 1596,
      "set": "fantasia_astronauta",
      "origin": {
        "blob": "fc742b01fa9f620e6c4f6be9d716ee30d3983c45",
        "thumbBlob": "3cacf514b1656bbc5da506ca74b973d26233e958",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_astronauta_luvas_pacote": {
      "slot": "luvas",
      "group": "fantasia",
      "label": "Astronauta: luvas",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_astronauta_luvas_pacote.7e30b976be3d.glb",
      "thumb": "miniaturas/fantasia_astronauta_luvas_pacote.86ede1072336.webp",
      "tris": 1022,
      "set": "fantasia_astronauta",
      "origin": {
        "blob": "c7523296ec9314ee0bb45e3fc8c48c3768676ec3",
        "thumbBlob": "17c275498d42c2bd48fa3b67ad73512e601cf043",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_astronauta_traje_pacote": {
      "slot": "fantasia",
      "group": "fantasia",
      "label": "Astronauta: traje",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_astronauta_traje_pacote.c0224c10367c.glb",
      "thumb": "miniaturas/fantasia_astronauta_traje_pacote.af66aa5465ff.webp",
      "tris": 1142,
      "set": "fantasia_astronauta",
      "origin": {
        "blob": "d9072b1cf292ea509e06e916ea0f9a6b7a853702",
        "thumbBlob": "cb800176b43bb800bf1ecba19b8569ab8dd3a619",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_bobo_corte_chapeu_guizos_pacote": {
      "slot": "chapeu",
      "group": "fantasia",
      "label": "Bobo da corte: chapéu de guizos",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_bobo_corte_chapeu_guizos_pacote.74739e6321ac.glb",
      "thumb": "miniaturas/fantasia_bobo_corte_chapeu_guizos_pacote.32f134220053.webp",
      "tris": 1268,
      "set": "fantasia_bobo_corte",
      "origin": {
        "blob": "81b390f1147a91b3e8939e9290593917da30b29b",
        "thumbBlob": "81ee7d4f1106c3335f301632f0a28d56288f9b58",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_bobo_corte_macacao_pacote": {
      "slot": "fantasia",
      "group": "fantasia",
      "label": "Bobo da corte: macacão",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_bobo_corte_macacao_pacote.2214a9b68bbb.glb",
      "thumb": "miniaturas/fantasia_bobo_corte_macacao_pacote.952423f2def3.webp",
      "tris": 1878,
      "set": "fantasia_bobo_corte",
      "origin": {
        "blob": "201609de85219c8a73376b18281fdf271cedcbd3",
        "thumbBlob": "dc7bd8023b2f5ad238ed9158b73f1ceafecb84a1",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_cavaleiro_botas_pacote": {
      "slot": "calcado",
      "group": "fantasia",
      "label": "Cavaleiro: botas",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_cavaleiro_botas_pacote.ef2b00481239.glb",
      "thumb": "miniaturas/fantasia_cavaleiro_botas_pacote.7dc97a7041a6.webp",
      "tris": 782,
      "set": "fantasia_cavaleiro",
      "origin": {
        "blob": "86ec4a0826ab465864e246876206d99b987cc9ad",
        "thumbBlob": "eca63d62aa0f0a474ad566f7c156493b2ee11b60",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_cavaleiro_bracadeiras_pacote": {
      "slot": "luvas",
      "group": "fantasia",
      "label": "Cavaleiro: braçadeiras",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_cavaleiro_bracadeiras_pacote.977ba7a7050d.glb",
      "thumb": "miniaturas/fantasia_cavaleiro_bracadeiras_pacote.0683053549e0.webp",
      "tris": 484,
      "set": "fantasia_cavaleiro",
      "origin": {
        "blob": "adccaddc149c738df7d927abf5959d7d801c5422",
        "thumbBlob": "f3ed843d55700f13905d47167b9e0f0da3f8aa8c",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_cavaleiro_elmo_chifres_pacote": {
      "slot": "chapeu",
      "group": "fantasia",
      "label": "Cavaleiro: elmo com chifres",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_cavaleiro_elmo_chifres_pacote.b084c740fc43.glb",
      "thumb": "miniaturas/fantasia_cavaleiro_elmo_chifres_pacote.b4746555da42.webp",
      "tris": 1166,
      "set": "fantasia_cavaleiro",
      "origin": {
        "blob": "2262eb878c0e996f0edc92a3ef501b03c34818f0",
        "thumbBlob": "01cf83d7506314afc029ec66a6a506bc305c2f81",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_cavaleiro_ombreiras_pacote": {
      "slot": "roupa_cima",
      "group": "fantasia",
      "label": "Cavaleiro: ombreiras",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_cavaleiro_ombreiras_pacote.1cd81f80b569.glb",
      "thumb": "miniaturas/fantasia_cavaleiro_ombreiras_pacote.d829fa81f0f6.webp",
      "tris": 800,
      "set": "fantasia_cavaleiro",
      "origin": {
        "blob": "b39422fea60b4a51533fa98f71c31737d6660921",
        "thumbBlob": "8d3d7d1fc9389704a14a05f05714ace84aa26d4a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_cavaleiro_peitoral_pacote": {
      "slot": "fantasia",
      "group": "fantasia",
      "label": "Cavaleiro: peitoral",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_cavaleiro_peitoral_pacote.920b28a3a9f4.glb",
      "thumb": "miniaturas/fantasia_cavaleiro_peitoral_pacote.60eaea65f207.webp",
      "tris": 604,
      "set": "fantasia_cavaleiro",
      "origin": {
        "blob": "19c19314ac70f857fa74161b851ec512059c28b4",
        "thumbBlob": "37457e55747d221f8899b0e96ec2bd3627b66937",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_coelho_roxo_botas_pacote": {
      "slot": "calcado",
      "group": "fantasia",
      "label": "Coelho roxo: botas",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_coelho_roxo_botas_pacote.a22f5d9d8f14.glb",
      "thumb": "miniaturas/fantasia_coelho_roxo_botas_pacote.34ac40f1a312.webp",
      "tris": 454,
      "set": "fantasia_coelho_roxo",
      "origin": {
        "blob": "2f1c7705d3d131f2f809258049a655904896557d",
        "thumbBlob": "7612a89f06980d3640e09e45055d45c50f5a43b2",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_coelho_roxo_capuz_coelho_pacote": {
      "slot": "chapeu",
      "group": "fantasia",
      "label": "Coelho roxo: capuz de coelho",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_coelho_roxo_capuz_coelho_pacote.4d20477e1c6b.glb",
      "thumb": "miniaturas/fantasia_coelho_roxo_capuz_coelho_pacote.77177824b2ab.webp",
      "tris": 1884,
      "set": "fantasia_coelho_roxo",
      "origin": {
        "blob": "c4c46526ccaa0d0fb7e471d3a2cd3dd04c49f1f4",
        "thumbBlob": "d1c877c190080a0d0cf7263eb3a95c174829a178",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_coelho_roxo_macacao_pacote": {
      "slot": "fantasia",
      "group": "fantasia",
      "label": "Coelho roxo: macacão",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_coelho_roxo_macacao_pacote.d91fce060744.glb",
      "thumb": "miniaturas/fantasia_coelho_roxo_macacao_pacote.b5657ef478b0.webp",
      "tris": 1712,
      "set": "fantasia_coelho_roxo",
      "origin": {
        "blob": "39a9cefc9480a6d6f59f6efade1d224a97e1cd94",
        "thumbBlob": "58bffd965982433859626b4b83541be26a817cbf",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_dinossauro_listrado_cabeca_pacote": {
      "slot": "chapeu",
      "group": "fantasia",
      "label": "Dinossauro listrado: cabeça",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_dinossauro_listrado_cabeca_pacote.11b749684af4.glb",
      "thumb": "miniaturas/fantasia_dinossauro_listrado_cabeca_pacote.84d6cb8ddc67.webp",
      "tris": 1886,
      "set": "fantasia_dinossauro_listrado",
      "origin": {
        "blob": "dd03eb963872593190d0dad9fdca6ad049ad128e",
        "thumbBlob": "1caf53958177217b0b030f315e351f66e8f0650e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_dinossauro_listrado_laco_rosa_pacote": {
      "slot": "roupa_cima",
      "group": "fantasia",
      "label": "Dinossauro listrado: laço rosa",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_dinossauro_listrado_laco_rosa_pacote.4378a3bc8e50.glb",
      "thumb": "miniaturas/fantasia_dinossauro_listrado_laco_rosa_pacote.d41b8654be41.webp",
      "tris": 472,
      "set": "fantasia_dinossauro_listrado",
      "origin": {
        "blob": "3b4fa143e2b687e814a7d6e20b9c3c8490475a82",
        "thumbBlob": "c7835c3e6fee5335089cd745d44917783249c506",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_dinossauro_listrado_macacao_pacote": {
      "slot": "fantasia",
      "group": "fantasia",
      "label": "Dinossauro listrado: macacão",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_dinossauro_listrado_macacao_pacote.ed1caa4f93d5.glb",
      "thumb": "miniaturas/fantasia_dinossauro_listrado_macacao_pacote.f936cb924d56.webp",
      "tris": 1604,
      "set": "fantasia_dinossauro_listrado",
      "origin": {
        "blob": "7d0ba1008ebee7646bdce4fa9ac14b68dc0b4d00",
        "thumbBlob": "cf9b2145587261980c1337bd996db0beffcb0b88",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_papai_noel_botas_pacote": {
      "slot": "calcado",
      "group": "fantasia",
      "label": "Papai Noel: botas",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_papai_noel_botas_pacote.782b8ddf6c03.glb",
      "thumb": "miniaturas/fantasia_papai_noel_botas_pacote.3c90e5eff46b.webp",
      "tris": 402,
      "set": "fantasia_papai_noel",
      "origin": {
        "blob": "441f65da47cee856fa7a52cca1d092c9380baf19",
        "thumbBlob": "af9fcb0874b7d2e20e9fb57af1386253653c1ef1",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_papai_noel_calca_pacote": {
      "slot": "calca",
      "group": "fantasia",
      "label": "Papai Noel: calça",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_papai_noel_calca_pacote.12f0c10f985c.glb",
      "thumb": "miniaturas/fantasia_papai_noel_calca_pacote.a3f36db97d08.webp",
      "tris": 680,
      "set": "fantasia_papai_noel",
      "origin": {
        "blob": "0d000cd395aebb93aef33c88c42793347c638822",
        "thumbBlob": "82684320d608b5595add6d616c86902b0dd306a7",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_papai_noel_casaco_pacote": {
      "slot": "fantasia",
      "group": "fantasia",
      "label": "Papai Noel: casaco",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_papai_noel_casaco_pacote.40a263ec4c5c.glb",
      "thumb": "miniaturas/fantasia_papai_noel_casaco_pacote.92f25caa21e5.webp",
      "tris": 1304,
      "set": "fantasia_papai_noel",
      "origin": {
        "blob": "f4bae9505433c1c25a860e55a9fbf96d78d03a8c",
        "thumbBlob": "68b7f7c2b1d1190ce0f66b556935fb411a4bb406",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_papai_noel_gorro_pacote": {
      "slot": "chapeu",
      "group": "fantasia",
      "label": "Papai Noel: gorro",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_papai_noel_gorro_pacote.c1146bcca7d9.glb",
      "thumb": "miniaturas/fantasia_papai_noel_gorro_pacote.26c8ef477a82.webp",
      "tris": 628,
      "set": "fantasia_papai_noel",
      "origin": {
        "blob": "c9099aa416e7503d67ef0c99b7a34f66be37d0cd",
        "thumbBlob": "128f35ceb5f31e3f2971cfbc34939e986fd4acc7",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_papai_noel_luvas_pacote": {
      "slot": "luvas",
      "group": "fantasia",
      "label": "Papai Noel: luvas",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_papai_noel_luvas_pacote.86a6b53e0223.glb",
      "thumb": "miniaturas/fantasia_papai_noel_luvas_pacote.bb2b7e7920cb.webp",
      "tris": 1022,
      "set": "fantasia_papai_noel",
      "origin": {
        "blob": "d972f0fd489313df936f5baf814c011cc03648cf",
        "thumbBlob": "34d712371e5cd8e3452a66a80df5295e1248774f",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_pinguim_cabeca_pacote": {
      "slot": "chapeu",
      "group": "fantasia",
      "label": "Pinguim: cabeça",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_pinguim_cabeca_pacote.e387dd14cb94.glb",
      "thumb": "miniaturas/fantasia_pinguim_cabeca_pacote.31d0b4bc1762.webp",
      "tris": 1622,
      "set": "fantasia_pinguim",
      "origin": {
        "blob": "9e9dfaba4271e1bc8ae2b0732d628955b96a41d8",
        "thumbBlob": "22f5bf8ae1177ce3f4bf290e0a3d634fcaaabf96",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_pinguim_macacao_pes_pacote": {
      "slot": "fantasia",
      "group": "fantasia",
      "label": "Pinguim: macacão com pés",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_pinguim_macacao_pes_pacote.bf44695182a8.glb",
      "thumb": "miniaturas/fantasia_pinguim_macacao_pes_pacote.441ab3291e89.webp",
      "tris": 2258,
      "set": "fantasia_pinguim",
      "origin": {
        "blob": "d16c813d0a52327fad69f2ec899ca881d940fccf",
        "thumbBlob": "984c77cb96190e0adde60c0b1c0d026378603e2d",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_pirata_calca_botas_pacote": {
      "slot": "calca",
      "group": "fantasia",
      "label": "Pirata: calça e botas",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_pirata_calca_botas_pacote.bbe199f4943b.glb",
      "thumb": "miniaturas/fantasia_pirata_calca_botas_pacote.80e0f73bf683.webp",
      "tris": 1148,
      "set": "fantasia_pirata",
      "origin": {
        "blob": "711447c7dfa8e18b872ce244b16f7d4830c5ba2a",
        "thumbBlob": "a78b74056428ed9310e6f754daab1b91302c627a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_pirata_casaco_pacote": {
      "slot": "fantasia",
      "group": "fantasia",
      "label": "Pirata: casaco",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_pirata_casaco_pacote.5d0643002002.glb",
      "thumb": "miniaturas/fantasia_pirata_casaco_pacote.9f5e4d210d20.webp",
      "tris": 1574,
      "set": "fantasia_pirata",
      "origin": {
        "blob": "51f0326442f782b490c7ed54f7b96548b378c114",
        "thumbBlob": "bf069436c85c58b97facf9bec2fb0a8866dde7ca",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_pirata_chapeu_pirata_pacote": {
      "slot": "chapeu",
      "group": "fantasia",
      "label": "Pirata: chapéu de pirata",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_pirata_chapeu_pirata_pacote.4d30ea6cdc57.glb",
      "thumb": "miniaturas/fantasia_pirata_chapeu_pirata_pacote.248f942b01d1.webp",
      "tris": 656,
      "set": "fantasia_pirata",
      "origin": {
        "blob": "0fb1c53538e1fb940961f08011fadf050f96fee5",
        "thumbBlob": "298ddb291a854ef76c52a478e035acc6b535c9a5",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_pombo_cabeca_pacote": {
      "slot": "chapeu",
      "group": "fantasia",
      "label": "Pombo: cabeça",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_pombo_cabeca_pacote.786f7d7707ba.glb",
      "thumb": "miniaturas/fantasia_pombo_cabeca_pacote.a4ce57676f20.webp",
      "tris": 1952,
      "set": "fantasia_pombo",
      "origin": {
        "blob": "9f16d0ab0bfc1524c347159c8b440f1a7d337ba3",
        "thumbBlob": "e1e01ebf72b3a6f5ae3ea25595da31e64da7fbf8",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_pombo_macacao_pes_pacote": {
      "slot": "fantasia",
      "group": "fantasia",
      "label": "Pombo: macacão com pés",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_pombo_macacao_pes_pacote.078c5dce771b.glb",
      "thumb": "miniaturas/fantasia_pombo_macacao_pes_pacote.db0a631678e2.webp",
      "tris": 2258,
      "set": "fantasia_pombo",
      "origin": {
        "blob": "e23de0bae1541fed9bf8a109f9696d538582ce80",
        "thumbBlob": "05994e6fac1c688833ea89a45809dd877880c060",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_robo_amarelo_botas_pacote": {
      "slot": "calcado",
      "group": "fantasia",
      "label": "Robô amarelo: botas",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_robo_amarelo_botas_pacote.2c14985c396e.glb",
      "thumb": "miniaturas/fantasia_robo_amarelo_botas_pacote.d49e825ab586.webp",
      "tris": 402,
      "set": "fantasia_robo_amarelo",
      "origin": {
        "blob": "696708ca87f22bba1b89ec414da6a9b0787cfe36",
        "thumbBlob": "4b3ce5bae1d6d4a1a6b777302a621d87fac4dd67",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_robo_amarelo_cabeca_robo_pacote": {
      "slot": "chapeu",
      "group": "fantasia",
      "label": "Robô amarelo: cabeça de robô",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_robo_amarelo_cabeca_robo_pacote.f6cd5054ca39.glb",
      "thumb": "miniaturas/fantasia_robo_amarelo_cabeca_robo_pacote.5fe9837648b1.webp",
      "tris": 1932,
      "set": "fantasia_robo_amarelo",
      "origin": {
        "blob": "a1539a7771df3b4dcc5e41d9fefb89b5095458af",
        "thumbBlob": "dfcc95473c04df871dd14b47e555b7bf61e796a2",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_robo_amarelo_luvas_pacote": {
      "slot": "luvas",
      "group": "fantasia",
      "label": "Robô amarelo: luvas",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_robo_amarelo_luvas_pacote.2a54c9e0663e.glb",
      "thumb": "miniaturas/fantasia_robo_amarelo_luvas_pacote.d8b353360caf.webp",
      "tris": 1022,
      "set": "fantasia_robo_amarelo",
      "origin": {
        "blob": "11866dbad73f244d68737caeaa7b54c140525e6d",
        "thumbBlob": "ca4caa4754f7246785eefd15981897cd0b154f4e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_robo_amarelo_macacao_pacote": {
      "slot": "fantasia",
      "group": "fantasia",
      "label": "Robô amarelo: macacão",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_robo_amarelo_macacao_pacote.c3803dcf3868.glb",
      "thumb": "miniaturas/fantasia_robo_amarelo_macacao_pacote.b94e66533262.webp",
      "tris": 1200,
      "set": "fantasia_robo_amarelo",
      "origin": {
        "blob": "82903bf389a71bc03e756308c077c00a22a56a39",
        "thumbBlob": "b76a57a814e806755e26d9076b950c14b4dcac3c",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_soldado_bolsas_colete_pacote": {
      "slot": "roupa_cima",
      "group": "fantasia",
      "label": "Soldado: bolsas do colete",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_soldado_bolsas_colete_pacote.9515b3907416.glb",
      "thumb": "miniaturas/fantasia_soldado_bolsas_colete_pacote.c65545385f17.webp",
      "tris": 720,
      "set": "fantasia_soldado",
      "origin": {
        "blob": "2f36f9c789a410fd2cd36436e40984b5845e3d4d",
        "thumbBlob": "68199600b59826f7ed42b29e03bf0e03493aa84d",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_soldado_botas_pacote": {
      "slot": "calcado",
      "group": "fantasia",
      "label": "Soldado: botas",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_soldado_botas_pacote.0ecafa4f06c0.glb",
      "thumb": "miniaturas/fantasia_soldado_botas_pacote.23884a65556c.webp",
      "tris": 4950,
      "set": "fantasia_soldado",
      "origin": {
        "blob": "d2ec1e706ea33435a25a340152d4a8f7b4656d2c",
        "thumbBlob": "66588ad08e605689d8445f4423748830db2186bc",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_soldado_calca_pacote": {
      "slot": "calca",
      "group": "fantasia",
      "label": "Soldado: calça",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_soldado_calca_pacote.dbfc8b44c2e2.glb",
      "thumb": "miniaturas/fantasia_soldado_calca_pacote.389f6a5182a6.webp",
      "tris": 1012,
      "set": "fantasia_soldado",
      "origin": {
        "blob": "c23889f7bb403ba73f432d7f551097611e287d1d",
        "thumbBlob": "653c81ffcd398bbc4ab6dcc8dd60f3d32c9274af",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_soldado_camisa_pacote": {
      "slot": "fantasia",
      "group": "fantasia",
      "label": "Soldado: camisa",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_soldado_camisa_pacote.e674b5f4d4c5.glb",
      "thumb": "miniaturas/fantasia_soldado_camisa_pacote.67b0adfbb46e.webp",
      "tris": 1458,
      "set": "fantasia_soldado",
      "origin": {
        "blob": "4c7433f4584aba63d1e88db08d692e87a52a5250",
        "thumbBlob": "d966fff2389689c6a5d8c39ff61ccddb9a3ad88a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_soldado_capacete_pacote": {
      "slot": "chapeu",
      "group": "fantasia",
      "label": "Soldado: capacete",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_soldado_capacete_pacote.a9d39fc509bc.glb",
      "thumb": "miniaturas/fantasia_soldado_capacete_pacote.61f488bf11ad.webp",
      "tris": 2830,
      "set": "fantasia_soldado",
      "origin": {
        "blob": "116a48309d2987c38f224eb61b5d258dae0ec4d6",
        "thumbBlob": "47b9456df0de782a743a93a7dcca6b795dda8df4",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_soldado_luvas_pacote": {
      "slot": "luvas",
      "group": "fantasia",
      "label": "Soldado: luvas",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_soldado_luvas_pacote.2686d8a50316.glb",
      "thumb": "miniaturas/fantasia_soldado_luvas_pacote.49b80c369eff.webp",
      "tris": 1022,
      "set": "fantasia_soldado",
      "origin": {
        "blob": "29291be4eb1a3bae8247cb973f44c5c9e068f914",
        "thumbBlob": "d980cfe5068c2ba5a07aaf104cd04f0f7f28ce5f",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_super_heroi_botas_pacote": {
      "slot": "calcado",
      "group": "fantasia",
      "label": "Super-herói: botas",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_super_heroi_botas_pacote.7f66cdb751b0.glb",
      "thumb": "miniaturas/fantasia_super_heroi_botas_pacote.476504d80ae1.webp",
      "tris": 446,
      "set": "fantasia_super_heroi",
      "origin": {
        "blob": "586429f5966df2cf19e8633abe2aa29a80a35df3",
        "thumbBlob": "ee895d0c69db1f164a95f13b99235137d6032f07",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_super_heroi_luvas_pacote": {
      "slot": "luvas",
      "group": "fantasia",
      "label": "Super-herói: luvas",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_super_heroi_luvas_pacote.0531c041e8eb.glb",
      "thumb": "miniaturas/fantasia_super_heroi_luvas_pacote.57f12baf226c.webp",
      "tris": 1066,
      "set": "fantasia_super_heroi",
      "origin": {
        "blob": "dd770d63cc3b81bbc57182994fe8ccbbff000e12",
        "thumbBlob": "092085de8bb90b8c31e440c8ae8f8d739106294a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_super_heroi_macacao_pacote": {
      "slot": "fantasia",
      "group": "fantasia",
      "label": "Super-herói: macacão",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_super_heroi_macacao_pacote.1990c165e9e4.glb",
      "thumb": "miniaturas/fantasia_super_heroi_macacao_pacote.dc53b8be4e1e.webp",
      "tris": 1164,
      "set": "fantasia_super_heroi",
      "origin": {
        "blob": "35b01885b86b72c6a195fdff663b22344ba443ab",
        "thumbBlob": "1934da31ea95807b5616ff8152a9ff930ed2331a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_super_heroi_mascara_capacete_pacote": {
      "slot": "chapeu",
      "group": "fantasia",
      "label": "Super-herói: máscara-capacete",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_super_heroi_mascara_capacete_pacote.34faa45a252f.glb",
      "thumb": "miniaturas/fantasia_super_heroi_mascara_capacete_pacote.f75327943a6f.webp",
      "tris": 1456,
      "set": "fantasia_super_heroi",
      "origin": {
        "blob": "d5b205794a0f408620186e87cb3c36cee0a706c8",
        "thumbBlob": "85298ee5dc4e30f98c31b24e69d60f314892c164",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_traje_neon_capacete_pacote": {
      "slot": "chapeu",
      "group": "fantasia",
      "label": "Traje neon: capacete",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_traje_neon_capacete_pacote.834f6bed8e26.glb",
      "thumb": "miniaturas/fantasia_traje_neon_capacete_pacote.20f1c1f3dd09.webp",
      "tris": 1608,
      "set": "fantasia_traje_neon",
      "origin": {
        "blob": "9d24a45d2ed47cd42cf0adc2a9f5d0935c432edf",
        "thumbBlob": "eb2d91decaebc64ab5551deafebaa5a2b93d0b4e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_traje_neon_luvas_pacote": {
      "slot": "luvas",
      "group": "fantasia",
      "label": "Traje neon: luvas",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_traje_neon_luvas_pacote.e7f11b3afca6.glb",
      "thumb": "miniaturas/fantasia_traje_neon_luvas_pacote.0106b420cc4d.webp",
      "tris": 1020,
      "set": "fantasia_traje_neon",
      "origin": {
        "blob": "7399e7c346448b8208eaccfacf77765637be6452",
        "thumbBlob": "876066b0c70d22952a87222513739beacff57ff2",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fantasia_traje_neon_macacao_pacote": {
      "slot": "fantasia",
      "group": "fantasia",
      "label": "Traje neon: macacão",
      "audience": "both",
      "tier": "set",
      "price": 0,
      "review": true,
      "file": "pecas/fantasia_traje_neon_macacao_pacote.46bbc93ff3d0.glb",
      "thumb": "miniaturas/fantasia_traje_neon_macacao_pacote.0e46eda33b5c.webp",
      "tris": 2002,
      "set": "fantasia_traje_neon",
      "origin": {
        "blob": "a0932e2817fe36ec60cef1af528e269bf84d290d",
        "thumbBlob": "cab34ab01bf458839e63ab1ae1dfc477aa88f0e4",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "fones_sem_fio_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Fones sem fio",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/fones_sem_fio_pacote.d7c56a247403.glb",
      "thumb": "miniaturas/fones_sem_fio_pacote.27dcc1e90671.webp",
      "tris": 256,
      "origin": {
        "blob": "ce979b64a8f9cbe075d460d74d051b5c7cf282e7",
        "thumbBlob": "883a6c09eebd372bddbf676c8572a2b86718a19b",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "luvas_amarelas_pacote": {
      "slot": "luvas",
      "group": "luvas",
      "label": "Luvas amarelas",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/luvas_amarelas_pacote.6adbb0e62649.glb",
      "thumb": "miniaturas/luvas_amarelas_pacote.cd246e53b060.webp",
      "tris": 1022,
      "origin": {
        "blob": "d10c9713d87627da3e163d4bfa7d5626592eb64f",
        "thumbBlob": "d16c15363ffda31ff1a30332224092e7a479333c",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "luvas_azuis_pacote": {
      "slot": "luvas",
      "group": "luvas",
      "label": "Luvas azuis",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/luvas_azuis_pacote.0731c5d2e264.glb",
      "thumb": "miniaturas/luvas_azuis_pacote.61eaa286cdf6.webp",
      "tris": 978,
      "origin": {
        "blob": "49943a43accf9f59b190af6612fdb522316e8c6e",
        "thumbBlob": "d65ffed21ebe78ce3e067eff4e36ef089f8a99e5",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "luvas_cinza_escuro_pacote": {
      "slot": "luvas",
      "group": "luvas",
      "label": "Luvas cinza-escuro",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/luvas_cinza_escuro_pacote.9658e9044840.glb",
      "thumb": "miniaturas/luvas_cinza_escuro_pacote.136f0bbceefe.webp",
      "tris": 818,
      "origin": {
        "blob": "b2f63844f18d1748585bed50a8b5c807548fb871",
        "thumbBlob": "4547bd58b9b572c87b8a815e63f7786c66466f49",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "luvas_cinza_pacote": {
      "slot": "luvas",
      "group": "luvas",
      "label": "Luvas cinza",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/luvas_cinza_pacote.af0732b7960a.glb",
      "thumb": "miniaturas/luvas_cinza_pacote.fc5a1e6d2d28.webp",
      "tris": 754,
      "origin": {
        "blob": "cf575badd0af35fa78b3e707d11caa2d5f299f5c",
        "thumbBlob": "b8b8dd17ee36c356f8bed484f44e2348048b331b",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "luvas_laranja_pacote": {
      "slot": "luvas",
      "group": "luvas",
      "label": "Luvas laranja",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/luvas_laranja_pacote.0244cc9bb1f7.glb",
      "thumb": "miniaturas/luvas_laranja_pacote.657232e8fc62.webp",
      "tris": 978,
      "origin": {
        "blob": "bcc757c6603f4903cb5c2a91081580ce99e56309",
        "thumbBlob": "1664945d1633e5fd6afbff43b57612d24cc56f15",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "luvas_listradas_vermelhas_pacote": {
      "slot": "luvas",
      "group": "luvas",
      "label": "Luvas listradas vermelhas",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "especial",
      "review": true,
      "file": "pecas/luvas_listradas_vermelhas_pacote.1a9bf02762e9.glb",
      "thumb": "miniaturas/luvas_listradas_vermelhas_pacote.4ce715fa6594.webp",
      "tris": 754,
      "origin": {
        "blob": "fdff5349509a1845c1131e9d35cf46eccf89f91b",
        "thumbBlob": "d54b2f9fd50c0844c1e9749ef4495d454d1d86c6",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "luvas_pretas_pacote": {
      "slot": "luvas",
      "group": "luvas",
      "label": "Luvas pretas",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/luvas_pretas_pacote.f67695380dc0.glb",
      "thumb": "miniaturas/luvas_pretas_pacote.19eb354b1fa0.webp",
      "tris": 562,
      "origin": {
        "blob": "bef18cd642336fd6ca130c4795eaffa954d41b86",
        "thumbBlob": "ecaa4b23a5c74f357ba63560dea53adfdc2b1355",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "luvas_pretas_sem_dedos_pacote": {
      "slot": "luvas",
      "group": "luvas",
      "label": "Luvas pretas sem dedos",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "especial",
      "review": true,
      "file": "pecas/luvas_pretas_sem_dedos_pacote.f0d4d775a8b4.glb",
      "thumb": "miniaturas/luvas_pretas_sem_dedos_pacote.853e88744276.webp",
      "tris": 1058,
      "origin": {
        "blob": "8fcfad63fdd550b1f4b707f0f621de8c20eaa8be",
        "thumbBlob": "9d91057cd41c25ff25b3b3bced66e51742fbb5d9",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "luvas_rosa_pacote": {
      "slot": "luvas",
      "group": "luvas",
      "label": "Luvas rosa (boxe)",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/luvas_rosa_pacote.81600a5a873b.glb",
      "thumb": "miniaturas/luvas_rosa_pacote.62be34ac4f5a.webp",
      "tris": 790,
      "origin": {
        "blob": "8df660d9cbcc02563b16f6d223e8c5f92ab4ba18",
        "thumbBlob": "9a81421a66088b0a8a8de64e1798fede8e9a63c2",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "luvas_verde_limao_pacote": {
      "slot": "luvas",
      "group": "luvas",
      "label": "Luvas verde-limão",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/luvas_verde_limao_pacote.0b2593d52c1c.glb",
      "thumb": "miniaturas/luvas_verde_limao_pacote.db229f2863c7.webp",
      "tris": 1058,
      "origin": {
        "blob": "113ddbfc7cf97f78ae7129cd17097d26dcdd2a05",
        "thumbBlob": "29bb06283e44b209f631f6742346b5f5a1f082bf",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "luvas_verdes_pacote": {
      "slot": "luvas",
      "group": "luvas",
      "label": "Luvas verdes",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/luvas_verdes_pacote.f65751e6d27a.glb",
      "thumb": "miniaturas/luvas_verdes_pacote.1d791dee79e4.webp",
      "tris": 1022,
      "origin": {
        "blob": "0c428d4c2634839220edb84d1aae76a1659ca9d5",
        "thumbBlob": "71f4eb14c4f5b12fd4c31c151b183e6e12ec5a32",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "luvas_vermelhas_pacote": {
      "slot": "luvas",
      "group": "luvas",
      "label": "Luvas vermelhas",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/luvas_vermelhas_pacote.e2fdb46a9a3b.glb",
      "thumb": "miniaturas/luvas_vermelhas_pacote.3fa26d8ccc43.webp",
      "tris": 562,
      "origin": {
        "blob": "0d724aca44a86f8e3ba6a4f46389446f0cbf626b",
        "thumbBlob": "61ae81a13254615c7a358b3c07f27441024dcb63",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "mascara_cirurgica_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Máscara cirúrgica",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/mascara_cirurgica_pacote.2313358e011e.glb",
      "thumb": "miniaturas/mascara_cirurgica_pacote.2e8f7f2122cf.webp",
      "tris": 188,
      "origin": {
        "blob": "e221b083616677c0d6ef07cc0e4d1a2ada296419",
        "thumbBlob": "e5798770737ac72a14965eed93680148157126d3",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "mascara_pano_preta_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Máscara de pano preta",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/mascara_pano_preta_pacote.2be7bf44b36f.glb",
      "thumb": "miniaturas/mascara_pano_preta_pacote.3ab7d08b4f3f.webp",
      "tris": 130,
      "origin": {
        "blob": "93575d2401ed4ddf906229024cd621a384bb6910",
        "thumbBlob": "cfe7ce51551e8b36acf67613f4dc149db57bdf6a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "meias_altas_cinza_pacote": {
      "slot": "meias",
      "group": "meias",
      "label": "Meias altas cinza",
      "audience": "both",
      "tier": "coins",
      "price": 40,
      "band": "comum",
      "review": true,
      "file": "pecas/meias_altas_cinza_pacote.823c4e77ebc7.glb",
      "thumb": "miniaturas/meias_altas_cinza_pacote.bd08e30e3f97.webp",
      "tris": 398,
      "origin": {
        "blob": "71109a98277f60f2f2bffa033d3bcf30c74d9c1c",
        "thumbBlob": "31d66194475fbe6ba71b6b65f5097f1c91415609",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "meias_altas_marrons_pacote": {
      "slot": "meias",
      "group": "meias",
      "label": "Meias altas marrons",
      "audience": "both",
      "tier": "coins",
      "price": 40,
      "band": "comum",
      "review": true,
      "file": "pecas/meias_altas_marrons_pacote.c47020408c8b.glb",
      "thumb": "miniaturas/meias_altas_marrons_pacote.e79b644f7711.webp",
      "tris": 354,
      "origin": {
        "blob": "3417c4fd63351b45760f04b4eee531abfd088140",
        "thumbBlob": "715c76d5ce38dab41bffd5fbf93c1f7703af6eec",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "meias_curtas_pacote": {
      "slot": "meias",
      "group": "meias",
      "label": "Meias curtas",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/meias_curtas_pacote.2e48349c860e.glb",
      "thumb": "miniaturas/meias_curtas_pacote.e079194893ce.webp",
      "tris": 220,
      "origin": {
        "blob": "a7a90fd89e881f3b6ebc5d02f9083ca730cf2a2a",
        "thumbBlob": "a27d0c54a966bdfae8cfcc43b33f43f0b225ac64",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "nariz_palhaco_pacote": {
      "slot": "acessorio_rosto",
      "group": "acessorio_rosto",
      "label": "Nariz de palhaço",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/nariz_palhaco_pacote.1f70460e2af7.glb",
      "thumb": "miniaturas/nariz_palhaco_pacote.b90cc1d694d7.webp",
      "tris": 192,
      "origin": {
        "blob": "c0e227a388bd437c02b7aa06d856c03b71dd41a7",
        "thumbBlob": "90d0e592553c6d0f5d283ae6ce39916ac6a2b0e8",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_3d_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Óculos 3D",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/oculos_3d_pacote.3c456d80df27.glb",
      "thumb": "miniaturas/oculos_3d_pacote.96092c2feb71.webp",
      "tris": 280,
      "origin": {
        "blob": "f435346079af5bba2bd9fbf2262223281d2d3a80",
        "thumbBlob": "14e1c807969c6f98a4f75e27359ccaf60ba1d329",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_aviador_laranja_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Óculos de aviador laranja",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/oculos_aviador_laranja_pacote.318a6d632242.glb",
      "thumb": "miniaturas/oculos_aviador_laranja_pacote.d30975da8ffb.webp",
      "tris": 1200,
      "origin": {
        "blob": "0ce46da7ad595112a75e0fada0d7a9d16b30e0d1",
        "thumbBlob": "cd1c69ec128bbd60be4fd3cc6903824ba9894c28",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_azuis_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Óculos azuis",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/oculos_azuis_pacote.755c690e48eb.glb",
      "thumb": "miniaturas/oculos_azuis_pacote.2060bde0c411.webp",
      "tris": 320,
      "origin": {
        "blob": "407e2ab0de3417f0ea8cceee61f21ae4cce6e796",
        "thumbBlob": "73975faa29c87fb514becde108859db5223245b6",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_coracao_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Óculos de coração (pixel)",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/oculos_coracao_pacote.6e35c5eb4c37.glb",
      "thumb": "miniaturas/oculos_coracao_pacote.ab2d97c9b671.webp",
      "tris": 428,
      "origin": {
        "blob": "d86acbc778d76e9177b24073a320f9e7e6758e27",
        "thumbBlob": "6f77413cce4448c5693dbfb07258448e9e46cf01",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_escuros_brancos_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Óculos escuros brancos",
      "audience": "both",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/oculos_escuros_brancos_pacote.e873925ecc35.glb",
      "thumb": "miniaturas/oculos_escuros_brancos_pacote.690f3c005f35.webp",
      "tris": 1496,
      "origin": {
        "blob": "45f4d363b1833cec4f233dd352f620d61569ec71",
        "thumbBlob": "3c60562ab24695f2e0a911b9fcd76838087cdf61",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_escuros_cinza_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Óculos escuros cinza",
      "audience": "both",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/oculos_escuros_cinza_pacote.0c4011c86014.glb",
      "thumb": "miniaturas/oculos_escuros_cinza_pacote.4bb62353f3bf.webp",
      "tris": 980,
      "origin": {
        "blob": "85f57c3b97e2809356dcf9850997a4a3c6862b57",
        "thumbBlob": "616c62effd23ba645e0955e8accd8c7d166642ca",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_esqui_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Óculos de esqui",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/oculos_esqui_pacote.38be6a45c9b6.glb",
      "thumb": "miniaturas/oculos_esqui_pacote.2344bf4af8c4.webp",
      "tris": 524,
      "origin": {
        "blob": "2ff71c7978efb3af6f1d9f370e82be56cb12aed6",
        "thumbBlob": "202c811841c687bb020043115c2eb37da6ddbe42",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_gatinho_verde_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Óculos de gatinho verde",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/oculos_gatinho_verde_pacote.ce00cc2e1d27.glb",
      "thumb": "miniaturas/oculos_gatinho_verde_pacote.5f52f5501964.webp",
      "tris": 452,
      "origin": {
        "blob": "85d20da4e5f57f949b46b66b1a266186b7d83855",
        "thumbBlob": "f185adb8253bad0a5558336f98973d7d8df08689",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_grau_vermelhos_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Óculos de grau vermelhos",
      "audience": "both",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/oculos_grau_vermelhos_pacote.15491558e61e.glb",
      "thumb": "miniaturas/oculos_grau_vermelhos_pacote.d7abaedee680.webp",
      "tris": 1240,
      "origin": {
        "blob": "628a951a2142a0b10e0f97cac714ec81085cb650",
        "thumbBlob": "9dc8b6e2fc230364bfc51bcf3420ef1459af45b1",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_lupa_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Lupa",
      "audience": "both",
      "tier": "coins",
      "price": 120,
      "band": "raro",
      "review": true,
      "file": "pecas/oculos_lupa_pacote.fbee91a36ae1.glb",
      "thumb": "miniaturas/oculos_lupa_pacote.7770c9768897.webp",
      "tris": 258,
      "origin": {
        "blob": "68cceeaf742c4b56284698fe0246d0d7561f64a0",
        "thumbBlob": "5375bde22ed2102a276565ec356fcf004362b0e1",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_marrons_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Óculos marrons",
      "audience": "both",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/oculos_marrons_pacote.ef06a1debb02.glb",
      "thumb": "miniaturas/oculos_marrons_pacote.75d9f1c75de0.webp",
      "tris": 1048,
      "origin": {
        "blob": "e0067a2bcb33c0425a9d455d895bff20f335c091",
        "thumbBlob": "da6ed8bb40e2c645a468b4aca83a480c66d5d4a1",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_persiana_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Óculos de persiana",
      "audience": "both",
      "tier": "coins",
      "price": 120,
      "band": "raro",
      "review": true,
      "file": "pecas/oculos_persiana_pacote.89acf25eaa55.glb",
      "thumb": "miniaturas/oculos_persiana_pacote.79aec00aed43.webp",
      "tris": 408,
      "origin": {
        "blob": "e9d35b95384b793f505ef0a911dd04530a5afa93",
        "thumbBlob": "95849682d81bd65c95c459a57c74b020e243ff23",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_pixelados_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Óculos pixelados",
      "audience": "both",
      "tier": "coins",
      "price": 120,
      "band": "raro",
      "review": true,
      "file": "pecas/oculos_pixelados_pacote.6306e97e6651.glb",
      "thumb": "miniaturas/oculos_pixelados_pacote.169c026658e7.webp",
      "tris": 612,
      "origin": {
        "blob": "0d0468994dbffbf4de13422477112f8d2e86c943",
        "thumbBlob": "53b269afad92f13cb07de5e69866a96351ca9d90",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_redondos_azuis_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Óculos redondos azuis",
      "audience": "both",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/oculos_redondos_azuis_pacote.34c13767b55e.glb",
      "thumb": "miniaturas/oculos_redondos_azuis_pacote.044971b5b8ae.webp",
      "tris": 288,
      "origin": {
        "blob": "5aa1a05259498bb364c83ed8fd53f6d1672529ee",
        "thumbBlob": "c3612175c6cd8103f8a29049171419405df87c78",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_redondos_cinza_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Óculos redondos cinza",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/oculos_redondos_cinza_pacote.c7b8be93ac9f.glb",
      "thumb": "miniaturas/oculos_redondos_cinza_pacote.a5e2e01e616d.webp",
      "tris": 216,
      "origin": {
        "blob": "9e7d5984e4592ab9b4ae11a35089129d3ad9dd9a",
        "thumbBlob": "5da681f9745146ebe886cd7a79ba79336ede8607",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_redondos_rosa_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Óculos redondos rosa",
      "audience": "both",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/oculos_redondos_rosa_pacote.070f7afd4ef9.glb",
      "thumb": "miniaturas/oculos_redondos_rosa_pacote.28f96a2f1083.webp",
      "tris": 712,
      "origin": {
        "blob": "59f548c30ea39ffc22614a893b8ad8157a8c3054",
        "thumbBlob": "29f95391c11f1f7deced92cf9f2615fa88a08fb0",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_redondos_verdes_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Óculos redondos verdes",
      "audience": "both",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/oculos_redondos_verdes_pacote.fa5f6a74ce24.glb",
      "thumb": "miniaturas/oculos_redondos_verdes_pacote.ac8b0ab70063.webp",
      "tris": 876,
      "origin": {
        "blob": "591f53628cd466389efdda1f5f504459b22b825f",
        "thumbBlob": "beb71e66fdc9e8b1673708fe1743c108206b825e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_redondos_vermelhos_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Óculos redondos vermelhos",
      "audience": "both",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/oculos_redondos_vermelhos_pacote.0b1e9ad96648.glb",
      "thumb": "miniaturas/oculos_redondos_vermelhos_pacote.bf3c2eae286c.webp",
      "tris": 660,
      "origin": {
        "blob": "a8fef25e28e80c6390e303ead3e43a1409f170e3",
        "thumbBlob": "6a4d91afb333d3a73124260dbf8dc3b115b79c0e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_redondos_vidro_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Óculos redondos de vidro",
      "audience": "both",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/oculos_redondos_vidro_pacote.0c9cfd4e1864.glb",
      "thumb": "miniaturas/oculos_redondos_vidro_pacote.ffe827a8f533.webp",
      "tris": 1038,
      "origin": {
        "blob": "6353103e2a35d0d2a38494cf013cf8266367554c",
        "thumbBlob": "8971bcf0fcb673f359012e9b9ef14dbcd8278c30",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_rosa_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Óculos rosa",
      "audience": "both",
      "tier": "coins",
      "price": 60,
      "band": "comum",
      "review": true,
      "file": "pecas/oculos_rosa_pacote.00b8764b1d64.glb",
      "thumb": "miniaturas/oculos_rosa_pacote.b9526718f4bc.webp",
      "tris": 468,
      "origin": {
        "blob": "348e590a501ad81c9206a814541354c078e85204",
        "thumbBlob": "d31d8d4299a027d7305c02af3cab587721ac4bf0",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_tapa_olho_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Tapa-olho",
      "audience": "both",
      "tier": "coins",
      "price": 120,
      "band": "raro",
      "review": true,
      "file": "pecas/oculos_tapa_olho_pacote.705353d29a95.glb",
      "thumb": "miniaturas/oculos_tapa_olho_pacote.74c7f0e93f47.webp",
      "tris": 232,
      "origin": {
        "blob": "d5a47aae7c4a061a3b14e26337cc6c8ee8f21776",
        "thumbBlob": "961f6c8b7c6ec9a56b7324ef86ebc27165cfca83",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "oculos_viseira_triangular_vidro_pacote": {
      "slot": "oculos",
      "group": "oculos",
      "label": "Viseira triangular de vidro",
      "audience": "both",
      "tier": "coins",
      "price": 120,
      "band": "raro",
      "review": true,
      "file": "pecas/oculos_viseira_triangular_vidro_pacote.1315446b8a2b.glb",
      "thumb": "miniaturas/oculos_viseira_triangular_vidro_pacote.2df653a03b4e.webp",
      "tris": 348,
      "origin": {
        "blob": "85756d68744be9afda06cf111d40cb82a6fb3bdc",
        "thumbBlob": "32772540847b761247c9d8772e248d9be0c20c8d",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "orelhas_corpo_amarelo_limao_pacote": {
      "slot": "orelhas",
      "group": "orelhas",
      "label": "Orelhas amarelo-limão",
      "audience": "both",
      "tier": "auto",
      "price": 0,
      "review": true,
      "file": "pecas/orelhas_corpo_amarelo_limao_pacote.47067ca451fc.glb",
      "thumb": "miniaturas/orelhas_corpo_amarelo_limao_pacote.4803178d443e.webp",
      "tris": 472,
      "origin": {
        "blob": "363400e748f9efa88e9aef52c6968f7637fdd532",
        "thumbBlob": "b499ed3acc795007012b4a86ded3d8b6c4c36b2c",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "orelhas_corpo_amarelo_pacote": {
      "slot": "orelhas",
      "group": "orelhas",
      "label": "Orelhas amarelo",
      "audience": "both",
      "tier": "auto",
      "price": 0,
      "review": true,
      "file": "pecas/orelhas_corpo_amarelo_pacote.fe4e6a68e14d.glb",
      "thumb": "miniaturas/orelhas_corpo_amarelo_pacote.23ceafee62e4.webp",
      "tris": 472,
      "origin": {
        "blob": "940137e1d2aa291e00a0fde3062a70b14646a3ca",
        "thumbBlob": "bea9ec68964a11ca0fc02249e33ff59559f79acc",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "orelhas_corpo_azul_pacote": {
      "slot": "orelhas",
      "group": "orelhas",
      "label": "Orelhas azul",
      "audience": "both",
      "tier": "auto",
      "price": 0,
      "review": true,
      "file": "pecas/orelhas_corpo_azul_pacote.6927c05f38ce.glb",
      "thumb": "miniaturas/orelhas_corpo_azul_pacote.a95247ca03f9.webp",
      "tris": 472,
      "origin": {
        "blob": "3a3c35dd6e075f0b94300562695d99c27886da60",
        "thumbBlob": "5314151259fe6ed55f4209e7080563ee1550a056",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "orelhas_corpo_azul_petroleo_pacote": {
      "slot": "orelhas",
      "group": "orelhas",
      "label": "Orelhas azul-petróleo",
      "audience": "both",
      "tier": "auto",
      "price": 0,
      "review": true,
      "file": "pecas/orelhas_corpo_azul_petroleo_pacote.5d3467cc67a8.glb",
      "thumb": "miniaturas/orelhas_corpo_azul_petroleo_pacote.412215c3138b.webp",
      "tris": 472,
      "origin": {
        "blob": "855fb4dec2215f0dac84c99f97cb331707319741",
        "thumbBlob": "5e23128822a6a0482d9b4d74870fe79c67732aa3",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "orelhas_corpo_branco_pacote": {
      "slot": "orelhas",
      "group": "orelhas",
      "label": "Orelhas branco",
      "audience": "both",
      "tier": "auto",
      "price": 0,
      "review": true,
      "file": "pecas/orelhas_corpo_branco_pacote.7815197ec1e4.glb",
      "thumb": "miniaturas/orelhas_corpo_branco_pacote.5f1e9e6b85f4.webp",
      "tris": 472,
      "origin": {
        "blob": "af3c543b83d0c57d124da81263db5aaf6395fd8b",
        "thumbBlob": "aa33a845f4d26168d1337b0a12657eecf10262fd",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "orelhas_corpo_cinza_pacote": {
      "slot": "orelhas",
      "group": "orelhas",
      "label": "Orelhas cinza",
      "audience": "both",
      "tier": "auto",
      "price": 0,
      "review": true,
      "file": "pecas/orelhas_corpo_cinza_pacote.b1cea3f1bf13.glb",
      "thumb": "miniaturas/orelhas_corpo_cinza_pacote.80820b71daf7.webp",
      "tris": 472,
      "origin": {
        "blob": "8a45adc1fb4423c676d09b9c4cc7fa2c1211d87e",
        "thumbBlob": "f87158ad2a7c8d3eae32bc48fa4bc89ebcd91241",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "orelhas_corpo_laranja_pacote": {
      "slot": "orelhas",
      "group": "orelhas",
      "label": "Orelhas laranja",
      "audience": "both",
      "tier": "auto",
      "price": 0,
      "review": true,
      "file": "pecas/orelhas_corpo_laranja_pacote.bb237c86a614.glb",
      "thumb": "miniaturas/orelhas_corpo_laranja_pacote.400a5df1a9ac.webp",
      "tris": 472,
      "origin": {
        "blob": "a061b5afdfaee00030120ea2f08dfe20325ea47d",
        "thumbBlob": "b250f34d5167d8b4ed99ffe254c4d38c8e24ccad",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "orelhas_corpo_pele_clara_pacote": {
      "slot": "orelhas",
      "group": "orelhas",
      "label": "Orelhas pele clara",
      "audience": "both",
      "tier": "auto",
      "price": 0,
      "review": true,
      "file": "pecas/orelhas_corpo_pele_clara_pacote.a3c885e6ea7e.glb",
      "thumb": "miniaturas/orelhas_corpo_pele_clara_pacote.66658b1ea228.webp",
      "tris": 472,
      "origin": {
        "blob": "c5de728b09ae19923f42af1c04e79b22659d93d1",
        "thumbBlob": "5f4925e4e447213ce2f5a8a52dee637296ce2873",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "orelhas_corpo_pele_escura_pacote": {
      "slot": "orelhas",
      "group": "orelhas",
      "label": "Orelhas pele escura",
      "audience": "both",
      "tier": "auto",
      "price": 0,
      "review": true,
      "file": "pecas/orelhas_corpo_pele_escura_pacote.9ea80a3f30c4.glb",
      "thumb": "miniaturas/orelhas_corpo_pele_escura_pacote.3d5c28cea523.webp",
      "tris": 472,
      "origin": {
        "blob": "850ea56d2eb699effef94c67e97a84ea254da071",
        "thumbBlob": "cbf3d0ce23ba8d6761b129d86025f1f79e36ff3c",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "orelhas_corpo_pele_media_clara_pacote": {
      "slot": "orelhas",
      "group": "orelhas",
      "label": "Orelhas pele média-clara",
      "audience": "both",
      "tier": "auto",
      "price": 0,
      "review": true,
      "file": "pecas/orelhas_corpo_pele_media_clara_pacote.10c8f7c5ddc8.glb",
      "thumb": "miniaturas/orelhas_corpo_pele_media_clara_pacote.a8c317a41934.webp",
      "tris": 472,
      "origin": {
        "blob": "88f74298d855a1c2ee338491c3fd045cc2314bc8",
        "thumbBlob": "996726d35cfcc729e40afb8db0202615a66f73bc",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "orelhas_corpo_pele_media_pacote": {
      "slot": "orelhas",
      "group": "orelhas",
      "label": "Orelhas pele média",
      "audience": "both",
      "tier": "auto",
      "price": 0,
      "review": true,
      "file": "pecas/orelhas_corpo_pele_media_pacote.ee5afb32adf7.glb",
      "thumb": "miniaturas/orelhas_corpo_pele_media_pacote.c5c7088d93b3.webp",
      "tris": 472,
      "origin": {
        "blob": "773ad79f355f1b976a337f8dc760f81d7b30f438",
        "thumbBlob": "b60d4592456eb00fbd5d3358683c1a331e606ad4",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "orelhas_corpo_pele_morena_pacote": {
      "slot": "orelhas",
      "group": "orelhas",
      "label": "Orelhas pele morena",
      "audience": "both",
      "tier": "auto",
      "price": 0,
      "review": true,
      "file": "pecas/orelhas_corpo_pele_morena_pacote.4211c9e61976.glb",
      "thumb": "miniaturas/orelhas_corpo_pele_morena_pacote.5264ef2c99c2.webp",
      "tris": 472,
      "origin": {
        "blob": "531f86f98f36ca43b06d9aae0450380b1d5a352d",
        "thumbBlob": "80e61500aecf1013cee6616e36531fde41177d72",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "orelhas_corpo_preto_pacote": {
      "slot": "orelhas",
      "group": "orelhas",
      "label": "Orelhas preto",
      "audience": "both",
      "tier": "auto",
      "price": 0,
      "review": true,
      "file": "pecas/orelhas_corpo_preto_pacote.7ca07181cd7d.glb",
      "thumb": "miniaturas/orelhas_corpo_preto_pacote.eb1f95b7fbdc.webp",
      "tris": 472,
      "origin": {
        "blob": "bcfcf028b3b083385d915c559d12d3f86e2292db",
        "thumbBlob": "0b9d71d7751e1f7bbf374b2a5c38b8ba8afa673c",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "orelhas_corpo_roxo_pacote": {
      "slot": "orelhas",
      "group": "orelhas",
      "label": "Orelhas roxo",
      "audience": "both",
      "tier": "auto",
      "price": 0,
      "review": true,
      "file": "pecas/orelhas_corpo_roxo_pacote.b88dd23827df.glb",
      "thumb": "miniaturas/orelhas_corpo_roxo_pacote.d71df773213b.webp",
      "tris": 472,
      "origin": {
        "blob": "51a3f70245e7ea9354af94d5e77ec0212a1e04a2",
        "thumbBlob": "027661c9c5aa8248787578bf622482ca440e15c9",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "orelhas_corpo_verde_pacote": {
      "slot": "orelhas",
      "group": "orelhas",
      "label": "Orelhas verde",
      "audience": "both",
      "tier": "auto",
      "price": 0,
      "review": true,
      "file": "pecas/orelhas_corpo_verde_pacote.d296bbd62b7c.glb",
      "thumb": "miniaturas/orelhas_corpo_verde_pacote.8af15a810e74.webp",
      "tris": 472,
      "origin": {
        "blob": "d3e7d36b2a6d8811dc622799575acd9f4291bd47",
        "thumbBlob": "8d8e3ac3548587a542fe55a8ef7563159c72e288",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "orelhas_corpo_vermelho_pacote": {
      "slot": "orelhas",
      "group": "orelhas",
      "label": "Orelhas vermelho",
      "audience": "both",
      "tier": "auto",
      "price": 0,
      "review": true,
      "file": "pecas/orelhas_corpo_vermelho_pacote.22641d93f3a5.glb",
      "thumb": "miniaturas/orelhas_corpo_vermelho_pacote.3feceb87fcb9.webp",
      "tris": 472,
      "origin": {
        "blob": "febd5f41820f2233edbb05ded0173177d0fe92c6",
        "thumbBlob": "1d2ba59a5485c5915322c11a29d481a26c6db978",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_01_apaixonado_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto feminino 01: apaixonado",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_01_apaixonado_pacote.ea260999143c.glb",
      "thumb": "miniaturas/rosto_fem_01_apaixonado_pacote.a9c738d32f02.webp",
      "tris": 533,
      "face": {
        "set": "fem_01",
        "expression": "apaixonado"
      },
      "origin": {
        "blob": "0fb0c03b15ac931669a5e06469febb9fea00b287",
        "thumbBlob": "e2cbf052b7bb88c00f4681f8865a48b686218b03",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_01_atordoado": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Atordoado (feminino 01)",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_01_atordoado.1ddef31f006a.glb",
      "thumb": "miniaturas/rosto_fem_01_atordoado.6298e4ad45f4.webp",
      "tris": 624,
      "face": {
        "set": "fem_01",
        "expression": "atordoado"
      },
      "origin": {
        "blob": "5ad0d99e4dce52cf8589bbfac2d9f9afd3c9bd90",
        "thumbBlob": "72f3ae5b85df963405d88af7df0f69f90369b6b2",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_01_bravo_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto feminino 01: bravo",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_01_bravo_pacote.3a1da765850d.glb",
      "thumb": "miniaturas/rosto_fem_01_bravo_pacote.346de26d4eed.webp",
      "tris": 352,
      "face": {
        "set": "fem_01",
        "expression": "bravo"
      },
      "origin": {
        "blob": "ba7fa5cd86031d657b3b989150be6c7134bfb5d9",
        "thumbBlob": "e2445e398715ba8a97011867d38f2156e78f2265",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_01_chorando_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto feminino 01: chorando",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_01_chorando_pacote.fb62c88d9772.glb",
      "thumb": "miniaturas/rosto_fem_01_chorando_pacote.1852f12de7cd.webp",
      "tris": 540,
      "face": {
        "set": "fem_01",
        "expression": "chorando"
      },
      "origin": {
        "blob": "c0a548b121d9c5ed3eb6d1c9232eccc098dacbcf",
        "thumbBlob": "8acfe71f8fb0bf78ccf9e87d2d50bd1be01b34f9",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_01_compaixao": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Compaixão (feminino 01)",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_01_compaixao.62e2bdf439df.glb",
      "thumb": "miniaturas/rosto_fem_01_compaixao.16b9518146a2.webp",
      "tris": 452,
      "face": {
        "set": "fem_01",
        "expression": "compaixao"
      },
      "origin": {
        "blob": "9a02d1ab149583f57f00973a9fa8062f4a9eea30",
        "thumbBlob": "d137927e0ead6a913d25a81046722879edf51df1",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_01_confuso_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto feminino 01: confuso",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_01_confuso_pacote.1521ed272565.glb",
      "thumb": "miniaturas/rosto_fem_01_confuso_pacote.2807f3e3b9bd.webp",
      "tris": 472,
      "face": {
        "set": "fem_01",
        "expression": "confuso"
      },
      "origin": {
        "blob": "46b49868d42c99192db5aee2ee5eac037241c6d2",
        "thumbBlob": "9a406e36a75b124247132e8ae5561c830ac7e27a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_01_feliz_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto feminino 01: feliz",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_01_feliz_pacote.32bf51a23fec.glb",
      "thumb": "miniaturas/rosto_fem_01_feliz_pacote.85934b0761d0.webp",
      "tris": 576,
      "face": {
        "set": "fem_01",
        "expression": "feliz"
      },
      "origin": {
        "blob": "6541a468da2352d8090e9a20fc7b562ad3014f4a",
        "thumbBlob": "0b5bb8fe7de6f320738a94698930ae516ce2dc03",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_01_furia_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto feminino 01: fúria (dentes cerrados)",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_01_furia_pacote.76e76ea0a4ad.glb",
      "thumb": "miniaturas/rosto_fem_01_furia_pacote.c53502b2aff8.webp",
      "tris": 646,
      "face": {
        "set": "fem_01",
        "expression": "furia"
      },
      "origin": {
        "blob": "8bbf028c3b4744a255a3d31438f3c7a7f45792f8",
        "thumbBlob": "0e86831276a89a95220d17fb519051af0fe3b37f",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_01_gritando_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto feminino 01: gritando",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_01_gritando_pacote.b06bc273ae96.glb",
      "thumb": "miniaturas/rosto_fem_01_gritando_pacote.738da684e555.webp",
      "tris": 566,
      "face": {
        "set": "fem_01",
        "expression": "gritando"
      },
      "origin": {
        "blob": "a729df52fe8efafdf721abb4f19ee1edafbd186c",
        "thumbBlob": "2970911c58861fad2c572ecb8f37756f032bef1e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_01_impaciencia": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Impaciência (feminino 01)",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_01_impaciencia.0be9de971f20.glb",
      "thumb": "miniaturas/rosto_fem_01_impaciencia.552f3c62d828.webp",
      "tris": 352,
      "face": {
        "set": "fem_01",
        "expression": "impaciencia"
      },
      "origin": {
        "blob": "e32e74839ffc49f22fb137bc0695fd3a9ccc8c1d",
        "thumbBlob": "66719235d95e96c8f54c48759f42c6d7dccbc853",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_01_lingua_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto feminino 01: língua de fora",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_01_lingua_pacote.f0844e2ba028.glb",
      "thumb": "miniaturas/rosto_fem_01_lingua_pacote.2086fe8fd25c.webp",
      "tris": 512,
      "face": {
        "set": "fem_01",
        "expression": "lingua"
      },
      "origin": {
        "blob": "4404c313d877f20fb745997a72ad5f9a9436e192",
        "thumbBlob": "d847cf142d425a93dd6c01136e9c5e33c2c5cad6",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_01_malvado_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto feminino 01: malvado",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_01_malvado_pacote.581d441d9d4b.glb",
      "thumb": "miniaturas/rosto_fem_01_malvado_pacote.f5d8502ba149.webp",
      "tris": 352,
      "face": {
        "set": "fem_01",
        "expression": "malvado"
      },
      "origin": {
        "blob": "0e766a955ce4116a3ce70c0abbdf3dac9cb692c0",
        "thumbBlob": "738bda7c1b8bc026a63d933010dd40a84c1b3311",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_01_neutro_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto feminino 01: neutro",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_01_neutro_pacote.f098911154b4.glb",
      "thumb": "miniaturas/rosto_fem_01_neutro_pacote.ab896d1cff9f.webp",
      "tris": 352,
      "face": {
        "set": "fem_01",
        "expression": "neutro"
      },
      "origin": {
        "blob": "5599f8b2c7a95808b895dc0d3ac3ea794116339e",
        "thumbBlob": "daac824bbb801047e13d95e2185e995dec04a486",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_01_normal_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto feminino 01: normal",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_01_normal_pacote.8bf0d3e6be63.glb",
      "thumb": "miniaturas/rosto_fem_01_normal_pacote.2501d9a76e06.webp",
      "tris": 352,
      "face": {
        "set": "fem_01",
        "expression": "normal"
      },
      "origin": {
        "blob": "3ac0c40d5f8c9e1cb73d5e032eba7bfcdbf44f1d",
        "thumbBlob": "4ea722bd9ff8c63d4e0317c6ae08a7b3deb5bd69",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_01_surpreso_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto feminino 01: surpreso",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_01_surpreso_pacote.051340bdfb79.glb",
      "thumb": "miniaturas/rosto_fem_01_surpreso_pacote.b5179136392e.webp",
      "tris": 408,
      "face": {
        "set": "fem_01",
        "expression": "surpreso"
      },
      "origin": {
        "blob": "1054913630d723aca06b143f03ee49c825e3869f",
        "thumbBlob": "d91b83b62d990e6416d06f4ae4497c59e4f011f0",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_01_triste_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto feminino 01: triste",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_01_triste_pacote.01d159503d2e.glb",
      "thumb": "miniaturas/rosto_fem_01_triste_pacote.1450f41c4f80.webp",
      "tris": 704,
      "face": {
        "set": "fem_01",
        "expression": "triste"
      },
      "origin": {
        "blob": "ffb886503bfafe203d209fafcb9d6813ca609f53",
        "thumbBlob": "2726453850da17206a3c5af549a7157a2a9057b3",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_02_bravo_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto feminino 02: bravo",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_02_bravo_pacote.68d00ed8c447.glb",
      "thumb": "miniaturas/rosto_fem_02_bravo_pacote.b91ac7029c1f.webp",
      "tris": 532,
      "face": {
        "set": "fem_02",
        "expression": "bravo"
      },
      "origin": {
        "blob": "3e34272a9c3349e94f620c2ec2e21d95dfe23084",
        "thumbBlob": "45805f6b556655df89eb631579b944652efe43d4",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_02_feliz_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto feminino 02: feliz",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_02_feliz_pacote.33f142609562.glb",
      "thumb": "miniaturas/rosto_fem_02_feliz_pacote.b90dea7ceb36.webp",
      "tris": 568,
      "face": {
        "set": "fem_02",
        "expression": "feliz"
      },
      "origin": {
        "blob": "6707ad9f12582f5475dded4a721d068a3ec8fbd9",
        "thumbBlob": "cd3ff123ba2473e84d04cbf75c43cfdcb8b0077d",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_02_malvado_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto feminino 02: malvado",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_02_malvado_pacote.2cd1856fba8e.glb",
      "thumb": "miniaturas/rosto_fem_02_malvado_pacote.4ba21ae6569e.webp",
      "tris": 492,
      "face": {
        "set": "fem_02",
        "expression": "malvado"
      },
      "origin": {
        "blob": "9299d87fa3bcc3022b8291079147613e181310a3",
        "thumbBlob": "b059658a599dd57cfaf803d31a2ca99b46d41718",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_02_neutro_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto feminino 02: neutro",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_02_neutro_pacote.ee5d4ca09064.glb",
      "thumb": "miniaturas/rosto_fem_02_neutro_pacote.73dd2185fa46.webp",
      "tris": 452,
      "face": {
        "set": "fem_02",
        "expression": "neutro"
      },
      "origin": {
        "blob": "dd49319a6a064361a85a88bb873334dc8ab6213a",
        "thumbBlob": "ee04709034b30d0ca665116c3b817ef11d4016ff",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_02_normal_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto feminino 02: normal",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_02_normal_pacote.f62eb3b03d1a.glb",
      "thumb": "miniaturas/rosto_fem_02_normal_pacote.9c38d009530f.webp",
      "tris": 492,
      "face": {
        "set": "fem_02",
        "expression": "normal"
      },
      "origin": {
        "blob": "2fae7072102d7ca6ae810c151a86df6fb77cec3a",
        "thumbBlob": "1e855df8dec57b789a44f51bf2cf93c065cbaaa9",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_02_surpreso_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto feminino 02: surpreso",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_02_surpreso_pacote.1a450e6fe496.glb",
      "thumb": "miniaturas/rosto_fem_02_surpreso_pacote.9df6e607281a.webp",
      "tris": 524,
      "face": {
        "set": "fem_02",
        "expression": "surpreso"
      },
      "origin": {
        "blob": "09eab5e2eaeb639d4fe4ec941965054b3faad93b",
        "thumbBlob": "16a7ae5eaa40414926083371d059b412c223618f",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_fem_02_triste_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto feminino 02: triste",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_fem_02_triste_pacote.43ce2fb72e3e.glb",
      "thumb": "miniaturas/rosto_fem_02_triste_pacote.b098d79ea96c.webp",
      "tris": 544,
      "face": {
        "set": "fem_02",
        "expression": "triste"
      },
      "origin": {
        "blob": "89298ba85e0eded0c85c71e6743aab8ff4f4f6ea",
        "thumbBlob": "a421f9802c4d0acda9004161229952e477e74be5",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_01_apaixonado_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto masculino 01: apaixonado",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_01_apaixonado_pacote.85bd92e56058.glb",
      "thumb": "miniaturas/rosto_masc_01_apaixonado_pacote.a9c738d32f02.webp",
      "tris": 533,
      "face": {
        "set": "masc_01",
        "expression": "apaixonado"
      },
      "origin": {
        "blob": "f683693beccda22147e25eb250b0942d8ea774d2",
        "thumbBlob": "e2cbf052b7bb88c00f4681f8865a48b686218b03",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_01_atordoado": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Atordoado (masculino 01)",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_01_atordoado.19c9609ab6f5.glb",
      "thumb": "miniaturas/rosto_masc_01_atordoado.3cacd3e9e3b8.webp",
      "tris": 604,
      "face": {
        "set": "masc_01",
        "expression": "atordoado"
      },
      "origin": {
        "blob": "847b7f51326d689b7ff077f87325736556e058e8",
        "thumbBlob": "b95904af9c56fbb7ec9438d6cfc88e81c3d14252",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_01_bravo_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto masculino 01: bravo",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_01_bravo_pacote.4e09123c760c.glb",
      "thumb": "miniaturas/rosto_masc_01_bravo_pacote.b52c20256f79.webp",
      "tris": 476,
      "face": {
        "set": "masc_01",
        "expression": "bravo"
      },
      "origin": {
        "blob": "b73b94e125f984ff86669363eb212c7659bf3cca",
        "thumbBlob": "5cb4938aadc21a28ea704873b8d012f902bdd538",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_01_chorando_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto masculino 01: chorando",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_01_chorando_pacote.cc4b0a17c4c8.glb",
      "thumb": "miniaturas/rosto_masc_01_chorando_pacote.9eac090f4481.webp",
      "tris": 580,
      "face": {
        "set": "masc_01",
        "expression": "chorando"
      },
      "origin": {
        "blob": "763e540f7954a1cfd8a78855bd58f9e5194371b0",
        "thumbBlob": "fa3ecfe23416d4f13dff4fd7d73d6c06427f3bec",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_01_compaixao": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Compaixão (masculino 01)",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_01_compaixao.12fb8fef8a52.glb",
      "thumb": "miniaturas/rosto_masc_01_compaixao.6b87ba2aca05.webp",
      "tris": 348,
      "face": {
        "set": "masc_01",
        "expression": "compaixao"
      },
      "origin": {
        "blob": "2948cacb79ab5016ddd9a3ea4265256b25316917",
        "thumbBlob": "558f4b17adad2d03531afe8f263a545764c476cd",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_01_confuso_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto masculino 01: confuso",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_01_confuso_pacote.121e34a058be.glb",
      "thumb": "miniaturas/rosto_masc_01_confuso_pacote.09c0d4d21882.webp",
      "tris": 356,
      "face": {
        "set": "masc_01",
        "expression": "confuso"
      },
      "origin": {
        "blob": "4066038bc8b923b6bda96834e412b6433e6dccbc",
        "thumbBlob": "96458d23dc198bab5e44363cdb9f9117566dfef8",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_01_feliz_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto masculino 01: feliz",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_01_feliz_pacote.72e3b9ac21cf.glb",
      "thumb": "miniaturas/rosto_masc_01_feliz_pacote.5174188e010b.webp",
      "tris": 710,
      "face": {
        "set": "masc_01",
        "expression": "feliz"
      },
      "origin": {
        "blob": "50fe4203ba3468238471516f60a032e2d5520ec2",
        "thumbBlob": "5eb2630dbcb76cc979983bbd741604b164b7fd90",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_01_furia_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto masculino 01: fúria (dentes cerrados)",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_01_furia_pacote.a2c0b9cbace3.glb",
      "thumb": "miniaturas/rosto_masc_01_furia_pacote.767c4da488b1.webp",
      "tris": 698,
      "face": {
        "set": "masc_01",
        "expression": "furia"
      },
      "origin": {
        "blob": "6d91ce4fb8ed8798ba9a1ebaa55ae73f91c9ac7e",
        "thumbBlob": "37a695bf51d7d2a19a1e97ee22b348221eeeda1c",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_01_gritando_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto masculino 01: gritando",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_01_gritando_pacote.f486f7af9bc7.glb",
      "thumb": "miniaturas/rosto_masc_01_gritando_pacote.2aa29295aa95.webp",
      "tris": 566,
      "face": {
        "set": "masc_01",
        "expression": "gritando"
      },
      "origin": {
        "blob": "aaffe4881fe9449b7029e32c34e75d1c02cee70d",
        "thumbBlob": "3983753c78b6f8e71327d817e5bec9bbb30e642f",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_01_impaciencia": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Impaciência (masculino 01)",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_01_impaciencia.8f616b17df9e.glb",
      "thumb": "miniaturas/rosto_masc_01_impaciencia.b09c24cd2274.webp",
      "tris": 372,
      "face": {
        "set": "masc_01",
        "expression": "impaciencia"
      },
      "origin": {
        "blob": "f4c0aab24bce2daaccc59ef7e08541ddf8162496",
        "thumbBlob": "a9dc4ce70204b759d8d9e27de9b4e4680b15e982",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_01_lingua_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto masculino 01: língua de fora",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_01_lingua_pacote.693ae9e0eb3c.glb",
      "thumb": "miniaturas/rosto_masc_01_lingua_pacote.8f7b80db321c.webp",
      "tris": 408,
      "face": {
        "set": "masc_01",
        "expression": "lingua"
      },
      "origin": {
        "blob": "1010a424b093988b22d18890a1918516f5b4d0c6",
        "thumbBlob": "b0252d220584c8a14321c01f86d498b705d4b54b",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_01_malvado_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto masculino 01: malvado",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_01_malvado_pacote.f6e4a4002126.glb",
      "thumb": "miniaturas/rosto_masc_01_malvado_pacote.d4b0d3bc870d.webp",
      "tris": 348,
      "face": {
        "set": "masc_01",
        "expression": "malvado"
      },
      "origin": {
        "blob": "061dae7a8ad40898f6f31345eb6eb4df3b5ffafc",
        "thumbBlob": "d395e204fc89f5bfb4492648e6e802df010fb7a8",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_01_neutro_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto masculino 01: neutro",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_01_neutro_pacote.03bb0eb10599.glb",
      "thumb": "miniaturas/rosto_masc_01_neutro_pacote.7018e60f048d.webp",
      "tris": 352,
      "face": {
        "set": "masc_01",
        "expression": "neutro"
      },
      "origin": {
        "blob": "7762a6ef45b93c43d24df6f9edd1b2c745065df8",
        "thumbBlob": "3e6e429a5afe6105fea2edc9ecd7e071e1244fcc",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_01_normal_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto masculino 01: normal",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_01_normal_pacote.cddb20014f76.glb",
      "thumb": "miniaturas/rosto_masc_01_normal_pacote.f8b282e45ca7.webp",
      "tris": 348,
      "face": {
        "set": "masc_01",
        "expression": "normal"
      },
      "origin": {
        "blob": "bdc988b853c973382b8940cf0b168f577210a950",
        "thumbBlob": "c2804a6a7017d44c7b6b803bd5c02205af1200b5",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_01_surpreso_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto masculino 01: surpreso",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_01_surpreso_pacote.fd438a7ed15e.glb",
      "thumb": "miniaturas/rosto_masc_01_surpreso_pacote.415d834025df.webp",
      "tris": 508,
      "face": {
        "set": "masc_01",
        "expression": "surpreso"
      },
      "origin": {
        "blob": "a19cb29cb35e84e0e38d0825b08a52bfac142e80",
        "thumbBlob": "f386ddffb30e05d6281a8510b78b64b32e921a7c",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_01_triste_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto masculino 01: triste",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_01_triste_pacote.dd2c95b52eb5.glb",
      "thumb": "miniaturas/rosto_masc_01_triste_pacote.68050d91e509.webp",
      "tris": 348,
      "face": {
        "set": "masc_01",
        "expression": "triste"
      },
      "origin": {
        "blob": "a99e21a12f752b96b459cb77b0651677d494ab25",
        "thumbBlob": "bb738322cb0022b4515cc52008e9395768ff654c",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_02_bravo_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto masculino 02: bravo",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_02_bravo_pacote.a363b7c3ac15.glb",
      "thumb": "miniaturas/rosto_masc_02_bravo_pacote.bc08afe21f65.webp",
      "tris": 348,
      "face": {
        "set": "masc_02",
        "expression": "bravo"
      },
      "origin": {
        "blob": "e75e49de5db50e63ba3f024f74c45b04e8d59ee8",
        "thumbBlob": "50caa5bc5d6a8e2e0089766d614f2debcc464566",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_02_feliz_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto masculino 02: feliz",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_02_feliz_pacote.d045b0524d1b.glb",
      "thumb": "miniaturas/rosto_masc_02_feliz_pacote.57d14fbda936.webp",
      "tris": 344,
      "face": {
        "set": "masc_02",
        "expression": "feliz"
      },
      "origin": {
        "blob": "82b852759f3c01f28df8fb0e57f95a8fa09355ea",
        "thumbBlob": "6188dd33c8a176fc6892fa481bb6c78051452006",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_02_malvado_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto masculino 02: malvado",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_02_malvado_pacote.a6755b625a80.glb",
      "thumb": "miniaturas/rosto_masc_02_malvado_pacote.3d1af1d79568.webp",
      "tris": 476,
      "face": {
        "set": "masc_02",
        "expression": "malvado"
      },
      "origin": {
        "blob": "77c6269f4ad6b80858381941d7a32065f60c85bd",
        "thumbBlob": "16eebd22615dfda7e317c21c400497c46fbd0b88",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_02_neutro_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto masculino 02: neutro",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_02_neutro_pacote.c0bced5aab77.glb",
      "thumb": "miniaturas/rosto_masc_02_neutro_pacote.41a365e9d8d3.webp",
      "tris": 328,
      "face": {
        "set": "masc_02",
        "expression": "neutro"
      },
      "origin": {
        "blob": "61767c21436fb768b1e8f032d4203a2953ba8a1e",
        "thumbBlob": "062d49b1d7c8ca9103fd7c7dd4e500059f41c793",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_02_normal_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto masculino 02: normal",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_02_normal_pacote.bb37789070ee.glb",
      "thumb": "miniaturas/rosto_masc_02_normal_pacote.f8e7e7850b4e.webp",
      "tris": 336,
      "face": {
        "set": "masc_02",
        "expression": "normal"
      },
      "origin": {
        "blob": "36a41f7c85ff07910edab6d9a1a895bf77efd35b",
        "thumbBlob": "ed1d2519d72d41c76032e1eb3e349c54b3de8c5b",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_02_surpreso_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto masculino 02: surpreso",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_02_surpreso_pacote.69768b3c4ce7.glb",
      "thumb": "miniaturas/rosto_masc_02_surpreso_pacote.c028cce678bc.webp",
      "tris": 432,
      "face": {
        "set": "masc_02",
        "expression": "surpreso"
      },
      "origin": {
        "blob": "009c54476cc6d38dc313a5d0b772b5e5b2a06d7a",
        "thumbBlob": "e63addc1b58fbeb08ad5726fdad0e78e19ab1731",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "rosto_masc_02_triste_pacote": {
      "slot": "rosto",
      "group": "rosto",
      "label": "Rosto masculino 02: triste",
      "audience": "boy",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/rosto_masc_02_triste_pacote.f503010f8fb6.glb",
      "thumb": "miniaturas/rosto_masc_02_triste_pacote.5531e637d29e.webp",
      "tris": 472,
      "face": {
        "set": "masc_02",
        "expression": "triste"
      },
      "origin": {
        "blob": "cdd597d574ed18159964bf544ca08c13c4b85641",
        "thumbBlob": "e834e4de0c8a3936bd1f8245d63bea6e9d466f5d",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_camisa_amarela_aberta_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Camisa amarela aberta",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_camisa_amarela_aberta_pacote.b2daf088c2e3.glb",
      "thumb": "miniaturas/roupa_cima_camisa_amarela_aberta_pacote.8ddd50ad56d7.webp",
      "tris": 878,
      "origin": {
        "blob": "06de4ca874691d8f465ac8ca60f4f807e214f4a2",
        "thumbBlob": "af1a4fe711938c9e717d668a795366d405a06ba1",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_camisa_azul_aberta_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Camisa azul aberta",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_camisa_azul_aberta_pacote.98bcba4aff27.glb",
      "thumb": "miniaturas/roupa_cima_camisa_azul_aberta_pacote.527af1037928.webp",
      "tris": 768,
      "origin": {
        "blob": "6c96f65a8bb5360002cee5eae9f803ef38ef9bf8",
        "thumbBlob": "effad0efbc27623d994798cf7015acf41d55d365",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_camisa_azul_botao_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Camisa azul de botão",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_camisa_azul_botao_pacote.b4f726045491.glb",
      "thumb": "miniaturas/roupa_cima_camisa_azul_botao_pacote.ee23f1b9eaa1.webp",
      "tris": 1055,
      "origin": {
        "blob": "74a57c879d3ff20dce566264f37575cf360ca316",
        "thumbBlob": "dbe11dc1cd3eefd104e572aff605fc8191c72aee",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_camisa_azul_clara_botao_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Camisa azul-clara de botão",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_camisa_azul_clara_botao_pacote.ea6723c0690a.glb",
      "thumb": "miniaturas/roupa_cima_camisa_azul_clara_botao_pacote.86f5bb44663a.webp",
      "tris": 1055,
      "origin": {
        "blob": "ad6a9038adb99652f6b98308ed36a8e9382ce6df",
        "thumbBlob": "7936780e399f5a0e3fb9964b188f0344ca4ae59a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_camisa_azul_clara_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Camisa azul-clara",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/roupa_cima_camisa_azul_clara_pacote.dcad5de983a2.glb",
      "thumb": "miniaturas/roupa_cima_camisa_azul_clara_pacote.3e599ff00ae4.webp",
      "tris": 1376,
      "origin": {
        "blob": "998226643a2ef6b08c1c9d03680866ba139c8a00",
        "thumbBlob": "8e7c246c2906e415adae3db0eafb130a037f384f",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_camisa_cinza_botao_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Camisa cinza de botão",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_camisa_cinza_botao_pacote.31429eb3f92a.glb",
      "thumb": "miniaturas/roupa_cima_camisa_cinza_botao_pacote.bac0c28bfec7.webp",
      "tris": 1055,
      "origin": {
        "blob": "c54e099dcc8cedf3e8f22bd5f88d4d68ce40fee7",
        "thumbBlob": "7bd6ff3c96bac492f246068a2e25ea5c2ce19055",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_camisa_rosa_bolso_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Camisa rosa de bolso",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_camisa_rosa_bolso_pacote.bf76e74bc841.glb",
      "thumb": "miniaturas/roupa_cima_camisa_rosa_bolso_pacote.3f29a2025c3d.webp",
      "tris": 1055,
      "origin": {
        "blob": "72c7ae588f8ac375bb6b195ada1a737d4b812a27",
        "thumbBlob": "3ea640aef05ae3f6596e43f635642eca49cf446e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_camisa_roxa_aberta_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Camisa roxa aberta",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_camisa_roxa_aberta_pacote.212039f16e7a.glb",
      "thumb": "miniaturas/roupa_cima_camisa_roxa_aberta_pacote.4f595cdac7ec.webp",
      "tris": 878,
      "origin": {
        "blob": "ba2740180bcea2791d912a3a4623bd4fe510b1b9",
        "thumbBlob": "065ea3538f3b1257dcd2938231576c0cc5701eb5",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_camisa_verde_aberta_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Camisa verde aberta",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_camisa_verde_aberta_pacote.70ec4bd64be8.glb",
      "thumb": "miniaturas/roupa_cima_camisa_verde_aberta_pacote.218dbaefd7f5.webp",
      "tris": 1220,
      "origin": {
        "blob": "cea7416fbc1756e0e57dc937132f6516e89d3860",
        "thumbBlob": "494a1e23da894b755e41412eba80158f902f8af6",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_camiseta_amarela_gola_v_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Camiseta amarela gola V",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_camiseta_amarela_gola_v_pacote.f8aa5eb21ddc.glb",
      "thumb": "miniaturas/roupa_cima_camiseta_amarela_gola_v_pacote.9bfac34c1a28.webp",
      "tris": 724,
      "origin": {
        "blob": "79c83536c38c4f701d3bdd58f819e59dbfddfb8d",
        "thumbBlob": "1cf43ca92132ac097b1e77f6ac703cb3b265859d",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_camiseta_amarela_verde_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Camiseta amarela e verde",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_camiseta_amarela_verde_pacote.ed1e18c0eaa6.glb",
      "thumb": "miniaturas/roupa_cima_camiseta_amarela_verde_pacote.6f337b7d6880.webp",
      "tris": 784,
      "origin": {
        "blob": "eaff7c80964d18c89b393f6d267f23107cf73031",
        "thumbBlob": "9d1fd37687883b236a0b919aa7e2ef7042e1eac4",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_camiseta_azul_degrade_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Camiseta azul degradê",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_camiseta_azul_degrade_pacote.8a34714e5ee0.glb",
      "thumb": "miniaturas/roupa_cima_camiseta_azul_degrade_pacote.cc751e0d7063.webp",
      "tris": 560,
      "origin": {
        "blob": "ad3b367c44ace7a7ee77ce46ca16b585129cff7c",
        "thumbBlob": "c60f65b1d92ebd4b9de84a2d1c8a6091fe9008b7",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_camiseta_azul_petroleo_gola_v_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Camiseta azul-petróleo gola V",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_camiseta_azul_petroleo_gola_v_pacote.885358aaeaba.glb",
      "thumb": "miniaturas/roupa_cima_camiseta_azul_petroleo_gola_v_pacote.1e99c62fbec5.webp",
      "tris": 760,
      "origin": {
        "blob": "12fcea79a807f4df6c804389739d9ea2d5f0ddae",
        "thumbBlob": "f08a34199bb065485a4fee80d772fdcea3d2640d",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_camiseta_branca_gola_v_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Camiseta branca gola V",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_camiseta_branca_gola_v_pacote.75c85299ef30.glb",
      "thumb": "miniaturas/roupa_cima_camiseta_branca_gola_v_pacote.0ed4ddca09cf.webp",
      "tris": 760,
      "origin": {
        "blob": "98121881cff223f0bb79dcc70fbb262ee373e9fa",
        "thumbBlob": "e20a18364e30f1dba5b49270cd6a0e5744b8bd70",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_camiseta_branca_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Camiseta branca",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/roupa_cima_camiseta_branca_pacote.c7d7a6c96501.glb",
      "thumb": "miniaturas/roupa_cima_camiseta_branca_pacote.0bc38a7cdd46.webp",
      "tris": 566,
      "origin": {
        "blob": "870fbf49f9a135ac1e9186cfca3b3d3677077b20",
        "thumbBlob": "922d5be565d66905c5e90724c45714f1fd933956",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_camiseta_laranja_cinza_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Camiseta laranja e cinza",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_camiseta_laranja_cinza_pacote.4529c00dcc21.glb",
      "thumb": "miniaturas/roupa_cima_camiseta_laranja_cinza_pacote.60c5b5bab863.webp",
      "tris": 784,
      "origin": {
        "blob": "a7a67351d1b2934cfe225420e3fc70cb4e8fa974",
        "thumbBlob": "79fac5ae2449cb00f1feaf1803765b38c511a967",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_camiseta_ragla_cinza_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Camiseta raglã cinza",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_camiseta_ragla_cinza_pacote.7d2cd86896dc.glb",
      "thumb": "miniaturas/roupa_cima_camiseta_ragla_cinza_pacote.cae9f09fb9e2.webp",
      "tris": 560,
      "origin": {
        "blob": "7d32f2805dbe8375aded348e777f9ebd91885133",
        "thumbBlob": "c66472e27d358fb9a568242e53d7a437bfa4d214",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_camiseta_ragla_roxa_verde_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Camiseta raglã roxa e verde",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_camiseta_ragla_roxa_verde_pacote.c76418536530.glb",
      "thumb": "miniaturas/roupa_cima_camiseta_ragla_roxa_verde_pacote.983e92138dee.webp",
      "tris": 560,
      "origin": {
        "blob": "ed50b7c710830701124fd9608e4a0fec467944a8",
        "thumbBlob": "943cfde9b1921911bbd8ea0730c9d6a501523b6e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_camiseta_rosa_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Camiseta rosa",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/roupa_cima_camiseta_rosa_pacote.3547a0da23f4.glb",
      "thumb": "miniaturas/roupa_cima_camiseta_rosa_pacote.2d44cfd8e072.webp",
      "tris": 560,
      "origin": {
        "blob": "b795bef69a4276efadbab1b0894bb87ed78b060a",
        "thumbBlob": "206835fc11705df0d6d09a0b05cb7772e6e8f1d8",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_camiseta_roxa_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Camiseta roxa",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/roupa_cima_camiseta_roxa_pacote.82f844c5bd01.glb",
      "thumb": "miniaturas/roupa_cima_camiseta_roxa_pacote.a8b5340bd482.webp",
      "tris": 868,
      "origin": {
        "blob": "54e699e717fe69a7df943f61af29c8227a443546",
        "thumbBlob": "b6773c27eba1c3fca39f207f04cac0faa6fe9a62",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_camiseta_vermelha_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Camiseta vermelha",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/roupa_cima_camiseta_vermelha_pacote.9ac96869f074.glb",
      "thumb": "miniaturas/roupa_cima_camiseta_vermelha_pacote.2a2a5158b91c.webp",
      "tris": 868,
      "origin": {
        "blob": "4014223f6ee2ba38aeddcc1f78141203ba305f9e",
        "thumbBlob": "0c591ac5389c5a6d6bf2b26b7a663cbdbca8dd82",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_casaco_curto_vermelho_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Casaco curto vermelho",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_cima_casaco_curto_vermelho_pacote.d71df1120fa7.glb",
      "thumb": "miniaturas/roupa_cima_casaco_curto_vermelho_pacote.f7d035f016d6.webp",
      "tris": 797,
      "origin": {
        "blob": "b566ff4a628329aac73e850e1131b2a6fa53ceb1",
        "thumbBlob": "ca32acc55b3829c352ba8a51f01443225a820d8d",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_casaquinho_azul_curto_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Casaquinho azul curto",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_cima_casaquinho_azul_curto_pacote.0a2f4b239e41.glb",
      "thumb": "miniaturas/roupa_cima_casaquinho_azul_curto_pacote.fa7057a38874.webp",
      "tris": 1100,
      "origin": {
        "blob": "f8e9415f5ed3db34503a38d11b65170de97bb4dc",
        "thumbBlob": "0642119d4ace44b9f32e2ab8e77df0276144a17e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_colete_azul_petroleo_listrado_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Colete azul-petróleo listrado",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_colete_azul_petroleo_listrado_pacote.6b92807723d3.glb",
      "thumb": "miniaturas/roupa_cima_colete_azul_petroleo_listrado_pacote.7b58576c648b.webp",
      "tris": 1682,
      "origin": {
        "blob": "d209d33f95d009df94f528dc747339766428e563",
        "thumbBlob": "87c4bfeb63fff824b164dc3d2b21fa4c08e8bea3",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_colete_bolsos_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Colete de bolsos",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_colete_bolsos_pacote.176170e421a7.glb",
      "thumb": "miniaturas/roupa_cima_colete_bolsos_pacote.a1eb165d5780.webp",
      "tris": 1324,
      "origin": {
        "blob": "1e733011c0370758fbc4be79a366aceba06e62df",
        "thumbBlob": "2988ceca8461f3aefe3a4031b536674f6e9a746b",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_colete_cinza_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Colete cinza",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_colete_cinza_pacote.f5e28f5e8ef4.glb",
      "thumb": "miniaturas/roupa_cima_colete_cinza_pacote.71ef48e9407e.webp",
      "tris": 1381,
      "origin": {
        "blob": "a15afcd95f95bccfea549b535c585db51ecc0fd1",
        "thumbBlob": "e9a37f5afc5652f72c34ee11d2dd081d9afc50e0",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_colete_franjas": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Colete de franjas",
      "audience": "both",
      "tier": "festa",
      "price": 0,
      "file": "pecas/roupa_cima_colete_franjas.912cf0831894.glb",
      "thumb": "miniaturas/roupa_cima_colete_franjas.87689bfaebd3.webp",
      "tris": 1641,
      "festa": "junina",
      "origin": {
        "blob": "62dbfe7f0c0169adb24865406fb260f3962ce13b",
        "thumbBlob": "cd98384b3c480690f4a342cac05793422ee07118",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_jaqueta_amarela_gola_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Jaqueta amarela de gola",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_cima_jaqueta_amarela_gola_pacote.a152188649e4.glb",
      "thumb": "miniaturas/roupa_cima_jaqueta_amarela_gola_pacote.010aa7b41b4e.webp",
      "tris": 1094,
      "origin": {
        "blob": "9af2f21f15d3363e49a29dce5cfffab95a5b2301",
        "thumbBlob": "39931201d20046443c7935cce83cdad72d4930ae",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_jaqueta_azul_acolchoada_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Jaqueta azul acolchoada",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_cima_jaqueta_azul_acolchoada_pacote.764d7b898e7b.glb",
      "thumb": "miniaturas/roupa_cima_jaqueta_azul_acolchoada_pacote.aa386b44ff6c.webp",
      "tris": 1738,
      "origin": {
        "blob": "2f8ed62e7c2c4194dd2a3118ffb8c114d415f844",
        "thumbBlob": "751418a1813df9fd01b97e8074bceaa0c27ec421",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_jaqueta_bege_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Jaqueta bege",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_cima_jaqueta_bege_pacote.25f77a6bff06.glb",
      "thumb": "miniaturas/roupa_cima_jaqueta_bege_pacote.b5e5822cf418.webp",
      "tris": 1190,
      "origin": {
        "blob": "c8acb4ca2a784018377f0dde14255c5f65b5c270",
        "thumbBlob": "b57fcd967e9e36e20a099e2f668716a41652411b",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_jaqueta_cinza_aberta_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Jaqueta cinza aberta",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_cima_jaqueta_cinza_aberta_pacote.4bce39efbd5a.glb",
      "thumb": "miniaturas/roupa_cima_jaqueta_cinza_aberta_pacote.d1fa880f6eaa.webp",
      "tris": 980,
      "origin": {
        "blob": "87165dd5a0d526d37f5b203b629a10d878ee16a2",
        "thumbBlob": "5140e9fee0033d500f9c93b76123a1a68fb114de",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_jaqueta_cinza_curta_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Jaqueta cinza curta",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_cima_jaqueta_cinza_curta_pacote.3ee333972ae1.glb",
      "thumb": "miniaturas/roupa_cima_jaqueta_cinza_curta_pacote.9cd38ac5082e.webp",
      "tris": 1064,
      "origin": {
        "blob": "9a949e3a93b77fc94710772e9753c7b8a00b2466",
        "thumbBlob": "6317a198380b725cc99f342aa381ed51e4996ae9",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_jaqueta_couro_marrom_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Jaqueta de couro marrom",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_cima_jaqueta_couro_marrom_pacote.5770eed7ccbb.glb",
      "thumb": "miniaturas/roupa_cima_jaqueta_couro_marrom_pacote.1c9848aeefa9.webp",
      "tris": 982,
      "origin": {
        "blob": "838d169051bc891a0caae890adeea3834902bb2a",
        "thumbBlob": "8fa404efa4cc393b1393cb42124fcc752cfafd32",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_jaqueta_couro_tachas_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Jaqueta de couro com tachas",
      "audience": "both",
      "tier": "coins",
      "price": 110,
      "band": "raro",
      "review": true,
      "file": "pecas/roupa_cima_jaqueta_couro_tachas_pacote.dacc8b333b0b.glb",
      "thumb": "miniaturas/roupa_cima_jaqueta_couro_tachas_pacote.a947cd55a293.webp",
      "tris": 1731,
      "origin": {
        "blob": "080b5deb8a03cee1b50e8f3eeab9ec196c5fa65c",
        "thumbBlob": "b183f07324d43afc2fa50a6946fb675dd7452b3d",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_jaqueta_curta_amarela_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Jaqueta curta amarela",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_cima_jaqueta_curta_amarela_pacote.eb662ecb9a6f.glb",
      "thumb": "miniaturas/roupa_cima_jaqueta_curta_amarela_pacote.2c9e6d4484f6.webp",
      "tris": 746,
      "origin": {
        "blob": "830d990975b5db5749cf856d5afeb66d1684eaeb",
        "thumbBlob": "c9c471bc86d764a43ecfd98e488e01e680f8edb7",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_jaqueta_esportiva_amarela_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Jaqueta esportiva amarela",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_cima_jaqueta_esportiva_amarela_pacote.d3af1a5a48d9.glb",
      "thumb": "miniaturas/roupa_cima_jaqueta_esportiva_amarela_pacote.03c88f10dd3b.webp",
      "tris": 1462,
      "origin": {
        "blob": "818f965f8ea999ba345bffb11cd3beab3145069f",
        "thumbBlob": "c949115d2e8a905795aab18ad316315c3062a72f",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_jaqueta_laranja_acolchoada_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Jaqueta laranja acolchoada",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_cima_jaqueta_laranja_acolchoada_pacote.191ec7900b12.glb",
      "thumb": "miniaturas/roupa_cima_jaqueta_laranja_acolchoada_pacote.92d1fa2ff657.webp",
      "tris": 1574,
      "origin": {
        "blob": "2dfabbc41711031518623d258462107cf17e179d",
        "thumbBlob": "ed8b04193679323abde71256e0e972143d129218",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_jaqueta_rosa_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Jaqueta rosa",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_cima_jaqueta_rosa_pacote.9154689d39cc.glb",
      "thumb": "miniaturas/roupa_cima_jaqueta_rosa_pacote.5edd0a4cd5b3.webp",
      "tris": 1196,
      "origin": {
        "blob": "92387a2afcebfaa6444256c171835463e42457e6",
        "thumbBlob": "ada68a3b37b60a246db2d554626c129b9e89bab3",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_jaqueta_rosa_um_ombro_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Jaqueta rosa de um ombro",
      "audience": "both",
      "tier": "coins",
      "price": 110,
      "band": "raro",
      "review": true,
      "file": "pecas/roupa_cima_jaqueta_rosa_um_ombro_pacote.bc58fb7b9726.glb",
      "thumb": "miniaturas/roupa_cima_jaqueta_rosa_um_ombro_pacote.ae25f16a0edd.webp",
      "tris": 953,
      "origin": {
        "blob": "f60639ab5c43578d0951ca71ca9993b51331b668",
        "thumbBlob": "7a0237a5ba83b2772aaa50aa93f7c8640ddbb50c",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_jaqueta_rosa_ziper_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Jaqueta rosa de zíper",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_cima_jaqueta_rosa_ziper_pacote.248003299295.glb",
      "thumb": "miniaturas/roupa_cima_jaqueta_rosa_ziper_pacote.09453790d88b.webp",
      "tris": 1574,
      "origin": {
        "blob": "c657ca40019ddadb03495c54b8107f460839424f",
        "thumbBlob": "33182c0663177d7e2685aecac55431a44a3cb00a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_jaqueta_roxa_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Jaqueta roxa",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_cima_jaqueta_roxa_pacote.847041a8d48f.glb",
      "thumb": "miniaturas/roupa_cima_jaqueta_roxa_pacote.d024340cec3b.webp",
      "tris": 910,
      "origin": {
        "blob": "18c262d6c07ffd2a7f36cb9aa1a6fe5240ca27ad",
        "thumbBlob": "61a6a5794f1636175c62777510870019a04d6947",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_jaqueta_universitaria_vermelha_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Jaqueta universitária vermelha",
      "audience": "both",
      "tier": "coins",
      "price": 110,
      "band": "raro",
      "review": true,
      "file": "pecas/roupa_cima_jaqueta_universitaria_vermelha_pacote.13901771ec6b.glb",
      "thumb": "miniaturas/roupa_cima_jaqueta_universitaria_vermelha_pacote.2caf39298010.webp",
      "tris": 1392,
      "origin": {
        "blob": "f144d6b487e073db1432cd2d65c095024a6e373e",
        "thumbBlob": "89e5f7e620b9e46e845cf0288b76aba662a822f8",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_jaqueta_verde_cinto_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Jaqueta verde de cinto",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_cima_jaqueta_verde_cinto_pacote.141de7501a88.glb",
      "thumb": "miniaturas/roupa_cima_jaqueta_verde_cinto_pacote.0364296f95d0.webp",
      "tris": 1684,
      "origin": {
        "blob": "7ebe63d5437973c07d4c68b9d5973ce07f5f2cc7",
        "thumbBlob": "8883b3721a25b407f4810b1756d208d00312beee",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_jaqueta_vermelha_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Jaqueta vermelha",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_cima_jaqueta_vermelha_pacote.a119895cdfb4.glb",
      "thumb": "miniaturas/roupa_cima_jaqueta_vermelha_pacote.78f97e68160c.webp",
      "tris": 1120,
      "origin": {
        "blob": "64102269f6f1e62ef982b88decca61eba9e0e325",
        "thumbBlob": "686a5d93b84e590904ceeba1945c5c6f685b5f88",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_jaqueta_vermelha_ziper_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Jaqueta vermelha de zíper",
      "audience": "both",
      "tier": "coins",
      "price": 90,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_cima_jaqueta_vermelha_ziper_pacote.788909fd9ecb.glb",
      "thumb": "miniaturas/roupa_cima_jaqueta_vermelha_ziper_pacote.ea8ea128b84c.webp",
      "tris": 1354,
      "origin": {
        "blob": "85830275e0a9d496cab3db57f2fe8790eb2a7cc4",
        "thumbBlob": "5dc0c8def7b42b86d769695d8426a98776d228da",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_maio_vermelho_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Maiô vermelho",
      "audience": "girl",
      "tier": "coins",
      "price": 110,
      "band": "raro",
      "review": true,
      "file": "pecas/roupa_cima_maio_vermelho_pacote.c12336d34e57.glb",
      "thumb": "miniaturas/roupa_cima_maio_vermelho_pacote.e01d5a5b5108.webp",
      "tris": 524,
      "origin": {
        "blob": "eba4d2d509393491346ffdf1ef1d2a205dbed680",
        "thumbBlob": "453af59ab785dc566d62f6e862cd6fba7ed33b12",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_moletom_cinza_capuz_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Moletom cinza com capuz",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_moletom_cinza_capuz_pacote.7ad5b407fd54.glb",
      "thumb": "miniaturas/roupa_cima_moletom_cinza_capuz_pacote.a61b18304c35.webp",
      "tris": 1846,
      "origin": {
        "blob": "3c566218e71b22433cefc31d37bd1a9fb3b27125",
        "thumbBlob": "1fda45fbefbd2899faa83baed1e78e4131263058",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_moletom_cinza_escuro_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Moletom cinza-escuro",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_moletom_cinza_escuro_pacote.fadcaeec756f.glb",
      "thumb": "miniaturas/roupa_cima_moletom_cinza_escuro_pacote.dfb06f6a57a3.webp",
      "tris": 1008,
      "origin": {
        "blob": "a5c64cab6d5d3bdf359cfa4a503c2a72e372883f",
        "thumbBlob": "f4d6c1400460643b65341790702e2f1f7fdd59e7",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_moletom_laranja_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Moletom laranja",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_moletom_laranja_pacote.c5ce966cb390.glb",
      "thumb": "miniaturas/roupa_cima_moletom_laranja_pacote.7ef2bca62e64.webp",
      "tris": 1260,
      "origin": {
        "blob": "981de2ebf580725a5a1d5fbe4b9059f868049c73",
        "thumbBlob": "9c075deb805598b1289a30d14de521f822f245ac",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_polo_amarela_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Polo amarela",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_polo_amarela_pacote.846b3c21e7dc.glb",
      "thumb": "miniaturas/roupa_cima_polo_amarela_pacote.99d52ad0ce68.webp",
      "tris": 1008,
      "origin": {
        "blob": "242a610b318a7f68ae42eb007c06efaa4ff3da6c",
        "thumbBlob": "0074109228231157c20206118ddf1fe69fd2bf54",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_polo_verde_listrada_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Polo verde listrada",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_polo_verde_listrada_pacote.091f4db3e0e8.glb",
      "thumb": "miniaturas/roupa_cima_polo_verde_listrada_pacote.0310f1bcfa81.webp",
      "tris": 1008,
      "origin": {
        "blob": "47806942d1fbed9f6618ab7fbab405483cc4a749",
        "thumbBlob": "90a70d4033284d938178203e0afeacea9d16a989",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_rascunho_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Rascunho de blusa de uma manga (só no .blend)",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_rascunho_pacote.dd6afbed26d6.glb",
      "thumb": "miniaturas/roupa_cima_rascunho_pacote.d3d969951336.webp",
      "tris": 984,
      "hidden": true,
      "origin": {
        "blob": "13842241c3d4a5e43b6779b5152bd2e33fbd5566",
        "thumbBlob": "d41f60689239bbf3b364bc98f65e2a9293b0a26e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_regata_branca_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Regata branca",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/roupa_cima_regata_branca_pacote.3f9e685f6472.glb",
      "thumb": "miniaturas/roupa_cima_regata_branca_pacote.54ee57437296.webp",
      "tris": 452,
      "origin": {
        "blob": "2679dafa4fce23045c9428857e8c9e9c96bd67fe",
        "thumbBlob": "80d8cf3aa0f8d9d3fc23064519da1c34b9c90fe2",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_regata_creme_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Regata creme",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_regata_creme_pacote.da518baac070.glb",
      "thumb": "miniaturas/roupa_cima_regata_creme_pacote.2cb4a50a6323.webp",
      "tris": 506,
      "origin": {
        "blob": "7b157b0c8538f2cdcd500d97069fd90881fb2b43",
        "thumbBlob": "4fa3ad07219fa6223f4afb205184d0fc203dea22",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_regata_lilas_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Regata lilás",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_regata_lilas_pacote.932dadefbb98.glb",
      "thumb": "miniaturas/roupa_cima_regata_lilas_pacote.a52b5f0f60f8.webp",
      "tris": 454,
      "origin": {
        "blob": "1c7d2ea5011a23fa04936b14f192ed9b94b0907d",
        "thumbBlob": "23e59a73fa6251119aac79e391ea7e675544d60b",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_regata_verde_oliva_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Regata verde-oliva",
      "audience": "both",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_regata_verde_oliva_pacote.0977e4dff005.glb",
      "thumb": "miniaturas/roupa_cima_regata_verde_oliva_pacote.f804c5b94845.webp",
      "tris": 506,
      "origin": {
        "blob": "c322543cb0477afdbca53047f3ded18cafc9fe8d",
        "thumbBlob": "f745b283de451d915018de60fc0c4a63adaf65d3",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_sueter_estrela": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Suéter de estrela",
      "audience": "both",
      "tier": "festa",
      "price": 0,
      "file": "pecas/roupa_cima_sueter_estrela.50db4d8981a3.glb",
      "thumb": "miniaturas/roupa_cima_sueter_estrela.d8f7edec5277.webp",
      "tris": 1599,
      "origin": {
        "blob": "79f91844cc83ea0220a57a3ecd4f5b22304aed77",
        "thumbBlob": "442a13c2157bf4e95b8ca1976606fc0c33891187",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_sueter_listrado_vermelho_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Suéter listrado vermelho",
      "audience": "both",
      "tier": "coins",
      "price": 70,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_sueter_listrado_vermelho_pacote.4b3eb332894f.glb",
      "thumb": "miniaturas/roupa_cima_sueter_listrado_vermelho_pacote.3087ade5e502.webp",
      "tris": 1349,
      "origin": {
        "blob": "fc666caa277d3beb13bb967126e268d9563a2cb0",
        "thumbBlob": "6ad131c7251bdcb6ae4ac35ca9ffd44ac77afbea",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_cima_top_rosa_pacote": {
      "slot": "roupa_cima",
      "group": "roupa_cima",
      "label": "Top rosa",
      "audience": "girl",
      "tier": "coins",
      "price": 50,
      "band": "comum",
      "review": true,
      "file": "pecas/roupa_cima_top_rosa_pacote.d90ba6b4421f.glb",
      "thumb": "miniaturas/roupa_cima_top_rosa_pacote.2d38083b3f99.webp",
      "tris": 386,
      "origin": {
        "blob": "153471e11d739e490d10b9722a21c151d3c4cd4f",
        "thumbBlob": "d090151e59343e7ab073f1ef1c9ff33003470706",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_inteira_camisa_branca_saia_escura_pacote": {
      "slot": "roupa_inteira",
      "group": "roupa_inteira",
      "label": "Camisa branca e saia escura",
      "audience": "girl",
      "tier": "coins",
      "price": 110,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_inteira_camisa_branca_saia_escura_pacote.c6fa10fb4c7a.glb",
      "thumb": "miniaturas/roupa_inteira_camisa_branca_saia_escura_pacote.a14726d1bb1a.webp",
      "tris": 1470,
      "origin": {
        "blob": "ae992d13f4e48b044e03471c2c8908a9124f706f",
        "thumbBlob": "213cd2841af150ea22fa6f41b5e354a644aa7e49",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_inteira_camiseta_branca_saia_vermelha_pacote": {
      "slot": "roupa_inteira",
      "group": "roupa_inteira",
      "label": "Camiseta branca e saia vermelha",
      "audience": "girl",
      "tier": "coins",
      "price": 110,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_inteira_camiseta_branca_saia_vermelha_pacote.dfb77e6e6bb9.glb",
      "thumb": "miniaturas/roupa_inteira_camiseta_branca_saia_vermelha_pacote.37d2666ddf73.webp",
      "tris": 720,
      "origin": {
        "blob": "0678ccc8d1d22ccdde50f82c7e5fcdc2cb14399b",
        "thumbBlob": "39a553b7d7de9ecee7008604eb24ab3edd120cfa",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_inteira_jaqueta_amarela_saia_escura_pacote": {
      "slot": "roupa_inteira",
      "group": "roupa_inteira",
      "label": "Jaqueta amarela e saia escura",
      "audience": "girl",
      "tier": "coins",
      "price": 110,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_inteira_jaqueta_amarela_saia_escura_pacote.c89b39cd2ad8.glb",
      "thumb": "miniaturas/roupa_inteira_jaqueta_amarela_saia_escura_pacote.bebfe9224d12.webp",
      "tris": 1198,
      "origin": {
        "blob": "b9aef179cd280d1570cda7d34defa92469063049",
        "thumbBlob": "c746f4f22cd0bdfcbe49f445840b69ba103cc4ab",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_inteira_jaqueta_verde_calca_cinza_pacote": {
      "slot": "roupa_inteira",
      "group": "roupa_inteira",
      "label": "Jaqueta verde e calça cinza",
      "audience": "both",
      "tier": "coins",
      "price": 110,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_inteira_jaqueta_verde_calca_cinza_pacote.cd7711085833.glb",
      "thumb": "miniaturas/roupa_inteira_jaqueta_verde_calca_cinza_pacote.a4cf30cb6efb.webp",
      "tris": 1632,
      "origin": {
        "blob": "b3ff3be0a687e21bb07eaad890777dce8e3a71a1",
        "thumbBlob": "129c1882369722de0ad1d69cdfed4eb28194399f",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_inteira_jardineira_azul_pacote": {
      "slot": "roupa_inteira",
      "group": "roupa_inteira",
      "label": "Jardineira azul",
      "audience": "both",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/roupa_inteira_jardineira_azul_pacote.2f376983936e.glb",
      "thumb": "miniaturas/roupa_inteira_jardineira_azul_pacote.aaf8e27c95a1.webp",
      "tris": 1480,
      "origin": {
        "blob": "4de0640d0101e121edd6b77840b15fa347d1e623",
        "thumbBlob": "2311b40a03394517819846eca15f340686d06e83",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_inteira_macacao_piloto_azul_pacote": {
      "slot": "roupa_inteira",
      "group": "roupa_inteira",
      "label": "Macacão de piloto azul",
      "audience": "both",
      "tier": "coins",
      "price": 110,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_inteira_macacao_piloto_azul_pacote.0ec87bf6ac95.glb",
      "thumb": "miniaturas/roupa_inteira_macacao_piloto_azul_pacote.19e7f46291c2.webp",
      "tris": 2202,
      "origin": {
        "blob": "4be0d017d8c17a4bf67ba4ccfd07516145cd984c",
        "thumbBlob": "f7301850ee85de60a461326afbf7d49d3ff5c946",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_inteira_vestido_azul_pacote": {
      "slot": "roupa_inteira",
      "group": "roupa_inteira",
      "label": "Vestido azul",
      "audience": "girl",
      "tier": "free",
      "price": 0,
      "review": true,
      "file": "pecas/roupa_inteira_vestido_azul_pacote.ebfff6217fe8.glb",
      "thumb": "miniaturas/roupa_inteira_vestido_azul_pacote.614ec04e4de2.webp",
      "tris": 1172,
      "origin": {
        "blob": "f85f06ced63da57f2467420c160e882ab36b003a",
        "thumbBlob": "617c248e9133cd89c351a3b8e5b67268a2ed738e",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_inteira_vestido_azul_petroleo_pacote": {
      "slot": "roupa_inteira",
      "group": "roupa_inteira",
      "label": "Vestido azul-petróleo",
      "audience": "girl",
      "tier": "coins",
      "price": 110,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_inteira_vestido_azul_petroleo_pacote.0e72c89654b1.glb",
      "thumb": "miniaturas/roupa_inteira_vestido_azul_petroleo_pacote.b7df5a052685.webp",
      "tris": 1116,
      "origin": {
        "blob": "193e6ead75fd43c3fbdf85b9b1b1b881f80bc83d",
        "thumbBlob": "57f5cb563d650f243778bc24ab4135fc0991755f",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_inteira_vestido_chita": {
      "slot": "roupa_inteira",
      "group": "roupa_inteira",
      "label": "Vestido de chita",
      "audience": "girl",
      "tier": "festa",
      "price": 0,
      "file": "pecas/roupa_inteira_vestido_chita.04e7f8acca19.glb",
      "thumb": "miniaturas/roupa_inteira_vestido_chita.676cc61dcead.webp",
      "tris": 1120,
      "festa": "junina",
      "origin": {
        "blob": "c499d85a3df23a5a43e95d6bdae2986c78ff63fd",
        "thumbBlob": "8cb97cf4fda0e436d648b9c98ab5f6a4e465e58a",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_inteira_vestido_longo": {
      "slot": "roupa_inteira",
      "group": "roupa_inteira",
      "label": "Vestido longo listrado",
      "audience": "girl",
      "tier": "coins",
      "price": 110,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_inteira_vestido_longo.5dc641e02e00.glb",
      "thumb": "miniaturas/roupa_inteira_vestido_longo.e325c03366e3.webp",
      "tris": 832,
      "origin": {
        "blob": "93169db130d341eca82dd3a2e657602fcd218902",
        "thumbBlob": "74348ed442a99fba79f889d3dc0b1e402c8c892d",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    },
    "roupa_inteira_vestido_marrom_pacote": {
      "slot": "roupa_inteira",
      "group": "roupa_inteira",
      "label": "Vestido marrom",
      "audience": "girl",
      "tier": "coins",
      "price": 110,
      "band": "especial",
      "review": true,
      "file": "pecas/roupa_inteira_vestido_marrom_pacote.1a65e5177aa1.glb",
      "thumb": "miniaturas/roupa_inteira_vestido_marrom_pacote.6427a68a6845.webp",
      "tris": 640,
      "origin": {
        "blob": "ac1c832b38adc3ad8dd24b53973a431628af53ad",
        "thumbBlob": "7d9ce53d3f34cc99ec1c3c6b1bca435a3a8379f6",
        "commit": "ea069b31b04d8152168090c47d8c9a718269fb25",
        "migratedAt": "2026-11-13"
      }
    }
  },
  "sets": {
    "fantasia_abelha": {
      "label": "Abelha",
      "parts": [
        {
          "slot": "fantasia",
          "part": "fantasia_abelha_blusa_listrada_pacote"
        },
        {
          "slot": "chapeu",
          "part": "fantasia_abelha_cabeca_antenas_pacote"
        },
        {
          "slot": "calca",
          "part": "fantasia_abelha_calca_pacote"
        },
        {
          "slot": "roupa_inteira",
          "part": "fantasia_abelha_asas_pacote"
        }
      ],
      "tier": "coins",
      "price": 250,
      "review": true
    },
    "fantasia_astronauta": {
      "label": "Astronauta",
      "parts": [
        {
          "slot": "fantasia",
          "part": "fantasia_astronauta_traje_pacote"
        },
        {
          "slot": "chapeu",
          "part": "fantasia_astronauta_capacete_pacote"
        },
        {
          "slot": "luvas",
          "part": "fantasia_astronauta_luvas_pacote"
        },
        {
          "slot": "calca",
          "part": "fantasia_astronauta_calca_pacote"
        },
        {
          "slot": "calcado",
          "part": "fantasia_astronauta_botas_pacote"
        }
      ],
      "tier": "coins",
      "price": 300,
      "review": true
    },
    "fantasia_bobo_corte": {
      "label": "Bobo da corte",
      "parts": [
        {
          "slot": "fantasia",
          "part": "fantasia_bobo_corte_macacao_pacote"
        },
        {
          "slot": "chapeu",
          "part": "fantasia_bobo_corte_chapeu_guizos_pacote"
        }
      ],
      "tier": "coins",
      "price": 200,
      "review": true
    },
    "fantasia_cavaleiro": {
      "label": "Cavaleiro",
      "parts": [
        {
          "slot": "fantasia",
          "part": "fantasia_cavaleiro_peitoral_pacote"
        },
        {
          "slot": "chapeu",
          "part": "fantasia_cavaleiro_elmo_chifres_pacote"
        },
        {
          "slot": "roupa_cima",
          "part": "fantasia_cavaleiro_ombreiras_pacote"
        },
        {
          "slot": "luvas",
          "part": "fantasia_cavaleiro_bracadeiras_pacote"
        },
        {
          "slot": "calcado",
          "part": "fantasia_cavaleiro_botas_pacote"
        }
      ],
      "tier": "coins",
      "price": 300,
      "review": true
    },
    "fantasia_coelho_roxo": {
      "label": "Coelho roxo",
      "parts": [
        {
          "slot": "fantasia",
          "part": "fantasia_coelho_roxo_macacao_pacote"
        },
        {
          "slot": "chapeu",
          "part": "fantasia_coelho_roxo_capuz_coelho_pacote"
        },
        {
          "slot": "calcado",
          "part": "fantasia_coelho_roxo_botas_pacote"
        }
      ],
      "tier": "coins",
      "price": 250,
      "review": true
    },
    "fantasia_dinossauro_listrado": {
      "label": "Dinossauro listrado",
      "parts": [
        {
          "slot": "fantasia",
          "part": "fantasia_dinossauro_listrado_macacao_pacote"
        },
        {
          "slot": "chapeu",
          "part": "fantasia_dinossauro_listrado_cabeca_pacote"
        },
        {
          "slot": "roupa_cima",
          "part": "fantasia_dinossauro_listrado_laco_rosa_pacote"
        }
      ],
      "tier": "coins",
      "price": 250,
      "review": true
    },
    "fantasia_papai_noel": {
      "label": "Papai Noel",
      "parts": [
        {
          "slot": "fantasia",
          "part": "fantasia_papai_noel_casaco_pacote"
        },
        {
          "slot": "chapeu",
          "part": "fantasia_papai_noel_gorro_pacote"
        },
        {
          "slot": "luvas",
          "part": "fantasia_papai_noel_luvas_pacote"
        },
        {
          "slot": "calca",
          "part": "fantasia_papai_noel_calca_pacote"
        },
        {
          "slot": "calcado",
          "part": "fantasia_papai_noel_botas_pacote"
        }
      ],
      "tier": "coins",
      "price": 300,
      "review": true
    },
    "fantasia_pinguim": {
      "label": "Pinguim",
      "parts": [
        {
          "slot": "fantasia",
          "part": "fantasia_pinguim_macacao_pes_pacote"
        },
        {
          "slot": "chapeu",
          "part": "fantasia_pinguim_cabeca_pacote"
        }
      ],
      "tier": "coins",
      "price": 200,
      "review": true
    },
    "fantasia_pirata": {
      "label": "Pirata",
      "parts": [
        {
          "slot": "fantasia",
          "part": "fantasia_pirata_casaco_pacote"
        },
        {
          "slot": "chapeu",
          "part": "fantasia_pirata_chapeu_pirata_pacote"
        },
        {
          "slot": "calca",
          "part": "fantasia_pirata_calca_botas_pacote"
        }
      ],
      "tier": "coins",
      "price": 250,
      "review": true
    },
    "fantasia_pombo": {
      "label": "Pombo",
      "parts": [
        {
          "slot": "fantasia",
          "part": "fantasia_pombo_macacao_pes_pacote"
        },
        {
          "slot": "chapeu",
          "part": "fantasia_pombo_cabeca_pacote"
        }
      ],
      "tier": "coins",
      "price": 200,
      "review": true
    },
    "fantasia_robo_amarelo": {
      "label": "Robô amarelo",
      "parts": [
        {
          "slot": "fantasia",
          "part": "fantasia_robo_amarelo_macacao_pacote"
        },
        {
          "slot": "chapeu",
          "part": "fantasia_robo_amarelo_cabeca_robo_pacote"
        },
        {
          "slot": "luvas",
          "part": "fantasia_robo_amarelo_luvas_pacote"
        },
        {
          "slot": "calcado",
          "part": "fantasia_robo_amarelo_botas_pacote"
        }
      ],
      "tier": "coins",
      "price": 250,
      "review": true
    },
    "fantasia_soldado": {
      "label": "Soldado",
      "parts": [
        {
          "slot": "fantasia",
          "part": "fantasia_soldado_camisa_pacote"
        },
        {
          "slot": "chapeu",
          "part": "fantasia_soldado_capacete_pacote"
        },
        {
          "slot": "roupa_cima",
          "part": "fantasia_soldado_bolsas_colete_pacote"
        },
        {
          "slot": "luvas",
          "part": "fantasia_soldado_luvas_pacote"
        },
        {
          "slot": "calca",
          "part": "fantasia_soldado_calca_pacote"
        },
        {
          "slot": "calcado",
          "part": "fantasia_soldado_botas_pacote"
        }
      ],
      "tier": "coins",
      "price": 300,
      "review": true
    },
    "fantasia_super_heroi": {
      "label": "Super-herói",
      "parts": [
        {
          "slot": "fantasia",
          "part": "fantasia_super_heroi_macacao_pacote"
        },
        {
          "slot": "chapeu",
          "part": "fantasia_super_heroi_mascara_capacete_pacote"
        },
        {
          "slot": "luvas",
          "part": "fantasia_super_heroi_luvas_pacote"
        },
        {
          "slot": "calcado",
          "part": "fantasia_super_heroi_botas_pacote"
        }
      ],
      "tier": "coins",
      "price": 250,
      "review": true
    },
    "fantasia_traje_neon": {
      "label": "Traje neon",
      "parts": [
        {
          "slot": "fantasia",
          "part": "fantasia_traje_neon_macacao_pacote"
        },
        {
          "slot": "chapeu",
          "part": "fantasia_traje_neon_capacete_pacote"
        },
        {
          "slot": "luvas",
          "part": "fantasia_traje_neon_luvas_pacote"
        }
      ],
      "tier": "coins",
      "price": 250,
      "review": true
    }
  },
  "rules": {
    "slots": [
      {
        "id": "corpo",
        "label": "Corpo",
        "required": true,
        "groups": [
          "corpo"
        ]
      },
      {
        "id": "rosto",
        "label": "Rosto",
        "required": true,
        "groups": [
          "rosto"
        ]
      },
      {
        "id": "fantasia",
        "label": "Fantasia",
        "required": false,
        "groups": [
          "fantasia"
        ]
      },
      {
        "id": "chapeu",
        "label": "Chapéu",
        "required": false,
        "groups": [
          "chapeu",
          "capuz",
          "chapeu_sobre_cabelo"
        ]
      },
      {
        "id": "cabelo",
        "label": "Cabelo",
        "required": false,
        "groups": [
          "cabelo",
          "cabelo_sob_chapeu"
        ]
      },
      {
        "id": "orelhas",
        "label": "Orelhas",
        "required": false,
        "groups": [
          "orelhas"
        ]
      },
      {
        "id": "oculos",
        "label": "Óculos",
        "required": false,
        "groups": [
          "oculos"
        ]
      },
      {
        "id": "acessorio_rosto",
        "label": "Acessório de rosto",
        "required": false,
        "groups": [
          "acessorio_rosto"
        ]
      },
      {
        "id": "roupa_inteira",
        "label": "Roupa inteira",
        "required": false,
        "groups": [
          "roupa_inteira"
        ]
      },
      {
        "id": "roupa_cima",
        "label": "Roupa de cima",
        "required": false,
        "groups": [
          "roupa_cima"
        ]
      },
      {
        "id": "luvas",
        "label": "Luvas",
        "required": false,
        "groups": [
          "luvas"
        ]
      },
      {
        "id": "calca",
        "label": "Calça",
        "required": false,
        "groups": [
          "calca"
        ]
      },
      {
        "id": "bermuda",
        "label": "Bermuda",
        "required": false,
        "groups": [
          "bermuda"
        ]
      },
      {
        "id": "meias",
        "label": "Meias",
        "required": false,
        "groups": [
          "meias"
        ]
      },
      {
        "id": "calcado",
        "label": "Calçado",
        "required": false,
        "groups": [
          "calcado"
        ]
      },
      {
        "id": "costas",
        "label": "Costas",
        "required": false,
        "groups": [
          "costas"
        ]
      }
    ],
    "groups": {
      "corpo": {
        "label": "Corpo",
        "parts": [
          "corpo_vermelho_pacote",
          "corpo_roxo_pacote",
          "corpo_azul_pacote",
          "corpo_azul_petroleo_pacote",
          "corpo_verde_pacote",
          "corpo_amarelo_limao_pacote",
          "corpo_amarelo_pacote",
          "corpo_laranja_pacote",
          "corpo_pele_clara_pacote",
          "corpo_pele_media_clara_pacote",
          "corpo_pele_media_pacote",
          "corpo_pele_morena_pacote",
          "corpo_pele_escura_pacote",
          "corpo_branco_pacote",
          "corpo_cinza_pacote",
          "corpo_preto_pacote"
        ]
      },
      "orelhas": {
        "label": "Orelhas",
        "parts": [
          "orelhas_corpo_vermelho_pacote",
          "orelhas_corpo_roxo_pacote",
          "orelhas_corpo_azul_pacote",
          "orelhas_corpo_azul_petroleo_pacote",
          "orelhas_corpo_verde_pacote",
          "orelhas_corpo_amarelo_limao_pacote",
          "orelhas_corpo_amarelo_pacote",
          "orelhas_corpo_laranja_pacote",
          "orelhas_corpo_pele_clara_pacote",
          "orelhas_corpo_pele_media_clara_pacote",
          "orelhas_corpo_pele_media_pacote",
          "orelhas_corpo_pele_morena_pacote",
          "orelhas_corpo_pele_escura_pacote",
          "orelhas_corpo_branco_pacote",
          "orelhas_corpo_cinza_pacote",
          "orelhas_corpo_preto_pacote"
        ]
      },
      "acessorio_rosto": {
        "label": "Acessório de rosto",
        "parts": [
          "barba_dentes_vampiro_pacote",
          "barba_cheia_pacote",
          "barba_cavanhaque_pacote",
          "nariz_palhaco_pacote",
          "brincos_argola_pacote",
          "fones_sem_fio_pacote",
          "mascara_cirurgica_pacote",
          "mascara_pano_preta_pacote",
          "bigode_01_pacote",
          "bigode_02_pacote",
          "bigode_03_pacote",
          "bigode_04_pacote",
          "bigode_05_pacote",
          "bigode_06_pacote",
          "bigode_07_pacote",
          "bigode_08_pacote",
          "bigode_09_pacote",
          "bigode_10_pacote",
          "bigode_11_pacote",
          "bigode_12_pacote",
          "bigode_13_pacote",
          "bigode_14_pacote",
          "bigode_15_pacote",
          "chupeta_pacote"
        ]
      },
      "rosto": {
        "label": "Rosto",
        "parts": [
          "rosto_fem_01_furia_pacote",
          "rosto_fem_01_bravo_pacote",
          "rosto_fem_02_bravo_pacote",
          "rosto_fem_01_confuso_pacote",
          "rosto_fem_01_chorando_pacote",
          "rosto_fem_01_malvado_pacote",
          "rosto_fem_02_malvado_pacote",
          "rosto_fem_01_feliz_pacote",
          "rosto_fem_02_feliz_pacote",
          "rosto_fem_01_apaixonado_pacote",
          "rosto_fem_01_neutro_pacote",
          "rosto_fem_02_neutro_pacote",
          "rosto_fem_01_triste_pacote",
          "rosto_fem_02_triste_pacote",
          "rosto_fem_01_gritando_pacote",
          "rosto_fem_01_surpreso_pacote",
          "rosto_fem_02_surpreso_pacote",
          "rosto_fem_01_lingua_pacote",
          "rosto_fem_01_normal_pacote",
          "rosto_fem_02_normal_pacote",
          "rosto_masc_01_furia_pacote",
          "rosto_masc_01_bravo_pacote",
          "rosto_masc_02_bravo_pacote",
          "rosto_masc_01_confuso_pacote",
          "rosto_masc_01_chorando_pacote",
          "rosto_masc_01_malvado_pacote",
          "rosto_masc_02_malvado_pacote",
          "rosto_masc_01_feliz_pacote",
          "rosto_masc_02_feliz_pacote",
          "rosto_masc_01_apaixonado_pacote",
          "rosto_masc_01_neutro_pacote",
          "rosto_masc_02_neutro_pacote",
          "rosto_masc_01_triste_pacote",
          "rosto_masc_02_triste_pacote",
          "rosto_masc_01_gritando_pacote",
          "rosto_masc_01_surpreso_pacote",
          "rosto_masc_02_surpreso_pacote",
          "rosto_masc_01_lingua_pacote",
          "rosto_masc_01_normal_pacote",
          "rosto_masc_02_normal_pacote",
          "rosto_fem_01_atordoado",
          "rosto_fem_01_compaixao",
          "rosto_fem_01_impaciencia",
          "rosto_masc_01_atordoado",
          "rosto_masc_01_compaixao",
          "rosto_masc_01_impaciencia"
        ]
      },
      "oculos": {
        "label": "Óculos",
        "parts": [
          "oculos_tapa_olho_pacote",
          "oculos_escuros_brancos_pacote",
          "oculos_redondos_cinza_pacote",
          "oculos_grau_vermelhos_pacote",
          "oculos_lupa_pacote",
          "oculos_redondos_verdes_pacote",
          "oculos_redondos_rosa_pacote",
          "oculos_esqui_pacote",
          "oculos_azuis_pacote",
          "oculos_coracao_pacote",
          "oculos_pixelados_pacote",
          "oculos_persiana_pacote",
          "oculos_gatinho_verde_pacote",
          "oculos_rosa_pacote",
          "oculos_3d_pacote",
          "oculos_aviador_laranja_pacote",
          "oculos_redondos_vidro_pacote",
          "oculos_viseira_triangular_vidro_pacote",
          "oculos_escuros_cinza_pacote",
          "oculos_marrons_pacote",
          "oculos_redondos_azuis_pacote",
          "oculos_redondos_vermelhos_pacote"
        ]
      },
      "luvas": {
        "label": "Luvas",
        "parts": [
          "luvas_amarelas_pacote",
          "luvas_laranja_pacote",
          "luvas_azuis_pacote",
          "luvas_verdes_pacote",
          "luvas_vermelhas_pacote",
          "luvas_pretas_pacote",
          "luvas_cinza_escuro_pacote",
          "luvas_listradas_vermelhas_pacote",
          "luvas_cinza_pacote",
          "luvas_verde_limao_pacote",
          "luvas_pretas_sem_dedos_pacote",
          "luvas_rosa_pacote"
        ]
      },
      "cabelo_sob_chapeu": {
        "label": "Cabelo curto para usar sob chapéu",
        "parts": [
          "cabelo_curto_escuro_1_pacote",
          "cabelo_curto_escuro_2_pacote",
          "cabelo_curto_castanho_pacote",
          "cabelo_curto_loiro_1_pacote",
          "cabelo_curto_loiro_2_pacote",
          "cabelo_curto_loiro_3_pacote",
          "cabelo_coque_baixo_sob_chapeu",
          "cabelo_crespo_sob_chapeu",
          "cabelo_rabo_cavalo_sob_chapeu",
          "cabelo_solto_sob_chapeu",
          "cabelo_trancas_sob_chapeu"
        ]
      },
      "cabelo": {
        "label": "Cabelo",
        "parts": [
          "cabelo_coque_alto_loiro_pacote",
          "cabelo_liso_preto_branco_pacote",
          "cabelo_chanel_castanho_pacote",
          "cabelo_liso_cinza_04_pacote",
          "cabelo_chanel_franja_pacote",
          "cabelo_cacheado_grisalho_pacote",
          "cabelo_ondulado_castanho_pacote",
          "cabelo_cacheado_curto_pacote",
          "cabelo_coque_faixa_pacote",
          "cabelo_cachos_longos_pacote",
          "cabelo_cacheado_rosa_pacote",
          "cabelo_orelhinhas_rato_loiro_pacote",
          "cabelo_topete_branco_pacote",
          "cabelo_franja_ruiva_pacote",
          "cabelo_loiro_curto_pacote",
          "cabelo_ondulado_escuro_pacote",
          "cabelo_liso_cinza_05_pacote",
          "cabelo_arco_iris_pacote",
          "cabelo_peruca_cachos_branca_pacote",
          "cabelo_liso_branco_pacote",
          "cabelo_liso_grisalho_pacote",
          "cabelo_topete_ruivo_pacote",
          "cabelo_mecha_lateral_pacote",
          "cabelo_dreadlocks_pacote",
          "cabelo_black_power",
          "cabelo_coque_crespo",
          "cabelo_maria_chiquinha",
          "cabelo_trancas_nago"
        ]
      },
      "chapeu": {
        "label": "Chapéu",
        "parts": [
          "chapeu_pescador_azul_pacote",
          "chapeu_cartola_listrada_estrelas_pacote",
          "chapeu_caranguejo_pacote",
          "chapeu_desentupidor_cabeca_pacote",
          "chapeu_touca_cozinheiro_pacote",
          "chapeu_bone_branco_bolinhas_pacote",
          "chapeu_gorro_curto_vermelho_pacote",
          "chapeu_galinha_assada_pacote",
          "chapeu_cerveja_pacote",
          "chapeu_palha_baixo_pacote",
          "chapeu_coroa_pacote",
          "chapeu_quepe_policial_pacote",
          "chapeu_elmo_viking_pacote",
          "chapeu_cartola_cinza_pacote",
          "chapeu_quepe_marinheiro_pacote",
          "chapeu_bone_helice_pacote",
          "chapeu_boina_vermelha_pacote",
          "chapeu_bone_orelhas_gato_pacote",
          "chapeu_capacete_mineiro_pacote",
          "chapeu_verde_pena_pacote",
          "chapeu_palha_marrom_pacote",
          "chapeu_coco_cinza_pacote",
          "chapeu_sombreiro_pacote",
          "chapeu_gorro_gelatina_sorridente_pacote",
          "chapeu_cogumelo_pacote",
          "chapeu_caracol_cabeca_pacote",
          "chapeu_cone_transito_pacote",
          "chapeu_cartola_colorida_pacote",
          "chapeu_capacete_chifres_rena_pacote",
          "chapeu_palha_claro_pacote",
          "chapeu_palha_fita_pacote",
          "chapeu_gorro_papai_noel_pacote",
          "chapeu_gorro_cinza_pacote",
          "chapeu_capacete_militar_pacote",
          "chapeu_sapo_pacote",
          "chapeu_peixe_lanterna_pacote",
          "chapeu_dinossauro_verde_pacote",
          "chapeu_capacete_moto_pacote",
          "chapeu_capacete_aviador_pacote",
          "chapeu_bobo_pacote",
          "chapeu_cauboi"
        ]
      },
      "capuz": {
        "label": "Capuz ou capacete (cobre a cabeça, sem cabelo)",
        "parts": [
          "chapeu_capuz_raposa_pacote",
          "chapeu_capuz_galinha_pacote",
          "chapeu_capuz_coala_pacote",
          "chapeu_capuz_gato_preto_pacote",
          "chapeu_abobora_pacote",
          "chapeu_saco_papel_pacote",
          "chapeu_escafandro_pacote",
          "chapeu_capacete_corrida_pacote",
          "chapeu_mascara_gas_pacote"
        ]
      },
      "chapeu_sobre_cabelo": {
        "label": "Chapéu sobre cabelo curto",
        "parts": [
          "chapeu_guarda_chuva_pacote",
          "chapeu_gorro_trico_pacote",
          "chapeu_tiara_fones_ouvido_pacote",
          "chapeu_tiara_orelhas_coelho_pacote",
          "chapeu_televisao_cabeca_pacote",
          "chapeu_boia_coelho_rosa_pacote",
          "chapeu_caixa_brinquedo",
          "chapeu_boia_patinho_pacote",
          "chapeu_capelo_formatura_pacote",
          "chapeu_capuz_tubarao_pacote",
          "chapeu_coroa_flores",
          "chapeu_laco",
          "chapeu_presilhas_estrela",
          "chapeu_tiara",
          "chapeu_tiara_lanterninhas"
        ]
      },
      "roupa_inteira": {
        "label": "Roupa inteira",
        "parts": [
          "roupa_inteira_camisa_branca_saia_escura_pacote",
          "roupa_inteira_vestido_marrom_pacote",
          "roupa_inteira_vestido_azul_pacote",
          "roupa_inteira_jaqueta_amarela_saia_escura_pacote",
          "roupa_inteira_jaqueta_verde_calca_cinza_pacote",
          "roupa_inteira_vestido_azul_petroleo_pacote",
          "roupa_inteira_jardineira_azul_pacote",
          "roupa_inteira_macacao_piloto_azul_pacote",
          "roupa_inteira_camiseta_branca_saia_vermelha_pacote",
          "roupa_inteira_vestido_chita",
          "roupa_inteira_vestido_longo"
        ]
      },
      "roupa_cima": {
        "label": "Roupa de cima",
        "parts": [
          "roupa_cima_jaqueta_vermelha_pacote",
          "roupa_cima_moletom_cinza_escuro_pacote",
          "roupa_cima_camiseta_amarela_gola_v_pacote",
          "roupa_cima_jaqueta_universitaria_vermelha_pacote",
          "roupa_cima_jaqueta_esportiva_amarela_pacote",
          "roupa_cima_camisa_azul_aberta_pacote",
          "roupa_cima_moletom_laranja_pacote",
          "roupa_cima_jaqueta_roxa_pacote",
          "roupa_cima_jaqueta_couro_marrom_pacote",
          "roupa_cima_jaqueta_laranja_acolchoada_pacote",
          "roupa_cima_jaqueta_bege_pacote",
          "roupa_cima_colete_azul_petroleo_listrado_pacote",
          "roupa_cima_camisa_verde_aberta_pacote",
          "roupa_cima_moletom_cinza_capuz_pacote",
          "roupa_cima_colete_cinza_pacote",
          "roupa_cima_jaqueta_couro_tachas_pacote",
          "roupa_cima_jaqueta_rosa_pacote",
          "roupa_cima_top_rosa_pacote",
          "roupa_cima_camiseta_branca_pacote",
          "roupa_cima_jaqueta_rosa_um_ombro_pacote",
          "roupa_cima_jaqueta_curta_amarela_pacote",
          "roupa_cima_casaco_curto_vermelho_pacote",
          "roupa_cima_casaquinho_azul_curto_pacote",
          "roupa_cima_jaqueta_cinza_curta_pacote",
          "roupa_cima_maio_vermelho_pacote",
          "roupa_cima_camisa_cinza_botao_pacote",
          "roupa_cima_camisa_azul_clara_botao_pacote",
          "roupa_cima_camiseta_vermelha_pacote",
          "roupa_cima_camiseta_laranja_cinza_pacote",
          "roupa_cima_camiseta_ragla_cinza_pacote",
          "roupa_cima_regata_verde_oliva_pacote",
          "roupa_cima_regata_branca_pacote",
          "roupa_cima_camisa_roxa_aberta_pacote",
          "roupa_cima_polo_amarela_pacote",
          "roupa_cima_jaqueta_cinza_aberta_pacote",
          "roupa_cima_jaqueta_rosa_ziper_pacote",
          "roupa_cima_camisa_azul_clara_pacote",
          "roupa_cima_jaqueta_azul_acolchoada_pacote",
          "roupa_cima_jaqueta_vermelha_ziper_pacote",
          "roupa_cima_jaqueta_verde_cinto_pacote",
          "roupa_cima_sueter_listrado_vermelho_pacote",
          "roupa_cima_jaqueta_amarela_gola_pacote",
          "roupa_cima_colete_bolsos_pacote",
          "roupa_cima_camiseta_branca_gola_v_pacote",
          "roupa_cima_camiseta_rosa_pacote",
          "roupa_cima_camiseta_azul_petroleo_gola_v_pacote",
          "roupa_cima_camisa_amarela_aberta_pacote",
          "roupa_cima_regata_creme_pacote",
          "roupa_cima_camiseta_ragla_roxa_verde_pacote",
          "roupa_cima_camiseta_azul_degrade_pacote",
          "roupa_cima_camisa_rosa_bolso_pacote",
          "roupa_cima_camiseta_amarela_verde_pacote",
          "roupa_cima_camisa_azul_botao_pacote",
          "roupa_cima_camiseta_roxa_pacote",
          "roupa_cima_polo_verde_listrada_pacote",
          "roupa_cima_regata_lilas_pacote",
          "roupa_cima_colete_franjas",
          "roupa_cima_sueter_estrela"
        ]
      },
      "calca": {
        "label": "Calça",
        "parts": [
          "calca_branca_pacote",
          "calca_amarela_pacote",
          "calca_marrom_pacote",
          "calca_vermelha_pacote",
          "calca_azul_clara_pacote",
          "calca_bermuda_cargo_cinza_pacote",
          "calca_listrada_roxa_pacote",
          "calca_joelheiras_pacote",
          "calca_rosa_bolinhas_pacote",
          "calca_marrom_meias_pacote",
          "calca_verde_remendada_pacote",
          "calca_azul_petroleo_rasgada_pacote",
          "calca_amarela_faixa_pacote",
          "calca_azul_cinto_pacote",
          "calca_roxa_pacote",
          "calca_saia_longa"
        ]
      },
      "calcado": {
        "label": "Calçado",
        "parts": [
          "calcado_chinelo_rosa_pacote",
          "calcado_sandalia_azul_petroleo_pacote",
          "calcado_chinelo_amarelo_pacote",
          "calcado_pantufa_azul_pacote",
          "calcado_pantufa_sapo_pacote",
          "calcado_sandalia_laranja_pacote",
          "calcado_chinelo_listrado_pacote",
          "calcado_tenis_branco_pacote",
          "calcado_mocassim_marrom_pacote",
          "calcado_sapato_marrom_pacote",
          "calcado_tenis_cinza_pacote",
          "calcado_sapato_preto_pacote",
          "calcado_bota_marrom_pacote",
          "calcado_tenis_cinza_claro_pacote",
          "calcado_tenis_vermelho_pacote",
          "calcado_tenis_bege_pacote",
          "calcado_tenis_rosa_pacote",
          "calcado_mocassim_castanho_pacote",
          "calcado_sapato_bege_pacote",
          "calcado_tenis_branco_cano_pacote",
          "calcado_tenis_preto_pacote",
          "calcado_tenis_branco_liso_pacote"
        ]
      },
      "bermuda": {
        "label": "Bermuda",
        "parts": [
          "bermuda_branca_pacote",
          "bermuda_short_vermelho_pacote",
          "bermuda_verde_pacote"
        ]
      },
      "meias": {
        "label": "Meias",
        "parts": [
          "meias_curtas_pacote",
          "meias_altas_marrons_pacote",
          "meias_altas_cinza_pacote"
        ]
      },
      "fantasia": {
        "label": "Fantasia de corpo inteiro",
        "parts": [
          "fantasia_coelho_roxo",
          "fantasia_abelha",
          "fantasia_astronauta",
          "fantasia_robo_amarelo",
          "fantasia_super_heroi",
          "fantasia_pinguim",
          "fantasia_traje_neon",
          "fantasia_bobo_corte",
          "fantasia_cavaleiro",
          "fantasia_papai_noel",
          "fantasia_soldado",
          "fantasia_dinossauro_listrado",
          "fantasia_pombo",
          "fantasia_pirata"
        ]
      },
      "costas": {
        "label": "Costas (capa, mochila)",
        "parts": [
          "costas_capa_estrelas"
        ]
      }
    },
    "setDisables": [
      "chapeu",
      "cabelo",
      "orelhas",
      "oculos",
      "acessorio_rosto",
      "roupa_inteira",
      "roupa_cima",
      "luvas",
      "calca",
      "bermuda",
      "meias",
      "calcado",
      "costas"
    ],
    "incompatible": {
      "cabelo_cacheado_grisalho_pacote": [
        "costas_capa_estrelas"
      ],
      "cabelo_coque_alto_loiro_pacote": [
        "costas_capa_estrelas"
      ],
      "cabelo_coque_baixo_sob_chapeu": [
        "chapeu_caixa_brinquedo",
        "chapeu_caixa_brinquedo_pacote",
        "chapeu_capacete_militar_pacote",
        "chapeu_capacete_moto_pacote",
        "chapeu_televisao_cabeca_pacote"
      ],
      "cabelo_crespo_sob_chapeu": [
        "chapeu_caixa_brinquedo",
        "chapeu_caixa_brinquedo_pacote",
        "chapeu_capacete_militar_pacote",
        "chapeu_capacete_moto_pacote",
        "chapeu_cartola_listrada_estrelas_pacote",
        "chapeu_televisao_cabeca_pacote"
      ],
      "cabelo_liso_branco_pacote": [
        "costas_capa_estrelas"
      ],
      "cabelo_liso_cinza_04_pacote": [
        "costas_capa_estrelas"
      ],
      "cabelo_liso_grisalho_pacote": [
        "costas_capa_estrelas"
      ],
      "cabelo_liso_preto_branco_pacote": [
        "costas_capa_estrelas"
      ],
      "cabelo_ondulado_castanho_pacote": [
        "costas_capa_estrelas"
      ],
      "cabelo_peruca_cachos_branca_pacote": [
        "costas_capa_estrelas"
      ],
      "cabelo_rabo_cavalo_sob_chapeu": [
        "chapeu_caixa_brinquedo",
        "chapeu_caixa_brinquedo_pacote",
        "chapeu_capacete_militar_pacote",
        "chapeu_capacete_moto_pacote",
        "chapeu_televisao_cabeca_pacote"
      ],
      "cabelo_solto_sob_chapeu": [
        "chapeu_capacete_moto_pacote",
        "chapeu_televisao_cabeca_pacote"
      ],
      "cabelo_trancas_sob_chapeu": [
        "chapeu_capacete_militar_pacote",
        "chapeu_capacete_moto_pacote",
        "chapeu_televisao_cabeca_pacote"
      ],
      "chapeu_caixa_brinquedo": [
        "cabelo_coque_baixo_sob_chapeu",
        "cabelo_crespo_sob_chapeu",
        "cabelo_rabo_cavalo_sob_chapeu"
      ],
      "chapeu_caixa_brinquedo_pacote": [
        "cabelo_coque_baixo_sob_chapeu",
        "cabelo_crespo_sob_chapeu",
        "cabelo_rabo_cavalo_sob_chapeu"
      ],
      "chapeu_capacete_militar_pacote": [
        "cabelo_coque_baixo_sob_chapeu",
        "cabelo_crespo_sob_chapeu",
        "cabelo_rabo_cavalo_sob_chapeu",
        "cabelo_trancas_sob_chapeu"
      ],
      "chapeu_capacete_moto_pacote": [
        "cabelo_coque_baixo_sob_chapeu",
        "cabelo_crespo_sob_chapeu",
        "cabelo_rabo_cavalo_sob_chapeu",
        "cabelo_solto_sob_chapeu",
        "cabelo_trancas_sob_chapeu"
      ],
      "chapeu_cartola_listrada_estrelas_pacote": [
        "cabelo_crespo_sob_chapeu"
      ],
      "chapeu_televisao_cabeca_pacote": [
        "cabelo_coque_baixo_sob_chapeu",
        "cabelo_crespo_sob_chapeu",
        "cabelo_rabo_cavalo_sob_chapeu",
        "cabelo_solto_sob_chapeu",
        "cabelo_trancas_sob_chapeu"
      ],
      "costas_capa_estrelas": [
        "cabelo_cacheado_grisalho_pacote",
        "cabelo_coque_alto_loiro_pacote",
        "cabelo_liso_branco_pacote",
        "cabelo_liso_cinza_04_pacote",
        "cabelo_liso_grisalho_pacote",
        "cabelo_liso_preto_branco_pacote",
        "cabelo_ondulado_castanho_pacote",
        "cabelo_peruca_cachos_branca_pacote",
        "fantasia_abelha_asas_pacote",
        "fantasia_cavaleiro_ombreiras_pacote",
        "roupa_cima_jaqueta_azul_acolchoada_pacote",
        "roupa_cima_jaqueta_bege_pacote",
        "roupa_cima_jaqueta_cinza_aberta_pacote",
        "roupa_cima_jaqueta_rosa_pacote",
        "roupa_cima_jaqueta_universitaria_vermelha_pacote",
        "roupa_cima_jaqueta_vermelha_pacote",
        "roupa_cima_moletom_laranja_pacote"
      ],
      "fantasia_abelha_asas_pacote": [
        "costas_capa_estrelas"
      ],
      "fantasia_cavaleiro_ombreiras_pacote": [
        "costas_capa_estrelas"
      ],
      "roupa_cima_jaqueta_azul_acolchoada_pacote": [
        "costas_capa_estrelas"
      ],
      "roupa_cima_jaqueta_bege_pacote": [
        "costas_capa_estrelas"
      ],
      "roupa_cima_jaqueta_cinza_aberta_pacote": [
        "costas_capa_estrelas"
      ],
      "roupa_cima_jaqueta_rosa_pacote": [
        "costas_capa_estrelas"
      ],
      "roupa_cima_jaqueta_universitaria_vermelha_pacote": [
        "costas_capa_estrelas"
      ],
      "roupa_cima_jaqueta_vermelha_pacote": [
        "costas_capa_estrelas"
      ],
      "roupa_cima_moletom_laranja_pacote": [
        "costas_capa_estrelas"
      ]
    },
    "earsByBody": {
      "corpo_vermelho_pacote": "orelhas_corpo_vermelho_pacote",
      "corpo_roxo_pacote": "orelhas_corpo_roxo_pacote",
      "corpo_azul_pacote": "orelhas_corpo_azul_pacote",
      "corpo_azul_petroleo_pacote": "orelhas_corpo_azul_petroleo_pacote",
      "corpo_verde_pacote": "orelhas_corpo_verde_pacote",
      "corpo_amarelo_limao_pacote": "orelhas_corpo_amarelo_limao_pacote",
      "corpo_amarelo_pacote": "orelhas_corpo_amarelo_pacote",
      "corpo_laranja_pacote": "orelhas_corpo_laranja_pacote",
      "corpo_pele_clara_pacote": "orelhas_corpo_pele_clara_pacote",
      "corpo_pele_media_clara_pacote": "orelhas_corpo_pele_media_clara_pacote",
      "corpo_pele_media_pacote": "orelhas_corpo_pele_media_pacote",
      "corpo_pele_morena_pacote": "orelhas_corpo_pele_morena_pacote",
      "corpo_pele_escura_pacote": "orelhas_corpo_pele_escura_pacote",
      "corpo_branco_pacote": "orelhas_corpo_branco_pacote",
      "corpo_cinza_pacote": "orelhas_corpo_cinza_pacote",
      "corpo_preto_pacote": "orelhas_corpo_preto_pacote"
    },
    "draw": {
      "steps": [
        {
          "group": "rosto",
          "probability": 1,
          "compatible": null
        },
        {
          "group": "corpo",
          "probability": 1,
          "compatible": null
        },
        {
          "group": "fantasia",
          "probability": 0.2,
          "compatible": []
        },
        {
          "group": "roupa_inteira",
          "probability": 0.35,
          "compatible": [
            "capuz",
            "chapeu",
            "chapeu_sobre_cabelo",
            "acessorio_rosto",
            "oculos",
            "calcado",
            "cabelo",
            "luvas",
            "orelhas"
          ]
        },
        {
          "group": "roupa_cima",
          "probability": 0.35,
          "compatible": [
            "calca",
            "bermuda",
            "capuz",
            "chapeu",
            "chapeu_sobre_cabelo",
            "acessorio_rosto",
            "oculos",
            "calcado",
            "cabelo",
            "luvas",
            "orelhas"
          ]
        },
        {
          "group": "calca",
          "probability": 0.35,
          "compatible": [
            "capuz",
            "chapeu",
            "chapeu_sobre_cabelo",
            "acessorio_rosto",
            "oculos",
            "calcado",
            "cabelo",
            "luvas",
            "orelhas"
          ]
        },
        {
          "group": "bermuda",
          "probability": 0.35,
          "compatible": [
            "capuz",
            "chapeu",
            "chapeu_sobre_cabelo",
            "acessorio_rosto",
            "oculos",
            "calcado",
            "cabelo",
            "luvas",
            "orelhas"
          ],
          "unlocks": "meias",
          "unlockChance": 1
        },
        {
          "group": "meias",
          "probability": 0.5,
          "compatible": [
            "capuz",
            "chapeu",
            "chapeu_sobre_cabelo",
            "acessorio_rosto",
            "oculos",
            "calcado",
            "cabelo",
            "luvas",
            "orelhas"
          ]
        },
        {
          "group": "capuz",
          "probability": 0.35,
          "compatible": [
            "calcado",
            "luvas"
          ]
        },
        {
          "group": "chapeu",
          "probability": 0.35,
          "compatible": [
            "acessorio_rosto",
            "oculos",
            "calcado",
            "luvas",
            "orelhas"
          ]
        },
        {
          "group": "chapeu_sobre_cabelo",
          "probability": 0.35,
          "compatible": [
            "acessorio_rosto",
            "calcado",
            "luvas",
            "orelhas"
          ],
          "unlocks": "cabelo_sob_chapeu",
          "unlockChance": 1
        },
        {
          "group": "acessorio_rosto",
          "probability": 0.35,
          "compatible": [
            "oculos",
            "calcado",
            "cabelo",
            "luvas",
            "orelhas"
          ]
        },
        {
          "group": "oculos",
          "probability": 0.35,
          "compatible": [
            "calcado",
            "cabelo",
            "luvas",
            "orelhas"
          ]
        },
        {
          "group": "calcado",
          "probability": 0.35,
          "compatible": [
            "cabelo",
            "luvas",
            "orelhas"
          ],
          "unlocks": "cabelo_sob_chapeu",
          "unlockChance": 0.5,
          "unlocksUnlessOn": [
            "capuz"
          ]
        },
        {
          "group": "cabelo",
          "probability": 0.35,
          "compatible": [
            "luvas",
            "orelhas"
          ]
        },
        {
          "group": "luvas",
          "probability": 0.35,
          "compatible": [
            "orelhas"
          ]
        },
        {
          "group": "cabelo_sob_chapeu",
          "probability": 1,
          "compatible": [
            "orelhas"
          ]
        },
        {
          "group": "orelhas",
          "probability": 1,
          "compatible": []
        }
      ],
      "excluded": [
        "roupa_cima_rascunho_pacote",
        "chapeu_caixa_brinquedo_pacote",
        "chapeu_gorro_trico_pacote",
        "chapeu_tiara"
      ]
    },
    "faces": {
      "fem_01": {
        "apaixonado": "rosto_fem_01_apaixonado_pacote",
        "bravo": "rosto_fem_01_bravo_pacote",
        "chorando": "rosto_fem_01_chorando_pacote",
        "confuso": "rosto_fem_01_confuso_pacote",
        "feliz": "rosto_fem_01_feliz_pacote",
        "furia": "rosto_fem_01_furia_pacote",
        "gritando": "rosto_fem_01_gritando_pacote",
        "lingua": "rosto_fem_01_lingua_pacote",
        "malvado": "rosto_fem_01_malvado_pacote",
        "neutro": "rosto_fem_01_neutro_pacote",
        "normal": "rosto_fem_01_normal_pacote",
        "surpreso": "rosto_fem_01_surpreso_pacote",
        "triste": "rosto_fem_01_triste_pacote",
        "atordoado": "rosto_fem_01_atordoado",
        "compaixao": "rosto_fem_01_compaixao",
        "impaciencia": "rosto_fem_01_impaciencia"
      },
      "fem_02": {
        "bravo": "rosto_fem_02_bravo_pacote",
        "feliz": "rosto_fem_02_feliz_pacote",
        "malvado": "rosto_fem_02_malvado_pacote",
        "neutro": "rosto_fem_02_neutro_pacote",
        "normal": "rosto_fem_02_normal_pacote",
        "surpreso": "rosto_fem_02_surpreso_pacote",
        "triste": "rosto_fem_02_triste_pacote"
      },
      "masc_01": {
        "apaixonado": "rosto_masc_01_apaixonado_pacote",
        "bravo": "rosto_masc_01_bravo_pacote",
        "chorando": "rosto_masc_01_chorando_pacote",
        "confuso": "rosto_masc_01_confuso_pacote",
        "feliz": "rosto_masc_01_feliz_pacote",
        "furia": "rosto_masc_01_furia_pacote",
        "gritando": "rosto_masc_01_gritando_pacote",
        "lingua": "rosto_masc_01_lingua_pacote",
        "malvado": "rosto_masc_01_malvado_pacote",
        "neutro": "rosto_masc_01_neutro_pacote",
        "normal": "rosto_masc_01_normal_pacote",
        "surpreso": "rosto_masc_01_surpreso_pacote",
        "triste": "rosto_masc_01_triste_pacote",
        "atordoado": "rosto_masc_01_atordoado",
        "compaixao": "rosto_masc_01_compaixao",
        "impaciencia": "rosto_masc_01_impaciencia"
      },
      "masc_02": {
        "bravo": "rosto_masc_02_bravo_pacote",
        "feliz": "rosto_masc_02_feliz_pacote",
        "malvado": "rosto_masc_02_malvado_pacote",
        "neutro": "rosto_masc_02_neutro_pacote",
        "normal": "rosto_masc_02_normal_pacote",
        "surpreso": "rosto_masc_02_surpreso_pacote",
        "triste": "rosto_masc_02_triste_pacote"
      }
    },
    "expressions": {
      "furia": "Fúria (dentes cerrados)",
      "bravo": "Bravo",
      "confuso": "Confuso",
      "chorando": "Chorando",
      "malvado": "Malvado",
      "feliz": "Feliz",
      "apaixonado": "Apaixonado",
      "neutro": "Neutro",
      "triste": "Triste",
      "gritando": "Gritando",
      "surpreso": "Surpreso",
      "lingua": "Língua de fora",
      "normal": "Normal",
      "atordoado": "Atordoado",
      "compaixao": "Compaixão",
      "impaciencia": "Impaciência"
    },
    "festas": {
      "carnaval": {
        "label": "Carnaval",
        "prize": "chapeu_cartola_colorida_pacote",
        "themed": []
      },
      "junina": {
        "label": "Festa junina",
        "prize": "chapeu_palha_fita_pacote",
        "themed": [
          "roupa_cima_colete_franjas",
          "roupa_inteira_vestido_chita"
        ]
      },
      "fim_de_ano": {
        "label": "Fim de ano",
        "prize": "chapeu_gorro_papai_noel_pacote",
        "themed": []
      }
    },
    "default": {
      "corpo": "corpo_pele_media_clara_pacote",
      "orelhas": "orelhas_corpo_pele_media_clara_pacote",
      "rosto": "rosto_masc_02_normal_pacote"
    }
  }
}
