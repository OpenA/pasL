
class TowL extends PointTracker {

	constructor() {

		const _Box = _setup('div', { class: 'towL-box', style: 'position: absolute;' }),
		      _Svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		
		_Svg.setAttribute('xmlns' ,'http://www.w3.org/2000/svg');
		_Svg.setAttribute('fill'  , 'white');
		_Svg.setAttribute('stroke', 'black');

		_Box.append(_Svg);

		super({ elem: _Box });

		Object.defineProperties(this, {
			/* public */
			box : { enumerable: true, value: _Box },
			svg : { enumerable: true, value: _Svg },
			_ratio: { writable: true, value: 1 }
		});
	}

	setViewBox(w = 100, h = 100, scale = 1) {
		this.svg.setAttribute('width' , w);
		this.svg.setAttribute('height', h);
		this.svg.setAttribute('viewBox', `0 0 ${w / scale} ${h / scale}`);
		this._ratio = 1 / scale;
	}

	toSource(blob = false) {
		const svgxml = this.svg.outerHTML;
		if (blob)
			return new Blob([svgxml], { type: 'image/svg+xml;charset=utf-8' });
		return svgxml;
	}

	/**
	* @name String `rect | circle | ellipse | path | text | line | path`
	*/
	addFigure(name, params = {
		x: 0, y: 0, w: 50, h: 50,
		svg_attrs: {},
		content: 'Example Text'
	}) {
		const { x = 0, y = 0, w = 50, h = 50, svg_attrs, content } = params;

		const is_line = name === 'line', is_circ = name === 'circle',
		      is_path = name === 'path', is_text = name === 'text',
		     is_elips = name === 'ellipse' || is_circ && w !== h,
		     no_attrs = !(svg_attrs && Object.keys(svg_attrs).length);

		const figure = document.createElementNS('http://www.w3.org/2000/svg', (is_elips ? 'ellipse' : name));
		const attrs  = {};

		if (no_attrs) {
			attrs['stroke-width'] = is_line || is_path ? 3 : 1;
		} else {
			Object.assign(attrs, svg_attrs);
		}
		if (is_elips || is_circ) {
			let rx = w * .5, ry = h * .5;

			attrs.cx = rx + x;
			attrs.cy = ry + y;

			if (is_elips) {
				attrs.rx = rx;
				attrs.ry = ry;
			} else
				attrs.r  = rx;
		} else if (is_path || is_line) {
			let o,sw = attrs['stroke-width'];
			if (!(sw > 0)) {
				o = 1.5, attrs['stroke-width'] = 3;
			} else {
				o = sw * .5;
			}
			if (is_line) {
				attrs.x1 = x, attrs.x2 = x + w;
				attrs.y1 =    attrs.y2 = y + o;
			} else
				attrs.d = `M ${x},${y+o} ${w+x},${y+o}`;
		} else {

			attrs.x = x, attrs.y = y;

			if (is_text) {
				attrs['dominant-baseline'] = 'text-before-edge';
				figure.textContent = content || 'Example Text';
				if (no_attrs) {
					attrs['font-weight'] = 'bold';
					attrs['font-family'] = 'sans-serif';
					attrs['font-size'  ] = 18;
				}
			} else {
				attrs.width  = w;
				attrs.height = h;
			}
		}
		for (let key in attrs)
			figure.setAttribute(key, attrs[key]);

		this.svg.append(figure);
	}

	_emitActive(points, data) {

		const { svg, box, _ratio } = this;

		for (const sel of box.getElementsByClassName('towL-select')) {
			sel.classList.remove('act-v');
		}
		for (let i = 0; i < points.length; i++) {

			let { el } = points[i], sel = null, fl = 0, el_class = el.classList;

			if (el === svg || el === box)
				continue;
			if (el_class[0] === 'towL-select') {
				el = (sel = el)._figure;
			} else if (el_class[0] === 'pasL-rcons') {
				el = (sel = el.parentNode)._figure;
				fl = PasL.parseCF(el_class[1]);
			} else if (el_class[0] === 'towL-point') {
				el = (sel = el.parentNode)._figure;
				fl = el_class[1] === 'e-d' ? 0x10 : el_class[1] === 's-d' ? 0x20 : 0;
			} else if (!(sel = el._sel)) {
				sel = el._sel = TowL.selectable(el.nodeName);
				sel._figure = el;
			}
			data[i] = TowL[el.nodeName](el, _ratio, fl);
			svg.append(el),
			box.appendChild(sel).classList.add('act-v');
		}
	}
	_emitChange(points, data) {
		if (data[0]) {
			data[0].move(points[0]);
		}
	}
}

TowL.circle = TowL.ellipse = (el, sr = 1, fl = 0) => {
	const _X = el.cx.baseVal.value, xR = (el.rx || el.r).baseVal.value,
	      _Y = el.cy.baseVal.value, yR = (el.ry || el.r).baseVal.value;

	const left = (_X - xR) / sr, width  = (xR + xR) / sr, pad = 5,
	      top  = (_Y - yR) / sr, height = (yR + yR) / sr;

	const rex = fl & 0x1, cew = fl & 0x4,
	      rey = fl & 0x2, ceh = fl & 0x8;

	const sel = el._sel.style;

	sel.left = `${left - pad}px`, sel.width  = `${pad + width  + pad}px`;
	sel.top  = `${top  - pad}px`, sel.height = `${pad + height + pad}px`;

	return {
		move: fl ? ({ x, y }) => {

			let rx = rex ? -x : x, w = width  + rx; if (w < 0) w = 0;
			let ry = rey ? -y : y, h = height + ry; if (h < 0) h = 0;

			if (rex) sel.left = `${left + (w ? x : width) - pad}px`;
			if (rey) sel.top  = `${top + (h ? y : height) - pad}px`;
			if (cew) {
				sel.width = `${pad + w + pad}px`;
				el.cx.baseVal.value = _X + (w ? x * sr * .5 : rex ?xR:-xR);
				el.rx.baseVal.value = (w ? xR +rx * sr * .5 : .5);
			}
			if (ceh) {
				sel.height = `${pad + h + pad}px`;
				el.cy.baseVal.value = _Y + (h ? y * sr * .5 : rey ?yR:-yR);
				el.ry.baseVal.value = (h ? yR +ry * sr * .5 : .5);
			}
		} : ({ x, y }) => {
			el.cx.baseVal.value = _X + x * sr; sel.left = `${left + x - pad}px`;
			el.cy.baseVal.value = _Y + y * sr; sel.top  = `${top  + y - pad}px`;
		}
	}
}
TowL.line = (el, r = 1) => {
	const sX1 = el.x1.baseVal.value, sX2 = el.x2.baseVal.value,
	      sY1 = el.y1.baseVal.value, sY2 = el.y2.baseVal.value;
	return {
		move: ({ x, y }) => {
			el.x1.baseVal.value = sX1 + x * r, el.x2.baseVal.value = sX2 + x * r;
			el.y1.baseVal.value = sY1 + y * r, el.y2.baseVal.value = sY2 + y * r;
		}
	}
}
TowL.text = (el, sr = 1) => {
	const _X = el.x.baseVal[0].value, left = _X / sr,
	      _Y = el.y.baseVal[0].value, top  = _Y / sr;

	const { width, height } = el.getBoundingClientRect(), pad = 5, sel = el._sel.style;

	sel.left = `${left - pad}px`, sel.width  = `${pad + width  + pad}px`;
	sel.top  = `${top  - pad}px`, sel.height = `${pad + height + pad}px`;

	return {
		move: ({ x, y }) => {
			el.x.baseVal[0].value = _X + x * sr; sel.left = `${left + x - pad}px`;
			el.y.baseVal[0].value = _Y + y * sr; sel.top  = `${top  + y - pad}px`;
		}
	}
}
TowL.rect = (el, sr = 1, fl = 0) => {
	const _X = el.x.baseVal.value, _W = el.width.baseVal.value,
	      _Y = el.y.baseVal.value, _H = el.height.baseVal.value,
	      _R = el.rx.baseVal.value;

	const left = _X / sr, width  = _W / sr, pad = 5,
	      top  = _Y / sr, height = _H / sr, rdx = _R / sr;

	const rex = fl & 0x1, cew = fl & 0x4, cer = fl & 0x10,
	      rey = fl & 0x2, ceh = fl & 0x8, rot = fl & 0x20;

	const rad = el._sel.children[1].style, sel = el._sel.style;

	sel.left = `${left - pad}px`, sel.width  = `${pad + width  + pad}px`; rad.width  = `${rdx}px`;
	sel.top  = `${top  - pad}px`, sel.height = `${pad + height + pad}px`;

	return {
		move: cer ? ({ x }) => {
			let rx = _R + x * sr;
			el.rx.baseVal.value = rx <= 0 ? 0 : rx;
			rad.width = `${rx <= 0 ? 0 : rdx + x}px`;
		} : rot ? ({ x, y }) => {
			var cx = _X+_W*.5, cy = _Y+_H*.5;
			let r  = Math.atan2(x, y) * (180 / Math.PI) * -1 - 90;
			el.setAttribute('transform', `rotate(${r}, ${cx}, ${cy})`);
			sel.transform = `rotate(${r}deg)`;
		} : fl ? ({ x, y }) => {

			let rx = rex ? -x : x, w = width  + rx; if (w < 0) w = 0;
			let ry = rey ? -y : y, h = height + ry; if (h < 0) h = 0;

			if (rex) el.x.baseVal.value = _X + (w ?  x * sr : _W), sel.left = `${left + (w ? x : width ) - pad}px`;
			if (rey) el.y.baseVal.value = _Y + (h ?  y * sr : _H), sel.top  = `${top  + (h ? y : height) - pad}px`;
			if (cew) el.width.baseVal.value  = (w ? rx * sr + _W : 1), sel.width  = `${pad + w + pad}px`;
			if (ceh) el.height.baseVal.value = (h ? ry * sr + _H : 1), sel.height = `${pad + h + pad}px`;
		} : ({ x, y }) => {
			el.x.baseVal.value = _X + x * sr; sel.left = `${left + x - pad}px`;
			el.y.baseVal.value = _Y + y * sr; sel.top  = `${top  + y - pad}px`;
		}
	}
}

TowL.selectable = (type) => {
	const sel = _setup('div', { class: 'towL-select towL-'+ type, style: 'position: absolute;' });

	if (type === 'text') {
	
	}
	if (type === 'rect' || type === 'line') {
		sel.append(
			_setup('div', { class: 'towL-point s-d' }),
			_setup('div', { class: 'towL-point e-d' })
		);
	}
	if (type === 'rect' || type === 'ellipse' || type === 'circle') {
		sel.append(
			_setup('div', { class: 'pasL-rcons l-t' }),
			_setup('div', { class: 'pasL-rcons r-t' }),
			_setup('div', { class: 'pasL-rcons l-b' }),
			_setup('div', { class: 'pasL-rcons r-b' })
		);
	}
	return sel;
}
