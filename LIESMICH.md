# Website-Aktualisierung zu DenkArena 1.0.43

Diese 11 Dateien einzeln ins Website-Repository `denkarena.github.io` hochladen. Dort jeweils ins Hauptverzeichnis legen und vorhandene Dateien ersetzen. Dafür auf GitHub „Add file“ → „Upload files“ wählen und alle 11 auf einmal hineinziehen.

**Nicht** den ganzen Ordner `site/` hochladen und nichts löschen. Der Ordner `snowdial/` auf der Website bleibt so unberührt.

| Datei | Änderung gegenüber der Live-Seite (geprüft am 09.11.2026) |
|---|---|
| `legal.json` | Lizenzen: Urheberrecht, neue Fremdbestandteile, vollständiger Apache-2.0-Text. Impressum: ©-Zeile. Datenschutz und Nutzungsbedingungen unverändert. |
| `index.html`, `en.html` | Fußzeile „© 2026 Erdi Karasungur“ statt „© 2026 DenkArena“. Snowdial-Links bleiben enthalten. |
| `impressum.html`, `legal-notice.html` | ©-Absatz und ©-Fußzeile |
| `datenschutz.html`, `privacy.html`, `nutzungsbedingungen.html`, `terms.html`, `konto-loeschen.html`, `delete-account.html` | nur ©-Fußzeile |

`p.html` und `wandelzug.html` sind identisch mit der Live-Seite und werden deshalb nicht mit hochgeladen.

Danach prüfen: `https://denkarena.com/legal.json` sollte „Apache License 2.0“ enthalten. In der App unter Einstellungen → Lizenzen steht der Text dann auch bei Internetverbindung.
