// js/ui.js - обновленная версия
const UI = (function() {
    
    let allSignals = [];
    
    function renderSignals(signals) {
        const container = document.getElementById('signalsContainer');
        
        if (!signals || signals.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 40px;">📭 Нет сигналов (нужно 4+ индикаторов)</div>';
            return;
        }
        
        let html = '';
        for (let s of signals) {
            const actionClass = s.action === 'buy' ? 'buy' : 'sell';
            const actionText = s.action === 'buy' ? '🟢 BUY' : '🔴 SELL';
            const time = new Date().toLocaleTimeString();
            const strengthStars = '★'.repeat(s.strength) + '☆'.repeat(5 - s.strength);
            
            html += `
                <div class="signal-card" data-symbol="${s.symbol}" data-action="${s.action}" onclick="window.openChart('${s.symbol}')">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="signal-symbol">💰 ${s.symbol}</span>
                        <span class="signal-action ${actionClass}">${actionText}</span>
                        <span class="signal-strength">⚡ ${strengthStars}</span>
                    </div>
                    <div style="display: flex; gap: 15px; margin-top: 8px; font-size: 11px; color: #aaa;">
                        <span>💵 $${Number(s.price).toLocaleString()}</span>
                        <span>📊 RSI: ${s.rsi}</span>
                        <span>⏰ ${time}</span>
                        <span>🎯 ${s.strength}/5</span>
                    </div>
                    <div style="margin-top: 6px; font-size: 10px; color: #ffaa66;">📊 ${s.reasons}</div>
                </div>
            `;
        }
        
        // Добавляем кнопку для просмотра истории
        html += `
            <div style="text-align: center; margin-top: 15px;">
                <button onclick="UI.showHistoryModal()" style="background: rgba(255,0,255,0.2); border: 1px solid #ff00ff; color: #fff; padding: 8px 16px; border-radius: 20px; cursor: pointer;">
                    📜 ИСТОРИЯ СИГНАЛОВ (${History.getRecentSignals().length})
                </button>
            </div>
        `;
        
        container.innerHTML = html;
        allSignals = signals;
    }
    
    function updateStats(signals) {
        const total = signals.length;
        const buys = signals.filter(s => s.action === 'buy').length;
        const sells = total - buys;
        const accuracy = History.getAccuracy();
        
        document.getElementById('totalSignals').innerText = total;
        document.getElementById('buySignals').innerText = buys;
        document.getElementById('sellSignals').innerText = sells;
        document.getElementById('accuracy').innerHTML = accuracy ? `${accuracy}%` : '—';
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
            
            // Фильтр по типу актива
            if (assetFilter !== 'all') {
                if (assetFilter === 'crypto' && !symbol.includes('USDT')) show = false;
                if (assetFilter === 'forex' && !symbol.match(/[A-Z]{6}/)) show = false;
                if (assetFilter === 'stock' && symbol.length <= 5 && !symbol.includes('USDT') && !symbol.match(/[A-Z]{6}/)) show = false;
            }
            
            card.style.display = show ? 'block' : 'none';
        });
    }
    
    function showHistoryModal() {
        const history = History.getRecentSignals(100);
        const accuracy = History.getAccuracy();
        const performance = History.getPerformanceBySymbol();
        
        let modalHtml = `
            <div id="historyModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);">
                <div style="background: linear-gradient(135deg, #0a0a2e, #1a1a3e); border: 1px solid #ff00ff; border-radius: 20px; width: 90%; max-width: 800px; max-height: 80vh; overflow: auto; padding: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h2 style="color: #ff00ff;">📜 ИСТОРИЯ СИГНАЛОВ</h2>
                        <button onclick="UI.closeHistoryModal()" style="background: none; border: none; color: #ff00ff; font-size: 24px; cursor: pointer;">✖</button>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
                        <div style="background: rgba(0,255,255,0.1); padding: 10px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 24px; color: #00ffff;">${accuracy || '—'}%</div>
                            <div style="font-size: 11px;">ТОЧНОСТЬ</div>
                        </div>
                        <div style="background: rgba(0,255,255,0.1); padding: 10px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 24px; color: #00ffff;">${history.length}</div>
                            <div style="font-size: 11px;">ВСЕГО СИГНАЛОВ</div>
                        </div>
                        <div style="background: rgba(0,255,255,0.1); padding: 10px; border-radius: 10px; text-align: center;">
                            <div style="font-size: 24px; color: #00ffff;">${Object.keys(performance).length}</div>
                            <div style="font-size: 11px;">АКТИВОВ</div>
                        </div>
                    </div>
                    
                    <h3 style="color: #00ffff; margin-bottom: 10px;">🏆 ЛУЧШИЕ АКТИВЫ</h3>
                    <div style="margin-bottom: 20px; max-height: 200px; overflow-y: auto;">
                        ${Object.entries(performance).sort((a,b) => (b[1].wins/(b[1].wins+b[1].losses)) - (a[1].wins/(a[1].wins+a[1].losses))).slice(0,5).map(([symbol, stats]) => {
                            const winrate = stats.wins + stats.losses > 0 ? (stats.wins/(stats.wins+stats.losses)*100).toFixed(1) : 0;
                            return `
                                <div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid rgba(255,0,255,0.2);">
                                    <span>💰 ${symbol}</span>
                                    <span style="color: #00ff88;">✅ ${stats.wins}</span>
                                    <span style="color: #ff4444;">❌ ${stats.losses}</span>
                                    <span style="color: #ffaa00;">📊 ${winrate}%</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    
                    <h3 style="color: #00ffff; margin-bottom: 10px;">⏱️ ПОСЛЕДНИЕ СИГНАЛЫ</h3>
                    <div style="max-height: 300px; overflow-y: auto;">
                        ${history.map(signal => {
                            const time = new Date(signal.timestamp).toLocaleString();
                            const statusColor = signal.status === 'win' ? '#00ff88' : (signal.status === 'loss' ? '#ff4444' : '#ffaa00');
                            const statusText = signal.status === 'win' ? '✅ ВЫИГРЫШ' : (signal.status === 'loss' ? '❌ ПРОИГРЫШ' : '⏳ В ПРОЦЕССЕ');
                            return `
                                <div style="padding: 10px; border-bottom: 1px solid rgba(255,0,255,0.1);">
                                    <div style="display: flex; justify-content: space-between;">
                                        <span style="font-weight: bold;">${signal.symbol}</span>
                                        <span class="signal-action ${signal.action}">${signal.action.toUpperCase()}</span>
                                        <span style="color: ${statusColor};">${statusText}</span>
                                    </div>
                                    <div style="font-size: 11px; color: #aaa;">💰 $${signal.predictedPrice} | ⏰ ${time}</div>
                                    ${signal.profit ? `<div style="font-size: 11px; color: #00ff88;">📈 +${signal.profit.toFixed(2)}%</div>` : ''}
                                </div>
                            `;
                        }).join('')}
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
    
    function playAlertSound() {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.frequency.value = 880;
            gainNode.gain.value = 0.2;
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.3);
            oscillator.stop(audioCtx.currentTime + 0.3);
        } catch(e) {}
    }
    
    function speak(text) {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ru-RU';
            utterance.rate = 1.1;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        }
    }
    
    function updateTime() {
        document.getElementById('liveTime').innerHTML = new Date().toLocaleTimeString('ru-RU');
    }
    
    return { renderSignals, updateStats, filterSignals, playAlertSound, speak, updateTime, showHistoryModal, closeHistoryModal };
})();
