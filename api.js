// ==================== API УТИЛИТЫ ====================

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

// Экспортируем для использования в других модулях
window.API_SERVER_URL = API_SERVER_URL;
window.GAME_API_URL = GAME_API_URL;
window.getApiServerUrl = getApiServerUrl;
window.getGameApiUrl = getGameApiUrl;

