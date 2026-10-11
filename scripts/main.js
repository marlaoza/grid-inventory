
Hooks.once("init", () => console.log("grid-inventory | init"));
Hooks.once("ready", () => console.log("grid-inventory | ready"));

import { InventoryWindow } from "./inventory.js";

let inventoryWindow = null;
function openInventory() {
  inventoryWindow ??= new InventoryWindow();      
  if (inventoryWindow.rendered) inventoryWindow.close();
  inventoryWindow.render({ force: true });     
}

Hooks.once("ready", () => {
  game.modules.get("grid-inventory").api = { openInventory };
});

Hooks.on("getSceneControlButtons", (controls) => {
  controls.tokens.tools.gridInventory = {
    name: "gridInventory",
    title: "GRIDINV.Inventory",
    icon: "fa-solid fa-box-open",
    order: Object.keys(controls.tokens.tools).length,
    button: true,                 
    visible: true,
    onChange: () => openInventory(),
  };
});


Hooks.on("updateActor", (actor, changes) => {
  if (!foundry.utils.hasProperty(changes, "flags.grid-inventory")) return;
  for (const app of foundry.applications.instances.values()) {
    if (app instanceof InventoryWindow && app.actor?.id === actor.id) app.render();
  }
});