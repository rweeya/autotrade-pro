// js/ui.js - Интерфейс и отображение
const UI = (function() {
    
    let allSignals = [];
    let lastSignalCount = 0;
    
    function renderSignals(signals) {
        const container = document.getElementById('signalsContainer');
        
        if (!signals || signals.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #888;">📭 Нет сигналов (ожидаем TradingView...</div>';
            return;
        }
        
        let html = '';
        for (let s of signals) {
            const actionClass = s.action === 'buy' ? 'buy' : 'sell';
            const actionText = s.action === 'buy' ? '🟢 BUY' : '🔴 SELL';
            const time = new Date(s.timestamp).toLocaleTimeString();
            const strengthStars = '★'.repeat(s.strength) + '☆'.repeat(5 - s.strength);
            
            // Определяем иконку для типа актива
            let icon = '💰';
            if (s.symbol.includes('/')) icon = '💱';
            else if (s.symbol.length <= 5 && !s.symbol.includes('/')) icon = '📈';
            
            html += `
                <div class="signal-card" data-symbol="${s.symbol}" data-action="${s.action}" onclick="window.openChart('${s.symbol}')">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="signal-symbol">${icon} ${s.symbol}</span>
                        <span class="signal-action ${actionClass}">${actionText}</span>
                        <span class="signal-strength">⚡ ${strengthStars}</span>
                    </div>
                    <div style="display: flex; gap: 15px; margin-top: 8px; font-size: 11px; color: #aaa; flex-wrap: wrap;">
                        <span>💵 $${typeof s.price === 'number' ? s.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : s.price}</span>
                        <span>📊 RSI: ${s.rsi || '—'}</span>
                        <span>⏰ ${time}</span>
                        <span>🎯 ${s.strength}/5</span>
                    </div>
                    ${s.reasons ? `<div style="margin-top: 6px; font-size: 10px; color: #ffaa66;">📊 ${s.reasons}</div>` : ''}
                    <div style="margin-top: 4px; font-size: 9px; color: #00ffff80;">🎯 Источник: ${s.source || 'TradingView'}</div>
                </div>
            `;
        }
        
        // Добавляем кнопки управления
        const stats = History.getStatistics();
        html += `
            <div style="display: flex; gap: 10px; margin-top: 15px; justify-content: center;">
                <button onclick="UI.showHistoryModal()" style="background: rgba(255,0,255,0.2); border: 1px solid #ff00ff; color: #fff; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 12px;">
                    📜 ИСТОРИЯ (${stats.total})
                </button>
                <button onclick="UI.refreshSignals()" style="background: rgba(0,255,255,0.2); border: 1px solid #00ffff; color: #fff; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 12px;">
                    🔄 ОБНОВИТЬ
                </button>
            </div>
        `;
        
        container.innerHTML = html;
        allSignals = signals;
        
        // Оповещение о новых сигналах
        if (signals.length > lastSignalCount) {
            const newCount = signals.length - lastSignalCount;
            if (newCount > 0) {
                playAlertSound();
            }
        }
        lastSignalCount = signals.length;
    }
    
    function updateStats(signals) {
        const total = signals.length;
        const buys = signals.filter(s => s.action === 'buy').length;
        const sells = total - buys;
        const accuracy = History.getAccuracy();
        const stats = History.getStatistics();
        
        document.getElementById('totalSignals').innerText = stats.total;
        document.getElementById('buySignals').innerText = buys;
        document.getElementById('sellSignals').innerText = sells;
        document.getElementById('accuracy').innerHTML = accuracy ? `${accuracy}%` : (stats.winRate > 0 ? `${stats.winRate}%` : '—');
    }
    
    function filterSignals() {
        const searchTerm = document.getElementById('searchFilter').value.toLowerCase();
        const typeFilter = document.getElementById('typeFilter').value;
        const assetFilter = document.getElementById('assetFilter')?.value || 'all';
        
        const cards = document.querySelectorAll('.signal-card');
        cards.forEach(card => {
            const symbol = card.getAttribute('data-symbol')?.toLowerCase() || '';
            const action = card.getAttribute('data-action') || '';
            
            let show = true;
            if (searchTerm && !symbol.includes(searchTerm)) show = false;
            if (typeFilter !== 'all' && action !== typeFilter) show = false;
            
            if (assetFilter !== 'all') {
                if (assetFilter === 'crypto' && !symbol.includes('/USDT') && !symbol.includes('USDT')) show = false;
                if (assetFilter === 'forex' && !symbol.includes('/')) show = false;
                if (assetFilter === 'stock' && (symbol.includes('/') || symbol.includes('USDT'))) show = false;
            }
            
            card.style.display = show ? 'block' : 'none';
        });
    }
    
    function showHistoryModal() {
        const history = History.getRecentSignals(100);
        const stats = History.getStatistics();
        const performance = History.getPerformanceBySymbol();
        
        let modalHtml = `
            <div id="historyModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.95); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
                <div style="background: linear-gradient(135deg, #0a0a2e, #1a1a3e); border: 1px solid #ff00ff; border-radius: 20px; width: 90%; max-width: 850px; max-height: 85vh; overflow: auto; padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid #ff00ff33; padding-bottom: 15px;">
                        <h2 style="color: #ff00ff;">📜 ИСТОРИЯ СИГНАЛОВ</h2>
                        <button onclick="UI.closeHistoryModal()" style="background: none; border: none; color: #ff00ff; font-size: 28px; cursor: pointer;">✖</button>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px;">
                        <div style="background: rgba(0,255,255,0.1); padding: 12px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 28px; color: #00ffff; font-weight: bold;">${stats.total}</div>
                            <div style="font-size: 11px;">ВСЕГО</div>
                        </div>
                        <div style="background: rgba(0,255,255,0.1); padding: 12px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 28px; color: #00ff88;">${stats.wins}</div>
                            <div style="font-size: 11px;">ВЫИГРЫШИ</div>
                        </div>
                        <div style="background: rgba(0,255,255,0.1); padding: 12px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 28px; color: #ff4444;">${stats.losses}</div>
                            <div style="font-size: 11px;">ПРОИГРЫШИ</div>
                        </div>
                        <div style="background: rgba(0,255,255,0.1); padding: 12px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 28px; color: #ffaa00;">${stats.winRate}%</div>
                            <div style="font-size: 11px;">ТОЧНОСТЬ</div>
                        </div>
                    </div>
                    
                    <h3 style="color: #00ffff; margin-bottom: 10px;">🏆 ЛУЧШИЕ АКТИВЫ</h3>
                    <div style="margin-bottom: 20px; max-height: 180px; overflow-y: auto; background: rgba(0,0,0,0.3); border-radius: 10px; padding: 10px;">
                        ${Object.entries(performance).sort((a,b) => parseFloat(b[1].winRate) - parseFloat(a[1].winRate)).slice(0,5).map(([symbol, stats]) => {
                            return `
                                <div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid rgba(255,0,255,0.2);">
                                    <span style="font-weight: bold;">💰 ${symbol}</span>
                                    <span style="color: #00ff88;">✅ ${stats.wins}</span>
                                    <span style="color: #ff4444;">❌ ${stats.losses}</span>
                                    <span style="color: #ffaa00; font-weight: bold;">📊 ${stats.winRate}%</span>
                                </div>
                            `;
                        }).join('')}
                        ${Object.keys(performance).length === 0 ? '<div style="text-align: center; padding: 20px; color: #666;">Нет данных</div>' : ''}
                    </div>
                    
                    <h3 style="color: #00ffff; margin-bottom: 10px;">⏱️ ПОСЛЕДНИЕ СИГНАЛЫ</h3>
                    <div style="max-height: 280px; overflow-y: auto; background: rgba(0,0,0,0.3); border-radius: 10px; padding: 10px;">
                        ${history.map(signal => {
                            const time = new Date(signal.timestamp).toLocaleString();
                            const statusColor = signal.status === 'win' ? '#00ff88' : (signal.status === 'loss' ? '#ff4444' : '#ffaa00');
                            const statusText = signal.status === 'win' ? '✅ ВЫИГРЫШ' : (signal.status === 'loss' ? '❌ ПРОИГРЫШ' : '⏳ В ПРОЦЕССЕ');
                            return `
                                <div style="padding: 10px; border-bottom: 1px solid rgba(255,0,255,0.1);">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <span style="font-weight: bold;">💰 ${signal.symbol}</span>
                                        <span class="signal-action ${signal.action}" style="font-size: 10px;">${signal.action.toUpperCase()}</span>
                                        <span style="color: ${statusColor}; font-size: 11px;">${statusText}</span>
                                    </div>
                                    <div style="font-size: 11px; color: #aaa; margin-top: 5px;">
                                        💵 $${typeof signal.price === 'number' ? signal.price.toLocaleString() : signal.price} | ⏰ ${time} | 🎯 Сила: ${signal.strength}/5
                                    </div>
                                    ${signal.profit ? `<div style="font-size: 11px; color: #00ff88; margin-top: 3px;">📈 Профит: +${signal.profit}%</div>` : ''}
                                    ${signal.loss ? `<div style="font-size: 11px; color: #ff4444; margin-top: 3px;">📉 Убыток: ${signal.loss}%</div>` : ''}
                                </div>
                            `;
                        }).join('')}
                        ${history.length === 0 ? '<div style="text-align: center; padding: 20px; color: #666;">История пуста</div>' : ''}
                    </div>
                    
                    <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: center;">
                        <button onclick="UI.clearHistory()" style="background: rgba(255,0,0,0.3); border: 1px solid #ff4444; color: #fff; padding: 8px 16px; border-radius: 20px; cursor: pointer;">
                            🗑️ ОЧИСТИТЬ ИСТОРИЮ
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }
    
    function closeHistoryModal() {
        const modal = document.getElementById('historyModal');
        if (modal) modal.remove();
    }
    
    function clearHistory() {
        if (confirm('Очистить всю историю сигналов? Это действие нельзя отменить.')) {
            History.clearHistory();
            closeHistoryModal();
            updateStats(allSignals);
            speak('История сигналов очищена');
        }
    }
    
    function refreshSignals() {
        if (window.scanSignals) {
            window.scanSignals();
        }
    }
    
    function playAlertSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.frequency.value = 880;
            gainNode.gain.value = 0.15;
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.3);
            oscillator.stop(audioCtx.currentTime + 0.3);
        } catch(e) {}
    }
    
    function speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ru-RU';
            utterance.rate = 1.0;
            utterance.volume = 0.8;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        }
    }
    
    function updateTime() {
        const now = new Date();
        document.getElementById('liveTime').innerHTML = now.toLocaleTimeString('ru-RU');
    }
    
    return { 
        renderSignals, 
        updateStats, 
        filterSignals, 
        playAlertSound, 
        speak, 
        updateTime, 
        showHistoryModal, 
        closeHistoryModal,
        clearHistory,
        refreshSignals
    };
})();
