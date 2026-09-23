@echo off
rem ======================================================================
rem  POS del meson: abre el punto de venta en Chrome con impresion directa.
rem
rem  --kiosk-printing  imprime la boleta en la impresora PREDETERMINADA de
rem                    Windows, sin mostrar el dialogo.
rem  --user-data-dir   un perfil propio: el modo kiosco solo se activa si
rem                    Chrome arranca de cero, y asi no depende de que el
rem                    resto de las ventanas de Chrome esten cerradas.
rem                    La primera vez hay que iniciar sesion en este perfil.
rem  --app             ventana sin barra de direcciones, como una aplicacion.
rem
rem  Antes de usarlo:
rem    1. Deja la impresora termica como predeterminada en Windows.
rem    2. En sus preferencias, papel de 80 mm (rollo) y margenes en 0.
rem    3. Cambia URL por la direccion real del sistema en produccion.
rem ======================================================================

set "URL=http://localhost:8080/pos"
set "PERFIL=%LOCALAPPDATA%\ColibriPOS"

set "CHROME=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not exist "%CHROME%" set "CHROME=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"

if not exist "%CHROME%" (
  echo No se encontro Google Chrome en este equipo.
  pause
  exit /b 1
)

start "" "%CHROME%" --kiosk-printing --user-data-dir="%PERFIL%" --app=%URL%
