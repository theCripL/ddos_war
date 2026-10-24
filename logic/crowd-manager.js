class CrowdManager {
    constructor() {
        this.activeWalkers = new Map();
        this.queue = [];
    }

    addMessage(username, message, color, canvas) {
        if (!username) return;

        if (window.rallyManager && window.rallyManager.curfewActive) {
            return;
        }

        username = String(username).trim();
        message = message ? String(message).trim() : 'Всем привет!';

        if (this.activeWalkers.has(username) || this.queue.some(w => w.username === username)) {
            return;
        }

        const maxWalkers = (typeof CONFIG !== 'undefined' && CONFIG.max_walkers) ? CONFIG.max_walkers : 50;

        if (this.activeWalkers.size < maxWalkers) {
            this.activeWalkers.set(username, new window.Walker(username, message, color, canvas));
        } else {
            this.queue.push({ username, message, color });
        }
    }

    clear() {
        this.activeWalkers.clear();
        this.queue = [];
        if (window.rallyManager) window.rallyManager.disperseAll();
    }

    update(dt, canvas, ctx) {
        const walkersList = Array.from(this.activeWalkers.values());

        // Синергия слов
        if (window.rallyManager) {
            window.rallyManager.checkSynergy(walkersList, canvas);
            window.rallyManager.update(dt);
        }

        // Обновление событий донатов (стрелы, метеориты, троян)
        if (window.eventManager) {
            window.eventManager.update(dt, walkersList, window.rallyManager);
        }

        for (let [username, walker] of this.activeWalkers.entries()) {
            walker.update(dt, canvas, ctx);
            if (walker.isDone) {
                this.activeWalkers.delete(username);
                if (this.queue.length > 0 && !(window.rallyManager && window.rallyManager.curfewActive)) {
                    const next = this.queue.shift();
                    this.activeWalkers.set(next.username, new window.Walker(next.username, next.message, next.color, canvas));
                }
            }
        }
    }

    draw(ctx, canvas) {
        // Сортировка по Y для псевдо-3D
        const sorted = Array.from(this.activeWalkers.values()).sort((a, b) => a.y - b.y);
        sorted.forEach(w => w.draw(ctx));

        // Отрисовка плакатов митингов
        if (window.rallyManager && window.RallyRenderer) {
            window.RallyRenderer.drawRallies(ctx, window.rallyManager.rallies, canvas);
        }

        // Отрисовка эффектов донатов (поверх персонажей)
        if (window.eventManager) {
            window.eventManager.draw(ctx);
        }
    }
}

window.crowdManager = new CrowdManager();