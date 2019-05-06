// config
const PHASER_CONFIG = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
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
    duration: 2 * 60,
    timeBonus: 45,
    speedIncreaseOnWin: 1.25,
    matchesForWin: 3,
    coreImages: ["assets/matchingGame/whiteSquare64.png"],
    barcodeImages: generatePokemonImagePaths(),
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
    }
}

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
    this.loadedBarcodeImages = [];

    for (const imagePath of MATCHING_GAME_CONFIG.barcodeImages) {
        const imageHandle = getImageIdFromPath(imagePath);
        try {
            this.load.image(imageHandle, imagePath);
            this.loadedImages.push(imageHandle);
            this.loadedBarcodeImages.push(imageHandle);
        } catch {
            console.log("could not load image: ", imageHandle);
        }
    }
}



function create() {
    this.barcodesShowing = {left: null, right: null};

    chooseRandomGroup.call(this);
    createPlayerData.call(this);

    this.timerSprite = this.physics.add.sprite(0, 0, 'whiteSquare64');

    this.cameras.main.setBounds(0, 0, 800, 600);
    this.cameras.main.setBackgroundColor(getCurrentGroupData.call(this).bgColour);

    // Using bind, we ensure that "this" refers to GAME.scene
    document.addEventListener("barcodeRead", onBarcodeRead.bind(this));
}

function createPlayerData() {
    this.playerData = Object.assign({}, DEFAULT_PLAYER_STATS);
}

function chooseRandomGroup() {
    const allGroups = Object.keys(MATCHING_GAME_CONFIG.barcodeGroups);

    if (!this.currentGroup) {
        this.currentGroupId = randomElementFromArray(allGroups);
    } else {
        let nextGroupId = this.currentGroupId;
        while (nextGroupColour === this.currentGroup.bgColour) {
            this.currentGroupId = randomElementFromArray(allGroups);
        }
    }
}

function getCurrentGroupData() {
    return MATCHING_GAME_CONFIG.barcodeGroups[this.currentGroupId];
}

function update(time, delta) {
    this.playerData.remainingTime -= delta * 0.001;
    this.timerSprite.width = PHASER_CONFIG.width * (this.playerData.remainingTime / MATCHING_GAME_CONFIG.duration);
}

function getImageIdFromPath(imagePath) {
    const filePathAsArray = imagePath.split('/');
    const imageFileName = filePathAsArray[filePathAsArray.length - 1];
    const imageHandle = imageFileName.split('.')[0];
    return imageHandle
}

function onBarcodeRead(event) {
    // Using bind, we ensure that "this" refers to GAME.scene
}

function randomElementFromArray(array) {
    return array[Math.floor(Math.random()*array.length)];
}

function randomInteger(min, max) {
    return min + Math.floor(Math.random()*(max - min));
}

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
