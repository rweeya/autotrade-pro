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
        
        console.log(`🤖 АВТОТОРГОВЛЯ: ${signal.action.toUpperCase()} ${symbol} на сумму $${amount.toFixed(2)}`);
        
        // Симулируем ордер
        const order = {
            id: Date.now(),
            symbol: symbol,
            side: signal.action.toUpperCase(),
            amount: amount,
            price: signal.price,
            timestamp: new Date().toISOString(),
            strength: signal.strength
        };
        
        virtualPortfolio.positions.push(order);
        virtualPortfolio.balance -= amount;
        
        updatePortfolioDisplay();
        
        UI.speak(`Авто сделка: ${signal.action} по ${symbol} на ${amount.toFixed(0)} долларов`);
        
        // Планируем закрытие позиции через 60 минут
        setTimeout(() => closePosition(order.id, signal), 60 * 60 * 1000);
        
    } catch(e) {
        console.log('Auto trade error:', e);
    }
}

// Расчет размера позиции
function calculatePositionSize(signal) {
    // Рискуем 2-5% в зависимости от силы сигнала
    const riskPercent = Math.min(0.05, 0.02 + (signal.strength - 3) * 0.0075);
    return virtualPortfolio.balance * riskPercent;
}

// Закрытие позиции
function closePosition(orderId, signal) {
    const positionIndex = virtualPortfolio.positions.findIndex(p => p.id === orderId);
    if (positionIndex === -1) return;
    
    const position = virtualPortfolio.positions[positionIndex];
    const currentPrice = TradingView.getPrice(signal.symbol);
    
    let profit = 0;
    if (position.side === 'BUY') {
        profit = (currentPrice - position.price) / position.price * position.amount;
    } else {
        profit = (position.price - currentPrice) / position.price * position.amount;
    }
    
    virtualPortfolio.balance += position.amount + profit;
    virtualPortfolio.positions.splice(positionIndex, 1);
    
    virtualPortfolio.history.push({
        symbol: position.symbol,
        side: position.side,
        profit: profit,
        timestamp: new Date().toISOString()
    });
    
    updatePortfolioDisplay();
    
    if (profit > 0) {
        UI.speak(`Закрыта позиция ${position.symbol}, прибыль ${profit.toFixed(2)} долларов`);
    } else {
        UI.speak(`Закрыта позиция ${position.symbol}, убыток ${Math.abs(profit).toFixed(2)} долларов`);
    }
}

// Обновление отображения портфеля
function updatePortfolioDisplay() {
    const totalPositionsValue = virtualPortfolio.positions.reduce((sum, p) => sum + p.amount, 0);
    const totalEquity = virtualPortfolio.balance + totalPositionsValue;
    const totalProfit = virtualPortfolio.history.reduce((sum, h) => sum + h.profit, 0);
    
    let portfolioHtml = `
        <div class="portfolio-panel" style="margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.6); border-radius: 10px; border: 1px solid rgba(0,255,255,0.2);">
            <h4 style="color: #ff00ff; margin-bottom: 10px;">💼 ВИРТУАЛЬНЫЙ ПОРТФЕЛЬ</h4>
            <div style="font-size: 13px;">💰 Баланс: $${virtualPortfolio.balance.toFixed(2)}</div>
            <div style="font-size: 13px;">📊 Эквити: $${totalEquity.toFixed(2)}</div>
            <div style="font-size: 12px;">📈 Общий P&L: <span style="color: ${totalProfit >= 0 ? '#00ff88' : '#ff4444'}">$${totalProfit.toFixed(2)}</span></div>
            <div style="font-size: 12px;">🎯 Открыто позиций: ${virtualPortfolio.positions.length}</div>
            ${virtualPortfolio.positions.length > 0 ? `
                <div style="margin-top: 10px; max-height: 150px; overflow-y: auto; background: rgba(0,0,0,0.3); border-radius: 8px; padding: 8px;">
                    <div style="font-size: 10px; color: #aaa; margin-bottom: 5px;">🏃‍♂️ Активные позиции:</div>
                    ${virtualPortfolio.positions.map(p => `
                        <div style="font-size: 10px; padding: 3px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                            ${p.side === 'BUY' ? '🟢' : '🔴'} ${p.symbol} @ $${p.price.toFixed(2)} | $${p.amount.toFixed(0)}
                        </div>
                    `).join('')}
                </div>
            ` : '<div style="font-size: 11px; color: #666; margin-top: 10px;">Нет открытых позиций</div>'}
            <div style="margin-top: 10px; display: flex; gap: 8px;">
                <button onclick="closeAllPositions()" style="background: rgba(255,0,0,0.3); border: 1px solid #ff4444; color: white; padding: 5px 10px; border-radius: 8px; cursor: pointer; font-size: 10px;">
                    🔒 Закрыть все
                </button>
                <button onclick="resetPortfolio()" style="background: rgba(255,255,0,0.2); border: 1px solid #ffaa00; color: white; padding: 5px 10px; border-radius: 8px; cursor: pointer; font-size: 10px;">
                    🔄 Сброс
                </button>
            </div>
        </div>
    `;
    
    const infoPanel = document.querySelector('.info-panel');
    const oldPanel = document.querySelector('.portfolio-panel');
    if (oldPanel) oldPanel.remove();
    if (infoPanel) infoPanel.insertAdjacentHTML('beforeend', portfolioHtml);
}

// Закрытие всех позиций
function closeAllPositions() {
    if (confirm('Закрыть все открытые позиции?')) {
        const totalValue = virtualPortfolio.positions.reduce((sum, pos) => sum + pos.amount, 0);
        virtualPortfolio.balance += totalValue;
        virtualPortfolio.positions = [];
        updatePortfolioDisplay();
        UI.speak('Все позиции закрыты');
    }
}

// Сброс портфеля
function resetPortfolio() {
    if (confirm('Сбросить виртуальный портфель к начальному балансу $10,000?')) {
        virtualPortfolio = {
            balance: 10000,
            positions: [],
            history: []
        };
        updatePortfolioDisplay();
        UI.speak('Портфель сброшен');
    }
}

// Добавление фильтра по типу актива
function addAssetFilter() {
    const filterRow = document.querySelector('.filter-row');
    if (filterRow && !document.getElementById('assetFilter')) {
        const assetFilter = document.createElement('select');
        assetFilter.id = 'assetFilter';
        assetFilter.className = 'filter-select';
        assetFilter.innerHTML = `
            <option value="all">📊 Все активы</option>
            <option value="crypto">🪙 Криптовалюты</option>
            <option value="forex">💱 Форекс</option>
            <option value="stock">📈 Акции</option>
        `;
        assetFilter.addEventListener('change', () => UI.filterSignals());
        filterRow.appendChild(assetFilter);
    }
}

// Инициализация приложения
function init() {
    console.log('🚀 Auto Trade Pro инициализация...');
    
    // Показываем инструкцию по TradingView
    TradingView.showSetupInstructions();
    
    // Запускаем эмуляцию TradingView сигналов
    TradingView.startEmulation(25);
    
    // Подписываемся на оповещения
    TradingView.onAlert((signal) => {
        console.log('📡 Новый сигнал:', signal);
        scanSignals();
    });
    
    // Обновление времени
    UI.updateTime();
    setInterval(UI.updateTime, 1000);
    
    // Первое сканирование
    setTimeout(() => {
        scanSignals();
    }, 1000);
    
    // Регулярное сканирование
    setInterval(scanSignals, 50000);
    
    // Настройка фильтров
    const searchFilter = document.getElementById('searchFilter');
    const typeFilter = document.getElementById('typeFilter');
    
    if (searchFilter) searchFilter.addEventListener('input', () => UI.filterSignals());
    if (typeFilter) typeFilter.addEventListener('change', () => UI.filterSignals());
    
    // Таймфреймы
    document.querySelectorAll('.tf-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTimeframe = btn.getAttribute('data-tf');
            scanSignals();
        });
    });
    
    addAssetFilter();
    updatePortfolioDisplay();
    
    console.log('✅ Auto Trade Pro готов к работе!');
}

// Открытие графика
window.openChart = function(symbol) {
    let tvSymbol = symbol;
    
    if (symbol.includes('USDT') || symbol.includes('/USDT')) {
        let clean = symbol.replace('/USDT', '').replace('USDT', '');
        tvSymbol = `BINANCE:${clean}USDT`;
    } else if (symbol.includes('/')) {
        tvSymbol = `FX:${symbol.replace('/', '')}`;
    } else {
        tvSymbol = `NASDAQ:${symbol}`;
    }
    
    window.open(`https://www.tradingview.com/chart/?symbol=${tvSymbol}`, '_blank');
};

window.closeAllPositions = closeAllPositions;
window.resetPortfolio = resetPortfolio;
window.scanSignals = scanSignals;

// 3D сцена
(function init3D() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 15);
    
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    const gridHelper = new THREE.GridHelper(30, 40, 0xff00ff, 0x00ffff);
    gridHelper.position.y = -3;
    scene.add(gridHelper);
    
    const geometry = new THREE.BoxGeometry(3, 3, 3);
    const edges = new THREE.EdgesGeometry(geometry);
    const wireframe = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xff00ff }));
    scene.add(wireframe);
    
    const particlesCount = 800;
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesPositions = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount; i++) {
        particlesPositions[i*3] = (Math.random() - 0.5) * 50;
        particlesPositions[i*3+1] = (Math.random() - 0.5) * 30;
        particlesPositions[i*3+2] = (Math.random() - 0.5) * 30 - 15;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlesPositions, 3));
    const particlesMaterial = new THREE.PointsMaterial({ color: 0x00ffff, size: 0.08 });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);
    
    const ambientLight = new THREE.AmbientLight(0x404060);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xff00ff, 0.8, 30);
    pointLight.position.set(2, 3, 4);
    scene.add(pointLight);
    
    let time = 0;
    function animate() {
        requestAnimationFrame(animate);
        time += 0.005;
        wireframe.rotation.x = time * 0.3;
        wireframe.rotation.y = time * 0.5;
        particles.rotation.y = time * 0.05;
        renderer.render(scene, camera);
    }
    animate();
    
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
})();

// Запуск
init();
