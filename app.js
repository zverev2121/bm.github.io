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
// Загружается из localStorage или используется значение по умолчанию
function getApiServerUrl() {
    const saved = localStorage.getItem('api_server_url');
    if (saved && saved.trim()) {
        return saved.trim();
    }
    // Значение по умолчанию (можно изменить)
    return 'https://carelessly-pioneering-wombat.cloudpub.ru/api';
}

function getGameApiUrl() {
    const apiServerUrl = getApiServerUrl();
    // Если указан API сервер, используем его, иначе прямое подключение
    return apiServerUrl || 'https://the-prison.ru/api';
}

// Динамически получаем URL API
let API_SERVER_URL = getApiServerUrl();
let GAME_API_URL = getGameApiUrl();

// Проверяем, что используется правильная версия
console.log('Mini App версия:', APP_VERSION);
console.log('API URL:', GAME_API_URL);
console.log('Используется прокси:', !!API_SERVER_URL);

// Функции для работы с настройками
function loadSettings() {
    const apiUrl = localStorage.getItem('api_server_url') || '';
    const manualInitData = localStorage.getItem('manual_init_data') || '';
    const manualToken = localStorage.getItem('manual_access_token') || '';
    const useHardcoded = localStorage.getItem('use_hardcoded_initdata') === 'true';
    
    if (document.getElementById('api-server-url')) {
        document.getElementById('api-server-url').value = apiUrl;
    }
    if (document.getElementById('manual-initdata')) {
        document.getElementById('manual-initdata').value = manualInitData;
    }
    if (document.getElementById('manual-token')) {
        document.getElementById('manual-token').value = manualToken;
    }
    if (document.getElementById('use-hardcoded-initdata')) {
        document.getElementById('use-hardcoded-initdata').checked = useHardcoded;
    }
    
    updateSettingsDisplay();
}

async function saveSettings() {
    const apiUrl = document.getElementById('api-server-url').value.trim();
    const manualInitData = document.getElementById('manual-initdata').value.trim();
    const manualToken = document.getElementById('manual-token').value.trim();
    const useHardcoded = document.getElementById('use-hardcoded-initdata').checked;
    
    if (apiUrl) {
        // Проверяем, что URL заканчивается на /api
        const normalizedUrl = apiUrl.endsWith('/api') ? apiUrl : (apiUrl.endsWith('/') ? apiUrl + 'api' : apiUrl + '/api');
        localStorage.setItem('api_server_url', normalizedUrl);
    } else {
        localStorage.removeItem('api_server_url');
    }
    
    // Обновляем URL API перед использованием
    API_SERVER_URL = getApiServerUrl();
    GAME_API_URL = getGameApiUrl();
    
    // Если введен initData, выполняем login для получения токена
    if (manualInitData) {
        localStorage.setItem('manual_init_data', manualInitData);
        localStorage.removeItem('manual_access_token'); // Удаляем старый токен
        
        try {
            console.log('Выполнение login с введенным initData...');
            const loginUrl = API_SERVER_URL 
                ? `${API_SERVER_URL}/auth/login`
                : `${GAME_API_URL}/auth/login`;
            
            const response = await fetch(loginUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ initData: manualInitData })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.accessToken) {
                    localStorage.setItem('game_access_token', data.accessToken);
                    if (data.refreshToken) {
                        localStorage.setItem('game_refresh_token', data.refreshToken);
                    }
                    if (data.userId) {
                        localStorage.setItem('game_user_id', data.userId.toString());
                    }
                    console.log('✅ Токен получен из initData');
                    tg.showAlert('✅ Настройки сохранены!\n\nТокен получен из initData.\n\nПерезагрузите страницу для применения изменений.');
                } else {
                    const errorMsg = data.message || data.error || 'Неизвестная ошибка';
                    console.error('Ошибка login:', errorMsg);
                    tg.showAlert(`⚠️ Настройки сохранены, но не удалось получить токен:\n${errorMsg}`);
                }
            } else {
                const errorText = await response.text();
                console.error('Ошибка HTTP:', response.status, errorText);
                tg.showAlert(`⚠️ Настройки сохранены, но ошибка при получении токена:\nHTTP ${response.status}`);
            }
        } catch (error) {
            console.error('Ошибка при сохранении initData:', error);
            tg.showAlert(`⚠️ Настройки сохранены, но ошибка при получении токена:\n${error.message}`);
        }
    } else {
        localStorage.removeItem('manual_init_data');
    }
    
    // Если введен токен вручную (устаревший способ)
    if (manualToken) {
        localStorage.setItem('manual_access_token', manualToken);
        localStorage.setItem('game_access_token', manualToken);
        console.warn('Используется устаревший способ - токен вручную');
    } else {
        localStorage.removeItem('manual_access_token');
    }
    
    localStorage.setItem('use_hardcoded_initdata', useHardcoded ? 'true' : 'false');
    
    console.log('Настройки сохранены:');
    console.log('- API Server URL:', API_SERVER_URL || 'не указан (прямое подключение)');
    console.log('- Manual InitData:', manualInitData ? 'установлен' : 'не установлен');
    console.log('- Manual Token:', manualToken ? 'установлен' : 'не установлен');
    console.log('- Use Hardcoded initData:', useHardcoded);
    console.log('- GAME_API_URL:', GAME_API_URL);
    
    if (!manualInitData) {
        tg.showAlert('✅ Настройки сохранены!\n\nПерезагрузите страницу для применения изменений.');
    }
    updateSettingsDisplay();
    hideSettingsForm();
}

function resetSettings() {
    if (confirm('Вы уверены, что хотите сбросить все настройки?')) {
        localStorage.removeItem('api_server_url');
        localStorage.removeItem('manual_init_data');
        localStorage.removeItem('manual_access_token');
        localStorage.removeItem('use_hardcoded_initdata');
        localStorage.removeItem('game_access_token');
        localStorage.removeItem('game_refresh_token');
        localStorage.removeItem('game_user_id');
        
        document.getElementById('api-server-url').value = '';
        document.getElementById('manual-initdata').value = '';
        document.getElementById('manual-token').value = '';
        document.getElementById('use-hardcoded-initdata').checked = false;
        
        API_SERVER_URL = getApiServerUrl();
        GAME_API_URL = getGameApiUrl();
        
        tg.showAlert('✅ Настройки сброшены!\n\nПерезагрузите страницу.');
        updateSettingsDisplay();
    }
}

function updateSettingsDisplay() {
    const apiUrl = localStorage.getItem('api_server_url') || '';
    const token = localStorage.getItem('game_access_token') || '';
    const manualInitData = localStorage.getItem('manual_init_data') || '';
    const manualToken = localStorage.getItem('manual_access_token') || '';
    
    const currentApiUrl = document.getElementById('current-api-url');
    const currentTokenStatus = document.getElementById('current-token-status');
    
    if (currentApiUrl) {
        currentApiUrl.textContent = apiUrl || 'Не указан (прямое подключение)';
    }
    
    if (currentTokenStatus) {
        if (manualInitData) {
            currentTokenStatus.textContent = 'Из initData (автообновление)';
        } else if (manualToken) {
            currentTokenStatus.textContent = 'Введен вручную (устаревший)';
        } else if (token) {
            currentTokenStatus.textContent = 'Получен автоматически';
        } else {
            currentTokenStatus.textContent = 'Не сохранен';
        }
    }
}

function showSettingsForm() {
    const welcome = document.getElementById('settings-welcome');
    const form = document.getElementById('settings-form');
    const info = document.getElementById('settings-info');
    
    if (welcome) welcome.style.display = 'none';
    if (form) form.style.display = 'flex';
    if (info) info.style.display = 'none';
    loadSettings();
}

function hideSettingsForm() {
    const welcome = document.getElementById('settings-welcome');
    const form = document.getElementById('settings-form');
    const info = document.getElementById('settings-info');
    
    if (welcome) welcome.style.display = 'none';
    if (form) form.style.display = 'none';
    if (info) info.style.display = 'block';
    updateSettingsDisplay();
}

function toggleSettings() {
    const settingsSection = document.getElementById('settings-section');
    if (settingsSection.style.display === 'none' || !settingsSection.style.display) {
        settingsSection.style.display = 'block';
        loadSettings();
        // Показываем форму, если настройки не сохранены
        const hasSettings = localStorage.getItem('api_server_url') || localStorage.getItem('manual_init_data') || localStorage.getItem('manual_access_token');
        if (!hasSettings) {
            // Показываем приветствие при первом запуске
            const welcome = document.getElementById('settings-welcome');
            if (welcome) {
                welcome.style.display = 'block';
                document.getElementById('settings-form').style.display = 'none';
                document.getElementById('settings-info').style.display = 'none';
            } else {
                showSettingsForm();
            }
        } else {
            hideSettingsForm();
        }
    } else {
        settingsSection.style.display = 'none';
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    updateStatus(false);
    
    // Загружаем настройки
    loadSettings();
    updateSettingsDisplay();
    
    // Инициализируем селектор типа взаимодействия
    initInteractionTypeSelector();
    
    // Проверяем, нужно ли показать настройки при первом запуске
    const hasSettings = localStorage.getItem('api_server_url') || localStorage.getItem('manual_init_data') || localStorage.getItem('manual_access_token');
    if (!hasSettings) {
        // Показываем настройки при первом запуске
        document.getElementById('settings-section').style.display = 'block';
        const welcome = document.getElementById('settings-welcome');
        if (welcome) {
            welcome.style.display = 'block';
            document.getElementById('settings-form').style.display = 'none';
            document.getElementById('settings-info').style.display = 'none';
        } else {
            showSettingsForm();
        }
        
        // Скрываем другие секции до настройки
        document.getElementById('boss-section').style.display = 'none';
        document.getElementById('prison-section').style.display = 'none';
        document.getElementById('stats-section').style.display = 'none';
        document.getElementById('biceps-section').style.display = 'none';
        
        // НЕ прерываем загрузку - продолжаем авторизацию
        // Пользователь может настроить позже через кнопку "Настройки"
    }
    
    // Обновляем URL API перед авторизацией
    API_SERVER_URL = getApiServerUrl();
    GAME_API_URL = getGameApiUrl();
    
    // Проверяем, что мы в Telegram WebApp
    console.log('Проверка Telegram WebApp:');
    console.log('- tg доступен:', !!tg);
    console.log('- tg.initData:', tg?.initData ? tg.initData.substring(0, 50) + '...' : 'недоступен');
    console.log('- tg.initDataUnsafe:', tg?.initDataUnsafe ? 'доступен' : 'недоступен');
    console.log('- tg.version:', tg?.version);
    console.log('- tg.platform:', tg?.platform);
    console.log('- window.location:', window.location.href);
    
    // Показываем, откуда берется initData
    if (tg?.initData) {
        console.log('');
        console.log('📋 initData структура:');
        console.log('initData - это строка, которая автоматически формируется Telegram при открытии Mini App');
        console.log('Она содержит:');
        console.log('  - query_id - уникальный ID запроса (генерируется Telegram)');
        console.log('  - user - информация о пользователе (JSON)');
        console.log('  - auth_date - время создания (unix timestamp)');
        console.log('  - hash - подпись для проверки подлинности');
        console.log('  - signature - дополнительная подпись');
        console.log('');
        console.log('Текущий initData:');
        const params = new URLSearchParams(tg.initData);
        console.log('  - query_id:', params.get('query_id') || 'не найден');
        console.log('  - auth_date:', params.get('auth_date') || 'не найден');
        console.log('  - hash:', params.get('hash') ? params.get('hash').substring(0, 20) + '...' : 'не найден');
        console.log('  - user:', params.get('user') ? 'найден' : 'не найден');
    } else {
        console.warn('⚠️ tg.initData не доступен!');
        console.warn('Это означает, что Mini App открыт не через Telegram');
        console.warn('initData доступен ТОЛЬКО когда Mini App открыт через бота в Telegram');
    }
    
    // Проверяем, есть ли initData или токен вручную введенный или сохраненный
    const manualInitData = localStorage.getItem('manual_init_data');
    const manualToken = localStorage.getItem('manual_access_token');
    const savedToken = localStorage.getItem('game_access_token');
    let token = null;
    
    if (manualInitData) {
        console.log('Используется initData, введенный вручную');
        // Пытаемся получить токен из initData
        try {
            const loginUrl = API_SERVER_URL 
                ? `${API_SERVER_URL}/auth/login`
                : `${GAME_API_URL}/auth/login`;
            
            const response = await fetch(loginUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ initData: manualInitData })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.accessToken) {
                    token = data.accessToken;
                    localStorage.setItem('game_access_token', token);
                    if (data.refreshToken) {
                        localStorage.setItem('game_refresh_token', data.refreshToken);
                    }
                    if (data.userId) {
                        localStorage.setItem('game_user_id', data.userId.toString());
                    }
                    console.log('✅ Токен получен из сохраненного initData');
                } else {
                    console.warn('Не удалось получить токен из initData, пробуем сохраненный токен');
                    token = savedToken;
                }
            } else {
                console.warn('Ошибка при получении токена из initData, пробуем сохраненный токен');
                token = savedToken;
            }
        } catch (e) {
            console.warn('Ошибка при получении токена из initData:', e);
            token = savedToken;
        }
    } else if (manualToken) {
        console.log('Используется токен, введенный вручную (устаревший способ)');
        token = manualToken;
        localStorage.setItem('game_access_token', token);
    } else if (savedToken) {
        console.log('Используется сохраненный токен');
        token = savedToken;
        // Пытаемся авторизоваться для обновления токена (опционально)
        // Но не блокируем, если это не удалось
        try {
            const freshToken = await loginWithInitData();
            if (freshToken) {
                token = freshToken;
            }
        } catch (e) {
            console.warn('Не удалось обновить токен через login, используем сохраненный:', e);
        }
    } else {
        // ВСЕГДА пытаемся авторизоваться (даже если есть токен в localStorage)
        // Это гарантирует, что токен свежий и валидный
        console.log('Начало авторизации...');
        token = await loginWithInitData();
    }
    
    if (token) {
        console.log('✓ Авторизация успешна, токен получен');
        console.log('Токен длина:', token.length);
        console.log('Токен первые 20 символов:', token.substring(0, 20) + '...');
        
        // Сохраняем токен в localStorage (если не был введен вручную)
        if (!manualToken) {
            localStorage.setItem('game_access_token', token);
        }
        
        updateStatus(true);
        
        // Показываем все секции
        document.getElementById('boss-section').style.display = 'block';
        document.getElementById('prison-section').style.display = 'block';
        document.getElementById('stats-section').style.display = 'block';
        document.getElementById('biceps-section').style.display = 'block';
        
        // Загружаем данные только после успешной авторизации
        console.log('Загрузка данных после авторизации...');
        await Promise.all([
            loadBossInfo(),
            loadPrisons(),  // Загружает тюрьмы и информацию об игроке параллельно
            loadStats()
        ]);
        
        // Обновляем статистику каждые 30 секунд
        setInterval(loadStats, 30000);
        
        // Показываем секцию бицухи
        document.getElementById('biceps-section').style.display = 'block';
    } else {
        // Даже если авторизация не удалась, проверяем наличие сохраненного токена
        const savedToken = localStorage.getItem('game_access_token');
        if (savedToken) {
            console.log('Используется сохраненный токен для загрузки данных');
            updateStatus(true);
            
            // Показываем все секции
            document.getElementById('boss-section').style.display = 'block';
            document.getElementById('prison-section').style.display = 'block';
            document.getElementById('stats-section').style.display = 'block';
            document.getElementById('biceps-section').style.display = 'block';
            
            // Загружаем данные с сохраненным токеном
            console.log('Загрузка данных с сохраненным токеном...');
            await Promise.all([
                loadBossInfo(),
                loadPrisons(),  // Загружает тюрьмы и информацию об игроке параллельно
                loadStats()
            ]);
            
            // Обновляем статистику каждые 30 секунд
            setInterval(loadStats, 30000);
        } else {
            console.error('❌ Авторизация не удалась и токен не найден');
            updateStatus(false);
            
            // Показываем секции, но с ошибкой
            document.getElementById('boss-section').style.display = 'block';
            document.getElementById('prison-section').style.display = 'block';
            document.getElementById('stats-section').style.display = 'block';
            document.getElementById('biceps-section').style.display = 'block';
        
        const errorMsg = `
            <p class="error">
                ❌ Ошибка авторизации<br><br>
                Возможные причины:<br>
                1. initData не валиден<br>
                2. CORS блокирует запросы<br>
                3. API недоступен<br><br>
                <small>Проверьте настройки или введите токен вручную</small>
            </p>
        `;
        document.getElementById('boss-info').innerHTML = errorMsg;
        
        // Показываем кнопку для ручной авторизации
        showManualAuthButton();
        }
    }
});

// Прокачка бицухи и другие взаимодействия
async function startBicepsUpgrade() {
    const input = document.getElementById('biceps-user-ids');
    const interactionTypeSelect = document.getElementById('interaction-type');
    const userIdsStr = input.value.trim();
    const resultsDiv = document.getElementById('biceps-results');
    const resultsContent = document.getElementById('biceps-results-content');
    const startBtn = document.getElementById('biceps-start-btn');
    const btnText = document.getElementById('biceps-btn-text');
    
    if (!userIdsStr) {
        tg.showAlert('Введите ID пользователей');
        return;
    }
    
    // Получаем выбранный тип взаимодействия
    if (!interactionTypeSelect) {
        console.error('Селектор interaction-type не найден!');
        tg.showAlert('Ошибка: селектор типа взаимодействия не найден');
        return;
    }
    
    // Читаем значение селектора ДИНАМИЧЕСКИ
    const interactionType = interactionTypeSelect.value;
    
    console.log('=== НАЧАЛО ВЗАИМОДЕЙСТВИЯ ===');
    console.log('Селектор найден:', !!interactionTypeSelect);
    console.log('Селектор element:', interactionTypeSelect);
    console.log('Значение селектора (.value):', interactionTypeSelect.value);
    console.log('Выбранный индекс:', interactionTypeSelect.selectedIndex);
    console.log('Все опции селектора:', Array.from(interactionTypeSelect.options).map((opt, idx) => 
        `[${idx}] ${opt.value} (${opt.text}) - selected: ${opt.selected}`
    ));
    console.log('Выбранная опция по индексу:', interactionTypeSelect.options[interactionTypeSelect.selectedIndex]?.value);
    console.log('Выбранный тип взаимодействия (переменная):', interactionType);
    
    // ДОПОЛНИТЕЛЬНАЯ ПРОВЕРКА: читаем значение еще раз разными способами
    const typeFromSelectedIndex = interactionTypeSelect.options[interactionTypeSelect.selectedIndex]?.value;
    const typeFromValue = interactionTypeSelect.value;
    
    console.log('Проверка консистентности:');
    console.log('  - typeFromValue:', typeFromValue);
    console.log('  - typeFromSelectedIndex:', typeFromSelectedIndex);
    console.log('  - Они совпадают?', typeFromValue === typeFromSelectedIndex);
    
    if (!interactionType || interactionType === '') {
        console.error('Тип взаимодействия не выбран!');
        tg.showAlert('Выберите тип взаимодействия');
        return;
    }
    
    // Используем значение из селектора (самый надежный способ)
    const finalInteractionType = typeFromSelectedIndex || typeFromValue || interactionType;
    console.log('ИСПОЛЬЗУЕМЫЙ ТИП ВЗАИМОДЕЙСТВИЯ:', finalInteractionType);
    
    // Парсим ID пользователей
    const userIds = userIdsStr.split(/[,\s]+/).map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    
    if (userIds.length === 0) {
        tg.showAlert('Неверный формат ID. Используйте числа, разделенные запятыми или пробелами');
        return;
    }
    
    // Определяем название действия для отображения
    const actionNames = {
        'UpgradeBiceps': 'Прокачка бицухи',
        'TossDroj': 'Харкнуть в баланду',
        'Harknut': 'Подкинуть в парашу'
    };
    const actionName = actionNames[finalInteractionType] || finalInteractionType;
    
    // Тексты для кнопок
    const buttonTexts = {
        'UpgradeBiceps': '💪 Начать прокачку',
        'TossDroj': '🤮 Начать харкать',
        'Harknut': '💩 Начать подкидывать'
    };
    
    // Блокируем кнопку
    startBtn.disabled = true;
    btnText.textContent = '⏳ Выполняется...';
    
    // Получаем токен (с автоматическим обновлением при необходимости)
    let token = await getAccessToken();
    if (!token) {
        tg.showAlert('Токен не найден. Выполните авторизацию');
        startBtn.disabled = false;
        btnText.textContent = buttonTexts[interactionType] || '💪 Начать';
        return;
    }
    
    // Получаем свой User ID из localStorage или из API
    let fromUserId = localStorage.getItem('game_user_id');
    if (!fromUserId) {
        // Пытаемся получить из API /player/init
        try {
            console.log('Получение User ID из API...');
            let initResponse = await fetch(`${GAME_API_URL}/player/init`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({})
            });
            
            // Если получили 401, пытаемся обновить токен через сохраненный initData
            if (initResponse.status === 401 || initResponse.status === 403) {
                console.warn('Токен протух, пытаемся обновить через сохраненный initData...');
                const manualInitData = localStorage.getItem('manual_init_data');
                if (manualInitData && manualInitData.trim()) {
                    const newToken = await loginWithInitData();
                    if (newToken) {
                        token = newToken;
                        // Повторяем запрос с новым токеном
                        initResponse = await fetch(`${GAME_API_URL}/player/init`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({})
                        });
                    }
                }
            }
            
            if (initResponse.ok) {
                const initData = await initResponse.json();
                if (initData.success && initData.userId) {
                    fromUserId = initData.userId.toString();
                    localStorage.setItem('game_user_id', fromUserId);
                    console.log('User ID получен из API:', fromUserId);
                }
            }
        } catch (error) {
            console.warn('Не удалось получить User ID из API:', error);
        }
        
        // Если все еще не получили, используем значение по умолчанию
        if (!fromUserId) {
            fromUserId = 270721017; // Замените на ваш User ID
            console.warn('User ID не найден, используется значение по умолчанию:', fromUserId);
        }
    }
    
    // Показываем результаты
    resultsDiv.style.display = 'block';
    resultsContent.innerHTML = `<p>⏳ Начинаю ${actionName.toLowerCase()}...</p>`;
    
    let successCount = 0;
    let alreadyDoneCount = 0;
    let errorCount = 0;
    const results = [];
    
    for (const toUserId of userIds) {
        try {
            // ВАЖНО: Получаем актуальное значение селектора каждый раз ПРЯМО ИЗ DOM
            const selector = document.getElementById('interaction-type');
            const currentInteractionType = selector?.options[selector.selectedIndex]?.value || 
                                          selector?.value || 
                                          finalInteractionType || 
                                          interactionType;
            
            const requestBody = {
                fromUserId: parseInt(fromUserId),
                toUserId: toUserId,
                type: currentInteractionType
            };
            
            console.log(`=== ОТПРАВКА ЗАПРОСА ДЛЯ ${toUserId} ===`);
            console.log(`Селектор при отправке:`, selector);
            console.log(`selectedIndex:`, selector?.selectedIndex);
            console.log(`Значение опции по индексу:`, selector?.options[selector?.selectedIndex]?.value);
            console.log(`Значение .value:`, selector?.value);
            console.log(`finalInteractionType (из начала функции):`, finalInteractionType);
            console.log(`currentInteractionType (из селектора в цикле):`, currentInteractionType);
            console.log(`ИСПОЛЬЗУЕМЫЙ ТИП В requestBody:`, requestBody.type);
            console.log(`Полный requestBody:`, JSON.stringify(requestBody, null, 2));
            
            let response = await fetch(`${GAME_API_URL}/interaction/perform`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestBody)
            });
            
            // Если получили 401, пытаемся обновить токен через сохраненный initData
            if (response.status === 401 || response.status === 403) {
                console.warn('Токен протух, пытаемся обновить через сохраненный initData...');
                const manualInitData = localStorage.getItem('manual_init_data');
                if (manualInitData && manualInitData.trim()) {
                    const newToken = await loginWithInitData();
                    if (newToken) {
                        token = newToken;
                        // Повторяем запрос с новым токеном (используем тот же requestBody с правильным типом)
                        // ВАЖНО: Обновляем тип из селектора перед повторной отправкой
                        const selectorRetry = document.getElementById('interaction-type');
                        const currentInteractionTypeRetry = selectorRetry?.options[selectorRetry.selectedIndex]?.value || 
                                                           selectorRetry?.value || 
                                                           finalInteractionType || 
                                                           interactionType;
                        requestBody.type = currentInteractionTypeRetry;
                        console.log(`=== ПОВТОРНАЯ ОТПРАВКА ЗАПРОСА ДЛЯ ${toUserId} ===`);
                        console.log(`Тип взаимодействия при повторе: ${currentInteractionTypeRetry}`);
                        console.log(`Обновленный requestBody:`, JSON.stringify(requestBody, null, 2));
                        response = await fetch(`${GAME_API_URL}/interaction/perform`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify(requestBody)
                        });
                    }
                }
            }
            
            const result = await response.json();
            
            if (result.success) {
                successCount++;
                results.push(`✅ ${toUserId}: ${result.message || 'Успешно'}`);
            } else {
                const message = result.message || result.detail || 'Ошибка';
                if (message.includes('уже сегодня') || message.includes('already') || 
                    message.includes('уже') || message.includes('сегодня')) {
                    alreadyDoneCount++;
                    results.push(`⚠️ ${toUserId}: уже выполнено сегодня`);
                } else {
                    errorCount++;
                    results.push(`❌ ${toUserId}: ${message}`);
                }
            }
            
            // Обновляем результаты в реальном времени
            resultsContent.innerHTML = `
                <p><strong>${actionName}</strong></p>
                <p><strong>Обработано:</strong> ${results.length} / ${userIds.length}</p>
                <div style="max-height: 200px; overflow-y: auto; margin-top: 10px;">
                    ${results.map(r => `<div style="margin: 5px 0; font-size: 12px;">${r}</div>`).join('')}
                </div>
            `;
            
            // Небольшая задержка между запросами
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            errorCount++;
            results.push(`❌ ${toUserId}: ${error.message}`);
            console.error(`Ошибка при ${actionName.toLowerCase()} для ${toUserId}:`, error);
        }
    }
    
    // Итоговые результаты
    resultsContent.innerHTML = `
        <h4>📊 Итоги: ${actionName}</h4>
        <p>✅ Успешно: ${successCount}</p>
        <p>⚠️ Уже выполнено сегодня: ${alreadyDoneCount}</p>
        <p>❌ Ошибки: ${errorCount}</p>
        <p><strong>Всего: ${userIds.length}</strong></p>
        <div style="max-height: 200px; overflow-y: auto; margin-top: 10px; padding: 10px; background: #f5f5f5; border-radius: 5px;">
            ${results.map(r => `<div style="margin: 5px 0; font-size: 12px;">${r}</div>`).join('')}
        </div>
    `;
    
    tg.showAlert(`Готово!\n\n${actionName}\n\nУспешно: ${successCount}\nУже выполнено: ${alreadyDoneCount}\nОшибки: ${errorCount}`);
    
    // Разблокируем кнопку
    startBtn.disabled = false;
    btnText.textContent = buttonTexts[interactionType] || '💪 Начать';
}

// Обновляем текст кнопки при изменении типа взаимодействия (добавляем после загрузки DOM)
function initInteractionTypeSelector() {
    const interactionTypeSelect = document.getElementById('interaction-type');
    const btnText = document.getElementById('biceps-btn-text');
    
    if (interactionTypeSelect && btnText) {
        const buttonTexts = {
            'UpgradeBiceps': '💪 Начать прокачку',
            'TossDroj': '🤮 Начать харкать',
            'Harknut': '💩 Начать подкидывать'
        };
        
        interactionTypeSelect.addEventListener('change', function() {
            const selectedType = this.value;
            btnText.textContent = buttonTexts[selectedType] || '💪 Начать';
        });
        
        // Устанавливаем начальный текст
        if (interactionTypeSelect.value) {
            btnText.textContent = buttonTexts[interactionTypeSelect.value] || '💪 Начать';
        }
    }
}

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
        // Получаем токен (с автоматическим обновлением при необходимости)
        let token = await getAccessToken();
        if (!token) {
            throw new Error('Токен не найден');
        }
        
        // Создаем заголовки для авторизации
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`
        };
        
        const response = await fetch(`${GAME_API_URL}/boss/bootstrap`, {
            method: 'GET',
            headers: headers
        });
        
        // Если получили 401, пытаемся обновить токен через сохраненный initData
        if (response.status === 401 || response.status === 403) {
            console.warn('Токен протух, пытаемся обновить через сохраненный initData...');
            const manualInitData = localStorage.getItem('manual_init_data');
            if (manualInitData && manualInitData.trim()) {
                const newToken = await loginWithInitData();
                if (newToken) {
                    token = newToken;
                    headers['Authorization'] = `Bearer ${token}`;
                    // Повторяем запрос с новым токеном
                    const retryResponse = await fetch(`${GAME_API_URL}/boss/bootstrap`, {
                        method: 'GET',
                        headers: headers
                    });
                    if (!retryResponse.ok) {
                        throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
                    }
                    // Продолжаем с retryResponse
                    const data = await retryResponse.json();
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
                        return;
                    }
                }
            }
            throw new Error(`HTTP ${response.status}: Токен протух и не удалось обновить`);
        }
        
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
        let token = await getAccessToken();
        if (!token) {
            tg.showAlert('❌ Требуется авторизация!\nОбновите страницу');
            btn.disabled = false;
            btn.textContent = '⚔️ Атаковать';
            return;
        }
        
        const attackBody = { type: 'punchChest' };
        console.log('Отправка атаки:', attackBody);
        
        let response = await fetch(`${GAME_API_URL}/boss/attack`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(attackBody)
        });
        
        // Если получили 401, пытаемся обновить токен через сохраненный initData
        if (response.status === 401 || response.status === 403) {
            console.warn('Токен протух, пытаемся обновить через сохраненный initData...');
            const manualInitData = localStorage.getItem('manual_init_data');
            if (manualInitData && manualInitData.trim()) {
                const newToken = await loginWithInitData();
                if (newToken) {
                    token = newToken;
                    // Повторяем запрос с новым токеном
                    response = await fetch(`${GAME_API_URL}/boss/attack`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify(attackBody)
                    });
                }
            }
        }
        
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

// Загрузка списка тюрем и информации об игроке (параллельно)
async function loadPrisons() {
    const select = document.getElementById('prison-select');
    
    let token = await getAccessToken();
    if (!token) {
        console.warn('Токен не доступен');
        return;
    }
    
    try {
        // Запрашиваем оба эндпоинта параллельно
        console.log('Загрузка тюрем и информации об игроке...');
        let prisonsResponse = await fetch(`${GAME_API_URL}/prisons/tops-all`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        let playerResponse = await fetch(`${GAME_API_URL}/player/init`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({})
        });
        
        // Если получили 401, пытаемся обновить токен через сохраненный initData
        if ((prisonsResponse.status === 401 || prisonsResponse.status === 403) || 
            (playerResponse.status === 401 || playerResponse.status === 403)) {
            console.warn('Токен протух, пытаемся обновить через сохраненный initData...');
            const manualInitData = localStorage.getItem('manual_init_data');
            if (manualInitData && manualInitData.trim()) {
                const newToken = await loginWithInitData();
                if (newToken) {
                    token = newToken;
                    // Повторяем запросы с новым токеном
                    [prisonsResponse, playerResponse] = await Promise.all([
                        fetch(`${GAME_API_URL}/prisons/tops-all`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            }
                        }),
                        fetch(`${GAME_API_URL}/player/init`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({})
                        })
                    ]);
                }
            }
        }
        
        // Обрабатываем ответ с тюрьмами
        if (!prisonsResponse.ok) throw new Error(`HTTP ${prisonsResponse.status}`);
        
        const prisonsData = await prisonsResponse.json();
        if (prisonsData.success && prisonsData.tops) {
            const prisonNames = {
                1: 'Бутырка', 2: 'Красная пресня', 3: 'Софийка', 4: 'Кресты',
                5: 'Владимирский Централ', 6: 'Угольки', 7: 'Матросская Тишина',
                8: 'Вологодский пятак', 9: 'Лефортовка', 10: 'Белый лебедь',
                11: 'Орловский Централ', 12: 'Елецкая крытка', 13: 'Черный дельфин',
                14: 'Гронецкая крытка', 15: 'Александровский Централ'
            };
            
            prisonsData.tops.forEach(top => {
                const option = document.createElement('option');
                option.value = top.prisonId;
                option.textContent = `#${top.prisonId} - ${prisonNames[top.prisonId] || `Тюрьма ${top.prisonId}`}`;
                select.appendChild(option);
            });
        }
        
        // Обрабатываем ответ с информацией об игроке
        if (playerResponse.ok) {
            const playerData = await playerResponse.json();
            if (playerData.success && playerData.userId) {
                localStorage.setItem('game_user_id', playerData.userId.toString());
                console.log('✅ User ID получен и сохранен:', playerData.userId);
                if (playerData.nickname) {
                    console.log('Никнейм игрока:', playerData.nickname);
                }
            } else {
                console.warn('Не удалось получить userId из ответа /player/init');
            }
        } else {
            console.warn(`Ошибка при загрузке информации об игроке: HTTP ${playerResponse.status}`);
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
    
    let token = await getAccessToken();
    if (!token) {
        prisonInfo.innerHTML = '<p class="error">❌ Требуется авторизация!</p>';
        walkBtn.disabled = true;
        return;
    }
    
    prisonInfo.innerHTML = '<p class="loading">Загрузка...</p>';
    walkBtn.disabled = true;
    
    try {
        // Загружаем информацию о тюрьме и чекпоинты параллельно
        let prisonResponse = await fetch(`${GAME_API_URL}/player/prison/${prisonId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        let checkpointsResponse = await fetch(`${GAME_API_URL}/player/prison/${prisonId}/checkpoints?isDay=${isDay}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        // Если получили 401, пытаемся обновить токен через сохраненный initData
        if ((prisonResponse.status === 401 || prisonResponse.status === 403) || 
            (checkpointsResponse.status === 401 || checkpointsResponse.status === 403)) {
            console.warn('Токен протух, пытаемся обновить через сохраненный initData...');
            const manualInitData = localStorage.getItem('manual_init_data');
            if (manualInitData && manualInitData.trim()) {
                const newToken = await loginWithInitData();
                if (newToken) {
                    token = newToken;
                    // Повторяем запросы с новым токеном
                    [prisonResponse, checkpointsResponse] = await Promise.all([
                        fetch(`${GAME_API_URL}/player/prison/${prisonId}`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            }
                        }),
                        fetch(`${GAME_API_URL}/player/prison/${prisonId}/checkpoints?isDay=${isDay}`, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            }
                        })
                    ]);
                }
            }
        }
        
        if (!prisonResponse.ok) throw new Error(`HTTP ${prisonResponse.status} при загрузке тюрьмы`);
        if (!checkpointsResponse.ok) throw new Error(`HTTP ${checkpointsResponse.status} при загрузке чекпоинтов`);
        
        const prisonData = await prisonResponse.json();
        const checkpointsData = await checkpointsResponse.json();
        
        if (!prisonData.success || !checkpointsData.success) {
            throw new Error('Не удалось загрузить данные');
        }
        
        const d = prisonData.data;
        const mode = isDay ? 'day' : 'night';
        const currentCheckpoint = d[`${mode}CurrentCheckpoint`] || 0;
        const clicksInCheckpoint = d[`${mode}ClicksInCheckpoint`] || 0;
        const rating = d[`${mode}Rating`] || 0;
        const runs = d[`${mode}Runs`] || 0;
        
        // Находим текущий чекпоинт в списке
        const checkpoints = checkpointsData.data || [];
        const currentCheckpointData = checkpoints.find(cp => cp.checkpointId === currentCheckpoint + 1) || checkpoints[0];
        
        const prisonNames = {
            1: 'Бутырка', 2: 'Красная пресня', 3: 'Софийка', 4: 'Кресты',
            5: 'Владимирский Централ', 6: 'Угольки', 7: 'Матросская Тишина',
            8: 'Вологодский пятак', 9: 'Лефортовка', 10: 'Белый лебедь',
            11: 'Орловский Централ', 12: 'Елецкая крытка', 13: 'Черный дельфин',
            14: 'Гронецкая крытка', 15: 'Александровский Централ'
        };
        
        let checkpointInfo = '';
        if (currentCheckpointData) {
            const clicksLeft = Math.max(0, currentCheckpointData.clicksRequired - clicksInCheckpoint);
            checkpointInfo = `
                <div class="checkpoint-info">
                    <h4>📍 Текущий чекпоинт: ${currentCheckpointData.title}</h4>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${(clicksInCheckpoint / currentCheckpointData.clicksRequired) * 100}%"></div>
                        <span class="progress-text">${clicksInCheckpoint} / ${currentCheckpointData.clicksRequired} кликов</span>
                    </div>
                    <div class="checkpoint-rewards">
                        <div class="reward-item">⚡ Энергия: <strong>${currentCheckpointData.energyCost}</strong></div>
                        <div class="reward-item">🚬 Сигареты: <strong>+${currentCheckpointData.rewardCigarettes}</strong></div>
                        <div class="reward-item">⭐ Рейтинг: <strong>+${currentCheckpointData.rewardRating}</strong></div>
                        <div class="reward-item">👑 Авторитет: <strong>+${currentCheckpointData.rewardAuthority}</strong></div>
                    </div>
                </div>
            `;
        }
        
        prisonInfo.innerHTML = `
            <div class="prison-details">
                <h3>${prisonNames[prisonId] || `Тюрьма #${prisonId}`}</h3>
                <div class="prison-stats">
                    <div class="stat-item">
                        <span class="stat-label">Режим:</span>
                        <span class="stat-value">${isDay ? '☀️ День' : '🌙 Ночь'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Чекпоинт:</span>
                        <span class="stat-value">${currentCheckpoint + 1} / ${checkpoints.length}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Кликов в чекпоинте:</span>
                        <span class="stat-value">${clicksInCheckpoint}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Рейтинг:</span>
                        <span class="stat-value">${rating.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Пройдено ходок:</span>
                        <span class="stat-value">${runs}</span>
                    </div>
                </div>
                ${checkpointInfo}
            </div>
        `;
        walkBtn.disabled = false;
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
    
    let token = await getAccessToken();
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
        // Выполняем клики до окончания энергии
        let total_clicks = 0;
        let total_cigarettes = 0;
        let total_rating = 0;
        let total_authority = 0;
        let current_energy = 50; // Начальная энергия (будет обновляться из ответа)
        let last_error = null;
        const max_iterations = 100; // Максимум итераций для безопасности
        
        // Обновляем информацию о прогрессе в интерфейсе
        const prisonInfo = document.getElementById('prison-info');
        
        for (let i = 0; i < max_iterations; i++) {
            // Показываем прогресс
            prisonInfo.innerHTML = `
                <div class="prison-details">
                    <h3>🚀 Прохождение тюрьмы...</h3>
                    <div class="progress-info">
                        <p>Кликов: <strong>${total_clicks}</strong></p>
                        <p>Энергия: <strong>${current_energy}</strong></p>
                        <p>Сигареты: <strong>+${total_cigarettes}</strong></p>
                        <p>Рейтинг: <strong>+${total_rating}</strong></p>
                        <p>Авторитет: <strong>+${total_authority}</strong></p>
                    </div>
                </div>
            `;
            
            // POST запрос для работы в тюрьме
            let response = await fetch(`${GAME_API_URL}/player/prison/${prisonId}/work?isDay=${isDay}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            // Если получили 401, пытаемся обновить токен через сохраненный initData
            if (response.status === 401 || response.status === 403) {
                console.warn('Токен протух, пытаемся обновить через сохраненный initData...');
                const manualInitData = localStorage.getItem('manual_init_data');
                if (manualInitData && manualInitData.trim()) {
                    const newToken = await loginWithInitData();
                    if (newToken) {
                        token = newToken;
                        // Повторяем запрос с новым токеном
                        response = await fetch(`${GAME_API_URL}/player/prison/${prisonId}/work?isDay=${isDay}`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            }
                        });
                    }
                }
            }
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            
            // Обрабатываем ошибку "Too many work requests"
            if (!data.success && data.error) {
                if (data.error.includes('Too many work requests') || data.error.includes('Cooldown')) {
                    console.log('⚠️ Cooldown, ждем 1 секунду...');
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue; // Повторяем попытку
                } else {
                    last_error = data.error;
                    break;
                }
            }
            
            if (!data.success) {
                last_error = data.error || 'Неизвестная ошибка';
                break;
            }
            
            // Обновляем статистику
            total_clicks++;
            total_cigarettes += data.rewardCigarettes || 0;
            total_rating += data.rewardRating || 0;
            total_authority += data.rewardAuthority || 0;
            current_energy = data.energy || 0;
            
            // Проверяем энергию
            if (current_energy <= 0) {
                console.log('Энергия закончилась');
                break;
            }
            
            // Проверяем, завершен ли чекпоинт или ходка
            if (data.runCompleted) {
                console.log('Ходка завершена');
                break;
            }
            
            // Задержка между кликами (1 секунда)
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Показываем результат
        const message = `✅ Прохождение завершено!\n\n` +
            `📊 Статистика:\n` +
            `• Кликов: ${total_clicks}\n` +
            `• Сигареты: +${total_cigarettes}\n` +
            `• Рейтинг: +${total_rating}\n` +
            `• Авторитет: +${total_authority}\n` +
            `• Осталось энергии: ${current_energy}`;
        
        if (last_error) {
            tg.showPopup({
                title: '⚠️ Прохождение прервано',
                message: message + `\n\nОшибка: ${last_error}`,
                buttons: [{ text: 'OK', type: 'ok' }]
            });
        } else {
            tg.showPopup({
                title: '✅ Прохождение завершено',
                message: message,
                buttons: [{ text: 'OK', type: 'ok' }]
            });
        }
        
        // Обновляем информацию о тюрьме и статистику
        await Promise.all([
            loadPrisonInfo(),
            loadStats()
        ]);
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
    let token = await getAccessToken();
    if (!token) {
        return;
    }
    
    try {
        // Получаем информацию о боссе для отображения энергии
        let response = await fetch(`${GAME_API_URL}/boss/bootstrap`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });
        
        // Если получили 401, пытаемся обновить токен через сохраненный initData
        if (response.status === 401 || response.status === 403) {
            console.warn('Токен протух, пытаемся обновить через сохраненный initData...');
            const manualInitData = localStorage.getItem('manual_init_data');
            if (manualInitData && manualInitData.trim()) {
                const newToken = await loginWithInitData();
                if (newToken) {
                    token = newToken;
                    // Повторяем запрос с новым токеном
                    response = await fetch(`${GAME_API_URL}/boss/bootstrap`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        }
                    });
                }
            }
        }
        
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

// Получение токена доступа (с автоматическим обновлением через initData при необходимости)
async function getAccessToken() {
    // Проверяем localStorage
    const storedToken = localStorage.getItem('game_access_token');
    
    if (storedToken && storedToken.length > 10) {
        console.log('Токен найден в localStorage');
        return storedToken;
    }
    
    // Если токена нет, проверяем наличие сохраненного initData
    const manualInitData = localStorage.getItem('manual_init_data');
    if (manualInitData && manualInitData.trim()) {
        console.log('Токен не найден, пытаемся получить через сохраненный initData...');
        try {
            const newToken = await loginWithInitData();
            if (newToken) {
                return newToken;
            }
        } catch (e) {
            console.warn('Не удалось получить токен через сохраненный initData:', e);
        }
    }
    
    console.log('Токен не найден в localStorage и нет сохраненного initData');
    return null;
}

// Получение токена синхронно (для случаев, когда async не подходит)
function getAccessTokenSync() {
    const storedToken = localStorage.getItem('game_access_token');
    return storedToken && storedToken.length > 10 ? storedToken : null;
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
        
        // Проверяем, есть ли сохраненный initData от пользователя
        const manualInitData = localStorage.getItem('manual_init_data');
        const useHardcoded = localStorage.getItem('use_hardcoded_initdata') === 'true';
        
        // Захардкоженный initData для тестирования (работающий)
        const HARDCODED_INIT_DATA = 'query_id=AAH53yIQAAAAAPnfIhAoANyK&user=%7B%22id%22%3A270721017%2C%22first_name%22%3A%22Volodya%22%2C%22last_name%22%3A%22%22%2C%22username%22%3A%22zver_21%22%2C%22language_code%22%3A%22ru%22%2C%22allows_write_to_pm%22%3Atrue%2C%22photo_url%22%3A%22https%3A%5C%2F%5C%2Ft.me%5C%2Fi%5C%2Fuserpic%5C%2F320%5C%2Fh8b3_9CHPrRIbuB8eqQUX425Vn5wTHw-Mz23B4wNtxE.svg%22%7D&auth_date=1762342159&signature=xH22ACBKMdOOa30VHsPPme35tKQQ5dPocMiiJ-qiBcut_2wK8jzhH8EqCiZh0gST980RGyVfw2KRaI4-M4PaCw&hash=57f11925ffed739dd3b9b07c073af3059b609da38f4ddf4b5423b93a13749b7b';
        
        let initData = '';
        
        // Приоритет: 1) manualInitData, 2) Telegram initData, 3) hardcoded (если включен)
        if (manualInitData && manualInitData.trim()) {
            initData = manualInitData.trim();
            console.log('✓ Используется initData, введенный пользователем в настройках');
        } else if (useHardcoded) {
            // Используем захардкоженный initData
            initData = HARDCODED_INIT_DATA;
            console.log('⚠️ Используется захардкоженный initData для тестирования');
        } else {
            // Используем initData от Telegram
            initData = tg?.initData || '';
            if (!initData || initData.length < 50) {
                console.warn('tg.initData недоступен, пробуем захардкоженный');
                initData = HARDCODED_INIT_DATA;
            } else {
                console.log('✓ Используется initData от Telegram');
            }
        }
        
        console.log('initData длина:', initData.length);
        console.log('initData первые 100 символов:', initData.substring(0, 100) + '...');
        
        // Логируем информацию о Telegram WebApp (для отладки)
        if (tg) {
            console.log('Telegram WebApp доступен:');
            console.log('- tg.initData тип:', typeof tg.initData);
            console.log('- tg.initData длина:', tg.initData ? tg.initData.length : 0);
            console.log('- tg.initData значение (первые 100 символов):', tg.initData ? tg.initData.substring(0, 100) : 'пусто');
        } else {
            console.log('Telegram WebApp недоступен');
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
        
        // Проверяем hash перед отправкой
        const hashMatch = initData.match(/hash=([a-f0-9]+)/);
        if (hashMatch) {
            const hashValue = hashMatch[1];
            console.log('Hash в initData:', {
                длина: hashValue.length,
                значение: hashValue.substring(0, 20) + '...',
                полнаяДлина: hashValue.length === 64 ? '✓ корректная (64)' : `⚠️ неверная (${hashValue.length})`
            });
            if (hashValue.length !== 64) {
                console.error('⚠️ Hash имеет неверную длину! Это может быть причиной ошибки');
            }
        }
        
        const requestBody = { initData: initData };
        // Используем JSON.stringify без дополнительных параметров для сохранения точности
        const requestBodyString = JSON.stringify(requestBody);
        
        console.log('URL запроса:', loginUrl);
        console.log('Body запроса (первые 300 символов):', requestBodyString.substring(0, 300) + '...');
        console.log('Длина initData в body:', initData.length);
        console.log('Длина JSON body:', requestBodyString.length);
        
        // Проверяем, что initData не искажен при JSON.stringify
        try {
            const parsed = JSON.parse(requestBodyString);
            if (parsed.initData !== initData) {
                console.error('⚠️ ВНИМАНИЕ: initData изменился при JSON.stringify!');
                console.error('Исходный initData длина:', initData.length);
                console.error('initData после парсинга длина:', parsed.initData.length);
                console.error('Исходный initData последние 50:', initData.substring(initData.length - 50));
                console.error('initData после парсинга последние 50:', parsed.initData.substring(parsed.initData.length - 50));
            }
        } catch (e) {
            console.warn('Не удалось проверить JSON:', e);
        }
        
        // Отправляем запрос
        console.log('Отправка запроса...');
        const response = await fetch(loginUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: requestBodyString
        });
        
        console.log('Ответ сервера:', response.status, response.statusText);
        console.log('Заголовки ответа:', Object.fromEntries(response.headers.entries()));
        
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
        const responseText = await response.text();
        console.log('Тело ответа (первые 500 символов):', responseText.substring(0, 500));
        
        if (contentType && contentType.includes('application/json')) {
            if (responseText.trim()) {
                try {
                    data = JSON.parse(responseText);
                    console.log('Данные авторизации:', { 
                        success: data.success, 
                        hasToken: !!data.accessToken,
                        userId: data.userId,
                        error: data.error || data.message
                    });
                } catch (e) {
                    console.error('Ошибка парсинга JSON:', e);
                    console.error('Ответ:', responseText);
                    throw new Error(`Не удалось распарсить ответ: ${e.message}`);
                }
            } else {
                console.error('Пустое тело ответа');
                throw new Error('Пустой ответ от сервера');
            }
        } else {
            // Если не JSON, пытаемся распарсить как текст
            console.log('Не-JSON ответ:', responseText.substring(0, 500));
            throw new Error(`Неожиданный Content-Type: ${contentType}`);
        }
        
        // Если есть ошибка, логируем подробно
        if (!data.success) {
            console.error('Ошибка авторизации:', data.error || data.message);
            console.error('Полный ответ:', JSON.stringify(data, null, 2));
            
            // Если ошибка "Invalid initData", проверяем hash
            if ((data.error && data.error.includes('Invalid initData')) || 
                (data.message && data.message.includes('Invalid initData'))) {
                console.error('='.repeat(60));
                console.error('ОШИБКА: Invalid initData');
                console.error('Возможные причины:');
                console.error('1. Hash имеет неверную длину или значение');
                console.error('2. Signature неверный');
                console.error('3. initData обрезан при передаче');
                console.error('4. initData устарел');
                console.error('');
                console.error('Отправленный initData:');
                console.error('- Длина:', initData.length);
                console.error('- Hash:', hashMatch ? hashMatch[1] : 'не найден');
                console.error('- Hash длина:', hashMatch ? hashMatch[1].length : 'N/A');
                console.error('='.repeat(60));
            }
        }
        
        if (data.success && data.accessToken) {
            console.log('Авторизация успешна!');
            // Сохраняем токен (в реальном приложении нужно использовать безопасное хранилище)
            localStorage.setItem('game_access_token', data.accessToken);
            localStorage.setItem('game_refresh_token', data.refreshToken || '');
            
            // Сохраняем userId из login
            if (data.userId) {
                localStorage.setItem('game_user_id', data.userId.toString());
                console.log('User ID сохранен из login:', data.userId);
            }
            
            // Дополнительно получаем User ID из /player/init для точности
            try {
                const initResponse = await fetch(`${GAME_API_URL}/player/init`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${data.accessToken}`
                    },
                    body: JSON.stringify({})
                });
                
                if (initResponse.ok) {
                    const initData = await initResponse.json();
                    if (initData.success && initData.userId) {
                        localStorage.setItem('game_user_id', initData.userId.toString());
                        console.log('User ID обновлен из /player/init:', initData.userId);
                    }
                }
            } catch (error) {
                console.warn('Не удалось получить User ID из /player/init:', error);
            }
            
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
