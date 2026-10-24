class Rally {
    constructor(word, slotIndex, manager, initialWalkers, canvas) {
        this.word = word;
        this.slotIndex = slotIndex;
        this.manager = manager;
        this.duration = (typeof CONFIG !== 'undefined' && CONFIG.rally_duration) ? CONFIG.rally_duration : 30;
        this.timer = this.duration;
        this.members = [];
        this.isDispersing = false;
        this.disperseAnim = 1.0;

        const cWidth = canvas ? canvas.width : (window.innerWidth || 1920);
        const defaultSlots = (typeof CONFIG !== 'undefined' && CONFIG.rally_x_slots) ? CONFIG.rally_x_slots : [0.25, 0.50, 0.75];
        
        let targetX = cWidth * (defaultSlots[this.slotIndex] !== undefined ? defaultSlots[this.slotIndex] : 0.5);

        if (initialWalkers && initialWalkers.length > 0) {
            const maxX = Math.max(...initialWalkers.map(w => w.x));
            if (targetX < maxX + 120) {
                targetX = maxX + 160;
            }
        }

        const minDistance = 340;
        const existingRallies = manager.rallies.filter(r => !r.isDispersing);
        
        for (let i = 0; i < 5; i++) {
            let collides = false;
            for (const other of existingRallies) {
                if (Math.abs(targetX - other.baseX) < minDistance) {
                    collides = true;
                    if (targetX + minDistance <= cWidth - 200) {
                        targetX += minDistance;
                    } else if (targetX - minDistance >= 200) {
                        targetX -= minDistance;
                    }
                    break;
                }
            }
            if (!collides) break;
        }

        this.baseX = Math.max(180, Math.min(cWidth - 220, targetX));
    }

    areLeadersReady() {
        if (this.members.length < 2) return false;
        return Boolean(this.members[0].isAtRallyPoint && this.members[1].isAtRallyPoint);
    }

    addMember(walker) {
        if (!walker) return;
        if (!this.members.includes(walker)) {
            this.members.push(walker);
            walker.rally = this;
            walker.state = 'RALLYING';
            walker.isExhausted = true;
            walker.isAtRallyPoint = false;
            this.resetTimer();
        }
    }

    resetTimer() {
        if (!this.isDispersing) {
            this.timer = this.duration;
        }
    }

    update(dt) {
        if (!this.isDispersing) {
            if (this.areLeadersReady()) {
                this.timer -= dt;
                if (this.timer <= 0) {
                    this.disperse();
                }
            }
        } else {
            if (this.disperseAnim > 0) {
                this.disperseAnim -= dt * 2.5;
                if (this.disperseAnim <= 0) {
                    this.disperseAnim = 0;
                    this.members.forEach(m => {
                        m.state = 'WALKING';
                        m.rally = null;
                        m.isAtRallyPoint = false;
                    });
                }
            }
        }
    }

    disperse() {
        if (this.isDispersing) return;
        this.isDispersing = true;
        this.members.forEach(m => {
            m.isExhausted = true;
        });
    }

    getTargetPosition(memberIndex, canvas) {
        const cHeight = canvas ? canvas.height : (window.innerHeight || 1080);
        const yRatio = (typeof CONFIG !== 'undefined' && CONFIG.rally_y_ratio) ? CONFIG.rally_y_ratio : 0.76;
        const baseY = cHeight * yRatio;
        const baseX = this.baseX;

        if (memberIndex === 0) {
            return { x: baseX - 46, y: baseY, depthScale: 1.0, hasSign: true };
        } else if (memberIndex === 1) {
            return { x: baseX + 46, y: baseY, depthScale: 1.0, hasSign: true };
        } else if (memberIndex < 10) {
            const rank = memberIndex - 2;
            const side = (rank % 2 === 0) ? 1 : -1;
            const row = Math.floor(rank / 2);
            
            const offsetX = side * (32 + row * 26);
            const offsetY = -(14 + row * 8);
            const depthScale = Math.max(0.8, 1.0 - row * 0.05);

            return { 
                x: baseX + offsetX, 
                y: baseY + offsetY, 
                depthScale: depthScale,
                hasSign: true 
            };
        } else {
            const rank = memberIndex - 10;
            const hashX = ((rank * 37) % 120) - 60;
            const hashY = -34 - ((rank * 17) % 18);
            return { 
                x: baseX + hashX, 
                y: baseY + hashY, 
                depthScale: 0.72,
                hasSign: false 
            };
        }
    }
}

class RallyManager {
    constructor() {
        this.rallies = [];
        this.blacklist = new Set([
            'привет', 'всем', 'стрим', 'хай', 'ку', 'здарова', 'да', 'нет', 
            'что', 'как', 'это', 'тут', 'там', 'лол', 'кек', 'gg', 'wp',
            'protocol', 'initiate', 'confirm', 'system', 'node', 'ready'
        ]);
        this.ralliesEnabled = true;
        this.curfewActive = false;
        this.syncBlacklist();
    }

    syncBlacklist() {
        // Синхронизация без fetch, напрямую из подключенного media/blacklist.js
        if (window.BLACKLIST_WORDS && Array.isArray(window.BLACKLIST_WORDS)) {
            window.BLACKLIST_WORDS.forEach(w => {
                if (w && typeof w === 'string') {
                    this.blacklist.add(w.trim().toLowerCase());
                }
            });
        }
    }

    extractWords(message) {
        if (!message) return [];
        return String(message).toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'«»]/g, ' ')
            .split(/\s+/)
            .map(w => w.trim())
            .filter(w => w.length >= 3 && !this.blacklist.has(w));
    }

    handleCommand(text, isMod) {
        const clean = String(text).trim().toLowerCase();
        if (clean === 'расходимся все') {
            this.disperseAll();
            return true;
        }
        if (clean === 'митинги запрещены') {
            this.ralliesEnabled = false;
            this.disperseAll();
            return true;
        }
        if (clean === 'митинги разрешены') {
            this.ralliesEnabled = true;
            return true;
        }
        if (clean === 'комендантский час') {
            this.curfewActive = !this.curfewActive;
            return true;
        }
        return false;
    }

    disperseAll() {
        this.rallies.forEach(r => r.disperse());
    }

    checkSynergy(walkers, canvas) {
        if (!this.ralliesEnabled) return;

        const maxRallies = (typeof CONFIG !== 'undefined' && CONFIG.max_rallies) ? CONFIG.max_rallies : 3;

        for (const rally of this.rallies) {
            if (rally.isDispersing) continue;
            for (const walker of walkers) {
                if (walker.state === 'WALKING' && !walker.isDone && !walker.isExhausted) {
                    const words = this.extractWords(walker.message);
                    if (words.includes(rally.word)) {
                        rally.addMember(walker);
                    }
                }
            }
        }

        if (this.rallies.filter(r => !r.isDispersing).length < maxRallies) {
            let freeWalkers = walkers.filter(w => w.state === 'WALKING' && !w.isDone && !w.isExhausted && !w.rally);
            const wordMap = new Map();

            for (const walker of freeWalkers) {
                const words = this.extractWords(walker.message);
                for (const word of words) {
                    if (!this.rallies.some(r => r.word === word)) {
                        if (!wordMap.has(word)) wordMap.set(word, []);
                        wordMap.get(word).push(walker);
                    }
                }
            }

            for (const [word, matchingWalkers] of wordMap.entries()) {
                const availableForWord = matchingWalkers.filter(w => freeWalkers.includes(w) && !w.rally);

                if (availableForWord.length >= 2) {
                    const activeRallies = this.rallies.filter(r => !r.isDispersing);
                    const usedSlots = activeRallies.map(r => r.slotIndex);
                    const availableSlots = [0, 1, 2].filter(s => !usedSlots.includes(s));

                    if (availableSlots.length > 0) {
                        const w1 = availableForWord[0];
                        const w2 = availableForWord[1];

                        const newRally = new Rally(word, availableSlots[0], this, [w1, w2], canvas);
                        newRally.addMember(w1);
                        newRally.addMember(w2);
                        this.rallies.push(newRally);

                        freeWalkers = freeWalkers.filter(w => w !== w1 && w !== w2);

                        if (this.rallies.filter(r => !r.isDispersing).length >= maxRallies) break;
                    }
                }
            }
        }
    }

    update(dt) {
        for (let i = this.rallies.length - 1; i >= 0; i--) {
            const rally = this.rallies[i];
            rally.update(dt);
            if (rally.isDispersing && rally.disperseAnim <= 0) {
                this.rallies.splice(i, 1);
            }
        }
    }
}

window.Rally = Rally;
window.rallyManager = new RallyManager();