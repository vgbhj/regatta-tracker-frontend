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
npm run dev
```

## Основные команды

| Команда            | Описание                  |
|--------------------|---------------------------|
| `npm run dev`      | Dev-сервер на :5173       |
| `npm run build`    | Сборка в `dist/`          |
| `npm run preview`  | Просмотр production-сборки|
| `npm test`         | Запуск тестов             |
| `npm run lint`     | Линтинг                   |

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
