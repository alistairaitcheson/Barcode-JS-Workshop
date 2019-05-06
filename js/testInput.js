let keyInput = '';

/*
    When a barcode is scanned, this will fire an event called 'barcodeRead'

    To get the text that was on the barcode, get event.detail.barcode
    e.g.
        document.addEventListener(
            "barcodeRead",
            event => console.log("I read a barcode!! ", event.detail.barcode)
        );

    To check for barcode events in the browser, input the following into the console:
        monitorEvents(document.body, 'mouse');
*/

document.addEventListener("keydown", function(e) {
    const keyPressed = e.key || String.fromCharCode(e.keyCode);
    if (keyPressed === "Enter") {
        var barcodeReadEvent = new CustomEvent('barcodeRead', {detail: {barcode: keyInput}});
        document.dispatchEvent(barcodeReadEvent);
        keyInput = "";
    } else {
        keyInput += keyPressed;
    }
});


// config
var config = {
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
var game = new Phaser.Game(config);

function preload() {
  this.load.atlas('tank', 'assets/tanks/tanks.png', 'assets/tanks/tanks.json');
}

function create() {
    this.input.on('pointerdown', () => console.log("pointerdown!"), this);
    document.addEventListener("barcodeRead", onBarcodeRead);
}

function update(time, delta) {

}

function onBarcodeRead(event) {
    console.log("I read a barcode!! ", event.detail.barcode);
}
