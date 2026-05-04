# RegattaTracker — веб-клиент

Веб-приложение для воспроизведения и анализа парусных регат. Часть системы RegattaTracker, разработанной в рамках ВКР на кафедре 806 МАИ.

Мобильные клиенты (участники и судьи) записывают GPS-треки и отправляют их на сервер. Этот веб-клиент визуализирует данные: 2D-карта на Leaflet, 3D-сцена на Three.js, временная шкала, графики метрик.

## Стек

- TypeScript, React, Vite
- Redux Toolkit + RTK Query
- Leaflet (2D-карта)
- Three.js + React Three Fiber (3D-сцена)
- Recharts (графики)
- Vitest (тесты)

## Запуск

```bash
npm install
npm run backend
npm run dev
```

Backend по умолчанию слушает `http://localhost:3000`, а Vite проксирует
`/api` на него. В тестовом backend есть демо-гонка в сочинской акватории
Черного моря с несколькими яхтами, знаками дистанции и GPX-треками для
визуализации.

## Запуск в Docker

```bash
docker compose up --build
# или, если Compose установлен как standalone binary:
docker-compose up --build
```

После запуска приложение доступно на `http://localhost:5173`. Docker-сборка
открывает вкладку "С сервера" и автоматически загружает демо-гонку, чтобы сразу
показать треки на 2D-карте и в 3D-сцене.

## Основные команды

| Команда           | Описание                   |
| ----------------- | -------------------------- |
| `npm run dev`     | Dev-сервер на :5173        |
| `npm run backend` | Тестовый backend на :3000  |
| `npm run build`   | Сборка в `dist/`           |
| `npm run preview` | Просмотр production-сборки |
| `npm test`        | Запуск тестов              |
| `npm run lint`    | Линтинг                    |

## Структура проекта

Архитектура — Feature-Sliced Design:

```
src/
  app/        — точка входа, провайдеры, роутинг
  pages/      — страницы
  widgets/    — составные UI-блоки (MapView, Scene3DView, Timeline)
  features/   — пользовательские сценарии (загрузка гонки, плеер)
  entities/   — доменные сущности (race, yacht, track, mark)
  shared/     — утилиты, UI-кит, API-клиент, интерполяция
```
