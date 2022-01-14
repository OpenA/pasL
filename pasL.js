
class PasL {

	constructor(options = {}) {
		/* "lock"    - is just lock aspect of selected area (selected area proportions). You can change this parameter later
		 * "autoadd" - automatically add select area element with my_pasl.selectZone(img) call. You can change this parameter later
		 * "edgies"  - add active flat edges. This parameter set only only with new object create
		 */
		const { lock = false, autoadd = true, edgies = false } = options;

		const box  = _setup('div', { id: 'pasL_box'        , style: 'position: absolute; z-index: 9999999;'}),
		zoneTop    = _setup('div', { id: 'pasL_zone_top'   , class: 'pasl-row-sect pasl-dark' }),
		zoneRight  = _setup('div', { id: 'pasL_zone_right' , class: 'pasl-col-sect pasl-dark' }),
		zoneLeft   = _setup('div', { id: 'pasL_zone_left'  , class: 'pasl-col-sect pasl-dark' }),
		zoneBottom = _setup('div', { id: 'pasL_zone_bottom', class: 'pasl-row-sect pasl-dark' }),
		zoneSelect = _setup('div', { id: 'pasL_zone_select', class: 'pasl-selection-area'     }),
		zoneCenter = _setup('div', { id: 'pasL_zone_center', class: 'pasl-col-sect'           });

		box.addEventListener('click', e => {
			e.stopPropagation(); // stop any global clicking handlers
			e.preventDefault();
		});
		zoneSelect.addEventListener(_PointHandler.START, this);

		// the select "box" contains:
		// three vertical blocks (left and right is darked, central - transparent)
		box       .append( zoneLeft, zoneCenter, zoneRight  );
		// center vertical block contains three horisontal blocks (top and botom is darked, central - transparent)
		zoneCenter.append( zoneTop , zoneSelect, zoneBottom );
		// center horisontal block (selection block) has four absolute position corners
		zoneSelect.append(
			_setup('div', { class: 'pasl-rcons t-l' }),
			_setup('div', { class: 'pasl-rcons t-r' }),
			_setup('div', { class: 'pasl-rcons b-l' }),
			_setup('div', { class: 'pasl-rcons b-r' })
		);
		if (edgies) { // and optional for active edges
			zoneSelect.append(
				_setup('div', { class: 'pasl-rcons l-c' }),
				_setup('div', { class: 'pasl-rcons t-c' }),
				_setup('div', { class: 'pasl-rcons r-c' }),
				_setup('div', { class: 'pasl-rcons b-c' })
			);
		}

		this.lock    = lock;
		const coords = Object.create(null);

		// this functions change width / height styles above the block groups
		const setPosition = (x, y) => {
			const { w, h, imgW, imgH } = coords;
			if (Number.isFinite(x)) {
				zoneLeft .style.width = `${coords.x1 = (x = imgW < x + w ? imgW - w : x > 0 ? x : 0) }px`;
				zoneRight.style.width = `${coords.x2 = imgW - x - w }px`;
			}
			if (Number.isFinite(y)) {
				zoneTop   .style.height = `${coords.y1 = (y = imgH < y + h ? imgH - h : y > 0 ? y : 0) }px`;
				zoneBottom.style.height = `${coords.y2 = imgH - y - h }px`;
			}
		}
		const setWidth = (w, re = false) => {
			const imgW = coords.imgW;
			let x = re ? coords.x2 : coords.x1; 
			if (Number.isFinite(w)) {
				w = imgW < w + x ? imgW - x : w > 0 ? w : 0,
				x = imgW - x - w;
				if (re) {
					zoneLeft.style.width = `${coords.x1 = x }px`;
				} else {
					zoneRight.style.width = `${coords.x2 = x }px`;
				}
				zoneSelect.style.width = `${coords.w = w }px`;
			}
		}
		const setHeight = (h, re = false) => {
			const imgH = coords.imgH;
			let y = re ? coords.y2 : coords.y1; 
			if (Number.isFinite(h)) {
				h = imgH < h + y ? imgH - y : h > 0 ? h : 0,
				y = imgH - y - h;
				if (re) {
					zoneTop.style.height = `${coords.y1 = y }px`;
				} else {
					zoneBottom.style.height = `${coords.y2 = y }px`;
				}
				zoneSelect.style.height = `${coords.h = h }px`;
			}
		}
		// this is a general function for apply selection area on the image
		const selectZone = (img, x = 0, y = 0, w = 50, h = 50, autoadd = false) => { // x, y, w, h  arguments is optional and set the start selection position
			const imgW = img.width; // it just gets the real and actual width / height of the first argument passed and blindly bounces off of them.
			const imgH = img.height; // you can call this function as much as you like for recalc area params
			coords.realW = img.naturalWidth  || imgW; // if naturalWidth/naturalHeight data not contains in element
			coords.realH = img.naturalHeight || imgH; // the width/height are counted as them

			box.style.width  = `${coords.imgW = imgW }px`;
			box.style.height = `${coords.imgH = imgH }px`;

			//first set the X position of select zone and its width
			zoneSelect.style.width = `${coords.w  = imgW < w + x ? imgW - x : w }px`;
			zoneLeft  .style.width = `${coords.x1 = imgW < x + w ? imgW - w : x }px`;
			zoneRight .style.width = `${coords.x2 = imgW - x - w }px`;

			//second set the Y position of select zone and its height
			zoneSelect.style.height = `${coords.h  = imgH < h + y ? imgH - y : h }px`;
			zoneTop   .style.height = `${coords.y1 = imgH < y + h ? imgH - h : y }px`;
			zoneBottom.style.height = `${coords.y2 = imgH - y - h }px`;

			if (autoadd) { // note: just set this flag to false if you first argument passing is not an element
				img.before(box); // or you can just doing something like:
			} // { width: 500, ..., before: (box) => my_place.append(box) }
		}
		Object.defineProperties(this, {
			/* public */
			box         : { enumerable: true, value: box },
			selectZone  : { enumerable: true, value: selectZone  },
			setPosition : { enumerable: true, value: setPosition },
			setWidth    : { enumerable: true, value: setWidth    },
			setHeight   : { enumerable: true, value: setHeight   },

			/* private */
			_coords     : { value: coords },
		});
	}

	// get real coordinates of selected area
	getCoords() { 
		const { x1, y1, w, h, imgW, imgH, realW, realH } = this._coords,
			wR = realW / imgW,
			hR = realH / imgH;
		return [
			Math.floor(x1 * wR), Math.floor(y1 * hR), // returns real scale [X, Y, W, H] of selection
			Math.floor(w  * wR), Math.floor(h  * hR)  // it can be used in canvas for crop/cut image parts
		]
	}

	handleEvent(e) { // mouse/touch move handler

		const point = _PointHandler.getPos(e);
		if ( !point )
			return;

		e.stopPropagation();
		e.preventDefault();

		const [name,type] = e.target.classList;
		const startX      = point.clientX;
		const startY      = point.clientY;
		const lock        = this.lock;

		const endX = this._coords[name === 'pasl-rcons' ? 'w' : 'x1'];
		const endY = this._coords[name === 'pasl-rcons' ? 'h' : 'y1'];

		const moveFunc = (
			type === 't-l' || type === 'l-c' && lock ? ({ clientX, clientY }) => {
			const rx = startX - clientX + endX;
			const ry = startY - clientY + endY;
			this.setWidth(lock && ry > rx ? ry : rx, true);
			this.setHeight(lock && rx > ry ? rx : ry, true);
			this.box.dispatchEvent(new CustomEvent('PasL sizeChange'));
		} : type === 't-r' || type === 't-c' && lock ? ({ clientX, clientY }) => {
			const x  = clientX - startX + endX;
			const ry = startY - clientY + endY;
			this.setWidth(lock && ry > x ? ry : x);
			this.setHeight(lock && x > ry ? x : ry, true);
			this.box.dispatchEvent(new CustomEvent('PasL sizeChange'));
		} : type === 'b-l' || type === 'b-c' && lock ? ({ clientX, clientY }) => {
			const y  = clientY - startY + endY;
			const rx = startX - clientX + endX;
			this.setWidth(lock && y > rx ? y : rx, true);
			this.setHeight(lock && rx > y ? rx : y);
			this.box.dispatchEvent(new CustomEvent('PasL sizeChange'));
		} : type === 'b-r' || type === 'r-c' && lock ? ({ clientX, clientY }) => {
			const x  = clientX - startX + endX;
			const y  = clientY - startY + endY;
			this.setWidth(lock && y > x ? y : x);
			this.setHeight(lock && x > y ? x : y);
			this.box.dispatchEvent(new CustomEvent('PasL sizeChange'));
		} : type === 'l-c' ? ({ clientX }) => {
			this.setWidth(startX - clientX + endX, true);
			this.box.dispatchEvent(new CustomEvent('PasL sizeChange'));
		} : type === 't-c' ? ({ clientY }) => {
			this.setHeight(startY - clientY + endY, true);
			this.box.dispatchEvent(new CustomEvent('PasL sizeChange'));
		} : type === 'r-c' ? ({ clientX }) => {
			this.setWidth(clientX - startX + endX);
			this.box.dispatchEvent(new CustomEvent('PasL sizeChange'));
		} : type === 'b-c' ? ({ clientY }) => {
			this.setHeight(clientY - startY + endY);
			this.box.dispatchEvent(new CustomEvent('PasL sizeChange'));
		} :/* type = 'm-v' */({ clientX, clientY }) => {
			this.setPosition(clientX - startX + endX, clientY - startY + endY);
			this.box.dispatchEvent(new CustomEvent('PasL posChange'));
		});
		const attach   = mv => {
			moveFunc(_PointHandler.getPos(mv));
		}
		const deattach = () => {
			this.box.dispatchEvent(new CustomEvent('PasL endAction'));
			window.removeEventListener(_PointHandler.MOVE, attach);
			window.removeEventListener(_PointHandler.END, deattach);
		}
		this.box.dispatchEvent(new CustomEvent('PasL startAction'));
		window.addEventListener(_PointHandler.MOVE, attach);
		window.addEventListener(_PointHandler.END, deattach);
	}

	addListener(name, callback) {
		if (typeof callback === 'function' && ['startAction', 'posChange', 'sizeChange', 'endAction'].includes(name))
			this.box.addEventListener(`PasL ${name}`, callback);
	}
	removeListener(name, callback) {
		if (typeof callback === 'function' && ['startAction', 'posChange', 'sizeChange', 'endAction'].includes(name))
			this.box.removeEventListener(`PasL ${name}`, callback);
	}
};

// an interlayer between touch devices and a mouse.
const _PointHandler = 'ontouchstart' in window ? {
	START : 'touchstart',
	MOVE  : 'touchmove' ,
	END   : 'touchend'  ,
	getPos: ({ touches, changedTouches: [o] }) => (touches.length === 1 ? o : null)
		} : {
	START : 'mousedown',
	MOVE  : 'mousemove',
	END   : 'mouseup'  ,
	getPos: o => (o.button === 0 ? o : null)
};

// simple utility for create/change DOM elements
function _setup(el, attrs, events) {
// example 1:
// const el = _setup('span', { class: 'ex-elem', text: 'example' }, { click: () => console.log('hey there') });
	if (!el)
		return '';
// example 2:
//_setup(document.querySelector('.ex-elem'), { text: 'touch me', 'my-own-property': 'ok!', onmouseenter: ({ target }) => console.log(target.getAttribute('my-own-property')) });
	switch (typeof el) {
		case 'string':
			el = document.createElement(el);
		case 'object':
			for (const key in attrs) {
				attrs[key] === undefined ? el.removeAttribute(key) :
				key === 'html' ? el.innerHTML   = attrs[key] :
				key === 'text' ? el.textContent = attrs[key] :
				key in el    && (el[key]        = attrs[key] ) == attrs[key]
							 &&  el[key]       == attrs[key] || el.setAttribute(key, attrs[key]);
			}
			for (const name in events) {
				if (Array.isArray(events[name]))
					events[name].forEach(handler => el.addEventListener(name, handler, false));
				else
					el.addEventListener(name, events[name], false);
			}
	}
	return el;
}
