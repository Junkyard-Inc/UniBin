# Documentazione Architetturale Frontend - UniBin

## 1. Panoramica del Progetto

**UniBin** è un'applicazione web mobile-first sviluppata per la gestione e la segnalazione geolocalizzata di bidoni e punti di raccolta differenziata. L'obiettivo è offrire un'interfaccia moderna, reattiva e modulare, basata su un'architettura scalabile orientata alle feature.

### Tech Stack

- **Runtime & Package Manager:** Bun
- **Librerie Core:** React, Vite
- **Mappe:** Leaflet (`leaflet`, con integrazione nativa tramite ref/eventi e deduplicazione delle dipendenze in Vite)
- **UI & Componenti:** Material UI (MUI) (`@mui/material`, `@mui/icons-material`, Emotion)
- **Routing:** React Router DOM

---

## 2. Architettura e Struttura delle Cartelle (Feature-Based)

Per evitare di appesantire la logica in `App.tsx` e mantenere il codice pulito e manutenibile con la crescita delle funzionalità, il frontend del progetto adotta una struttura modulare divisa per domini applicativi:

```text
src/
├── components/          # Componenti UI generici e riutilizzabili (es. CustomIconButton)
├── features/            # Logica di dominio divisa per funzionalità
│   ├── map/             # MapBackground.tsx (mappa pura), MapControls.tsx (UI fluttuante)
│   ├── bins/            # API (binsService), Hook (useBins), Marker ed il componente BinDetailsDrawer
│   └── auth/            # Gestione ruoli, AuthContext, protezione delle rotte
├── store/               # Provider globali dell'applicazione
├── layout/              # Layout principale dell'applicazione (TopBar o NavigationBar e la struttura della pagina)
├── routes/              # Viste principali (MapPage.tsx, AdminPage.tsx)
├── services/            # moduli per le chiamate verso il backend
└── App.tsx              # Router principale e Provider globali
```

---

## 3. Responsabilità dei componenti

- **`MapBackground.tsx` (Livello visivo della mappa):**
  - Gestisce esclusivamente l'istanza di Leaflet, i tile layer, il rendering dei marker dei bidoni ed il tracciamento GPS nativo (`map.locate({ watch: true })`).
  - Utilizza un marker circolare (`L.circleMarker`) per rappresentare in modo pulito la posizione GPS dell'utente.
  - Non contiene logica di business, stati di autenticazione o pulsanti di interazione esterna.
- **`MapControls.tsx` (Livello di interazione UI):**
  - Raggruppa i controlli UI sovrapposti alla mappa (pulsante GPS/ricentratura, filtri, tasto per aggiungere un bidone) realizzati con gli `IconButton` di Material UI.
  - Varia il rendering in base ai permessi dell'utente (es. visibilità tasti per utenti loggati).
- **`BinDetailsDrawer.tsx` (Pannello Dettagli Mobile-First):**
  - Sostituisce i classici popup di Leaflet con un pannello a scorrimento dal basso (Drawer di Material UI).
  - Mostra immagini del bidone, rank dell'utente che ha inserito la segnalazione ed uno storico aggiornamenti ordinato cronologicamente (dal più recente al meno recente).

---

## 4. Livelli di Accesso e Autenticazione

L'applicazione gestisce tre differenti livelli di permessi tramite un `AuthContext` globale:

1. **Accesso Libero (Guest):**
   - Visualizzazione della mappa, dei marker dei bidoni e delle informazioni pubbliche di base.
2. **Utente Loggato (User):**
   - Possibilità di aggiungere nuovi bidoni alla mappa e lasciare aggiornamenti di stato/segnalazioni sui bidoni esistenti.
3. **Amministratore (Admin):**
   - Accesso ad un'area riservata e protetta tramite rotta dedicata (`/admin`) per la gestione e la moderazione dei dati.

---

## 5. Roadmap di Sviluppo

- [x] **Fase 1: Setup & Core Mappa**
  - Configurazione di Vite, Bun e deduplicazione delle istanze di React tramite `resolve.dedupe`.
  - Implementazione di `MapBackground` con geolocalizzazione nativa Leaflet (`map.locate`) e marker tondo (`L.circleMarker`).
- [WIP] **Fase 2: Struttura UI & Moduli**
  - Creazione della struttura delle cartelle `features/` e isolamento dei controlli della mappa in `MapControls.tsx` utilizzando gli `IconButton` di Material UI.
- [ ] **Fase 3: Gestione Dati Bidoni**
  - Sviluppo di `binsService.ts` e dell'hook `useBins` per il recupero dei dati dal backend.
  - Implementazione del componente `BinDetailsDrawer` per la visualizzazione di immagini, rank utente e storico segnalazioni ordinate per data.
- [ ] **Fase 4: Autenticazione & Routing**
  - Configurazione di `AuthContext` e dei tre livelli di accesso (Guest, User, Admin).
  - Protezione della route `/admin` e attivazione condizionale dei pulsanti di inserimento segnalazioni.
