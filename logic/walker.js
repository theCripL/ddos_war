class Walker {
    constructor(username, message, color, canvas) {
        const maxNick = (typeof CONFIG !== 'undefined' && CONFIG.max_nick_length) ? CONFIG.max_nick_length : 10;
        this.rawNick = username || 'Зритель';
        this.username = this.rawNick.length > maxNick ? this.rawNick.slice(0, maxNick) : this.rawNick;
        
        this.message = message || 'Всем привет!';
        this.color = color || this.getRandomColor();
        this.speed = (typeof CONFIG !== 'undefined' && CONFIG.walker_speed) ? CONFIG.walker_speed : 100;
        this.baseSize = (typeof CONFIG !== 'undefined' && CONFIG.walker_size) ? CONFIG.walker_size : 65;
        this.size = this.baseSize;
        this.walkPhase = Math.random() * Math.PI * 2;
        this.isDone = false;

        // Состояния: 'WALKING' | 'RALLYING' | 'DYING' | 'DISCONNECTING'
        this.state = 'WALKING';
        this.rally = null;
        this.isAtRallyPoint = false;
        this.isExhausted = false;

        // Анимации урона и смерти
        this.deathAnim = 0;
        this.deathType = null;
        this.matrixGlitch = 0;

        // Анти-зависание (Watchdog Timer): гарантированный срок жизни вне митинга
        this.lifeTime = 0;
        this.maxIdleTime = 75; // 75 секунд максимум для прохода

        this.scrollOffset = 0;
        this.scrollSpeed = (typeof CONFIG !== 'undefined' && CONFIG.scroll_speed) ? CONFIG.scroll_speed : 45;
        this.isLongMessage = this.message.length > ((typeof CONFIG !== 'undefined' && CONFIG.max_msg_length) ? CONFIG.max_msg_length : 15);

        this.bottomOffset = this.getRandomBottomOffset();
        this.y = (canvas ? canvas.height : window.innerHeight) - this.bottomOffset;

        const estimatedBubbleHalfWidth = 250;
        this.x = -(estimatedBubbleHalfWidth + 60);
    }

    getRandomBottomOffset() {
        const minOffset = 0;
        const maxOffset = 80;
        return Math.random() * (maxOffset - minOffset) + minOffset;
    }

    getRandomColor() {
        const palette = ['#00F0FF', '#00C8D6', '#00FFA3', '#2ED573', '#FF2A55', '#70A1FF', '#ECCC68'];
        return palette[Math.floor(Math.random() * palette.length)];
    }

    kill(type = 'ARROW') {
        if (this.state === 'DYING' || this.isDone) return;
        this.state = 'DYING';
        this.deathType = type;
        this.deathAnim = 0;
        if (this.rally) {
            const idx = this.rally.members.indexOf(this);
            if (idx !== -1) this.rally.members.splice(idx, 1);
        }
    }

    triggerDisconnect() {
        if (this.state === 'DYING' || this.isDone) return;
        this.state = 'DISCONNECTING';
        this.message = 'DISCONNECTED';
        this.matrixGlitch = 0;
        if (this.rally) {
            this.rally = null;
            this.isAtRallyPoint = false;
        }
    }

    update(dt, canvas, ctx) {
        this.lifeTime += dt;

        // Если сработал Watchdog против зависания
        if (this.lifeTime > this.maxIdleTime && this.state === 'WALKING') {
            this.x += this.speed * 2 * dt;
        }

        // АНИМАЦИЯ СМЕРТИ
        if (this.state === 'DYING') {
            this.deathAnim += dt * 2.5;
            if (this.deathAnim >= 1.0) {
                this.isDone = true;
            }
            return;
        }

        // АНИМАЦИЯ МАТРИЧНОГО ОТКЛЮЧЕНИЯ (ТРОЯН)
        if (this.state === 'DISCONNECTING') {
            this.matrixGlitch += dt * 0.7;
            this.y -= 15 * dt; // Слегка поднимаются вверх
            if (this.matrixGlitch >= 1.0) {
                this.isDone = true;
            }
            return;
        }

        if (this.state === 'RALLYING' && this.rally) {
            const memberIdx = this.rally.members.indexOf(this);
            const target = this.rally.getTargetPosition(memberIdx, canvas);

            const targetSize = this.baseSize * (target.depthScale || 1.0);
            this.size += (targetSize - this.size) * 5 * dt;

            const dx = target.x - this.x;
            const dy = target.y - this.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 6) {
                this.isAtRallyPoint = false;
                const moveX = Math.max(0, dx);
                const dirX = moveX > 0 ? 1 : 0;
                const dirY = Math.sign(dy);

                this.x += dirX * this.speed * 1.25 * dt;
                if (Math.abs(dy) > 2) {
                    this.y += dirY * Math.min(Math.abs(dy), this.speed * dt);
                }
                this.walkPhase += 8 * dt;
            } else {
                this.x = target.x;
                this.y = target.y;
                this.isAtRallyPoint = true;
                this.walkPhase += 2.5 * dt;
            }

            const leadersReady = (this.rally && typeof this.rally.areLeadersReady === 'function') ? this.rally.areLeadersReady() : false;
            const isWaitingLeader = memberIdx < 2 && !leadersReady;
            if ((!this.isAtRallyPoint || isWaitingLeader) && this.isLongMessage) {
                this.scrollOffset += this.scrollSpeed * dt;
            }
        } else {
            // Обычная ходьба слева направо
            this.isAtRallyPoint = false;
            this.x += this.speed * dt;
            this.walkPhase += 8 * dt;

            this.size += (this.baseSize - this.size) * 4 * dt;

            const targetY = canvas.height - this.bottomOffset;
            if (Math.abs(this.y - targetY) > 2) {
                this.y += Math.sign(targetY - this.y) * 45 * dt;
            } else {
                this.y = targetY;
            }

            if (this.isLongMessage) {
                this.scrollOffset += this.scrollSpeed * dt;
            }

            let bubbleHalfWidth = 200;
            if (window.TextRenderer && typeof window.TextRenderer.getBubbleWidth === 'function') {
                bubbleHalfWidth = window.TextRenderer.getBubbleWidth(ctx, this) / 2;
            }

            // УДАЛЕНИЕ ЗА ПРАВЫМ КРАЕМ (ИСПРАВЛЕН БАГ ВЕЧНОЙ ЖИЗНИ)
            if (this.x > canvas.width + bubbleHalfWidth + 60) {
                this.isDone = true;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);

        // 1. ОТРИСОВКА СМЕРТИ (РАЗВАЛ НА КИБЕР-ЧАСТИЦЫ)
        if (this.state === 'DYING') {
            const p = this.deathAnim;
            ctx.strokeStyle = '#FF2A55';
            ctx.shadowColor = '#FF2A55';
            ctx.shadowBlur = 12;
            ctx.lineWidth = 2.5;

            // Голова улетает вверх
            ctx.beginPath();
            ctx.arc(0, -58 - p * 60, 9, 0, Math.PI * 2);
            ctx.stroke();

            // Руки и ноги разлетаются в стороны
            ctx.beginPath();
            ctx.moveTo(-p * 50, -40 - p * 20);
            ctx.lineTo(-p * 70, -20 + p * 30);
            ctx.moveTo(p * 50, -40 - p * 20);
            ctx.lineTo(p * 70, -20 + p * 30);
            ctx.stroke();

            ctx.restore();
            return;
        }

        // 2. ОТРИСОВКА МАТРИЧНОГО ДИСКОННЕКТА (ТРОЯН)
        if (this.state === 'DISCONNECTING') {
            const alpha = Math.max(0, 1 - this.matrixGlitch);
            ctx.globalAlpha = alpha;

            // Рисуем цифровые зеленые и бирюзовые полоски
            ctx.fillStyle = '#00FFA3';
            ctx.shadowColor = '#00FFA3';
            ctx.shadowBlur = 8;
            for (let i = 0; i < 6; i++) {
                const stripY = -70 + i * 15;
                const stripW = Math.random() * 40 + 10;
                ctx.fillRect(-stripW / 2, stripY, stripW, 2.5);
            }

            // Баббл с надписью DISCONNECTED
            if (window.TextRenderer) {
                this.color = '#FF2A55';
                window.TextRenderer.drawBubble(ctx, this, this.size / 100);
            }

            ctx.restore();
            return;
        }

        // 3. СТАНДАРТНАЯ ОТРИСОВКА ПЕРСОНАЖА
        const s = this.size / 100;
        const swing = (this.state === 'RALLYING' && this.isAtRallyPoint) ? Math.sin(this.walkPhase) * 0.15 : Math.sin(this.walkPhase);

        ctx.lineWidth = 3.5 * s;
        ctx.strokeStyle = this.color;
        ctx.fillStyle = this.color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Торс
        ctx.beginPath();
        ctx.moveTo(0, -48 * s);
        ctx.lineTo(0, -18 * s);
        ctx.stroke();

        // Голова
        ctx.beginPath();
        ctx.arc(0, -58 * s, 9 * s, 0, Math.PI * 2);
        ctx.fill();

        // Ноги с коленями
        const hipY = -18 * s;
        const legLen1 = 15 * s;
        const legLen2 = 15 * s;

        const lHipAngle = swing * 0.7;
        const lKneeAngle = lHipAngle > 0 ? lHipAngle * 0.85 : 0.15;
        const lKneeX = Math.sin(lHipAngle) * legLen1;
        const lKneeY = hipY + Math.cos(lHipAngle) * legLen1;
        const lFootX = lKneeX + Math.sin(lHipAngle - lKneeAngle) * legLen2;
        const lFootY = lKneeY + Math.cos(lHipAngle - lKneeAngle) * legLen2;

        ctx.beginPath();
        ctx.moveTo(0, hipY);
        ctx.lineTo(lKneeX, lKneeY);
        ctx.lineTo(lFootX, lFootY);
        ctx.stroke();

        const rHipAngle = -swing * 0.7;
        const rKneeAngle = rHipAngle > 0 ? rHipAngle * 0.85 : 0.15;
        const rKneeX = Math.sin(rHipAngle) * legLen1;
        const rKneeY = hipY + Math.cos(rHipAngle) * legLen1;
        const rFootX = rKneeX + Math.sin(rHipAngle - rKneeAngle) * legLen2;
        const rFootY = rKneeY + Math.cos(rHipAngle - rKneeAngle) * legLen2;

        ctx.beginPath();
        ctx.moveTo(0, hipY);
        ctx.lineTo(rKneeX, rKneeY);
        ctx.lineTo(rFootX, rFootY);
        ctx.stroke();

        // Руки с локтями
        const shoulderY = -42 * s;
        const armLen1 = 14 * s;
        const armLen2 = 13 * s;

        const memberIdx = (this.state === 'RALLYING' && this.rally) ? this.rally.members.indexOf(this) : -1;
        const leadersReady = (this.rally && typeof this.rally.areLeadersReady === 'function') ? this.rally.areLeadersReady() : false;

        const isHoldingBigBanner = this.state === 'RALLYING' && this.isAtRallyPoint && memberIdx < 2 && leadersReady;
        const isHoldingSignAlone = this.state === 'RALLYING' && this.isAtRallyPoint && memberIdx >= 2 && memberIdx < 10;

        if (isHoldingBigBanner) {
            const bounce = Math.sin(this.walkPhase) * 2 * s;
            ctx.beginPath();
            ctx.moveTo(0, shoulderY);
            ctx.lineTo(-6 * s, shoulderY - 14 * s + bounce);
            ctx.lineTo(0, shoulderY - 28 * s + bounce);
            ctx.moveTo(0, shoulderY);
            ctx.lineTo(6 * s, shoulderY - 14 * s + bounce);
            ctx.lineTo(0, shoulderY - 28 * s + bounce);
            ctx.stroke();
        } else if (isHoldingSignAlone) {
            const bounce = Math.sin(this.walkPhase) * 1.5 * s;
            const midBodyY = -32 * s;

            ctx.beginPath();
            ctx.moveTo(0, shoulderY);
            ctx.lineTo(-10 * s, shoulderY + 4 * s + bounce);
            ctx.lineTo(0, midBodyY - 8 * s + bounce);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, shoulderY);
            ctx.lineTo(10 * s, shoulderY + 8 * s + bounce);
            ctx.lineTo(0, midBodyY + bounce);
            ctx.stroke();
        } else {
            const isWaitingStand = (this.state === 'RALLYING' && this.isAtRallyPoint && memberIdx < 2 && !leadersReady);
            const curSwing = isWaitingStand ? 0 : swing;

            const lShoulderAngle = -curSwing * 0.65;
            const lElbowBend = 0.45;
            const lElbowX = Math.sin(lShoulderAngle) * armLen1;
            const lElbowY = shoulderY + Math.cos(lShoulderAngle) * armLen1;
            const lHandX = lElbowX + Math.sin(lShoulderAngle + lElbowBend) * armLen2;
            const lHandY = lElbowY + Math.cos(lShoulderAngle + lElbowBend) * armLen2;

            ctx.beginPath();
            ctx.moveTo(0, shoulderY);
            ctx.lineTo(lElbowX, lElbowY);
            ctx.lineTo(lHandX, lHandY);
            ctx.stroke();

            const rShoulderAngle = curSwing * 0.65;
            const rElbowBend = 0.45;
            const rElbowX = Math.sin(rShoulderAngle) * armLen1;
            const rElbowY = shoulderY + Math.cos(rShoulderAngle) * armLen1;
            const rHandX = rElbowX + Math.sin(rShoulderAngle + rElbowBend) * armLen2;
            const rHandY = rElbowY + Math.cos(rShoulderAngle + rElbowBend) * armLen2;

            ctx.beginPath();
            ctx.moveTo(0, shoulderY);
            ctx.lineTo(rElbowX, rElbowY);
            ctx.lineTo(rHandX, rHandY);
            ctx.stroke();
        }

        const showBubble = (this.state === 'WALKING') || 
                           (!this.isAtRallyPoint) || 
                           (memberIdx < 2 && !leadersReady);

        if (showBubble && window.TextRenderer) {
            window.TextRenderer.drawBubble(ctx, this, s);
        }

        ctx.restore();
    }
}

window.Walker = Walker;