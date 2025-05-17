// js/effects.js

// Container, dem die Funken hinzugefügt werden.
// Wird idealerweise einmal initialisiert, nachdem das DOM geladen ist.
var sparksContainer = null;

// Standard-Cooldown, falls nicht anders von der aufrufenden Logik übergeben.
const SPARK_DEFAULT_COOLDOWN_MAX = 3;

/**
 * Initialisiert den Container, in den Effekte (wie Funken) gezeichnet werden.
 * Sollte einmal aufgerufen werden, nachdem das DOM vollständig geladen ist (z.B. von startGame in game.js).
 */
function initializeEffects() {
    if (!sparksContainer) {
        sparksContainer = document.getElementById('game-area');
        if (!sparksContainer) {
            console.error("Effects.js: Konnte sparksContainer (#game-area) nicht finden! Effekte werden nicht angezeigt.");
        }
    }
}

/**
 * Erzeugt einen einzelnen animierten Funken.
 * @param {number} x - Start-X-Position des Funkens.
 * @param {number} y - Start-Y-Position des Funkens.
 * @param {number} [directionX=-1] - Horizontale Hauptflugrichtung (-1 für links, 1 für rechts).
 * @param {object} [options={}] - Zusätzliche Optionen zur Anpassung des Funkens.
 * @param {number} [options.angleSpread=45] - Streuung des Winkels für die Flugrichtung (in Grad, um den Hauptwinkel).
 * @param {number} [options.baseSpeed=20] - Grundgeschwindigkeit des Funkens.
 * @param {number} [options.speedVariation=25] - Zufällige Variation der Geschwindigkeit.
 * @param {number} [options.baseDuration=400] - Grundlebensdauer des Funkens in ms.
 * @param {number} [options.durationVariation=300] - Zufällige Variation der Lebensdauer.
 * @param {number} [options.startScale=(1 + Math.random() * 0.5)] - Zufällige Startgröße.
 * @param {number} [options.startOpacity=(0.8 + Math.random() * 0.2)] - Zufällige Start-Opazität.
 * @param {string} [options.color='#FFD700'] - Farbe des Funkens.
 * @param {string} [options.className='spark'] - CSS-Klasse für den Funken.
 */
function createSpark(x, y, directionX = -1, options = {}) {
    if (!sparksContainer) {
        console.warn("createSpark aufgerufen, aber sparksContainer ist nicht initialisiert. Versuche Initialisierung...");
        initializeEffects(); // Notfall-Initialisierung
        if (!sparksContainer) {
            console.error("createSpark: sparksContainer konnte auch nach erneutem Versuch nicht initialisiert werden.");
            return;
        }
    }

    const spark = document.createElement('div');
    spark.className = options.className || 'spark'; // Standard-CSS-Klasse 'spark'
    spark.style.left = x + 'px';
    spark.style.top = y + 'px';
    if (options.color) { // Erlaube benutzerdefinierte Farbe
        spark.style.backgroundColor = options.color;
        spark.style.boxShadow = `0 0 2px 1px ${options.color}b3`; // Alpha für Glow anpassen
    }


    sparksContainer.appendChild(spark);

    // Standardwerte für Optionen, falls nicht übergeben
    const angleSpread = options.angleSpread !== undefined ? options.angleSpread : 45;
    const baseSpeed = options.baseSpeed !== undefined ? options.baseSpeed : 20;
    const speedVariation = options.speedVariation !== undefined ? options.speedVariation : 25;
    const baseDuration = options.baseDuration !== undefined ? options.baseDuration : 400;
    const durationVariation = options.durationVariation !== undefined ? options.durationVariation : 300;
    const startScale = options.startScale !== undefined ? options.startScale : (1 + Math.random() * 0.5);
    const startOpacity = options.startOpacity !== undefined ? options.startOpacity : (0.8 + Math.random() * 0.2);

    // Hauptwinkel für aufsteigende Funken (-90 Grad ist direkt nach oben)
    // Streuung um diesen Hauptwinkel
    const mainAngle = -90 + (Math.random() - 0.5) * angleSpread;
    const currentSpeed = baseSpeed + Math.random() * speedVariation;
    const currentDuration = baseDuration + Math.random() * durationVariation;

    // Berechnung der Zielkoordinaten basierend auf Winkel und Geschwindigkeit
    const deltaX = Math.cos(mainAngle * Math.PI / 180) * currentSpeed;
    const deltaY = Math.sin(mainAngle * Math.PI / 180) * currentSpeed; // Wird negativ sein für Aufwärtsbewegung

    anime({
        targets: spark,
        translateX: [
            { value: 0, duration: 0 }, // Start bei der gesetzten 'left'-Position
            // Horizontale Bewegung: eine kleine Komponente vom Hauptwinkel
            // plus eine stärkere Komponente von der übergebenen directionX (Links/Rechts-Drift)
            { value: deltaX * 0.4 + (directionX * currentSpeed * 0.6), duration: currentDuration }
        ],
        translateY: [
            { value: 0, duration: 0 }, // Start bei der gesetzten 'top'-Position
            { value: deltaY, duration: currentDuration } // Primär vertikale Bewegung
        ],
        scale: [
            { value: startScale, duration: 0 },
            { value: 0, duration: currentDuration } // Schrumpft zu nichts
        ],
        opacity: [
            { value: startOpacity, duration: 0 },
            { value: 0, duration: currentDuration } // Verblasst
        ],
        easing: 'easeOutQuad', // Partikel verlangsamen sich am Ende ihrer Flugbahn
        complete: () => {
            if (spark.parentNode) {
                sparksContainer.removeChild(spark); // Funken aus dem DOM entfernen
            }
        }
    });
}

/**
 * Versucht, Funken für den Grind-Effekt zu erzeugen.
 * Wird von der Spielerlogik aufgerufen.
 * @param {object} player - Das playerState-Objekt.
 * @param {object} sparkState - Ein Objekt zur Verwaltung des Cooldowns für diesen spezifischen Effekt (z.B. { cooldown: 0, cooldownMax: 3 }).
 * @param {number} grindAdjust - Die aktuelle horizontale Anpassung des Spielers auf dem Rail (-1, 0, oder 1 Tendenz).
 */
function tryEmitGrindSparks(player, sparkState, grindAdjust) { // player ist playerState
    if (!player.isGrinding || !player.currentRail) return;

    if (sparkState.cooldown <= 0) {
        // --- NEU: Feste X-Position und Richtung für Funken ---

        // Entstehungsort: Linkes Ende der Skateboard-Hitbox.
        // player.x ist die linke Kante der Spieler-Kollisionsbox.
        // Wenn das Skateboard die volle Breite der Kollisionsbox einnimmt, ist das korrekt.
        // Wenn das Skateboard-Bild schmaler ist als die Kollisionsbox und zentriert ist,
        // müsstest du den Offset zur tatsächlichen linken Kante des Skateboard-Bildes berechnen.
        // Annahme hier: player.x ist die linke Kante des Skateboards.
        const sparkOriginX = player.x; // Linke Kante der Spieler-/Board-Hitbox

        // Y-Position der Funken: Knapp über der Oberfläche des Rails
        const sparkStartY = player.currentRail.y - 3; // 3 Pixel über der Rail-Oberkante

        // Sprührichtung: Immer nach links
        const horizontalSparkFlightDirection = -1; // -1 für links

        const sparkOptions = {
            angleSpread: 40,      // Etwas engere Streuung, da sie gezielt nach links sollen
            baseSpeed: 20,
            speedVariation: 25,
            baseDuration: 380,
            durationVariation: 280,
            // Die `createSpark`-Funktion lenkt die Funken schon primär nach oben,
            // `horizontalSparkFlightDirection` gibt die seitliche Drift.
        };

        createSpark(sparkOriginX, sparkStartY, horizontalSparkFlightDirection, sparkOptions);

        // Optional: Ein zweiter Funke für einen dichteren Effekt mit leichter Variation
        if (Math.random() < 0.7) { // 70% Chance für einen zweiten, leicht versetzten Funken
             createSpark(
                 sparkOriginX + (Math.random() * 5 - 2), // Leichte X-Variation um den linken Rand
                 sparkStartY + (Math.random() * 4 - 2),   // Leichte Y-Variation
                 horizontalSparkFlightDirection * (0.8 + Math.random() * 0.4), // Leicht variierte Drift nach links
                 { ...sparkOptions, baseSpeed: sparkOptions.baseSpeed * 0.75, durationVariation: 180 } // Etwas kleiner/kürzer
             );
        }

        sparkState.cooldown = sparkState.cooldownMax || SPARK_DEFAULT_COOLDOWN_MAX;
    } else {
        sparkState.cooldown--;
    }
}
