// Telegram Web App API
// Проверяем, что мы в Telegram
let tg = null;
console.log('=== Инициализация Telegram WebApp ===');
console.log('window.Telegram:', !!window.Telegram);
console.log('window.Telegram?.WebApp:', !!window.Telegram?.WebApp);

if (window.Telegram && window.Telegram.WebApp) {
    tg = window.Telegram.WebApp;
    console.log('✓ Telegram WebApp инициализирован');
    console.log('tg.initDataUnsafe:', !!tg.initDataUnsafe);
    console.log('tg.initDataUnsafe?.user:', !!tg.initDataUnsafe?.user);
    if (tg.initDataUnsafe?.user) {
        console.log('tg.initDataUnsafe.user:', JSON.stringify(tg.initDataUnsafe.user, null, 2));
    }
    console.log('tg.initData:', !!tg.initData);
} else {
    console.error('❌ Telegram WebApp не доступен! Убедитесь, что Mini App открыт через Telegram');
    console.error('window.Telegram:', window.Telegram);
    console.error('window.Telegram?.WebApp:', window.Telegram?.WebApp);
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

// Функции для кастомного модального окна с темным фоном
function showCustomModal(message) {
    const modal = document.getElementById('custom-modal');
    const modalBody = document.getElementById('custom-modal-body');
    if (modal && modalBody) {
        modalBody.textContent = message;
        modal.style.display = 'flex';
        // Блокируем прокрутку фона
        document.body.style.overflow = 'hidden';
    }
}

function closeCustomModal() {
    const modal = document.getElementById('custom-modal');
    if (modal) {
        modal.style.display = 'none';
        // Разблокируем прокрутку фона
        document.body.style.overflow = '';
    }
}

// Базовый URL API игры
// Загружается из localStorage или используется значение по умолчанию
function getApiServerUrl() {
    const saved = localStorage.getItem('api_server_url');
    if (saved && saved.trim()) {
        return saved.trim();
    }
    // Нет значения по умолчанию - пользователь должен указать URL
    return null;
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
async function loadSettings() {
    const apiUrl = localStorage.getItem('api_server_url') || '';
    // ВАЖНО: initData НЕ сохраняется в localStorage, только получается из БД по токену
    let manualInitData = '';
    
    // Получаем initData из БД, если есть токен или username из Telegram
    const savedToken = localStorage.getItem('game_access_token');
    if (savedToken) {
        console.log('Получаем initData из БД по токену...');
        try {
            const savedInitData = await getSavedInitDataFromServer();
            if (savedInitData && savedInitData.trim() && savedInitData.length >= 50) {
                manualInitData = savedInitData;
                console.log('✓ Получен initData из БД при загрузке настроек');
            }
        } catch (e) {
            console.warn('Не удалось получить initData из БД при загрузке настроек:', e);
        }
    } else {
        // Если нет токена, пытаемся получить initData по user_id или username из Telegram
        const telegramUserInfo = getTelegramUserInfo();
        if (telegramUserInfo) {
            if (telegramUserInfo.id) {
                console.log(`Пытаемся получить initData из БД по user_id: ${telegramUserInfo.id}`);
            } else if (telegramUserInfo.username) {
                console.log(`Пытаемся получить initData из БД по username: ${telegramUserInfo.username}`);
            }
            try {
                const savedInitData = await getSavedInitDataFromServer();
                if (savedInitData && savedInitData.trim() && savedInitData.length >= 50) {
                    manualInitData = savedInitData;
                    console.log('✓ Получен initData из БД при загрузке настроек');
                }
            } catch (e) {
                console.warn('Не удалось получить initData из БД:', e);
            }
        }
    }
    
    if (document.getElementById('api-server-url')) {
        document.getElementById('api-server-url').value = apiUrl;
    }
    if (document.getElementById('manual-initdata')) {
        document.getElementById('manual-initdata').value = manualInitData;
    }
    
    API_SERVER_URL = getApiServerUrl();
    GAME_API_URL = getGameApiUrl();
    
    updateSettingsDisplay();
}

async function saveSettings() {
    const apiUrl = document.getElementById('api-server-url').value.trim();
    const manualInitData = document.getElementById('manual-initdata').value.trim();
    
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
    // ВАЖНО: initData НЕ сохраняется в localStorage, только отправляется на сервер для сохранения в БД
    if (manualInitData) {
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
                    // После успешной авторизации показываем интерфейс
                    showMainInterface();
                    tg.showAlert('✅ Авторизация успешна!\n\nИнтерфейс готов к использованию.');
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
    }
    
    console.log('Настройки сохранены:');
    console.log('- API Server URL:', API_SERVER_URL || 'не указан (прямое подключение)');
    console.log('- Manual InitData:', manualInitData ? 'установлен' : 'не установлен');
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
        localStorage.removeItem('game_access_token');
        localStorage.removeItem('game_refresh_token');
        localStorage.removeItem('game_user_id');
        localStorage.removeItem('game_username');
        localStorage.removeItem('game_first_name');
        
        document.getElementById('api-server-url').value = '';
        document.getElementById('manual-initdata').value = '';
        
        API_SERVER_URL = getApiServerUrl();
        GAME_API_URL = getGameApiUrl();
        
        tg.showAlert('✅ Настройки сброшены!\n\nПерезагрузите страницу.');
        updateSettingsDisplay();
    }
}

function updateSettingsDisplay() {
    const apiUrl = localStorage.getItem('api_server_url') || '';
    const token = localStorage.getItem('game_access_token') || '';
    // ВАЖНО: initData не хранится в localStorage, только в БД
    
    const currentApiUrl = document.getElementById('current-api-url');
    const currentTokenStatus = document.getElementById('current-token-status');
    
    if (currentApiUrl) {
        currentApiUrl.textContent = apiUrl || 'Не указан (прямое подключение)';
    }
    
    if (currentTokenStatus) {
        if (token) {
            currentTokenStatus.textContent = 'Получен (хранится в БД)';
        } else {
            currentTokenStatus.textContent = 'Не сохранен';
        }
    }
}

async function showSettingsForm() {
    const welcome = document.getElementById('settings-welcome');
    const form = document.getElementById('settings-form');
    const info = document.getElementById('settings-info');
    
    if (welcome) welcome.style.display = 'none';
    if (form) form.style.display = 'flex';
    if (info) info.style.display = 'none';
    await loadSettings();
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

// Показать основной интерфейс (после успешной авторизации)
async function showMainInterface() {
    // Скрываем форму настроек
    document.getElementById('settings-section').style.display = 'none';
    
    // Показываем все секции интерфейса
    document.getElementById('boss-section').style.display = 'block';
    document.getElementById('boss-select-section').style.display = 'block';
    document.getElementById('prison-section').style.display = 'block';
    document.getElementById('stats-section').style.display = 'block';
    document.getElementById('biceps-section').style.display = 'block';
    
    updateStatus(true);
    
    // Загружаем данные только после успешной авторизации
    console.log('Загрузка данных после авторизации...');
    await Promise.allSettled([
        loadBossInfo(),
        loadBossList(),
        loadPrisons(),  // Загружает тюрьмы и информацию об игроке параллельно
        loadStats()
    ]).then(results => {
        results.forEach((result, index) => {
            const funcNames = ['loadBossInfo', 'loadBossList', 'loadPrisons', 'loadStats'];
            if (result.status === 'rejected') {
                console.error(`Ошибка в ${funcNames[index]}:`, result.reason);
            }
        });
    });
    
    // Обновляем статистику каждые 30 секунд
    setInterval(loadStats, 30000);
}

async function toggleSettings() {
    const settingsSection = document.getElementById('settings-section');
    if (settingsSection.style.display === 'none' || !settingsSection.style.display) {
        settingsSection.style.display = 'block';
        await loadSettings();
        // Показываем форму, если настройки не сохранены
        const hasSettings = localStorage.getItem('api_server_url');
        if (!hasSettings) {
            // Показываем приветствие при первом запуске
            const welcome = document.getElementById('settings-welcome');
            if (welcome) {
                welcome.style.display = 'block';
                document.getElementById('settings-form').style.display = 'none';
                document.getElementById('settings-info').style.display = 'none';
            } else {
                await showSettingsForm();
            }
        } else {
            hideSettingsForm();
        }
    } else {
        settingsSection.style.display = 'none';
    }
}

// Функция для обновления отображения username
function updateUsernameDisplay() {
    const usernameDisplay = document.getElementById('username-display');
    if (!usernameDisplay) return;
    
    // Обновляем tg на случай, если он еще не был инициализирован
    if (!tg && window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        console.log('✓ tg обновлен из window.Telegram.WebApp');
    }
    
    const telegramUserInfo = getTelegramUserInfo();
    if (telegramUserInfo) {
        // ВАЖНО: username может быть null, но user_id всегда есть
        if (telegramUserInfo.id) {
            if (telegramUserInfo.username) {
                usernameDisplay.textContent = `Username: @${telegramUserInfo.username} (ID: ${telegramUserInfo.id})`;
                usernameDisplay.style.color = '#4CAF50';
                console.log('✓ Username отображается:', telegramUserInfo.username);
            } else {
                // У пользователя нет username, но есть ID
                usernameDisplay.textContent = `User ID: ${telegramUserInfo.id} (username не установлен в Telegram)`;
                usernameDisplay.style.color = '#FF9800';
                console.log('✓ User ID найден, но username не установлен:', telegramUserInfo.id);
            }
            return true;
        }
    }
    
    // Пытаемся получить из localStorage
    const savedUsername = localStorage.getItem('game_username');
    const savedUserId = localStorage.getItem('game_user_id');
    if (savedUsername) {
        usernameDisplay.textContent = `Username: @${savedUsername} (из localStorage)`;
        usernameDisplay.style.color = '#FF9800';
        return true;
    } else if (savedUserId) {
        usernameDisplay.textContent = `User ID: ${savedUserId} (username не найден)`;
        usernameDisplay.style.color = '#FF9800';
        return true;
    } else {
        usernameDisplay.textContent = 'User ID: не найден (проверка...)';
        usernameDisplay.style.color = '#f44336';
        return false;
    }
}

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    updateStatus(false);
    
    // Показываем username в самом верху (сразу)
    updateUsernameDisplay();
    
    // Пытаемся обновить username несколько раз (на случай, если Telegram WebApp еще не загрузился)
    let attempts = 0;
    const maxAttempts = 10;
    const checkInterval = setInterval(() => {
        attempts++;
        const found = updateUsernameDisplay();
        if (found || attempts >= maxAttempts) {
            clearInterval(checkInterval);
            if (!found) {
                console.warn('⚠️ Username не найден после', maxAttempts, 'попыток');
            }
        }
    }, 200); // Проверяем каждые 200мс
    
    // Загружаем настройки (async, т.к. может получать initData с сервера)
    console.log('=== Загрузка настроек ===');
    await loadSettings();
    updateSettingsDisplay();
    
    // Обновляем глобальные переменные после загрузки настроек
    API_SERVER_URL = getApiServerUrl();
    GAME_API_URL = getGameApiUrl();
    console.log('API_SERVER_URL после loadSettings:', API_SERVER_URL);
    console.log('GAME_API_URL после loadSettings:', GAME_API_URL);
    
    // Инициализируем селектор типа взаимодействия
    initInteractionTypeSelector();
    
    // ВАЖНО: Показываем интерфейс ТОЛЬКО если есть токен (пользователь ввел initData и авторизовался)
    // Если нет токена - показываем только форму ввода initData
    const hasToken = localStorage.getItem('game_access_token');
    const hasSettings = localStorage.getItem('api_server_url');
    console.log('hasToken:', !!hasToken);
    console.log('hasSettings:', !!hasSettings);
    
    // Показываем форму ввода initData только если:
    // 1. Нет токена (пользователь не авторизован)
    if (!hasToken) {
        // Показываем настройки при первом запуске
        document.getElementById('settings-section').style.display = 'block';
        const welcome = document.getElementById('settings-welcome');
        if (welcome) {
            welcome.style.display = 'none'; // Скрываем приветствие, показываем форму
        }
        showSettingsForm(); // Показываем форму настроек
        
        // Скрываем все секции интерфейса до ввода initData
        document.getElementById('boss-section').style.display = 'none';
        document.getElementById('boss-select-section').style.display = 'none';
        document.getElementById('prison-section').style.display = 'none';
        document.getElementById('stats-section').style.display = 'none';
        document.getElementById('biceps-section').style.display = 'none';
        
        // НЕ продолжаем авторизацию - пользователь должен ввести initData
        console.log('⚠️ Токен не найден, показываем только форму ввода initData');
        return; // Прерываем выполнение, показываем только форму ввода initData
    }
    
    // Если есть токен, проверяем данные пользователя из Telegram
    const telegramUserInfo = getTelegramUserInfo();
    if (telegramUserInfo) {
        // Если есть данные пользователя из Telegram, сохраняем их
        console.log('✓ Пользователь идентифицирован через Telegram:');
        console.log(`  - user_id: ${telegramUserInfo.id}`);
        console.log(`  - username: ${telegramUserInfo.username || 'не указан'}`);
        console.log(`  - first_name: ${telegramUserInfo.first_name || 'не указан'}`);
        
        if (telegramUserInfo.id) {
            localStorage.setItem('game_user_id', telegramUserInfo.id.toString());
        }
        if (telegramUserInfo.username) {
            localStorage.setItem('game_username', telegramUserInfo.username);
        }
        if (telegramUserInfo.first_name) {
            localStorage.setItem('game_first_name', telegramUserInfo.first_name);
        }
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
    
    // ВАЖНО: initData ВСЕГДА только из БД, никаких приоритетов
    const savedToken = localStorage.getItem('game_access_token');
    let token = null;
    
    // ВАЖНО: initData ВСЕГДА только из БД
    if (savedToken) {
        console.log('Используется сохраненный токен');
        // Получаем актуальный токен из БД
        token = await getAccessToken(); // getAccessToken() получает из БД
        if (!token) {
            token = savedToken; // Fallback на localStorage
        }
    } else {
        // Если нет токена - пытаемся получить через initData из БД
        console.log('Токен не найден, пытаемся получить через initData из БД...');
        token = await loginWithInitData();
    }
    
    if (token) {
        console.log('✓ Авторизация успешна, токен получен');
        console.log('Токен длина:', token.length);
        console.log('Токен первые 20 символов:', token.substring(0, 20) + '...');
        
        // Сохраняем токен в localStorage
            localStorage.setItem('game_access_token', token);
        
        // Показываем интерфейс после успешной авторизации
        showMainInterface();
    } else {
        // Если авторизация не удалась, проверяем наличие сохраненного токена
        const savedToken = localStorage.getItem('game_access_token');
        
        if (savedToken) {
            console.log('Используется сохраненный токен для загрузки данных');
            // Показываем интерфейс, если есть токен
            showMainInterface();
        } else {
            console.error('❌ Авторизация не удалась и токен не найден');
            console.error('Показываем только форму ввода initData');
            // НЕ показываем интерфейс - пользователь должен ввести initData
            updateStatus(false);
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
        'Harknut': 'Харкнуть в баланду',
        'TossDroj': 'Подкинуть в парашу',
        'SendFriendRequest': 'Добавление в друзья',
        'Fight': 'Нападение на корешей'
    };
    const actionName = actionNames[finalInteractionType] || finalInteractionType;
    
    // Тексты для кнопок
    const buttonTexts = {
        'UpgradeBiceps': '💪 Начать прокачку',
        'Harknut': '🤮 Начать харкать',
        'TossDroj': '💩 Начать подкидывать',
        'SendFriendRequest': '👥 Начать добавление',
        'Fight': '👊 Начать нападение'
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
            
            // Если получили 403, пытаемся обновить токен через initData из БД
            if (initResponse.status === 403) {
                console.warn('Токен протух, пытаемся обновить через initData из БД...');
                const currentInitData = await getCurrentInitData();
                if (currentInitData && currentInitData.trim()) {
                    const newToken = await loginWithInitData();
                    if (newToken) {
                        localStorage.setItem('game_access_token', newToken);
                        token = newToken;
                        // Повторяем запрос с новым токеном
                        initResponse = await fetch(`${GAME_API_URL}/player/init`, {
                            method: 'POST',
                            headers: await getApiHeaders(),
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
            // ВАЖНО: Получаем актуальный токен в начале КАЖДОЙ итерации из localStorage
            // Это гарантирует, что после обновления токена в предыдущей итерации, мы используем новый токен
            // НЕ используем переменную token из внешней области видимости, всегда получаем заново
            const token = await getAccessToken();
            if (!token) {
                throw new Error('Токен не найден');
            }
            console.log(`[${toUserId}] Токен получен в начале итерации (первые 20 символов): ${token.substring(0, 20)}...`);
            console.log(`[${toUserId}] Токен из localStorage (первые 20 символов): ${localStorage.getItem('game_access_token')?.substring(0, 20)}...`);
            
            // ВАЖНО: Проверяем, что токен из getAccessToken() совпадает с токеном из localStorage
            const tokenFromStorage = localStorage.getItem('game_access_token');
            if (tokenFromStorage && tokenFromStorage !== token) {
                console.warn(`⚠️ Обнаружено расхождение токенов в начале итерации для ${toUserId}`);
                console.warn(`Токен из getAccessToken(): ${token.substring(0, 20)}...`);
                console.warn(`Токен из localStorage: ${tokenFromStorage.substring(0, 20)}...`);
                console.warn(`Используем токен из localStorage`);
                // Обновляем токен в localStorage, если есть расхождение
                if (tokenFromStorage.length > token.length || tokenFromStorage !== token) {
                    console.log(`✓ Используем токен из localStorage: ${tokenFromStorage.substring(0, 20)}...`);
                }
            }
            
            // ВАЖНО: Получаем актуальное значение селектора каждый раз ПРЯМО ИЗ DOM
            const selector = document.getElementById('interaction-type');
            const currentInteractionType = selector?.options[selector.selectedIndex]?.value || 
                                          selector?.value || 
                                          finalInteractionType || 
                                          interactionType;
            
            let response;
            
            // Для добавления в друзья используем другой endpoint
            if (currentInteractionType === 'SendFriendRequest') {
                console.log(`=== ОТПРАВКА ЗАПРОСА НА ДРУЖБУ ДЛЯ ${toUserId} ===`);
                
                response = await fetch(`${GAME_API_URL}/friendship/send-request?toUserId=${toUserId}`, {
                    method: 'POST',
                    headers: await getApiHeaders()
                });
                
                // Если получили 403, пытаемся обновить токен через initData из БД
                if (response.status === 403) {
                    console.warn(`⚠️ Токен протух для ${toUserId} (дружба), пытаемся обновить через initData из БД...`);
                    console.warn(`Старый токен (первые 20 символов): ${token ? token.substring(0, 20) : 'null'}...`);
                    
                    // ВАЖНО: loginWithInitData() всегда берет initData из БД
                    console.log('✓ Получаем initData из БД для обновления токена');
                    const newToken = await loginWithInitData();
                    if (newToken) {
                        // ВАЖНО: После login токен сохраняется в БД на сервере
                        // Получаем актуальный токен из БД и обновляем localStorage
                        const userId = localStorage.getItem('game_user_id');
                        if (userId) {
                            // Небольшая задержка, чтобы БД успела обновиться
                            await new Promise(resolve => setTimeout(resolve, 100));
                            
                            // Получаем токен из БД
                            const tokenFromDb = await getAccessToken(); // getAccessToken() получает из БД
                            if (tokenFromDb) {
                                token = tokenFromDb;
                                console.log(`✓ Токен обновлен из БД (первые 20 символов): ${token.substring(0, 20)}...`);
                            } else {
                                token = newToken;
                                console.log(`✓ Используем токен из login (первые 20 символов): ${token.substring(0, 20)}...`);
                            }
                        } else {
                            token = newToken;
                        }
                        
                        console.log(`✓ Токен обновлен, повторяю запрос для ${toUserId}`);
                        console.log(`=== ПОВТОРНАЯ ОТПРАВКА ЗАПРОСА НА ДРУЖБУ ДЛЯ ${toUserId} ===`);
                        response = await fetch(`${GAME_API_URL}/friendship/send-request?toUserId=${toUserId}`, {
                            method: 'POST',
                            headers: await getApiHeaders()
                        });
                        console.log(`Ответ после обновления токена: ${response.status}`);
                    } else {
                        console.error(`❌ Не удалось обновить токен для ${toUserId}`);
                    }
                }
                
                const result = await response.json();
                
                if (response.ok && result.success) {
                    successCount++;
                    results.unshift(`✅ ${toUserId}: Заявка отправлена`);
                } else {
                    const message = result.message || 'Ошибка';
                    if (message.includes('уже отправлена') || message.includes('повторно нельзя')) {
                        alreadyDoneCount++;
                        results.unshift(`⚠️ ${toUserId}: Заявка уже отправлена`);
                    } else if (message.includes('уже друзья') || message.includes('друзья')) {
                        alreadyDoneCount++;
                        results.unshift(`⚠️ ${toUserId}: Вы уже друзья`);
                    } else {
                        errorCount++;
                        results.unshift(`❌ ${toUserId}: ${message}`);
                    }
                }
            } else {
                // Для остальных типов взаимодействий используем стандартный endpoint
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
                
                response = await fetch(`${GAME_API_URL}/interaction/perform`, {
                    method: 'POST',
                    headers: await getApiHeaders(),
                    body: JSON.stringify(requestBody)
                });
                
                // Если получили 403, пытаемся обновить токен через initData из БД
                if (response.status === 403) {
                    console.warn(`⚠️ Токен протух для ${toUserId}, пытаемся обновить через initData из БД...`);
                    console.warn(`Старый токен (первые 20 символов): ${token ? token.substring(0, 20) : 'null'}...`);
                    
                    // ВАЖНО: loginWithInitData() всегда берет initData из БД
                    console.log('✓ Получаем initData из БД для обновления токена');
                    const newToken = await loginWithInitData();
                    if (newToken) {
                        // ВАЖНО: После login токен сохраняется в БД на сервере
                        // Получаем актуальный токен из БД и обновляем localStorage
                        const userId = localStorage.getItem('game_user_id');
                        if (userId) {
                            // Небольшая задержка, чтобы БД успела обновиться
                            await new Promise(resolve => setTimeout(resolve, 100));
                            
                            // Получаем токен из БД
                            const tokenFromDb = await getAccessToken(); // getAccessToken() получает из БД
                            if (tokenFromDb) {
                                token = tokenFromDb;
                                console.log(`✓ Токен обновлен из БД (первые 20 символов): ${token.substring(0, 20)}...`);
                            } else {
                                token = newToken;
                                console.log(`✓ Используем токен из login (первые 20 символов): ${token.substring(0, 20)}...`);
                            }
                        } else {
                            token = newToken;
                        }
                        
                        // Обновляем тип из селектора перед повторной отправкой
                        const selectorRetry = document.getElementById('interaction-type');
                        const currentInteractionTypeRetry = selectorRetry?.options[selectorRetry.selectedIndex]?.value || 
                                                           selectorRetry?.value || 
                                                           finalInteractionType || 
                                                           interactionType;
                        requestBody.type = currentInteractionTypeRetry;
                        console.log(`✓ Токен обновлен, повторяю запрос для ${toUserId}`);
                        console.log(`=== ПОВТОРНАЯ ОТПРАВКА ЗАПРОСА ДЛЯ ${toUserId} ===`);
                        console.log(`Тип взаимодействия при повторе: ${currentInteractionTypeRetry}`);
                        // ВАЖНО: getApiHeaders() всегда получает токен заново из БД через getAccessToken()
                        response = await fetch(`${GAME_API_URL}/interaction/perform`, {
                            method: 'POST',
                            headers: await getApiHeaders(),
                            body: JSON.stringify(requestBody)
                        });
                        console.log(`Ответ после обновления токена: ${response.status}`);
                    } else {
                        console.error(`❌ Не удалось обновить токен для ${toUserId}`);
                    }
                }
                
                const result = await response.json();
                
                if (result.success) {
                    successCount++;
                    // Для типа Fight показываем результат битвы (win/lose)
                    if (currentInteractionType === 'Fight' && result.result) {
                        if (result.result === 'win') {
                            results.unshift(`💪 ${toUserId}: Победил! ${result.message || ''}`);
                        } else if (result.result === 'lose') {
                            results.unshift(`💥 ${toUserId}: Проиграл! ${result.message || ''}`);
                        } else {
                    results.unshift(`✅ ${toUserId}: ${result.message || 'Успешно'}`);
                        }
                    } else {
                        // Для остальных типов взаимодействий
                        results.unshift(`✅ ${toUserId}: ${result.message || 'Успешно'}`);
                    }
                } else {
                    const message = result.message || result.detail || 'Ошибка';
                    if (message.includes('уже сегодня') || message.includes('already') || 
                        message.includes('уже') || message.includes('сегодня')) {
                        alreadyDoneCount++;
                        // Добавляем новую строку в начало массива
                        results.unshift(`⚠️ ${toUserId}: уже выполнено сегодня`);
                    } else {
                        errorCount++;
                        // Добавляем новую строку в начало массива
                        results.unshift(`❌ ${toUserId}: ${message}`);
                    }
                }
            }
            
            // Обновляем результаты в реальном времени
            resultsContent.innerHTML = `
                <p><strong>${actionName}</strong></p>
                <p><strong>Обработано:</strong> ${results.length} / ${userIds.length}</p>
                <div style="max-height: 200px; overflow-y: auto; margin-top: 10px; padding: 10px; background: var(--tg-theme-secondary-bg-color, #1e1e1e); border-radius: 5px; color: var(--tg-theme-text-color, #ffffff);">
                    ${results.map(r => `<div style="margin: 5px 0; font-size: 12px;">${r}</div>`).join('')}
                </div>
            `;
            
            // Небольшая задержка между запросами
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            errorCount++;
            // Добавляем новую строку в начало массива
            results.unshift(`❌ ${toUserId}: ${error.message}`);
            console.error(`Ошибка при ${actionName.toLowerCase()} для ${toUserId}:`, error);
        }
    }
    
    // Итоговые результаты
    resultsContent.innerHTML = `
        <div style="background: var(--tg-theme-secondary-bg-color, #1e1e1e); border-radius: 8px; padding: 15px; color: var(--tg-theme-text-color, #ffffff);">
            <h4 style="color: var(--tg-theme-text-color, #ffffff); margin: 0 0 10px 0;">📊 Итоги: ${actionName}</h4>
            <p style="color: var(--tg-theme-text-color, #ffffff); margin: 5px 0;">✅ Успешно: ${successCount}</p>
            <p style="color: var(--tg-theme-text-color, #ffffff); margin: 5px 0;">⚠️ Уже выполнено сегодня: ${alreadyDoneCount}</p>
            <p style="color: var(--tg-theme-text-color, #ffffff); margin: 5px 0;">❌ Ошибки: ${errorCount}</p>
            <p style="color: var(--tg-theme-text-color, #ffffff); margin: 5px 0;"><strong>Всего: ${userIds.length}</strong></p>
            <div style="max-height: 200px; overflow-y: auto; margin-top: 10px; padding: 10px; background: #0a0a0a !important; border-radius: 5px; color: #ffffff !important; border: 1px solid rgba(255, 255, 255, 0.1);">
                ${results.map(r => `<div style="margin: 5px 0; font-size: 12px; color: #ffffff !important;">${r}</div>`).join('')}
            </div>
        </div>
    `;
    
    showCustomModal(`Готово!\n\n${actionName}\n\nУспешно: ${successCount}\nУже выполнено: ${alreadyDoneCount}\nОшибки: ${errorCount}`);
    
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
            'Harknut': '🤮 Начать харкать',
            'TossDroj': '💩 Начать подкидывать',
            'SendFriendRequest': '👥 Начать добавление',
            'Fight': '👊 Начать нападение'
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
    
    console.log('updateStatus вызвана, connected:', connected);
    console.log('API_SERVER_URL:', API_SERVER_URL);
    console.log('GAME_API_URL:', GAME_API_URL);
    
    if (statusDot) {
        if (connected) {
            statusDot.classList.add('connected');
            statusDot.style.backgroundColor = '#4CAF50';
        } else {
            statusDot.classList.remove('connected');
            statusDot.style.backgroundColor = '#f44336';
        }
    }
    
    if (statusText) {
        if (connected) {
            statusText.textContent = 'Подключено';
        } else {
            // Показываем более детальную информацию о статусе
            const apiUrl = API_SERVER_URL || 'не указан';
            const shortUrl = typeof apiUrl === 'string' && apiUrl.length > 30 
                ? apiUrl.substring(0, 30) + '...' 
                : apiUrl;
            statusText.textContent = `Подключение... (API: ${shortUrl})`;
        }
    }
}

// Функция для расшифровки режима на русский (пацанский/блатной/авторитетный)
function decodeMode(mode) {
    if (!mode) return 'N/A';
    const modeMap = {
        'blotnoy': 'Блатной',
        'pacansky': 'Пацанский',
        'avtoritetny': 'Авторитетный',
        'odin': 'Один'
    };
    return modeMap[mode.toLowerCase()] || mode;
}

// Функция для расшифровки режима комбо
function decodeComboMode(comboMode) {
    if (!comboMode) return null;
    const comboModeMap = {
        'blotnoy': 'Блатной',
        'pacansky': 'Пацанский',
        'avtoritetny': 'Авторитетный'
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
        
        const apiUrl = API_SERVER_URL || GAME_API_URL;
        const response = await fetch(`${apiUrl}/boss/bootstrap`, {
            method: 'GET',
            headers: headers
        });
        
        // Если получили 401/403, пытаемся обновить токен через initData из БД
        if (response.status === 401 || response.status === 403) {
            console.warn('Токен протух, пытаемся обновить через initData из БД...');
            // ВАЖНО: loginWithInitData() всегда берет initData из БД
            const newToken = await loginWithInitData();
            if (newToken) {
                // Получаем актуальный токен из БД
                const userId = localStorage.getItem('game_user_id');
                if (userId) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    const tokenFromDb = await getAccessToken(); // getAccessToken() получает из БД
                    token = tokenFromDb || newToken;
                } else {
                    token = newToken;
                }
                headers['Authorization'] = `Bearer ${token}`;
                // Повторяем запрос с новым токеном
                const retryResponse = await fetch(`${apiUrl}/boss/bootstrap`, {
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
                    const modeDecoded = decodeMode(session.mode);
                    const comboModeDecoded = decodeComboMode(session.comboMode);
                    
                    let comboText = '';
                    if (comboModeDecoded) {
                        comboText = `<br>Режим комбо: ${comboModeDecoded}`;
                    }
                    
                    let timeInfo = '';
                    if (session.startedAt) {
                        const startTime = formatTimeToMoscow(session.startedAt);
                        timeInfo += `<br>Начало боя: <strong>${startTime}</strong>`;
                    }
                    if (session.endsAt) {
                        const endTime = formatTimeToMoscow(session.endsAt);
                        timeInfo += `<br>Окончание боя: <strong>${endTime}</strong>`;
                    }
                    
                    bossInfo.innerHTML = `
                        <div>
                            <strong>${session.title || 'Босс'}</strong><br>
                            HP: ${session.currentHp.toLocaleString()} / ${session.maxHp.toLocaleString()} (${hpPercent}%)<br>
                            Режим: ${modeDecoded}${comboText}${timeInfo}
                        </div>
                    `;
                    updateStatus(true);
                    return;
                }
            } else {
                throw new Error(`HTTP ${response.status}: Токен протух и не удалось обновить`);
            }
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        if (data.success && data.session) {
            const session = data.session;
            const hpPercent = ((session.currentHp / session.maxHp) * 100).toFixed(1);
            const modeDecoded = decodeMode(session.mode);
            const comboModeDecoded = decodeComboMode(session.comboMode);
            
            let comboText = '';
            if (comboModeDecoded) {
                comboText = `<br>Режим комбо: ${comboModeDecoded}`;
            }
            
            let timeInfo = '';
            if (session.startedAt) {
                const startTime = formatTimeToMoscow(session.startedAt);
                timeInfo += `<br>Начало боя: <strong>${startTime}</strong>`;
            }
            if (session.endsAt) {
                const endTime = formatTimeToMoscow(session.endsAt);
                timeInfo += `<br>Окончание боя: <strong>${endTime}</strong>`;
            }
            
            bossInfo.innerHTML = `
                <div>
                    <strong>${session.title || 'Босс'}</strong><br>
                    HP: ${session.currentHp.toLocaleString()} / ${session.maxHp.toLocaleString()} (${hpPercent}%)<br>
                    Режим: ${modeDecoded}${comboText}${timeInfo}
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

// Обновление информации о боссе
async function refreshBossInfo() {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '🔄 Обновление...';
    
    try {
        // Просто вызываем loadBossInfo(), которая уже делает запрос на /boss/bootstrap
        await loadBossInfo();
        await loadStats();
    } catch (error) {
        console.error('Ошибка обновления:', error);
        tg.showAlert(`❌ Ошибка: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = '🔄 Обновить';
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
        
        // Если получили 401/403, пытаемся обновить токен через initData из БД
        if ((prisonsResponse.status === 401 || prisonsResponse.status === 403) || 
            (playerResponse.status === 401 || playerResponse.status === 403)) {
            console.warn('Токен протух, пытаемся обновить через initData из БД...');
            // ВАЖНО: loginWithInitData() всегда берет initData из БД
            const newToken = await loginWithInitData();
            if (newToken) {
                // Получаем актуальный токен из БД
                const userId = localStorage.getItem('game_user_id');
                if (userId) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    const tokenFromDb = await getAccessToken(); // getAccessToken() получает из БД
                    token = tokenFromDb || newToken;
                } else {
                    token = newToken;
                }
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
        
        // Если получили 401/403, пытаемся обновить токен через initData из БД
        if ((prisonResponse.status === 401 || prisonResponse.status === 403) || 
            (checkpointsResponse.status === 401 || checkpointsResponse.status === 403)) {
            console.warn('Токен протух, пытаемся обновить через initData из БД...');
            // ВАЖНО: loginWithInitData() всегда берет initData из БД
            const newToken = await loginWithInitData();
            if (newToken) {
                // Получаем актуальный токен из БД
                const userId = localStorage.getItem('game_user_id');
                if (userId) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    const tokenFromDb = await getAccessToken(); // getAccessToken() получает из БД
                    token = tokenFromDb || newToken;
                } else {
                    token = newToken;
                }
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
            
            // Если получили 401/403, пытаемся обновить токен через initData из БД
            if (response.status === 401 || response.status === 403) {
                console.warn('Токен протух, пытаемся обновить через initData из БД...');
                // ВАЖНО: loginWithInitData() всегда берет initData из БД
                const newToken = await loginWithInitData();
                if (newToken) {
                    // Получаем актуальный токен из БД
                    const userId = localStorage.getItem('game_user_id');
                    if (userId) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        const tokenFromDb = await getAccessToken(); // getAccessToken() получает из БД
                        token = tokenFromDb || newToken;
                    } else {
                        token = newToken;
                    }
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
        
        // Если получили 401/403, пытаемся обновить токен через initData из БД
        if (response.status === 401 || response.status === 403) {
            console.warn('Токен протух, пытаемся обновить через initData из БД...');
            // ВАЖНО: loginWithInitData() всегда берет initData из БД
            const newToken = await loginWithInitData();
            if (newToken) {
                // Получаем актуальный токен из БД
                const userId = localStorage.getItem('game_user_id');
                if (userId) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    const tokenFromDb = await getAccessToken(); // getAccessToken() получает из БД
                    token = tokenFromDb || newToken;
                } else {
                    token = newToken;
                }
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

// Получение данных пользователя из Telegram (даже если initData недоступен)
function getTelegramUserInfo() {
    console.log('=== getTelegramUserInfo() вызвана ===');
    console.log('window.Telegram доступен:', !!window.Telegram);
    console.log('window.Telegram.WebApp доступен:', !!window.Telegram?.WebApp);
    console.log('tg доступен:', !!tg);
    
    // Обновляем tg на случай, если он еще не был инициализирован
    if (!tg && window.Telegram && window.Telegram.WebApp) {
        tg = window.Telegram.WebApp;
        console.log('✓ tg обновлен из window.Telegram.WebApp');
    }
    
    if (!tg) {
        console.error('❌ tg не доступен! Telegram WebApp не инициализирован');
        console.error('Проверьте, что Mini App открыт через Telegram бота');
        return null;
    }
    
    console.log('tg объект:', tg);
    console.log('tg.initDataUnsafe:', !!tg.initDataUnsafe);
    console.log('tg.initDataUnsafe:', tg.initDataUnsafe);
    console.log('tg.initDataUnsafe?.user:', !!tg.initDataUnsafe?.user);
    
    if (tg.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user;
        console.log('✓ Найден user объект из tg.initDataUnsafe.user');
        console.log('  - id:', user.id);
        console.log('  - username:', user.username, '(тип:', typeof user.username, ')');
        console.log('  - first_name:', user.first_name);
        console.log('  - last_name:', user.last_name);
        console.log('  - Полный объект user:', JSON.stringify(user, null, 2));
        
        // ВАЖНО: username может быть null или undefined, но user_id всегда есть
        // Используем user_id как основной идентификатор, username - опционально
        return {
            id: user.id,
            username: user.username || null, // Может быть null, если у пользователя нет username
            first_name: user.first_name || null,
            last_name: user.last_name || null
        };
    } else {
        console.warn('⚠️ tg.initDataUnsafe.user недоступен');
        console.warn('tg.initDataUnsafe:', tg.initDataUnsafe);
    }
    
    // ПРИОРИТЕТ 2: Из tg.initData (если доступен)
    console.log('tg.initData:', !!tg.initData);
    if (tg?.initData) {
        console.log('tg.initData (первые 200 символов):', tg.initData.substring(0, 200));
        console.log('Пытаемся извлечь username из tg.initData...');
        try {
            const params = new URLSearchParams(tg.initData);
            const userParam = params.get('user');
            if (userParam) {
                const userData = JSON.parse(decodeURIComponent(userParam));
                console.log('✓ Найден user из tg.initData');
                console.log('  - id:', userData.id);
                console.log('  - username:', userData.username);
                console.log('  - first_name:', userData.first_name);
                return {
                    id: userData.id,
                    username: userData.username || null,
                    first_name: userData.first_name || null,
                    last_name: userData.last_name || null
                };
            } else {
                console.warn('⚠️ user параметр не найден в tg.initData');
            }
        } catch (e) {
            console.warn('Не удалось извлечь данные пользователя из tg.initData:', e);
        }
    } else {
        console.warn('⚠️ tg.initData недоступен');
    }
    
    console.log('❌ User ID и username не найдены');
    return null;
}

// Получение initData ТОЛЬКО из БД
// ВАЖНО: initData ВСЕГДА только из БД, никаких приоритетов, никаких tg.initData
async function getCurrentInitData() {
    // ВАЖНО: initData ВСЕГДА только из БД
    const savedToken = localStorage.getItem('game_access_token');
    if (!savedToken) {
        console.warn('Токен не найден, невозможно получить initData из БД');
        return null;
    }
    
    try {
        const savedInitData = await getSavedInitDataFromServer();
        if (savedInitData && savedInitData.trim() && savedInitData.length >= 50) {
            console.log('✓ Используется initData из БД (единственный источник)');
            return savedInitData.trim();
        }
    } catch (e) {
        console.warn('Не удалось получить initData из БД:', e);
    }
    
    return null;
}

// Получение сохраненного initData с сервера из БД
// ПРИОРИТЕТ 1: По user_id из Telegram (основной способ, user_id всегда есть)
// ПРИОРИТЕТ 2: По username из Telegram (если есть)
// ПРИОРИТЕТ 3: По токену
// ВАЖНО: initData не сохраняется в localStorage, только получается из БД
async function getSavedInitDataFromServer() {
    try {
        const telegramUserInfo = getTelegramUserInfo();
        
        // ПРИОРИТЕТ 1: Пытаемся получить initData по user_id из Telegram (user_id всегда есть)
        if (telegramUserInfo && telegramUserInfo.id) {
            console.log(`✓ Пытаемся получить initData из БД по user_id: ${telegramUserInfo.id}`);
            const url = API_SERVER_URL 
                ? `${API_SERVER_URL}/auth/get-init-data-by-user-id`
                : `${GAME_API_URL}/auth/get-init-data-by-user-id`;
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ userId: telegramUserInfo.id })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.initData) {
                        console.log(`✓ Получен initData из БД по user_id: ${telegramUserInfo.id}`);
                        
                        // Сохраняем userId, username, first_name и токен, если они есть
                        if (data.userId) {
                            localStorage.setItem('game_user_id', data.userId.toString());
                        }
                        if (data.username) {
                            localStorage.setItem('game_username', data.username);
                        }
                        if (data.first_name) {
                            localStorage.setItem('game_first_name', data.first_name);
                        }
                        if (data.accessToken) {
                            localStorage.setItem('game_access_token', data.accessToken);
                        }
                        if (data.refreshToken) {
                            localStorage.setItem('game_refresh_token', data.refreshToken);
                        }
                        
                        // Заполняем поле ввода последним рабочим initData из БД
                        const manualInitDataInput = document.getElementById('manual-initdata');
                        if (manualInitDataInput) {
                            manualInitDataInput.value = data.initData;
                            console.log('✓ Поле manual-initdata заполнено initData из БД');
                        }
                        
                        return data.initData;
                    }
                } else {
                    console.warn(`Не удалось получить initData по user_id: ${response.status}`);
                }
            } catch (e) {
                console.warn('Ошибка при получении initData по user_id:', e);
            }
        }
        
        // ПРИОРИТЕТ 2: Пытаемся получить initData по username из Telegram (если есть)
        if (telegramUserInfo && telegramUserInfo.username) {
            console.log(`✓ Пытаемся получить initData из БД по username: ${telegramUserInfo.username}`);
            const url = API_SERVER_URL 
                ? `${API_SERVER_URL}/auth/get-init-data-by-username`
                : `${GAME_API_URL}/auth/get-init-data-by-username`;
            
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ username: telegramUserInfo.username })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.initData) {
                        console.log(`✓ Получен initData из БД по username: ${telegramUserInfo.username}`);
                        
                        // Сохраняем userId, username, first_name и токен, если они есть
                        if (data.userId) {
                            localStorage.setItem('game_user_id', data.userId.toString());
                        }
                        if (data.username) {
                            localStorage.setItem('game_username', data.username);
                        }
                        if (data.first_name) {
                            localStorage.setItem('game_first_name', data.first_name);
                        }
                        if (data.accessToken) {
                            localStorage.setItem('game_access_token', data.accessToken);
                        }
                        if (data.refreshToken) {
                            localStorage.setItem('game_refresh_token', data.refreshToken);
                        }
                        
                        // Заполняем поле ввода последним рабочим initData из БД
                        const manualInitDataInput = document.getElementById('manual-initdata');
                        if (manualInitDataInput) {
                            manualInitDataInput.value = data.initData;
                            console.log('✓ Поле manual-initdata заполнено initData из БД');
                        }
                        
                        return data.initData;
                    }
                } else {
                    console.warn(`Не удалось получить initData по username: ${response.status}`);
                }
            } catch (e) {
                console.warn('Ошибка при получении initData по username:', e);
            }
        }
        
        // ПРИОРИТЕТ 2: Пытаемся получить initData по токену
        const token = await getAccessToken();
        if (token) {
            console.log('✓ Пытаемся получить initData из БД по токену');
            const url = API_SERVER_URL 
                ? `${API_SERVER_URL}/auth/get-saved-init-data`
                : `${GAME_API_URL}/auth/get-saved-init-data`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.initData) {
                    console.log('✓ Получен initData из БД по токену');
                    
                    // Заполняем поле ввода последним рабочим initData из БД
                    const manualInitDataInput = document.getElementById('manual-initdata');
                    if (manualInitDataInput) {
                        manualInitDataInput.value = data.initData;
                        console.log('✓ Поле manual-initdata заполнено initData из БД');
                    }
                    
                    return data.initData;
                }
            } else {
                console.warn(`Не удалось получить initData по токену: ${response.status}`);
            }
        } else {
            console.warn('Токен не найден, невозможно получить initData из БД по токену');
        }
    } catch (e) {
        console.warn('Ошибка при получении initData из БД:', e);
    }
    
    return null;
}

// Получение токена доступа
// ВАЖНО: Сначала проверяем БД, потом localStorage
async function getAccessToken() {
    // ПРИОРИТЕТ 1: Получаем токен из БД (если есть user_id)
    const userId = localStorage.getItem('game_user_id');
    if (userId) {
        try {
            const url = API_SERVER_URL 
                ? `${API_SERVER_URL}/auth/get-access-token`
                : `${GAME_API_URL}/auth/get-access-token`;
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ userId: parseInt(userId) })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.accessToken) {
                    console.log('✓ Токен получен из БД');
                    // Обновляем localStorage токеном из БД
                    localStorage.setItem('game_access_token', data.accessToken);
                    if (data.refreshToken) {
                        localStorage.setItem('game_refresh_token', data.refreshToken);
                    }
                    return data.accessToken;
                }
            }
        } catch (e) {
            console.warn('Не удалось получить токен из БД:', e);
        }
    }
    
    // ПРИОРИТЕТ 2: Используем токен из localStorage
    const storedToken = localStorage.getItem('game_access_token');
    if (storedToken && storedToken.length > 10) {
        return storedToken;
    }
    
    // ПРИОРИТЕТ 3: Пытаемся получить через initData из БД
    const currentInitData = await getCurrentInitData();
    if (currentInitData) {
        console.log('Токен не найден, пытаемся получить через initData из БД...');
        try {
            const newToken = await loginWithInitData();
            if (newToken) {
                return newToken;
            }
        } catch (e) {
            console.warn('Не удалось получить токен через initData:', e);
        }
    }
    
    console.log('Токен не найден');
    return null;
}

// Получение токена синхронно (для случаев, когда async не подходит)
function getAccessTokenSync() {
    const storedToken = localStorage.getItem('game_access_token');
    return storedToken && storedToken.length > 10 ? storedToken : null;
}

// Создание заголовков для API запросов с токеном и initData
// ВАЖНО: Всегда получает актуальный токен из localStorage, не использует кэш
async function getApiHeaders(additionalHeaders = {}) {
    // ВАЖНО: Всегда получаем токен заново из localStorage, чтобы использовать актуальный токен
    // Это гарантирует, что после обновления токена все запросы используют новый токен
    const token = await getAccessToken();
    // ВАЖНО: initData всегда получаем из БД или tg.initData, не из localStorage
    const initData = await getCurrentInitData();
    
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
// ВАЖНО: initData ВСЕГДА только из БД, никаких приоритетов
async function loginWithInitData() {
    try {
        let initData = '';
        
        // ВАЖНО: initData ВСЕГДА только из БД
        console.log('✓ Получаем initData из БД (единственный источник)');
        const savedInitData = await getSavedInitDataFromServer();
        if (savedInitData && savedInitData.trim() && savedInitData.length >= 50) {
            initData = savedInitData;
            console.log('✓ Используется initData из БД');
            console.log(`initData из БД (первые 50 символов): ${initData.substring(0, 50)}...`);
        } else {
            console.error('❌ initData не найден в БД! Пожалуйста, введите initData в настройках.');
            throw new Error('initData не найден в БД. Пожалуйста, введите initData в настройках.');
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
        // Новый формат может начинаться с user=, старый - с query_id=
        const hasQueryId = initData.includes('query_id=');
        const hasUser = initData.includes('user=');
        const hasHash = initData.includes('hash=');
        
        if (!hasHash || (!hasQueryId && !hasUser)) {
            console.error('initData не содержит необходимые поля!');
            console.error('Ожидаемый формат: query_id=...&user=...&hash=... или user=...&hash=...');
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
            
            // Сохраняем userId, username и first_name из login
            if (data.userId) {
                localStorage.setItem('game_user_id', data.userId.toString());
                console.log('User ID сохранен из login:', data.userId);
            }
            if (data.username) {
                localStorage.setItem('game_username', data.username);
                console.log('Username сохранен из login:', data.username);
            }
            if (data.first_name) {
                localStorage.setItem('game_first_name', data.first_name);
                console.log('First name сохранен из login:', data.first_name);
            }
            
            // ВАЖНО: Токен и initData сохраняются в БД на сервере при авторизации
            // Получаем актуальный токен из БД и обновляем localStorage
            if (data.userId) {
                try {
                    // Небольшая задержка, чтобы БД успела обновиться
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Получаем токен из БД
                    const url = API_SERVER_URL 
                        ? `${API_SERVER_URL}/auth/get-access-token`
                        : `${GAME_API_URL}/auth/get-access-token`;
                    
                    const tokenResponse = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({ userId: data.userId })
                    });
                    
                    if (tokenResponse.ok) {
                        const tokenData = await tokenResponse.json();
                        if (tokenData.success && tokenData.accessToken) {
                            // Обновляем localStorage токеном из БД
                            localStorage.setItem('game_access_token', tokenData.accessToken);
                            if (tokenData.refreshToken) {
                                localStorage.setItem('game_refresh_token', tokenData.refreshToken);
                            }
                            console.log('✓ Токен обновлен из БД в localStorage');
                        } else {
                            // Если не получили из БД, используем токен из ответа
                            localStorage.setItem('game_access_token', data.accessToken);
                            localStorage.setItem('game_refresh_token', data.refreshToken || '');
                            console.log('✓ Токен сохранен в localStorage (из ответа login)');
                        }
                    } else {
                        // Если не получили из БД, используем токен из ответа
                        localStorage.setItem('game_access_token', data.accessToken);
                        localStorage.setItem('game_refresh_token', data.refreshToken || '');
                        console.log('✓ Токен сохранен в localStorage (из ответа login)');
                    }
                } catch (e) {
                    console.warn('Не удалось получить токен из БД, используем из ответа:', e);
                    localStorage.setItem('game_access_token', data.accessToken);
                    localStorage.setItem('game_refresh_token', data.refreshToken || '');
                }
            } else {
                localStorage.setItem('game_access_token', data.accessToken);
                localStorage.setItem('game_refresh_token', data.refreshToken || '');
            }
            
            // ВАЖНО: initData сохраняется в БД на сервере при авторизации
            if (initData) {
                // Обновляем поле ввода для отображения
                const manualInitDataInput = document.getElementById('manual-initdata');
                if (manualInitDataInput) {
                    manualInitDataInput.value = initData;
                    console.log('✓ Поле manual-initdata обновлено (initData сохранен в БД на сервере)');
                }
                console.log('✓ initData сохранен в БД на сервере');
            }
            
            // После успешной авторизации показываем интерфейс
            showMainInterface();
            
            // ВАЖНО: Возвращаем токен из localStorage (который обновлен из БД)
            const finalToken = localStorage.getItem('game_access_token') || data.accessToken;
            return finalToken;
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

// Глобальные переменные для автоматической атаки боссов
let bossAttackInterval = null;
let currentBossIndex = 0;
let selectedBosses = [];
let isAttacking = false;

// Загрузка списка боссов (глобальная функция)
window.loadBossList = async function loadBossList() {
    const container = document.getElementById('boss-list-container');
    if (!container) {
        console.error('boss-list-container не найден!');
        return;
    }
    
    container.innerHTML = '<p class="loading">Загрузка списка боссов...</p>';
    
    try {
        console.log('=== loadBossList: начало загрузки ===');
        console.log('GAME_API_URL:', GAME_API_URL);
        console.log('typeof GAME_API_URL:', typeof GAME_API_URL);
        
        if (!GAME_API_URL) {
            throw new Error('GAME_API_URL не определен! Проверьте настройки.');
        }
        
        let token = await getAccessToken();
        if (!token) {
            throw new Error('Токен не найден');
        }
        
        console.log('loadBossList: токен получен, длина:', token.length);
        
        // Определяем правильный URL для запросов (используем прокси если есть)
        const apiUrl = API_SERVER_URL || GAME_API_URL;
        console.log('Используемый API URL для запросов:', apiUrl);
        console.log('API_SERVER_URL:', API_SERVER_URL);
        console.log('GAME_API_URL:', GAME_API_URL);
        
        // categoryId обязателен для boss/list, поэтому сразу делаем два параллельных запроса
        console.log('Загружаем обе категории боссов параллельно...');
        
        let category1Data = null;
        let category2Data = null;
        let lastError = null;
        
        // Функция для выполнения запроса с повторной попыткой при 401/403
        async function fetchCategoryWithRetry(categoryId) {
            let attemptToken = token;
            
            try {
                const url = `${apiUrl}/boss/list?categoryId=${categoryId}`;
                console.log(`Запрос категории ${categoryId}: ${url}`);
                
                let response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${attemptToken}`
                    }
                });
                
                console.log(`Категория ${categoryId}: статус ответа`, response.status);
                
                // Обработка 401/403 - обновляем токен через initData из БД и повторяем
                if (response.status === 401 || response.status === 403) {
                    console.log(`401/403 для категории ${categoryId}, пытаемся обновить токен через initData из БД...`);
                    // ВАЖНО: loginWithInitData() всегда берет initData из БД
                    const newToken = await loginWithInitData();
                    if (newToken) {
                        // Получаем актуальный токен из БД
                        const userId = localStorage.getItem('game_user_id');
                        if (userId) {
                            await new Promise(resolve => setTimeout(resolve, 100));
                            const tokenFromDb = await getAccessToken(); // getAccessToken() получает из БД
                            attemptToken = tokenFromDb || newToken;
                        } else {
                            attemptToken = newToken;
                        }
                        // Повторяем запрос с новым токеном
                        response = await fetch(url, {
                                method: 'GET',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${attemptToken}`
                                }
                            });
                            console.log(`Категория ${categoryId} (повтор): статус ответа`, response.status);
                        }
                    }
                }
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ Категория ${categoryId} загружена успешно:`, data);
                    return data;
                } else {
                    const errorText = await response.text();
                    console.error(`❌ Ошибка загрузки категории ${categoryId}:`, response.status, errorText);
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
            } catch (err) {
                console.error(`❌ Ошибка при запросе категории ${categoryId}:`, err);
                throw err;
            }
        }
        
        // Загружаем обе категории параллельно
        try {
            const [data1, data2] = await Promise.all([
                fetchCategoryWithRetry(1).catch(e => {
                    console.error('Ошибка загрузки категории 1:', e);
                    lastError = e;
                    return null;
                }),
                fetchCategoryWithRetry(2).catch(e => {
                    console.error('Ошибка загрузки категории 2:', e);
                    lastError = e;
                    return null;
                })
            ]);
            
            category1Data = data1;
            category2Data = data2;
        } catch (error) {
            console.error('Ошибка при параллельной загрузке категорий:', error);
            lastError = error;
        }
        
        // Если получили данные, отображаем
        if (category1Data && category2Data) {
            renderBossList([category1Data, category2Data]);
        } else if (category1Data || category2Data) {
            // Если получили только одну категорию, отображаем что есть
            const categories = [];
            if (category1Data) categories.push(category1Data);
            if (category2Data) categories.push(category2Data);
            renderBossList(categories);
        } else {
            const errorMsg = lastError?.message || 'Не удалось загрузить список боссов';
            console.error('Не удалось загрузить данные ни с одного эндпоинта');
            console.error('Последняя ошибка:', lastError);
            
            const apiUrlDisplay = API_SERVER_URL || GAME_API_URL;
            container.innerHTML = `
                <p class="error">❌ Ошибка: ${errorMsg}</p>
                <p style="font-size: 12px; color: #666; margin-top: 10px;">
                    <strong>Что делать:</strong><br>
                    1. Откройте консоль браузера (F12) и посмотрите детали ошибок<br>
                    2. Проверьте, что API сервер настроен правильно<br>
                    3. Убедитесь, что эндпоинт /boss/list существует в API<br>
                    4. Попробуйте обновить список кнопкой ниже
                </p>
                <p style="font-size: 11px; color: #999; margin-top: 5px;">
                    Запрашиваемые эндпоинты:<br>
                    - ${apiUrlDisplay}/boss/list?categoryId=1<br>
                    - ${apiUrlDisplay}/boss/list?categoryId=2<br><br>
                    API Server URL: ${API_SERVER_URL || 'не установлен'}<br>
                    Game API URL: ${GAME_API_URL}
                </p>
            `;
            throw new Error(errorMsg);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки списка боссов:', error);
        console.error('Стек ошибки:', error.stack);
        
        // Если ошибка не была обработана выше, показываем общее сообщение
        if (container.innerHTML.includes('Загрузка списка боссов')) {
            container.innerHTML = `
                <p class="error">❌ Ошибка: ${error.message}</p>
                <p style="font-size: 12px; color: #666; margin-top: 10px;">
                    Проверьте консоль браузера (F12) для подробностей<br>
                    GAME_API_URL: ${GAME_API_URL}<br>
                    API_SERVER_URL: ${API_SERVER_URL || 'не установлен'}
                </p>
            `;
        }
    }
}

// Отображение списка боссов с чекбоксами
function renderBossList(categoriesData) {
    const container = document.getElementById('boss-list-container');
    let html = '<div class="boss-list">';
    
    // Сохраняем данные боссов для использования
    window.allBosses = [];
    
    categoriesData.forEach((categoryData, categoryIndex) => {
        if (!categoryData.success || !categoryData.bosses) return;
        
        const categoryId = categoryData.bosses[0]?.boss?.categoryId || categoryIndex + 1;
        const categoryName = categoryId === 1 ? 'Категория 1' : 'Категория 2';
        
        html += `<h3 style="margin-top: 15px; margin-bottom: 10px; color: #ffffff;">${categoryName}</h3>`;
        html += '<div class="boss-category" style="margin-bottom: 20px;">';
        
        categoryData.bosses.forEach((bossData) => {
            const boss = bossData.boss;
            const bossId = boss.id;
            const bossName = boss.title;
            const baseHp = boss.baseHp;
            
            // Сохраняем босса
            window.allBosses.push({
                id: bossId,
                name: bossName,
                categoryId: categoryId,
                baseHp: baseHp,
                battleModes: boss.battleModes || {}
            });
            
            html += `
                <div class="boss-item" style="display: flex; align-items: center; margin: 5px 0; padding: 8px; background: #2d2d2d; border-radius: 5px; color: #ffffff;">
                    <input type="checkbox" 
                           class="boss-checkbox" 
                           data-boss-id="${bossId}" 
                           data-boss-name="${bossName}"
                           onchange="updateBossOrder()"
                           style="margin-right: 10px; width: 20px; height: 20px;">
                    <label style="flex: 1; cursor: pointer; color: #ffffff;" onclick="document.querySelector('[data-boss-id=\\'${bossId}\\']').click()">
                        <strong style="color: #ffffff;">${bossName}</strong> <span style="color: #e0e0e0;">(ID: ${bossId}, HP: ${baseHp.toLocaleString()})</span>
                    </label>
                    <div class="boss-order-controls" style="margin-left: 10px;">
                        <button onclick="moveBossUp(${bossId})" style="padding: 2px 8px; font-size: 12px; background: #3d3d3d; color: #ffffff; border: 1px solid #555; border-radius: 3px; cursor: pointer;">↑</button>
                        <button onclick="moveBossDown(${bossId})" style="padding: 2px 8px; font-size: 12px; background: #3d3d3d; color: #ffffff; border: 1px solid #555; border-radius: 3px; cursor: pointer;">↓</button>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
    });
    
    html += '</div>';
    html += '<div id="boss-order-display" style="margin-top: 15px; padding: 10px; background: #2d2d2d; border-radius: 5px; display: none; color: #ffffff;">';
    html += '<strong style="color: #ffffff;">Порядок атаки:</strong>';
    html += '<div id="boss-order-list" style="margin-top: 5px; color: #e0e0e0;"></div>';
    html += '</div>';
    
    container.innerHTML = html;
    updateBossOrder();
}

// Обновление порядка атаки
window.updateBossOrder = function() {
    const checkboxes = document.querySelectorAll('.boss-checkbox:checked');
    selectedBosses = Array.from(checkboxes).map(cb => ({
        id: parseInt(cb.dataset.bossId),
        name: cb.dataset.bossName
    }));
    
    const orderDisplay = document.getElementById('boss-order-display');
    const orderList = document.getElementById('boss-order-list');
    
    if (orderDisplay && orderList) {
        if (selectedBosses.length > 0) {
            orderDisplay.style.display = 'block';
            orderList.innerHTML = selectedBosses.map((boss, index) => 
                `${index + 1}. ${boss.name} (ID: ${boss.id})`
            ).join('<br>');
        } else {
            orderDisplay.style.display = 'none';
        }
    }
}

// Перемещение босса вверх
window.moveBossUp = function(bossId) {
    const index = selectedBosses.findIndex(b => b.id === bossId);
    if (index > 0) {
        [selectedBosses[index], selectedBosses[index - 1]] = [selectedBosses[index - 1], selectedBosses[index]];
        updateBossOrderDisplay();
    }
}

// Перемещение босса вниз
window.moveBossDown = function(bossId) {
    const index = selectedBosses.findIndex(b => b.id === bossId);
    if (index >= 0 && index < selectedBosses.length - 1) {
        [selectedBosses[index], selectedBosses[index + 1]] = [selectedBosses[index + 1], selectedBosses[index]];
        updateBossOrderDisplay();
    }
}

// Обновление отображения порядка
function updateBossOrderDisplay() {
    const orderList = document.getElementById('boss-order-list');
    if (orderList && selectedBosses.length > 0) {
        orderList.innerHTML = selectedBosses.map((boss, index) => 
            `${index + 1}. ${boss.name} (ID: ${boss.id})`
        ).join('<br>');
    }
}

// Начало автоматической атаки
window.startBossAutoAttack = async function() {
    if (selectedBosses.length === 0) {
        tg.showAlert('Выберите хотя бы одного босса для атаки');
        return;
    }
    
    const mode = document.getElementById('attack-mode-select').value;
    
    // Проверяем доступность режима для выбранных боссов
    const invalidBosses = selectedBosses.filter(boss => {
        const bossData = window.allBosses.find(b => b.id === boss.id);
        return bossData && !bossData.battleModes[mode];
    });
    
    if (invalidBosses.length > 0) {
        tg.showAlert(`Режим "${mode}" недоступен для: ${invalidBosses.map(b => b.name).join(', ')}`);
        return;
    }
    
    const confirmed = await new Promise(resolve => {
        tg.showConfirm(`Начать атаку на ${selectedBosses.length} боссов в режиме "${mode}"?`, resolve);
    });
    
    if (!confirmed) return;
    
    isAttacking = true;
    currentBossIndex = 0;
    
    document.getElementById('start-boss-attack-btn').style.display = 'none';
    document.getElementById('stop-boss-attack-btn').style.display = 'block';
    document.getElementById('boss-attack-status').style.display = 'block';
    
    attackNextBoss(mode);
}

// Атака следующего босса
async function attackNextBoss(mode) {
    if (!isAttacking || currentBossIndex >= selectedBosses.length) {
        stopBossAutoAttack();
        return;
    }
    
    const boss = selectedBosses[currentBossIndex];
    updateAttackStatus(`Атака на ${boss.name} (${currentBossIndex + 1}/${selectedBosses.length})...`);
    
    try {
        let token = await getAccessToken();
        if (!token) {
            throw new Error('Токен не найден');
        }
        
        // Используем прокси если есть
        const apiUrl = API_SERVER_URL || GAME_API_URL;
        
        // Начинаем атаку
        let response = await fetch(`${apiUrl}/boss/start-attack`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                bossId: boss.id,
                mode: mode,
                comboMode: null
            })
        });
        
        // Обработка 401/403 - обновляем токен через initData из БД
        if (response.status === 401 || response.status === 403) {
            // ВАЖНО: loginWithInitData() всегда берет initData из БД
            const newToken = await loginWithInitData();
            if (newToken) {
                // Получаем актуальный токен из БД
                const userId = localStorage.getItem('game_user_id');
                if (userId) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    const tokenFromDb = await getAccessToken(); // getAccessToken() получает из БД
                    token = tokenFromDb || newToken;
                } else {
                    token = newToken;
                }
                response = await fetch(`${apiUrl}/boss/start-attack`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            bossId: boss.id,
                            mode: mode,
                            comboMode: null
                        })
                    });
                }
            }
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            if (data.isOver) {
                // Бой завершен
                updateAttackStatus(`✅ ${boss.name} побежден! Переход к следующему...`);
                currentBossIndex++;
                
                // Переходим к следующему боссу через небольшую задержку
                setTimeout(() => {
                    attackNextBoss(mode);
                }, 1000);
            } else if (data.sessionId) {
                // Бой продолжается, проверяем статус каждые 5 секунд
                updateAttackStatus(`⚔️ Бой с ${boss.name} продолжается...`);
                
                // Проверяем статус через 5 секунд
                bossAttackInterval = setTimeout(() => {
                    checkBossBattleStatus(boss.id, mode, data.sessionId);
                }, 5000);
            } else {
                // Неожиданный ответ
                updateAttackStatus(`⚠️ Неожиданный ответ от сервера для ${boss.name}`);
                currentBossIndex++;
                setTimeout(() => {
                    attackNextBoss(mode);
                }, 2000);
            }
        } else {
            throw new Error(data.error || 'Неизвестная ошибка');
        }
        
    } catch (error) {
        console.error('Ошибка атаки босса:', error);
        updateAttackStatus(`❌ Ошибка атаки ${boss.name}: ${error.message}`);
        
        // Переходим к следующему боссу при ошибке
        currentBossIndex++;
        setTimeout(() => {
            attackNextBoss(mode);
        }, 2000);
    }
}

// Проверка статуса боя
async function checkBossBattleStatus(bossId, mode, sessionId) {
    if (!isAttacking) return;
    
    try {
        let token = await getAccessToken();
        if (!token) {
            throw new Error('Токен не найден');
        }
        
        const apiUrl = API_SERVER_URL || GAME_API_URL;
        let response = await fetch(`${apiUrl}/boss/start-attack`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                bossId: bossId,
                mode: mode,
                comboMode: null
            })
        });
        
        // Обработка 401/403 - обновляем токен через initData из БД
        if (response.status === 401 || response.status === 403) {
            // ВАЖНО: loginWithInitData() всегда берет initData из БД
            const newToken = await loginWithInitData();
            if (newToken) {
                // Получаем актуальный токен из БД
                const userId = localStorage.getItem('game_user_id');
                if (userId) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    const tokenFromDb = await getAccessToken(); // getAccessToken() получает из БД
                    token = tokenFromDb || newToken;
                } else {
                    token = newToken;
                }
                response = await fetch(`${apiUrl}/boss/start-attack`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            bossId: bossId,
                            mode: mode,
                            comboMode: null
                        })
                    });
                }
            }
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.isOver) {
            // Бой завершен
            const boss = selectedBosses[currentBossIndex];
            updateAttackStatus(`✅ ${boss.name} побежден! Переход к следующему...`);
            currentBossIndex++;
            
            // Переходим к следующему боссу
            setTimeout(() => {
                attackNextBoss(mode);
            }, 1000);
        } else if (data.success && data.sessionId) {
            // Бой продолжается, проверяем снова через 5 секунд
            const boss = selectedBosses[currentBossIndex];
            updateAttackStatus(`⚔️ Бой с ${boss.name} продолжается...`);
            
            bossAttackInterval = setTimeout(() => {
                checkBossBattleStatus(bossId, mode, data.sessionId);
            }, 5000);
        } else {
            // Ошибка или неожиданный ответ
            const boss = selectedBosses[currentBossIndex];
            updateAttackStatus(`⚠️ Неожиданный ответ для ${boss.name}`);
            currentBossIndex++;
            setTimeout(() => {
                attackNextBoss(mode);
            }, 2000);
        }
        
    } catch (error) {
        console.error('Ошибка проверки статуса боя:', error);
        const boss = selectedBosses[currentBossIndex];
        updateAttackStatus(`❌ Ошибка проверки статуса ${boss.name}: ${error.message}`);
        
        // Переходим к следующему боссу
        currentBossIndex++;
        setTimeout(() => {
            attackNextBoss(mode);
        }, 2000);
    }
}

// Остановка автоматической атаки
window.stopBossAutoAttack = function() {
    isAttacking = false;
    
    if (bossAttackInterval) {
        clearTimeout(bossAttackInterval);
        bossAttackInterval = null;
    }
    
    document.getElementById('start-boss-attack-btn').style.display = 'block';
    document.getElementById('stop-boss-attack-btn').style.display = 'none';
    updateAttackStatus('Атака остановлена');
}

// Обновление статуса атаки
function updateAttackStatus(message) {
    const statusContent = document.getElementById('boss-attack-status-content');
    if (statusContent) {
        const timestamp = new Date().toLocaleTimeString();
        statusContent.innerHTML = `<p><strong>[${timestamp}]</strong> ${message}</p>`;
    }
}
