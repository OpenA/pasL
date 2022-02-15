
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
				fl = getCourseFlags(el_class[1]);
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

TowL.circle = TowL.ellipse = (el, r = 1) => {
	const sX = el.cx.baseVal.value,
	      sY = el.cy.baseVal.value;
	return {
		move: ({ x, y }) => {
			el.cx.baseVal.value = sX + x * r;
			el.cy.baseVal.value = sY + y * r;
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
TowL.text = (el, r = 1) => {
	const sX = el.x.baseVal[0].value, rX = sX / r,
	      sY = el.y.baseVal[0].value, rY = sY / r;

	const { width:rW, height:rH } = el.getBoundingClientRect(), pad = 5, sel = el._sel.style;

	sel.left = `${rX - pad}px`, sel.width  = `${pad + rW + pad}px`;
	sel.top  = `${rY - pad}px`, sel.height = `${pad + rH + pad}px`;

	return {
		move: ({ x, y }) => {
			el.x.baseVal[0].value = sX + x * r; sel.left = `${rX + x - pad}px`;
			el.y.baseVal[0].value = sY + y * r; sel.top  = `${rY + y - pad}px`;
		}
	}
}
TowL.rect = (el, r = 1, fl = 0) => {
	const sX = el.x.baseVal.value, sW = el.width.baseVal.value,
	      sY = el.y.baseVal.value, sH = el.height.baseVal.value;

	const rX = sX / r, rW = sW / r, pad = 5,
	      rY = sY / r, rH = sH / r, sel = el._sel.style;

	const rex = fl & 0x1, cew = fl & 0x4,
	      rey = fl & 0x2, ceh = fl & 0x8;

	sel.left = `${rX - pad}px`, sel.width  = `${pad + rW + pad}px`;
	sel.top  = `${rY - pad}px`, sel.height = `${pad + rH + pad}px`;

	return {
		move: fl ? ({ x, y }) => {
			const w = sW + (rex ? -x : x) * r, eW = w > 1,
			      h = sH + (rey ? -y : y) * r, eH = h > 1;
			if (rex)
				el.x.baseVal.value = sX + (eW ? x * r : sW), sel.left = `${rX + (eW ? x : rW) - pad}px`;
			if (rey)
				el.y.baseVal.value = sY + (eH ? y * r : sH), sel.top  = `${rY + (eH ? y : rH) - pad}px`;
			if (cew)
				el.width.baseVal.value  = eW ? w : 1, sel.width  = `${pad + (eW ? w / r : 1) + pad}px`;
			if (ceh)
				el.height.baseVal.value = eH ? h : 1, sel.height = `${pad + (eH ? h / r : 1) + pad}px`;
		} : ({ x, y }) => {
			el.x.baseVal.value = sX + x * r; sel.left = `${rX + x - pad}px`;
			el.y.baseVal.value = sY + y * r; sel.top  = `${rY + y - pad}px`;
		}
	}
}

TowL.selectable = (type) => {
	const sel = _setup('div', { class: 'towL-select towL-'+ type, style: 'position: absolute;' });

	if (type === 'text') {
	
	} else if (type === 'line') {
		sel.append(
			_setup('div', { class: 'towL-point s-d' }),
			_setup('div', { class: 'towL-point e-d' })
		);
	} else
		sel.append(
			_setup('div', { class: 'pasL-rcons l-t' }),
			_setup('div', { class: 'pasL-rcons r-t' }),
			_setup('div', { class: 'pasL-rcons l-b' }),
			_setup('div', { class: 'pasL-rcons r-b' })
		);
	return sel;
}
