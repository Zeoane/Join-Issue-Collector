# Join-Issue Collector

Join-Issue Collector ist eine statische Multi-Page-Web-App (Vanilla HTML/CSS/JS) mit Firebase Realtime Database und Firebase Authentication.

<a id="inhaltsverzeichnis"></a>
## Inhaltsverzeichnis

- [Features](#features)
- [Voraussetzungen](#voraussetzungen)
- [Setup](#setup)
- [1. Firebase konfigurieren](#setup-firebase)
- [2. Security Rules deployen](#setup-rules)
- [3. Lokal starten](#setup-local)
- [4. Entwicklungstools](#setup-tools)
- [n8n Final-Konfiguration (E-Mail -> Triage)](#n8n-final)
- [Projektstruktur](#projektstruktur)
- [Add-Task Modulstruktur](#addtask-modulstruktur)
- [Auth & Guest-Mode](#auth-guest-mode)
- [Migration von alter Auth](#migration)
- [Bekannte Einschränkungen](#einschraenkungen)
- [Seitenübersicht](#seitenuebersicht)

<a id="features"></a>
## Features

- **Summary** – Dashboard mit Begrüßung und Task-Statistiken
- **Board** – Kanban-Board mit Drag & Drop
- **Add Task** – Tasks anlegen
- **Contacts** – Kontaktverwaltung
- **Auth** – Login, Signup, Guest-Mode

<a id="voraussetzungen"></a>
## Voraussetzungen

- [Node.js](https://nodejs.org/) 18+ (für Linting und Tests)
- [Firebase CLI](https://firebase.google.com/docs/cli) (optional, für Security Rules)
- Ein Firebase-Projekt mit **Realtime Database** und **Authentication**

<a id="setup"></a>
## Setup

<a id="setup-firebase"></a>
### 1. Firebase konfigurieren

1. In der [Firebase Console](https://console.firebase.google.com/) **Email/Password** und **Anonymous** Auth aktivieren.
2. `js/firebase-config.example.js` nach `js/firebase-config.js` kopieren (falls noch nicht vorhanden).
3. Web-App-Konfiguration aus Firebase Console eintragen (`apiKey`, `messagingSenderId`, `appId`).

**Wichtig:** `js/firebase-config.js` ist in `.gitignore` und darf **nicht** ins Repository committed werden. Liegt ein API-Key bereits in GitHub, in der [Google Cloud Console](https://console.cloud.google.com/apis/credentials) den betroffenen Key **rotieren/revoken**, lokal `js/firebase-config.js` mit dem neuen Key aktualisieren und den GitHub-Secret-Alert als „revoked“ schließen.

<a id="setup-rules"></a>
### 2. Security Rules deployen

```bash
firebase login
firebase use join-issue-collector-70cb7
firebase deploy --only database
```

Die Rules liegen in `database.rules.json`. Sie erlauben Lese-/Schreibzugriff nur für den authentifizierten eigenen User-Pfad `users/{uid}/`.

<a id="setup-local"></a>
### 3. Lokal starten

Statischen Server im Projektroot starten, z. B.:

```bash
npx serve .
# oder
python -m http.server 5500
```

Dann `http://localhost:3000` (serve) bzw. `http://localhost:5500` öffnen.

<a id="setup-tools"></a>
### 4. Entwicklungstools

```bash
npm install
npm run lint
npm test
```

<a id="n8n-final"></a>
## n8n Final-Konfiguration (E-Mail -> Triage)

Die produktive Automatisierung läuft aktuell als ein Workflow:

- `n8n/workflows/Join-email-to-task-proposal.json`

Regenerierung:

```bash
python n8n/scripts/build-email-workflow.py
```

- **Aktiver Workflow:** Nur `Join-email-to-task-proposal` in n8n aktiv/published halten.
- **Trigger:** `Schedule Trigger (every 5 min)` ist der produktive Einstieg. Der IMAP-Zweig bleibt deaktiviert.
- **E-Mail Abruf:** `Fetch unread emails (Gmail)` mit `Return All = true` und Search `in:inbox is:unread`.
- **Automations-Cap:** `Apply auto email cap (max 10)` (Code-Node, Modus `Run Once for All Items`) begrenzt die automatische Verarbeitung auf **10 E-Mails pro Tag**.
- **Cap-Verhalten:** Ist das Tageslimit erreicht (`skipTaskCreation = true`), geht der Flow direkt in den manuellen Nachbearbeitungszweig (`zu bearbeiten`), ohne neue Task-Erstellung.
- **Task-API Auth:** `Create task in Triage` sendet Header `X-N8N-Secret` und muss exakt zum Firebase Functions Secret `N8N_API_SECRET` passen.
- **401 Unauthorized (Troubleshooting):** In der n8n-Credential `Header Auth account` muss der gleiche Secret-Wert wie in Firebase `N8N_API_SECRET` stehen (ohne zusätzliche Leerzeichen/Zeilenumbruch). Alternativ funktioniert auch `Authorization: Bearer <secret>`.
- **Erfolgsbewertung:** `Evaluate create result` behandelt als Erfolg: `201` oder `200` mit `duplicate=true` oder vorhandener `id`.
- **Erfolgspfad:** Task wird in `triageColumn` erstellt, E-Mail wird in Gmail auf `Erledigt` gelabelt und aus `INBOX` entfernt.
- **Fehlerpfad:** Bei API-/Validierungsfehlern wird die Mail mit `zu bearbeiten` gelabelt.

<a id="projektstruktur"></a>
## Projektstruktur

```
Join-Issue Collector/
├── index.html              # Splash → Login
├── main.js                 # Globale Config & UI-Chrome
├── assets/index/           # HTML-Seiten
├── assets/css/             # Stylesheets
├── js/
│   ├── firebase-config.example.js  # Vorlage (committen)
│   ├── firebase-config.js          # Lokal, gitignored – apiKey eintragen
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

<a id="addtask-modulstruktur"></a>
## Add-Task Modulstruktur

Der Add-Task-Bereich ist bewusst in kleine, klar getrennte Dateien aufgeteilt:

- `js/addTaskForm.js`  
  Overlay-/Form-Initialisierung, Date-Picker, globale UI-Helfer (ohne Subtask-/Assignee-Fachlogik).
- `js/addTaskSubtasks.js`  
  Komplette Subtask-Logik (Anlegen, Editieren, Validieren, Enter-Handling).
- `js/addTaskAssigneesData.js`  
  Datenzugriff und Normalisierung für Assignees (Auth-Check, Kontakte laden, Owner ergänzen).
- `js/addTaskAssigneesUI.js`  
  Assignee-UI (Rendern, Suchen/Filtern, Auswahlzustand, Icon-Overflow `+N`).

### Script-Ladereihenfolge (wichtig)

Da ohne Build-Step gearbeitet wird, müssen die Scripts in den HTML-Seiten in dieser Reihenfolge eingebunden bleiben:

1. `js/addTaskForm.js`
2. `js/addTaskSubtasks.js`
3. `js/addTaskAssigneesData.js`
4. `js/addTaskAssigneesUI.js`

`addTaskAssigneesUI.js` verwendet Funktionen aus der Data-Datei, daher muss `addTaskAssigneesData.js` vorher geladen werden.

<a id="auth-guest-mode"></a>
## Auth & Guest-Mode

- **Registrierte User:** Firebase Email/Password Auth; Profil unter `users/{uid}/`
- **Gast:** Firebase Anonymous Auth; Daten werden beim Logout gelöscht
- **Session:** Firebase Auth State + `localStorage.loggedInUserKey`

Geschützte Seiten haben `data-auth="required"` am `<body>`-Tag.

<a id="migration"></a>
## Migration von alter Auth

Bestehende User mit Klartext-Passwörtern in der Realtime DB sind **nicht kompatibel** mit der neuen Firebase-Auth. Neue Registrierung erforderlich.

<a id="einschraenkungen"></a>
## Bekannte Einschränkungen

- `js/firebase-config.js` muss mit gültigem `apiKey` befüllt sein, sonst funktioniert Auth nicht.
- Security Rules müssen in Firebase deployed sein, sonst schlagen DB-Zugriffe fehl.
- Kein Build-Step: Scripts werden direkt per `<script>`-Tags geladen.

<a id="seitenuebersicht"></a>
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
