export const VOCATION_PROCEDURAL_SOURCE = `SZWorld3D.setup({ style: "primavera", world: 260 });
SZWorld3D.quality("automatica");
SZWorld3D.terrain(2, 10);
SZWorld3D.roadGrid("radial", 0, 0, 180, 7);
SZWorld3D.district("educacao", -48, 30, 38);
SZWorld3D.district("saude", 48, 30, 38);
SZWorld3D.district("comercial", 0, -52, 42);
SZWorld3D.houseRow(10, -55, -12, 55, -12, "modernas");
SZWorld3D.person("#8b5cf6", "bone");
SZWorld3D.npc("Lia", -18, 8, "#f97316", "bone");
SZWorld3D.npc("Caio", 18, 8, "#22c55e", "nenhum");
SZWorld3D.door(-48, 30, 0, "Escola Criativa", "Descubra carreiras em tecnologia, arte e ciencia.", "");
SZWorld3D.door(48, 30, 0, "Centro de Saude", "Conheca quem cuida das pessoas e da comunidade.", "");
SZWorld3D.inventoryGive("mapa de carreiras", 1);
SZWorld3D.quest("Minha vocacao", "Visite os tres distritos e converse com os moradores.");
SZWorld3D.minimap("ver");
SZWorld3D.start();`
