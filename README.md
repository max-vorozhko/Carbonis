# Carbonis BBQ

PWA-додаток Carbonis charcoal group: BBQ-калькулятор деревного вугілля і гра «Пригоди Вуглинки». Українська й англійська мови.

- Відкрити: https://max-vorozhko.github.io/Carbonis/
- Встановлення на телефон: iPhone — Safari → «Поділитися» → «На початковий екран»; Android — кнопка «Встановити» на сторінці.

## Структура

| Шлях | Що це |
|---|---|
| `index.html` | Головна: калькулятор і три гри |
| `calculator/` | BBQ-калькулятор: кілограми, мішки, жар, час, чек-лист, «Поділитися» (стан у посиланні `?dish=&people=&device=`) |
| `game/` | «Пригоди Вуглинки»: «Мішок», «Фура», «Гриль» по 3 рівні; `?mode=bag\|truck\|grill` відкриває одну гру, `#leaderboard` — рейтинг |
| `js/common.js` | Спільне: мова UA/EN, статистика GoatCounter, сервіс-воркер, підказка «Встановити» |
| `sw.js`, `manifest.webmanifest` | PWA: робота без інтернету, іконка на екрані |
| `assets/icons/` | Іконки з логотипа Carbonis |
| `firestore.rules` | Правила бази онлайн-рейтингу |

Норми калькулятора (порції, коефіцієнти, фасування мішків) — в об'єкті `CONFIG` у `calculator/index.html`.

## Онлайн-рейтинг (Firebase)

Firestore, колекція `carbonis_players`, один запис на гравця (анонімний вхід Firebase). Таблиці: загальний рахунок і рекорд кожного рівня. Онлайн-режим вмикається на `github.io` (або з `#online` в адресі); локально результати зберігаються лише в браузері.

Налаштування один раз:
1. https://console.firebase.google.com → проєкт `carbonis-game`.
2. Authentication → Sign-in method → **Anonymous** → Enable.
3. Firestore Database → Rules: вміст [`firestore.rules`](firestore.rules) → Publish.
4. Authentication → Settings → Authorized domains: `max-vorozhko.github.io`.

## Статистика (GoatCounter)

Перегляди сторінок і події (старт і проходження рівнів, «Поділитися», «Де купити», встановлення) рахує GoatCounter без cookie, лише на `github.io`. Код сайту — `goatcounter` у `js/common.js` (зараз `carbonis-bbq`); сайт з таким кодом треба зареєструвати на https://www.goatcounter.com/signup.

## Оновлення

Після змін у файлах, які кешує сервіс-воркер, збільшуйте номер у `CACHE` в `sw.js` (`carbonis-bbq-v1` → `v2`), щоб встановлені додатки підтягнули нову версію.

Powered by Max Vorozhko
