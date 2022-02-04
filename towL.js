
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
			svg : { enumerable: true, value: _Svg }
		});

	}
	setViewBox(w, h) {
		this.svg.setAttribute('width' , w)
		this.svg.setAttribute('height', h)
		this.svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
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

		const { svg } = this;
		const { el }  = points[0];
		const { selected } = svg.children;
		let type = el.nodeName;

		data.vboxW = svg.viewBox.baseVal.width;
		data.vboxH = svg.viewBox.baseVal.height;

		if (selected)
			selected.removeAttribute('id');
		if (type in TowL) {
			data[0] = TowL[type](el);
			svg.appendChild(el).id = 'selected';
		}
	}
	_emitChange(points, data) {
		if (data[0]) {
			data[0].move(points[0].x, points[0].y);
		}
	}
}

TowL.circle = TowL.ellipse = (el) => {
	let sX = el.cx.baseVal.value,
	    sY = el.cy.baseVal.value;
	return {
		move: (x,y) => {
			el.cx.baseVal.value = sX + x;
			el.cy.baseVal.value = sY + y;
		}
	}
}
TowL.line = (el) => {
	let sX1 = el.x1.baseVal.value, sX2 = el.x2.baseVal.value,
	    sY1 = el.y1.baseVal.value, sY2 = el.y2.baseVal.value;
	return {
		move: (x,y) => {
			el.x1.baseVal.value = sX1 + x, el.x2.baseVal.value = sX2 + x;
			el.y1.baseVal.value = sY1 + y, el.y2.baseVal.value = sY2 + y;
		}
	}
}
TowL.text = (el) => {
	let sX = el.x.baseVal[0].value,
	    sY = el.y.baseVal[0].value;
	return {
		move: (x,y) => {
			el.x.baseVal[0].value = sX + x;
			el.y.baseVal[0].value = sY + y;
		}
	}
}
TowL.rect = (el) => {
	let sX = el.x.baseVal.value,
	    sY = el.y.baseVal.value;
	return {
		move: (x,y) => {
			el.x.baseVal.value = sX + x;
			el.y.baseVal.value = sY + y;
		}
	}
}
