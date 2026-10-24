const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

let daToken = 'EicRTPt1b9sEp3jQW6oB';
try {
    const configPath = path.join(__dirname, '..', 'config.js');
    if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        const match = content.match(/da_token:\s*'([^']+)'/);
        if (match && match[1]) {
            daToken = match[1];
        }
    }
} catch (e) {}

const LOCAL_PORT = 8089;
const server = http.createServer();
const wss = new WebSocket.Server({ server });
const overlayClients = new Set();

wss.on('connection', (ws) => {
    overlayClients.add(ws);
    console.log('[Bridge] Оверлей успешно подключился к мосту.');
    ws.on('close', () => overlayClients.delete(ws));
});

server.listen(LOCAL_PORT, () => {
    console.log(`====================================================`);
    console.log(`[Bridge] Локальный мост запущен: ws://localhost:${LOCAL_PORT}`);
    console.log(`[Bridge] DA токен: ${daToken}`);
    console.log(`====================================================`);
});

function broadcastDonation(amount, username) {
    console.log(`[Bridge] >>> ПОЛУЧЕН ДОНАТ: ${username} — ${amount} RUB`);
    const msg = JSON.stringify({ amount, username });
    overlayClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(msg);
        }
    });
}

async function startHeadlessWidget() {
    console.log('[Bridge] Запуск фонового клиента DonationAlerts (Headless Chrome)...');

    try {
        const puppeteerModule = await import('puppeteer');
        const puppeteer = puppeteerModule.default || puppeteerModule;

        const browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--autoplay-policy=no-user-gesture-required',
                '--disable-web-security'
            ]
        });

        const page = await browser.newPage();

        // 1. Экспортируем функцию приёма в Node.js
        await page.exposeFunction('bridgeReportDonation', (amount, username) => {
            broadcastDonation(amount, username);
        });

        // 2. Внедряем перехватчик прямо в веб-контекст виджета ДО загрузки скриптов
        await page.evaluateOnNewDocument(() => {
            // Перехват WebSocket на уровне браузера
            const OriginalWebSocket = window.WebSocket;
            window.WebSocket = function(...args) {
                const ws = new OriginalWebSocket(...args);

                ws.addEventListener('message', (event) => {
                    try {
                        let raw = event.data;
                        if (!raw) return;
                        const parsed = JSON.parse(raw);

                        // Проверяем все возможные форматы пакетов Centrifugo / DA
                        let payload = null;
                        if (parsed.result && parsed.result.type === 'publication') {
                            payload = parsed.result.data;
                        } else if (parsed.result && parsed.result.data) {
                            payload = parsed.result.data;
                        } else if (parsed.data) {
                            payload = parsed.data;
                        }

                        if (payload) {
                            let obj = typeof payload === 'string' ? JSON.parse(payload) : payload;
                            if (obj.data) obj = obj.data;

                            const amountVal = obj.amount || obj.amount_formatted || obj.sum || obj.additional_data;
                            const amt = parseFloat(amountVal);
                            const name = obj.username || obj.name || 'Донатер';

                            if (!isNaN(amt) && amt > 0) {
                                window.bridgeReportDonation(amt, name);
                            }
                        }
                    } catch (e) {}
                });

                return ws;
            };

            // Дополнительный перехват через DOM Mutation (если виджет отрисовывает текст алерта)
            const observer = new MutationObserver(() => {
                const alertContainer = document.querySelector('#alert') || document.querySelector('.alert-wrap') || document.body;
                if (!alertContainer) return;

                const text = alertContainer.innerText || '';
                // Поиск шаблонов сумм типа "425 RUB", "425 руб", "425 ₽"
                const match = text.match(/([\d\s]+(?:[.,]\d+)?)\s*(?:RUB|руб|₽)/i);
                if (match && !alertContainer.dataset.processedAlert) {
                    const parsedAmt = parseFloat(match[1].replace(/\s+/g, '').replace(',', '.'));
                    if (!isNaN(parsedAmt) && parsedAmt > 0) {
                        alertContainer.dataset.processedAlert = 'true';
                        setTimeout(() => { delete alertContainer.dataset.processedAlert; }, 8000);
                        window.bridgeReportDonation(parsedAmt, 'Донатер');
                    }
                }
            });

            document.addEventListener('DOMContentLoaded', () => {
                observer.observe(document.body, { childList: true, subtree: true, characterData: true });
            });
        });

        // 3. Также слушаем CDP для подстраховки
        const client = await page.target().createCDPSession();
        await client.send('Network.enable');

        client.on('Network.webSocketFrameReceived', ({ response }) => {
            try {
                const str = response.payloadData;
                if (!str) return;
                const data = JSON.parse(str);

                let payload = null;
                if (data.result && data.result.type === 'publication') {
                    payload = data.result.data;
                } else if (data.result && data.result.data) {
                    payload = data.result.data;
                }

                if (payload) {
                    let alert = typeof payload === 'string' ? JSON.parse(payload) : payload;
                    if (alert.data) alert = alert.data;

                    const amt = parseFloat(alert.amount || alert.amount_formatted || alert.sum);
                    const name = alert.username || alert.name || 'Донатер';

                    if (!isNaN(amt) && amt > 0) {
                        broadcastDonation(amt, name);
                    }
                }
            } catch (e) {}
        });

        const widgetUrl = `https://www.donationalerts.com/widget/alerts?group_id=1&token=${daToken}`;
        console.log(`[Bridge] Загрузка официального виджета: ${widgetUrl}`);

        await page.goto(widgetUrl, { waitUntil: 'networkidle2' });
        console.log('[Bridge] Виджет успешно авторизован и слушает донаты в реальном времени!');

    } catch (e) {
        console.error('[Bridge] Ошибка запуска фонового браузера:', e.message);
        console.log('[Bridge] Перезапуск через 10 секунд...');
        setTimeout(startHeadlessWidget, 10000);
    }
}

startHeadlessWidget();