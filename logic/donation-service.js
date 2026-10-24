// DDos_war Overlay - Donation Service (Local Bridge Mode)
window.DonationService = {
    localSocket: null,
    reconnectTimer: null,

    init() {
        console.log('[DonationService] Подключение к локальному мосту Node.js...');
        this.connect();
    },

    connect() {
        try {
            if (this.localSocket) {
                this.localSocket.close();
            }

            this.localSocket = new WebSocket('ws://localhost:8089');

            this.localSocket.onopen = () => {
                console.log('[DonationService] Успешно подключено к DA Bridge (localhost:8089)');
            };

            this.localSocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data && data.amount) {
                        const amount = Number(data.amount);
                        const username = data.username || 'Донатер';
                        console.log(`[DonationService] Получен донат: ${username} — ${amount} руб.`);

                        if (window.eventManager && typeof window.eventManager.triggerDonation === 'function') {
                            window.eventManager.triggerDonation(amount, username);
                        }
                    }
                } catch (e) {
                    console.warn('[DonationService] Ошибка парсинга пакета:', e);
                }
            };

            this.localSocket.onclose = () => {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = setTimeout(() => this.connect(), 4000);
            };

            this.localSocket.onerror = () => {
                if (this.localSocket) this.localSocket.close();
            };
        } catch (e) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = setTimeout(() => this.connect(), 4000);
        }
    },

    // Ручной вызов для консоли и тестов
    trigger(amount, username = 'Донатер') {
        if (window.eventManager && typeof window.eventManager.triggerDonation === 'function') {
            window.eventManager.triggerDonation(Number(amount), username);
        }
    }
};

window.simulateDonation = function(amount, username) {
    if (window.DonationService) {
        window.DonationService.trigger(amount, username);
    }
};