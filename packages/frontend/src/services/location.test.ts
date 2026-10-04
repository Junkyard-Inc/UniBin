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

const DEFAULT_COORDS = { latitude: 45.4642, longitude: 9.19, accuracy: 20 };
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
  // Il cast serve perché i tipi di lib.dom vietano null su accuracy, mentre i browser
  // reali possono restituirlo: il fake deve poter modellare entrambi i casi.
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
  ])("risolve con latitude e longitude per %s", async (_label, latitude, longitude) => {
    getCurrentPosition.mockImplementationOnce((success) => {
      success(createPosition({ latitude, longitude, accuracy: 12 }));
    });

    await expect(getUserLocation()).resolves.toEqual({ latitude, longitude, accuracy: 12 });
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

    callAt(0).success(createPosition({ latitude: 10, longitude: 20, accuracy: 30 }));

    await expect(settle(pending)).resolves.toEqual({ latitude: 10, longitude: 20, accuracy: 30 });
    expect(resolved).toBe(true);
  });

  test("estrae solo i tre campi di UserCoordinates, ignorando il resto di coords", async () => {
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

    await expect(getUserLocation()).resolves.toEqual({
      latitude: 41.9028,
      longitude: 12.4964,
      accuracy: 8.4,
    });
  });

  test("il valore risolto è utilizzabile come UserCoordinates", async () => {
    getCurrentPosition.mockImplementationOnce((success) => {
      success(createPosition({ latitude: 1, longitude: 2, accuracy: 3 }));
    });

    const coords: UserCoordinates = await settle(getUserLocation());

    expect(coords).toEqual({ latitude: 1, longitude: 2, accuracy: 3 });
  });

  test("risolve con un solo valore per chiamata", async () => {
    await expect(settle(getUserLocation())).resolves.toEqual(DEFAULT_COORDS);
  });
});

/* -------------------------------------------------------------------------- */
/* 3. accuracy                                                                 */
/* -------------------------------------------------------------------------- */

describe("accuratezza della posizione", () => {
  test.each([
    ["decimale", 12.5],
    ["intero", 8],
    ["zero", 0],
    ["molto piccola", 1e-9],
    ["molto grande", 1_000_000],
  ])("propaga accuracy %s senza alterarla", async (_label, accuracy) => {
    getCurrentPosition.mockImplementationOnce((success) => {
      success(createPosition({ latitude: 45.4642, longitude: 9.19, accuracy }));
    });

    await expect(getUserLocation()).resolves.toEqual({ latitude: 45.4642, longitude: 9.19, accuracy });
  });

  test("propaga accuracy null come null", async () => {
    getCurrentPosition.mockImplementationOnce((success) => {
      success(createPosition({ latitude: 1, longitude: 2, accuracy: null }));
    });

    const coords = await settle(getUserLocation());

    expect(coords.accuracy).toBeNull();
    expect(coords.latitude).toBe(1);
    expect(coords.longitude).toBe(2);
  });

  test("propaga accuracy assente come undefined senza lanciare eccezioni", async () => {
    getCurrentPosition.mockImplementationOnce((success) => {
      success(createPosition({ latitude: 1, longitude: 2, accuracy: undefined }));
    });

    const coords = await settle(getUserLocation());

    expect(coords.accuracy).toBeUndefined();
    expect(coords.latitude).toBe(1);
    expect(coords.longitude).toBe(2);
  });
});

/* -------------------------------------------------------------------------- */
/* 4. errori                                                                   */
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
/* 5. timeout di 10 secondi                                                   */
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
/* 6. indipendenza tra chiamate                                                 */
/* -------------------------------------------------------------------------- */

describe("indipendenza tra chiamate", () => {
  test("due chiamate concorrenti usano due implementazioni separate", async () => {
    getCurrentPosition
      .mockImplementationOnce((success) => success(createPosition({ latitude: 1, longitude: 2, accuracy: 3 })))
      .mockImplementationOnce((success) => success(createPosition({ latitude: 4, longitude: 5, accuracy: 6 })));

    const [first, second] = await Promise.all([settle(getUserLocation()), settle(getUserLocation())]);

    expect(first).toEqual({ latitude: 1, longitude: 2, accuracy: 3 });
    expect(second).toEqual({ latitude: 4, longitude: 5, accuracy: 6 });
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