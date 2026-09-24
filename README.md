# Puck's Adventure 🦜

Een vrolijke 3D open-world game in de browser, gebouwd met [Three.js](https://threejs.org) en [Vite](https://vite.dev).
Speel als **Puck**, een grijze roodstaart papegaai die niet graag vliegt: hij loopt, klimt op meubels, bomen en
kooien en kan hooguit een klein stukje hoppen. Puck's favoriete zinnen: *"Watskebeurt?"* en *"Mag ik een koekje?"*

## Het spel

Puck woont op de **9e verdieping van de Donderslaanflat in Groningen**. Je begint in zijn appartement, op zijn roze
zitstok naast de grote zwarte kooi. Het appartement is nagebouwd naar echte foto's: grijze L-bank, groene tv-wand,
ronde bijzettafeltjes, eettafel met mintgroene stoelen, het notenhouten dressoir met het letterbord
*"Mag ik wel een koekje? Puck 2026"* en de gang met de zwarte voordeur.

1. **De galerij (9e verdieping):** via de voordeur kom je op een lange galerij met balustrade en uitzicht over Stad,
   met de Martinitoren in de verte. Nr. 93 is de deur van de chagrijnige buurvrouw (het Pistachehuis).
2. **De lift:** aan het eind van de galerij brengt de lift je naar beneden (en weer terug).
3. **Groningen op straatniveau:** de ingang van de Donderslaanflat (glazen hal, grijze plint, rij fietsen, coniferen,
   klinkerpad met paaltje, parkeerplaats), een plein met fontein en snackbar, de vijver, de merelboom, een gracht met
   brug, bootje en grachtenpanden, stadsvlaggen en de Martinitoren.

Elke minigame levert een ⭐ op (5 in totaal):

| ⭐ | Minigame | Waar | Doel |
|---|---|---|---|
| 🥜 | **Pistachehuis** | Nr. 93 op de galerij (9e verdieping) | Pik 10 verstopte pistachenootjes zonder dat de **chagrijnige buurvrouw** je ziet. Kruip in een kartonnen doos om je te verstoppen (en voor de *pistacheradar*). |
| 🍪 | **Groninger koek** | Bakkerij Moi (het bakstenen huis beneden) | Oma Moi mist 5 ingrediënten: roggemeel, honing, stroop, kaneel en steranijs. Ze liggen verspreid door Stad. |
| 🪶 | **Verenjacht** | Overal buiten | Vind 8 rode veren (op daken, takken, stenen…). |
| 🪨 | **Stapstenen** | De vijver | Loop door START en hop via de gele ringen naar de FINISH binnen 18 seconden. Niet in het water vallen! |
| 🎵 | **Merel-liedjes** | De grote boom met het vogelhuisje | Druk op *E* / 💬 en zing 3 liedjes van de merel na. |

**Patat 🍟 en de Groningse eierbal** (bij de snackbar) geven 15 seconden **superkracht**: supersnel lopen en
superhoog hoppen. Sommige plekken zijn alleen zo bereikbaar. Ze komen na een tijdje terug.

Alles wat je vrijspeelt krijgt een duidelijk effect: een grote pop-up met stralen, confetti, een schokgolf en een flits
(sterren krijgen een eigen ⭐ STER!-banner). Gevonden ingrediënten staan in de inventaris linksboven.

Met alle 5 sterren krijgt Puck een **kroon** 👑. Je voortgang (sterren, geheimpjes, items, beste tijd) wordt in de
browser bewaard; via het menu (☰) kun je opnieuw beginnen.

### De buurvrouw 👓

In het Pistachehuis loopt een grote, chagrijnige buurvrouw met halflang wit haar en een bril haar vaste rondje.
Haar **kijkkegel** zie je als lichtvlek op de vloer. Sta je daarin (en staan er geen meubels tussen), dan verschijnt er
een **?** boven haar hoofd en wordt de vlek rood. Blijf je te lang in beeld (of loop je tegen haar aan), dan wordt het een
**!** en zet ze je buiten. Gevonden pistachenootjes blijf je houden. In een kartonnen doos ben je onzichtbaar, en
meubels, tafels en dozen blokkeren haar zicht. Na binnenkomen heb je 2,5 seconden voorsprong.

### Geheimpjes (easter eggs) 🥚

Er zijn 16 geheimpjes. Een paar hints (spoilers!):

<details>
<summary>Toon hints</summary>

- Stap op de controller op het bijzettafeltje… of kijk bij het letterbord of er een koekje ligt.
- Klim op het kastje in de gang, bij de spiegels. En bovenop de jassen ligt iets zeldzaams.
- Tussen de spulletjes op de eettafel ligt een "stoer" grapje.
- Bij de buren hangt een wel héél bekend schilderij boven de bank.
- Achter de schuur staat iemand met een rode muts. Op het fietsenhok (klim via de regenpijp) glimt iets gouds.
- Zoek het badeendje in de vijver.
- Blijf in de lucht op hop drukken… of tik 5 keer snel op Puck.
- Lees de deurmat van nr. 93. Klim op het opstapje op de galerij voor een mooi uitzicht.
- Bel eens aan bij de fietsen voor de flat. En proef een Groningse eierbal.
- Het vuurdraak-kaartje is een zeldzame holo-kaart: bekijk hem goed als je hem vindt.

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
| `puck-lekker.mp3` | Puck eet iets (pistache, patat, eierbal, koekje) en zegt "lekker!" (alleen het woord) |
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
| `alert.mp3` | de buurvrouw vermoedt iets |
| `caught.mp3` | de buurvrouw zet je buiten |

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
  areas/puckHouse.js    Puck's appartement op de 9e verdieping (startgebied)
  areas/gallery.js      de galerij op de 9e met balustrade, deuren en de lift
  areas/bakery.js       Bakkerij Moi met oma Moi en de koek-quest
  areas/outside.js      Groningen op straatniveau: Donderslaanflat, plein, vijver, gracht, merelboom, schuur, veren, patat, ingrediënten
  areas/pistachioHouse.js  het Pistachehuis (pistache-minigame met dozen en radar)
  areas/neighbor.js     de chagrijnige buurvrouw: rondje lopen, kijkkegel, zichtlijn, buiten zetten
  world/area.js         basisklasse voor gebieden + gedeelde objecten (pistache, veer, patat, koekje, borden…)
  world/materials.js    gedeelde lowpoly-materialen
  world/fx.js           sfeer: lucht, wolken, wind, vlinders, vogels, fontein, vlaggetjes, zonnestralen, stofjes
  world/groningen.js    Martinitoren, stadsvlag, fietsen, auto's, grachtenpanden, stadsgezicht
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
