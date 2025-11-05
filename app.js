// Telegram Web App API
const tg = window.Telegram.WebApp;

// Инициализация Mini App
tg.ready();
tg.expand();

// Базовый URL API бота (замените на ваш)
const BOT_API_URL = 'https://your-domain.com/api'; // Или локальный для разработки

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    updateStatus(true);
    loadBossInfo();
    loadPrisons();
    loadStats();
    
    // Обновляем статистику каждые 30 секунд
    setInterval(loadStats, 30000);
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
        const response = await fetch(`${BOT_API_URL}/boss/bootstrap`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки');
        
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
        } else {
            bossInfo.innerHTML = '<p>Информация о боссе недоступна</p>';
        }
    } catch (error) {
        bossInfo.innerHTML = `<p class="error">Ошибка: ${error.message}</p>`;
        updateStatus(false);
    }
}

// Атака босса
async function attackBoss() {
    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '⚔️ Атака...';
    
    try {
        const response = await fetch(`${BOT_API_URL}/boss/attack`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ attack_type: 'punchChest' })
        });
        
        const data = await response.json();
        
        if (data.success) {
            tg.showPopup({
                title: 'Успех!',
                message: `Атака выполнена!\nУрон: ${data.damage || 'N/A'}`,
                buttons: [{ text: 'OK', type: 'ok' }]
            });
            loadBossInfo();
            loadStats();
        } else {
            tg.showAlert(data.error || 'Ошибка атаки');
        }
    } catch (error) {
        tg.showAlert(`Ошибка: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = '⚔️ Атаковать';
    }
}

// Загрузка списка тюрем
async function loadPrisons() {
    const select = document.getElementById('prison-select');
    
    try {
        const response = await fetch(`${BOT_API_URL}/prisons/tops-all`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки');
        
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
    
    prisonInfo.innerHTML = '<p class="loading">Загрузка...</p>';
    walkBtn.disabled = true;
    
    try {
        const response = await fetch(`${BOT_API_URL}/prison/${prisonId}?isDay=${isDay}`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки');
        
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
        prisonInfo.innerHTML = `<p class="error">Ошибка: ${error.message}</p>`;
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
    
    const confirmed = await new Promise(resolve => {
        tg.showConfirm('Начать автоматическое прохождение?', resolve);
    });
    
    if (!confirmed) return;
    
    btn.disabled = true;
    btn.textContent = '🚀 Прохождение...';
    
    try {
        const response = await fetch(`${BOT_API_URL}/prison/${prisonId}/walk?isDay=${isDay}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            tg.showPopup({
                title: 'Прохождение начато',
                message: `Кликов: ${data.total_clicks || 0}\nСигареты: ${data.total_cigarettes || 0}`,
                buttons: [{ text: 'OK', type: 'ok' }]
            });
            loadPrisonInfo();
            loadStats();
        } else {
            tg.showAlert(data.error || 'Ошибка');
        }
    } catch (error) {
        tg.showAlert(`Ошибка: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = '🚀 Начать прохождение';
    }
}

// Загрузка статистики
async function loadStats() {
    try {
        const response = await fetch(`${BOT_API_URL}/stats`, {
            headers: {
                'Authorization': `Bearer ${getToken()}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.total_attacks !== undefined) {
                document.getElementById('total-attacks').textContent = data.total_attacks;
            }
            if (data.energy !== undefined) {
                document.getElementById('energy').textContent = `${data.energy}/${data.max_energy || 50}`;
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Получение токена из Telegram WebApp
function getToken() {
    // В реальном приложении токен должен передаваться через initData
    // или храниться в безопасном месте
    return tg.initDataUnsafe?.user?.id || '';
}
