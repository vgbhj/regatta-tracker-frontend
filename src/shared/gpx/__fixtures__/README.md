# GPX fixtures

Файлы для тестирования `parseGpx`.

## Источник

Все фикстуры собраны на основе `kirienko/gpx-player` (MIT,
https://github.com/kirienko/gpx-player), `example-data/`.

| Файл | Происхождение | Что проверяет |
| --- | --- | --- |
| `sample.gpx` | Склеен из `osm-demo-Alex.gpx`, `osm-demo-Richard.gpx`, `osm-demo-Yury.gpx` (по 150 первых точек), реальная парусная сессия 2024-06-15, Гамбург, Эльба. Имена `<trk><name>` заменены на `Yacht Alex/Richard/Yury` ради уникальности. | Happy-path: 3 яхты, 1 `<trkseg>` каждая |
| `sample-duplicates.gpx` | Бит-в-бит копия `duplicate-timestamps.gpx` | Дублирующиеся `<time>` |
| `sample-broken-time.gpx` | Бит-в-бит копия `wrong-timestamp-order.gpx` | Нарушение монотонности времени |

## Лицензия

Исходный репозиторий под MIT (© 2023 kirienko). Использование в качестве
тестовых фикстур учебного проекта (бакалаврская ВКР, МАИ) допускается с
указанием источника, что и сделано в этой таблице.
