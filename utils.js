// ==================== УТИЛИТЫ ФОРМАТИРОВАНИЯ ====================

// Функция для расшифровки режима на русский (пац/блат/авто)
function decodeMode(mode) {
    if (!mode) return 'N/A';
    const modeMap = {
        'blotnoy': 'Блат',
        'pacansky': 'пац',
        'avtoritetny': 'Авто',
        'odin': 'Один'
    };
    return modeMap[mode.toLowerCase()] || mode;
}

// Функция для расшифровки режима комбо
function decodeComboMode(comboMode) {
    if (!comboMode) return null;
    const comboModeMap = {
        'blotnoy': 'Блат',
        'pacansky': 'пац',
        'avtoritetny': 'Авто'
    };
    return comboModeMap[comboMode.toLowerCase()] || comboMode;
}

// Функция для форматирования времени из UTC в МСК (только часы:минуты:секунды)
function formatTimeToMoscow(isoDateString) {
    if (!isoDateString) return 'N/A';
    try {
        const date = new Date(isoDateString);
        
        // Используем toLocaleString с timeZone для правильной конвертации в МСК
        // Если браузер поддерживает, используем его, иначе вычисляем вручную
        try {
            // Пытаемся использовать Intl API для правильной конвертации с учетом летнего времени
            const formatter = new Intl.DateTimeFormat('ru-RU', {
                timeZone: 'Europe/Moscow',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            });
            
            const parts = formatter.formatToParts(date);
            const hours = parts.find(p => p.type === 'hour').value;
            const minutes = parts.find(p => p.type === 'minute').value;
            const seconds = parts.find(p => p.type === 'second').value;
            
            return `${hours}:${minutes}:${seconds}`;
        } catch (e) {
            // Fallback: МСК = UTC+3 (фиксированное смещение)
            const moscowTime = new Date(date.getTime() + (3 * 60 * 60 * 1000));
            const hours = String(moscowTime.getUTCHours()).padStart(2, '0');
            const minutes = String(moscowTime.getUTCMinutes()).padStart(2, '0');
            const seconds = String(moscowTime.getUTCSeconds()).padStart(2, '0');
            
            return `${hours}:${minutes}:${seconds}`;
        }
    } catch (e) {
        console.error('Ошибка форматирования времени:', e);
        return isoDateString;
    }
}

// Форматирование чисел в сокращенном виде (70.354кк, 3.123ккк, 7.5к)
function formatNumberShort(num) {
    if (num >= 1000000000) {
        // Миллиарды (ккк)
        const value = num / 1000000000;
        // Убираем лишние нули в конце
        const formatted = value.toFixed(3).replace(/\.?0+$/, '');
        return formatted + 'ккк';
    } else if (num >= 1000000) {
        // Миллионы (кк)
        const value = num / 1000000;
        // Убираем лишние нули в конце
        const formatted = value.toFixed(3).replace(/\.?0+$/, '');
        return formatted + 'кк';
    } else if (num >= 1000) {
        // Тысячи (к)
        const value = num / 1000;
        // Убираем лишние нули в конце
        const formatted = value.toFixed(3).replace(/\.?0+$/, '');
        return formatted + 'к';
    } else {
        return num.toString();
    }
}

// Форматирование урона с ограничением в 4 символа (например, 10.35к)
function formatDamageShort(num) {
    if (num >= 1000000000) {
        // Миллиарды (ккк) - максимум 4 символа
        const value = num / 1000000000;
        // Пробуем разные форматы, чтобы уложиться в 4 символа
        if (value >= 100) {
            return Math.floor(value) + 'ккк';
        } else if (value >= 10) {
            const formatted = value.toFixed(1);
            if (formatted.length + 3 <= 4) return formatted + 'ккк';
            return Math.floor(value) + 'ккк';
        } else {
            const formatted = value.toFixed(2);
            if (formatted.length + 3 <= 4) return formatted + 'ккк';
            return value.toFixed(1) + 'ккк';
        }
    } else if (num >= 1000000) {
        // Миллионы (кк) - максимум 4 символа
        const value = num / 1000000;
        if (value >= 100) {
            return Math.floor(value) + 'кк';
        } else if (value >= 10) {
            const formatted = value.toFixed(1);
            if (formatted.length + 2 <= 4) return formatted + 'кк';
            return Math.floor(value) + 'кк';
        } else {
            const formatted = value.toFixed(2);
            if (formatted.length + 2 <= 4) return formatted + 'кк';
            return value.toFixed(1) + 'кк';
        }
    } else if (num >= 1000) {
        // Тысячи (к) - максимум 4 символа
        const value = num / 1000;
        if (value >= 100) {
            return Math.floor(value) + 'к';
        } else if (value >= 10) {
            // Для чисел от 10 до 99.999 - используем 2 знака после запятой
            const formatted = value.toFixed(2);
            if (formatted.length + 1 <= 4) return formatted + 'к';
            // Если не влезает, пробуем 1 знак
            const formatted1 = value.toFixed(1);
            if (formatted1.length + 1 <= 4) return formatted1 + 'к';
            return Math.floor(value) + 'к';
        } else {
            // Для чисел от 1 до 9.999 - используем 2 знака после запятой
            const formatted = value.toFixed(2);
            if (formatted.length + 1 <= 4) return formatted + 'к';
            return value.toFixed(1) + 'к';
        }
    } else {
        // Меньше 1000 - просто число
        return num.toString();
    }
}

// Форматирование чисел с пробелами (1 000 000)
function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// Функция для форматирования времени обратного отсчета
function formatCountdownTime(ms) {
    if (ms <= 0) return '0:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Функция для получения текущего времени в МСК
function getMoscowTime() {
    const now = new Date();
    try {
        // Используем Intl API для правильной конвертации в МСК
        const formatter = new Intl.DateTimeFormat('ru-RU', {
            timeZone: 'Europe/Moscow',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
        
        const parts = formatter.formatToParts(now);
        const hours = parseInt(parts.find(p => p.type === 'hour').value);
        const minutes = parseInt(parts.find(p => p.type === 'minute').value);
        const seconds = parseInt(parts.find(p => p.type === 'second').value);
        
        return { hours, minutes, seconds, date: now };
    } catch (e) {
        // Fallback: МСК = UTC+3
        const moscowTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
        return {
            hours: moscowTime.getUTCHours(),
            minutes: moscowTime.getUTCMinutes(),
            seconds: moscowTime.getUTCSeconds(),
            date: now
        };
    }
}

// Функция для форматирования текущей даты по МСК в формате "12.11.25"
function formatCurrentDateMoscow() {
    try {
        const now = new Date();
        
        // Используем Intl API для правильной конвертации с учетом часового пояса МСК
        try {
            const formatter = new Intl.DateTimeFormat('ru-RU', {
                timeZone: 'Europe/Moscow',
                day: '2-digit',
                month: '2-digit',
                year: '2-digit'
            });
            
            const parts = formatter.formatToParts(now);
            const day = parts.find(p => p.type === 'day').value;
            const month = parts.find(p => p.type === 'month').value;
            const year = parts.find(p => p.type === 'year').value;
            
            return `${day}.${month}.${year}`;
        } catch (e) {
            // Fallback: МСК = UTC+3 (фиксированное смещение)
            const moscowTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));
            const day = String(moscowTime.getUTCDate()).padStart(2, '0');
            const month = String(moscowTime.getUTCMonth() + 1).padStart(2, '0');
            const year = String(moscowTime.getUTCFullYear()).slice(-2);
            
            return `${day}.${month}.${year}`;
        }
    } catch (error) {
        console.error('Ошибка форматирования даты:', error);
        // Fallback: используем локальное время
        const now = new Date();
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = String(now.getFullYear()).slice(-2);
        return `${day}.${month}.${year}`;
    }
}

// Очистка RTF-разметки из текста
function cleanRtfText(text) {
    let cleaned = text;
    
    // Сначала обрабатываем Unicode escape-последовательности \uXXXX
    // В RTF \u1084 означает Unicode символ с кодом 1084
    cleaned = cleaned.replace(/\\u(\d+)/g, function(match, code) {
        const charCode = parseInt(code, 10);
        // Преобразуем Unicode код в символ
        try {
            return String.fromCharCode(charCode);
        } catch (e) {
            return '';
        }
    });
    
    // Удаляем RTF-команды (начинаются с \ и буквы)
    // Но не трогаем уже обработанные \u последовательности
    cleaned = cleaned.replace(/\\[a-z]+\d*\s*/gi, '');
    
    // Удаляем RTF-группы в фигурных скобках, которые содержат только команды
    cleaned = cleaned.replace(/\{[^}]*\\[^}]*\}/g, '');
    
    // Удаляем оставшиеся фигурные скобки (RTF-группы)
    cleaned = cleaned.replace(/[{}]/g, '');
    
    // Удаляем множественные пробелы и переносы строк
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    // Удаляем пробелы в начале и конце
    cleaned = cleaned.trim();
    
    return cleaned;
}

// Fallback функция для копирования в буфер обмена (для старых браузеров)
function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            console.log('Комбо скопировано в буфер обмена (fallback)');
            if (window.tg && window.tg.showAlert) {
                window.tg.showAlert('Комбо скопировано в буфер обмена');
            } else {
                alert('Комбо скопировано в буфер обмена');
            }
        } else {
            console.error('Не удалось скопировать в буфер обмена');
        }
    } catch (err) {
        console.error('Ошибка копирования в буфер обмена:', err);
    }
    
    document.body.removeChild(textArea);
}

// Экспортируем функции для использования в других модулях
window.decodeMode = decodeMode;
window.decodeComboMode = decodeComboMode;
window.formatTimeToMoscow = formatTimeToMoscow;
window.formatNumberShort = formatNumberShort;
window.formatDamageShort = formatDamageShort;
window.formatNumber = formatNumber;
window.formatCountdownTime = formatCountdownTime;
window.getMoscowTime = getMoscowTime;
window.formatCurrentDateMoscow = formatCurrentDateMoscow;
window.cleanRtfText = cleanRtfText;
window.fallbackCopyTextToClipboard = fallbackCopyTextToClipboard;

