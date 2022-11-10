

// an interlayer between touch devices and a mouse.
const winHasMouse       = ('onmousedown'         in window);
const winHasMultiTouch  = ('ontouchstart'        in window);
const winHasPointer     = ('onpointerdown'       in window);
const winHasOrientation = ('onorientationchange' in window);

class PointTracker {

	constructor(opts = {}) {

		const { elem = null, bubbles = false } = opts;

		this.bubbles = bubbles;

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

	trackPoint(elem, use_p = false) {

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

	distance(p_x, p_y) {
		return Math.sqrt(p_x * p_x + p_y * p_y);
	}
}

const PasL_onStart  = 'PasL start';
const PasL_onChange = 'PasL change';
const PasL_onEnd    = 'PasL end';

class PasL extends PointTracker {

	/** 
	 * **lock**: `true | 0x2` locked aspect of selection block.
	 * * second bit flag render clickable button for lock/unlock
	 * 
	 * **ruler**: `true | 0x2` show selection coordinates and size.
	 * * second bit flag placed ruler in to bottom (default - top)
	 * 
	 * **edgies**: `true` add active flat edges.
	 */
	constructor(opts = {}) {

		const { lock = false, edgies = false, ruler = true } = opts;

		const _Box = _cnode('div', { className: 'pasL-box', style: 'position: absolute;'}),
		   _Select = _cnode('div', { className: 'pasL-select' }),
		   _Top    = _cnode('div', { className: 'pasL-row pasL-dark' }),
		   _Right  = _cnode('div', { className: 'pasL-col pasL-dark' }),
		   _Left   = _cnode('div', { className: 'pasL-col pasL-dark' }),
		   _Bottom = _cnode('div', { className: 'pasL-row pasL-dark' }),
		   _Center = _cnode('div', { className: 'pasL-col' });

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
			_cnode('div', { className: 'pasL-rcons l-t' }),
			_cnode('div', { className: 'pasL-rcons r-t' }),
			_cnode('div', { className: 'pasL-rcons l-b' }),
			_cnode('div', { className: 'pasL-rcons r-b' })
		);
		if (edgies) { // and optional for active edges
			_Select.prepend(
				_cnode('div', { className: 'pasL-rcons c-l' }),
				_cnode('div', { className: 'pasL-rcons c-t' }),
				_cnode('div', { className: 'pasL-rcons c-r' }),
				_cnode('div', { className: 'pasL-rcons c-b' })
			);
		}
		if (ruler) {
			const rul = _cnode('span', { className: 'pasL-ruler pasL-dark' }),
			    onAct = ({ type }) => {
				rul.style.display = type === PasL_onEnd ? 'none' : null;
			}
			_Box.addEventListener(PasL_onEnd, onAct);
			_Box.addEventListener(PasL_onStart, onAct);
			_Box.addEventListener(PasL_onChange, ({ detail: { x,y,w,h } }) => {
				rul.textContent = `x:${x} y:${y} ~ w:${w} h:${h}`;
			});
			Element.prototype.append.call(ruler & 0x2 ? _Bottom : _Top, rul);
		}
		if (lock & 0x2) {
			const lck =_Select.appendChild( makeLocker(lock & 0x1) );

			locked.get = () => lck.classList.contains('locked');
			locked.set =  y => lck.classList[ y ? 'add' : 'remove' ]('locked');
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

		const { left, top, right, bottom, locked } = this;

		let movs = 0x00000000, is_init = !data.hasOwnProperty('movs');

		for (let i = 0, k = 0; i < points.length; i++, k += 4) {

			const [ name, cf ] = points[i].el.classList;

			movs |= (
				name === 'pasL-rcons' ? PasL.parseCMark(cf, locked) : 0xF
			) << k;
		}
		data.sT = top, data.sB = bottom, data.lock = locked,
		data.sL = left, data.sR = right, data.movs = movs;
		is_init && this.box.dispatchEvent(
			new CustomEvent(PasL_onStart, { bubbles: true })
		);
	}
	_emitChange(points, data) {

		const { zoneW, zoneH } = this;
		let { sL, sT, sR, sB, movs, lock } = data,

		 top = sT, bottom = sB, height = zoneH - sT - sB,
		left = sL, right  = sR, width  = zoneW - sL - sR;

		for (let { x, y } of points) {
			const movL = movs & 0x1, movR = movs & 0x4,
			      movT = movs & 0x2, movB = movs & 0x8;

			if (lock && (movs & 0xF) !== 0xF) {
				let w = width + x, h = height + y,
				   re = movR && movT || movB && movL;
				if (height < width) {
					h = Math.floor(w * (height / width));
					y = re ? height - h : h - height;
				} else {
					w = Math.floor(h * (width / height));
					x = re ? width - w : w - width;
				}
			}
			let maxR = zoneW - left,
			    maxL = zoneW - (movR ? width : right),
				maxB = zoneH - top,
			    maxT = zoneH - (movB ? height : bottom);

			let xl = sL + x, yt = sT + y,
			    xr = sR - x, yb = sB - y;

			if (movL) {
				left = xl < 0 ? 0 : xl > maxL ? maxL : xl;
				if (movR)
					right = zoneW - left - width;
			} else if (movR)
				right = xr < 0 ? 0 : xr > maxR ? maxR : xr;

			if (movT) {
				top = yt < 0 ? 0 : yt > maxT ? maxT : yt;
				if (movB)
					bottom = zoneH - top - height;
			} else if (movB)
				bottom = yb < 0 ? 0 : yb > maxB ? maxB : yb;

			width  = zoneW - left - right;
			height = zoneH - top - bottom;
			movs >>= 4;
		}
		Object.assign(this, {
			top, left, right, bottom, width, height
		});
		this.box.dispatchEvent(
			new CustomEvent(PasL_onChange, { bubbles: true, detail: {
				x: top, y: left, w: width, h: height
			}})
		);
	 }
	_emitRelease() {
		this.box.dispatchEvent(
			new CustomEvent(PasL_onEnd, { bubbles: true })
		);
	}
};

const makeLocker = (locked = false) => {
	const svg = new DOMParser().parseFromString(`
<svg class="pasL-lock" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 43 43">
  <path d="M 15,20.5 C 15,20.5 13,7 22,7 31,7 29,20.5 29,20.5" fill="none" stroke-width="3"/>
  <rect width="25" height="16" x="9.5" y="20" rx="1.5" ry="8"/>
</svg>`, 'image/svg+xml').documentElement;
	if (locked)
		svg.classList.add('locked');
	svg.addEventListener(winHasMultiTouch ? 'touchstart' : 'click', e => {
		e.stopPropagation();
		svg.classList.toggle('locked');
	});
	return svg;
}

/** parse the Corner Markers:
 **  `t-l` (Top-Left) => x `0 0 1 1`
 **  `c-r` (Center-Right) => x `0 1 0 0`, etc.
*/
PasL.parseCMark = (cf = '', lock = false) => {

	let ml = false, mt = false, mr = false, mb = false;

	const c = cf.charAt(0), f = cf.charAt(2);

	if (c === 'c') {
		ml = (f === 'l' || (lock && f === 'b'));
		mt = (f === 't' || (lock && f === 'l'));
		mr = (f === 'r' || (lock && f === 't'));
		mb = (f === 'b' || (lock && f === 'r'));
	} else {
		ml = (c === 'l'), mr = (c === 'r');
		mt = (f === 't'), mb = (f === 'b');
	}
	return (ml << 0x0) | (mt << 0x1) | (mr << 0x2) | (mb << 0x3); 
};

/** simple utility for create element with attributes*/
const _cnode = (tag, attrs) => (
	Object.assign(document.createElement(tag), attrs)
);
