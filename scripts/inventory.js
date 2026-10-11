const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export const DEFAULT_SLOTS = [
  [1, 1, 1, 1],
  [1, 0, 0, 1],  
  [1, 1, 0, 1],
  [1, 1, 1, 1]
];

import { BUILTIN_IDS, getTemplate } from "./templates.js";
import { InventoryItem } from "./item.js";


export class InventoryWindow extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "grid-inventory-window",
        classes: ["inventory-window"],
        tag: "div",
        window: {
        title: "Inventory",
        icon: "fa-solid fa-box-open",   
        resizable: false,
        minimizable: true,
        },
        position: { width: "auto", height: "auto" },
        actions: {
            toggleEdit: InventoryWindow.#toggleEdit,   
            spawnPiece: InventoryWindow.#spawnPiece,   
            closeWindow: InventoryWindow.#closeWindow,
        },
    };

    static PARTS = {
        main: { template: "modules/grid-inventory/templates/inventory.hbs" },
    };

    items = [];
    trayItens = [];
    edit = false;

    get allItens() { return [...this.items, ...this.trayItens]; }

    get root()          { return this.element.querySelector(".inv-root"); }
    get grid()          { return this.element.querySelector(".grid"); }
    get firstCellRect() { return this.grid.querySelector(".cell").getBoundingClientRect(); }
    get cellSize()      { return this.firstCellRect.width; }
    get actor()         { return game.user.character; }
    get tray()        { return this.element.querySelector(".tray"); }

    static async #toggleEdit(event, target) {
        if (this.edit) {
            this.items = this.allItens.filter(i => i.gridPos);  
            this.trayItens = [];                               
            this.edit = false;
            await this.saveItems();
        } else {
            this.edit = true;
        }
        this.render();
    }

    static async #spawnPiece(event, target) {
        const item = new InventoryItem(
            {
                uid: foundry.utils.randomID(),
                templateId: BUILTIN_IDS[Math.floor(Math.random() * BUILTIN_IDS.length)],
                gridPos: null,
            }, 
            this
        );
        this.trayItens.push(item);
        this.placeItem(item);
    }

    static #closeWindow() {
        this.close();
    }

    
    async _prepareContext(options) {
        const actor = this.actor;
        this.inventoryGrid = actor?.getFlag("grid-inventory", "slots") ?? DEFAULT_SLOTS;
        if (!this.edit) this.loadItems();
        return { 
            actorName: actor?.name ?? "No character",
            edit: this.edit,
            width: Math.max(...this.inventoryGrid.map(r => r.length)),
        };
    }

    _onRender(context, options) {
        this.element.classList.toggle("editing", this.edit);
        this.grid.replaceChildren();                  

        this.inventoryGrid.forEach((row, y) => {
            const rowElement = document.createElement("div");
            rowElement.classList.add("row")
            row.forEach((slot, x) => {
                const cell = document.createElement("div");
                cell.classList.add("cell");
                if (!slot) cell.classList.add("hole");
                cell.dataset.x = x;
                cell.dataset.y = y;
                rowElement.appendChild(cell);
                
            });
            this.grid.appendChild(rowElement);
        });

        for (const item of this.items) this.placeItem(item);
        if (this.edit) for (const item of this.trayItens) this.placeItem(item); 
        this.#setupDrag();
        this.setPosition({ width: "auto", height: "auto" });
    }  

    #setupDrag() {
        const handle = this.element.querySelector(".handle");
        if (!handle) return;

        let start = null;

        handle.addEventListener("pointerdown", (e) => {
            if (e.button !== 0) return;
            if (e.target.closest("button, input, a")) return;
            start = {
                px: e.clientX,
                py: e.clientY,
                left: this.position.left,
                top: this.position.top,
            };
            handle.setPointerCapture(e.pointerId);
            this.bringToFront();
        });

        handle.addEventListener("pointermove", (e) => {
            if (!start) return;
            this.setPosition({
                left: start.left + (e.clientX - start.px),
                top: start.top + (e.clientY - start.py),
            });
        });

        const end = (e) => {
            if (!start) return;
            start = null;
            handle.releasePointerCapture(e.pointerId);
        };
        handle.addEventListener("pointerup", end);
        handle.addEventListener("pointercancel", end);
    }

    loadItems() {
        const data = this.actor?.getFlag("grid-inventory", "items") ?? [];
        this.items = foundry.utils.deepClone(data).map(d => new InventoryItem(d, this));
    }
        
    async saveItems() {
        await this.actor.setFlag("grid-inventory", "items", this.items.map(i => i.getData()));
    }

    placeItem(item) {
        if (item.gridPos) {
            item.element.classList.add("placed");
            this.root.appendChild(item.element);
            item.snap();
        } else {
            item.element.classList.remove("placed");
            item.element.classList.add("onTray");
            this.tray?.appendChild(item.element);
        }
    }

    canPlace(item, cells) {
        const occupied = new Set();
        for (const other of this.allItens) {
            if (other === item || !other.gridPos) continue;
            for (const c of other.cellsAt(other.gridPos)) occupied.add(`${c.x},${c.y}`);
        }
        return cells.every(({ x, y }) => this.inventoryGrid[y]?.[x] && !occupied.has(`${x},${y}`));
    }

    highlight(cells, valid) {
        this.grid.querySelectorAll(".hover-ok, .hover-bad")
            .forEach(c => c.classList.remove("hover-ok", "hover-bad"));
        for (const { x, y } of cells) {
            this.grid.querySelector(`[data-x="${x}"][data-y="${y}"]`)
                ?.classList.add(valid ? "hover-ok" : "hover-bad");
        }
    }

}