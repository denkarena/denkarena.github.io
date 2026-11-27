Stockfish 19 (Stockfish.js 19.0.1, "lite, single-threaded")

This folder contains an unmodified, separately running copy of the Stockfish chess engine.
DenkArena starts it as its own program (a Web Worker) and talks to it only through the
standard UCI text protocol. Stockfish is not part of the DenkArena program code.

License: GNU General Public License version 3 (see COPYING.txt).
Authors: the Stockfish developers (see AUTHORS.txt); WebAssembly port by Nathan Rugg / Chess.com.
Neural network: nn-61e7af4bb97d.nnue by Chris Bao (sscg13), embedded in the .wasm file.

Files (identical to the official release, SHA-256):
  stockfish-19-lite-single.js    ccb130d7ff29408531c47d859a49f91d59d4f482d05a53eb1a3231a4f624c91a
  stockfish-19-lite-single.wasm  ee4f115bdb2d32cadf96cada104a05b5ec257d7ad6f57582190b49bc71f096de

Official release:  https://github.com/nmrugg/stockfish.js/releases/tag/v19.0.1
Source code:       https://github.com/nmrugg/stockfish.js/tree/v19.0.1
                   https://github.com/official-stockfish/Stockfish
Complete corresponding source (including the network file) as provided by DenkArena:
                   https://denkarena.github.io/stockfish/
