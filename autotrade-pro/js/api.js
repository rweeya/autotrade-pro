// js/api.js - обновленная версия
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
        let price = basePrice || 100;
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
        if (!isCrypto(symbol)) {
            return generateMockData(symbol);
        }
        
        const intervalMap = { '15m': '15m', '1h': '1h', '4h': '4h', '1d': '1d' };
        
        try {
            // Используем несколько прокси для надежности
            const proxies = [
                'https://cors-anywhere.herokuapp.com/',
                'https://api.allorigins.win/raw?url=',
                ''
            ];
            
            let lastError = null;
            
            for (let proxy of proxies) {
                try {
                    const url = `${proxy}https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${intervalMap[interval] || '1h'}&limit=100`;
                    const response = await fetch(url, {
                        headers: {
                            'Origin': 'https://autotrade-pro.netlify.app'
                        }
                    });
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
                            return { closes, highs, lows, isMock: false };
                        }
                    }
                } catch(e) {
                    lastError = e;
                    continue;
                }
            }
            
            return generateMockData(symbol);
        } catch(e) {
            console.log(`Binance error for ${symbol}:`, e);
            return generateMockData(symbol);
        }
    }
    
    async function getYahooFinanceData(symbol, assetType) {
        try {
            const url = assetType === 'forex' 
                ? FREE_API_URLS.forex(symbol)
                : FREE_API_URLS.stock(symbol);
                
            const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
            const data = await response.json();
            
            if (data && data.chart && data.chart.result && data.chart.result[0]) {
                const result = data.chart.result[0];
                const indicators = result.indicators.quote[0];
                const timestamps = result.timestamp;
                
                if (indicators && indicators.close && indicators.close.length > 0) {
                    let closes = indicators.close.filter(c => c !== null);
                    let highs = indicators.high.filter(h => h !== null);
                    let lows = indicators.low.filter(l => l !== null);
                    
                    if (closes.length > 50) {
                        return { closes, highs, lows, isMock: false };
                    }
                }
            }
            
            return generateMockData(symbol);
        } catch(e) {
            console.log(`Yahoo error for ${symbol}:`, e);
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
            
            const response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
            const data = await response.json();
            
            if (data['Error Message'] || data['Note']) {
                return await getYahooFinanceData(symbol, isForex ? 'forex' : 'stock');
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
                    return { closes, highs, lows, isMock: false };
                }
            }
            
            return await getYahooFinanceData(symbol, isForex ? 'forex' : 'stock');
        } catch(e) {
            return await getYahooFinanceData(symbol, 'stock');
        }
    }
    
    async function getData(symbol, interval = '1h') {
        const assetType = getAssetType(symbol);
        
        if (assetType === 'crypto') {
            return await getBinanceData(symbol, interval);
        } else {
            // Для форекс и акций используем Yahoo Finance (более стабильный)
            return await getYahooFinanceData(symbol, assetType);
        }
    }
    
    return { getAllSymbols, getAssetType, getData, generateMockData };
})();
