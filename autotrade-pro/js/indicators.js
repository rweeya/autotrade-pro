const Indicators = (function() {
    
    function calculateRSI(closes, period = 14) {
        if (closes.length < period + 1) return 50;
        let gains = 0, losses = 0;
        for (let i = closes.length - period; i < closes.length; i++) {
            let diff = closes[i] - closes[i-1];
            if (diff >= 0) gains += diff;
            else losses -= diff;
        }
        let avgGain = gains / period;
        let avgLoss = losses / period;
        if (avgLoss === 0) return 100;
        let rs = avgGain / avgLoss;
        return 100 - (100 / (1 + rs));
    }
    
    function calculateEMA(closes, period) {
        if (closes.length < period) return closes[closes.length - 1];
        let multiplier = 2 / (period + 1);
        let ema = closes.slice(0, period).reduce((a,b) => a + b, 0) / period;
        for (let i = period; i < closes.length; i++) {
            ema = (closes[i] - ema) * multiplier + ema;
        }
        return ema;
    }
    
    function calculateMACD(closes, fast = 12, slow = 26) {
        if (closes.length < slow) return 0;
        let emaFast = calculateEMA(closes, fast);
        let emaSlow = calculateEMA(closes, slow);
        return emaFast - emaSlow;
    }
    
    function calculateStochastic(highs, lows, closes, period = 14) {
        if (closes.length < period) return 50;
        let low14 = Math.min(...lows.slice(-period));
        let high14 = Math.max(...highs.slice(-period));
        let currentClose = closes[closes.length - 1];
        if (high14 === low14) return 50;
        return (currentClose - low14) / (high14 - low14) * 100;
    }
    
    function calculateADX(highs, lows, closes, period = 14) {
        if (closes.length < period + 1) return 25;
        let plusDM = 0, minusDM = 0, tr = 0;
        for (let i = closes.length - period; i < closes.length; i++) {
            let highLow = highs[i] - lows[i];
            let highClose = Math.abs(highs[i] - closes[i-1]);
            let lowClose = Math.abs(lows[i] - closes[i-1]);
            tr += Math.max(highLow, highClose, lowClose);
            let upMove = highs[i] - highs[i-1];
            let downMove = lows[i-1] - lows[i];
            if (upMove > downMove && upMove > 0) plusDM += upMove;
            if (downMove > upMove && downMove > 0) minusDM += downMove;
        }
        let atr = tr / period;
        let plusDI = (plusDM / period) / atr * 100;
        let minusDI = (minusDM / period) / atr * 100;
        let dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
        return isNaN(dx) ? 25 : dx;
    }
    
    function analyze(closes, highs, lows) {
        if (!closes || closes.length < 50) {
            return { action: null, strength: 0, reasons: 'Недостаточно данных', rsi: 50, price: 0 };
        }
        
        let rsi = calculateRSI(closes);
        let ema20 = calculateEMA(closes, 20);
        let ema50 = calculateEMA(closes, 50);
        let macd = calculateMACD(closes);
        let stoch = calculateStochastic(highs, lows, closes);
        let adx = calculateADX(highs, lows, closes);
        let currentPrice = closes[closes.length - 1];
        
        let bullishScore = 0;
        let bearishScore = 0;
        let reasons = [];
        
        if (rsi < 35) { bullishScore++; reasons.push(`RSI=${Math.round(rsi)}`); }
        if (rsi > 70) { bearishScore++; reasons.push(`RSI=${Math.round(rsi)}`); }
        
        if (currentPrice > ema20 && ema20 > ema50) { bullishScore++; reasons.push("EMA↑"); }
        if (currentPrice < ema20 && ema20 < ema50) { bearishScore++; reasons.push("EMA↓"); }
        
        if (macd > 0) { bullishScore++; reasons.push("MACD↑"); }
        if (macd < 0) { bearishScore++; reasons.push("MACD↓"); }
        
        if (stoch < 30) { bullishScore++; reasons.push(`Stoch=${Math.round(stoch)}`); }
        if (stoch > 70) { bearishScore++; reasons.push(`Stoch=${Math.round(stoch)}`); }
        
        if (adx > 30) {
            if (currentPrice > ema20) { bullishScore++; reasons.push(`ADX=${Math.round(adx)}`); }
            else { bearishScore++; reasons.push(`ADX=${Math.round(adx)}`); }
        }
        
        let action = null;
        let strength = 0;
        
        if (bullishScore >= 3) {
            action = 'buy';
            strength = bullishScore;
        } else if (bearishScore >= 3) {
            action = 'sell';
            strength = bearishScore;
        }
        
        return {
            action: action,
            strength: strength || 0,
            reasons: reasons.slice(0, 4).join(', '),
            rsi: Math.round(rsi),
            price: currentPrice
        };
    }
    
    return { analyze };
})();
