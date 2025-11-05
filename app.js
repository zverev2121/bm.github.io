// Telegram Web App API
// Проверяем, что мы в Telegram
let tg = null;
if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
} else {
    console.error('Telegram WebApp не доступен! Убедитесь, что Mini App открыт через Telegram');
}

// Версия Mini App (для проверки обновлений)
const APP_VERSION = '2.0.0';

// Инициализация Mini App
if (tg) {
    tg.ready();
    tg.expand();
} else {
    console.error('Не удалось инициализировать Telegram WebApp');
}

// Базовый URL API игры
// Вариант 1: Прямое обращение (может быть заблокировано CORS)
// const GAME_API_URL = 'https://the-prison.ru/api';

// Вариант 2: Через API сервер (РЕКОМЕНДУЕТСЯ для обхода CORS)
// Используйте любой туннелирующий сервис:
// - CloudPub.ru: https://cloudpub.ru
// - ngrok: ngrok http 5002
// - localtunnel: npx localtunnel --port 5002
// 
// Замените URL ниже на ваш туннель URL (должен заканчиваться на /api)
const API_SERVER_URL = 'https://carelessly-pioneering-wombat.cloudpub.ru/api';
const GAME_API_URL = API_SERVER_URL || 'https://the-prison.ru/api';

// Проверяем, что используется правильная версия
console.log('Mini App версия:', APP_VERSION);
console.log('API URL:', GAME_API_URL);
console.log('Используется прокси:', !!API_SERVER_URL);

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    updateStatus(false);
    
    // Проверяем, что мы в Telegram WebApp
    console.log('Проверка Telegram WebApp:');
    console.log('- tg доступен:', !!tg);
    console.log('- tg.initData:', tg?.initData ? tg.initData.substring(0, 50) + '...' : 'недоступен');
    console.log('- tg.initDataUnsafe:', tg?.initDataUnsafe ? 'доступен' : 'недоступен');
    console.log('- tg.version:', tg?.version);
    console.log('- tg.platform:', tg?.platform);
    console.log('- window.location:', window.location.href);
    
    // Проверяем наличие токена в localStorage
    let token = getAccessToken();
    
    // Если токена нет, пытаемся авторизоваться
    if (!token) {
        console.log('Токен не найден, пытаемся авторизоваться...');
        
        // Проверяем, что initData доступен перед авторизацией
        if (!tg?.initData || tg.initData.length < 10) {
            console.error('initData не доступен! Убедитесь, что Mini App открыт через Telegram');
            console.error('Попробуйте:');
            console.error('1. Открыть Mini App через бота в Telegram');
            console.error('2. Обновить страницу');
            console.error('3. Использовать ручную авторизацию (кнопка ниже)');
        }
        
        token = await loginWithInitData();
    }
    
    if (token) {
        console.log('Авторизация успешна, токен получен');
        updateStatus(true);
        loadBossInfo();
        loadPrisons();
        loadStats();
        
        // Обновляем статистику каждые 30 секунд
        setInterval(loadStats, 30000);
    } else {
        updateStatus(false);
        const errorMsg = `
            <p class="error">
                ❌ Ошибка авторизации<br><br>
                Возможные причины:<br>
                1. initData не доступен<br>
                2. CORS блокирует запросы<br>
                3. API недоступен<br><br>
                <small>Откройте консоль (F12) для подробностей</small>
            </p>
        `;
        document.getElementById('boss-info').innerHTML = errorMsg;
        
        // Показываем кнопку для ручной авторизации
        showManualAuthButton();
    }
});

// Обновление статуса подключения
function updateStatus(connected) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('#status span:last-child');
    
    if (connected) {
        statusDot.classList.add('connected');
        statusText.textContent = 'Подключено';
    } else {
        statusDot.classList.remove('connected');
        statusText.textContent = 'Отключено';
    }
}

// Загрузка информации о боссе
async function loadBossInfo() {
    const bossInfo = document.getElementById('boss-info');
    bossInfo.innerHTML = '<p class="loading">Загрузка...</p>';
    
    try {
        // Получаем токен из initData
        const initData = tg.initData;
        const userId = tg.initDataUnsafe?.user?.id;
        
        // Создаем заголовки для авторизации
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        };
        
        // Добавляем токен, если есть (из настроек бота)
        // В реальном приложении токен должен передаваться безопасно
        const token = getAccessToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${GAME_API_URL}/boss/bootstrap`, {
            method: 'GET',
            headers: headers
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        if (data.success && data.session) {
            const session = data.session;
            const hpPercent = ((session.currentHp / session.maxHp) * 100).toFixed(1);
            
            bossInfo.innerHTML = `
                <div>
                    <strong>${session.title || 'Босс'}</strong><br>
                    HP: ${session.currentHp.toLocaleString()} / ${session.maxHp.toLocaleString()} (${hpPercent}%)<br>
                    Фаза: ${session.phase}<br>
                    Режим: ${session.mode || 'N/A'}
                </div>
            `;
            updateStatus(true);
        } else {
            bossInfo.innerHTML = '<p>Информация о боссе недоступна</p>';
            updateStatus(false);
        }
    } catch (error) {
        console.error('Ошибка загрузки информации о боссе:', error);
        if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
            bossInfo.innerHTML = `<p class="error">❌ Ошибка CORS<br>Браузер блокирует запросы<br><br>Попробуйте обновить страницу</p>`;
        } else {
            bossInfo.innerHTML = `<p class="error">❌ Ошибка подключения:<br>${error.message}</p>`;
        }
        updateStatus(false);
    }
}

// Атака босса
async function attackBoss() {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '⚔️ Атака...';
    
    try {
        const token = getAccessToken();
        if (!token) {
            tg.showAlert('❌ Требуется авторизация!\nОбновите страницу');
            btn.disabled = false;
            btn.textContent = '⚔️ Атаковать';
            return;
        }
        
        const attackBody = { type: 'punchChest' };
        console.log('Отправка атаки:', attackBody);
        
        const response = await fetch(`${GAME_API_URL}/boss/attack`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(attackBody)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Увеличиваем счетчик атак
            const currentAttacks = parseInt(localStorage.getItem('total_attacks') || '0');
            localStorage.setItem('total_attacks', (currentAttacks + 1).toString());
            
            tg.showPopup({
                title: 'Успех!',
                message: `Атака выполнена!`,
                buttons: [{ text: 'OK', type: 'ok' }]
            });
            loadBossInfo();
            loadStats();
        } else {
            tg.showAlert(data.error || 'Ошибка атаки');
        }
    } catch (error) {
        console.error('Ошибка атаки:', error);
        tg.showAlert(`❌ Ошибка: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = '⚔️ Атаковать';
    }
}

// Загрузка списка тюрем
async function loadPrisons() {
    const select = document.getElementById('prison-select');
    
        const token = getAccessToken();
        if (!token) {
            console.warn('Токен не доступен');
            return;
        }
        
        try {
        const response = await fetch(`${GAME_API_URL}/prisons/tops-all`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        if (data.success && data.tops) {
            const prisonNames = {
                1: 'Бутырка', 2: 'Красная пресня', 3: 'Софийка', 4: 'Кресты',
                5: 'Владимирский Централ', 6: 'Угольки', 7: 'Матросская Тишина',
                8: 'Вологодский пятак', 9: 'Лефортовка', 10: 'Белый лебедь',
                11: 'Орловский Централ', 12: 'Елецкая крытка', 13: 'Черный дельфин',
                14: 'Гронецкая крытка', 15: 'Александровский Централ'
            };
            
            data.tops.forEach(top => {
                const option = document.createElement('option');
                option.value = top.prisonId;
                option.textContent = `#${top.prisonId} - ${prisonNames[top.prisonId] || `Тюрьма ${top.prisonId}`}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки тюрем:', error);
    }
}

// Загрузка информации о тюрьме
async function loadPrisonInfo() {
    const prisonId = document.getElementById('prison-select').value;
    const isDay = document.getElementById('mode-select').value === 'day';
    const prisonInfo = document.getElementById('prison-info');
    const walkBtn = document.getElementById('prison-walk-btn');
    
    if (!prisonId) {
        prisonInfo.innerHTML = '<p>Выберите тюрьму для просмотра информации</p>';
        walkBtn.disabled = true;
        return;
    }
    
    const token = getAccessToken();
    if (!token) {
        prisonInfo.innerHTML = '<p class="error">❌ Требуется авторизация!</p>';
        walkBtn.disabled = true;
        return;
    }
    
    prisonInfo.innerHTML = '<p class="loading">Загрузка...</p>';
    walkBtn.disabled = true;
    
    try {
        const response = await fetch(`${GAME_API_URL}/player/prison/${prisonId}?isDay=${isDay}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        if (data.success && data.data) {
            const d = data.data;
            const mode = isDay ? 'day' : 'night';
            
            prisonInfo.innerHTML = `
                <div>
                    <strong>Тюрьма #${prisonId}</strong><br>
                    Режим: ${isDay ? 'День' : 'Ночь'}<br>
                    Чекпоинт: ${d[`${mode}CurrentCheckpoint`] || 0}<br>
                    Кликов в чекпоинте: ${d[`${mode}ClicksInCheckpoint`] || 0}<br>
                    Рейтинг: ${d[`${mode}Rating`] || 0}
                </div>
            `;
            walkBtn.disabled = false;
        } else {
            prisonInfo.innerHTML = '<p>Информация о тюрьме недоступна</p>';
        }
    } catch (error) {
        console.error('Ошибка загрузки информации о тюрьме:', error);
        prisonInfo.innerHTML = `<p class="error">❌ Ошибка: ${error.message}</p>`;
    }
}

// Начать прохождение тюрьмы
async function startPrisonWalk() {
    const prisonId = document.getElementById('prison-select').value;
    const isDay = document.getElementById('mode-select').value === 'day';
    const btn = event.target;
    
    if (!prisonId) {
        tg.showAlert('Выберите тюрьму');
        return;
    }
    
    const token = getAccessToken();
    if (!token) {
        tg.showAlert('❌ Требуется авторизация!\nОбновите страницу');
        return;
    }
    
    const confirmed = await new Promise(resolve => {
        tg.showConfirm('Начать автоматическое прохождение?', resolve);
    });
    
    if (!confirmed) return;
    
    btn.disabled = true;
    btn.textContent = '🚀 Прохождение...';
    
    try {
        // Выполняем несколько кликов (ограничено для безопасности)
        let total_clicks = 0;
        let total_cigarettes = 0;
        let total_rating = 0;
        let total_authority = 0;
        const max_clicks = 10; // Максимум кликов за один запрос
        
        for (let i = 0; i < max_clicks; i++) {
            // POST запрос для работы в тюрьме (без body, только query параметры)
            const response = await fetch(`${GAME_API_URL}/player/prison/${prisonId}/work?isDay=${isDay}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({}) // Пустой body, но он должен быть
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.success) {
                break;
            }
            
            total_clicks++;
            total_cigarettes += data.rewardCigarettes || 0;
            total_rating += data.rewardRating || 0;
            total_authority += data.rewardAuthority || 0;
            
            // Проверяем энергию
            if (data.energy <= 0) {
                break;
            }
            
            // Задержка между кликами
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        const result = {
            success: true,
            total_clicks: total_clicks,
            total_cigarettes: total_cigarettes,
            total_rating: total_rating,
            total_authority: total_authority
        };
        
        if (result.success) {
            tg.showPopup({
                title: 'Прохождение завершено',
                message: `Кликов: ${result.total_clicks}\nСигареты: ${result.total_cigarettes}\nРейтинг: ${result.total_rating}\nАвторитет: ${result.total_authority}`,
                buttons: [{ text: 'OK', type: 'ok' }]
            });
            loadPrisonInfo();
            loadStats();
        } else {
            tg.showAlert(result.error || 'Ошибка');
        }
    } catch (error) {
        console.error('Ошибка прохождения тюрьмы:', error);
        tg.showAlert(`❌ Ошибка: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = '🚀 Начать прохождение';
    }
}

// Загрузка статистики
async function loadStats() {
    const token = getAccessToken();
    if (!token) {
        return;
    }
    
    try {
        // Получаем информацию о боссе для отображения энергии
        const response = await fetch(`${GAME_API_URL}/boss/bootstrap`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            // TODO: Добавить счетчик атак (можно хранить в localStorage)
            const totalAttacks = parseInt(localStorage.getItem('total_attacks') || '0');
            document.getElementById('total-attacks').textContent = totalAttacks;
            
            // Энергию можно получить из других endpoints, показываем заглушку
            document.getElementById('energy').textContent = '-';
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Получение токена доступа
function getAccessToken() {
    // Проверяем localStorage
    const storedToken = localStorage.getItem('game_access_token');
    
    if (storedToken && storedToken.length > 10) {
        console.log('Токен найден в localStorage');
        return storedToken;
    }
    
    // Если токена нет, пытаемся получить через initData
    // Для этого нужно авторизоваться через /auth/login
    console.log('Токен не найден в localStorage');
    return null;
}

// Авторизация через initData
async function loginWithInitData() {
    try {
        // Проверяем доступность Telegram WebApp
        if (!tg) {
            console.error('Telegram WebApp не доступен');
            console.log('Проверка Telegram WebApp:', {
                tg: typeof tg,
                windowTelegram: typeof window.Telegram,
                WebApp: typeof window.Telegram?.WebApp
            });
            return null;
        }
        
        // Получаем initData - это строка с данными от Telegram
        // initData должен содержать query_id, user, auth_date, hash и т.д.
        let initData = tg.initData || '';
        
        console.log('Получение initData:');
        console.log('- tg.initData тип:', typeof tg.initData);
        console.log('- tg.initData длина:', tg.initData ? tg.initData.length : 0);
        console.log('- tg.initData значение (первые 100 символов):', tg.initData ? tg.initData.substring(0, 100) : 'пусто');
        
        // Если initData пустой или слишком короткий, пробуем другие способы
        if (!initData || initData.length < 50) {
            console.warn('tg.initData пустой или слишком короткий, пробуем другие способы...');
            
            // Пробуем получить из initDataUnsafe (если доступен как строка)
            if (tg.initDataUnsafe) {
                console.log('- tg.initDataUnsafe тип:', typeof tg.initDataUnsafe);
                if (typeof tg.initDataUnsafe === 'string' && tg.initDataUnsafe.length > 50) {
                    initData = tg.initDataUnsafe;
                    console.log('✓ initData получен из initDataUnsafe');
                } else if (typeof tg.initDataUnsafe === 'object') {
                    console.log('- initDataUnsafe - объект, содержимое:', Object.keys(tg.initDataUnsafe));
                    // Объект initDataUnsafe содержит распарсенные данные, но нам нужна строка
                    // Попробуем получить из window.location
                }
            }
            
            // Пробуем получить из URL параметров (если есть)
            if (!initData || initData.length < 50) {
                const urlParams = new URLSearchParams(window.location.search);
                const urlInitData = urlParams.get('tgWebAppData') || urlParams.get('_auth') || urlParams.get('initData');
                if (urlInitData && urlInitData.length > 50) {
                    initData = decodeURIComponent(urlInitData);
                    console.log('✓ initData получен из URL параметров');
                }
            }
            
            // Пробуем получить из hash в URL
            if (!initData || initData.length < 50) {
                const hash = window.location.hash.substring(1);
                if (hash && hash.includes('query_id=')) {
                    initData = hash;
                    console.log('✓ initData получен из URL hash');
                }
            }
        }
        
        console.log('initData получен, длина:', initData?.length);
        
        // Проверяем, что initData не пустой и содержит нужные данные
        if (!initData || initData.length < 10) {
            console.error('initData пустой или слишком короткий');
            console.error('Проверьте, что Mini App открыт через Telegram');
            console.error('Попробуйте обновить страницу или использовать ручную авторизацию');
            return null;
        }
        
        // Проверяем, что это не тестовое значение
        if (initData === 'test' || initData === 'test123') {
            console.error('Обнаружено тестовое значение initData!');
            console.error('initData должен быть получен из Telegram WebApp');
            console.error('Проверьте, что Mini App открыт через Telegram, а не напрямую в браузере');
            return null;
        }
        
        console.log('Попытка авторизации через initData...');
        console.log('initData значение (первые 100 символов):', initData ? initData.substring(0, 100) + '...' : 'null/undefined');
        
        // Если используем API сервер, отправляем initData через него
        // Иначе пытаемся напрямую к API игры (может быть заблокировано CORS)
        const loginUrl = API_SERVER_URL 
            ? `${API_SERVER_URL}/auth/login`
            : `${GAME_API_URL}/auth/login`;
        
        // Проверяем, что initData содержит необходимые поля
        if (!initData.includes('query_id=') || !initData.includes('user=') || !initData.includes('hash=')) {
            console.error('initData не содержит необходимые поля!');
            console.error('Ожидаемый формат: query_id=...&user=...&hash=...');
            console.error('Получен:', initData.substring(0, 200));
            throw new Error('Некорректный формат initData. Убедитесь, что Mini App открыт через Telegram');
        }
        
        // Проверяем возраст initData (auth_date)
        try {
            const authDateMatch = initData.match(/auth_date=(\d+)/);
            if (authDateMatch) {
                const authDate = parseInt(authDateMatch[1]);
                const currentTime = Math.floor(Date.now() / 1000);
                const ageSeconds = currentTime - authDate;
                const ageMinutes = ageSeconds / 60;
                
                console.log('Проверка возраста initData:');
                console.log(`- auth_date: ${authDate}`);
                console.log(`- текущее время: ${currentTime}`);
                console.log(`- возраст: ${ageMinutes.toFixed(1)} минут (${(ageMinutes/60).toFixed(1)} часов)`);
                
                if (ageSeconds > 3600) { // Более часа
                    console.warn(`⚠️ initData устарел (${ageMinutes.toFixed(1)} минут)!`);
                    console.warn('API игры может отклонить устаревший initData');
                    console.warn('Попробуйте обновить страницу для получения свежего initData');
                } else if (ageSeconds > 1800) { // Более 30 минут
                    console.warn(`⚠️ initData довольно старый (${ageMinutes.toFixed(1)} минут)`);
                } else {
                    console.log('✓ initData свежий');
                }
            }
        } catch (e) {
            console.warn('Не удалось проверить возраст initData:', e);
        }
        
        // Убеждаемся, что initData не искажен (проверяем начало и конец)
        console.log('Проверка initData перед отправкой:');
        console.log('- Начинается с query_id:', initData.startsWith('query_id='));
        console.log('- Содержит hash:', initData.includes('hash='));
        console.log('- Длина:', initData.length);
        console.log('- Первые 50 символов:', initData.substring(0, 50));
        console.log('- Последние 50 символов:', initData.substring(initData.length - 50));
        
        const requestBody = { initData: initData };
        const requestBodyString = JSON.stringify(requestBody);
        
        console.log('URL запроса:', loginUrl);
        console.log('Body запроса (первые 300 символов):', requestBodyString.substring(0, 300) + '...');
        console.log('Длина initData в body:', initData.length);
        console.log('Длина JSON body:', requestBodyString.length);
        
        const response = await fetch(loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: requestBodyString
        });
        
        console.log('Ответ сервера:', response.status, response.statusText);
        
        // Обрабатываем 204 (No Content) - некоторые прокси/туннели могут возвращать его
        if (response.status === 204) {
            console.warn('Получен статус 204 (No Content)');
            console.warn('Возможно, прокси не передает тело ответа');
            console.warn('Попробуем получить данные из заголовков или использовать другой метод');
            
            // Проверяем заголовки на наличие данных
            const authHeader = response.headers.get('X-Access-Token') || response.headers.get('Access-Token');
            if (authHeader) {
                console.log('Токен найден в заголовках');
                localStorage.setItem('game_access_token', authHeader);
                return authHeader;
            }
            
            // Если нет данных, возвращаем ошибку
            throw new Error('Получен ответ 204 без данных. Возможно, проблема с прокси-сервером.');
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Ошибка авторизации: ${response.status}`, errorText);
            
            // Пробуем распарсить как JSON
            try {
                const errorData = JSON.parse(errorText);
                console.error('Детали ошибки:', errorData);
            } catch (e) {
                console.error('Текст ошибки:', errorText);
            }
            
            throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 100)}`);
        }
        
        // Проверяем, есть ли тело ответа
        const contentType = response.headers.get('content-type');
        console.log('Content-Type ответа:', contentType);
        
        let data;
        if (contentType && contentType.includes('application/json')) {
            const responseText = await response.text();
            console.log('Тело ответа:', responseText.substring(0, 200));
            if (responseText.trim()) {
                data = JSON.parse(responseText);
            } else {
                console.error('Пустое тело ответа');
                throw new Error('Пустой ответ от сервера');
            }
        } else {
            // Если не JSON, пытаемся распарсить как текст
            const responseText = await response.text();
            console.log('Не-JSON ответ:', responseText.substring(0, 200));
            throw new Error(`Неожиданный Content-Type: ${contentType}`);
        }
        console.log('Данные авторизации:', { 
            success: data.success, 
            hasToken: !!data.accessToken,
            userId: data.userId 
        });
        
        if (data.success && data.accessToken) {
            console.log('Авторизация успешна!');
            // Сохраняем токен (в реальном приложении нужно использовать безопасное хранилище)
            localStorage.setItem('game_access_token', data.accessToken);
            localStorage.setItem('game_refresh_token', data.refreshToken || '');
            localStorage.setItem('game_user_id', data.userId || '');
            
            return data.accessToken;
        } else {
            console.error('Ошибка авторизации: нет токена в ответе', data);
            return null;
        }
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        console.error('Тип ошибки:', error.name);
        console.error('Сообщение:', error.message);
        console.error('Стек:', error.stack);
        
        // Показываем более подробную ошибку
        if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
            console.error('CORS ошибка - браузер блокирует запросы');
            const errorMsg = `
                <p class="error">
                    ❌ Ошибка CORS<br><br>
                    Браузер блокирует прямые запросы к API игры.<br><br>
                    <strong>Решения:</strong><br>
                    1. Используйте API сервер через ngrok (см. инструкцию)<br>
                    2. Или введите токен вручную (кнопка ниже)
                </p>
            `;
            document.getElementById('boss-info').innerHTML = errorMsg;
            showManualAuthButton();
        } else if (error.message.includes('NetworkError') || error.message.includes('Network request failed')) {
            console.error('Ошибка сети');
            document.getElementById('boss-info').innerHTML = 
                '<p class="error">❌ Ошибка сети<br>Проверьте подключение к интернету</p>';
        }
        return null;
    }
}

// Показать кнопку для ручной авторизации
function showManualAuthButton() {
    const bossInfo = document.getElementById('boss-info');
    if (!bossInfo) return;
    
    const manualAuthHTML = `
        <div style="margin-top: 10px;">
            <button onclick="manualAuth()" style="
                padding: 10px 20px;
                background: #007bff;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
            ">
                🔑 Ввести токен вручную
            </button>
        </div>
    `;
    
    bossInfo.innerHTML += manualAuthHTML;
}

// Ручная авторизация через токен
window.manualAuth = function() {
    const token = prompt('Введите access token (JWT):');
    if (token && token.trim()) {
        localStorage.setItem('game_access_token', token.trim());
        // Перезагружаем страницу
        location.reload();
    }
};
