# PanoramaERP

App web (PWA) per tenere traccia delle tue **spese** e delle **scadenze economiche** (bollette, rate, abbonamenti, ecc.), installabile sul telefono come un'app senza bisogno di app store.

## Funzionalità

- **Dashboard**: totale spese del mese, totale da pagare, scadenze scadute, scadenze in arrivo nei prossimi 7 giorni, grafico spese per categoria.
- **Spese**: elenco mensile con totale, aggiunta/modifica/eliminazione.
- **Scadenze**: elenco "da pagare" / "pagate", con badge per scadute e imminenti. Supporta scadenze **ricorrenti** (mensili o annuali): quando segni una scadenza ricorrente come pagata, genera automaticamente la spesa e sposta la scadenza alla data successiva.
- **Backup**: esportazione dei dati in JSON dal pulsante in alto a destra.
- Funziona **offline** (service worker) e i dati sono salvati solo sul tuo dispositivo (`localStorage`) — nessun server, nessun account.

## Come provarla subito

Serve un piccolo server locale perché il service worker richiede http/https (non funziona aprendo il file direttamente con `file://`).

```bash
# dalla cartella del progetto
python3 -m http.server 8080
```

Poi apri `http://localhost:8080` dal browser del telefono (stessa rete Wi-Fi del computer) oppure, se stai lavorando in un ambiente cloud/remoto, pubblica la cartella con un servizio di hosting statico (vedi sotto) e apri l'URL pubblico dal telefono.

## Come installarla sul telefono (Android/Chrome)

1. Apri l'URL dell'app in Chrome sul telefono.
2. Tocca il menu (⋮) in alto a destra.
3. Seleziona **"Installa app"** oppure **"Aggiungi a schermata Home"**.
4. L'icona di PanoramaERP comparirà come una normale app, a schermo intero, funzionante anche offline.

## Pubblicazione online (per usarla dal telefono ovunque)

Essendo una PWA statica (HTML/CSS/JS, nessun backend), puoi pubblicarla gratuitamente con qualsiasi hosting statico, ad esempio **GitHub Pages**:

1. Impostazioni del repository → *Pages* → *Source*: branch `main`, cartella `/ (root)`.
2. Dopo il deploy otterrai un URL tipo `https://<utente>.github.io/panoramaerp/`.
3. Apri quell'URL dal telefono e installala come descritto sopra.

## Struttura del progetto

```
index.html          Struttura della pagina e del modale di inserimento
css/style.css        Stile mobile-first, dark mode automatica
js/app.js             Logica app: gestione spese, scadenze, ricorrenze, grafico
manifest.json        Manifest PWA (nome, icone, colori)
sw.js                 Service worker per funzionamento offline
icons/                Icone dell'app
```
