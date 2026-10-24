let spamTimeouts = [];

window.spawnOne = function(name = 'ЗРИТЕЛЬ_01', msg = 'СИСТЕМА_В_НОРМЕ') {
    const cvs = document.getElementById('overlayCanvas');
    if (window.crowdManager && cvs) {
        window.crowdManager.addMessage(name, msg, null, cvs);
    }
};

window.spawnLongMsg = function() {
    const cvs = document.getElementById('overlayCanvas');
    if (window.crowdManager && cvs) {
        window.crowdManager.addMessage('КИБЕР_УЗЕЛ', 'ТЕСТОВОЕ_ДЛИННОЕ_СООБЩЕНИЕ_ПЕРЕДАЧА_ДАННЫХ_АКТИВНА', '#00F0FF', cvs);
    }
};

window.spawnStress = function(count = 50) {
    const cvs = document.getElementById('overlayCanvas');
    if (!window.crowdManager || !cvs) return;
    const total = (typeof CONFIG !== 'undefined' && CONFIG.max_walkers) ? CONFIG.max_walkers : count;
    for (let i = 1; i <= total; i++) {
        window.crowdManager.addMessage(`УЗЕЛ_${i}`, i % 2 === 0 ? 'СИСТЕМА_ОК' : 'ПОТОК_ДАННЫХ_ТЕСТ', null, cvs);
    }
};

window.startSpamTest = function(totalUsers = 50) {
    window.stopSpamTest();
    const cvs = document.getElementById('overlayCanvas');
    const phrases = [
        'СИСТЕМА_ОНЛАЙН',
        'ПЕРЕДАЧА_АКТИВНА',
        'ОБНОВЛЕНИЕ_HUD_ВЕРСИЯ_1.4.0',
        'ПАКЕТ_ПОЛУЧЕН',
        'СИМУЛЯЦИЯ_DDOS',
        'ТЕРМИНАЛ_ГОТОВ'
    ];

    let accumulatedDelay = 0;
    for (let i = 1; i <= totalUsers; i++) {
        const randomStep = Math.floor(Math.random() * (5000 - 500 + 1)) + 500;
        accumulatedDelay += randomStep;

        const timerId = setTimeout(() => {
            if (window.crowdManager && cvs) {
                const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
                window.crowdManager.addMessage(`ЗРИТЕЛЬ_${i}`, randomPhrase, null, cvs);
            }
        }, accumulatedDelay);

        spamTimeouts.push(timerId);
    }
};

window.stopSpamTest = function() {
    spamTimeouts.forEach(t => clearTimeout(t));
    spamTimeouts = [];
};

window.testRallySynergy = function() {
    const cvs = document.getElementById('overlayCanvas');
    if (!window.crowdManager || !cvs) return;
    window.crowdManager.addMessage('АКТИВИСТ_1', 'ОБЪЯВЛЯЕМ БУНТ НА СТРИМЕ', '#00F0FF', cvs);
    setTimeout(() => {
        window.crowdManager.addMessage('АКТИВИСТ_2', 'ПОДДЕРЖИВАЮ БУНТ', '#00FFA3', cvs);
    }, 400);
};

window.testRallyCrowd = function() {
    const cvs = document.getElementById('overlayCanvas');
    if (!window.crowdManager || !cvs) return;
    for (let i = 3; i <= 8; i++) {
        setTimeout(() => {
            window.crowdManager.addMessage(`УЗЕЛ_${i}`, 'УСИЛИТЬ БУНТ', null, cvs);
        }, (i - 2) * 350);
    }
};

window.testDisperse = function() {
    if (window.rallyManager) {
        window.rallyManager.handleCommand('расходимся все', true);
    }
};

window.clearAll = function() {
    window.stopSpamTest();
    if (window.crowdManager) {
        window.crowdManager.clear();
    }
};

// Методы тестирования донатов
window.testDonationArrows = function(amount = 70) {
    if (window.eventManager) {
        window.eventManager.triggerDonation(amount, 'Снайпер');
    }
};

window.testDonationMeteor = function() {
    if (window.eventManager) {
        window.eventManager.triggerDonation(500, 'Метеорит');
    }
};

window.testDonationTrojan = function() {
    if (window.eventManager) {
        window.eventManager.triggerDonation(5000, 'Хакер');
    }
};

// Canvas & Game Loop
const canvas = document.getElementById('overlayCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const isTestPage = window.location.pathname.includes('test.html');

function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth || 1920;
    canvas.height = window.innerHeight || 1080;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

let lastTime = performance.now();
function gameLoop(timestamp) {
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (dt < 0.2 && window.crowdManager) {
            window.crowdManager.update(dt, canvas, ctx);
        }
        
        if (window.crowdManager) {
            window.crowdManager.draw(ctx, canvas);
        }

        if (isTestPage && typeof CONFIG !== 'undefined' && CONFIG.debug_mode) {
            ctx.fillStyle = '#00F0FF';
            const fontName = CONFIG.font_family || 'Share Tech Mono';
            ctx.font = `13px "${fontName}", monospace`;
            ctx.textAlign = 'left';
            const count = window.crowdManager ? window.crowdManager.activeWalkers.size : 0;
            const queueLen = window.crowdManager ? window.crowdManager.queue.length : 0;
            const ralliesCount = window.rallyManager ? window.rallyManager.rallies.length : 0;
            const curfew = (window.rallyManager && window.rallyManager.curfewActive) ? ' [КОМЕНДАНТСКИЙ_ЧАС]' : '';
            ctx.fillText(`▶ DDos_war Overlay v1.4.0 | ЮНИТЫ: ${count}/${CONFIG.max_walkers || 50} | ОЧЕРЕДЬ: ${queueLen} | МИТИНГИ: ${ralliesCount}/3${curfew}`, 24, 32);
        }
    }

    requestAnimationFrame(gameLoop);
}

function init() {
    resizeCanvas();
    if (window.TwitchService && typeof window.TwitchService.connect === 'function') {
        window.TwitchService.connect();
    }
    if (window.DonationService && typeof window.DonationService.init === 'function') {
        window.DonationService.init();
    }
    requestAnimationFrame(gameLoop);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}