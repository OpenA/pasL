
class TowL extends PointTracker {

	constructor() {

		const _Box = _setup('div', { class: 'towL-box', style: 'position: absolute;' }),
		      _Svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		
		_Svg.setAttribute('xmlns' ,'http://www.w3.org/2000/svg');
		_Svg.setAttribute('fill'  , 'white');
		_Svg.setAttribute('stroke', 'black');

		_Box.append(_Svg);

		super({ elem: _Box });
		this.pad = 4, this.scale = 1, this.ratio = 1;

		Object.defineProperties(this, {
			/* public */
			box : { enumerable: true, value: _Box },
			svg : { enumerable: true, value: _Svg }
		});
	}

	setViewBox(w = 100, h = 100, scale = 1) {
		const ratio = 1 / scale;
		this.svg.setAttribute('width' , w);
		this.svg.setAttribute('height', h);
		this.svg.setAttribute('viewBox', `0 0 ${w * ratio} ${h * ratio}`);
		this.scale = scale, this.ratio = ratio;
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

		let stroke = 1, is_text = false, i = 0;

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
		do {
			attrs.id = 'figure_'+ (++i).toString();
		} while (this.svg.children[attrs.id]);

		const figure = document.createElementNS('http://www.w3.org/2000/svg', type);

		for (let key in attrs)
			figure.setAttribute(key, attrs[key]);
		if (stroke > 0)
			figure.setAttribute('stroke-width', stroke);
		if (is_text)
			figure.textContent = content || 'Example Text';
		this.svg.append(figure);
	}

	_emitActive(points, data) {

		const { svg, box, scale, ratio, pad } = this;

		for (const sel of box.getElementsByClassName('towL-select')) {
			sel.classList.remove('act-v');
		}
		for (let i = 0; i < points.length; i++) {

			let { el } = points[i], pins = 0,
			    { id, classList: [c0,c1], _sel = null } = el;

			if (el === svg || el === box)
				continue;
			if (c0 === 'towL-select') {
				el = (_sel = el)._figure;
				id = id.substring('sel_'.length);
			} else if (c0 === 'pasL-rcons' || c0 === 'towL-point') {
				pins = TowL.parsePMark(c1);
				el = (_sel = el.parentNode)._figure;
				id = _sel.id.substring('sel_'.length);
			} else if (!_sel) {
				_sel = el._sel = TowL.createSelection(el.nodeName, 'sel_'+ id);
				_sel._figure = el;
			}
			if (!(id in data)) {
				data[id] = TowL[`select_${el.nodeName}`](el, _sel, scale, ratio, pad);
			}
			data[i] = { pins, id };

			svg.append(el),
			box.appendChild(_sel).classList.add('act-v');
		}
	}
	_emitChange(points, data) {
		const ids = new Set;
		for (let i = 0; i < points.length; i++) {
			let { x, y } = points[i],
			  { pins, id } = data[i];
			if (pins === 0) {
				data[id].matrix.x = x;
				data[id].matrix.y = y;
			} else if (pins & 0x100)  {
				const rex = pins & 0x1, rey = pins & 0x2;
				if (rex) data[id].matrix.x = x;
				if (rey) data[id].matrix.y = y;
				data[id].matrix.w = rex ? -x : x;
				data[id].matrix.h = rey ? -y : y;
			} else if (pins & 0x200)  {
				data[id].matrix.p[pins & 0xFF] = { x, y };
			}
			ids.add(id);
		}
		for (const id of ids) {
			data[id].transform(data[id].matrix);
		}
	}
}

TowL.select_circle = TowL.select_ellipse = TowL.select_rect = (
	el, sel, scale, ratio, pad
) => {
	const xR = el.rx.baseVal.value, hasWH = 'width' in el,
	      yR = el.ry.baseVal.value;

	let _W, _H, _X, _Y, cX, cY; pad += Number(el.getAttribute('stroke-width'));
	if (hasWH) {
		_W = el.width.baseVal.value,  _X = el.x.baseVal.value, cX = _X +_W * .5;
		_H = el.height.baseVal.value, _Y = el.y.baseVal.value, cY = _Y +_H * .5;
	} else {
		cX = el.cx.baseVal.value, _W = xR * 2, _X = cX - xR;
		cY = el.cy.baseVal.value, _H = yR * 2, _Y = cY - yR;
	}
	const left = _X * scale, width  = _W * scale,
		  top  = _Y * scale, height = _H * scale;

	sel.style.left = `${left - pad}px`, sel.style.width = `${width + pad * 2}px`;
	sel.style.top  = `${top - pad}px`, sel.style.height = `${height + pad * 2}px`;

	return { matrix: { x: 0, y: 0, w: 0, h: 0, p: [] },

		transform({x, y, w, h, p: [a,r]}) {

			let nw = width + w, nx = left + x,
				nh = height + h, ny = top + y;
			if (nw < 0) nw = 0, nx = nx > left + width ? left + width : nx;
			if (nh < 0) nh = 0, ny = ny > top + height ? top + height : ny;

			sel.style.left = `${nx - pad}px`; sel.style.width  = `${nw + pad * 2}px`;
			sel.style.top  = `${ny - pad}px`; sel.style.height = `${nh + pad * 2}px`;

			let rx = (nw *= ratio) * ratio, cx = (nx *= ratio) + rx;
			let ry = (nh *= ratio) * ratio, cy = (ny *= ratio) + ry;
			if (hasWH) {
				if (r) {
					let rad = xR * scale + r.x;
					el.rx.baseVal.value = rad <= 0 ? 0 : rad * ratio;
					sel.children[0].style.width = rad <= 0 ? 0 : rad +'px';
				}
				el.x.baseVal.value = nx; el.width.baseVal.value = nw;
				el.y.baseVal.value = ny; el.height.baseVal.value = nh;
			} else {
				el.cx.baseVal.value = cx; el.rx.baseVal.value = rx;
				el.cy.baseVal.value = cy; el.ry.baseVal.value = ry;
			}
			TowL.rotate_figure(el, cx, cy, sel.lastElementChild, a);
		}
	}
};

TowL.select_line = (el, sel, scale, ratio, pad) => {

	let x1 = el.x1.baseVal.value, x2 = el.x2.baseVal.value,
	    y1 = el.y1.baseVal.value, y2 = el.y2.baseVal.value;
	  pad += Number(el.getAttribute('stroke-width'));

	const sel_bounds = (x1, x2, y1, y2) => {
		const l = x1 * scale,
		      w = (x2 - x1) * scale,
		      t = (y1 > y2 ? y2 : y1) * scale,
		      h = (y1 > y2 ? y1 - y2 : y2 - y1) * scale;

		sel.style.left = `${l - pad}px`, sel.style.width = `${w + pad * 2}px`;
		sel.style.top = `${t - pad}px`, sel.style.height = `${h + pad * 2}px`;
	};
	const rX = x1 > x2,
	      X1 = rX ? x2 : x1, Y1 = rX ? y2 : y1,
	      X2 = rX ? x1 : x2, Y2 = rX ? y1 : y2;

	sel_bounds(X1, X2, Y1, Y2);

	return { matrix: { x: 0, y: 0, p: [] },

		transform({x, y, p}) {
			let x1 = X1, y1 = Y1, x2 = X2, y2 = Y2;

			if (p.length) {
				if (p[1] && (x1 += p[1].x * ratio) > x2) x1 = x2;
				if (p[1] && Math.floor((y1 += p[1].y * ratio)) === y2) y1 = y2;
				if (p[2] && (x2 += p[2].x * ratio) < x1) x2 = x1;
				if (p[2] && Math.floor((y2 += p[2].y * ratio)) === y1) y2 = y1;

				sel.children[0].style.top = y2 === y1 ? null : y2 > y1 ? 0 : '100%';
				sel.children[1].style.top = y2 === y1 ? null : y2 > y1 ? '100%' : 0;
			} else {
				x1 += x * ratio, y1 += y * ratio,
				x2 += x * ratio, y2 += y * ratio;
			}
			sel_bounds(x1,x2,y1,y2);

			el.x2.baseVal.value = x2; el.x1.baseVal.value = x1;
			el.y2.baseVal.value = y2; el.y1.baseVal.value = y1;
		}
	}
};

TowL.select_text = (el, sel, scale, ratio, pad) => {

	const { x: sX, y: sY, width: sW, height: sH } = el.getBBox();

	const left = sX * scale - pad, width = sW * scale + pad * 2,
		  top = sY * scale - pad, height = sH * scale + pad * 2;

	sel.style.left = `${left}px`, sel.style.width = `${width}px`;
	sel.style.top = `${top}px`, sel.style.height = `${height}px`;

	return { matrix: { x: 0, y: 0, p: [] },

		transform({x, y, p: [a]}) {
			sel.style.left = `${left + x}px`;
			sel.style.top  = `${top  + y}px`;
			let cx = (el.x.baseVal[0].value = sX + x * ratio) + sW * .5;
			let cy = (el.y.baseVal[0].value = sY + y * ratio) + sH * .5;
			TowL.rotate_figure(el, cx, cy, sel.lastElementChild, a);
		}
	}
};

TowL.parsePMark = (cf = '') => {

	let pin = 0, mod = 0;

	const c = cf.charAt(0), f = cf.charAt(2);
	if (c === 'd') {
		mod = 0x200, pin = (
			f === 'r' ? 0x0 : f === 's' ? 0x1 :
			f === 'e' ? 0x2 : Number.parseInt(f)
		);
	} else {
		mod = 0x100, pin = (c === 'l') | (f === 't') << 0x1;
	}
	return pin | mod;
}

TowL.rotate_figure = (el, cx, cy, sel, mov) => {

	const lst = el.transform.baseVal;
	let matrx = null, angle = 0;

	for (let i = 0; i < lst.numberOfItems; i++) {
		if (lst[i].type === lst[i].SVG_TRANSFORM_ROTATE) {
			matrx = lst[i],
			angle = lst[i].angle;
			break;
		}
	}
	if (!matrx && mov)
		lst.appendItem((matrx = el.viewportElement.createSVGTransform()));
	if (mov) {
		angle = (Math.atan2(mov.x, cy + mov.y)) * -(180 / Math.PI);
		if (angle < 0 && angle > -1)
			angle = 0;
	}
	if (matrx) {
		matrx.setRotate(angle, cx, cy);
		sel.style.transform = angle ? `rotate(${angle}deg)` : null;
	}
}

TowL.createSelection = (type, id) => {
	const sel = _setup('div', { id, class: 'towL-select towL-'+ type, style: 'position: absolute;' }),
	     clss = [];

	switch(type) {
	case 'line': clss.push('towL-point d-s', 'towL-point d-e'); break;
	case 'rect': clss.push('towL-point d-s');
	case 'ellipse':
		//sel.append( makeLocker(false) );
	case 'circle':
		clss.push('pasL-rcons l-t', 'pasL-rcons r-t', 'pasL-rcons l-b', 'pasL-rcons r-b');
	default:
		if (type !== 'circle')
			clss.push('towL-point d-r');
	}
	for (const name of clss) {
		sel.appendChild(document.createElement('div')).className = name;
	}
	return sel;
}
