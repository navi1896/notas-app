# Notas — Control de tu negocio

Aplicación de control de negocio para **celular (Android)** y **PC (navegador / PWA)** reconstruida a partir de `Notas-7.apk` (`com.notas.app`).

## Estructura del proyecto

- `web/`: Núcleo multiplataforma (`index.html`, `styles.css`, `app.js`, `manifest.webmanifest`, `sw.js`, `version.json`, íconos).
- `android/`: Proyecto Android nativo con Gradle Wrapper (`./gradlew`), `WebView` + puente `NotasApp` (`MainActivity.java`) y `ShareFileProvider.java`.
- `scripts/`: Herramientas locales (`dev-server.mjs` y `sync-android.mjs`).
- `.github/workflows/deploy-and-release.yml`: Despliegue automático de `web/` a GitHub Pages y compilación del `.apk` en GitHub Actions.

## Comandos

- `npm run dev`: Levanta la versión web/PWA en `http://127.0.0.1:4173`.
- `npm run sync:android`: Sincroniza `web/` hacia `android/app/src/main/assets/www/`.
- `npm run check`: Valida la sintaxis de `web/app.js` y `web/sw.js`.
- `cd android && .\gradlew.bat assembleDebug`: Compila el `.apk` de prueba localmente.

## Auto-actualizaciones

- **Actualizaciones web ("por dentro"):** `MainActivity` puede descargar nuevas versiones de `web/` desde `webBaseUrl` en `version.json` y activarlas en almacenamiento interno sin reinstalar el APK.
- **Actualizaciones del APK:** Cuando aumenta `versionCode`, `MainActivity` descarga el nuevo `.apk` desde `apkUrl` (GitHub Releases) e inicia el instalador de Android.
