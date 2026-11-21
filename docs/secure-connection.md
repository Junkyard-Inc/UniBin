## Accesso da altre macchine (HTTPS)

Il frontend è raggiungibile dalla LAN sia in sviluppo che in produzione, sempre
via HTTPS, con certificati generati localmente (nessuna dipendenza da servizi
esterni).

### 1. Generare i certificati (richiede `openssl`)

```bash
make cert                  # usa il primo IP di `hostname -I`
make cert IP=192.168.1.42  # per forzare un IP specifico
```

Genera in `certs/` (gitignorata):

- `ca.crt` — la CA locale, da installare sui dispositivi;
- `unibin.crt` / `unibin.key` — certificato del server, usati da Vite e Nginx.

La CA viene creata una sola volta; se l'IP della rete cambia basta rigenerare il
certificato server con `make cert IP=<nuovo-ip>` **senza** toccare i dispositivi
(che hanno già installato `ca.crt`). Con `make cert-force` si rigenera anche la
CA (i dispositivi dovranno reinstallarla).

### 2. Sviluppo

```bash
make dev
# frontend: https://<ip-lan>:3000
```

`make dev` genera i certificati se mancanti. Il dev server Vite ascolta su tutte
le interfacce e inoltra le chiamate `/api` verso il backend su `127.0.0.1:3001`.

### 3. Produzione

```bash
make prod-server   # frontend su 127.0.0.1:3000 (HTTP, solo locale)
make prod-proxy    # nginx su https://<ip-lan> (443, senza porta)
make prod-proxy-stop
```

Nginx (container `nginx:alpine`, `network_mode: host`) termina il TLS sulla 443 e
fa da reverse proxy verso frontend (`127.0.0.1:3000`) e backend
(`127.0.0.1:3001`). Backend e frontend di produzione non sono mai esposti
direttamente in LAN.

### 4. Firewall (firewalld)

Aprire le porte **solo alla sottorete locale** (esempio con `10.0.0.0/24`):

```bash
sudo firewall-cmd --permanent --zone=public \
  --add-rich-rule='rule family="ipv4" source address="10.0.0.0/24" port port="443" protocol="tcp" accept'
# solo se si vuole accedere anche al dev server Vite:
sudo firewall-cmd --permanent --zone=public \
  --add-rich-rule='rule family="ipv4" source address="10.0.0.0/24" port port="3000" protocol="tcp" accept'
sudo firewall-cmd --reload
```

La porta `3001` (backend) non va mai aperta. Se la rete cambia sottorete, le
regole vanno aggiornate.

### 5. Installare la CA sui dispositivi

Senza la CA il browser mostra l'avviso "connessione non privata" (il traffico è
comunque cifrato). Copiare `certs/ca.crt` sul dispositivo e installarlo:

- **Linux**: aggiungere a `/usr/local/share/ca-certificates/` e `sudo update-ca-certificates`, oppure importare nello store del browser.
- **Android**: Impostazioni → Sicurezza → Installa certificato → Certificato CA.
- **iOS**: installare il profilo, poi Impostazioni → Generali → Info → Impostazioni attendibilità certificati → abilitare la CA.
- **Firefox**: ha un trust store proprio: Impostazioni → Privacy e sicurezza → Certificati → Visualizza certificati → Autorità → Importa.
- **Windows/macOS**: importare come autorità di certificazione radice attendibile.
