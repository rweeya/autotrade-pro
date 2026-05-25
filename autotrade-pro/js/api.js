// ========== МОДУЛЬ API ==========

const API = (function() {
    
    // ===== ВСЕ АКТИВЫ =====
    const SYMBOLS = {
        crypto: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT', 'UNIUSDT', 'ATOMUSDT', 'NEARUSDT', 'OPUSDT', 'ARBUSDT', 'APTUSDT', 'LTCUSDT', 'BCHUSDT', 'ETCUSDT'],
        forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'],
        stock: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'JNJ', 'WMT']
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
    
    // ===== ГЕНЕРАЦИЯ ТЕСТОВЫХ ДАННЫХ =====
    function generateMockData(symbol, basePrice = null) {
        let price = basePrice || 100;
        if (symbol.includes('BTC')) price = 65000;
        else if (symbol.includes('ETH')) price = 3500;
        else if (symbol.includes('SOL')) price = 170;
        else if (symbol.includes('BNB')) price = 580;
        else if (symbol.includes('EURUSD')) price = 1.08;
        else if (symbol.includes('GBPUSD')) price = 1.25;
        else if (symbol.includes('USDJPY')) price = 148;
        else if (symbol.includes('AAPL')) price = 175;
        else if (symbol.includes('MSFT')) price = 420;
        else if (symbol.includes('TSLA')) price = 170;
        else price = 50 + Math.random() * 200;
        
        let closes = [], highs = [], lows = [];
        let currentPrice = price;
        
        for (let i = 0; i < 100; i++) {
            let change = (Math.random() - 0.5) * 0.01;
            currentPrice = currentPrice * (1 + change);
            closes.push(currentPrice);
            highs.push(currentPrice * (1 + Math.random() * 0.005));
            lows.push(currentPrice * (1 - Math.random() * 0.005));
        }
        
        return { closes, highs, lows };
    }
    
    // ===== BINANCE API (КРИПТОВАЛЮТЫ) =====
    async function getBinanceData(symbol, interval = '1h') {
        try {
            const corsProxy = 'https://cors-anywhere.herokuapp.com/';
            const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=100`;
            
            const response = await fetch(corsProxy + url);
            const data = await response.json();
            
            if (!data || data.code === -1121 || !Array.isArray(data)) {
                return generateMockData(symbol);
            }
            
            let closes = [], highs = [], lows = [];
            for (let candle of data) {
                if (candle && candle.length >= 5) {
                    highs.push(parseFloat(candle[2]));
                    lows.push(parseFloat(candle[3]));
                    closes.push(parseFloat(candle[4]));
                }
            }
            
            return closes.length > 0 ? { closes, highs, lows } : generateMockData(symbol);
        } catch(e) {
            return generateMockData(symbol);
        }
    }
    
    // ===== ALPHA VANTAGE API (ФОРЕКС + АКЦИИ) =====
    // Бесплатный API ключ (зарегистрируйся на https://www.alphavantage.co/support/#api-key)
    const ALPHA_VANTAGE_KEY = 'YOUR_API_KEY'; // Замени на свой ключ
    
    async function getForexStockData(symbol, interval = '60min') {
        try {
            // Для форекс и акций используем Alpha Vantage
            const isForex = SYMBOLS.forex.includes(symbol);
            let url;
            
            if (isForex) {
                // Форекс: EURUSD, GBPUSD и т.д.
                const fromTo = symbol;
                url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromTo.slice(0,3)}&to_symbol=${fromTo.slice(3)}&apikey=${ALPHA_VANTAGE_KEY}`;
            } else {
                // Акции
                url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            let timeSeries = data['Time Series (Daily)'] || data['Time Series FX (Daily)'];
            
            if (timeSeries) {
                let dates = Object.keys(timeSeries).sort().slice(-100);
                let closes = [], highs = [], lows = [];
                
                for (let date of dates) {
                    closes.push(parseFloat(timeSeries[date]['4. close']));
                    highs.push(parseFloat(timeSeries[date]['2. high']));
                    lows.push(parseFloat(timeSeries[date]['3. low']));
                }
                
                if (closes.length > 0) return { closes, highs, lows };
            }
            
            return generateMockData(symbol);
        } catch(e) {
            return generateMockData(symbol);
        }
    }
    
    // ===== ОСНОВНАЯ ФУНКЦИЯ ПОЛУЧЕНИЯ ДАННЫХ =====
    async function getData(symbol, interval = '1h') {
        const assetType = getAssetType(symbol);
        
        if (assetType === 'crypto') {
            return await getBinanceData(symbol, interval);
        } else {
            // Для форекс и акций пока используем эмуляцию
            // Чтобы получить реальные данные — зарегистрируйся на Alpha Vantage
            return generateMockData(symbol);
        }
    }
    
    return { getAllSymbols, getAssetType, getData, generateMockData };
})();
