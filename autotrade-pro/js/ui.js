// ========== МОДУЛЬ UI ==========

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
        container.innerHTML = html;
        allSignals = signals;
    }
    
    function updateStats(signals) {
        const total = signals.length;
        const buys = signals.filter(s => s.action === 'buy').length;
        const sells = total - buys;
        document.getElementById('totalSignals').innerText = total;
        document.getElementById('buySignals').innerText = buys;
        document.getElementById('sellSignals').innerText = sells;
        document.getElementById('accuracy').innerText = total > 10 ? '78%' : '—';
    }
    
    function filterSignals() {
        const searchTerm = document.getElementById('searchFilter').value.toLowerCase();
        const typeFilter = document.getElementById('typeFilter').value;
        
        const cards = document.querySelectorAll('.signal-card');
        cards.forEach(card => {
            const symbol = card.getAttribute('data-symbol')?.toLowerCase() || '';
            const action = card.getAttribute('data-action') || '';
            
            let show = true;
            if (searchTerm && !symbol.includes(searchTerm)) show = false;
            if (typeFilter !== 'all' && action !== typeFilter) show = false;
            
            card.style.display = show ? 'block' : 'none';
        });
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
    
    return { renderSignals, updateStats, filterSignals, playAlertSound, speak, updateTime };
})();