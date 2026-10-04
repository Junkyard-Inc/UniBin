export interface UserCoordinates {
    latitude: number;
    longitude: number;
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
        
        const { latitude, longitude } = position.coords;

        resolve({
          latitude,
          longitude,
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