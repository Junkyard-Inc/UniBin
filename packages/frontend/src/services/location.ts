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