window.RallyRenderer = {
    drawRallies(ctx, rallies, canvas) {
        for (const rally of rallies) {
            const yRatio = (typeof CONFIG !== 'undefined' && CONFIG.rally_y_ratio) ? CONFIG.rally_y_ratio : 0.76;
            const baseY = canvas.height * yRatio;
            const fade = (rally.disperseAnim !== undefined) ? rally.disperseAnim : 1.0;

            if (fade <= 0) continue;

            // 1. Малые плакаты толпы (3-10) в стиле Cyber HUD
            rally.members.slice(2, 10).forEach(m => {
                if (m.state === 'RALLYING' && m.isAtRallyPoint) {
                    ctx.save();
                    ctx.translate(m.x, m.y);
                    ctx.globalAlpha = fade;

                    const s = m.size / 100;

                    if (!m.signAnim) m.signAnim = 0;
                    if (m.signAnim < 1) m.signAnim = Math.min(1, m.signAnim + 0.08);

                    const scale = m.signAnim * fade;
                    ctx.scale(scale, scale);

                    const headTopY = -67 * s;
                    const signHeight = 22 * s;
                    const signWidth = 34 * s;
                    const signTopY = headTopY - 6 * s - signHeight;
                    const midBodyY = -32 * s;

                    // Стойка
                    ctx.beginPath();
                    ctx.moveTo(0, signTopY + 5 * s);
                    ctx.lineTo(0, midBodyY);
                    ctx.strokeStyle = '#00A3B5';
                    ctx.lineWidth = 2.5 * s;
                    ctx.stroke();

                    // Скошенная табличка
                    const ch = 4 * s;
                    ctx.beginPath();
                    ctx.moveTo(-signWidth / 2 + ch, signTopY);
                    ctx.lineTo(signWidth / 2 - ch, signTopY);
                    ctx.lineTo(signWidth / 2, signTopY + ch);
                    ctx.lineTo(signWidth / 2, signTopY + signHeight - ch);
                    ctx.lineTo(signWidth / 2 - ch, signTopY + signHeight);
                    ctx.lineTo(-signWidth / 2 + ch, signTopY + signHeight);
                    ctx.lineTo(-signWidth / 2, signTopY + signHeight - ch);
                    ctx.lineTo(-signWidth / 2, signTopY + ch);
                    ctx.closePath();

                    ctx.fillStyle = 'rgba(7, 16, 26, 0.95)';
                    ctx.fill();
                    ctx.strokeStyle = '#00F0FF';
                    ctx.lineWidth = 1.2 * s;
                    ctx.stroke();

                    ctx.restore();
                }
            });

            // 2. Главный баннер (HUD Cyber Banner)
            if (rally.members.length >= 2) {
                const w1 = rally.members[0];
                const w2 = rally.members[1];

                if (w1.isAtRallyPoint && w2.isAtRallyPoint) {
                    if (rally.bannerScale === undefined) rally.bannerScale = 0;
                    if (rally.bannerScale < 1 && !rally.isDispersing) {
                        rally.bannerScale += 0.07;
                        if (rally.bannerScale > 1) rally.bannerScale = 1;
                    }

                    const scale = this.easeOutBack(rally.bannerScale) * fade;
                    const midX = rally.baseX;
                    const signY = baseY - 70;

                    ctx.save();
                    ctx.translate(midX, signY);
                    ctx.globalAlpha = fade;
                    ctx.scale(scale, scale);

                    const fontName = (typeof CONFIG !== 'undefined' && CONFIG.font_family) ? CONFIG.font_family : 'Share Tech Mono';
                    ctx.font = `bold 22px "${fontName}", monospace`;
                    const textWidth = ctx.measureText(rally.word.toUpperCase()).width;
                    
                    const holdersDist = Math.abs(w2.x - w1.x);
                    const signWidth = Math.max(textWidth + 50, holdersDist + 45, 140);
                    const signHeight = 46;
                    const chamfer = 10;

                    // Вертикальные неоновые стойки
                    const leftPoleX = w1.x - midX;
                    const rightPoleX = w2.x - midX;
                    const poleTopY = -signHeight / 2 + 10;
                    const poleBottomY = baseY - signY - 42 * (w1.size / 100);

                    ctx.strokeStyle = '#00F0FF';
                    ctx.lineWidth = 2.5;
                    ctx.shadowColor = 'rgba(0, 240, 255, 0.7)';
                    ctx.shadowBlur = 8;

                    ctx.beginPath();
                    ctx.moveTo(leftPoleX, poleTopY);
                    ctx.lineTo(leftPoleX, poleBottomY);
                    ctx.moveTo(rightPoleX, poleTopY);
                    ctx.lineTo(rightPoleX, poleBottomY);
                    ctx.stroke();

                    // Полотно баннера в стиле референса
                    ctx.beginPath();
                    ctx.moveTo(-signWidth / 2 + chamfer, -signHeight / 2);
                    ctx.lineTo(signWidth / 2 - chamfer, -signHeight / 2);
                    ctx.lineTo(signWidth / 2, -signHeight / 2 + chamfer);
                    ctx.lineTo(signWidth / 2, signHeight / 2 - chamfer);
                    ctx.lineTo(signWidth / 2 - chamfer, signHeight / 2);
                    ctx.lineTo(-signWidth / 2 + chamfer, signHeight / 2);
                    ctx.lineTo(-signWidth / 2, signHeight / 2 - chamfer);
                    ctx.lineTo(-signWidth / 2, -signHeight / 2 + chamfer);
                    ctx.closePath();

                    ctx.fillStyle = 'rgba(6, 12, 19, 0.94)';
                    ctx.fill();
                    ctx.strokeStyle = '#00F0FF';
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // Декоративные скошенные полоски сверху
                    ctx.fillStyle = '#00F0FF';
                    ctx.fillRect(-signWidth / 2 + 12, -signHeight / 2 - 2, 16, 3);
                    ctx.fillRect(signWidth / 2 - 28, -signHeight / 2 - 2, 16, 3);

                    // Слово на баннере
                    ctx.fillStyle = '#00F0FF';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.shadowColor = 'rgba(0, 240, 255, 0.9)';
                    ctx.shadowBlur = 10;
                    ctx.fillText(rally.word.toUpperCase(), 0, 1);
                    ctx.shadowBlur = 0;

                    // ТАЙМЕР И СЧЕТЧИК СВЕРХУ (ИСПОЛЬЗУЕМ "ЛЮДИ")
                    const badgeText = `▶ ${Math.max(0, Math.ceil(rally.timer))}С  |||  ${rally.members.length} Люди`;
                    ctx.font = `bold 11px "${fontName}", monospace`;
                    const badgeWidth = ctx.measureText(badgeText).width + 18;
                    const badgeHeight = 18;
                    const badgeY = -signHeight / 2 - 14;

                    ctx.fillStyle = 'rgba(6, 14, 22, 0.95)';
                    ctx.strokeStyle = '#00C8D6';
                    ctx.lineWidth = 1.2;

                    ctx.beginPath();
                    ctx.moveTo(-badgeWidth / 2 + 4, badgeY - badgeHeight / 2);
                    ctx.lineTo(badgeWidth / 2 - 4, badgeY - badgeHeight / 2);
                    ctx.lineTo(badgeWidth / 2, badgeY + badgeHeight / 2);
                    ctx.lineTo(-badgeWidth / 2, badgeY + badgeHeight / 2);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = '#00F0FF';
                    ctx.fillText(badgeText, 0, badgeY);

                    ctx.restore();
                } else {
                    rally.bannerScale = 0;
                }
            }
        }
    },

    easeOutBack(x) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    }
};