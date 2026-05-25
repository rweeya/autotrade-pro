// js/api.js - ПОЛНОСТЬЮ ИСПРАВЛЕННАЯ ВЕРСИЯ
const API = (function() {
    
    const SYMBOLS = {
        crypto: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT', 'UNIUSDT', 'ATOMUSDT', 'NEARUSDT', 'OPUSDT', 'ARBUSDT', 'APTUSDT', 'LTCUSDT', 'BCHUSDT', 'ETCUSDT'],
        forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD'],
        stock: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'JPM', 'JNJ', 'WMT', 'KO', 'DIS', 'NFLX']
    };
    
    const ALPHA_VANTAGE_KEY = 'JOWNUIILXWSDDX0O';
    
    // Альтернативные API для акций и форекс
    const FREE_API_URLS = {
        stock: (symbol) => `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1h&range=1d`,
        forex: (pair) => {
            const [from, to] = [pair.slice(0,3), pair.slice(3)];
            return `https://query1.finance.yahoo.com/v8/finance/chart/${from}${to}=X?interval=1h&range=1d`;
        }
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
    
    function isCrypto(symbol) {
        return SYMBOLS.crypto.includes(symbol);
    }
    
    function generateMockData(symbol, basePrice = null) {
        // Реалистичные цены для разных активов
        let price = basePrice;
        if (!price) {
            if (symbol.includes('BTC')) price = 65000 + (Math.random() - 0.5) * 1000;
            else if (symbol.includes('ETH')) price = 3500 + (Math.random() - 0.5) * 50;
            else if (symbol.includes('SOL')) price = 170 + (Math.random() - 0.5) * 5;
            else if (symbol.includes('BNB')) price = 580 + (Math.random() - 0.5) * 10;
            else if (symbol === 'EURUSD') price = 1.08 + (Math.random() - 0.5) * 0.01;
            else if (symbol === 'GBPUSD') price = 1.25 + (Math.random() - 0.5) * 0.01;
            else if (symbol === 'USDJPY') price = 150 + (Math.random() - 0.5) * 2;
            else if (symbol === 'AAPL') price = 175 + (Math.random() - 0.5) * 2;
            else if (symbol === 'MSFT') price = 420 + (Math.random() - 0.5) * 5;
            else if (symbol === 'GOOGL') price = 140 + (Math.random() - 0.5) * 2;
            else if (symbol === 'AMZN') price = 178 + (Math.random() - 0.5) * 2;
            else if (symbol === 'TSLA') price = 170 + (Math.random() - 0.5) * 3;
            else if (symbol === 'META') price = 480 + (Math.random() - 0.5) * 5;
            else if (symbol === 'NVDA') price = 900 + (Math.random() - 0.5) * 10;
            else price = 50 + Math.random() * 200;
        }
        
        const volatility = 0.015;
        let closes = [], highs = [], lows = [];
        let currentPrice = price;
        
        for (let i = 0; i < 100; i++) {
            let change = (Math.random() - 0.5) * volatility;
            currentPrice = currentPrice * (1 + change);
            closes.push(currentPrice);
            highs.push(currentPrice * (1 + Math.random() * 0.008));
            lows.push(currentPrice * (1 - Math.random() * 0.008));
        }
        
        return { closes, highs, lows, isMock: true };
    }
    
    async function getBinanceData(symbol, interval = '1h') {
        // ВАЖНО: только для криптовалют!
        if (!isCrypto(symbol)) {
            console.log(`${symbol} не криптовалюта, используем mock данные`);
            return generateMockData(symbol);
        }
        
        const intervalMap = { '15m': '15m', '1h': '1h', '4h': '4h', '1d': '1d' };
        const binanceInterval = intervalMap[interval] || '1h';
        
        try {
            // Используем публичное API Binance без CORS (иногда работает)
            const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${binanceInterval}&limit=100`;
            
            // Пробуем через прокси
            const proxyUrl = `https://cors-anywhere.herokuapp.com/${url}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            const response = await fetch(proxyUrl, {
                signal: controller.signal,
                headers: {
                    'Origin': 'https://autotrade-pro.netlify.app'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && Array.isArray(data) && data.length > 0 && !data.code) {
                let closes = [], highs = [], lows = [];
                for (let candle of data) {
                    if (candle && candle.length >= 5) {
                        highs.push(parseFloat(candle[2]));
                        lows.push(parseFloat(candle[3]));
                        closes.push(parseFloat(candle[4]));
                    }
                }
                
                if (closes.length > 50) {
                    console.log(`✅ Binance: получены данные для ${symbol}`);
                    return { closes, highs, lows, isMock: false };
                }
            }
            
            console.log(`⚠️ Binance: недостаточно данных для ${symbol}, используем mock`);
            return generateMockData(symbol);
            
        } catch(e) {
            console.log(`❌ Binance ошибка для ${symbol}: ${e.message}, используем mock данные`);
            return generateMockData(symbol);
        }
    }
    
    async function getYahooFinanceData(symbol, assetType) {
        try {
            let url;
            if (assetType === 'forex') {
                url = FREE_API_URLS.forex(symbol);
            } else {
                url = FREE_API_URLS.stock(symbol);
            }
            
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const response = await fetch(proxyUrl, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.chart && data.chart.result && data.chart.result[0]) {
                const result = data.chart.result[0];
                const indicators = result.indicators.quote[0];
                const timestamps = result.timestamp;
                
                if (indicators && indicators.close && indicators.close.length > 0) {
                    let closes = indicators.close.filter(c => c !== null && !isNaN(c));
                    let highs = indicators.high.filter(h => h !== null && !isNaN(h));
                    let lows = indicators.low.filter(l => l !== null && !isNaN(l));
                    
                    if (closes.length > 20) {
                        console.log(`✅ Yahoo: получены данные для ${symbol}`);
                        return { closes, highs, lows, isMock: false };
                    }
                }
            }
            
            console.log(`⚠️ Yahoo: недостаточно данных для ${symbol}, используем mock`);
            return generateMockData(symbol);
            
        } catch(e) {
            console.log(`❌ Yahoo ошибка для ${symbol}: ${e.message}, используем mock данные`);
            return generateMockData(symbol);
        }
    }
    
    async function getAlphaVantageData(symbol, interval = '1h') {
        try {
            const isForex = SYMBOLS.forex.includes(symbol);
            let url;
            
            if (isForex) {
                const fromCurrency = symbol.slice(0, 3);
                const toCurrency = symbol.slice(3);
                url = `https://www.alphavantage.co/query?function=FX_DAILY&from_symbol=${fromCurrency}&to_symbol=${toCurrency}&apikey=${ALPHA_VANTAGE_KEY}`;
            } else {
                url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
            }
            
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);
            
            const response = await fetch(proxyUrl, {
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data['Error Message'] || data['Note']) {
                console.log(`⚠️ Alpha Vantage лимит для ${symbol}, переключаемся на Yahoo`);
                return await getYahooFinanceData(symbol, isForex ? 'forex' : 'stock');
            }
            
            let timeSeries = data['Time Series (Daily)'] || data['Time Series FX (Daily)'];
            
            if (timeSeries) {
                let dates = Object.keys(timeSeries).sort().slice(-100);
                let closes = [], highs = [], lows = [];
                
                for (let date of dates) {
                    const close = parseFloat(timeSeries[date]['4. close']);
                    const high = parseFloat(timeSeries[date]['2. high']);
                    const low = parseFloat(timeSeries[date]['3. low']);
                    
                    if (!isNaN(close) && !isNaN(high) && !isNaN(low)) {
                        closes.push(close);
                        highs.push(high);
                        lows.push(low);
                    }
                }
                
                if (closes.length > 20) {
                    console.log(`✅ Alpha Vantage: получены данные для ${symbol}`);
                    return { closes, highs, lows, isMock: false };
                }
            }
            
            return await getYahooFinanceData(symbol, isForex ? 'forex' : 'stock');
            
        } catch(e) {
            console.log(`❌ Alpha Vantage ошибка для ${symbol}, переключаемся на Yahoo`);
            return await getYahooFinanceData(symbol, SYMBOLS.forex.includes(symbol) ? 'forex' : 'stock');
        }
    }
    
    async function getData(symbol, interval = '1h') {
        const assetType = getAssetType(symbol);
        
        console.log(`📊 Загрузка данных для ${symbol} (${assetType})`);
        
        if (assetType === 'crypto') {
            // Для криптовалют используем Binance
            return await getBinanceData(symbol, interval);
        } else if (assetType === 'forex') {
            // Для форекс сначала пробуем Alpha Vantage, потом Yahoo
            return await getAlphaVantageData(symbol, interval);
        } else {
            // Для акций сначала пробуем Alpha Vantage, потом Yahoo
            return await getAlphaVantageData(symbol, interval);
        }
    }
    
    // Экспортируем функции
    return { 
        getAllSymbols, 
        getAssetType, 
        getData, 
        generateMockData,
        isCrypto,
        SYMBOLS
    };
})();
