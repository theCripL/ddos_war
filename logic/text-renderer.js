window.TextRenderer = {
    getBubbleWidth(ctx, walker) {
        const fontName = (typeof CONFIG !== 'undefined' && CONFIG.font_family) ? CONFIG.font_family : 'Share Tech Mono';
        const fontSize = (typeof CONFIG !== 'undefined' && CONFIG.name_font_size) ? CONFIG.name_font_size : 14;
        ctx.font = `bold ${fontSize}px "${fontName}", monospace`;

        const nickText = `[${walker.username}]: `;
        const nickWidth = ctx.measureText(nickText).width;

        const avgCharWidth = ctx.measureText('M').width * 0.72;
        const maxMsgChars = (typeof CONFIG !== 'undefined' && CONFIG.max_msg_length) ? CONFIG.max_msg_length : 15;
        const msgWindowWidth = avgCharWidth * maxMsgChars;

        const actualMsgWidth = ctx.measureText(walker.message).width;
        const displayMsgWidth = walker.isLongMessage ? msgWindowWidth : actualMsgWidth;

        return nickWidth + displayMsgWidth + 24;
    },

    drawBubble(ctx, walker, scale) {
        const fontName = (typeof CONFIG !== 'undefined' && CONFIG.font_family) ? CONFIG.font_family : 'Share Tech Mono';
        const fontSize = (typeof CONFIG !== 'undefined' && CONFIG.name_font_size) ? CONFIG.name_font_size : 14;
        ctx.font = `bold ${fontSize}px "${fontName}", monospace`;

        const nickText = `[${walker.username}]: `;
        const nickWidth = ctx.measureText(nickText).width;

        const avgCharWidth = ctx.measureText('M').width * 0.72;
        const maxMsgChars = (typeof CONFIG !== 'undefined' && CONFIG.max_msg_length) ? CONFIG.max_msg_length : 15;
        const msgWindowWidth = avgCharWidth * maxMsgChars;

        const actualMsgWidth = ctx.measureText(walker.message).width;
        const displayMsgWidth = walker.isLongMessage ? msgWindowWidth : actualMsgWidth;

        const padX = 12;
        const padY = 5;
        const bubbleWidth = nickWidth + displayMsgWidth + padX * 2;
        const bubbleHeight = fontSize + padY * 2;

        const bx = -bubbleWidth / 2;
        const by = -85 * scale - bubbleHeight;

        // Кибер-подложка со скошенными углами (Chamfer Box)
        const chamfer = 6;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(bx + chamfer, by);
        ctx.lineTo(bx + bubbleWidth - chamfer, by);
        ctx.lineTo(bx + bubbleWidth, by + chamfer);
        ctx.lineTo(bx + bubbleWidth, by + bubbleHeight - chamfer);
        ctx.lineTo(bx + bubbleWidth - chamfer, by + bubbleHeight);
        ctx.lineTo(bx + chamfer, by + bubbleHeight);
        ctx.lineTo(bx, by + bubbleHeight - chamfer);
        ctx.lineTo(bx, by + chamfer);
        ctx.closePath();

        ctx.fillStyle = 'rgba(7, 14, 22, 0.92)';
        ctx.fill();

        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 1.2;
        ctx.shadowColor = 'rgba(0, 240, 255, 0.6)';
        ctx.shadowBlur = 6;
        ctx.stroke();

        // Неоновый хвостик-индикатор
        ctx.beginPath();
        ctx.moveTo(-3, by + bubbleHeight);
        ctx.lineTo(0, by + bubbleHeight + 5);
        ctx.lineTo(3, by + bubbleHeight);
        ctx.fillStyle = '#00F0FF';
        ctx.fill();
        ctx.restore();

        // Никнейм
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const textY = by + bubbleHeight / 2;

        ctx.fillStyle = '#00F0FF';
        ctx.fillText(nickText, bx + padX, textY);

        // Сообщение
        const msgStartX = bx + padX + nickWidth;

        if (!walker.isLongMessage) {
            ctx.fillStyle = '#E6F8FF';
            ctx.fillText(walker.message, msgStartX, textY);
        } else {
            ctx.save();
            ctx.beginPath();
            ctx.rect(msgStartX, by, displayMsgWidth, bubbleHeight);
            ctx.clip();

            const spacing = 35;
            const loopWidth = actualMsgWidth + spacing;
            const currentScroll = walker.scrollOffset % loopWidth;

            ctx.fillStyle = '#E6F8FF';
            ctx.fillText(walker.message, msgStartX - currentScroll, textY);
            ctx.fillText(walker.message, msgStartX - currentScroll + loopWidth, textY);

            ctx.restore();
        }
    }
};