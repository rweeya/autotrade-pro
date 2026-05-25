// js/history.js - История сигналов и аналитика
const History = (function() {
    let signalsHistory = [];
    let resolvedSignals = new Map();
    
    function addSignal(signal) {
        const record = {
            id: Date.now() + Math.random() * 1000,
            symbol: signal.symbol,
            action: signal.action,
            price: signal.price,
            strength: signal.strength,
            reasons: signal.reasons,
            timestamp: signal.timestamp || new Date().toISOString(),
            status: 'pending',
            checks: []
        };
        
        signalsHistory.unshift(record);
        
        // Храним только последние 500 сигналов
        if (signalsHistory.length > 500) {
            signalsHistory = signalsHistory.slice(0, 500);
        }
        
        saveToLocalStorage();
        return record;
    }
    
    function updateSignalResult(signalId, currentPrice) {
        const signal = signalsHistory.find(s => s.id === signalId);
        if (!signal || signal.status !== 'pending') return;
        
        const priceChange = signal.action === 'buy' 
            ? (currentPrice - signal.price) / signal.price
            : (signal.price - currentPrice) / signal.price;
        
        const timeElapsed = (Date.now() - new Date(signal.timestamp).getTime()) / 60000;
        
        signal.checks.push({
            timeMinutes: Math.round(timeElapsed),
            priceChange: (priceChange * 100).toFixed(2),
            isWin: priceChange > 0.015 // 1.5% профита считаем победой
        });
        
        if (priceChange > 0.015) {
            signal.status = 'win';
            signal.profit = (priceChange * 100).toFixed(2);
        } else if (priceChange < -0.02) {
            signal.status = 'loss';
            signal.loss = (priceChange * 100).toFixed(2);
        } else if (timeElapsed > 120) {
            signal.status = 'loss';
            signal.loss = (priceChange * 100).toFixed(2);
        }
        
        saveToLocalStorage();
    }
    
    function getAccuracy() {
        const resolved = signalsHistory.filter(s => s.status !== 'pending');
        if (resolved.length === 0) return null;
        
        const wins = resolved.filter(s => s.status === 'win').length;
        const accuracy = (wins / resolved.length * 100).toFixed(1);
        
        return accuracy;
    }
    
    function getPerformanceBySymbol() {
        const performance = {};
        
        signalsHistory.forEach(signal => {
            if (signal.status !== 'pending') {
                if (!performance[signal.symbol]) {
                    performance[signal.symbol] = { 
                        wins: 0, 
                        losses: 0, 
                        totalProfit: 0,
                        signals: []
                    };
                }
                
                performance[signal.symbol].signals.push(signal);
                
                if (signal.status === 'win') {
                    performance[signal.symbol].wins++;
                    performance[signal.symbol].totalProfit += parseFloat(signal.profit || 0);
                } else {
                    performance[signal.symbol].losses++;
                }
            }
        });
        
        // Добавляем процент побед
        for (const symbol in performance) {
            const total = performance[symbol].wins + performance[symbol].losses;
            performance[symbol].winRate = total > 0 
                ? (performance[symbol].wins / total * 100).toFixed(1) 
                : 0;
        }
        
        return performance;
    }
    
    function getRecentSignals(limit = 50) {
        return signalsHistory.slice(0, limit);
    }
    
    function getStatistics() {
        const total = signalsHistory.length;
        const wins = signalsHistory.filter(s => s.status === 'win').length;
        const losses = signalsHistory.filter(s => s.status === 'loss').length;
        const pending = signalsHistory.filter(s => s.status === 'pending').length;
        
        return {
            total,
            wins,
            losses,
            pending,
            winRate: total > 0 ? (wins / (wins + losses) * 100).toFixed(1) : 0
        };
    }
    
    function saveToLocalStorage() {
        try {
            localStorage.setItem('tradeSignals', JSON.stringify(signalsHistory));
        } catch(e) {
            console.log('Save error:', e);
        }
    }
    
    function loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('tradeSignals');
            if (saved) {
                signalsHistory = JSON.parse(saved);
                console.log(`Загружено ${signalsHistory.length} сигналов из истории`);
            }
        } catch(e) {
            console.log('Load error:', e);
        }
    }
    
    // Очистка истории
    function clearHistory() {
        signalsHistory = [];
        saveToLocalStorage();
    }
    
    // Загружаем историю при инициализации
    loadFromLocalStorage();
    
    // Проверяем старые сигналы каждые 5 минут
    setInterval(() => {
        const now = Date.now();
        signalsHistory.forEach(signal => {
            if (signal.status === 'pending') {
                const age = (now - new Date(signal.timestamp).getTime()) / 60000;
                if (age > 60) {
                    signal.status = 'loss';
                    signal.loss = '0';
                    saveToLocalStorage();
                }
            }
        });
    }, 300000);
    
    return {
        addSignal,
        updateSignalResult,
        getAccuracy,
        getPerformanceBySymbol,
        getRecentSignals,
        getStatistics,
        clearHistory
    };
})();