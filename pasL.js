

// an interlayer between touch devices and a mouse.
const winHasMouse       = ('onmousedown'         in window);
const winHasMultiTouch  = ('ontouchstart'        in window);
const winHasPointer     = ('onpointerdown'       in window);
const winHasOrientation = ('onorientationchange' in window);

class PointTracker {

	constructor(opts = {}) {

		const { elem = null, bubbles = true } = opts;

		this.bubbles = bubbles;
		//this.debug = false;

		if (elem instanceof Element) {
			if (winHasMultiTouch) {
				this.trackMultiPoints(elem);
			} else {
				this.trackPoint(elem);
			}
		}
	}

	/** fired if 1 or more points still active on element
	 * * 0: @Array  - list of points positions
	 * * 1: @Object - user (for pass params between other methods)
	 * * 2: @Event  - event
	*/
	_emitActive() {}

	/** fired if points change his position
	 * * 0: @Array  - list of points offsets
	 * * 1: @Object - user (for pass params between other methods)
	 * * 2: @Event  - event
	*/
	_emitChange() {}

	/** fired if all points removed or canceled
	 * * 0: @Array  - list of last points positions
	 * * 1: @Object - user (finish)
	 * * 2: @Event  - event
	*/
	_emitRelease() {}

	trackPoint(elem, use_p = true) {

		const type = use_p && winHasPointer ? 'pointer' : 'mouse';

		const onStart = s => {

			const { bubbles } = this;

			if (s.button !== 0)
				return;
			if (!bubbles)
				s.stopPropagation();
			s.preventDefault();

			const init = Object.create(null),
			       usr = new Object;
			init.el    = s.target;
			init.x     = s.clientX;
			init.y     = s.clientY;
			this._emitActive([init], usr, s);

			const onMove = m => {
				let mov  = Object.create(null);
				mov.el   = m.target;
				mov.x    = m.clientX - init.x;
				mov.y    = m.clientY - init.y;
				m.preventDefault();
				this._emitChange([mov], usr, m);
			}, onEnd = e => {
				let end  = Object.create(null);
				end.el   = e.target;
				end.x    = e.clientX;
				end.y    = e.clientY;
				window.removeEventListener(`${type}move`, onMove);
				window.removeEventListener(`${type}up`, onEnd);
				this._emitRelease([end], usr, e);
			};
			window.addEventListener(`${type}move`, onMove);
			window.addEventListener(`${type}up`, onEnd);
		}
		elem.addEventListener(`${type}down`, onStart);
	}

	trackMultiPoints(elem) {

		let init = null, usr = null;

		const onTouch = e => {

			if (!this.bubbles)
				e.stopPropagation();
			//if (this.debug)
			//	this._emitDebug(e);

			const c = e.type.charAt('touch'.length),
			    len = e.touches.length,
			  touch = len ?  e.touches : e.changedTouches,
			   pcnt = len || e.changedTouches.length,
			 points = new Array(pcnt);

			for (let i = 0; i < pcnt; i++) {
				let p = (points[i] = Object.create(null));
				   p.el = touch[i].target;
				   p.x  = touch[i].clientX;
				   p.y  = touch[i].clientY;
			}
			switch(c) {
			case 'm': // ~ move
				for (let i = 0; i < len; i++) {
					points[i].x -= init[i].x;
					points[i].y -= init[i].y;
				}
				this._emitChange(points, usr, e);
				break;
			case 's': // ~ start
				e.preventDefault();
				if (usr === null)
					usr = new Object;
			case 'e': // ~ end
				if (len) {
					// user switch fingers
					this._emitActive((init = points), usr, e);
					break;
				}
			default: // ~ cancel
				let end = usr; init = usr = null;
				this._emitRelease(points, end, e);
			}
		}
		elem.addEventListener('touchstart' , onTouch);
		elem.addEventListener('touchmove'  , onTouch);
		elem.addEventListener('touchend'   , onTouch);
		elem.addEventListener('touchcancel', onTouch);
	}

	/*_emitDebug(e) {
		const el = document.getElementById('myDebug') || document.body.appendChild(
			_setup('span', { id: 'myDebug', style:
			'color: black; right: 0; top: 0; position: fixed; background: white; z-index: 9999;'
		}));
		let text = '', label = e.type.replace(/touch|pointer|mouse/, '');
		for (let o of (e.touches || []))
			text += '\nt_x:'+ o.clientX+'\nt_y:'+ o.clientY;
		for (let o of (e.changedTouches || []))
			text += '\nc_x:'+ o.clientX+'\nc_y:'+ o.clientY;
		el.textContent = label +'\n'+ text;
	}*/
}

class PasL extends PointTracker {

	/** 
	 * **lock**: `true | 0x2` locked aspect of selection block.
	 * * second bit flag render clickable button for lock/unlock
	 * 
	 * **edgies**: `true` add active flat edges.
	 */
	constructor(opts = {}) {

		const { lock = false, edgies = false } = opts;

		const _Box = _setup('div', { class: 'pasL-box', style: 'position: absolute;'}),
		   _Select = _setup('div', { class: 'pasL-select' }),
		   _Top    = _setup('div', { class: 'pasL-row pasL-dark' }),
		   _Right  = _setup('div', { class: 'pasL-col pasL-dark' }),
		   _Left   = _setup('div', { class: 'pasL-col pasL-dark' }),
		   _Bottom = _setup('div', { class: 'pasL-row pasL-dark' }),
		   _Center = _setup('div', { class: 'pasL-col' });

		let _x1 = 0, _y1 = 0, _w = 0, _h = 0, _x2 = 0, _y2 = 0;
		let _zw = 0, _zh = 0, locked = {};

		super({ elem: _Select });

		// the select "box" contains:
		// three vertical blocks (left and right is darked, central - transparent)
		_Box.append( _Left, _Center, _Right );
		// center vertical block contains three horisontal blocks (top and botom is darked, central - transparent)
		_Center.append( _Top , _Select, _Bottom );
		// center horisontal block (selection block) has four absolute position corners
		_Select.append(
			_setup('div', { class: 'pasL-rcons l-t' }),
			_setup('div', { class: 'pasL-rcons r-t' }),
			_setup('div', { class: 'pasL-rcons l-b' }),
			_setup('div', { class: 'pasL-rcons r-b' })
		);
		if (edgies) { // and optional for active edges
			_Select.prepend(
				_setup('div', { class: 'pasL-rcons c-l' }),
				_setup('div', { class: 'pasL-rcons c-t' }),
				_setup('div', { class: 'pasL-rcons c-r' }),
				_setup('div', { class: 'pasL-rcons c-b' })
			);
		}
		if (lock & 0x2) {
			const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
			     path = document.createElementNS('http://www.w3.org/2000/svg', 'path'),
			     rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');

			svg.append(
				_setup(path, { d: 'M 15,20.5 C 15,20.5 13,7 22,7 31,7 29,20.5 29,20.5', fill: 'none', 'stroke-width': 3 }),
				_setup(rect, { width:25, height:16, x:9.5, y:20, rx:1.5, ry:8 })
			);
			_Select.append(
				_setup(svg, { class: 'pasL-lock'+ (lock & 0x1 ? ' locked' : ''), viewBox: '0 0 43 43' }, {
					click: e => {
						e.stopPropagation();
						svg.classList.toggle('locked');
					}
				})
			);
			locked.get = () => svg.classList.contains('locked');
			locked.set =  y => svg.classList[ y ? 'add' : 'remove' ]('locked');
		} else {
			locked.value = Boolean(lock);
		}
		Object.defineProperties(this, {
			/* public */
			box : { enumerable: true, value: _Box },

			locked,

		   zoneW: { set: i => { _Box   .style.width  = `${_zw = i}px`; }, get: () =>_zw },
		   zoneH: { set: i => { _Box   .style.height = `${_zh = i}px`; }, get: () =>_zh },
		    left: { set: i => { _Left  .style.width  = `${_x1 = i}px`; }, get: () =>_x1 },
		     top: { set: i => { _Top   .style.height = `${_y1 = i}px`; }, get: () =>_y1 },
		   right: { set: i => { _Right .style.width  = `${_x2 = i}px`; }, get: () =>_x2 },
		  bottom: { set: i => { _Bottom.style.height = `${_y2 = i}px`; }, get: () =>_y2 },
		   width: { set: i => { _Select.style.width  = `${ _w = i}px`; }, get: () =>_w  },
		  height: { set: i => { _Select.style.height = `${ _h = i}px`; }, get: () =>_h  }
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
	updZone({ width:cW, height:cH }) {
		let rw = cW / this.zoneW, rh = cH / this.zoneH,

		x = Math.round(rw * this.left), w = Math.round(rw * this.width),
		y = Math.round(rh * this.top),  h = Math.round(rh * this.height);

		this.zoneW = cW, this.zoneH = cH;
		this.left = x, this.width = w, this.right = cW - x - w;
		this.top = y, this.height = h, this.bottom = cH - y - h;
	}
	// this is a general function for apply selection area on the image
	setZone({ width:zW, height:zH }, x = 0, y = 0, w = 0, h = 0) { // x, y, w, h  arguments is optional and set the start selection position

		this.zoneW = zW, this.zoneH = zH;

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

	_emitActive(points, data) {

		const { left, top, width, height, locked } = this;

		let flag = 0x00000000, k = 0, is_init = data.hasOwnProperty('flag');

		for (const point of points) {

			let rex = 0x0, rey = 0x0, cew = 0x0, ceh = 0x0;

			const [ name, type ] = point.el.classList;

			if (name === 'pasL-rcons') {

				const p = type.charAt(0), a = type.charAt(2);

				if (p === 'c') {
					rex = ((locked && a === 't') || a === 'l');
					rey = ((locked && a === 'l') || a === 't');
					cew = ( locked || a === 'l'  || a === 'r');
					ceh = ( locked || a === 't'  || a === 'b');
				} else {
					rex = (p === 'l'), cew = true;
					rey = (a === 't'), ceh = true;
				}
			}
			flag |= (rex << (k + 0)) | (cew << (k + 2)) |
			        (rey << (k + 1)) | (ceh << (k + 3)), k += 4;
		}
		data.t = top, data.h = height, data.lock = locked,
		data.l = left, data.w = width, data.flag = flag;
		if (is_init) {
			this.box.dispatchEvent(
				new CustomEvent(PasL.onStartEvent, { bubbles: true })
			);
		}
	}
	_emitChange(points, data) {

		const { zoneW, zoneH } = this;
		let { t, l, w, h, flag, lock } = data;

		for (let { x, y } of points) {
			const rex = flag & 0x1, cew = flag & 0x4,
			      rey = flag & 0x2, ceh = flag & 0x8;

			flag >>= 4;
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
		}
		this.box.dispatchEvent(
			new CustomEvent(PasL.onChangeEvent, { bubbles: true })
		);
	 }
	_emitRelease() {
		this.box.dispatchEvent(
			new CustomEvent(PasL.onEndEvent, { bubbles: true })
		);
	}
};

PasL.onStartEvent  = 'PasL start';
PasL.onChangeEvent = 'PasL change';
PasL.onEndEvent    = 'PasL end';

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
