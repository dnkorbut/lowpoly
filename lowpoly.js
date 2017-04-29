<script id="fs" type="x-shader/x-fragment">
	precision mediump float;

	varying vec3 l;
	varying vec3 n;
	varying vec4 c;
	varying vec2 t;
	varying float s;
	varying float m;

	uniform sampler2D sample0;
	uniform sampler2D sample1;
	uniform sampler2D sample2;
	uniform sampler2D sample3;
	uniform sampler2D shadow_sample;

	uniform vec3 skycol;
	uniform float fog_intensity;

	varying vec4 vs;
	varying vec4 vp;
	varying float f;
	varying float shadow_l;

	float texelSize = 1.0 / 4096.0;

	void main(void) {
		vec3 n2 = normalize(n);
		vec3 l2 = normalize(l);

		float shadow = 0.0;
		vec4 depth;
		vec3 coord;

		vec4 diffcolor;

		if(gl_FragCoord.z < 0.0) {
			discard;
		}

		int im = int(floor(m));
		int is = int(floor(s));

		if(im == 0) {
			diffcolor = c;
		}else{
			if(im == 1) {
				diffcolor = texture2D(sample0, t);
			}else if(im == 2) {
				diffcolor = texture2D(sample1, t);
			}else if(im == 3) {
				diffcolor = texture2D(sample2, t);
			}else if(im == 4) {
				diffcolor = texture2D(sample3, t);
			}else{
				discard;
			}
			if(diffcolor.a < 0.7) {
				discard;
			}
		}

		if(is != 1) {
			coord = (vp.xyz / vp.w) / 2.0 + 0.5;

			if(f < 30.0) {
				for(int x = -1; x <= 1; ++x) {
					for(int y = -1; y <= 1; ++y) {

						depth = texture2D(shadow_sample, coord.xy + vec2(x, y) * texelSize);

						if(shadow_l > (depth.b * 255.0) + (depth.r * 255.0) +  depth.g + 1.1) {
							shadow += 0.02;
						}
					}
				}
			}else{
				depth = texture2D(shadow_sample, coord.xy);

				if(shadow_l > (depth.b * 255.0) + (depth.r * 255.0) +  depth.g + 1.1) {
					shadow = 0.2;
				}
			}

			diffcolor = vec4(vec3(diffcolor * (1.0 - shadow)), diffcolor.a);

	// 		depth /= 2.0;
	// 		diffcolor = vec4(depth, depth, depth, 1.0);
	// 		is = 1;

			float mirdot = abs(dot(n2, l2));

			//mirdot = mirdot * 3.0;

			//mirdot = 1.0 + mirdot;
 			//mirdot = min(((1.0 / mirdot - 0.98) / 0.041 ), 1.0);
			//mirdot = ((mirdot + 5.0) / 6.0);

			mirdot = mirdot / 2.0 + 0.5;

			diffcolor = vec4(diffcolor.rgb * mirdot * skycol.rgb, diffcolor.a);

		  //diffcolor = diffcolor * (1.0 + (1.0 - diffcolor));
		}

		float sf = min(f / (fog_intensity * 150.0), 1.0);

		diffcolor.r += (skycol.r - diffcolor.r) * sf;
		diffcolor.g += (skycol.g - diffcolor.g) * sf;
		diffcolor.b += (skycol.b - diffcolor.b) * sf;

		gl_FragColor = diffcolor;
	}
</script>

<script id="vs" type="x-shader/x-vertex">
	attribute vec3 vrt;
	attribute float sha;
	attribute float mat;
	attribute vec2 txt;
	attribute vec3 nor;
	attribute vec4 col;

	uniform mat4 transform;
	uniform mat4 shadow_matrix;
	uniform mat4 shadow_mvm;
	uniform vec3 light;
	uniform vec3 pos;
	uniform int isplayer;
	uniform mat4 player_rotation;
	uniform mat4 player_transform;
	uniform mat4 player_basis;

	varying vec3 l;
	varying vec3 n;
	varying vec4 c;
	varying vec2 t;
	varying float s;
	varying float m;
	varying float f;
	varying float shadow_l;

	varying vec4 vp;

	varying vec4 vs;

	void main(void) {
		vec4 xyz;

		c = col;
		s = sha + 0.1;
		m = mat + 1.1;
		t = txt;

		if(isplayer == 1) {
			n = normalize(mat3(player_basis) * mat3(player_rotation) * nor);
			xyz = player_transform * (player_basis * player_rotation * vec4(vrt, 1.0));
			l = light - vec3(xyz);
			gl_Position = transform * xyz;
		}else{
			l = light - vrt;
			n = nor;
			vp = shadow_matrix * vec4(vrt, 1.0);
			vs = vec4(vrt, 1.0);
			f = distance(vrt, pos);
			shadow_l = length(l);
			gl_Position = transform * vec4(vrt, 1.0);
		}
	}
</script>

<script id="depth_fs" type="x-shader/x-fragment">
	precision mediump float;
	varying float d_int_h;
	varying float d_int_l;
	varying float d_fract;

	void main(void) {
		gl_FragColor = vec4(d_int_l / 255.0, d_fract, d_int_h / 255.0, 1.0);
	}
</script>

<script id="depth_vs" type="x-shader/x-vertex">

	attribute vec3 vrt;
	uniform mat4 matrix;
	uniform vec3 light;

	varying float d_int_h;
	varying float d_int_l;
	varying float d_fract;

	void main(void) {
		d_int_l = floor(distance(vrt, light));
		d_fract = fract(distance(vrt, light));
		if(d_int_l > 255.0) {
			d_int_h = d_int_l - 255.0;
			d_int_l = d_int_l - d_int_h;
		}else{
			d_int_h = 0.0;
		}
		gl_Position = matrix * vec4(vrt, 1.0);
	}
</script>

<script type='text/javascript'>
(function() {
	// config
	var maxwidth = 1024;
	var maxheight = 768;

	var shadow_texture_size = 2048;

	var x = -144; // starting position
	var y = -240;
	var z = -424;
	var roty = 0; // starting rotation
	var rotx = 3.14159265359;

	var speed_max = 0.4;
	var speed_walk = 0.2;
	var speed_run = speed_max;
	var speed_gravity = 0.1;
	var speed_jump = speed_max;
	var speed_fade = 0.01;
	var speed_rotation = 0.08;
	// 180 -> Pi
	// 5   -> [[5 * Pi / 180]]
	var speed_fwd = speed_walk;
	var speed_side = speed_walk;
	var speed_up = speed_jump;
	var clickmaxsteps = 24;

	var sun = [];

	var users = 20;
	var triangles = 320;

	var server = "ws://127.0.0.1:9003";
	server = "ws://atrira.org:9003";

	// rotation to server
	var rcos = 1;
	var rsin = 0;

	// sphere
	var spheresize = 0.21;
	var spheresize2 = spheresize * spheresize; // в квадрате
	var spheight = 1.6; // высота от пола до середины сферы
	var spheight2 = spheight * spheight; // в квадрате
	var spheight_x = x;
	var spheight_y = y - spheight;
	var spheight_z = z;
	var pushup = 0;

	var gl;
	var canvas;
	var czoomw = 1;
	var czoomh = 1;
	var fs;
	var vs;
	var sh;
	var depth_fs;
	var depth_vs;
	var depth_sh;

	var plocked = 0;

	var realw;
	var realh;

	var DOUBLECLICK = 10; // ticks of fps

	var model = [];
	var SPHERE = 0;
	var BARE_PLAYER = triangles + 1;
	//var SKYBOX = triangles + 2;
	var curtri;
	var oldtri;
	var player_rotation = [];
	var player_transform = [];
	var player_basis = [];

	var identity;
	var basis;
	var perspective;
	var ortho;
	var transform;
	var translation;

	var keysarr = [];
	var mdx = 0;
	var mdy = 0;
	var dblclick = 0;
	var dblclick_run = 0;
	var vecfwd = 0;
	var vecup = 0;
	var vecside = 0;
	var gofwd = 0;
	var goside = 0;
	var goup = 0;
	var gorot = 0;
	var gorotx = 0;
	var isjump = 0;
	var mouse = {};
	var clickrot = 0;

	var clicktrans = 0;
	var wgloop_cnt = 0;
	var fps = 0;
	var fps24delay = 41;
	var cpuload = 0;

	var ox = x;
	var oy = y;
	var oz = z;
	var dx, dy, dz;

	var light = [-220, -330, -600, 1];
	var lightmoved = 0;
	//              r  g  b tp ct or og ob
	var skycolor = [1, 1, 1, 1, 1, 1, 1, 1];
	var fog_intensity = 10;

	var neighbour = [];
	var wsconnect = 1;

	var texture0;
	var texture1;

	var chatdiv;
	var chatfrm;
	var chatmsg;
	var chatform;
	var chattxt;
	var chaton = 0;
	var chat_wait = 0;
	var chat_tosend;
	var chat_ctr = 0;

	var myname;
	var ws;
	var mykey = -1;

	var init_loading = 0;
	var toload = 0;

	var fpsdiv;
	var debugdiv;
	var xyzdiv;
	var surfdiv;
	var debugcollide;
	var debugts1;
	var debugts2;
	var debugts3;
	var debugmm = 0;
	var debug = 0;
	var depthview = 0;

	var progressdiv;
	var initdiv;

	var markdiv;
	var marker = [];

	var Pi = Math.PI;
	var Pi4 = Math.PI * 4;
	var Pi2 = Math.PI * 2;
	var Pid2 = Math.PI / 2;

	function isintriangle(a, b, c, n, p) {  // ВСПМГ для функции столкновений
		// проведем три плоскости через грани основания пирамиды, если точка лежит с одной стороны от ab, bc и ca - то перпендикуляр от вершины к плоскости основания - лежит на основании.
		var d, d2, d3;
		var np = {};
		var three = {};

		three.x = a.x + n.x;
		three.y = a.y + n.y;
		three.z = a.z + n.z;
		np.x = a.y * (b.z - three.z) + b.y * (three.z - a.z) + three.y * (a.z - b.z);
		np.y = a.z * (b.x - three.x) + b.z * (three.x - a.x) + three.z * (a.x - b.x);
		np.z = a.x * (b.y - three.y) + b.x * (three.y - a.y) + three.x * (a.y - b.y);
		np = normalize(np);

		d = np.x * p.x + np.y * p.y + np.z * p.z + (0 - a.x * np.x - a.y * np.y - a.z * np.z);

		three.x = b.x + n.x;
		three.y = b.y + n.y;
		three.z = b.z + n.z;
		np.x = b.y * (c.z - three.z) + c.y * (three.z - b.z) + three.y * (b.z - c.z);
		np.y = b.z * (c.x - three.x) + c.z * (three.x - b.x) + three.z * (b.x - c.x);
		np.z = b.x * (c.y - three.y) + c.x * (three.y - b.y) + three.x * (b.y - c.y);
		np = normalize(np);

		d2 = np.x * p.x + np.y * p.y + np.z * p.z + (0 - b.x * np.x - b.y * np.y - b.z * np.z);

		three.x = c.x + n.x;
		three.y = c.y + n.y;
		three.z = c.z + n.z;
		np.x = c.y * (a.z - three.z) + a.y * (three.z - c.z) + three.y * (c.z - a.z);
		np.y = c.z * (a.x - three.x) + a.z * (three.x - c.x) + three.z * (c.x - a.x);
		np.z = c.x * (a.y - three.y) + a.x * (three.y - c.y) + three.x * (c.y - a.y);
		np = normalize(np);

		d3 = np.x * p.x + np.y * p.y + np.z * p.z + (0 - c.x * np.x - c.y * np.y - c.z * np.z);

		if(d * d2 < 0 || d * d3 < 0 || d2 * d3 < 0) {
			return false;
		}
		return true;
	}

	function edgeinsph(a, b) { // ВСПМГ Ребро в сфере
		var n = {};
		var p = {};
		var t;
		var len;

		// (I) (по тетрадке) AB = B - A (установка в начало координат)
		n.x = b.x - a.x;
		n.y = b.y - a.y;
		n.z = b.z - a.z;

		// (II) AP = P - A
		p.x = x - a.x;
		p.y = y - a.y;
		p.z = z - a.z;

		// (III) длина а потом нормируем
		len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
		n = normalize(n);

		// (IV) t = dot(nAB, AP)
		t = n.x * p.x + n.y * p.y + n.z * p.z;
		if(t > 0 && t < len) {
			// (V) D = t * nAB
			n.x *= t;
			n.y *= t;
			n.z *= t;

			// D + A
			n.x += a.x;
			n.y += a.y;
			n.z += a.z;

			// - xyz
			n.x -= x;
			n.y -= y;
			n.z -= z;

			// (VI) Длина D
			len = n.x * n.x + n.y * n.y + n.z * n.z;
			if(len < spheresize2) {
				return true;
			}
		}
		return false;
	}

	function collider() { // ВСПМГ Столкновения
		var i;
		var a = {};
		var b = {};
		var c = {};
		var a_dist;
		var b_dist;
		var c_dist;
		var ab = {};
		var bc = {};
		var cr = {};
		var ap = {};
		var len;
		var idx;
		var trisize;
		var trisize_pol;

		var pa = {};
		var no = {};
		var ph = {};
		var hlen;
		var k;

		pushup = 0;

		//console.log(curtri);

		// Вектор PH -> где H это конечная точка отрезка высоты
		ph.x = spheight_x - x;
		ph.y = spheight_y - y;
		ph.z = spheight_z - z;

		for(i = 0; i < model[curtri].numfaces; i++) {
			idx = model[curtri].indices[i * 3];
			if(model[curtri].collide[idx] == 0) {
				continue;
			}
			idx *= 3;
			a.x = model[curtri].vertices[idx];
			a.y = model[curtri].vertices[idx + 1];
			a.z = model[curtri].vertices[idx + 2];
			idx = model[curtri].indices[i * 3 + 1] * 3;
			b.x = model[curtri].vertices[idx];
			b.y = model[curtri].vertices[idx + 1];
			b.z = model[curtri].vertices[idx + 2];
			idx = model[curtri].indices[i * 3 + 2] * 3;
			c.x = model[curtri].vertices[idx];
			c.y = model[curtri].vertices[idx + 1];
			c.z = model[curtri].vertices[idx + 2];

			trisize = model[curtri].trisize[i];
			trisize_pol = model[curtri].trisize_pol[i];

			// расстояние от xyz до вершины в квадрате
			a_dist = (a.x - x) * (a.x - x) + (a.y - y) * (a.y - y) + (a.z - z) * (a.z - z);
			b_dist = (b.x - x) * (b.x - x) + (b.y - y) * (b.y - y) + (b.z - z) * (b.z - z);
			c_dist = (c.x - x) * (c.x - x) + (c.y - y) * (c.y - y) + (c.z - z) * (c.z - z);

			// В trisize уже включен размер сферы
			if(trisize > a_dist && trisize > b_dist && trisize > c_dist) {

				if(a_dist < spheresize2 || b_dist < spheresize2 || c_dist < spheresize2) {
					return true;
				}

				if(edgeinsph(a, b) || edgeinsph(b, c) || edgeinsph(c, a)) {
					return true;
				}

				no.x = model[curtri].trinor[i].x;
				no.y = model[curtri].trinor[i].y;
				no.z = model[curtri].trinor[i].z;

				// Проверяю полигон. Если дошел сюда, то ни ребро ни точки не попали в сферу

				ap.x = x - a.x;
				ap.y = y - a.y;
				ap.z = z - a.z;

				len = ap.x * no.x + ap.y * no.y + ap.z * no.z;

				if(Math.abs(len) < spheresize) {
					ap.x = ((0 - no.x) * len) + x;
					ap.y = ((0 - no.y) * len) + y;
					ap.z = ((0 - no.z) * len) + z;
					if(isintriangle(a, b, c, no, ap)) {
						return true;
					}
				}
			}

			if(trisize_pol > a_dist && trisize_pol > b_dist && trisize_pol > c_dist) {
				// Находим вектор PA -> где A -> любая точка треугольника, а P центр шарика
				pa.x = a.x - x;
				pa.y = a.y - y;
				pa.z = a.z - z;

				no.x = model[curtri].trinor[i].x;
				no.y = model[curtri].trinor[i].y;
				no.z = model[curtri].trinor[i].z;

				// Кратчайшее расстояние от P до плоскости три = PA * n (где n -> нормаль к три)
				len = pa.x * no.x + pa.y * no.y + pa.z * no.z;

				// Проекция PH на нормаль
				hlen = ph.x * no.x + ph.y * no.y + ph.z * no.z;

				// Коэффициент
				k = len / hlen;

				// Если точка отрезка лежит на плоскости
				if(k > 0 && k < 1) {
					cr.x = ph.x * k + x;
					cr.y = ph.y * k + y;
					cr.z = ph.z * k + z;
					if(isintriangle(a, b, c, no, cr)) {
						//alert(k);
						k = Math.sqrt((spheight_x - cr.x) * (spheight_x - cr.x) + (spheight_y - cr.y) * (spheight_y - cr.y) + (spheight_z - cr.z) * (spheight_z - cr.z));
						if(k > spheight) {
							return true;
						}
						if(k > pushup) {
							pushup = k;
							isjump = false;
						}
					}
				}
			}
		}

// 		if(pushup) {
// 			pushup = Math.sqrt(pushup);
// 		}

		return false;
	}

	function normalize(v) { // ВСПМГ Нормирование вектора
		var u = {};
		var v1 = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
		u.x = v.x / v1;
		u.y = v.y / v1;
		u.z = v.z / v1;

		return u;
	}

	function mulmatrix4(m1, m2) { // ВСПМГ Умножение матриц
		var m3 = [];

		m3[0] = m1[0] * m2[0] + m1[4] * m2[1] + m1[8] * m2[2] + m1[12] * m2[3];
		m3[4] = m1[0] * m2[4] + m1[4] * m2[5] + m1[8] * m2[6] + m1[12] * m2[7];
		m3[8] = m1[0] * m2[8] + m1[4] * m2[9] + m1[8] * m2[10] + m1[12] * m2[11];
		m3[12] = m1[0] * m2[12] + m1[4] * m2[13] + m1[8] * m2[14] + m1[12] * m2[15];

		m3[1] = m1[1] * m2[0] + m1[5] * m2[1] + m1[9] * m2[2] + m1[13] * m2[3];
		m3[5] = m1[1] * m2[4] + m1[5] * m2[5] + m1[9] * m2[6] + m1[13] * m2[7];
		m3[9] = m1[1] * m2[8] + m1[5] * m2[9] + m1[9] * m2[10] + m1[13] * m2[11];
		m3[13] = m1[1] * m2[12] + m1[5] * m2[13] + m1[9] * m2[14] + m1[13] * m2[15];

		m3[2] = m1[2] * m2[0] + m1[6] * m2[1] + m1[10] * m2[2] + m1[14] * m2[3];
		m3[6] = m1[2] * m2[4] + m1[6] * m2[5] + m1[10] * m2[6] + m1[14] * m2[7];
		m3[10] = m1[2] * m2[8] + m1[6] * m2[9] + m1[10] * m2[10] + m1[14] * m2[11];
		m3[14] = m1[2] * m2[12] + m1[6] * m2[13] + m1[10] * m2[14] + m1[14] * m2[15];

		m3[3] = m1[3] * m2[0] + m1[7] * m2[1] + m1[11] * m2[2] + m1[15] * m2[3];
		m3[7] = m1[3] * m2[4] + m1[7] * m2[5] + m1[11] * m2[6] + m1[15] * m2[7];
		m3[11] = m1[3] * m2[8] + m1[7] * m2[9] + m1[11] * m2[10] + m1[15] * m2[11];
		m3[15] = m1[3] * m2[12] + m1[7] * m2[13] + m1[11] * m2[14] + m1[15] * m2[15];

		return m3;
	}

	function cross(v1, v2) { // ВСПМГ Векторное произведение
		var v = {};

		v.x = v1.y * v2.z - v1.z * v2.y;
		v.y = v1.z * v2.x - v1.x * v2.z;
		v.z = v1.x * v2.y - v1.y * v2.x;

		return v;
	}

	function mulmatrix4vector(m1, x, y, z, w) {
		var vec4 = [];

		vec4[0] = m1[0] * x + m1[4] * y + m1[8] * z + m1[12] * w;
		vec4[1] = m1[1] * x + m1[5] * y + m1[9] * z + m1[13] * w;
		vec4[2] = m1[2] * x + m1[6] * y + m1[10] * z + m1[14] * w;
		vec4[3] = m1[3] * x + m1[7] * y + m1[11] * z + m1[15] * w;

		return vec4;
	}

	function getsh(id) { // ВСПМГ Загрузка шейдеров
		var script = document.getElementById(id);
		if(!script) {
			return null;
		}

		var str = "";
		var k = script.firstChild;
		while(k) {
			if(k.nodeType == 3) {
				str += k.textContent;
			}
			k = k.nextSibling;
		}

		var shader;
		if(script.type == "x-shader/x-fragment") {
			shader = gl.createShader(gl.FRAGMENT_SHADER);
		}else if(script.type == "x-shader/x-vertex") {
			shader = gl.createShader(gl.VERTEX_SHADER);
		}else{
			return null;
		}

		gl.shaderSource(shader, str);
		gl.compileShader(shader);

		if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			alert(gl.getShaderInfoLog(shader));
			return null;
		}

		return shader;
	}

	function loadmodel(name, cell, func) { // ВСПМГ Загрузка модели name в ячейку cell
		var ajax = new XMLHttpRequest();
		var img2;
		var img3;

		model[cell] = {};

		model[cell].texture2 = gl.createTexture();
		model[cell].texture3 = gl.createTexture();
		img2 = new Image();
		img3 = new Image();
		img2.onerror = function() { model[cell].texture2.complete = 1; toload--; };
		img3.onerror = function() { model[cell].texture3.complete = 1; toload--; };
		img2.onload = function() {
			gl.bindTexture(gl.TEXTURE_2D, model[cell].texture2);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img2);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST); // _LINEAR_MIPMAP_NEAREST
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			gl.bindTexture(gl.TEXTURE_2D, null);
			model[cell].texture2.complete = 1;
			toload--;
		};
		img3.onload = function() {
			gl.bindTexture(gl.TEXTURE_2D, model[cell].texture3);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img3);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST); // _LINEAR_MIPMAP_NEAREST
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			gl.bindTexture(gl.TEXTURE_2D, null);
			model[cell].texture3.complete = 1;
			toload--;
		};
		img2.src = "/np3/tex/" + cell + "_2.png";
		img3.src = "/np3/tex/" + cell + "_3.jpg";

		ajax.open('GET', '/np3/' + name + '.np3');
		ajax.responseType = 'arraybuffer';
		ajax.send();

		ajax.onreadystatechange = function() {
			if(ajax.readyState == 4) {
				var dataview = new DataView(ajax.response);

// 				alert(cell);
// 				if(cell == 232) {
// 					var data = new Blob([ajax.response], {type: 'application/x-binary'});
// 					window.location.href = window.URL.createObjectURL(data);
// 				}

				var offset = 0;
				var c;
				var i;

				var v = [];
				var vt = [];
				var vn = [];
				var len;
				var st;
				var mt;
				var v3col = [];
				var dv;
				var dvt;
				var dvn;
				var flag;
				var vc = 0;
				var vcc;
				var resplen;
				var idx = 0;
				var ab = {};
				var bc = {};
				var mat;

				len = dataview.getUint16(offset, 1);
				//if(cell == 232) {alert(offset + "_VLEN: " + len);}
				offset += 2;
				for(c = 0; c < len; c++) {
					v[c] = {};
					v[c].x = dataview.getFloat32(offset, 1);
					v[c].y = dataview.getFloat32(offset + 4, 1);
					v[c].z = dataview.getFloat32(offset + 8, 1);
					v[c].a = [];
					offset += 12;
				}
				len = dataview.getUint16(offset, 1);
				//if(cell == 232) {alert(offset + "_TLEN: " + len);}
				offset += 2;
				for(c = 0; c < len; c++) {
					vt[c] = {};
					vt[c].s = dataview.getFloat32(offset, 1);
					vt[c].t = dataview.getFloat32(offset + 4, 1);
					vt[c].a = [];
					offset += 8;
				}
				len = dataview.getUint16(offset, 1);
				//if(cell == 232) {alert(offset + "_NLEN: " + len);}
				offset += 2;
				for(c = 0; c < len; c++) {
					vn[c] = {};
					vn[c].x = dataview.getFloat32(offset, 1);
					vn[c].y = dataview.getFloat32(offset + 4, 1);
					vn[c].z = dataview.getFloat32(offset + 8, 1);
					vn[c].a = [];
					offset += 12;
				}

				model[cell].vertices = [];
				model[cell].normals = [];
				model[cell].textures = [];
				model[cell].shader = [];
				model[cell].materials = [];
				model[cell].colors = [];
				model[cell].indices = [];
				model[cell].collide = [];

				model[cell].vertices_obj = gl.createBuffer();
				model[cell].normals_obj = gl.createBuffer();
				model[cell].textures_obj = gl.createBuffer();
				model[cell].shader_obj = gl.createBuffer();
				model[cell].materials_obj = gl.createBuffer();
				model[cell].colors_obj = gl.createBuffer();
				model[cell].indices_obj = gl.createBuffer();

				resplen = ajax.response.byteLength;
				for(mat = 0; offset < resplen; mat++) {
					st = dataview.getUint8(offset);
					mt = dataview.getInt8(offset + 1);
					//if(st > 0) {alert(cell + "_SHA: " + st + '/' + mt);}
					offset += 2;
					if(mt == -1) {
						v3col[0] = dataview.getUint8(offset) / 255;
						v3col[1] = dataview.getUint8(offset + 1) / 255;
						v3col[2] = dataview.getUint8(offset + 2) / 255;
						v3col[3] = dataview.getUint8(offset + 3) / 255;
						//if(cell == 232) {alert(offset + "_COL: " + v3col[0] + '/' + v3col[1] + '/' + v3col[2] + '/' + v3col[3]);}
						offset += 4;
					}
					len = dataview.getUint16(offset, 1) * 3;
					//if(cell == 232) {alert(offset + "_LEN: " + len);}
					offset += 2;
					for(c = 0; c < len; c++) {
						dv = dataview.getUint16(offset, 1);
						offset += 2;
						if(mt == -1) {
							dvt = -1;
						}else{
							dvt = dataview.getInt16(offset, 1);
							offset += 2;
						}
						dvn = dataview.getUint16(offset, 1);
						//if(cell == 232) {alert(offset + "_VRT: " + (dv) + '/' + (dvt) + '/' + (dvn));}
						offset += 2;
						flag = 1;
						for(i = 0; i < v[dv].a.length; i++) {
							if(v[dv].a[i].vt == dvt && v[dv].a[i].vn == dvn && v[dv].a[i].vcol == mat) {
								vcc = v[dv].a[i].vc;
								flag = 0;
								break;
							}
						}
						if(flag) {
							i = v[dv].a.length;
							v[dv].a[i] = {};
							v[dv].a[i].vt = dvt;
							v[dv].a[i].vn = dvn;
							v[dv].a[i].vc = vc;
							v[dv].a[i].vcol = mat;
							vcc = vc;
							vc++;
							model[cell].vertices[vcc * 3] = v[dv].x;
							model[cell].vertices[vcc * 3 + 1] = v[dv].y;
							model[cell].vertices[vcc * 3 + 2] = v[dv].z;
// 							if(dvn < 0 || dvn > vn.length) {
// 								alert(cell + ") seg " + dvn + " > " + vn.length);
// 							}
// 							try {
// 								debug = vn[dvn].x;
// 							}catch(e) {
// 								alert(cell + ") catch " + dvn + " > " + vn.length);
// 							}
							model[cell].normals[vcc * 3] = vn[dvn].x;
							model[cell].normals[vcc * 3 + 1] = vn[dvn].y;
							model[cell].normals[vcc * 3 + 2] = vn[dvn].z;
							if(dvt == -1) {
								model[cell].textures[vcc * 2] = 0;
								model[cell].textures[vcc * 2 + 1] = 0;
							}else{
								model[cell].textures[vcc * 2] = vt[dvt].s;
								model[cell].textures[vcc * 2 + 1] = vt[dvt].t;
							}
							if(st > 127) {
								model[cell].collide[vcc] = 0;
								model[cell].shader[vcc] = st - 128;
							}else{
								model[cell].collide[vcc] = 1;
								model[cell].shader[vcc] = st;
							}
							model[cell].materials[vcc] = mt;
							model[cell].colors[vcc * 4] = v3col[0];
							model[cell].colors[vcc * 4 + 1] = v3col[1];
							model[cell].colors[vcc * 4 + 2] = v3col[2];
							model[cell].colors[vcc * 4 + 3] = v3col[3];
						}

						model[cell].indices[idx++] = vcc;
					}
				}

				model[cell].numindices = model[cell].indices.length;
				model[cell].numfaces = model[cell].numindices / 3;

				// Размер треугольника
				model[cell].trisize = [];
				model[cell].trisize_pol = [];
				model[cell].trinor = [];
				for(c = 0; c < model[cell].numfaces; c++) {

					ab.x = model[cell].vertices[model[cell].indices[c * 3 + 1] * 3] - model[cell].vertices[model[cell].indices[c * 3] * 3];
					ab.y = model[cell].vertices[model[cell].indices[c * 3 + 1] * 3 + 1] - model[cell].vertices[model[cell].indices[c * 3] * 3 + 1];
					ab.z = model[cell].vertices[model[cell].indices[c * 3 + 1] * 3 + 2] - model[cell].vertices[model[cell].indices[c * 3] * 3 + 2];

					bc.x = model[cell].vertices[model[cell].indices[c * 3 + 2] * 3] - model[cell].vertices[model[cell].indices[c * 3 + 1] * 3];
					bc.y = model[cell].vertices[model[cell].indices[c * 3 + 2] * 3 + 1] - model[cell].vertices[model[cell].indices[c * 3 + 1] * 3 + 1];
					bc.z = model[cell].vertices[model[cell].indices[c * 3 + 2] * 3 + 2] - model[cell].vertices[model[cell].indices[c * 3 + 1] * 3 + 2];

					model[cell].trinor[c] = {};
					model[cell].trinor[c] = normalize(cross(ab, bc));

					resplen = Math.sqrt((model[cell].vertices[model[cell].indices[c * 3] * 3] - model[cell].vertices[model[cell].indices[c * 3 + 1] * 3]) * (model[cell].vertices[model[cell].indices[c * 3] * 3] - model[cell].vertices[model[cell].indices[c * 3 + 1] * 3]) + (model[cell].vertices[model[cell].indices[c * 3] * 3 + 1] - model[cell].vertices[model[cell].indices[c * 3 + 1] * 3 + 1]) * (model[cell].vertices[model[cell].indices[c * 3] * 3 + 1] - model[cell].vertices[model[cell].indices[c * 3 + 1] * 3 + 1]) + (model[cell].vertices[model[cell].indices[c * 3] * 3 + 2] - model[cell].vertices[model[cell].indices[c * 3 + 1] * 3 + 2]) * (model[cell].vertices[model[cell].indices[c * 3] * 3 + 2] - model[cell].vertices[model[cell].indices[c * 3 + 1] * 3 + 2]));
					model[cell].trisize[c] = (resplen + spheresize) * (resplen + spheresize);
					model[cell].trisize_pol[c] = (resplen + spheight) * (resplen + spheight);
					flag = Math.sqrt((model[cell].vertices[model[cell].indices[c * 3 + 1] * 3] - model[cell].vertices[model[cell].indices[c * 3 + 2] * 3]) * (model[cell].vertices[model[cell].indices[c * 3 + 1] * 3] - model[cell].vertices[model[cell].indices[c * 3 + 2] * 3]) + (model[cell].vertices[model[cell].indices[c * 3 + 1] * 3 + 1] - model[cell].vertices[model[cell].indices[c * 3 + 2] * 3 + 1]) * (model[cell].vertices[model[cell].indices[c * 3 + 1] * 3 + 1] - model[cell].vertices[model[cell].indices[c * 3 + 2] * 3 + 1]) + (model[cell].vertices[model[cell].indices[c * 3 + 1] * 3 + 2] - model[cell].vertices[model[cell].indices[c * 3 + 2] * 3 + 2]) * (model[cell].vertices[model[cell].indices[c * 3 + 1] * 3 + 2] - model[cell].vertices[model[cell].indices[c * 3 + 2] * 3 + 2]));
					if(resplen < flag) {
						resplen = flag;
						model[cell].trisize[c] = (resplen + spheresize) * (resplen + spheresize);
						model[cell].trisize_pol[c] = (resplen + spheight) * (resplen + spheight);
					}
					flag = Math.sqrt((model[cell].vertices[model[cell].indices[c * 3 + 2] * 3] - model[cell].vertices[model[cell].indices[c * 3] * 3]) * (model[cell].vertices[model[cell].indices[c * 3 + 2] * 3] - model[cell].vertices[model[cell].indices[c * 3] * 3]) + (model[cell].vertices[model[cell].indices[c * 3 + 2] * 3 + 1] - model[cell].vertices[model[cell].indices[c * 3] * 3 + 1]) * (model[cell].vertices[model[cell].indices[c * 3 + 2] * 3 + 1] - model[cell].vertices[model[cell].indices[c * 3] * 3 + 1]) + (model[cell].vertices[model[cell].indices[c * 3 + 2] * 3 + 2] - model[cell].vertices[model[cell].indices[c * 3] * 3 + 2]) * (model[cell].vertices[model[cell].indices[c * 3 + 2] * 3 + 2] - model[cell].vertices[model[cell].indices[c * 3] * 3 + 2]));
					if(resplen < flag) {
						resplen = flag;
						model[cell].trisize[c] = (resplen + spheresize) * (resplen + spheresize);
						model[cell].trisize_pol[c] = (resplen + spheight) * (resplen + spheight);
					}
				}

				model[cell].vertices = new Float32Array(model[cell].vertices);
				model[cell].normals = new Float32Array(model[cell].normals);
				model[cell].textures = new Float32Array(model[cell].textures);
				model[cell].shader = new Float32Array(model[cell].shader);
				model[cell].materials = new Float32Array(model[cell].materials);
				model[cell].colors = new Float32Array(model[cell].colors);
				model[cell].indices = new Uint16Array(model[cell].indices);

				gl.bindBuffer(gl.ARRAY_BUFFER, model[cell].vertices_obj);
				gl.bufferData(gl.ARRAY_BUFFER, model[cell].vertices, gl.STATIC_DRAW);
				gl.bindBuffer(gl.ARRAY_BUFFER, model[cell].shader_obj);
				gl.bufferData(gl.ARRAY_BUFFER, model[cell].shader, gl.STATIC_DRAW);
				gl.bindBuffer(gl.ARRAY_BUFFER, model[cell].materials_obj);
				gl.bufferData(gl.ARRAY_BUFFER, model[cell].materials, gl.STATIC_DRAW);
				gl.bindBuffer(gl.ARRAY_BUFFER, model[cell].textures_obj);
				gl.bufferData(gl.ARRAY_BUFFER, model[cell].textures, gl.STATIC_DRAW);
				gl.bindBuffer(gl.ARRAY_BUFFER, model[cell].normals_obj);
				gl.bufferData(gl.ARRAY_BUFFER, model[cell].normals, gl.STATIC_DRAW);
				gl.bindBuffer(gl.ARRAY_BUFFER, model[cell].colors_obj);
				gl.bufferData(gl.ARRAY_BUFFER, model[cell].colors, gl.STATIC_DRAW);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model[cell].indices_obj);
				gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, model[cell].indices, gl.STATIC_DRAW);

				model[cell].complete = 1;
				toload--;
				lightmoved++;

				if(typeof func === 'function') {
					func();
				}
			}
		};
	}

	function fpsoptimizer() { // ВСПМГ FPS оптимизация загрузки процессора - держит 24 кадра/сек
		fps = wgloop_cnt;
		fps24delay += Math.floor((fps - 24) * 1.7);
		cpuload = Math.floor(100 - fps24delay * 100 / 41);
		if(fps24delay <= 1) {
			fps24delay = 0;
			cpuload = 100;
		}
		if(cpuload < 0) {
			cpuload = 0;
		}
		if(!toload) {
			fpsdiv.innerHTML = 'fps: ' + fps + '; задержка: ' + fps24delay + 'мс; занято: ' + cpuload + '%; <b style="color: #090">всё загружено</b>; мышь: ' + debugmm;
		}else{
			fpsdiv.innerHTML = 'fps: ' + fps + '; задержка: ' + fps24delay + 'мс; занято: ' + cpuload + '%; не загружено: <b style="color: #f00">' + toload + '</b>; мышь: ' + debugmm;
		}
		//fpsdiv.innerHTML = fps24delay + 'мс; ' + cpuload + '%';
		debugmm = 0;
		wgloop_cnt = 0;
		setTimeout(fpsoptimizer, 1000);
	}

	function wsact() {
		// web socket
		if(chat_wait) {
			ws.send(chat_tosend);
			chat_wait = 0;
		}else{
			ws.send('c|' + curtri + '|' + x + '|' + y + '|' + z + '|' + rcos + '|' + rsin);
			surfdiv.innerHTML = "площадь: " + curtri + "; ws: " + chat_ctr++;
		}
	}

	function wgloop() { // Основной цикл
		var flag = false;
		var c;
		var spd = speed_max;
		var orot;
		dx = 0;
		dz = 0;
		dy = 0;
		ox = x;
		oy = y;
		oz = z;

		dblclick++;

		vecfwd = gofwd;
		dz = vecfwd;

		vecside = goside;
		dx = vecside;

		if(goup > 0) {
			vecup = goup;
			goup = 0;
		}
		dy = vecup - speed_gravity + pushup;
		if(vecup > 0) {
			vecup -= speed_fade;
		}

		roty = 0;
		if(gorot != 0) {
			roty = gorot;
		}else if(gorotx != 0) {
			rotx -= gorotx;
		}else{
			if(mdx != 0) {
				roty = -mdx * Pi / (realw / 2);
				if(roty > 0.5 || roty < -0.5) { // chrome mouse skew workaround
					roty = 0;
				}
			}
			if(mdy != 0) {
				rotx -= mdy * Pi / (realh / 2);
				if(rotx > 1 && rotx < -1) { // chrome mouse skew workaround
					rotx = 0;
				}
			}
		}
		mdx = 0;
		mdy = 0;

		// Вращение

		rcos = Math.cos(roty);
		rsin = Math.sin(roty);

		basis = mulmatrix4([
		rcos, 0, -rsin, 0,
		0, 1, 0, 0,
		rsin, 0, rcos, 0,
		0, 0, 0, 1
		], basis);

		rcos = basis[0];
		rsin = basis[8];

		translation = mulmatrix4([
		1, 0, 0, 0,
		0, Math.cos(rotx), Math.sin(rotx), 0,
		0, -Math.sin(rotx), Math.cos(rotx), 0,
		0, 0, 0, 1
		], basis);

// 		if(!plocked) {
// 			if(rotx > speed_rotation) { // Опускаем голову ;)
// 				if(rotx < Pi2) {
// 					rotx -= speed_rotation / 16;
// 					rotx = rotx < 0?Pi4 - rotx:rotx;
// 				}else{
// 					rotx += speed_rotation / 16;
// 					rotx = rotx > Pi4?rotx - Pi4:rotx;
// 				}
// 			}
// 		}

		// Перемещение

		if(dx != 0) {
			x += dx * basis[0];
			y += dx * basis[4];
			z += dx * basis[8];
		}
		if(dz != 0) {
			x += dz * basis[2];
			y += dz * basis[6];
			z += dz * basis[10];
		}
		if(dy != 0) {
			x += dy * basis[1];
			y += dy * basis[5];
			z += dy * basis[9];
		}

		// Столкновения

		if(collider()) {
			x = ox;
			y = oy;
			z = oz;
		}

		var r = parseInt(rotx * 100) - (parseInt(rotx) * 100);
		xyzdiv.innerHTML = 'x: ' + parseInt(x) + '; y: ' + parseInt(y) + '; z: ' + parseInt(z) + '; h: ' + (Math.sqrt(x * x + y * y + z * z) - 501.7).toPrecision(4);

		// animate light
		light[3]++;
		if(light[3] % 5 == 0) {

			if(skycolor[3] == 1) {
				// к вечеру 0.88 0.51 0.10
				skycolor[0] -= (skycolor[5] - 1.0) / 256;
				skycolor[1] -= (skycolor[6] - 1.0) / 256;
				skycolor[2] -= (skycolor[7] - 0.9) / 256;
				fog_intensity -= 9 / 256;
				if(skycolor[4] > 256) {
					skycolor[3] = 2;
					skycolor[4] = 0;
					skycolor[5] = skycolor[0];
					skycolor[6] = skycolor[1];
					skycolor[7] = skycolor[2];
				}
				skycolor[4]++;
			}else if(skycolor[3] == 2) {
				// к ночи 0.01 0.13 0.26
				skycolor[0] -= (skycolor[5] - 1.0) / 256;
				skycolor[1] -= (skycolor[6] - 1.0) / 256;
				skycolor[2] -= (skycolor[7] - 0.8) / 256;
				fog_intensity += 2 / 256;
				if(skycolor[4] > 256) {
					skycolor[3] = 3;
					skycolor[4] = 0;
					skycolor[5] = skycolor[0];
					skycolor[6] = skycolor[1];
					skycolor[7] = skycolor[2];
				}
				skycolor[4]++;
			}else if(skycolor[3] == 3) {
				// к утру 0.97 0.98 0.67
				skycolor[0] -= (skycolor[5] - 0.8) / 256;
				skycolor[1] -= (skycolor[6] - 1.0) / 256;
				skycolor[2] -= (skycolor[7] - 1.0) / 256;
				fog_intensity -= 1 / 256;
				if(skycolor[4] > 256) {
					skycolor[3] = 4;
					skycolor[4] = 0;
					skycolor[5] = skycolor[0];
					skycolor[6] = skycolor[1];
					skycolor[7] = skycolor[2];
				}
				skycolor[4]++;
			}else if(skycolor[3] == 4) {
				// к дню 0.55 0.72 1.0
				skycolor[0] -= (skycolor[5] - 1.0) / 256;
				skycolor[1] -= (skycolor[6] - 0.8) / 256;
				skycolor[2] -= (skycolor[7] - 1.0) / 256;
				fog_intensity += 8 / 256;
				if(skycolor[4] > 256) {
					skycolor[3] = 1;
					skycolor[4] = 0;
					skycolor[5] = 1;
					skycolor[6] = 1;
					skycolor[7] = 1;
					fog_intensity = 10;
				}
				skycolor[4]++;
			}

			debugdiv.innerHTML = fog_intensity.toFixed(2) + '; ' + skycolor[0].toFixed(2) + '; ' + skycolor[1].toFixed(2) + '; ' + skycolor[2].toFixed(2);

// 			if(light[4] != 123) {
// 				light[0]++;
// 				if(light[0] > 150) {
// 					light[4] = 123;
// 				}
// 			}else if(light[5] != 123) {
// 				light[0]--;
// 				if(light[0] < 50) {
// 					light[5] = 123;
// 				}
// 			}else if(light[6] != 123) {
// 				light[2]++;
// 				if(light[2] > 150) {
// 					light[6] = 123;
// 				}
// 			}else if(light[7] != 123) {
// 				light[2]--;
// 				if(light[2] < 30) {
// 					light[7] = 0;
// 					light[4] = 0;
// 					light[6] = 0;
// 					light[5] = 0;
// 				}
// 			}
// 			//light[1] = y + 40 * basis[5];
// 			//light[2] = z + 40 * basis[9];
//
// 			sun[0].x = light[0];
// 			sun[0].y = light[1];
// 			sun[0].z = light[2];
// 			sun[0].roty = 0;
// 			sun[0].rotx = -1;
// 			//sun[0].basis = basis;
// 			sun[0].mvm = mulmatrix4(mulmatrix4([
// 			1, 0, 0, 0,
// 			0, Math.cos(sun[0].rotx), Math.sin(sun[0].rotx), 0,
// 			0, -Math.sin(sun[0].rotx), Math.cos(sun[0].rotx), 0,
// 			0, 0, 0, 1
// 			], mulmatrix4([
// 			Math.cos(sun[0].roty), 0, -Math.sin(sun[0].roty), 0,
// 			0, 1, 0, 0,
// 			Math.sin(sun[0].roty), 0, Math.cos(sun[0].roty), 0,
// 			0, 0, 0, 1
// 			], sun[0].basis)), [
// 			1, 0, 0, 0,
// 			0, 1, 0, 0,
// 			0, 0, 1, 0,
// 			-sun[0].x, -sun[0].y, -sun[0].z, 1
// 			]);
// 			sun[0].matrix = mulmatrix4(ortho, sun[0].mvm);
//
// 			lightmoved++;
		}
// 		light[0] = x;
// 		light[1] = y;
// 		light[2] = z;

		// FIXME surface calculation code need to be quick
		var ta = {};
		var tb = {};
		var tc = {};
		var tn = {};
		var tp = {};
		var tla = {};
		var tlb = {};
		var d;
		var h1;
		var t;
		var tcnt = 0;
		var i;

		// orientation (on each move)
		tb.x = x;
		tb.y = y;
		tb.z = z;
		tb = normalize(tb);
		ta.x = basis[0];
		ta.y = basis[4];
		ta.z = basis[8];
		tc = normalize(cross(tb, ta));
		ta = normalize(cross(tc, tb));
		basis[0] = ta.x;
		basis[4] = ta.y;
		basis[8] = ta.z;
		basis[1] = tb.x;
		basis[5] = tb.y;
		basis[9] = tb.z;
		basis[2] = tc.x;
		basis[6] = tc.y;
		basis[10] = tc.z;

		for(c = 0; c < model[SPHERE].numindices; c += 3) {

			// old collider code

			ta.x = model[SPHERE].vertices[c * 3];
			ta.y = model[SPHERE].vertices[c * 3 + 1];
			ta.z = model[SPHERE].vertices[c * 3 + 2];
			tb.x = model[SPHERE].vertices[c * 3 + 3];
			tb.y = model[SPHERE].vertices[c * 3 + 4];
			tb.z = model[SPHERE].vertices[c * 3 + 5];
			tc.x = model[SPHERE].vertices[c * 3 + 6];
			tc.y = model[SPHERE].vertices[c * 3 + 7];
			tc.z = model[SPHERE].vertices[c * 3 + 8];

			tn.x = model[SPHERE].trinor[c / 3].x;
			tn.y = model[SPHERE].trinor[c / 3].y;
			tn.z = model[SPHERE].trinor[c / 3].z;

			d = 0 - ta.x * tn.x - ta.y * tn.y - ta.z * tn.z;

			h1 = tn.x * x + tn.y * y + tn.z * z + d;

			if(h1 * d <= 0) { // пересечение плоскости!
				t = 0 - h1 / (tn.x * -x + tn.y * -y + tn.z * -z);
				tp.x = x + -x * t;
				tp.y = y + -y * t;
				tp.z = z + -z * t;
				if(isintriangle(ta, tb, tc, tn, tp)) {
					oldtri = curtri;
					curtri = c / 3;
// 					tb.x = model[SPHERE].normals[c * 3];
// 					tb.y = model[SPHERE].normals[c * 3 + 1];
// 					tb.z = model[SPHERE].normals[c * 3 + 2];
// 					ta.x = basis[0];
// 					ta.y = basis[4];
// 					ta.z = basis[8];
// 					tc = normalize(cross(tb, ta));
// 					ta = normalize(cross(tc, tb));
// 					basis[0] = ta.x;
// 					basis[4] = ta.y;
// 					basis[8] = ta.z;
// 					basis[1] = tb.x;
// 					basis[5] = tb.y;
// 					basis[9] = tb.z;
// 					basis[2] = tc.x;
// 					basis[6] = tc.y;
// 					basis[10] = tc.z;

					if(curtri != oldtri) {
						for(i = 0; i < neighbour[curtri].length; i++) {
							if(!model[neighbour[curtri][i]].complete) {
								toload++;
								try { if(!model[neighbour[curtri][i]].texture2.complete) {
									toload++;
								}}catch(e) { toload++; }
								try { if(!model[neighbour[curtri][i]].texture3.complete) {
									toload++;
								}}catch(e) { toload++; }
								loadmodel('np3/' + neighbour[curtri][i], neighbour[curtri][i]);
							}
						}
					}

					if(!model[curtri].numindices) {
						//alert('Вы собираетесь перейти на треугольник, который еще не загружен. У вас что-то с интернетом не так?');
						x = ox;
						y = oy;
						z = oz;
					}else{

						// подвинуть вниз
						ox = x;
						oy = y;
						oz = z;
// 						x -= (0.1 - pushup) * basis[1];
// 						y -= (0.1 - pushup) * basis[5];
// 						z -= (0.1 - pushup) * basis[9];

						pushup = 0;
						spheight_x = x - spheight * basis[1];
						spheight_y = y - spheight * basis[5];
						spheight_z = z - spheight * basis[9];
// 						d = Math.sqrt((spheight_x - x) * (spheight_x - x) + (spheight_y - y) * (spheight_y - y) + (spheight_z - z) * (spheight_z - z));
// 						if(Math.abs(d) > 3) {
// 							alert("d! -> " + d);
// 						}

						if(collider()) {
							x = ox;
							y = oy;
							z = oz;
						}
					}

					break;
				}
			}
		}
		surfdiv.innerHTML = "площадь: " + curtri + "; ws: " + chat_ctr;

		// draw

		if(lightmoved) {
			// shadow test
			gl.useProgram(depth_sh);
			gl.bindFramebuffer(gl.FRAMEBUFFER, sun[0].shadow_fb);
			gl.viewport(0, 0, shadow_texture_size, shadow_texture_size);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

			gl.uniformMatrix4fv(depth_sh.matrix, false, sun[0].matrix);
			gl.uniform3fv(depth_sh.light, [light[0], light[1], light[2]]);

			for(c = 0; c < neighbour[curtri].length; c++) {
				if(model[neighbour[curtri][c]].complete) {

					gl.bindBuffer(gl.ARRAY_BUFFER, model[neighbour[curtri][c]].vertices_obj);
					gl.vertexAttribPointer(depth_sh.vrt, 3, gl.FLOAT, false, 0, 0);

					gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model[neighbour[curtri][c]].indices_obj);

					gl.drawElements(gl.TRIANGLES, model[neighbour[curtri][c]].numindices, gl.UNSIGNED_SHORT, 0);
				}
			}
			gl.bindTexture(gl.TEXTURE_2D, sun[0].shadow_txt);
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.bindTexture(gl.TEXTURE_2D, null);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			// <-- shadow test
			lightmoved--;
		}

// 		// render skybox
// 		if(model[SKYBOX].complete) {
// 			surfdiv.innerHTML = "!: " + model[SKYBOX].texture2.complete;
// 			transform = mulmatrix4(perspective, translation);
// 			gl.uniformMatrix4fv(sh.transform, false, transform);
//
// 			gl.activeTexture(gl.TEXTURE2);
// 			gl.bindTexture(gl.TEXTURE_2D, model[SKYBOX].texture2);
// 			gl.uniform1i(sh.sample2, 2);
// 			gl.activeTexture(gl.TEXTURE3);
// 			gl.bindTexture(gl.TEXTURE_2D, model[SKYBOX].texture3);
// 			gl.uniform1i(sh.sample3, 3);
//
// 			gl.bindBuffer(gl.ARRAY_BUFFER, model[SKYBOX].vertices_obj);
// 			gl.vertexAttribPointer(sh.vrt, 3, gl.FLOAT, false, 0, 0);
// 			gl.bindBuffer(gl.ARRAY_BUFFER, model[SKYBOX].shader_obj);
// 			gl.vertexAttribPointer(sh.sha, 1, gl.FLOAT, false, 0, 0);
// 			gl.bindBuffer(gl.ARRAY_BUFFER, model[SKYBOX].materials_obj);
// 			gl.vertexAttribPointer(sh.mat, 1, gl.FLOAT, false, 0, 0);
// 			gl.bindBuffer(gl.ARRAY_BUFFER, model[SKYBOX].textures_obj);
// 			gl.vertexAttribPointer(sh.txt, 2, gl.FLOAT, false, 0, 0);
// 			gl.bindBuffer(gl.ARRAY_BUFFER, model[SKYBOX].normals_obj);
// 			gl.vertexAttribPointer(sh.nor, 3, gl.FLOAT, false, 0, 0);
// 			gl.bindBuffer(gl.ARRAY_BUFFER, model[SKYBOX].colors_obj);
// 			gl.vertexAttribPointer(sh.col, 4, gl.FLOAT, false, 0, 0);
// 			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model[SKYBOX].indices_obj);
//
// 			gl.drawElements(gl.TRIANGLES, model[SKYBOX].numindices, gl.UNSIGNED_SHORT, 0);
// 		}

		// render normal

		gl.useProgram(sh);
		gl.clearColor(skycolor[0], skycolor[1], skycolor[2], 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		gl.uniform1i(sh.isplayer, 0);
		gl.uniform3fv(sh.light, [light[0], light[1], light[2]]);

		translation = mulmatrix4(translation, [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		-x, -y, -z, 1
		]);
		transform = mulmatrix4(perspective, translation);

		if(!depthview) {
			gl.uniformMatrix4fv(sh.transform, false, transform);
			gl.uniform3fv(sh.pos, [x, y, z]);
			gl.uniform3fv(sh.skycol, [skycolor[0], skycolor[1], skycolor[2]]);
			gl.uniform1f(sh.fog_intensity, fog_intensity);
		}else{
			// Вид из ИС
			gl.uniformMatrix4fv(sh.transform, false, sun[0].matrix);
			gl.uniform3fv(sh.pos, [sun[0].x, sun[0].y, sun[0].z]);
			gl.uniform3fv(sh.skycol, [skycolor[0], skycolor[1], skycolor[2]]);
			gl.uniform1f(sh.fog_intensity, fog_intensity);
		}

		// draw scene

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, texture0);
		gl.uniform1i(sh.sample0, 0);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, texture1);
		gl.uniform1i(sh.sample1, 1);

		gl.activeTexture(gl.TEXTURE4);
		gl.bindTexture(gl.TEXTURE_2D, sun[0].shadow_txt);
		gl.uniform1i(sh.shadow_sample, 4);
		gl.uniformMatrix4fv(sh.shadow_matrix, false, sun[0].matrix);
		gl.uniformMatrix4fv(sh.shadow_mvm, false, sun[0].mvm);

		for(c = 0; c < neighbour[curtri].length; c++) {
			if(model[neighbour[curtri][c]].complete) {

				gl.activeTexture(gl.TEXTURE2);
				gl.bindTexture(gl.TEXTURE_2D, model[neighbour[curtri][c]].texture2);
				gl.uniform1i(sh.sample2, 2);
				gl.activeTexture(gl.TEXTURE3);
				gl.bindTexture(gl.TEXTURE_2D, model[neighbour[curtri][c]].texture3);
				gl.uniform1i(sh.sample3, 3);

				gl.bindBuffer(gl.ARRAY_BUFFER, model[neighbour[curtri][c]].vertices_obj);
				gl.vertexAttribPointer(sh.vrt, 3, gl.FLOAT, false, 0, 0);
				gl.bindBuffer(gl.ARRAY_BUFFER, model[neighbour[curtri][c]].shader_obj);
				gl.vertexAttribPointer(sh.sha, 1, gl.FLOAT, false, 0, 0);
				gl.bindBuffer(gl.ARRAY_BUFFER, model[neighbour[curtri][c]].materials_obj);
				gl.vertexAttribPointer(sh.mat, 1, gl.FLOAT, false, 0, 0);
				gl.bindBuffer(gl.ARRAY_BUFFER, model[neighbour[curtri][c]].textures_obj);
				gl.vertexAttribPointer(sh.txt, 2, gl.FLOAT, false, 0, 0);
				gl.bindBuffer(gl.ARRAY_BUFFER, model[neighbour[curtri][c]].normals_obj);
				gl.vertexAttribPointer(sh.nor, 3, gl.FLOAT, false, 0, 0);
				gl.bindBuffer(gl.ARRAY_BUFFER, model[neighbour[curtri][c]].colors_obj);
				gl.vertexAttribPointer(sh.col, 4, gl.FLOAT, false, 0, 0);
				gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model[neighbour[curtri][c]].indices_obj);

				gl.drawElements(gl.TRIANGLES, model[neighbour[curtri][c]].numindices, gl.UNSIGNED_SHORT, 0);
			}
		}

		// draw players

		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, model[BARE_PLAYER].texture2);
		gl.uniform1i(sh.sample2, 2);
		gl.activeTexture(gl.TEXTURE3);
		gl.bindTexture(gl.TEXTURE_2D, model[BARE_PLAYER].texture3);
		gl.uniform1i(sh.sample3, 3);

		gl.uniform1i(sh.isplayer, 1);

		tb.x = model[SPHERE].trinor[curtri].x;
		tb.y = model[SPHERE].trinor[curtri].y;
		tb.z = model[SPHERE].trinor[curtri].z;
		ta.x = 0;
		ta.y = 0;
		ta.z = 1;
		tc = normalize(cross(tb, ta));
		ta = normalize(cross(tc, tb));
		player_basis[0] = ta.x;
		player_basis[1] = ta.y;
		player_basis[2] = ta.z;
		player_basis[4] = tb.x;
		player_basis[5] = tb.y;
		player_basis[6] = tb.z;
		player_basis[8] = tc.x;
		player_basis[9] = tc.y;
		player_basis[10] = tc.z;

		gl.uniformMatrix4fv(sh.player_basis, false, player_basis);

		for(c = 0; c < users; c++) {

			// uniforms
			// int isplayer
			// roty matrix (omitted for now)
			// xyz matrix
			// perspective matrix
			gl.uniformMatrix4fv(sh.player_transform, false, player_transform[c]);
			gl.uniformMatrix4fv(sh.player_rotation, false, player_rotation[c]);

			gl.bindBuffer(gl.ARRAY_BUFFER, model[BARE_PLAYER].vertices_obj);
			gl.vertexAttribPointer(sh.vrt, 3, gl.FLOAT, false, 0, 0);
			gl.bindBuffer(gl.ARRAY_BUFFER, model[BARE_PLAYER].shader_obj);
			gl.vertexAttribPointer(sh.sha, 1, gl.FLOAT, false, 0, 0);
			gl.bindBuffer(gl.ARRAY_BUFFER, model[BARE_PLAYER].materials_obj);
			gl.vertexAttribPointer(sh.mat, 1, gl.FLOAT, false, 0, 0);
			gl.bindBuffer(gl.ARRAY_BUFFER, model[BARE_PLAYER].textures_obj);
			gl.vertexAttribPointer(sh.txt, 2, gl.FLOAT, false, 0, 0);
			gl.bindBuffer(gl.ARRAY_BUFFER, model[BARE_PLAYER].normals_obj);
			gl.vertexAttribPointer(sh.nor, 3, gl.FLOAT, false, 0, 0);
			gl.bindBuffer(gl.ARRAY_BUFFER, model[BARE_PLAYER].colors_obj);
			gl.vertexAttribPointer(sh.col, 4, gl.FLOAT, false, 0, 0);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, model[BARE_PLAYER].indices_obj);

			gl.drawElements(gl.TRIANGLES, model[BARE_PLAYER].numindices, gl.UNSIGNED_SHORT, 0);
		}

		// Повторный запуск самой себя
		wgloop_cnt++;
		setTimeout(wgloop, fps24delay);
	}

	function shadow() {
		sun[0] = {};

		// Famebuffer for shadow
		sun[0].shadow_fb = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, sun[0].shadow_fb);
		sun[0].shadow_fb.width = shadow_texture_size;
		sun[0].shadow_fb.height = shadow_texture_size;

		sun[0].shadow_txt = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, sun[0].shadow_txt);

		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, sun[0].shadow_fb.width, sun[0].shadow_fb.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		//gl.generateMipmap(gl.TEXTURE_2D);

		sun[0].shadow_rb = gl.createRenderbuffer();
		gl.bindRenderbuffer(gl.RENDERBUFFER, sun[0].shadow_rb);
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, sun[0].shadow_fb.width, sun[0].shadow_fb.height);

		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sun[0].shadow_txt, 0);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, sun[0].shadow_rb);

		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		// suns
		sun[0].x = light[0];
		sun[0].y = light[1];
		sun[0].z = light[2];
		sun[0].roty = 0;
		sun[0].rotx = -3.14159265359/1.1; // 1.4
		sun[0].basis = basis;
		sun[0].mvm = mulmatrix4(mulmatrix4([
		1, 0, 0, 0,
		0, Math.cos(sun[0].rotx), Math.sin(sun[0].rotx), 0,
		0, -Math.sin(sun[0].rotx), Math.cos(sun[0].rotx), 0,
		0, 0, 0, 1
		], mulmatrix4([
		Math.cos(sun[0].roty), 0, -Math.sin(sun[0].roty), 0,
		0, 1, 0, 0,
		Math.sin(sun[0].roty), 0, Math.cos(sun[0].roty), 0,
		0, 0, 0, 1
		], sun[0].basis)), [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		-sun[0].x, -sun[0].y, -sun[0].z, 1
		]);
		sun[0].matrix = mulmatrix4([
			0.0025, 0, 0, 0,
			0, 0.0025, 0, 0,
			0, 0, -0.0002, 0,
			0, 0, 0, 1
		], sun[0].mvm);

		lightmoved++;
	}

	function wsinit() {
		var d = [];
		var c;
		var i;
		var vec4 = [];
		var strlen = 'горожанин';
		strlen = strlen.length;

		ws = new WebSocket(server);
		mykey = -1;

		ws.onopen = function() { ws.send('Низкополигонец'); };
		ws.onclose = function() { alert('Соединение закрыто, вы тут совсем одиноки'); };
		ws.onerror = function() { alert('Ошибка соединения с сервером. Вы находитесь в параллельной реальности и будете в этой реальности одиноки, пока не перегрузите страничку ;)'); };
		ws.onmessage = function(e) {
			if(wsconnect) {
				if(e.data.substr(0, strlen) == 'горожанин') {
					ws.send(myname);
				}else{
					mykey = parseInt(e.data);
					wsconnect = 0;
					wsact();
				}
			}else{
				//alert(mykey + " >>> " + e.data);
				try{ d = JSON.parse(e.data); } catch(e) { alert(e.data); }
	// 			for(c = 0; c < d.length; c++) {
	// 				if(d[c].key != mykey) {
	// 					model[PLAYERS].xyz[d[c].key].x = parseFloat(d[c].x);
	// 					model[PLAYERS].xyz[d[c].key].y = parseFloat(d[c].y);
	// 					model[PLAYERS].xyz[d[c].key].z = parseFloat(d[c].z);
	// 				}
	// 			}
				if(!d.length) {
					chatdiv.innerHTML = '';
				}else if(d[0].chat) {
					chatdiv.innerHTML = '';
					for(c = 0; c < d.length; c++) {
						chatdiv.innerHTML += "<div><b>" + d[c].name + "</b>: " + d[c].msg + "</div>";
					}
				}else{
					for(c = 0; c < users; c++) {
						// player matrices

						player_rotation[c] = [
							parseFloat(d[c].c), 0, parseFloat(d[c].s), 0,
							0, 1, 0, 0,
							-parseFloat(d[c].s), 0, parseFloat(d[c].c), 0,
							0, 0, 0, 1
						];

						player_transform[c] = [
							1, 0, 0, 0,
							0, 1, 0, 0,
							0, 0, 1, 0,
							parseFloat(d[c].x), parseFloat(d[c].y), parseFloat(d[c].z), 1
						];

						// player name divs

						vec4 = mulmatrix4vector(transform, d[c].x, d[c].y, d[c].z, 1);

						vec4[0] /= vec4[3];
						vec4[1] /= vec4[3];

						vec4[0]++;
						vec4[1]--;

						if(vec4[3] < 0 || vec4[0] < 0 || vec4[0] > 2 || vec4[1] > 0 || vec4[1] < -2) {
							if(marker[c].block) {
								marker[c].style.display = 'none';
								marker[c].block = 0;
							}
						}else{
							vec4[0] = vec4[0] * realw / 2;
							vec4[1] = vec4[1] * realh / -2;

							if(marker[c].block == 0) {
								marker[c].style.display = 'block';
								marker[c].block = 1;
							}
							marker[c].innerHTML = d[c].n;
							marker[c].style.left = (vec4[0] - marker[c].offsetWidth / 2) + "px";
							marker[c].style.top = vec4[1] + "px";
						}
					}
				}
				setTimeout(wsact, cpuload + 41);
			}
			//alert(d.length);
		};
	}

	function init() { // Инициализация

		var c;
		var i;
		var offset;
		var ajax;

		// Открываем контекст

		canvas = document.getElementById('npcontext');

		// fullscreen
// 		if(document.documentElement.requestFullscreen) {
// 			document.documentElement.requestFullscreen();
// 		}else if(document.documentElement.mozRequestFullScreen) {
// 			document.documentElement.mozRequestFullScreen();
// 		}else if(document.documentElement.webkitRequestFullscreen) {
// 			document.documentElement.webkitRequestFullscreen();
// 		}

		if(window.WebGLRenderingContext) {
			try { gl = canvas.getContext('experimental-webgl'); }catch(e){}
			if(!gl) { try { gl = canvas.getContext('webgl'); }catch(e){} }
		}

		if(!gl) {
			document.getElementById('chat').style.display = 'none';
			document.getElementById('fps').style.display = 'none';
			document.getElementById('debug').style.display = 'none';
			document.getElementById('xyz').style.display = 'none';
			document.getElementById('surf').style.display = 'none';
			initdiv.style.display = 'none';
			document.getElementById('npcontext').style.display = 'none';
			document.getElementById('wglmsg').style.display = 'inline';
			document.getElementById('wglmsg').innerHTML = 'Проблема с запуском webGL';
			document.getElementById('wglmsgdiv').style.display = 'inline';
			document.getElementById('wglmsgdiv').innerHTML = '<br /><br />Скорее всего ваш браузер не поддерживает webGL. Включите поддержку webGL и зайдите снова на эту страницу.<br /><br />На данный момент все популярные браузеры имеют поддержку webGL, вероятно вам стоит включить эту функцию или обновить ваш браузер или воспользоваться одним из: firefox, opera или chrome. Я уж не знаю на счет safari, но должен тоже.<br /><br />Из-за того, что эта функция может находиться в эксперементальных возможностях старых браузеров - обратитесь в google с вопросом о том как включить поддержку webGL для вашего браузера.<br /><br />Для мобильных устройств, я знаю точно, что работает старая opera classic для андроид. Хром тоже должен, но там нужно что-то нажать в настройках. В общем должно быть не слишком сложно ;)';
			return;
		}
		//alert("openGL: " + gl.getParameter(gl.VERSION) + "\nGLSL: " + gl.getParameter(gl.SHADING_LANGUAGE_VERSION) + "\nvendor: " + gl.getParameter(gl.VENDOR));

		// Чатик

		chatdiv = document.getElementById('chat');
		chatfrm = document.getElementById('chatfrm');
		chatmsg = document.getElementById('chatmsg');
		chatform = document.getElementById('chatform');
		chattxt = document.getElementById('chattxt');

		chatfrm.onsubmit = function() {
			chatform.style.display = 'none';
			chattxt.style.height = '300px';
			if(chatmsg.value.length) {
				chat_tosend = "s|" + chatmsg.value;
				chat_wait = 1;
			}
			chatmsg.value = "";
			setTimeout(function() { chaton = 0; }, 300);
			return false;
		}

		fpsdiv = document.getElementById('fps');
		debugdiv = document.getElementById('debug');
		xyzdiv = document.getElementById('xyz');
		surfdiv = document.getElementById('surf');

		markdiv = document.getElementById('mark');
		for(c = 0; c < users; c++) {
			marker[c] = document.createElement('div');
			marker[c].className = 'marker';
			marker[c].block = 0;
			markdiv.appendChild(marker[c]);
		}

		// Настраиваем окно

		realw = window.innerWidth;
		realh = window.innerHeight;
		if(realw > maxwidth) {
			czoomw = realw / maxwidth;
		}
		if(realh > maxheight) {
			czoomh = realh / maxheight;
		}
		if(czoomw < czoomh) {
			czoomw = czoomh;
		}

		if(czoomw > 1) {
			czoomh = parseInt(czoomw * 100);
			czoomw = czoomh / 100;
// 			document.body.style.zoom = czoomh + "%";
// 			document.body.style.MozTransform = 'scale(' + czoomw + ')';
			canvas.width = realw / czoomw;
			canvas.height = realh / czoomw;
			canvas.style.transform = 'scale(' + czoomw + ')';
		}else{
			canvas.width = realw;
			canvas.height = realh;
		}

		gl.viewportWidth = canvas.width;
		gl.viewportHeight = canvas.height;

		document.getElementById('center').style.left = realw / 2 - 8 + "px";
		document.getElementById('center').style.top = realh / 2 - 8 + "px";

		gl.clearColor(0.0, 0.7, 1.0, 1.0);
		gl.enable(gl.DEPTH_TEST);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		// Шейдеры

		fs = getsh("fs");
		vs = getsh("vs");

		sh = gl.createProgram();
		gl.attachShader(sh, vs);
		gl.attachShader(sh, fs);
		gl.linkProgram(sh);

		if(!gl.getProgramParameter(sh, gl.LINK_STATUS)) {
			alert("Не могу скомпилировать главный шейдер");
		}

		sh.vrt = gl.getAttribLocation(sh, "vrt");
		gl.enableVertexAttribArray(sh.vrt);
		sh.sha = gl.getAttribLocation(sh, "sha");
		gl.enableVertexAttribArray(sh.sha);
		sh.mat = gl.getAttribLocation(sh, "mat");
		gl.enableVertexAttribArray(sh.mat);
		sh.txt = gl.getAttribLocation(sh, "txt");
		gl.enableVertexAttribArray(sh.txt);
		sh.nor = gl.getAttribLocation(sh, "nor");
		gl.enableVertexAttribArray(sh.nor);
		sh.col = gl.getAttribLocation(sh, "col");
		gl.enableVertexAttribArray(sh.col);
		sh.transform = gl.getUniformLocation(sh, "transform");

		sh.light = gl.getUniformLocation(sh, "light");
		sh.pos = gl.getUniformLocation(sh, "pos");
		sh.skycol = gl.getUniformLocation(sh, "skycol");
		sh.fog_intensity = gl.getUniformLocation(sh, "fog_intensity");

		sh.isplayer = gl.getUniformLocation(sh, "isplayer");
		sh.player_transform = gl.getUniformLocation(sh, "player_transform");
		sh.player_rotation = gl.getUniformLocation(sh, "player_rotation");
		sh.player_basis = gl.getUniformLocation(sh, "player_basis");
		sh.sample0 = gl.getUniformLocation(sh, "sample0");
		sh.sample1 = gl.getUniformLocation(sh, "sample1");
		sh.sample2 = gl.getUniformLocation(sh, "sample2");
		sh.sample3 = gl.getUniformLocation(sh, "sample3");

		sh.shadow_matrix = gl.getUniformLocation(sh, "shadow_matrix");
		sh.shadow_mvm = gl.getUniformLocation(sh, "shadow_mvm");
		sh.shadow_sample = gl.getUniformLocation(sh, "shadow_sample");

		gl.useProgram(sh);

		// DEPTH_SHADER
		depth_fs = getsh("depth_fs");
		depth_vs = getsh("depth_vs");

		depth_sh = gl.createProgram();
		gl.attachShader(depth_sh, depth_vs);
		gl.attachShader(depth_sh, depth_fs);
		gl.linkProgram(depth_sh);

		if(!gl.getProgramParameter(depth_sh, gl.LINK_STATUS)) {
			alert("Не могу скомпилировать шейдер depth");
		}

		depth_sh.vrt = gl.getAttribLocation(depth_sh, "vrt");
		gl.enableVertexAttribArray(depth_sh.vrt);
		depth_sh.matrix = gl.getUniformLocation(depth_sh, "matrix");
		depth_sh.light = gl.getUniformLocation(depth_sh, "light");

		gl.useProgram(depth_sh);

		//gl.enable(gl.CULL_FACE);
    //gl.cullFace(gl.BACK_AND_FRONT);

		// Загрузка текстур

		texture0 = gl.createTexture();
		texture1 = gl.createTexture();
		texture0.img = new Image();
		texture1.img = new Image();
		texture0.complete = 0;
		texture1.complete = 0;
		texture0.img.onload = function() {
			gl.bindTexture(gl.TEXTURE_2D, texture0);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture0.img);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST); // _LINEAR_MIPMAP_NEAREST
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			gl.bindTexture(gl.TEXTURE_2D, null);
			texture0.complete = 1;
		};
		texture1.img.onload = function() {
			gl.bindTexture(gl.TEXTURE_2D, texture1);
			gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture1.img);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST); // _LINEAR_MIPMAP_NEAREST
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			gl.bindTexture(gl.TEXTURE_2D, null);
			texture1.complete = 1;
		};

		// Загрузка моделей

		for(c = 0; c <= triangles + 1; c++) {
			model[c] = {};
		}
		curtri = 1;

		// Загрузка соседей

		ajax = new XMLHttpRequest();
		ajax.open('GET', '/np3/neighbour.json');
		ajax.send();
		ajax.onreadystatechange = function() {
			if(ajax.readyState == 4) {
				neighbour = JSON.parse(ajax.response);
			}
		};
	}

	function initmatrices() {
		gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

		// Matrices

		perspective = [
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 1, // <-- point perspective projection
			0, 0, 0, 1
		];
		perspective = [
			2 * (gl.viewportHeight / gl.viewportWidth), 0, 0, 0,
			0, 2, 0, 0,
			0, 0, -1, -1,
			0, 0, -1, 0
		];
		perspective = [
			2 * (gl.viewportHeight / gl.viewportWidth), 0, 0, 0,
			0, -2, 0, 0,
			0, 0, -1.0002, -1,
			0, 0, -0.1, 0
		];
		ortho = [
			2/(gl.viewportWidth / 2), 0, 0, 0,
			0, -2/(gl.viewportHeight / 2), 0, 0,
			0, 0, 0.0002, 0,
			0, 0, 0, 1
		];
		//perspective = ortho;
		identity = [
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		];
		for(c = 0; c < users; c++) {
			player_transform[c] = identity;
			player_rotation[c] = identity;
		}
		player_basis = identity;
		basis = identity;
		translation = identity;
		transform = perspective;

		translation = mulmatrix4(basis, [
		1, 0, 0, 0,
		0, 1, 0, 0,
		0, 0, 1, 0,
		-x, -y, -z, 1
		]);
		transform = mulmatrix4(basis, translation);
	}

	function initcontrol() {
		window.onkeydown = function(e) {
			var kc = e.keyCode?e.keyCode:e.charCode;
			if(!chaton) {
				if(kc == 32) { // space
					if(!isjump) {
						goup = speed_up;
						isjump = true;
					}
				}else if(kc == 16) { // shift
					speed_fwd = speed_run;
					if(gofwd == speed_walk) {
						gofwd = speed_fwd;
					}
				}else if(kc == 83) { // s
					if(gofwd == speed_run) {
						dblclick_run = dblclick;
					}
					if(dblclick - dblclick_run < DOUBLECLICK) {
						gofwd = -speed_run;
					}else{
						gofwd = -speed_fwd;
					}
				}else if(kc == 87) { // w
					if(gofwd == speed_run) {
						dblclick_run = dblclick;
					}
					if(dblclick - dblclick_run < DOUBLECLICK) {
						gofwd = speed_run;
					}else{
						gofwd = speed_fwd;
					}
				}else if(kc == 68) { // a
					goside = speed_side;
				}else if(kc == 65) { // d
					goside = -speed_side;
				}else if(kc == 39) { // left
					gorot = -speed_rotation;
				}else if(kc == 37) { // right
					gorot = speed_rotation;
				}else if(kc == 40) { // up
					gorotx = speed_rotation;
				}else if(kc == 38) { // down
					gorotx = -speed_rotation;
				}else if(kc == 107) { // +
					x = parseFloat(prompt("Введите X:"));
					y = parseFloat(prompt("Введите Y:"));
					z = parseFloat(prompt("Введите Z:"));
				}else if(kc == 109) { // -
					depthview = depthview?0:1;
				}
			}
		}

		window.onkeyup = function(e) {
			var kc = e.keyCode?e.keyCode:e.charCode;

			if(kc == 32) {
				goup = 0;
			}else if(kc == 16) { // shift
				speed_fwd = speed_walk;
				if(gofwd == speed_run) {
					gofwd = speed_fwd;
				}
			}else if(kc == 83 || kc == 87) { // w || s
				gofwd = 0;
				dblclick_run = dblclick;
			}else if(kc == 68 || kc == 65) { // a || d
				goside = 0;
			}else if(kc == 39 || kc == 37) { // left || right
					gorot = 0;
			}else if(kc == 40 || kc == 38) { // up || down
					gorotx = 0;
			}else if(kc == 13) { // enter chat
				if(chaton == 0) {
					chattxt.style.height = '270px';
					chatform.style.display = 'block';
					chatmsg.focus();
					chaton = 1;
				}
			}
		}

		window.onmousedown = function(e) {
			if(e.button == 0) {
				if(plocked) {
					if(dblclick - dblclick_run < DOUBLECLICK) {
						gofwd = speed_run;
						dblclick_run = dblclick;
					}else{
						gofwd = speed_fwd;
					}
				}else{
					if(e.button == 0) {
						mouse.left = true;
						mouse.x = e.pageX;
						mouse.y = e.pageY;
						mouse.move = false;
					}
				}
			}else if(e.button == 1) {
				if(!isjump) {
					goup = speed_up;
					isjump = true;
				}
			}
		}

		window.onmouseup = function(e) {

			if(e.button == 0) {
				if(plocked) {
					gofwd = 0;
					dblclick_run = dblclick;
				}else{
					mouse.left = false;
					if(mouse.move == false) {
						if(gofwd) {
							gofwd = 0;
						}else{
							gofwd = speed_fwd;
						}
					}
				}
			}
		}

		window.onmousemove = function(e) {

			debugmm++;

			if(plocked) {
				mdx = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
				mdy = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
			}else{
				if(mouse.left) {
					mdx = mouse.x - e.pageX;
					mdy = mouse.y - e.pageY;
					mouse.x = e.pageX;
					mouse.y = e.pageY;

					mouse.move = true;
				}
			}
		}

		window.ontouchstart = function(e) {
// 			alert('ts');
// 			if(touches.length > 1) {
// 				if(!isjump) {
// 					goup = speed_up;
// 					isjump = true;
// 				}
// 			}else{
// 				mouse.left = true;
				mouse.x = e.touches[0].pageX;
				mouse.y = e.touches[0].pageY;
// 				mouse.move = false;
// 			}
		}
// 		window.ontouchend = function() {
// // 			alert('te');
// 			mouse.left = false;
// // 			if(mouse.move == false) {
// // 				if(gofwd) {
// // 					gofwd = 0;
// // 				}else{
// // 					gofwd = speed_fwd;
// // 				}
// // 			}
// 		}
		window.ontouchmove = function(e) {
			//alert('tm');
			mdx = mouse.x - e.touches[0].pageX;
			//mdy = mouse.y - e.touches[0].pageY;
			mouse.x = e.touches[0].pageX;
			mouse.y = e.touches[0].pageY;

			mouse.move = true;
		}
	}

	function loadsync() {
		var firstload = 8;
// 		var vsego = 109;
// 		var fullload = 114;
		var vsego = 17;
		var fullload = 17;
		var i;
		var lold;

		if(init_loading == 0) {
			init_loading = 1;

			initdiv = document.getElementById('init');
			progressdiv = document.getElementById('progress');

			myname = "<!--formdata usrname-->";
			if(!myname) { myname = 'guest'; }

			init(); // 2

			texture0.img.src = "/np3/texture0.png"; // 3
			texture1.img.src = "/np3/texture1.jpg"; // 4

			loadmodel('0', SPHERE); // 5
			loadmodel(BARE_PLAYER, BARE_PLAYER); // 8

			loadmodel('np3/1', 1); // 5
			loadmodel('np3/2', 2); // 5
			loadmodel('np3/3', 3); // 5
			loadmodel('np3/4', 4); // 5
			loadmodel('np3/5', 5); // 5

			try { pstartlock() }catch(e) {}

		}else if(init_loading < firstload) {
			init_loading = 1;
			try{ if(texture0.complete) { init_loading++; } }catch(e) {};
			try{ if(texture1.complete) { init_loading++; } }catch(e) {};
			try{ if(neighbour.length > 0) { init_loading++; } }catch(e) {};
			try{ if(model[SPHERE].complete) { init_loading++; } }catch(e) {};
			try{ if(model[BARE_PLAYER].complete) { init_loading++; } }catch(e) {};
			try{ if(model[BARE_PLAYER].texture2.complete) { init_loading++; } }catch(e) {};
			try{ if(model[BARE_PLAYER].texture3.complete) { init_loading++; } }catch(e) {};
			//alert(init_loading);
		}else if(init_loading == firstload) {
			init_loading = firstload + 1; // 9
			//alert(neighbour[curtri].length);
			//loadmodel('np3/' + curtri, curtri); // 12 + name = 13
		}else if(init_loading >= vsego) {
			init_loading = vsego + 2;

			toload = 3;
			//loadmodel(SKYBOX, SKYBOX);
			for(i = 0; i < neighbour[curtri].length; i++) {
				if(!model[neighbour[curtri][i]].complete) {
					toload++;
					try { if(!model[neighbour[curtri][i]].texture2.complete) {
						toload++;
					}}catch(e) { toload++; }
					try { if(!model[neighbour[curtri][i]].texture3.complete) {
						toload++;
					}}catch(e) { toload++; }
					loadmodel('np3/' + neighbour[curtri][i], neighbour[curtri][i]);
				}
			}

			initmatrices();
			initcontrol();
			wsinit();
			fpsoptimizer();
			initdiv.style.display = 'none';
			window.onclick = pstartlock;

			shadow();

			wgloop();
		}else{
			lold = init_loading;
			init_loading = firstload + 1;

			try{ if(model[curtri].complete) {
				init_loading++;
			}}catch(e) {};
			try{ if(model[curtri].texture2.complete) {
				init_loading++;
			}}catch(e) {};
			try{ if(model[curtri].texture3.complete) {
				init_loading++;
			}}catch(e) {};

			try{ if(model[1].complete) { init_loading++; } }catch(e) {};
			try{ if(model[2].complete) { init_loading++; } }catch(e) {};
			try{ if(model[3].complete) { init_loading++; } }catch(e) {};
			try{ if(model[4].complete) { init_loading++; } }catch(e) {};
			try{ if(model[5].complete) { init_loading++; } }catch(e) {};
		}

		if(init_loading <= vsego) {
			progressdiv.style.width = (init_loading * 100 / fullload) + '%';
			try { debugdiv.innerHTML = init_loading; }catch(e){};
			setTimeout(loadsync, 100);
		}
	}

	function pstartlock() {
		document.addEventListener('pointerlockerror', plock_err, false);
		document.addEventListener('mozpointerlockerror', plock_err, false);
		document.addEventListener('webkitpointerlockerror', plock_err, false);
		document.addEventListener('pointerlockchange', plock, false);
		document.addEventListener('mozpointerlockchange', plock, false);
		document.addEventListener('webkitpointerlockchange', plock, false);
		canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
		canvas.requestPointerLock();
	}

	function plock() {
		if(document.pointerLockElement === canvas || document.mozPointerLockElement === canvas || document.webkitPointerLockElement === canvas) {
			plocked = 1;
		}else{
			plocked = 0;
			mouse.move = false; // if ff cursor still affect on unlocked pointer - just discart it
			mouse.left = false;
			//alert('pointer unlocked');
		}
	}

	function plock_err(e) {
		//alert('error ' + e);
	}

	document.getElementById('startbutton').onclick = function() {
		loadsync();
		pstartlock();
	};
	//window.onload = function() { init(); loadmodel("np3/232", 232, function() { alert("done"); }); };
	//window.onload = loadsync;
})();
</script>
