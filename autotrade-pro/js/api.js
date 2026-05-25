// ========== МОДУЛЬ API ==========

const API = (function() {
    
    // Только криптовалюты (Binance)
    const SYMBOLS = {
        crypto: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT', 'UNIUSDT', 'ATOMUSDT', 'NEARUSDT', 'OPUSDT', 'ARBUSDT', 'APTUSDT', 'LTCUSDT', 'BCHUSDT', 'ETCUSDT', 'XLMUSDT', 'VETUSDT', 'TRXUSDT'],
        forex: [],
        stock: []
    };
    
    function getAllSymbols() {
        return [...SYMBOLS.crypto];
    }
    
    function getAssetType(symbol) {
        if (SYMBOLS.crypto.includes(symbol)) return 'crypto';
        return 'crypto';
    }
    
    // Генерация тестовых данных (без API)
    function generateMockData(symbol) {
        let basePrice = 100;
        if (symbol.includes('BTC')) basePrice = 65000;
        else if (symbol.includes('ETH')) basePrice = 3500;
        else if (symbol.includes('SOL')) basePrice = 170;
        else if (symbol.includes('BNB')) basePrice = 580;
        else if (symbol.includes('XRP')) basePrice = 0.52;
        else if (symbol.includes('DOGE')) basePrice = 0.12;
        else basePrice = 50 + Math.random() * 200;
        
        let closes = [], highs = [], lows = [];
        let price = basePrice;
        
        for (let i = 0; i < 100; i++) {
            let change = (Math.random() - 0.5) * 0.02;
            price = price * (1 + change);
            closes.push(price);
            highs.push(price * (1 + Math.random() * 0.01));
            lows.push(price * (1 - Math.random() * 0.01));
        }
        
        return { closes, highs, lows };
    }
    
    // Прокси через CORS-anywhere (для Binance)
    async function getBinanceData(symbol, interval = '1h') {
        try {
            // Используем CORS-прокси для обхода блокировки
            const corsProxy = 'https://cors-anywhere.herokuapp.com/';
            const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=100`;
            
            const response = await fetch(corsProxy + url);
            const data = await response.json();
            
            if (!data || data.code === -1121) {
                throw new Error('Symbol not found');
            }
            
            let closes = [], highs = [], lows = [];
            for (let candle of data) {
                highs.push(parseFloat(candle[2]));
                lows.push(parseFloat(candle[3]));
                closes.push(parseFloat(candle[4]));
            }
            return { closes, highs, lows };
        } catch(e) {
            console.log(`Использую тестовые данные для ${symbol}`);
            return generateMockData(symbol);
        }
    }
    
    return { getAllSymbols, getAssetType, getBinanceData, generateMockData };
})();
