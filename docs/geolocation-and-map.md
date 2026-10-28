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

Leaflet, an open-source JavaScript library that allows you to create a navigable map and insert customizable markers and other elements into it, is used to render the map.

<!--TODO: Leaflet map object, markers, tile layers -->
