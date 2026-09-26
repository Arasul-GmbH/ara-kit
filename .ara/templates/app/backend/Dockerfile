# Der Bauplan des Backends. Gebaut wird AM GERÄT, aus dieser Datei und dem
# Ordner, in dem sie liegt: ein fertiges Image wäre für eine Architektur gebaut,
# und niemand merkte es, bis es dort nicht startet.
#
# Eine Abhängigkeit, `pg`, für die Datenbank, die das Gerät der App je Stand
# gibt. `npm ci` holt sie beim Bau am Gerät aus der Registry, genau in der
# Fassung aus `package-lock.json`: das Gerät muss die Registry dafür erreichen,
# und das prüfst du dort, nicht auf deinem Rechner. Ohne Gerät läuft das
# Backend auf dem eingebauten SQLite und braucht das Paket nicht.
#
# Node 24 und nicht 22: `node:sqlite` steckt erst darin ohne einen Schalter auf
# der Kommandozeile.
FROM node:24-alpine

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# Dann der ganze Ordner: Einstieg, Kern, Ablage samt Migrationen, die Wege
# eines Musters, und die Vereinbarung mit dem Gerät. Der ganze und keine Liste:
# ein Muster, das einen Ordner dazulegt, käme sonst nicht ins Image, und das
# fiele erst am Gerät auf. Was nicht hineingehört, steht in `.dockerignore`.
#
# Die Vereinbarung gehört dazu und nicht daneben: darin steht, unter welchen
# Namen dieses Gerät der App Adresse, Schlüssel und Datenbank in den Container
# legt, und ohne die Datei im Image findet das Backend nichts davon. Das Kit
# schreibt sie beim Einspielen aus dem Kontrakt, im Quelltext steht sie leer.
#
# Dazu das Manifest, `app.json`: die Route `agent` liefert aus ihm, was die App
# Agenten anbietet. Der Bau des Kits legt es neben diese Datei. Im Quelltext
# liegt es eine Ebene darüber, und ein `docker build` von hier aus findet es
# nicht: gebaut wird aus dem Paket.
COPY . .

# Der Ordner der SQLite-Datei, für den Weg ohne Gerät (`--compose`). Am Gerät
# bleibt er leer: dort liegen die Daten in der Datenbank des Geräts. Was in
# diesem Ordner liegt, überlebt einen Neustart des Containers und nicht das
# nächste Einspielen, denn das Gerät ersetzt den Container samt seinen Volumes.
# Ein `VOLUME` hier änderte daran nichts.
RUN mkdir -p /app/daten && chown -R node:node /app/daten

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

USER node
CMD ["node", "server.mjs"]
