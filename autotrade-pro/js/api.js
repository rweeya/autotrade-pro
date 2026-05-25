// ========== МОДУЛЬ API ==========

const API = (function() {
    
    // Список активов
    const SYMBOLS = {
        crypto: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT', 'UNIUSDT', 'ATOMUSDT', 'NEARUSDT', 'OPUSDT', 'ARBUSDT', 'APTUSDT', 'LTCUSDT', 'BCHUSDT', 'ETCUSDT', 'XLMUSDT', 'VETUSDT', 'TRXUSDT'],
        forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD'],
        stock: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA']
    };
    
    function getAllSymbols() {
        return [...SYMBOLS.crypto, ...SYMBOLS.forex, ...SYMBOLS.stock];
    }
    
    function getAssetType(symbol) {
        if (SYMBOLS.crypto.includes(symbol)) return 'crypto';
        if (SYMBOLS.forex.includes(symbol)) return 'forex';
        if (SYMBOLS.stock.includes(symbol)) return 'stock';
        return 'crypto';
    }
    
    // Эмуляция данных (для демо)
    async function getMockData(symbol) {
        let basePrice = 100;
        if (symbol.includes('BTC')) basePrice = 65000;
        else if (symbol.includes('ETH')) basePrice = 3500;
        else if (symbol.includes('SOL')) basePrice = 170;
        else if (symbol.includes('BNB')) basePrice = 580;
        
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
    
    // Реальный API (заготовка)
    async function getBinanceData(symbol, interval = '1h') {
        try {
            const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=100`;
            const response = await fetch(url);
            const data = await response.json();
            
            let closes = [], highs = [], lows = [];
            for (let candle of data) {
                highs.push(parseFloat(candle[2]));
                lows.push(parseFloat(candle[3]));
                closes.push(parseFloat(candle[4]));
            }
            return { closes, highs, lows };
        } catch(e) {
            return getMockData(symbol);
        }
    }
    
    return { getAllSymbols, getAssetType, getBinanceData, getMockData };
})();