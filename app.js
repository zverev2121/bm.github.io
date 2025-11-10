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
    // Отключаем вертикальные свайпы для предотвращения сворачивания при скролле
    // Используем метод disableVerticalSwipes (Bot API 7.7+)
    if (tg.disableVerticalSwipes) {
        tg.disableVerticalSwipes();
    }
    // Также устанавливаем поле isVerticalSwipesEnabled напрямую (если доступно)
    if (tg.isVerticalSwipesEnabled !== undefined) {
        tg.isVerticalSwipesEnabled = false;
    }
    // Отключаем подтверждение закрытия, чтобы не блокировать скролл
    if (tg.enableClosingConfirmation) {
        tg.enableClosingConfirmation(false);
    }
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

// Функция переключения вкладок
window.switchTab = function switchTab(tabName) {
    // Скрываем все вкладки
    const allTabs = document.querySelectorAll('.tab-content');
    allTabs.forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Убираем активный класс со всех кнопок
    const allButtons = document.querySelectorAll('.tab-button');
    allButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показываем выбранную вкладку
    const selectedTab = document.getElementById(`tab-${tabName}`);
    if (selectedTab) {
        selectedTab.style.display = 'block';
        
        // Если переключились на вкладку "Атака боссов", убеждаемся, что список боссов загружен
        if (tabName === 'boss-attack') {
            // Убеждаемся, что секция выбора боссов видна
            const bossSelectSection = document.getElementById('boss-select-section');
            if (bossSelectSection) {
                bossSelectSection.style.display = 'block';
            }
            const bossListContainer = document.getElementById('boss-list-container');
            if (bossListContainer) {
                bossListContainer.style.display = 'block';
            }
            
            // Если список боссов еще не загружен, загружаем его
            if (!window.bossCategoriesData || Object.keys(window.bossCategoriesData).length === 0) {
                console.log('📋 Переключились на вкладку атаки боссов, загружаем список...');
                loadBossList();
            }
        }
    }
    
    // Добавляем активный класс к выбранной кнопке
    const selectedButton = document.getElementById(`tab-btn-${tabName}`);
    if (selectedButton) {
        selectedButton.classList.add('active');
    }
    
    // Прокручиваем вверх при переключении вкладок
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
async function loadSettings() {
    const apiUrl = localStorage.getItem('api_server_url') || '';
    // ВАЖНО: initData НЕ хранится в localStorage, только в БД
    // ВАЖНО: Поле ввода заполняется initData из БД по username (из URL параметра или Telegram WebApp API)
    // Если пользователь не найден в БД - поле остается пустым, пользователь должен ввести initData вручную
    let manualInitData = '';
    
    // ПРИОРИТЕТ 1: Ищем пользователя по username из URL (переданного через кнопку бота)
    const urlParams = new URLSearchParams(window.location.search);
    let urlUsername = urlParams.get('username');
    
    // Если username нет в URL, пытаемся получить из Telegram WebApp API
    // Это нужно для работы кнопки в профиле бота, которая не передает параметры в URL
    if (!urlUsername) {
        const telegramUserInfo = getTelegramUserInfo();
        if (telegramUserInfo && telegramUserInfo.username) {
            urlUsername = telegramUserInfo.username;
            console.log('✓ Username получен из Telegram WebApp API:', urlUsername);
            // Сохраняем данные пользователя из Telegram
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
    }
    
    if (urlUsername) {
        console.log('Поиск пользователя по username:', urlUsername);
        try {
            const userData = await getUserByUsernameFromServer(urlUsername);
            if (userData && userData.success && userData.initData) {
                manualInitData = userData.initData.trim();
                console.log('✓ Найден пользователь в БД, получен initData (длина:', manualInitData.length, ')');
                
                // ВАЖНО: Токен не сохраняем в localStorage, всегда получаем из БД
                // Сохраняем только userId, username, first_name для отображения
                if (userData.userId) {
                    localStorage.setItem('game_user_id', userData.userId.toString());
                }
                if (userData.username) {
                    localStorage.setItem('game_username', userData.username);
                }
                if (userData.first_name) {
                    localStorage.setItem('game_first_name', userData.first_name);
                }
            } else {
                console.log('⚠️ Пользователь не найден в БД, поле ввода останется пустым');
            }
        } catch (e) {
            console.warn('Ошибка при поиске пользователя по username:', e);
        }
    }
    
    // ПРИОРИТЕТ 2: Если не нашли по username, пытаемся получить initData из БД по userId
    if (!manualInitData) {
        const savedUserId = localStorage.getItem('game_user_id');
        if (savedUserId) {
            console.log('Получаем initData из БД по userId...');
            try {
                const savedInitData = await getSavedInitDataFromServer();
                if (savedInitData && savedInitData.trim() && savedInitData.length >= 50) {
                    manualInitData = savedInitData.trim();
                    console.log('✓ Получен initData из БД по userId (длина:', manualInitData.length, ')');
                }
            } catch (e) {
                console.warn('Не удалось получить initData из БД по userId:', e);
            }
        }
    }
    
    if (document.getElementById('api-server-url')) {
        document.getElementById('api-server-url').value = apiUrl;
    }
    if (document.getElementById('manual-initdata')) {
        // Заполняем поле initData из БД (если найден пользователь)
        // Если не найден - поле остается пустым, пользователь должен ввести вручную
        document.getElementById('manual-initdata').value = manualInitData;
        if (manualInitData) {
            console.log('✓ Поле ввода заполнено initData из БД (длина:', manualInitData.length, ')');
        } else {
            console.log('✓ Поле ввода пустое - пользователь должен ввести initData вручную');
        }
    }
    
    API_SERVER_URL = getApiServerUrl();
    GAME_API_URL = getGameApiUrl();
    
    updateSettingsDisplay();
}

async function saveSettings() {
    const apiUrl = document.getElementById('api-server-url').value.trim();
    // ВАЖНО: Берем initData напрямую из поля ввода
    // Поле ввода всегда заполняется актуальным initData из БД при загрузке
    const manualInitData = document.getElementById('manual-initdata').value.trim();
    
    console.log('Сохранение настроек...');
    console.log('InitData из поля ввода (длина):', manualInitData ? manualInitData.length : 0);
    
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
    // ВАЖНО: При каждом сохранении initData всегда перезаписывается в БД, даже если он не изменился
    if (manualInitData && manualInitData.trim() && manualInitData.length >= 50) {
        try {
            console.log('Выполнение login с введенным initData...');
            console.log('ВАЖНО: initData будет перезаписан в БД при успешном login');
            const loginUrl = API_SERVER_URL 
                ? `${API_SERVER_URL}/auth/login`
                : `${GAME_API_URL}/auth/login`;
            
            const response = await fetch(loginUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ initData: manualInitData.trim() })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.accessToken) {
                    // ВАЖНО: Токен сохраняется в БД на сервере при авторизации
                    // НЕ сохраняем токен в localStorage, всегда получаем из БД
                    if (data.userId) {
                        localStorage.setItem('game_user_id', data.userId.toString());
                    }
                    console.log('✅ Токен получен из initData');
                    console.log('✅ initData перезаписан в БД на сервере');
                    console.log('✅ Access token обновлен в БД');
                    
                    // ВАЖНО: После успешного сохранения обновляем поле ввода актуальным initData из БД
                    // Это гарантирует, что поле всегда содержит актуальный initData, который только что сохранили
                    try {
                        // Небольшая задержка, чтобы БД успела обновиться
                        await new Promise(resolve => setTimeout(resolve, 500));
                        
                        const savedInitData = await getSavedInitDataFromServer();
                        if (savedInitData && savedInitData.trim()) {
                            const manualInitDataInput = document.getElementById('manual-initdata');
                            if (manualInitDataInput) {
                                // ВАЖНО: Обновляем поле ввода новым initData из БД
                                // Это гарантирует, что старый initData не отобразится
                                manualInitDataInput.value = savedInitData.trim();
                                console.log('✓ Поле ввода обновлено новым initData из БД (длина:', savedInitData.trim().length, ')');
                                console.log('✓ Старый initData удален из поля ввода');
                            }
                        } else {
                            // Если не получили из БД, используем тот, который только что сохранили
                            const manualInitDataInput = document.getElementById('manual-initdata');
                            if (manualInitDataInput) {
                                manualInitDataInput.value = manualInitData.trim();
                                console.log('✓ Поле ввода обновлено сохраненным initData');
                            }
                        }
                    } catch (e) {
                        console.warn('Не удалось обновить поле ввода из БД, используем сохраненный:', e);
                        // В случае ошибки используем тот initData, который только что сохранили
                        const manualInitDataInput = document.getElementById('manual-initdata');
                        if (manualInitDataInput) {
                            manualInitDataInput.value = manualInitData.trim();
                        }
                    }
                    
                    tg.showAlert('✅ Настройки сохранены!\n\nТокен получен из initData.\n\ninitData перезаписан в БД.\n\nПоле ввода обновлено новым initData.');
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
    } else if (manualInitData && manualInitData.trim()) {
        console.warn('initData слишком короткий, пропускаем сохранение');
        tg.showAlert('⚠️ initData слишком короткий. Минимальная длина: 50 символов.');
    }
    
    // ВАЖНО: Удаляем все возможные старые значения initData из localStorage
    // initData НЕ должен храниться в localStorage, только в БД
    localStorage.removeItem('manual_init_data');
    localStorage.removeItem('init_data');
    localStorage.removeItem('initData');
    localStorage.removeItem('game_init_data');
    
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
    if (confirm('Вы уверены, что хотите сбросить все настройки?\n\nЭто очистит:\n- API Server URL\n- Access Token\n- Refresh Token\n- User ID\n- Все данные из localStorage\n\nПосле сброса нужно будет войти заново.')) {
        // Очищаем все данные из localStorage
        localStorage.removeItem('api_server_url');
        // ВАЖНО: Удаляем все возможные старые значения initData из localStorage
        localStorage.removeItem('manual_init_data');
        localStorage.removeItem('init_data');
        localStorage.removeItem('initData');
        localStorage.removeItem('game_init_data');
        // ВАЖНО: Токен больше не хранится в localStorage, только в БД
        localStorage.removeItem('game_user_id');
        localStorage.removeItem('game_username');
        localStorage.removeItem('game_first_name');
        
        // Очищаем поля ввода
        const apiUrlInput = document.getElementById('api-server-url');
        const initDataInput = document.getElementById('manual-initdata');
        if (apiUrlInput) apiUrlInput.value = '';
        if (initDataInput) initDataInput.value = '';
        
        // Обновляем переменные
        API_SERVER_URL = getApiServerUrl();
        GAME_API_URL = getGameApiUrl();
        
        console.log('✓ Все настройки очищены из localStorage');
        console.log('✓ Поля ввода очищены');
        
        tg.showAlert('✅ Настройки сброшены!\n\nВсе данные очищены из localStorage.\n\nПерезагрузите страницу для применения изменений.');
        updateSettingsDisplay();
    }
}

// Функция для полной очистки кэша (включая перезагрузку страницы)
function clearAllCache() {
    if (confirm('⚠️ ВНИМАНИЕ: Это полностью очистит все данные!\n\nОчистится:\n- Все настройки\n- Все токены\n- Все данные из localStorage\n\nПосле этого страница перезагрузится.\n\nПродолжить?')) {
        // Очищаем все данные из localStorage
        localStorage.clear();
        
        console.log('✓ Весь localStorage очищен');
        console.log('✓ Перезагружаем страницу...');
        
        // Перезагружаем страницу
        window.location.reload();
    }
}

async function updateSettingsDisplay() {
    const apiUrl = localStorage.getItem('api_server_url') || '';
    
    const currentApiUrl = document.getElementById('current-api-url');
    const currentTokenStatus = document.getElementById('current-token-status');
    
    if (currentApiUrl) {
        currentApiUrl.textContent = apiUrl || 'Не указан (прямое подключение)';
    }
    
    if (currentTokenStatus) {
        // Проверяем наличие токена в БД
        const token = await getAccessToken();
        if (token) {
            currentTokenStatus.textContent = 'Получен из БД';
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
    
    // ВАЖНО: При открытии формы настроек всегда обновляем поле ввода из БД
    // Это гарантирует, что отображается актуальный сохраненный initData, а не старый
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

// Инициализация
document.addEventListener('DOMContentLoaded', async () => {
    // Инициализация: показываем вкладку "Основное" по умолчанию
    switchTab('main');
    
    // Добавляем обработчики событий для кнопок таббара
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            const tabName = this.id.replace('tab-btn-', '');
            switchTab(tabName);
        });
    });
    
    updateStatus(false);
    
    // ВАЖНО: Очищаем все возможные старые значения initData из localStorage при загрузке
    // initData НЕ должен храниться в localStorage, только в БД
    localStorage.removeItem('manual_init_data');
    localStorage.removeItem('init_data');
    localStorage.removeItem('initData');
    localStorage.removeItem('game_init_data');
    console.log('✓ Очищены все возможные старые значения initData из localStorage');
    
    // Загружаем настройки (async, т.к. может получать initData с сервера)
    await loadSettings();
    updateSettingsDisplay();
    
    // Инициализируем селектор типа взаимодействия
    initInteractionTypeSelector();
    
    // Инициализируем обработчик загрузки файла комбо
    const comboFileInput = document.getElementById('combo-file-input');
    if (comboFileInput) {
        comboFileInput.addEventListener('change', handleComboFileUpload);
    }
    
    // Проверяем username из URL параметров и сохраняем его
    const urlParams = new URLSearchParams(window.location.search);
    const urlUsername = urlParams.get('username');
    if (urlUsername) {
        localStorage.setItem('game_username', urlUsername);
        console.log('✓ Username получен из URL параметров:', urlUsername);
    }
    
    // Проверяем, нужно ли показать настройки при первом запуске
    // НЕ показываем настройки, если пользователь идентифицирован через Telegram
    const telegramUserInfo = getTelegramUserInfo();
    const hasSettings = localStorage.getItem('api_server_url');
    const hasToken = await getAccessToken(); // Проверяем токен в БД
    
    // Показываем настройки только если:
    // 1. Нет настроек И
    // 2. Нет данных пользователя из Telegram И
    // 3. Нет сохраненного токена в БД
    if (!hasSettings && !telegramUserInfo && !hasToken) {
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
        // Примечание: boss-section теперь на вкладке "Атака боссов", управляется через switchTab
        document.getElementById('prison-section').style.display = 'none';
        document.getElementById('stats-section').style.display = 'none';
        document.getElementById('biceps-section').style.display = 'none';
        
        // НЕ прерываем загрузку - продолжаем авторизацию
        // Пользователь может настроить позже через кнопку "Настройки"
    } else if (telegramUserInfo) {
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
        
        // Обновляем отображение имени пользователя
        updateUserNameDisplay();
    } else {
        // Пытаемся обновить имя из localStorage, если есть
        updateUserNameDisplay();
    }
    
    // Обновляем URL API перед авторизацией
    API_SERVER_URL = getApiServerUrl();
    GAME_API_URL = getGameApiUrl();
    
    // loadSettings() уже выполнила поиск по username и заполнила поля
    // Получаем токен из БД
    const token = await getAccessToken();
    
    if (token) {
        console.log('✓ Токен найден в БД');
        console.log('Токен длина:', token.length);
        console.log('Токен первые 20 символов:', token.substring(0, 20) + '...');
        
        // Устанавливаем статус "Подключено" если токен найден (значит login был успешным ранее)
        updateStatus(true);
        
        // Показываем все секции
        // Примечание: boss-section теперь на вкладке "Атака боссов", управляется через switchTab
        document.getElementById('prison-section').style.display = 'block';
        document.getElementById('stats-section').style.display = 'block';
        document.getElementById('biceps-section').style.display = 'block';
        
        // Загружаем данные только после успешной авторизации
        console.log('Загрузка данных после авторизации...');
        await Promise.allSettled([
            loadBossInfo(),
            loadBossList(),
            loadPrisons(),  // Загружает тюрьмы и информацию об игроке параллельно
            loadMasters(),  // Загружает мастеров
            loadStats()
        ]).then(results => {
            results.forEach((result, index) => {
                const funcNames = ['loadBossInfo', 'loadBossList', 'loadPrisons', 'loadMasters', 'loadStats'];
                if (result.status === 'rejected') {
                    console.error(`Ошибка в ${funcNames[index]}:`, result.reason);
                }
            });
        });
        
        // Обновляем статистику каждые 30 секунд
        setInterval(loadStats, 30000);
        
        // Показываем секцию бицухи
        document.getElementById('biceps-section').style.display = 'block';
    } else {
        // Даже если авторизация не удалась, проверяем наличие данных пользователя из Telegram
        const telegramUserInfo = getTelegramUserInfo();
        
        if (telegramUserInfo) {
            console.log('Пользователь идентифицирован через Telegram, но токен не найден в БД');
            console.log('Попробуйте обновить страницу для получения initData');
            // НЕ устанавливаем статус "Подключено" здесь - статус должен устанавливаться только на основе успешности login
            // Если getAccessToken() вызвал loginWithInitData() и он обвалился, статус уже установлен в "Отключено"
            
            // Показываем все секции
            // Примечание: boss-section теперь на вкладке "Атака боссов", управляется через switchTab
            document.getElementById('prison-section').style.display = 'block';
            document.getElementById('master-section').style.display = 'block';
            document.getElementById('stats-section').style.display = 'block';
            document.getElementById('biceps-section').style.display = 'block';
            
            // Загружаем данные (могут не загрузиться без токена)
            console.log('Загрузка данных...');
            await Promise.allSettled([
                loadBossInfo(),
                loadBossList(),
                loadPrisons(),  // Загружает тюрьмы и информацию об игроке параллельно
                loadMasters(),  // Загружает мастеров
                loadStats()
            ]).then(results => {
                results.forEach((result, index) => {
                    const funcNames = ['loadBossInfo', 'loadBossList', 'loadPrisons', 'loadMasters', 'loadStats'];
                    if (result.status === 'rejected') {
                        console.error(`Ошибка в ${funcNames[index]}:`, result.reason);
                    }
                });
            });
            
            // Обновляем статистику каждые 30 секунд
            setInterval(loadStats, 30000);
        } else {
            console.error('❌ Авторизация не удалась и токен не найден');
            updateStatus(false);
            
            // Показываем секции, но с ошибкой
            // Примечание: boss-section теперь на вкладке "Атака боссов", управляется через switchTab
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
    
    // Устанавливаем флаг обработки
    isBicepsProcessing = true;
    
    // Блокируем кнопку и показываем кнопку остановки
    startBtn.disabled = true;
    startBtn.style.display = 'none';
    document.getElementById('biceps-stop-btn').style.display = 'block';
    btnText.textContent = '⏳ Выполняется...';
    
    // Получаем токен (с автоматическим обновлением при необходимости)
    let token = await getAccessToken();
    if (!token) {
        tg.showAlert('Токен не найден. Выполните авторизацию');
        // Восстанавливаем состояние кнопок
        isBicepsProcessing = false;
        startBtn.disabled = false;
        startBtn.style.display = 'block';
        document.getElementById('biceps-stop-btn').style.display = 'none';
        btnText.textContent = buttonTexts[interactionType] || '💪 Начать';
        return;
    }
    
    // Получаем свой User ID из localStorage или из API
    let fromUserId = localStorage.getItem('game_user_id');
    if (!fromUserId) {
        // Пытаемся получить из API /player/init
        try {
            console.log('Получение User ID из API...');
            // ВАЖНО: Используем getApiHeaders() для получения актуального токена из localStorage
            let initResponse = await fetch(`${GAME_API_URL}/player/init`, {
                method: 'POST',
                headers: await getApiHeaders(),
                body: JSON.stringify({})
            });
            
            // Если получили 403, пытаемся обновить токен через initData из БД
            if (initResponse.status === 403) {
                console.warn('Токен протух, пытаемся обновить через initData из БД...');
                const currentInitData = await getCurrentInitData();
                if (currentInitData && currentInitData.trim()) {
                    const newToken = await loginWithInitData();
                    if (newToken) {
                        // ВАЖНО: loginWithInitData() уже сохранил токен в localStorage
                        // Используем getApiHeaders() для получения актуального токена
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
        // Проверяем флаг остановки
        if (!isBicepsProcessing) {
            console.log('Обработка остановлена пользователем');
            break;
        }
        
        try {
            // ВАЖНО: Получаем актуальный токен в начале КАЖДОЙ итерации из localStorage
            // Это гарантирует, что после обновления токена в предыдущей итерации, мы используем новый токен
            // НЕ используем переменную token из внешней области видимости, всегда получаем заново
            const token = await getAccessToken();
            if (!token) {
                throw new Error('Токен не найден');
            }
            console.log(`[${toUserId}] Токен получен в начале итерации из БД (первые 20 символов): ${token.substring(0, 20)}...`);
            
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
                    console.warn(`⚠️ Токен протух для ${toUserId} (дружба), пытаемся обновить...`);
                    console.warn(`Старый токен (первые 20 символов): ${token ? token.substring(0, 20) : 'null'}...`);
                    
                    // ВАЖНО: Сначала проверяем актуальный токен из БД
                    let newToken = null;
                    try {
                        const actualToken = await getSavedTokenFromServer();
                        if (actualToken && actualToken !== token) {
                            console.log('✓ Обнаружен новый токен в БД, используем его');
                            newToken = actualToken;
                        }
                    } catch (e) {
                        console.warn('Не удалось получить токен из БД, пробуем через login:', e);
                    }
                    
                    // Если не получили из БД, пытаемся через login
                    if (!newToken) {
                        const currentInitData = await getCurrentInitData();
                        if (currentInitData && currentInitData.trim()) {
                            console.log('✓ Найден initData для обновления токена через login');
                            newToken = await loginWithInitData();
                        }
                    }
                    
                    if (newToken) {
                        // ВАЖНО: Токен уже сохранен в БД на сервере при login
                        // Получаем актуальный токен из БД перед повторным запросом
                        const refreshedToken = await getAccessToken();
                        if (refreshedToken) {
                            console.log(`✓ Токен обновлен в БД`);
                            console.log(`Новый токен из БД (первые 20 символов): ${refreshedToken.substring(0, 20)}...`);
                        }
                        
                        console.log(`✓ Токен обновлен, повторяю запрос для ${toUserId}`);
                        console.log(`=== ПОВТОРНАЯ ОТПРАВКА ЗАПРОСА НА ДРУЖБУ ДЛЯ ${toUserId} ===`);
                        console.log(`Используемый токен в заголовке (первые 20 символов): ${token.substring(0, 20)}...`);
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
                    
                    // ВАЖНО: Используем getCurrentInitData() - всегда получает из БД
                    const currentInitData = await getCurrentInitData();
                    if (currentInitData && currentInitData.trim()) {
                        console.log('✓ Найден initData для обновления токена');
                        const newToken = await loginWithInitData();
                        if (newToken) {
                            // ВАЖНО: Токен уже сохранен в БД на сервере при login
                            // Получаем актуальный токен из БД перед повторным запросом
                            const refreshedToken = await getAccessToken();
                            if (refreshedToken) {
                                console.log(`✓ Токен обновлен в БД`);
                                console.log(`Новый токен из БД (первые 20 символов): ${refreshedToken.substring(0, 20)}...`);
                            }
                            
                            // Повторяем запрос с новым токеном (используем тот же requestBody с правильным типом)
                            // ВАЖНО: Обновляем тип из селектора перед повторной отправкой
                            const selectorRetry = document.getElementById('interaction-type');
                            const currentInteractionTypeRetry = selectorRetry?.options[selectorRetry.selectedIndex]?.value || 
                                                               selectorRetry?.value || 
                                                               finalInteractionType || 
                                                               interactionType;
                            requestBody.type = currentInteractionTypeRetry;
                            console.log(`✓ Токен обновлен, повторяю запрос для ${toUserId}`);
                            console.log(`=== ПОВТОРНАЯ ОТПРАВКА ЗАПРОСА ДЛЯ ${toUserId} ===`);
                            console.log(`Тип взаимодействия при повторе: ${currentInteractionTypeRetry}`);
                            console.log(`Обновленный requestBody:`, JSON.stringify(requestBody, null, 2));
                            // ВАЖНО: getApiHeaders() всегда получает токен заново из БД
                            response = await fetch(`${GAME_API_URL}/interaction/perform`, {
                                method: 'POST',
                                headers: await getApiHeaders(),
                                body: JSON.stringify(requestBody)
                            });
                            console.log(`Ответ после обновления токена: ${response.status}`);
                        } else {
                            console.error(`❌ Не удалось обновить токен для ${toUserId}`);
                        }
                    } else {
                        console.error(`❌ initData не найден для обновления токена`);
                        console.error(`getCurrentInitData() вернул:`, currentInitData);
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
            const statusText = !isBicepsProcessing ? '⏹️ Остановлено' : '⏳ Выполняется...';
            resultsContent.innerHTML = `
                <p><strong>${actionName}</strong> ${statusText}</p>
                <p><strong>Обработано:</strong> ${results.length} / ${userIds.length}</p>
                <div style="max-height: 200px; overflow-y: auto; margin-top: 10px; padding: 10px; background: var(--tg-theme-secondary-bg-color, #1e1e1e); border-radius: 5px; color: var(--tg-theme-text-color, #ffffff);">
                    ${results.map(r => `<div style="margin: 5px 0; font-size: 12px;">${r}</div>`).join('')}
                </div>
            `;
            
            // Проверяем флаг остановки перед задержкой
            if (!isBicepsProcessing) {
                break;
            }
            
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
    
    // Показываем итоговое сообщение только если не была остановка
    if (isBicepsProcessing) {
        showCustomModal(`Готово!\n\n${actionName}\n\nУспешно: ${successCount}\nУже выполнено: ${alreadyDoneCount}\nОшибки: ${errorCount}`);
    } else {
        showCustomModal(`Остановлено!\n\n${actionName}\n\nОбработано: ${results.length} / ${userIds.length}\nУспешно: ${successCount}\nУже выполнено: ${alreadyDoneCount}\nОшибки: ${errorCount}`);
    }
    
    // Сбрасываем флаг и восстанавливаем кнопки
    isBicepsProcessing = false;
    startBtn.disabled = false;
    startBtn.style.display = 'block';
    document.getElementById('biceps-stop-btn').style.display = 'none';
    btnText.textContent = buttonTexts[interactionType] || '💪 Начать';
}

// Функция остановки обработки взаимодействий с игроками
window.stopBicepsProcessing = function() {
    isBicepsProcessing = false;
    
    const startBtn = document.getElementById('biceps-start-btn');
    const btnText = document.getElementById('biceps-btn-text');
    const stopBtn = document.getElementById('biceps-stop-btn');
    const interactionTypeSelect = document.getElementById('interaction-type');
    const resultsContent = document.getElementById('biceps-results-content');
    
    // Обновляем статус в результатах, если они отображаются
    if (resultsContent) {
        const currentContent = resultsContent.innerHTML;
        // Заменяем статус на "Остановлено"
        const updatedContent = currentContent.replace('⏳ Выполняется...', '⏹️ Остановлено');
        if (updatedContent !== currentContent) {
            resultsContent.innerHTML = updatedContent;
        }
    }
    
    // Восстанавливаем кнопки
    if (startBtn) {
        startBtn.disabled = false;
        startBtn.style.display = 'block';
    }
    if (stopBtn) {
        stopBtn.style.display = 'none';
    }
    
    // Восстанавливаем текст кнопки
    if (btnText && interactionTypeSelect) {
        const buttonTexts = {
            'UpgradeBiceps': '💪 Начать прокачку',
            'Harknut': '🤮 Начать харкать',
            'TossDroj': '💩 Начать подкидывать',
            'SendFriendRequest': '👥 Начать добавление',
            'Fight': '👊 Начать нападение'
        };
        const interactionType = interactionTypeSelect.value;
        btnText.textContent = buttonTexts[interactionType] || '💪 Начать';
    }
    
    console.log('Обработка взаимодействий остановлена пользователем');
};

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
    
    if (connected) {
        statusDot.classList.add('connected');
        statusText.textContent = 'Подключено';
    } else {
        statusDot.classList.remove('connected');
        statusText.textContent = 'Отключено';
    }
}

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
        
        const apiUrl = API_SERVER_URL || GAME_API_URL;
        // ВАЖНО: Используем getApiHeaders() для получения актуального токена из localStorage
        let response = await fetch(`${apiUrl}/boss/bootstrap`, {
            method: 'GET',
            headers: await getApiHeaders()
        });
        
        // Если получили 401/403, пытаемся обновить токен через initData из БД
        if (response.status === 401 || response.status === 403) {
            console.warn('Токен протух, пытаемся обновить через initData из БД...');
            const currentInitData = await getCurrentInitData();
            if (currentInitData && currentInitData.trim()) {
                const newToken = await loginWithInitData();
                if (newToken) {
                    // ВАЖНО: loginWithInitData() уже сохранил токен в localStorage
                    // Используем getApiHeaders() для получения актуального токена
                    // Повторяем запрос с новым токеном
                    const retryResponse = await fetch(`${apiUrl}/boss/bootstrap`, {
                        method: 'GET',
                        headers: await getApiHeaders()
                    });
                    if (!retryResponse.ok) {
                        throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
                    }
                    // Продолжаем с retryResponse
                    const data = await retryResponse.json();
                    
                    // Обновляем ключи из ответа bootstrap
                    // Ключи находятся в playerStats.keys
                    let keysData = null;
                    if (data.success) {
                        if (data.playerStats && data.playerStats.keys) {
                            keysData = data.playerStats.keys;
                        } else if (data.keys) {
                            keysData = data.keys;
                        }
                    }
                    
                    if (keysData) {
                        const oldKeys = { ...bossKeys };
                        bossKeys = {};
                        for (const [bossIdStr, count] of Object.entries(keysData)) {
                            const bossId = parseInt(bossIdStr);
                            const keyCount = parseInt(count) || 0;
                            bossKeys[bossId] = keyCount;
                            if (oldKeys[bossId] !== keyCount) {
                                console.log(`🔑 [loadBossInfo retry] Босс ${bossId}: ${oldKeys[bossId] || 0} → ${keyCount} ключей`);
                            }
                        }
                        console.log('✅ [loadBossInfo retry] Ключи обновлены:', bossKeys);
                        
                        // Обновляем карточки, если они уже отрисованы
                        const existingCards = document.querySelectorAll('.boss-card');
                        if (existingCards.length > 0) {
                            updateBossCards();
                        }
                    }
                    
                    // Проверяем, есть ли награда для сбора
                    if (data.success && data.hasReward === true) {
                        try {
                            const rewardData = await collectBossRewards();
                            // Форматируем сообщение о награде
                            const rewardMessageHtml = formatRewardMessage(rewardData, 'html');
                            const rewardMessageText = formatRewardMessage(rewardData, 'text');
                            
                            // Показываем сообщение о собранной награде
                            if (bossInfo) {
                                bossInfo.innerHTML = `<p style="color: #28a745; font-weight: bold;">${rewardMessageHtml}</p>`;
                            }
                            
                            // Показываем модальное окно с наградой
                            showCustomModal(rewardMessageText);
                        } catch (error) {
                            console.error('Ошибка сбора награды:', error);
                        }
                    }
                    
                    if (data.success && data.session) {
                        const session = data.session;
                        const hpPercent = ((session.currentHp / session.maxHp) * 100).toFixed(1);
                        const modeDecoded = decodeMode(session.mode);
                        const modeColor = session.mode ? getModeColor(session.mode) : '#888';
                        const modeText = modeDecoded ? `<span style="color: ${modeColor}; font-weight: 600;">${modeDecoded}</span>` : modeDecoded;
                        
                        // Используем selectedComboType, если есть, иначе comboMode
                        const comboModeKey = session.selectedComboType || session.comboMode;
                        const comboModeDecoded = comboModeKey ? decodeComboMode(comboModeKey) : null;
                        
                        let comboText = '';
                        if (comboModeDecoded && comboModeKey) {
                            const comboColor = getComboModeColor(comboModeKey);
                            comboText = `<br>Комбо: <span style="color: ${comboColor}; font-weight: 600;">${comboModeDecoded}</span>`;
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
                        
                        // Получаем иконку босса напрямую из session, без ожидания загрузки всех боссов
                        let bossImageHtml = '';
                        const bossId = session.bossId || session.id || null;
                        const imageUrl = session.imageUrl || session.image || null;
                        
                        if (bossId || imageUrl) {
                            // Используем imageUrl из session, если есть, иначе используем локальный путь по ID
                            const imgSrc = imageUrl || (bossId ? `images/${bossId}.png` : '');
                            const fallbackSrc = imageUrl || '';
                            const localImagePath = bossId ? `images/${bossId}.png` : '';
                            
                            bossImageHtml = `
                                <div class="boss-image" style="width: 100px; height: 100px; min-width: 100px; max-width: 100px; min-height: 100px; max-height: 100px; box-sizing: border-box; background: #1a1a1a; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px; overflow: hidden; flex-shrink: 0;">
                                    <img src="${imgSrc}" 
                                         alt="${session.title || 'Босс'}" 
                                         data-fallback="${fallbackSrc}"
                                         data-local="${localImagePath}"
                                         style="max-width: 100%; max-height: 100%; object-fit: contain;"
                                         onerror="const img = this; if(img.dataset.fallback && img.dataset.fallback !== '' && img.src !== img.dataset.fallback) { img.src = img.dataset.fallback; } else if(img.dataset.local && img.dataset.local !== '' && img.src !== img.dataset.local) { img.src = img.dataset.local; } else { img.style.display='none'; if(img.nextElementSibling) img.nextElementSibling.style.display='flex'; }"
                                         onload="this.style.display='block'; if(this.nextElementSibling) this.nextElementSibling.style.display='none';">
                                    <span style="font-size: 40px; display: none;">👹</span>
                                </div>
                            `;
                        } else if (session.title) {
                            // Если нет ID или imageUrl, пытаемся найти в window.allBosses (fallback)
                            if (window.allBosses && window.allBosses.length > 0) {
                                const currentBoss = window.allBosses.find(b => b.name === session.title);
                                if (currentBoss) {
                                    bossImageHtml = `
                                        <div class="boss-image" style="width: 100px; height: 100px; min-width: 100px; max-width: 100px; min-height: 100px; max-height: 100px; box-sizing: border-box; background: #1a1a1a; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px; overflow: hidden; flex-shrink: 0;">
                                            <img src="${getBossImageUrl(currentBoss.id, currentBoss)}" 
                                                 alt="${session.title}" 
                                                 data-fallback="${getBossImageUrlFallback(currentBoss.id, currentBoss)}"
                                                 style="max-width: 100%; max-height: 100%; object-fit: contain;"
                                                 onerror="if(this.dataset.fallback && this.dataset.fallback !== '' && this.src !== this.dataset.fallback) { this.src = this.dataset.fallback; } else { this.style.display='none'; this.nextElementSibling.style.display='flex'; }"
                                                 onload="this.style.display='block'; if(this.nextElementSibling) this.nextElementSibling.style.display='none';">
                                            <span style="font-size: 40px; display: none;">👹</span>
                                        </div>
                                    `;
                                }
                            }
                        }
                        
                        const rewardMessage = data.hasReward === true ? '<p style="color: #28a745; font-weight: bold;">💰 Награда с босса собрана!</p>' : '';
                        bossInfo.innerHTML = `
                            ${rewardMessage}
                            <div style="display: flex; align-items: flex-start; gap: 12px;">
                                ${bossImageHtml}
                                <div style="flex: 1;">
                                    <strong>${session.title || 'Босс'}</strong><br>
                                    HP: ${session.currentHp.toLocaleString()} / ${session.maxHp.toLocaleString()} (${hpPercent}%)<br>
                                    Режим: ${modeText}${comboText}${timeInfo}
                                </div>
                            </div>
                        `;
                        updateStatus(true);
                        
                        // Убеждаемся, что секция выбора боссов всегда видна, даже когда есть активный бой
                        const bossSelectSection = document.getElementById('boss-select-section');
                        if (bossSelectSection) {
                            bossSelectSection.style.display = 'block';
                        }
                        const bossListContainer = document.getElementById('boss-list-container');
                        if (bossListContainer) {
                            bossListContainer.style.display = 'block';
                        }
                        
                        // Если список боссов еще не загружен, загружаем его
                        if (!window.bossCategoriesData || Object.keys(window.bossCategoriesData).length === 0) {
                            console.log('📋 Список боссов не загружен, загружаем...');
                            loadBossList();
                        }
                        
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
        
        // Обновляем ключи из ответа bootstrap
        // Ключи находятся в playerStats.keys
        let keysData = null;
        if (data.success) {
            if (data.playerStats && data.playerStats.keys) {
                keysData = data.playerStats.keys;
            } else if (data.keys) {
                keysData = data.keys;
            }
        }
        
        if (keysData) {
            const oldKeys = { ...bossKeys };
            bossKeys = {};
            for (const [bossIdStr, count] of Object.entries(keysData)) {
                const bossId = parseInt(bossIdStr);
                const keyCount = parseInt(count) || 0;
                bossKeys[bossId] = keyCount;
                if (oldKeys[bossId] !== keyCount) {
                    console.log(`🔑 [loadBossInfo] Босс ${bossId}: ${oldKeys[bossId] || 0} → ${keyCount} ключей`);
                }
            }
            console.log('✅ [loadBossInfo] Ключи обновлены:', bossKeys);
            
            // Обновляем карточки, если они уже отрисованы
            const existingCards = document.querySelectorAll('.boss-card');
            if (existingCards.length > 0) {
                updateBossCards();
            }
        }
        
        // Проверяем, есть ли награда для сбора
        let rewardMessageHtml = '';
        if (data.success && data.hasReward === true) {
            try {
                const rewardData = await collectBossRewards();
                // Форматируем сообщение о награде
                const rewardMessageHtmlFormatted = formatRewardMessage(rewardData, 'html');
                const rewardMessageText = formatRewardMessage(rewardData, 'text');
                rewardMessageHtml = `<p style="color: #28a745; font-weight: bold;">${rewardMessageHtmlFormatted}</p>`;
                
                // Показываем модальное окно с наградой
                showCustomModal(rewardMessageText);
            } catch (error) {
                console.error('Ошибка сбора награды:', error);
                rewardMessageHtml = `<p style="color: #dc3545;">⚠️ Ошибка сбора награды: ${error.message}</p>`;
            }
        }
        
        if (data.success && data.session) {
            const session = data.session;
            const hpPercent = ((session.currentHp / session.maxHp) * 100).toFixed(1);
            const modeDecoded = decodeMode(session.mode);
            const modeColor = session.mode ? getModeColor(session.mode) : '#888';
            const modeText = modeDecoded ? `<span style="color: ${modeColor}; font-weight: 600;">${modeDecoded}</span>` : modeDecoded;
            
            // Используем selectedComboType, если есть, иначе comboMode
            const comboModeKey = session.selectedComboType || session.comboMode;
            const comboModeDecoded = comboModeKey ? decodeComboMode(comboModeKey) : null;
            
            let comboText = '';
            if (comboModeDecoded && comboModeKey) {
                const comboColor = getComboModeColor(comboModeKey);
                comboText = `<br>Комбо: <span style="color: ${comboColor}; font-weight: 600;">${comboModeDecoded}</span>`;
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
            
            // Получаем иконку босса напрямую из session, без ожидания загрузки всех боссов
            let bossImageHtml = '';
            const bossId = session.bossId || session.id || null;
            const imageUrl = session.imageUrl || session.image || null;
            
            if (bossId || imageUrl) {
                // Используем imageUrl из session, если есть, иначе используем локальный путь по ID
                const imgSrc = imageUrl || (bossId ? `images/${bossId}.png` : '');
                const fallbackSrc = imageUrl || '';
                const localImagePath = bossId ? `images/${bossId}.png` : '';
                
                bossImageHtml = `
                    <div class="boss-image" style="width: 100px; height: 100px; min-width: 100px; max-width: 100px; min-height: 100px; max-height: 100px; box-sizing: border-box; background: #1a1a1a; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px; overflow: hidden; flex-shrink: 0;">
                        <img src="${imgSrc}" 
                             alt="${session.title || 'Босс'}" 
                             data-fallback="${fallbackSrc}"
                             data-local="${localImagePath}"
                             style="max-width: 100%; max-height: 100%; object-fit: contain;"
                             onerror="const img = this; if(img.dataset.fallback && img.dataset.fallback !== '' && img.src !== img.dataset.fallback) { img.src = img.dataset.fallback; } else if(img.dataset.local && img.dataset.local !== '' && img.src !== img.dataset.local) { img.src = img.dataset.local; } else { img.style.display='none'; if(img.nextElementSibling) img.nextElementSibling.style.display='flex'; }"
                             onload="this.style.display='block'; if(this.nextElementSibling) this.nextElementSibling.style.display='none';">
                        <span style="font-size: 40px; display: none;">👹</span>
                    </div>
                `;
            } else if (session.title) {
                // Если нет ID или imageUrl, пытаемся найти в window.allBosses (fallback)
                if (window.allBosses && window.allBosses.length > 0) {
                    const currentBoss = window.allBosses.find(b => b.name === session.title);
                    if (currentBoss) {
                        bossImageHtml = `
                            <div class="boss-image" style="width: 100px; height: 100px; min-width: 100px; max-width: 100px; min-height: 100px; max-height: 100px; box-sizing: border-box; background: #1a1a1a; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px; overflow: hidden; flex-shrink: 0;">
                                <img src="${getBossImageUrl(currentBoss.id, currentBoss)}" 
                                     alt="${session.title}" 
                                     data-fallback="${getBossImageUrlFallback(currentBoss.id, currentBoss)}"
                                     style="max-width: 100%; max-height: 100%; object-fit: contain;"
                                     onerror="if(this.dataset.fallback && this.dataset.fallback !== '' && this.src !== this.dataset.fallback) { this.src = this.dataset.fallback; } else { this.style.display='none'; this.nextElementSibling.style.display='flex'; }"
                                     onload="this.style.display='block'; if(this.nextElementSibling) this.nextElementSibling.style.display='none';">
                                <span style="font-size: 40px; display: none;">👹</span>
                            </div>
                        `;
                    }
                }
            }
            
            bossInfo.innerHTML = `
                ${rewardMessageHtml}
                <div style="display: flex; align-items: flex-start; gap: 12px;">
                    ${bossImageHtml}
                    <div style="flex: 1;">
                        <strong>${session.title || 'Босс'}</strong><br>
                        HP: ${session.currentHp.toLocaleString()} / ${session.maxHp.toLocaleString()} (${hpPercent}%)<br>
                        Режим: ${modeDecoded}${comboText}${timeInfo}
                    </div>
                </div>
            `;
            updateStatus(true);
            
            // Убеждаемся, что секция выбора боссов всегда видна, даже когда есть активный бой
            const bossSelectSection = document.getElementById('boss-select-section');
            if (bossSelectSection) {
                bossSelectSection.style.display = 'block';
            }
            const bossListContainer = document.getElementById('boss-list-container');
            if (bossListContainer) {
                bossListContainer.style.display = 'block';
            }
            
            // Если список боссов еще не загружен, загружаем его
            if (!window.bossCategoriesData || Object.keys(window.bossCategoriesData).length === 0) {
                console.log('📋 Список боссов не загружен, загружаем...');
                loadBossList();
            }
        } else {
            bossInfo.innerHTML = '<p>Информация о боссе недоступна</p>';
            updateStatus(false);
            
            // Убеждаемся, что секция выбора боссов видна даже когда нет активного боя
            const bossSelectSection = document.getElementById('boss-select-section');
            if (bossSelectSection) {
                bossSelectSection.style.display = 'block';
            }
            const bossListContainer = document.getElementById('boss-list-container');
            if (bossListContainer) {
                bossListContainer.style.display = 'block';
            }
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

// Обновление ключей боссов из bootstrap
async function updateBossKeys() {
    try {
        const apiUrl = API_SERVER_URL || GAME_API_URL;
        
        // Сначала загружаем ключи из БД
        console.log('🔄 Загрузка ключей из БД...');
        try {
            const keysResponse = await fetch(`${apiUrl}/boss/keys`, {
                method: 'GET',
                headers: await getApiHeaders()
            });
            
            if (keysResponse.ok) {
                const keysData = await keysResponse.json();
                if (keysData.success && keysData.keys) {
                    bossKeys = {};
                    for (const [bossIdStr, count] of Object.entries(keysData.keys)) {
                        const bossId = parseInt(bossIdStr);
                        const keyCount = parseInt(count) || 0;
                        bossKeys[bossId] = keyCount;
                    }
                    console.log('✅ Ключи загружены из БД:', bossKeys);
                }
            }
        } catch (error) {
            console.warn('⚠️ Не удалось загрузить ключи из БД:', error);
        }
        
        // Затем обновляем из bootstrap
        console.log('🔄 Обновление ключей из bootstrap...');
        let bootstrapResponse = await fetch(`${apiUrl}/boss/bootstrap`, {
            method: 'GET',
            headers: await getApiHeaders()
        });
        
        // Обработка 401/403 - обновляем токен
        if (bootstrapResponse.status === 401 || bootstrapResponse.status === 403) {
            console.log('⚠️ Токен протух, обновляем...');
            const currentInitData = await getCurrentInitData();
            if (currentInitData && currentInitData.trim()) {
                const newToken = await loginWithInitData();
                if (newToken) {
                    bootstrapResponse = await fetch(`${apiUrl}/boss/bootstrap`, {
                        method: 'GET',
                        headers: await getApiHeaders()
                    });
                }
            }
        }
        
        if (bootstrapResponse.ok) {
            const bootstrapData = await bootstrapResponse.json();
            console.log('📦 Bootstrap ответ получен:', bootstrapData);
            console.log('📦 Bootstrap playerStats:', bootstrapData.playerStats);
            console.log('📦 Bootstrap playerStats.keys:', bootstrapData.playerStats?.keys);
            
            // Проверяем разные варианты структуры ответа
            // Ключи находятся в playerStats.keys
            let keysData = null;
            if (bootstrapData.playerStats && bootstrapData.playerStats.keys) {
                keysData = bootstrapData.playerStats.keys;
                console.log('✅ Ключи найдены в bootstrapData.playerStats.keys');
            } else if (bootstrapData.keys) {
                keysData = bootstrapData.keys;
                console.log('✅ Ключи найдены в bootstrapData.keys');
            } else if (bootstrapData.data && bootstrapData.data.keys) {
                keysData = bootstrapData.data.keys;
                console.log('✅ Ключи найдены в bootstrapData.data.keys');
            } else if (bootstrapData.success && bootstrapData.keys) {
                keysData = bootstrapData.keys;
                console.log('✅ Ключи найдены в bootstrapData.success.keys');
            } else {
                console.warn('⚠️ Ключи не найдены в ответе. Полная структура:', JSON.stringify(bootstrapData, null, 2));
            }
            
            if (keysData) {
                // Сохраняем старые ключи для сравнения
                const oldKeys = { ...bossKeys };
                
                // Обновляем ключи
                bossKeys = {};
                for (const [bossIdStr, count] of Object.entries(keysData)) {
                    const bossId = parseInt(bossIdStr);
                    const keyCount = parseInt(count) || 0;
                    bossKeys[bossId] = keyCount;
                    if (oldKeys[bossId] !== keyCount) {
                        console.log(`🔑 Босс ${bossId}: ${oldKeys[bossId] || 0} → ${keyCount} ключей (изменение)`);
                    }
                }
                console.log('✅ Ключи обновлены из bootstrap:', bossKeys);
                
                // Обновляем карточки боссов, если они уже загружены
                const existingCards = document.querySelectorAll('.boss-card');
                if (existingCards.length > 0) {
                    console.log(`🔄 Обновление ${existingCards.length} карточек с новыми ключами...`);
                    updateBossCards();
                } else {
                    console.log('ℹ️ Карточки еще не отрисованы, обновление будет при рендеринге');
                }
            } else {
                console.warn('⚠️ Ключи не найдены в ответе bootstrap при обновлении');
                console.warn('Структура ответа:', JSON.stringify(bootstrapData, null, 2));
            }
            
            // Проверяем, есть ли награда для сбора
            if (bootstrapData.success && bootstrapData.hasReward === true) {
                console.log('💰 Обнаружена награда в bootstrap, собираем...');
                try {
                    const rewardData = await collectBossRewards();
                    const rewardMessageHtml = formatRewardMessage(rewardData, 'html');
                    const rewardMessageText = formatRewardMessage(rewardData, 'text');
                    
                    // Показываем модальное окно с наградой
                    showCustomModal(rewardMessageText);
                    
                    // Обновляем информацию о боссе, чтобы показать, что награда собрана
                    loadBossInfo();
                } catch (error) {
                    console.error('❌ Ошибка сбора награды из updateBossKeys:', error);
                }
            }
        } else {
            console.error(`❌ Ошибка загрузки bootstrap: HTTP ${bootstrapResponse.status}`);
            const errorText = await bootstrapResponse.text();
            console.error('Текст ошибки:', errorText);
        }
    } catch (error) {
        console.error('❌ Ошибка обновления ключей:', error);
        console.error('Стек ошибки:', error.stack);
    }
}

// Обновление карточек боссов с новыми ключами
function updateBossCards() {
    const cards = document.querySelectorAll('.boss-card');
    console.log(`🔄 Обновление ${cards.length} карточек боссов с новыми ключами`);
    console.log('🔑 Текущие ключи:', bossKeys);
    
    cards.forEach(card => {
        const bossId = parseInt(card.dataset.bossId);
        
        // Получаем количество ключей у босса
        let keysCount = 0;
        if (bossKeys[bossId] !== undefined) {
            keysCount = parseInt(bossKeys[bossId]) || 0;
        } else if (bossKeys[String(bossId)] !== undefined) {
            keysCount = parseInt(bossKeys[String(bossId)]) || 0;
        }
        
        // Получаем информацию о требуемых ключах
        const keysInfo = getBossKeysInfo(bossId);
        
        const canAttack = canAttackBoss(bossId);
        
        console.log(`  📋 Босс ${bossId}: ключей=${keysCount}, доступен=${canAttack}`);
        
        // Обновляем количество ключей
        const keysElement = card.querySelector('.boss-keys');
        if (keysElement) {
            keysElement.textContent = `🔑 ${keysInfo.hasRequirements ? `${keysInfo.required}/${keysInfo.available}` : keysCount}`;
        } else {
            console.warn(`⚠️ Не найден элемент .boss-keys для босса ${bossId}`);
        }
        
        // Обновляем стиль карточки
        if (canAttack) {
            card.style.border = '2px solid #28a745';
            card.style.background = 'linear-gradient(135deg, #2d5a2d 0%, #1e3a1e 100%)';
            
            // Добавляем или обновляем индикатор доступности
            let availableIndicator = card.querySelector('.available-indicator');
            const infoCard = card.querySelector('.boss-info-card');
            if (!availableIndicator && infoCard) {
                // Создаем новый индикатор только если его нет
                availableIndicator = document.createElement('div');
                availableIndicator.className = 'available-indicator';
                availableIndicator.style.cssText = 'font-size: 10px; color: #28a745; margin-top: 4px;';
                availableIndicator.textContent = '✓ Доступен';
                infoCard.appendChild(availableIndicator);
            } else if (availableIndicator) {
                // Обновляем существующий индикатор
                availableIndicator.textContent = '✓ Доступен';
                availableIndicator.style.display = 'block';
            }
        } else {
            card.style.border = '2px solid #555';
            card.style.background = 'linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%)';
            
            // Скрываем индикатор доступности (не удаляем, чтобы не создавать заново)
            const availableIndicator = card.querySelector('.available-indicator');
            if (availableIndicator) {
                availableIndicator.style.display = 'none';
            }
        }
    });
    
    console.log('✅ Карточки обновлены');
}

// Обновление информации о боссе
async function refreshBossInfo() {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '🔄 Обновление...';
    
    try {
        // Обновляем ключи и информацию о боссе
        await Promise.all([
            updateBossKeys(),
            loadBossInfo(),
            loadStats()
        ]);
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
        // ВАЖНО: Используем getApiHeaders() для получения актуального токена из localStorage
        let prisonsResponse = await fetch(`${GAME_API_URL}/prisons/tops-all`, {
            method: 'GET',
            headers: await getApiHeaders()
        });
        
        let playerResponse = await fetch(`${GAME_API_URL}/player/init`, {
            method: 'POST',
            headers: await getApiHeaders(),
            body: JSON.stringify({})
        });
        
        // Если получили 401/403, пытаемся обновить токен через initData из БД
        if ((prisonsResponse.status === 401 || prisonsResponse.status === 403) || 
            (playerResponse.status === 401 || playerResponse.status === 403)) {
            console.warn('Токен протух, пытаемся обновить через initData из БД...');
            const currentInitData = await getCurrentInitData();
            if (currentInitData && currentInitData.trim()) {
                const newToken = await loginWithInitData();
                if (newToken) {
                    // ВАЖНО: loginWithInitData() уже сохранил токен в localStorage
                    // Используем getApiHeaders() для получения актуального токена
                    // Повторяем запросы с новым токеном
                    [prisonsResponse, playerResponse] = await Promise.all([
                        fetch(`${GAME_API_URL}/prisons/tops-all`, {
                            method: 'GET',
                            headers: await getApiHeaders()
                        }),
                        fetch(`${GAME_API_URL}/player/init`, {
                            method: 'POST',
                            headers: await getApiHeaders(),
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
        // ВАЖНО: Используем getApiHeaders() для получения актуального токена из localStorage
        let prisonResponse = await fetch(`${GAME_API_URL}/player/prison/${prisonId}`, {
            method: 'GET',
            headers: await getApiHeaders()
        });
        
        let checkpointsResponse = await fetch(`${GAME_API_URL}/player/prison/${prisonId}/checkpoints?isDay=${isDay}`, {
            method: 'GET',
            headers: await getApiHeaders()
        });
        
        // Если получили 401/403, пытаемся обновить токен через initData из БД
        if ((prisonResponse.status === 401 || prisonResponse.status === 403) || 
            (checkpointsResponse.status === 401 || checkpointsResponse.status === 403)) {
            console.warn('Токен протух, пытаемся обновить через initData из БД...');
            const currentInitData = await getCurrentInitData();
            if (currentInitData && currentInitData.trim()) {
                const newToken = await loginWithInitData();
                if (newToken) {
                    // ВАЖНО: loginWithInitData() уже сохранил токен в localStorage
                    // Используем getApiHeaders() для получения актуального токена
                    // Повторяем запросы с новым токеном
                    [prisonResponse, checkpointsResponse] = await Promise.all([
                        fetch(`${GAME_API_URL}/player/prison/${prisonId}`, {
                            method: 'GET',
                            headers: await getApiHeaders()
                        }),
                        fetch(`${GAME_API_URL}/player/prison/${prisonId}/checkpoints?isDay=${isDay}`, {
                            method: 'GET',
                            headers: await getApiHeaders()
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
            // ВАЖНО: Используем getApiHeaders() для получения актуального токена из localStorage
            let response = await fetch(`${GAME_API_URL}/player/prison/${prisonId}/work?isDay=${isDay}`, {
                method: 'POST',
                headers: await getApiHeaders()
            });
            
            // Если получили 401/403, пытаемся обновить токен через initData из БД
            if (response.status === 401 || response.status === 403) {
                console.warn('Токен протух, пытаемся обновить через initData из БД...');
                const currentInitData = await getCurrentInitData();
                if (currentInitData && currentInitData.trim()) {
                    const newToken = await loginWithInitData();
                    if (newToken) {
                        // ВАЖНО: loginWithInitData() уже сохранил токен в localStorage
                        // Используем getApiHeaders() для получения актуального токена
                        // Повторяем запрос с новым токеном
                        response = await fetch(`${GAME_API_URL}/player/prison/${prisonId}/work?isDay=${isDay}`, {
                            method: 'POST',
                            headers: await getApiHeaders()
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

// Загрузка списка мастеров
async function loadMasters() {
    const select = document.getElementById('master-select');
    
    let token = await getAccessToken();
    if (!token) {
        console.warn('Токен не доступен');
        return;
    }
    
    try {
        console.log('Загрузка мастеров...');
        // ВАЖНО: Используем getApiHeaders() для получения актуального токена из localStorage
        let response = await fetch(`${GAME_API_URL}/masters`, {
            method: 'GET',
            headers: await getApiHeaders()
        });
        
        // Если получили 401/403, пытаемся обновить токен через initData из БД
        if (response.status === 401 || response.status === 403) {
            console.warn('Токен протух, пытаемся обновить через initData из БД...');
            const currentInitData = await getCurrentInitData();
            if (currentInitData && currentInitData.trim()) {
                const newToken = await loginWithInitData();
                if (newToken) {
                    // ВАЖНО: loginWithInitData() уже сохранил токен в localStorage
                    // Используем getApiHeaders() для получения актуального токена
                    // Повторяем запрос с новым токеном
                    response = await fetch(`${GAME_API_URL}/masters`, {
                        method: 'GET',
                        headers: await getApiHeaders()
                    });
                }
            }
        }
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        if (data.masters) {
            // Очищаем селект, оставляя первый option
            select.innerHTML = '<option value="">Выберите мастера...</option>';
            
            // Фильтруем только доступных мастеров
            const availableMasters = data.masters.filter(master => data.access && data.access[master.id.toString()]);
            
            availableMasters.forEach(master => {
                const option = document.createElement('option');
                option.value = master.id;
                option.textContent = `${master.name} - ${master.description}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки мастеров:', error);
    }
}

// Загрузка информации о мастере
async function loadMasterInfo() {
    const masterId = document.getElementById('master-select').value;
    const masterInfo = document.getElementById('master-info');
    const walkBtn = document.getElementById('master-walk-btn');
    
    if (!masterId) {
        masterInfo.innerHTML = '<p>Выберите мастера для просмотра информации</p>';
        walkBtn.disabled = true;
        return;
    }
    
    let token = await getAccessToken();
    if (!token) {
        masterInfo.innerHTML = '<p class="error">❌ Требуется авторизация!</p>';
        walkBtn.disabled = true;
        return;
    }
    
    masterInfo.innerHTML = '<p class="loading">Загрузка...</p>';
    walkBtn.disabled = true;
    
    try {
        // ВАЖНО: Используем getApiHeaders() для получения актуального токена из localStorage
        // ВАЖНО: /enter эндпоинт использует GET метод
        const headers = await getApiHeaders();
        // Убираем Content-Type для GET запросов
        delete headers['Content-Type'];
        let response = await fetch(`${GAME_API_URL}/player/masters/${masterId}/enter`, {
            method: 'GET',
            headers: headers
        });
        
        // Если получили 401/403, пытаемся обновить токен через initData из БД
        if (response.status === 401 || response.status === 403) {
            console.warn('Токен протух, пытаемся обновить через initData из БД...');
            const currentInitData = await getCurrentInitData();
            if (currentInitData && currentInitData.trim()) {
                const newToken = await loginWithInitData();
                if (newToken) {
                    // ВАЖНО: loginWithInitData() уже сохранил токен в localStorage
                    // Используем getApiHeaders() для получения актуального токена
                    // Повторяем запрос с новым токеном
                    const retryHeaders = await getApiHeaders();
                    delete retryHeaders['Content-Type'];
                    response = await fetch(`${GAME_API_URL}/player/masters/${masterId}/enter`, {
                        method: 'GET',
                        headers: retryHeaders
                    });
                }
            }
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            masterInfo.innerHTML = `<p class="error">❌ Ошибка: ${data.error || 'Неизвестная ошибка'}</p>`;
            walkBtn.disabled = true;
            return;
        }
        
        const masterData = data.data || {};
        const progress = masterData.progress || {};
        const checkpoints = data.checkpoints || [];
        const itemsCatalog = data.itemsCatalog || [];
        const itemsOwned = masterData.itemsOwned || [];
        
        // Проверяем, все ли предметы куплены
        const allItemsOwned = itemsOwned.every(owned => owned === true);
        const canStartTraining = masterData.canStartTraining === true;
        
        let infoHTML = `
            <div class="prison-details">
                <h3>📊 Информация о мастерской</h3>
                <div class="progress-info">
                    <p>Текущий чекпоинт: <strong>${progress.currentCheckpoint || 0}</strong></p>
                    <p>Кликов в чекпоинте: <strong>${progress.clicksInCheckpoint || 0} / ${checkpoints[progress.currentCheckpoint - 1]?.clicksRequired || 0}</strong></p>
                    <p>Уровень: <strong>${progress.level || 0}</strong></p>
                    <p>Интеллект: <strong>${progress.intellect || 0}</strong></p>
                    <p>Все предметы куплены: <strong>${allItemsOwned ? '✅ Да' : '❌ Нет'}</strong></p>
                    <p>Можно начать обучение: <strong>${canStartTraining ? '✅ Да' : '❌ Нет'}</strong></p>
                </div>
        `;
        
        if (checkpoints.length > 0) {
            infoHTML += `
                <div class="checkpoints-info" style="margin-top: 15px;">
                    <h4>Чекпоинты:</h4>
                    <div style="max-height: 200px; overflow-y: auto;">
            `;
            checkpoints.forEach((checkpoint, index) => {
                const isCompleted = masterData.completed && masterData.completed[index];
                const isCurrent = progress.currentCheckpoint === checkpoint.checkpointId;
                infoHTML += `
                    <div style="padding: 5px; border-bottom: 1px solid #ddd; ${isCurrent ? 'background-color: #e3f2fd;' : ''}">
                        <strong>${checkpoint.title}</strong> ${isCompleted ? '✅' : ''} ${isCurrent ? '← Текущий' : ''}<br>
                        Кликов: ${checkpoint.clicksRequired} | Энергия: ${checkpoint.energyCost} | 
                        Награда: ${checkpoint.rewardCigarettes} сигарет, ${checkpoint.rewardRating} рейтинг, ${checkpoint.rewardAuthority} авторитет
                    </div>
                `;
            });
            infoHTML += `</div></div>`;
        }
        
        infoHTML += `</div>`;
        masterInfo.innerHTML = infoHTML;
        
        // Включаем кнопку только если можно начать обучение
        walkBtn.disabled = !canStartTraining;
    } catch (error) {
        console.error('Ошибка загрузки информации о мастере:', error);
        masterInfo.innerHTML = `<p class="error">❌ Ошибка: ${error.message}</p>`;
        walkBtn.disabled = true;
    }
}

// Начать прохождение мастерской
async function startMasterWalk() {
    const masterId = document.getElementById('master-select').value;
    const btn = event.target;
    
    if (!masterId) {
        tg.showAlert('Выберите мастера');
        return;
    }
    
    let token = await getAccessToken();
    if (!token) {
        tg.showAlert('❌ Требуется авторизация!\nОбновите страницу');
        return;
    }
    
    const confirmed = await new Promise(resolve => {
        tg.showConfirm('Начать автоматическое обучение?', resolve);
    });
    
    if (!confirmed) return;
    
    btn.disabled = true;
    btn.textContent = '🚀 Обучение...';
    
    try {
        // Выполняем клики до окончания энергии
        let total_clicks = 0;
        let total_cigarettes = 0;
        let total_rating = 0;
        let total_authority = 0;
        let total_intellect = 0;
        let current_energy = 50; // Начальная энергия (будет обновляться из ответа)
        let last_error = null;
        const max_iterations = 100; // Максимум итераций для безопасности
        
        // Обновляем информацию о прогрессе в интерфейсе
        const masterInfo = document.getElementById('master-info');
        
        for (let i = 0; i < max_iterations; i++) {
            // Показываем прогресс
            masterInfo.innerHTML = `
                <div class="prison-details">
                    <h3>🚀 Обучение в мастерской...</h3>
                    <div class="progress-info">
                        <p>Кликов: <strong>${total_clicks}</strong></p>
                        <p>Энергия: <strong>${current_energy}</strong></p>
                        <p>Сигареты: <strong>+${total_cigarettes}</strong></p>
                        <p>Рейтинг: <strong>+${total_rating}</strong></p>
                        <p>Авторитет: <strong>+${total_authority}</strong></p>
                        <p>Интеллект: <strong>+${total_intellect}</strong></p>
                    </div>
                </div>
            `;
            
            // POST запрос для работы в мастерской
            // ВАЖНО: Используем getApiHeaders() для получения актуального токена из localStorage
            // ВАЖНО: Для /work эндпоинта НЕ отправляем body
            const workHeaders = await getApiHeaders();
            delete workHeaders['Content-Type'];
            let response = await fetch(`${GAME_API_URL}/player/masters/${masterId}/work`, {
                method: 'POST',
                headers: workHeaders
            });
            
            // Если получили 401/403, пытаемся обновить токен через initData из БД
            if (response.status === 401 || response.status === 403) {
                console.warn('Токен протух, пытаемся обновить через initData из БД...');
                const currentInitData = await getCurrentInitData();
                if (currentInitData && currentInitData.trim()) {
                    const newToken = await loginWithInitData();
                    if (newToken) {
                        // ВАЖНО: loginWithInitData() уже сохранил токен в localStorage
                        // Используем getApiHeaders() для получения актуального токена
                        // Повторяем запрос с новым токеном
                        const retryWorkHeaders = await getApiHeaders();
                        delete retryWorkHeaders['Content-Type'];
                        response = await fetch(`${GAME_API_URL}/player/masters/${masterId}/work`, {
                            method: 'POST',
                            headers: retryWorkHeaders
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
            // Структура ответа может быть разной: либо data.rewardCigarettes, либо data.data.rewardCigarettes
            const resultData = data.data || data;
            total_cigarettes += resultData.rewardCigarettes || 0;
            total_rating += resultData.rewardRating || 0;
            total_authority += resultData.rewardAuthority || 0;
            total_intellect += resultData.rewardIntellect || 0;
            current_energy = resultData.energy || data.energy || current_energy;
            
            // Проверяем энергию
            if (current_energy <= 0) {
                console.log('Энергия закончилась');
                break;
            }
            
            // Задержка между кликами (1 секунда)
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Показываем результат
        const message = `✅ Обучение завершено!\n\n` +
            `📊 Статистика:\n` +
            `• Кликов: ${total_clicks}\n` +
            `• Сигареты: +${total_cigarettes}\n` +
            `• Рейтинг: +${total_rating}\n` +
            `• Авторитет: +${total_authority}\n` +
            `• Интеллект: +${total_intellect}\n` +
            `• Осталось энергии: ${current_energy}`;
        
        if (last_error) {
            tg.showPopup({
                title: '⚠️ Обучение прервано',
                message: message + `\n\nОшибка: ${last_error}`,
                buttons: [{ text: 'OK', type: 'ok' }]
            });
        } else {
            tg.showPopup({
                title: '✅ Обучение завершено',
                message: message,
                buttons: [{ text: 'OK', type: 'ok' }]
            });
        }
        
        // Обновляем информацию о мастере и статистику
        await Promise.all([
            loadMasterInfo(),
            loadStats()
        ]);
    } catch (error) {
        console.error('Ошибка обучения в мастерской:', error);
        tg.showAlert(`❌ Ошибка: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = '🚀 Начать обучение';
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
        // ВАЖНО: Используем getApiHeaders() для получения актуального токена из localStorage
        let response = await fetch(`${GAME_API_URL}/boss/bootstrap`, {
            method: 'GET',
            headers: await getApiHeaders()
        });
        
        // Если получили 401/403, пытаемся обновить токен через initData из БД
        if (response.status === 401 || response.status === 403) {
            console.warn('Токен протух, пытаемся обновить через initData из БД...');
            const currentInitData = await getCurrentInitData();
            if (currentInitData && currentInitData.trim()) {
                const newToken = await loginWithInitData();
                if (newToken) {
                    // ВАЖНО: loginWithInitData() уже сохранил токен в localStorage
                    // Используем getApiHeaders() для получения актуального токена
                    // Повторяем запрос с новым токеном
                    response = await fetch(`${GAME_API_URL}/boss/bootstrap`, {
                        method: 'GET',
                        headers: await getApiHeaders()
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

// Получение данных пользователя из Telegram (даже если initData недоступен)
function getTelegramUserInfo() {
    // ПРИОРИТЕТ 1: tg.initDataUnsafe.user (доступен даже после релоуда)
    if (tg?.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user;
        return {
            id: user.id,
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name
        };
    }
    
    // ПРИОРИТЕТ 2: Из tg.initData (если доступен)
    if (tg?.initData) {
        try {
            const params = new URLSearchParams(tg.initData);
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

// Получение пользователя по username с сервера из БД
// Используется для поиска пользователя при открытии Mini App через кнопку бота
async function getUserByUsernameFromServer(username) {
    try {
        if (!username || !username.trim()) {
            console.warn('Username не указан для поиска');
            return null;
        }
        
        const url = API_SERVER_URL 
            ? `${API_SERVER_URL}/auth/get-user-by-username?username=${encodeURIComponent(username)}`
            : `${GAME_API_URL}/auth/get-user-by-username?username=${encodeURIComponent(username)}`;
        
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
        
        const url = API_SERVER_URL 
            ? `${API_SERVER_URL}/auth/get-saved-init-data`
            : `${GAME_API_URL}/auth/get-saved-init-data`;
        
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

// Получение актуального токена из БД (устаревшая функция, используйте getAccessToken())
// Оставлена для обратной совместимости
async function getSavedTokenFromServer() {
    // Просто вызываем getAccessToken(), который всегда получает токен из БД
    return await getAccessToken();
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
        const url = API_SERVER_URL 
            ? `${API_SERVER_URL}/auth/get-saved-token`
            : `${GAME_API_URL}/auth/get-saved-token`;
        
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
        
        let initData = '';
        
        // Получаем initData из БД (единственный источник)
        // ВАЖНО: initData НЕ хранится в localStorage, только в БД
        const savedInitData = await getCurrentInitData();
        if (savedInitData && savedInitData.trim() && savedInitData.length >= 50) {
            initData = savedInitData;
            console.log('✓ Используется initData из БД');
        } else {
            console.error('❌ initData недоступен! Пожалуйста, введите initData в настройках.');
            throw new Error('initData не найден. Пожалуйста, введите initData в настройках.');
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
                // Токен уже сохранен в БД на сервере при авторизации
                // Устанавливаем статус "Подключено" при успешном получении access_token
                updateStatus(true);
                return authHeader;
            }
            
            // Если нет данных, возвращаем ошибку
            // Устанавливаем статус "Отключено" если login обвалился
            updateStatus(false);
            throw new Error('Получен ответ 204 без данных. Возможно, проблема с прокси-сервером.');
        }
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Ошибка авторизации: ${response.status}`, errorText);
            // Устанавливаем статус "Отключено" если запрос login обвалился
            updateStatus(false);
            
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
            // ВАЖНО: Токен сохраняется в БД на сервере при авторизации
            // НЕ сохраняем токен в localStorage, всегда получаем из БД
            
            // ВАЖНО: initData сохраняется в БД на сервере при авторизации
            // НЕ сохраняем initData в localStorage, всегда берем из БД
            if (initData) {
                // Обновляем поле ввода для отображения (но не сохраняем в localStorage)
                const manualInitDataInput = document.getElementById('manual-initdata');
                if (manualInitDataInput) {
                    manualInitDataInput.value = initData;
                    console.log('✓ Поле manual-initdata обновлено (initData сохранен в БД на сервере)');
                }
                console.log('✓ initData сохранен в БД на сервере');
            }
            
            console.log(`✓ Токен успешно сохранен в БД (первые 20 символов): ${data.accessToken.substring(0, 20)}...`);
            
            // Сохраняем userId, username и first_name из login для отображения
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
            
            // Обновляем отображение имени пользователя
            updateUserNameDisplay();
            
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
            
            // ВАЖНО: Возвращаем токен напрямую из ответа сервера
            // Токен уже сохранен в БД на сервере
            // Устанавливаем статус "Подключено" при успешном получении access_token
            updateStatus(true);
            return data.accessToken;
        } else {
            console.error('Ошибка авторизации: нет токена в ответе', data);
            // Устанавливаем статус "Отключено" если login обвалился (нет токена в ответе)
            updateStatus(false);
            return null;
        }
    } catch (error) {
        console.error('Ошибка авторизации:', error);
        // Устанавливаем статус "Отключено" если запрос login обвалился
        updateStatus(false);
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
// ВАЖНО: Токен должен быть сохранен в БД на сервере, не в localStorage
window.manualAuth = function() {
    const token = prompt('Введите access token (JWT):');
    if (token && token.trim()) {
        // Токен нужно сохранить в БД через API, но для этого нужен initData
        // Показываем предупреждение
        alert('⚠️ Ручной ввод токена не поддерживается.\n\nТокен должен быть сохранен в БД через авторизацию с initData.\n\nПожалуйста, используйте кнопку "Авторизоваться" с initData.');
    }
};

// Глобальные переменные для автоматической атаки боссов
let bossAttackInterval = null;
let bossDataUpdateInterval = null;  // Интервал для обновления данных боссов во время автоатаки
let currentBossIndex = 0;
let selectedBosses = [];
let isAttacking = false;

// Структура данных для правил атаки боссов (ключи)
// Формат: bossId: { requiredKeys: { fromBossId: count } }
const BOSS_ATTACK_RULES = {
    1: { requiredKeys: {} }, // Кирпич - без ключей
    2: { requiredKeys: { 1: 3 } }, // Сизовый - 3 ключа с Кирпича
    3: { requiredKeys: { 2: 3 } }, // Махно - 3 ключа с Сизового
    4: { requiredKeys: { 3: 3 } }, // Лютый - 3 ключа с Махно
    5: { requiredKeys: { 4: 1 } }, // Шайба - 1 ключ с Лютого
    6: { requiredKeys: { 5: 1 } }, // Бурят - 1 ключ с Шайбы
    7: { requiredKeys: { 6: 1 } }, // Дядя Миша - 1 ключ с Бурят
    8: { requiredKeys: { 7: 1 } }, // Хирург - 1 ключ с Дяди Миши
    9: { requiredKeys: {} }, // Палыч - без ключей
    10: { requiredKeys: { 9: 3 } }, // Циплоп - 3 ключа с Палыча
    11: { requiredKeys: { 10: 1 } }, // Раиса - 1 ключ с Циплопа
    12: { requiredKeys: { 11: 3 } }, // Бес - 3 ключа с Раисы
    13: { requiredKeys: { 12: 3 } }, // Паленов - 3 ключа с Беса
    14: { requiredKeys: { 13: 1 } }, // Блезница - 1 ключ с Паленова
    15: { requiredKeys: { 14: 1 } }, // Борзов Миша - 1 ключ с Блезницы
    16: { requiredKeys: { 15: 1 } } // Дюбель - 1 ключ с Борзова
};

// Глобальная переменная для хранения ключей боссов
let bossKeys = {};

// Названия категорий
const CATEGORY_NAMES = {
    1: 'Беспредельщики',
    2: 'Вертухаи'
};

// Названия и множители режимов боя
const BATTLE_MODE_INFO = {
    'pacansky': { name: 'пац', multiplier: 'x1', multiplierValue: 1 },
    'blotnoy': { name: 'Блат', multiplier: 'x3', multiplierValue: 3 },
    'avtoritetny': { name: 'Авто', multiplier: 'x6', multiplierValue: 6 },
    'odin': { name: 'В одного', multiplier: 'x1', multiplierValue: 1 }
};

// Получить множитель HP для режима
function getModeMultiplier(modeKey) {
    return BATTLE_MODE_INFO[modeKey]?.multiplierValue || 1;
}

// Вычислить HP босса с учетом режима
function calculateBossHp(baseHp, modeKey) {
    const multiplier = getModeMultiplier(modeKey);
    return baseHp * multiplier;
}

// Получение доступных режимов боя для босса
function getAvailableBattleModes(bossData) {
    const battleModes = bossData?.battleModes || {};
    const availableModes = [];
    
    for (const [modeKey, modeInfo] of Object.entries(battleModes)) {
        if (modeInfo && BATTLE_MODE_INFO[modeKey]) {
            availableModes.push({
                key: modeKey,
                name: BATTLE_MODE_INFO[modeKey].name,
                multiplier: BATTLE_MODE_INFO[modeKey].multiplier
            });
        }
    }
    
    return availableModes;
}

// Информация о режимах комбо
const COMBO_MODE_INFO = {
    'pacansky': { name: 'пац', key: 'pacansky', color: '#28a745' }, // зеленый
    'blotnoy': { name: 'Блат', key: 'blotnoy', color: '#ffc107' }, // желтый
    'avtoritetny': { name: 'Авто', key: 'avtoritetny', color: '#dc3545' } // красный
};

// Получение цвета для режима комбо
function getComboModeColor(comboModeKey) {
    return COMBO_MODE_INFO[comboModeKey]?.color || '#888';
}

// Получение цвета для режима атаки
function getModeColor(modeKey) {
    const modeColorMap = {
        'pacansky': '#28a745', // зеленый
        'blotnoy': '#ffc107', // желтый
        'avtoritetny': '#dc3545' // красный
    };
    return modeColorMap[modeKey?.toLowerCase()] || '#888';
}

// Получение доступных режимов комбо для босса
function getAvailableComboModes(bossData) {
    const combos = bossData?.combos || {};
    const availableModes = [];
    
    for (const [modeKey, comboInfo] of Object.entries(combos)) {
        if (comboInfo && COMBO_MODE_INFO[modeKey]) {
            availableModes.push({
                key: modeKey,
                name: COMBO_MODE_INFO[modeKey].name
            });
        }
    }
    
    return availableModes;
}

// Флаг для отслеживания процесса взаимодействия с игроками
let isBicepsProcessing = false;

// Проверка доступности босса для атаки
function canAttackBoss(bossId) {
    const rules = BOSS_ATTACK_RULES[bossId];
    if (!rules) {
        console.warn(`⚠️ Правила для босса ${bossId} не найдены`);
        return false;
    }
    
    // Если не требуется ключей, можно атаковать
    if (Object.keys(rules.requiredKeys).length === 0) {
        return true;
    }
    
    // Проверяем, есть ли все необходимые ключи
    for (const [fromBossIdStr, requiredCount] of Object.entries(rules.requiredKeys)) {
        const fromBossId = parseInt(fromBossIdStr);
        const required = parseInt(requiredCount);
        
        // Получаем количество ключей (проверяем и строковые, и числовые ключи)
        let availableKeys = 0;
        if (bossKeys[fromBossId] !== undefined) {
            availableKeys = parseInt(bossKeys[fromBossId]) || 0;
        } else if (bossKeys[String(fromBossId)] !== undefined) {
            availableKeys = parseInt(bossKeys[String(fromBossId)]) || 0;
        }
        
        if (availableKeys < required) {
            console.log(`❌ Босс ${bossId}: недостаточно ключей. Нужно ${required} с босса ${fromBossId}, есть ${availableKeys}`);
            return false;
        }
    }
    
    return true;
}

// Флаг для предотвращения множественных одновременных запросов
let isBossListLoading = false;

// Загрузка списка боссов (глобальная функция)
window.loadBossList = async function loadBossList() {
    // Предотвращаем множественные одновременные запросы
    if (isBossListLoading) {
        console.log('⏳ loadBossList уже выполняется, пропускаем...');
        return;
    }
    
    const container = document.getElementById('boss-list-container');
    if (!container) {
        console.error('boss-list-container не найден!');
        return;
    }
    
    // Убеждаемся, что секция выбора боссов всегда видна
    const bossSelectSection = document.getElementById('boss-select-section');
    if (bossSelectSection) {
        bossSelectSection.style.display = 'block';
    }
    container.style.display = 'block';
    
    // Если данные уже загружены, не показываем загрузку
    if (window.bossCategoriesData && Object.keys(window.bossCategoriesData).length > 0) {
        console.log('✅ Данные боссов уже загружены, пропускаем загрузку');
        return;
    }
    
    container.innerHTML = '<p class="loading">Загрузка списка боссов...</p>';
    
    isBossListLoading = true;
    
    try {
        console.log('=== loadBossList: начало загрузки ===');
        console.log('GAME_API_URL:', GAME_API_URL);
        
        if (!GAME_API_URL) {
            throw new Error('GAME_API_URL не определен! Проверьте настройки.');
        }
        
        let token = await getAccessToken();
        if (!token) {
            throw new Error('Токен не найден');
        }
        
        // Определяем правильный URL для запросов (используем прокси если есть)
        const apiUrl = API_SERVER_URL || GAME_API_URL;
        
        // Сначала загружаем ключи из БД
        console.log('Загружаем ключи из БД...');
        try {
            const keysResponse = await fetch(`${apiUrl}/boss/keys`, {
                method: 'GET',
                headers: await getApiHeaders()
            });
            
            if (keysResponse.ok) {
                const keysData = await keysResponse.json();
                if (keysData.success && keysData.keys) {
                    bossKeys = {};
                    for (const [bossIdStr, count] of Object.entries(keysData.keys)) {
                        const bossId = parseInt(bossIdStr);
                        const keyCount = parseInt(count) || 0;
                        bossKeys[bossId] = keyCount;
                    }
                    console.log('✅ Ключи загружены из БД:', bossKeys);
                }
            }
        } catch (error) {
            console.warn('⚠️ Не удалось загрузить ключи из БД:', error);
        }
        
        // Затем загружаем и обновляем ключи из bootstrap
        console.log('Загружаем ключи из bootstrap...');
        let bootstrapResponse = await fetch(`${apiUrl}/boss/bootstrap`, {
            method: 'GET',
            headers: await getApiHeaders()
        });
        
        // Обработка 401/403 - обновляем токен
        if (bootstrapResponse.status === 401 || bootstrapResponse.status === 403) {
            const currentInitData = await getCurrentInitData();
            if (currentInitData && currentInitData.trim()) {
                const newToken = await loginWithInitData();
                if (newToken) {
                    bootstrapResponse = await fetch(`${apiUrl}/boss/bootstrap`, {
                        method: 'GET',
                        headers: await getApiHeaders()
                    });
                }
            }
        }
        
        if (bootstrapResponse.ok) {
            const bootstrapData = await bootstrapResponse.json();
            console.log('📦 Bootstrap данные:', bootstrapData);
            console.log('📦 Bootstrap playerStats:', bootstrapData.playerStats);
            console.log('📦 Bootstrap playerStats.keys:', bootstrapData.playerStats?.keys);
            
            // Проверяем разные варианты структуры ответа
            // Ключи находятся в playerStats.keys
            let keysData = null;
            if (bootstrapData.playerStats && bootstrapData.playerStats.keys) {
                keysData = bootstrapData.playerStats.keys;
                console.log('✅ Ключи найдены в playerStats.keys');
            } else if (bootstrapData.keys) {
                keysData = bootstrapData.keys;
                console.log('✅ Ключи найдены в корне ответа');
            } else if (bootstrapData.data && bootstrapData.data.keys) {
                keysData = bootstrapData.data.keys;
            } else if (bootstrapData.success && bootstrapData.keys) {
                keysData = bootstrapData.keys;
            }
            
            if (keysData) {
                // Обновляем ключи (преобразуем строковые ключи в числа)
                const oldKeys = { ...bossKeys };
                bossKeys = {};
                for (const [bossIdStr, count] of Object.entries(keysData)) {
                    const bossId = parseInt(bossIdStr);
                    const keyCount = parseInt(count) || 0;
                    bossKeys[bossId] = keyCount;
                    if (oldKeys[bossId] !== keyCount) {
                        console.log(`🔑 Босс ${bossId}: ${oldKeys[bossId] || 0} → ${keyCount} ключей`);
                    }
                }
                console.log('✅ Ключи обновлены из bootstrap:', bossKeys);
                
                // Если карточки уже отрисованы, обновляем их
                const existingCards = document.querySelectorAll('.boss-card');
                if (existingCards.length > 0) {
                    console.log('🔄 Обнаружены существующие карточки, обновляем их...');
                    updateBossCards();
                }
            } else {
                console.warn('⚠️ Ключи не найдены в ответе bootstrap');
                console.warn('Структура ответа:', JSON.stringify(bootstrapData, null, 2));
            }
            
            // Проверяем, есть ли награда для сбора
            if (bootstrapData.success && bootstrapData.hasReward === true) {
                console.log('💰 Обнаружена награда в bootstrap (loadBossList), собираем...');
                try {
                    const rewardData = await collectBossRewards();
                    const rewardMessageHtml = formatRewardMessage(rewardData, 'html');
                    const rewardMessageText = formatRewardMessage(rewardData, 'text');
                    
                    // Показываем модальное окно с наградой
                    showCustomModal(rewardMessageText);
                    
                    // Обновляем информацию о боссе, чтобы показать, что награда собрана
                    loadBossInfo();
                } catch (error) {
                    console.error('❌ Ошибка сбора награды из loadBossList:', error);
                }
            }
        } else {
            console.error('❌ Ошибка загрузки bootstrap:', bootstrapResponse.status);
        }
        
        // Загружаем обе категории боссов параллельно
        console.log('Загружаем обе категории боссов параллельно...');
        
        let category1Data = null;
        let category2Data = null;
        let lastError = null;
        
        // Функция для выполнения запроса с повторной попыткой при 401/403
        async function fetchCategoryWithRetry(categoryId) {
            try {
                const url = `${apiUrl}/boss/list?categoryId=${categoryId}`;
                
                let response = await fetch(url, {
                    method: 'GET',
                    headers: await getApiHeaders()
                });
                
                // Обработка 401/403 - обновляем токен через initData из БД и повторяем
                if (response.status === 401 || response.status === 403) {
                    const currentInitData = await getCurrentInitData();
                    if (currentInitData && currentInitData.trim()) {
                        const newToken = await loginWithInitData();
                        if (newToken) {
                            response = await fetch(url, {
                                method: 'GET',
                                headers: await getApiHeaders()
                            });
                        }
                    }
                }
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ Категория ${categoryId} загружена:`, data.success, data.bosses?.length || 0, 'боссов');
                    if (data.success && data.bosses && data.bosses.length > 0) {
                        console.log(`   📋 Первый босс: ${data.bosses[0].boss?.title || 'N/A'} (ID: ${data.bosses[0].boss?.id || 'N/A'})`);
                    }
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
        // Убеждаемся, что ключи загружены перед рендерингом
        console.log('🔑 Ключи перед рендерингом:', bossKeys);
        
        console.log('📊 Результаты загрузки категорий:');
        console.log('   Категория 1:', category1Data ? `✅ ${category1Data.bosses?.length || 0} боссов` : '❌ нет данных');
        console.log('   Категория 2:', category2Data ? `✅ ${category2Data.bosses?.length || 0} боссов` : '❌ нет данных');
        
        if (category1Data && category2Data) {
            console.log('✅ Обе категории загружены, рендерим список...');
            renderBossList([category1Data, category2Data]);
            // После рендеринга убеждаемся, что карточки обновлены с актуальными ключами
            setTimeout(() => {
                updateBossCards();
                isBossListLoading = false;
            }, 100);
        } else if (category1Data || category2Data) {
            // Если получили только одну категорию, отображаем что есть
            console.log('⚠️ Загружена только одна категория, рендерим...');
            const categories = [];
            if (category1Data) categories.push(category1Data);
            if (category2Data) categories.push(category2Data);
            renderBossList(categories);
            // После рендеринга убеждаемся, что карточки обновлены с актуальными ключами
            setTimeout(() => {
                updateBossCards();
                isBossListLoading = false;
            }, 100);
        } else {
            isBossListLoading = false;
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

// Получение информации о требуемых ключах для босса
function getBossKeysInfo(bossId) {
    const rules = BOSS_ATTACK_RULES[bossId];
    if (!rules || Object.keys(rules.requiredKeys).length === 0) {
        // Не требуется ключей
        return { required: 0, available: 0, hasRequirements: false };
    }
    
    // Суммируем все требуемые ключи
    let totalRequired = 0;
    let totalAvailable = 0;
    
    for (const [fromBossIdStr, requiredCount] of Object.entries(rules.requiredKeys)) {
        const fromBossId = parseInt(fromBossIdStr);
        const required = parseInt(requiredCount);
        totalRequired += required;
        
        // Получаем количество доступных ключей
        let availableKeys = 0;
        if (bossKeys[fromBossId] !== undefined) {
            availableKeys = parseInt(bossKeys[fromBossId]) || 0;
        } else if (bossKeys[String(fromBossId)] !== undefined) {
            availableKeys = parseInt(bossKeys[String(fromBossId)]) || 0;
        }
        totalAvailable += availableKeys;
    }
    
    return { required: totalRequired, available: totalAvailable, hasRequirements: true };
}

// Получение URL изображения босса
function getBossImageUrl(bossId, bossData) {
    // Приоритет 1: картинка из папки images по ID
    const localImageUrl = `images/${bossId}.png`;
    
    // Приоритет 2: картинка из API (если есть)
    const apiImageUrl = bossData?.imageUrl || bossData?.image || '';
    
    // Возвращаем локальную картинку (она будет загружаться, даже если файла нет - браузер покажет ошибку, но мы обработаем это через onerror)
    return localImageUrl;
}

// Получение fallback URL изображения босса (из API)
function getBossImageUrlFallback(bossId, bossData) {
    // Картинка из API (если есть)
    return bossData?.imageUrl || bossData?.image || '';
}

// Отображение списка боссов с каруселями
function renderBossList(categoriesData) {
    const container = document.getElementById('boss-list-container');
    
    console.log('🎨 renderBossList вызван с данными:', categoriesData);
    
    // Сохраняем данные боссов для использования
    window.allBosses = [];
    
    // Сохраняем данные категорий для переключения
    window.bossCategoriesData = {};
    
    // Обрабатываем каждую категорию и сохраняем данные
    categoriesData.forEach((categoryData, categoryIndex) => {
        console.log(`📦 Обработка категории ${categoryIndex}:`, categoryData);
        console.log(`   success: ${categoryData.success}, bosses: ${categoryData.bosses ? categoryData.bosses.length : 'нет'}`);
        
        if (!categoryData.success || !categoryData.bosses) {
            console.warn(`⚠️ Категория ${categoryIndex} пропущена: success=${categoryData.success}, bosses=${!!categoryData.bosses}`);
            return;
        }
        
        const categoryId = categoryData.bosses[0]?.boss?.categoryId || categoryIndex + 1;
        console.log(`✅ Категория ${categoryIndex} сохранена с ID ${categoryId}, боссов: ${categoryData.bosses.length}`);
        window.bossCategoriesData[categoryId] = categoryData;
    });
    
    console.log('📊 Сохраненные категории:', Object.keys(window.bossCategoriesData));
    
    // Создаем сегментированный переключатель и одну карусель
    let html = `
        <div class="boss-category-section" style="margin-bottom: 20px;">
            <div class="category-switcher" style="display: flex; gap: 8px; margin-bottom: 15px; background: rgba(0,0,0,0.1); padding: 4px; border-radius: 8px;">
                <button class="category-switch-btn active" 
                        data-category="1" 
                        onclick="switchBossCategory(1)"
                        style="flex: 1; padding: 10px; border: none; border-radius: 6px; background: #3390ec; color: white; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                    Беспредельщики
                </button>
                <button class="category-switch-btn" 
                        data-category="2" 
                        onclick="switchBossCategory(2)"
                        style="flex: 1; padding: 10px; border: none; border-radius: 6px; background: rgba(255,255,255,0.1); color: var(--tg-theme-text-color, #000000); font-weight: 600; cursor: pointer; transition: all 0.2s;">
                    Вертухаи
                </button>
            </div>
            <div class="boss-carousel-container" data-category-id="unified">
                <div class="boss-carousel" id="carousel-unified">
    `;
    
    // Рендерим первую категорию по умолчанию
    const defaultCategoryId = 1;
    const defaultCategoryData = window.bossCategoriesData[defaultCategoryId];
    
    console.log(`🎯 Рендеринг категории ${defaultCategoryId}:`, defaultCategoryData);
    console.log(`   Есть данные: ${!!defaultCategoryData}, есть боссы: ${!!(defaultCategoryData && defaultCategoryData.bosses)}`);
    
    if (defaultCategoryData && defaultCategoryData.bosses) {
        console.log(`   Количество боссов: ${defaultCategoryData.bosses.length}`);
        defaultCategoryData.bosses.forEach((bossData) => {
            try {
                const boss = bossData.boss;
                if (!boss) {
                    console.warn('⚠️ Босс не найден в данных:', bossData);
                    return;
                }
                const bossId = boss.id;
                const bossName = boss.title;
                const baseHp = boss.baseHp;
            // Получаем количество ключей у босса
            let keysCount = 0;
            if (bossKeys[bossId] !== undefined) {
                keysCount = parseInt(bossKeys[bossId]) || 0;
            } else if (bossKeys[String(bossId)] !== undefined) {
                keysCount = parseInt(bossKeys[String(bossId)]) || 0;
            }
            
            // Получаем информацию о требуемых ключах
            const keysInfo = getBossKeysInfo(bossId);
            
            const canAttack = canAttackBoss(bossId);
            
            // Логирование для отладки
            if (keysCount > 0 || bossId <= 2) {
                console.log(`🎯 Босс ${bossId} (${bossName}): ключей=${keysCount}, доступен=${canAttack}, bossKeys[${bossId}]=${bossKeys[bossId]}, bossKeys["${bossId}"]=${bossKeys[String(bossId)]}`);
            }
            
            // Получаем доступные режимы боя
            const availableModes = getAvailableBattleModes(boss);
            
            // Получаем доступные режимы комбо
            // Убеждаемся, что combos существует, даже если его нет в данных
            if (!bossData.combos) {
                bossData.combos = {};
            }
            const availableComboModes = getAvailableComboModes(bossData);
            
            // Сохраняем босса
            window.allBosses.push({
                id: bossId,
                name: bossName,
                categoryId: defaultCategoryId,
                baseHp: baseHp,
                battleModes: boss.battleModes || {},
                combos: bossData.combos || {},
                imageUrl: boss.imageUrl || boss.image || '',
                availableModes: availableModes,
                availableComboModes: availableComboModes
            });
            
            // Определяем стиль карточки (зеленый если можно атаковать)
            const cardStyle = canAttack 
                ? 'border: 2px solid #28a745; background: linear-gradient(135deg, #2d5a2d 0%, #1e3a1e 100%);' 
                : 'border: 2px solid #555; background: linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%);';
            
            // Проверяем, выбран ли этот босс и какой режим выбран
            const selectedBoss = selectedBosses.find(b => b.id === bossId);
            const selectedMode = selectedBoss ? selectedBoss.mode : null;
            const selectedComboMode = selectedBoss ? selectedBoss.comboMode : null;
            // По умолчанию выбираем "pacansky", если он доступен
            const defaultMode = availableModes.find(m => m.key === 'pacansky') ? 'pacansky' : (availableModes.length > 0 ? availableModes[0].key : null);
            const currentMode = selectedMode || defaultMode;
            // По умолчанию выбираем "pacansky" для комбо, если он доступен
            const defaultComboMode = availableComboModes.find(m => m.key === 'pacansky') ? 'pacansky' : (availableComboModes.length > 0 ? availableComboModes[0].key : null);
            const currentComboMode = selectedComboMode || defaultComboMode;
            
            // Вычисляем HP с учетом множителя режима
            const currentHp = currentMode ? calculateBossHp(baseHp, currentMode) : baseHp;
            
            // Формируем селектор режимов (как в прокачке бицухи)
            let modeSelectorHtml = '';
            if (availableModes.length > 0) {
                modeSelectorHtml = `
                    <div class="boss-mode-selector" style="margin-top: 6px;">
                        <select id="boss-mode-${bossId}" 
                                class="boss-mode-select form-control" 
                                style="width: 100%; padding: 4px 6px; font-size: 11px; background: rgba(0,0,0,0.5); color: #ffffff; border: 1px solid #555; border-radius: 4px; cursor: pointer;"
                                onchange="updateBossMode(${bossId}, this.value)"
                                onclick="event.stopPropagation();">
                            ${availableModes.map(mode => 
                                `<option value="${mode.key}" ${mode.key === currentMode ? 'selected' : ''}>${mode.name} ${mode.multiplier}</option>`
                            ).join('')}
                        </select>
                    </div>
                `;
            }
            
            // Формируем селектор режимов комбо
            let comboModeSelectorHtml = '';
            if (availableComboModes.length > 0) {
                comboModeSelectorHtml = `
                    <div class="boss-combo-mode-selector" style="margin-top: 4px;">
                        <select id="boss-combo-mode-${bossId}" 
                                class="boss-combo-mode-select form-control" 
                                style="width: 100%; padding: 4px 6px; font-size: 10px; background: rgba(0,0,0,0.5); color: #ffffff; border: 1px solid #555; border-radius: 4px; cursor: pointer;"
                                onchange="updateBossComboMode(${bossId}, this.value)"
                                onclick="event.stopPropagation();">
                            ${availableComboModes.map(mode => 
                                `<option value="${mode.key}" ${mode.key === currentComboMode ? 'selected' : ''}>Комбо: ${mode.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                `;
            }
            
            html += `
                <div class="boss-card" 
                     data-boss-id="${bossId}" 
                     data-boss-name="${bossName.replace(/'/g, "\\'")}"
                     data-selected-mode="${currentMode || ''}"
                     data-base-hp="${baseHp}"
                     style="${cardStyle} border-radius: 12px; padding: 10px; margin-right: 12px; min-width: 140px; cursor: pointer; transition: transform 0.2s;"
                     onclick="toggleBossSelection(${bossId}, '${bossName.replace(/'/g, "\\'")}')">
                    <div class="boss-image" style="width: 100px; height: 100px; min-width: 100px; max-width: 100px; min-height: 100px; max-height: 100px; box-sizing: border-box; background: #1a1a1a; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px auto; overflow: hidden; flex-shrink: 0;">
                        <img src="${boss.imageUrl || boss.image || `images/${bossId}.png`}" 
                             alt="${bossName}" 
                             data-fallback="${boss.imageUrl || boss.image || ''}"
                             style="max-width: 100%; max-height: 100%; object-fit: contain;"
                             onerror="if(this.dataset.fallback && this.dataset.fallback !== '' && this.src !== this.dataset.fallback) { this.src = this.dataset.fallback; } else if(this.src !== 'images/${bossId}.png') { this.src = 'images/${bossId}.png'; } else { this.style.display='none'; this.nextElementSibling.style.display='flex'; }"
                             onload="this.style.display='block'; if(this.nextElementSibling) this.nextElementSibling.style.display='none';">
                        <span style="font-size: 40px; display: none;">👹</span>
                    </div>
                    <div class="boss-info-card" style="text-align: center; color: #ffffff;">
                        <div class="boss-name" style="font-weight: 600; font-size: 14px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${bossName}</div>
                        <div class="boss-hp" data-base-hp="${baseHp}" style="font-size: 12px; color: #e0e0e0; margin-bottom: 4px;">HP: ${currentHp.toLocaleString()}</div>
                        <div class="boss-keys" style="font-size: 12px; color: #ffd700; margin-bottom: 6px;">
                            🔑 ${keysInfo.hasRequirements ? `${keysInfo.required}/${keysInfo.available}` : keysCount}
                        </div>
                        ${modeSelectorHtml}
                        ${comboModeSelectorHtml}
                        ${canAttack ? '<div class="available-indicator" style="font-size: 10px; color: #28a745; margin-top: 6px;">✓ Доступен</div>' : ''}
                    </div>
                </div>
            `;
            } catch (error) {
                console.error(`❌ Ошибка при рендеринге босса:`, error, bossData);
                // Продолжаем обработку других боссов
            }
        });
    } else {
        console.warn(`⚠️ Нет данных для категории ${defaultCategoryId} или нет боссов`);
        html += `
            <div style="padding: 20px; text-align: center; color: var(--tg-theme-hint-color, #999);">
                Нет боссов в категории ${defaultCategoryId}
            </div>
        `;
    }
    
    html += `
                </div>
            </div>
        </div>
    `;
    
    // Карусель для порядка атаки
    html += `
        <div class="boss-category-section" style="margin-top: 30px; margin-bottom: 20px;">
            <h3 class="category-title" style="margin-bottom: 15px; color: var(--tg-theme-text-color, #000000); font-size: 18px; font-weight: 600;">Порядок атаки</h3>
            <div class="boss-carousel-container" data-category-id="order">
                <div class="boss-carousel" id="carousel-order">
                    <div style="padding: 20px; text-align: center; color: var(--tg-theme-hint-color, #999);">
                        Выберите боссов для атаки
                    </div>
                </div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    console.log('📝 HTML вставлен в контейнер, длина:', html.length);
    console.log('📝 HTML содержит карусель:', html.includes('carousel-unified'));
    console.log('📝 HTML содержит карточки боссов:', html.includes('boss-card'));
    
    // Небольшая задержка для того, чтобы DOM обновился
    setTimeout(() => {
        // Убеждаемся, что контейнер карусели виден
        const carouselContainer = document.querySelector('.boss-carousel-container[data-category-id="unified"]');
        console.log('🎠 Контейнер карусели найден:', !!carouselContainer);
        if (carouselContainer) {
            carouselContainer.style.display = 'block';
            carouselContainer.style.width = '100%';
            carouselContainer.style.visibility = 'visible';
            carouselContainer.style.opacity = '1';
            console.log('✅ Контейнер карусели настроен');
        } else {
            console.error('❌ Контейнер карусели не найден!');
            console.error('   Попытка найти через другой селектор...');
            const altContainer = document.querySelector('.boss-carousel-container');
            console.error('   Альтернативный контейнер:', !!altContainer);
        }
        
        // Убеждаемся, что карусель видна и правильно стилизована
        const carousel = document.getElementById('carousel-unified');
        console.log('🎠 Карусель найдена:', !!carousel);
        if (carousel) {
            carousel.style.display = 'flex';
            carousel.style.flexDirection = 'row';
            carousel.style.flexWrap = 'nowrap';
            carousel.style.gap = '12px';
            carousel.style.padding = '10px';
            carousel.style.overflowX = 'auto';
            carousel.style.overflowY = 'hidden';
            carousel.style.minHeight = '200px';
            carousel.style.width = '100%';
            carousel.style.visibility = 'visible';
            carousel.style.opacity = '1';
            console.log('✅ Карусель настроена, содержимое:', carousel.innerHTML.length, 'символов');
            const bossCards = carousel.querySelectorAll('.boss-card');
            console.log('✅ Количество карточек боссов:', bossCards.length);
            if (bossCards.length === 0) {
                console.error('❌ Карточки боссов не найдены в карусели!');
                console.error('   Содержимое карусели:', carousel.innerHTML.substring(0, 500));
            } else {
                console.log('✅ Первая карточка:', bossCards[0].textContent?.substring(0, 50));
            }
        } else {
            console.error('❌ Карусель не найдена!');
        }
        
        // Инициализируем карусели
        initializeCarousels();
    }, 100);
}

// Переключение категории боссов
window.switchBossCategory = function(categoryId) {
    // Обновляем активную кнопку
    document.querySelectorAll('.category-switch-btn').forEach(btn => {
        const btnCategoryId = parseInt(btn.dataset.category);
        if (btnCategoryId === categoryId) {
            btn.classList.add('active');
            btn.style.background = '#3390ec';
            btn.style.color = 'white';
        } else {
            btn.classList.remove('active');
            btn.style.background = 'rgba(255,255,255,0.1)';
            btn.style.color = 'var(--tg-theme-text-color, #000000)';
        }
    });
    
    // Получаем данные категории
    const categoryData = window.bossCategoriesData[categoryId];
    if (!categoryData || !categoryData.bosses) {
        console.error(`Категория ${categoryId} не найдена`);
        return;
    }
    
    const carousel = document.getElementById('carousel-unified');
    if (!carousel) return;
    
    let html = '';
    
    // Обновляем window.allBosses для текущей категории
    // Удаляем боссов этой категории из allBosses
    window.allBosses = window.allBosses.filter(b => b.categoryId !== categoryId);
    
    categoryData.bosses.forEach((bossData) => {
        const boss = bossData.boss;
        const bossId = boss.id;
        const bossName = boss.title;
        const baseHp = boss.baseHp;
        
        // Получаем количество ключей у босса
        let keysCount = 0;
        if (bossKeys[bossId] !== undefined) {
            keysCount = parseInt(bossKeys[bossId]) || 0;
        } else if (bossKeys[String(bossId)] !== undefined) {
            keysCount = parseInt(bossKeys[String(bossId)]) || 0;
        }
        
        // Получаем информацию о требуемых ключах
        const keysInfo = getBossKeysInfo(bossId);
        const canAttack = canAttackBoss(bossId);
        
        // Получаем доступные режимы боя
        const availableModes = getAvailableBattleModes(boss);
        
        // Получаем доступные режимы комбо
        // Убеждаемся, что combos существует, даже если его нет в данных
        if (!bossData.combos) {
            bossData.combos = {};
        }
        const availableComboModes = getAvailableComboModes(bossData);
        
        // Сохраняем босса в allBosses
        window.allBosses.push({
            id: bossId,
            name: bossName,
            categoryId: categoryId,
            baseHp: baseHp,
            battleModes: boss.battleModes || {},
            combos: bossData.combos || {},
            imageUrl: boss.imageUrl || boss.image || '',
            availableModes: availableModes,
            availableComboModes: availableComboModes
        });
        
        // Определяем стиль карточки
        const cardStyle = canAttack 
            ? 'border: 2px solid #28a745; background: linear-gradient(135deg, #2d5a2d 0%, #1e3a1e 100%);' 
            : 'border: 2px solid #555; background: linear-gradient(135deg, #2d2d2d 0%, #1e1e1e 100%);';
        
        // Проверяем, выбран ли этот босс и какой режим выбран
        const selectedBoss = selectedBosses.find(b => b.id === bossId);
        const selectedMode = selectedBoss ? selectedBoss.mode : null;
        const selectedComboMode = selectedBoss ? selectedBoss.comboMode : null;
        const defaultMode = availableModes.find(m => m.key === 'pacansky') ? 'pacansky' : (availableModes.length > 0 ? availableModes[0].key : null);
        const currentMode = selectedMode || defaultMode;
        const defaultComboMode = availableComboModes.length > 0 ? availableComboModes[0].key : null;
        const currentComboMode = selectedComboMode || defaultComboMode;
        
        // Вычисляем HP с учетом множителя режима
        const currentHp = currentMode ? calculateBossHp(baseHp, currentMode) : baseHp;
        
        // Формируем селектор режимов
        let modeSelectorHtml = '';
        if (availableModes.length > 0) {
            modeSelectorHtml = `
                <div class="boss-mode-selector" style="margin-top: 6px;">
                    <select id="boss-mode-${bossId}" 
                            class="boss-mode-select form-control" 
                            style="width: 100%; padding: 4px 6px; font-size: 11px; background: rgba(0,0,0,0.5); color: #ffffff; border: 1px solid #555; border-radius: 4px; cursor: pointer;"
                            onchange="updateBossMode(${bossId}, this.value)"
                            onclick="event.stopPropagation();">
                        ${availableModes.map(mode => 
                            `<option value="${mode.key}" ${mode.key === currentMode ? 'selected' : ''}>${mode.name} ${mode.multiplier}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
        }
        
        // Формируем селектор режимов комбо
        let comboModeSelectorHtml = '';
        if (availableComboModes.length > 0) {
            comboModeSelectorHtml = `
                <div class="boss-combo-mode-selector" style="margin-top: 4px;">
                    <select id="boss-combo-mode-${bossId}" 
                            class="boss-combo-mode-select form-control" 
                            style="width: 100%; padding: 4px 6px; font-size: 10px; background: rgba(0,0,0,0.5); color: #ffffff; border: 1px solid #555; border-radius: 4px; cursor: pointer;"
                            onchange="updateBossComboMode(${bossId}, this.value)"
                            onclick="event.stopPropagation();">
                        ${availableComboModes.map(mode => 
                            `<option value="${mode.key}" ${mode.key === currentComboMode ? 'selected' : ''}>Комбо: ${mode.name}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
        }
        
        html += `
            <div class="boss-card" 
                 data-boss-id="${bossId}" 
                 data-boss-name="${bossName.replace(/'/g, "\\'")}"
                 data-selected-mode="${currentMode || ''}"
                 data-base-hp="${baseHp}"
                 style="${cardStyle} border-radius: 12px; padding: 10px; margin-right: 12px; min-width: 140px; cursor: pointer; transition: transform 0.2s;"
                 onclick="toggleBossSelection(${bossId}, '${bossName.replace(/'/g, "\\'")}')">
                <div class="boss-image" style="width: 100px; height: 100px; min-width: 100px; max-width: 100px; min-height: 100px; max-height: 100px; box-sizing: border-box; background: #1a1a1a; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px auto; overflow: hidden; flex-shrink: 0;">
                    <img src="${boss.imageUrl || boss.image || `images/${bossId}.png`}" 
                         alt="${bossName}" 
                         data-fallback="${boss.imageUrl || boss.image || ''}"
                         style="max-width: 100%; max-height: 100%; object-fit: contain;"
                         onerror="if(this.dataset.fallback && this.dataset.fallback !== '' && this.src !== this.dataset.fallback) { this.src = this.dataset.fallback; } else if(this.src !== 'images/${bossId}.png') { this.src = 'images/${bossId}.png'; } else { this.style.display='none'; this.nextElementSibling.style.display='flex'; }"
                         onload="this.style.display='block'; if(this.nextElementSibling) this.nextElementSibling.style.display='none';">
                    <span style="font-size: 40px; display: none;">👹</span>
                </div>
                <div class="boss-info-card" style="text-align: center; color: #ffffff;">
                    <div class="boss-name" style="font-weight: 600; font-size: 14px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${bossName}</div>
                    <div class="boss-hp" data-base-hp="${baseHp}" style="font-size: 12px; color: #e0e0e0; margin-bottom: 4px;">HP: ${currentHp.toLocaleString()}</div>
                    <div class="boss-keys" style="font-size: 12px; color: #ffd700; margin-bottom: 6px;">
                        🔑 ${keysInfo.hasRequirements ? `${keysInfo.required}/${keysInfo.available}` : keysCount}
                    </div>
                    ${modeSelectorHtml}
                    ${comboModeSelectorHtml}
                    ${canAttack ? '<div class="available-indicator" style="font-size: 10px; color: #28a745; margin-top: 6px;">✓ Доступен</div>' : ''}
                </div>
            </div>
        `;
    });
    
    carousel.innerHTML = html;
    
    // Убеждаемся, что карусель правильно отображается
    carousel.style.display = 'flex';
    carousel.style.flexDirection = 'row';
    carousel.style.flexWrap = 'nowrap';
    carousel.style.gap = '12px';
    carousel.style.padding = '10px';
    carousel.style.overflowX = 'auto';
    carousel.style.overflowY = 'hidden';
    carousel.style.minHeight = '200px';
    
    // Обновляем карточки боссов
    updateBossCards();
}


// Инициализация каруселей (нативный скролл)
function initializeCarousels() {
    // Карусели используют нативный скролл браузера
    // Никаких кастомных обработчиков не требуется
    const carousels = document.querySelectorAll('.boss-carousel');
    carousels.forEach(carousel => {
        // Убеждаемся, что нативный скролл включен
        carousel.style.overflowX = 'auto';
        carousel.style.overflowY = 'hidden';
        // Убеждаемся, что карусель отображается как flex-контейнер
        carousel.style.display = 'flex';
        carousel.style.flexDirection = 'row';
        carousel.style.flexWrap = 'nowrap';
        carousel.style.gap = '12px';
        carousel.style.padding = '10px';
        carousel.style.minHeight = '200px';
    });
}

// Обновление режима босса через селектор
window.updateBossMode = function(bossId, mode) {
    const bossData = window.allBosses.find(b => b.id === bossId);
    if (!bossData) {
        console.warn(`Босс ${bossId} не найден`);
        return;
    }
    
    // Обновляем data-selected-mode в карточке
    // Это влияет только на будущие добавления босса, не на уже добавленные в порядке атаки
    const card = document.querySelector(`.boss-card[data-boss-id="${bossId}"]`);
    if (card) {
        card.dataset.selectedMode = mode;
        
        // Обновляем HP с учетом множителя режима
        const baseHp = parseInt(card.dataset.baseHp) || bossData.baseHp;
        const newHp = calculateBossHp(baseHp, mode);
        const hpElement = card.querySelector('.boss-hp');
        if (hpElement) {
            hpElement.textContent = `HP: ${newHp.toLocaleString()}`;
        }
    }
    
    // НЕ обновляем уже добавленные боссы в порядке атаки
    // Изменение режима в карточке влияет только на будущие добавления
}

// Обновление режима комбо для босса
window.updateBossComboMode = function(bossId, comboMode) {
    const bossData = window.allBosses.find(b => b.id === bossId);
    if (!bossData) {
        console.warn(`Босс ${bossId} не найден`);
        return;
    }
    
    // Если режим комбо не указан или пустая строка, устанавливаем по умолчанию "pacansky"
    if (!comboMode) {
        const availableComboModes = bossData.availableComboModes || getAvailableComboModes(bossData);
        const pacanskyComboMode = availableComboModes.find(m => m.key === 'pacansky');
        comboMode = pacanskyComboMode ? pacanskyComboMode.key : (availableComboModes.length > 0 ? availableComboModes[0].key : null);
    }
    
    // Обновляем data-selected-combo-mode в карточке
    // Это влияет только на будущие добавления босса, не на уже добавленные в порядке атаки
    const card = document.querySelector(`.boss-card[data-boss-id="${bossId}"]`);
    if (card) {
        card.dataset.selectedComboMode = comboMode || '';
    }
    
    // НЕ обновляем уже добавленные боссы в порядке атаки
    // Изменение режима комбо в карточке влияет только на будущие добавления
}

// Добавление босса в очередь атаки (каждый клик добавляет один экземпляр)
window.toggleBossSelection = function(bossId, bossName, mode = null) {
    const bossData = window.allBosses.find(b => b.id === bossId);
    if (!bossData) {
        console.warn(`Босс ${bossId} не найден`);
        return;
    }
    
    // Всегда берем режим из селектора на карточке
    const card = document.querySelector(`.boss-card[data-boss-id="${bossId}"]`);
    let selectedMode = null;
    let selectedComboMode = null;
    
    if (card) {
        // Пытаемся получить режим из селектора
        const selector = card.querySelector(`#boss-mode-${bossId}`);
        if (selector) {
            selectedMode = selector.value;
        } else if (card.dataset.selectedMode) {
            // Если селектора нет, берем из data-атрибута
            selectedMode = card.dataset.selectedMode;
        }
        
        // Пытаемся получить режим комбо из селектора
        const comboSelector = card.querySelector(`#boss-combo-mode-${bossId}`);
        if (comboSelector) {
            selectedComboMode = comboSelector.value || null;
        } else if (card.dataset.selectedComboMode) {
            selectedComboMode = card.dataset.selectedComboMode || null;
        }
    }
    
    // Если режим не найден, используем переданный или выбираем по умолчанию
    if (!selectedMode) {
        if (mode) {
            selectedMode = mode;
        } else {
            const availableModes = bossData.availableModes || getAvailableBattleModes(bossData);
            // По умолчанию выбираем "pacansky", если доступен
            const pacanskyMode = availableModes.find(m => m.key === 'pacansky');
            selectedMode = pacanskyMode ? pacanskyMode.key : (availableModes.length > 0 ? availableModes[0].key : null);
        }
    }
    
    // Если режим комбо не найден, устанавливаем по умолчанию "pacansky"
    if (!selectedComboMode) {
        const availableComboModes = bossData.availableComboModes || getAvailableComboModes(bossData);
        const pacanskyComboMode = availableComboModes.find(m => m.key === 'pacansky');
        selectedComboMode = pacanskyComboMode ? pacanskyComboMode.key : (availableComboModes.length > 0 ? availableComboModes[0].key : null);
    }
    
    if (!selectedMode) {
        console.warn(`Не удалось определить режим для босса ${bossId}`);
        return;
    }
    
    // Проверяем, есть ли уже такой же босс с таким же режимом и режимом комбо в конце списка
    const lastBoss = selectedBosses.length > 0 ? selectedBosses[selectedBosses.length - 1] : null;
    if (lastBoss && lastBoss.id === bossId && lastBoss.mode === selectedMode && lastBoss.comboMode === selectedComboMode) {
        // Если последний босс такой же - увеличиваем количество оружий
        lastBoss.weaponsCount = (lastBoss.weaponsCount || 1) + 1;
        console.log(`🔫 Увеличено количество оружий для ${bossName}: ${lastBoss.weaponsCount}`);
    } else {
        // Каждый клик добавляет один экземпляр босса в очередь
        selectedBosses.push({
            id: bossId,
            name: bossName,
            mode: selectedMode,
            comboMode: selectedComboMode,
            quantity: 1,
            weaponsCount: 1, // Количество оружий для этого босса (по умолчанию 1)
            weaponsUsed: 0   // Количество использованных оружий
        });
    }
    
    updateOrderCarousel();
}

// Обновление визуального состояния карточки босса (больше не используется, но оставляем для совместимости)
function updateBossCardSelection(bossId, isSelected) {
    // Карточки больше не меняют визуальное состояние при выборе
    // Каждый клик просто добавляет босса в очередь
}

// Обновление карусели порядка атаки
function updateOrderCarousel() {
    const orderCarousel = document.getElementById('carousel-order');
    if (!orderCarousel) return;
    
    if (selectedBosses.length === 0) {
        orderCarousel.innerHTML = `
            <div style="padding: 20px; text-align: center; color: var(--tg-theme-hint-color, #999);">
                Выберите боссов для атаки
            </div>
        `;
        return;
    }
    
    let html = '';
    selectedBosses.forEach((boss, index) => {
        const bossData = window.allBosses.find(b => b.id === boss.id);
        const modeName = boss.mode ? (BATTLE_MODE_INFO[boss.mode]?.name || boss.mode) : 'Не выбран';
        const modeMultiplier = boss.mode ? (BATTLE_MODE_INFO[boss.mode]?.multiplier || '') : '';
        const comboModeName = boss.comboMode ? (COMBO_MODE_INFO[boss.comboMode]?.name || boss.comboMode) : null;
        const comboModeColor = boss.comboMode ? getComboModeColor(boss.comboMode) : '#888';
        
        // Получаем доступные режимы комбо для этого босса
        const availableComboModes = bossData ? (bossData.availableComboModes || getAvailableComboModes(bossData)) : [];
        
        // Вычисляем HP с учетом множителя режима
        const baseHp = bossData ? bossData.baseHp : 0;
        const currentHp = boss.mode ? calculateBossHp(baseHp, boss.mode) : baseHp;
        
        html += `
            <div class="boss-card-order" 
                 data-boss-id="${boss.id}"
                 style="border: 2px solid #3390ec; background: linear-gradient(135deg, #2d3d5a 0%, #1e2a3a 100%); border-radius: 12px; padding: 10px; margin-right: 12px; min-width: 130px; position: relative;">
                <div style="position: absolute; top: 5px; right: 5px; background: #3390ec; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600;">${index + 1}</div>
                <div class="boss-image" style="width: 100px; height: 100px; min-width: 100px; max-width: 100px; min-height: 100px; max-height: 100px; box-sizing: border-box; background: #1a1a1a; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; overflow: hidden; flex-shrink: 0;">
                    <img src="${getBossImageUrl(boss.id, bossData)}" 
                         alt="${boss.name}" 
                         data-fallback="${getBossImageUrlFallback(boss.id, bossData)}"
                         style="max-width: 100%; max-height: 100%; object-fit: contain;"
                         onerror="if(this.dataset.fallback && this.dataset.fallback !== '' && this.src !== this.dataset.fallback) { this.src = this.dataset.fallback; } else { this.style.display='none'; this.nextElementSibling.style.display='flex'; }"
                         onload="this.style.display='block'; if(this.nextElementSibling) this.nextElementSibling.style.display='none';">
                    <span style="font-size: 40px; display: none;">👹</span>
                </div>
                <div class="boss-info-card" style="text-align: center; color: #ffffff;">
                    <div class="boss-name" style="font-weight: 600; font-size: 14px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${boss.name}</div>
                    <div style="font-size: 11px; color: #e0e0e0; margin-bottom: 4px;">HP: ${currentHp.toLocaleString()}</div>
                    <div style="font-size: 11px; color: #ffd700; margin-bottom: 4px; font-weight: 600;">Режим: ${modeName} ${modeMultiplier}</div>
                    ${comboModeName ? `<div style="font-size: 10px; color: ${comboModeColor}; margin-bottom: 4px; font-weight: 600;">Комбо: ${comboModeName}</div>` : '<div style="font-size: 10px; color: #888; margin-bottom: 4px;">Комбо: нет</div>'}
                    <div style="font-size: 10px; color: #ff6b6b; margin-bottom: 8px; font-weight: 600;">Атак: ${boss.weaponsCount || 1}</div>
                </div>
                <div style="display: flex; gap: 5px; margin-top: 8px; justify-content: center;">
                    <button onclick="moveBossInOrder(${index}, -1); event.stopPropagation();" 
                            style="padding: 4px 8px; font-size: 12px; background: #3d3d3d; color: #ffffff; border: 1px solid #555; border-radius: 4px; cursor: pointer; ${index === 0 ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
                            ${index === 0 ? 'disabled' : ''}>←</button>
                    <button onclick="removeBossFromOrder(${index}); event.stopPropagation();" 
                            style="padding: 4px 8px; font-size: 12px; background: #dc3545; color: #ffffff; border: 1px solid #555; border-radius: 4px; cursor: pointer;">✕</button>
                    <button onclick="moveBossInOrder(${index}, 1); event.stopPropagation();" 
                            style="padding: 4px 8px; font-size: 12px; background: #3d3d3d; color: #ffffff; border: 1px solid #555; border-radius: 4px; cursor: pointer; ${index === selectedBosses.length - 1 ? 'opacity: 0.5; cursor: not-allowed;' : ''}"
                            ${index === selectedBosses.length - 1 ? 'disabled' : ''}>→</button>
                </div>
            </div>
        `;
    });
    
    orderCarousel.innerHTML = html;
}

// Перемещение босса в порядке атаки по индексу
window.moveBossInOrder = function(index, direction) {
    if (index < 0 || index >= selectedBosses.length) return;
    
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= selectedBosses.length) return;
    
    [selectedBosses[index], selectedBosses[newIndex]] = [selectedBosses[newIndex], selectedBosses[index]];
    updateOrderCarousel();
}

// Удаление босса из порядка атаки по индексу
window.removeBossFromOrder = function(index) {
    if (index >= 0 && index < selectedBosses.length) {
        selectedBosses.splice(index, 1);
        updateOrderCarousel();
    }
}

// Обновление режима комбо для босса в порядке атаки
window.updateBossComboModeInOrder = function(index, comboMode) {
    if (index < 0 || index >= selectedBosses.length) return;
    
    const boss = selectedBosses[index];
    // Если режим комбо не указан или пустая строка, устанавливаем по умолчанию "pacansky"
    let newComboMode = comboMode || null;
    if (!newComboMode) {
        const bossData = window.allBosses.find(b => b.id === boss.id);
        if (bossData) {
            const availableComboModes = bossData.availableComboModes || getAvailableComboModes(bossData);
            const pacanskyComboMode = availableComboModes.find(m => m.key === 'pacansky');
            newComboMode = pacanskyComboMode ? pacanskyComboMode.key : (availableComboModes.length > 0 ? availableComboModes[0].key : null);
        }
    }
    
    // Если режим комбо не изменился, ничего не делаем
    if (boss.comboMode === newComboMode) {
        return;
    }
    
    // Проверяем, есть ли перед текущей записью такая же комбинация (id, mode, новый comboMode)
    // Если есть, объединяем с ней
    let merged = false;
    for (let i = 0; i < index; i++) {
        const prevBoss = selectedBosses[i];
        if (prevBoss.id === boss.id && 
            prevBoss.mode === boss.mode && 
            prevBoss.comboMode === newComboMode) {
            // Объединяем: увеличиваем количество оружий у предыдущей записи
            prevBoss.weaponsCount = (prevBoss.weaponsCount || 1) + (boss.weaponsCount || 1);
            // Удаляем текущую запись
            selectedBosses.splice(index, 1);
            merged = true;
            break;
        }
    }
    
    // Если не объединили, проверяем следующую запись
    if (!merged) {
        // Проверяем, есть ли после текущей записи такая же комбинация
        for (let i = index + 1; i < selectedBosses.length; i++) {
            const nextBoss = selectedBosses[i];
            if (nextBoss.id === boss.id && 
                nextBoss.mode === boss.mode && 
                nextBoss.comboMode === newComboMode) {
                // Объединяем: увеличиваем количество оружий у следующей записи
                nextBoss.weaponsCount = (nextBoss.weaponsCount || 1) + (boss.weaponsCount || 1);
                // Удаляем текущую запись
                selectedBosses.splice(index, 1);
                merged = true;
                break;
            }
        }
    }
    
    // Если не объединили ни с кем, просто обновляем режим комбо
    if (!merged) {
        boss.comboMode = newComboMode;
    }
    
    updateOrderCarousel();
}


// Начало автоматической атаки
window.startBossAutoAttack = async function() {
    if (selectedBosses.length === 0) {
        tg.showAlert('Выберите хотя бы одного босса для атаки');
        return;
    }
    
    // Проверяем, что у всех боссов выбран режим
    const bossesWithoutMode = selectedBosses.filter(boss => !boss.mode);
    if (bossesWithoutMode.length > 0) {
        tg.showAlert(`У следующих боссов не выбран режим: ${bossesWithoutMode.map(b => b.name).join(', ')}`);
        return;
    }
    
    const bossList = selectedBosses.map(b => `${b.name} (${BATTLE_MODE_INFO[b.mode]?.name || b.mode})`).join(', ');
    const confirmed = await new Promise(resolve => {
        tg.showConfirm(`Начать атаку на ${selectedBosses.length} боссов?\n\n${bossList}`, resolve);
    });
    
    if (!confirmed) return;
    
    isAttacking = true;
    currentBossIndex = 0;
    
    document.getElementById('start-boss-attack-btn').style.display = 'none';
    document.getElementById('stop-boss-attack-btn').style.display = 'block';
    document.getElementById('boss-attack-status').style.display = 'block';
    
    // Убеждаемся, что секция выбора боссов всегда видна
    const bossSelectSection = document.getElementById('boss-select-section');
    if (bossSelectSection) {
        bossSelectSection.style.display = 'block';
    }
    const bossListContainer = document.getElementById('boss-list-container');
    if (bossListContainer) {
        bossListContainer.style.display = 'block';
    }
    
    // Запускаем периодическое обновление данных боссов (каждые 10 секунд)
    startBossDataUpdate();
    
    attackNextBoss();
}

// Атака следующего босса
async function attackNextBoss() {
    if (!isAttacking || currentBossIndex >= selectedBosses.length) {
        stopBossAutoAttack();
        return;
    }
    
    const boss = selectedBosses[currentBossIndex];
    const mode = boss.mode;
    const modeName = BATTLE_MODE_INFO[mode]?.name || mode;
    const weaponsCount = boss.weaponsCount || 1;
    const weaponsUsed = boss.weaponsUsed || 0;
    const currentWeapon = weaponsUsed + 1;
    updateAttackStatus(`Атака на ${boss.name} (${modeName}) - Атака ${currentWeapon}/${weaponsCount} (${currentBossIndex + 1}/${selectedBosses.length})...`);
    
    try {
        let token = await getAccessToken();
        if (!token) {
            throw new Error('Токен не найден');
        }
        
        // Используем прокси если есть
        const apiUrl = API_SERVER_URL || GAME_API_URL;
        
        // Начинаем атаку
        // ВАЖНО: Используем getApiHeaders() для получения актуального токена из localStorage
        let response = await fetch(`${apiUrl}/boss/start-attack`, {
            method: 'POST',
            headers: await getApiHeaders(),
            body: JSON.stringify({
                bossId: boss.id,
                mode: mode,
                comboMode: boss.comboMode || null
            })
        });
        
        // Обработка 401/403 - обновляем токен через initData из БД
        if (response.status === 401 || response.status === 403) {
            const currentInitData = await getCurrentInitData();
            if (currentInitData && currentInitData.trim()) {
                const newToken = await loginWithInitData();
                if (newToken) {
                    // ВАЖНО: loginWithInitData() уже сохранил токен в localStorage
                    // Используем getApiHeaders() для получения актуального токена
                    response = await fetch(`${apiUrl}/boss/start-attack`, {
                        method: 'POST',
                        headers: await getApiHeaders(),
                        body: JSON.stringify({
                            bossId: boss.id,
                            mode: mode,
                            comboMode: null
                        })
                    });
                }
            }
        }
        
        const data = await response.json();
        
        // Обработка 400 с "Session already active"
        if (!response.ok && response.status === 400 && data.message === "Session already active") {
            // Бой еще продолжается, проверяем статус через bootstrap
            // НЕ переходим к следующему боссу, остаемся на текущем индексе
            const weaponsUsed = boss.weaponsUsed || 0;
            const weaponsCount = boss.weaponsCount || 1;
            updateAttackStatus(`⚔️ Бой с ${boss.name} уже активен. Проверка статуса через bootstrap... (Атака ${weaponsUsed + 1}/${weaponsCount})`);
            
            bossAttackInterval = setTimeout(() => {
                // Проверяем статус через bootstrap вместо повторной атаки
                checkBossBattleStatus(boss.id, boss.mode, null);
            }, 5000);
            return;
        }
        
        // Обработка ошибок лимита или нехватки ключей
        if (!response.ok || !data.success) {
            const errorMessage = data.message || data.error || 'Неизвестная ошибка';
            const lowerMessage = errorMessage.toLowerCase();
            
            // Проверяем, является ли это ошибкой лимита или нехватки ключей
            if (lowerMessage.includes('limit') || 
                lowerMessage.includes('лимит') || 
                lowerMessage.includes('key') || 
                lowerMessage.includes('ключ') ||
                lowerMessage.includes('not enough') ||
                lowerMessage.includes('недостаточно')) {
                // Удаляем все экземпляры этого босса из списка и переходим к следующему
                updateAttackStatus(`⚠️ ${boss.name}: ${errorMessage}. Переход к следующему боссу...`);
                
                // Удаляем все экземпляры текущего босса
                const currentBossId = boss.id;
                selectedBosses = selectedBosses.filter(b => b.id !== currentBossId);
                updateOrderCarousel();
                
                // Если список не пуст, продолжаем атаку, иначе останавливаемся
                // Индекс остается на месте, так как следующий босс займет это место
                if (currentBossIndex >= selectedBosses.length) {
                    currentBossIndex = 0;
                }
                
                setTimeout(() => {
                    attackNextBoss();
                }, 2000);
                return;
            }
            
            // Для других ошибок выбрасываем исключение
            throw new Error(errorMessage);
        }
        
        // Обновляем информацию о боссе и ключи после start-attack
        if (data.success && data.session) {
            await Promise.all([
                updateBossKeys(),
                loadBossInfo()
            ]);
        }
        
        if (data.success) {
            // После успешного start-attack всегда проверяем bootstrap для отслеживания статуса
            // Не проверяем isOver здесь, так как статус будем проверять через bootstrap
            if (data.isOver) {
                // Если бой уже завершен сразу после start-attack, проверяем награду через bootstrap
                const weaponsUsed = boss.weaponsUsed || 0;
                const weaponsCount = boss.weaponsCount || 1;
                updateAttackStatus(`⚔️ Бой с ${boss.name} завершен. Проверка награды через bootstrap... (Атака ${weaponsUsed + 1}/${weaponsCount})`);
                
                // Проверяем статус через bootstrap сразу
                bossAttackInterval = setTimeout(() => {
                    checkBossBattleStatus(boss.id, boss.mode, data.sessionId);
                }, 1000);
            } else if (data.sessionId || data.session) {
                // Успешно напали, бой продолжается - проверяем статус через bootstrap каждые 5 секунд
                // НЕ переходим к следующему боссу, остаемся на текущем
                const weaponsUsed = boss.weaponsUsed || 0;
                const weaponsCount = boss.weaponsCount || 1;
                updateAttackStatus(`⚔️ Бой с ${boss.name} начат. Проверка статуса через bootstrap... (Атака ${weaponsUsed + 1}/${weaponsCount})`);
                
                // Проверяем статус через bootstrap через 5 секунд
                bossAttackInterval = setTimeout(() => {
                    checkBossBattleStatus(boss.id, boss.mode, data.sessionId);
                }, 5000);
            } else {
                // Неожиданный ответ - удаляем текущего босса и переходим к следующему
                updateAttackStatus(`⚠️ Неожиданный ответ от сервера для ${boss.name}`);
                if (currentBossIndex < selectedBosses.length) {
                    selectedBosses.splice(currentBossIndex, 1);
                    updateOrderCarousel();
                }
                if (currentBossIndex >= selectedBosses.length) {
                    currentBossIndex = 0;
                }
                setTimeout(() => {
                    attackNextBoss();
                }, 2000);
            }
        } else {
            throw new Error(data.error || 'Неизвестная ошибка');
        }
        
    } catch (error) {
        console.error('Ошибка атаки босса:', error);
        updateAttackStatus(`❌ Ошибка атаки ${boss.name}: ${error.message}`);
        
        // Удаляем текущего босса и переходим к следующему при ошибке
        if (currentBossIndex < selectedBosses.length) {
            selectedBosses.splice(currentBossIndex, 1);
            updateOrderCarousel();
        }
        if (currentBossIndex >= selectedBosses.length) {
            currentBossIndex = 0;
        }
        setTimeout(() => {
            attackNextBoss();
        }, 2000);
    }
}

// Проверка статуса боя через bootstrap
async function checkBossBattleStatus(bossId, mode, sessionId, retryCount = 0) {
    if (!isAttacking) return;
    
    // Получаем режим из selectedBosses, если не передан
    if (!mode) {
        const boss = selectedBosses.find(b => b.id === bossId);
        if (boss && boss.mode) {
            mode = boss.mode;
        } else {
            console.error(`Режим не найден для босса ${bossId}`);
            return;
        }
    }
    
    const maxRetries = 7;  // Максимум попыток при таймауте
    
    try {
        let token = await getAccessToken();
        if (!token) {
            throw new Error('Токен не найден');
        }
        
        const apiUrl = API_SERVER_URL || GAME_API_URL;
        // ВАЖНО: Используем bootstrap для проверки статуса, а не start-attack
        let response = await fetch(`${apiUrl}/boss/bootstrap`, {
            method: 'GET',
            headers: await getApiHeaders()
        });
        
        // Обработка 401/403 - обновляем токен через initData из БД
        if (response.status === 401 || response.status === 403) {
            const currentInitData = await getCurrentInitData();
            if (currentInitData && currentInitData.trim()) {
                const newToken = await loginWithInitData();
                if (newToken) {
                    // ВАЖНО: loginWithInitData() уже сохранил токен в localStorage
                    // Используем getApiHeaders() для получения актуального токена
                    response = await fetch(`${apiUrl}/boss/bootstrap`, {
                        method: 'GET',
                        headers: await getApiHeaders()
                    });
                }
            }
        }
        
        // Обработка таймаутов (504 Gateway Timeout или 999 Internal Error)
        if (response.status === 504 || response.status === 999) {
            if (retryCount < maxRetries) {
                const boss = selectedBosses[currentBossIndex];
                const errorText = await response.text();
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { message: 'Таймаут на стороне сервера' };
                }
                const errorMessage = errorData.message || errorData.error || 'Таймаут на стороне сервера';
                
                updateAttackStatus(`⏱️ Таймаут при проверке статуса ${boss?.name || 'босса'}. Повторяем попытку ${retryCount + 1}/${maxRetries}...`);
                console.warn(`Таймаут при проверке статуса боя, попытка ${retryCount + 1}/${maxRetries}: ${errorMessage}`);
                
                // Ждем перед повторной попыткой (увеличиваем задержку при повторных попытках)
                await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
                
                // Повторяем попытку
                return checkBossBattleStatus(bossId, mode, sessionId, retryCount + 1);
            } else {
                throw new Error(`Таймаут при проверке статуса после ${maxRetries} попыток`);
            }
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Проверяем, это таймаут в сообщении об ошибке?
        if (data && !data.success) {
            const errorText = data.message || data.error || '';
            if ((errorText.toLowerCase().includes('таймаут') || errorText.toLowerCase().includes('timeout')) && retryCount < maxRetries) {
                const boss = selectedBosses[currentBossIndex];
                updateAttackStatus(`⏱️ Таймаут при проверке статуса ${boss?.name || 'босса'}. Повторяем попытку ${retryCount + 1}/${maxRetries}...`);
                console.warn(`Таймаут при проверке статуса боя, попытка ${retryCount + 1}/${maxRetries}: ${errorText}`);
                
                // Ждем перед повторной попыткой
                await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
                
                // Повторяем попытку
                return checkBossBattleStatus(bossId, mode, sessionId, retryCount + 1);
            }
        }
        
        // Обновляем ключи из bootstrap
        if (data.success) {
            await updateBossKeys();
        }
        
        // Проверяем hasReward в bootstrap
        const hasReward = data.success && data.hasReward === true;
        const boss = selectedBosses[currentBossIndex];
        
        if (hasReward) {
            // Награда готова - собираем её
            console.log('💰 Награда готова, собираем...');
            updateAttackStatus(`✅ ${boss.name} побежден! Сбор награды...`);
            
            // Очищаем интервал проверки статуса перед сбором награды
            if (bossAttackInterval) {
                clearTimeout(bossAttackInterval);
                bossAttackInterval = null;
            }
            
            try {
                const rewardData = await collectBossRewards();
                const rewardMessageHtml = formatRewardMessage(rewardData, 'html');
                const rewardMessageText = formatRewardMessage(rewardData, 'text');
                updateAttackStatus(rewardMessageHtml);
                
                // Показываем модальное окно с наградой
                showCustomModal(rewardMessageText);
                
                // Увеличиваем счетчик использованных оружий
                if (boss) {
                    boss.weaponsUsed = (boss.weaponsUsed || 0) + 1;
                    const weaponsCount = boss.weaponsCount || 1;
                    const weaponsUsed = boss.weaponsUsed || 0;
                    
                    console.log(`Атака ${weaponsUsed}/${weaponsCount} завершена для ${boss.name}`);
                    
                    // Если еще есть атаки для текущего босса, начинаем следующую
                    if (weaponsUsed < weaponsCount) {
                        updateAttackStatus(`Атака ${weaponsUsed}/${weaponsCount} завершена. Начинаем атаку ${weaponsUsed + 1}/${weaponsCount}...`);
                        // Небольшая задержка перед следующей атакой
                        setTimeout(() => {
                            attackNextBoss();
                        }, 1000);
                    } else {
                        // Все атаки использованы - удаляем босса и переходим к следующему
                        updateAttackStatus(`✅ Все атаки (${weaponsCount}) завершены для ${boss.name}. Переход к следующему боссу...`);
                        
                        // Удаляем текущего босса из очереди
                        if (currentBossIndex < selectedBosses.length) {
                            selectedBosses.splice(currentBossIndex, 1);
                            updateOrderCarousel();
                        }
                        
                        // Проверяем, есть ли еще боссы
                        if (selectedBosses.length === 0) {
                            // Это был последний босс - останавливаем автоатаку
                            updateAttackStatus(`✅ Все боссы обработаны. Автоатака завершена.`);
                            stopBossAutoAttack();
                        } else {
                            // Есть еще боссы - переходим к следующему
                            if (currentBossIndex >= selectedBosses.length) {
                                currentBossIndex = 0;
                            }
                            setTimeout(() => {
                                attackNextBoss();
                            }, 1000);
                        }
                    }
                } else {
                    // Босс не найден - переходим к следующему
                    if (currentBossIndex < selectedBosses.length) {
                        selectedBosses.splice(currentBossIndex, 1);
                        updateOrderCarousel();
                    }
                    
                    // Проверяем, есть ли еще боссы
                    if (selectedBosses.length === 0) {
                        updateAttackStatus(`✅ Все боссы обработаны. Автоатака завершена.`);
                        stopBossAutoAttack();
                    } else {
                        if (currentBossIndex >= selectedBosses.length) {
                            currentBossIndex = 0;
                        }
                        setTimeout(() => {
                            attackNextBoss();
                        }, 1000);
                    }
                }
            } catch (error) {
                console.error('Ошибка сбора награды:', error);
                updateAttackStatus(`⚠️ Не удалось собрать награду с ${boss.name}: ${error.message}`);
                // При ошибке сбора награды все равно переходим к следующей атаке или боссу
                if (boss) {
                    boss.weaponsUsed = (boss.weaponsUsed || 0) + 1;
                    const weaponsCount = boss.weaponsCount || 1;
                    const weaponsUsed = boss.weaponsUsed || 0;
                    
                    if (weaponsUsed < weaponsCount) {
                        setTimeout(() => {
                            attackNextBoss();
                        }, 2000);
                    } else {
                        // Удаляем текущего босса из очереди
                        if (currentBossIndex < selectedBosses.length) {
                            selectedBosses.splice(currentBossIndex, 1);
                            updateOrderCarousel();
                        }
                        
                        // Проверяем, есть ли еще боссы
                        if (selectedBosses.length === 0) {
                            updateAttackStatus(`✅ Все боссы обработаны. Автоатака завершена.`);
                            stopBossAutoAttack();
                        } else {
                            if (currentBossIndex >= selectedBosses.length) {
                                currentBossIndex = 0;
                            }
                            setTimeout(() => {
                                attackNextBoss();
                            }, 2000);
                        }
                    }
                } else {
                    // Босс не найден - переходим к следующему
                    if (currentBossIndex < selectedBosses.length) {
                        selectedBosses.splice(currentBossIndex, 1);
                        updateOrderCarousel();
                    }
                    
                    // Проверяем, есть ли еще боссы
                    if (selectedBosses.length === 0) {
                        updateAttackStatus(`✅ Все боссы обработаны. Автоатака завершена.`);
                        stopBossAutoAttack();
                    } else {
                        if (currentBossIndex >= selectedBosses.length) {
                            currentBossIndex = 0;
                        }
                        setTimeout(() => {
                            attackNextBoss();
                        }, 2000);
                    }
                }
            }
        } else {
            // Награда еще не готова - проверяем снова через 5 секунд
            const weaponsUsed = boss ? (boss.weaponsUsed || 0) : 0;
            const weaponsCount = boss ? (boss.weaponsCount || 1) : 1;
            updateAttackStatus(`⚔️ Бой с ${boss.name} продолжается... (Атака ${weaponsUsed + 1}/${weaponsCount})`);
            
            bossAttackInterval = setTimeout(() => {
                checkBossBattleStatus(bossId, mode, sessionId);
            }, 5000);
        }
        
    } catch (error) {
        console.error('Ошибка проверки статуса боя:', error);
        const boss = selectedBosses[currentBossIndex];
        
        // Проверяем, это таймаут?
        const errorMessage = error.message || error.toString();
        const isTimeout = errorMessage.toLowerCase().includes('таймаут') || 
                         errorMessage.toLowerCase().includes('timeout') ||
                         errorMessage.toLowerCase().includes('504') ||
                         errorMessage.toLowerCase().includes('999');
        
        // Если это таймаут и еще есть попытки, повторяем
        if (isTimeout && retryCount < maxRetries) {
            updateAttackStatus(`⏱️ Таймаут при проверке статуса ${boss?.name || 'босса'}. Повторяем попытку ${retryCount + 1}/${maxRetries}...`);
            console.warn(`Таймаут при проверке статуса боя, попытка ${retryCount + 1}/${maxRetries}: ${errorMessage}`);
            
            // Ждем перед повторной попыткой
            await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
            
            // Повторяем попытку
            return checkBossBattleStatus(bossId, mode, sessionId, retryCount + 1);
        }
        
        // Если это не таймаут или попытки исчерпаны, обрабатываем как обычную ошибку
        updateAttackStatus(`❌ Ошибка проверки статуса ${boss?.name || 'босса'}: ${error.message}`);
        
        // Удаляем текущего босса и переходим к следующему только если это не таймаут
        // При таймауте продолжаем проверку статуса
        if (!isTimeout) {
            if (currentBossIndex < selectedBosses.length) {
                selectedBosses.splice(currentBossIndex, 1);
                updateOrderCarousel();
            }
            if (currentBossIndex >= selectedBosses.length) {
                currentBossIndex = 0;
            }
            setTimeout(() => {
                attackNextBoss();
            }, 2000);
        } else {
            // При таймауте после всех попыток продолжаем проверку через 5 секунд
            const boss = selectedBosses[currentBossIndex];
            const weaponsUsed = boss ? (boss.weaponsUsed || 0) : 0;
            const weaponsCount = boss ? (boss.weaponsCount || 1) : 1;
            updateAttackStatus(`⚠️ Таймаут после ${maxRetries} попыток. Повторная проверка через 5 секунд... (Атака ${weaponsUsed + 1}/${weaponsCount})`);
            
            bossAttackInterval = setTimeout(() => {
                checkBossBattleStatus(bossId, mode, sessionId, 0);  // Сбрасываем счетчик попыток
            }, 5000);
        }
    }
}

// Остановка автоматической атаки
window.stopBossAutoAttack = function() {
    isAttacking = false;
    
    if (bossAttackInterval) {
        clearTimeout(bossAttackInterval);
        bossAttackInterval = null;
    }
    
    // Останавливаем обновление данных боссов
    stopBossDataUpdate();
    
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

// Запуск периодического обновления данных боссов во время автоатаки
function startBossDataUpdate() {
    // Останавливаем предыдущий интервал, если он был
    stopBossDataUpdate();
    
    // Обновляем данные сразу при старте
    updateBossDataDuringAttack();
    
    // Затем обновляем каждые 10 секунд
    bossDataUpdateInterval = setInterval(() => {
        if (isAttacking) {
            updateBossDataDuringAttack();
        } else {
            stopBossDataUpdate();
        }
    }, 10000);  // 10 секунд
}

// Остановка периодического обновления данных боссов
function stopBossDataUpdate() {
    if (bossDataUpdateInterval) {
        clearInterval(bossDataUpdateInterval);
        bossDataUpdateInterval = null;
    }
}

// Обновление данных боссов во время автоатаки
async function updateBossDataDuringAttack() {
    if (!isAttacking) return;
    
    try {
        // Обновляем ключи из bootstrap
        await updateBossKeys();
        
        // Обновляем карточки боссов
        const cards = document.querySelectorAll('.boss-card');
        if (cards.length > 0) {
            updateBossCards();
        }
        
        console.log('✅ Данные боссов обновлены во время автоатаки');
    } catch (error) {
        console.warn('⚠️ Ошибка обновления данных боссов во время автоатаки:', error);
        // Не прерываем автоатаку из-за ошибки обновления данных
    }
}

// Форматирование награды для отображения
function formatRewardMessage(rewardData, format = 'html') {
    if (!rewardData || !rewardData.rewards) {
        return 'Награда получена';
    }
    
    const rewards = rewardData.rewards;
    const bossName = rewards.title || 'босса';
    
    if (format === 'text') {
        // Текстовый формат для модального окна и уведомлений
        const parts = [`💰 Награда с босса "${bossName}" получена!`];
        
        if (rewards.globalReward) {
            const gr = rewards.globalReward;
            const rewardParts = [];
            
            if (gr.authority) {
                rewardParts.push(`Авторитет: ${gr.authority.toLocaleString()}`);
            }
            if (gr.keys) {
                rewardParts.push(`Ключи: ${gr.keys}`);
            }
            if (gr.currencies && gr.currencies.length > 0) {
                const currencyNames = {
                    'sugar': 'Сахар',
                    'cigarettes': 'Папиросы',
                    'money': 'Деньги',
                    'rubles': 'Рубли'
                };
                const currencies = gr.currencies.map(c => {
                    const name = currencyNames[c.type] || c.type;
                    return `${name}: ${c.amount.toLocaleString()}`;
                }).join(', ');
                rewardParts.push(currencies);
            }
            
            if (rewardParts.length > 0) {
                parts.push(`\n\nПолучено:\n${rewardParts.join('\n')}`);
            }
        }
        
        return parts.join('');
    } else {
        // HTML формат для встраивания в интерфейс
        const parts = [`💰 Награда с босса "${bossName}" получена!`];
        
        if (rewards.globalReward) {
            const gr = rewards.globalReward;
            const rewardParts = [];
            
            if (gr.authority) {
                rewardParts.push(`Авторитет: ${gr.authority.toLocaleString()}`);
            }
            if (gr.keys) {
                rewardParts.push(`Ключи: ${gr.keys}`);
            }
            if (gr.currencies && gr.currencies.length > 0) {
                const currencyNames = {
                    'sugar': 'Сахар',
                    'cigarettes': 'Папиросы',
                    'money': 'Деньги',
                    'rubles': 'Рубли'
                };
                const currencies = gr.currencies.map(c => {
                    const name = currencyNames[c.type] || c.type;
                    return `${name}: ${c.amount.toLocaleString()}`;
                }).join(', ');
                rewardParts.push(currencies);
            }
            
            if (rewardParts.length > 0) {
                parts.push(`<br><strong>Получено:</strong> ${rewardParts.join(', ')}`);
            }
        }
        
        return parts.join('');
    }
}

// Сбор награды с босса
async function collectBossRewards() {
    try {
        let token = await getAccessToken();
        if (!token) {
            throw new Error('Токен не найден');
        }
        
        const apiUrl = API_SERVER_URL || GAME_API_URL;
        let response = await fetch(`${apiUrl}/boss/rewards`, {
            method: 'GET',
            headers: await getApiHeaders()
        });
        
        // Обработка 401/403 - обновляем токен через initData из БД
        if (response.status === 401 || response.status === 403) {
            const currentInitData = await getCurrentInitData();
            if (currentInitData && currentInitData.trim()) {
                const newToken = await loginWithInitData();
                if (newToken) {
                    response = await fetch(`${apiUrl}/boss/rewards`, {
                        method: 'GET',
                        headers: await getApiHeaders()
                    });
                }
            }
        }
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            console.log('✅ Награда с босса собрана:', data);
            return data;
        } else {
            throw new Error(data.error || 'Не удалось собрать награду');
        }
        
    } catch (error) {
        console.error('Ошибка сбора награды с босса:', error);
        throw error;
    }
}

// ==================== КОМБО АТАКА ====================

// Маппинг русских названий оружий на API названия
const WEAPON_MAPPING = {
    // Финка
    'фин': 'knife',
    'финка': 'knife',
    'заточка': 'knife',
    
    // Самопал
    'пал': 'gunshot',
    'палка': 'gunshot',
    'паль': 'gunshot', // опечатка
    'сапомал': 'gunshot',
    'самопал': 'gunshot',
    'шмальнуть из самопала': 'gunshot',
    'шмальнуть из сапомала': 'gunshot',
    
    // Яд
    'яд': 'poison',
    'ядов': 'poison',
    'подкинуть яда': 'poison',
    'подкинуть яд': 'poison',
    
    // Грудь
    'грудь': 'punchchest',
    'солнышко': 'punchchest',
    'пыр': 'punchchest',
    'удар в грудь': 'punchchest',
    'пыр в солнышко': 'punchchest',
    
    // Колено в ухо
    'колено': 'kneeear',
    'ухо': 'kneeear',
    'коленом': 'kneeear',
    'коленом в ухо': 'kneeear',
    
    // Глаза
    'глаз': 'pokeeyes',
    'глаза': 'pokeeyes',
    'в глаз': 'pokeeyes',
    'пальцы': 'pokeeyes',
    'пальцем в глаз': 'pokeeyes',
    'тычок в глаза': 'pokeeyes',
    'тычок в глаз': 'pokeeyes',
    
    // Пах
    'пах': 'kickballs',
    'в пах': 'kickballs',
    'удар в пах': 'kickballs',
    
    // Режимы комбо (не оружия)
    'блат': 'blotnoy',
    'пац': 'pacansky',
    'авторитетный': 'avtoritetny',
    'авторитетные': 'avtoritetny'
};

// Обратный маппинг: API названия -> русские названия для отображения
const WEAPON_DISPLAY_NAMES = {
    'knife': 'финка',
    'gunshot': 'самопал',
    'poison': 'яд',
    'punchchest': 'грудь',
    'kneeear': 'коленом в ухо',
    'pokeeyes': 'в глаз',
    'kickballs': 'удар в пах'
};

// Маппинг режимов комбо
const COMBO_MODE_MAPPING = {
    'блат': 'blotnoy',
    'блатной': 'blotnoy',
    'пац': 'pacansky',
    'пацанский': 'pacansky',
    'авто': 'avtoritetny',
    'авторитетный': 'avtoritetny',
    'авторитетные': 'avtoritetny'
};

// Глобальные переменные для комбо
let loadedCombos = []; // [{bossName, mode, comboMode, weapons: []}]
let selectedCombo = null;
let isComboAttacking = false;
let currentComboWeaponIndex = 0;
let currentComboBossId = null;
let currentComboMode = null;
let currentComboComboMode = null;
let totalSpentRubles = 0; // Общая сумма потраченных рублей на восстановление

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

// Обработка загрузки файла с комбо
async function handleComboFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        let text = await file.text();
        
        // Проверяем, является ли файл RTF (содержит RTF-разметку)
        if (text.includes('\\u') || text.includes('\\uc0') || text.includes('\\expnd') || text.includes('\\kerning')) {
            console.log('Обнаружена RTF-разметка, очищаем...');
            text = cleanRtfText(text);
            console.log('Очищенный текст:', text);
        }
        
        await loadCombosFromText(text);
        
    } catch (error) {
        console.error('Ошибка загрузки файла:', error);
        tg.showAlert('Ошибка загрузки файла: ' + error.message);
    }
}

// Загрузка комбо из текста (общая функция для файла и текстового поля)
async function loadCombosFromText(text) {
    if (!text || !text.trim()) {
        tg.showAlert('Текст комбо пуст');
        return;
    }
    
    loadedCombos = parseComboFile(text);
    
    if (loadedCombos.length === 0) {
        tg.showAlert('Не удалось распарсить комбо из текста. Проверьте формат.\n\nФормат: имя_босса режим удар1 удар2 ...; имя_босса2 режим удар1 удар2 ...\nПример: палыч пац фин глаз грудь ухо пах яд; махно блат пал пах фин');
        return;
    }
    
    // Убеждаемся, что список боссов загружен
    if (!window.bossCategoriesData || Object.keys(window.bossCategoriesData).length === 0) {
        console.log('📋 Список боссов не загружен, загружаем...');
        await loadBossList();
        // Ждем немного, чтобы данные успели обработаться
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Показываем список загруженных комбо
    displayLoadedCombos();
    
    // Показываем выбор боссов
    displayComboBossSelection();
}

// Парсинг комбо из текстового поля
window.parseComboFromText = async function() {
    const textInput = document.getElementById('combo-text-input');
    if (!textInput) return;
    
    const text = textInput.value.trim();
    if (!text) {
        tg.showAlert('Введите комбо в текстовое поле');
        return;
    }
    
    await loadCombosFromText(text);
}

// Парсинг файла с комбо
function parseComboFile(text) {
    const combos = [];
    const lines = text.split('\n').map(l => l.trim()).filter(l => l);
    
    let currentBossName = null;
    let currentComboMode = null;
    let currentMode = null;
    let currentWeapons = [];
    
    // Функция для проверки, является ли строка разделителем
    function isSeparator(line) {
        // Проверяем на разделители типа ➖➖➖➖➖➖➖➖➖➖
        return /^[➖\-─=]+$/.test(line) || line.length < 3;
    }
    
    // Функция для проверки, является ли строка заголовком (не комбо)
    function isHeader(line) {
        // Заголовки типа "Комбо на 10.11.25 👇 БЕСПРЕДЕЛЬЩИКИ"
        return /^комбо\s+на/i.test(line) || 
               /^👇/i.test(line) ||
               /^(беспредельщики|вертухаи|боссы)/i.test(line);
    }
    
    // Функция для парсинга оружия из строки
    function parseWeaponFromLine(line) {
        // Убираем нумерацию в начале (1.пах, 1. пах, 1 пах, 1)пах)
        // Сначала обрабатываем формат с точкой/скобкой без пробела
        line = line.replace(/^\d+[\.\)]([^\s])/, '$1'); // 1.пах -> пах
        // Затем обрабатываем формат с пробелом
        line = line.replace(/^\d+[\.\)]\s+/, ''); // 1. пах -> пах
        // Обрабатываем формат без точки/скобки
        line = line.replace(/^\d+\s+/, ''); // 1 пах -> пах
        line = line.trim();
        
        const parts = line.split(/\s+/).filter(p => p);
        if (parts.length === 0) return null;
        
        // Пробуем распарсить как оружие
        let weaponName = parts.join(' ').toLowerCase();
        const apiWeapon = parseWeaponName(weaponName);
        
        if (apiWeapon) {
            return apiWeapon;
        }
        
        // Если не нашли, пробуем первое слово
        if (parts.length > 0) {
            weaponName = parts[0].toLowerCase();
            const singleWeapon = parseWeaponName(weaponName);
            if (singleWeapon) {
                return singleWeapon;
            }
        }
        
        return null;
    }
    
    // Функция для определения, является ли строка заголовком комбо (имя босса + режим)
    function parseComboHeader(line) {
        const parts = line.split(/\s+/).filter(p => p);
        if (parts.length < 2) return null;
        
        // Пробуем найти режим комбо в последних словах
        for (let i = parts.length - 1; i >= 0; i--) {
            const word = parts[i].toLowerCase();
            
            // Проверяем режим комбо
            if (COMBO_MODE_MAPPING[word]) {
                const bossName = parts.slice(0, i).join(' ').toLowerCase();
                if (bossName) {
                    return {
                        bossName: bossName,
                        comboMode: COMBO_MODE_MAPPING[word],
                        mode: null
                    };
                }
            }
            
            // Проверяем режим атаки
            const foundMode = Object.keys(BATTLE_MODE_INFO).find(key => 
                BATTLE_MODE_INFO[key].name.toLowerCase().includes(word) ||
                key.toLowerCase() === word
            );
            if (foundMode) {
                const bossName = parts.slice(0, i).join(' ').toLowerCase();
                if (bossName) {
                    return {
                        bossName: bossName,
                        comboMode: null,
                        mode: foundMode
                    };
                }
            }
        }
        
        // Если не нашли режим, пробуем первые два слова как имя босса + режим
        if (parts.length >= 2) {
            const bossName = parts[0].toLowerCase();
            const secondPart = parts[1].toLowerCase();
            
            if (COMBO_MODE_MAPPING[secondPart]) {
                return {
                    bossName: bossName,
                    comboMode: COMBO_MODE_MAPPING[secondPart],
                    mode: null
                };
            }
            
            const foundMode = Object.keys(BATTLE_MODE_INFO).find(key => 
                BATTLE_MODE_INFO[key].name.toLowerCase().includes(secondPart) ||
                key.toLowerCase() === secondPart
            );
            if (foundMode) {
                return {
                    bossName: bossName,
                    comboMode: null,
                    mode: foundMode
                };
            }
        }
        
        return null;
    }
    
    // Функция для проверки, является ли строка нумерованным списком
    function isNumberedList(line) {
        // Проверяем формат: "1.пах" или "1 пах" или "1. пах"
        return /^\d+[\.\)]?\s*/.test(line);
    }
    
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        
        // Пропускаем разделители и заголовки
        if (isSeparator(line) || isHeader(line)) {
            continue;
        }
        
        // Проверяем, является ли строка заголовком комбо
        const headerInfo = parseComboHeader(line);
        if (headerInfo) {
            // Сохраняем предыдущее комбо, если оно было
            if (currentBossName && currentWeapons.length > 0) {
                combos.push({
                    bossName: currentBossName,
                    mode: currentMode || 'normal',
                    comboMode: currentComboMode,
                    weapons: currentWeapons
                });
            }
            
            // Начинаем новое комбо
            currentBossName = headerInfo.bossName;
            currentComboMode = headerInfo.comboMode;
            currentMode = headerInfo.mode;
            currentWeapons = [];
            continue;
        }
        
        // Проверяем формат с точкой с запятой (старый формат)
        if (line.includes(';')) {
            // Сохраняем предыдущее комбо, если оно было
            if (currentBossName && currentWeapons.length > 0) {
                combos.push({
                    bossName: currentBossName,
                    mode: currentMode || 'normal',
                    comboMode: currentComboMode,
                    weapons: currentWeapons
                });
                currentBossName = null;
                currentComboMode = null;
                currentMode = null;
                currentWeapons = [];
            }
            
            const comboStrings = line.split(';').map(s => s.trim()).filter(s => s);
            
            for (const comboString of comboStrings) {
                const parts = comboString.split(/\s+/).filter(p => p);
                if (parts.length < 2) continue;
                
                const bossName = parts[0].toLowerCase();
                let comboMode = null;
                let mode = null;
                let weaponsStartIndex = 1;
                
                if (parts.length >= 2) {
                    const secondPart = parts[1].toLowerCase();
                    
                    if (COMBO_MODE_MAPPING[secondPart]) {
                        comboMode = COMBO_MODE_MAPPING[secondPart];
                        weaponsStartIndex = 2;
                    } else {
                        const foundMode = Object.keys(BATTLE_MODE_INFO).find(key => 
                            BATTLE_MODE_INFO[key].name.toLowerCase().includes(secondPart) ||
                            key.toLowerCase() === secondPart
                        );
                        if (foundMode) {
                            mode = foundMode;
                            weaponsStartIndex = 2;
                        } else {
                            const apiWeapon = WEAPON_MAPPING[secondPart];
                            if (apiWeapon && ['knife', 'gunshot', 'poison', 'punchchest', 'kneeear', 'pokeeyes', 'kickballs'].includes(apiWeapon)) {
                                weaponsStartIndex = 1;
                            } else {
                                console.warn(`Неизвестный режим или оружие: ${secondPart}`);
                                continue;
                            }
                        }
                    }
                }
                
                const weapons = [];
                for (let i = weaponsStartIndex; i < parts.length; i++) {
                    let weaponName = parts[i].toLowerCase();
                    let skipNext = 0;
                    let foundWeapon = false;
                    
                    // Проверяем многословные названия
                    if (i + 2 < parts.length && weaponName === 'шмальнуть') {
                        const nextWord = parts[i + 1].toLowerCase();
                        const thirdWord = parts[i + 2].toLowerCase();
                        if (nextWord === 'из' && (thirdWord === 'самопала' || thirdWord === 'сапомала')) {
                            weaponName = 'шмальнуть из ' + thirdWord;
                            skipNext = 2;
                            foundWeapon = true;
                        }
                    } else if (i + 1 < parts.length && weaponName === 'подкинуть') {
                        const nextWord = parts[i + 1].toLowerCase();
                        if (nextWord === 'яда' || nextWord === 'яд') {
                            weaponName = 'подкинуть ' + nextWord;
                            skipNext = 1;
                            foundWeapon = true;
                        }
                    } else if (i + 2 < parts.length && weaponName === 'коленом') {
                        const nextWord = parts[i + 1].toLowerCase();
                        const thirdWord = parts[i + 2].toLowerCase();
                        if (nextWord === 'в' && thirdWord === 'ухо') {
                            weaponName = 'коленом в ухо';
                            skipNext = 2;
                            foundWeapon = true;
                        }
                    } else if (i + 2 < parts.length && weaponName === 'пальцем') {
                        const nextWord = parts[i + 1].toLowerCase();
                        const thirdWord = parts[i + 2].toLowerCase();
                        if (nextWord === 'в' && (thirdWord === 'глаз' || thirdWord === 'глаза')) {
                            weaponName = 'пальцем в глаз';
                            skipNext = 2;
                            foundWeapon = true;
                        }
                    } else if (i + 2 < parts.length && weaponName === 'тычок') {
                        const nextWord = parts[i + 1].toLowerCase();
                        const thirdWord = parts[i + 2].toLowerCase();
                        if (nextWord === 'в' && (thirdWord === 'глаза' || thirdWord === 'глаз')) {
                            weaponName = 'тычок в ' + thirdWord;
                            skipNext = 2;
                            foundWeapon = true;
                        }
                    } else if (i + 2 < parts.length && weaponName === 'удар') {
                        const nextWord = parts[i + 1].toLowerCase();
                        const thirdWord = parts[i + 2].toLowerCase();
                        if (nextWord === 'в' && thirdWord === 'пах') {
                            weaponName = 'удар в пах';
                            skipNext = 2;
                            foundWeapon = true;
                        } else if (nextWord === 'в' && thirdWord === 'грудь') {
                            weaponName = 'удар в грудь';
                            skipNext = 2;
                            foundWeapon = true;
                        }
                    } else if (i + 2 < parts.length && weaponName === 'пыр') {
                        const nextWord = parts[i + 1].toLowerCase();
                        const thirdWord = parts[i + 2].toLowerCase();
                        if (nextWord === 'в' && thirdWord === 'солнышко') {
                            weaponName = 'пыр в солнышко';
                            skipNext = 2;
                            foundWeapon = true;
                        }
                    } else if (i + 1 < parts.length && weaponName === 'в') {
                        const nextWord = parts[i + 1].toLowerCase();
                        if (nextWord === 'глаз' || nextWord === 'глаза') {
                            weaponName = 'в глаз';
                            skipNext = 1;
                            foundWeapon = true;
                        } else if (nextWord === 'пах') {
                            weaponName = 'в пах';
                            skipNext = 1;
                            foundWeapon = true;
                        }
                    }
                    
                    const apiWeapon = WEAPON_MAPPING[weaponName];
                    if (apiWeapon && ['knife', 'gunshot', 'poison', 'punchchest', 'kneeear', 'pokeeyes', 'kickballs'].includes(apiWeapon)) {
                        weapons.push(apiWeapon);
                        i += skipNext;
                    } else if (!foundWeapon) {
                        const singleWordWeapon = WEAPON_MAPPING[weaponName];
                        if (singleWordWeapon && ['knife', 'gunshot', 'poison', 'punchchest', 'kneeear', 'pokeeyes', 'kickballs'].includes(singleWordWeapon)) {
                            weapons.push(singleWordWeapon);
                        } else {
                            console.warn(`Неизвестное оружие: ${weaponName}`);
                        }
                    } else {
                        console.warn(`Неизвестное оружие: ${weaponName}`);
                    }
                }
                
                if (weapons.length > 0) {
                    combos.push({
                        bossName,
                        mode: mode || 'normal',
                        comboMode,
                        weapons
                    });
                } else {
                    console.warn(`Не найдено оружий для комбо: ${comboString}`);
                }
            }
            continue;
        }
        
        // Если у нас есть текущий босс, пытаемся распарсить строку как оружие
        if (currentBossName) {
            const weapon = parseWeaponFromLine(line);
            if (weapon) {
                currentWeapons.push(weapon);
            } else {
                // Если не удалось распарсить, возможно это не оружие
                // Пропускаем строку (может быть пустая строка или что-то другое)
                console.warn(`Не удалось распарсить оружие из строки: ${line}`);
            }
        } else {
            // Нет текущего босса, возможно это начало нового комбо в другом формате
            // Пробуем распарсить как заголовок еще раз (на случай, если формат немного другой)
            const parts = line.split(/\s+/).filter(p => p);
            if (parts.length >= 2) {
                const bossName = parts[0].toLowerCase();
                const secondPart = parts[1].toLowerCase();
                
                if (COMBO_MODE_MAPPING[secondPart]) {
                    // Сохраняем предыдущее комбо, если оно было
                    if (currentBossName && currentWeapons.length > 0) {
                        combos.push({
                            bossName: currentBossName,
                            mode: currentMode || 'normal',
                            comboMode: currentComboMode,
                            weapons: currentWeapons
                        });
                    }
                    
                    currentBossName = bossName;
                    currentComboMode = COMBO_MODE_MAPPING[secondPart];
                    currentMode = null;
                    currentWeapons = [];
                } else {
                    const foundMode = Object.keys(BATTLE_MODE_INFO).find(key => 
                        BATTLE_MODE_INFO[key].name.toLowerCase().includes(secondPart) ||
                        key.toLowerCase() === secondPart
                    );
                    if (foundMode) {
                        // Сохраняем предыдущее комбо, если оно было
                        if (currentBossName && currentWeapons.length > 0) {
                            combos.push({
                                bossName: currentBossName,
                                mode: currentMode || 'normal',
                                comboMode: currentComboMode,
                                weapons: currentWeapons
                            });
                        }
                        
                        currentBossName = bossName;
                        currentMode = foundMode;
                        currentComboMode = null;
                        currentWeapons = [];
                    }
                }
            }
        }
    }
    
    // Сохраняем последнее комбо, если оно было
    if (currentBossName && currentWeapons.length > 0) {
        combos.push({
            bossName: currentBossName,
            mode: currentMode || 'normal',
            comboMode: currentComboMode,
            weapons: currentWeapons
        });
    }
    
    return combos;
}

// Вспомогательная функция для парсинга названия оружия из строки
function parseWeaponName(weaponName) {
    weaponName = weaponName.toLowerCase().trim();
    
    // Проверяем прямое совпадение в маппинге
    if (WEAPON_MAPPING[weaponName]) {
        const apiWeapon = WEAPON_MAPPING[weaponName];
        if (['knife', 'gunshot', 'poison', 'punchchest', 'kneeear', 'pokeeyes', 'kickballs'].includes(apiWeapon)) {
            return apiWeapon;
        }
    }
    
    // Проверяем частичные совпадения (например, "колено" -> "kneeear")
    for (const [key, value] of Object.entries(WEAPON_MAPPING)) {
        if (weaponName === key || weaponName.includes(key) || key.includes(weaponName)) {
            if (['knife', 'gunshot', 'poison', 'punchchest', 'kneeear', 'pokeeyes', 'kickballs'].includes(value)) {
                return value;
            }
        }
    }
    
    return null;
}

// Подсчет стоимости восстановления для комбо
// Восстановление нужно только для повторных ударов оружий с кулдауном (ухо/пах/глаз/грудь)
function calculateComboCost(weapons) {
    // Оружия с кулдауном
    const cooldownWeapons = ['kneeear', 'kickballs', 'pokeeyes', 'punchchest'];
    
    // Считаем, сколько раз каждое оружие с кулдауном используется
    const weaponUsage = {};
    let restoreCount = 0;
    
    weapons.forEach(weapon => {
        if (cooldownWeapons.includes(weapon)) {
            if (weaponUsage[weapon]) {
                // Это повторный удар - нужен 1 рубль на восстановление
                weaponUsage[weapon]++;
                restoreCount++;
            } else {
                // Первый удар - восстановление не нужно
                weaponUsage[weapon] = 1;
            }
        }
    });
    
    // Каждое восстановление стоит 3 рубля
    return restoreCount * 3;
}

// Отображение загруженных комбо
function displayLoadedCombos() {
    const container = document.getElementById('combo-list-content');
    const listContainer = document.getElementById('combo-list-container');
    
    if (!container || loadedCombos.length === 0) return;
    
    let html = '<ul style="text-align: left; padding-left: 20px;">';
    loadedCombos.forEach((combo, index) => {
        const modeName = combo.mode ? (BATTLE_MODE_INFO[combo.mode]?.name || combo.mode) : 'не указан';
        const comboModeName = combo.comboMode ? (COMBO_MODE_INFO[combo.comboMode]?.name || combo.comboMode) : 'не указан';
        const maxCost = calculateComboCost(combo.weapons);
        html += `<li><strong>${combo.bossName}</strong> - Режим: ${modeName}, Комбо: ${comboModeName}, Ударов: ${combo.weapons.length}, Восст:  ${maxCost} ₽</li>`;
    });
    html += '</ul>';
    
    container.innerHTML = html;
    listContainer.style.display = 'block';
}

// Отображение выбора боссов для комбо
function displayComboBossSelection() {
    const carousel = document.getElementById('combo-boss-carousel');
    const selectContainer = document.getElementById('combo-boss-select');
    const startBtn = document.getElementById('start-combo-btn');
    
    if (!carousel) return;
    
    // Находим уникальных боссов из загруженных комбо
    const uniqueBossNames = [...new Set(loadedCombos.map(c => c.bossName))];
    
    // Собираем всех боссов из всех категорий
    let allBossesFromCategories = [];
    if (window.bossCategoriesData) {
        console.log('📊 Категории для комбо:', Object.keys(window.bossCategoriesData));
        // Проходим по всем категориям
        for (const categoryId in window.bossCategoriesData) {
            const categoryData = window.bossCategoriesData[categoryId];
            console.log(`📦 Обработка категории ${categoryId} для комбо:`, categoryData ? `${categoryData.bosses?.length || 0} боссов` : 'нет данных');
            if (categoryData && categoryData.bosses) {
                categoryData.bosses.forEach((bossData) => {
                    const boss = bossData.boss;
                    if (boss) {
                        // Получаем доступные режимы боя из battleModes
                        const availableModes = getAvailableBattleModes(boss);
                        console.log(`  Босс ${boss.id} (${boss.title}): режимов атаки=${availableModes.length}`, availableModes.map(m => m.key));
                        
                        // Получаем доступные режимы комбо
                        if (!bossData.combos) {
                            bossData.combos = {};
                        }
                        const availableComboModes = getAvailableComboModes(bossData);
                        console.log(`  Босс ${boss.id} (${boss.title}): режимов комбо=${availableComboModes.length}`, availableComboModes.map(m => m.key));
                        
                        // Добавляем босса в список
                        allBossesFromCategories.push({
                            id: boss.id,
                            name: boss.title,
                            categoryId: boss.categoryId || parseInt(categoryId),
                            baseHp: boss.baseHp,
                            battleModes: boss.battleModes || {},
                            combos: bossData.combos || {},
                            imageUrl: boss.imageUrl || boss.image || '',
                            availableModes: availableModes,
                            availableComboModes: availableComboModes
                        });
                    }
                });
            }
        }
    }
    
    console.log(`✅ Всего боссов собрано для комбо: ${allBossesFromCategories.length}`);
    
    // Если не нашли в категориях, используем window.allBosses
    if (allBossesFromCategories.length === 0 && window.allBosses) {
        allBossesFromCategories = window.allBosses;
    }
    
    // Находим соответствующих боссов в списке
    const availableBosses = [];
    console.log(`🔍 Ищем боссов для комбо. Уникальные имена: ${uniqueBossNames.join(', ')}`);
    console.log(`🔍 Всего боссов в базе: ${allBossesFromCategories.length}`);
    
    for (const bossName of uniqueBossNames) {
        console.log(`🔍 Ищем босса: "${bossName}"`);
        const boss = allBossesFromCategories.find(b => {
            const nameMatch = b.name.toLowerCase().includes(bossName.toLowerCase()) || 
                             bossName.toLowerCase().includes(b.name.toLowerCase());
            if (nameMatch) {
                console.log(`  ✅ Найден: ${b.name} (ID: ${b.id}, категория: ${b.categoryId})`);
            }
            return nameMatch;
        });
        if (boss) {
            // Находим комбо для этого босса
            const combosForBoss = loadedCombos.filter(c => c.bossName === bossName);
            console.log(`  📋 Найдено комбо для ${boss.name}: ${combosForBoss.length}`);
            availableBosses.push({
                boss,
                combos: combosForBoss
            });
        } else {
            console.log(`  ❌ Босс "${bossName}" не найден в базе`);
            // Показываем список всех доступных боссов для отладки
            console.log(`  📋 Доступные боссы:`, allBossesFromCategories.map(b => `${b.name} (ID: ${b.id}, категория: ${b.categoryId})`).join(', '));
        }
    }
    
    console.log(`✅ Найдено боссов для комбо: ${availableBosses.length}`);
    
    if (availableBosses.length === 0) {
        const availableBossNames = allBossesFromCategories.map(b => b.name).join(', ');
        tg.showAlert(`Не найдено соответствующих боссов для загруженных комбо.\n\nИскали: ${uniqueBossNames.join(', ')}\n\nДоступные боссы: ${availableBossNames}`);
        return;
    }
    
    // Используем такой же стиль карусели, как в обычной атаке
    carousel.style.display = 'flex';
    carousel.style.flexDirection = 'row';
    carousel.style.flexWrap = 'nowrap';
    carousel.style.gap = '12px';
    carousel.style.padding = '10px';
    carousel.style.overflowX = 'auto';
    carousel.style.overflowY = 'hidden';
    carousel.style.minHeight = '200px';
    carousel.style.width = '100%';
    
    let html = '';
    availableBosses.forEach(({boss, combos}) => {
        // Для каждого босса показываем карточку с выбором комбо
        // Используем данные из boss, так как они уже содержат всю необходимую информацию
        const baseHp = boss.baseHp || 0;
        
        // Получаем доступные режимы атаки из БД
        let availableModes = boss.availableModes || [];
        if (availableModes.length === 0 && boss.battleModes) {
            availableModes = getAvailableBattleModes(boss);
        }
        // Если все еще нет режимов атаки, пытаемся найти в исходных данных категории
        if (availableModes.length === 0 && window.bossCategoriesData) {
            for (const categoryId in window.bossCategoriesData) {
                const categoryData = window.bossCategoriesData[categoryId];
                if (categoryData && categoryData.bosses) {
                    const bossData = categoryData.bosses.find(bd => bd.boss && bd.boss.id === boss.id);
                    if (bossData && bossData.boss) {
                        availableModes = getAvailableBattleModes(bossData.boss);
                        if (availableModes.length > 0) {
                            boss.battleModes = bossData.boss.battleModes || {};
                            break;
                        }
                    }
                }
            }
        }
        const defaultMode = availableModes.find(m => m.key === 'pacansky') ? 'pacansky' : (availableModes.length > 0 ? availableModes[0].key : null);
        
        // Формируем селектор режима атаки
        let modeSelectorHtml = '';
        if (availableModes.length > 0) {
            modeSelectorHtml = `
                <div class="boss-mode-selector" style="margin-top: 6px;">
                    <select id="combo-boss-mode-${boss.id}" 
                            class="boss-mode-select form-control" 
                            style="width: 100%; padding: 4px 6px; font-size: 11px; background: rgba(0,0,0,0.5); color: #ffffff; border: 1px solid #555; border-radius: 4px; cursor: pointer;"
                            onchange="selectComboBossFromSelector(${boss.id})"
                            onclick="event.stopPropagation();">
                        ${availableModes.map(mode => 
                            `<option value="${mode.key}" ${mode.key === defaultMode ? 'selected' : ''}>${mode.name} ${mode.multiplier}</option>`
                        ).join('')}
                    </select>
                </div>
            `;
        }
        
        // Формируем селектор загруженных комбо (всегда показываем, даже если одно)
        let loadedComboSelectorHtml = '';
        if (combos.length > 0) {
            loadedComboSelectorHtml = `
                <div class="loaded-combo-selector" style="margin-top: 4px;">
                    <select id="combo-select-${boss.id}" 
                            class="combo-select form-control" 
                            style="width: 100%; padding: 4px 6px; font-size: 11px; background: rgba(0,0,0,0.5); color: #ffffff; border: 1px solid #555; border-radius: 4px; cursor: pointer;"
                            onchange="selectComboBossFromSelector(${boss.id})"
                            onclick="event.stopPropagation();">
                        ${combos.map((combo, comboIndex) => {
                            const comboModeName = combo.comboMode ? (COMBO_MODE_INFO[combo.comboMode]?.name || combo.comboMode) : 'не указан';
                            const displayName = comboModeName !== 'не указан' ? comboModeName : 'Комбо';
                            return `<option value="${comboIndex}">${displayName} (${combo.weapons.length} ударов)</option>`;
                        }).join('')}
                    </select>
                </div>
            `;
        }
        
        // Вычисляем HP с учетом режима по умолчанию
        const currentHp = defaultMode ? calculateBossHp(baseHp, defaultMode) : baseHp;
        
        html += `
            <div class="boss-card" 
                 data-boss-id="${boss.id}"
                 data-boss-name="${boss.name.replace(/'/g, "\\'")}"
                 style="border: 2px solid #3390ec; background: linear-gradient(135deg, #2d3d5a 0%, #1e2a3a 100%); border-radius: 12px; padding: 10px; margin-right: 12px; min-width: 140px; cursor: pointer; transition: transform 0.2s;"
                 onclick="selectComboBossFromCard(${boss.id})">
                <div class="boss-image" style="width: 100px; height: 100px; min-width: 100px; max-width: 100px; min-height: 100px; max-height: 100px; box-sizing: border-box; background: #1a1a1a; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; overflow: hidden; flex-shrink: 0;">
                    <img src="${getBossImageUrl(boss.id, boss)}" 
                         alt="${boss.name}" 
                         data-fallback="${getBossImageUrlFallback(boss.id, boss)}"
                         style="max-width: 100%; max-height: 100%; object-fit: contain;"
                         onerror="if(this.dataset.fallback && this.dataset.fallback !== '' && this.src !== this.dataset.fallback) { this.src = this.dataset.fallback; } else { this.style.display='none'; this.nextElementSibling.style.display='flex'; }"
                         onload="this.style.display='block'; if(this.nextElementSibling) this.nextElementSibling.style.display='none';">
                    <span style="font-size: 40px; display: none;">👹</span>
                </div>
                <div class="boss-info-card" style="text-align: center; color: #ffffff;">
                    <div class="boss-name" style="font-weight: 600; font-size: 14px; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${boss.name}</div>
                    <div class="boss-hp" data-base-hp="${baseHp}" style="font-size: 12px; color: #e0e0e0; margin-bottom: 4px;">HP: ${currentHp.toLocaleString()}</div>
                    ${modeSelectorHtml}
                    ${loadedComboSelectorHtml}
                    <div style="font-size: 10px; color: #4CAF50; margin-top: 4px;">Комбо: ${combos.length}</div>
                    ${combos.length > 0 ? (() => {
                        const selectedComboIndex = 0; // По умолчанию первое комбо
                        const selectedCombo = combos[selectedComboIndex];
                        const maxCost = calculateComboCost(selectedCombo.weapons);
                        return `<div class="combo-cost-display" style="font-size: 10px; color: #FFA500; margin-top: 2px;">Восст:  ${maxCost} ₽</div>`;
                    })() : ''}
                </div>
            </div>
        `;
    });
    
    carousel.innerHTML = html;
    selectContainer.style.display = 'block';
    startBtn.style.display = 'none';
}

// Выбор босса и комбо из селектора
window.selectComboBossFromSelector = function(bossId) {
    selectComboBoss(bossId);
}

// Выбор босса и комбо из карточки
window.selectComboBossFromCard = function(bossId) {
    selectComboBoss(bossId);
}

// Выбор босса и комбо (основная функция)
function selectComboBoss(bossId) {
    // Убираем выделение со всех карточек
    document.querySelectorAll('#combo-boss-carousel .boss-card').forEach(card => {
        card.style.border = '2px solid #3390ec';
    });
    
    // Выделяем выбранную карточку
    const selectedCard = document.querySelector(`#combo-boss-carousel .boss-card[data-boss-id="${bossId}"]`);
    if (selectedCard) {
        selectedCard.style.border = '3px solid #4CAF50';
    }
    
    // Находим босса - ищем во всех категориях
    let boss = null;
    if (window.bossCategoriesData) {
        for (const categoryId in window.bossCategoriesData) {
            const categoryData = window.bossCategoriesData[categoryId];
            if (categoryData && categoryData.bosses) {
                const bossData = categoryData.bosses.find(bd => bd.boss && bd.boss.id === bossId);
                if (bossData && bossData.boss) {
                    const b = bossData.boss;
                    boss = {
                        id: b.id,
                        name: b.title,
                        categoryId: b.categoryId || parseInt(categoryId),
                        baseHp: b.baseHp,
                        battleModes: b.battleModes || {},
                        combos: bossData.combos || {},
                        imageUrl: b.imageUrl || b.image || '',
                        availableModes: getAvailableBattleModes(b),
                        availableComboModes: getAvailableComboModes(bossData)
                    };
                    break;
                }
            }
        }
    }
    
    // Если не нашли в категориях, ищем в window.allBosses
    if (!boss && window.allBosses) {
        boss = window.allBosses.find(b => b.id === bossId);
    }
    
    if (!boss) return;
    
    // Получаем выбранный режим атаки из селектора
    const modeSelector = document.getElementById(`combo-boss-mode-${bossId}`);
    const selectedMode = modeSelector ? modeSelector.value : null;
    
    // Получаем индекс загруженного комбо
    const comboSelector = document.getElementById(`combo-select-${bossId}`);
    const comboIndex = comboSelector ? parseInt(comboSelector.value) : 0;
    
    // Находим все комбо для этого босса
    const combosForBoss = loadedCombos.filter(c => 
        c.bossName.toLowerCase().includes(boss.name.toLowerCase()) || 
        boss.name.toLowerCase().includes(c.bossName.toLowerCase())
    );
    
    // Выбираем комбо по индексу
    let combo = combosForBoss[comboIndex];
    
    // Если комбо не найдено, берем первое
    if (!combo && combosForBoss.length > 0) {
        combo = combosForBoss[0];
    }
    
    if (!combo) return;
    
    // Используем выбранный режим атаки из селектора, или из комбо, или по умолчанию
    const finalMode = selectedMode || combo.mode || 'normal';
    // Режим комбо берем из выбранного комбо
    const finalComboMode = combo.comboMode || null;
    
    selectedCombo = {
        bossId,
        bossName: boss.name,
        mode: finalMode,
        comboMode: finalComboMode,
        weapons: combo.weapons
    };
    
    // Обновляем HP в карточке при изменении режима или комбо
    if ((modeSelector || comboSelector) && selectedCard) {
        const baseHp = parseInt(selectedCard.querySelector('.boss-hp')?.dataset.baseHp) || boss.baseHp || 0;
        const newHp = calculateBossHp(baseHp, finalMode);
        const hpElement = selectedCard.querySelector('.boss-hp');
        if (hpElement) {
            hpElement.textContent = `HP: ${newHp.toLocaleString()}`;
        }
        
        // Обновляем стоимость комбо в карточке
        const costElement = selectedCard.querySelector('.combo-cost-display');
        if (costElement) {
            const maxCost = calculateComboCost(combo.weapons);
            costElement.textContent = `Восст:  ${maxCost} ₽`;
        }
    }
    
    document.getElementById('start-combo-btn').style.display = 'block';
}

// Подсчет необходимых ресурсов для комбо
function calculateRequiredResources(weapons) {
    const required = {
        knife: 0,
        gunshot: 0,
        poison: 0,
        rubles: 0
    };
    
    weapons.forEach(weapon => {
        if (weapon === 'knife') required.knife++;
        else if (weapon === 'gunshot') required.gunshot++;
        else if (weapon === 'poison') required.poison++;
    });
    
    // Стоимость восстановления (только для повторных ударов оружий с кулдауном)
    required.rubles = calculateComboCost(weapons);
    
    return required;
}

// Начало выполнения комбо
window.startComboAttack = async function() {
    if (!selectedCombo) {
        tg.showAlert('Выберите босса и комбо');
        return;
    }
    
    // Проверяем ресурсы перед началом комбо
    try {
        const apiUrl = API_SERVER_URL || GAME_API_URL;
        const response = await fetch(`${apiUrl}/player/resources`, {
            method: 'GET',
            headers: await getApiHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.resources) {
                const resources = data.resources;
                const required = calculateRequiredResources(selectedCombo.weapons);
                
                const missing = [];
                if (resources.knife_count < required.knife) {
                    missing.push(`Финок: ${required.knife} (есть ${resources.knife_count})`);
                }
                if (resources.gunshot_count < required.gunshot) {
                    missing.push(`Самопалов: ${required.gunshot} (есть ${resources.gunshot_count})`);
                }
                if (resources.poison_count < required.poison) {
                    missing.push(`Ядов: ${required.poison} (есть ${resources.poison_count})`);
                }
                if (resources.rubles < required.rubles) {
                    missing.push(`Рублей: ${required.rubles} (есть ${resources.rubles})`);
                }
                
                if (missing.length > 0) {
                    tg.showAlert(`❌ Недостаточно ресурсов для комбо:\n\n${missing.join('\n')}\n\nОбновите данные через /api/player/init`);
                    return;
                }
            }
        }
    } catch (error) {
        console.error('Ошибка проверки ресурсов:', error);
        // Продолжаем выполнение, если не удалось проверить ресурсы
    }
    
    const confirmed = await new Promise(resolve => {
        const modeName = selectedCombo.mode ? (BATTLE_MODE_INFO[selectedCombo.mode]?.name || selectedCombo.mode) : 'не указан';
        const comboModeName = selectedCombo.comboMode ? (COMBO_MODE_INFO[selectedCombo.comboMode]?.name || selectedCombo.comboMode) : 'не указан';
        const maxCost = calculateComboCost(selectedCombo.weapons);
        tg.showConfirm(
            `Начать комбо атаку на ${selectedCombo.bossName}?\n\nРежим: ${modeName}\nКомбо: ${comboModeName}\nУдаров: ${selectedCombo.weapons.length}\nВосст:  ${maxCost} ₽`,
            resolve
        );
    });
    
    if (!confirmed) return;
    
    isComboAttacking = true;
    currentComboWeaponIndex = 0;
    currentComboBossId = selectedCombo.bossId;
    currentComboMode = selectedCombo.mode;
    currentComboComboMode = selectedCombo.comboMode;
    totalSpentRubles = 0; // Сбрасываем счетчик потраченных рублей
    
    document.getElementById('start-combo-btn').style.display = 'none';
    document.getElementById('stop-combo-btn').style.display = 'block';
    document.getElementById('combo-status').style.display = 'block';
    
    updateComboStatus(`Начало комбо атаки на ${selectedCombo.bossName}...`);
    
    // Начинаем выполнение комбо
    executeCombo();
}

// Выполнение комбо
async function executeCombo() {
    if (!isComboAttacking || !selectedCombo) {
        stopComboAttack();
        return;
    }
    
    try {
        // Если это первый удар, сначала атакуем босса
        if (currentComboWeaponIndex === 0) {
            await attackBossForCombo();
        }
        
        // Выполняем все удары комбо
        await executeComboWeapons();
        
    } catch (error) {
        console.error('Ошибка выполнения комбо:', error);
        updateComboStatus(`❌ Ошибка: ${error.message}`);
        stopComboAttack();
    }
}

// Атака босса для комбо
async function attackBossForCombo() {
    const apiUrl = API_SERVER_URL || GAME_API_URL;
    
    updateComboStatus(`Атака на ${selectedCombo.bossName}...`);
    
    // Используем start-attack с режимом и комбо режимом
    let response = await fetch(`${apiUrl}/boss/start-attack`, {
        method: 'POST',
        headers: await getApiHeaders(),
        body: JSON.stringify({
            bossId: currentComboBossId,
            mode: currentComboMode || 'normal',
            comboMode: currentComboComboMode || null
        })
    });
    
    // Обработка 401/403
    if (response.status === 401 || response.status === 403) {
        const currentInitData = await getCurrentInitData();
        if (currentInitData && currentInitData.trim()) {
            const newToken = await loginWithInitData();
            if (newToken) {
                response = await fetch(`${apiUrl}/boss/start-attack`, {
                    method: 'POST',
                    headers: await getApiHeaders(),
                    body: JSON.stringify({
                        bossId: currentComboBossId,
                        mode: currentComboMode || 'normal',
                        comboMode: currentComboComboMode || null
                    })
                });
            }
        }
    }
    
    // Обработка таймаутов (504 Gateway Timeout или 999 Internal Error)
    if (response.status === 504 || response.status === 999) {
        const errorText = await response.text();
        let errorData;
        try {
            errorData = JSON.parse(errorText);
        } catch {
            errorData = { message: 'Таймаут на стороне сервера' };
        }
        const errorMessage = errorData.message || errorData.error || 'Таймаут на стороне сервера';
        throw new Error(`Таймаут при старте атаки: ${errorMessage}. Попробуйте повторить комбо.`);
    }
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
        // Проверяем, это таймаут в сообщении об ошибке?
        const errorText = data.message || data.error || '';
        if (errorText.toLowerCase().includes('таймаут') || errorText.toLowerCase().includes('timeout')) {
            throw new Error(`Таймаут при старте атаки: ${errorText}. Попробуйте повторить комбо.`);
        }
        throw new Error(data.message || data.error || 'Ошибка атаки босса');
    }
    
    updateComboStatus(`✅ Атака начата. Начинаем комбо...`);
}

// Выполнение ударов комбо
async function executeComboWeapons() {
    // Используем прокси если есть, иначе прямой URL к игровому API
    const apiUrl = API_SERVER_URL || GAME_API_URL;
    let comboProgress = null;
    let revealedWeapons = [];
    
    for (let i = currentComboWeaponIndex; i < selectedCombo.weapons.length; i++) {
        if (!isComboAttacking) break;
        
        const weapon = selectedCombo.weapons[i];
        currentComboWeaponIndex = i;
        
        // Переводим название оружия на русский для отображения
        const weaponDisplayName = WEAPON_DISPLAY_NAMES[weapon] || weapon;
        updateComboStatus(`Удар ${i + 1}/${selectedCombo.weapons.length}: ${weaponDisplayName}...`);
        
        // Выполняем удар
        let success = false;
        let attempts = 0;
        const maxAttempts = 7;  // Увеличено с 3 до 7 для лучшей обработки таймаутов
        
        while (!success && attempts < maxAttempts && isComboAttacking) {
            attempts++;
            
            try {
                // Используем прокси для use-weapon
                let response = await fetch(`${apiUrl}/boss/use-weapon`, {
                    method: 'POST',
                    headers: await getApiHeaders(),
                    body: JSON.stringify({
                        weapon: weapon,
                        count: 1
                    })
                });
                
                // Обработка 401/403
                if (response.status === 401 || response.status === 403) {
                    const currentInitData = await getCurrentInitData();
                    if (currentInitData && currentInitData.trim()) {
                        const newToken = await loginWithInitData();
                        if (newToken) {
                            response = await fetch(`${apiUrl}/boss/use-weapon`, {
                                method: 'POST',
                                headers: await getApiHeaders(),
                                body: JSON.stringify({
                                    weapon: weapon,
                                    count: 1
                                })
                            });
                        }
                    }
                }
                
                // Обработка таймаутов (504 Gateway Timeout или 999 Internal Error)
                if (response.status === 504 || response.status === 999) {
                    const errorText = await response.text();
                    let errorData;
                    try {
                        errorData = JSON.parse(errorText);
                    } catch {
                        errorData = { message: 'Таймаут на стороне сервера' };
                    }
                    
                    const errorMessage = errorData.message || errorData.error || 'Таймаут на стороне сервера';
                    updateComboStatus(`⏱️ Таймаут при ударе ${i + 1}. Повторяем попытку ${attempts}/${maxAttempts}...`);
                    console.warn(`Таймаут при ударе ${i + 1}, попытка ${attempts}/${maxAttempts}: ${errorMessage}`);
                    
                    // Ждем перед повторной попыткой (увеличиваем задержку при повторных попытках)
                    await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
                    continue; // Повторяем попытку
                }
                
                const data = await response.json();
                
                if (!response.ok || !data.success) {
                    // Проверяем, это ошибка перезарядки?
                    if (data.message && data.message.includes('Перезарядка')) {
                        // Извлекаем тип оружия из сообщения (например: "Перезарядка kneeear (осталось: 07:59:43)")
                        const weaponTypeMatch = data.message.match(/Перезарядка\s+(\w+)/i);
                        if (weaponTypeMatch) {
                            const weaponType = weaponTypeMatch[1].toLowerCase();
                            const weaponTypeDisplayName = WEAPON_DISPLAY_NAMES[weaponType] || weaponType;
                            updateComboStatus(`⚠️ Перезарядка ${weaponTypeDisplayName}. Восстанавливаем...`);
                            await restoreWeaponCooldown(weaponType);
                            // Повторяем попытку
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            continue;
                        }
                    }
                    
                    // Проверяем, это таймаут в сообщении об ошибке?
                    const errorText = data.message || data.error || '';
                    if (errorText.toLowerCase().includes('таймаут') || errorText.toLowerCase().includes('timeout')) {
                        updateComboStatus(`⏱️ Таймаут при ударе ${i + 1}. Повторяем попытку ${attempts}/${maxAttempts}...`);
                        console.warn(`Таймаут при ударе ${i + 1}, попытка ${attempts}/${maxAttempts}: ${errorText}`);
                        // Ждем перед повторной попыткой
                        await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
                        continue; // Повторяем попытку
                    }
                    
                    throw new Error(data.message || data.error || 'Ошибка использования оружия');
                }
                
                // Проверяем прогресс комбо
                if (data.combo) {
                    comboProgress = data.combo;
                    revealedWeapons = data.combo.revealed || [];
                    
                    // Проверяем, что удар правильный - сверяем с revealed массивом
                    // revealed содержит правильную последовательность ударов
                    // Если мы на позиции i, то revealed[i] должен совпадать с нашим ударом
                    if (revealedWeapons.length > i) {
                        const expectedWeapon = revealedWeapons[i];
                        if (expectedWeapon && expectedWeapon !== weapon) {
                            const expectedDisplayName = WEAPON_DISPLAY_NAMES[expectedWeapon] || expectedWeapon;
                            const weaponDisplayName = WEAPON_DISPLAY_NAMES[weapon] || weapon;
                            updateComboStatus(`⚠️ Неправильный удар на позиции ${i + 1}! Ожидался ${expectedDisplayName}, получен ${weaponDisplayName}. Повторяем...`);
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            continue;
                        }
                    }
                    
                    // Проверяем, завершено ли комбо
                    if (data.comboReward) {
                        // Комбо завершено, показываем награду
                        displayComboReward(data);
                        stopComboAttack();
                        return;
                    }
                    
                    // Проверяем, достигнут ли прогресс (если все удары сделаны, но награды еще нет)
                    if (comboProgress.progress >= comboProgress.required) {
                        // Если прогресс достигнут, но награды нет, продолжаем (возможно, награда придет в следующем ответе)
                        updateComboStatus(`✅ Прогресс комбо: ${comboProgress.progress}/${comboProgress.required}`);
                    }
                }
                
                success = true;
                
                // Тайм-аут 1 секунда между ударами
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`Ошибка удара ${i + 1}:`, error);
                
                // Проверяем, это таймаут?
                const errorMessage = error.message || error.toString();
                const isTimeout = errorMessage.toLowerCase().includes('таймаут') || 
                                 errorMessage.toLowerCase().includes('timeout') ||
                                 errorMessage.toLowerCase().includes('504') ||
                                 errorMessage.toLowerCase().includes('999');
                
                if (isTimeout) {
                    updateComboStatus(`⏱️ Таймаут при ударе ${i + 1}. Повторяем попытку ${attempts}/${maxAttempts}...`);
                    console.warn(`Таймаут при ударе ${i + 1}, попытка ${attempts}/${maxAttempts}: ${errorMessage}`);
                }
                
                if (attempts >= maxAttempts) {
                    throw error;
                }
                
                // Увеличиваем задержку при повторных попытках (особенно для таймаутов)
                const delay = isTimeout ? 2000 * attempts : 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        if (!success) {
            throw new Error(`Не удалось выполнить удар ${i + 1} после ${maxAttempts} попыток`);
        }
    }
    
    // Если дошли до конца, но награды нет, проверяем еще раз
    if (isComboAttacking && comboProgress && comboProgress.progress >= comboProgress.required) {
        updateComboStatus(`✅ Комбо завершено! Проверяем награду...`);
    } else {
        updateComboStatus(`✅ Все удары выполнены!`);
        stopComboAttack();
    }
}

// Восстановление перезарядки оружия
async function restoreWeaponCooldown(weaponType) {
    // Используем прокси если есть, иначе прямой URL к игровому API
    const apiUrl = API_SERVER_URL || GAME_API_URL;
    
    // Маппинг типов оружия для восстановления (из API названий в формат для восстановления)
    const restoreWeaponMapping = {
        'kneeear': 'KneeEar',
        'KneeEar': 'KneeEar',
        'kickballs': 'KickBalls',
        'KickBalls': 'KickBalls',
        'punchchest': 'PunchChest',
        'PunchChest': 'PunchChest',
        'pokeeyes': 'PokeEyes',
        'PokeEyes': 'PokeEyes',
        'knife': 'Knife',
        'Knife': 'Knife',
        'gunshot': 'Gunshot',
        'Gunshot': 'Gunshot',
        'poison': 'Poison',
        'Poison': 'Poison'
    };
    
    // Преобразуем weaponType в правильный формат (первая буква заглавная, остальные как есть)
    let restoreType = restoreWeaponMapping[weaponType];
    if (!restoreType) {
        // Если не нашли в маппинге, пытаемся преобразовать вручную
        restoreType = weaponType.charAt(0).toUpperCase() + weaponType.slice(1);
    }
    
    const weaponTypeDisplayName = WEAPON_DISPLAY_NAMES[weaponType] || weaponType;
    updateComboStatus(`Восстановление перезарядки ${weaponTypeDisplayName}...`);
    
    let response = await fetch(`${apiUrl}/boss/restore-free-hit`, {
        method: 'POST',
        headers: await getApiHeaders(),
        body: JSON.stringify({
            weaponType: restoreType
        })
    });
    
    // Обработка 401/403
    if (response.status === 401 || response.status === 403) {
        const currentInitData = await getCurrentInitData();
        if (currentInitData && currentInitData.trim()) {
            const newToken = await loginWithInitData();
            if (newToken) {
                response = await fetch(`${apiUrl}/boss/restore-free-hit`, {
                    method: 'POST',
                    headers: await getApiHeaders(),
                    body: JSON.stringify({
                        weaponType: restoreType
                    })
                });
            }
        }
    }
    
    const data = await response.json();
    
    if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Ошибка восстановления перезарядки');
    }
    
    const spentRubles = data.spentRubles || 0;
    totalSpentRubles += spentRubles; // Добавляем к общей сумме
    updateComboStatus(`✅ Перезарядка восстановлена (потрачено ${spentRubles} рублей, всего: ${totalSpentRubles} ₽)`);
}

// Отображение награды за комбо
function displayComboReward(data) {
    if (!data.comboReward) return;
    
    const reward = data.comboReward;
    let message = `💰 Награда за комбо получена!\n\n`;
    
    // Добавляем информацию о потраченных рублях
    if (totalSpentRubles > 0) {
        message += `💸 Потрачено на восстановление: ${totalSpentRubles} ₽\n\n`;
    }
    
    if (reward.authority) {
        message += `Авторитет: ${reward.authority.toLocaleString()}\n`;
    }
    
    if (reward.currencies && reward.currencies.length > 0) {
        const currencyNames = {
            'cigarettes': 'Сигареты',
            'rubles': 'Рубли',
            'money': 'Деньги',
            'sugar': 'Сахар'
        };
        reward.currencies.forEach(c => {
            const name = currencyNames[c.type] || c.type;
            message += `${name}: ${c.amount.toLocaleString()}\n`;
        });
    }
    
    if (reward.weapons) {
        const weaponNames = {
            'knife': 'Финки',
            'gunshot': 'Палки',
            'poison': 'Яды'
        };
        Object.entries(reward.weapons).forEach(([weapon, count]) => {
            const name = weaponNames[weapon] || weapon;
            message += `${name}: ${count}\n`;
        });
    }
    
    if (reward.stash) {
        message += `Скрытность: ${reward.stash.count}\n`;
    }
    
    if (reward.tattoos && reward.tattoos.length > 0) {
        message += `Татуировки: ${reward.tattoos.length}\n`;
    }
    
    // Также показываем zshReward если есть
    if (data.zshReward && data.zshReward.drops) {
        message += `\nДропы:\n`;
        data.zshReward.drops.forEach(drop => {
            message += `${drop.name}: ${drop.qty}\n`;
        });
    }
    
    updateComboStatus(`✅ ${message.replace(/\n/g, '<br>')}`);
    showCustomModal(message);
}

// Остановка комбо атаки
window.stopComboAttack = function() {
    isComboAttacking = false;
    
    // Показываем итоговую информацию о потраченных рублях
    if (totalSpentRubles > 0) {
        updateComboStatus(`Комбо атака остановлена. Потрачено на восстановление: ${totalSpentRubles} ₽`);
    } else {
        updateComboStatus('Комбо атака остановлена');
    }
    
    document.getElementById('start-combo-btn').style.display = 'block';
    document.getElementById('stop-combo-btn').style.display = 'none';
}

// Обновление статуса комбо
function updateComboStatus(message) {
    const statusContent = document.getElementById('combo-status-content');
    if (statusContent) {
        const timestamp = new Date().toLocaleTimeString();
        statusContent.innerHTML = `<p><strong>[${timestamp}]</strong> ${message}</p>`;
    }
}

