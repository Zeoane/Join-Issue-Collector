# JOIN – Kanban Project Management Tool

JOIN ist eine statische Multi-Page-Web-App (Vanilla HTML/CSS/JS) mit Firebase Realtime Database und Firebase Authentication.

## Features

- **Summary** – Dashboard mit Begrüßung und Task-Statistiken
- **Board** – Kanban-Board mit Drag & Drop
- **Add Task** – Tasks anlegen
- **Contacts** – Kontaktverwaltung
- **Auth** – Login, Signup, Guest-Mode

## Voraussetzungen

- [Node.js](https://nodejs.org/) 18+ (für Linting und Tests)
- [Firebase CLI](https://firebase.google.com/docs/cli) (optional, für Security Rules)
- Ein Firebase-Projekt mit **Realtime Database** und **Authentication**

## Setup

### 1. Firebase konfigurieren

1. In der [Firebase Console](https://console.firebase.google.com/) **Email/Password** und **Anonymous** Auth aktivieren.
2. `js/firebase-config.example.js` nach `js/firebase-config.js` kopieren (falls noch nicht vorhanden).
3. Web-App-Konfiguration aus Firebase Console eintragen (`apiKey`, `messagingSenderId`, `appId`).

### 2. Security Rules deployen

```bash
firebase login
firebase use join-475-370cd
firebase deploy --only database
```

Die Rules liegen in `database.rules.json`. Sie erlauben Lese-/Schreibzugriff nur für den authentifizierten eigenen User-Pfad `users/{uid}/`.

### 3. Lokal starten

Statischen Server im Projektroot starten, z. B.:

```bash
npx serve .
# oder
python -m http.server 5500
```

Dann `http://localhost:3000` (serve) bzw. `http://localhost:5500` öffnen.

### 4. Entwicklungstools

```bash
npm install
npm run lint
npm test
```

## Projektstruktur

```
JOIN-2/
├── index.html              # Splash → Login
├── main.js                 # Globale Config & UI-Chrome
├── assets/index/           # HTML-Seiten
├── assets/css/             # Stylesheets
├── js/
│   ├── firebase-config.js  # Firebase Web-Config (apiKey eintragen!)
│   ├── firebase-init.js    # Firebase SDK Init
│   ├── auth-service.js     # Login, Signup, Guest, Logout
│   ├── authGuard.js        # Zentraler Seiten-Schutz
│   ├── remoteStorage.js    # CRUD mit Auth-Token
│   ├── utils.js            # escapeHtml, getInitials, …
│   ├── passwordMask.js     # Gemeinsame Passwort-Maskierung
│   └── templates/          # HTML-String-Templates
├── database.rules.json     # Firebase Security Rules
└── tests/                  # Vitest Unit-Tests
```

## Auth & Guest-Mode

- **Registrierte User:** Firebase Email/Password Auth; Profil unter `users/{uid}/`
- **Gast:** Firebase Anonymous Auth; Daten werden beim Logout gelöscht
- **Session:** Firebase Auth State + `localStorage.loggedInUserKey`

Geschützte Seiten haben `data-auth="required"` am `<body>`-Tag.

## Migration von alter Auth

Bestehende User mit Klartext-Passwörtern in der Realtime DB sind **nicht kompatibel** mit der neuen Firebase-Auth. Neue Registrierung erforderlich.

## Bekannte Einschränkungen

- `js/firebase-config.js` muss mit gültigem `apiKey` befüllt sein, sonst funktioniert Auth nicht.
- Security Rules müssen in Firebase deployed sein, sonst schlagen DB-Zugriffe fehl.
- Kein Build-Step: Scripts werden direkt per `<script>`-Tags geladen.

## Seitenübersicht

| Seite | Pfad | Auth |
|-------|------|------|
| Login | `assets/index/login.html` | Nein |
| Signup | `assets/index/signup.html` | Nein |
| Summary | `assets/index/summary.html` | Ja |
| Board | `assets/index/board.html` | Ja |
| Add Task | `assets/index/addTask.html` | Ja |
| Contacts | `assets/index/contacts.html` | Ja |
| Help | `assets/index/help.html` | Ja |
# Join-Issue-Collector
