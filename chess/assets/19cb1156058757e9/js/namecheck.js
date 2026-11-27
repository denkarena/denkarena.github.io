/* Namensprüfung für alles, was andere Spieler sehen (Anzeigename, Liga-Name, Online-Schach).
 * Frei wählbar. Abgelehnt: Schimpfwörter (Deutsch, Englisch, Türkisch, Arabisch, Polnisch, Russisch, Italienisch, Spanisch,
 * Französisch, Portugiesisch), Hetze, sexuelle und Drogen-Anspielungen, Zahlen-Codes (69, 88, 420, 1488), Team-Namen wie „Admin“ –
 * auch mit Tricks wie f1ck, a$$ oder fuuuck.
 * ERZEUGT von scripts/namecheck_gen.py (gleiche Sperrliste prüft der Server) – nicht von Hand ändern. */
(function () {
  'use strict';
  const BL = ["administrator", "amcik", "aminakodum", "aminakoyayim", "aminakoyim", "amoklauf", "ananiavrad", "ananinami", "ananinsik", "ananisik", "arombada", "arombado", "arschficker", "arschgeige", "arschgesicht", "arschloch", "ashole", "bastard", "batard", "bdsm", "beaner", "behindert", "bitch", "bloediot", "bloedman", "blowjob", "blyad", "blyat", "bobs", "boceta", "bordel", "brothel", "buceta", "bulshit", "busen", "cabron", "canabis", "caralho", "cazo", "charmuta", "chingatumadre", "chuj", "chupapolas", "cocaine", "cocksuck", "coglion", "comemierda", "conard", "crystalmeth", "cuntface", "cuzao", "denkarenasuport", "denkarenateam", "depthroat", "dickhead", "dildo", "dipshit", "douchebag", "drecksack", "drecksau", "dreckstueck", "drogendealer", "drugdealer", "dschihad", "dumbas", "dumbfuck", "dumesau", "dumestueck", "dumkopf", "dumsau", "eblan", "ejakul", "encule", "erotic", "erotik", "escort", "fagot", "fetisch", "fetish", "fick", "fickdein", "fickdeine", "fickdich", "figliodiputana", "figlioditroia", "filedepute", "filhadaputa", "filhodamae", "filhodaputa", "filsdepute", "fotze", "fuck", "fuckwit", "gavat", "gerizekali", "gilipolas", "gotveren", "hackfrese", "hakenkreuz", "heilhitler", "hentai", "hijadeputa", "hijaputa", "hijodeputa", "hijoputa", "hitler", "horny", "hurenbock", "hurenkind", "hurensohn", "ibnelsharmuta", "incest", "inzest", "jebac", "jebactwoj", "jebana", "jebany", "jebtwoja", "jihad", "judensau", "kahpe", "kanacke", "kanake", "kifen", "kifer", "kilyourself", "kinderficker", "kinderschaender", "kokain", "kosomak", "kundenservice", "kurwa", "kurwy", "kusemak", "kusomak", "lazozasra", "manyak", "maricon", "marihuana", "marijuana", "masturb", "mierda", "misgeburt", "miststuck", "miststueck", "moderator", "mothafuck", "motherf", "mudak", "muterficker", "nackt", "nahui", "nahuy", "naked", "neger", "neonazi", "niga", "niger", "niquetamere", "nsdap", "oficial", "ofiziel", "onlyfans", "orgasm", "orosbucoc", "orosbucocu", "orospu", "paedo", "paedophil", "paneleiro", "pedophil", "pendejo", "penis", "pezevenk", "pidar", "pidor", "pieceofshit", "pierdol", "pierdolona", "pierdolony", "pimel", "piser", "pizda", "pizdec", "porcamadona", "porcodio", "pornhub", "porno", "punheta", "punheteiro", "putain", "putana", "rapist", "retard", "sacamerde", "salaud", "salaude", "salope", "scheise", "scheiskerl", "scheiskind", "scheiskopf", "scheistueck", "schlampe", "scholshot", "schwanzlutscher", "schwuchtel", "selbstmord", "serefsiz", "sharmouta", "sharmuta", "shitface", "shithead", "siegheil", "sikerim", "sikeyim", "sikik", "siktigit", "siktir", "skurwysyn", "slut", "sonofabitch", "spast", "sperm", "sperma", "spierdalaj", "striper", "stronzo", "suicide", "sukinsyn", "tagueule", "taliban", "terorist", "testadicazo", "titen", "titfuck", "troiadimerda", "vafanculo", "vagina", "vaifoder", "vaisefoder", "vaitefoder", "vaitelixar", "vatefairefoutre", "vergewaltig", "vetealamierda", "volidiot", "wanker", "wetback", "whitepower", "whore", "wichsen", "wichser", "wixer", "yarak", "zigeuner"];
  const BW = ["admin", "amk", "anal", "aptal", "arsch", "bob", "bobs", "breasts", "brueste", "cacete", "chink", "cipa", "cock", "cojones", "conase", "cono", "cretina", "cretino", "cum", "cunt", "cycek", "cycki", "debil", "debilka", "dilf", "dumb", "dyke", "fag", "fags", "foda", "foder", "foutre", "fudida", "fudido", "fuk", "geil", "gok", "heroin", "hoe", "huj", "hure", "huren", "ibne", "idiot", "idiota", "idiote", "idioten", "idiotka", "idioto", "imbecil", "imbecile", "isis", "jiz", "joder", "kike", "koks", "kys", "memeler", "merda", "merde", "meth", "milf", "mod", "mongo", "moron", "muschi", "nazi", "nazis", "nichons", "nique", "nude", "nudes", "nute", "nuten", "otaria", "otario", "paki", "pedo", "pic", "piersi", "pora", "porn", "prick", "puta", "putain", "pute", "puto", "rape", "salak", "seins", "seno", "sex", "sexy", "shit", "spasti", "spic", "staf", "stupid", "suka", "suport", "teta", "tetas", "tete", "tite", "titen", "tities", "tits", "tity", "transe", "trany", "troia", "twat", "vafanculo", "wank", "wed", "zebi", "zeby", "zora"];
  const ACC_FROM = "şçğıéèêëáàâãåíìîïóòôõúùûñłąęśżźćńščžřý", ACC_TO = "scgieeeeaaaaaiiiioooouuunlaeszzcnsczry";
  const deacc = s => String(s || '').toLowerCase().replace(/(.)\1+/g, '$1').replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/./g, c => { const i = ACC_FROM.indexOf(c); return i < 0 ? c : ACC_TO[i]; });
  const leet = s => s.replace(/[0134578@$!]/g, c => 'oieastbasi'['0134578@$!'.indexOf(c)]);
  const collapse = s => s.replace(/(.)\1+/g, '$1');
  // Ergebnis: { ok: true } oder { ok: false, reason: 'short' | 'chars' | 'link' | 'word' }
  function check(name) {
    const raw = String(name || '').normalize('NFKC').trim();
    if (raw.length < 2) return { ok: false, reason: 'short' };
    if (!/^[\p{L}\p{N} .·'_-]+$/u.test(raw)) return { ok: false, reason: 'chars' };
    if (/(https?|www\.|\.(com|de|net|org|io|app|me|ru|tk)(\W|$))/i.test(raw) || /[0-9]{5,}/.test(raw)) return { ok: false, reason: 'link' };
    if (/k\W*k\W*k|hh\W*88|x\W*x\W*x/i.test(raw) || /(^|[^0-9])(69|88|420|1488)([^0-9]|$)/.test(raw)) return { ok: false, reason: 'word' };
    const s = leet(deacc(raw)), compact = collapse(s.replace(/[^a-z]/g, ''));
    if (BL.some(w => compact.includes(w))) return { ok: false, reason: 'word' };
    if (s.split(/[^a-z]+/).some(t => t && BW.includes(collapse(t)))) return { ok: false, reason: 'word' };
    return { ok: true };
  }
  // so erscheint ein Name bei anderen (unzulässige Namen, z. B. von alten App-Versionen, als „Spieler“)
  function display(name, fallback) {
    const raw = String(name || '').trim();
    return raw && check(raw).ok ? raw : fallback || T('Spieler');
  }
  // sicherer Zufallsname aus den Level-Wortlisten, z. B. „Stiller Turm“ (höchstens 20 Zeichen)
  function random() {
    const W = window.LevelWords;
    if (!W) return '';
    for (let i = 0; i < 50; i++) {
      const n = W.name([Math.floor(Math.random() * W.ADJ.length), Math.floor(Math.random() * W.NOUN.length), -1, 0]);
      if (n.length <= 20 && check(n).ok) return n;
    }
    return '';
  }
  const message = reason => ({
    short: T('Bitte mindestens 2 Zeichen.'),
    chars: T('Bitte nur Buchstaben, Zahlen, Leerzeichen, Punkt oder Bindestrich.'),
    link: T('Links und lange Zahlen sind im Namen nicht erlaubt.'),
    word: T('Dieser Name ist nicht erlaubt. Bitte wähle einen anderen.')
  })[reason] || '';
  // Only for names supplied by authenticated profile/room RPCs: the server reserves
  // this exact spelling for designated staff. Never use for forms or shared files.
  const serverDisplay = (name, fallback) => name === 'Admin' ? 'Admin' : display(name, fallback);
  // Game links contain unverified display text, not account identities or roles.
  // Preserve the literal recorded Admin name without granting any staff badge/privilege.
  const gameDisplay = (name, fallback) => name === 'Admin' ? 'Admin' : display(name, fallback);
  window.NameCheck = { check, display, serverDisplay, gameDisplay, random, message, ok: n => check(n).ok };
})();
