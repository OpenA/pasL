

// an interlayer between touch devices and a mouse.
const winHasMouse       = ('onmousedown'         in window);
const winHasTouch       = ('ontouchstart'        in window);
const winHasPointer     = ('onpointerdown'       in window);
const winHasOrientation = ('onorientationchange' in window);

class PointTracker {

	constructor(opts = {}) {

		const { elem = null, bubbles = true } = opts;

		this.max_points = 2;
		this.bubbles = bubbles;
		this.debug = false;

		if (elem instanceof Element) {
			if (winHasTouch) {
				this._trackTouch(elem);
			} else {
				this._trackPointer(elem);
			}
		}
	}

	/** fired after 1 or more points active on element
	 * * 0: @Object - global (for pass params between other methods)
	 * * 1: @Event  - event
	*/
	_emitStart() {}

	/** fired if points change his position
	 * * 0: @Object - local
	 * * 2: @Event  - event
	*/
	_emitMove() {}

	/** fired if all points removed or canceled
	 * * 0: @Object - local
	 * * 2: @Event  - event
	*/
	_emitEnd() {}

	_trackPointer(elem) {

		const type = winHasPointer ? 'pointer' : 'mouse';

		const onStart = s => {

			const { bubbles } = this;

			if (s.button !== 0)
				return;
			if (!bubbles)
				s.stopPropagation();
			s.preventDefault();

			const init = {
				el: s.target,
				x: s.clientX,
				y: s.clientY
			};
			this._emitStart(init, s);

			const onMove = m => {
				let mov = Object.assign({}, init);
				 mov.el = m.target;
				 mov.x  = m.clientX - init.x;
				 mov.y  = m.clientY - init.y;
				m.preventDefault();
				this._emitMove(mov, m);
			}, onEnd = e => {
				let end = Object.assign({}, init);
				 end.el = e.target;
				 end.x  = e.clientX - init.x;
				 end.y  = e.clientY - init.y;
				window.removeEventListener(`${type}move`, onMove);
				window.removeEventListener(`${type}up`, onEnd);
				this._emitEnd(end, e);
			};
			window.addEventListener(`${type}move`, onMove);
			window.addEventListener(`${type}up`, onEnd);
		}
		elem.addEventListener(`${type}down`, onStart);
	}

	_trackTouch(elem) {

		let init = null;
		let start_x = 0, start_y = 0;

		const onTouch = e => {

			if (!this.bubbles)
				e.stopPropagation();
			if (this.debug)
				this._emitDebug(e);

			const c  = e.type.charAt('touch'.length),
			   touch = e.touches, len = touch.length,
			   cange = e.changedTouches, cl = cange.length;

			let max_x = 0, max_y = 0;

			for (let {clientX:x, clientY:y} of touch) {
				max_x = max_x < x ? x : max_x;
				max_y = max_y < y ? y : max_y;
			}
			const exp = Object.assign({}, init);
			   exp.el = e.target;

			switch(c) {
			case 'm': // ~ move
				exp.x = max_x - start_x,
				exp.y = max_y - start_y;
				this._emitMove(exp, e);
				break;
			case 's': // ~ start
				e.preventDefault();
				if(!init)
					init = exp;
			case 'e': // ~ end
				if (len) {
					// user switch fingers
					if (c === 's' || len === 1) {
						init.el = e.target;
						init.x = start_x = max_x;
						init.y = start_y = max_y;
						this._emitStart(init, e);
					}
					break;
				}
			default: // ~ cancel
				init = null;
				start_x = start_y = 0;
				this._emitEnd(exp, e);
			}
		}
		elem.addEventListener('touchstart' , onTouch);
		elem.addEventListener('touchmove'  , onTouch);
		elem.addEventListener('touchend'   , onTouch);
		elem.addEventListener('touchcancel', onTouch);
	}

	_emitDebug(e) {
		const el = document.getElementById('myDebug') || document.body.appendChild(
			_setup('span', { id: 'myDebug', style:
			'color: black; right: 0; top: 0; position: fixed; background: white; z-index: 9999;'
		}));
		let text = '', label = e.type.replace(/touch|pointer|mouse/, '');
		for (let o of (e.touches || []))
			text += '\nt_x:'+ o.clientX+'\nt_y:'+ o.clientY;
		for (let o of (e.changedTouches || []))
			text += '\nc_x:'+ o.clientX+'\nc_y:'+ o.clientY;/**/
		el.textContent = label +'\n'+ text;
	}
}

class PasL extends PointTracker {

	/** 
	 * @lock `false` is just lock aspect of *figure* (ex: selection proportions. You can modify this parameter any time).
	 * @figure `0...2` 0: selection, 1: rectanle, 2: circle
	 * @edgies `false` add active flat edges.
	 */
	constructor(opts = {}) {

		const { lock = false, figure = 0, edgies = false } = opts;

		const box = _setup('div', { class: 'pasL-box', style: 'position: absolute;'}),
		    srect = _setup('div', { class: 'pasL-srect' });

		let _x1 = 0, _y1 = 0, _w = 0, _h = 0, _x2 = 0, _y2 = 0;
		let _fc = 'transparent';

		let left = { get: () => _x1 },    top = { get: () => _y1 },
		   right = { get: () => _x2 }, bottom = { get: () => _y2 },
		   width = { get: () => _w  }, height = { get: () => _h  },
		   fill  = { get: () => _fc, set: c => { _fc = c } };

		width.set  = i => { srect.style.width  = `${_w = i}px`; }
		height.set = i => { srect.style.height = `${_h = i}px`; }

		super({ elem: srect });

		if (figure === 0) {
			let _Top    = _setup('div', { class: 'pasL-row-sect pasL-dark' }),
			    _Right  = _setup('div', { class: 'pasL-col-sect pasL-dark' }),
			    _Left   = _setup('div', { class: 'pasL-col-sect pasL-dark' }),
			    _Bottom = _setup('div', { class: 'pasL-row-sect pasL-dark' }),
			    _Center = _setup('div', { class: 'pasL-col-sect' });
			// the select "box" contains:
			// three vertical blocks (left and right is darked, central - transparent)
			box.append( _Left, _Center, _Right );
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
			// if wee use input[type="color"], only hex color codes is supported
			srect.style.backgroundColor = _fc = '#ffffff';
			srect.style.borderRadius = (figure === 2 ? '100%' : null);

			fill  .set = c => { srect.style.backgroundColor = _fc = c; };
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

			left, top, right, bottom, width, height, fill
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

	_emitStart(init) {

		let rex = 0x0, rey = 0x0, cew = 0x0, ceh = 0x0;

		const [ name, type ] = init.el.classList;
		const { left, top, width, height, lock } = this;

		if (name === 'pasL-rcons') {

			const p = type.charAt(0), a = type.charAt(2);

			if (p === 'c') {
				rex = ((lock && a === 't') || a === 'l') << 1;
				rey = ((lock && a === 'l') || a === 't') << 2;
				cew = ( lock || a === 'l'  || a === 'r') << 3;
				ceh = ( lock || a === 't'  || a === 'b') << 4;
			} else {
				rex = (p === 'l') << 1, cew = 0x8;
				rey = (a === 't') << 2, ceh = 0x10;
			}
		}
		init.t = top; init.h = height;
		init.l = left; init.w = width;
		init.f = !!lock | rex | rey | cew | ceh;
		this.box.dispatchEvent( new CustomEvent('PasL startAction') );
	}
	_emitMove({ x, y, t, l, w, h, f }) {

		const { zoneW, zoneH } = this;

		const rex = f & 0x2, cew = f & 0x8,
		      rey = f & 0x4, ceh = f & 0x10,
		     lock = f & 0x1;

		if (cew || ceh) {
			let _1 = rex ? zoneW - l - w : l;
			let _2 = rey ? zoneH - t - h : t;

			w += (rex ? -x : x);
			h += (rey ? -y : y);

			if (lock)
				w = h = (w < h ? h : w);
			 if (cew) {
				this.width = (w = zoneW - _1 < w ? zoneW - _1 : w < 0 ? 0 : w);
				this[rex ? 'left' : 'right'] = zoneW - _1 - w;
			 }
			 if (ceh) {
				this.height = (h = zoneH - _2 < h ? zoneH - _2 : h < 0 ? 0 : h);
				this[rey ? 'top' : 'bottom'] = zoneH - _2 - h;
			 }
		} else {
			l += x, t += y;
			this.left = (l = zoneW - w < l ? zoneW - w : l < 0 ? 0 : l);
			this.top  = (t = zoneH - h < t ? zoneH - h : t < 0 ? 0 : t);
			this.right  = zoneW - l - w;
			this.bottom = zoneH - t - h;
		}
		this.box.dispatchEvent(
			new CustomEvent(`PasL ${cew || ceh ? 'size' : 'pos'}Change`)
		);
	 }
	_emitEnd() {
		this.box.dispatchEvent( new CustomEvent('PasL endAction') );
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

const getPoint2D = ([a,b]) => Math.sqrt(
	(a.clientX - b.clientX) * (a.clientX - b.clientX) +
	(a.clientY - b.clientY) * (a.clientY - b.clientY)
);

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
