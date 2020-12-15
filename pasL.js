
class pasL {

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
			_setup('div', { id: 'rcon_t-l', class: 'pasl-rcons' }),
			_setup('div', { id: 'rcon_t-r', class: 'pasl-rcons' }),
			_setup('div', { id: 'rcon_b-l', class: 'pasl-rcons' }),
			_setup('div', { id: 'rcon_b-r', class: 'pasl-rcons' })
		);
		if (edgies) { // and optional for active edges
			zoneSelect.append(
				_setup('div', { id: 'rcon_l-c', class: 'pasl-rcons' }),
				_setup('div', { id: 'rcon_t-c', class: 'pasl-rcons' }),
				_setup('div', { id: 'rcon_r-c', class: 'pasl-rcons' }),
				_setup('div', { id: 'rcon_b-c', class: 'pasl-rcons' })
			);
		}

		this.lock    = lock;
		this.autoadd = autoadd;
		this.box     = box;
		this.coords  = Object.create(null);
		this.zone    = {
			top   : zoneTop   .style,
			right : zoneRight .style,
			left  : zoneLeft  .style,
			bottom: zoneBottom.style,
			select: zoneSelect.style,
			center: zoneCenter.style
		}
		this.onMoveStart  = [];
		this.onMoveChange = [];
		this.onMoveEnd    = [];
	}
	// this setters change width / height styles above the block groups
	get x ( ) { return this.coords.x1 }
	set x (i) {
		const { w, imgW }     =    this.coords;
		this.zone.left .width = `${this.coords.x1 = (i = imgW < i + w ? imgW - w : Math.max(i,0)) }px`;
		this.zone.right.width = `${this.coords.x2 = imgW - i - w }px`;
	}
	get y ( ) { return this.coords.y1 }
	set y (i) {
		const { h, imgH }       =    this.coords;
		this.zone.top   .height = `${this.coords.y1 = (i = imgH < i + h ? imgH - h : Math.max(i,0)) }px`;
		this.zone.bottom.height = `${this.coords.y2 = imgH - i - h }px`;
	}
	get w ( ) { return this.coords.w }
	set w (i) {
		const { x1, imgW }     =    this.coords;
		this.zone.select.width = `${this.coords.w  = (i = imgW < i + x1 ? imgW - x1 : Math.max(i,0)) }px`;
		this.zone.right .width = `${this.coords.x2 = imgW - x1 - i }px`;
	}
	get h ( ) { return this.coords.h }
	set h (i) {
		const { y1, imgH }      =    this.coords;
		this.zone.select.height = `${this.coords.h  = (i = imgH < i + y1 ? imgH - y1 : Math.max(i,0)) }px`;
		this.zone.bottom.height = `${this.coords.y2 = imgH - y1 - i }px`;
	}
	get rw ( ) { return this.coords.w }
	set rw (i) { // "rw" it mean reverse width (expands the select area in the opposite direction)
		const { x2, imgW }     =    this.coords;
		this.zone.select.width = `${this.coords.w  = (i = imgW < i + x2 ? imgW - x2 : Math.max(i,0)) }px`;
		this.zone.left  .width = `${this.coords.x1 = imgW - x2 - i }px`;
	}
	get rh ( ) { return this.coords.h }
	set rh (i) {
		const { y2, imgH }      =    this.coords;
		this.zone.select.height = `${this.coords.h  = (i = imgH < i + y2 ? imgH - y2 : Math.max(i,0)) }px`;
		this.zone.top   .height = `${this.coords.y1 = imgH - y2 - i }px`;
	}
	// get real coordinates of selected area
	getCoords() { 
		const { x1, y1, w, h, imgW, imgH, realW, realH } = this.coords,
			wR = realW / imgW,
			hR = realH / imgH;
		return [
			Math.floor(x1 * wR), Math.floor(y1 * hR), // returns real scale [X, Y, W, H] of selection
			Math.floor(w  * wR), Math.floor(h  * hR)  // it can be used in canvas for crop/cut image parts
		]
	}
	// this is a general function for apply selection area on the image
	selectZone(img, x = 0, y = 0, w = 50, h = 50) { // x, y, w, h  arguments is optional and set the start selection position
		const imgW = img.width; // it just gets the real and actual width / height of the first argument passed and blindly bounces off of them.
		const imgH = img.height; // you can call this function as much as you like for recalc area params
		this.coords.realW = img.naturalWidth  || imgW; // if naturalWidth/naturalHeight data not contains in element
		this.coords.realH = img.naturalHeight || imgH; // the width/height are counted as them

		this.box.style.width  = `${this.coords.imgW = imgW }px`;
		this.box.style.height = `${this.coords.imgH = imgH }px`;

		//first set the X position of select zone and its width
		this.zone.select.width = `${this.coords.w  = imgW < w + x ? imgW - x : w }px`;
		this.zone.left  .width = `${this.coords.x1 = imgW < x + w ? imgW - w : x }px`;
		this.zone.right .width = `${this.coords.x2 = imgW - x - w }px`;

		//second set the Y position of select zone and its height
		this.zone.select.height = `${this.coords.h  = imgH < h + y ? imgH - y : h }px`;
		this.zone.top   .height = `${this.coords.y1 = imgH < y + h ? imgH - h : y }px`;
		this.zone.bottom.height = `${this.coords.y2 = imgH - y - h }px`;

		if (this.autoadd) { // note: just set this flag to false if you first argument passing is not an element
			img.before(this.box); // or you can just doing something like:
		} // { width: 500, ..., before: (box) => my_place.append(box) }
	}

	handleEvent(e) { // mouse/touch move handler

		const point = _PointHandler.getPos(e);
		if ( !point )
			return;

		e.stopPropagation();
		e.preventDefault();

		const [name,type] = e.target.id.split('_');
		const startX      = point.clientX;
		const startY      = point.clientY;
		const lock        = this.lock;

		const endX = this.coords[name === 'rcon' ? 'w' : 'x1'];
		const endY = this.coords[name === 'rcon' ? 'h' : 'y1'];

		const moveFunc = (
			type === 't-l' || type === 'l-c' && lock ? ({ clientX, clientY }) => {
			const rx = startX - clientX + endX;
			const ry = startY - clientY + endY;
			this. rw = lock && ry > rx ? ry : rx;
			this. rh = lock && rx > ry ? rx : ry;
		} : type === 't-r' || type === 't-c' && lock ? ({ clientX, clientY }) => {
			const x  = clientX - startX + endX;
			const ry = startY - clientY + endY;
			this. w  = lock && ry > x ? ry : x;
			this. rh = lock && x > ry ? x : ry;
		} : type === 'b-l' || type === 'b-c' && lock ? ({ clientX, clientY }) => {
			const y  = clientY - startY + endY;
			const rx = startX - clientX + endX;
			this. rw = lock && y > rx ? y : rx;
			this. h  = lock && rx > y ? rx : y;
		} : type === 'b-r' || type === 'r-c' && lock ? ({ clientX, clientY }) => {
			const x  = clientX - startX + endX;
			const y  = clientY - startY + endY;
			this. w  = lock && y > x ? y : x;
			this. h  = lock && x > y ? x : y;
		} : type === 'l-c' ? ({ clientX }) => {
			this. rw = startX - clientX + endX;
		} : type === 't-c' ? ({ clientY }) => {
			this. rh = startY - clientY + endY;
		} : type === 'r-c' ? ({ clientX }) => {
			this. w  = clientX - startX + endX;
		} : type === 'b-c' ? ({ clientY }) => {
			this. h  = clientY - startY + endY;
		} :/* type = 'm-v' */({ clientX, clientY }) => {
			this. x  = clientX - startX + endX;
			this. y  = clientY - startY + endY;
		});
		const attach   = mv => {
			this.onMoveChange.forEach(callback => callback());
			moveFunc(_PointHandler.getPos(mv));
		}
		const deattach = () => {
			this.onMoveEnd.forEach(callback => callback());
			window.removeEventListener(_PointHandler.MOVE, attach);
			window.removeEventListener(_PointHandler.END, deattach);
		}
		this.onMoveStart.forEach(callback => callback());
		window.addEventListener(_PointHandler.MOVE, attach);
		window.addEventListener(_PointHandler.END, deattach);
	}

	addListener(name, callback) {
		let list = this[`on${name}`];
		if (list && typeof callback == 'function' && !list.includes(callback))
			list.push(callback);
	}
	removeListener(name, callback) {
		let list = this[`on${name}`];
		if (list)
			list.splice(1, list.indexOf(callback));
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
