/**
 * 機僕駭客：量子特務 - 閱讀器功能
 */

(function () {
    'use strict';

    // ===== 主題切換 =====
    const ThemeManager = {
        storageKey: 'quantum-agent-theme',

        init() {
            const savedTheme = localStorage.getItem(this.storageKey) || 'dark';
            this.setTheme(savedTheme);
            this.bindEvents();
        },

        setTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem(this.storageKey, theme);
            this.updateButton(theme);
        },

        toggle() {
            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            const next = current === 'dark' ? 'light' : 'dark';
            this.setTheme(next);
        },

        updateButton(theme) {
            const btn = document.querySelector('[data-action="toggle-theme"]');
            if (btn) {
                btn.textContent = theme === 'dark' ? '☀️' : '🌙';
                btn.title = theme === 'dark' ? '切換亮色模式' : '切換暗色模式';
            }
        },

        bindEvents() {
            document.addEventListener('click', (e) => {
                if (e.target.matches('[data-action="toggle-theme"]')) {
                    this.toggle();
                }
            });
        }
    };

    // ===== 字體大小調整 =====
    const FontSizeManager = {
        storageKey: 'quantum-agent-fontsize',
        minSize: 14,
        maxSize: 24,
        step: 2,

        init() {
            const savedSize = localStorage.getItem(this.storageKey) || 18;
            this.setSize(parseInt(savedSize));
            this.bindEvents();
        },

        setSize(size) {
            size = Math.max(this.minSize, Math.min(this.maxSize, size));
            document.documentElement.style.setProperty('--font-size', size + 'px');
            localStorage.setItem(this.storageKey, size);
            this.updateDisplay(size);
        },

        getSize() {
            return parseInt(localStorage.getItem(this.storageKey)) || 18;
        },

        increase() {
            this.setSize(this.getSize() + this.step);
        },

        decrease() {
            this.setSize(this.getSize() - this.step);
        },

        updateDisplay(size) {
            const display = document.querySelector('[data-fontsize-display]');
            if (display) {
                display.textContent = size + 'px';
            }
        },

        bindEvents() {
            document.addEventListener('click', (e) => {
                if (e.target.matches('[data-action="font-increase"]')) {
                    this.increase();
                } else if (e.target.matches('[data-action="font-decrease"]')) {
                    this.decrease();
                }
            });
        }
    };

    // ===== 閱讀進度記憶 =====
    const ReadingProgress = {
        storageKey: 'quantum-agent-progress',

        init() {
            this.restorePosition();
            this.bindEvents();
        },

        getProgressKey() {
            return this.storageKey + '-' + window.location.pathname;
        },

        savePosition() {
            const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
            localStorage.setItem(this.getProgressKey(), scrollPercent);
        },

        restorePosition() {
            const saved = localStorage.getItem(this.getProgressKey());
            if (saved && parseFloat(saved) > 5) {
                // 只有當進度超過 5% 時才提示
                const shouldRestore = confirm('要從上次閱讀位置繼續嗎？');
                if (shouldRestore) {
                    const scrollY = (parseFloat(saved) / 100) * (document.body.scrollHeight - window.innerHeight);
                    setTimeout(() => window.scrollTo(0, scrollY), 100);
                }
            }
        },

        bindEvents() {
            let ticking = false;
            window.addEventListener('scroll', () => {
                if (!ticking) {
                    requestAnimationFrame(() => {
                        this.savePosition();
                        ticking = false;
                    });
                    ticking = true;
                }
            });
        }
    };

    // ===== 鍵盤導航 =====
    const KeyboardNav = {
        init() {
            document.addEventListener('keydown', (e) => {
                // 如果正在輸入文字則忽略
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

                switch (e.key) {
                    case 'ArrowLeft':
                        this.navigate('prev');
                        break;
                    case 'ArrowRight':
                        this.navigate('next');
                        break;
                }
            });
        },

        navigate(direction) {
            const link = document.querySelector(`[data-nav="${direction}"]`);
            if (link && !link.classList.contains('disabled')) {
                window.location.href = link.href;
            }
        }
    };

    // ===== 初始化 =====
    document.addEventListener('DOMContentLoaded', () => {
        ThemeManager.init();
        FontSizeManager.init();

        // 只在章節頁啟用進度記憶和鍵盤導航
        if (document.querySelector('.chapter-content')) {
            ReadingProgress.init();
            KeyboardNav.init();
        }
    });

})();
