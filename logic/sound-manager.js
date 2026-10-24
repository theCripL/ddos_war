class SoundManager {
    constructor() {
        this.ctx = null;
        this.sounds = {
            arrows: new Audio('media/sounds/arrows.mp3'),
            meteor: new Audio('media/sounds/meteor.mp3'),
            trojan: new Audio('media/sounds/kaspersky.mp3')
        };

        // Преднастройка громкости
        Object.values(this.sounds).forEach(audio => {
            audio.volume = 0.6;
        });

        // Активация Web Audio API по первому клику
        const initAudio = () => {
            if (!this.ctx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (AudioContext) this.ctx = new AudioContext();
            }
            window.removeEventListener('click', initAudio);
            window.removeEventListener('keydown', initAudio);
        };
        window.addEventListener('click', initAudio);
        window.addEventListener('keydown', initAudio);
    }

    getAudioCtx() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) this.ctx = new AudioContext();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        return this.ctx;
    }

    play(name) {
        const audio = this.sounds[name];
        if (audio) {
            audio.currentTime = 0;
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => {
                    // Если локального MP3 файла нет — запускаем Web Audio синтез
                    this.playSynth(name);
                });
                return;
            }
        }
        this.playSynth(name);
    }

    // Синтезатор звуков на Web Audio API
    playSynth(name) {
        const ctx = this.getAudioCtx();
        if (!ctx) return;

        const now = ctx.currentTime;

        if (name === 'arrows') {
            // Звук свиста и шуршания залпа стрел
            for (let i = 0; i < 4; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(800 + Math.random() * 400, now + i * 0.08);
                osc.frequency.exponentialRampToValueAtTime(150, now + i * 0.08 + 0.25);

                gain.gain.setValueAtTime(0.12, now + i * 0.08);
                gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + i * 0.08);
                osc.stop(now + i * 0.08 + 0.25);
            }
        } else if (name === 'meteor') {
            // Нарастающий гул падения и глухой взрыв
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(120, now);
            osc.frequency.exponentialRampToValueAtTime(35, now + 1.2);

            gain.gain.setValueAtTime(0.01, now);
            gain.gain.linearRampToValueAtTime(0.35, now + 0.9);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 1.6);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 1.6);
        } else if (name === 'trojan') {
            // Резкий тревожный визг/сирена в стиле алерта Касперского "ВНИМАНИЕ"
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sawtooth';

            // Пульсация частоты тревоги
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.linearRampToValueAtTime(980, now + 0.12);
            osc.frequency.linearRampToValueAtTime(480, now + 0.25);
            osc.frequency.linearRampToValueAtTime(1050, now + 0.4);
            osc.frequency.linearRampToValueAtTime(320, now + 0.7);

            gain.gain.setValueAtTime(0.35, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.75);
        }
    }
}

window.soundManager = new SoundManager();