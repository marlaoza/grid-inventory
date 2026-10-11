import { getTemplate } from "./templates.js";

export function rotateShape(shape) {
  const h = shape.length, w = shape[0].length;
  return Array.from({ length: w }, (_, y) =>
    Array.from({ length: h }, (_, x) => shape[h - 1 - x][y])
  );
}


export class InventoryItem {
    constructor(data, parent) {
        console.table(data);

        this.uid = data.uid;
        this.shape = data.shape ?? foundry.utils.deepClone(getTemplate(data.templateId)?.shape ?? [[1]]);
        this.templateId = data.templateId;

        this.gridPos = data.gridPos ?? null;

        this.rotation = data.rotation ?? 0;
        this.img = getTemplate(data.templateId)?.img ?? null;

        this.parent = parent;

        this.grab = null;        
        this.pointer = null;

        this.element = document.createElement("div");
        this.element.classList.add("piece");
        this.#render();
        this.element.addEventListener("pointerdown", this.#onPointerDown);
        this.element.addEventListener("pointermove", this.#onPointerMove);
        this.element.addEventListener("pointerup", this.#onPointerUp);
    }

    getData() {
        return { uid: this.uid, templateId: this.templateId, shape: this.shape, rotation: this.rotation, gridPos: this.gridPos };
    }

    #render() {
        this.element.replaceChildren();
        this.shape.forEach((row, y) => {
            const rowEl = document.createElement("div");
            rowEl.classList.add("row");
            row.forEach((v, x) => {
                const b = document.createElement("div");
                b.classList.add("block");
                if (!v) b.classList.add("hole");
                b.dataset.x = x;
                b.dataset.y = y;
                rowEl.appendChild(b);
            });
            this.element.appendChild(rowEl);
        });

        if (this.img) {
            const rows = this.shape.length, cols = this.shape[0].length;
            const odd = this.rotation % 2 === 1;
            const art = document.createElement("img");
            art.classList.add("art");
            art.src = this.img;
            art.draggable = false;
            art.style.setProperty("--iw", odd ? rows : cols);
            art.style.setProperty("--ih", odd ? cols : rows);
            art.style.setProperty("--rot", `${this.rotation * 90}deg`);
            this.element.appendChild(art);
        }

    }

    cellsAt(origin) {
        const cells = [];
        this.shape.forEach((row, y) => row.forEach((v, x) => {
            if (v) cells.push({ x: origin.x + x, y: origin.y + y });
        }));
        return cells;
    }

    #originFor(clientX, clientY) {
        const first = this.parent.firstCellRect;
        const cs = this.parent.cellSize;
        return {
            x: Math.floor((clientX - first.left) / cs) - this.grab.x,
            y: Math.floor((clientY - first.top) / cs) - this.grab.y,
        };
    }

    #rotate() {
        this.rotation = (this.rotation + 1) % 4;
        const h = this.shape.length;              
        this.grab = { x: h - 1 - this.grab.y, y: this.grab.x };
        this.shape = rotateShape(this.shape);
        this.#render();                     
        this.#update();
    }

    #placeAt(left, top) {
        this.element.style.left = `${left}px`;
        this.element.style.top = `${top}px`;
    }

    #rootOffset() {
        const root = this.parent.root;
        const r = root.getBoundingClientRect();
        return { x: r.left + root.clientLeft, y: r.top + root.clientTop };
    }

    #onKeyDown = (e) => {
        if (e.key.toLowerCase() !== "r" || !this.grab) return;
        e.preventDefault();
        e.stopPropagation();
        this.#rotate();
    };

    #onPointerDown = (e) => {
        const block = e.target.closest(".block");
        if (!block || block.classList.contains("hole")) return;
        if (!this.parent.edit) return;
        e.preventDefault();

        this.grab = { x: +block.dataset.x, y: +block.dataset.y };

        this.gridPos = null;         
        this.parent.root.appendChild(this.element); 
        this.element.setPointerCapture(e.pointerId);              
        this.element.setPointerCapture(e.pointerId);
        this.element.classList.add("dragging");
        this.element.classList.remove("placed");
        this.element.classList.remove("onTray");
        document.addEventListener("keydown", this.#onKeyDown, true);

        this.pointer = { x: e.clientX, y: e.clientY };
        this.#update();
    };

    #onPointerMove = (e) => {
        if (!this.grab) return;
        this.pointer = { x: e.clientX, y: e.clientY };
        this.#update();
    };

    #onPointerUp = (e) => {
        if (!this.grab) return;
        const origin = this.#originFor(e.clientX, e.clientY);
        
        if (this.parent.canPlace(this, this.cellsAt(origin))) {
            this.gridPos = origin;
            this.element.classList.add("placed");
            this.snap();
        } else {
            this.gridPos = null;      
        }

        this.grab = null;
        this.element.classList.remove("dragging");
        this.element.releasePointerCapture(e.pointerId);
        document.removeEventListener("keydown", this.#onKeyDown, true);
        this.parent.highlight([], true);
    };

    #update() {
        const cs = this.parent.cellSize;
        const off = this.#rootOffset();
        this.#placeAt(
            this.pointer.x - off.x - (this.grab.x + 0.5) * cs,
            this.pointer.y - off.y - (this.grab.y + 0.5) * cs
        );
        const cells = this.cellsAt(this.#originFor(this.pointer.x, this.pointer.y));
        this.parent.highlight(cells, this.parent.canPlace(this, cells));
    }

    snap() {
        if (!this.gridPos) return;
        const first = this.parent.firstCellRect;
        const cs = this.parent.cellSize;
        const off = this.#rootOffset();
        this.#placeAt(
            first.left - off.x + this.gridPos.x * cs,
            first.top - off.y + this.gridPos.y * cs
        );
    }


}