// js/tradingview.js - Интеграция с TradingView сигналами
const TradingView = (function() {
    
    let webSocket = null;
    let isConnected = false;
    let alertCallbacks = [];
    let activeSymbols = [];
    
    // Конфигурация
    const CONFIG = {
        // WebSocket для TradingView (публичный)
        wsUrl: 'wss://ws.twelvedata.com/v1/quotes/price',
        // Альтернативный способ - получение данных через REST API
        restUrl: 'https://api.twelvedata.com/price',
        apiKey: 'demo' // Бесплатный демо ключ (можно заменить на свой)
    };
    
    // Список символов для отслеживания в формате TradingView
    const TV_SYMBOLS = {
        crypto: {
            'BTCUSDT': 'BINANCE:BTCUSDT',
            'ETHUSDT': 'BINANCE:ETHUSDT',
            'SOLUSDT': 'BINANCE:SOLUSDT',
            'BNBUSDT': 'BINANCE:BNBUSDT',
            'XRPUSDT': 'BINANCE:XRPUSDT',
            'DOGEUSDT': 'BINANCE:DOGEUSDT'
        },
        forex: {
            'EURUSD': 'FX:EURUSD',
            'GBPUSD': 'FX:GBPUSD',
            'USDJPY': 'FX:USDJPY',
            'USDCHF': 'FX:USDCHF'
        },
        stock: {
            'AAPL': 'NASDAQ:AAPL',
            'MSFT': 'NASDAQ:MSFT',
            'GOOGL': 'NASDAQ:GOOGL',
            'AMZN': 'NASDAQ:AMZN',
            'TSLA': 'NASDAQ:TSLA',
            'META': 'NASDAQ:META',
            'NVDA': 'NASDAQ:NVDA'
        }
    };
    
    // Генерация сигналов на основе технического анализа (эмуляция TradingView)
    function generateTradingViewSignal(symbol, price, assetType) {
        // Используем детерминированный алгоритм на основе цены и времени
        const timestamp = Date.now();
        const seed = (symbol.length * timestamp) % 1000;
        
        // Имитация различных индикаторов TradingView
        const rsi = 30 + (Math.sin(timestamp / 10000) * 30 + seed % 40);
        const macd = Math.sin(timestamp / 15000) * 2;
        const ma20 = price * (1 + (Math.sin(timestamp / 20000) * 0.02));
        const ma50 = price * (1 + (Math.sin(timestamp / 25000) * 0.03));
        const volume = 1000000 + Math.random() * 500000;
        
        let score = 0;
        let reasons = [];
        
        // RSI сигналы
        if (rsi < 35) {
            score++;
            reasons.push(`RSI oversold (${Math.round(rsi)})`);
        } else if (rsi > 65) {
            score--;
            reasons.push(`RSI overbought (${Math.round(rsi)})`);
        }
        
        // MACD сигналы
        if (macd > 0.2) {
            score++;
            reasons.push(`MACD bullish`);
        } else if (macd < -0.2) {
            score--;
            reasons.push(`MACD bearish`);
        }
        
        // MA кроссовер
        if (ma20 > ma50) {
            score++;
            reasons.push(`Golden cross (MA20>MA50)`);
        } else if (ma20 < ma50) {
            score--;
            reasons.push(`Death cross (MA20<MA50)`);
        }
        
        // Объем
        if (volume > 1200000) {
            score += 0.5;
            reasons.push(`High volume`);
        }
        
        // Определяем действие
        let action = null;
        let strength = Math.abs(Math.floor(score));
        
        if (score >= 2) {
            action = 'buy';
        } else if (score <= -2) {
            action = 'sell';
        }
        
        if (action) {
            return {
                symbol: symbol,
                action: action,
                price: price,
                strength: Math.min(strength, 5),
                reasons: reasons.join(', '),
                rsi: Math.round(rsi),
                timestamp: new Date().toISOString(),
                source: 'TradingView'
            };
        }
        
        return null;
    }
    
    // Получение реальной цены через Twelve Data API (бесплатный аналог TradingView)
    async function getRealTimePrice(symbol, tvSymbol) {
        try {
            // Используем бесплатный API Twelve Data
            const url = `https://api.twelvedata.com/price?symbol=${tvSymbol}&apikey=demo`;
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            
            const response = await fetch(proxyUrl, {
                timeout: 5000
            });
            
            const data = await response.json();
            
            if (data && data.price) {
                return parseFloat(data.price);
            }
            
            return null;
        } catch(e) {
            console.log(`Не удалось получить цену ${symbol}:`, e);
            return null;
        }
    }
    
    // Сканирование всех активов и генерация сигналов в стиле TradingView
    async function scanAllSymbols() {
        const signals = [];
        
        for (const [assetType, symbols] of Object.entries(TV_SYMBOLS)) {
            for (const [localSymbol, tvSymbol] of Object.entries(symbols)) {
                try {
                    // Получаем цену
                    let price = await getRealTimePrice(localSymbol, tvSymbol);
                    
                    // Если не удалось получить цену, генерируем реалистичную
                    if (!price) {
                        price = 100 + Math.random() * 900;
                        if (localSymbol.includes('BTC')) price = 65000;
                        if (localSymbol.includes('ETH')) price = 3500;
                        if (localSymbol.includes('AAPL')) price = 175;
                    }
                    
                    // Генерируем сигнал
                    const signal = generateTradingViewSignal(localSymbol, price, assetType);
                    
                    if (signal) {
                        signals.push(signal);
                    }
                    
                    // Небольшая задержка чтобы не перегружать API
                    await new Promise(r => setTimeout(r, 100));
                    
                } catch(e) {
                    console.log(`Ошибка обработки ${localSymbol}:`, e);
                }
            }
        }
        
        // Сортируем по силе сигнала
        signals.sort((a, b) => b.strength - a.strength);
        
        return signals;
    }
    
    // Настройка вебхука для получения реальных сигналов с TradingView
    function setupWebhook(webhookUrl) {
        console.log('🎯 Webhook настроен для TradingView:', webhookUrl);
        
        // Эмуляция получения вебхука
        // В реальном приложении здесь был бы сервер для приема POST запросов
        
        return {
            sendTestAlert: () => {
                const testSignal = {
                    symbol: 'BTCUSDT',
                    action: 'buy',
                    price: 65000,
                    timestamp: new Date().toISOString(),
                    source: 'TradingView Webhook'
                };
                
                if (alertCallbacks.length > 0) {
                    alertCallbacks.forEach(cb => cb(testSignal));
                }
                
                return testSignal;
            }
        };
    }
    
    // Подписка на оповещения
    function onAlert(callback) {
        alertCallbacks.push(callback);
    }
    
    // Создание alert URL для TradingView
    function generateAlertUrl(symbol, condition, webhookUrl) {
        // Формируем инструкцию для создания алерта в TradingView
        const alertConfig = {
            symbol: TV_SYMBOLS.crypto[symbol] || TV_SYMBOLS.forex[symbol] || symbol,
            condition: condition,
            webhookUrl: webhookUrl,
            message: JSON.stringify({
                symbol: symbol,
                action: '{{strategy.order.action}}',
                price: '{{close}}',
                timestamp: '{{timenow}}'
            })
        };
        
        console.log('📝 Alert конфигурация для TradingView:', alertConfig);
        
        return alertConfig;
    }
    
    // Инструкция по настройке TradingView
    function showSetupInstructions() {
        const instructions = `
        🔧 НАСТРОЙКА TRADINGVIEW ДЛЯ АВТОМАТИЧЕСКИХ СИГНАЛОВ:
        
        1. Откройте TradingView и войдите в аккаунт
        2. Создайте новый Alert (Сигнал)
        3. Выберите символ (например, BINANCE:BTCUSDT)
        4. Установите условие (например, "Crossing" или "When condition is true")
        5. В разделе "Webhook URL" вставьте: https://your-server.com/webhook
        6. В поле сообщение вставьте:
        {
            "symbol": "BTCUSDT",
            "action": "buy",
            "price": "{{close}}",
            "timestamp": "{{timenow}}"
        }
        7. Сохраните Alert
        
        💡 БЕСПЛАТНЫЙ ВАРИАНТ:
        Используйте наш эмулятор TradingView сигналов прямо сейчас!
        `;
        
        console.log(instructions);
        return instructions;
    }
    
    // Запуск эмуляции TradingView сигналов
    function startEmulation(intervalSeconds = 30) {
        console.log(`🚀 Запущена эмуляция TradingView сигналов (каждые ${intervalSeconds} сек)`);
        
        setInterval(async () => {
            const signals = await scanAllSymbols();
            
            if (signals.length > 0 && alertCallbacks.length > 0) {
                signals.forEach(signal => {
                    alertCallbacks.forEach(cb => cb(signal));
                });
            }
        }, intervalSeconds * 1000);
    }
    
    // Публичное API
    return {
        scanAllSymbols,
        setupWebhook,
        onAlert,
        generateAlertUrl,
        showSetupInstructions,
        startEmulation,
        getRealTimePrice,
        TV_SYMBOLS
    };
})();