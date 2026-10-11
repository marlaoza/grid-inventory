const BUILTIN = {
//   bar: { name: "Bar", shape: [[1, 1, 1]], img: "modules/grid-inventory/assets/items/maleta.jpg" },
//   ell: { name: "L piece", shape: [[1, 1], [1, 0], [1, 0]] },
  box: { 
    name: "Box", 
    shape: [[1, 1], 
            [1, 1]], 
    desc: "testezeira",
    img: "modules/grid-inventory/assets/items/maleta.jpg" },
};

export const BUILTIN_IDS = Object.keys(BUILTIN);

export function getTemplate(id) {
  return BUILTIN[id] ?? null;   
}