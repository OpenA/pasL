# pasL
#### Simple and fast Javascript library for image area selection

###### how to:
<img width="500" src="https://i.imgur.com/BdGBRo9.jpg" alt="how its look like">

just show source code of this example:
```javascript
/* create the new pasL object with locked aspects, active edgies
  and disabled auto add selection box via calling psl.selectZone(img) */
const psl = new pasL({ lock: true, autoadd: false, edgies: true });

// canvas element on the left bottom on screenshot
const canvas = _setup('canvas', {
  style: 'position: fixed; left: 0; bottom: 0; width: 150px; height: 150px; z-index: 99999; background: black; border: 3px outset;'
});

// left top select button
const select = _setup('button', {
  type: 'button', text: 'select', style: 'position: fixed; left: 0; top: 0; z-index: 99999;'
}, {
  click: () => {
    var img = document.querySelector('.MMImage-Preview');
    if (img) {
      const addSelection = () => {
        let start_x = Math.floor(img.width / 2 - 50)
        let start_y = Math.floor(img.height / 2 - 50)
        // adding the 100x100 selection at center of image
        psl.selectZone(img, start_x, start_y, 100, 100);
      };
      img.addEventListener('load', addSelection); // recalc area if image src changed
      window.addEventListener('resize', addSelection); // recalc area if window size changed

      canvas.ondblclick = () => {
        let [X, Y, W, H] = psl.getCoords(); // returns real values on the selected area of the image
        canvas.width = W, canvas.height = H;
        const contxt = canvas.getContext('2d');
        contxt.drawImage(img, X, Y, W, H, 0, 0, W, H); // just draw it in the canvas
      };
      img.before(psl.box); // manual add selection box
      addSelection();
    }
  }
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => document.body.append(canvas, select));
} else
  document.body.append(canvas, select);
```
*(**note**: to reproduce this example, pasL.js and pasL.css must be inlining in the [page](https://yandex.ru/images))*
