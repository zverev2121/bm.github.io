# Telegram Mini App для Priston Bot

Это веб-интерфейс для управления ботом через Telegram Mini App.

## Установка

1. Разместите файлы (`index.html`, `style.css`, `app.js`) на веб-сервере с HTTPS
2. Настройте URL в боте (см. ниже)

## Настройка в боте

Добавьте кнопку Mini App в бота:

```python
from telegram import InlineKeyboardButton, InlineKeyboardMarkup

def start_command(self, update: Update, context: CallbackContext):
    keyboard = [[
        InlineKeyboardButton(
            "Открыть Mini App",
            web_app=WebAppInfo(url="https://your-domain.com/webapp/")
        )
    ]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    update.message.reply_text("Выберите действие:", reply_markup=reply_markup)
```

## Настройка API

В файле `app.js` измените `BOT_API_URL` на URL вашего API:

```javascript
const BOT_API_URL = 'https://your-domain.com/api';
```

## API Endpoints

Бот должен предоставлять следующие API endpoints:

- `GET /api/boss/bootstrap` - информация о боссе
- `POST /api/boss/attack` - атака босса
- `GET /api/prisons/tops-all` - список тюрем
- `GET /api/prison/{id}?isDay={bool}` - информация о тюрьме
- `POST /api/prison/{id}/walk?isDay={bool}` - прохождение тюрьмы
- `GET /api/stats` - статистика

## Локальная разработка

Для локальной разработки используйте ngrok или аналогичный инструмент:

```bash
ngrok http 8000
```

Затем используйте полученный HTTPS URL в настройках бота.

