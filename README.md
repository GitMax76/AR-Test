# WebAR Multi-Target Framework (MindAR + A-Frame)

Progetto WebAR avanzato multi-target con caricamento asincrono dei dati, video hosting esterno su CDN/Cloudinary, compilazione automatizzata del file di feature tracking `targets.mind` tramite **GitHub Actions** e pannello web di gestione **`admin.html`**.

Repository di riferimento: [GitMax76/AR-Test](https://github.com/GitMax76/AR-Test)

---

## 📁 Struttura del Progetto

```
AR-Project/
├── .github/
│   └── workflows/
│       └── compile-mind.yml    # Workflow CI/CD per auto-compilazione targets.mind su push
├── targets/                    # Cartella contenente le immagini sorgente dei target
│   └── 01.jpg                  # Immagine Target 1 (.jpg / .png)
├── targets.json                # Mappatura centralizzata: index -> immagine -> video CDN
├── index.html                  # Frontend WebAR dinamico (MindAR + A-Frame)
├── admin.html                  # Interfaccia grafica locale per gestione target & upload GitHub
├── compile.js                  # Script Node.js OfflineCompiler per compilare targets.mind
├── package.json                # Dipendenze Node.js (mind-ar, canvas)
└── targets.mind                # File binario compilato con i feature point di tracking
```

---

## 1. Architettura Dati: `targets.json`

Il file `targets.json` definisce in modo centralizzato tutti i target disponibili e i rispettivi video:

```json
[
  {
    "index": 0,
    "name": "Target 1",
    "imagePath": "./targets/01.jpg",
    "videoUrl": "https://res.cloudinary.com/h0ch4sxd/video/upload/v1788443837/v24044gl0000d7vo42fog65gfgphs5mg.mp4"
  }
]
```

> [!IMPORTANT]
> L'ordine degli elementi nell'array e il valore di `"index"` (0, 1, 2, ...) corrispondono rigorosamente all'ordine con cui le immagini sono state processate ed esportate nel file compilato `targets.mind`.

---

## 2. Frontend AR Dinamico (`index.html`)

Il file `index.html` è completamente data-driven:
- **Fetch a runtime**: carica `targets.json` al caricamento della pagina.
- **Nodi `<video>` programmatici**: aggiunge dentro `<a-assets>` i tag `<video>` con `preload="none"`, `crossorigin="anonymous"`, `playsinline` e `muted`.
- **Nodi `<a-entity>` e `<a-video>` dinamici**: associa ciascun `targetIndex: X` al piano video corrispondente, calcolando il corretto aspect ratio tramite `loadedmetadata`.
- **Overlay iniziale di sblocco**: schermata di avvio ("Avvia Esperienza") per richiedere l'accesso alla fotocamera e autorizzare l'autoplay audio/video sulle policy di sicurezza iOS Safari e Android Chrome.
- **Anti-sovrapposizione**: gestisce gli eventi `targetFound` e `targetLost` garantendo che un solo video sia in riproduzione alla volta. Quando un target viene perso o ne appare un altro, il video precedente viene messo automaticamente in pausa.
- **Pulsante Audio Globale**: controllo fluttuante a schermo per attivare o disattivare l'audio di tutti i target con feedback visivo.

---

## 3. Pipeline CI/CD GitHub Actions (`.github/workflows/compile-mind.yml`)

Ogni volta che viene aggiunta o modificata un'immagine nella cartella `targets/` o viene aggiornato `targets.json`:
1. GitHub Actions avvia il job su un runner Ubuntu.
2. Installa le librerie grafiche native (`libcairo2-dev`, `libpango1.0-dev`, ecc.) e Node.js 20.
3. Esegue `npm run compile` (`compile.js`).
4. Lo script ordina le immagini per indice/nome, estrae i punti di feature con l'**OfflineCompiler** di `mind-ar` e genera il nuovo file binario `targets.mind`.
5. GitHub Actions esegue l'auto-commit e il push di `targets.mind` sul branch `main` con il flag `[skip ci]`.

### ⚙️ Configurazione dei permessi su GitHub (Una Tantum)
Per consentire a GitHub Actions di effettuare il push automatico:
1. Vai su GitHub nel tuo repository: **Settings** -> **Actions** -> **General**.
2. Sotto la sezione **Workflow permissions**, seleziona:
   - ✅ **Read and write permissions**
3. Clicca su **Save**.

---

## 4. Gestione Contenuti via Web (`admin.html`)

Il file `admin.html` è una dashboard autonoma (apribile direttamente nel browser tramite doppio clic o servita via web) che permette di:
- Visualizzare tutti i target registrati con miniatura, indice e video collegato.
- Aggiungere nuovi target caricando direttamente l'immagine da computer e inserendo l'URL del video.
- **Pubblicare direttamente su GitHub tramite GitHub REST API**:
  - Inserisci il tuo Personal Access Token (PAT) con permessi `repo` o `contents: write`.
  - Clicca **"🚀 Pubblica Tutto su GitHub"**: l'immagine viene convertita in Base64 e inviata su `targets/`, e `targets.json` viene aggiornato.
  - La GitHub Action si attiva in automatico compilando `targets.mind` in cloud!
- **Modalità Offline**: esporta o copia `targets.json` aggiornato per commit manuali.
