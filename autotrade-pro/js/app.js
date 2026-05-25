// js/app.js - Главная логика приложения
let previousSignalsList = [];
let currentTimeframe = '1h';
let isScanning = false;
let lastSignalsHash = '';

// Виртуальный портфель для тестирования
let virtualPortfolio = {
    balance: 10000,
    positions: [],
    history: []
};

// Основная функция сканирования сигналов
async function scanSignals() {
    if (isScanning) return;
    isScanning = true;
    
    console.log('🔍 Сканирование TradingView сигналов...');
    
    const container = document.getElementById('signalsContainer');
    if (container) {
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #888;">🎯 Анализ TradingView сигналов...</div>';
    }
    
    try {
        // Получаем сигналы от TradingView
        const signals = await TradingView.scanAllSignals();
        
        // Добавляем в историю
        signals.forEach(signal => {
            History.addSignal(signal);
        });
        
        // Проверяем новые сигналы
        const signalsHash = JSON.stringify(signals.map(s => `${s.symbol}_${s.action}`));
        if (signalsHash !== lastSignalsHash && signals.length > 0) {
            const newSignals = signals.filter(s => 
                !previousSignalsList.some(p => p.symbol === s.symbol && p.action === s.action)
            );
            
            if (newSignals.length > 0) {
                UI.playAlertSound();
                UI.speak(`Новый TradingView сигнал! ${newSignals[0].action} по ${newSignals[0].symbol}`);
                
                // Автоторговля для сильных сигналов
                for (const signal of newSignals) {
                    if (signal.strength >= 4 && virtualPortfolio.balance > 0) {
                        await executeAutoTrade(signal);
                    }
                }
            }
        }
        
        lastSignalsHash = signalsHash;
        previousSignalsList = signals;
        
        // Обновляем интерфейс
        UI.renderSignals(signals);
        UI.updateStats(signals);
        
        console.log(`✅ Найдено сигналов: ${signals.length}`);
        
    } catch (error) {
        console.error('Ошибка сканирования:', error);
        if (container) {
            container.innerHTML = '<div style="text-align: center; padding: 40px; color: #ff4444;">❌ Ошибка загрузки сигналов</div>';
        }
    }
    
    isScanning = false;
}

// Автоторговля
async function executeAutoTrade(signal) {
    try {
        // Только для USDT пар на тестовой сети
        if (!signal.symbol.includes('USDT') && !signal.symbol.includes('/USDT')) {
            console.log(`⏭️ Автоторговля пропущена для ${signal.symbol} (не USDT пара)`);
            return;
        }
        
        const symbol = signal.symbol.replace('/', '');
        const amount = calculatePositionSize(signal);
        
        if (amount < 10) {
            console.log(`⏭️ Сумма слишком мала: $${amount.toFixed(2)}`);
            return;
        }
        
        console.log(`🤖 АВТОТОРГОВЛЯ: ${signal
