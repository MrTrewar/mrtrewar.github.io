// js/world.js

var worldObjects = [];
var lastObjectRightX = GAME_AREA_WIDTH;
var lastObjectTopY = gameSettings.groundLevelY;

// Sicherstellen, dass gameAreaForWorld existiert, bevor darauf zugegriffen wird
var gameAreaForWorld = null; // Wird in startGame (game.js) initialisiert oder hier geprüft
document.addEventListener('DOMContentLoaded', () => { // Sicherstellen, dass DOM geladen ist
    gameAreaForWorld = document.getElementById('game-area');
    if (!gameAreaForWorld) {
        console.error("FATAL: #game-area nicht im DOM gefunden für world.js!");
    }
});


function createWorldObject(config) {
    if (!gameAreaForWorld) { // Zusätzliche Sicherheitsprüfung
        console.error("createWorldObject aufgerufen, aber gameAreaForWorld ist nicht initialisiert.");
        return null;
    }
    const objDiv = document.createElement('div');
    objDiv.className = `game-object ${config.type}`;
    objDiv.style.left = config.x + 'px';
    objDiv.style.top = config.y + 'px';
    objDiv.style.width = config.width + 'px';
    objDiv.style.height = config.height + 'px';

    gameAreaForWorld.appendChild(objDiv);

    const newObj = { element: objDiv, ...config };
    worldObjects.push(newObj);
    return newObj;
}

function generateNewObjects() {
    if (!gameAreaForWorld) return; // Nicht generieren, wenn gameArea nicht da ist

    if (lastObjectRightX < GAME_AREA_WIDTH + gameSettings.objectGenerationThreshold) {
        const gap = gameSettings.minGapBetweenObjects + Math.random() * (gameSettings.maxGapBetweenObjects - gameSettings.minGapBetweenObjects);
        const newObjectBaseX = lastObjectRightX + gap;

        const objectTypeRand = Math.random();
        let newObjConfig = { x: newObjectBaseX };
        let newObjTopSurfaceY;

        const randomYOffset = (Math.random() * (gameSettings.maxHeightDiffUp + gameSettings.maxHeightDiffDown)) - gameSettings.maxHeightDiffDown;
        newObjTopSurfaceY = lastObjectTopY + randomYOffset;

        newObjTopSurfaceY = Math.max(gameSettings.minObjectY, Math.min(newObjTopSurfaceY, gameSettings.maxObjectY));

        let objectHeightForCheck = (objectTypeRand < 0.65) ? 20 : gameSettings.railHeight;
        if (newObjTopSurfaceY + objectHeightForCheck > gameSettings.groundLevelY + 20) {
             newObjTopSurfaceY = lastObjectTopY - gameSettings.maxHeightDiffUp * Math.random();
             newObjTopSurfaceY = Math.max(gameSettings.minObjectY, newObjTopSurfaceY);
        }

        if (objectTypeRand < 0.65) {
            newObjConfig.type = 'platform';
            newObjConfig.width = gameSettings.minPlatformWidth + Math.random() * (gameSettings.maxPlatformWidth - gameSettings.minPlatformWidth);
            newObjConfig.height = 20;
            newObjConfig.y = newObjTopSurfaceY;
        } else {
            newObjConfig.type = 'rail';
            newObjConfig.width = gameSettings.minRailWidth + Math.random() * (gameSettings.maxRailWidth - gameSettings.minRailWidth);
            newObjConfig.height = gameSettings.railHeight;
            newObjConfig.y = newObjTopSurfaceY;
        }

        const newObj = createWorldObject(newObjConfig);
        if (newObj) {
            lastObjectRightX = newObj.x + newObj.width;
            lastObjectTopY = newObj.y;
        } else {
            lastObjectRightX += gameSettings.minGapBetweenObjects;
        }
    }
}

function initLevel() {
    worldObjects.forEach(obj => obj.element?.remove());
    worldObjects.length = 0;

    if (!gameAreaForWorld) { // Prüfen, ob gameAreaForWorld initialisiert wurde
        gameAreaForWorld = document.getElementById('game-area'); // Versuch der erneuten Initialisierung
        if (!gameAreaForWorld) {
            console.error("initLevel: gameAreaForWorld konnte nicht initialisiert werden.");
            return; // Frühzeitiger Ausstieg
        }
    }


    const ground = createWorldObject({
        type: 'platform',
        x: -50,
        y: gameSettings.groundLevelY,
        width: GAME_AREA_WIDTH + 100,
        height: 20,
        isGround: true
    });

    if (ground) {
        lastObjectRightX = ground.x + ground.width;
        lastObjectTopY = ground.y;
    } else {
        lastObjectRightX = GAME_AREA_WIDTH; // Fallback
        lastObjectTopY = gameSettings.groundLevelY;
    }

    for(let i = 0; i < 6; i++) {
        generateNewObjects();
    }

    createWorldObject({
        type: 'killzone',
        x: 0,
        y: GAME_AREA_HEIGHT + 20, // Position unterhalb des sichtbaren Bereichs
        width: GAME_AREA_WIDTH,   // So breit wie die Spielfläche
        height: 10,
        isStatic: true // Bleibt relativ zum Bildschirm stehen
    });
}

function updateWorldObjects() {
    for (let i = worldObjects.length - 1; i >= 0; i--) {
        const obj = worldObjects[i];

        if (obj.isStatic) { // Statische Objekte (wie die Haupt-Killzone) werden nicht gescrollt
            continue;
        }

        obj.x -= gameSettings.worldScrollSpeed; // Scrolle das Objekt nach links

        if (obj.element) { // Stelle sicher, dass das DOM-Element existiert
            obj.element.style.left = obj.x + 'px';
        }

        // Entferne Objekte, die weit links außerhalb des Bildschirms sind
        if (obj.x + obj.width < -200) { // -200 als Puffer, damit es sicher weg ist
            // WICHTIG: Prüfen, ob das zu entfernende Objekt das currentRail des Spielers ist
            if (playerState.isGrinding && playerState.currentRail === obj) {
                playerState.isGrinding = false;
                playerState.currentRail = null;
                if (playerElement) { // playerElement ist global aus player.js
                    playerElement.classList.remove('grinding');
                    playerElement.classList.add('jumping'); // Spieler "fällt" jetzt (nutzt Sprung-Animation für den Fall)
                }
                console.log("Player stopped grinding: Rail scrolled out of view.");
            }

            obj.element?.remove();       // Entferne das DOM-Element (?. für Sicherheit)
            worldObjects.splice(i, 1);   // Entferne das Objekt aus dem Array
        }
    }

    // Wichtig: Aktualisiere lastObjectRightX basierend auf der Scrollgeschwindigkeit
    lastObjectRightX -= gameSettings.worldScrollSpeed;
}