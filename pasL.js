
class PasL {

	constructor(options = {}) {
		/* "lock"    - is just lock aspect of selected area (selected area proportions). You can change this parameter later
		 * "figure"  - 0: selection, 1: rectanle, 2: triangle
		 * "edgies"  - add active flat edges. This parameter set only only with new object create
		 */
		const { lock = false, figure = 0, edgies = false } = options;

		const box = _setup('div', { class: 'pasL-box', style: 'position: absolute;'}),
		    srect = _setup('div', { class: 'pasL-srect' });

		let _x1 = 0, _y1 = 0, _w = 0, _h = 0, _x2 = 0, _y2 = 0;

		let left = { get: () => _x1 },    top = { get: () => _y1 },
		   right = { get: () => _x2 }, bottom = { get: () => _y2 },
		   width = { get: () => _w  }, height = { get: () => _h  };

		width.set  = i => { srect.style.width  = `${_w = i}px`; }
		height.set = i => { srect.style.height = `${_h = i}px`; }

		box.addEventListener('click', e => {
			e.stopPropagation(); // stop any global clicking handlers
			e.preventDefault();
		});
		srect.addEventListener(_PointHandler.START, this);

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
			_setup('div', { class: 'pasL-rcons t-l' }),
			_setup('div', { class: 'pasL-rcons t-r' }),
			_setup('div', { class: 'pasL-rcons b-l' }),
			_setup('div', { class: 'pasL-rcons b-r' })
		);
		if (edgies) { // and optional for active edges
			srect.append(
				_setup('div', { class: 'pasL-rcons l-c' }),
				_setup('div', { class: 'pasL-rcons t-c' }),
				_setup('div', { class: 'pasL-rcons r-c' }),
				_setup('div', { class: 'pasL-rcons b-c' })
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

		const point = _PointHandler.getPos(e);
		if ( !point )
			return;

		e.stopPropagation();
		e.preventDefault();

		const [name,type] = e.target.classList;
		const startX      = point.clientX;
		const startY      = point.clientY;
		const lock        = this.lock;

		const endX = name === 'pasL-rcons' ? this.width : this.left;
		const endY = name === 'pasL-rcons' ? this.height : this.top;

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
