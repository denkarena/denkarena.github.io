# Website-Upload für 1.0.46

Diese 6 Dateien in `denkarena.github.io` ersetzen. Die Ordnerstruktur ist dieselbe wie hier, `chess.woff2` gehört in den Ordner `fonts/`.

| Datei | Warum |
|---|---|
| `index.html`, `en.html` | Startseite (DE/EN): Wandelzug-Vorschau mit den neuen DenkArena-Figuren |
| `wandelzug.html` | Wandelzug im Browser: neue Figuren |
| `p.html` | Partie-Link-Seite: Figurenschrift mit den neuen Figuren |
| `fonts/chess.woff2` | eigene Figurenschrift statt Noto (aus `scripts/figuren/build-figuren.py`) |
| `legal.json` | Lizenzen: Noto-Schrift entfernt, weil die App sie nicht mehr enthält |

- Alles andere ist unverändert.
- Der Ordner `stockfish/` ist bereits live und muss nicht erneut hochgeladen werden.
- Die Reihenfolge ist egal. Die Seiten funktionieren auch, wenn sie vor der App-Version live gehen.
