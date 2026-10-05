# Google Maps Setup

1. Open [Google Cloud Console](https://console.cloud.google.com/), create or select a project, and enable **Maps JavaScript API**.
2. Go to **APIs & Services > Credentials > Create credentials > API key**.
3. Restrict the key: under **Application restrictions**, choose HTTP referrers and add the local frontend origin (for example `http://localhost:5500/*`) and the production HTTPS origin. Under **API restrictions**, allow only **Maps JavaScript API**.
4. Configure the key without committing it. For local development, set `window.GOOGLE_MAPS_API_KEY` in `js/config.js` (the committed value must remain empty). For deployment, inject the same assignment during the frontend build/deployment or replace the empty placeholder through the hosting platform's environment/configuration mechanism.
5. Reload the application and open **Asistencia > Puntos geográficos**. A missing or restricted key displays an actionable configuration warning.

Do not place a real key in source control. HTTP referrer restrictions are not a substitute for keeping the key out of repositories.
