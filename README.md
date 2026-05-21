# Твій Одяг — HTML лендінг + CRM + Firebase

## Файли

- `index.html` — головна сторінка магазину.
- `style.css` — дизайн сайту.
- `script.js` — каталог і форма замовлення.
- `firebase.js` — налаштування Firebase.
- `admin/admin.html` — CRM / адмінка.
- `admin/admin.css` — дизайн CRM.
- `admin/admin.js` — додавання товарів, фото, замовлення, статуси.

## Як підключити Firebase

1. Зайди у Firebase Console.
2. Створи проєкт.
3. Додай Web App.
4. Скопіюй firebaseConfig.
5. Відкрий `firebase.js`.
6. Заміни:

```js
const firebaseConfig = {
  apiKey: "PASTE_API_KEY",
  ...
};
```

на свої дані.

## Увімкни Firestore

Firebase Console → Firestore Database → Create database.

Тимчасові правила для тесту:

```js
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## Увімкни Storage

Firebase Console → Storage → Get started.

Тимчасові правила для тесту:

```js
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true;
    }
  }
}
```

ВАЖЛИВО: ці правила тільки для тесту. Для реального магазину треба закрити доступ через логін адміна.

## Як додати товар

1. Відкрий `admin/admin.html`.
2. Заповни назву, ціну, розміри.
3. Завантаж фото файлом або встав посилання.
4. Натисни “Додати товар”.
5. Товар зʼявиться на головній сторінці.

## Як розмістити сайт

Найпростіше:
- Netlify Drop
- Firebase Hosting
- Vercel
- будь-який звичайний хостинг

Для тесту можеш просто відкрити `index.html`, але Firebase-модулі краще працюють через хостинг або локальний сервер.

Локальний сервер:
```bash
python -m http.server 5500
```

Потім відкрий:
```text
http://localhost:5500
```
