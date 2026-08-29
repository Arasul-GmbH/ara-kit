# Der Bauplan des Backends. Gebaut wird AM GERÄT, aus dieser Datei und dem
# Ordner, in dem sie liegt: ein fertiges Image wäre für eine Architektur gebaut,
# und niemand merkte es, bis es dort nicht startet.
#
# Keine Abhängigkeiten, kein npm install: `server.mjs` kommt mit dem eingebauten
# `http`-Modul aus. Kommt später eines dazu, gehört hier ein `npm ci` hin.
FROM node:22-alpine

WORKDIR /app
# `arasul.json` gehört dazu und nicht daneben: darin steht, unter welchen Namen
# dieses Gerät der App Adresse und Schlüssel in den Container legt, und ohne die
# Datei im Image findet das Backend beides nicht. Das Kit schreibt sie beim
# Einspielen aus dem Kontrakt, im Quelltext steht sie leer.
COPY server.mjs arasul.json ./

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

USER node
CMD ["node", "server.mjs"]
