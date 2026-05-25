// ========== ГЛАВНЫЙ МОДУЛЬ ==========

let previousCount = 0;
let currentTimeframe = '1h';

async function scanSignals() {
    const container = document.getElementById('signalsContainer');
    container.innerHTML = '<div style="text-align: center; padding: 40px;">⏳ Анализ активов...</div>';
    
    const symbols = API.getAllSymbols();
    let signals = [];
    
    for (let symbol of symbols.slice(0, 40)) {
        const data = await API.getBinanceData(symbol, currentTimeframe);
        const analysis = Indicators.analyze(data.closes, data.highs, data.lows);
        
        if (analysis.action) {
            signals.push({
                symbol: symbol.replace('USDT', '/USDT'),
                action: analysis.action,
                price: analysis.price,
                rsi: analysis.rsi,
                strength: analysis.strength,
                reasons: analysis.reasons,
                assetType: API.getAssetType(symbol),
                timestamp: new Date().toISOString()
            });
        }
        await new Promise(r => setTimeout(r, 10));
    }
    
    signals.sort((a,b) => b.strength - a.strength);
    
    if (signals.length > previousCount && signals.length > 0) {
        UI.playAlertSound();
        UI.speak(`Новый сигнал! ${signals[0].action} по ${signals[0].symbol}`);
    }
    previousCount = signals.length;
    
    UI.renderSignals(signals);
    UI.updateStats(signals);
}

function init() {
    UI.updateTime();
    setInterval(UI.updateTime, 1000);
    
    scanSignals();
    setInterval(scanSignals, 30000);
    
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
}

window.openChart = function(symbol) {
    let clean = symbol.replace('/USDT', '').replace('USDT', '');
    window.open(`https://www.bybit.com/trade/spot/${clean}/USDT?interval=60`, '_blank');
};

// 3D фон
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
    
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesPositions = new Float32Array(1200 * 3);
    for (let i = 0; i < 1200; i++) {
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

init();