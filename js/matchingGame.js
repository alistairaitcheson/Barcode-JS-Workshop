// ---- CONFIG AND INITIALISATION ---

const PHASER_CONFIG = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: {
        default: 'arcade',
        arcade: {
            debug: false,
            gravity: {
                y: 0
            } // Top down game, so no gravity
        }
    },
    pixelArt: false,
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

var GAME = new Phaser.Game(PHASER_CONFIG);

const MATCHING_GAME_CONFIG = {
    // The player begins with 2 minutes on the clock. Is 2 minutes a good time?
    duration: 2 * 60,
    // What would be the effect of changing this value?
    timeBonus: 0,
    // What would be the effect of changing this value?
    speedIncreaseOnWin: 1,
    coreImages: [
        "assets/matchingGame/whiteSquare64.png",
        "assets/matchingGame/tick.png",
        "assets/matchingGame/cross.png"
    ],
    // This will make every barcode vest in Alistair's collection a scannable
    // barcode! Have a go at playing the game like this, then try using the
    // commented-out variables below. What do you notice?
    barcodeGroups: {
        allBarcodes: {
            bgColour: 0x666666,
            barcodes: ['r0','r1','r2','r3','r4','r5','r6','r7','r8','r9',
                       'g0','g1','g2','g3','g4','g5','g6','g7','g8','g9',
                       'b0','b1','b2','b3','b4','b5','b6','b7','b8','b9'],
        },
    },
    matchesForWin: 10,
    /*
    barcodeGroups: {
        red: {
            bgColour: 0xFF4444,
            barcodes: ['r0','r1','r2','r3','r4','r5','r6','r7','r8','r9'],
        },
        green: {
            bgColour: 0x44FF44,
            barcodes: ['g0','g1','g2','g3','g4','g5','g6','g7','g8','g9'],
        },
        blue: {
            bgColour: 0x4444FF,
            barcodes: ['b0','b1','b2','b3','b4','b5','b6','b7','b8','b9'],
        },
    },
    matchesForWin: 3,
    */
    // Is this something you could change too?
    barcodeImageSets: {pokemon: generatePokemonImagePaths()},
}

// These player stats will be used every time the player starts a new game
const DEFAULT_PLAYER_STATS = {
    remainingTime: MATCHING_GAME_CONFIG.duration,
    matchesFound: 0,
    roundIndex: 0,
    matchesThisRound: 0,
}

function generatePokemonImagePaths() {
    const tempArray = [];
    for (let row = 1; row <= 13; row++) {
        for (let col = 1; col <= 12; col++) {
            if (row == 13 && col > 7) {
                continue;
            }
            tempArray.push("assets/pokemon/row-" + row + "-col-" + col + ".png");
        }
    }
    return tempArray;
}

function preload() {
    // Keep track of every loaded image ID
    this.loadedImages = [];

    for (const imagePath of MATCHING_GAME_CONFIG.coreImages) {
        const imageHandle = getImageIdFromPath(imagePath);
        this.load.image(imageHandle, imagePath);
        this.loadedImages.push(imageHandle);
    }

    // Keep track of every image that a barcode could spawn
    this.loadedBarcodeImages = {};

    // Load all the images that can be summoned by barcodes
    const imageSetKeys = Object.keys(MATCHING_GAME_CONFIG.barcodeImageSets);
    for (setKey of imageSetKeys) {
        const imagePaths = MATCHING_GAME_CONFIG.barcodeImageSets[setKey];
        this.loadedBarcodeImages[setKey] = [];
        for (const imagePath of imagePaths) {
            const imageHandle = getImageIdFromPath(imagePath);
            this.load.image(imageHandle, imagePath);
            this.loadedImages.push(imageHandle);
            this.loadedBarcodeImages[setKey].push(imageHandle);
        }
    }

    // Load the sound effects
    this.load.audio('siren', 'assets/sound/siren.mp3');
    this.load.audio('klaxon', 'assets/sound/klaxon.mp3');
    this.load.audio('triangle', 'assets/sound/triangle ting.mp3');
    this.load.audio('buzzer', 'assets/sound/buzzer.mp3');
}

/*
    Converts an image path to a short string to access it by. For example
    "path/to/foler/file_name.png" --> "file_name"
 */
function getImageIdFromPath(imagePath) {
    const filePathAsArray = imagePath.split('/');
    const imageFileName = filePathAsArray[filePathAsArray.length - 1];
    const imageHandle = imageFileName.split('.')[0];
    return imageHandle
}

/*
    Called by Phaser to initialise the game after preload
 */
function create() {
    // Add the sounds into an object and make it accessible
    this.loadedSounds = {};

    // load the sounds
    this.loadedSounds.siren = this.sound.add('siren');
    this.loadedSounds.klaxon = this.sound.add('klaxon');
    this.loadedSounds.triangle = this.sound.add('triangle');
    this.loadedSounds.buzzer = this.sound.add('buzzer');

    // Create the initial play data, as if starting a fresh game
    createPlayerData.call(this);
    resetGame.call(this);
    beginNextRound.call(this);

    // Generate the sprites that show player progress
    generateHUD.call(this);

    this.cameras.main.setBounds(0, 0, 800, 600);
    this.cameras.main.setBackgroundColor(getCurrentGroupData.call(this).bgColour);

    // Start it in the "Game over" state
    showGameOver.call(this);

    // Using bind, we ensure that "this" refers to GAME.scene
    document.addEventListener("barcodeRead", onBarcodeRead.bind(this));
}

function generateHUD() {
    // Add the sprite for the time ticking down
    this.timerSprite = this.physics.add.sprite(0, 0, 'whiteSquare64');
    this.timerSprite.displayHeight = PHASER_CONFIG.height * 0.05;
    this.timerSprite.setOrigin(0, 0);

    // Add the text for current round and current score
    this.roundIndexText = this.add.text(0,PHASER_CONFIG.height * 0.05, "Round: ");
    this.scoreText = this.add.text(0, PHASER_CONFIG.height * 0.05 + this.roundIndexText.displayHeight, "Score: ");

    // Add the text for game over
    this.gameOverText = this.add.text(PHASER_CONFIG.width * 0.5, PHASER_CONFIG.height * 0.5, "Game Over\nScan a barcode to start");
    fadeInSprite(this.gameOverText, 0.3, 1);

    // Add the ticks at the bottom of the screen to show progress in this round
    this.foundTicks = [];
    for (let i = 0; i < MATCHING_GAME_CONFIG.matchesForWin; i++) {
        const foundTick = this.physics.add.sprite(50 * i, PHASER_CONFIG.height, 'tick');
        foundTick.setOrigin(0, 1);
        foundTick.displayWidth = foundTick.displayHeight = 50;
        foundTick.tint = 0;
        this.foundTicks.push(foundTick);
    }
}

/*
    Plays a sound effect for the given ID string
 */
function playSound(soundId) {
    if (this.loadedSounds[soundId]) {
        this.loadedSounds[soundId].play();
    }
}

function createPlayerData() {
    this.playerData = Object.assign({}, DEFAULT_PLAYER_STATS);
}

/*
    Chooses a group of barcodes to use. If there is more than one group of
    barcodes avaulable, it will make sure it doesn't use the same group twice
    in a row
 */
function chooseRandomGroup() {
    const allGroups = Object.keys(MATCHING_GAME_CONFIG.barcodeGroups);

    if (!this.currentGroupId || allGroups.length === 1) {
        this.currentGroupId = randomElementFromArray(allGroups);
    } else {
        const lastGroupId = this.currentGroupId;
        while (lastGroupId === this.currentGroupId) {
            this.currentGroupId = randomElementFromArray(allGroups);
        }
    }
}

/*
    Randomly assigns each active barcode to an image, so that each image is
    mapped to two different barcodes
 */
function chooseBarcodeMappings() {
    this.imagePerBarcode = {};

    const currentGroup = getCurrentGroupData.call(this);

    const imageSetId = randomElementFromArray(Object.keys(this.loadedBarcodeImages));
    const imageSet = this.loadedBarcodeImages[imageSetId];

    const randomBarcodeOrder = shuffledArray(currentGroup.barcodes);
    const randomPictureOrder = shuffledArray(imageSet);

    for (let index = 0; index < randomBarcodeOrder.length; index++) {
        const barcodeId = randomBarcodeOrder[index];
        const pictureId = randomPictureOrder[Math.floor(index / 2)];
        this.imagePerBarcode[barcodeId] = pictureId;
    }

    return this.imagePerBarcode;
}

/*
    Called when a game is started. Resets data to match a new active game.
 */
function startGame() {
    this.gameOver = false;
    fadeOutSprite(this.gameOverText, 0.3, 0, 1, false);
    beginNextRound.call(this);
    createPlayerData.call(this);
}

function resetGame() {
    this.timeoutMultiplyer = 1;
}

/*
    Show the game over screen and raise the gameOver flag to prevent players
    from continuing
 */
function showGameOver() {
    this.gameOver = true;
    this.gameOverTime = 0;
    this.cameras.main.setBackgroundColor(0x444444);
    fadeInSprite(this.gameOverText, 0.3, 1);
    dismissRevealedImages.call(this);
}

/*
    Show the game over screen and raise the gameOver flag to prevent players
    from continuing
 */
function resetRound() {
    this.barcodesShowing = {left: null, right: null};
    this.foundImages = [];
    this.foundBarcodes = [];
    this.playerData.matchesThisRound = 0;
}

/*
    Get the settings that correspond to the group of barcodes currently being
    used. Settings are of the form { bgColour: [integer], barcodes: [Array]}
 */
function getCurrentGroupData() {
    return MATCHING_GAME_CONFIG.barcodeGroups[this.currentGroupId];
}

/*
    Called once per frame
 */
function update(time, delta) {
    if (this.gameOver) {
        // If the game is over, increase a timer so we can tell when it is okay
        // to let the player restart
        this.gameOverTime += delta * 0.001;
    } else {
        // Otherwise, the game is active. Make the play timer run out
        this.playerData.remainingTime -= delta * 0.001 * this.timeoutMultiplyer;
        // Make the timer bar match the time remaining
        this.timerSprite.displayWidth = PHASER_CONFIG.width * (this.playerData.remainingTime / MATCHING_GAME_CONFIG.duration);

        // Show the player's current score
        this.roundIndexText.text = "Round " + (this.playerData.roundIndex + 1);
        this.scoreText.text = "Score: " + this.playerData.matchesFound;

        // Show how many matches the player has found in this group
        for (let i = 0; i < this.foundTicks.length; i++) {
            if (this.playerData.matchesThisRound > i) {
                this.foundTicks[i].tint = 0xFFFFFF;
            } else {
                this.foundTicks[i].tint = 0x000000;
            }
        }

        // Check to see if time has run out
        if (this.playerData.remainingTime <= 0) {
            this.playerData.remainingTime = 0;
            showGameOver.call(this);
        }
    }
}

/*
    Callback fired when a barcode has been read

    Using "bind" during inisialisation, we ensure that "this" refers to GAME.scene
 */
function onBarcodeRead(event) {
    console.log("Read barcode: ", event.detail.barcode);

    if (this.gameOver) {
        // If the game is over, check to see if the game should be restarted
        if (this.gameOverTime > 1.5) {
            this.gameOver = false;
            startGame.call(this);
        }
    } else {
        // Otherwise, show the picture that corresponds to this barcode
        showPictureForBarcode.call(this, event.detail.barcode);
    }
}

/*
    Displays the picture associated with this barcode if possible.
    Checks to see if this corresponds to a matching pair.
 */
function showPictureForBarcode(barcode) {
    // If we have already matched this barcode, show its image as a ghost in
    // the empty space
    if (this.foundBarcodes.indexOf(barcode) !== -1) {
        if (!this.barcodesShowing.left) {
            const ghostImage = this.physics.add.sprite(PHASER_CONFIG.width * 0.25, PHASER_CONFIG.height * 0.4, this.imagePerBarcode[barcode]);
            scaleImageToDimensions(ghostImage, PHASER_CONFIG.width * 0.4, PHASER_CONFIG.height * 0.5);
            ghostImage.alpha = 0.5;
            fadeOutSprite(ghostImage, 0.5, 0.3, 0.5);
        } else {
            const ghostImage = this.physics.add.sprite(PHASER_CONFIG.width * 0.75, PHASER_CONFIG.height * 0.4, this.imagePerBarcode[barcode]);
            scaleImageToDimensions(ghostImage, PHASER_CONFIG.width * 0.4, PHASER_CONFIG.height * 0.5);
            ghostImage.alpha = 0.5;
            fadeOutSprite(ghostImage, 0.5, 0.3, 0.5);
        }

        console.log("Already found barcode: ", barcode);
        return;
    }

    // If this barcode is not in our current barcode group, ignore it
    if (!this.imagePerBarcode[barcode]) {
        console.log("Barcode is not in the current set: ", barcode);
        return;
    }

    // If this barcode is already on display, ignore it
    if (barcode === this.barcodesShowing.left) {
        console.log("Barcode is already being shown: ", barcode);
        return;
    }

    // Otherwise, show this image on the left if there is no image on the left,
    // and on the right if there is one
    if (!this.barcodesShowing.left) {
        this.barcodesShowing.left = barcode;
        this.leftImage = this.physics.add.sprite(PHASER_CONFIG.width * 0.25, PHASER_CONFIG.height * 0.4, this.imagePerBarcode[barcode]);
        scaleImageToDimensions(this.leftImage, PHASER_CONFIG.width * 0.4, PHASER_CONFIG.height * 0.5);
    } else {
        this.barcodesShowing.right = barcode;
        this.rightImage = this.physics.add.sprite(PHASER_CONFIG.width * 0.75, PHASER_CONFIG.height * 0.4, this.imagePerBarcode[barcode]);
        scaleImageToDimensions(this.rightImage, PHASER_CONFIG.width * 0.4, PHASER_CONFIG.height * 0.5);
    }

    // Check to see if we have found a matching pair
    if (this.barcodesShowing.left && this.barcodesShowing.right) {
        const leftImage = this.imagePerBarcode[this.barcodesShowing.left];
        const rightImage = this.imagePerBarcode[this.barcodesShowing.right];
        if (leftImage === rightImage) {
            // The two images are the same! Give the player a point!
            registerBarcodePair.call(this, this.barcodesShowing.left, this.barcodesShowing.right);
            // Then reset the images
            dismissRevealedImages.call(this);
            showTick.call(this);
            // And play a sound to indicate success!
            playSound.call(this, "triangle");
        } else {
            // They are different! Let the player continue
            dismissRevealedImages.call(this);
            showCross.call(this);
            // And play a sound to indicate failure!
            playSound.call(this, "klaxon");
        }
    }
}

/*
    Called when the player has found two matching barcodes. Tracks that this
    pair has been matched and adds to the player's score
 */
function registerBarcodePair(barcodeA, barcodeB) {
    this.foundBarcodes.push(barcodeA);
    this.foundBarcodes.push(barcodeB);

    this.playerData.matchesFound ++;
    this.playerData.matchesThisRound ++;
    // Check to see if the player has done enough to advance to a new round
    if (this.playerData.matchesThisRound >= MATCHING_GAME_CONFIG.matchesForWin) {
        this.playerData.roundIndex ++;
        // Make the timer time out faster
        this.timeoutMultiplyer *= MATCHING_GAME_CONFIG.speedIncreaseOnWin;

        // Give the player a time bonus, without giving them more than the
        // maximum time
        this.remainingTime += MATCHING_GAME_CONFIG.timeBonus;
        if (this.remainingTime > MATCHING_GAME_CONFIG.duration) {
            this.remainingTime = MATCHING_GAME_CONFIG.duration;
        }

        // Start a new round
        beginNextRound.call(this);
    }
}

function beginNextRound() {
    resetRound.call(this);
    chooseRandomGroup.call(this);
    chooseBarcodeMappings.call(this);
    this.cameras.main.setBackgroundColor(getCurrentGroupData.call(this).bgColour);

    // And play a sound to indicate a new start!
    playSound.call(this, "siren");
}

/*
    Called when the player finds a matching pair. Shows a big green tick
 */
function showTick() {
    const tickLeft = this.physics.add.sprite(PHASER_CONFIG.width * 0.5, PHASER_CONFIG.height * 0.75, 'tick');
    scaleImageToDimensions(tickLeft, PHASER_CONFIG.width * 0.3, PHASER_CONFIG.height * 0.3);
    fadeInSprite(tickLeft, 0.1, 0);
    fadeOutSprite(tickLeft, 0.3, 0.7);
}

/*
    Called when the player's pair does not match. Shows a big red cross
 */
function showCross() {
    const crossLeft = this.physics.add.sprite(PHASER_CONFIG.width * 0.5, PHASER_CONFIG.height * 0.75, 'cross');
    scaleImageToDimensions(crossLeft, PHASER_CONFIG.width * 0.3, PHASER_CONFIG.height * 0.3);
    fadeInSprite(crossLeft, 0.3, 0);
    fadeOutSprite(crossLeft, 0.3, 1.15);
}

/*
    Called when the player has found a pair. Causes the two current images to
    fade out, and frees up the points so the player can check new barcodes
 */
function dismissRevealedImages() {
    if (this.leftImage) {
        fadeOutSprite.call(this, this.leftImage, 0.3, 0.85);
    }
    if (this.rightImage) {
        fadeOutSprite.call(this, this.rightImage, 0.3, 1);
    }
    this.leftImage = null;
    this.rightImage = null;

    this.barcodesShowing = {left: null, right: null};
}

/*
    Calling this will cause a sprite to fade in over time
 */
function fadeOutSprite(sprite, duration = 1, delay = 0, maxAlpha = 1, shouldDestroy = true) {
    const totalSteps = 100;
    let stepsTaken = 0;
    const alphaPerStep = maxAlpha / totalSteps;
    const stepDuration = duration / totalSteps;

    const performFadeOutStep = () => {
        sprite.alpha -= alphaPerStep;
        stepsTaken ++;
        if (stepsTaken > totalSteps) {
            if (shouldDestroy) {
                sprite.destroy();
            }
        } else {
            setTimeout(performFadeOutStep, stepDuration * 1000);
        }
    };

    setTimeout(performFadeOutStep, delay * 1000)
}

/*
    Calling this will cause a sprite to fade out over time
 */
function fadeInSprite(sprite, duration = 1, delay = 0, maxAlpha = 1) {
    sprite.alpha = 0;

    const totalSteps = 100;
    let stepsTaken = 0;
    const alphaPerStep = maxAlpha / totalSteps;
    const stepDuration = duration / totalSteps;

    const performFadeInStep = () => {
        sprite.alpha += alphaPerStep;
        stepsTaken ++;
        if (stepsTaken > totalSteps) {
            sprite.alpha = maxAlpha;
        } else {
            setTimeout(performFadeInStep, stepDuration * 1000);
        }
    };

    setTimeout(performFadeInStep, delay * 1000)
}

/*
    Scales an image to fit inside given dimensions while maintaining its proportions
 */
function scaleImageToDimensions(image, width, height) {
    image.displayWidth = width;
    image.displayHeight = image.displayWidth * (image.height / image.width);

    if (image.displayHeight > height) {
        image.displayHeight = height;
        image.displayWidth = image.displayHeight * (image.width / image.height);
    }
}

function randomElementFromArray(array) {
    return array[Math.floor(Math.random()*array.length)];
}

function randomInteger(min, max) {
    return min + Math.floor(Math.random()*(max - min));
}

/*
    Returns a copy of the array with the elements in a random order
 */
function shuffledArray(array) {
    const srcArray = array.slice();
    const destArray = [];
    while (srcArray.length > 0) {
        const index = randomInteger(0, srcArray.length);
        destArray.push(srcArray[index]);
        srcArray.splice(index, 1);
    }
    return destArray;
}
