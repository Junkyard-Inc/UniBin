export interface UserCoordinates {
    latitude: number;
    longitude: number;
    accuracy: number;
    heading: number | null;
}

export async function getUserLocation(): Promise<UserCoordinates> {
  return new Promise((resolve, reject) => {
    // Browser needs to support geolocation API
    if (!navigator.geolocation) {
      reject(new Error("La geolocalizzazione non è supportata dal browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      // Callback 
      (position) => {
        
        const { latitude, longitude, accuracy, heading } = position.coords;

        resolve({
          latitude,
          longitude,
          accuracy,
          heading,
        });
      },
      // Error Callback 
      (error) => {
        reject(error);
      },
      // Configuration
      {
        enableHighAccuracy: true,
        timeout: 10000,           // 10 sec
        maximumAge: 0,            // No cache usage
      }
    );
  });
}

export function watchUserLocation(
  onSuccess: (coords: UserCoordinates) => void,
  onError: (error: GeolocationPositionError) => void
): number | null {

  if(!navigator.geolocation) {
    onError({
      code: 0,
      message: "La geolocalizzazione non è supportata dal browser.",
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    } as GeolocationPositionError);
    return null;
  }
  
  return navigator.geolocation.watchPosition(
    (position) => {
      onSuccess({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        heading: position.coords.heading
      });
    },
    (error) => {
      onError(error);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 10000,
    }
  )
}

/**
 * Interrompe il tracciamento della posizione.
 */
export function stopWatchingLocation(watchId: number): void {
  navigator.geolocation.clearWatch(watchId);
}