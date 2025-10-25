# Отказоустойчивый сервис канала связи

Небольшая библиотека для управления несколькими каналами связи (HTTP и WebSocket) с автоматическим health-check'ом, буферизацией запросов и механизмом переключения (failover) между каналами.

В репозитории содержатся:

- Реализация абстрактного `BaseChannel` и конкретных каналов `HttpChannel` и `WebSocketChannel`.
- Менеджеры для выбора/переключения каналов (`ChannelManager`) и периодической проверки состояния (`HealthManager`).
- Сервис `ConnectionService` как удобный фасад для инициализации каналов и отправки данных.
- Утилиты: буфер запросов (`RequestBuffer`), событийный эмиттер и простой логгер.
- Тесты на Jest (unit).

## Быстрый старт

Требования:

- Node.js 16+ (рекомендуется LTS). Наличие npm.

Установите зависимости:

```bash
npm install
```

Скрипты в `package.json`:

- `npm run build` — компиляция TypeScript (`tsc`).
- `npm run dev` — запуск `npx ts-node demo-integration.ts`.
- `npm test` — запуск тестов (Jest).

> Примечание: В этом репозитории есть один демонстрационный скрипт:

- `demo-integration.ts` — интеграционный демон, поднимает локальные HTTP и WebSocket серверы и проверяет работу реальных `HttpChannel` и `WebSocketChannel`.

## Запуск тестов

Запустите весь набор тестов (unit + интеграционные тесты):

```bash
npm test
```

Если нужно только unit-тесты, можно запустить Jest с фильтром или отдельными тест-файлами.

## Запуск демо

Интеграционный демон (локальные HTTP + WebSocket серверы):

```bash
npm run dev
```

Этот скрипт поднимает локальный HTTP-сервер (порт 3005) и WebSocket-сервер (порт 3006), инициализирует `HttpChannel` и `WebSocketChannel`, делает health-check, отправляет запросы и демонстрирует передачу сообщений и работу `ConnectionService`.

Если хотите изменить порты, отредактируйте `demo-integration.ts`.

## Структура репозитория (основное)

```
src/
	channels/        # BaseChannel, HttpChannel, WebSocketChannel
	managers/        # ChannelManager, HealthManager
	services/        # ConnectionService
	utils/           # buffer, eventEmitter, logger
tests/             # unit тесты
demo-integration.ts# интеграционный демон с локальными серверами
```
