require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { createWriteStream } = require('fs');
const { promisify } = require('util');
const streamPipeline = promisify(require('stream').pipeline);

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const alfaApiKey = process.env.ALFA_API_KEY;

const bot = new Telegraf(telegramBotToken);

// Состояние для хранения информации о текущем шаге пользователя и его данных
const sessions = {};

bot.start((ctx) => ctx.reply('Привет! Отправьте мне XLSX файл со списком клиентов.'));

bot.on('document', async (ctx) => {
    const chatId = ctx.chat.id;
    sessions[chatId] = { step: 'awaiting_file' }; // Инициализация состояния

    const documentId = ctx.update.message.document.file_id;

    try {
        const fileLink = await ctx.telegram.getFileLink(documentId);
        const response = await axios.get(fileLink, { responseType: 'stream' });
        const filePath = `./downloads/${chatId}_${documentId}.xlsx`;

        await streamPipeline(response.data, createWriteStream(filePath));
        sessions[chatId].filePath = filePath; // Сохраняем путь к файлу в состоянии

        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json.length > 0) {
            sessions[chatId].data = json; // Сохраняем данные файла в состоянии
            sessions[chatId].step = 'awaiting_inn_column'; // Обновляем шаг в состоянии
            ctx.reply('Введите название колонки с ИНН.');
        } else {
            ctx.reply('Файл пустой.');
        }
    } catch (error) {
        console.error(error);
        ctx.reply('Произошла ошибка при обработке файла.');
    }
});

// Обработка ввода от пользователя
bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const text = ctx.message.text;
    const session = sessions[chatId];

    if (!session) return;

    switch (session.step) {
        case 'awaiting_inn_column':
            session.innColumn = text;
            session.step = 'awaiting_phone_column';
            ctx.reply('Введите название колонки с телефонами.');
            break;
        case 'awaiting_phone_column':
            session.phoneColumn = text;
            session.step = 'processing';
            processFile(ctx, session);
            break;
        default:
            ctx.reply('Неизвестная команда.');
    }
});

// Функция для обработки файла и отправки запросов в API
async function processFile(ctx, session) {
    const { innColumn, phoneColumn, data } = session;

    const productCodesEntries = Object.entries({
        'LP_RKO': 'РКО',
        'LP_ACQ_TR': 'Торговый эквайринг',
        'LP_AKASSA': 'Альфа-касса',
        'LP_LOAN_BUS': 'Бизнес кредит',
        'LP_OVER_ADV': 'Овердрафт для новых клиентов банка',
        'LP_SPECACC44': 'Спец. счет 44-ФЗ',
        'LP_ACQ_E': 'Эквайринг (Интернет)'
    });

    for (const row of data) {
        const inn = row[innColumn];
        const phone = row[phoneColumn] ? row[phoneColumn] : ''; // Пример получения телефона, если есть

        // Вызов checkClientInAlfaBank для каждой пары код-название продукта
        for (const [code, name] of productCodesEntries) {
            await checkClientInAlfaBank(ctx, inn, phone, code, name);
        }
    }
    // По завершении обработки
    ctx.reply('Обработка завершена.');
}

function delay(duration) {
    return new Promise(resolve => setTimeout(resolve, duration));
}


// Обновленная функция проверки клиента в Альфа-Банке с задержкой
async function checkClientInAlfaBank(ctx, inn, phone, code, name) {
    console.log(`Начинаем проверку клиента с ИНН: ${inn} и телефоном: ${phone} по продукту ${code}`);
    let responseMessage = `Проверка по ИНН ${inn}:\n`;

    // Добавляем задержку в 5 секунд перед запросом
    await delay(5000);

    try {
        const response = await axios.post('https://partner.alfabank.ru/public-api/v2/checks', {
            "organizationInfo": {
                "inn": inn
            },
            "contactInfo": phone ? [{"phoneNumber": phone}] : [],
            "productInfo": [{ "productCode": code }]
        }, {
            headers: {
                'Content-Type': 'application/json',
                'API-key': alfaApiKey,
            }
        });

        // Определение результата проверки
        if (response.data && response.data.result) {
            if (response.data.result.isClient) {
                responseMessage += `❌ по продукту ${code} (${name}) есть заявки.\n`;
            } else {
                responseMessage += `✅ по продукту ${code} (${name}) информация не найдена.\n`;
            }
        } else {
            responseMessage += `✅ по продукту ${code} (${name}) информация не найдена.\n`;
        }
    } catch (error) {
        console.log(`Ошибка при проверке ИНН ${inn} по продукту ${code}:`, error.response ? error.response.data : error.message);
        responseMessage += `❌ по продукту ${name} произошла ошибка.\n`;
    }

    // Отправка сформированного сообщения
    ctx.reply(responseMessage);
}




// Запуск бота
bot.launch().then(() => {
    console.log('Бот успешно запущен');
  });
  
  // Обработка сигнала завершения работы
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
