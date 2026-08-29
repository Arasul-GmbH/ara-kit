# Der Bauplan des Backends. Gebaut wird AM GERÄT, aus dieser Datei und dem
# Ordner, in dem sie liegt: ein fertiges Image wäre für eine Architektur gebaut,
# und niemand merkte es, bis es dort nicht startet.
#
# Keine Abhängigkeiten, kein npm install: das Backend kommt mit dem eingebauten
# `http`-Modul und dem eingebauten SQLite aus. Kommt später ein Paket dazu,
# gehört hier ein `npm ci` hin.
#
# Node 24 und nicht 22: `node:sqlite` steckt erst darin ohne einen Schalter auf
# der Kommandozeile.
FROM node:24-alpine

WORKDIR /app

# Der ganze Ordner: Einstieg, Kern, Ablage samt Migrationen, und die
# Vereinbarung mit dem Gerät. Sie gehört dazu und nicht daneben: darin steht,
# unter welchen Namen dieses Gerät der App Adresse und Schlüssel in den
# Container legt, und ohne die Datei im Image findet das Backend beides nicht.
# Das Kit schreibt sie beim Einspielen aus dem Kontrakt, im Quelltext steht sie
# leer.
COPY server.mjs arasul.mjs arasul.json ./
COPY kern ./kern
COPY ablage ./ablage

# Der Ordner der Datenbank, bevor der Prozess die Rechte verliert. Was darin
# liegt, überlebt einen Neustart des Containers und nicht das nächste
# Einspielen: ein Gerät gibt einer App heute keinen eigenen Datenordner.
RUN mkdir -p /app/daten && chown -R node:node /app/daten

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

USER node
CMD ["node", "server.mjs"]
