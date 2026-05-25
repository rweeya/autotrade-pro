// ========== МОДУЛЬ API ==========

const API = (function() {
    
    // ===== ВСЕ АКТИВЫ (ПРАВИЛЬНО РАЗДЕЛЕНЫ) =====
    const SYMBOLS = {
        // Только криптовалюты для Binance (должны заканчиваться на USDT)
        crypto: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT', 'UNIUSDT', 'ATOMUSDT', 'NEARUSDT', 'OPUSDT', 'ARBUSDT', 'APTUSDT', 'LTCUSDT', 'BCHUSDT', 'ETCUSDT'],
        
        // Форекс (для Alpha Vantage)
        forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'],
        
        // Акции (для Alpha Vantage)
        stock: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'JNJ', 'WMT', 'KO', 'DIS', 'NFLX', 'AMD', 'BA']
    };
    
    // ТВОЙ API КЛЮЧ ALPHA VANTAGE
    const ALPHA_VANTAGE_KEY = 'JOWNUIILXWSDDX0O';
    
    function getAllSymbols() {
        return [...SYMBOLS.crypto, ...SYMBOLS.forex, ...SYMBOLS.stock];
    }
    
    function getAssetType(symbol) {
        if (SYMBOLS.crypto.includes(symbol)) return 'crypto';
        if (SYMBOLS.forex.includes(symbol)) return 'forex';
        if (SYMBOLS.stock.includes(symbol)) return 'stock';
        return 'crypto';
    }
    
    // ===== ГЕНЕРАЦИЯ ТЕСТОВЫХ ДАННЫХ (запасной вариант) =====
    function generateMockData(symbol) {
        let price = 100;
        if (symbol.includes('BTC')) price = 65000;
        else if (symbol.includes('ETH')) price = 3500;
        else if (symbol.includes('SOL')) price = 170;
        else if (symbol.includes('BNB')) price = 580;
        else if (symbol.includes('EURUSD')) price = 1.08;
        else if (symbol.includes('GBPUSD')) price = 1.25;
        else if (symbol.includes('USDJPY')) price = 148;
        else if (symbol === 'AAPL') price = 175;
        else if (symbol === 'MSFT') price = 420;
        else if (symbol === 'TSLA') price = 170;
        else if (symbol === 'NVDA') price = 900;
        else if (symbol === 'GOOGL') price = 140;
        else if (symbol === 'AMZN') price = 178;
        else if (symbol === 'META') price = 480;
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
    
    // ===== BINANCE API (ТОЛЬКО КРИПТОВАЛЮТЫ) =====
    async function getBinanceData(symbol, interval = '1h') {
        try {
            // Проверка: если символ не заканчивается на USDT — это не криптовалюта
            if (!symbol.endsWith('USDT')) {
                return generateMockData(symbol);
            }
            
            const corsProxy = 'https://cors-anywhere.herokuapp.com/';
            const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=100`;
            
            const response = await fetch(corsProxy + url);
            const data = await response.json();
            
            if (!data || data.code === -1121 || !Array.isArray(data) || data.length === 0) {
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
            console.log(`Binance ошибка для ${symbol}`);
            return generateMockData(symbol);
        }
    }
    
    // ===== ALPHA VANTAGE API (ФОРЕКС + АКЦИИ) =====
    async function getAlphaVantageData(symbol, interval = '1h') {
        try {
            const isForex = SYMBOLS.forex.includes(symbol);
            let url;
            
            if (isForex) {
                // Форекс
                const fromCurrency = symbol.slice(0, 3);
                const toCurrency = symbol.slice(3);
                url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_KEY}`;
            } else {
                // Акции
                url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
            }
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data['Error Message'] || data['Note']) {
                return generateMockData(symbol);
            }
            
            let timeSeries = data['Time Series (Daily)'] || data['Time Series FX (Daily)'];
            
            if (timeSeries) {
                let dates = Object.keys(timeSeries).sort().slice(-100);
                let closes = [], highs = [], lows = [];
                
                for (let date of dates) {
                    closes.push(parseFloat(timeSeries[date]['4. close']));
                    highs.push(parseFloat(timeSeries[date]['2. high']));
                    lows.push(parseFloat(timeSeries[date]['3. low']));
                }
                
                if (closes.length > 0) {
                    return { closes, highs, lows };
                }
            }
            
            return generateMockData(symbol);
        } catch(e) {
            console.log(`Alpha Vantage ошибка для ${symbol}`);
            return generateMockData(symbol);
        }
    }
    
    // ===== ОСНОВНАЯ ФУНКЦИЯ =====
    async function getData(symbol, interval = '1h') {
        const assetType = getAssetType(symbol);
        
        if (assetType === 'crypto') {
            return await getBinanceData(symbol, interval);
        } else {
            return await getAlphaVantageData(symbol, interval);
        }
    }
    
    return { getAllSymbols, getAssetType, getData, generateMockData };
})();
