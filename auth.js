// ==================== АВТОРИЗАЦИЯ ====================

// Получение данных пользователя из Telegram (даже если initData недоступен)
function getTelegramUserInfo() {
    // ПРИОРИТЕТ 1: tg.initDataUnsafe.user (доступен даже после релоуда)
    if (window.tg?.initDataUnsafe?.user) {
        const user = window.tg.initDataUnsafe.user;
        return {
            id: user.id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name
        };
    }
    
    // ПРИОРИТЕТ 2: Из tg.initData (если доступен)
    if (window.tg?.initData) {
        try {
            const params = new URLSearchParams(window.tg.initData);
            const userParam = params.get('user');
            if (userParam) {
                const userData = JSON.parse(decodeURIComponent(userParam));
                return {
                    id: userData.id,
                    username: userData.username,
                    first_name: userData.first_name,
                    last_name: userData.last_name
                };
            }
        } catch (e) {
            console.warn('Не удалось извлечь данные пользователя из tg.initData:', e);
        }
    }
    
    return null;
}

// Обновление отображения имени пользователя в header
function updateUserNameDisplay() {
    const userNameElement = document.getElementById('user-name');
    const userNameTextElement = document.getElementById('user-name-text');
    
    if (!userNameElement || !userNameTextElement) {
        return;
    }
    
    // ПРИОРИТЕТ 1: Проверяем URL параметры (username переданный через кнопку бота)
    const urlParams = new URLSearchParams(window.location.search);
    const urlUsername = urlParams.get('username');
    let userName = null;
    
    if (urlUsername) {
        userName = urlUsername;
        // Сохраняем username из URL в localStorage
        localStorage.setItem('game_username', urlUsername);
    }
    
    // ПРИОРИТЕТ 2: Пытаемся получить username из Telegram WebApp API
    if (!userName) {
        const telegramUserInfo = getTelegramUserInfo();
        if (telegramUserInfo) {
            // Используем username, если есть, иначе first_name
            userName = telegramUserInfo.username || telegramUserInfo.first_name || null;
            // Сохраняем username в localStorage, если получили из Telegram
            if (telegramUserInfo.username) {
                localStorage.setItem('game_username', telegramUserInfo.username);
            }
        }
    }
    
    // ПРИОРИТЕТ 3: Если не получили из URL или Telegram API, пытаемся из localStorage
    if (!userName) {
        // Сначала пытаемся получить username, потом first_name
        userName = localStorage.getItem('game_username') || localStorage.getItem('game_first_name') || null;
    }
    
    if (userName) {
        // Если это username (не содержит пробелов и не начинается с @), добавляем @
        // Если это first_name (содержит пробелы), оставляем как есть
        const displayName = userName.includes(' ') ? userName : (userName.startsWith('@') ? userName : `@${userName}`);
        userNameTextElement.textContent = `👤 ${displayName}`;
        userNameElement.style.display = 'block';
    } else {
        userNameElement.style.display = 'none';
    }
}

// Получение пользователя по username с сервера из БД
// Используется для поиска пользователя при открытии Mini App через кнопку бота
async function getUserByUsernameFromServer(username) {
    try {
        if (!username || !username.trim()) {
            console.warn('Username не указан для поиска');
            return null;
        }
        
        const url = window.API_SERVER_URL 
            ? `${window.API_SERVER_URL}/auth/get-user-by-username?username=${encodeURIComponent(username)}`
            : `${window.GAME_API_URL}/auth/get-user-by-username?username=${encodeURIComponent(username)}`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                console.log('✓ Пользователь найден по username:', username);
                return data;
            } else {
                console.log('⚠️ Пользователь не найден по username:', username);
                return { success: false, error: data.error || 'User not found' };
            }
        } else {
            console.warn(`Не удалось найти пользователя по username: ${response.status}`);
            return null;
        }
    } catch (e) {
        console.warn('Ошибка при поиске пользователя по username:', e);
        return null;
    }
}

// Получение актуального initData из БД
// ВАЖНО: initData всегда берется из БД, не из tg.initData
// ВАЖНО: initData НЕ хранится в localStorage, только в БД
async function getCurrentInitData() {
    // ПРИОРИТЕТ 1: Пытаемся найти по username из URL или Telegram WebApp API
    const urlParams = new URLSearchParams(window.location.search);
    let urlUsername = urlParams.get('username');
    
    // Если username нет в URL, пытаемся получить из Telegram WebApp API
    // Это нужно для работы кнопки в профиле бота, которая не передает параметры в URL
    if (!urlUsername) {
        const telegramUserInfo = getTelegramUserInfo();
        if (telegramUserInfo && telegramUserInfo.username) {
            urlUsername = telegramUserInfo.username;
            console.log('✓ Username для поиска initData получен из Telegram WebApp API:', urlUsername);
        }
    }
    
    if (urlUsername) {
        try {
            const userData = await getUserByUsernameFromServer(urlUsername);
            if (userData && userData.success && userData.initData) {
                console.log('✓ Используется initData из БД (найден по username)');
                return userData.initData.trim();
            }
        } catch (e) {
            console.warn('Не удалось получить initData по username:', e);
        }
    }
    
    // ПРИОРИТЕТ 2: Пытаемся получить initData из БД по токену (если токен есть)
    // ВАЖНО: getSavedInitDataFromServer() требует токен, поэтому вызываем только если есть токен
    try {
        // Сначала проверяем, есть ли токен в БД (без получения initData)
        // Если токен есть, получаем initData через getSavedInitDataFromServer
        const token = await getAccessToken();
        if (token) {
            const savedInitData = await getSavedInitDataFromServer();
            if (savedInitData && savedInitData.trim() && savedInitData.length >= 50) {
                console.log('✓ Используется initData из БД (получен по токену)');
                // НЕ обновляем поле ввода здесь, это делается в loadSettings()
                return savedInitData.trim();
            }
        }
    } catch (e) {
        console.warn('Не удалось получить initData из БД:', e);
    }
    
    console.warn('⚠️ initData не найден в БД. Пользователь должен ввести initData вручную в настройках.');
    return null;
}

// Получение сохраненного initData с сервера из БД
// ВАЖНО: initData не сохраняется в localStorage, только получается из БД
// ВАЖНО: Эта функция требует токен для работы, поэтому не может использоваться для получения initData без токена
async function getSavedInitDataFromServer() {
    try {
        // Получаем токен из БД для авторизации запроса
        // ВАЖНО: getAccessToken() может вернуть null, если нет initData
        // В этом случае мы не можем получить initData из БД
        const token = await getAccessToken();
        if (!token) {
            console.warn('Токен не найден в БД, невозможно получить initData');
            return null;
        }
        
        const url = window.API_SERVER_URL 
            ? `${window.API_SERVER_URL}/auth/get-saved-init-data`
            : `${window.GAME_API_URL}/auth/get-saved-init-data`;
        
        // ВАЖНО: Используем getApiHeaders() для получения актуального токена из БД
        const response = await fetch(url, {
            method: 'GET',
            headers: await getApiHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.initData) {
                console.log('✓ Получен initData из БД');
                // ВАЖНО: НЕ сохраняем в localStorage, только заполняем поле для отображения
                
                // Заполняем поле ввода последним рабочим initData из БД
                const manualInitDataInput = document.getElementById('manual-initdata');
                if (manualInitDataInput) {
                    manualInitDataInput.value = data.initData;
                    console.log('✓ Поле manual-initdata заполнено initData из БД');
                }
                
                return data.initData;
            }
        } else {
            console.warn(`Не удалось получить initData из БД: ${response.status}`);
        }
    } catch (e) {
        console.warn('Ошибка при получении initData из БД:', e);
    }
    
    return null;
}

// Получение токена доступа (всегда из БД)
// ВАЖНО: Токен всегда берется из БД, не из localStorage
async function getAccessToken() {
    try {
        // Получаем initData для идентификации пользователя
        // ВАЖНО: Используем прямой способ получения initData, чтобы избежать циклической зависимости
        let currentInitData = null;
        
        // ПРИОРИТЕТ 1: Пытаемся найти по username из URL
        const urlParams = new URLSearchParams(window.location.search);
        const urlUsername = urlParams.get('username');
        if (urlUsername) {
            try {
                const userData = await getUserByUsernameFromServer(urlUsername);
                if (userData && userData.success && userData.initData) {
                    currentInitData = userData.initData.trim();
                    console.log('✓ Используется initData из БД (найден по username) для получения токена');
                }
            } catch (e) {
                console.warn('Не удалось получить initData по username:', e);
            }
        }
        
        // ПРИОРИТЕТ 2: Если не нашли по username, пытаемся получить из поля ввода
        if (!currentInitData) {
            const manualInitDataInput = document.getElementById('manual-initdata');
            if (manualInitDataInput && manualInitDataInput.value && manualInitDataInput.value.trim().length >= 50) {
                currentInitData = manualInitDataInput.value.trim();
                console.log('✓ Используется initData из поля ввода для получения токена');
            }
        }
        
        if (!currentInitData) {
            console.warn('initData не найден, невозможно получить токен из БД');
            return null;
        }
        
        // Получаем токен из БД через API
        const url = window.API_SERVER_URL 
            ? `${window.API_SERVER_URL}/auth/get-saved-token`
            : `${window.GAME_API_URL}/auth/get-saved-token`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Init-Data': currentInitData
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.accessToken) {
                console.log(`[getAccessToken] ✓ Получен актуальный токен из БД (первые 20 символов): ${data.accessToken.substring(0, 20)}...`);
                return data.accessToken;
            } else {
                console.warn('[getAccessToken] Ответ от сервера не содержит токен:', data);
            }
        } else if (response.status === 404) {
            // Токен не найден в БД, пытаемся получить через login
            console.log('[getAccessToken] Токен не найден в БД, пытаемся получить через login...');
            try {
                const newToken = await loginWithInitData();
                if (newToken) {
                    // loginWithInitData() сохранил токен в БД на сервере
                    return newToken;
                }
            } catch (e) {
                console.warn('Не удалось получить токен через login:', e);
            }
        }
        
        console.warn('Токен не найден в БД и не удалось получить через login');
        return null;
    } catch (e) {
        console.error('Ошибка при получении токена из БД:', e);
        return null;
    }
}

// Получение токена синхронно (для случаев, когда async не подходит)
// ВАЖНО: Эта функция не может получить токен из БД синхронно, возвращает null
// Используйте getAccessToken() для получения токена из БД
function getAccessTokenSync() {
    // Токен больше не хранится в localStorage, всегда получаем из БД
    // Для синхронных случаев возвращаем null, нужно использовать async getAccessToken()
    return null;
}

// Создание заголовков для API запросов с токеном и initData
// ВАЖНО: Всегда получает актуальный токен из БД, не использует кэш
async function getApiHeaders(additionalHeaders = {}) {
    // ВАЖНО: Всегда получаем токен заново из БД, чтобы использовать актуальный токен
    // Это гарантирует, что после обновления токена все запросы используют новый токен
    const token = await getAccessToken();
    // ВАЖНО: initData всегда получаем из БД, не из localStorage
    const initData = await getCurrentInitData();
    
    // Логируем токен для отладки (первые 20 символов)
    if (token) {
        console.log(`[getApiHeaders] Токен получен из БД (первые 20 символов): ${token.substring(0, 20)}...`);
    } else {
        console.warn('[getApiHeaders] Токен не найден в БД!');
    }
    
    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...additionalHeaders
    };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    
    // ВАЖНО: Передаем initData в заголовке для проверки соответствия токена и пользователя на сервере
    if (initData) {
        headers['X-Init-Data'] = initData;
    }
    
    return headers;
}

// Авторизация через initData
// Примечание: полная реализация loginWithInitData остается в app.js из-за большого размера
// Эта функция будет определена в app.js и будет использовать функции из этого модуля

// Экспортируем функции для использования в других модулях
window.getTelegramUserInfo = getTelegramUserInfo;
window.updateUserNameDisplay = updateUserNameDisplay;
window.getUserByUsernameFromServer = getUserByUsernameFromServer;
window.getCurrentInitData = getCurrentInitData;
window.getSavedInitDataFromServer = getSavedInitDataFromServer;
window.getAccessToken = getAccessToken;
window.getAccessTokenSync = getAccessTokenSync;
window.getApiHeaders = getApiHeaders;

