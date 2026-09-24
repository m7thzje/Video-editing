# Puck's Adventure 🦜

Een vrolijke 3D open-world game in de browser, gebouwd met [Three.js](https://threejs.org) en [Vite](https://vite.dev).
Speel als **Puck**, een grijze roodstaart papegaai die niet graag vliegt: hij loopt, klimt op meubels, bomen en
kooien en kan hooguit een klein stukje hoppen. Puck's favoriete zinnen: *"Watskebeurt?"* en *"Mag ik een koekje?"*

## Het spel

Je begint **thuis bij Puck**, op zijn roze zitstok naast de grote zwarte kooi. Het appartement is nagebouwd naar
echte foto's: grijze L-bank, groene tv-wand, ronde bijzettafeltjes, eettafel met mintgroene stoelen, het
notenhouten dressoir met het letterbord *"Mag ik wel een koekje? Puck 2026"* en de gang met de zwarte voordeur.

Via de voordeur ga je **naar buiten**: een open wereld rond de flat met vier minigames. Elke minigame levert een ⭐ op.

| ⭐ | Minigame | Waar | Doel |
|---|---|---|---|
| 🥜 | **Pistachehuis** | Het bakstenen huis van de buren (links van het plein) | Vind 10 verstopte pistachenootjes. Kruip in een kartonnen doos voor de *pistacheradar*. |
| 🪶 | **Verenjacht** | Overal buiten | Vind 8 rode veren (op daken, takken, stenen…). |
| 🪨 | **Stapstenen** | De vijver | Loop door START en hop via de gele ringen naar de FINISH binnen 18 seconden. Niet in het water vallen! |
| 🎵 | **Merel-liedjes** | De grote boom met het vogelhuisje | Druk op *E* / 💬 en zing 3 liedjes van de merel na. |

**Patat 🍟** ligt op een paar plekken (o.a. bij de patatkraam) en geeft 15 seconden **patat-power**: supersnel lopen en
superhoog hoppen. Sommige plekken zijn alleen zo bereikbaar. Patat komt na een tijdje terug.

Met alle 4 sterren krijgt Puck een **kroon** 👑. Je voortgang (sterren, geheimpjes, beste tijd) wordt in de browser bewaard;
via het menu (☰) kun je opnieuw beginnen.

### Geheimpjes (easter eggs) 🥚

Er zijn 12 geheimpjes. Een paar hints (spoilers!):

<details>
<summary>Toon hints</summary>

- Stap op de controller op het bijzettafeltje… of kijk bij het letterbord of er een koekje ligt.
- Klim op het kastje in de gang, bij de spiegels. En bovenop de jassen ligt iets zeldzaams.
- Tussen de spulletjes op de eettafel ligt een "stoer" grapje.
- Bij de buren hangt een wel héél bekend schilderij boven de bank.
- Achter de schuur staat iemand met een rode muts. Op het fietsenhok (klim via de regenpijp) glimt iets gouds.
- Zoek het badeendje in de vijver.
- Blijf in de lucht op hop drukken… of tik 5 keer snel op Puck.

</details>

## Besturing

| | Desktop | Mobiel |
|---|---|---|
| Lopen | `WASD` / pijltjes | virtuele joystick links |
| Hoppen | `Spatie` | Hop!-knop rechts |
| Praten / doen | `E` | 💬-knop (verschijnt als er iets te doen is) |
| Camera | muis (klik in beeld om de muis te vergrendelen, of slepen) | vegen over het scherm |
| Klimmen | loop tegen meubels, kooien, bomen, jassen, palen aan | idem |
| Menu | ☰, `P` of `Esc` | ☰ |
| Geluid aan/uit | `M` | via het menu |

## Ontwikkelen

```bash
npm install
npm run dev      # ontwikkelserver op http://localhost:5173
npm run build    # productie-build in dist/
npm run preview  # build lokaal bekijken
```

## Geluiden

Geluiden staan in `public/assets/sounds/`. De audio start pas na de eerste interactie (klik, tik of toets).
Ontbreekt een bestand, dan speelt het spel automatisch een gesynthetiseerd placeholder-geluid af.
Per geluid wordt eerst `.mp3`, dan `.ogg`, dan `.wav` geprobeerd.

**Al aanwezig**, uit de video's en opnames van Puck zelf:

| Bestand | Wanneer |
|---|---|
| `puck-praat-1.mp3` … `puck-praat-5.mp3` | Puck praat (spraakballonnen, tikken op Puck, in een doos). Er wordt willekeurig één gekozen. |
| `puck-lekker.mp3` | Puck eet iets (pistache, patat, koekje) en zegt "lekker!" |
| `puck-dans.mp3` | Het dansje (tik 5x op Puck) |
| `puck-geluid-1.mp3` … `puck-geluid-7.mp3` | Krijsjes en fluitjes: blij in een doos, bij een veer, bij tikken op Puck en af en toe uit zichzelf |
| `puck-wauw.mp3` | "Wauw wauw wauw!" bij een ster of een geheimpje (tot er eigen `star.mp3` / `secret.mp3` zijn) |
| `puck-hallo.mp3` | "Hallo!" bij de start van het spel |

**Nog te leveren** (nu placeholders):

| Bestand | Wanneer |
|---|---|
| `nut.mp3` | pistachenootje gevonden |
| `box.mp3` | Puck kruipt in een kartonnen doos (nu: een krijsje van Puck) |
| `hop.mp3` | Puck hopt |
| `feather.mp3` | rode veer gevonden (nu: een krijsje van Puck) |
| `fries.mp3` | patat-power start |
| `star.mp3` | ster verdiend (nu: Puck's "wauw") |
| `level-complete.mp3` | minigame voltooid (fanfare) |
| `secret.mp3` | geheimpje gevonden (nu: Puck's "wauw") |
| `splash.mp3` | plons in de vijver |
| `squeak.mp3` | badeendje |
| `door.mp3` | door een deur gaan |
| `checkpoint.mp3` | ring gehaald bij de stapstenen / goed liedje |

Wil je een Puck-geluid vervangen door een beter fragment? Overschrijf dan gewoon het bestand met dezelfde naam.
Houd de bestanden kort en klein (bij voorkeur < 100 kB) zodat ze snel laden op mobiel.

## Online zetten (GitHub Pages)

De workflow `.github/workflows/deploy.yml` bouwt het spel en publiceert `dist/` op GitHub Pages bij elke push naar
`main` (of de ontwikkelbranch), en is ook handmatig te starten via *Actions → Deploy naar GitHub Pages → Run workflow*.

Eenmalig instellen: ga in de repository naar **Settings → Pages** en kies bij *Build and deployment → Source* voor
**GitHub Actions**. Het spel staat daarna op `https://<gebruiker>.github.io/<repository>/`.
Vite gebruikt `base: './'`, dus de build werkt onder elk subpad.

## Projectstructuur

```
public/
  logo.svg              logo + favicon
  assets/sounds/        geluiden
src/
  main.js               spel-loop, gebieden wisselen, HUD, sterren, geheimpjes, patat-power, menu, opslag
  areas/puckHouse.js    Puck's appartement (startgebied)
  areas/outside.js      de open wereld: flat, plein, vijver + stapstenen, merelboom, schuur, fietsenhok, veren, patat
  areas/pistachioHouse.js  het Pistachehuis (pistache-minigame met dozen en radar)
  world/area.js         basisklasse voor gebieden + gedeelde objecten (pistache, veer, patat, koekje, borden…)
  world/materials.js    gedeelde lowpoly-materialen
  songGame.js           merel-minigame (nazingen)
  puck.js               Puck-model (geschubde veren, gele iris, rode spikkels) + animaties, hoedjes, gloed
  physics.js            karakterfysica: lopen, klimmen, hoppen, botsen met blokken
  camera.js             third-person volgcamera met botsing
  input.js              toetsenbord, muis, joystick, hop- en actieknop, tikken en vegen
  audio.js              geluiden laden + placeholder-synthese
  textures.js           procedurele texturen (vloeren, behang, kaarten, letterbord, Puck-portret)
```

## Prestaties op mobiel

- Lambert-materialen met flat shading (lowpoly), één schaduwcasterende zon per gebied met **statische** schaduwmap
  (alleen ververst bij het wisselen van gebied); Puck heeft een goedkope blob-schaduw.
- Alleen het actieve gebied wordt getekend; bomen, bloemen, ramen en hekpaaltjes zijn instanced; kooitralies samengevoegd.
- Pixel ratio begrensd (max. 1,5 op touch) en wordt automatisch verlaagd als de framerate onder de 45 fps zakt.
- Alle texturen worden procedureel gemaakt (geen afbeeldingen downloaden).
