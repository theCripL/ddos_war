window.TwitchService = {
    socket: null,

    connect() {
        if (typeof CONFIG === 'undefined' || !CONFIG.channel || CONFIG.channel === 'your_twitch_channel') {
            return;
        }

        this.socket = new WebSocket('wss://irc-ws.chat.twitch.tv:443');

        this.socket.onopen = () => {
            this.socket.send('CAP REQ :twitch.tv/tags twitch.tv/commands');
            this.socket.send('PASS SCHMOOPIE');
            this.socket.send('NICK justinfan12345');
            this.socket.send(`JOIN #${CONFIG.channel.toLowerCase()}`);
        };

        this.socket.onmessage = (event) => {
            const lines = event.data.split('\r\n');
            for (const line of lines) {
                if (line.startsWith('PING')) {
                    this.socket.send('PONG :tmi.twitch.tv');
                } else if (line.includes('PRIVMSG')) {
                    const displayNameMatch = line.match(/display-name=([^;\s]+)/);
                    const colorMatch = line.match(/color=([^;\s]*)/);
                    const badgesMatch = line.match(/badges=([^;\s]*)/);
                    const modMatch = line.match(/mod=([01])/);

                    const isMod = (modMatch && modMatch[1] === '1') || 
                                  (badgesMatch && (badgesMatch[1].includes('broadcaster') || badgesMatch[1].includes('moderator')));

                    let username = null;
                    if (displayNameMatch && displayNameMatch[1]) {
                        try {
                            username = decodeURIComponent(escape(displayNameMatch[1]));
                        } catch (e) {
                            username = displayNameMatch[1];
                        }
                    }

                    let message = '';
                    const msgParts = line.split(`PRIVMSG #${CONFIG.channel.toLowerCase()} :`);
                    if (msgParts.length > 1) {
                        try {
                            message = decodeURIComponent(escape(msgParts[1]));
                        } catch (e) {
                            message = msgParts[1];
                        }
                    }

                    // Перехват модераторских команд
                    if (isMod && window.rallyManager && window.rallyManager.handleCommand(message, isMod)) {
                        continue;
                    }

                    if (username && window.crowdManager) {
                        const color = colorMatch && colorMatch[1] ? colorMatch[1] : null;
                        const canvas = document.getElementById('overlayCanvas');
                        window.crowdManager.addMessage(username, message, color, canvas);
                    }
                }
            }
        };

        this.socket.onclose = () => {
            setTimeout(() => this.connect(), 5000);
        };
    }
};