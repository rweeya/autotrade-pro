// js/app.js - обновленная версия
let previousSignalsList = [];
let currentTimeframe = '1h';
let scanTimeout = null;
let isScanning = false;

// Bybit Testnet конфиг
const BYBIT_CONFIG = {
    testnet: true,
    apiKey: null, // Добавьте ваш API ключ Bybit Testnet
    apiSecret: null,
    baseUrl: 'https://api-testnet.bybit.com'
};

// Виртуальный портфель для тестирования
let virtualPortfolio = {
    balance: 10000,
    positions: [],
    history: []
};

async function scanSignals() {
    if (isScanning) return;
    isScanning = true;
    
    const container = document.getElementById('signalsContainer');
    container.innerHTML = '<div style="text-align: center; padding: 40px;">⏳ Анализ 40+ активов...</div>';
    
    const symbols = API.getAllSymbols();
    let signals = [];
    
    // Оптимизация: обрабатываем пачками по 5 символов
    const batchSize = 5;
    for (let i = 0; i < symbols.length; i += batchSize) {
        const batch = symbols.slice(i, i + batchSize);
        const batchPromises = batch.map(async (symbol) => {
            try {
                const data = await API.getData(symbol, currentTimeframe);
                const analysis = Indicators.analyze(data.closes, data.highs, data.lows);
                
                if (analysis.action && analysis.strength >= 4) {
                    const signal = {
                        symbol: symbol.includes('USDT') ? symbol.replace('USDT', '/USDT') : symbol,
                        action: analysis.action,
                        price: analysis.price,
                        rsi: analysis.rsi,
                        strength: analysis.strength,
                        reasons: analysis.reasons,
                        assetType: API.getAssetType(symbol),
                        timestamp: new Date().toISOString()
                    };
                    
                    // Добавляем в историю
                    History.addSignal(signal);
                    
                    // Проверяем автоторговлю
                    if (virtualPortfolio.balance > 0) {
                        await executeAutoTrade(signal);
                    }
                    
                    return signal;
                }
            } catch(e) {
                console.log(`Ошибка ${symbol}:`, e);
            }
            return null;
        });
        
        const batchResults = await Promise.all(batchPromises);
        signals.push(...batchResults.filter(s => s !== null));
        
        // Небольшая задержка между пачками
        await new Promise(r => setTimeout(r, 100));
    }
    
    signals.sort((a,b) => b.strength - a.strength);
    
    const newSignals = signals.filter(s => 
        !previousSignalsList.some(p => p.symbol === s.symbol && p.action === s.action)
    );
    
    if (newSignals.length > 0) {
        UI.playAlertSound();
        UI.speak(`Новый сигнал! ${newSignals[0].action} по ${newSignals[0].symbol}`);
    }
    previousSignalsList = signals;
    
    UI.renderSignals(signals);
    UI.updateStats(signals);
    
    isScanning = false;
}

async function executeAutoTrade(signal) {
    try {
        // Только для криптовалют на тестовой сети
        if (!signal.symbol.includes('USDT') || !BYBIT_CONFIG.apiKey) {
            return;
        }
        
        const symbol = signal.symbol.replace('/', '');
        const amount = calculatePositionSize(signal);
        
        console.log(`🤖 Автоторговля: ${signal.action} ${symbol} на сумму $${amount}`);
        
        // В реальном коде здесь был бы API запрос к Bybit
        // const order = await placeBybitOrder(symbol, signal.action, amount);
        
        // Симулируем ордер для демонстрации
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
        
    } catch(e) {
        console.log('Auto trade error:', e);
    }
}

function calculatePositionSize(signal) {
    // Рискуем 2% от баланса на сделку
    const riskPercent = 0.02;
    return virtualPortfolio.balance * riskPercent;
}

function updatePortfolioDisplay() {
    let portfolioHtml = `
        <div style="margin-top: 20px; padding: 15px; background: rgba(0,0,0,0.5); border-radius: 10px;">
            <h4 style="color: #ff00ff;">💼 ВИРТУАЛЬНЫЙ ПОРТФЕЛЬ</h4>
            <div>💰 Баланс: $${virtualPortfolio.balance.toFixed(2)}</div>
            <div>📊 Открыто позиций: ${virtualPortfolio.positions.length}</div>
            ${virtualPortfolio.positions.length > 0 ? `
                <div style="margin-top: 10px; font-size: 11px;">
                    <div>🏃‍♂️ Активные позиции:</div>
                    ${virtualPortfolio.positions.map(p => `
                        <div>${p.side} ${p.symbol} @ $${p.price}</div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
    
    const infoPanel = document.querySelector('.info-panel');
    if (!document.querySelector('.portfolio-panel')) {
        infoPanel.insertAdjacentHTML('beforeend', portfolioHtml);
    } else {
        document.querySelector('.portfolio-panel')?.remove();
        infoPanel.insertAdjacentHTML('beforeend', portfolioHtml);
    }
}

// Функция для добавления фильтра по типу актива
function addAssetFilter() {
    const filterRow = document.querySelector('.filter-row');
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

function init() {
    UI.updateTime();
    setInterval(UI.updateTime, 1000);
    
    // Оптимизация: сканируем реже для экономии ресурсов
    scanSignals();
    setInterval(scanSignals, 90000); // Каждые 90 секунд вместо 60
    
    document.getElementById('searchFilter').addEventListener('keyup', () => UI.filterSignals());
    document.getElementById('typeFilter').addEventListener('change', () => UI.filterSignals());
    
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
    if (symbol.includes('USDT')) {
        let clean = symbol.replace('/USDT', '').replace('USDT', '');
        window.open(`https://www.bybit.com/trade/spot/${clean}/USDT?interval=60`, '_blank');
    } else if (symbol.includes('/')) {
        window.open(`https://www.tradingview.com/chart/?symbol=FX:${symbol.replace('/', '')}`, '_blank');
    } else {
        window.open(`https://www.tradingview.com/chart/?symbol=${symbol}`, '_blank');
    }
};

// Оптимизированная 3D сцена
(function init3D() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 15);
    const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg-canvas'), alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Оптимизация
    
    const gridHelper = new THREE.GridHelper(30, 40, 0xff00ff, 0x00ffff);
    gridHelper.position.y = -3;
    scene.add(gridHelper);
    
    const geometry = new THREE.BoxGeometry(3, 3, 3);
    const edges = new THREE.EdgesGeometry(geometry);
    const wireframe = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xff00ff }));
    scene.add(wireframe);
    
    // Оптимизация количества частиц
    const particlesCount = window.innerWidth < 768 ? 600 : 1200;
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
    let lastTime = 0;
    
    function animate() {
        requestAnimationFrame(animate);
        const now = Date.now();
        const delta = Math.min(16, now - lastTime);
        lastTime = now;
        
        time += 0.005 * (delta / 16);
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

init();
