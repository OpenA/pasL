
class PasL {

	/* "lock"    - is just lock aspect of selected area (selected area proportions). You can change this parameter later
	 * "figure"  - 0: selection, 1: rectanle, 2: triangle
	 * "edgies"  - add active flat edges. This parameter set only only with new object create
	 */
	constructor({ lock = false, figure = 0, edgies = false }) {

		const box = _setup('div', { class: 'pasL-box', style: 'position: absolute;'}),
		    srect = _setup('div', { class: 'pasL-srect' });

		let _x1 = 0, _y1 = 0, _w = 0, _h = 0, _x2 = 0, _y2 = 0;

		let left = { get: () => _x1 },    top = { get: () => _y1 },
		   right = { get: () => _x2 }, bottom = { get: () => _y2 },
		   width = { get: () => _w  }, height = { get: () => _h  };

		width.set  = i => { srect.style.width  = `${_w = i}px`; }
		height.set = i => { srect.style.height = `${_h = i}px`; }

		srect.addEventListener(onScreen.PointDown, this);

		if (figure === 0) {
			let _Top    = _setup('div', { class: 'pasL-row-sect pasL-dark' }),
			    _Right  = _setup('div', { class: 'pasL-col-sect pasL-dark' }),
			    _Left   = _setup('div', { class: 'pasL-col-sect pasL-dark' }),
			    _Bottom = _setup('div', { class: 'pasL-row-sect pasL-dark' }),
			    _Center = _setup('div', { class: 'pasL-col-sect' });
			// the select "box" contains:
			// three vertical blocks (left and right is darked, central - transparent)
			box    .append( _Left, _Center, _Right );
			// center vertical block contains three horisontal blocks (top and botom is darked, central - transparent)
			_Center.append( _Top , srect, _Bottom );
			// center horisontal block (selection block) has four absolute position corners
			left  .set = i => { _Left  .style.width  = `${_x1 = i}px`; };
			top   .set = i => { _Top   .style.height = `${_y1 = i}px`; };
			right .set = i => { _Right .style.width  = `${_x2 = i}px`; };
			bottom.set = i => { _Bottom.style.height = `${_y2 = i}px`; };
		} else {
			box.append(srect);
			box.style.maxWidth = 0;
			box.style.maxHeight = 0;
			srect.style.backgroundColor = 'white';

			left  .set = i => { srect.style.left = `${_x1 = i}px`; };
			top   .set = i => { srect.style.top  = `${_y1 = i}px`; };
			right .set = i => { `${_x2 = i}px`; };
			bottom.set = i => { `${_y2 = i}px`; };
		}
		srect.append(
			_setup('div', { class: 'pasL-rcons l-t' }),
			_setup('div', { class: 'pasL-rcons r-t' }),
			_setup('div', { class: 'pasL-rcons l-b' }),
			_setup('div', { class: 'pasL-rcons r-b' })
		);
		if (edgies) { // and optional for active edges
			srect.prepend(
				_setup('div', { class: 'pasL-rcons c-l' }),
				_setup('div', { class: 'pasL-rcons c-t' }),
				_setup('div', { class: 'pasL-rcons c-r' }),
				_setup('div', { class: 'pasL-rcons c-b' })
			);
		}
		Object.defineProperties(this, {
			/* public */
			box : { enumerable: true, value: box  },
			lock:  {  writable: true, value: lock },
			zoneW: {  writable: true, value: 0 },
			zoneH: {  writable: true, value: 0 },

			left, top, right, bottom, width, height
		});
	}

	// this functions change width / height styles above the block groups
	setPosition(x, y) {
		const { width, height, zoneW, zoneH } = this;
		if (Number.isFinite(x)) {
			this.left = (x = zoneW < x + width ? zoneW - width : x > 0 ? x : 0),
			this.right = zoneW - x - width;
		}
		if (Number.isFinite(y)) {
			this.top = (y = zoneH < y + height ? zoneH - height : y > 0 ? y : 0),
			this.bottom = zoneH - y - height;
		}
	}
	setWidth(w, re = false) {
		const { left, right, zoneW } = this;
		let x = re ? right : left;
		if (Number.isFinite(w)) {
			this.width = (w = zoneW < w + x ? zoneW - x : w > 0 ? w : 0),
			this[re ? 'left' : 'right'] = zoneW - x - w;
		}
	}
	setHeight(h, re = false) {
		const { top, bottom, zoneH } = this;
		let y = re ? bottom : top; 
		if (Number.isFinite(h)) {
			this.height = (h = zoneH < h + y ? zoneH - y : h > 0 ? h : 0),
			this[re ? 'top' : 'bottom'] = zoneH - y - h;
		}
	}
	// this is a general function for apply selection area on the image
	setZone(zW, zH, x = 0, y = 0, w = 0, h = 0) { // x, y, w, h  arguments is optional and set the start selection position

		this.box.style.width  = `${ this.zoneW = zW }px`;
		this.box.style.height = `${ this.zoneH = zH }px`;

		if (!(w > 0) || !(h > 0)) {
			x = 0, w = zW, y = 0, h = zH;
			if (w > h)
				x = (w - h) * .5, w = h;
			else if (w < h)
				y = (h - w) * .5, h = w;
		} else {
			if (zW < x + w)
				x = zW - w, w = zW - x;
			if (zH < y + h)
				y = zH - h, h = zH - y;
		}
		//first set the X position of select zone and its width
		this.left = x, this.width = w, this.right = zW - x - w;
		//second set the Y position of select zone and its height
		this.top  = y, this.height = h, this.bottom = zH - y - h;
	}

	// get real coordinates of selected area
	getCoords(scale = 1) { 
		const { left, top, width, height } = this;
		return [
			Math.floor(left * scale), Math.floor(top * scale), // returns real scale [X, Y, W, H] of selection
			Math.floor(width * scale), Math.floor(height * scale), // it can be used in canvas for crop/cut image parts
		]
	}

	handleEvent(e) { // mouse/touch move handler

		const start = onScreen.getPoint2D(e);

		if ( !start )
			return;
		e.preventDefault();

		const [name,type] = e.target.classList;
		const { left, top, width, height, zoneW, zoneH, lock } = this;

		if (name === 'pasL-rcons') {

			const p = type.charAt(0), a = type.charAt(2);

			let rX = false, rY = false, sW = true, sH = true;

			if (p === 'c') {
				rX = (lock && a === 't') || a === 'l';
				rY = (lock && a === 'l') || a === 't';
				sW =  lock || a === 'l'  || a === 'r';
				sH =  lock || a === 't'  || a === 'b';
			} else {
				rX = p === 'l', rY = a === 't';
			}
			let x = rX ? this.right : left;
			let y = rY ? this.bottom : top;

			var onMove = e => {

				const mov = onScreen.getPoint2D(e);

				let w = (rX ? start.x - mov.x : mov.x - start.x) + width;
				let h = (rY ? start.y - mov.y : mov.y - start.y) + height;

				if (lock)
					w = h = Math.max(w,h);
				if (sW) {
					this.width = (w = zoneW < w + x ? zoneW - x : w > 0 ? w : 0),
					this[rX ? 'left' : 'right'] = zoneW - x - w;
				}
				if (sH) {
					this.height = (h = zoneH < h + y ? zoneH - y : h > 0 ? h : 0),
					this[rY ? 'top' : 'bottom'] = zoneH - y - h;
				}
				this.box.dispatchEvent( new CustomEvent('PasL sizeChange') );
			}
		} else {
			var onMove = e => {

				let { x, y } = onScreen.getPoint2D(e);

				x = x - start.x + left,
				y = y - start.y + top;

				this.left   = (x = zoneW < x + width  ? zoneW - width  : x > 0 ? x : 0);
				this.top    = (y = zoneH < y + height ? zoneH - height : y > 0 ? y : 0);
				this.right  = zoneW - x - width;
				this.bottom = zoneH - y - height;
				this.box.dispatchEvent( new CustomEvent('PasL posChange') );
			}
		}
		const onEnd = () => {
			this.box.dispatchEvent( new CustomEvent('PasL endAction') );
			window.removeEventListener(onScreen.PointMove, onMove);
			window.removeEventListener(onScreen.PointUP, onEnd);
		}
		this.box.dispatchEvent( new CustomEvent('PasL startAction') );
		window.addEventListener(onScreen.PointMove, onMove);
		window.addEventListener(onScreen.PointUP, onEnd);
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
const onScreen = {
	Change: 'onorientationchange' in window ? 'orientationchange' : 'resize',
	PointDown: 'onpointerdown' in window ? 'pointerdown' : 'mousedown',
	PointMove: 'onpointerdown' in window ? 'pointermove' : 'mousemove',
	PointUP  : 'onpointerdown' in window ? 'pointerup'   : 'mouseup',

	getPoint2D: o => (o.button <= 0 ? {
		x: o.clientX, y: o.clientY
	} : null)
};

if ('ontouchstart' in window) {

	onScreen.PointDown  = 'touchstart';
	onScreen.PointMove  = 'touchmove';
	onScreen.PointUP    = 'touchend';

	onScreen.getPoint2D = ({ touches: [a,b] }) => (a ? {
		x: a.clientX, y: a.clientY, dist: (b ? Math.sqrt(
			(a.clientX - b.clientX) * (a.clientX - b.clientX) +
			(a.clientY - b.clientY) * (a.clientY - b.clientY)
		) : 0)
	} : null);
}

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
