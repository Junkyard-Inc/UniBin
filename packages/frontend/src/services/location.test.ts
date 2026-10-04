import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { getUserLocation, type UserCoordinates } from "./location";

type GetCurrentPosition = (
  success: PositionCallback,
  error?: PositionErrorCallback | null,
  options?: PositionOptions
) => void;

type GeolocationCall = {
  success: PositionCallback;
  error?: PositionErrorCallback | null;
  options?: PositionOptions;
};

/** Campi di coords che un test può voler impostare: ogni valore accetta anche null (browser reali). */
type MutableCoords = {
  [K in keyof Omit<GeolocationCoordinates, "toJSON">]?: GeolocationCoordinates[K] | null;
};

const MS_PER_SECOND = 1000;
const EXPECTED_TIMEOUT_SECONDS = 10;
const PENDING_GUARD_MS = 2 * MS_PER_SECOND;

const DEFAULT_COORDS = { latitude: 45.4642, longitude: 9.19, accuracy: 20, heading: 90 };
const DEFAULT_POSITION = createPosition(DEFAULT_COORDS);

const originalNavigator = globalThis.navigator;

let getCurrentPosition: ReturnType<typeof mock<GetCurrentPosition>>;
let calls: GeolocationCall[];

/* -------------------------------------------------------------------------- */
/* harness                                                                     */
/* -------------------------------------------------------------------------- */

function createPosition(coords: MutableCoords, timestamp = 1_700_000_000_000): GeolocationPosition {
  const base = {
    latitude: 0,
    longitude: 0,
    accuracy: 0,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
    ...coords,
  };
  // Il cast serve perché MutableCoords è un tipo parziale (i campi non impostati
  // restano undefined) e non include toJSON, che va aggiunto a mano.
  const fullCoords = { ...base, toJSON: () => base } as unknown as GeolocationCoordinates;
  return {
    coords: fullCoords,
    timestamp,
    toJSON: () => base,
  } as unknown as GeolocationPosition;
}

function createPositionError(code: number, message: string): GeolocationPositionError {
  return Object.assign(new Error(message), {
    code,
    PERMISSION_DENIED: 1,
    POSITION_UNAVAILABLE: 2,
    TIMEOUT: 3,
  }) as unknown as GeolocationPositionError;
}

/** Sostituisce l'intero navigator globale, così da simulare un browser senza geolocation. */
function setNavigator(value: unknown): void {
  globalThis.navigator = value as Navigator;
}

/** navigator con geolocation supportato e tracciato. */
function setGeolocationNavigator(getCurrentPositionMock: GetCurrentPosition): void {
  setNavigator({ geolocation: { getCurrentPosition: getCurrentPositionMock } });
}

/** Restituisce la chiamata n-esima a getCurrentPosition, o fallisce se non è avvenuta. */
function callAt(index: number): GeolocationCall {
  const call = calls[index];
  if (!call) {
    throw new Error(`getCurrentPosition non è stata chiamata (chiamate registrate: ${calls.length})`);
  }
  return call;
}

/** Svuota la coda di macrotask, così da dare tempo a eventuali callback pendenti. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Attende una promise che ci si aspetta risolva. Se non si chiude entro il timeout
 * fallisce con un messaggio leggibile invece di lasciare pendente tutta la suite.
 */
async function settle<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`la promise non si è chiusa entro ${PENDING_GUARD_MS}ms`)),
          PENDING_GUARD_MS,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** Cattura il motivo del rifiuto, e fallisce se la promise risolve. */
async function captureRejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("la promise doveva rifiutarsi, ma è risolta");
}

beforeEach(() => {
  calls = [];
  getCurrentPosition = mock<GetCurrentPosition>((success) => {
    success(DEFAULT_POSITION);
  });
  // La registrazione avviene in un wrapper, così resta attiva anche quando un test
  // sostituisce l'implementazione del mock con mockImplementation(Once).
  setGeolocationNavigator((success, error, options) => {
    calls.push({ success, error, options });
    getCurrentPosition(success, error, options);
  });
});

afterEach(() => {
  setNavigator(originalNavigator);
});

/* -------------------------------------------------------------------------- */
/* 1. browser senza supporto alla geolocation                                   */
/* -------------------------------------------------------------------------- */

describe("getUserLocation con geolocation non supportata", () => {
  test("rifiuta quando navigator non espone la chiave geolocation", async () => {
    setNavigator({});

    await expect(getUserLocation()).rejects.toThrow(Error);
  });

  test("rifiuta quando navigator.geolocation è undefined", async () => {
    setNavigator({ geolocation: undefined });

    await expect(getUserLocation()).rejects.toThrow(Error);
  });

  test("rifiuta con un errore esplicito e non con un TypeError", async () => {
    setNavigator({});

    const error = await captureRejection(getUserLocation());

    // Un TypeError qui significherebbe che il servizio non ha controllato il supporto
    // e ha solo provato ad accedere a navigator.geolocation.getCurrentPosition.
    expect(error).toBeInstanceOf(Error);
    expect(error).not.toBeInstanceOf(TypeError);
  });

  test("non chiama mai getCurrentPosition", async () => {
    setNavigator({});

    await expect(getUserLocation()).rejects.toThrow(Error);

    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  test("rifiuta in modo asincrono, senza lanciare eccezioni sincronizzate", () => {
    setNavigator({});

    const promise = getUserLocation();

    expect(promise).toBeInstanceOf(Promise);
    return expect(promise).rejects.toThrow(Error);
  });
});

/* -------------------------------------------------------------------------- */
/* 2. risoluzione                                                              */
/* -------------------------------------------------------------------------- */

describe("getUserLocation con geolocation supportata", () => {
  test.each([
    ["Milano", 45.4642, 9.19],
    ["origine", 0, 0],
    ["Sydney (emisfero sud)", -33.8688, 151.2093],
    ["nord ovest", 90, -180],
    ["sud est", -90, 180],
    ["valori decimali", 48.2081767, 16.3738189],
  ])("risolve con i campi di UserCoordinates per %s", async (_label, latitude, longitude) => {
    getCurrentPosition.mockImplementationOnce((success) => {
      success(createPosition({ latitude, longitude, accuracy: 12, heading: 42 }));
    });

    await expect(getUserLocation()).resolves.toEqual({ latitude, longitude, accuracy: 12, heading: 42 });
  });

  test("non risolve prima che la callback di successo venga invocata", async () => {
    // implementation vuota: la posizione arriva solo quando il test la inietta
    getCurrentPosition.mockImplementation(() => {});

    let resolved = false;
    const pending = getUserLocation().then((coords) => {
      resolved = true;
      return coords;
    });

    await flush();
    expect(resolved).toBe(false);

    callAt(0).success(createPosition({ latitude: 10, longitude: 20, accuracy: 30, heading: 15 }));

    await expect(settle(pending)).resolves.toEqual({ latitude: 10, longitude: 20, accuracy: 30, heading: 15 });
    expect(resolved).toBe(true);
  });

  test("estrae solo i campi di UserCoordinates, ignorando il resto di coords", async () => {
    getCurrentPosition.mockImplementationOnce((success) => {
      success(
        createPosition({
          latitude: 41.9028,
          longitude: 12.4964,
          accuracy: 8.4,
          altitude: 21,
          altitudeAccuracy: 5,
          heading: 180,
          speed: 3.2,
        }),
      );
    });

    const coords = await settle(getUserLocation());

    expect(coords).toEqual({
      latitude: 41.9028,
      longitude: 12.4964,
      accuracy: 8.4,
      heading: 180,
    });
    // Le quattro chiavi di UserCoordinates sono le uniche presenti: altitude,
    // altitudeAccuracy e speed non devono trapelare nel risultato.
    expect(Object.keys(coords).sort()).toEqual(["accuracy", "heading", "latitude", "longitude"]);
  });

  test("il valore risolto è utilizzabile come UserCoordinates", async () => {
    getCurrentPosition.mockImplementationOnce((success) => {
      success(createPosition({ latitude: 1, longitude: 2, accuracy: 3, heading: 180 }));
    });

    const coords: UserCoordinates = await settle(getUserLocation());

    expect(coords).toEqual({ latitude: 1, longitude: 2, accuracy: 3, heading: 180 });
  });

  test("il tipo UserCoordinates ammette heading sia numerico sia null", () => {
    // La compilazione di questo test garantisce che heading resti un campo
    // obbligatorio con valore nullable, quindi i consumer possono fare
    // `if (coords.heading !== null)` senza narrowing implicito.
    const esempi: UserCoordinates[] = [
      { latitude: 1, longitude: 2, accuracy: 3, heading: 90 },
      { latitude: 1, longitude: 2, accuracy: 3, heading: null },
    ];

    expect(esempi.map((coords) => coords.heading)).toEqual([90, null]);
  });

  test("risolve con un solo valore per chiamata", async () => {
    await expect(settle(getUserLocation())).resolves.toEqual(DEFAULT_COORDS);
  });
});

/* -------------------------------------------------------------------------- */
/* 3. accuracy                                                                 */
/* -------------------------------------------------------------------------- */

describe("accuratezza della posizione", () => {
  // accuracy è non-nullable in UserCoordinates: il servizio la propaga grezza,
  // quindi i casi null/undefined non sono rappresentabili e non vengono testati.
  test.each([
    ["decimale", 12.5],
    ["intero", 8],
    ["zero", 0],
    ["molto piccola", 1e-9],
    ["molto grande", 1_000_000],
  ])("propaga accuracy %s senza alterarla", async (_label, accuracy) => {
    getCurrentPosition.mockImplementationOnce((success) => {
      // heading assente nella posizione: il risultato deve riportarlo come null
      // senza compromettere la risoluzione.
      success(createPosition({ latitude: 45.4642, longitude: 9.19, accuracy }));
    });

    await expect(getUserLocation()).resolves.toEqual({
      latitude: 45.4642,
      longitude: 9.19,
      accuracy,
      heading: null,
    });
  });
});

/* -------------------------------------------------------------------------- */
/* 4. heading                                                                  */
/* -------------------------------------------------------------------------- */

describe("orientamento della posizione", () => {
  test.each([
    ["90 (est)", 90],
    ["180 (sud)", 180],
    ["359.9", 359.9],
    ["360", 360],
    ["370, fuori range", 370],
  ])("propaga heading %s senza alterarlo", async (_label, heading) => {
    getCurrentPosition.mockImplementationOnce((success) => {
      success(createPosition({ latitude: 45.4642, longitude: 9.19, accuracy: 20, heading }));
    });

    await expect(getUserLocation()).resolves.toEqual({
      latitude: 45.4642,
      longitude: 9.19,
      accuracy: 20,
      heading,
    });
  });

  test("propaga heading 0 (nord) come 0, non come assente", async () => {
    // 0 è un orientamento valido: non deve essere trattato come valore falsy.
    getCurrentPosition.mockImplementationOnce((success) => {
      success(createPosition({ latitude: 45.4642, longitude: 9.19, accuracy: 20, heading: 0 }));
    });

    const coords = await settle(getUserLocation());

    expect(coords.heading).toBe(0);
    expect(coords.latitude).toBe(45.4642);
    expect(coords.longitude).toBe(9.19);
    expect(coords.accuracy).toBe(20);
  });

  test("propaga heading null come null mantenendo gli altri campi", async () => {
    // Il device non ha bussola: heading è null, ma la posizione è comunque valida.
    getCurrentPosition.mockImplementationOnce((success) => {
      success(createPosition({ latitude: 1, longitude: 2, accuracy: 3, heading: null }));
    });

    const coords = await settle(getUserLocation());

    expect(coords.heading).toBeNull();
    expect(coords.latitude).toBe(1);
    expect(coords.longitude).toBe(2);
    expect(coords.accuracy).toBe(3);
  });
});

/* -------------------------------------------------------------------------- */
/* 5. errori                                                                   */
/* -------------------------------------------------------------------------- */

describe("getCurrentPosition in errore", () => {
  test.each([
    ["PERMISSION_DENIED", 1],
    ["POSITION_UNAVAILABLE", 2],
    ["TIMEOUT", 3],
  ])("rifiuta con l'errore originale su %s", async (_label, code) => {
    const positionError = createPositionError(code, `geolocation fallita: ${code}`);
    getCurrentPosition.mockImplementationOnce((_success, error) => {
      error?.(positionError);
    });

    await expect(getUserLocation()).rejects.toBe(positionError);
  });

  test("rifiuta con un errore generico non standard", async () => {
    const genericError = new Error("errore generico");
    getCurrentPosition.mockImplementationOnce((_success, error) => {
      error?.(genericError as unknown as GeolocationPositionError);
    });

    await expect(getUserLocation()).rejects.toBe(genericError);
  });

  test("rifiuta con un valore che non è un Error", async () => {
    getCurrentPosition.mockImplementationOnce((_success, error) => {
      error?.("fallimento" as unknown as GeolocationPositionError);
    });

    const rejection = await captureRejection(getUserLocation());

    expect(rejection).toBe("fallimento");
  });

  test("non risolve quando la callback di errore viene invocata", async () => {
    getCurrentPosition.mockImplementationOnce((_success, error) => {
      error?.(createPositionError(1, "negata"));
    });

    let resolved = false;
    const pending = getUserLocation();
    // la catena assorbe il rifiuto, che viene verificato più sotto sulla promise originale
    const tracked = pending.then(
      () => {
        resolved = true;
      },
      () => {},
    );

    await flush();

    expect(resolved).toBe(false);
    await expect(pending).rejects.toThrow("negata");
    await tracked;
  });
});

/* -------------------------------------------------------------------------- */
/* 6. timeout di 10 secondi                                                   */
/* -------------------------------------------------------------------------- */

describe("configurazione del timeout", () => {
  test("passa un timeout di 10 secondi nelle opzioni di getCurrentPosition", async () => {
    await settle(getUserLocation());

    expect(callAt(0).options).toEqual(expect.objectContaining({ timeout: EXPECTED_TIMEOUT_SECONDS * MS_PER_SECOND }));
  });

  test("registra sia la callback di successo sia quella di errore", async () => {
    await settle(getUserLocation());

    const call = callAt(0);

    expect(typeof call.success).toBe("function");
    expect(typeof call.error).toBe("function");
  });

  test("chiama getCurrentPosition una sola volta per ogni invocazione", async () => {
    await settle(getUserLocation());

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  test("chiama getCurrentPosition una volta per ogni chiamata di getUserLocation", async () => {
    await settle(getUserLocation());
    await settle(getUserLocation());

    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(callAt(0).options).toEqual(expect.objectContaining({ timeout: EXPECTED_TIMEOUT_SECONDS * MS_PER_SECOND }));
    expect(callAt(1).options).toEqual(expect.objectContaining({ timeout: EXPECTED_TIMEOUT_SECONDS * MS_PER_SECOND }));
  });
});

/* -------------------------------------------------------------------------- */
/* 7. indipendenza tra chiamate                                                 */
/* -------------------------------------------------------------------------- */

describe("indipendenza tra chiamate", () => {
  test("due chiamate concorrenti usano due implementazioni separate", async () => {
    getCurrentPosition
      .mockImplementationOnce((success) => success(createPosition({ latitude: 1, longitude: 2, accuracy: 3, heading: 45 })))
      .mockImplementationOnce((success) => success(createPosition({ latitude: 4, longitude: 5, accuracy: 6, heading: 200 })));

    const [first, second] = await Promise.all([settle(getUserLocation()), settle(getUserLocation())]);

    expect(first).toEqual({ latitude: 1, longitude: 2, accuracy: 3, heading: 45 });
    expect(second).toEqual({ latitude: 4, longitude: 5, accuracy: 6, heading: 200 });
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  });

  test("dopo un errore una nuova chiamata riesce normalmente", async () => {
    getCurrentPosition.mockImplementationOnce((_success, error) => {
      error?.(createPositionError(1, "prima negata"));
    });

    await expect(getUserLocation()).rejects.toThrow("prima negata");

    await expect(settle(getUserLocation())).resolves.toEqual(DEFAULT_COORDS);
    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
  });
});