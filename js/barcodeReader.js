
/*
    When a barcode is scanned, this will fire an event called 'barcodeRead'

    To get the text that was on the barcode, get event.detail.barcode
    e.g.
        document.addEventListener(
            "barcodeRead",
            event => console.log("I read a barcode!! ", event.detail.barcode)
        );

    NOTE: Barcode events may be different on different browsers and operating
          systems. So this code may need to be modified!
          To check which events are fired when scanning a barcode, input the
          following into the console:
                monitorEvents(document.body);
*/

// A global buffer used to store the currently-input text until Enter is pressed
let keyInput = '';

/*
    Barcodes being scanned will be interpreted as a series of 'keydown' events
    The last key to be pressed will be "Enter", which tells us we have finished
    reading the barcode.
*/
document.addEventListener("keydown", function(e) {
    // Get the key that was pressed
    const keyPressed = e.key || String.fromCharCode(e.keyCode);

    if (keyPressed === "Enter") {
        // If it was Enter, fire an event to be read by the game
        var barcodeReadEvent = new CustomEvent('barcodeRead', {detail: {barcode: keyInput}});
        document.dispatchEvent(barcodeReadEvent);
        keyInput = "";
    } else {
        // Otherwise, add that key to the string buffer
        keyInput += keyPressed;
    }
});
