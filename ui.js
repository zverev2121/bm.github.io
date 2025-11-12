// ==================== UI УТИЛИТЫ ====================

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

// Обновление статуса подключения
function updateStatus(connected) {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;
    
    const dot = statusElement.querySelector('.status-dot');
    const text = statusElement.querySelector('span:last-child');
    
    if (connected) {
        if (dot) dot.style.backgroundColor = '#4CAF50';
        if (text) text.textContent = 'Подключено';
    } else {
        if (dot) dot.style.backgroundColor = '#ff6b6b';
        if (text) text.textContent = 'Отключено';
    }
}

// Экспортируем функции
window.showCustomModal = showCustomModal;
window.closeCustomModal = closeCustomModal;
window.updateStatus = updateStatus;

