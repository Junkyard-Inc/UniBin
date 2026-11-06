# Geolocation service and mapping

## Context

UniBin is a webapp which shows a map of nearby bins to users. For the visualization of the map and the position of the users there's two interfaces included in the location service working on the servers' frontend.

### Geolocation

Geolocation is an API which works on the proprerty of the browser navigator.geolocation. This API interface allows to get the device position found inside the browser's property. When used on mobile phones this property contains the position taken directly from the GPS system, while the same property on a PC is taken from the IP provider's location, which doesn't give an accurate positiion most of the times.
The trade off is acceptable because the webapp is meant to be used on smartphones.

The Geolocation interface can only work through secure connection, which means the server needs to provide a certificate and an https connection. This was achieved by configuring vite to assign the certificate to the server and ensuring secure connections.
Another requirement for the Geolocation to work is the user's permission, asked directly by the browser when the webapp is opened.

The geolocation method used in this project is `watchPosition()`, which registers a handler that is triggered every time a new location is recorded on the device. This is useful in scenarios where the user needs to orient themselves in order to reach a nearby trash bin.

### Leaflet

Leaflet, an open-source JavaScript library that allows you to create a navigable map and insert customizable markers and other elements into it, is used to render the map in a html container component.

In the project the map is created with a view centered on the user position using the method:

```js
L.map(<String> id, <Map options> options?).setView(<LatLng> center, <Number> zoom, <Zoom/pan options> options?)
```

The actual geolocation logic is managed directly by Leaflet, that natively includes the `locate()` method. This method includes the `watchPosition()` mentioned before and needs to add to the map two handlers:

- one for the **position change**.
  ```js
  map.on("locationfound", (e: L.LocationEvent) => {});
  ```
- one for **errors**.
  ```js
  map.on("locationerror", (e) => {});
  ```

#### Useful components for map controls

- **DomEvent**: functions to work with internal events on the map (like the handlers for the locate method).
- **DivOverlay**: base model to open an interactive layer on top of the map, it comprises the Popup and Tooltip objects.
- **Control.Layers**: The layer control with ability to switch from one layer to another. Useful to divide the base layer from the markers and roads.
