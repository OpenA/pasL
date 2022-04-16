
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
	addFigure(type, params = {
		x: 0, y: 0, w: 50, h: 50, svg_attrs: {}, content: ''
	}) {
		const { x = 0, y = 0, w = 50, h = 50, svg_attrs, content } = params;

		const attrs = Object.create(null),
		      empty = !(svg_attrs && Object.keys(svg_attrs).length);

		let stroke = 1, is_text = false;

		if (!empty) {
			stroke = Object.assign(attrs, svg_attrs)['stroke-width'];
			delete attrs['stroke-width'];
		}
		if (type === 'circle' || type === 'ellipse') {
			type = 'ellipse';

			attrs.cx = (attrs.rx = w / 2) + x;
			attrs.cy = (attrs.ry = h / 2) + y;

		} else if (type === 'line') {
			if (empty || !(stroke > 0))
				stroke = 3;
			attrs.x1 = x, attrs.x2 = x + w;
			attrs.y1 =    attrs.y2 = y + stroke / 2;
		} else {

			attrs.x = x, attrs.y = y;

			if ((is_text = type === 'text')) {
				attrs['dominant-baseline'] = 'text-before-edge';
				if (empty) {
					attrs['font-weight'] = 'bold';
					attrs['font-family'] = 'sans-serif';
					attrs['font-size'  ] = 18;
				}
			} else {
				attrs.width  = w, attrs.height = h;
			}
		}
		const figure = document.createElementNS('http://www.w3.org/2000/svg', type);

		for (let key in attrs)
			figure.setAttribute(key, attrs[key]);
		if (stroke > 0)
			figure.setAttribute('stroke-width', stroke);
		if (is_text)
			figure.textContent = content || 'Example Text'
		this.svg.append(figure);
	}

	_emitActive(points, data) {

		const { svg, box, _ratio } = this;

		for (const sel of box.getElementsByClassName('towL-select')) {
			sel.classList.remove('act-v');
		}
		for (let i = 0; i < points.length; i++) {

			let { el } = points[i], sel = null, fl = 0;

			if (el === svg || el === box)
				continue;
			let { style, classList: [c0,c1] } = el;
			if (c0 === 'towL-select') {
				el = (sel = el)._figure;
			} else if (c0 === 'pasL-rcons') {
				el = (sel = el.parentNode)._figure;
				fl = PasL.parseCF(c1);
				style = sel.style;
			} else if (c0 === 'towL-point') {
				el = (sel = el.parentNode)._figure;
				fl = (c1 === 's-d'   ? 0x10 :
				      c1 === 'e-d'   ? 0x20 :
				      c1 === 'r-o-t' ? 0x40 : 0);
				if (el.nodeName === 'text' || el.nodeName === 'line')
					style = sel.style;
			} else {
				if (!(sel = el._sel)) {
					sel = el._sel = TowL.createSelection(el.nodeName);
					sel._figure = el;
				}
				style = sel.style;
			}
			const { left, top, width, height, pad } = (
				data[i] = TowL[el.nodeName](el, _ratio, fl, style)
			);
			data[i].style = style;
			sel.style.left = `${left - pad}px`, sel.style.width  = `${pad + width  + pad}px`;
			sel.style.top  = `${top  - pad}px`, sel.style.height = `${pad + height + pad}px`;
			svg.append(el),
			box.appendChild(sel).classList.add('act-v');
		}
	}
	_emitChange(points, data) {
		if (data[0]) {
			const { left, top, width, height, pad, flags, style } = data[0];
			const { x, y } = points[0];

			if (!flags) {
				style.left = `${left + x - pad}px`;
				style.top  = `${top  + y - pad}px`;
				data[0].setPosition(x, y);
			} else if (flags & 0x40) { // rotate
				let angle = Math.atan2(width / 2 + x, height / 2 + y) * -(180 / Math.PI);
				style.transform = angle ? `rotate(${angle}deg)` : null;
				data[0].setRotate(angle);
			} else if (flags & 0x10 || flags & 0x20) { // rotate
				data[0].move(x,y);
			} else {
				const rex = flags & 0x1, cew = flags & 0x4,
					  rey = flags & 0x2, ceh = flags & 0x8;
				
				let rx = rex ? -x : x, w = width  + rx; if (w < 0) w = 0;
				let ry = rey ? -y : y, h = height + ry; if (h < 0) h = 0;

				if (rex) style.left = `${left + (w ? x : width)  - pad}px`;
				if (rey) style.top  = `${top  + (h ? y : height) - pad}px`;
				if (cew) {
					style.width = `${pad + w + pad}px`;
					data[0].setWidth(x, rx, w, rex);
				}
				if (ceh) {
					style.height = `${pad + h + pad}px`;
					data[0].setHeight(y, ry, h, rey);
				}
			}
		}
	}
}

TowL.ellipse = (el, sr = 1, flags = 0) => {
	const _X = el.cx.baseVal.value, xR = el.rx.baseVal.value,
	      _Y = el.cy.baseVal.value, yR = el.ry.baseVal.value;

	const left = (_X - xR) / sr, width  = (xR + xR) / sr, pad = 5,
	      top  = (_Y - yR) / sr, height = (yR + yR) / sr;
	
	const mtx = TowL.getTransformRotate(el, Boolean(flags & 0x40));

	return { left, top, width, height, pad, flags,

		setRotate: (angle) => {
			mtx.setRotate(angle, _X, _Y);
		},
		setPosition: (x, y) => {
			let cx = (el.cx.baseVal.value = _X + x * sr);
			let cy = (el.cy.baseVal.value = _Y + y * sr);
			if (mtx)
				mtx.setRotate(mtx.angle, cx, cy);
		},
		setWidth: (x, rx, w, re = false) => {
			el.cx.baseVal.value = _X + (w ? x * sr * .5 : re ?xR:-xR);
			el.rx.baseVal.value = (w ? xR +rx * sr * .5 : .5);
		},
		setHeight: (y, ry, h, re = false) => {
			el.cy.baseVal.value = _Y + (h ? y * sr * .5 : re ?yR:-yR);
			el.ry.baseVal.value = (h ? yR +ry * sr * .5 : .5);
		}
	}
}
TowL.line = (el, sr = 1, flags = 0, style) => {
	const _X1 = el.x1.baseVal.value, _X2 = el.x2.baseVal.value,
	      _Y1 = el.y1.baseVal.value, _Y2 = el.y2.baseVal.value;

	const pad = parseInt(el.getAttribute('stroke-width')) / sr;

	const left = (_X1 < _X2 ? _X1 : _X2) / sr, width  = (_X1 < _X2 ? _X2 - _X1 : _X1 - _X2) / sr,
	      top  = (_Y1 < _Y2 ? _Y1 : _Y2) / sr, height = (_Y1 < _Y2 ? _Y2 - _Y1 : _Y1 - _Y2) / sr;

	//const {left, top, width, height} = el.getBoundingClientRect();

	return { left, top, width, height, pad, flags,
		move: flags & 0x10 ? (x, y) => {
			el.x1.baseVal.value = _X1 + x* sr;
			el.y1.baseVal.value =  _Y1 + y* sr;
			style.left = (left + x) +'px';
			style.top = (top + y) +'px';
		} : (x, y) => {
			el.x2.baseVal.value = _X2 + x* sr;
			el.y2.baseVal.value =  _Y2 + y* sr;
			style.left = (left + x) +'px';
			style.top = (top + y) +'px';
		},
		setPosition: (x, y) => {
			x *= sr, y *= sr;
			el.x1.baseVal.value = _X1 + x, el.x2.baseVal.value = _X2 + x;
			el.y1.baseVal.value = _Y1 + y, el.y2.baseVal.value = _Y2 + y;
		}
	}
}
TowL.text = (el, sr = 1, flags = 0) => {

	const { x: _X, y: _Y, width: _W, height: _H } = el.getBBox();
	const mtx = TowL.getTransformRotate(el, Boolean(flags & 0x40));

	return {
		left: _X / sr, width: _W / sr, flags,
		top: _Y / sr, height: _H / sr, pad: 5,

		setRotate: (angle) => {
			mtx.setRotate(angle, _X + _W / 2, _Y + _H / 2);
		},
		setPosition: (x, y) => {
			let cx = el.x.baseVal[0].value = _X + x * sr;
			let cy = el.y.baseVal[0].value = _Y + y * sr;
			if (mtx)
				mtx.setRotate(mtx.angle, cx + _W / 2, cy + _H / 2);
		}
	}
}
TowL.rect = (el, sr = 1, flags = 0, style) => {
	const _X = el.x.baseVal.value, _W = el.width.baseVal.value,
	      _Y = el.y.baseVal.value, _H = el.height.baseVal.value,
	      _R = el.rx.baseVal.value;

	const left = _X / sr, width  = _W / sr, xR = _W / 2, pad = 5,
	      top  = _Y / sr, height = _H / sr, yR = _H / 2, rdx = _R / sr;

	const rad = el._sel.children[1].style; rad.width  = `${rdx}px`;
	const mtx = TowL.getTransformRotate(el, Boolean(flags & 0x40));

	return { left, top, width, height, pad, flags,

		move: x => {
			let rx = _R + x * sr;
			el.rx.baseVal.value = rx <= 0 ? 0 : rx;
			rad.width = `${rx <= 0 ? 0 : rdx + x}px`;
		},
		setRotate: (angle) => {
			mtx.setRotate(angle, _W / 2 + _X, _H / 2 + _Y);
		},
		setPosition: (x, y) => {
			let cx = (el.x.baseVal.value = _X + x * sr);
			let cy = (el.y.baseVal.value = _Y + y * sr);
			if (mtx)
				mtx.setRotate(mtx.angle, _W / 2 + cx, _H / 2 + cy);
		},
		setWidth: (x, rx, w, re = false) => {
			if (re) el.x.baseVal.value = _X + (w ? x * sr : _W);
			el.width.baseVal.value = w ? rx * sr + _W : 1;
		},
		setHeight: (y, ry, h, re = false) => {
			if (re) el.y.baseVal.value = _Y + (h ? y * sr : _H);
			el.height.baseVal.value = h ? ry * sr + _H : 1;
		}
	}
}
TowL.getTransformRotate = (el, init = false) => {

	const tList = el.transform.baseVal;
	let matrx = null;

	for (let i = 0; i < tList.numberOfItems; i++) {
		if (tList[i].type === tList[i].SVG_TRANSFORM_ROTATE) {
			matrx = tList[i];
			break;
		}
	}
	if (init && !matrx)
		tList.appendItem((matrx = el.viewportElement.createSVGTransform()));
	return matrx;
}

TowL.createSelection = (type) => {
	const sel = _setup('div', { class: 'towL-select towL-'+ type, style: 'position: absolute;' });

	if (type === 'text') {
	
	}
	if (type !== 'circle') {
		sel.append(
			_setup('div', { class: 'towL-point '+ (type === 'line' ? 's-d' : 'r-o-t') })
		);
	}
	if (type === 'rect' || type === 'line') {
		sel.append(
			_setup('div', { class: 'towL-point e-d' })
		);
	}
	if (type === 'rect' || type === 'ellipse') {
		sel.append(
			_setup('div', { class: 'pasL-rcons l-t' }),
			_setup('div', { class: 'pasL-rcons r-t' }),
			_setup('div', { class: 'pasL-rcons l-b' }),
			_setup('div', { class: 'pasL-rcons r-b' })
		);
	}
	return sel;
}
