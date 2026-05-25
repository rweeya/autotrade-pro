// js/app.js - ОБНОВЛЕННАЯ ВЕРСИЯ С TRADINGVIEW
let previousSignalsList = [];
let currentTimeframe = '1h';
let isScanning = false;
let tradingViewMode = true; // Используем TradingView режим

// Bybit Testnet конфиг
const BYBIT_CONFIG = {
    testnet: true,
    apiKey: null,
    apiSecret: null,
    baseUrl: 'https://api-testnet.bybit.com'
};

// Виртуальный портфель
let virtualPortfolio = {
    balance: 10000,
    positions: [],
    history: []
};

async function scanSignals() {
    if (isScanning) return;
    isScanning = true;
    
    const container = document.getElementById('signalsContainer');
    container.innerHTML = '<div style="text-align: center; padding: 40px;">🎯 Анализ TradingView сигналов...</div>';
    
    let signals = [];
    
    if (tradingViewMode) {
        // Используем TradingView сигналы
        signals = await TradingView.scanAllSymbols();
        
        // Добавляем в историю
        signals.forEach(signal => {
            if (History.addSignal) {
                History.addSignal(signal);
            }
        });
    } else {
        // Fallback на старую систему
        const symbols = API.getAllSymbols();
        
        for (let symbol of symbols) {
            try {
                const data = await API.getData(symbol, currentTimeframe);
                const analysis = Indicators.analyze(data.closes, data.highs, data.lows);
                
                if (analysis.action && analysis.strength >= 4) {
                    signals.push({
                        symbol: symbol.includes('USDT') ? symbol.replace('USDT', '/USDT') : symbol,
                        action: analysis.action,
                        price: analysis.price,
                        rsi: analysis.rsi,
                        strength: analysis.strength,
                        reasons: analysis.reasons,
                        assetType: API.getAssetType(symbol),
                        timestamp: new Date().toISOString(),
                        source: 'Indicators'
                    });
                }
            } catch(e) {
                console.log(`Ошибка ${symbol}:`, e);
            }
            await new Promise(r => setTimeout(r, 50));
        }
    }
    
    const newSignals = signals.filter(s => 
        !previousSignalsList.some(p => p.symbol === s.symbol && p.action === s.action)
    );
    
    if (newSignals.length > 0) {
        UI.playAlertSound();
        UI.speak(`Новый TradingView сигнал! ${newSignals[0].action} по ${newSignals[0].symbol}`);
        
        // Автоторговля
        newSignals.forEach(signal => {
            if (virtualPortfolio.balance > 0) {
                executeAutoTrade(signal);
            }
        });
    }
    
    previousSignalsList = signals;
    UI.renderSignals(signals);
    UI.updateStats(signals);
    
    isScanning = false;
}

async function executeAutoTrade(signal) {
    try {
        if (!signal.symbol.includes('USDT') || !BYBIT_CONFIG.apiKey) {
            console.log(`🤖 Автоторговля пропущена для ${signal.symbol} (только крипто USDT пары)`);
            return;
        }
        
        const symbol = signal.symbol.replace('/', '');
        const amount = calculatePositionSize(signal);
        
        console.log(`🤖 АВТОТОРГОВЛЯ: ${signal.action.toUpperCase()} ${symbol} на сумму $${amount.toFixed(2)}`);
        
        // Симулируем ордер
        const order = {
            id: Date.now(),
            symbol: symbol,
            side: signal.action.toUpperCase(),
            amount: amount,
            price: signal.price,
            timestamp: new Date().toISOString()
        };
        
        virtualPortfolio.positions.push(order);
        virtualPortfolio.balance -= amount;
        
        updatePortfolioDisplay();
        
        UI.speak(`Авто сделка: ${signal.action} по ${symbol}`);
        
    } catch(e) {
        console.log('Auto trade error:', e);
    }
}

function calculatePositionSize(signal) {
    const riskPercent = 0.02; // 2% риска
    return virtualPortfolio.balance * riskPercent;
}

function updatePortfolioDisplay() {
    let portfolioHtml = `
        <div class="portfolio-panel" style="margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.5); border-radius: 10px;">
            <h4 style="color: #ff00ff; margin-bottom: 10px;">💼 ВИРТУАЛЬНЫЙ ПОРТФЕЛЬ</h4>
            <div style="font-size: 14px;">💰 Баланс: $${virtualPortfolio.balance.toFixed(2)}</div>
            <div style="font-size: 12px;">📊 Открыто позиций: ${virtualPortfolio.positions.length}</div>
            ${virtualPortfolio.positions.length > 0 ? `
                <div style="margin-top: 10px; max-height: 150px; overflow-y: auto;">
                    <div style="font-size: 11px; color: #aaa;">🏃‍♂️ Активные позиции:</div>
                    ${virtualPortfolio.positions.map(p => `
                        <div style="font-size: 10px; padding: 4px 0;">${p.side} ${p.symbol} @ $${p.price.toFixed(2)}</div>
                    `).join('')}
                </div>
            ` : '<div style="font-size: 11px; color: #666;">Нет открытых позиций</div>'}
            <button onclick="closeAllPositions()" style="margin-top: 10px; background: rgba(255,0,0,0.3); border: 1px solid red; color: white; padding: 5px 10px; border-radius: 10px; cursor: pointer; font-size: 11px;">
                🔒 Закрыть все позиции
            </button>
        </div>
    `;
    
    const infoPanel = document.querySelector('.info-panel');
    const oldPanel = document.querySelector('.portfolio-panel');
    if (oldPanel) oldPanel.remove();
    infoPanel.insertAdjacentHTML('beforeend', portfolioHtml);
}

function closeAllPositions() {
    if (confirm('Закрыть все позиции?')) {
        const totalValue = virtualPortfolio.positions.reduce((sum, pos) => sum + pos.amount, 0);
        virtualPortfolio.balance += totalValue;
        virtualPortfolio.positions = [];
        updatePortfolioDisplay();
        UI.speak('Все позиции закрыты');
    }
}

function addAssetFilter() {
    const filterRow = document.querySelector('.filter-row');
    if (!document.getElementById('assetFilter')) {
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

function init() {
    UI.updateTime();
    setInterval(UI.updateTime, 1000);
    
    // Показываем инструкцию по TradingView
    console.log(TradingView.showSetupInstructions());
    
    // Запускаем эмуляцию TradingView сигналов (каждые 30 секунд)
    TradingView.startEmulation(30);
    
    // Подписываемся на оповещения
    TradingView.onAlert((signal) => {
        console.log('📡 Получен TradingView сигнал:', signal);
        UI.playAlertSound();
        UI.speak(`TradingView сигнал: ${signal.action} по ${signal.symbol}`);
        scanSignals(); // Обновляем список сигналов
    });
    
    // Первое сканирование
    scanSignals();
    
    // Регулярное сканирование
    setInterval(scanSignals, 60000);
    
    // Фильтры
    document.getElementById('searchFilter').addEventListener('keyup', () => UI.filterSignals());
    document.getElementById('typeFilter').addEventListener('change', () => UI.filterSignals());
    
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
}

window.openChart = function(symbol) {
    // Открываем график в TradingView
    let tvSymbol = symbol;
    if (symbol.includes('USDT')) {
        tvSymbol = `BINANCE:${symbol.replace('/USDT', '').replace('USDT', '')}USDT`;
    } else if (symbol.match(/[A-Z]{6}/)) {
        tvSymbol = `FX:${symbol}`;
    } else {
        tvSymbol = `NASDAQ:${symbol}`;
    }
    
    window.open(`https://www.tradingview.com/chart/?symbol=${tvSymbol}`, '_blank');
};

window.closeAllPositions = closeAllPositions;

// Оптимизированная 3D сцена
(function init3D() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 15);
    const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg-canvas'), alpha: false });
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
    const pointLight = new THREE.PointLight(0xff00ff, 1, 30);
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

// Запускаем приложение
init();
