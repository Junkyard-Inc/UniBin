export const UI_TEXT = {
  common: {
    appName: 'UNIBIN',
    save: 'Salva',
    cancel: 'Annulla',
    close: 'Chiudi',
    apply: 'Applica filtri',
    reset: 'Azzera',
    confirm: 'Conferma',
    loading: 'Caricamento in corso...',
  },

  // Bottom navbar
  nav: {
    map: 'Mappa',
    trophies: 'Trofei',
    profile: 'Profilo',
    login: 'Accedi',
  },

  // Map and filters controls
  map: {
    quickFiltersAria: 'Filtri rapidi per tipologia di rifiuto',
    openFiltersTooltip: 'Tutti i filtri',
    openFiltersAria: 'Apri filtri avanzati',
    addBinTooltip: 'Segnala nuovo bidone',
    addBinAria: 'Segnala nuovo bidone',
    recenterActiveTooltip: 'Centratura attiva',
    recenterInactiveTooltip: 'Centra sulla tua posizione',
    filtersDrawerTitle: 'Filtra i bidoni',
    filtersDrawerSubtitle: 'Seleziona una o più categorie di rifiuti da visualizzare sulla mappa.',
  },

  // Bin categories
  categories: {
    paper: 'Carta',
    plastic: 'Plastica',
    batteries: 'Batterie',
    clothes: 'Vestiti',
    ewaste: 'Elettrodomestici',
    glass: 'Vetro',
    organic: 'Organico',
    general: 'Indifferenziato',
  },

  // Bin details
  bin: {
    directionsCta: 'Indicazioni stradali',
    favouriteAddAria: 'Salva nei preferiti',
    favouriteRemoveAria: 'Rimuovi dai preferiti',
    reportedByPrefix: 'Segnalato da',
    statusLabel: 'Stato attuale',
    statusConfirmCta: 'Conferma stato',
    statusUpdateCta: 'Aggiorna stato',
    statuses: {
      available: 'Disponibile',
      full: 'Pieno',
      damaged: 'Danneggiato',
    },
    reviewsTitle: 'Recensioni della community',
    reviewsEmpty: 'Nessuna recensione ancora. Sii il primo a lasciare un feedback!',
    addReviewCta: 'Scrivi una recensione',
    reviewTagsLabel: 'Parole chiave (es. Pulito, Pieno)',
    reviewTagsPlaceholder: 'Aggiungi tag e premi Invio...',
  },

  // New bin
  addBin: {
    drawerTitle: 'Segnala un nuovo bidone',
    categoryLabel: 'Tipologia di rifiuto',
    categoryPlaceholder: 'Seleziona la categoria...',
    notesLabel: 'Indicazioni aggiuntive',
    notesPlaceholder: "Es. Accanto all'ingresso principale, lato sinistro",
    photoLabel: 'Scatta una foto del bidone',
    photoHelper: 'Aiuta gli altri utenti a riconoscerlo facilmente.',
    submitCta: 'Pubblica bidone',
  },

  // Dialog redirecting to login
  authPrompt: {
    title: 'Accesso richiesto',
    description:
      'Per salvare i bidoni nei preferiti, aggiungere nuove segnalazioni o lasciare recensioni devi accedere al tuo account UniBin.',
    loginCta: 'Vai al Login',
    cancelCta: 'Continua senza account',
  },
  
  ranks: {
    king: 'Re dei Monnezzari',
    pro: 'Monnezzaro',
    jr: 'Monnezzaro Jr',
    troll: 'Troll delle discariche',
    trash: 'Rifiuto della società',
  },

  achievements: {
    wipTitle: 'LAVORI IN CORSO!',
    wipDescription: "Questa pagina è ancora in fase di costruzione. \
    Presto potrete sbloccare una nuova sezione dedicata a fantastici premi!",
  }
} as const;