#!/usr/bin/env bash
#
# Genera una CA locale e un certificato leaf per UniBin.
#
# Uso:
#   scripts/gen-certs.sh [IP]
#
#   IP         indirizzo IP della LAN da includere nei SAN
#              (default: primo IP di `hostname -I`)
#
# Variabili d'ambiente:
#   FORCE_CA=1 rigenera anche la CA locale (invalida i certificati
#              già installati sui dispositivi)
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CERT_DIR="${ROOT_DIR}/certs"

IP="${1:-}"
if [ -z "${IP}" ]; then
  IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
fi
if [ -z "${IP}" ]; then
  echo "Impossibile determinare l'IP della LAN." >&2
  echo "Passalo esplicitamente: scripts/gen-certs.sh <IP>" >&2
  exit 1
fi

mkdir -p "${CERT_DIR}"
chmod 700 "${CERT_DIR}"

CA_KEY="${CERT_DIR}/ca.key"
CA_CRT="${CERT_DIR}/ca.crt"
LEAF_KEY="${CERT_DIR}/unibin.key"
LEAF_CSR="${CERT_DIR}/unibin.csr"
LEAF_CRT="${CERT_DIR}/unibin.crt"
LEAF_EXT="${CERT_DIR}/unibin.ext"

# --- CA locale (creata una sola volta) ---------------------------------------
if [ "${FORCE_CA:-0}" = "1" ] || [ ! -f "${CA_CRT}" ] || [ ! -f "${CA_KEY}" ]; then
  echo "==> Creo la CA locale: ${CA_CRT}"
  openssl req -x509 -newkey rsa:4096 -sha256 -days 3650 -nodes \
    -keyout "${CA_KEY}" -out "${CA_CRT}" \
    -subj "/O=UniBin/CN=UniBin Local CA" \
    -addext "basicConstraints=critical,CA:TRUE" \
    -addext "keyUsage=critical,keyCertSign,cRLSign"
  chmod 600 "${CA_KEY}"
else
  echo "==> CA locale già presente, la riuso"
fi

# --- Certificato leaf del server (rigenerato a ogni esecuzione) --------------
echo "==> Genero il certificato leaf per: localhost, 127.0.0.1, ${IP}"

cat > "${LEAF_EXT}" <<EOF
basicConstraints=CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=DNS:localhost,IP:127.0.0.1,IP:${IP}
EOF

openssl req -new -newkey rsa:2048 -nodes \
  -keyout "${LEAF_KEY}" -out "${LEAF_CSR}" \
  -subj "/O=UniBin/CN=${IP}"

openssl x509 -req -in "${LEAF_CSR}" \
  -CA "${CA_CRT}" -CAkey "${CA_KEY}" -CAcreateserial \
  -out "${LEAF_CRT}" -days 825 -sha256 -extfile "${LEAF_EXT}"

chmod 600 "${LEAF_KEY}"
rm -f "${LEAF_CSR}"

echo
echo "Fatto."
echo "  Certificato server : ${LEAF_CRT}"
echo "  Chiave server      : ${LEAF_KEY}"
echo "  CA da installare   : ${CA_CRT}   <-- distribuiscila sui dispositivi"
