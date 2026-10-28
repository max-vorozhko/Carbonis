# Carbonis

## Пригоди Вуглинки

Браузерна гра Carbonis на 9 рівнів: Вуглинка фасує вугілля в мішки, складає палети у фуру і смажить на грилі.

- Грати: https://max-vorozhko.github.io/Carbonis/
- Код гри: [`game/index.html`](game/index.html), один файл без збірки.

### Онлайн-рейтинг (Firebase)

Рейтинг спільний для всіх гравців: Firestore, колекція `carbonis_players`, один запис на гравця (анонімний вхід Firebase). Таблиці: загальний рахунок і рекорд кожного рівня. Онлайн-режим вмикається на `github.io` (або з `#online` в адресі); локально результати зберігаються лише в браузері.

Налаштування один раз:
1. https://console.firebase.google.com → Add project (напр. `carbonis-game`).
2. Build → Authentication → Get started → Sign-in method → **Anonymous** → Enable.
3. Build → Firestore Database → Create database (production mode, регіон `eur3`).
4. Firestore → Rules: вставити вміст [`firestore.rules`](firestore.rules) → Publish.
5. Project settings → Your apps → Web (`</>`) → зареєструвати застосунок і скопіювати `firebaseConfig` у константу `FIREBASE` в `game/index.html`.
6. Authentication → Settings → Authorized domains: додати `max-vorozhko.github.io`.

Powered by Max Vorozhko
