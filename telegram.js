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

// Экспортируем для использования в других модулях
window.tg = tg;
window.APP_VERSION = APP_VERSION;

