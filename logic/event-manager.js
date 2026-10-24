class Arrow {
    constructor(startX, startY, targetX, targetY) {
        this.x = startX;
        this.y = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        const dx = targetX - startX;
        const dy = targetY - startY;
        const dist = Math.hypot(dx, dy) || 1;
        this.speed = 950;
        this.vx = (dx / dist) * this.speed;
        this.vy = (dy / dist) * this.speed;
        this.angle = Math.atan2(dy, dx);
        this.isDone = false;
        this.length = 34;
    }

    update(dt, walkers) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        if (!Array.isArray(walkers)) return;

        for (const walker of walkers) {
            if (!walker) continue;
            if (walker.state !== 'DEAD' && walker.state !== 'DYING' && walker.state !== 'DISCONNECTED') {
                const s = (walker.size || 65) / 100;
                const headY = walker.y - 45 * s;
                const distToWalker = Math.hypot(this.x - walker.x, this.y - headY);
                if (distToWalker < 30 * s) {
                    this.isDone = true;
                    if (typeof walker.kill === 'function') {
                        walker.kill('ARROW');
                    }
                    return;
                }
            }
        }

        if (this.y > 1400 || this.x < -200 || this.x > 2400) {
            this.isDone = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // 1. Древко стрелы (коричневая центральная часть)
        ctx.strokeStyle = '#8B5A2B';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-this.length + 8, 0);
        ctx.lineTo(0, 0);
        ctx.stroke();

        // 2. Белое оперение сзади
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(-this.length + 8, 0);
        ctx.lineTo(-this.length + 1, -5);
        ctx.lineTo(-this.length - 4, -5);
        ctx.lineTo(-this.length - 1, 0);
        ctx.lineTo(-this.length - 4, 5);
        ctx.lineTo(-this.length + 1, 5);
        ctx.closePath();
        ctx.fill();

        // 3. Серый металлический наконечник спереди
        ctx.fillStyle = '#95A5A6';
        ctx.strokeStyle = '#7F8C8D';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(0, -4);
        ctx.lineTo(-1, 0);
        ctx.lineTo(0, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
}

class Meteor {
    constructor(canvas) {
        this.canvas = canvas;
        const cWidth = canvas ? canvas.width : 1920;
        const cHeight = canvas ? canvas.height : 1080;

        // Увеличено на 40% (0.25 * 1.4 = 0.35)
        this.width = cWidth * 0.35;
        this.targetX = Math.random() * (cWidth - this.width) + this.width / 2;
        this.targetY = cHeight * 0.86;

        // Пропорционально увеличенная стартовая траектория падения
        this.startX = this.targetX - 588; // 420 * 1.4
        this.startY = -364;              // 260 * 1.4
        this.x = this.startX;
        this.y = this.startY;

        this.speed = 1250;
        this.vx = 588 * (this.speed / 1000);
        this.vy = this.speed;

        this.angle = Math.atan2(this.targetY - this.startY, this.targetX - this.startX);

        this.isExploded = false;
        this.isDone = false;
        this.blastRadius = this.width / 2; // Автоматически +40%
        this.blastAnim = 0;

        // Хвост и частицы
        this.trailHistory = [];
        this.sparks = [];
        this.shockwaves = [];
        
        // Рунический прицел на земле
        this.runeAngle = 0;
        this.runeAlpha = 1.0;
        this.flashAlpha = 0;
    }

    update(dt, walkers, rallyManager) {
        this.runeAngle += dt * 2.5;

        if (!this.isExploded) {
            // Движение к цели
            this.x += (this.targetX - this.startX) * (this.speed / 1100) * dt;
            this.y += (this.targetY - this.startY) * (this.speed / 1100) * dt;

            // Шлейф
            this.trailHistory.unshift({ x: this.x, y: this.y });
            if (this.trailHistory.length > 32) {
                this.trailHistory.pop();
            }

            // Микро-искры во время полёта (размеры увеличены на 40%)
            if (Math.random() < 0.6) {
                this.sparks.push({
                    x: this.x + (Math.random() * 28 - 14),
                    y: this.y + (Math.random() * 28 - 14),
                    vx: -Math.cos(this.angle) * (Math.random() * 200 + 100) + (Math.random() * 60 - 30),
                    vy: -Math.sin(this.angle) * (Math.random() * 200 + 100) + (Math.random() * 60 - 30),
                    size: (Math.random() * 3 + 1.5) * 1.4, // +40%
                    color: Math.random() > 0.3 ? '#FF9900' : '#FF2A55',
                    alpha: 1.0,
                    gravity: 120
                });
            }

            // Достижение земли
            if (this.y >= this.targetY) {
                this.isExploded = true;
                this.x = this.targetX;
                this.y = this.targetY;
                this.flashAlpha = 1.0;

                // Ударные волны (толщина и стартовый радиус увеличены на 40%)
                this.shockwaves.push({ radius: 14, maxRadius: this.blastRadius * 1.35, color: '#FF3300', width: 20, alpha: 1.0 });
                this.shockwaves.push({ radius: 7, maxRadius: this.blastRadius * 0.9, color: '#FFE600', width: 11, alpha: 1.0 });

                // Сноп искр и раскалённых обломков при детонации (размеры +40%)
                for (let i = 0; i < 42; i++) {
                    const spd = Math.random() * 620 + 140;
                    const a = Math.random() * Math.PI * 2;
                    this.sparks.push({
                        x: this.targetX,
                        y: this.targetY,
                        vx: Math.cos(a) * spd,
                        vy: Math.sin(a) * spd * 0.45 - (Math.random() * 320 + 90),
                        size: (Math.random() * 4.5 + 2) * 1.4, // +40% (2.8 - 6.3px)
                        color: Math.random() > 0.4 ? (Math.random() > 0.5 ? '#FF2A55' : '#FF7700') : '#FFE600',
                        alpha: 1.0,
                        gravity: 520
                    });
                }

                // Урон стикменам
                if (Array.isArray(walkers)) {
                    walkers.forEach(w => {
                        if (w && Math.abs(w.x - this.targetX) < this.blastRadius * 1.15) {
                            if (typeof w.kill === 'function') w.kill('METEOR');
                        }
                    });
                }

                // Разгон митингов
                if (rallyManager && Array.isArray(rallyManager.rallies)) {
                    rallyManager.rallies.forEach(r => {
                        if (r && Math.abs(r.baseX - this.targetX) < this.blastRadius * 1.25) {
                            if (typeof r.disperse === 'function') r.disperse();
                        }
                    });
                }
            }
        } else {
            // Анимация взрыва
            this.blastAnim += dt * 1.9;
            this.runeAlpha = Math.max(0, 1 - this.blastAnim * 1.8);
            this.flashAlpha = Math.max(0, this.flashAlpha - dt * 3.5);

            if (this.trailHistory.length > 0) {
                this.trailHistory.splice(0, 3);
            }

            // Обновление ударных волн
            this.shockwaves.forEach(sw => {
                sw.radius += (sw.maxRadius - sw.radius) * dt * 9;
                sw.alpha -= dt * 1.7;
            });

            if (this.blastAnim >= 1.0 && this.sparks.length === 0) {
                this.isDone = true;
            }
        }

        // Обновление частиц искр
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const p = this.sparks[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += p.gravity * dt;
            p.alpha -= dt * (this.isExploded ? 1.4 : 2.5);

            if (p.alpha <= 0) {
                this.sparks.splice(i, 1);
            }
        }
    }

    draw(ctx) {
        ctx.save();

        const baseRadius = this.width / 4.4; // Базовый радиус (+40% за счет ширины)

        // 1. МАГИЧЕСКИЙ РУНИЧЕСКИЙ ПРИЦЕЛ НА ЗЕМЛЕ (AOE Ring +40%)
        if (this.runeAlpha > 0) {
            ctx.save();
            ctx.translate(this.targetX, this.targetY);
            ctx.scale(1, 0.35);
            ctx.globalAlpha = this.runeAlpha * 0.85;

            ctx.shadowColor = '#FF0055';
            ctx.shadowBlur = 24;
            ctx.strokeStyle = '#FF2A55';
            ctx.lineWidth = 4.2; // 3 * 1.4

            // Внешний круг
            ctx.beginPath();
            ctx.arc(0, 0, this.blastRadius * 0.95, 0, Math.PI * 2);
            ctx.stroke();

            // Внутренний концентрический круг
            ctx.beginPath();
            ctx.arc(0, 0, this.blastRadius * 0.55, 0, Math.PI * 2);
            ctx.stroke();

            // Вращающиеся риски прицела
            ctx.save();
            ctx.rotate(this.runeAngle);
            ctx.lineWidth = 3.5; // 2.5 * 1.4
            for (let i = 0; i < 4; i++) {
                ctx.rotate(Math.PI / 2);
                ctx.beginPath();
                ctx.moveTo(this.blastRadius * 0.35, 0);
                ctx.lineTo(this.blastRadius * 1.1, 0);
                ctx.stroke();
            }
            ctx.restore();

            ctx.restore();
        }

        // 2. ПЛАЗМЕННЫЙ ХВОСТ ПОЛЁТА (+40%)
        for (let i = 0; i < this.trailHistory.length; i++) {
            const pt = this.trailHistory[i];
            const ratio = 1 - (i / this.trailHistory.length);
            const r = baseRadius * (0.4 + ratio * 0.75);

            ctx.save();
            ctx.globalAlpha = ratio * 0.6;
            ctx.shadowColor = '#FF2A00';
            ctx.shadowBlur = 22;

            const grad = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r * 1.4);
            grad.addColorStop(0, '#FFFFFF');
            grad.addColorStop(0.25, '#FFE600');
            grad.addColorStop(0.65, '#FF3300');
            grad.addColorStop(1, 'rgba(255, 42, 85, 0)');

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, r * 1.4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 3. САМ МЕТЕОРИТ ДО ВЗРЫВА (+40%)
        if (!this.isExploded) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);

            // Огненная аура
            ctx.shadowColor = '#FF0033';
            ctx.shadowBlur = 42;

            // Внешняя магматическая корона
            ctx.fillStyle = '#FF2A00';
            ctx.beginPath();
            ctx.ellipse(0, 0, baseRadius * 1.25, baseRadius * 0.85, 0, 0, Math.PI * 2);
            ctx.fill();

            // Раскалённое ядро
            ctx.fillStyle = '#FFCC00';
            ctx.beginPath();
            ctx.ellipse(baseRadius * 0.15, 0, baseRadius * 0.85, baseRadius * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();

            // Ослепительный центр (White-Hot Core)
            ctx.fillStyle = '#FFFFFF';
            ctx.shadowColor = '#FFE600';
            ctx.shadowBlur = 22;
            ctx.beginPath();
            ctx.ellipse(baseRadius * 0.25, 0, baseRadius * 0.45, baseRadius * 0.3, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

        // 4. ДЕТОНАЦИЯ, УДАРНЫЕ ВОЛНЫ И СТОЛБ ПЛАЗМЫ (+40%)
        if (this.isExploded) {
            ctx.save();
            ctx.translate(this.targetX, this.targetY);

            // Вспышка на весь эпицентр
            if (this.flashAlpha > 0) {
                ctx.save();
                ctx.scale(1, 0.4);
                ctx.globalAlpha = this.flashAlpha * 0.7;
                ctx.fillStyle = '#FFF5B8';
                ctx.shadowColor = '#FFE600';
                ctx.shadowBlur = 55;
                ctx.beginPath();
                ctx.arc(0, 0, this.blastRadius * 1.2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            // Кольца ударной волны
            this.shockwaves.forEach(sw => {
                if (sw.alpha <= 0) return;
                ctx.save();
                ctx.scale(1, 0.38);
                ctx.globalAlpha = Math.max(0, sw.alpha);
                ctx.strokeStyle = sw.color;
                ctx.lineWidth = sw.width * (1 - this.blastAnim * 0.5);
                ctx.shadowColor = sw.color;
                ctx.shadowBlur = 32;

                ctx.beginPath();
                ctx.arc(0, 0, sw.radius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            });

            // Огненный столб взрыва (Вторичная детонация вверх +40%)
            const columnHeight = (this.blastRadius * 2.52) * Math.sin(this.blastAnim * Math.PI); // 1.8 * 1.4 = 2.52
            const columnWidth = this.blastRadius * (1 - this.blastAnim * 0.4);
            const colAlpha = Math.max(0, 1 - this.blastAnim);

            if (columnHeight > 0) {
                ctx.save();
                ctx.globalAlpha = colAlpha * 0.85;
                const fireGrad = ctx.createLinearGradient(0, 0, 0, -columnHeight);
                fireGrad.addColorStop(0, 'rgba(255, 240, 150, 0.95)');
                fireGrad.addColorStop(0.35, 'rgba(255, 100, 0, 0.8)');
                fireGrad.addColorStop(0.8, 'rgba(255, 20, 50, 0.4)');
                fireGrad.addColorStop(1, 'rgba(120, 0, 0, 0)');

                ctx.fillStyle = fireGrad;
                ctx.shadowColor = '#FF3300';
                ctx.shadowBlur = 40;

                ctx.beginPath();
                ctx.moveTo(-columnWidth * 0.5, 0);
                ctx.quadraticCurveTo(-columnWidth * 0.3, -columnHeight * 0.6, 0, -columnHeight);
                ctx.quadraticCurveTo(columnWidth * 0.3, -columnHeight * 0.6, columnWidth * 0.5, 0);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            }

            ctx.restore();
        }

        // 5. ИСКРЫ И ОСКОЛКИ
        for (const p of this.sparks) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, p.alpha);
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 11;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }
}

class TrojanHorse {
    constructor(canvas) {
        this.canvas = canvas;
        const cWidth = canvas ? canvas.width : 1920;
        const cHeight = canvas ? canvas.height : 1080;
        this.x = cWidth / 2;
        this.y = -350;
        this.targetY = cHeight * 0.76;
        this.isLanded = false;
        this.timer = 1.0;
        this.fadeAlpha = 1.0;
        this.isDone = false;
        this.scale = 0.95;
    }

    update(dt, walkers, rallyManager) {
        if (!this.isLanded) {
            this.y += 680 * dt;
            if (this.y >= this.targetY) {
                this.y = this.targetY;
                this.isLanded = true;
                if (rallyManager && typeof rallyManager.disperseAll === 'function') {
                    rallyManager.disperseAll();
                }
                if (Array.isArray(walkers)) {
                    walkers.forEach(w => {
                        if (w && typeof w.triggerDisconnect === 'function') {
                            w.triggerDisconnect();
                        }
                    });
                }
            }
        } else {
            this.timer -= dt;
            if (this.timer <= 0) {
                this.fadeAlpha -= dt * 3.5;
                if (this.fadeAlpha <= 0) {
                    this.fadeAlpha = 0;
                    this.isDone = true;
                }
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        ctx.globalAlpha = Math.max(0, this.fadeAlpha);

        ctx.shadowColor = '#00F0FF';
        ctx.shadowBlur = 15;
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#00F0FF';
        ctx.fillStyle = 'rgba(6, 18, 30, 0.94)';

        // 1. Хвост
        ctx.beginPath();
        ctx.moveTo(-95, -120);
        ctx.lineTo(-135, -95);
        ctx.lineTo(-135, -20);
        ctx.lineTo(-110, -20);
        ctx.lineTo(-110, -75);
        ctx.lineTo(-90, -95);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(-135, -60); ctx.lineTo(-110, -60);
        ctx.moveTo(-125, -95); ctx.lineTo(-125, -20);
        ctx.stroke();

        // 2. Корпус
        ctx.beginPath();
        ctx.moveTo(-90, -120);
        ctx.lineTo(20, -120);
        ctx.lineTo(20, -45);
        ctx.lineTo(-45, -45);
        ctx.lineTo(-70, -28);
        ctx.lineTo(-90, -70);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#00A3B5';
        for (let xOff = -70; xOff <= 10; xOff += 18) {
            ctx.beginPath();
            ctx.moveTo(xOff, -120);
            ctx.lineTo(xOff, -45);
            ctx.stroke();
        }

        // 3. Шея и грива
        ctx.strokeStyle = '#00F0FF';
        ctx.beginPath();
        ctx.moveTo(15, -120);
        ctx.lineTo(60, -180);
        ctx.lineTo(95, -165);
        ctx.lineTo(55, -80);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(15, -120);
        ctx.lineTo(60, -180);
        ctx.lineTo(75, -170);
        ctx.lineTo(30, -110);
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 240, 255, 0.25)';
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(6, 18, 30, 0.94)';

        // 4. Голова и морда
        ctx.beginPath();
        ctx.moveTo(60, -180);
        ctx.lineTo(95, -165);
        ctx.lineTo(105, -180);
        ctx.lineTo(112, -155);
        ctx.lineTo(95, -95);
        ctx.lineTo(80, -95);
        ctx.lineTo(75, -125);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.strokeStyle = '#00A3B5';
        ctx.beginPath();
        ctx.moveTo(85, -145); ctx.lineTo(105, -145);
        ctx.moveTo(82, -130); ctx.lineTo(100, -130);
        ctx.moveTo(80, -115); ctx.lineTo(95, -115);
        ctx.stroke();

        // 5. Ноги
        ctx.strokeStyle = '#00F0FF';
        ctx.beginPath();
        ctx.moveTo(-80, -45);
        ctx.lineTo(-85, 30);
        ctx.lineTo(-65, 30);
        ctx.lineTo(-60, -45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(25, -45);
        ctx.lineTo(25, 30);
        ctx.lineTo(45, 30);
        ctx.lineTo(45, -45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 6. Платформа и колеса
        ctx.fillStyle = 'rgba(8, 26, 42, 0.96)';
        ctx.fillRect(-115, 30, 195, 24);
        ctx.strokeRect(-115, 30, 195, 24);

        const wheelXs = [-85, -40, 20, 60];
        wheelXs.forEach(wx => {
            ctx.fillStyle = '#00F0FF';
            ctx.beginPath();
            ctx.arc(wx, 54, 18, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#05111B';
            ctx.beginPath();
            ctx.arc(wx, 54, 10, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#00FFA3';
            ctx.beginPath();
            ctx.arc(wx, 54, 4, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.font = 'bold 15px "Share Tech Mono", monospace';
        ctx.fillStyle = '#FF2A55';
        ctx.shadowColor = '#FF2A55';
        ctx.shadowBlur = 10;
        ctx.textAlign = 'center';
        ctx.fillText('MALWARE INJECTED: TROJAN.EXE', -15, -70);

        ctx.restore();
    }
}

class EventManager {
    constructor() {
        this.arrows = [];
        this.meteors = [];
        this.trojans = [];
    }

    triggerDonation(amountRub, donorName = 'Аноним') {
        const amount = Number(amountRub) || 0;
        const canvas = document.getElementById('overlayCanvas');
        const trojanMin = (typeof CONFIG !== 'undefined' && CONFIG.trojan_min_rub) ? CONFIG.trojan_min_rub : 5000;
        const meteorMin = (typeof CONFIG !== 'undefined' && CONFIG.meteor_min_rub) ? CONFIG.meteor_min_rub : 500;
        const arrowCost = (typeof CONFIG !== 'undefined' && CONFIG.arrow_cost_rub) ? CONFIG.arrow_cost_rub : 10;

        if (amount >= trojanMin) {
            if (window.soundManager && typeof window.soundManager.play === 'function') {
                window.soundManager.play('trojan');
            }
            this.trojans.push(new TrojanHorse(canvas));
        } else if (amount >= meteorMin) {
            if (window.soundManager && typeof window.soundManager.play === 'function') {
                window.soundManager.play('meteor');
            }
            this.meteors.push(new Meteor(canvas));
        } else {
            const count = Math.max(1, Math.floor(amount / arrowCost));
            if (window.soundManager && typeof window.soundManager.play === 'function') {
                window.soundManager.play('arrows');
            }
            this.spawnArrows(count, canvas);
        }
    }

    spawnArrows(count, canvas) {
        const cWidth = canvas ? canvas.width : 1920;
        const cHeight = canvas ? canvas.height : 1080;
        const yRatio = (typeof CONFIG !== 'undefined' && CONFIG.rally_y_ratio) ? CONFIG.rally_y_ratio : 0.76;

        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const fromLeft = Math.random() > 0.5;
                const startX = fromLeft ? -40 : cWidth + 40;
                const startY = Math.random() * (cHeight * 0.4);
                const targetX = Math.random() * (cWidth * 0.8) + (cWidth * 0.1);
                const targetY = cHeight * yRatio + (Math.random() * 80 - 40);

                this.arrows.push(new Arrow(startX, startY, targetX, targetY));
            }, i * 130);
        }
    }

    update(dt, walkers, rallyManager) {
        for (let i = this.arrows.length - 1; i >= 0; i--) {
            const arrow = this.arrows[i];
            arrow.update(dt, walkers);
            if (arrow.isDone) this.arrows.splice(i, 1);
        }

        for (let i = this.meteors.length - 1; i >= 0; i--) {
            const meteor = this.meteors[i];
            meteor.update(dt, walkers, rallyManager);
            if (meteor.isDone) this.meteors.splice(i, 1);
        }

        for (let i = this.trojans.length - 1; i >= 0; i--) {
            const trojan = this.trojans[i];
            trojan.update(dt, walkers, rallyManager);
            if (trojan.isDone) this.trojans.splice(i, 1);
        }
    }

    draw(ctx) {
        this.trojans.forEach(t => t.draw(ctx));
        this.meteors.forEach(m => m.draw(ctx));
        this.arrows.forEach(a => a.draw(ctx));
    }
}

window.eventManager = new EventManager();