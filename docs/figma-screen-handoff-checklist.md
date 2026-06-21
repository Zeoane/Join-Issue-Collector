# Checkliste: Figma-Screen an Agent übergeben

Nutze diese Liste **pro Screen**, bevor du mit der Umsetzung startest.  
Du brauchst **keinen Bearbeitungszugriff** in Figma — Screenshots, Links und Inspect-Daten reichen.

---

## Screen-Identifikation

- [ ] **Screen-Name** festgelegt (z. B. Homescreen, Welcome, Stakeholder, Limit reached, E-Mail-Maske)
- [ ] **Zweck** in 1–2 Sätzen beschrieben (was soll der Nutzer hier tun/verstehen?)
- [ ] **Zielgruppe** notiert (Stakeholder / Teammitglied / beide)

---

## Figma-Material (mindestens eins davon)

- [ ] **Screenshot** exportiert (PNG oder WebP, vollständiger Screen)
- [ ] **Figma-Link** mit `node-id` (View-only reicht)
- [ ] Optional: **Mobile + Desktop**, falls im Design unterschiedlich

---

## Inhalte & Texte

- [ ] Alle **sichtbaren Texte** mitgeschickt (Überschriften, Fließtext, Buttons, Links)
- [ ] **E-Mail-Adresse** für Feature Requests (falls auf dem Screen genannt)
- [ ] **Limit-Hinweis** (z. B. „max. 10 Anfragen pro Tag“), falls relevant
- [ ] **CTA-Labels** exakt wie im Design (z. B. „Feature Request stellen“, „Board erkunden“)

---

## Layout & Design-Specs (so weit verfügbar)

- [ ] **Schriftgrößen** aus Inspect: Body ≥ 16px, Kleingedrucktes ≥ 14px
- [ ] **Farben** (Hex oder Figma-Token-Namen)
- [ ] **Abstände** bei kritischen Elementen (Header, Hero, Buttons, Footer)
- [ ] **Breakpoints**: ab welcher Breite ändert sich das Layout?
- [ ] **Assets**: Logo, Icons, Illustrationen als Export oder Pfad-Hinweis

---

## Interaktion & Navigation

- [ ] **Klickziele** je Button/Link (wohin navigiert es?)
- [ ] **Weiche** dokumentiert (Stakeholder vs. Team/Board), falls auf dem Screen
- [ ] **Zustände** mitgeliefert, falls im Design vorhanden:
  - [ ] Normal
  - [ ] Hover / Focus (optional)
  - [ ] Fehler / Limit erreicht
  - [ ] Leer / Platzhalter

---

## Technische Hinweise für die Umsetzung

- [ ] **Neue Seite** oder **Anpassung** einer bestehenden Join-Seite?
- [ ] **Auth nötig?** (ja/nein — Landing meist nein, Board ja)
- [ ] **Semantisches HTML** gewünscht: Header, main, section, footer markiert?
- [ ] Bekannte **Abweichungen** vom Figma-Vorgabe-Design notiert

---

## Screens laut Projektplan (Sammelübersicht)

| Screen | Material gesendet | Umsetzung gestartet | Review OK |
|--------|-------------------|---------------------|-----------|
| Homescreen | [ ] | [ ] | [ ] |
| Welcome Page | [ ] | [ ] | [ ] |
| Stakeholder Page | [ ] | [ ] | [ ] |
| Stakeholder – Limit reached | [ ] | [ ] | [ ] |
| E-Mail-Maske / Flow | [ ] | [ ] | [ ] |
| Board – kleinere Anpassungen | [ ] | [ ] | [ ] |

---

## Mindest-Paket (wenn wenig Zeit)

Wenn du es kurz halten willst, reicht pro Screen:

1. Screenshot **oder** Figma-Link  
2. Screen-Name + Zweck  
3. Alle Texte + Button-Beschriftungen  
4. Ziel-URLs der Klicks  

Alles andere kann ich aus dem Bild/Link ableiten und bei Unklarheit nachfragen.

---

## Beispiel-Nachricht an den Agent

```text
Screen: Stakeholder Page
Zweck: Stakeholder sollen verstehen, wie sie per E-Mail Feature Requests einreichen.
Material: [Screenshot angehängt] + Figma-Link: https://figma.com/design/...
Texte: [Copy hier einfügen]
CTAs: "Feature Request per E-Mail" → mailto:join-issue-collector@…
       "Board erkunden" → assets/index/login.html
Limit-Hinweis: "Maximal 10 Anfragen pro Tag"
Breakpoints: Desktop ab 1024px, Mobile darunter
```
