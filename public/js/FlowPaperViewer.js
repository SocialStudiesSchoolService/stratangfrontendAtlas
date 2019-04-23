var Mouse = {
  x: 0,
  y: 0,
  refresh: function(e) {
    if (e && !this.down && !jQuery(e.target).hasClass("flowpaper_zoomSlider")) {
      return;
    }
    var posx = 0,
      posy = 0;
    if (!e) {
      e = window.event;
    }
    if (e.pageX || e.pageY) {
      posx = e.pageX;
      posy = e.pageY;
    } else {
      if (e.clientX || e.clientY) {
        posx = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
        posy = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
      }
    }
    this.x = posx;
    this.y = posy;
  }
};
var mouseMoveHandler = document.onmousemove || function() {};
document.onmousemove = function(e) {
  if (!e) {
    e = window.event;
  }
  if (e && e.which == 1) {
    Mouse.down = true;
  }
  Mouse.refresh(e);
};
var MPosition = {
  get: function(obj) {
    var curleft = curtop = 0;
    if (obj.offsetParent) {
      do {
        curleft += obj.offsetLeft;
        curtop += obj.offsetTop;
      } while (obj = obj.offsetParent);
    }
    return [curleft, curtop];
  }
};
var Slider = function(wrapper, options) {
  if (typeof wrapper == "string") {
    wrapper = document.getElementById(wrapper);
  }
  if (!wrapper) {
    return;
  }
  var handle = wrapper.getElementsByTagName("div")[0];
  if (!handle || handle.className.search(/(^|\s)flowpaper_handle(\s|$)/) == -1) {
    return;
  }
  this.init(wrapper, handle, options || {});
  this.setup();
};
Slider.prototype = {
  init: function(wrapper, handle, options) {
    this.wrapper = wrapper;
    this.handle = handle;
    this.options = options;
    this.value = {
      current: options.value || 0,
      target: options.value || 0,
      prev: -1
    };
    this.disabled = options.disabled || false;
    this.steps = options.steps || 0;
    this.snapping = options.snapping || false;
    this.speed = options.speed || 5;
    this.callback = options.callback || null;
    this.animation_callback = options.animation_callback || null;
    this.bounds = {
      pleft: options.pleft || 0,
      left: 0,
      pright: -(options.pright || 0),
      right: 0,
      width: 0,
      diff: 0
    };
    this.offset = {
      wrapper: 0,
      mouse: 0,
      target: 0,
      current: 0,
      prev: -9999
    };
    this.dragging = false;
    this.tapping = false;
  },
  setup: function() {
    var self = this;
    this.wrapper.onselectstart = function() {
      return false;
    };
    this.handle.onmousedown = function(e) {
      self.preventDefaults(e, true);
      this.focus();
      self.handleMouseDownHandler(e);
    };
    this.wrapper.onmousedown = function(e) {
      self.preventDefaults(e);
      self.wrapperMouseDownHandler(e);
    };
    var mouseUpHandler = document.onmouseup || function() {};
    if (document.addEventListener) {
      document.addEventListener("mouseup", function(e) {
        if (self.dragging) {
          mouseUpHandler(e);
          self.preventDefaults(e);
          self.documentMouseUpHandler(e);
        }
      });
    } else {
      document.onmouseup = function(e) {
        if (self.dragging) {
          mouseUpHandler(e);
          self.preventDefaults(e);
          self.documentMouseUpHandler(e);
        }
      };
    }
    var resizeHandler = document.onresize || function() {};
    window.onresize = function(e) {
      resizeHandler(e);
      self.setWrapperOffset();
      self.setBounds();
    };
    this.setWrapperOffset();
    if (!this.bounds.pleft && !this.bounds.pright) {
      this.bounds.pleft = MPosition.get(this.handle)[0] - this.offset.wrapper;
      this.bounds.pright = -this.bounds.pleft;
    }
    this.setBounds();
    this.setSteps();
    this.interval = setInterval(function() {
      self.animate();
    }, 100);
    self.animate(false, true);
  },
  setWrapperOffset: function() {
    this.offset.wrapper = MPosition.get(this.wrapper)[0];
  },
  setBounds: function() {
    this.bounds.left = this.bounds.pleft;
    this.bounds.right = this.bounds.pright + this.wrapper.offsetWidth;
    this.bounds.width = this.bounds.right - this.bounds.left;
    this.bounds.diff = this.bounds.width - this.handle.offsetWidth;
  },
  setSteps: function() {
    if (this.steps > 1) {
      this.stepsRatio = [];
      for (var i = 0; i <= this.steps - 1; i++) {
        this.stepsRatio[i] = i / (this.steps - 1);
      }
    }
  },
  disable: function() {
    this.disabled = true;
    this.handle.className += " disabled";
  },
  enable: function() {
    this.disabled = false;
    this.handle.className = this.handle.className.replace(/\s?disabled/g, "");
  },
  handleMouseDownHandler: function(e) {
    if (Mouse) {
      Mouse.down = true;
      Mouse.refresh(e);
    }
    var self = this;
    this.startDrag(e);
    this.cancelEvent(e);
  },
  wrapperMouseDownHandler: function(e) {
    this.startTap();
  },
  documentMouseUpHandler: function(e) {
    this.stopDrag();
    this.stopTap();
    if (Mouse) {
      Mouse.down = false;
    }
  },
  startTap: function(target) {
    if (this.disabled) {
      return;
    }
    if (target === undefined) {
      target = Mouse.x - this.offset.wrapper - this.handle.offsetWidth / 2;
    }
    this.setOffsetTarget(target);
    this.tapping = true;
  },
  stopTap: function() {
    if (this.disabled || !this.tapping) {
      return;
    }
    this.setOffsetTarget(this.offset.current);
    this.tapping = false;
    this.result();
  },
  startDrag: function(e) {
    if (!e) {
      e = window.event;
    }
    if (this.disabled) {
      return;
    }
    this.offset.mouse = Mouse.x - MPosition.get(this.handle)[0];
    this.dragging = true;
    if (e.preventDefault) {
      e.preventDefault();
    }
  },
  stopDrag: function() {
    if (this.disabled || !this.dragging) {
      return;
    }
    this.dragging = false;
    this.result();
  },
  feedback: function() {
    var value = this.value.current;
    if (this.steps > 1 && this.snapping) {
      value = this.getClosestStep(value);
    }
    if (value != this.value.prev) {
      if (typeof this.animation_callback == "function") {
        this.animation_callback(value);
      }
      this.value.prev = value;
    }
  },
  result: function() {
    var value = this.value.target;
    if (this.steps > 1) {
      value = this.getClosestStep(value);
    }
    if (typeof this.callback == "function") {
      this.callback(value);
    }
  },
  animate: function(onMove, first) {
    if (onMove && !this.dragging) {
      return;
    }
    if (this.dragging) {
      this.setOffsetTarget(Mouse.x - this.offset.mouse - this.offset.wrapper);
    }
    this.value.target = Math.max(this.value.target, 0);
    this.value.target = Math.min(this.value.target, 1);
    this.offset.target = this.getOffsetByRatio(this.value.target);
    if (!this.dragging && !this.tapping || this.snapping) {
      if (this.steps > 1) {
        this.setValueTarget(this.getClosestStep(this.value.target));
      }
    }
    if (this.dragging || first) {
      this.value.current = this.value.target;
    }
    this.slide();
    this.show();
    this.feedback();
  },
  slide: function() {
    if (this.value.target > this.value.current) {
      this.value.current += Math.min(this.value.target - this.value.current, this.speed / 100);
    } else {
      if (this.value.target < this.value.current) {
        this.value.current -= Math.min(this.value.current - this.value.target, this.speed / 100);
      }
    }
    if (!this.snapping) {
      this.offset.current = this.getOffsetByRatio(this.value.current);
    } else {
      this.offset.current = this.getOffsetByRatio(this.getClosestStep(this.value.current));
    }
  },
  show: function() {
    if (this.offset.current != this.offset.prev) {
      this.handle.style.left = String(this.offset.current) + "px";
      this.offset.prev = this.offset.current;
    }
  },
  setValue: function(value, snap) {
    this.setValueTarget(value);
    if (snap) {
      this.value.current = this.value.target;
    }
  },
  setValueTarget: function(value) {
    this.value.target = value;
    this.offset.target = this.getOffsetByRatio(value);
  },
  setOffsetTarget: function(value) {
    this.offset.target = value;
    this.value.target = this.getRatioByOffset(value);
  },
  getRatioByOffset: function(offset) {
    return (offset - this.bounds.left) / this.bounds.diff;
  },
  getOffsetByRatio: function(ratio) {
    return Math.round(ratio * this.bounds.diff) + this.bounds.left;
  },
  getClosestStep: function(value) {
    var k = 0;
    var min = 1;
    for (var i = 0; i <= this.steps - 1; i++) {
      if (Math.abs(this.stepsRatio[i] - value) < min) {
        min = Math.abs(this.stepsRatio[i] - value);
        k = i;
      }
    }
    return this.stepsRatio[k];
  },
  preventDefaults: function(e, selection) {
    if (!e) {
      e = window.event;
    }
    if (e.preventDefault) {
      e.preventDefault();
    }
    if (selection && document.selection) {
      document.selection.empty();
    }
  },
  cancelEvent: function(e) {
    if (!e) {
      e = window.event;
    }
    if (e.stopPropagation) {
      e.stopPropagation();
    } else {
      e.cancelBubble = true;
    }
  }
};
var J, FLOWPAPER = window.FLOWPAPER ? window.FLOWPAPER : window.FLOWPAPER = {};
FLOWPAPER.Oj = function() {
  var f = [];
  return {
    Vq: function(c) {
      f.push(c);
    },
    notify: function(c, d) {
      for (var e = 0, g = f.length; e < g; e++) {
        var h = f[e];
        if (h[c]) {
          h[c](d);
        }
      }
    }
  };
}();

function M(f) {
  FLOWPAPER.Oj.notify("warn", f);
}

function O(f, c, d, e) {
  try {
    throw Error();
  } catch (g) {}
  FLOWPAPER.Oj.notify("error", f);
  d && c && (e ? jQuery("#" + d).trigger(c, e) : jQuery("#" + d).trigger(c));
  throw Error(f);
}
FLOWPAPER.Lk = {
  init: function() {
    "undefined" != typeof eb && eb || (eb = {});
    var f = navigator.userAgent.toLowerCase(),
      c = location.hash.substr(1),
      d = !1,
      e = "";
    0 <= c.indexOf("mobilepreview=") && (d = !0, e = c.substr(c.indexOf("mobilepreview=")).split("&")[0].split("=")[1]);
    var g;
    try {
      g = "ontouchstart" in document.documentElement;
    } catch (q) {
      g = !1;
    }!g && (f.match(/iphone/i) || f.match(/ipod/i) || f.match(/ipad/i)) && (d = !0);
    c = eb;
    g = /win/.test(f);
    var h = /mac/.test(f),
      p;
    if (!(p = d)) {
      try {
        p = "ontouchstart" in document.documentElement;
      } catch (q) {
        p = !1;
      }
    }
    c.platform = {
      win: g,
      mac: h,
      touchdevice: p || f.match(/touch/i) || navigator.Cb || navigator.msPointerEnabled,
      ios: d && ("ipad" == e || "iphone" == e) || f.match(/iphone/i) || f.match(/ipod/i) || f.match(/ipad/i),
      android: d && "android" == e || -1 < f.indexOf("android"),
      Ld: d && ("ipad" == e || "iphone" == e) || navigator.userAgent.match(/(iPad|iPhone);.*CPU.*OS 6_\d/i),
      iphone: d && "iphone" == e || f.match(/iphone/i) || f.match(/ipod/i),
      ipad: d && "ipad" == e || f.match(/ipad/i),
      winphone: f.match(/Windows Phone/i) || f.match(/iemobile/i) || f.match(/WPDesktop/i),
      Sp: f.match(/Windows NT/i) && f.match(/ARM/i) && f.match(/touch/i),
      rm: navigator.Cb || navigator.msPointerEnabled,
      blackberry: f.match(/BlackBerry/i) || f.match(/BB10/i),
      webos: f.match(/webOS/i),
      an: -1 < f.indexOf("android") && !(jQuery(window).height() < jQuery(window).width()),
      mobilepreview: d,
      Ya: window.devicePixelRatio ? window.devicePixelRatio : 1,
      Qn: "undefined" !== typeof document && !!document.fonts
    };
    d = eb;
    e = document.createElement("div");
    e.innerHTML = "000102030405060708090a0b0c0d0e0f";
    d.ce = e;
    eb.platform.touchonlydevice = eb.platform.touchdevice && (eb.platform.android || eb.platform.ios || eb.platform.blackberry || eb.platform.webos) || eb.platform.winphone || eb.platform.Sp;
    eb.platform.lb = eb.platform.touchonlydevice && (eb.platform.iphone || eb.platform.an || eb.platform.blackberry);
    eb.platform.ios && (d = navigator.appVersion.match(/OS (\d+)_(\d+)_?(\d+)?/), null != d && 1 < d.length ? (eb.platform.iosversion = parseInt(d[1], 10), eb.platform.Ld = 6 <= eb.platform.iosversion) : eb.platform.Ld = !0);
    eb.browser = {
      version: (f.match(/.+?(?:rv|it|ra|ie)[\/: ]([\d.]+)(?!.+opera)/) || [])[1],
      Kb: (f.match(/.+?(?:version|chrome|firefox|opera|msie|OPR)[\/: ]([\d.]+)(?!.+opera)/) || [])[1],
      safari: (/webkit/.test(f) || /applewebkit/.test(f)) && !/chrome/.test(f),
      opera: /opera/.test(f),
      msie: /msie/.test(f) && !/opera/.test(f) && !/applewebkit/.test(f),
      ff: ("Netscape" == navigator.appName && null != /Trident\/.*rv:([0-9]{1,}[.0-9]{0,})/.exec(navigator.userAgent) || 0 < f.indexOf("edge/")) && !/opera/.test(f),
      mozilla: /mozilla/.test(f) && !/(compatible|webkit)/.test(f),
      chrome: /chrome/.test(f),
      mh: window.innerHeight > window.innerWidth
    };
    eb.browser.detected = eb.browser.safari || eb.browser.opera || eb.browser.msie || eb.browser.mozilla || eb.browser.seamonkey || eb.browser.chrome || eb.browser.ff;
    eb.browser.detected && eb.browser.version || (eb.browser.chrome = !0, eb.browser.version = "500.00");
    if (eb.browser.msie) {
      var f = eb.browser,
        k;
      try {
        k = !!new ActiveXObject("htmlfile");
      } catch (q) {
        k = !1;
      }
      f.Gr = k && "Win64" == navigator.platform && document.documentElement.clientWidth == screen.width;
    }
    eb.browser.version && 1 < eb.browser.version.match(/\./g).length && (eb.browser.version = eb.browser.version.substr(0, eb.browser.version.indexOf(".", eb.browser.version.indexOf("."))));
    eb.browser.Kb && 1 < eb.browser.Kb.match(/\./g).length && (eb.browser.Kb = eb.browser.Kb.substr(0, eb.browser.Kb.indexOf(".", eb.browser.Kb.indexOf("."))));
    k = eb.browser;
    var f = !eb.platform.touchonlydevice || eb.platform.android && !window.annotations || eb.platform.Ld && !window.annotations || eb.platform.ios && 6.99 <= eb.platform.iosversion && !window.annotations,
      d = eb.browser.mozilla && 4 <= eb.browser.version.split(".")[0] || eb.browser.chrome && 535 <= eb.browser.version.split(".")[0] || eb.browser.msie && 10 <= eb.browser.version.split(".")[0] || eb.browser.safari && 534 <= eb.browser.version.split(".")[0],
      e = document.documentElement.requestFullScreen || document.documentElement.mozRequestFullScreen || document.documentElement.webkitRequestFullScreen,
      l;
    try {
      l = !!window.WebGLRenderingContext && !!document.createElement("canvas").getContext("experimental-webgl");
    } catch (q) {
      l = !1;
    }
    k.capabilities = {
      yb: f,
      Rp: d,
      ps: e,
      iq: l
    };
    if (eb.browser.msie) {
      l = eb.browser;
      var n;
      try {
        null != /MSIE ([0-9]{1,}[.0-9]{0,})/.exec(navigator.userAgent) && (rv = parseFloat(RegExp.$1)), n = rv;
      } catch (q) {
        n = -1;
      }
      l.version = n;
    }
  }
};

function aa(f) {
  f.getContext("2d").clearRect(0, 0, f.width, f.height);
}

function P() {
  for (var f = eb.Sg.innerHTML, c = [], d = 0;
    "\n" != f.charAt(d) && d < f.length;) {
    for (var e = 0, g = 6; 0 <= g; g--) {
      " " == f.charAt(d) && (e |= Math.pow(2, g)), d++;
    }
    c.push(String.fromCharCode(e));
  }
  return c.join("");
}

function ba(f, c, d) {
  this.F = f;
  this.Hd = c;
  this.containerId = d;
  this.scroll = function() {
    var c = this;
    jQuery(this.Hd).bind("mousedown", function(d) {
      if (c.F.Xc || f.ni && f.ni() || jQuery("*:focus").hasClass("flowpaper_textarea_contenteditable") || jQuery("*:focus").hasClass("flowpaper_note_textarea")) {
        return d.returnValue = !1, !0;
      }
      if (c.F.mc) {
        return !0;
      }
      c.Ep(c.Hd);
      c.oj = d.pageY;
      c.nj = d.pageX;
      return !1;
    });
    jQuery(this.Hd).bind("mousemove", function(d) {
      return c.Cn(d);
    });
    this.F.Am || (jQuery(this.containerId).bind("mouseout", function(d) {
      c.eo(d);
    }), jQuery(this.containerId).bind("mouseup", function() {
      c.bm();
    }), this.F.Am = !0);
  };
  this.Cn = function(c) {
    if (!this.F.Pi) {
      return !0;
    }
    this.F.qk != this.Hd && (this.oj = c.pageY, this.nj = c.pageX, this.F.qk = this.Hd);
    this.scrollTo(this.nj - c.pageX, this.oj - c.pageY);
    this.oj = c.pageY;
    this.nj = c.pageX;
    return !1;
  };
  this.Ep = function(c) {
    this.F.Pi = !0;
    this.F.qk = c;
    jQuery(this.Hd).removeClass("flowpaper_grab");
    jQuery(this.Hd).addClass("flowpaper_grabbing");
  };
  this.eo = function(c) {
    0 == jQuery(this.F.L).has(c.target).length && this.bm();
  };
  this.bm = function() {
    this.F.Pi = !1;
    jQuery(this.Hd).removeClass("flowpaper_grabbing");
    jQuery(this.Hd).addClass("flowpaper_grab");
  };
  this.scrollTo = function(c, d) {
    var h = jQuery(this.containerId).scrollLeft() + c,
      f = jQuery(this.containerId).scrollTop() + d;
    jQuery(this.containerId).scrollLeft(h);
    jQuery(this.containerId).scrollTop(f);
  };
}

function ca(f) {
  f = f.split(",").map(function(c) {
    a: if (/^-?\d+$/.test(c)) {
      c = parseInt(c, 10);
    } else {
      var d;
      if (d = c.match(/^(-?\d+)(-|\.\.\.?|\u2025|\u2026|\u22EF)(-?\d+)$/)) {
        c = d[1];
        var e = d[2];
        d = d[3];
        if (c && d) {
          c = parseInt(c);
          d = parseInt(d);
          var g = [],
            h = c < d ? 1 : -1;
          if ("-" == e || ".." == e || "\u2025" == e) {
            d += h;
          }
          for (; c != d; c += h) {
            g.push(c);
          }
          c = g;
          break a;
        }
      }
      c = [];
    }return c;
  });
  return 0 === f.length ? [] : 1 === f.length ? Array.isArray(f[0]) ? f[0] : f : f.reduce(function(c, d) {
    Array.isArray(c) || (c = [c]);
    Array.isArray(d) || (d = [d]);
    return c.concat(d);
  });
}

function da(f, c, d, e) {
  var g = f.createElement("node");
  g.setAttribute("pageNumber", ea(c, e));
  g.setAttribute("title", fa(c.title));
  d.appendChild(g);
  if (c.items && c.items.length) {
    for (d = 0; d < c.items.length; d++) {
      da(f, c.items[d], g, e);
    }
  }
}

function ea(f, c) {
  destRef = "string" === typeof f.dest ? c.destinations[f.dest][0] : null != f && null != f.dest ? f.dest[0] : null;
  return destRef instanceof Object ? c.zg[destRef.num + " " + destRef.gen + " R"] + 1 : destRef + 1;
}

function ha(f, c) {
  if (eb.platform.Qn) {
    var d = new FontFace(f, "url(data:" + c + ")", {});
    document.fonts.add(d);
  } else {
    d = '@font-face { font-family:"' + f + '";src:' + ("url(" + c + ");") + "}";
    if (window.styleElement) {
      e = window.styleElement;
    } else {
      var e = window.styleElement = document.createElement("style");
      e.id = "FLOWPAPER_FONT_STYLE_TAG";
      document.documentElement.getElementsByTagName("head")[0].appendChild(e);
    }
    e = e.sheet;
    e.insertRule(d, e.cssRules.length);
  }
}

function ia(f, c) {
  var d = new XMLHttpRequest;
  d.onreadystatechange = function() {
    if (4 == d.readyState && 200 == d.status) {
      var e = URL.createObjectURL(this.response);
      new Image;
      c(e);
    }
  };
  d.open("GET", f, !0);
  d.responseType = "blob";
  d.send();
}

function ja(f) {
  function c(c, d) {
    var e, g, h, f, p;
    h = c & 2147483648;
    f = d & 2147483648;
    e = c & 1073741824;
    g = d & 1073741824;
    p = (c & 1073741823) + (d & 1073741823);
    return e & g ? p ^ 2147483648 ^ h ^ f : e | g ? p & 1073741824 ? p ^ 3221225472 ^ h ^ f : p ^ 1073741824 ^ h ^ f : p ^ h ^ f;
  }

  function d(d, e, g, h, f, p, k) {
    d = c(d, c(c(e & g | ~e & h, f), k));
    return c(d << p | d >>> 32 - p, e);
  }

  function e(d, e, g, h, f, p, k) {
    d = c(d, c(c(e & h | g & ~h, f), k));
    return c(d << p | d >>> 32 - p, e);
  }

  function g(d, e, g, h, f, p, k) {
    d = c(d, c(c(e ^ g ^ h, f), k));
    return c(d << p | d >>> 32 - p, e);
  }

  function h(d, e, g, h, f, p, k) {
    d = c(d, c(c(g ^ (e | ~h), f), k));
    return c(d << p | d >>> 32 - p, e);
  }

  function p(c) {
    var d = "",
      e = "",
      g;
    for (g = 0; 3 >= g; g++) {
      e = c >>> 8 * g & 255, e = "0" + e.toString(16), d += e.substr(e.length - 2, 2);
    }
    return d;
  }
  var k = [],
    l, n, q, t, r, m, u, v;
  f = function(c) {
    c = c.replace(/\r\n/g, "\n");
    for (var d = "", e = 0; e < c.length; e++) {
      var g = c.charCodeAt(e);
      128 > g ? d += String.fromCharCode(g) : (127 < g && 2048 > g ? d += String.fromCharCode(g >> 6 | 192) : (d += String.fromCharCode(g >> 12 | 224), d += String.fromCharCode(g >> 6 & 63 | 128)), d += String.fromCharCode(g & 63 | 128));
    }
    return d;
  }(f);
  k = function(c) {
    var d, e = c.length;
    d = e + 8;
    for (var g = 16 * ((d - d % 64) / 64 + 1), h = Array(g - 1), f = 0, p = 0; p < e;) {
      d = (p - p % 4) / 4, f = p % 4 * 8, h[d] |= c.charCodeAt(p) << f, p++;
    }
    d = (p - p % 4) / 4;
    h[d] |= 128 << p % 4 * 8;
    h[g - 2] = e << 3;
    h[g - 1] = e >>> 29;
    return h;
  }(f);
  r = 1732584193;
  m = 4023233417;
  u = 2562383102;
  v = 271733878;
  for (f = 0; f < k.length; f += 16) {
    l = r, n = m, q = u, t = v, r = d(r, m, u, v, k[f + 0], 7, 3614090360), v = d(v, r, m, u, k[f + 1], 12, 3905402710), u = d(u, v, r, m, k[f + 2], 17, 606105819), m = d(m, u, v, r, k[f + 3], 22, 3250441966), r = d(r, m, u, v, k[f + 4], 7, 4118548399), v = d(v, r, m, u, k[f + 5], 12, 1200080426), u = d(u, v, r, m, k[f + 6], 17, 2821735955), m = d(m, u, v, r, k[f + 7], 22, 4249261313), r = d(r, m, u, v, k[f + 8], 7, 1770035416), v = d(v, r, m, u, k[f + 9], 12, 2336552879), u = d(u, v, r, m, k[f + 10], 17, 4294925233), m = d(m, u, v, r, k[f + 11], 22, 2304563134), r = d(r, m, u, v, k[f + 12], 7, 1804603682), v = d(v, r, m, u, k[f + 13], 12, 4254626195), u = d(u, v, r, m, k[f + 14], 17, 2792965006), m = d(m, u, v, r, k[f + 15], 22, 1236535329), r = e(r, m, u, v, k[f + 1], 5, 4129170786), v = e(v, r, m, u, k[f + 6], 9, 3225465664), u = e(u, v, r, m, k[f + 11], 14, 643717713), m = e(m, u, v, r, k[f + 0], 20, 3921069994), r = e(r, m, u, v, k[f + 5], 5, 3593408605), v = e(v, r, m, u, k[f + 10], 9, 38016083), u = e(u, v, r, m, k[f + 15], 14, 3634488961), m = e(m, u, v, r, k[f + 4], 20, 3889429448), r = e(r, m, u, v, k[f + 9], 5, 568446438), v = e(v, r, m, u, k[f + 14], 9, 3275163606), u = e(u, v, r, m, k[f + 3], 14, 4107603335), m = e(m, u, v, r, k[f + 8], 20, 1163531501), r = e(r, m, u, v, k[f + 13], 5, 2850285829), v = e(v, r, m, u, k[f + 2], 9, 4243563512), u = e(u, v, r, m, k[f + 7], 14, 1735328473), m = e(m, u, v, r, k[f + 12], 20, 2368359562), r = g(r, m, u, v, k[f + 5], 4, 4294588738), v = g(v, r, m, u, k[f + 8], 11, 2272392833), u = g(u, v, r, m, k[f + 11], 16, 1839030562), m = g(m, u, v, r, k[f + 14], 23, 4259657740), r = g(r, m, u, v, k[f + 1], 4, 2763975236), v = g(v, r, m, u, k[f + 4], 11, 1272893353), u = g(u, v, r, m, k[f + 7], 16, 4139469664), m = g(m, u, v, r, k[f + 10], 23, 3200236656), r = g(r, m, u, v, k[f + 13], 4, 681279174), v = g(v, r, m, u, k[f + 0], 11, 3936430074), u = g(u, v, r, m, k[f + 3], 16, 3572445317), m = g(m, u, v, r, k[f + 6], 23, 76029189), r = g(r, m, u, v, k[f + 9], 4, 3654602809), v = g(v, r, m, u, k[f + 12], 11, 3873151461), u = g(u, v, r, m, k[f + 15], 16, 530742520), m = g(m, u, v, r, k[f + 2], 23, 3299628645), r = h(r, m, u, v, k[f + 0], 6, 4096336452), v = h(v, r, m, u, k[f + 7], 10, 1126891415), u = h(u, v, r, m, k[f + 14], 15, 2878612391), m = h(m, u, v, r, k[f + 5], 21, 4237533241), r = h(r, m, u, v, k[f + 12], 6, 1700485571), v = h(v, r, m, u, k[f + 3], 10, 2399980690), u = h(u, v, r, m, k[f + 10], 15, 4293915773), m = h(m, u, v, r, k[f + 1], 21, 2240044497), r = h(r, m, u, v, k[f + 8], 6, 1873313359), v = h(v, r, m, u, k[f + 15], 10, 4264355552), u = h(u, v, r, m, k[f + 6], 15, 2734768916), m = h(m, u, v, r, k[f + 13], 21, 1309151649), r = h(r, m, u, v, k[f + 4], 6, 4149444226), v = h(v, r, m, u, k[f + 11], 10, 3174756917), u = h(u, v, r, m, k[f + 2], 15, 718787259), m = h(m, u, v, r, k[f + 9], 21, 3951481745), r = c(r, l), m = c(m, n), u = c(u, q), v = c(v, t);
  }
  return (p(r) + p(m) + p(u) + p(v)).toLowerCase();
}
String.format = function() {
  for (var f = arguments[0], c = 0; c < arguments.length - 1; c++) {
    f = f.replace(new RegExp("\\{" + c + "\\}", "gm"), arguments[c + 1]);
  }
  return f;
};
String.prototype.endsWith = function(f) {
  return this.substr(this.length - f.length) === f;
};
String.prototype.startsWith = function(f) {
  return this.substr(0, f.length) === f;
};
jQuery.fn.mr = function(f, c) {
  return this.each(function() {
    jQuery(this).fadeIn(f, function() {
      eb.browser.msie ? jQuery(this).get(0).style.removeAttribute("filter") : "";
      "function" == typeof eval(c) ? eval(c)() : "";
    });
  });
};
jQuery.fn.In = function(f) {
  this.each(function() {
    eb.browser.msie ? eval(f)() : jQuery(this).fadeOut(400, function() {
      eb.browser.msie ? jQuery(this).get(0).style.removeAttribute("filter") : "";
      "function" == typeof eval(f) ? eval(f)() : "";
    });
  });
};
jQuery.fn.zh = function(f) {
  this.each(function() {
    jQuery(this).data("retry") ? jQuery(this).data("retry", parseInt(jQuery(this).data("retry")) + 1) : jQuery(this).data("retry", 1);
    3 >= jQuery(this).data("retry") ? this.src = this.src + (-1 < this.src.indexOf("?") ? "&" : "?") + "t=" + (new Date).getTime() : f();
  });
};
jQuery.fn.Jr = function(f, c) {
  if (0 <= jQuery.fn.jquery.indexOf("1.8")) {
    try {
      if (void 0 === jQuery._data(this[0], "events")) {
        return !1;
      }
    } catch (g) {
      return !1;
    }
    var d = jQuery._data(this[0], "events")[f];
    if (void 0 === d || 0 === d.length) {
      return !1;
    }
    var e = 0;
  } else {
    if (void 0 === this.data("events")) {
      return !1;
    }
    d = this.data("events")[f];
    if (void 0 === d || 0 === d.length) {
      return !1;
    }
    e = 0;
  }
  for (; e < d.length; e++) {
    if (d[e].handler == c) {
      return !0;
    }
  }
  return !1;
};
jQuery.fn.qs = function(f) {
  if (void 0 === this.data("events")) {
    return !1;
  }
  var c = this.data("events")[f];
  if (void 0 === c || 0 === c.length) {
    return !1;
  }
  for (var d = 0; d < c.length; d++) {
    jQuery(this).unbind(f, c[d].handler);
  }
  return !1;
};
jQuery.fn.Sr = function() {
  eb.browser.capabilities.yb ? this.scrollTo(ce, 0, {
    axis: "xy",
    offset: -30
  }) : this.data("jsp").scrollToElement(ce, !1);
};

function fa(f) {
  return f.split("").map(function(c) {
    var d = c.charCodeAt(0);
    if (127 < d) {
      return c = d.toString(16), "\\u" + (Array(5 - c.length).join("0") + c);
    }
    31 >= d && (c = "");
    "\n" == c && (c = "");
    "\r" == c && (c = "");
    "\b" == c && (c = "");
    "\t" == c && (c = "");
    "\f" == c && (c = "");
    "\b" == c && (c = "");
    return c;
  }).join("");
}

function Q(f) {
  return f.split("").reverse().join("");
}
jQuery.fn.xe = function(f, c) {
  this.css({
    width: 0,
    height: 0,
    "border-bottom": String.format("{0}px solid transparent", f),
    "border-top": String.format("{0}px solid transparent", f),
    "border-right": String.format("{0}px solid {1}", f, c),
    "font-size": "0px",
    "line-height": "0px",
    cursor: "pointer"
  });
  this.unbind("mouseover");
  this.unbind("mouseout");
  eb.platform.touchonlydevice || (this.on("mouseover", function(c) {
    jQuery(c.target).css({
      "border-right": String.format("{0}px solid {1}", f, "#DEDEDE")
    });
  }), this.on("mouseout", function(d) {
    jQuery(d.target).css({
      "border-right": String.format("{0}px solid {1}", f, c)
    });
  }));
};
jQuery.fn.fj = function(f, c, d) {
  this.css({
    width: 0,
    height: 0,
    "border-bottom": String.format("{0}px solid {1}", f, c),
    "border-top": String.format("{0}px solid {1}", f, c),
    "border-left": String.format("1px solid {1}", f, c),
    "font-size": "0px",
    "line-height": "0px",
    cursor: "pointer"
  });
  this.on("mouseover", function(c) {
    jQuery(d).trigger("mouseover");
    jQuery(c.target).css({
      "border-left": String.format("1px solid {1}", f, "#DEDEDE"),
      "border-bottom": String.format("{0}px solid {1}", f, "#DEDEDE"),
      "border-top": String.format("{0}px solid {1}", f, "#DEDEDE")
    });
  });
  this.on("mouseout", function(e) {
    jQuery(d).trigger("mouseout");
    jQuery(e.target).css({
      "border-left": String.format("1px solid {1}", f, c),
      "border-bottom": String.format("{0}px solid {1}", f, c),
      "border-top": String.format("{0}px solid {1}", f, c)
    });
  });
};
jQuery.fn.vd = function(f, c, d) {
  this.css({
    width: 0,
    height: 0,
    "border-bottom": String.format("{0}px solid transparent", f),
    "border-top": String.format("{0}px solid transparent", f),
    "border-left": String.format("{0}px solid {1}", f, c),
    "font-size": "0px",
    "line-height": "0px",
    cursor: "pointer"
  });
  d && this.css({
    opacity: 0.5
  });
  this.unbind("mouseover");
  this.unbind("mouseout");
  this.on("mouseover", function(c) {
    d ? jQuery(c.target).css({
      "border-left": String.format("{0}px solid {1}", f, "#FFFFFF"),
      opacity: 0.85
    }) : jQuery(c.target).css({
      "border-left": String.format("{0}px solid {1}", f, "#DEDEDE")
    });
  });
  this.on("mouseout", function(e) {
    jQuery(e.target).css({
      "border-left": String.format("{0}px solid {1}", f, c)
    });
    d && jQuery(e.target).css({
      opacity: 0.5
    });
  });
};
jQuery.fn.gj = function(f, c, d) {
  this.css({
    width: 0,
    height: 0,
    "border-bottom": String.format("{0}px solid {1}", f, c),
    "border-top": String.format("{0}px solid {1}", f, c),
    "border-right": String.format("1px solid {1}", f, c),
    "font-size": "0px",
    "line-height": "0px",
    cursor: "pointer"
  });
  this.on("mouseover", function(c) {
    jQuery(d).trigger("mouseover");
    jQuery(c.target).css({
      "border-right": String.format("1px solid {1}", f, "#DEDEDE"),
      "border-top": String.format("{0}px solid {1}", f, "#DEDEDE"),
      "border-bottom": String.format("{0}px solid {1}", f, "#DEDEDE")
    });
  });
  this.on("mouseout", function(e) {
    jQuery(d).trigger("mouseout");
    jQuery(e.target).css({
      "border-right": String.format("1px solid {1}", f, c),
      "border-top": String.format("{0}px solid {1}", f, c),
      "border-bottom": String.format("{0}px solid {1}", f, c)
    });
  });
};
jQuery.fn.addClass5 = function(f) {
  return this[0].classList ? (this[0].classList.add(f), this) : this.addClass(f);
};
jQuery.fn.removeClass5 = function(f) {
  return this[0].classList ? (this[0].classList.remove(f), this) : this.addClass(f);
};
jQuery.fn.rc = function() {
  this.css({
    display: "none"
  });
};
jQuery.fn.xd = function() {
  this.css({
    display: "block"
  });
};
window.requestAnim = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(f) {
  window.setTimeout(f, 1000 / 60);
};
jQuery.fn.If = function() {
  var f = this.css("transform");
  return !f || "none" == f || "0px,0px" == f.translate && 1 == parseFloat(f.scale) ? !1 : !0;
};

function ka(f, c) {
  var d = "0",
    e = f = f + "";
  if (null == d || 1 > d.length) {
    d = " ";
  }
  if (f.length < c) {
    for (var e = "", g = 0; g < c - f.length; g++) {
      e += d;
    }
    e += f;
  }
  return e;
}
jQuery.fn.spin = function(f) {
  this.each(function() {
    var c = jQuery(this),
      d = c.data();
    d.tj && (d.tj.stop(), delete d.tj);
    !1 !== f && (d.tj = (new Spinner(jQuery.extend({
      color: c.css("color")
    }, f))).spin(this));
  });
  return this;
};
jQuery.fn.qo = function() {
  var f = jQuery.extend({
    pk: "cur",
    kl: !1,
    speed: 300
  }, {
    kl: !1,
    speed: 100
  });
  this.each(function() {
    var c = jQuery(this).addClass("harmonica"),
      d = jQuery("ul", c).prev("a");
    c.children(":last").addClass("last");
    jQuery("ul", c).each(function() {
      jQuery(this).children(":last").addClass("last");
    });
    jQuery("ul", c).prev("a").addClass("harFull");
    c.find("." + f.pk).parents("ul").show().prev("a").addClass(f.pk).addClass("harOpen");
    d.on("click", function() {
      jQuery(this).next("ul").is(":hidden") ? jQuery(this).addClass("harOpen") : jQuery(this).removeClass("harOpen");
      f.kl ? (jQuery(this).closest("ul").closest("ul").find("ul").not(jQuery(this).next("ul")).slideUp(f.speed).prev("a").removeClass("harOpen"), jQuery(this).next("ul").slideToggle(f.speed)) : jQuery(this).next("ul").stop(!0).slideToggle(f.speed);
      return !1;
    });
  });
};

function la(f) {
  f = f.replace(/\\u([\d\w]{4})/gi, function(c, d) {
    return String.fromCharCode(parseInt(d, 16));
  });
  return f = unescape(f);
}

function ma(f, c) {
  var d = jQuery("<ul>");
  jQuery.each(c, function(c, g) {
    var h = jQuery("<li>").appendTo(d),
      p = jQuery(g).children("node");
    jQuery('<a class="flowpaper_accordionLabel flowpaper-tocitem" data-pageNumber="' + g.getAttribute("pageNumber") + '">').text(la(g.getAttribute("title"))).appendTo(h);
    0 < p.length && ma(f, p).appendTo(h);
  });
  return d;
}

function R(f) {
  f = parseInt(0 == f.indexOf("#") ? f.substr(1) : f, 16);
  return {
    r: f >> 16,
    g: f >> 8 & 255,
    b: f & 255
  };
}
jQuery.Hf = function(f, c, d) {
  f = f.offset();
  return {
    x: Math.floor(c - f.left),
    y: Math.floor(d - f.top)
  };
};
jQuery.fn.Hf = function(f, c) {
  return jQuery.Hf(this.first(), f, c);
};
(function(f) {
  f.fn.moveTo = function(c) {
    return this.each(function() {
      var d = f(this).clone();
      f(d).appendTo(c);
      f(this).remove();
    });
  };
})(jQuery);

function na(f) {
  return f.replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g, "").replace(/\s+/g, " ");
}

function S(f) {
  window.Lh || (window.Lh = 1);
  if (!window.vk) {
    var c = window,
      d = document.createElement("div");
    document.body.appendChild(d);
    d.style.position = "absolute";
    d.style.width = "1in";
    var e = d.offsetWidth;
    d.style.display = "none";
    c.vk = e;
  }
  return f / (72 / window.vk) * window.Lh;
}

function T(f) {
  f = f.replace(/-/g, "-\x00").split(/(?=-| )|\0/);
  for (var c = [], d = 0; d < f.length; d++) {
    "-" == f[d] && d + 1 <= f.length ? (c[c.length] = -1 * parseFloat(na(f[d + 1].toString())), d++) : c[c.length] = parseFloat(na(f[d].toString()));
  }
  return c;
}

function oa(f) {
  this.source = f;
  this.volume = 100;
  this.loop = !1;
  this.Wd = void 0;
  this.finish = !1;
  this.stop = function() {
    document.body.removeChild(this.Wd);
  };
  this.start = function() {
    if (this.finish) {
      return !1;
    }
    this.Wd = document.createElement("embed");
    this.Wd.setAttribute("src", this.source);
    this.Wd.setAttribute("hidden", "true");
    this.Wd.setAttribute("volume", this.volume);
    this.Wd.setAttribute("autostart", "true");
    this.Wd.setAttribute("loop", this.loop);
    document.body.appendChild(this.Wd);
  };
  this.remove = function() {
    document.body.removeChild(this.Wd);
    this.finish = !0;
  };
  this.init = function(c, d) {
    this.finish = !1;
    this.volume = c;
    this.loop = d;
  };
}

function pa(f, c) {
  jQuery("#" + f).hasClass("activeElement") || (jQuery(".activeElement:not(#" + f + ")").removeClass("activeElement").find(".activeElement-label").remove(), jQuery("#" + f).hasClass("activeElement") || (jQuery("#" + f).addClass("activeElement").prepend('<span contenteditable="false" class="activeElement-label"><i class="activeElement-drag fa fa-arrows"></i><span class="activeElement-labeltext">Click to Zoom in and out. Double click to edit this page.</span><i style="margin-left:5px;" class="fa fa-cog activeElement-label-settingsCog"></i></span>'), jQuery("#" + f).data("hint-pageNumber", c)));
}
FLOWPAPER.Bj = function(f, c) {
  if (0 < f.indexOf("[*,2]") || 0 < f.indexOf("[*,1]")) {
    var d = f.substr(f.indexOf("[*,"), f.indexOf("]") - f.indexOf("[*,") + 1);
    return f.replace(d, ka(c, parseInt(d.substr(d.indexOf(",") + 1, d.indexOf("]") - 2))));
  }
  return 0 < f.indexOf("[*,2,true]") ? f.replace("_[*,2,true]", "") : 0 < f.indexOf("[*,1,true]") ? f.replace("_[*,1,true]", "") : 0 < f.indexOf("[*,0,true]") ? f.replace("_[*,0,true]", "") : f;
};
FLOWPAPER.Sn = function() {
  for (var f = "", c = 0; 10 > c; c++) {
    f += "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".charAt(Math.floor(62 * Math.random()));
  }
  return f;
};
FLOWPAPER.Kr = function(f) {
  return "#" != f.charAt(0) && "/" != f.charAt(0) && (-1 == f.indexOf("//") || f.indexOf("//") > f.indexOf("#") || f.indexOf("//") > f.indexOf("?"));
};
FLOWPAPER.Zq = function(f, c, d, e, g, h, p) {
  if (e < c) {
    var k = c;
    c = e;
    e = k;
    k = d;
    d = g;
    g = k;
  }
  k = document.createElement("div");
  k.id = f + "_line";
  k.className = "flowpaper_cssline flowpaper_annotation_" + p + " flowpaper_interactiveobject_" + p;
  f = Math.sqrt((c - e) * (c - e) + (d - g) * (d - g));
  k.style.width = f + "px";
  k.style.marginLeft = h;
  e = Math.atan((g - d) / (e - c));
  k.style.top = d + 0.5 * f * Math.sin(e) + "px";
  k.style.left = c - 0.5 * f * (1 - Math.cos(e)) + "px";
  k.style.MozTransform = k.style.WebkitTransform = k.style.msTransform = k.style.Cb = "rotate(" + e + "rad)";
  return k;
};
FLOWPAPER.$r = function(f, c, d, e, g, h) {
  if (e < c) {
    var p = c;
    c = e;
    e = p;
    p = d;
    d = g;
    g = p;
  }
  f = jQuery("#" + f + "_line");
  p = Math.sqrt((c - e) * (c - e) + (d - g) * (d - g));
  f.css("width", p + "px");
  e = Math.atan((g - d) / (e - c));
  f.css("top", d + 0.5 * p * Math.sin(e) + "px");
  f.css("left", c - 0.5 * p * (1 - Math.cos(e)) + "px");
  f.css("margin-left", h);
  f.css("-moz-transform", "rotate(" + e + "rad)");
  f.css("-webkit-transform", "rotate(" + e + "rad)");
  f.css("-o-transform", "rotate(" + e + "rad)");
  f.css("-ms-transform", "rotate(" + e + "rad)");
};
FLOWPAPER.jr = function() {
  eb.browser.mozilla ? jQuery(".flowpaper_interactive_canvas").addClass("flowpaper_interactive_canvas_drawing_moz") : eb.browser.msie || eb.browser.ff ? jQuery(".flowpaper_interactive_canvas").addClass("flowpaper_interactive_canvas_drawing_ie") : jQuery(".flowpaper_interactive_canvas").addClass("flowpaper_interactive_canvas_drawing");
};
FLOWPAPER.dr = function() {
  jQuery(".flowpaper_interactive_canvas").removeClass("flowpaper_interactive_canvas_drawing");
  jQuery(".flowpaper_interactive_canvas").removeClass("flowpaper_interactive_canvas_drawing_moz");
  jQuery(".flowpaper_interactive_canvas").removeClass("flowpaper_interactive_canvas_drawing_ie");
};
"use strict";

function qa() {
  try {
    return new window.XMLHttpRequest;
  } catch (f) {}
}
var ra = "undefined" !== typeof window && window.ActiveXObject ? function() {
  var f;
  if (!(f = qa())) {
    a: {
      try {
        f = new window.ActiveXObject("Microsoft.XMLHTTP");
        break a;
      } catch (c) {}
      f = void 0;
    }
  }
  return f;
} : qa;

function sa(f, c) {
  try {
    var d = ra();
    d.open("GET", f, !0);
    "responseType" in d && (d.responseType = "arraybuffer");
    d.overrideMimeType && d.overrideMimeType("text/plain; charset=x-user-defined");
    d.onreadystatechange = function() {
      var e, g;
      if (4 === d.readyState) {
        if (200 === d.status || 0 === d.status) {
          g = e = null;
          try {
            e = d.response || d.responseText;
          } catch (h) {
            g = Error(h);
          }
          c(g, e);
        } else {
          c(Error("Ajax error for " + f + " : " + this.status + " " + this.statusText), null);
        }
      }
    };
    d.send();
  } catch (e) {
    c(Error(e), null);
  }
}
var ImagePageRenderer = window.ImagePageRenderer = function() {
    function f(c, d, e) {
      this.P = c;
      this.config = d;
      this.Md = d.jsonfile;
      this.jsDirectory = e;
      this.pageImagePattern = d.pageImagePattern;
      this.pageThumbImagePattern = d.pageThumbImagePattern;
      this.pageSVGImagePattern = d.pageSVGImagePattern;
      this.aj = d.pageHighResImagePattern;
      this.Ck = d.FontsToLoad;
      this.Oe = d.DisableOverflow;
      this.JSONPageDataFormat = this.qa = this.dimensions = null;
      this.Fa = null != d.compressedJSONFormat ? d.compressedJSONFormat : !0;
      this.S = null;
      this.Xb = "pageLoader_[pageNumber]";
      this.ea = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      this.Me = -1;
      this.ya = null;
      this.Jf = !1;
      this.ie = this.sb = !0;
      this.zb = d.SVGMode;
      this.loadTestFont = atob("T1RUTwALAIAAAwAwQ0ZGIDHtZg4AAAOYAAAAgUZGVE1lkzZwAAAEHAAAABxHREVGABQAFQAABDgAAAAeT1MvMlYNYwkAAAEgAAAAYGNtYXABDQLUAAACNAAAAUJoZWFk/xVFDQAAALwAAAA2aGhlYQdkA+oAAAD0AAAAJGhtdHgD6AAAAAAEWAAAAAZtYXhwAAJQAAAAARgAAAAGbmFtZVjmdH4AAAGAAAAAsXBvc3T/hgAzAAADeAAAACAAAQAAAAEAALZRFsRfDzz1AAsD6AAAAADOBOTLAAAAAM4KHDwAAAAAA+gDIQAAAAgAAgAAAAAAAAABAAADIQAAAFoD6AAAAAAD6AABAAAAAAAAAAAAAAAAAAAAAQAAUAAAAgAAAAQD6AH0AAUAAAKKArwAAACMAooCvAAAAeAAMQECAAACAAYJAAAAAAAAAAAAAQAAAAAAAAAAAAAAAFBmRWQAwAAuAC4DIP84AFoDIQAAAAAAAQAAAAAAAAAAACAAIAABAAAADgCuAAEAAAAAAAAAAQAAAAEAAAAAAAEAAQAAAAEAAAAAAAIAAQAAAAEAAAAAAAMAAQAAAAEAAAAAAAQAAQAAAAEAAAAAAAUAAQAAAAEAAAAAAAYAAQAAAAMAAQQJAAAAAgABAAMAAQQJAAEAAgABAAMAAQQJAAIAAgABAAMAAQQJAAMAAgABAAMAAQQJAAQAAgABAAMAAQQJAAUAAgABAAMAAQQJAAYAAgABWABYAAAAAAAAAwAAAAMAAAAcAAEAAAAAADwAAwABAAAAHAAEACAAAAAEAAQAAQAAAC7//wAAAC7////TAAEAAAAAAAABBgAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMAAAAAAAD/gwAyAAAAAQAAAAAAAAAAAAAAAAAAAAABAAQEAAEBAQJYAAEBASH4DwD4GwHEAvgcA/gXBIwMAYuL+nz5tQXkD5j3CBLnEQACAQEBIVhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYAAABAQAADwACAQEEE/t3Dov6fAH6fAT+fPp8+nwHDosMCvm1Cvm1DAz6fBQAAAAAAAABAAAAAMmJbzEAAAAAzgTjFQAAAADOBOQpAAEAAAAAAAAADAAUAAQAAAABAAAAAgABAAAAAAAAAAAD6AAAAAAAAA==");
    }
    f.prototype = {
      Gf: function() {
        return "ImagePageRenderer";
      },
      Ja: function(c) {
        return c.F.I ? c.F.I.W : "";
      },
      ub: function(c) {
        return c.F.I.jo;
      },
      dispose: function() {
        jQuery(this.ya).unbind();
        this.ya.dispose();
        delete this.fc;
        this.fc = null;
        delete this.dimensions;
        this.dimensions = null;
        delete this.ya;
        this.ya = null;
        delete this.S;
        this.S = null;
      },
      initialize: function(c) {
        var d = this;
        d.fc = c;
        d.Ya = eb.platform.Ya;
        d.Fa ? d.JSONPageDataFormat = {
          kf: "width",
          jf: "height",
          Ae: "text",
          qb: "d",
          Cg: "f",
          lc: "l",
          Ab: "t",
          Ad: "w",
          zd: "h"
        } : d.JSONPageDataFormat = {
          kf: d.config.JSONPageDataFormat.pageWidth,
          jf: d.config.JSONPageDataFormat.pageHeight,
          Ae: d.config.JSONPageDataFormat.textCollection,
          qb: d.config.JSONPageDataFormat.textFragment,
          Cg: d.config.JSONPageDataFormat.textFont,
          lc: d.config.JSONPageDataFormat.textLeft,
          Ab: d.config.JSONPageDataFormat.textTop,
          Ad: d.config.JSONPageDataFormat.textWidth,
          zd: d.config.JSONPageDataFormat.textHeight
        };
        d.ya = new ta(d.P, d.Fa, d.JSONPageDataFormat, !0);
        jQuery.ajaxPrefilter(function(c, d, e) {
          if (c.onreadystatechange) {
            var f = c.xhr;
            c.xhr = function() {
              function d() {
                c.onreadystatechange(h, e);
              }
              var h = f.apply(this, arguments);
              h.addEventListener ? h.addEventListener("readystatechange", d, !1) : setTimeout(function() {
                var c = h.onreadystatechange;
                c && (h.onreadystatechange = function() {
                  d();
                  c.apply(this, arguments);
                });
              }, 0);
              return h;
            };
          }
        });
        if (!eb.browser.msie && !eb.browser.safari && 6 > eb.browser.Kb) {
          var e = jQuery.ajaxSettings.xhr;
          jQuery.ajaxSettings.xhr = function() {
            var c = e();
            c instanceof window.XMLHttpRequest && c.addEventListener("progress", function(c) {
              c.lengthComputable && (c = c.loaded / c.total, jQuery("#toolbar").trigger("onProgressChanged", c));
            }, !1);
            return c;
          };
        }
        jQuery("#" + d.P).trigger("onDocumentLoading");
        c = document.createElement("a");
        c.href = d.Md;
        c.search += 0 < c.search.length ? "&" : "?";
        c.search += "callback=?";
        d.Xq = !1;
        jQuery(d).trigger("loadingProgress", {
          P: d.P,
          progress: 0.3
        });
        0 < d.Md.indexOf("{page}") ? (d.wa = !0, d.Re({
          url: d.zf(null != FLOWPAPER.CHUNK_SIZE ? FLOWPAPER.CHUNK_SIZE : 10),
          dataType: d.config.JSONDataType,
          success: function(c) {
            var e;
            jQuery(d).trigger("loadingProgress", {
              P: d.P,
              progress: 0.9
            });
            if (c.e) {
              var f = CryptoJS.Ee.decrypt(c.e, CryptoJS.qc.De.parse(eb.Sg ? P() : eb.ce.innerHTML));
              c = jQuery.parseJSON(f.toString(CryptoJS.qc.dg));
              d.tf = !0;
            }
            if (0 < c.length) {
              d.S = Array(c[0].pages);
              d.sa = c[0].detailed;
              for (f = 0; f < c.length; f++) {
                d.S[f] = c[f], d.S[f].loaded = !0;
              }
              for (f = 0; f < d.S.length; f++) {
                null == d.S[f] && (d.S[f] = [], d.S[f].loaded = !1);
              }
              0 < d.S.length && (d.bb = d.S[0].twofold, d.bb && (d.Ya = 1));
              if (d.sa) {
                if (d.Ck && 0 < d.Ck.length) {
                  d.Kc || (d.Kc = {});
                  f = 5 > c.length ? c.length : 5;
                  d.hf = [];
                  for (var k = 0; k < f; k++) {
                    if (c[k].fonts && 0 < c[k].fonts.length) {
                      for (e = 0; e < c[k].fonts.length; e++) {
                        d.Kc[c[k].fonts[e].name] || (ha(c[k].fonts[e].name, c[k].fonts[e].data), d.hf.push(c[k].fonts[e].name));
                      }
                    } else {
                      var l = c[k].text;
                      if (l && 0 < l.length) {
                        for (e = 0; e < l.length; e++) {
                          l[e][7] && !d.Kc[l[e][7]] && -1 == d.hf.indexOf(l[e][7]) && 0 == l[e][7].indexOf("g_font") && l[e][7] && d.hf.push(l[e][7]);
                        }
                      }
                    }
                  }
                  d.eh = 0;
                  0 < d.hf.length ? WebFont.load({
                    custom: {
                      families: d.hf
                    },
                    fontactive: function(c) {
                      d.eh++;
                      d.Kc[c] = "loaded";
                      jQuery(d).trigger("loadingProgress", {
                        P: d.P,
                        progress: d.eh / d.hf.length
                      });
                    },
                    fontinactive: function(c) {
                      d.eh++;
                      d.Kc[c] = "loaded";
                      jQuery(d).trigger("loadingProgress", {
                        P: d.P,
                        progress: d.eh / d.hf.length
                      });
                    },
                    inactive: function() {
                      d.fc();
                      d.ya.xc(c);
                    },
                    active: function() {
                      d.fc();
                      d.ya.xc(c);
                    },
                    timeout: 5000
                  }) : (d.fc(), d.ya.xc(c));
                } else {
                  d.fc(), d.ya.xc(c);
                }
              } else {
                d.fc(), d.ya.xc(c);
              }
            }
          },
          error: function(c, e, f) {
            O("Error loading JSON file (" + c.statusText + "," + f + "). Please check your configuration.", "onDocumentLoadedError", d.P, null != c.responseText && 0 == c.responseText.indexOf("Error:") ? c.responseText.substr(6) : "");
          }
        })) : d.Re({
          url: d.Md,
          dataType: d.config.JSONDataType,
          success: function(c) {
            jQuery(d).trigger("loadingProgress", {
              P: d.P,
              progress: 0.9
            });
            c.e && (c = CryptoJS.Ee.decrypt(c.e, CryptoJS.qc.De.parse(eb.Sg ? P() : eb.ce.innerHTML)), c = jQuery.parseJSON(c.toString(CryptoJS.qc.dg)), d.tf = !0);
            d.S = c;
            for (var e = 0; e < c.length; e++) {
              c[e].loaded = !0;
            }
            d.fc();
            d.ya.xc(c);
          },
          onreadystatechange: function() {},
          error: function(c, e, f) {
            O("Error loading JSON file (" + c.statusText + "," + f + "). Please check your configuration.", "onDocumentLoadedError", d.P, null != c.responseText && 0 == c.responseText.indexOf("Error:") ? c.responseText.substr(6) : "");
          }
        });
      },
      getDimensions: function(c, d) {
        var e = this.S.length;
        null == c && (c = 0);
        null == d && (d = e);
        if (null == this.dimensions || d && c) {
          for (null == this.dimensions && (this.dimensions = [], this.qa = []), e = c; e < d; e++) {
            this.S[e].loaded ? (this.dimensions[e] = [], this.Gl(e), null == this.pc && (this.pc = this.dimensions[e])) : null != this.pc && (this.dimensions[e] = [], this.dimensions[e].page = e, this.dimensions[e].loaded = !1, this.dimensions[e].width = this.pc.width, this.dimensions[e].height = this.pc.height, this.dimensions[e].na = this.pc.na, this.dimensions[e].za = this.pc.za);
          }
        }
        return this.dimensions;
      },
      Gl: function(c) {
        if (this.dimensions[c]) {
          this.dimensions[c].page = c;
          this.dimensions[c].loaded = !0;
          this.dimensions[c].width = this.S[c][this.JSONPageDataFormat.kf];
          this.dimensions[c].height = this.S[c][this.JSONPageDataFormat.jf];
          this.dimensions[c].na = this.dimensions[c].width;
          this.dimensions[c].za = this.dimensions[c].height;
          this.qa[c] = [];
          this.qa[c] = "";
          900 < this.dimensions[c].width && (this.dimensions[c].width = 918, this.dimensions[c].height = 1188);
          for (var d = null, e = 0, g; g = this.S[c][this.JSONPageDataFormat.Ae][e++];) {
            this.Fa ? !isNaN(g[0].toString()) && 0 <= Number(g[0].toString()) && !isNaN(g[1].toString()) && 0 <= Number(g[1].toString()) && !isNaN(g[2].toString()) && 0 < Number(g[2].toString()) && !isNaN(g[3].toString()) && 0 < Number(g[3].toString()) && (d && Math.round(d[0]) != Math.round(g[0]) && Math.round(d[1]) == Math.round(g[1]) && (this.qa[c] += " "), d && Math.round(d[0]) != Math.round(g[0]) && !this.qa[c].endsWith(" ") && (this.qa[c] += " "), d = /\\u([\d\w]{4})/gi, d = (g[5] + "").replace(d, function(c, d) {
              return String.fromCharCode(parseInt(d, 16));
            }), this.config.RTLMode || (this.qa[c] += d), this.config.RTLMode && (this.qa[c] += Q(d))) : !isNaN(g[this.JSONPageDataFormat.lc].toString()) && 0 <= Number(g[this.JSONPageDataFormat.lc].toString()) && !isNaN(g[this.JSONPageDataFormat.Ab].toString()) && 0 <= Number(g[this.JSONPageDataFormat.Ab].toString()) && !isNaN(g[this.JSONPageDataFormat.Ad].toString()) && 0 < Number(g[this.JSONPageDataFormat.Ad].toString()) && !isNaN(g[this.JSONPageDataFormat.zd].toString()) && 0 < Number(g[this.JSONPageDataFormat.zd].toString()) && (d && Math.round(d[this.JSONPageDataFormat.Ab]) != Math.round(g[this.JSONPageDataFormat.Ab]) && Math.round(d[this.JSONPageDataFormat.lc]) == Math.round(prev[this.JSONPageDataFormat.lc]) && (this.qa[c] += " "), d && Math.round(d[this.JSONPageDataFormat.Ab]) != Math.round(g[this.JSONPageDataFormat.Ab]) && !this.qa[c].endsWith(" ") && (this.qa[c] += " "), d = /\\u([\d\w]{4})/gi, d = (g[this.JSONPageDataFormat.qb] + "").replace(d, function(c, d) {
              return String.fromCharCode(parseInt(d, 16));
            }), this.config.RTLMode || (this.qa[c] += d), this.config.RTLMode && (this.qa[c] += Q(d))), d = g;
          }
          this.qa[c] = this.qa[c].toLowerCase();
        }
      },
      Kd: function(c) {
        this.mb = !1;
        if ("Portrait" == c.H || "SinglePage" == c.H) {
          "Portrait" == c.H && c.M(c.V).addClass("flowpaper_hidden"), this.zb ? c.M(c.va).append("<object data='" + this.ea + "' type='image/svg+xml' id='" + c.page + "' class='flowpaper_interactivearea " + (this.config.DisableShadows ? "" : "flowpaper_border") + " flowpaper_grab flowpaper_hidden flowpaper_rescale' style='" + c.getDimensions() + "' /></div>") : this.sa ? c.M(c.va).append("<canvas id='" + c.page + "' class='flowpaper_interactivearea " + (this.config.DisableShadows ? "" : "flowpaper_border") + " flowpaper_grab flowpaper_hidden flowpaper_rescale' style='" + c.getDimensions() + ";background-size:cover;' />") : c.M(c.va).append("<img alt='' src='" + this.ea + "' id='" + c.page + "' class='flowpaper_interactivearea " + (this.config.DisableShadows ? "" : "flowpaper_border") + " flowpaper_grab flowpaper_hidden flowpaper_rescale' style='" + c.getDimensions() + ";background-size:cover;' />"), "SinglePage" == c.H && 0 == c.pageNumber && this.lh(c, c.V);
        }
        "ThumbView" == c.H && jQuery(c.V).append("<img src='" + this.ea + "' alt='" + this.ia(c.pageNumber + 1) + "'  id='" + c.page + "' class='flowpaper_hidden' style='" + c.getDimensions() + "'/>");
        c.H == this.Ja(c) && this.ub(c).Kd(this, c);
        if ("TwoPage" == c.H || "BookView" == c.H) {
          0 == c.pageNumber && (jQuery(c.V + "_1").append("<img id='" + c.Xb + "_1' class='flowpaper_pageLoader' src='" + c.ef + "' style='position:absolute;left:50%;top:" + c.Ga() / 4 + "px;margin-left:-32px;' />"), jQuery(c.V + "_1").append("<img src='" + this.ea + "' alt='" + this.ia(c.pageNumber + 1) + "'  id='" + c.page + "' class='flowpaper_interactivearea flowpaper_grab flowpaper_hidden flowpaper_load_on_demand' style='" + c.getDimensions() + ";position:absolute;background-size:cover;'/>"), jQuery(c.V + "_1").append("<div id='" + c.aa + "_1_textoverlay' style='position:relative;left:0px;top:0px;width:100%;height:100%;'></div>")), 1 == c.pageNumber && (jQuery(c.V + "_2").append("<img id='" + c.Xb + "_2' class='flowpaper_pageLoader' src='" + c.ef + "' style='position:absolute;left:50%;top:" + c.Ga() / 4 + "px;margin-left:-32px;' />"), jQuery(c.V + "_2").append("<img src='" + this.ea + "' alt='" + this.ia(c.pageNumber + 1) + "'  id='" + c.page + "' class='flowpaper_interactivearea flowpaper_grab flowpaper_hidden flowpaper_load_on_demand' style='" + c.getDimensions() + ";position:absolute;left:0px;top:0px;background-size:cover;'/>"), jQuery(c.V + "_2").append("<div id='" + c.aa + "_2_textoverlay' style='position:absolute;left:0px;top:0px;width:100%;height:100%;'></div>"));
        }
      },
      Re: function(c) {
        var d = this;
        if ("lz" == d.config.JSONDataType) {
          if ("undefined" === typeof Worker || eb.browser.msie && 11 > eb.browser.version) {
            sa(c.url, function(d, e) {
              requestAnim(function() {
                var d = "undefined" != typeof Uint8Array ? new Uint8Array(e) : e,
                  d = pako.inflate(d, {
                    to: "string"
                  });
                "undefined" !== typeof Response ? (new Response(d)).json().then(function(d) {
                  c.success(d);
                }) : c.success(JSON.parse(d));
              }, 10);
            });
          } else {
            var e = document.location.href.substr(0, document.location.href.lastIndexOf("/") + 1); - 1 == c.url.indexOf("http") && (c.url = e + c.url);
            d.Sb || (d.Sb = {});
            d.Sb[c.url] = c;
            d.bf || (d.bf = new Worker(("undefined" != d.jsDirectory && null != d.jsDirectory ? d.jsDirectory : "js/") + "flowpaper.worker.js"), d.bf.addEventListener("message", function(c) {
              d.Sb[c.data.url] && ("undefined" !== typeof Response ? (new Response(c.data.JSON)).json().then(function(e) {
                d.Sb[c.data.url].success(e);
                d.Sb[c.data.url] = null;
              }) : (d.Sb[c.data.url].success(JSON.parse(c.data.JSON)), d.Sb[c.data.url] = null));
            }, !1));
            d.bf.postMessage(c.url);
          }
        } else {
          return jQuery.ajax(c);
        }
      },
      zf: function(c) {
        return this.Md.replace("{page}", c);
      },
      ia: function(c, d, e) {
        this.config.RTLMode && this.S && this.S.length && (c = this.S.length - c + 1);
        this.config.PageIndexAdjustment && (c += this.config.PageIndexAdjustment);
        this.tf && (c = CryptoJS.Ee.encrypt(c.toString(), CryptoJS.qc.De.parse(eb.Sg ? P() : eb.ce.innerHTML)).toString());
        return !e || e && !this.pageSVGImagePattern ? d ? null != this.pageThumbImagePattern && 0 < this.pageThumbImagePattern.length ? 0 < this.pageThumbImagePattern.indexOf("?") ? this.pageThumbImagePattern.replace("{page}", c) + "&resolution=" + d : this.pageThumbImagePattern.replace("{page}", c) + "?resolution=" + d : 0 < this.pageImagePattern.indexOf("?") ? this.pageImagePattern.replace("{page}", c) + "&resolution=" + d : this.pageImagePattern.replace("{page}", c) + "?resolution=" + d : this.pageImagePattern.replace("{page}", c) : d ? null != this.pageThumbImagePattern && 0 < this.pageThumbImagePattern.length ? this.pageThumbImagePattern.replace("{page}", c) : 0 < this.pageSVGImagePattern.indexOf("?") ? this.pageSVGImagePattern.replace("{page}", c) + "&resolution=" + d : this.pageSVGImagePattern.replace("{page}", c) + "?resolution=" + d : this.pageSVGImagePattern.replace("{page}", c);
      },
      Hb: function(c, d) {
        return this.aj.replace("{page}", c).replace("{sector}", d);
      },
      Ef: function(c) {
        var d = null != FLOWPAPER.CHUNK_SIZE ? FLOWPAPER.CHUNK_SIZE : 10;
        return 0 === d ? c : c + (d - c % d);
      },
      tc: function(c, d, e) {
        var g = this;
        g.nd != g.Ef(c) && (g.nd = g.Ef(c), g.Re({
          url: g.zf(g.nd),
          dataType: g.config.JSONDataType,
          async: d,
          success: function(c) {
            c.e && (c = CryptoJS.Ee.decrypt(c.e, CryptoJS.qc.De.parse(eb.Sg ? P() : eb.ce.innerHTML)), c = jQuery.parseJSON(c.toString(CryptoJS.qc.dg)), g.tf = !0);
            if (0 < c.length) {
              for (var d = 0; d < c.length; d++) {
                var f = parseInt(c[d].number) - 1;
                g.S[f] = c[d];
                g.S[f].loaded = !0;
                g.Gl(f);
              }
              g.ya.xc(g.S);
              jQuery(g).trigger("onTextDataUpdated", c[0].number);
              null != e && e();
            }
            g.nd = null;
          },
          error: function(c) {
            O("Error loading JSON file (" + c.statusText + "). Please check your configuration.", "onDocumentLoadedError", g.P);
            g.nd = null;
          }
        }));
      },
      Da: function(c) {
        return c.Me;
      },
      Ha: function(c, d) {
        c.Me = d;
      },
      $b: function(c, d, e) {
        var g = this;
        if (c.H != g.Ja(c) && -1 < g.Da(c)) {
          window.clearTimeout(c.kc), c.kc = setTimeout(function() {
            g.$b(c, d, e);
          }, 250);
        } else {
          if (g.sa && c.H != g.Ja(c) && (!g.Oe && c.Mk != c.scale || g.Oe && !c.Nk || "SinglePage" == c.H) && ("Portrait" == c.H || "SinglePage" == c.H)) {
            "SinglePage" != c.H ? g.Ha(c, c.pageNumber) : 0 <= g.Da(c) && jQuery(c.oa).css("background-image", "url('" + g.ia(c.pages.R + 1) + "')");
            var h = jQuery(c.oa).get(0),
              f = 1.5 < g.Ya ? g.Ya : 1.5;
            g.Oe && (f = 2);
            h.width = jQuery(h).width() * f;
            h.height = jQuery(h).height() * f;
            c.Mk = c.scale;
            jQuery(h).data("needs-overlay", 1);
            c.Nk || (c.Nk = !0);
            g.Oe ? (c.U = new Image, jQuery(c.U).bind("load", function() {
              var d = jQuery(c.oa).get(0);
              d.getContext("2d").drawImage(c.U, 0, 0, d.width, d.height);
              c.Ud(d).then(function() {
                jQuery("#" + g.P).trigger("onPageLoaded", c.pageNumber + 1);
              }, function() {});
            }), jQuery(c.U).attr("src", g.ia(c.pageNumber + 1, "ThumbView" == c.H ? 200 : null))) : c.Ud(h).then(function() {}, function() {});
          }
          if (!c.pa || c.H == g.Ja(c)) {
            f = c.yg;
            if ("Portrait" == c.H || "SinglePage" == c.H || "TwoPage" == c.H || "BookView" == c.H || c.H == g.Ja(c)) {
              var k = c.xa(),
                l = c.Ga(),
                h = c.Vb();
              0 == jQuery("#" + f).length ? (f = "<div id='" + f + "' class='flowpaper_textLayer' style='width:" + k + "px;height:" + l + "px;margin-left:" + h + "px;'></div>", "Portrait" == c.H || g.Ja(c) || "SinglePage" == c.H ? jQuery(c.va).append(f) : "TwoPage" != c.H && "BookView" != c.H || jQuery(c.va + "_" + (c.pageNumber % 2 + 1)).append(f)) : jQuery("#" + f).css({
                width: k,
                height: l,
                "margin-left": h
              });
              if (90 == c.rotation || 270 == c.rotation || 180 == c.rotation) {
                jQuery(c.xb).css({
                  "z-index": 11,
                  "margin-left": h
                }), jQuery(c.xb).transition({
                  rotate: c.rotation,
                  translate: "-" + h + "px, 0px"
                }, 0);
              }
            }
            if ("Portrait" == c.H || "ThumbView" == c.H) {
              c.pa || jQuery(c.oa).attr("src") != g.ea && !g.zb && !g.sa || c.Xe || (g.Ha(c, c.pageNumber), c.dimensions.loaded || g.tc(c.pageNumber + 1, !0, function() {
                g.Dc(c);
              }), c.Qc(), g.U = new Image, jQuery(g.U).bind("load", function() {
                c.Xe = !0;
                c.Ye = this.height;
                c.Ze = this.width;
                g.Pc(c);
                c.dimensions.na > c.dimensions.width && (c.dimensions.width = c.dimensions.na, c.dimensions.height = c.dimensions.za, "Portrait" != c.H && "SinglePage" != c.H || c.Pa());
              }).bind("error", function() {
                O("Error loading image (" + this.src + ")", "onErrorLoadingPage", g.P, c.pageNumber);
              }), jQuery(g.U).bind("error", function() {
                g.Ha(c, -1);
              }), jQuery(g.U).attr("src", g.ia(c.pageNumber + 1, "ThumbView" == c.H ? 200 : null))), !c.pa && jQuery(c.oa).attr("src") == g.ea && c.Xe && g.Pc(c), null != e && e();
            }
            c.H == g.Ja(c) && (c.dimensions.loaded || g.dimensions[c.pageNumber - 1].loaded && (g.getNumPages() != c.pageNumber + 1 || 0 != g.getNumPages() % 2) || g.tc(c.pageNumber + 1, !0, function() {
              g.Dc(c);
            }), g.ub(c).$b(g, c, d, e));
            "SinglePage" == c.H && (c.uc || (c.Qc(), c.uc = !0), 0 == c.pageNumber && (g.Ha(c, c.pages.R), g.getDimensions()[g.Da(c)].loaded || g.tc(g.Da(c) + 1, !0, function() {
              g.Dc(c);
            }), g.U = new Image, jQuery(g.U).bind("load", function() {
              c.Xe = !0;
              c.Ye = this.height;
              c.Ze = this.width;
              c.Jb();
              g.Pc(c);
              c.dimensions.na > c.dimensions.width && (c.dimensions.width = c.dimensions.na, c.dimensions.height = c.dimensions.za, c.Pa());
              c.pa || jQuery("#" + g.P).trigger("onPageLoaded", c.pageNumber + 1);
              c.pa = !0;
              g.Ha(c, -1);
            }), jQuery(g.U).bind("error", function() {
              c.Jb();
              g.Ha(c, -1);
            }), jQuery(g.U).attr("src", g.ia(c.pages.R + 1)), jQuery(c.V + "_1").removeClass("flowpaper_load_on_demand"), null != e && e()));
            if ("TwoPage" == c.H || "BookView" == c.H) {
              c.uc || (c.Qc(), c.uc = !0), 0 == c.pageNumber ? (jQuery(c.oa), "BookView" == c.H ? g.Ha(c, 0 != c.pages.R ? c.pages.R : c.pages.R + 1) : "TwoPage" == c.H && g.Ha(c, c.pages.R), g.getDimensions()[g.Da(c) - 1] && !g.getDimensions()[g.Da(c) - 1].loaded && g.tc(g.Da(c) + 1, !0, function() {
                g.Dc(c);
              }), g.U = new Image, jQuery(g.U).bind("load", function() {
                c.Xe = !0;
                c.Ye = this.height;
                c.Ze = this.width;
                c.Jb();
                g.Pc(c);
                c.dimensions.na > c.dimensions.width && (c.dimensions.width = c.dimensions.na, c.dimensions.height = c.dimensions.za, c.Pa());
                c.pa || jQuery("#" + g.P).trigger("onPageLoaded", c.pageNumber + 1);
                c.pa = !0;
                g.Ha(c, -1);
              }), jQuery(g.U).bind("error", function() {
                c.Jb();
                g.Ha(c, -1);
              }), "BookView" == c.H && jQuery(g.U).attr("src", g.ia(0 != c.pages.R ? c.pages.R : c.pages.R + 1)), "TwoPage" == c.H && jQuery(g.U).attr("src", g.ia(c.pages.R + 1)), jQuery(c.V + "_1").removeClass("flowpaper_load_on_demand"), null != e && e()) : 1 == c.pageNumber && (h = jQuery(c.oa), c.pages.R + 1 > c.pages.getTotalPages() ? h.attr("src", "") : (0 != c.pages.R || "TwoPage" == c.H ? (g.Ha(c, c.pages.R + 1), g.U = new Image, jQuery(g.U).bind("load", function() {
                c.Jb();
                g.Pc(c);
                c.dimensions.na > c.dimensions.width && (c.dimensions.width = c.dimensions.na, c.dimensions.height = c.dimensions.za);
                c.pa || jQuery("#" + g.P).trigger("onPageLoaded", c.pageNumber + 1);
                c.pa = !0;
                g.Ha(c, -1);
              }), jQuery(g.U).bind("error", function() {
                g.Ha(c, -1);
                c.Jb();
              })) : c.Jb(), "BookView" == c.H && jQuery(g.U).attr("src", g.ia(c.pages.R + 1)), "TwoPage" == c.H && jQuery(g.U).attr("src", g.ia(c.pages.R + 2)), 1 < c.pages.R && jQuery(c.V + "_2").removeClass("flowpaper_hidden"), jQuery(c.V + "_2").removeClass("flowpaper_load_on_demand")), null != e && e());
            }
          }
        }
      },
      Pc: function(c) {
        if ("Portrait" != c.H || Math.round(c.Ze / c.Ye * 100) == Math.round(c.dimensions.width / c.dimensions.height * 100) && !this.zb || eb.browser.msie && 9 > eb.browser.version) {
          c.H == this.Ja(c) ? this.ub(c).Pc(this, c) : "TwoPage" == c.H || "BookView" == c.H ? (0 == c.pageNumber && (d = "BookView" == c.H ? 0 != c.pages.R ? c.pages.R : c.pages.R + 1 : c.pages.R + 1, c.yh != d && (eb.browser.msie || eb.browser.safari && 5 > eb.browser.Kb ? jQuery(c.oa).attr("src", this.ia(d)) : jQuery(c.oa).css("background-image", "url('" + this.ia(d) + "')"), jQuery(c.V + "_1").removeClass("flowpaper_hidden"), c.yh = d), jQuery(c.oa).removeClass("flowpaper_hidden")), 1 == c.pageNumber && (d = "BookView" == c.H ? c.pages.R + 1 : c.pages.R + 2, c.yh != d && (eb.browser.msie || eb.browser.safari && 5 > eb.browser.Kb ? jQuery(c.oa).attr("src", this.ia(d)) : jQuery(c.oa).css("background-image", "url('" + this.ia(d) + "')"), c.yh = d, "TwoPage" == c.H && jQuery(c.V + "_2").removeClass("flowpaper_hidden")), jQuery(c.oa).removeClass("flowpaper_hidden")), c.pa || jQuery("#" + this.P).trigger("onPageLoaded", c.pageNumber + 1), c.pa = !0) : "SinglePage" == c.H ? (this.sa ? jQuery(c.oa).css("background-image", "url('" + this.ia(this.Da(c) + 1) + "')") : jQuery(c.oa).attr("src", this.ia(this.Da(c) + 1)), jQuery("#" + c.Xb).hide(), c.pa || jQuery("#" + this.P).trigger("onPageLoaded", c.pageNumber + 1), c.pa = !0) : this.Oe ? this.Oe && (jQuery("#" + c.Xb).hide(), c.pa || jQuery("#" + this.P).trigger("onPageLoaded", c.pageNumber + 1), c.pa = !0) : (this.zb ? (jQuery(c.oa).attr("data", this.ia(c.pageNumber + 1, null, !0)), jQuery(c.V).removeClass("flowpaper_load_on_demand")) : this.sa ? jQuery(c.oa).css("background-image", "url('" + this.ia(c.pageNumber + 1) + "')") : jQuery(c.oa).attr("src", this.ia(c.pageNumber + 1), "ThumbView" == c.H ? 200 : null), jQuery("#" + c.Xb).hide(), c.pa || jQuery("#" + this.P).trigger("onPageLoaded", c.pageNumber + 1), c.pa = !0);
        } else {
          if (this.zb) {
            jQuery(c.oa).attr("data", this.ia(c.pageNumber + 1, null, !0)), jQuery(c.V).removeClass("flowpaper_load_on_demand"), jQuery(c.oa).css("width", jQuery(c.oa).css("width"));
          } else {
            if (this.Oe && this.sa) {
              var d = jQuery(c.oa).css("background-image");
              0 < d.length && "none" != d ? (jQuery(c.oa).css("background-image", d + ",url('" + this.ia(c.pageNumber + 1) + "')"), jQuery("#" + this.P).trigger("onPageLoaded", c.pageNumber + 1), aa(jQuery(c.oa).get(0))) : jQuery(c.oa).css("background-image", "url('" + this.ia(c.pageNumber + 1) + "')");
            } else {
              jQuery(c.oa).css("background-image", "url('" + this.ia(c.pageNumber + 1) + "')"), jQuery(c.oa).attr("src", this.ea);
            }
          }
          jQuery("#" + c.Xb).hide();
          c.pa || this.sa || jQuery("#" + this.P).trigger("onPageLoaded", c.pageNumber + 1);
          c.pa = !0;
        }
        this.Ha(c, -1);
        this.Jf || (this.Jf = !0, c.F.wh());
      },
      yl: function(c) {
        "TwoPage" == c.H || "BookView" == c.H ? (0 == c.pageNumber && jQuery(c.ga).css("background-image", "url(" + this.ea + ")"), 1 == c.pageNumber && jQuery(c.ga).css("background-image", "url(" + this.ea + ")")) : jQuery(c.ga).css("background-image", "url(" + this.ea + ")");
      },
      unload: function(c) {
        jQuery(c.V).addClass("flowpaper_load_on_demand");
        var d = null;
        if ("Portrait" == c.H || "ThumbView" == c.H || "SinglePage" == c.H) {
          d = jQuery(c.oa);
        }
        if ("TwoPage" == c.H || "BookView" == c.H) {
          d = jQuery(c.oa), jQuery(c.oa).addClass("flowpaper_hidden");
        }
        c.H == this.Ja(c) && this.ub(c).unload(this, c);
        null != d && 0 < d.length && (d.attr("alt", d.attr("src")), d.attr("src", "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"));
        c.uc = !1;
        c.yh = -1;
        jQuery(".flowpaper_pageword_" + this.P + "_page_" + c.pageNumber + ":not(.flowpaper_selected_searchmatch, .flowpaper_annotation_" + this.P + ")").remove();
        c.ej && c.ej();
        jQuery(".flowpaper_annotation_" + this.P + "_page_" + c.pageNumber).remove();
        c.Gg && c.Gg();
      },
      getNumPages: function() {
        return this.S.length;
      },
      Dc: function(c, d, e, g) {
        this.ya.Dc(c, d, e, g);
      },
      Cc: function(c, d, e, g) {
        this.ya.Cc(c, d, e, g);
      },
      Fe: function(c, d, e, g) {
        this.ya.Fe(c, d, e, g);
      },
      Ea: function(c, d, e) {
        this.ya.Ea(c, e);
      },
      lh: function(c, d) {
        if (this.mb) {
          if (c.scale < c.rg()) {
            c.Tl = d, c.Ul = !1;
          } else {
            !d && c.Tl && (d = c.Tl);
            var e = 0.25 * Math.round(c.Ei()),
              g = 0.25 * Math.round(c.Di());
            jQuery(".flowpaper_flipview_canvas_highres_" + c.pageNumber).remove();
            null == d && (d = c.V);
            var h = eb.platform.Ld || eb.platform.android ? "flowpaper_flipview_canvas_highres" : c.aa + "_canvas_highres";
            jQuery(d).append(String.format("<div id='" + c.aa + "_canvas_highres_l1t1' class='{4}' style='z-index:11;position:relative;float:left;background-repeat:no-repeat;background-size:100% 100%;width:{2}px;height:{3}px;clear:both;'></div>", 0, 0, e, g, h) + String.format("<div id='" + c.aa + "_canvas_highres_l2t1' class='{4}' style='z-index:11;position:relative;float:left;background-repeat-no-repeat;background-size:100% 100%;width:{2}px;height:{3}px;'></div>", e + 0 + 0, 0, e, g, h) + String.format("<div id='" + c.aa + "_canvas_highres_r1t1' class='{4}' style='z-index:11;position:relative;float:left;background-repeat-no-repeat;background-size:100% 100%;width:{2}px;height:{3}px;'></div>", 2 * e + 0, 0, e, g, h) + String.format("<div id='" + c.aa + "_canvas_highres_r2t1' class='{4}' style='z-index:11;position:relative;float:left;background-repeat-no-repeat;background-size:100% 100%;width:{2}px;height:{3}px;'></div>", 3 * e + 0, 0, e, g, h) + String.format("<div id='" + c.aa + "_canvas_highres_l1t2' class='{4}' style='z-index:11;position:relative;float:left;background-repeat-no-repeat;background-size:100% 100%;width:{2}px;height:{3}px;clear:both;'></div>", 0, g + 0 + 0, e, g, h) + String.format("<div id='" + c.aa + "_canvas_highres_l2t2' class='{4}' style='z-index:11;position:relative;float:left;background-repeat-no-repeat;background-size:100% 100%;width:{2}px;height:{3}px;'></div>", e + 0 + 0, g + 0 + 0, e, g, h) + String.format("<div id='" + c.aa + "_canvas_highres_r1t2' class='{4}' style='z-index:11;position:relative;float:left;background-repeat-no-repeat;background-size:100% 100%;width:{2}px;height:{3}px;'></div>", 2 * e + 0, g + 0 + 0, e, g, h) + String.format("<div id='" + c.aa + "_canvas_highres_r2t2' class='{4}' style='z-index:11;position:relative;float:left;background-repeat-no-repeat;background-size:100% 100%;width:{2}px;height:{3}px;'></div>", 3 * e + 0, g + 0 + 0, e, g, h) + String.format("<div id='" + c.aa + "_canvas_highres_l1b1' class='{4}' style='z-index:11;position:relative;float:left;background-repeat-no-repeat;background-size:100% 100%;width:{2}px;height:{3}px;clear:both;'></div>", 0, 2 * g + 0, e, g, h) + String.format("<div id='" + c.aa + "_canvas_highres_l2b1' class='{4}' style='z-index:11;position:relative;float:left;background-repeat-no-repeat;background-size:100% 100%;width:{2}px;height:{3}px;'></div>", e + 0 + 0, 2 * g + 0, e, g, h) + String.format("<div id='" + c.aa + "_canvas_highres_r1b1' class='{4}' style='z-index:11;position:relative;float:left;background-repeat-no-repeat;background-size:100% 100%;width:{2}px;height:{3}px;'></div>", 2 * e + 0, 2 * g + 0, e, g, h) + String.format("<div id='" + c.aa + "_canvas_highres_r2b1' class='{4}' style='z-index:11;position:relative;float:left;background-repeat-no-repeat;background-size:100% 100%;width:{2}px;height:{3}px;'></div>", 3 * e + 0, 2 * g + 0, e, g, h) + String.format("<div id='" + c.aa + "_canvas_highres_l1b2' class='{4}' style='z-index:11;position:relative;float:left;background-repeat-no-repeat;background-size:100% 100%;width:{2}px;height:{3}px;clear:both;'></div>", 0, 3 * g + 0, e, g, h) + String.format("<div id='" + c.aa + "_canvas_highres_l2b2' class='{4}' style='z-index:11;position:relative;float:left;background-repeat-no-repeat;background-size:100% 100%;width:{2}px;height:{3}px;'></div>", e + 0 + 0, 3 * g + 0, e, g, h) + String.format("<div id='" + c.aa + "_canvas_highres_r1b2' class='{4}' style='z-index:11;position:relative;float:left;background-repeat-no-repeat;background-size:100% 100%;width:{2}px;height:{3}px;'></div>", 2 * e + 0, 3 * g + 0, e, g, h) + String.format("<div id='" + c.aa + "_canvas_highres_r2b2' class='{4}' style='z-index:11;position:relative;float:left;background-repeat-no-repeat;background-size:100% 100%;width:{2}px;height:{3}px;'></div>", 3 * e + 0, 3 * g + 0, e, g, h) + "");
            c.Ul = !0;
          }
        }
      },
      Nc: function(c) {
        if (!(c.scale < c.rg())) {
          !c.Ul && this.mb && this.lh(c);
          if (this.mb) {
            var d = document.getElementById(c.aa + "_canvas_highres_l1t1"),
              e = document.getElementById(c.aa + "_canvas_highres_l2t1"),
              g = document.getElementById(c.aa + "_canvas_highres_l1t2"),
              h = document.getElementById(c.aa + "_canvas_highres_l2t2"),
              f = document.getElementById(c.aa + "_canvas_highres_r1t1"),
              k = document.getElementById(c.aa + "_canvas_highres_r2t1"),
              l = document.getElementById(c.aa + "_canvas_highres_r1t2"),
              n = document.getElementById(c.aa + "_canvas_highres_r2t2"),
              q = document.getElementById(c.aa + "_canvas_highres_l1b1"),
              t = document.getElementById(c.aa + "_canvas_highres_l2b1"),
              r = document.getElementById(c.aa + "_canvas_highres_l1b2"),
              m = document.getElementById(c.aa + "_canvas_highres_l2b2"),
              u = document.getElementById(c.aa + "_canvas_highres_r1b1"),
              v = document.getElementById(c.aa + "_canvas_highres_r2b1"),
              x = document.getElementById(c.aa + "_canvas_highres_r1b2"),
              z = document.getElementById(c.aa + "_canvas_highres_r2b2");
            if (1 == c.pageNumber && 1 == c.pages.R || c.pageNumber == c.pages.R - 1 || c.pageNumber == c.pages.R - 2) {
              var w = c.H == this.Ja(c) ? c.pages.J : null,
                D = c.H == this.Ja(c) ? c.pageNumber + 1 : c.pages.R + 1;
              jQuery(d).visible(!0, w) && "none" === jQuery(d).css("background-image") && jQuery(d).css("background-image", "url('" + this.Hb(D, "l1t1") + "')");
              jQuery(e).visible(!0, w) && "none" === jQuery(e).css("background-image") && jQuery(e).css("background-image", "url('" + this.Hb(D, "l2t1") + "')");
              jQuery(g).visible(!0, w) && "none" === jQuery(g).css("background-image") && jQuery(g).css("background-image", "url('" + this.Hb(D, "l1t2") + "')");
              jQuery(h).visible(!0, w) && "none" === jQuery(h).css("background-image") && jQuery(h).css("background-image", "url('" + this.Hb(D, "l2t2") + "')");
              jQuery(f).visible(!0, w) && "none" === jQuery(f).css("background-image") && jQuery(f).css("background-image", "url('" + this.Hb(D, "r1t1") + "')");
              jQuery(k).visible(!0, w) && "none" === jQuery(k).css("background-image") && jQuery(k).css("background-image", "url('" + this.Hb(D, "r2t1") + "')");
              jQuery(l).visible(!0, w) && "none" === jQuery(l).css("background-image") && jQuery(l).css("background-image", "url('" + this.Hb(D, "r1t2") + "')");
              jQuery(n).visible(!0, w) && "none" === jQuery(n).css("background-image") && jQuery(n).css("background-image", "url('" + this.Hb(D, "r2t2") + "')");
              jQuery(q).visible(!0, w) && "none" === jQuery(q).css("background-image") && jQuery(q).css("background-image", "url('" + this.Hb(D, "l1b1") + "')");
              jQuery(t).visible(!0, w) && "none" === jQuery(t).css("background-image") && jQuery(t).css("background-image", "url('" + this.Hb(D, "l2b1") + "')");
              jQuery(r).visible(!0, w) && "none" === jQuery(r).css("background-image") && jQuery(r).css("background-image", "url('" + this.Hb(D, "l1b2") + "')");
              jQuery(m).visible(!0, w) && "none" === jQuery(m).css("background-image") && jQuery(m).css("background-image", "url('" + this.Hb(D, "l2b2") + "')");
              jQuery(u).visible(!0, w) && "none" === jQuery(u).css("background-image") && jQuery(u).css("background-image", "url('" + this.Hb(D, "r1b1") + "')");
              jQuery(v).visible(!0, w) && "none" === jQuery(v).css("background-image") && jQuery(v).css("background-image", "url('" + this.Hb(D, "r2b1") + "')");
              jQuery(x).visible(!0, w) && "none" === jQuery(x).css("background-image") && jQuery(x).css("background-image", "url('" + this.Hb(D, "r1b2") + "')");
              jQuery(z).visible(!0, w) && "none" === jQuery(z).css("background-image") && jQuery(z).css("background-image", "url('" + this.Hb(D, "r2b2") + "')");
            }
          }
          c.wl = !0;
        }
      },
      Fc: function(c) {
        if (this.mb) {
          var d = eb.platform.Ld || eb.platform.android ? "flowpaper_flipview_canvas_highres" : c.aa + "_canvas_highres";
          c.wl && 0 < jQuery("." + d).length && (jQuery("." + d).css("background-image", ""), c.wl = !1);
        }
      }
    };
    return f;
  }(),
  CanvasPageRenderer = window.CanvasPageRenderer = function() {
    function f(c, d, e, g) {
      this.P = c;
      this.file = d;
      this.jsDirectory = e;
      this.initialized = !1;
      this.JSONPageDataFormat = this.La = this.dimensions = null;
      this.pageThumbImagePattern = g.pageThumbImagePattern;
      this.pageImagePattern = g.pageImagePattern;
      this.config = g;
      this.Zg = this.P + "_dummyPageCanvas_[pageNumber]";
      this.oi = "#" + this.Zg;
      this.$g = this.P + "dummyPageCanvas2_[pageNumber]";
      this.pi = "#" + this.$g;
      this.pb = [];
      this.context = this.ga = null;
      this.Ra = [];
      this.Eh = [];
      this.sb = this.Jf = !1;
      this.ea = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
      this.uh = 1;
      this.qa = [];
      this.zg = {};
      this.JSONPageDataFormat = null;
      this.ie = !0;
      this.Fa = null != g.compressedJSONFormat ? g.compressedJSONFormat : !0;
      this.fi = [];
    }
    f.prototype = {
      Gf: function() {
        return "CanvasPageRenderer";
      },
      Ja: function(c) {
        return c.F ? c.F.I ? c.F.I.W : "" : !1;
      },
      ub: function(c) {
        return c.F.I.qn;
      },
      dispose: function() {
        jQuery(this.ya).unbind();
        this.ya.dispose();
        delete this.fc;
        this.fc = null;
        delete this.dimensions;
        this.dimensions = null;
        delete this.ya;
        this.ya = null;
        delete this.Ra;
        this.Ra = null;
        delete this.Eh;
        this.Eh = null;
      },
      initialize: function(c, d) {
        var e = this;
        e.fc = c;
        e.Ya = eb.platform.Ya;
        1 < e.Ya && eb.platform.touchonlydevice && (e.Ya = 1);
        e.config.MixedMode && (eb.browser.ff || eb.browser.msie) && 0 == e.file.indexOf("http") && (e.config.MixedMode = !1);
        e.Qo = ("undefined" != e.jsDirectory && null != e.jsDirectory ? e.jsDirectory : "js/") + "pdf.min.js";
        e.Fa ? e.JSONPageDataFormat = {
          kf: "width",
          jf: "height",
          Ae: "text",
          qb: "d",
          Cg: "f",
          lc: "l",
          Ab: "t",
          Ad: "w",
          zd: "h"
        } : e.JSONPageDataFormat = {
          kf: e.config.JSONPageDataFormat.pageWidth,
          jf: e.config.JSONPageDataFormat.pageHeight,
          Ae: e.config.JSONPageDataFormat.textCollection,
          qb: e.config.JSONPageDataFormat.textFragment,
          Cg: e.config.JSONPageDataFormat.textFont,
          lc: e.config.JSONPageDataFormat.textLeft,
          Ab: e.config.JSONPageDataFormat.textTop,
          Ad: e.config.JSONPageDataFormat.textWidth,
          zd: e.config.JSONPageDataFormat.textHeight
        };
        e.wa = e.file.indexOf && 0 <= e.file.indexOf("[*,") && e.config && null != e.config.jsonfile && !d.Dk;
        e.ya = new ta(e.P, e.wa, e.JSONPageDataFormat, !0);
        e.wa && (e.Cp = e.file.substr(e.file.indexOf("[*,"), e.file.indexOf("]") - e.file.indexOf("[*,")), e.wk = e.wk = !1);
        PDFJS.workerSrc = ("undefined" != e.jsDirectory && null != e.jsDirectory ? e.jsDirectory : "js/") + "pdf.worker.min.js";
        jQuery.getScript(e.Qo, function() {
          if (e.wk) {
            var g = new XMLHttpRequest;
            g.open("HEAD", e.ki(1), !1);
            g.overrideMimeType("application/pdf");
            g.onreadystatechange = function() {
              if (200 == g.status) {
                var c = g.getAllResponseHeaders(),
                  d = {};
                if (c) {
                  for (var c = c.split("\r\n"), h = 0; h < c.length; h++) {
                    var f = c[h],
                      p = f.indexOf(": ");
                    0 < p && (d[f.substring(0, p)] = f.substring(p + 2));
                  }
                }
                e.Uj = "bytes" === d["Accept-Ranges"];
                e.un = "identity" === d["Content-Encoding"] || null === d["Content-Encoding"] || !d["Content-Encoding"];
                e.Uj && e.un && !eb.platform.ios && !eb.browser.safari && (e.file = e.file.substr(0, e.file.indexOf(e.Cp) - 1) + ".pdf", e.wa = !1);
              }
              g.abort();
            };
            try {
              g.send(null);
            } catch (f) {}
          }
          window["wordPageList_" + e.P] = e.ya.Ra;
          jQuery("#" + e.P).trigger("onDocumentLoading");
          FLOWPAPER.RANGE_CHUNK_SIZE && (PDFJS.RANGE_CHUNK_SIZE = FLOWPAPER.RANGE_CHUNK_SIZE);
          PDFJS.disableWorker = e.wa || eb.browser.ff || eb.browser.msie;
          PDFJS.disableRange = e.wa;
          PDFJS.disableAutoFetch = e.wa || !1;
          PDFJS.disableStream = e.wa || !1;
          PDFJS.pushTextGeometries = !e.wa;
          PDFJS.verbosity = PDFJS.VERBOSITY_LEVELS.errors;
          PDFJS.enableStats = !1;
          PDFJS.er = !0;
          PDFJS.fr = !0;
          if (e.wa) {
            e.wa && e.config && null != e.config.jsonfile && (e.wa = !0, e.Md = e.config.jsonfile, e.Ur = new Promise(function() {}), p = null != FLOWPAPER.CHUNK_SIZE ? FLOWPAPER.CHUNK_SIZE : 10, e.Re({
              url: e.zf(p),
              dataType: e.config.JSONDataType,
              success: function(c) {
                c.e && (c = CryptoJS.Ee.decrypt(c.e, CryptoJS.qc.De.parse(eb.Sg ? P() : eb.ce.innerHTML)), c = jQuery.parseJSON(c.toString(CryptoJS.qc.dg)), e.tf = !0);
                jQuery(e).trigger("loadingProgress", {
                  P: e.P,
                  progress: 0.1
                });
                if (0 < c.length) {
                  e.S = Array(c[0].pages);
                  for (var d = 0; d < c.length; d++) {
                    e.S[d] = c[d], e.S[d].loaded = !0, e.Ch(d);
                  }
                  0 < e.S.length && (e.bb = e.S[0].twofold, e.bb && (e.Ya = 1));
                  for (d = 0; d < e.S.length; d++) {
                    null == e.S[d] && (e.S[d] = [], e.S[d].loaded = !1);
                  }
                  e.ya && e.ya.xc && e.ya.xc(e.S);
                }
                e.Le = 1;
                e.La = Array(c[0].pages);
                e.pb = Array(c[0].pages);
                e.Ri(e.Le, function() {
                  jQuery(e).trigger("loadingProgress", {
                    P: e.P,
                    progress: 1
                  });
                  e.fc();
                }, null, function(c) {
                  c = 0.1 + c;
                  1 < c && (c = 1);
                  jQuery(e).trigger("loadingProgress", {
                    P: e.P,
                    progress: c
                  });
                });
              },
              error: function(g, h, f) {
                h = null != g.responseText && 0 == g.responseText.indexOf("Error:") ? g.responseText.substr(6) : "";
                this.url.indexOf("view.php") || this.url.indexOf("view.ashx") ? (console.log("Warning: Could not load JSON file. Switching to single file mode."), d.Dk = !0, e.wa = !1, e.initialize(c, d), e.pageThumbImagePattern = null) : O("Error loading JSON file (" + g.statusText + "," + f + "). Please check your configuration.", "onDocumentLoadedError", e.P, h);
              }
            }));
          } else {
            e.Md = e.config.jsonfile;
            var h = new jQuery.Deferred,
              p = null != FLOWPAPER.CHUNK_SIZE ? FLOWPAPER.CHUNK_SIZE : 10;
            e.Md && 0 < e.Md.length ? e.Re({
              url: e.zf(p),
              dataType: e.config.JSONDataType,
              success: function(c) {
                c.e && (c = CryptoJS.Ee.decrypt(c.e, CryptoJS.qc.De.parse(eb.Sg ? P() : eb.ce.innerHTML)), c = jQuery.parseJSON(c.toString(CryptoJS.qc.dg)), e.tf = !0);
                if (0 < c.length) {
                  e.S = Array(c[0].pages);
                  for (var d = 0; d < c.length; d++) {
                    e.S[d] = c[d], e.S[d].loaded = !0, e.Ch(d);
                  }
                  for (d = 0; d < e.S.length; d++) {
                    null == e.S[d] && (e.S[d] = [], e.S[d].loaded = !1);
                  }
                  e.ya && e.ya.xc && e.ya.xc(e.S);
                  0 < e.S.length && (e.bb = e.S[0].twofold, e.bb && (e.Ya = 1));
                }
                h.resolve();
              }
            }) : h.resolve();
            h.then(function() {
              var c = {},
                g = e.file;
              d && d.Dk && g.match(/(page=\d)/ig) && (g = g.replace(/(page=\d)/ig, ""));
              !e.file.indexOf || e.file instanceof Uint8Array || e.file.indexOf && 0 == e.file.indexOf("blob:") ? c = g : c.url = g;
              e.xl() && (c.password = e.config.signature + "e0737b87e9be157a2f73ae6ba1352a65");
              var h = 0;
              c.rangeChunkSize = FLOWPAPER.RANGE_CHUNK_SIZE;
              c = PDFJS.getDocument(c);
              c.onPassword = function(c, d) {
                jQuery("#" + e.P).trigger("onPasswordNeeded", c, d);
              };
              c.onProgress = function(c) {
                h = c.loaded / c.total;
                1 < h && (h = 1);
                jQuery(e).trigger("loadingProgress", {
                  P: e.P,
                  progress: h
                });
              };
              c.then(function(c) {
                0.5 > h && jQuery(e).trigger("loadingProgress", {
                  P: e.P,
                  progress: 0.5
                });
                e.pdf = e.La = c;
                e.La.getPageLabels().then(function(c) {
                  jQuery(e).trigger("labelsLoaded", {
                    Yk: c
                  });
                });
                e.initialized = !0;
                e.dimensions = null;
                e.pb = Array(e.bb ? e.S.length : e.La.numPages);
                e.dimensions = [];
                (e.yn = e.La.getDestinations()).then(function(c) {
                  e.destinations = c;
                });
                (e.Mo = e.La.getOutline()).then(function(c) {
                  e.outline = c || [];
                });
                var g = d && d.StartAtPage ? parseInt(d.StartAtPage) : 1;
                e.La.getPage(g).then(function(c) {
                  c = c.getViewport(1);
                  var d = e.La.numPages;
                  !e.wa && e.bb && (d = e.S.length);
                  for (i = 1; i <= d; i++) {
                    e.dimensions[i - 1] = [], e.dimensions[i - 1].page = i - 1, e.dimensions[i - 1].width = c.width, e.dimensions[i - 1].height = c.height, e.dimensions[i - 1].na = c.width, e.dimensions[i - 1].za = c.height;
                  }
                  e.li = !0;
                  jQuery(e).trigger("loadingProgress", {
                    P: e.P,
                    progress: 1
                  });
                  1 == g && 1 < d && window.zine ? e.La.getPage(2).then(function(c) {
                    c = c.getViewport(1);
                    e.bb = 2 * Math.round(e.dimensions[0].width) >= Math.round(c.width) - 1 && 2 * Math.round(e.dimensions[0].width) <= Math.round(c.width) + 1;
                    if (e.bb) {
                      e.S = Array(d);
                      for (var g = 0; g < e.S.length; g++) {
                        e.S[g] = {}, e.S[g].text = [], e.S[g].pages = d, e.S[g].bb = !0, e.S[g].width = 0 == g ? e.dimensions[0].width : c.width, e.S[g].height = 0 == g ? e.dimensions[0].height : c.height, e.Ch(g);
                      }
                    }
                    e.fc();
                  }) : e.fc();
                });
                (null == e.config.jsonfile || null != e.config.jsonfile && 0 == e.config.jsonfile.length || !e.wa) && e.Vl(e.La);
              }, function(c) {
                O("Cannot load PDF file (" + c + ")", "onDocumentLoadedError", e.P, "Cannot load PDF file (" + c + ")");
                jQuery(e).trigger("loadingProgress", {
                  P: e.P,
                  progress: "Error"
                });
              }, function() {}, function(c) {
                jQuery(e).trigger("loadingProgress", {
                  P: e.P,
                  progress: c.loaded / c.total
                });
              });
            });
          }
        }).fail(function() {});
        e.JSONPageDataFormat = {
          kf: "width",
          jf: "height",
          Ae: "text",
          qb: "d",
          Cg: "f",
          lc: "l",
          Ab: "t",
          Ad: "w",
          zd: "h"
        };
      },
      Ri: function(c, d, e) {
        var g = this,
          h = {};
        h.url = g.ki(c);
        g.xl() && (h.password = g.config.signature + "e0737b87e9be157a2f73ae6ba1352a65");
        h.rangeChunkSize = FLOWPAPER.RANGE_CHUNK_SIZE;
        g.Bs = PDFJS.getDocument(h).then(function(h) {
          g.La[c - 1] = h;
          g.initialized = !0;
          g.dimensions || (g.dimensions = []);
          g.La[c - 1].getDestinations().then(function(c) {
            g.destinations = c;
          });
          g.La[c - 1].getPage(1).then(function(h) {
            g.pb[c - 1] = h;
            var f = h.getViewport(g.bb ? 1 : 1.5),
              p = g.dimensions && g.dimensions[c - 1] ? g.dimensions[c - 1] : [],
              q = Math.floor(f.width),
              f = Math.floor(f.height),
              t = p && p.width && !(q > p.width - 1 && q < p.width + 1),
              r = p && p.height && !(f > p.height - 1 && f < p.height + 1);
            g.dimensions[c - 1] = [];
            g.dimensions[c - 1].loaded = !0;
            g.dimensions[c - 1].page = c - 1;
            g.dimensions[c - 1].width = q;
            1 < c && g.bb && (c < g.La[c - 1].numPages || 0 != g.La[c - 1].numPages % 2) ? (g.dimensions[c - 1].width = g.dimensions[c - 1].width / 2, g.dimensions[c - 1].na = q / 2) : g.dimensions[c - 1].na = q;
            var m;
            if (m = p.width) {
              m = g.dimensions[c - 1].width, m = !(m > p.width - 1 && m < p.width + 1);
            }
            m && e && !g.bb && (e.dimensions.na = q, e.dimensions.za = f, e.Pa());
            if (t || !g.dimensions[c - 1].na) {
              g.dimensions[c - 1].na = q;
            }
            if (r || !g.dimensions[c - 1].za) {
              g.dimensions[c - 1].za = f;
            }
            g.dimensions[c - 1].height = f;
            1 < c && g.bb && (c < g.La[c - 1].numPages || 0 != g.La[c - 1].numPages % 2) && (g.dimensions[c - 1].na = g.dimensions[c - 1].na / 2);
            null != g.Aa[c - 1] && g.Aa.length > c && (g.dimensions[c - 1].Sc = g.Aa[c].Sc, g.dimensions[c - 1].Rc = g.Aa[c].Rc, g.dimensions[c - 1].nb = g.Aa[c].nb, g.dimensions[c - 1].fd = g.Aa[c].fd);
            g.zg[c - 1 + " " + h.ref.gen + " R"] = c - 1;
            g.li = !0;
            g.Le = -1;
            d && d();
          });
          g.Le = -1;
        }, function(c) {
          O("Cannot load PDF file (" + c + ")", "onDocumentLoadedError", g.P);
          jQuery(g).trigger("loadingProgress", {
            P: g.P,
            progress: "Error"
          });
          g.Le = -1;
        });
      },
      Re: function(c) {
        var d = this;
        if ("lz" == d.config.JSONDataType) {
          if ("undefined" === typeof Worker || eb.browser.msie && 11 > eb.browser.version) {
            sa(c.url, function(d, e) {
              requestAnim(function() {
                var d = "undefined" != typeof Uint8Array ? new Uint8Array(e) : e,
                  d = pako.inflate(d, {
                    to: "string"
                  });
                "undefined" !== typeof Response ? (new Response(d)).json().then(function(d) {
                  c.success(d);
                }) : c.success(JSON.parse(d));
              }, 10);
            });
          } else {
            var e = document.location.href.substr(0, document.location.href.lastIndexOf("/") + 1); - 1 == c.url.indexOf("http") && (c.url = e + c.url);
            d.Sb || (d.Sb = {});
            d.Sb[c.url] = c;
            d.bf || (d.bf = new Worker(("undefined" != d.jsDirectory && null != d.jsDirectory ? d.jsDirectory : "js/") + "flowpaper.worker.js"), d.bf.addEventListener("message", function(c) {
              d.Sb[c.data.url] && ("undefined" !== typeof Response ? (new Response(c.data.JSON)).json().then(function(e) {
                d.Sb[c.data.url].success(e);
                d.Sb[c.data.url] = null;
              }) : (d.Sb[c.data.url].success(JSON.parse(c.data.JSON)), d.Sb[c.data.url] = null));
            }, !1));
            d.bf.postMessage(c.url);
          }
        } else {
          return jQuery.ajax(c);
        }
      },
      zf: function(c) {
        return this.Md.replace("{page}", c);
      },
      ti: function(c) {
        var d = 1;
        if (1 < c) {
          for (var e = 0; e < c; e++) {
            (0 != e % 2 || 0 == e % 2 && 0 == c % 2 && e == c - 1) && d++;
          }
          return d;
        }
        return 1;
      },
      xl: function() {
        return null != this.config.signature && 0 < this.config.signature.length;
      },
      ki: function(c) {
        this.config.PageIndexAdjustment && (c += this.config.PageIndexAdjustment);
        this.bb && 1 < c && (c = this.ti(c));
        if (0 <= this.file.indexOf("{page}")) {
          return this.file.replace("{page}", c);
        }
        if (0 <= this.file.indexOf("[*,")) {
          var d = this.file.substr(this.file.indexOf("[*,"), this.file.indexOf("]") - this.file.indexOf("[*,") + 1);
          return this.file.replace(d, ka(c, parseInt(d.substr(d.indexOf(",") + 1, d.indexOf("]") - 2))));
        }
      },
      Ef: function(c) {
        var d = null != FLOWPAPER.CHUNK_SIZE ? FLOWPAPER.CHUNK_SIZE : 10;
        return 0 === d ? c : c + (d - c % d);
      },
      tc: function(c, d, e, g, h) {
        var f = this;
        f.nd == f.Ef(c) ? (window.clearTimeout(h.yo), h.yo = setTimeout(function() {
          h.dimensions.loaded || f.tc(c, d, e, g, h);
        }, 100)) : (f.nd = f.Ef(c), f.Re({
          url: f.zf(f.nd),
          dataType: f.config.JSONDataType,
          async: d,
          success: function(c) {
            c.e && (c = CryptoJS.Ee.decrypt(c.e, CryptoJS.qc.De.parse(eb.Sg ? P() : eb.ce.innerHTML)), c = jQuery.parseJSON(c.toString(CryptoJS.qc.dg)), f.tf = !0);
            if (0 < c.length) {
              for (var d = 0; d < c.length; d++) {
                var g = parseInt(c[d].number) - 1;
                f.S[g] = c[d];
                f.S[g].loaded = !0;
                f.Co(g);
                f.Ch(g, h);
              }
              f.ya.xc && f.ya.xc(f.S);
              jQuery(f).trigger("onTextDataUpdated");
              null != e && e();
            }
            f.nd = null;
          },
          error: function(c) {
            O("Error loading JSON file (" + c.statusText + "). Please check your configuration.", "onDocumentLoadedError", f.P);
            f.nd = null;
          }
        }));
      },
      Ch: function(c) {
        this.Aa || (this.Aa = []);
        this.Aa[c] || (this.Aa[c] = []);
        this.Aa[c].Sc = this.S[c][this.JSONPageDataFormat.kf];
        this.Aa[c].Rc = this.S[c][this.JSONPageDataFormat.jf];
        this.Aa[c].nb = this.Aa[c].Sc;
        this.Aa[c].fd = this.Aa[c].Rc;
        c = this.Aa[c];
        for (var d = 0; d < this.getNumPages(); d++) {
          null == this.Aa[d] && (this.Aa[d] = [], this.Aa[d].Sc = c.Sc, this.Aa[d].Rc = c.Rc, this.Aa[d].nb = c.nb, this.Aa[d].fd = c.fd);
        }
      },
      getDimensions: function() {
        var c = this;
        if (null == c.dimensions || c.li || null != c.dimensions && 0 == c.dimensions.length) {
          null == c.dimensions && (c.dimensions = []);
          var d = c.La.numPages;
          !c.wa && c.bb && (d = c.S.length);
          if (c.wa) {
            for (var e = 0; e < c.getNumPages(); e++) {
              null != c.dimensions[e] || null != c.dimensions[e] && !c.dimensions[e].loaded ? (null == c.pc && (c.pc = c.dimensions[e]), c.dimensions[e].nb || null == c.Aa[e] || (c.dimensions[e].nb = c.Aa[e].nb, c.dimensions[e].fd = c.Aa[e].fd)) : null != c.pc && (c.dimensions[e] = [], c.dimensions[e].page = e, c.dimensions[e].loaded = !1, c.dimensions[e].width = c.pc.width, c.dimensions[e].height = c.pc.height, c.dimensions[e].na = c.pc.na, c.dimensions[e].za = c.pc.za, null != c.Aa[e] && (c.dimensions[e].width = c.Aa[e].Sc, c.dimensions[e].height = c.Aa[e].Rc, c.dimensions[e].na = c.Aa[e].nb, c.dimensions[e].za = c.Aa[e].fd), null != c.Aa[e - 1] && (c.dimensions[e - 1].Sc = c.Aa[e].Sc, c.dimensions[e - 1].Rc = c.Aa[e].Rc, c.dimensions[e - 1].nb = c.Aa[e].nb, c.dimensions[e - 1].fd = c.Aa[e].fd), e == c.getNumPages() - 1 && (c.dimensions[e].Sc = c.Aa[e].Sc, c.dimensions[e].Rc = c.Aa[e].Rc, c.dimensions[e].nb = c.Aa[e].nb, c.dimensions[e].fd = c.Aa[e].fd), c.zg[e + " 0 R"] = e);
            }
          } else {
            c.Ek = [];
            for (e = 1; e <= d; e++) {
              var g = e;
              c.bb && (g = c.ti(e));
              c.Ek.push(c.La.getPage(g).then(function(d) {
                var e = d.getViewport(1);
                c.dimensions[d.pageIndex] = [];
                c.dimensions[d.pageIndex].page = d.pageIndex;
                c.dimensions[d.pageIndex].width = e.width;
                c.dimensions[d.pageIndex].height = e.height;
                c.dimensions[d.pageIndex].na = e.width;
                c.dimensions[d.pageIndex].za = e.height;
                e = d.ref;
                c.zg[e.num + " " + e.gen + " R"] = d.pageIndex;
              }));
            }
            Promise.all && Promise.all(c.Ek.concat(c.yn).concat(c.Mo)).then(function() {
              jQuery(c).trigger("outlineAdded", {
                P: c.P
              });
            });
          }
          c.li = !1;
        }
        return c.dimensions;
      },
      Co: function(c) {
        if (this.dimensions[c]) {
          this.dimensions[c].page = c;
          this.dimensions[c].loaded = !0;
          this.qa[c] = [];
          this.qa[c] = "";
          for (var d = null, e = 0, g; g = this.S[c][this.JSONPageDataFormat.Ae][e++];) {
            this.Fa ? !isNaN(g[0].toString()) && 0 <= Number(g[0].toString()) && !isNaN(g[1].toString()) && 0 <= Number(g[1].toString()) && !isNaN(g[2].toString()) && 0 <= Number(g[2].toString()) && !isNaN(g[3].toString()) && 0 <= Number(g[3].toString()) && (d && Math.round(d[0]) != Math.round(g[0]) && Math.round(d[1]) == Math.round(g[1]) && (this.qa[c] += " "), d && Math.round(d[0]) != Math.round(g[0]) && !this.qa[c].endsWith(" ") && (this.qa[c] += " "), d = /\\u([\d\w]{4})/gi, d = (g[5] + "").replace(d, function(c, d) {
              return String.fromCharCode(parseInt(d, 16));
            }), this.config.RTLMode || (this.qa[c] += d), this.config.RTLMode && (this.qa[c] += Q(d))) : !isNaN(g[this.JSONPageDataFormat.lc].toString()) && 0 <= Number(g[this.JSONPageDataFormat.lc].toString()) && !isNaN(g[this.JSONPageDataFormat.Ab].toString()) && 0 <= Number(g[this.JSONPageDataFormat.Ab].toString()) && !isNaN(g[this.JSONPageDataFormat.Ad].toString()) && 0 < Number(g[this.JSONPageDataFormat.Ad].toString()) && !isNaN(g[this.JSONPageDataFormat.zd].toString()) && 0 < Number(g[this.JSONPageDataFormat.zd].toString()) && (d && Math.round(d[this.JSONPageDataFormat.Ab]) != Math.round(g[this.JSONPageDataFormat.Ab]) && Math.round(d[this.JSONPageDataFormat.lc]) == Math.round(prev[this.JSONPageDataFormat.lc]) && (this.qa[c] += " "), d && Math.round(d[this.JSONPageDataFormat.Ab]) != Math.round(g[this.JSONPageDataFormat.Ab]) && !this.qa[c].endsWith(" ") && (this.qa[c] += " "), d = /\\u([\d\w]{4})/gi, d = (g[this.JSONPageDataFormat.qb] + "").replace(d, function(c, d) {
              return String.fromCharCode(parseInt(d, 16));
            }), this.config.RTLMode || (this.qa[c] += d), this.config.RTLMode && (this.qa[c] += Q(d))), d = g;
          }
          this.qa[c] = this.qa[c].toLowerCase();
        }
      },
      getNumPages: function() {
        return this.wa ? this.S.length : this.bb ? this.S.length : this.La ? this.La.numPages : this.S.length;
      },
      getPage: function(c) {
        this.La.getPage(c).then(function(c) {
          return c;
        });
        return null;
      },
      Pc: function(c) {
        var d = this;
        "TwoPage" == c.H || "BookView" == c.H ? (0 == c.pageNumber && jQuery(c.ga).css("background-image", "url('" + d.ia(c.pages.R + 1) + "')"), 1 == c.pageNumber && jQuery(c.ga).css("background-image", "url('" + d.ia(c.pages.R + 2) + "')")) : "ThumbView" == c.H ? jQuery(c.ga).css("background-image", "url('" + d.ia(c.pageNumber + 1, 200) + "')") : "SinglePage" == c.H ? jQuery(c.ga).css("background-image", "url('" + d.ia(d.Da(c) + 1) + "')") : jQuery(c.ga).css("background-image", "url('" + d.ia(c.pageNumber + 1) + "')");
        c.U = new Image;
        jQuery(c.U).bind("load", function() {
          var e = Math.round(c.U.width / c.U.height * 100),
            g = Math.round(c.dimensions.width / c.dimensions.height * 100);
          if ("SinglePage" == c.H) {
            var e = d.Aa[c.pages.R],
              h = Math.round(e.Sc / e.Rc * 100),
              g = Math.round(c.dimensions.na / c.dimensions.za * 100);
            h != g && (c.dimensions.na = e.Sc, c.dimensions.za = e.Rc, c.Pa(), c.xj = -1, d.Ea(c, !0, null));
          } else {
            e != g && (c.dimensions.na = c.U.width, c.dimensions.za = c.U.height, c.Pa(), c.xj = -1, d.Ea(c, !0, null));
          }
        });
        jQuery(c.U).attr("src", d.ia(c.pageNumber + 1));
      },
      yl: function(c) {
        "TwoPage" == c.H || "BookView" == c.H ? (0 == c.pageNumber && jQuery(c.ga).css("background-image", "url(" + this.ea + ")"), 1 == c.pageNumber && jQuery(c.ga).css("background-image", "url(" + this.ea + ")")) : jQuery(c.ga).css("background-image", "url(" + this.ea + ")");
      },
      Kd: function(c) {
        this.rb = c.rb = this.wa && this.config.MixedMode;
        "Portrait" != c.H && "SinglePage" != c.H || jQuery(c.V).append("<canvas id='" + this.Ca(1, c) + "' style='position:relative;left:0px;top:0px;width:100%;height:100%;display:none;background-repeat:no-repeat;background-size:" + ((eb.browser.mozilla || eb.browser.safari) && eb.platform.mac ? "100% 100%" : "cover") + ";background-color:#ffffff;' class='" + (this.config.DisableShadows ? "" : "flowpaper_border") + " flowpaper_interactivearea flowpaper_grab flowpaper_hidden flowpaper_rescale'></canvas><canvas id='" + this.Ca(2, c) + "' style='position:relative;left:0px;top:0px;width:100%;height:100%;display:block;background-repeat:no-repeat;background-size:" + ((eb.browser.mozilla || eb.browser.safari) && eb.platform.mac ? "100% 100%" : "cover") + ";background-color:#ffffff;' class='" + (this.config.DisableShadows ? "" : "flowpaper_border") + " flowpaper_interactivearea flowpaper_grab flowpaper_hidden flowpaper_rescale'></canvas>");
        c.H == this.Ja(c) && this.ub(c).Kd(this, c);
        "ThumbView" == c.H && jQuery(c.V).append("<canvas id='" + this.Ca(1, c) + "' style='" + c.getDimensions() + ";background-repeat:no-repeat;background-size:" + ((eb.browser.mozilla || eb.browser.safari) && eb.platform.mac ? "100% 100%" : "cover") + ";background-color:#ffffff;' class='flowpaper_interactivearea flowpaper_grab flowpaper_hidden' ></canvas>");
        if ("TwoPage" == c.H || "BookView" == c.H) {
          0 == c.pageNumber && (jQuery(c.V + "_1").append("<img id='" + c.Xb + "_1' src='" + c.ef + "' style='position:absolute;left:" + (c.xa() - 30) + "px;top:" + c.Ga() / 2 + "px;' />"), jQuery(c.V + "_1").append("<canvas id='" + this.Ca(1, c) + "' style='position:absolute;width:100%;height:100%;background-repeat:no-repeat;background-size:" + ((eb.browser.mozilla || eb.browser.safari) && eb.platform.mac ? "100% 100%" : "cover") + ";background-color:#ffffff;' class='flowpaper_interactivearea flowpaper_grab flowpaper_hidden'/></canvas>"), jQuery(c.V + "_1").append("<div id='" + c.aa + "_1_textoverlay' style='position:relative;left:0px;top:0px;width:100%;height:100%;z-index:10'></div>")), 1 == c.pageNumber && (jQuery(c.V + "_2").append("<img id='" + c.Xb + "_2' src='" + c.ef + "' style='position:absolute;left:" + (c.xa() / 2 - 10) + "px;top:" + c.Ga() / 2 + "px;' />"), jQuery(c.V + "_2").append("<canvas id='" + this.Ca(2, c) + "' style='position:absolute;width:100%;height:100%;background-repeat:no-repeat;background-size:" + ((eb.browser.mozilla || eb.browser.safari) && eb.platform.mac ? "100% 100%" : "cover") + ";background-color:#ffffff;' class='flowpaper_interactivearea flowpaper_grab flowpaper_hidden'/></canvas>"), jQuery(c.V + "_2").append("<div id='" + c.aa + "_2_textoverlay' style='position:absolute;left:0px;top:0px;width:100%;height:100%;z-index:10'></div>"));
        }
      },
      Ca: function(c, d) {
        var e = d.pageNumber;
        if (("TwoPage" == d.H || "BookView" == d.H) && 0 == d.pageNumber % 2) {
          return this.P + "_dummyCanvas1";
        }
        if (("TwoPage" == d.H || "BookView" == d.H) && 0 != d.pageNumber % 2) {
          return this.P + "_dummyCanvas2";
        }
        if (1 == c) {
          return this.Zg.replace("[pageNumber]", e);
        }
        if (2 == c) {
          return this.$g.replace("[pageNumber]", e);
        }
      },
      Xn: function(c, d) {
        if (("TwoPage" == d.H || "BookView" == d.H) && 0 == d.pageNumber % 2) {
          return "#" + this.P + "_dummyCanvas1";
        }
        if (("TwoPage" == d.H || "BookView" == d.H) && 0 != d.pageNumber % 2) {
          return "#" + this.P + "_dummyCanvas2";
        }
        if (1 == c) {
          return this.oi.replace("[pageNumber]", d.pageNumber);
        }
        if (2 == c) {
          return this.pi.replace("[pageNumber]", d.pageNumber);
        }
      },
      $b: function(c, d, e) {
        var g = this;
        g.si = !0;
        if (c.H != g.Ja(c) || g.ub(c).xp(g, c, d, e)) {
          if ("Portrait" != c.H && "TwoPage" != c.H && "BookView" != c.H || null != c.context || c.uc || (c.Qc(), c.uc = !0), 1 == g.ap && 1 < c.scale && c.rb && g.Ha(c, -1), -1 < g.Da(c) || g.wa && null != g.Uf) {
            window.clearTimeout(c.kc), c.kc = setTimeout(function() {
              setTimeout(function() {
                g.$b(c, d, e);
              });
            }, 50);
          } else {
            g.$k = c;
            g.ap = c.scale;
            if ("TwoPage" == c.H || "BookView" == c.H) {
              if (0 == c.pageNumber) {
                "BookView" == c.H ? g.Ha(c, 0 == c.pages.R ? c.pages.R : c.pages.R - 1) : "TwoPage" == c.H && g.Ha(c, c.pages.R), g.rk = c, c.Jb();
              } else {
                if (1 == c.pageNumber) {
                  "BookView" == c.H ? g.Ha(c, c.pages.R) : "TwoPage" == c.H && g.Ha(c, c.pages.R + 1), g.rk = c, jQuery(c.V + "_2").removeClass("flowpaper_hidden"), jQuery(c.V + "_2").removeClass("flowpaper_load_on_demand"), c.Jb();
                } else {
                  return;
                }
              }
            } else {
              "SinglePage" == c.H ? g.Ha(c, c.pages.R) : (g.Ha(c, c.pageNumber), g.rk = c);
            }
            g.pj(c);
            if ((c.rb || g.wa) && !c.dimensions.loaded) {
              var h = c.pageNumber + 1;
              "SinglePage" == c.H && (h = g.Da(c) + 1);
              g.tc(h, !0, function() {
                c.dimensions.loaded = !1;
                g.Dc(c);
              }, !0, c);
            }
            var h = !1,
              f = c.yg;
            if ("Portrait" == c.H || "SinglePage" == c.H || "TwoPage" == c.H || "BookView" == c.H || c.H == g.Ja(c) && g.ub(c).cq(g, c)) {
              var h = !0,
                k = c.Vb(),
                l = c.xa(),
                n = c.Ga();
              0 == jQuery("#" + f).length ? (f = "<div id='" + f + "' class='flowpaper_textLayer' style='width:" + l + "px;height:" + n + "px;backface-visibility:hidden;margin-left:" + k + "px;'></div>", "Portrait" == c.H || g.Ja(c) || "SinglePage" == c.H ? jQuery(c.va).append(f) : "TwoPage" != c.H && "BookView" != c.H || jQuery(c.va + "_" + (c.pageNumber % 2 + 1)).append(f)) : jQuery("#" + f).css({
                width: l,
                height: n,
                "margin-left": k
              });
              if (90 == c.rotation || 270 == c.rotation || 180 == c.rotation) {
                jQuery(c.xb).css({
                  "z-index": 11,
                  "margin-left": k
                }), jQuery(c.xb).transition({
                  rotate: c.rotation,
                  translate: "-" + k + "px, 0px"
                }, 0);
              }
            }
            if (c.rb && c.scale <= g.rh(c) && !c.mi) {
              -1 < g.Da(c) && window.clearTimeout(c.kc), jQuery(c.V).removeClass("flowpaper_load_on_demand"), g.wa && c.F.initialized && !c.pn ? g.fi.push(function() {
                var d = new XMLHttpRequest;
                d.open("GET", g.ki(c.pageNumber + 1), !0);
                d.overrideMimeType("text/plain; charset=x-user-defined");
                d.addEventListener("load", function() {
                  g.ge();
                });
                d.addEventListener("error", function() {
                  g.ge();
                });
                d.send(null);
                c.pn = !0;
              }) : g.Uj && null == g.pb[g.Da(c)] && (k = g.Da(c) + 1, g.La && g.La.getPage && g.La.getPage(k).then(function(d) {
                g.pb[g.Da(c)] = d;
              })), c.H == g.Ja(c) ? g.ub(c).$b(g, c, d, e) : (g.Pc(c), g.Se(c, e)), c.pa = !0;
            } else {
              if (c.rb && c.scale > g.rh(c) && !c.mi) {
                c.H != g.Ja(c) && g.Pc(c);
              } else {
                if (!c.rb && c.Jc && c.H == g.Ja(c) && 1 == c.scale && !g.Xg) {
                  if (!c.gd && 100 != c.ga.width) {
                    c.gd = c.ga.toDataURL(), k = jQuery("#" + g.Ca(1, c)), k.css("background-image").length < c.gd.length + 5 && k.css("background-image", "url(" + c.gd + ")"), k[0].width = 100;
                  } else {
                    if (c.gd && !g.wa && "none" != jQuery("#" + g.Ca(1, c)).css("background-image")) {
                      g.Ha(c, -1);
                      c.pa = !0;
                      return;
                    }
                  }
                  g.pl(c);
                }
              }
              null != g.pb[g.Da(c)] || g.wa || (k = g.Da(c) + 1, g.bb && (k = g.ti(k)), g.La && g.La.getPage && g.La.getPage(k).then(function(h) {
                g.pb[g.Da(c)] = h;
                window.clearTimeout(c.kc);
                g.Ha(c, -1);
                g.$b(c, d, e);
              }));
              if (c.ga) {
                if (100 == c.ga.width || 1 != c.scale || c.H != g.Ja(c) || c.Bl) {
                  if (k = !0, null == g.pb[g.Da(c)] && g.wa && (c.H == g.Ja(c) && (k = g.ub(c).wp(g, c)), null == g.La[g.Da(c)] && -1 == g.Le && k && null == g.Uf && (g.Le = g.Da(c) + 1, g.Ri(g.Le, function() {
                      window.clearTimeout(c.kc);
                      g.Ha(c, -1);
                      g.$b(c, d, e);
                    }, c))), null != g.pb[g.Da(c)] || !k) {
                    if (c.H == g.Ja(c) ? g.ub(c).$b(g, c, d, e) : (c.ga.width = c.xa(), c.ga.height = c.Ga()), g.bb && 0 < c.Eb.indexOf("cropCanvas") && (c.ga.width = 2 * c.ga.width), null != g.pb[g.Da(c)] || !k) {
                      if (g.si) {
                        k = c.ga.height / g.getDimensions()[c.pageNumber].height;
                        c.H != g.Ja(c) && (k *= g.Ya);
                        g.Yp = k;
                        1.5 > k && (k = 1.5);
                        g.Vr = k;
                        var q = g.pb[g.Da(c)].getViewport(k);
                        g.bb || (c.ga.width = q.width, c.ga.height = q.height);
                        var t = c.Zo = {
                          canvasContext: c.context,
                          viewport: q,
                          pageNumber: c.pageNumber,
                          Fh: h && !g.wa ? new ua : null
                        };
                        g.pb[g.Da(c)].objs.geometryTextList = [];
                        window.requestAnim(function() {
                          c.ga.style.display = "none";
                          c.ga.redraw = c.ga.offsetHeight;
                          c.ga.style.display = "";
                          g.Uf = g.pb[g.Da(c)].render(t);
                          g.Uf.onContinue = function(c) {
                            c();
                          };
                          g.Uf.promise.then(function() {
                            g.Uf = null;
                            if (null != g.pb[g.Da(c)]) {
                              if (g.wa || c.rb && c.scale <= g.rh(c) || !c.ga) {
                                g.wa || g.Ol(g.pb[g.Da(c)], c, q, g.wa), g.Se(c, e);
                              } else {
                                var d = c.ga.height / g.getDimensions()[c.pageNumber].height,
                                  h = g.pb[g.Da(c)].objs.geometryTextList;
                                if (h) {
                                  for (var f = 0; f < h.length; f++) {
                                    h[f].lp != d && (h[f].h = h[f].metrics.height / d, h[f].l = h[f].metrics.left / d, h[f].t = h[f].metrics.top / d, h[f].w = h[f].textMetrics.geometryWidth / d, h[f].d = h[f].unicode, h[f].f = h[f].fontFamily, h[f].lp = d);
                                  }
                                  "SinglePage" == c.H || "TwoPage" == c.H || "BookView" == c.H ? g.ya.Il(h, g.Da(c), g.getNumPages()) : g.ya.Il(h, c.pageNumber, g.getNumPages());
                                }
                                g.Ol(g.pb[g.Da(c)], c, q, g.wa);
                                g.Se(c, e);
                                g.Ea(c, !0, e);
                              }
                            } else {
                              g.Se(c, e), M(c.pageNumber + "  is missing its pdf page (" + g.Da(c) + ")");
                            }
                          }, function(c) {
                            O(c.toString(), "onDocumentLoadedError", g.P);
                            g.Uf = null;
                          });
                        }, 50);
                      } else {
                        g.Ha(c, -1);
                      }
                      jQuery(c.V).removeClass("flowpaper_load_on_demand");
                    }
                  }
                } else {
                  jQuery("#" + g.Ca(1, c)).xd(), jQuery("#" + g.Ca(2, c)).rc(), 1 == c.scale && eb.browser.safari ? (jQuery("#" + g.Ca(1, c)).css("-webkit-backface-visibility", "hidden"), jQuery("#" + g.Ca(2, c)).css("-webkit-backface-visibility", "hidden"), jQuery("#" + c.aa + "_textoverlay").css("-webkit-backface-visibility", "hidden")) : eb.browser.safari && (jQuery("#" + g.Ca(1, c)).css("-webkit-backface-visibility", "visible"), jQuery("#" + g.Ca(2, c)).css("-webkit-backface-visibility", "visible"), jQuery("#" + c.aa + "_textoverlay").css("-webkit-backface-visibility", "visible")), g.Ha(c, -1), c.pa || jQuery("#" + g.P).trigger("onPageLoaded", c.pageNumber + 1), c.pa = !0, g.Ea(c, !0, e);
                }
              } else {
                window.clearTimeout(c.kc);
              }
            }
          }
        }
      },
      pl: function(c) {
        var d = null,
          e = null;
        0 != c.pageNumber % 2 ? (d = c, e = c.F.pages.pages[c.pageNumber - 1]) : (e = c, d = c.F.pages.pages[c.pageNumber + 1]);
        if (c.H == this.Ja(c) && !c.rb && c.Jc && d && e && (!d.ad || !e.ad) && !this.Xg) {
          var g = e.gd,
            d = d.gd;
          g && d && !c.ad && e.Jc(g, d);
        }
      },
      rh: function() {
        return 1.1;
      },
      Da: function(c) {
        return this.wa || PDFJS.disableWorker || null == c ? this.Me : c.Me;
      },
      Ha: function(c, d) {
        (!this.wa || c && c.rb && 1 == c.scale) && c && (c.Me = d);
        this.Me = d;
      },
      pj: function(c) {
        "Portrait" == c.H || "SinglePage" == c.H ? jQuery(this.Xn(1, c)).is(":visible") ? (c.Eb = this.Ca(2, c), c.Mf = this.Ca(1, c)) : (c.Eb = this.Ca(1, c), c.Mf = this.Ca(2, c)) : c.H == this.Ja(c) ? this.ub(c).pj(this, c) : (c.Eb = this.Ca(1, c), c.Mf = null);
        this.bb && 0 < c.pageNumber && 0 == c.pageNumber % 2 ? (c.ga = document.createElement("canvas"), c.ga.width = c.ga.height = 100, c.ga.id = c.Eb + "_cropCanvas", c.Eb = c.Eb + "_cropCanvas") : c.ga = document.getElementById(c.Eb);
        null != c.lo && (c.lo = document.getElementById(c.Mf));
        c.ga && c.ga.getContext && (c.context = c.ga.getContext("2d"), c.context.ag = c.context.mozImageSmoothingEnabled = c.context.imageSmoothingEnabled = !1);
      },
      vn: function(c, d, e, g) {
        c = g.convertToViewportRectangle(d.rect);
        c = PDFJS.Util.normalizeRect(c);
        d = e.Vb();
        g = document.createElement("a");
        var h = e.H == this.Ja(e) ? 1 : this.Ya;
        g.style.position = "absolute";
        g.style.left = Math.floor(c[0]) / h + d + "px";
        g.style.top = Math.floor(c[1]) / h + "px";
        g.style.width = Math.ceil(c[2] - c[0]) / h + "px";
        g.style.height = Math.ceil(c[3] - c[1]) / h + "px";
        g.style["z-index"] = 20;
        g.style.cursor = "pointer";
        g.className = "pdfPageLink_" + e.pageNumber + " flowpaper_interactiveobject_" + this.P;
        return g;
      },
      Ol: function(c, d, e, g) {
        var h = this;
        if (1 == d.scale || d.H != h.Ja(d)) {
          jQuery(".pdfPageLink_" + d.pageNumber).remove(), c.getAnnotations().then(function(e) {
            for (var f = 0; f < e.length; f++) {
              var l = e[f];
              switch (l.subtype) {
                case "Link":
                  var n = h.vn("a", l, d, c.getViewport(h.Yp), c.view);
                  n.style.position = "absolute";
                  n.href = l.url || "";
                  eb.platform.touchonlydevice || (jQuery(n).on("mouseover", function() {
                    jQuery(this).stop(!0, !0);
                    jQuery(this).css("background", d.F.linkColor);
                    jQuery(this).css({
                      opacity: d.F.Ic
                    });
                  }), jQuery(n).on("mouseout", function() {
                    jQuery(this).css("background", "");
                    jQuery(this).css({
                      opacity: 0
                    });
                  }));
                  l.url || g ? null != n.href && "" != n.href && l.url && (jQuery(n).on("click touchstart", function() {
                    jQuery(d.L).trigger("onExternalLinkClicked", this.href);
                  }), jQuery(d.va).append(n)) : (l = "string" === typeof l.dest ? h.destinations[l.dest][0] : null != l && null != l.dest ? l.dest[0] : null, l = l instanceof Object ? h.zg[l.num + " " + l.gen + " R"] : l + 1, jQuery(n).data("gotoPage", l + 1), jQuery(n).on("click touchstart", function() {
                    d.F.gotoPage(parseInt(jQuery(this).data("gotoPage")));
                    return !1;
                  }), jQuery(d.va).append(n));
              }
            }
          });
        }
      },
      Se: function(c, d) {
        this.Ea(c, !0, d);
        jQuery("#" + c.Eb).xd();
        this.Pk(c);
        "Portrait" != c.H && "SinglePage" != c.H || jQuery(c.Yb).remove();
        c.H == this.Ja(c) && this.ub(c).Se(this, c, d);
        if (c.Eb && 0 < c.Eb.indexOf("cropCanvas")) {
          var e = c.ga;
          c.Eb = c.Eb.substr(0, c.Eb.length - 11);
          c.ga = jQuery("#" + c.Eb).get(0);
          c.ga.width = e.width / 2;
          c.ga.height = e.height;
          c.ga.getContext("2d").drawImage(e, e.width / 2, 0, c.ga.width, c.ga.height, 0, 0, e.width / 2, e.height);
          jQuery(c.ga).xd();
        }
        c.rb || !c.Jc || c.ad || !c.ga || this.Xg || (c.gd = c.ga.toDataURL(), this.pl(c));
        if (c.gd && 1 == c.scale && !this.Xg) {
          var g = jQuery("#" + this.Ca(1, c));
          requestAnim(function() {
            g.css("background-image").length < c.gd.length + 5 && g.css("background-image", "url(" + c.gd + ")");
            g[0].width = 100;
          });
        }
        if ("TwoPage" == c.H || "BookView" == c.H) {
          0 == c.pageNumber && (jQuery(c.oa).removeClass("flowpaper_hidden"), jQuery(c.V + "_1").removeClass("flowpaper_hidden")), 1 == c.pageNumber && jQuery(c.oa).removeClass("flowpaper_hidden");
        }
        c.pa || jQuery("#" + this.P).trigger("onPageLoaded", c.pageNumber + 1);
        c.pa = !0;
        c.Bl = !1;
        c.Lr = !1;
        this.Jf || (this.Jf = !0, c.F.wh());
        null != d && d();
        this.ge();
      },
      ge: function() {
        0 < this.fi.length && -1 == this.Da() && this.$k.pa && !this.$k.Fb && this.fi.shift()();
      },
      Pk: function(c) {
        "TwoPage" == c.H || "BookView" == c.H || c.H == this.Ja(c) && !eb.browser.safari || jQuery("#" + c.Mf).rc();
        this.Ha(c, -1);
      },
      ia: function(c, d) {
        this.config.RTLMode && this.S && this.S.length && (c = this.S.length - c + 1);
        this.tf && (c = CryptoJS.Ee.encrypt(c.toString(), CryptoJS.qc.De.parse(eb.Sg ? P() : eb.ce.innerHTML)).toString());
        this.config.PageIndexAdjustment && (c += this.config.PageIndexAdjustment);
        if (!d) {
          return this.pageSVGImagePattern ? this.pageSVGImagePattern.replace("{page}", c) : this.pageImagePattern.replace("{page}", c);
        }
        if (null != this.pageThumbImagePattern && 0 < this.pageThumbImagePattern.length) {
          return this.pageThumbImagePattern.replace("{page}", c) + (0 < this.pageThumbImagePattern.indexOf("?") ? "&" : "?") + "resolution=" + d;
        }
      },
      unload: function(c) {
        jQuery(".flowpaper_pageword_" + this.P + "_page_" + c.pageNumber + ":not(.flowpaper_selected_searchmatch, .flowpaper_annotation_" + this.P + ")").remove();
        c.H != this.Ja(c) && this.yl(c);
        c.rb && (jQuery(c.ga).css("background-image", "url(" + this.ea + ")"), c.U = null);
        null != c.context && null != c.ga && 100 != c.ga.width && (this.context = this.ga = c.Zo = null, c.ej && c.ej(), jQuery(".flowpaper_annotation_" + this.P + "_page_" + c.pageNumber).remove());
        this.wa && (this.pb[c.pageNumber] && this.pb[c.pageNumber].cleanup(), this.La[c.pageNumber] = null, this.pb[c.pageNumber] = null);
        c.Gg && c.Gg();
      },
      Vl: function(c) {
        var d = this;
        d.La && d.La.getPage(d.uh).then(function(e) {
          e.getTextContent().then(function(e) {
            var h = "";
            if (e) {
              for (var f = 0; f < e.items.length; f++) {
                h += e.items[f].str;
              }
            }
            d.qa[d.uh - 1] = h.toLowerCase();
            d.uh + 1 < d.getNumPages() + 1 && (d.uh++, d.Vl(c));
          });
        });
      },
      Dc: function(c, d, e, g) {
        this.ya.Dc(c, d, e, g);
      },
      Cc: function(c, d, e, g) {
        this.ya.Cc(c, d, e, g);
      },
      Fe: function(c, d, e, g) {
        this.ya.Fe(c, d, e, g);
      },
      Ea: function(c, d, e) {
        var g = null != this.S && this.S[c.pageNumber] && this.S[c.pageNumber].text && 0 < this.S[c.pageNumber].text.length && this.wa;
        if (c.pa || d || g) {
          c.xj != c.scale && (jQuery(".flowpaper_pageword_" + this.P + "_page_" + c.pageNumber).remove(), c.xj = c.scale), d = null != this.Yf ? this.Yf : e, this.Yf = null, this.ya && this.ya.Ea && this.ya.Ea(c, d);
        } else {
          if (null != e) {
            if (null != this.Yf) {
              var h = this.Yf;
              this.Yf = function() {
                h();
                e();
              };
            } else {
              this.Yf = e;
            }
          }
        }
      }
    };
    return f;
  }();

function ua() {
  this.beginLayout = function() {
    this.textDivs = [];
    this.Eh = [];
  };
  this.endLayout = function() {};
}
var ta = window.TextOverlay = function() {
  function f(c, d, e, g) {
    this.P = c;
    this.JSONPageDataFormat = e;
    this.S = [];
    this.Na = null;
    this.Ra = [];
    this.Fa = this.bq = d;
    this.sb = g;
    this.state = {};
    this.ea = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  }
  f.prototype = {
    dispose: function() {
      delete this.P;
      this.P = null;
      delete this.S;
      this.S = null;
      delete this.JSONPageDataFormat;
      this.JSONPageDataFormat = null;
      delete this.Na;
      this.Na = null;
      delete this.Ra;
      this.Ra = null;
      delete this.state;
      this.state = null;
      delete this.ea;
      this.ea = null;
      delete this.sb;
      this.sb = null;
    },
    kp: function() {
      this.state[this.Fa] || (this.state[this.Fa] = [], this.state[this.Fa].S = this.S, this.state[this.Fa].Na = this.Na, this.state[this.Fa].Ra = this.Ra, window["wordPageList_" + this.P] = null);
      this.S = [];
      this.Na = null;
      this.Ra = [];
      this.Fa = this.bq;
    },
    Ja: function(c) {
      return c.F.I ? c.F.I.W : "";
    },
    ub: function(c) {
      return c.F.I.Vp;
    },
    cn: function(c) {
      return c.F.document.AutoDetectLinks;
    },
    xc: function(c) {
      this.S = c;
      null == this.Na && (this.Na = Array(c.length));
      window["wordPageList_" + this.P] = this.Ra;
    },
    Il: function(c, d, e) {
      null == this.Na && (this.Na = Array(e));
      this.S[d] = [];
      this.S[d].text = c;
      window["wordPageList_" + this.P] = this.Ra;
    },
    Dc: function(c, d, e, g) {
      var h = c.pageNumber,
        f = !1,
        k = !1;
      if (!this.Na) {
        if (c.rb && (this.Fa = !0), this.state[this.Fa]) {
          if (this.S = this.state[this.Fa].S, this.Na = this.state[this.Fa].Na, this.Ra = this.state[this.Fa].Ra, window["wordPageList_" + this.P] = this.Ra, !this.Na) {
            return;
          }
        } else {
          return;
        }
      }
      if (window.annotations || !eb.touchdevice || g) {
        if (window.annotations || c.F.mc || g || c.F.Tk || (f = !0), k = null != this.ud && null != this.ud[c.pageNumber], "ThumbView" != c.H) {
          if ("BookView" == c.H && (0 == c.pageNumber && (h = 0 != c.pages.R ? c.pages.R - 1 : c.pages.R), 1 == c.pageNumber && (h = c.pages.R), 0 == c.pages.getTotalPages() % 2 && h == c.pages.getTotalPages() && (h = h - 1), 0 == c.pages.R % 2 && c.pages.R > c.pages.getTotalPages())) {
            return;
          }
          "SinglePage" == c.H && (h = c.pages.R);
          if ("TwoPage" == c.H && (0 == c.pageNumber && (h = c.pages.R), 1 == c.pageNumber && (h = c.pages.R + 1), 1 == c.pageNumber && h >= c.pages.getTotalPages() && 0 != c.pages.getTotalPages() % 2)) {
            return;
          }
          d = c.Xa || !d;
          c.H == this.Ja(c) && (isvisble = this.ub(c).Hc(this, c));
          g = jQuery(".flowpaper_pageword_" + this.P + "_page_" + h + ":not(.flowpaper_annotation_" + this.P + ")" + (g ? ":not(.pdfPageLink_" + h + ")" : "")).length;
          var l = null != c.dimensions.nb ? c.dimensions.nb : c.dimensions.na,
            l = this.sb ? c.xa() / l : 1;
          if (d && 0 == g) {
            var n = g = "",
              q = 0,
              t = h;
            c.F.config.document.RTLMode && (t = c.pages.getTotalPages() - h - 1);
            if (null == this.Na[t] || !this.sb) {
              if (null == this.S[t]) {
                return;
              }
              this.Na[t] = this.S[t][this.JSONPageDataFormat.Ae];
            }
            if (null != this.Na[t]) {
              c.rb && (this.Fa = !0);
              var r = new WordPage(this.P, h),
                h = c.Vb(),
                m = [],
                u = c.ld(),
                v = c.Df(),
                x = !1,
                z = -1,
                w = -1,
                D = 0,
                C = -1,
                H = -1,
                A = !1;
              this.Ra[t] = r;
              c.H == this.Ja(c) && (l = this.ub(c).Tn(this, c, l));
              c.ks = l;
              for (var G = 0, B; B = this.Na[t][G++];) {
                var F = G - 1,
                  y = this.Fa ? B[5] : B[this.JSONPageDataFormat.qb],
                  E = G,
                  I = G + 1,
                  K = G < this.Na[t].length ? this.Na[t][G] : null,
                  N = G + 1 < this.Na[t].length ? this.Na[t][G + 1] : null,
                  x = K ? this.Fa ? K[5] : K[this.JSONPageDataFormat.qb] : "",
                  L = N ? this.Fa ? N[5] : N[this.JSONPageDataFormat.qb] : "";
                " " == x && (E = G + 1, I = G + 2, x = (K = E < this.Na[t].length ? this.Na[t][E] : null) ? this.Fa ? K[5] : K[this.JSONPageDataFormat.qb] : "", L = (N = I < this.Na[t].length ? this.Na[t][I] : null) ? this.Fa ? N[5] : N[this.JSONPageDataFormat.qb] : "");
                K = N = null;
                if (null == y) {
                  M("word not found in node");
                  e && e();
                  return;
                }
                0 == y.length && (y = " ");
                A = null;
                if (-1 == y.indexOf("actionGoToR") && -1 == y.indexOf("actionGoTo") && -1 == y.indexOf("actionURI") && this.cn(c)) {
                  if (A = y.match(/\b((?:(https?|ftp):(?:\/{1,3}|[0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?\u00ab\u00bb\u201c\u201d\u2018\u2019]))/ig)) {
                    y = "actionURI(" + A[0] + "):" + A[0], this.Na[t][F][this.Fa ? 5 : this.JSONPageDataFormat.qb] = y;
                  }!A && -1 < y.indexOf("@") && (A = y.trim().match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi), !A && (A = (y.trim() + x.trim()).match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi)) && (x = "actionURI(mailto:" + A[0] + "):" + A[0], this.Na[t][E][this.Fa ? 5 : this.JSONPageDataFormat.qb] = x), !A && (A = (y.trim() + x.trim() + L.trim()).match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi)) && (x = "actionURI(mailto:" + A[0] + "):" + A[0], this.Na[t][E][this.Fa ? 5 : this.JSONPageDataFormat.qb] = x, L = "actionURI(mailto:" + A[0] + "):" + A[0], this.Na[t][I][this.Fa ? 5 : this.JSONPageDataFormat.qb] = L), A && (y = A[0], y.endsWith(".") && (y = y.substr(0, y.length - 1)), y = "actionURI(mailto:" + y + "):" + y, this.Na[t][F][this.Fa ? 5 : this.JSONPageDataFormat.qb] = y));
                }
                if (0 <= y.indexOf("actionGoToR")) {
                  N = y.substring(y.indexOf("actionGoToR") + 12, y.indexOf(",", y.indexOf("actionGoToR") + 13)), y = y.substring(y.indexOf(",") + 1);
                } else {
                  if (0 <= y.indexOf("actionGoTo")) {
                    N = y.substring(y.indexOf("actionGoTo") + 11, y.indexOf(",", y.indexOf("actionGoTo") + 12)), y = y.substring(y.indexOf(",") + 1);
                  } else {
                    if (0 <= y.indexOf("actionURI") || A) {
                      if (0 <= y.indexOf("actionURI(") && 0 < y.indexOf("):") ? (K = y.substring(y.indexOf("actionURI(") + 10, y.lastIndexOf("):")), y = y.substring(y.indexOf("):") + 2)) : (K = y.substring(y.indexOf("actionURI") + 10), y = y.substring(y.indexOf("actionURI") + 10)), -1 == K.indexOf("http") && -1 == K.indexOf("mailto") && 0 != K.indexOf("/")) {
                        K = "http://" + K;
                      } else {
                        if (!A) {
                          for (F = G, E = this.Fa ? B[5] : B[this.JSONPageDataFormat.qb], I = 1; 2 >= I; I++) {
                            for (F = G; F < this.Na[t].length && 0 <= this.Na[t][F].toString().indexOf("actionURI") && -1 == this.Na[t][F].toString().indexOf("actionURI(");) {
                              x = this.Na[t][F], A = this.Fa ? x[5] : x[this.JSONPageDataFormat.qb], 1 == I ? 0 <= A.indexOf("actionURI") && 11 < A.length && -1 == A.indexOf("http://") && -1 == A.indexOf("https://") && -1 == A.indexOf("mailto") && (E += A.substring(A.indexOf("actionURI") + 10)) : this.Fa ? x[5] = E : x[this.JSONPageDataFormat.qb], F++;
                            }
                            2 == I && -1 == E.indexOf("actionURI(") && (y = E, K = y.substring(y.indexOf("actionURI") + 10), y = y.substring(y.indexOf("actionURI") + 10));
                          }
                        }
                      }
                    }
                  }
                }
                if (N || K || !f || k) {
                  E = (this.Fa ? B[0] : B[this.JSONPageDataFormat.Ab]) * l + 0;
                  I = (this.Fa ? B[1] : B[this.JSONPageDataFormat.lc]) * l + 0;
                  F = (this.Fa ? B[2] : B[this.JSONPageDataFormat.Ad]) * l;
                  B = (this.Fa ? B[3] : B[this.JSONPageDataFormat.zd]) * l;
                  r.tp(q, y);
                  x = -1 != z && z != E;
                  A = G == this.Na[t].length;
                  I + F > u && (F = u - I);
                  E + B > v && (B = v - E);
                  m[q] = {};
                  m[q].left = I;
                  m[q].right = I + F;
                  m[q].top = E;
                  m[q].bottom = E + B;
                  m[q].el = "#" + this.P + "page_" + t + "_word_" + q;
                  m[q].i = q;
                  m[q].ml = N;
                  m[q].qm = K;
                  g += "<span id='" + this.P + "page_" + t + "_word_" + q + "' class='flowpaper_pageword flowpaper_pageword_" + this.P + "_page_" + t + " flowpaper_pageword_" + this.P + (null != N || null != K ? " pdfPageLink_" + c.pageNumber : "") + "' style='left:" + I + "px;top:" + E + "px;width:" + F + "px;height:" + B + "px;margin-left:0px;" + (m[q].ml || m[q].qm ? "cursor:hand;" : "") + ";" + (eb.browser.msie ? "background-image:url(" + this.ea + ");color:transparent;" : "") + "'>" + (c.F.Tk ? y : "") + "</span>";
                  if (null != N || null != K) {
                    L = document.createElement("a");
                    L.style.position = "absolute";
                    L.style.left = Math.floor(I) + h + "px";
                    L.style.top = Math.floor(E) + "px";
                    L.style.width = Math.ceil(F) + "px";
                    L.style.height = Math.ceil(B) + "px";
                    L.style["margin-left"] = h;
                    L.style.cursor = "pointer";
                    L.setAttribute("data-href", null != K ? K : "");
                    L.setAttribute("rel", "nofollow noopener");
                    jQuery(L).css("z-index", "99");
                    L.className = "pdfPageLink_" + c.pageNumber + " flowpaper_interactiveobject_" + this.P + " flowpaper_pageword_" + this.P + "_page_" + t + " gotoPage_" + N + " flowpaper_pageword_" + this.P;
                    eb.platform.touchonlydevice && (L.style.background = c.F.linkColor, L.style.opacity = c.F.Ic);
                    null != N && (jQuery(L).data("gotoPage", N), jQuery(L).on("click touchstart", function() {
                      c.F.gotoPage(parseInt(jQuery(this).data("gotoPage")));
                      return !1;
                    }));
                    if (null != K) {
                      jQuery(L).on("click touchstart", function(d) {
                        jQuery(c.L).trigger("onExternalLinkClicked", this.getAttribute("data-href"));
                        d.stopImmediatePropagation();
                        d.preventDefault();
                        return !1;
                      });
                    }
                    eb.platform.touchonlydevice || (jQuery(L).on("mouseover", function() {
                      jQuery(this).stop(!0, !0);
                      jQuery(this).css("background", c.F.linkColor);
                      jQuery(this).css({
                        opacity: c.F.Ic
                      });
                    }), jQuery(L).on("mouseout", function() {
                      jQuery(this).css("background", "");
                      jQuery(this).css({
                        opacity: 0
                      });
                    }));
                    "TwoPage" == c.H || "BookView" == c.H ? (0 == c.pageNumber && jQuery(c.V + "_1_textoverlay").append(L), 1 == c.pageNumber && jQuery(c.V + "_2_textoverlay").append(L)) : jQuery(c.va).append(L);
                  }
                  eb.platform.touchdevice && "Portrait" == c.H && (x || A ? (A && (D += F, n = n + "<div style='float:left;width:" + F + "px'>" + (" " == y ? "&nbsp;" : y) + "</div>"), n = "<div id='" + this.P + "page_" + t + "_word_" + q + "_wordspan' class='flowpaper_pageword flowpaper_pageword_" + this.P + "_page_" + t + " flowpaper_pageword_" + this.P + "' style='color:transparent;left:" + C + "px;top:" + z + "px;width:" + D + "px;height:" + w + "px;margin-left:" + H + "px;font-size:" + w + "px" + (m[q].ml || m[q].qm ? "cursor:hand;" : "") + "'>" + n + "</div>", jQuery(c.Zi).append(n), z = E, w = B, D = F, C = I, H = h, n = "<div style='background-colorfloat:left;width:" + F + "px'>" + (" " == y ? "&nbsp;" : y) + "</div>") : (-1 == C && (C = I), -1 == H && (H = h), -1 == z && (z = E), -1 == w && (w = B), n = n + "<div style='float:left;width:" + F + "px'>" + (" " == y ? "&nbsp;" : y) + "</div>", D += F, w = B));
                }
                q++;
              }
              r.qp(m);
              "Portrait" == c.H && (0 == jQuery(c.xb).length && (f = c.yg, F = c.xa(), B = c.Ga(), h = c.Vb(), f = "<div id='" + f + "' class='flowpaper_textLayer' style='width:" + F + "px;height:" + B + "px;margin-left:" + h + "px;'></div>", jQuery(c.va).append(f)), jQuery(c.xb).append(g));
              "SinglePage" == c.H && (0 == jQuery(c.xb).length && (f = c.yg, F = c.xa(), B = c.Ga(), h = c.Vb(), f = "<div id='" + f + "' class='flowpaper_textLayer' style='width:" + F + "px;height:" + B + "px;margin-left:" + h + "px;'></div>", jQuery(c.va).append(f)), jQuery(c.xb).append(g));
              c.H == this.Ja(c) && (0 == jQuery(c.xb).length && (f = c.sd + "_textLayer", F = c.xa(), B = c.Ga(), h = c.Vb(), f = "<div id='" + f + "' class='flowpaper_textLayer' style='width:" + F + "px;height:" + B + "px;margin-left:" + h + "px;'></div>", jQuery(c.va).append(f)), this.ub(c).bn(this, c, g));
              if ("TwoPage" == c.H || "BookView" == c.H) {
                0 == c.pageNumber && jQuery(c.V + "_1_textoverlay").append(g), 1 == c.pageNumber && jQuery(c.V + "_2_textoverlay").append(g);
              }
              d && jQuery(c).trigger("onAddedTextOverlay", c.pageNumber);
              if (k) {
                for (k = 0; k < this.ud[c.pageNumber].length; k++) {
                  this.Vm(c, this.ud[c.pageNumber][k].Fp, this.ud[c.pageNumber][k].Wp);
                }
              }
            }
          }
          null != e && e();
        }
      } else {
        e && e();
      }
    },
    Cc: function(c, d, e, g, h) {
      var f = this;
      window.annotations || jQuery(c).unbind("onAddedTextOverlay");
      var k = "TwoPage" == c.H || "BookView" == c.H ? c.pages.R + c.pageNumber : c.pageNumber;
      "BookView" == c.H && 0 < c.pages.R && 1 == c.pageNumber && (k = k - 2);
      "SinglePage" == c.H && (k = c.pages.R);
      if ((c.Xa || !e) && c.F.Ta - 1 == k) {
        jQuery(".flowpaper_selected").removeClass("flowpaper_selected");
        jQuery(".flowpaper_selected_searchmatch").removeClass("flowpaper_selected_searchmatch");
        jQuery(".flowpaper_selected_default").removeClass("flowpaper_selected_default");
        jQuery(".flowpaper_tmpselection").remove();
        var l = jQuery(".flowpaper_pageword_" + f.P + "_page_" + c.pageNumber + ":not(.flowpaper_annotation_" + f.P + "):not(.pdfPageLink_" + c.pageNumber + ")").length;
        h && (l = jQuery(".flowpaper_pageword_" + f.P + "_page_" + c.pageNumber + ":not(.flowpaper_annotation_" + f.P + ")").length);
        if (f.Ra[k] && 0 != l) {
          h = f.Ra[k].Ih;
          for (var l = "", n = 0, q = 0, t = -1, r = -1, m = d.split(" "), u = 0, v = 0, x = 0; x < h.length; x++) {
            var z = (h[x] + "").toLowerCase(),
              u = u + z.length;
            u > g && u - d.length <= g + v && (v += d.length);
            z || jQuery.trim(z) != d && jQuery.trim(l + z) != d || (z = jQuery.trim(z));
            if (0 == d.indexOf(l + z) && (l + z).length <= d.length && " " != l + z) {
              if (l += z, -1 == t && (t = n, r = n + 1), d.length == z.length && (t = n), l.length == d.length) {
                if (q++, c.F.ve == q) {
                  if ("Portrait" == c.H || "SinglePage" == c.H) {
                    eb.browser.capabilities.yb ? jQuery("#pagesContainer_" + f.P).scrollTo(jQuery(f.Ra[k].Za[t].el), 0, {
                      axis: "xy",
                      offset: -30
                    }) : jQuery("#pagesContainer_" + f.P).data("jsp").scrollToElement(jQuery(f.Ra[k].Za[t].el), !1);
                  }
                  for (var w = t; w < n + 1; w++) {
                    c.H == f.Ja(c) ? (z = jQuery(f.Ra[k].Za[w].el).clone(), f.ub(c).dk(f, c, z, d, !0, w == t, w == n)) : (jQuery(f.Ra[k].Za[w].el).addClass("flowpaper_selected"), jQuery(f.Ra[k].Za[w].el).addClass("flowpaper_selected_default"), jQuery(f.Ra[k].Za[w].el).addClass("flowpaper_selected_searchmatch"));
                  }
                } else {
                  l = "", t = -1;
                }
              }
            } else {
              if (0 <= (l + z).indexOf(m[0])) {
                -1 == t && (t = n, r = n + 1);
                l += z;
                if (1 < m.length) {
                  for (z = 0; z < m.length - 1; z++) {
                    0 < m[z].length && h.length > n + 1 + z && 0 <= (l + h[n + 1 + z]).toLowerCase().indexOf(m[z]) ? (l += h[n + 1 + z].toLowerCase(), r = n + 1 + z + 1) : (l = "", r = t = -1);
                  }
                } - 1 == l.indexOf(d) && (l = "", r = t = -1);
                w = (l.match(new RegExp(d.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), "g")) || []).length;
                if (0 < l.length) {
                  for (var D = 0; D < w; D++) {
                    if (-1 < l.indexOf(d) && q++, c.F.ve == q) {
                      for (var C = jQuery(f.Ra[k].Za[t].el), H = parseFloat(C.css("left").substring(0, C.css("left").length - 2)) - (c.H == f.Ja(c) ? c.Vb() : 0), z = C.clone(), A = 0, G = 0, B = 0; t < r; t++) {
                        A += parseFloat(jQuery(f.Ra[k].Za[t].el).css("width").substring(0, C.css("width").length - 2));
                      }
                      G = 1 - (l.length - d.length) / l.length;
                      r = -1;
                      for (t = 0; t < D + 1; t++) {
                        r = l.indexOf(d, r + 1), B = r / l.length;
                      }
                      z.addClass("flowpaper_tmpselection");
                      z.attr("id", z.attr("id") + "tmp");
                      z.addClass("flowpaper_selected");
                      z.addClass("flowpaper_selected_searchmatch");
                      z.addClass("flowpaper_selected_default");
                      z.css("width", A * G + "px");
                      z.css("left", H + A * B + "px");
                      if ("Portrait" == c.H || "SinglePage" == c.H) {
                        jQuery(c.xb).append(z), eb.browser.capabilities.yb ? jQuery("#pagesContainer_" + f.P).scrollTo(z, 0, {
                          axis: "xy",
                          offset: -30
                        }) : jQuery("#pagesContainer_" + f.P).data("jsp").scrollToElement(z, !1);
                      }
                      c.H == f.Ja(c) && f.ub(c).dk(f, c, z, d);
                      "BookView" == c.H && (0 == k ? jQuery("#dummyPage_0_" + f.P + "_1_textoverlay").append(z) : jQuery("#dummyPage_" + (k - 1) % 2 + "_" + f.P + "_" + ((k - 1) % 2 + 1) + "_textoverlay").append(z));
                      "TwoPage" == c.H && jQuery("#dummyPage_" + k % 2 + "_" + f.P + "_" + (k % 2 + 1) + "_textoverlay").append(z);
                      r = t = -1;
                    } else {
                      D == w - 1 && (l = "", r = t = -1);
                    }
                  }
                }
              } else {
                0 < l.length && (l = "", t = -1);
              }
            }
            n++;
          }
        } else {
          jQuery(c).bind("onAddedTextOverlay", function() {
            f.Cc(c, d, e, g, !0);
          }), f.Dc(c, e, null, !0);
        }
      }
    },
    Fe: function(c, d, e) {
      null == this.ud && (this.ud = Array(this.Na.length));
      null == this.ud[c.pageNumber] && (this.ud[c.pageNumber] = []);
      var g = {};
      g.Fp = d;
      g.Wp = e;
      this.ud[c.pageNumber][this.ud[c.pageNumber].length] = g;
    },
    Vm: function(c, d, e) {
      jQuery(c).unbind("onAddedTextOverlay");
      var g = "TwoPage" == c.H || "BookView" == c.H ? c.pages.R + c.pageNumber : c.pageNumber;
      "BookView" == c.H && 0 < c.pages.R && 1 == c.pageNumber && (g = g - 2);
      "SinglePage" == c.H && (g = c.pages.R);
      for (var h = this.Ra[g].Ih, f = -1, k = -1, l = 0, n = 0; n < h.length; n++) {
        var q = h[n] + "";
        l >= d && -1 == f && (f = n);
        if (l + q.length >= d + e && -1 == k && (k = n, -1 != f)) {
          break;
        }
        l += q.length;
      }
      for (d = f; d < k + 1; d++) {
        c.H == this.Ja(c) ? jQuery(this.Ra[g].Za[d].el).clone() : (jQuery(this.Ra[g].Za[d].el).addClass("flowpaper_selected"), jQuery(this.Ra[g].Za[d].el).addClass("flowpaper_selected_yellow"), jQuery(this.Ra[g].Za[d].el).addClass("flowpaper_selected_searchmatch"));
      }
    },
    Ea: function(c, d) {
      this.Dc(c, null == d, d);
    }
  };
  return f;
}();
window.WordPage = function(f, c) {
  this.P = f;
  this.pageNumber = c;
  this.Ih = [];
  this.Za = null;
  this.tp = function(c, e) {
    this.Ih[c] = e;
  };
  this.qp = function(c) {
    this.Za = c;
  };
  this.match = function(c, e) {
    var g, h = null;
    g = "#page_" + this.pageNumber + "_" + this.P;
    0 == jQuery(g).length && (g = "#dummyPage_" + this.pageNumber + "_" + this.P);
    g = jQuery(g).offset();
    "SinglePage" == window.$FlowPaper(this.P).H && (g = "#dummyPage_0_" + this.P, g = jQuery(g).offset());
    if ("TwoPage" == window.$FlowPaper(this.P).H || "BookView" == window.$FlowPaper(this.P).H) {
      g = 0 == this.pageNumber || "TwoPage" == window.$FlowPaper(this.P).H ? jQuery("#dummyPage_" + this.pageNumber % 2 + "_" + this.P + "_" + (this.pageNumber % 2 + 1) + "_textoverlay").offset() : jQuery("#dummyPage_" + (this.pageNumber - 1) % 2 + "_" + this.P + "_" + ((this.pageNumber - 1) % 2 + 1) + "_textoverlay").offset();
    }
    c.top = c.top - g.top;
    c.left = c.left - g.left;
    for (g = 0; g < this.Za.length; g++) {
      this.ko(c, this.Za[g], e) && (null == h || null != h && h.top < this.Za[g].top || null != h && h.top <= this.Za[g].top && null != h && h.left < this.Za[g].left) && (h = this.Za[g], h.pageNumber = this.pageNumber);
    }
    return h;
  };
  this.hl = function(c) {
    for (var e = 0; e < this.Za.length; e++) {
      if (this.Za[e] && this.Za[e].el == "#" + c) {
        return this.Za[e];
      }
    }
    return null;
  };
  this.ko = function(c, e, g) {
    return e ? g ? c.left + 3 >= e.left && c.left - 3 <= e.right && c.top + 3 >= e.top && c.top - 3 <= e.bottom : c.left + 3 >= e.left && c.top + 3 >= e.top : !1;
  };
  this.Af = function(c, e) {
    var g = window.a,
      h = window.b,
      f = new va,
      k, l, n = 0,
      q = -1;
    if (null == g) {
      return f;
    }
    if (g && h) {
      var t = [],
        r;
      g.top > h.top ? (k = h, l = g) : (k = g, l = h);
      for (k = k.i; k <= l.i; k++) {
        if (this.Za[k]) {
          var m = jQuery(this.Za[k].el);
          0 != m.length && (r = parseInt(m.attr("id").substring(m.attr("id").indexOf("word_") + 5)), q = parseInt(m.attr("id").substring(m.attr("id").indexOf("page_") + 5, m.attr("id").indexOf("word_") - 1)) + 1, 0 <= r && t.push(this.Ih[r]), n++, c && (m.addClass("flowpaper_selected"), m.addClass(e), "flowpaper_selected_strikeout" != e || m.data("adjusted") || (r = m.height(), m.css("margin-top", r / 2 - r / 3 / 1.5), m.height(r / 2.3), m.data("adjusted", !0))));
        }
      }
      eb.platform.touchonlydevice || jQuery(".flowpaper_selector").val(t.join("")).select();
    } else {
      eb.platform.touchdevice || jQuery("#selector").val("");
    }
    f.Fr = n;
    f.ys = g.left;
    f.zs = g.right;
    f.As = g.top;
    f.xs = g.bottom;
    f.us = g.left;
    f.vs = g.right;
    f.ws = g.top;
    f.ts = g.bottom;
    f.Jn = null != t && 0 < t.length ? t[0] : null;
    f.Nr = null != t && 0 < t.length ? t[t.length - 1] : f.Jn;
    f.Kn = null != g ? g.i : -1;
    f.Or = null != h ? h.i : f.Kn;
    f.text = null != t ? t.join("") : "";
    f.page = q;
    f.ss = this;
    return f;
  };
};

function va() {}

function U(f) {
  var c = hoverPage;
  if (f = window["wordPageList_" + f]) {
    return f.length >= c ? f[c] : null;
  }
}
var V = function() {
    function f(c, d, e, g) {
      this.F = d;
      this.L = c;
      this.pages = {};
      this.selectors = {};
      this.container = "pagesContainer_" + e;
      this.J = "#" + this.container;
      this.R = null == g ? 0 : g - 1;
      this.ze = g;
      this.Sd = this.Wf = null;
      this.$c = this.Zc = -1;
      this.te = this.rd = 0;
      this.initialized = !1;
      this.fa = eb.platform.touchonlydevice && !eb.platform.lb ? 30 : 22;
      this.P = this.F.P;
      this.document = this.F.document;
    }
    f.prototype = {
      M: function(c) {
        if (0 < c.indexOf("undefined")) {
          return jQuery(null);
        }
        this.selectors || (this.selectors = {});
        this.selectors[c] || (this.selectors[c] = jQuery(c));
        return this.selectors[c];
      },
      Yi: function() {
        null != this.ri && (window.clearTimeout(this.ri), this.ri = null);
        this.F.I && this.F.H == this.F.I.W && this.F.I.jb.Yi(this);
      },
      Mb: function() {
        return this.F.I && this.F.H == this.F.I.W && this.F.I.jb.Mb(this) || "SinglePage" == this.F.H;
      },
      cp: function() {
        return !(this.F.I && this.F.I.jb.Mb(this));
      },
      Pa: function(c, d, e) {
        var g = this.F.scale;
        this.F.scale = c;
        if ("TwoPage" == this.F.H || "BookView" == this.F.H) {
          var h = 100 * c + "%";
          eb.platform.touchdevice || this.M(this.J).css({
            width: h,
            "margin-left": this.Ff()
          });
        }
        this.pages[0] && (this.pages[0].scale = c);
        if ("Portrait" == this.F.H || "SinglePage" == this.F.H) {
          for (h = this.ug = 0; h < this.document.numPages; h++) {
            if (this.Ua(h)) {
              var f = this.pages[h].xa(c);
              f > this.ug && (this.ug = f);
            }
          }
        }
        for (h = 0; h < this.document.numPages; h++) {
          this.Ua(h) && (this.pages[h].scale = c, this.pages[h].Pa());
        }
        this.F.I && this.F.H == this.F.I.W && this.F.I.jb.Pa(this, g, c, d, e);
      },
      dispose: function() {
        for (var c = 0; c < this.document.numPages; c++) {
          this.pages[c].dispose(), delete this.pages[c];
        }
        this.selectors = this.pages = this.L = this.F = null;
      },
      resize: function(c, d, e) {
        if ("Portrait" == this.F.H || "SinglePage" == this.F.H) {
          d += eb.browser.capabilities.yb ? 0 : 14, c = c - (eb.browser.msie ? 0 : 2);
        }
        "ThumbView" == this.F.H && (d = d - 10);
        this.M(this.J).css({
          width: c,
          height: d
        });
        "TwoPage" == this.F.H && (this.F.Dj = this.L.height() - (eb.platform.touchdevice ? 0 : 27), this.F.Fg = c / 2 - 2, this.M(this.J).height(this.F.Dj), this.M("#" + this.container + "_2").css("left", this.M("#" + this.container).width() / 2), eb.platform.touchdevice || (this.M(this.J + "_1").width(this.F.Fg), this.M(this.J + "_2").width(this.F.Fg)));
        if (this.F.I && this.F.H == this.F.I.W) {
          this.F.I.jb.resize(this, c, d, e);
        } else {
          for (this.ed(), c = 0; c < this.document.numPages; c++) {
            this.Ua(c) && this.pages[c].Pa();
          }
        }
        this.Hj = null;
        null != this.jScrollPane && (this.jScrollPane.data("jsp").reinitialise(this.Yc), this.jScrollPane.data("jsp").scrollTo(this.Zc, this.$c, !1));
      },
      ne: function(c) {
        var d = this;
        if (!d.ba) {
          var e = !1;
          "function" === typeof d.Hi && d.Cr();
          jQuery(".flowpaper_pageword").each(function() {
            jQuery(this).hasClass("flowpaper_selected_default") && (e = !0);
          });
          null != d.touchwipe && (d.touchwipe.config.preventDefaultEvents = !1);
          d.Mb() || (jQuery(".flowpaper_pageword_" + d.P).remove(), setTimeout(function() {
            "TwoPage" != d.F.H && "BookView" != d.F.H || d.jc();
            d.Ea();
            e && d.getPage(d.F.Ta - 1).Cc(d.F.Td, !1);
          }, 500));
          d.F.I && d.F.H == d.F.I.W ? d.F.I.jb.ne(d, c) : d.Pa(1);
          null != d.jScrollPane ? (d.jScrollPane.data("jsp").reinitialise(d.Yc), d.jScrollPane.data("jsp").scrollTo(d.Zc, d.$c, !1)) : "TwoPage" != d.F.H && "BookView" != d.F.H || d.M(d.J).parent().scrollTo({
            left: d.Zc + "px",
            top: d.$c + "px"
          }, 0, {
            axis: "xy"
          });
        }
      },
      md: function(c) {
        var d = this;
        if (!d.ba) {
          var e = !1;
          null != d.touchwipe && (d.touchwipe.config.preventDefaultEvents = !0);
          "function" === typeof d.Hi && d.Dr();
          jQuery(".flowpaper_pageword").each(function() {
            jQuery(this).hasClass("flowpaper_selected_default") && (e = !0);
          });
          d.Mb() || jQuery(".flowpaper_pageword_" + d.P).remove();
          d.F.I && d.F.H == d.F.I.W ? d.F.I.jb.md(d, c) : d.Pa(window.FitHeightScale);
          setTimeout(function() {
            d.Ea();
            e && d.getPage(d.F.Ta - 1).Cc(d.F.Td, !1);
          }, 500);
          d.Ea();
          null != d.jScrollPane ? (d.jScrollPane.data("jsp").scrollTo(0, 0, !1), d.jScrollPane.data("jsp").reinitialise(d.Yc)) : d.M(d.J).parent().scrollTo({
            left: 0,
            top: 0
          }, 0, {
            axis: "xy"
          });
        }
      },
      Xi: function() {
        var c = this;
        c.Ie();
        if (c.F.I && c.F.H == c.F.I.W) {
          c.F.I.jb.Xi(c);
        } else {
          if ("SinglePage" == c.F.H || "TwoPage" == c.F.H || "BookView" == c.F.H) {
            c.touchwipe = c.M(c.J).touchwipe({
              wipeLeft: function() {
                if (!c.F.Xc && !window.Cb && null == c.ba && ("TwoPage" != c.F.H && "BookView" != c.F.H || 1 == c.F.scale || c.next(), "SinglePage" == c.F.H)) {
                  var d = jQuery(c.J).width() - 5,
                    g = 1 < c.F.getTotalPages() ? c.F.da - 1 : 0;
                  0 > g && (g = 0);
                  var h = c.getPage(g).dimensions.na / c.getPage(g).dimensions.za,
                    d = Math.round(100 * (d / (c.getPage(g).Ma * h) - 0.03));
                  100 * c.F.scale < 1.2 * d && c.next();
                }
              },
              wipeRight: function() {
                if (!c.F.Xc && !window.Cb && null == c.ba && ("TwoPage" != c.F.H && "BookView" != c.F.H || 1 == c.F.scale || c.previous(), "SinglePage" == c.F.H)) {
                  var d = jQuery(c.J).width() - 15,
                    g = 1 < c.F.getTotalPages() ? c.F.da - 1 : 0;
                  0 > g && (g = 0);
                  var h = c.getPage(g).dimensions.na / c.getPage(g).dimensions.za,
                    d = Math.round(100 * (d / (c.getPage(g).Ma * h) - 0.03));
                  100 * c.F.scale < 1.2 * d && c.previous();
                }
              },
              preventDefaultEvents: "TwoPage" == c.F.H || "BookView" == c.F.H || "SinglePage" == c.F.H,
              min_move_x: eb.platform.lb ? 150 : 200,
              min_move_y: 500
            });
          }
        }
        if (eb.platform.mobilepreview) {
          c.M(c.J).on("mousedown", function(d) {
            c.Zc = d.pageX;
            c.$c = d.pageY;
          });
        }
        c.M(c.J).on("touchstart", function(d) {
          c.Zc = d.originalEvent.touches[0].pageX;
          c.$c = d.originalEvent.touches[0].pageY;
        });
        c.M(c.J).on(eb.platform.mobilepreview ? "mouseup" : "touchend", function() {
          null != c.F.pages.jScrollPane && c.F.pages.jScrollPane.data("jsp").enable && c.F.pages.jScrollPane.data("jsp").enable();
          if (null != c.gb && "SinglePage" == c.F.H) {
            for (var d = 0; d < c.document.numPages; d++) {
              c.Ua(d) && c.M(c.pages[d].oa).transition({
                y: 0,
                scale: 1
              }, 0, "ease", function() {
                c.ba > c.F.scale && c.ba - c.F.scale < c.F.document.ZoomInterval && (c.ba += c.F.document.ZoomInterval);
                0 < c.Uc - c.de && c.ba < c.F.scale && (c.ba = c.F.scale + c.F.document.ZoomInterval);
                c.F.hb(c.ba, {
                  lg: !0
                });
                c.ba = null;
              });
            }
            c.pages[0] && c.pages[0].Ie();
            c.M(c.J).addClass("flowpaper_pages_border");
            c.bj = c.gb < c.ba;
            c.gb = null;
            c.Sf = null;
            c.ba = null;
            c.wb = null;
            c.sc = null;
          }
        });
        if (c.F.I && c.F.H == c.F.I.W) {
          c.F.I.jb.ek(c);
        } else {
          if (eb.platform.touchdevice) {
            var d = c.M(c.J);
            d.doubletap(function(d) {
              if ("TwoPage" == c.F.H || "BookView" == c.F.H) {
                "TwoPage" != c.F.H && "BookView" != c.F.H || 1 == c.F.scale ? "TwoPage" != c.F.H && "BookView" != c.F.H || 1 != c.F.scale || c.md() : c.ne(), d.preventDefault();
              }
            }, null, 300);
          } else {
            c.F.Wb && (d = c.M(c.J), d.doubletap(function(d) {
              var g = jQuery(".activeElement").data("hint-pageNumber");
              window.parent.postMessage("EditPage:" + g, "*");
              window.clearTimeout(c.Mi);
              d.preventDefault();
              d.stopImmediatePropagation();
            }, null, 300));
          }
        }
        c.M(c.J).on("scroll gesturechange", function() {
          "SinglePage" == c.F.H ? c.F.renderer.mb && !c.ba && c.F.renderer.Nc(c.pages[0]) : c.F.I && c.F.H == c.F.I.W || (eb.platform.ios && c.ij(-1 * c.M(c.J).scrollTop()), eb.platform.ios ? (setTimeout(function() {
            c.Hg();
            c.cd();
          }, 1000), setTimeout(function() {
            c.Hg();
            c.cd();
          }, 2000), setTimeout(function() {
            c.Hg();
            c.cd();
          }, 3000)) : c.Hg(), c.cd(), c.Ea(), null != c.Wf && (window.clearTimeout(c.Wf), c.Wf = null), c.Wf = setTimeout(function() {
            c.Ok();
            window.clearTimeout(c.Wf);
            c.Wf = null;
          }, 100), c.Wr = !0);
        });
        this.Ok();
      },
      ek: function() {},
      ij: function(c) {
        for (var d = 0; d < this.document.numPages; d++) {
          this.Ua(d) && this.pages[d].ij(c);
        }
      },
      hm: function() {
        var c = this.M(this.J).css("transform") + "";
        null != c && (c = c.replace("translate", ""), c = c.replace("(", ""), c = c.replace(")", ""), c = c.replace("px", ""), c = c.split(","), this.rd = parseFloat(c[0]), this.te = parseFloat(c[1]), isNaN(this.rd) && (this.te = this.rd = 0));
      },
      lk: function(c, d) {
        this.M(this.J).transition({
          x: this.rd + (c - this.wb) / this.F.scale,
          y: this.te + (d - this.sc) / this.F.scale
        }, 0);
      },
      Vg: function(c, d) {
        this.F.I && this.F.I.jb.Vg(this, c, d);
      },
      Vn: function(c, d) {
        var e = this.L.width();
        return c / d - this.Bd / e / d * e;
      },
      Wn: function(c) {
        var d = this.L.height();
        return c / this.F.scale - this.Cd / d / this.F.scale * d;
      },
      Ie: function() {
        this.F.I && this.F.I.jb.Ie(this);
      },
      Fi: function() {
        if (this.F.I) {
          return this.F.I.jb.Fi(this);
        }
      },
      getTotalPages: function() {
        return this.document.numPages;
      },
      ji: function(c) {
        var d = this;
        c.empty();
        jQuery(d.F.renderer).on("onTextDataUpdated", function() {
          d.Ea(d);
        });
        null != d.F.Sd || d.F.document.DisableOverflow || d.F.ab || (d.F.Sd = d.L.height(), eb.platform.touchonlydevice ? d.F.Rb || d.L.height(d.F.Sd - 10) : d.L.height(d.F.Sd - 27));
        var e = d.F.I && d.F.I.backgroundColor ? "background-color:" + d.F.I.backgroundColor + ";" : "";
        d.F.I && d.F.I.backgroundImage && (e = "background-color:transparent;");
        if ("Portrait" == d.F.H || "SinglePage" == d.F.H) {
          eb.platform.touchonlydevice && "SinglePage" == d.F.H && (eb.browser.capabilities.yb = !1);
          var g = jQuery(d.F.K).height() + (window.zine && "Portrait" == d.F.vb ? 20 : 0),
            h = eb.platform.touchonlydevice ? 31 : 26;
          window.zine && "Portrait" != d.F.vb && (h = eb.platform.touchonlydevice ? 41 : 36);
          var g = d.L.height() + (eb.browser.capabilities.yb ? window.annotations ? 0 : h - g : -5),
            h = d.L.width() - 2,
            f = 1 < d.ze ? "visibility:hidden;" : "",
            k = eb.browser.msie && 9 > eb.browser.version ? "position:relative;" : "";
          d.F.document.DisableOverflow ? c.append("<div id='" + d.container + "' class='flowpaper_pages' style='overflow:hidden;padding:0;margin:0;'></div>") : c.append("<div id='" + d.container + "' class='flowpaper_pages " + (window.annotations ? "" : "flowpaper_pages_border") + "' style='" + (eb.platform.rm ? "touch-action: none;" : "") + "-moz-user-select:none;-webkit-user-select:none;" + k + ";" + f + "height:" + g + "px;width:" + h + "px;overflow-y: auto;overflow-x: auto;;-webkit-overflow-scrolling: touch;-webkit-backface-visibility: hidden;-webkit-perspective: 1000;" + e + ";'></div>");
          d.F.document.DisableOverflow || (eb.browser.capabilities.yb ? eb.platform.touchonlydevice ? (jQuery(c).css("overflow-y", "auto"), jQuery(c).css("overflow-x", "auto"), jQuery(c).css("-webkit-overflow-scrolling", "touch")) : (jQuery(c).css("overflow-y", "visible"), jQuery(c).css("overflow-x", "visible"), jQuery(c).css("-webkit-overflow-scrolling", "visible")) : jQuery(c).css("-webkit-overflow-scrolling", "hidden"));
          eb.platform.touchdevice && (eb.platform.ipad || eb.platform.iphone || eb.platform.android || eb.platform.rm) && (jQuery(d.J).on("touchmove", function(c) {
            if (!eb.platform.ios && 2 == c.originalEvent.touches.length && (d.F.pages.jScrollPane && d.F.pages.jScrollPane.data("jsp").disable(), 1 != d.ni)) {
              c.preventDefault && c.preventDefault();
              c.returnValue = !1;
              c = Math.sqrt((c.originalEvent.touches[0].pageX - c.originalEvent.touches[1].pageX) * (c.originalEvent.touches[0].pageX - c.originalEvent.touches[1].pageX) + (c.originalEvent.touches[0].pageY - c.originalEvent.touches[1].pageY) * (c.originalEvent.touches[0].pageY - c.originalEvent.touches[1].pageY));
              c *= 2;
              null == d.ba && (d.M(d.J).removeClass("flowpaper_pages_border"), d.gb = 1, d.Sf = c);
              null == d.ba && (d.gb = 1, d.de = 1 + (jQuery(d.pages[0].oa).width() - d.L.width()) / d.L.width());
              var e = c = (d.gb + (c - d.Sf) / jQuery(d.J).width() - d.gb) / d.gb;
              d.Mb() || (1 < e && (e = 1), -0.3 > e && (e = -0.3), 0 < c && (c *= 0.7));
              d.Uc = d.de + d.de * c;
              d.Uc < d.F.document.MinZoomSize && (d.Uc = d.F.document.MinZoomSize);
              d.Uc > d.F.document.MaxZoomSize && (d.Uc = d.F.document.MaxZoomSize);
              d.zc = 1 + (d.Uc - d.de);
              d.ba = d.pages[0].Fk(jQuery(d.pages[0].oa).width() * d.zc);
              d.ba < d.F.document.MinZoomSize && (d.ba = d.F.document.MinZoomSize);
              d.ba > d.F.document.MaxZoomSize && (d.ba = d.F.document.MaxZoomSize);
              jQuery(d.pages[0].oa).width() > jQuery(d.pages[0].oa).height() ? d.ba < d.F.fh() && (d.zc = d.wg, d.ba = d.F.fh()) : d.ba < d.F.Ve() && (d.zc = d.wg, d.ba = d.F.Ve());
              d.wg = d.zc;
              if (d.Mb() && 0 < d.zc) {
                for (jQuery(".flowpaper_annotation_" + d.P).hide(), c = 0; c < d.document.numPages; c++) {
                  d.Ua(c) && jQuery(d.pages[c].oa).transition({
                    transformOrigin: "50% 50%",
                    scale: d.zc
                  }, 0, "ease", function() {});
                }
              }
            }
          }), jQuery(d.J).on("touchstart", function() {}), jQuery(d.J).on("gesturechange", function(c) {
            if (1 != d.Tp && 1 != d.ni) {
              d.F.renderer.mb && jQuery(".flowpaper_flipview_canvas_highres").hide();
              null == d.ba && (d.gb = 1, d.de = 1 + (jQuery(d.pages[0].oa).width() - d.L.width()) / d.L.width());
              var e, g = e = (c.originalEvent.scale - d.gb) / d.gb;
              d.Mb() || (1 < g && (g = 1), -0.3 > g && (g = -0.3), 0 < e && (e *= 0.7));
              d.Uc = d.de + d.de * e;
              d.Uc < d.F.document.MinZoomSize && (d.Uc = d.F.document.MinZoomSize);
              d.Uc > d.F.document.MaxZoomSize && (d.Uc = d.F.document.MaxZoomSize);
              d.zc = 1 + (d.Uc - d.de);
              d.ba = d.pages[0].Fk(jQuery(d.pages[0].oa).width() * d.zc);
              jQuery(d.pages[0].oa).width() > jQuery(d.pages[0].oa).height() ? d.ba < d.F.fh() && (d.zc = d.wg, d.ba = d.F.fh()) : d.ba < d.F.Ve() && (d.zc = d.wg, d.ba = d.F.Ve());
              d.ba < d.F.document.MinZoomSize && (d.ba = d.F.document.MinZoomSize);
              d.ba > d.F.document.MaxZoomSize && (d.ba = d.F.document.MaxZoomSize);
              c.preventDefault && c.preventDefault();
              d.wg = d.zc;
              if (d.Mb() && 0 < d.zc) {
                for (jQuery(".flowpaper_annotation_" + d.P).hide(), c = 0; c < d.document.numPages; c++) {
                  d.Ua(c) && jQuery(d.pages[c].oa).transition({
                    transformOrigin: "50% 50%",
                    scale: d.zc
                  }, 0, "ease", function() {});
                }
              }!d.Mb() && (0.7 <= g || -0.3 >= g) && (d.Tp = !0, d.ba > d.F.scale && d.ba - d.F.scale < d.F.document.ZoomInterval && (d.ba += d.F.document.ZoomInterval), d.F.hb(d.ba), d.ba = null);
            }
          }), jQuery(d.J).on("gestureend", function() {}));
          d.F.renderer.sa && jQuery(d.F.renderer).bind("onTextDataUpdated", function(c, e) {
            for (var g = e + 12, h = e - 2; h < g; h++) {
              var f = d.getPage(h);
              if (f) {
                var p = jQuery(f.oa).get(0);
                if (p) {
                  var k = f.xa(),
                    v = f.Ga(),
                    x = 1.5 < d.F.renderer.Ya ? d.F.renderer.Ya : 1.5;
                  p.width != k * x && (jQuery(p).data("needs-overlay", 1), d.F.document.DisableOverflow && (x = 2), p.width = k * x, p.height = v * x, f.Ud(p).then(function(c) {
                    if (d.F.document.DisableOverflow) {
                      var e = jQuery(c).css("background-image");
                      0 < e.length && "none" != e ? (jQuery(c).css("background-image", "url('" + c.toDataURL() + "')," + e), e = jQuery(c).attr("id").substr(5, jQuery(c).attr("id").lastIndexOf("_") - 5), jQuery("#" + d.P).trigger("onPageLoaded", parseInt(e) + 1), aa(c)) : jQuery(c).css("background-image", "url('" + c.toDataURL() + "')");
                    }
                  }));
                }
              }
            }
          });
        }
        if ("TwoPage" == d.F.H || "BookView" == d.F.H) {
          g = d.L.height() - (eb.browser.msie ? 37 : 0), h = d.L.width() - (eb.browser.msie ? 0 : 20), e = 0, 1 == d.F.da && "BookView" == d.F.H && (e = h / 3, h -= e), eb.platform.touchdevice ? eb.browser.capabilities.yb ? (c.append("<div id='" + d.container + "' style='-moz-user-select:none;-webkit-user-select:none;margin-left:" + e + "px;position:relative;width:100%;' class='flowpaper_twopage_container'><div id='" + d.container + "_1' class='flowpaper_pages' style='position:absolute;top:0px;height:99%;margin-top:20px;'></div><div id='" + d.container + "_2' class='flowpaper_pages' style='position:absolute;top:0px;height:99%;margin-top:20px;'></div></div>"), jQuery(c).css("overflow-y", "scroll"), jQuery(c).css("overflow-x", "scroll"), jQuery(c).css("-webkit-overflow-scrolling", "touch")) : (c.append("<div id='" + d.container + "_jpane' style='-moz-user-select:none;-webkit-user-select:none;height:" + g + "px;width:100%;" + (window.eb.browser.msie || eb.platform.android ? "overflow-y: scroll;overflow-x: scroll;" : "overflow-y: auto;overflow-x: auto;") + ";-webkit-overflow-scrolling: touch;'><div id='" + d.container + "' style='margin-left:" + e + "px;position:relative;height:100%;width:100%' class='flowpaper_twopage_container'><div id='" + d.container + "_1' class='flowpaper_pages' style='position:absolute;top:0px;height:99%;margin-top:20px;'></div><div id='" + d.container + "_2' class='flowpaper_pages' style='position:absolute;top:0px;height:99%;margin-top:20px;'></div></div></div>"), jQuery(c).css("overflow-y", "visible"), jQuery(c).css("overflow-x", "visible"), jQuery(c).css("-webkit-overflow-scrolling", "visible")) : (c.append("<div id='" + d.container + "' style='-moz-user-select:none;-webkit-user-select:none;margin-left:" + e + "px;position:relative;' class='flowpaper_twopage_container'><div id='" + d.container + "_1' class='flowpaper_pages' style='position:absolute;top:0px;height:99%;margin-top:" + (eb.browser.msie ? 10 : 20) + "px;'></div><div id='" + d.container + "_2' class='flowpaper_pages " + ("BookView" == d.F.H && 2 > d.ze ? "flowpaper_hidden" : "") + "' style='position:absolute;top:0px;height:99%;margin-top:" + (eb.browser.msie ? 10 : 20) + "px;'></div></div>"), jQuery(c).css("overflow-y", "auto"), jQuery(c).css("overflow-x", "auto"), jQuery(c).css("-webkit-overflow-scrolling", "touch")), null == d.F.Dj && (d.F.Dj = d.L.height() - (eb.platform.touchdevice ? 0 : 27), d.F.Fg = d.M(d.J).width() / 2 - 2), d.M(d.J).css({
            height: "90%"
          }), d.M("#" + this.container + "_2").css("left", d.M("#" + d.container).width() / 2), eb.platform.touchdevice || (d.M(d.J + "_1").width(d.F.Fg), d.M(d.J + "_2").width(d.F.Fg));
        }
        "ThumbView" == d.F.H && (jQuery(c).css("overflow-y", "visible"), jQuery(c).css("overflow-x", "visible"), jQuery(c).css("-webkit-overflow-scrolling", "visible"), k = eb.browser.msie && 9 > eb.browser.version ? "position:relative;" : "", c.append("<div id='" + this.container + "' class='flowpaper_pages' style='" + k + ";" + (eb.platform.touchdevice ? "padding-left:10px;" : "") + (eb.browser.msie ? "overflow-y: scroll;overflow-x: hidden;" : "overflow-y: auto;overflow-x: hidden;-webkit-overflow-scrolling: touch;") + "'></div>"), jQuery(".flowpaper_pages").height(d.L.height() - 0));
        d.F.I && d.F.I.jb.ji(d, c);
        d.L.trigger("onPagesContainerCreated");
        jQuery(d).bind("onScaleChanged", d.Yi);
      },
      create: function(c) {
        var d = this;
        d.ji(c);
        eb.browser.capabilities.yb || "ThumbView" == d.F.H || (d.Yc = {}, "TwoPage" != d.F.H && "BookView" != d.F.H) || (d.jScrollPane = d.M(d.J + "_jpane").jScrollPane(d.Yc));
        for (c = 0; c < this.document.numPages; c++) {
          d.Ua(c) && this.addPage(c);
        }
        d.Xi();
        if (!eb.browser.capabilities.yb) {
          if ("Portrait" == d.F.H || "SinglePage" == d.F.H) {
            d.jScrollPane = d.M(this.J).jScrollPane(d.Yc);
          }!window.zine || d.F.I && d.F.I.W == d.F.H || jQuery(d.M(this.J)).bind("jsp-initialised", function() {
            jQuery(this).find(".jspHorizontalBar, .jspVerticalBar").hide();
          }).jScrollPane().hover(function() {
            jQuery(this).find(".jspHorizontalBar, .jspVerticalBar").stop().fadeTo("fast", 0.9);
          }, function() {
            jQuery(this).find(".jspHorizontalBar, .jspVerticalBar").stop().fadeTo("fast", 0);
          });
        }
        eb.browser.capabilities.yb || "ThumbView" != d.F.H || (d.jScrollPane = d.M(d.J).jScrollPane(d.Yc));
        1 < d.ze && "Portrait" == d.F.H && setTimeout(function() {
          d.scrollTo(d.ze, !0);
          d.ze = -1;
          jQuery(d.J).css("visibility", "visible");
        }, 500);
        d.ze && "SinglePage" == d.F.H && jQuery(d.J).css("visibility", "visible");
      },
      getPage: function(c) {
        if ("TwoPage" == this.F.H || "BookView" == this.F.H) {
          if (0 != c % 2) {
            return this.pages[1];
          }
          if (0 == c % 2) {
            return this.pages[0];
          }
        } else {
          return "SinglePage" == this.F.H ? this.pages[0] : this.pages[c];
        }
      },
      Ua: function(c) {
        return this.F.DisplayRange ? -1 < this.F.DisplayRange.indexOf(c + 1) : ("TwoPage" == this.F.H || "BookView" == this.F.H) && (0 == c || 1 == c) || "TwoPage" != this.F.H && "BookView" != this.F.H;
      },
      addPage: function(c) {
        this.pages[c] = new wa(this.P, c, this, this.L, this.F, this.gh(c));
        this.pages[c].create(this.M(this.J));
        jQuery(this.F.L).trigger("onPageCreated", c);
      },
      gh: function(c) {
        for (var d = 0; d < this.document.dimensions.length; d++) {
          if (this.document.dimensions[d].page == c) {
            return this.document.dimensions[d];
          }
        }
        return {
          width: -1,
          height: -1
        };
      },
      scrollTo: function(c, d) {
        if (this.R + 1 != c || d) {
          !eb.browser.capabilities.yb && this.jScrollPane ? this.jScrollPane.data("jsp").scrollToElement(this.pages[c - 1].M(this.pages[c - 1].va), !0, !1) : jQuery(this.J).scrollTo && jQuery(this.J).scrollTo(this.pages[c - 1].M(this.pages[c - 1].va), 0);
        }
        this.Ea();
      },
      fp: function() {
        for (var c = 0; c < this.getTotalPages(); c++) {
          this.Ua(c) && this.pages[c] && this.pages[c].kc && window.clearTimeout(this.pages[c].kc);
        }
      },
      Ok: function() {
        this.ed();
      },
      ed: function() {
        var c = this;
        null != c.Vd && (window.clearTimeout(c.Vd), c.Vd = null);
        c.Vd = setTimeout(function() {
          c.jc();
        }, 200);
      },
      wj: function() {
        if (null != this.jScrollPane) {
          try {
            this.jScrollPane.data("jsp").reinitialise(this.Yc);
          } catch (c) {}
        }
      },
      jc: function(c) {
        var d = this;
        if (d.F) {
          if (d.F.I && d.F.H == d.F.I.W) {
            d.F.I.jb.jc(d, c);
          } else {
            null != d.Vd && (window.clearTimeout(d.Vd), d.Vd = null);
            c = d.M(this.J).scrollTop();
            for (var e = 0; e < this.document.numPages; e++) {
              if (this.pages[e] && d.Ua(e)) {
                var g = !d.pages[e].Xa;
                this.pages[e].Hc(c, d.M(this.J).height(), !0) ? (g && d.L.trigger("onVisibilityChanged", e + 1), this.pages[e].Xa = !0, this.pages[e].load(function() {
                  if ("TwoPage" == d.F.H || "BookView" == d.F.H) {
                    d.M(d.J).is(":animated") || 1 == d.F.scale || (d.M(d.J).css("margin-left", d.Ff()), d.M("#" + this.container + "_2").css("left", d.M("#" + d.container).width() / 2)), d.initialized || null == d.jScrollPane || (d.jScrollPane.data("jsp").reinitialise(d.Yc), d.initialized = !0);
                  }
                }), this.pages[e].wo(), this.pages[e].Ea()) : "TwoPage" != d.F.H && "BookView" != d.F.H && this.pages[e].unload();
              }
            }
          }
        }
      },
      cd: function() {
        this.F.H != this.F.W() ? this.F.Gc(this.R + 1) : this.F.Gc(this.R);
      },
      Ea: function(c) {
        c = c ? c : this;
        for (var d = 0; d < c.document.numPages; d++) {
          c.Ua(d) && c.pages[d] && c.pages[d].Xa && c.pages[d].Ea();
        }
      },
      Hg: function() {
        for (var c = this.R, d = this.M(this.J).scrollTop(), e = 0; e < this.document.numPages; e++) {
          if (this.Ua(e) && "SinglePage" != this.F.H) {
            var g = !this.pages[e].Xa;
            if (this.pages[e].Hc(d, this.M(this.J).height(), !1)) {
              c = e;
              g && this.L.trigger("onVisibilityChanged", e + 1);
              break;
            }
          }
        }
        this.R != c && this.L.trigger("onCurrentPageChanged", c + 1);
        this.R = c;
      },
      setCurrentCursor: function(c) {
        for (var d = 0; d < this.document.numPages; d++) {
          this.Ua(d) && ("TextSelectorCursor" == c ? jQuery(this.pages[d].V).addClass("flowpaper_nograb") : jQuery(this.pages[d].V).removeClass("flowpaper_nograb"));
        }
      },
      gotoPage: function(c) {
        this.F.gotoPage(c);
      },
      sg: function(c, d) {
        c = parseInt(c);
        var e = this;
        e.F.renderer.Fc && e.F.renderer.Fc(e.pages[0]);
        jQuery(".flowpaper_pageword").remove();
        jQuery(".flowpaper_interactiveobject_" + e.P).remove();
        e.pages[0].unload();
        e.pages[0].visible = !0;
        var g = e.M(e.J).scrollTop();
        e.F.Gc(c);
        e.L.trigger("onCurrentPageChanged", c);
        e.pages[0].Hc(g, e.M(this.J).height(), !0) && (e.L.trigger("onVisibilityChanged", c + 1), e.pages[0].load(function() {
          null != d && d();
          e.ed();
          null != e.jScrollPane && e.jScrollPane.data("jsp").reinitialise(e.Yc);
        }));
      },
      tg: function(c, d) {
        c = parseInt(c);
        var e = this;
        0 == c % 2 && 0 < c && "BookView" == e.F.H && c != e.getTotalPages() && (c += 1);
        c == e.getTotalPages() && "TwoPage" == e.F.H && 0 == e.getTotalPages() % 2 && (c = e.getTotalPages() - 1);
        0 == c % 2 && "TwoPage" == e.F.H && --c;
        c > e.getTotalPages() && (c = e.getTotalPages());
        jQuery(".flowpaper_pageword").remove();
        jQuery(".flowpaper_interactiveobject_" + e.P).remove();
        if (c <= e.getTotalPages() && 0 < c) {
          e.F.Gc(c);
          e.R != c && e.L.trigger("onCurrentPageChanged", c);
          e.pages[0].unload();
          e.pages[0].load(function() {
            if ("TwoPage" == e.F.H || "BookView" == e.F.H) {
              e.M(e.J).animate({
                "margin-left": e.Ff()
              }, {
                duration: 250
              }), e.M("#" + this.container + "_2").css("left", e.M("#" + e.container).width() / 2), e.Pa(e.F.scale);
            }
          });
          1 < e.F.da ? (e.M(e.pages[1].V + "_2").removeClass("flowpaper_hidden"), e.M(e.J + "_2").removeClass("flowpaper_hidden")) : "BookView" == e.F.H && 1 == e.F.da && (e.M(e.pages[1].V + "_2").addClass("flowpaper_hidden"), e.M(e.J + "_2").addClass("flowpaper_hidden"));
          0 != e.getTotalPages() % 2 && "TwoPage" == e.F.H && c >= e.getTotalPages() && e.M(e.pages[1].V + "_2").addClass("flowpaper_hidden");
          0 == e.getTotalPages() % 2 && "BookView" == e.F.H && c >= e.getTotalPages() && e.M(e.pages[1].V + "_2").addClass("flowpaper_hidden");
          var g = e.M(this.J).scrollTop();
          e.pages[1].unload();
          e.pages[1].visible = !0;
          !e.M(e.pages[1].V + "_2").hasClass("flowpaper_hidden") && e.pages[1].Hc(g, e.M(this.J).height(), !0) && (e.L.trigger("onVisibilityChanged", c + 1), e.pages[1].load(function() {
            null != d && d();
            e.M(e.J).animate({
              "margin-left": e.Ff()
            }, {
              duration: 250
            });
            e.M("#" + this.container + "_2").css("left", e.M("#" + e.container).width() / 2);
            e.ed();
            null != e.jScrollPane && e.jScrollPane.data("jsp").reinitialise(e.Yc);
          }));
        }
      },
      rotate: function(c) {
        this.pages[c].rotate();
      },
      Ff: function(c) {
        this.L.width();
        var d = 0;
        1 != this.F.da || c || "BookView" != this.F.H ? (c = jQuery(this.J + "_2").width(), 0 == c && (c = this.M(this.J + "_1").width()), d = (this.L.width() - (this.M(this.J + "_1").width() + c)) / 2) : d = (this.L.width() / 2 - this.M(this.J + "_1").width() / 2) * (this.F.scale + 0.7);
        10 > d && (d = 0);
        return d;
      },
      previous: function() {
        var c = this;
        if ("Portrait" == c.F.H) {
          var d = c.M(c.J).scrollTop() - c.pages[0].height - 14;
          0 > d && (d = 1);
          eb.browser.capabilities.yb ? c.M(c.J).scrollTo(d, {
            axis: "y",
            duration: 500
          }) : c.jScrollPane.data("jsp").scrollToElement(this.pages[c.F.da - 2].M(this.pages[c.F.da - 2].va), !0, !0);
        }
        "SinglePage" == c.F.H && 0 < c.F.da - 1 && (eb.platform.touchdevice && 1 != this.F.scale ? (c.F.Xc = !0, c.M(c.J).removeClass("flowpaper_pages_border"), c.M(c.J).transition({
          x: 1000
        }, 350, function() {
          c.pages[0].unload();
          c.M(c.J).transition({
            x: -800
          }, 0);
          c.jScrollPane ? c.jScrollPane.data("jsp").scrollTo(0, 0, !1) : c.M(c.J).scrollTo(0, {
            axis: "y",
            duration: 0
          });
          c.sg(c.F.da - 1, function() {});
          c.M(c.J).transition({
            x: 0
          }, 350, function() {
            c.F.Xc = !1;
            window.annotations || c.M(c.J).addClass("flowpaper_pages_border");
          });
        })) : c.sg(c.F.da - 1));
        c.F.I && c.F.H == c.F.I.W && c.F.I.jb.previous(c);
        "TwoPage" != c.F.H && "BookView" != c.F.H || 1 > c.F.da - 2 || (eb.platform.touchdevice && 1 != this.F.scale ? (c.R = c.F.da - 2, c.F.Xc = !0, c.M(c.J).animate({
          "margin-left": 1000
        }, {
          duration: 350,
          complete: function() {
            jQuery(".flowpaper_interactiveobject_" + c.P).remove();
            1 == c.F.da - 2 && "BookView" == c.F.H && c.pages[1].M(c.pages[1].V + "_2").addClass("flowpaper_hidden");
            setTimeout(function() {
              c.M(c.J).css("margin-left", -800);
              c.pages[0].unload();
              c.pages[1].unload();
              c.M(c.J).animate({
                "margin-left": c.Ff()
              }, {
                duration: 350,
                complete: function() {
                  setTimeout(function() {
                    c.F.Xc = !1;
                    c.tg(c.F.da - 2);
                  }, 500);
                }
              });
            }, 500);
          }
        })) : c.tg(c.F.da - 2));
      },
      next: function() {
        var c = this;
        if ("Portrait" == c.F.H) {
          0 == c.F.da && (c.F.da = 1);
          var d = c.F.da - 1;
          100 < this.pages[c.F.da - 1].M(this.pages[c.F.da - 1].va).offset().top - c.L.offset().top ? d = c.F.da - 1 : d = c.F.da;
          eb.browser.capabilities.yb ? this.pages[d] && c.M(c.J).scrollTo(this.pages[d].M(this.pages[d].va), {
            axis: "y",
            duration: 500
          }) : c.jScrollPane.data("jsp").scrollToElement(this.pages[c.F.da].M(this.pages[c.F.da].va), !0, !0);
        }
        "SinglePage" == c.F.H && c.F.da < c.getTotalPages() && (eb.platform.touchdevice && 1 != c.F.scale ? (c.F.Xc = !0, c.M(c.J).removeClass("flowpaper_pages_border"), c.M(c.J).transition({
          x: -1000
        }, 350, "ease", function() {
          c.pages[0].unload();
          c.M(c.J).transition({
            x: 1200
          }, 0);
          c.jScrollPane ? c.jScrollPane.data("jsp").scrollTo(0, 0, !1) : c.M(c.J).scrollTo(0, {
            axis: "y",
            duration: 0
          });
          c.sg(c.F.da + 1, function() {});
          c.M(c.J).transition({
            x: 0
          }, 350, "ease", function() {
            window.annotations || c.M(c.J).addClass("flowpaper_pages_border");
            c.F.Xc = !1;
          });
        })) : c.sg(c.F.da + 1));
        c.F.I && c.F.H == c.F.I.W && c.F.I.jb.next(c);
        if ("TwoPage" == c.F.H || "BookView" == c.F.H) {
          if ("TwoPage" == c.F.H && c.F.da + 2 > c.getTotalPages()) {
            return !1;
          }
          eb.platform.touchdevice && 1 != this.F.scale ? (c.R = c.F.da + 2, c.F.Xc = !0, c.M(c.J).animate({
            "margin-left": -1000
          }, {
            duration: 350,
            complete: function() {
              jQuery(".flowpaper_interactiveobject_" + c.P).remove();
              c.F.da + 2 <= c.getTotalPages() && 0 < c.F.da + 2 && c.pages[1].M(c.pages[1].V + "_2").removeClass("flowpaper_hidden");
              setTimeout(function() {
                c.M(c.J).css("margin-left", 800);
                c.pages[0].unload();
                c.pages[1].unload();
                c.pages[0].Xa = !0;
                c.pages[1].Xa = !0;
                c.L.trigger("onVisibilityChanged", c.R);
                c.M(c.J).animate({
                  "margin-left": c.Ff(!0)
                }, {
                  duration: 350,
                  complete: function() {
                    setTimeout(function() {
                      c.F.Xc = !1;
                      c.tg(c.F.da + 2);
                    }, 500);
                  }
                });
              }, 500);
            }
          })) : c.tg(c.F.da + 2);
        }
      },
      $e: function(c) {
        this.F.I && this.F.H == this.F.I.W && this.F.I.jb.$e(this, c);
      }
    };
    return f;
  }(),
  wa = function() {
    function f(c, d, e, g, h, f) {
      this.L = g;
      this.F = h;
      this.pages = e;
      this.Ma = 1000;
      this.pa = this.Xa = !1;
      this.P = c;
      this.pageNumber = d;
      this.dimensions = f;
      this.selectors = {};
      this.ef = h.Sj;
      this.kg = h.Rm;
      this.aa = "dummyPage_" + this.pageNumber + "_" + this.P;
      this.page = "page_" + this.pageNumber + "_" + this.P;
      this.sd = "pageContainer_" + this.pageNumber + "_" + this.P;
      this.yg = this.sd + "_textLayer";
      this.Zg = "dummyPageCanvas_" + this.pageNumber + "_" + this.P;
      this.$g = "dummyPageCanvas2_" + this.pageNumber + "_" + this.P;
      this.gi = this.page + "_canvasOverlay";
      this.Xb = "pageLoader_" + this.pageNumber + "_" + this.P;
      this.ll = this.sd + "_textoverlay";
      this.H = this.F.H;
      this.W = this.F.I ? this.F.I.W : "";
      this.renderer = this.F.renderer;
      c = this.F.scale;
      this.scale = c;
      this.V = "#" + this.aa;
      this.oa = "#" + this.page;
      this.va = "#" + this.sd;
      this.xb = "#" + this.yg;
      this.oi = "#" + this.Zg;
      this.pi = "#" + this.$g;
      this.Yb = "#" + this.Xb;
      this.Zi = "#" + this.ll;
      this.ra = {
        bottom: 3,
        top: 2,
        right: 0,
        left: 1,
        Wa: 4,
        back: 5
      };
      this.Sa = [];
      this.duration = 1.3;
      this.No = 16777215;
      this.offset = this.force = 0;
    }
    f.prototype = {
      M: function(c) {
        if (0 < c.indexOf("undefined")) {
          return jQuery(null);
        }
        this.selectors || (this.selectors = {});
        this.selectors[c] || (this.selectors[c] = jQuery(c));
        return this.selectors[c];
      },
      show: function() {
        "TwoPage" != this.F.H && "BookView" != this.F.H && this.M(this.oa).removeClass("flowpaper_hidden");
      },
      Ie: function() {
        this.pages.jScrollPane && (!eb.browser.capabilities.yb && this.pages.jScrollPane ? "SinglePage" == this.F.H ? 0 > this.M(this.pages.J).width() - this.M(this.va).width() ? (this.pages.jScrollPane.data("jsp").scrollToPercentX(0.5, !1), this.pages.jScrollPane.data("jsp").scrollToPercentY(0.5, !1)) : (this.pages.jScrollPane.data("jsp").scrollToPercentX(0, !1), this.pages.jScrollPane.data("jsp").scrollToPercentY(0, !1)) : this.pages.jScrollPane.data("jsp").scrollToPercentX(0, !1) : this.M(this.va).parent().scrollTo && this.M(this.va).parent().scrollTo({
          left: "50%"
        }, 0, {
          axis: "x"
        }));
      },
      create: function(c) {
        var d = this;
        if ("Portrait" == d.F.H) {
          c.append("<div class='flowpaper_page " + (d.F.document.DisableOverflow ? "flowpaper_ppage" : "") + " " + (d.F.document.DisableOverflow && d.pageNumber < d.F.renderer.getNumPages() - 1 ? "ppage_break" : "ppage_none") + "' id='" + d.sd + "' style='position:relative;" + (d.F.document.DisableOverflow ? "margin:0;padding:0;overflow:hidden;" : "") + "'><div id='" + d.aa + "' class='' style='z-index:11;" + d.getDimensions() + ";'></div></div>");
          if (0 < jQuery(d.F.Ij).length) {
            var e = this.Ma * this.scale;
            jQuery(d.F.Ij).append("<div id='" + d.ll + "' class='flowpaper_page' style='position:relative;height:" + e + "px;width:100%;overflow:hidden;'></div>");
          }
          d.Uk();
        }
        "SinglePage" == d.F.H && 0 == d.pageNumber && c.append("<div class='flowpaper_page' id='" + d.sd + "' class='flowpaper_rescale' style='position:relative;'><div id='" + d.aa + "' class='' style='position:absolute;z-index:11;" + d.getDimensions() + "'></div></div>");
        if ("TwoPage" == d.F.H || "BookView" == d.F.H) {
          0 == d.pageNumber && jQuery(c.children().get(0)).append("<div class='flowpaper_page' id='" + d.sd + "_1' style='z-index:2;float:right;position:relative;'><div id='" + d.aa + "_1' class='flowpaper_hidden flowpaper_border' style='" + d.getDimensions() + ";float:right;'></div></div>"), 1 == d.pageNumber && jQuery(c.children().get(1)).append("<div class='flowpaper_page' id='" + d.sd + "_2' style='position:relative;z-index:1;float:left;'><div id='" + d.aa + "_2' class='flowpaper_hidden flowpaper_border' style='" + d.getDimensions() + ";float:left'></div></div>");
        }
        "ThumbView" == d.F.H && (c.append("<div class='flowpaper_page' id='" + d.sd + "' style='position:relative;" + (eb.browser.msie ? "clear:none;float:left;" : "display:inline-block;") + "'><div id=\"" + d.aa + '" class="flowpaper_page flowpaper_thumb flowpaper_border flowpaper_load_on_demand" style="margin-left:10px;' + d.getDimensions() + '"></div></div>'), jQuery(d.va).on("mousedown touchstart", function() {
          d.F.gotoPage(d.pageNumber + 1);
        }));
        d.F.H == d.W ? d.F.I.Ac.create(d, c) : (d.F.renderer.Kd(d), d.show(), d.height = d.M(d.va).height(), d.Pl());
      },
      Uk: function() {
        var c = this;
        if (c.F.Wb) {
          jQuery(c.va).on("mouseover, mousemove", function() {
            "Portrait" == c.F.H ? pa("pageContainer_" + c.pageNumber + "_documentViewer_textLayer", c.pageNumber + 1) : pa("turn-page-wrapper-" + (c.pageNumber + 1), c.pageNumber + 1);
          });
        }
      },
      Un: function() {
        if ("Portrait" == this.F.H || "SinglePage" == this.F.H) {
          return this.gi;
        }
        if ("TwoPage" == this.F.H || "BookView" == this.F.H) {
          if (0 == this.pageNumber) {
            return this.gi + "_1";
          }
          if (1 == this.pageNumber) {
            return this.gi + "_2";
          }
        }
      },
      ij: function(c) {
        this.M(this.Zi).css({
          top: c
        });
      },
      Jb: function() {
        "Portrait" != this.F.H && "SinglePage" != this.F.H && this.F.H != this.W || jQuery("#" + this.Xb).remove();
        if ("TwoPage" == this.F.H || "BookView" == this.F.H) {
          0 == this.pageNumber && this.M(this.Yb + "_1").hide(), 1 == this.pageNumber && this.M(this.Yb + "_2").hide();
        }
      },
      Qc: function() {
        if (!this.F.document.DisableOverflow) {
          if ("Portrait" == this.F.H || "SinglePage" == this.F.H || this.F.H == this.W) {
            this.Ma = 1000;
            if (0 < this.M(this.Yb).length) {
              return;
            }
            var c = 0 < jQuery(this.va).length ? jQuery(this.va) : this.Mc;
            c && c.find && 0 != c.length ? 0 == c.find("#" + this.Xb).length && c.append("<img id='" + this.Xb + "' src='" + this.ef + "' class='flowpaper_pageLoader'  style='position:absolute;left:50%;top:50%;height:8px;margin-left:" + (this.Vb() - 10) + "px;' />") : M("can't show loader, missing container for page " + this.pageNumber);
          }
          if ("TwoPage" == this.F.H || "BookView" == this.F.H) {
            if (0 == this.pageNumber) {
              if (0 < this.M(this.Yb + "_1").length) {
                this.M(this.Yb + "_1").show();
                return;
              }
              this.M(this.V + "_1").append("<img id='" + this.Xb + "_1' src='" + this.ef + "' style='position:absolute;left:" + (this.xa() - 30) + "px;top:" + this.Ga() / 2 + "px;' />");
              this.M(this.Yb + "_1").show();
            }
            1 == this.pageNumber && (0 < this.M(this.Yb + "_2").length || this.M(this.V + "_2").append("<img id='" + this.Xb + "_2' src='" + this.ef + "' style='position:absolute;left:" + (this.xa() / 2 - 10) + "px;top:" + this.Ga() / 2 + "px;' />"), this.M(this.Yb + "_2").show());
          }
        }
      },
      Pa: function() {
        var c, d;
        d = this.xa();
        c = this.Ga();
        var e = this.Vb();
        this.F.document.DisableOverflow && (c = Math.floor(c), d = Math.floor(d));
        if ("Portrait" == this.F.H || "SinglePage" == this.F.H) {
          this.M(this.va).css({
            height: c,
            width: d,
            "margin-left": e,
            "margin-top": 0
          }), this.M(this.V).css({
            height: c,
            width: d,
            "margin-left": e
          }), this.M(this.oa).css({
            height: c,
            width: d,
            "margin-left": e
          }), this.M(this.oi).css({
            height: c,
            width: d
          }), this.M(this.pi).css({
            height: c,
            width: d
          }), this.M(this.Zi).css({
            height: c,
            width: d
          }), this.M(this.Yb).css({
            "margin-left": e
          }), jQuery(this.xb).css({
            height: c,
            width: d,
            "margin-left": e
          }), this.F.renderer.mb && (jQuery(".flowpaper_flipview_canvas_highres").css({
            width: 0.25 * d,
            height: 0.25 * c
          }).show(), this.scale < this.rg() ? this.F.renderer.Fc(this) : this.F.renderer.Nc(this)), this.Nf(this.scale, e);
        }
        if ("TwoPage" == this.F.H || "BookView" == this.F.H) {
          this.M(this.V + "_1").css({
            height: c,
            width: d
          }), this.M(this.V + "_2").css({
            height: c,
            width: d
          }), this.M(this.V + "_1_textoverlay").css({
            height: c,
            width: d
          }), this.M(this.V + "_2_textoverlay").css({
            height: c,
            width: d
          }), this.M(this.oa).css({
            height: c,
            width: d
          }), eb.browser.capabilities.yb || (0 == this.pages.R ? this.pages.M(this.pages.J).css({
            height: c,
            width: d
          }) : this.pages.M(this.pages.J).css({
            height: c,
            width: 2 * d
          }), "TwoPage" == this.F.H && this.pages.M(this.pages.J).css({
            width: "100%"
          })), eb.platform.touchdevice && 1 <= this.scale && this.pages.M(this.pages.J).css({
            width: 2 * d
          }), eb.platform.touchdevice && ("TwoPage" == this.F.H && this.pages.M(this.pages.J + "_2").css("left", this.pages.M(this.pages.J + "_1").width() + e + 2), "BookView" == this.F.H && this.pages.M(this.pages.J + "_2").css("left", this.pages.M(this.pages.J + "_1").width() + e + 2));
        }
        if (this.F.H == this.W) {
          var g = this.ng() * this.Ma,
            h = this.xa() / g;
          null != this.dimensions.nb && this.sb && this.F.renderer.wa && (h = this.pages.jd / 2 / g);
          this.F.H == this.W ? 1 == this.scale && this.Nf(h, e) : this.Nf(h, e);
        }
        this.height = c;
        this.width = d;
      },
      rg: function() {
        return 1;
      },
      Mb: function() {
        return "SinglePage" == this.F.H;
      },
      resize: function() {},
      ng: function() {
        return this.dimensions.na / this.dimensions.za;
      },
      ld: function() {
        return this.F.H == this.W ? this.F.I.Ac.ld(this) : this.dimensions.na / this.dimensions.za * this.scale * this.Ma;
      },
      Df: function() {
        return this.F.H == this.W ? this.F.I.Ac.Df(this) : this.Ma * this.scale;
      },
      getDimensions: function() {
        var c = this.le(),
          d = this.F.ld();
        if (this.F.document.DisableOverflow) {
          var e = this.Ma * this.scale;
          return "height:" + e + "px;width:" + e * c + "px";
        }
        if ("Portrait" == this.F.H || "SinglePage" == this.F.H) {
          return e = this.Ma * this.scale, "height:" + e + "px;width:" + e * c + "px;margin-left:" + (d - e * c) / 2 + "px;";
        }
        if (this.F.H == this.W) {
          return this.F.I.Ac.getDimensions(this, c);
        }
        if ("TwoPage" == this.F.H || "BookView" == this.F.H) {
          return e = this.L.width() / 2 * this.scale, (0 == this.pageNumber ? "margin-left:0px;" : "") + "height:" + e + "px;width:" + e * c + "px";
        }
        if ("ThumbView" == this.F.H) {
          return e = this.Ma * ((this.L.height() - 100) / this.Ma) / 2.7, "height:" + e + "px;width:" + e * c + "px";
        }
      },
      le: function() {
        return this.dimensions.na / this.dimensions.za;
      },
      xa: function(c) {
        return this.F.H == this.W ? this.F.I.Ac.xa(this) : this.Ma * this.le() * (c ? c : this.scale);
      },
      Ei: function() {
        return this.F.H == this.W ? this.F.I.Ac.Ei(this) : this.Ma * this.le() * this.scale;
      },
      Fk: function(c) {
        return c / (this.Ma * this.le());
      },
      Gi: function() {
        return this.F.H == this.W ? this.F.I.Ac.Gi(this) : this.Ma * this.le();
      },
      Ga: function() {
        return this.F.H == this.W ? this.F.I.Ac.Ga(this) : this.Ma * this.scale;
      },
      Di: function() {
        return this.F.H == this.W ? this.F.I.Ac.Di(this) : this.Ma * this.scale;
      },
      Vb: function() {
        var c = this.F.ld(),
          d = 0;
        if (this.F.document.DisableOverflow) {
          return 0;
        }
        if ("Portrait" == this.F.H || "SinglePage" == this.F.H) {
          return this.pages.ug && this.pages.ug > c && (c = this.pages.ug), d = (c - this.xa()) / 2 / 2 - 4, 0 < d ? d : 0;
        }
        if ("TwoPage" == this.F.H || "BookView" == this.F.H) {
          return 0;
        }
        if (this.F.H == this.W) {
          return this.F.I.Ac.Vb(this);
        }
      },
      Hc: function(c, d, e) {
        var g = !1;
        if ("Portrait" == this.F.H || "ThumbView" == this.F.H) {
          if (this.offset = this.M(this.va).offset()) {
            this.pages.Hj || (this.pages.Hj = this.F.N.offset().top);
            var g = this.offset.top - this.pages.Hj + c,
              h = this.offset.top + this.height;
            d = c + d;
            g = e || eb.platform.touchdevice && !eb.browser.capabilities.yb ? this.Xa = c - this.height <= g && d >= g || g - this.height <= c && h >= d : c <= g && d >= g || g <= c && h >= d;
          } else {
            g = !1;
          }
        }
        "SinglePage" == this.F.H && (g = this.Xa = 0 == this.pageNumber);
        this.F.H == this.W && (g = this.Xa = this.F.I.Ac.Hc(this));
        if ("BookView" == this.F.H) {
          if (0 == this.pages.getTotalPages() % 2 && this.pages.R >= this.pages.getTotalPages() && 1 == this.pageNumber) {
            return !1;
          }
          g = this.Xa = 0 == this.pageNumber || 0 != this.pages.R && 1 == this.pageNumber;
        }
        if ("TwoPage" == this.F.H) {
          if (0 != this.pages.getTotalPages() % 2 && this.pages.R >= this.pages.getTotalPages() && 1 == this.pageNumber) {
            return !1;
          }
          g = this.Xa = 0 == this.pageNumber || 1 == this.pageNumber;
        }
        return g;
      },
      wo: function() {
        this.pa || this.load();
      },
      load: function(c) {
        this.Ea(c);
        if (!this.pa) {
          "TwoPage" == this.F.H && (c = this.F.renderer.getDimensions(this.pageNumber - 1, this.pageNumber - 1)[this.pages.R + this.pageNumber], c.width != this.dimensions.width || c.height != this.dimensions.height) && (this.dimensions = c, this.Pa());
          "BookView" == this.F.H && (c = this.F.renderer.getDimensions(this.pageNumber - 1, this.pageNumber - 1)[this.pages.R - (0 < this.pages.R ? 1 : 0) + this.pageNumber], c.width != this.dimensions.width || c.height != this.dimensions.height) && (this.dimensions = c, this.Pa());
          if ("SinglePage" == this.F.H) {
            c = this.F.renderer.getDimensions(this.pageNumber - 1, this.pageNumber - 1)[this.pages.R];
            if (c.width != this.dimensions.width || c.height != this.dimensions.height) {
              this.dimensions = c, this.Pa(), jQuery(".flowpaper_pageword_" + this.P).remove(), this.Ea();
            }
            this.dimensions.loaded = !1;
          }
          "Portrait" == this.F.H && (c = this.F.renderer.getDimensions(this.pageNumber - 1, this.pageNumber - 1)[this.pageNumber], c.width != this.dimensions.width || c.height != this.dimensions.height) && (this.dimensions = c, this.Pa(), jQuery(".flowpaper_pageword_" + this.P).remove(), this.Ea());
          this.F.renderer.$b(this, !1);
          "function" === typeof this.Hi && this.loadOverlay();
        }
      },
      unload: function() {
        if (this.pa || "TwoPage" == this.F.H || "BookView" == this.F.H || this.F.H == this.W) {
          delete this.selectors, this.selectors = {}, jQuery(this.U).unbind(), delete this.U, this.U = null, this.pa = !1, this.F.renderer.unload(this), jQuery(this.Yb).remove(), this.Mj && (delete this.Mj, this.Mj = null), this.F.H == this.W && this.F.I.Ac.unload(this), "TwoPage" != this.F.H && "BookView" != this.F.H && this.M("#" + this.Un()).remove(), "function" === typeof this.Hi && this.rs();
        }
      },
      Ea: function(c) {
        "ThumbView" == this.F.H || !this.Xa && null == c || this.pages.animating || this.F.renderer.Ea(this, !1, c);
      },
      Cc: function(c, d, e) {
        this.F.renderer.Cc(this, c, d, e);
      },
      Fe: function(c, d, e) {
        this.F.renderer.Fe(this, c, d, e);
      },
      Pl: function() {
        if ("Portrait" == this.F.H || "SinglePage" == this.F.H) {
          eb.browser.msie && 9 > eb.browser.version || eb.platform.ios || (new ba(this.F, "CanvasPageRenderer" == this.renderer.Gf() ? this.V : this.oa, this.M(this.va).parent())).scroll();
        }
      },
      Nf: function(c, d) {
        var e = this;
        if (e.F.Z[e.pageNumber]) {
          for (var g = 0; g < e.F.Z[e.pageNumber].length; g++) {
            if ("link" == e.F.Z[e.pageNumber][g].type) {
              var h = e.F.Z[e.pageNumber][g].so * c,
                f = e.F.Z[e.pageNumber][g].uo * c,
                k = e.F.Z[e.pageNumber][g].width * c,
                l = e.F.Z[e.pageNumber][g].height * c,
                n = e.F.Z[e.pageNumber][g].yp,
                q = e.F.Z[e.pageNumber][g].zp,
                t = e.F.Z[e.pageNumber][g].Go;
              if (0 == jQuery("#flowpaper_mark_link_" + e.pageNumber + "_" + g).length) {
                var r = jQuery(String.format("<div id='flowpaper_mark_link_{4}_{5}' class='flowpaper_mark_link flowpaper_mark' style='left:{0}px;top:{1}px;width:{2}px;height:{3}px;box-shadow: 0px 0px 0px 0px;'></div>", h, f, k, l, e.pageNumber, g)),
                  m = e.va;
                0 == jQuery(m).length && (m = e.Mc);
                if (n) {
                  n = "flowpaper-linkicon-url";
                  e.F.Z[e.pageNumber][g].href && -1 < e.F.Z[e.pageNumber][g].href.indexOf("mailto:") && (n = "flowpaper-linkicon-email");
                  e.F.Z[e.pageNumber][g].href && -1 < e.F.Z[e.pageNumber][g].href.indexOf("tel:") && (n = "flowpaper-linkicon-phone");
                  e.F.Z[e.pageNumber][g].href && -1 < e.F.Z[e.pageNumber][g].href.indexOf("actionGoTo:") && (n = "flowpaper-linkicon-bookmark");
                  var u = jQuery(String.format("<div id='flowpaper_mark_link_{4}_{5}_icon' class='flowpaper_mark flowpaper-linkicon flowpaper-linkicon-roundbg' style='left:{0}px;top:{1}px;width:{2}px;height:{3}px;pointer-events:none;'></div>'", h, f, k, l, e.pageNumber, g));
                  jQuery(m).append(u);
                  h = jQuery(String.format("<div id='flowpaper_mark_link_{4}_{5}_icon' class='flowpaper_mark flowpaper-linkicon {6}' style='left:{0}px;top:{1}px;width:{2}px;height:{3}px;pointer-events:none;'></div>'", h, f, k, l, e.pageNumber, g, n));
                  jQuery(m).append(h);
                }
                m = jQuery(m).append(r).find("#flowpaper_mark_link_" + e.pageNumber + "_" + g);
                q && (m.data("mouseOverText", t), m.bind("mouseover", function(c) {
                  for (var d = document.querySelectorAll(".popover"), g = 0; g < d.length; g++) {
                    d[g].remove();
                  }!jQuery(this).data("mouseOverText") || jQuery(this).data("mouseOverText") && 0 == jQuery(this).data("mouseOverText").length || (c = new Popover({
                    position: "top",
                    button: c.target
                  }), c.setContent('<span style="font-family:Arial;font-size:0.8em;">' + jQuery(this).data("mouseOverText") + "</span>"), c.render("open", e.F.N.get(0)));
                }), m.bind("mouseout", function() {
                  for (var c = document.querySelectorAll(".popover"), d = 0; d < c.length; d++) {
                    c[d].remove();
                  }
                }));
                m.data("link", e.F.Z[e.pageNumber][g].href);
                m.bind("mouseup touchend", function(c) {
                  if (e.pages.Ce || e.pages.animating) {
                    return !1;
                  }
                  if (0 == jQuery(this).data("link").indexOf("actionGoTo:")) {
                    e.F.gotoPage(jQuery(this).data("link").substr(11));
                  } else {
                    if (0 == jQuery(this).data("link").indexOf("javascript")) {
                      var d = unescape(jQuery(this).data("link"));
                      eval(d.substring(11));
                    } else {
                      jQuery(e.L).trigger("onExternalLinkClicked", jQuery(this).data("link"));
                    }
                  }
                  c.preventDefault();
                  c.stopImmediatePropagation();
                  return !1;
                });
                eb.platform.touchonlydevice || (jQuery(m).on("mouseover", function() {
                  jQuery(this).stop(!0, !0);
                  jQuery(this).css("background", e.F.linkColor);
                  jQuery(this).css({
                    opacity: e.F.Ic
                  });
                }), jQuery(m).on("mouseout", function() {
                  jQuery(this).css("background", "");
                  jQuery(this).css({
                    opacity: 0
                  });
                }));
              } else {
                r = jQuery("#flowpaper_mark_link_" + e.pageNumber + "_" + g), r.css({
                  left: h + "px",
                  top: f + "px",
                  width: k + "px",
                  height: l + "px",
                  "margin-left": d + "px"
                });
              }
            }
            "video" == e.F.Z[e.pageNumber][g].type && (t = e.F.Z[e.pageNumber][g].Fj * c, r = e.F.Z[e.pageNumber][g].Gj * c, m = e.F.Z[e.pageNumber][g].width * c, q = e.F.Z[e.pageNumber][g].height * c, h = e.F.Z[e.pageNumber][g].src, f = e.F.Z[e.pageNumber][g].autoplay, 0 == jQuery("#flowpaper_mark_video_" + e.pageNumber + "_" + g).length ? (h = jQuery(String.format("<div id='flowpaper_mark_video_{4}_{5}' data-autoplay='{8}' class='flowpaper_mark_video flowpaper_mark_video_{4} flowpaper_mark' style='left:{0}px;top:{1}px;width:{2}px;height:{3}px;margin-left:{7}px'><img src='{6}' style='width:{2}px;height:{3}px;' class='flowpaper_mark'/></div>", t, r, m, q, e.pageNumber, g, h, d, f)), m = e.va, 0 == jQuery(m).length && (m = e.Mc), m = jQuery(m).append(h).find("#flowpaper_mark_video_" + e.pageNumber + "_" + g), m.data("video", e.F.Z[e.pageNumber][g].url), m.data("maximizevideo", e.F.Z[e.pageNumber][g].Eo), m.bind("mouseup touchend", function(c) {
              jQuery(e.L).trigger("onVideoStarted", {
                VideoUrl: jQuery(this).data("video"),
                PageNumber: e.pageNumber + 1
              });
              if (e.pages.Ce || e.pages.animating) {
                return !1;
              }
              var d = jQuery(this).data("video"),
                g = "true" == jQuery(this).data("maximizevideo");
              if (d && 0 <= d.toLowerCase().indexOf("youtube")) {
                for (var h = d.substr(d.indexOf("?") + 1).split("&"), f = "", p = 0; p < h.length; p++) {
                  0 == h[p].indexOf("v=") && (f = h[p].substr(2));
                }
                if (g) {
                  e.F.vc = jQuery(String.format('<div class="flowpaper_mark_video_maximized flowpaper_mark" style="position:absolute;z-index:99999;left:2.5%;top:2.5%;width:95%;height:95%"></div>'));
                  e.F.N.append(e.F.vc);
                  jQuery(e.F.vc).html(String.format("<iframe class='flowpaper_videoframe' width='{0}' height='{1}' src='{3}://www.youtube.com/embed/{2}?rel=0&autoplay=1&enablejsapi=1' frameborder='0' allowfullscreen ></iframe>", 0.95 * e.F.N.width(), 0.95 * e.F.N.height(), f, -1 < location.href.indexOf("https:") ? "https" : "http"));
                  var k = jQuery(String.format('<img class="flowpaper_mark_video_maximized_closebutton" src="{0}" style="position:absolute;right:3px;top:1%;z-index:999999;cursor:pointer;">', e.kg));
                  e.F.N.append(k);
                  jQuery(k).bind("mousedown touchstart", function() {
                    jQuery(".flowpaper_mark_video_maximized").remove();
                    jQuery(".flowpaper_mark_video_maximized_closebutton").remove();
                  });
                } else {
                  jQuery(this).html(String.format("<iframe class='flowpaper_videoframe' width='{0}' height='{1}' src='{3}://www.youtube.com/embed/{2}?rel=0&autoplay=1&enablejsapi=1' frameborder='0' allowfullscreen ></iframe>", jQuery(this).width(), jQuery(this).height(), f, -1 < location.href.indexOf("https:") ? "https" : "http"));
                }
              }
              d && 0 <= d.toLowerCase().indexOf("vimeo") && (f = d.substr(d.lastIndexOf("/") + 1), g ? (e.F.vc = jQuery(String.format('<div class="flowpaper_mark_video_maximized flowpaper_mark" style="position:absolute;z-index:99999;left:2.5%;top:2.5%;width:95%;height:95%"></div>')), e.F.N.append(e.F.vc), jQuery(e.F.vc).html(String.format("<iframe class='flowpaper_videoframe' src='//player.vimeo.com/video/{2}?autoplay=1' width='{0}' height='{1}' frameborder='0' webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>", 0.95 * e.F.N.width(), 0.95 * e.F.N.height(), f)), k = jQuery(String.format('<img class="flowpaper_mark_video_maximized_closebutton" src="{0}" style="position:absolute;right:3px;top:1%;z-index:999999;cursor:pointer;">', e.kg)), e.F.N.append(k), jQuery(k).bind("mousedown touchstart", function() {
                jQuery(".flowpaper_mark_video_maximized").remove();
                jQuery(".flowpaper_mark_video_maximized_closebutton").remove();
              })) : jQuery(this).html(String.format("<iframe class='flowpaper_videoframe' src='//player.vimeo.com/video/{2}?autoplay=1' width='{0}' height='{1}' frameborder='0' webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>", jQuery(this).width(), jQuery(this).height(), f)));
              d && 0 <= d.toLowerCase().indexOf("wistia") && (f = d.substr(d.lastIndexOf("/") + 1), g ? (e.F.vc = jQuery(String.format('<div class="flowpaper_mark_video_maximized flowpaper_mark" style="position:absolute;z-index:99999;left:2.5%;top:2.5%;width:95%;height:95%"></div>')), e.F.N.append(e.F.vc), jQuery(e.F.vc).html(String.format("<iframe class='flowpaper_videoframe' src='//fast.wistia.net/embed/iframe/{2}?autoplay=true' width='{0}' height='{1}' frameborder='0' webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>", 0.95 * e.F.N.width(), 0.95 * e.F.N.height(), f)), k = jQuery(String.format('<img class="flowpaper_mark_video_maximized_closebutton" src="{0}" style="position:absolute;right:3px;top:1%;z-index:999999;cursor:pointer;">', e.kg)), e.F.N.append(k), jQuery(k).bind("mousedown touchstart", function() {
                jQuery(".flowpaper_mark_video_maximized").remove();
                jQuery(".flowpaper_mark_video_maximized_closebutton").remove();
              })) : jQuery(this).html(String.format("<iframe class='flowpaper_videoframe' src='//fast.wistia.net/embed/iframe/{2}?autoplay=true' width='{0}' height='{1}' frameborder='0' webkitallowfullscreen mozallowfullscreen allowfullscreen></iframe>", jQuery(this).width(), jQuery(this).height(), f)));
              if (d && -1 < d.indexOf("{")) {
                try {
                  var l = JSON.parse(d),
                    m = "vimeoframe_" + FLOWPAPER.Sn();
                  if (g) {
                    jQuery(this).html(""), e.F.vc = jQuery(String.format('<div class="flowpaper_mark_video_maximized flowpaper_mark" style="position:absolute;z-index:99999;left:2.5%;top:2.5%;width:95%;height:95%"></div>')), e.F.N.append(e.F.vc), jQuery(e.F.vc).html(jQuery(String.format('<video id="{2}" style="width:{3}px;height:{4}px;" class="videoframe flowpaper_mark video-js vjs-default-skin" controls autoplay preload="auto" width="{3}" height="{4}" data-setup=\'{"example_option":true}\'><source src="{0}" type="video/mp4" /><source src="{1}" type="video/webm" /></video>', l.mp4, l.webm, m, 0.95 * e.F.N.width(), 0.95 * e.F.N.height()))), k = jQuery(String.format('<img class="flowpaper_mark_video_maximized_closebutton" src="{0}" style="position:absolute;right:3px;top:1%;z-index:999999;cursor:pointer;">', e.kg)), e.F.N.append(k), jQuery(k).bind("mousedown touchstart", function() {
                      jQuery(".flowpaper_mark_video_maximized").remove();
                      jQuery(".flowpaper_mark_video_maximized_closebutton").remove();
                    });
                  } else {
                    if (0 == jQuery(this).find("video").length) {
                      jQuery(this).html(jQuery(String.format('<video id="{2}" style="width:{3}px;height:{4}px;" class="videoframe flowpaper_mark video-js vjs-default-skin" controls autoplay preload="auto" width="{3}" height="{4}" data-setup=\'{"example_option":true}\'><source src="{0}" type="video/mp4" /><source src="{1}" type="video/webm" /></video>', l.mp4, l.webm, m, jQuery(this).width(), jQuery(this).height())));
                    } else {
                      return !0;
                    }
                  }
                } catch (t) {}
              }
              c.preventDefault();
              c.stopImmediatePropagation();
              return !1;
            })) : (h = jQuery("#flowpaper_mark_video_" + e.pageNumber + "_" + g), h.css({
              left: t + "px",
              top: r + "px",
              width: m + "px",
              height: q + "px",
              "margin-left": d + "px"
            }).find(".flowpaper_mark").css({
              width: m + "px",
              height: q + "px"
            }), r = h.find("iframe"), 0 < r.length && (r.attr("width", m), r.attr("height", q))));
            "image" == e.F.Z[e.pageNumber][g].type && (m = e.F.Z[e.pageNumber][g].jh * c, f = e.F.Z[e.pageNumber][g].kh * c, k = e.F.Z[e.pageNumber][g].width * c, l = e.F.Z[e.pageNumber][g].height * c, q = e.F.Z[e.pageNumber][g].src, t = e.F.Z[e.pageNumber][g].href, r = e.F.Z[e.pageNumber][g].io, 0 == jQuery("#flowpaper_mark_image_" + e.pageNumber + "_" + g).length ? (h = jQuery(String.format("<div id='flowpaper_mark_image_{4}_{5}' class='flowpaper_mark_image flowpaper_mark' style='left:{0}px;top:{1}px;width:{2}px;height:{3}px;'><img src='{6}' style='width:{2}px;height:{3}px;' class='flowpaper_mark'/></div>", m, f, k, l, e.pageNumber, g, q)), m = e.va, 0 == jQuery(m).length && (m = e.Mc), m = jQuery(m).append(h).find("#flowpaper_mark_image_" + e.pageNumber + "_" + g), m.data("image", e.F.Z[e.pageNumber][g].url), null != t && 0 < t.length ? (m.data("link", t), m.bind("mouseup touchend", function(c) {
              if (e.pages.Ce || e.pages.animating) {
                return !1;
              }
              0 == jQuery(this).data("link").indexOf("actionGoTo:") ? e.F.gotoPage(jQuery(this).data("link").substr(11)) : jQuery(e.L).trigger("onExternalLinkClicked", jQuery(this).data("link"));
              c.preventDefault();
              c.stopImmediatePropagation();
              return !1;
            })) : e.F.Wb || h.css({
              "pointer-events": "none"
            }), null != r && 0 < r.length && (m.data("hoversrc", r), m.data("imagesrc", q), m.bind("mouseover", function() {
              jQuery(this).find(".flowpaper_mark").attr("src", jQuery(this).data("hoversrc"));
            }), m.bind("mouseout", function() {
              jQuery(this).find(".flowpaper_mark").attr("src", jQuery(this).data("imagesrc"));
            }), e.F.Wb || h.css({
              "pointer-events": "auto"
            }))) : (h = jQuery("#flowpaper_mark_image_" + e.pageNumber + "_" + g), h.css({
              left: m + "px",
              top: f + "px",
              width: k + "px",
              height: l + "px",
              "margin-left": d + "px"
            }).find(".flowpaper_mark").css({
              width: k + "px",
              height: l + "px"
            })));
            "iframe" == e.F.Z[e.pageNumber][g].type && (r = e.F.Z[e.pageNumber][g].Ai * c, h = e.F.Z[e.pageNumber][g].Bi * c, m = e.F.Z[e.pageNumber][g].width * c, t = e.F.Z[e.pageNumber][g].height * c, f = e.F.Z[e.pageNumber][g].src, 0 == jQuery("#flowpaper_mark_frame_" + e.pageNumber + "_" + g).length ? (q = m - 10, 50 < q && (q = 50), 50 > m && (q = m - 10), 50 > t && (q = t - 10), f = jQuery(String.format("<div id='flowpaper_mark_frame_{4}_{5}' class='flowpaper_mark_frame flowpaper_mark' style='left:{0}px;top:{1}px;width:{2}px;height:{3}px;margin-left:{7}px'><img src='{6}' style='width:{2}px;height:{3}px;' class='flowpaper_mark'/><div id='flowpaper_mark_frame_{4}_{5}_play' style='position:absolute;top:{9}px;left:{8}px;'></div></div>", r, h, m, t, e.pageNumber, g, f, d, m / 2 - q / 3, t / 2 - q)), m = e.va, 0 == jQuery(m).length && (m = e.Mc), m = jQuery(m).append(f).find("#flowpaper_mark_frame_" + e.pageNumber + "_" + g), jQuery("#flowpaper_mark_frame_" + e.pageNumber + "_" + g + "_play").vd(q, "#AAAAAA", !0), m.data("url", e.F.Z[e.pageNumber][g].url), m.data("maximizeframe", e.F.Z[e.pageNumber][g].Do), jQuery("#flowpaper_mark_frame_" + e.pageNumber + "_" + g + "_play").bind("mouseup touchend", function(c) {
              if (e.pages.Ce || e.pages.animating) {
                return !1;
              }
              var d = jQuery(this).parent().data("url"),
                g = "true" == jQuery(this).parent().data("maximizeframe"); - 1 < d.indexOf("http") && (d = d.substr(d.indexOf("//") + 2));
              g ? (e.F.il = jQuery(String.format('<div class="flowpaper_mark_frame_maximized flowpaper_mark" style="position:absolute;z-index:99999;left:2.5%;top:2.5%;width:95%;height:95%"></div>')), e.F.N.append(e.F.il), jQuery(e.F.il).html(String.format("<iframe sandbox='allow-forms allow-same-origin allow-scripts' width='{0}' height='{1}' src='{3}://{2}' frameborder='0' allowfullscreen ></iframe>", 0.95 * e.F.N.width(), 0.95 * e.F.N.height(), d, -1 < location.href.indexOf("https:") ? "https" : "http")), d = jQuery(String.format('<img class="flowpaper_mark_frame_maximized_closebutton" src="{0}" style="position:absolute;right:3px;top:1%;z-index:999999;cursor:pointer;">', e.kg)), e.F.N.append(d), jQuery(d).bind("mousedown touchstart", function() {
                jQuery(".flowpaper_mark_frame_maximized").remove();
                jQuery(".flowpaper_mark_frame_maximized_closebutton").remove();
              })) : jQuery(this).parent().html(String.format("<iframe sandbox='allow-forms allow-same-origin allow-scripts' width='{0}' height='{1}' src='{3}://{2}' frameborder='0' allowfullscreen ></iframe>", jQuery(this).parent().width(), jQuery(this).parent().height(), d, -1 < location.href.indexOf("https:") ? "https" : "http"));
              c.preventDefault();
              c.stopImmediatePropagation();
              return !1;
            })) : (f = jQuery("#flowpaper_mark_frame_" + e.pageNumber + "_" + g), f.css({
              left: r + "px",
              top: h + "px",
              width: m + "px",
              height: t + "px",
              "margin-left": d + "px"
            }).find(".flowpaper_mark").css({
              width: m + "px",
              height: t + "px"
            }), r = f.find("iframe"), 0 < r.length && (r.attr("width", m), r.attr("height", t))));
          }
        }
      },
      dispose: function() {
        jQuery(this.va).find("*").unbind();
        jQuery(this).unbind();
        jQuery(this.U).unbind();
        delete this.U;
        this.U = null;
        jQuery(this.va).find("*").remove();
        this.selectors = this.pages = this.F = this.L = null;
      },
      rotate: function() {
        this.rotation && 360 != this.rotation || (this.rotation = 0);
        this.rotation = this.rotation + 90;
        360 == this.rotation && (this.rotation = 0);
        var c = this.Vb();
        if ("Portrait" == this.F.H || "SinglePage" == this.F.H) {
          this.Pa(), 90 == this.rotation ? (this.M(this.V).transition({
            rotate: this.rotation
          }, 0), jQuery(this.oa).transition({
            rotate: this.rotation,
            translate: "-" + c + "px, 0px"
          }, 0), jQuery(this.xb).css({
            "z-index": 11,
            "margin-left": c
          }), jQuery(this.xb).transition({
            rotate: this.rotation,
            translate: "-" + c + "px, 0px"
          }, 0)) : 270 == this.rotation ? (jQuery(this.oa).transition({
            rotate: this.rotation,
            translate: "-" + c + "px, 0px"
          }, 0), jQuery(this.xb).css({
            "z-index": 11,
            "margin-left": c
          }), this.M(this.V).transition({
            rotate: this.rotation
          }, 0), jQuery(this.xb).transition({
            rotate: this.rotation,
            translate: "-" + c + "px, 0px"
          }, 0)) : 180 == this.rotation ? (jQuery(this.oa).transition({
            rotate: this.rotation,
            translate: "-" + c + "px, 0px"
          }, 0), jQuery(this.xb).css({
            "z-index": 11,
            "margin-left": c
          }), this.M(this.V).transition({
            rotate: this.rotation
          }, 0), jQuery(this.xb).transition({
            rotate: this.rotation,
            translate: "-" + c + "px, 0px"
          }, 0)) : (jQuery(this.oa).css("transform", ""), jQuery(this.xb).css({
            "z-index": "",
            "margin-left": 0
          }), this.M(this.V).css("transform", ""), jQuery(this.xb).css("transform", ""));
        }
      },
      Ud: function(c, d, e, g, h, f) {
        var k = this,
          l = k.pageNumber + (d ? d : 0),
          n = new jQuery.Deferred;
        if (!k.F.renderer.sa) {
          return n.resolve(), n;
        }
        k.pages.animating && (window.clearTimeout(k.$o), k.$o = setTimeout(function() {
          k.Ud(c, d, e, g, h, f);
        }, 50));
        k.Qc();
        var q = k.F.renderer;
        "SinglePage" == k.H && (l = k.pages.R);
        k.F.config.document.RTLMode && (l = k.pages.getTotalPages() - l - 1);
        q.S[l] && q.S[l].loaded && jQuery(c).data("needs-overlay") ? k.xo(d).then(function() {
          jQuery(c).data("needs-overlay", jQuery(c).data("needs-overlay") - 1);
          k.zo = !0;
          var d = q.S[l].text,
            f = c.getContext("2d"),
            p = (e ? e : c.width) / (q.S[0] ? q.S[0].width : q.S[l].width),
            u = !0;
          g || (g = 0, u = !1);
          h || (h = 0, u = !1);
          f.setTransform(1, 0, 0, 1, g, h);
          f.save();
          f.scale(p, p);
          for (var v = 0; v < d.length; v++) {
            var x = d[v],
              z = x[1],
              w = x[0] + x[10] * x[3],
              D = x[9],
              C = x[2],
              H = x[3],
              A = x[7],
              G = x[8],
              B = x[6],
              F = x[11],
              x = x[12],
              y = A && 0 == A.indexOf("(bold)"),
              E = A && 0 == A.indexOf("(italic)");
            A && (A = A.replace("(bold) ", ""), A = A.replace("(italic) ", ""), f.font = (E ? "italic " : "") + (y ? "bold " : "") + Math.abs(H) + "px " + A + ", " + G);
            if ("object" == typeof B && B.length && 6 == B.length) {
              var I, A = B[1],
                G = B[2],
                y = B[3],
                E = B[4],
                H = B[5];
              "axial" === B[0] ? I = f.createLinearGradient(A[0], A[1], G[0], G[1]) : "radial" === B[0] && (I = f.createRadialGradient(A[0], A[1], y, G[0], G[1], E));
              B = 0;
              for (A = H.length; B < A; ++B) {
                G = H[B], I.addColorStop(G[0], G[1]);
              }
              f.fillStyle = I;
            } else {
              f.fillStyle = B;
            }
            0 != F && (f.save(), f.translate(z, w), f.rotate(F));
            if (x) {
              for (B = 0; B < x.length; B++) {
                H = x[B], 0 == F ? u && (0 > g + (z + H[0] * D + C) * p || g + (z + H[0] * D) * p > c.width) || f.fillText(H[1], z + H[0] * D, w) : f.fillText(H[1], H[0] * Math.abs(D), 0);
              }
            }
            0 != F && f.restore();
          }
          f.restore();
          jQuery(c).data("overlay-scale", p);
          n.resolve(c);
          k.Jb();
        }) : (q.S[l].loaded ? n.resolve(c) : (k.zo = !1, c.width = 100, n.reject()), k.Jb());
        return n;
      },
      xo: function(c) {
        var d = new jQuery.Deferred,
          e = this.F.renderer;
        e.Kc || (e.Kc = {});
        for (var g = [], h = !1, f = e.Ef(this.pageNumber), k = f - 10; k < f; k++) {
          e.S[k] && e.S[k].fonts && 0 < e.S[k].fonts.length && (h = !0);
        }
        if (!eb.browser.msie && !eb.browser.ff || h) {
          if (k = this.pageNumber + (c ? c : 0), c = e.S[k].text, h) {
            for (k = f - (10 < f ? 11 : 10); k < f; k++) {
              if (e.S[k] && e.S[k].fonts && 0 < e.S[k].fonts.length) {
                for (h = 0; h < e.S[k].fonts.length; h++) {
                  e.Kc[e.S[k].fonts[h].name] || (ha(e.S[k].fonts[h].name, e.S[k].fonts[h].data), g.push(e.S[k].fonts[h].name));
                }
              }
            }
          } else {
            if (c && 0 < c.length) {
              for (h = 0; h < c.length; h++) {
                c[h][7] && !e.Kc[c[h][7]] && -1 == g.indexOf(c[h][7]) && 0 == c[h][7].indexOf("g_font") && c[h][7] && g.push(c[h][7]);
              }
            }
          }
        } else {
          for (f = this.pages.getTotalPages(), k = 0; k < f; k++) {
            if (h = e.S[k], h.loaded) {
              for (c = h.text, h = 0; h < c.length; h++) {
                c[h][7] && !e.Kc[c[h][7]] && -1 == g.indexOf(c[h][7]) && 0 == c[h][7].indexOf("g_font") && c[h][7] && g.push(c[h][7]);
              }
            }
          }
        }
        0 < g.length ? WebFont.load({
          custom: {
            families: g
          },
          inactive: function() {
            d.resolve();
          },
          fontactive: function(c) {
            e.Kc[c] = "loaded";
          },
          fontinactive: function(c) {
            e.Kc[c] = "inactive";
          },
          active: function() {
            d.resolve();
          },
          timeout: eb.browser.msie || eb.browser.ff ? 5000 : 25000
        }) : d.resolve();
        return d;
      }
    };
    return f;
  }();

function xa(f, c) {
  this.F = this.O = f;
  this.L = this.F.L;
  this.resources = this.F.resources;
  this.P = this.F.P;
  this.document = c;
  this.vf = null;
  this.Ia = "toolbar_" + this.F.P;
  this.K = "#" + this.Ia;
  this.ik = this.Ia + "_bttnPrintdialogPrint";
  this.ai = this.Ia + "_bttnPrintdialogCancel";
  this.fk = this.Ia + "_bttnPrintDialog_RangeAll";
  this.gk = this.Ia + "_bttnPrintDialog_RangeCurrent";
  this.hk = this.Ia + "_bttnPrintDialog_RangeSpecific";
  this.Yh = this.Ia + "_bttnPrintDialogRangeText";
  this.Zk = this.Ia + "_labelPrintProgress";
  this.og = null;
  this.create = function() {
    var c = this;
    c.Sl = "";
    if (eb.platform.touchonlydevice || c.og) {
      c.og || (e = c.resources.ka.vq, jQuery(c.K).html((eb.platform.touchonlydevice ? "" : String.format("<img src='{0}' class='flowpaper_tbbutton_large flowpaper_print flowpaper_bttnPrint' style='margin-left:5px;'/>", c.resources.ka.Hq)) + (c.F.config.document.ViewModeToolsVisible ? (eb.platform.lb ? "" : String.format("<img src='{0}' class='flowpaper_tbbutton_large flowpaper_viewmode flowpaper_singlepage {1} flowpaper_bttnSinglePage' style='margin-left:15px;'>", c.resources.ka.Iq, "Portrait" == c.F.vb ? "flowpaper_tbbutton_pressed" : "")) + (eb.platform.lb ? "" : String.format("<img src='{0}' style='margin-left:-1px;' class='flowpaper_tbbutton_large flowpaper_viewmode  flowpaper_twopage {1} flowpaper_bttnTwoPage'>", c.resources.ka.Pq, "TwoPage" == c.F.vb ? "flowpaper_tbbutton_pressed" : "")) + (eb.platform.lb ? "" : String.format("<img src='{0}' style='margin-left:-1px;' class='flowpaper_tbbutton_large flowpaper_viewmode flowpaper_thumbview flowpaper_bttnThumbView'>", c.resources.ka.Oq)) + (eb.platform.lb ? "" : String.format("<img src='{0}' style='margin-left:-1px;' class='flowpaper_tbbutton_large flowpaper_fitmode flowpaper_fitwidth flowpaper_bttnFitWidth'>", c.resources.ka.xq)) + (eb.platform.lb ? "" : String.format("<img src='{0}' style='margin-left:-1px;' class='flowpaper_tbbutton_large flowpaper_fitmode fitheight flowpaper_bttnFitHeight'>", c.resources.ka.Fq)) + "" : "") + (c.F.config.document.ZoomToolsVisible ? String.format("<img class='flowpaper_tbbutton_large flowpaper_bttnZoomIn' src='{0}' style='margin-left:5px;' />", c.resources.ka.Sq) + String.format("<img class='flowpaper_tbbutton_large flowpaper_bttnZoomOut' src='{0}' style='margin-left:-1px;' />", c.resources.ka.Tq) + (eb.platform.lb ? "" : String.format("<img class='flowpaper_tbbutton_large flowpaper_bttnFullScreen' src='{0}' style='margin-left:-1px;' />", c.resources.ka.zq)) + "" : "") + (c.F.config.document.NavToolsVisible ? String.format("<img src='{0}' class='flowpaper_tbbutton_large flowpaper_previous flowpaper_bttnPrevPage' style='margin-left:15px;'/>", c.resources.ka.lq) + String.format("<input type='text' class='flowpaper_tbtextinput_large flowpaper_currPageNum flowpaper_txtPageNumber' value='1' style='width:70px;text-align:right;' />") + String.format("<div class='flowpaper_tblabel_large flowpaper_numberOfPages flowpaper_lblTotalPages'> / </div>") + String.format("<img src='{0}'  class='flowpaper_tbbutton_large flowpaper_next flowpaper_bttnPrevNext'/>", c.resources.ka.mq) + "" : "") + (c.F.config.document.SearchToolsVisible ? String.format("<input type='text' class='flowpaper_tbtextinput_large flowpaper_txtSearch' style='margin-left:15px;width:130px;' />") + String.format("<img src='{0}' class='flowpaper_find flowpaper_tbbutton_large flowpaper_bttnFind' style=''/>", c.resources.ka.wq) + "" : "")), jQuery(c.K).addClass("flowpaper_toolbarios"));
    } else {
      var e = c.resources.ka.vm,
        g = String.format("<div class='flowpaper_floatright flowpaper_bttnPercent' sbttnPrintIdtyle='text-align:center;padding-top:5px;background-repeat:no-repeat;width:20px;height:20px;font-size:9px;font-family:Arial;background-image:url({0})'><div id='lblPercent'></div></div>", c.resources.ka.Nm);
      eb.browser.msie && addCSSRule(".flowpaper_tbtextinput", "height", "18px");
      jQuery(c.K).html(String.format("<img src='{0}' class='flowpaper_tbbutton print flowpaper_bttnPrint'/>", c.resources.ka.Jm) + String.format("<img src='{0}' class='flowpaper_tbseparator' />", e) + (c.F.config.document.ViewModeToolsVisible ? String.format("<img src='{1}' class='flowpaper_bttnSinglePage flowpaper_tbbutton flowpaper_viewmode flowpaper_singlepage {0}' />", "Portrait" == c.F.vb ? "flowpaper_tbbutton_pressed" : "", c.resources.ka.Mm) + String.format("<img src='{1}' class='flowpaper_bttnTwoPage flowpaper_tbbutton flowpaper_viewmode flowpaper_twopage {0}' />", "TwoPage" == c.F.vb ? "flowpaper_tbbutton_pressed" : "", c.resources.ka.Qm) + String.format("<img src='{0}' class='flowpaper_tbbutton flowpaper_thumbview flowpaper_viewmode flowpaper_bttnThumbView' />", c.resources.ka.Pm) + String.format("<img src='{0}' class='flowpaper_tbbutton flowpaper_fitmode flowpaper_fitwidth flowpaper_bttnFitWidth' />", c.resources.ka.Im) + String.format("<img src='{0}' class='flowpaper_tbbutton flowpaper_fitmode flowpaper_fitheight flowpaper_bttnFitHeight'/>", c.resources.ka.Hm) + String.format("<img src='{0}' class='flowpaper_tbbutton flowpaper_bttnRotate'/>", c.resources.ka.Lm) + String.format("<img src='{0}' class='flowpaper_tbseparator' />", e) : "") + (c.F.config.document.ZoomToolsVisible ? String.format("<div class='flowpaper_slider flowpaper_zoomSlider' style='{0}'><div class='flowpaper_handle' style='{0}'></div></div>", eb.browser.msie && 9 > eb.browser.version ? c.Sl : "") + String.format("<input type='text' class='flowpaper_tbtextinput flowpaper_txtZoomFactor' style='width:40px;' />") + String.format("<img class='flowpaper_tbbutton flowpaper_bttnFullScreen' src='{0}' />", c.resources.ka.zm) + String.format("<img src='{0}' class='flowpaper_tbseparator' style='margin-left:5px' />", e) : "") + (c.F.config.document.NavToolsVisible ? String.format("<img src='{0}' class='flowpaper_tbbutton flowpaper_previous flowpaper_bttnPrevPage'/>", c.resources.ka.sm) + String.format("<input type='text' class='flowpaper_tbtextinput flowpaper_currPageNum flowpaper_txtPageNumber' value='1' style='width:50px;text-align:right;' />") + String.format("<div class='flowpaper_tblabel flowpaper_numberOfPages flowpaper_lblTotalPages'> / </div>") + String.format("<img src='{0}' class='flowpaper_tbbutton flowpaper_next flowpaper_bttnPrevNext'/>", c.resources.ka.tm) + String.format("<img src='{0}' class='flowpaper_tbseparator' />", e) : "") + (c.F.config.document.CursorToolsVisible ? String.format("<img src='{0}' class='flowpaper_tbbutton flowpaper_bttnTextSelect'/>", c.resources.ka.Om) + String.format("<img src='{0}' class='flowpaper_tbbutton flowpaper_tbbutton_pressed flowpaper_bttnHand'/>", c.resources.ka.Bm) + String.format("<img src='{0}' class='flowpaper_tbseparator' />", e) : "") + (c.F.config.document.SearchToolsVisible ? String.format("<input type='text' class='flowpaper_tbtextinput flowpaper_txtSearch' style='width:70px;margin-left:4px' />") + String.format("<img src='{0}' class='flowpaper_find flowpaper_tbbutton flowpaper_bttnFind' />", c.resources.ka.ym) + String.format("<img src='{0}' class='flowpaper_tbseparator' />", e) : "") + g);
      jQuery(c.K).addClass("flowpaper_toolbarstd");
    }
    jQuery(c.L).bind("onDocumentLoaded", function() {
      jQuery(c.K).find(".flowpaper_bttnPercent").hide();
    });
  };
  this.cl = function(c) {
    c = this.Ka = c.split("\n");
    jQuery(this.K).find(".flowpaper_bttnPrint").attr("title", this.la(c, "Print"));
    jQuery(this.K).find(".flowpaper_bttnSinglePage").attr("title", this.la(c, "SinglePage"));
    jQuery(this.K).find(".flowpaper_bttnTwoPage, .flowpaper_bttnBookView").attr("title", this.la(c, "TwoPage"));
    jQuery(this.K).find(".flowpaper_bttnThumbView").attr("title", this.la(c, "ThumbView"));
    jQuery(this.K).find(".flowpaper_bttnFitWidth").attr("title", this.la(c, "FitWidth"));
    jQuery(this.K).find(".flowpaper_bttnFitHeight").attr("title", this.la(c, "FitHeight"));
    jQuery(this.K).find(".flowpaper_bttnFitHeight").attr("title", this.la(c, "FitPage"));
    jQuery(this.K).find(".flowpaper_zoomSlider").attr("title", this.la(c, "Scale"));
    jQuery(this.K).find(".flowpaper_txtZoomFactor").attr("title", this.la(c, "Scale"));
    jQuery(this.K).find(".flowpaper_bttnFullScreen, .flowpaper_bttnFullscreen").attr("title", this.la(c, "Fullscreen"));
    jQuery(this.K).find(".flowpaper_bttnPrevPage").attr("title", this.la(c, "PreviousPage"));
    jQuery(this.K).find(".flowpaper_txtPageNumber").attr("title", this.la(c, "CurrentPage"));
    jQuery(this.K).find(".flowpaper_bttnPrevNext").attr("title", this.la(c, "NextPage"));
    jQuery(this.K).find(".flowpaper_txtSearch, .flowpaper_bttnTextSearch").attr("title", this.la(c, "Search"));
    jQuery(this.K).find(".flowpaper_bttnFind").attr("title", this.la(c, "Search"));
    var e = this.F.Lj && 0 < this.F.Lj.length ? this.F.Lj : this.F.N;
    e.find(".flowpaper_bttnHighlight").find(".flowpaper_tbtextbutton").html(this.la(c, "Highlight", "Highlight"));
    e.find(".flowpaper_bttnComment").find(".flowpaper_tbtextbutton").html(this.la(c, "Comment", "Comment"));
    e.find(".flowpaper_bttnStrikeout").find(".flowpaper_tbtextbutton").html(this.la(c, "Strikeout", "Strikeout"));
    e.find(".flowpaper_bttnDraw").find(".flowpaper_tbtextbutton").html(this.la(c, "Draw", "Draw"));
    e.find(".flowpaper_bttnDelete").find(".flowpaper_tbtextbutton").html(this.la(c, "Delete", "Delete"));
    e.find(".flowpaper_bttnShowHide").find(".flowpaper_tbtextbutton").html(this.la(c, "ShowAnnotations", "Show Annotations"));
  };
  this.la = function(c, e, g) {
    for (var h = 0; h < c.length; h++) {
      var f = c[h].split("=");
      if (f[0] == e) {
        return f[1];
      }
    }
    return g ? g : null;
  };
  this.bindEvents = function() {
    var c = this;
    jQuery(c.K).find(".flowpaper_tbbutton_large, .flowpaper_tbbutton").each(function() {
      jQuery(this).data("minscreenwidth") && parseInt(jQuery(this).data("minscreenwidth")) > window.innerWidth && jQuery(this).hide();
    });
    if (0 == c.F.N.find(".flowpaper_printdialog").length) {
      var e = c.la(c.Ka, "Enterpagenumbers", "Enter page numbers and/or page ranges separated by commas. For example 1,3,5-12");
      c.F.Wb ? c.F.N.prepend("<div id='modal-print' class='modal-content flowpaper_printdialog' style='overflow:hidden;;'><div style='background-color:#fff;color:#000;padding:10px 10px 10px 10px;height:205px;padding-bottom:20px;'>It's not possible to print from within the Desktop Publisher. <br/><br/>You can try this feature by clicking on 'Publish' and then 'View in Browser'.<br/><br/><a class='flowpaper_printdialog_button' id='" + c.ai + "'>OK</a></div></div>") : c.F.N.prepend("<div id='modal-print' class='modal-content flowpaper_printdialog' style='overflow:hidden;'><font style='color:#000000;font-size:11px'><b>" + c.la(c.Ka, "Selectprintrange", "Select print range") + "</b></font><div style='width:98%;padding-top:5px;padding-left:5px;background-color:#ffffff;'><table border='0' style='margin-bottom:10px;'><tr><td><input type='radio' name='PrintRange' checked='checked' id='" + c.fk + "'/></td><td>" + c.la(c.Ka, "All", "All") + "</td></tr><tr><td><input type='radio' name='PrintRange' id='" + c.gk + "'/></td><td>" + c.la(c.Ka, "CurrentPage", "Current Page") + "</td></tr><tr><td><input type='radio' name='PrintRange' id='" + c.hk + "'/></td><td>" + c.la(c.Ka, "Pages", "Pages") + "</td><td><input type='text' style='width:120px' id='" + c.Yh + "' /><td></tr><tr><td colspan='3'>" + e + "</td></tr></table><a id='" + c.ik + "' class='flowpaper_printdialog_button'>" + c.la(c.Ka, "Print", "Print") + "</a>&nbsp;&nbsp;<a class='flowpaper_printdialog_button' id='" + c.ai + "'>" + c.la(c.Ka, "Cancel", "Cancel") + "</a><span id='" + c.Zk + "' style='padding-left:5px;'></span><div style='height:5px;display:block;margin-top:5px;'>&nbsp;</div></div></div>");
    }
    jQuery("input:radio[name=PrintRange]:nth(0)").attr("checked", !0);
    c.F.config.Toolbar ? (jQuery(c.K).find(".flowpaper_txtZoomFactor").bind("click", function() {
      if (!jQuery(this).hasClass("flowpaper_tbbutton_disabled")) {
        return !1;
      }
    }), jQuery(c.K).find(".flowpaper_currPageNum").bind("click", function() {
      jQuery(c.K).find(".flowpaper_currPageNum").focus();
    }), jQuery(c.K).find(".flowpaper_txtSearch").bind("click", function() {
      jQuery(c.K).find(".flowpaper_txtSearch").focus();
      return !1;
    }), jQuery(c.K).find(".flowpaper_bttnFind").bind("click", function() {
      c.searchText(jQuery(c.K).find(".flowpaper_txtSearch").val());
      jQuery(c.K).find(".flowpaper_bttnFind").focus();
      return !1;
    })) : (jQuery(c.K).find(".flowpaper_bttnFitWidth").bind("click", function() {
      jQuery(this).hasClass("flowpaper_tbbutton_disabled") || (c.F.fitwidth(), jQuery("#toolbar").trigger("onFitModeChanged", "Fit Width"));
    }), jQuery(c.K).find(".flowpaper_bttnFitHeight").bind("click", function() {
      jQuery(this).hasClass("flowpaper_tbbutton_disabled") || (c.F.fitheight(), jQuery("#toolbar").trigger("onFitModeChanged", "Fit Height"));
    }), jQuery(c.K).find(".flowpaper_bttnTwoPage").bind("click", function() {
      jQuery(this).hasClass("flowpaper_tbbutton_disabled") || ("BookView" == c.F.vb ? c.F.switchMode("BookView") : c.F.switchMode("TwoPage"));
    }), jQuery(c.K).find(".flowpaper_bttnSinglePage").bind("click", function() {
      c.F.config.document.TouchInitViewMode && "SinglePage" != !c.F.config.document.TouchInitViewMode || !eb.platform.touchonlydevice ? c.F.switchMode("Portrait", c.F.getCurrPage() - 1) : c.F.switchMode("SinglePage", c.F.getCurrPage());
    }), jQuery(c.K).find(".flowpaper_bttnThumbView").bind("click", function() {
      c.F.switchMode("Tile");
    }), jQuery(c.K).find(".flowpaper_bttnPrint").bind("click", function() {
      eb.platform.touchonlydevice ? c.F.printPaper("current") : (jQuery("#modal-print").css("background-color", "#dedede"), c.F.dj = jQuery("#modal-print").smodal({
        minHeight: 255,
        appendTo: c.F.N
      }), jQuery("#modal-print").parent().css("background-color", "#dedede"));
    }), jQuery(c.K).find(".flowpaper_bttnDownload").bind("click", function() {
      if (window.zine) {
        jQuery(window.document.body).append(String.format('<a class="flowpaper_downloadlink"></a>'));
        var e = FLOWPAPER.Bj(c.document.PDFFile, c.F.getCurrPage()),
          h = !eb.browser.msie;
        FLOWPAPER.authenticated && (e = FLOWPAPER.appendUrlParameter(e, FLOWPAPER.authenticated.getParams()));
        h && (jQuery(".flowpaper_downloadlink").attr("href", e), jQuery(".flowpaper_downloadlink").attr("download", e.split("/").pop()), window.document.querySelector(".flowpaper_downloadlink").click());
        0 < c.document.PDFFile.indexOf("[*,") && -1 == c.document.PDFFile.indexOf("[*,2,true]") && 1 < c.F.getTotalPages() && 1 < c.F.getCurrPage() && (e = FLOWPAPER.Bj(c.document.PDFFile, c.F.getCurrPage() - 1), FLOWPAPER.authenticated && (e = FLOWPAPER.appendUrlParameter(e, FLOWPAPER.authenticated.getParams())), window.open(e, "windowname4", null), h && (jQuery(".flowpaper_downloadlink").attr("href", e), jQuery(".flowpaper_downloadlink").attr("download", e.split("/").pop()), window.document.querySelector(".flowpaper_downloadlink").click()));
        jQuery(c.F).trigger("onDownloadDocument", e);
        jQuery(".flowpaper_downloadlink").remove();
      } else {
        e = FLOWPAPER.Bj(c.document.PDFFile, c.F.getCurrPage()), FLOWPAPER.authenticated && (e = FLOWPAPER.appendUrlParameter(e, FLOWPAPER.authenticated.getParams())), window.open(e, "windowname4", null);
      }
      return !1;
    }), jQuery(c.K).find(".flowpaper_bttnOutline").bind("click", function() {
      c.F.expandOutline();
    }), jQuery(c.K).find(".flowpaper_bttnPrevPage").bind("click", function() {
      c.F.previous();
      return !1;
    }), jQuery(c.K).find(".flowpaper_bttnPrevNext").bind("click", function() {
      c.F.next();
      return !1;
    }), jQuery(c.K).find(".flowpaper_bttnZoomIn").bind("click", function() {
      "TwoPage" == c.F.H || "BookView" == c.F.H ? c.F.pages.ne() : "Portrait" != c.F.H && "SinglePage" != c.F.H || c.F.ZoomIn();
    }), jQuery(c.K).find(".flowpaper_bttnZoomOut").bind("click", function() {
      "TwoPage" == c.F.H || "BookView" == c.F.H ? c.F.pages.md() : "Portrait" != c.F.H && "SinglePage" != c.F.H || c.F.ZoomOut();
    }), jQuery(c.K).find(".flowpaper_txtZoomFactor").bind("click", function() {
      if (!jQuery(this).hasClass("flowpaper_tbbutton_disabled")) {
        return jQuery(c.K).find(".flowpaper_txtZoomFactor").focus(), !1;
      }
    }), jQuery(c.K).find(".flowpaper_currPageNum").bind("click", function() {
      jQuery(c.K).find(".flowpaper_currPageNum").focus();
    }), jQuery(c.K).find(".flowpaper_txtSearch").bind("click", function() {
      jQuery(c.K).find(".flowpaper_txtSearch").focus();
      return !1;
    }), jQuery(c.K).find(".flowpaper_bttnFullScreen, .flowpaper_bttnFullscreen").bind("click", function() {
      c.F.openFullScreen();
    }), jQuery(c.K).find(".flowpaper_bttnFind").bind("click", function() {
      c.searchText(jQuery(c.K).find(".flowpaper_txtSearch").val());
      jQuery(c.K).find(".flowpaper_bttnFind").focus();
      return !1;
    }), jQuery(c.K).find(".flowpaper_bttnTextSelect").bind("click", function() {
      c.F.ye = "flowpaper_selected_default";
      jQuery(c.K).find(".flowpaper_bttnTextSelect").addClass("flowpaper_tbbutton_pressed");
      jQuery(c.K).find(".flowpaper_bttnHand").removeClass("flowpaper_tbbutton_pressed");
      c.F.setCurrentCursor("TextSelectorCursor");
    }), jQuery(c.K).find(".flowpaper_bttnHand").bind("click", function() {
      jQuery(c.K).find(".flowpaper_bttnHand").addClass("flowpaper_tbbutton_pressed");
      jQuery(c.K).find(".flowpaper_bttnTextSelect").removeClass("flowpaper_tbbutton_pressed");
      c.F.setCurrentCursor("ArrowCursor");
    }), jQuery(c.K).find(".flowpaper_bttnRotate").bind("click", function() {
      c.F.rotate();
    }));
    jQuery("#" + c.Yh).bind("keydown", function() {
      jQuery(this).focus();
    });
    jQuery(c.K).find(".flowpaper_currPageNum, .flowpaper_txtPageNumber").bind("keydown", function(e) {
      if (!jQuery(this).hasClass("flowpaper_tbbutton_disabled")) {
        if ("13" != e.keyCode) {
          return;
        }
        c.gotoPage(this);
      }
      return !1;
    });
    c.F.N.find(".flowpaper_txtSearch").bind("keydown", function(e) {
      if ("13" == e.keyCode) {
        return c.searchText(c.F.N.find(".flowpaper_txtSearch").val()), !1;
      }
    });
    jQuery(c.K).bind("onZoomFactorChanged", function(e, h) {
      var f = Math.round(h.Bf / c.F.document.MaxZoomSize * 100 * c.F.document.MaxZoomSize) + "%";
      jQuery(c.K).find(".flowpaper_txtZoomFactor").val(f);
      c.Bf != h.Bf && (c.Bf = h.Bf, jQuery(c.F).trigger("onScaleChanged", h.Bf));
    });
    jQuery(c.L).bind("onDocumentLoaded", function(e, h) {
      2 > h ? jQuery(c.K).find(".flowpaper_bttnTwoPage").addClass("flowpaper_tbbutton_disabled") : jQuery(c.K).find(".flowpaper_bttnTwoPage").removeClass("flowpaper_tbbutton_disabled");
    });
    jQuery(c.K).bind("onCursorChanged", function(e, h) {
      "TextSelectorCursor" == h && (jQuery(c.K).find(".flowpaper_bttnTextSelect").addClass("flowpaper_tbbutton_pressed"), jQuery(c.K).find(".flowpaper_bttnHand").removeClass("flowpaper_tbbutton_pressed"));
      "ArrowCursor" == h && (jQuery(c.K).find(".flowpaper_bttnHand").addClass("flowpaper_tbbutton_pressed"), jQuery(c.K).find(".flowpaper_bttnTextSelect").removeClass("flowpaper_tbbutton_pressed"));
    });
    jQuery(c.K).bind("onFitModeChanged", function(e, h) {
      jQuery(".flowpaper_fitmode").each(function() {
        jQuery(this).removeClass("flowpaper_tbbutton_pressed");
      });
      "FitHeight" == h && jQuery(c.K).find(".flowpaper_bttnFitHeight").addClass("flowpaper_tbbutton_pressed");
      "FitWidth" == h && jQuery(c.K).find(".flowpaper_bttnFitWidth").addClass("flowpaper_tbbutton_pressed");
    });
    jQuery(c.K).bind("onProgressChanged", function(e, h) {
      jQuery("#lblPercent").html(100 * h);
      1 == h && jQuery(c.K).find(".flowpaper_bttnPercent").hide();
    });
    jQuery(c.K).bind("onViewModeChanged", function(e, h) {
      jQuery(c.L).trigger("onViewModeChanged", h);
      jQuery(".flowpaper_viewmode").each(function() {
        jQuery(this).removeClass("flowpaper_tbbutton_pressed");
      });
      if ("Portrait" == c.F.H || "SinglePage" == c.F.H) {
        jQuery(c.K).find(".flowpaper_bttnSinglePage").addClass("flowpaper_tbbutton_pressed"), jQuery(c.K).find(".flowpaper_bttnFitWidth").removeClass("flowpaper_tbbutton_disabled"), jQuery(c.K).find(".flowpaper_bttnFitHeight").removeClass("flowpaper_tbbutton_disabled"), jQuery(c.K).find(".flowpaper_bttnPrevPage").removeClass("flowpaper_tbbutton_disabled"), jQuery(c.K).find(".flowpaper_bttnPrevNext").removeClass("flowpaper_tbbutton_disabled"), jQuery(c.K).find(".flowpaper_bttnTextSelect").removeClass("flowpaper_tbbutton_disabled"), jQuery(c.K).find(".flowpaper_zoomSlider").removeClass("flowpaper_tbbutton_disabled"), jQuery(c.K).find(".flowpaper_txtZoomFactor").removeClass("flowpaper_tbbutton_disabled"), c.F.toolbar && c.F.toolbar.yc && c.F.toolbar.yc.enable();
      }
      if ("TwoPage" == c.F.H || "BookView" == c.F.H || "FlipView" == c.F.H) {
        jQuery(c.K).find(".flowpaper_bttnBookView").addClass("flowpaper_tbbutton_pressed"), jQuery(c.K).find(".flowpaper_bttnTwoPage").addClass("flowpaper_tbbutton_pressed"), jQuery(c.K).find(".flowpaper_bttnFitWidth").addClass("flowpaper_tbbutton_disabled"), jQuery(c.K).find(".flowpaper_bttnFitHeight").addClass("flowpaper_tbbutton_disabled"), jQuery(c.K).find(".flowpaper_bttnPrevPage").removeClass("flowpaper_tbbutton_disabled"), jQuery(c.K).find(".flowpaper_bttnPrevNext").removeClass("flowpaper_tbbutton_disabled"), jQuery(c.K).find(".flowpaper_bttnTextSelect").removeClass("flowpaper_tbbutton_disabled"), eb.platform.touchdevice && (jQuery(c.K).find(".flowpaper_zoomSlider").addClass("flowpaper_tbbutton_disabled"), jQuery(c.K).find(".flowpaper_txtZoomFactor").addClass("flowpaper_tbbutton_disabled"), c.F.toolbar.yc && c.F.toolbar.yc.disable()), eb.platform.touchdevice || eb.browser.msie || (jQuery(c.K).find(".flowpaper_zoomSlider").removeClass("flowpaper_tbbutton_disabled"), jQuery(c.K).find(".flowpaper_txtZoomFactor").removeClass("flowpaper_tbbutton_disabled"), c.F.toolbar.yc && c.F.toolbar.yc.enable());
      }
      "ThumbView" == c.F.H && (jQuery(c.K).find(".flowpaper_bttnThumbView").addClass("flowpaper_tbbutton_pressed"), jQuery(c.K).find(".flowpaper_bttnFitWidth").addClass("flowpaper_tbbutton_disabled"), jQuery(c.K).find(".flowpaper_bttnFitHeight").addClass("flowpaper_tbbutton_disabled"), jQuery(c.K).find(".flowpaper_bttnPrevPage").addClass("flowpaper_tbbutton_disabled"), jQuery(c.K).find(".flowpaper_bttnPrevNext").addClass("flowpaper_tbbutton_disabled"), jQuery(c.K).find(".flowpaper_bttnTextSelect").addClass("flowpaper_tbbutton_disabled"), jQuery(c.K).find(".flowpaper_zoomSlider").addClass("flowpaper_tbbutton_disabled"), jQuery(c.K).find(".flowpaper_txtZoomFactor").addClass("flowpaper_tbbutton_disabled"), c.F.toolbar && c.F.toolbar.yc && c.F.toolbar.yc.disable());
    });
    jQuery(c.K).bind("onFullscreenChanged", function(e, h) {
      h ? jQuery(c.K).find(".flowpaper_bttnFullscreen").addClass("flowpaper_tbbutton_disabled") : jQuery(c.K).find(".flowpaper_bttnFullscreen").removeClass("flowpaper_tbbutton_disabled");
    });
    jQuery(c.K).bind("onScaleChanged", function(e, h) {
      jQuery(c.L).trigger("onScaleChanged", h);
      c.yc && c.yc.setValue(h, !0);
    });
    jQuery("#" + c.ai).bind("click", function(e) {
      jQuery.smodal.close();
      e.stopImmediatePropagation();
      c.F.dj = null;
      return !1;
    });
    jQuery("#" + c.ik).bind("click", function() {
      var e = "";
      jQuery("#" + c.fk).is(":checked") && (c.F.printPaper("all"), e = "1-" + c.F.renderer.getNumPages());
      jQuery("#" + c.gk).is(":checked") && (c.F.printPaper("current"), e = jQuery(c.K).find(".flowpaper_txtPageNumber").val());
      jQuery("#" + c.hk).is(":checked") && (e = jQuery("#" + c.Yh).val(), c.F.printPaper(e));
      jQuery(this).html("Please wait");
      window.onPrintRenderingProgress = function(e) {
        jQuery("#" + c.Zk).html("Processing page:" + e);
      };
      window.onPrintRenderingCompleted = function() {
        jQuery.smodal.close();
        c.F.dj = null;
        c.L.trigger("onDocumentPrinted", e);
      };
      return !1;
    });
    c.$p();
  };
  this.$j = function(c, e) {
    var g = this;
    if (0 != jQuery(g.K).find(".flowpaper_zoomSlider").length && null == g.yc) {
      g = this;
      this.Pf = c;
      this.Of = e;
      if (window.zine) {
        var h = {
          wf: 0,
          Ob: g.F.L.width() / 2,
          oc: g.F.L.height() / 2
        };
        g.yc = new Slider(jQuery(g.K).find(".flowpaper_zoomSlider").get(0), {
          callback: function(c) {
            c * g.F.document.MaxZoomSize >= g.F.document.MinZoomSize && c <= g.F.document.MaxZoomSize ? g.F.hb(g.F.document.MaxZoomSize * c, h) : c * g.F.document.MaxZoomSize < g.F.document.MinZoomSize ? g.F.hb(g.F.document.MinZoomSize, h) : c > g.F.document.MaxZoomSize && g.F.hb(g.F.document.MaxZoomSize, h);
          },
          animation_callback: function(c) {
            c * g.F.document.MaxZoomSize >= g.F.document.MinZoomSize && c <= g.F.document.MaxZoomSize ? g.F.hb(g.F.document.MaxZoomSize * c, h) : c * g.F.document.MaxZoomSize < g.F.document.MinZoomSize ? g.F.hb(g.F.document.MinZoomSize, h) : c > g.F.document.MaxZoomSize && g.F.hb(g.F.document.MaxZoomSize, h);
          },
          snapping: !1
        });
      } else {
        jQuery(g.K).find(".flowpaper_zoomSlider > *").bind("mousedown", function() {
          jQuery(g.K).find(".flowpaper_bttnFitWidth").removeClass("flowpaper_tbbutton_pressed");
          jQuery(g.K).find(".flowpaper_bttnFitHeight").removeClass("flowpaper_tbbutton_pressed");
        }), g.yc = new Slider(jQuery(g.K).find(".flowpaper_zoomSlider").get(0), {
          callback: function(c) {
            jQuery(g.K).find(".flowpaper_bttnFitWidth, .flowpaper_bttnFitHeight").hasClass("flowpaper_tbbutton_pressed") && "up" === g.F.sh || (c * g.F.document.MaxZoomSize >= g.Pf && c <= g.Of ? g.F.hb(g.F.document.MaxZoomSize * c) : c * g.F.document.MaxZoomSize < g.Pf ? g.F.hb(g.Pf) : c > g.Of && g.F.hb(g.Of));
          },
          animation_callback: function(c) {
            jQuery(g.K).find(".flowpaper_bttnFitWidth, .flowpaper_bttnFitHeight").hasClass("flowpaper_tbbutton_pressed") && "up" === g.F.sh || (c * g.F.document.MaxZoomSize >= g.Pf && c <= g.Of ? g.F.hb(g.F.document.MaxZoomSize * c) : c * g.F.document.MaxZoomSize < g.Pf ? g.F.hb(g.Pf) : c > g.Of && g.F.hb(g.Of));
          },
          snapping: !1
        });
      }
      jQuery(g.K).find(".flowpaper_txtZoomFactor").bind("keypress", function(c) {
        if (!jQuery(this).hasClass("flowpaper_tbbutton_disabled") && 13 == c.keyCode) {
          try {
            var d = {
                wf: 0,
                Ob: g.F.L.width() / 2,
                oc: g.F.L.height() / 2
              },
              e = jQuery(g.K).find(".flowpaper_txtZoomFactor").val().replace("%", "") / 100;
            g.F.Zoom(e, d);
          } catch (h) {}
          return !1;
        }
      });
    }
  };
  this.aq = function(c) {
    jQuery(c).val() > this.document.numPages && jQuery(c).val(this.document.numPages);
    (1 > jQuery(c).val() || isNaN(jQuery(c).val())) && jQuery(c).val(1);
  };
  this.Zp = function(c) {
    this.document.RTLMode ? (c = this.O.getTotalPages() - c + 1, 1 > c && (c = 1), "TwoPage" == this.F.H ? "1" == c ? jQuery(this.K).find(".flowpaper_txtPageNumber").val("1-2") : parseInt(c) <= this.document.numPages && 0 == this.document.numPages % 2 || parseInt(c) < this.document.numPages && 0 != this.document.numPages % 2 ? jQuery(this.K).find(".flowpaper_txtPageNumber").val(c + 1 + "-" + c) : jQuery(this.K).find(".flowpaper_txtPageNumber").val(this.document.numPages) : "BookView" == this.F.H || "FlipView" == this.F.H ? "1" != c || eb.platform.iphone ? !(parseInt(c) + 1 <= this.document.numPages) || this.F.I && this.F.I.Ba ? jQuery(this.K).find(".flowpaper_txtPageNumber").val(this.yd(c, c)) : (0 != parseInt(c) % 2 && 1 < parseInt(c) && --c, jQuery(this.K).find(".flowpaper_txtPageNumber").val(this.yd(c, 1 < parseInt(c) ? c + 1 + "-" + c : c))) : jQuery(this.K).find(".flowpaper_txtPageNumber").val(this.yd(1, "1")) : "0" != c && jQuery(this.K).find(".flowpaper_txtPageNumber").val(this.yd(c, c))) : "TwoPage" == this.F.H ? "1" == c ? jQuery(this.K).find(".flowpaper_txtPageNumber").val("1-2") : parseInt(c) <= this.document.numPages && 0 == this.document.numPages % 2 || parseInt(c) < this.document.numPages && 0 != this.document.numPages % 2 ? jQuery(this.K).find(".flowpaper_txtPageNumber").val(c + "-" + (c + 1)) : jQuery(this.K).find(".flowpaper_txtPageNumber").val(this.document.numPages) : "BookView" == this.F.H || "FlipView" == this.F.H ? "1" != c || eb.platform.iphone ? !(parseInt(c) + 1 <= this.document.numPages) || this.F.I && this.F.I.Ba ? jQuery(this.K).find(".flowpaper_txtPageNumber").val(this.yd(c, c)) : (0 != parseInt(c) % 2 && 1 < parseInt(c) && (c = c - 1), jQuery(this.K).find(".flowpaper_txtPageNumber").val(this.yd(c, 1 < parseInt(c) ? c + "-" + (c + 1) : c))) : jQuery(this.K).find(".flowpaper_txtPageNumber").val(this.yd(1, "1")) : "0" != c && jQuery(this.K).find(".flowpaper_txtPageNumber").val(this.yd(c, c));
  };
  this.hp = function(c) {
    if (this.F.labels) {
      for (var e = this.F.labels.children(), g = 0; g < e.length; g++) {
        if (e[g].getAttribute("title") == c) {
          return parseInt(e[g].getAttribute("pageNumber"));
        }
      }
    }
    return null;
  };
  this.yd = function(c, e, g) {
    0 == c && (c = 1);
    if (this.F.labels) {
      var h = this.F.labels.children();
      h.length > parseInt(c) - 1 && (e = h[parseInt(c - 1)].getAttribute("title"), isNaN(e) ? e = la(h[parseInt(c) - 1].getAttribute("title")) : !("FlipView" == this.F.H && 1 < parseInt(e) && parseInt(e) + 1 <= this.document.numPages) || this.F.I && this.F.I.Ba || g || (0 != parseInt(e) % 2 && (e = parseInt(e) - 1), e = e + "-" + (parseInt(e) + 1)));
    }
    return e;
  };
  this.$p = function() {
    this.og ? jQuery(this.og.Oa).find(".flowpaper_lblTotalPages").html(" / " + this.document.numPages) : jQuery(this.K).find(".flowpaper_lblTotalPages").html(" / " + this.document.numPages);
  };
  this.gotoPage = function(c) {
    var e = this.hp(jQuery(c).val());
    e ? this.F.gotoPage(e) : 0 <= jQuery(c).val().indexOf("-") && "TwoPage" == this.F.H ? (c = jQuery(c).val().split("-"), isNaN(c[0]) || isNaN(c[1]) || (0 == parseInt(c[0]) % 2 ? this.F.gotoPage(parseInt(c[0]) - 1) : this.F.gotoPage(parseInt(c[0])))) : isNaN(jQuery(c).val()) || (this.aq(c), this.F.gotoPage(jQuery(c).val()));
  };
  this.searchText = function(c) {
    this.F.searchText(c);
  };
}
window.addCSSRule = function(f, c, d) {
  for (var e = null, g = 0; g < document.styleSheets.length; g++) {
    try {
      var h = document.styleSheets[g],
        p = h.cssRules || h.rules,
        k = f.toLowerCase();
      if (null != p) {
        null == e && (e = document.styleSheets[g]);
        for (var l = 0, n = p.length; l < n; l++) {
          if (p[l].selectorText && p[l].selectorText.toLowerCase() == k) {
            if (null != d) {
              p[l].style[c] = d;
              return;
            }
            h.deleteRule ? h.deleteRule(l) : h.removeRule ? h.removeRule(l) : p[l].style.cssText = "";
          }
        }
      }
    } catch (q) {}
  }
  h = e || {};
  h.insertRule ? (p = h.cssRules || h.rules, h.insertRule(f + "{ " + c + ":" + d + "; }", p.length)) : h.addRule && h.addRule(f, c + ":" + d + ";", 0);
};
window.FlowPaperViewer_Zine = function(f, c, d) {
  this.F = c;
  this.L = d;
  this.toolbar = f;
  this.W = "FlipView";
  this.gn = this.toolbar.Ia + "_barPrint";
  this.jn = this.toolbar.Ia + "_barViewMode";
  this.en = this.toolbar.Ia + "_barNavTools";
  this.dn = this.toolbar.Ia + "_barCursorTools";
  this.hn = this.toolbar.Ia + "_barSearchTools";
  this.mn = this.toolbar.Ia + "_bttnMoreTools";
  this.ea = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  this.Zh = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAAAAACpyA7pAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wGGgchEmOlRoEAAAFUSURBVDjLrZS9SgNREIW/m531JyGbQFAQJE+w4EuYWvQd7C0sAjYpfQcfwsJSXyJgbZFKEhTUuIZkd8Yimx/Dboyytzz345yZuZdxF2x0SpthiBbsZ3/gXnofuYBXbjZSrtevHeRycfQ0bIIo76+HlZ08zDSoPgcBYgz2Ai/t+mYZOQfAbXnJoIoYVFzmcGaiq0SGKL6XPcO56vmKGNgvnGFTztZzTDlNsltdyGqIEec88UKODdEfATm5irBJLoihClTaIaerfrc8Xn/O60OBdgjKyapn2L6a95soEJJdZ6hAYkjMyE+1u6wqv4BRXPB/to25onP/43e8evmw5Jd+vm6Oz1Q3ExAHdDpHOO6XkRbQ7ThAQIxdczC8zDBrpallw53h9731PST7E0pmWsetoRx1NRNjUi6/jfL3i1+zCASI/MZ2LqeTaDKb33hc2J4sep9+A+KGjvNJJ1I+AAAAAElFTkSuQmCC";
  this.$h = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAAAAACpyA7pAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wGGggFBG3FVUsAAAFTSURBVDjLrZQxSwNBEIXfbuaSUxKUNDYKRmJhZXMIgv/FIm0K/0kau/wdqxQeaGEQksJW0CJ4SC6ZZ5G9eIZbc8pdOfftm/d2ljE3KPXZchhEK9bjH7jX+8TfsH7addzLRA683HI+ZhcQxdukUQ+8nIbhdL8NIR6D0DqXd3niCgBgxOr4EkKwYQrDZEXTmBGiqBVjaw6mpqu8xXet+SPC3EGPnuO4lSMhhHpG/F1WQrRMX4UA3KpHwJJKks1hHG8YJeN42CRJJbO8gwggzjc1o0HvZ94IxT4jurwLpDVXeyhymQJIFxW/Z5bmqu77H72zzZ9POT03rJFHZ+RGKG4l9G8v8gKZ/KjvloYQO0sAs+sCscxISAhw8my8DlddO4Alw441vyQ1ONwlhUjbremHf7/I0V4CCIAkOG6teyxSAlYCAAgMkHyaJLu/Od6r2pNV79MvlFCWQTKpHw8AAAAASUVORK5CYII%3D";
  this.Th = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAAAAACpyA7pAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wGGgcmKZ3vOWIAAAG3SURBVDjLrZS9bhNBFIW/uzOLwVacSIYCCUVCyivwAkgGJ31cpMwT8A6UlKnSpKTgARBPkCK8QZCIlAqRBPGXxbF37qFYO8aWNk6QVyvNnNlP52juzlx7xa2e7HYY0ZfspztwF6e/aoHQXO+MudOvq49rubL4/HsdovPz25PW/TpM3l750m4Txdmjdqjftd0L6WyFKGjZjcWxViGikwcHE/0eMmHsHiBMxod3mCDkTiYhdyXf7h0PDYDK3YbHvW1PchfSmEve3zzfvwQz8Gq43D/f7Hu65jyllHa2OLpqgASpGhpXR2ztpJSSS1GUDrvPP318nyJYlWtAvHj7/Vk3HEApMnfcvXuydxg3AkjIhQRhIx7unXTdHfcInoCnb/IMZIAlA1B4jY8iCRyicAeFMC3YtJpZAzm4iKrWZTI0w8mQqfpKFGn+b/i8SiKWDPI57s+8GpRLPs+acPbPO9XYWOuuuZN000SZZnKv/QyrMmxm9p/7WMxBNHg5cyFezCiIEMUD2QK3psjg4aJW5B3IJF/jJkNjrTr3o2bzx6C+v+SrKiACRd5p1IeOitGkfsPh0vrksvvpX4Z15Dxt627DAAAAAElFTkSuQmCC";
  this.Lg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAAAAACpyA7pAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wGGggfBarvnwYAAAG+SURBVDjLrZQ/axRRFMV/9+2bnUkgKGlsFIxEECWfwMaPIJhqk0+QbUxlkyqdrWBrp/gZ0sTGVgJptkkKmyASLRaHdWf2Hou3f9yVzSaylwf33XmHe+47vDn2kmtFuB6M6Evupxvgvn8p5xM2H24OcV/P4p25uEG/o02Izo+zvJnNxXlRnN9eJ0inWRE1NywWqx0pCuV25WUs74roNEwQnHYLD8J4+hlhHvjwluBgDSdI4E7te62TXlIzSR96J609r3EHKUhIGqi9c3HYBTNQSt3Di522BpISTpK0v8txvwAJlFLRP2Z3f3gehTu8en766f2gCZZ4DWh+e3P57EXjNbgI7kja7hwc5VsR0hhIELfyo4POtiTcI8iBRx/zADLA3ADUeIf/znAQROECxTgRbKJmWEECFzHNjUw2AoySIVM6JaZZpkKzlUSsqRozuGq2quolv2eNcPbXmtTYsNZNeUfs6SVqvBvzjvsZljhsavef91iMS5bwZOrz439NI0grC9sVUoAHi6i1AUEqNoJd9Vtyd1WKolpfO/8131/ivVslRKDM7q+NOepKEGIGkBmUPStH+vX5uSyfXLaf/gE6n/uTJg/UHAAAAABJRU5ErkJggg%3D%3D";
  this.Qg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAAAAACpyA7pAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wGGgcnEaz2sL0AAAGlSURBVDjLrZRNjtNAEIW/ssvDkGgyIwUWSGhWHIEj8Cf2bDgFV+AMLGHBCgmJA3ABdpyBkWaFmAHxGyLHrsfC7dgmsQhSvLG763O/qtddbU/Y6cl2w/DY83r6D+7z+Y9RIJ+czhN3/un4xihXLT78PAUPvn+5OT0cwxSzo4+zGS4urs/y8artIK8vjnDB1BrsBZaqMr190w2mC+FB0a5mIgXLswf2eg3mRZBJKJpHhgkz49fzy/uPom7nkfockkASB+V7e/g4epyLqLukaaSKy1dfb9+xl2k6RCZV7X+gBrP8lr97dna3DVSSB3SmmExgkT+1KIsuEDh93eQtQHbYBQJcRPQI9d4WXX6uTnftX+OPOl3hou7nN/hqA7XwimWxsfkYgH6n8bIanGe1NZhpDW87z4YhawgbCgw4WapUqZCOG/aREia03pzUbxoKN3qG0ZeWtval7diXsg2jtnK2aaiD21++oJRnG3BwcbWVuTfWmxORwbV/XUUxh0yKk20F9pI9CcnFajL5thy/X4pjLcCBRTG/Mi66Wqxa/8pyb/fkvu/TP0a/9eMEsgteAAAAAElFTkSuQmCC";
  this.bi = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAAAAACpyA7pAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wGGggfGb7uw0kAAAGtSURBVDjLrZS/bhNBEIe/Wc/5DksRKA0NSASFBvEQvAM0IJ4gFfRUtJSJ0tHyEFQU1DQ0bpKCBgkEFBEny2fvj+LW98f2gSN5pdPt7nya2flpZuwlO62wG4bHPfvTNbgfn8vhgOMHx4n7euG3B7nlfKpj8Mivi3ycDXKxKC5vHRKkL1nhGlzmxWQquVBudTKfSBsFvT8nJMksvxIeGSUrpvrDZtPndrZswFEkSBDrJcOEmXH15tuzk7hI9yAFidVTkASSyOcf7cUrdQwu1Ept1Pv8++nPx0/C23QtEaQYO/5r3B+NP7yePm0skkfo+JMJLI7eWZyNW0PEQeslI4AwIcb2wkVUh1Dnv9KLKFxt3FY/TJjauGItX/V2avP1BdWIjQcagKp0rha9em5cmKmBt9WzYchqwvoBepwsZaqUSMv1+0gJE6KbH3W9dALX8QyjG1ra2pe2Y1/KNoTaytmmoN4dCUkXtKZLABc3lun4cKg3CxHg/v9Gh44gSMVRsH9Qxp2J5KI6PLj8Mzxf/O7NEhwos3sHTYxFJQieAWQG5czKlX5zfu9rTu57nv4FFIsPySkiwzoAAAAASUVORK5CYII%3D";
  this.Rg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAAAAACpyA7pAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wGGgcoGry8dfoAAAFASURBVDjLrZRNSgNBEEZfJzUqCZkERhdCCB7GC+jCrXgDb+QRvIBnEQkuxKAQI2NIeqpcTCI9Mp3JQHrzaPj6q5/uLnfPXquznwzRA/tZC93HdBEVdHuTbKObvg/PozqfP39PQJSvz3H/JCYzTQdvaYoYs7O0G6/aHXWL2QAx6LudzXH93BAlKd0eALiroiwlUcTAAjutgWGlbtNDj6D/sVGKoUWQTFEHNcTw21NSRqoCwBuif7tofqC4W16HTZc7HyOGlqceAbiqIsxvj7iGGMV2F+1LYYhnmQR+P3VYeiR8i3Vo9Z4Nd8PLoEm2uAjcnwC4rKJ13PBfel+Dln6hLt4XQ0Bc+BnqIOCumeMaorqUDpw2jSLNoGOmo52GjpGaibHu9ebL+HxJhpaXVeVJdhwPus7X2/6tVgebk4eep79dEZnAuEZ32QAAAABJRU5ErkJggg%3D%3D";
  this.ci = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAAAAACpyA7pAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wGGgggAxtSEA8AAAE0SURBVDjLrZQxT8MwEIW/uJc2VKpAXVhAoqgMbLDyq/iVjAiJgS7twIoEAyJCTerHYNokyGlTVC+fJT/fuzvZl9zTabluMswfOJ720L095u2G/avpr+51bqetutVypimY530+6KetOp9li5MxTnpOM1PrSiwbziQTGiRbi0kGn8I8vSB7AOCuiSDs+VBvrdc+BoQJ1q4lhv6i0qmenaIQJvw6ugWnJgC8MF/5tsbDY6Bw65YINnITPtx6AuCmicpXXXyb9bb2RcJKil4tXhFFidXfYgx7vWfVdNcxVLrN/iWcN7G3b/1flmUE/65jW1+E6zISHJg4Wu3qSyYcXO5KURNwUjZxybZvydlQMlGMR4uv9tzs/DgPVeXpxWjjURYCZylAmkD+neTr/i35ONScPPQ8/QFgdrQzzjNS3QAAAABJRU5ErkJggg%3D%3D";
  this.Tg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAQAAAAmqpm+AAAAAmJLR0QA/4ePzL8AAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfdBRUTLyj0mgAyAAAC8ElEQVRIx83Wz2ucZRAH8M+72c2mu91NmibFSEgaGy1SrRdFFFIJ9uDBk6KCN6EHD0qLB8GDFwXrQUEK7UnQP0DwUD23RVS8WG2EKrShDSpNYhLaNJtNNvs+HnbzY7fvLmmo2BneyzPzft+Z9zvPzEQngnsoKfdU0rH7Obrw38DNmbK4A4AOOUP2NsJNmdFtYAdwa0om3Ta0ScUt8wbldd01WBArKrihqLge3ax+RR12wnKkU4eqWYXNZPMiOy+ZSF5JWE82kxhZSqfH7Ddg0YwJ01bbEJIRb0YX7oDLOuo5nZg34HFHXXHeby3/Ye3ZgAtNX3vTiAVfm1SWlnPEU4ad800bWupwsWqT6W0j/vC52KCqorIv/eC4cVdbRBgLSAXBmrhBn/GwaaeMeNaoT72oYtjvPpPxsnSTd03XBEEqFtNgyHgSpzyCX2TRbcpVscvO2ufRRLgaRko92U1NO+hn01ZVZC3h9obtopKxBu91jTcvWdzAa0HkV3s8pMuKI9jtBbuUfWvOPw4lVmi8ldmtDg/gusixDcZGjYKzyspN3gnMVhscFgT9/vajPUqWjPlOTt6CuN4gk+CqNbg1lGW2GK6JjDrvKxNirxtTdFwa9Or1p+UEuLK15G5cNul5ObFRrCCug3FYr3PtmnvzfWDZBWlvmbRbpIeN5ljwGr5veSuC6NXANYUGQ94HBl1wpuG0x0f6RGa9o3wH2KL9rUbPktNWjHvfkF2ysorGndGPoM/Hulu1qlcC15uigwe94QmRvyzggC6RgEgQuewTt5qiG24HR9ZBTzskI+WGn8x5F0GEYMKHCXBtBuOKSy41nLznpKjefw8nlnECs63lipOW6y+uJDKbgrRom3rRaRWR4IsmS60yo5cCN6knsR0pKCqbb8gqiGqDEfrM6Ng23GLCthDbp7L+72I9dxVf81ikRywINWYrcnJuJtT6dnaUjG5BqdY+a4clGXtldwAXqyipNG9Qq22G8v+2Lt7f2+e/O1kvzGyGcjEAAAAASUVORK5CYII%3D";
  this.di = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAQAAAAmqpm+AAAAAmJLR0QA/4ePzL8AAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfdBRUTOjTXLrppAAAC50lEQVRIx83WT2hcVRTH8c+bvMnMxMSkKU2Fqv1DhQ7aItJWRZEgiAUrKqJuXAZRN2ahRRfd+A+6EtFFF4roTrC4K0pBFDQRIsVakSht1FoUUtoG2oyTTPKui3kmmcmbIQ4Vcu/unvu+75z7O/fcE40G13DkXNMRJ9azd+H/wV1wUqWj8LrdYmcj7pyzYps7wC2aNymkwDjBJWcVdMt3gEsUFU0ZMIhcEJyWVxQLHcxIrKjHpCDUgw0KIp2LEim4IvwbbFcmLKfoLmXbzPjDuHPm2gC7JCuVbU7nkic9poBpW93tKT/41LdtfAzLuGbfYm8om/axH1Xk9XnE/XY55sO2uFz2Ab+p7HvP+UKvoiGJIw7p9rh9bYXJBUHSNA/Y47zD9jhg2CeeUXOb0w7p9qz8qv31GQS5RELDHwqG8bJbLRpTQL8zTqk56SNb7M30i0RSLwGN/hXc7mt/mjOvxyyuLtm+cdXBFr4tXbKkQYoBkTGb3Ktozn3o9bySqndN+8vezAxNWim7FWd0GVlSbGd6I9/xt2pGHjQlSmjYcFGwxe/GbVBx0QNOGHSdy4KcXAtcnREvoKZrhWFKZLfPHfWdxEsY8rQF0G/Ir2oZuJqF7Gpc9bOH9UqUMYckhbHfJsfbVb+wyvVZx+UdNul6kQFsTC39RnCi5a0IWTg+M+UeLxgXvKrsQbDRB3pxVKk1LstwxeuqHvK2HXqUlAw46JgbEGz2vg2tKssTgQnFVYabjbpT5DeXsEspLWKRIHLKK2aaTnxfOxxFuw27Q7ec87407QiCCMGE0Qxcm4exasJEw8qI90RpudzfukCtdfzkRZX0w2prKdbeCox5zbxI8FZmOxEHlCyuGfiVRw2ouLDqpANi2OGX9EzWMmaaNK0Hun35VhRtl/sPwOZXjBv1LL+zNYP6TJntqEeJ3aQ/7W/i+mJF3jZ9GUEsqKXa58Qr2o58Gk1FVbTULC3l3Twur7d2cX13n/8ANgFb4QoS+/QAAAAASUVORK5CYII%3D";
  this.Ug = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAQAAAAmqpm+AAAAAmJLR0QA/4ePzL8AAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfdBRUTMCbeeCOrAAAC4ElEQVRIx83Wz2tcVRQH8M+bzGTixJmkaSNGSmpqtUi1LlREQSXYrRtFXIrgogtFV4ILV11UwYUU6krQP0BwUV23Xai4abQRqlCDDVqa1CS00cmbzMy7LuZHZqZvxnao2Ht4MLxz5vu+937PPedE7wS3cWXc1pVN3Mnswn8Dt2bZ5hAAIwpm7e6GW7ZqwswQcDVlS/4yuyPFdev2Gjd2y2BBoqToipJSi91V00pGDKNyZNSIuquKO5sdFxk+ZSLjykJrs7lUZhmjHnG/GZtWLVqxPUCQnGSHXbgBLu+I541i3YxHHXHRGT/1PcPG04YLPV87as6GLy2JZRU850n7nPbVAFmacIl6j+stc37xqcRedSWxz33rbfN+7cMwEZAJgpqky572oBUnzHlG1oQpVfv97GM5L8v2RDesJgitEpB0ndoTOOEh/KCo4rJ1cMEpL3rYQh9+zRKQqHdY1kHnrNhWlbeprNr2LSh7tiu6ZcnOJUu62BVFfrTLfmMqHZxjX1vzp0OpGZp0KtsZcC8uibzRVixq/jolFvdEpyhb7wrYEEy77Du7mrlOomijfTppcPUGXA2xXIfjN5EDzvjCokRO1ai4WWenTPndVgpcrJZejWNLXlCQONBkst0OO2zK6UHFvfc+sOWsrDctuVskkmmfXdGr+KbvrQhpcJy17HGvOddM8UbEpA8VcKxPXQxCeuv520kV89436y55eSXzPjGNYI8PTPQrVa8ELine4LjP6x4T+cMGHjAmEhAJIhd85HpX/KZ9g+DIO+gph+RkXPG9Ne+2szBYdCwFbkBjrDjvfNeb9xxvyhI5nJrGqVL0Wxcdt9X8Y6W/FFnRTdqCk6oiwWc9nmyD9UuBa7Rz699XUUlsvWtXQdRojLDHqpGbhttMmRYS96i2zi4xeUv8etsik5JGNQ6oKii4Jh5qRsmZEJQb5bPxsixnt/wQcImqsmrvBLU9oCn/b+PinT19/gPF4yPjYMxK2QAAAABJRU5ErkJggg%3D%3D";
  this.ei = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAQAAAAmqpm+AAAAAmJLR0QA/4ePzL8AAAAJcEhZcwAACxMAAAsTAQCanBgAAAAHdElNRQfdBRUUAAI4cucMAAAC30lEQVRIx83WT2hcVRTH8c97eTN5E5M2TWkq+Kd/UGjQFpG2KroorgpWVETducpCV2YhRRdd+Qe6EtFFF4rozkVxVxRBFGoiRIpakfinUWtRSGkbrB2nM5l3XeR1kkzejHGokHM3j3fe+3LOPb977okmgutosetqSWY9Rxf+H9x5p1R7Sq/sdretxJ11RmJrD7imuhkhByYZLjqjX1mpB1wmlZo1bARxEJxWkkqEHlYkkRowIwiLyQb9Ir0XJdLvsnAt2b5CWCx1rzHbzfvNlLOudgH2yZZXtl3OFU96TD/mbHOfp3zjA190iTEs4dpjS7xizJz3fauqZMgjHrTLce92xcXFG/yqMV951icGpUZljjqs7HH7uhYmDoKsbR20xzlH7HEQIwY03Om0w8qeUVr1/eIKwrUWsDzZ1AG84A5NkzJ/qmmCU97ztL1OdlBg3gJWxtfvLif97qq6AU1NCy3f5/5yqENsrUOWrYhuWGTSFg9IW9L40Qaj3jTnD3sLFZp1quw2/KTPeKtiUf70hr/VCnTQJpSw4oMLgpv8asomVRdsRnCDS4JY3AG3yEgW0NC3zDErsttHjvlSJlUXW8h9G436WaMA17BQ3I1rvvewQZkx1GQtGPttcaJb9wurQr/ihJIjZmwQicXKrdjG8XHHUxGKcHxo1v2eM5VLqA42e8cgjql0xhU5LntZzUNet9OAiophhxx3I4Kt3rapU2d5IjAtXeW41YR7RH5xEbtU8iYWCSJfe9F8247v64YjtdsBdyuLnfOpOUdbKgymTRTgulyMNdOmV7wZ91Yu6cj+zg1qrfad51XzH2udS7H2UWDSS+oiwWuF40QSUMkb0FrsM48aVnV+1U4HJLDTD61j/u8231bTxUR3LJ2K1A7xfwC232LcbGDpnm0YMWTWlZ5mlMQtNubzTbL4sqpku6GCJBY08trHkmVjRynPpqomag1LLd3VcWm9jYvre/r8BzXJTgadvkYEAAAAAElFTkSuQmCC";
  this.Ng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAAAAACpyA7pAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wGGgcqC+Q6N4oAAAF8SURBVDjLrZRBThRREIa/mq5WmJGBZJgFRjFx4cJ4AY/hhgvIAUyUW8DGtV6AAxjvoSsXJqILI2qiSDOZ6a7fxYOB0N1Om8zbvaov/19VqZQ9o9PrdcPwWLKe/oP7cXTSCmT97dE5d/RtfauVK4uPf7bBg98/7wxW2jDFcO3rcIiL4/Ewa+/abmTV8RouGFjAg6ebdej76w9gg0J4kGcB7K6807Uhhd3ffQFkeeACBTB6v1/X23sUgFDi0gwba0xB4SKqFKqauAoghIsyWKBXCo+5dgOn81zgdPEFF7FQL9XXwVe4qBb2UQkvmeQpctZEnQFMyiXvs65w04b89JKbx8YPM7+2ytW47nu487JB8LCm9+rL3VJQygBkDuaf39b04k3HPswg/Pm9U4DBp4OyN9/M5Ot28cHs8a30uW0mIKUcXKzKLlt80uTaFz3YXHSKYgQ9KTawf1DGRkguZv3+r0n7fcnXVYADRT662W46K2YX85tOl3Ynl31P/wJHQa4shXXBLAAAAABJRU5ErkJggg%3D%3D";
  this.Vh = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAAAAACpyA7pAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wGGgghCwySqXwAAAGGSURBVDjLrZS/ThRRFMZ/d+YMO26yamgWEzdxFRsbqaTlGXgEnoAHwG20puABaC1MfA5jYWJsaBaNjQUJFIQJ2TtzP4sZdgh7B5dkb3XvmV++b86fHLfPUidZDsPCivX0AO7se9FtuPZ6s+H+TG3YyVWzE22CBc6nvbWskwt5fvp0nUT6meWmzuMs759IJtRzgrfvny2K/f3wA1zvUlggdQIm/a+6U6Tg3kx2AZeGOt8AbHyLdPDoXd0GYYKmhNFKquVU312EczUnYSI02iGmFgCCsLCMb8BaoejkhAY2EZp/VUxNN74PzvceTsJKfFpHfIzyAL5c8TzrFjeLfJ+13Dw23ErvTKuvhou+x3ufIoLHC3qHv8deUAYHoMTAZb++LOhVn5fMI3FQZR9fXQIMpgc+bVsvbL4S6o7vPK5fI1HdXhomHrUByu2YbS4SePm/UmsMiZSPE3cP5Xjel0z49cHpVfd+sdGTAgwosheDuUfpBYllAJmD4toVN/WbcbGqPbnqffoPyHTE/GI3wZEAAAAASUVORK5CYII%3D";
  this.Pg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAAAAACpyA7pAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wGGgcqK99UF0IAAAGmSURBVDjLrZTNahRREIW/un3bnx4zCYwuBAk+hb2ZbV7BB3AhZlAQRN9EEBGXQQJBfArXvoCLWYnBgEbGIdNdx0WmTd/uGY0wtbunT9epOrfq2lMuFeFyNKJvOJ/+g/dterqWkBW7oyVv+nX79lpeNfv8cxei8+PkzuBa8s0uipEPt74Mh0RxfGuYdbu+O20Qu5LVx1sEiYF5J/b2WwcbIEUn72Ur759U7VZyJwrkaW3lI07bkNA5r+WhOeUEQiohovA6yTae4KGNgYsoquTf8QQFSLBKRE+x8jFClvJwIolu+QxhoFQXovA/lureCzz0853X12BZPX5OnS2vq99vvcSC3wCTNVIXUYtYMc8b3aPqSXAD8F9t3rzqzPOHl4Rlwr/Ms+B92LcVEy5C+9Iwjt5g9DJKqa6Md28x/+ceyXTAg7BCt4sYB687tqzcS5kOeVjQ97mnweFoL+1aRIjd9kyvPsX24EeI4nrXWZk+JudCBLjpfeksGZcRBMl3+sa2V4Edl6JYFMX3+fr3Jd/WDCIwy0dX1/J8MVs0/p2dbeyd3PR7+hsfn9edOMpPUgAAAABJRU5ErkJggg%3D%3D";
  this.Xh = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAAAAACpyA7pAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wGGgghLkeWfTsAAAGuSURBVDjLrZQ/axRRFMV/983b7BiMSgptFIxE8GOILkgaaz+Eha2FRfwL8Q9pg2ih6Mewt7FJkyYp7EQwpHCQnZl7LOIu897Okgj7qnl3zpxzz713rj3gVCecDkb0BfPpP3A/v1XzBZeur//Dfd+Pl+bi2vGe1iE6v/aHS4PknXWS8bI8uLBKkHYHZVRyXDfC5NliubwnBUlDU3buPetcbDiWolNY7nl0/0fTTaPwY7+e5jZ6zFFafhEFXbrgjJ5C0CxOnZi1bGziQQlOIgpPNDY28YCSmIvoqe7tJ7jJSHWdSPLtrS3cLLOGIArX1MPN13gQOZ8nfov2zhZNnGQ+36/OQZBNpFK/DXVxfKvtkx6FtgBQ3cXVTTbPn59TuJ00z4KP9jD0AEVaeePDm2mKSYKproy324S2Z/yzTgZ2tilO4gMP7LzM2tHDB268f8XZnG/2/xW8u3g3ZA2OPSvB9OJr4enSiOJMbk+mL0mgFAGu9UgnjrUGQSrXwkxh227tLy9LUdSrKwe/5++XeOV8BRGoBldXphpNLQhxADAwqP5YNZmDMYeL2pOL3qd/AZpy8NOvjvTnAAAAAElFTkSuQmCC";
  this.Og = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAAAAACpyA7pAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wGGgcrBRqZK8wAAAE8SURBVDjLrZTNSsRAEIRrfuJPwmYXogdB9mmy7+P7iIgIIoKIL+RhT+Ki4A8hbJIuD+qaSWbWCKnTUPmopjM9rU4wSHoYBisj5/Ef3PPyPQiYeJ59c8un6VGQq4uHjzlgBW8vx8leCKOkk8c0hSVWh6kJd612TLOaQJNIlPzqVLpSCUgtEpm2i7MeaCIRTYIOh/MuR5AeDhd+Tpq2AOCycSWkJmvp5AFXbmBNahH0OVy7nogG+nUB3Dh1AU2KJw+4dTqhJuHlcNfySE02fg73G68hbY0y8t9svjmV9ZZ5zofNs4MxyLlpDNXNh72jLhbIy4e9yz7m7cOTRljAKsdbqH5RwBL7bH9ZeNJiQgMHf60iyb7maga1hVKYCWmJKo5fy/B+iaYsAAugiLLdcNGqqH7+33o92p4ce59+Av+enpsD10kAAAAAAElFTkSuQmCC";
  this.Wh = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAAAAACpyA7pAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wGGggiBLcA5y4AAAE5SURBVDjLrZS7TsNAEEWPN+vERIpAaWhAIigU7vkwPhIQRDxFkyYpaJGgwkJxmEsRiPzaxEi5lTU6vuNZz97oglZy7TC87dhP/+DeHrJww+7Z+Jd7nfnDIPe9mGoM3nif9bpxkLMkmR8McdJLnHgFFfmkP5WcpF5UqF/Wyd5CcmadIiau6mDHzElgBcG1VQSSkyi9DNxUDVecqhy39XG8sPovnpyXz0Y4s1pf4K5cM3OgykcDcF+sCZxkDX7wWKhZ87wrPW2fd6Xn0rxL8k7zBqTrp3y5YZ/TdvtcwhTkym4K9U3b3aMqFvBL293LOtY4R4ObcLVISBtDw0l72zASycHptujQCJyUjFy0gYo46kte5MPB/DOcL/54PwMPZPHJYN1jmQucjwHiCLKvKPs7vwUfu8rJXefpD93iniqiS4VUAAAAAElFTkSuQmCC";
  this.Mg = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAAAAACpyA7pAAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wGGgcrJ8/5aigAAAJ5SURBVDjLrZTfSxRRFMe/d+aOq2v7I9fV/JEEYWVaGZrgQ2DYQ0HQW73ZSw+BPgRBUA9FPvUiRC+Bf0AQRBGR1ENEoWgERmhgij/a1owkdXSb3WZnzulhZnZHc8vA83bnfO73fO+dc4+4jC2FsjUMkrZZj/+D+5FYKwiowbqYyyW+R6oKcpYxk6oDJGF1qba0uBDGFA59C4chGYvxsFr41KJItRdDkAyUCgcTjHjTgZpUYvzTLz9ZajAkQcupBc6eBi9V13d+fjjuP4pGkAwwOWqip0l/MqWrFR3tV+6/8HkEQz2KVDE70dM8evvr3ob65YHJ9iOJefYCmR2QDLKdbZ1tk30nLmhiNpr60He1a0LPCRJDMizHXuA47rZdxNSDjwBGn5459CZ/hwyFCERERPH64XQXZm6NkWCiYdFOuQCRhFe3TLyL76Q7GcAGkEg02/m6gGSQU7cCC5oYTLopw2Da4A/OhxVEl3nMS6pSIf/NKMy2Y2Kem5LC8ixV1c7m/dnM0kJGAwDMfTnV/2hX2lVoKX6ezsllLF8/rw2o3ffeB5xF9XkeXd+GjVhxc3Otx4qeOYeM91aKfa+zwoXMqI8T2bGO1sbln4pWefJ6FYvylsFMnhPnMBfyxHd3t4iFJWW/wmABTF1zf93aHqgHoQc8bvXltFldFpp+/KpNQlC8wW0aMwK5vsuHhkoETAt6r2JJPux7v7zhYaYNwwJGbtiqLfL7+Q/OjZGbpsL9eU4CUmwGvr1Uo0+4GQlIRglvCiaTObUgQwHK/zWKKAYozBSF+AslECVmycgGg3qm8HzRImwAEoChxQKFi2aNrDevTHPb5uR2z9PfLQs68f4FXIYAAAAASUVORK5CYII%3D";
  this.Uh = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACcAAAAnCAQAAAAmqpm+AAAAAXNSR0IArs4c6QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wGGggiGzoI6tsAAALsSURBVEjHzdZNaBxlGAfw3+xOspvFYK2WSlvTpih40IJgP9RDIQcFEQLB6kFykUIvUj9zCR4KiiCItCB6UqEXDyqePAgpRhCtaSmYYonFJsGepHXrRzfE7mZeDztJZzezoV0r5HlPM++8//n/n6/3iV4KbqEV3FKLE+uZXfh/4C45Y6Ereb3uc28r3K8uiG3uAm7JNTNCChgnqLqgpFdPF3CJsrJZG2xEIQjO6lEWC12sSKysYkYQmmKDkkg2KM2nLfZ5yE5/Oe8HZyx2YBgp+VtYFltsAyPo87znEPzmTrs87bz3TXUELEqykU1amBW8Za/ffWRaVWyrYU846phPOnoxLPtOizcSwZv2+MazTtjhKSNKjjhsyYv2d/ChrO9apY4YMm3MsNf0iszY5KqTXnXUmB9Vc7mFZbGJbOX2eRLjhozjrA+cSne+ddyovb7MTZiAQhMqS3uLB01Y8ArOOWRKUEi/mRB5vIPYRCJuEs2y2ywyaZtNlryeJsfy/qxfPCLpEIgVsVnfbcVFJZGvzLUdqqmtHM0TmyZK9oMruMtlwelVB4tiBWHtRGld84Ld5kUaq/YGDPp5jZKLG6grZv4yb9YB7zpuQL2NwX4VX6x6C3WN/G78p88UjXvbSeWWnQEHBd+v1f1Cjic+dc6wl33XUvR3O+Y2kTf0I8pN5By4gpoxVQd96FEbVFRsN+pz9wvY5WN35JAIguiZwFSbKBg07jGRiy4reiCNZ0hZ/eRQW6kt2oPoQOBUDhwFQ4bsU8KcE/5wRK8g0hA7bbQNbjfNqujUtidMqIhEFjVwxXuKGmKJh288FFlbUHNVA0x6QUNRI/d67hCKtWzSYf8oCt7JhYtvdhT42ojtqqZzx4k4oM/STQDOrWoMUG7WLOz0X0eLYPB6KMoGFXLy/MYswjaV63dF3Ub9ZtW6mlFi97g9nW/i5XTosUN/joiGeuqKgjgzdvSkahYsilaGpZV79lraONfVuLi+p89/AdAUWQEn4HTQAAAAAElFTkSuQmCC";
  this.nn = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAXlJREFUeNrsmT1Ow0AYRG1ER8glkCioyQk4ARIF9OEA3IeeBnEDJH4qkh4JRXAB6AgtZgxLg2SPKSx7d9+TRoqcr7BeNt7spKyqqoBmNlCAIAQhCEEIQhCCEAQIQlCagibKmXKvvCmvyl24tjX0zZUDH1Z3lAtl1vD+QjlRXnIUNFWulX0zt1QOlPfcvmLzDnKKsLrmOT6DjnqaTUbQbk+zyQiKosocUtDqH7NPOQq67Gk2mW1+O2zzMzO3CNv8OrcVVP+uOQ4CmngIM+scV9Av9XHiVDlU9sK1R+VKOVc+cj5q/F3Nk/C6XjGfY7ipkj8Ox3+aRxCCEmZzZB/W6B7SY2oUb4ufYuxZuSloFL+hUWyBRtFAo2igUTTQKBpoFA00igYaRQONooFGsSM0ijEfVmkUIzjNIwhBCUOjGMEKolFsgUaxBRpFA42igUbRQKNooFE00CgaaBQNNIoGGsWO0CjGDHUHghCEIAQhCEEIQhAgCEE98CXAAHw9kRr/el3HAAAAAElFTkSuQmCC";
  this.ln = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEgAAABICAYAAABV7bNHAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAbtJREFUeNrs20tKxEAQgOFEZyu6EA/gEbyYex+kwMfei3kEDyAudB+J3Rg3wmBM18vxLyiyGSbVH10d0k36aZo6YnvsQQAQQAABBBBAAP3T2Dje66jk43xtideSZ/N1p4D6ksclDxRq7ne1xcYk/8EaBBBAAAEEEEAEQAABBBBAAAHk/Rbu9kbfuh90Mhe75Hi2bpRp7ON87SttFv62/u559c0aj57PS96UfF+AVIs9VECq93lbeL/9ktclH6KAatyWvEy6hNyVvIpeg2oBkhBHWnE+52uZQUopU54QrXFpAmVBEs0xaQPVHAJxBu3xWABFzSSxGIsVkDeSWI3DEsir3QbLMVgDWc8ksa7fA8gKSTxq9wLSbrfBq25PIK2ZJJ41ewO1Iol3vRFAa9ttiKg1Cui3M0mi6owEWookkTVGA/3UbkN0fRmAts0kyVBbFqDvSJKlLo0tV824n68XWQrKBsTBIUAAAUQoHj1rHSdbRn0Krf6uo/Up9tS1f5xiHRXnNGoGaXyckrpLWtegscsfYyQQTzHjFk3fYq0DfPkDbdb0ZSLvYqxBAAEEEEAAAQQQARBAAPnHhwADADsGwOIWz5onAAAAAElFTkSuQmCC";
  this.hg = "data:image/gif;base64,R0lGODlhAwAVAIABAJmZmf///yH5BAEKAAEALAAAAAADABUAAAINRBynaaje0pORrWnhKQA7";
  this.Ip = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAANCAYAAAB/9ZQ7AAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA3XAAAN1wFCKJt4AAAAB3RJTUUH3QkaAjcFsynwDgAAAMxJREFUKM+9kLEuRQEQRGeuV5FIJApBQZ5EReFP/IBCBIVvpFT4BR9AR+29cxTukyvRaEyzmd3Jzu4kI4Ad9d4JANVLdS1JhvwB/yBuu0jiL5pl22WSzNRBPVE3225MVW2TZA84bfsWYFDvgNX30zQY6wtwmCRRo96qy9V8Et2zevDjMKDqFfA+2fykzr9F6o16vnIALtRX4AE4GvtbwHVGq8epi3qm7k74HFjMRrINnLdd/6KS5FgdkpBkv206DkzykaSTbWkbdUyxs094zOEo59nhUAAAAABJRU5ErkJggg%3D%3D";
  this.Mp = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAANCAYAAACZ3F9/AAAAAXNSR0IArs4c6QAAAAZiS0dEAFEAUQBRjSJ44QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wCCgAwB/13ZqAAAADXSURBVCjPhZIxTkMxEETf2F9I0EaCI9DRUZEL0XINbpMzQJ2eG1DQpvszNDbyN4kylde7O+PxLgxIckgS2+mw3ePDWFumxrPnc/GmURKXMOfKXDAzX8LcWEfmTtLu6li42O4SD8ARuAHW6RVV0tH2PfANsAyMT8A7cJo9JSHJHfAsiSSoKa6S6jWfjWxNUrtiAbKtUQaSLh+gSEppSf3/3I1qBmIl0ejxC3BnHz02X2lTeASgr5ft3bXZ2d71NVyA1yS3pZSfJB/AS5I/xWGWn5L2tt+A0y9ldpXCCID4IwAAAABJRU5ErkJggg%3D%3D";
  this.am = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gIDABU3A51oagAAAIpJREFUOMulk9ENgCAMRKkTOAqjMIKj6CSOghs4gm7gCM+fGgmCsXJJP0i4cj16zhkBjNwYreSeDJ1rhLVByM6TRf6gqgf3w7g6GTi0fGJUTHxaX19W8oVNK8f6RaYHZiqo8aTQqHhZROTrNy4VhcGybamJMRltBvpfGwcENXxryYJvzcLemp1HnE/SdAV9Q8z4YgAAAABJRU5ErkJggg%3D%3D";
  this.Hp = "data:image/png;base64,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%3D%3D";
  this.Pp = "data:image/png;base64,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%3D%3D";
  this.Kp = "data:image/gif;base64,R0lGODlhEAAPAKECAGZmZv///1FRUVFRUSH5BAEKAAIALAAAAAAQAA8AAAIrlI+pB7DYQAjtSTplTbdjB2Wixk3myDTnCnqr2b4vKFxyBtnsouP8/AgaCgA7";
  this.Lp = "data:image/gif;base64,R0lGODlhDQANAIABAP///1FRUSH5BAEHAAEALAAAAAANAA0AAAIXjG+Am8oH4mvyxWtvZdrl/U2QJ5Li+RQAOw%3D%3D";
  this.Np = "data:image/gif;base64,R0lGODlhDQANAIABAP///1FRUSH5BAEHAAEALAAAAAANAA0AAAIYjAOnC7ncnmpRIuoerpBabF2ZxH3hiSoFADs%3D";
  this.Qp = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAANCAYAAABy6+R8AAAAAXNSR0IArs4c6QAAAAZiS0dEAFEAUQBRjSJ44QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wCCgEMO6ApCe8AAAFISURBVCjPfZJBi49hFMV/521MUYxEsSGWDDWkFKbkA/gAajaytPIFLKx8BVkodjP5AINGU0xZKAslC3Ys2NjP+VnM++rfPzmb23065z6de27aDsMwVD0C3AfOAYeB38BP9fEwDO/aMgwDAAFQDwKbwC9gZxScUM8Al5M8SPJ0Eu5JYV0FeAZcBFaAxSSPkjwHnrQ9Pf1E22XVsX5s+1m9o54cB9J2q+361KM+VN+ot9uqrjIH9VJbpz7qOvAeuAIcSnJzThA1SXaTBGAAvgCrwEvg0yxRXUhikrOjZ1RQz7uHFfUu/4C60fb16G9hetxq+1a9Pkdears2Dt1Rj87mdAx4BfwAttWvSQ4AV9W1aYlJtoFbmQJTjwP3gAvAIlDgG7CsXvu7uWQzs+cxmj0F7Fd3k3wfuRvqDWAfM+HxP6hL6oe2tn3xB7408HFbpc41AAAAAElFTkSuQmCC";
  this.Jp = "data:image/png;base64,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%3D%3D";
  this.Op = "data:image/gif;base64,R0lGODlhEAAPAIABAP///1FRUSH5BAEKAAEALAAAAAAQAA8AAAIkjI+pi+DhgJGMnrfsxEnDqHgRN3WjJp5Wel6mVzbsR8HMjScFADs%3D";
  this.$l = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NDJBOEJGMUEyN0IyMTFFMTlFOTNFMjNDNDUxOUFGMTciIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NDJBOEJGMUIyN0IyMTFFMTlFOTNFMjNDNDUxOUFGMTciPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo0MkE4QkYxODI3QjIxMUUxOUU5M0UyM0M0NTE5QUYxNyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo0MkE4QkYxOTI3QjIxMUUxOUU5M0UyM0M0NTE5QUYxNyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PrESQzQAAAF3SURBVHjaYvz//z8DPQATA53A8LOIkRLNNpaWAkCqHogVgBjEbjxy/PgBbGpZKLRkPxAbQIUuAPEHXOqZsRhwX05WVhCIHzx68gSnRqB8O5AKQBKSAGIPoPhFoL4HBIMOaNF5JFcuAOKF6MEBVOMA9Q0ukAjUs4BQYkhECoIEkIFAg/dDDYeBfAIh2w9Ur0BMqkMPMgeohfOhBgQQsAiWSPAGHcig+3gMeQBNZYTAA2jogCy1Z8SRokAung9VRCkAWRiIK+guQBVQCj5AzalnITKOyAWg1HoQlHoZCWRIUBD2kxmEG4BJPJBgWQdUBPM2ufG0EaVkALkcmJN/YFMJyuHAnM4IzcAcpAQZ0KGF6PkoAGhZAzSosAUfP4m+AoVEINYiCGQRNLeDIu8iVE6fiIyJzRJHoG8u4CzrgJYlUBDxsBQWCI1b/PURtFSoh5ZxxIIL0HpoA8kVH1J55g9NCAJowXMBmj82YAsmrBaNtoIGvUUAAQYApBd2hzrzVVQAAAAASUVORK5CYII%3D";
  this.Xl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NDJBOEJGMUUyN0IyMTFFMTlFOTNFMjNDNDUxOUFGMTciIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NDJBOEJGMUYyN0IyMTFFMTlFOTNFMjNDNDUxOUFGMTciPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo0MkE4QkYxQzI3QjIxMUUxOUU5M0UyM0M0NTE5QUYxNyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo0MkE4QkYxRDI3QjIxMUUxOUU5M0UyM0M0NTE5QUYxNyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Pj8crNUAAAFxSURBVHjavFbNbYMwGDU0A7BA2oxAj5EqlU7QZgKSY4+ZgDJBmgmAY09JN8ihUo7NBqVVBmCD9H3qc4UsnCBi8qQnGwN+fL/GU8TdePyCIQZHyg1KsPjYbmVf5VEkwzBV/SCH2MyjJYnqF6lPd/WN2HcYk2O4hMYfJEaHSwj5l7JocOTeBgzAd84j8J6jM6E5U16EQq69go8uXZeDO4po6DpLXQoVYNWwHlrWOwuFaBk79qomMRseyNbpLQK34BOYca1i3BaGS/+Bj9N989A2GaSKv8AlNw8Ys1WvBStfimfEZZ82K2yo732yYPHwlDGbnZMMTRbJZmvOA+06iM1tlnWJUcXMyYwMi7BBxHt5l0PSdF1qdAMztSUTv120oNJSP6rmyvhU4NtYlNB9TYHfsKmOulpU1l7WwZYamtQ69Q3nXU/KcsDelhgFu3B8HBU6JVcMdB9YI/UnVzL72e/frodDj9YEDn8glxB5lotfAQYAtCJqk8z+2M8AAAAASUVORK5CYII%3D";
  this.Yl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6Q0FBOEM3Q0EyOTQ4MTFFMUFDMjBDMDlDMDQxRTYzMzkiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6Q0FBOEM3Q0IyOTQ4MTFFMUFDMjBDMDlDMDQxRTYzMzkiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpBMENEMDM3NTI5NDgxMUUxQUMyMEMwOUMwNDFFNjMzOSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpBMENEMDM3NjI5NDgxMUUxQUMyMEMwOUMwNDFFNjMzOSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Ptz3FgYAAAErSURBVHjaYmQAAhtLSwEgVQ/ECUAMYlMDfADiBUDceOT48Q+MUEv2A7EBA23ABSB2ZJaTlW0HMgIYaAckgJiDCRpctAYJLFjiBBS2E4GYn4pxJsCCRdAQGHkPoIlkIzT+KAZM6L6BWQICQPYBaoUdukUCQF/A4wzILqCWRaDk/R9HkmSgZpJnwiFuQKIlFwgpwEgMwHhhRObDfIxDvBAoPgFJDBTs/dhSKhMFoZGIbAnUMaAixxGaRahjEchQoA8MgNgBTfwCtIyjjkVAC0BBdB6Uz4Bs9Ly2kZpBh5z0HQglDiZaFGygaoEuFpGSj0YtGoEWgUrv91Rs+eBsETFhKy5oABaALGokppinsLnVyPzoyZMfwCbXSlCTCIg1oDS1GpAzoKX8B4AAAwAuBFgKFwVWUgAAAABJRU5ErkJggg%3D%3D";
  this.Zl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH3gEfAAUcuIwRjAAAAVpJREFUSMftlrtKA0EUhr9ZFkEMCCpYCb6AIGJzdF7AUhRsREF9AQmCl1IhgpjGwkohb+Ab2Ew4ldZik8pOVOy8kNhMYAhBd5PZVB5Y2BnO8O3M/5+zYwCsyA6wD0wALeKEAZ6BY6daM1ZkA6hRbGwmQJniYy8FRnMsePVHOwSUcqwbSfJo4lTHnOo4sJx3S0mOXA3eh4sEHVmRnkVKM+adONXbDutGBT0CW0613mX+FGgGc4f9gK6AehdTPAAH7bEVMX+BkgxOy+LGVr9Ht2ZFZoDrUCMrMusLvRlLozn/OCA0wxSwXpS9+4p/UDu+iwJ12vetKFAp7HNOVYE7P/wC7oFqjF634FSrQR3hVOfDBCuyHWNHK1ZkMYCEgEy6GSvSAKYzAs+BS+AJ+PD/pUlgCbj45cMbac6WX+71jpEALwMoo/cEqAwAVDFe0FXgzN9uYsYnsOtUb34AitxcDYrQdlwAAAAASUVORK5CYII%3D";
  this.Wl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAaCAYAAACpSkzOAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6NDJBOEJGMTYyN0IyMTFFMTlFOTNFMjNDNDUxOUFGMTciIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6NDJBOEJGMTcyN0IyMTFFMTlFOTNFMjNDNDUxOUFGMTciPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpDNTQyQTc3NTI3QjExMUUxOUU5M0UyM0M0NTE5QUYxNyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpDNTQyQTc3NjI3QjExMUUxOUU5M0UyM0M0NTE5QUYxNyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PkQAqvIAAADoSURBVHjaYmEAAhtLSwEgVQ/ECUAMYlMDfADiBUDceOT48Q+MUEv2A7EBA23ABSB2ZJaTlW0HMgIYaAckgJiDCRpctAYJTFSME3xAgIlCAw4AcSAoDoBYEBjpjCCMTSELJZYADXUkVjElPppIimIWCpMtHACzyXt88U22j4DB9gA9wmkVdCQBcixqxJaykFJcIb18JEAvi+SxCYIK1f9kJgZGtFT3f8gmhlGLRi2i3KIPdLDnAwu0SVRAqk4SM/oCkI8a0esWGjS3GpkfPXnyA9jkWglqEgGxBpSmVgNyBhAnghqQAAEGADc+O4K5UN0FAAAAAElFTkSuQmCC";
  this.O = f.O;
  this.F.bc = -1;
  this.gf = !0;
  this.jb = new ya;
  this.Ac = new za;
  this.jo = new Aa;
  this.qn = new Ba;
  this.Vp = new Ca;
  this.rn = function() {};
  this.wn = function(c) {
    var d = this;
    d.Ia = c;
    d.O.ab = "FlipView" == d.F.H;
    if (!d.O.document.DisableOverflow) {
      d.Oa = d.F.Rb ? jQuery("#" + d.Ia).wrap("<div id='" + d.Ia + "_wrap' style='" + (d.O.ab ? "position:absolute;z-index:50;" : "") + "opacity:0;text-align:center;width:100%;position:absolute;z-index:100;top:-70px'></div>").parent() : jQuery("#" + d.Ia).wrap("<div id='" + d.Ia + "_wrap' style='" + (d.O.ab ? "position:absolute;z-index:50;" : "") + "opacity:0;text-align:center;width:100%;'></div>").parent();
      jQuery("#" + d.Ia).css("visibility", "hidden");
      c = d.O;
      var h;
      if (!(h = d.O.config.document.PreviewMode)) {
        var f;
        try {
          f = window.self !== window.top;
        } catch (k) {
          f = !0;
        }
        h = f && d.O.ld() && 600 > d.O.ld() && !d.O.Wb && !FLOWPAPER.getLocationHashParameter("DisablePreview");
      }
      c.PreviewMode = h;
      null != d.O.config.document.UIConfig ? d.dl(null != d.O.config.document.UIConfig ? d.O.config.document.UIConfig : "UI_Zine.xml", function() {
        d.Kg = !0;
        d.F.Wg && d.F.Wg();
      }) : d.Vj();
      d.O.PreviewMode && (d.Qk(), d.ih());
      eb.platform.touchonlydevice && d.Oa.append(String.format('<div class="flowpaper_toolbarios toolbarMore" style="visibility:hidden;z-index: 200;overflow: hidden;padding-top: 4px;padding-bottom: 3px;height: 38px;margin-right: 100px;display: block;margin-top: -6px;background-color: rgb(85, 85, 85);"></div>'));
    }
  };
  this.dl = function(c, d) {
    var h = this;
    jQuery.ajax({
      type: "GET",
      url: c,
      dataType: "xml",
      error: function() {
        h.Vj();
      },
      success: function(c) {
        h.Wc = c;
        c = eb.platform.touchonlydevice ? "mobile" : "desktop";
        !eb.platform.lb && eb.platform.touchonlydevice && 0 < jQuery(h.Wc).find("tablet").length && (c = "tablet");
        toolbar_el = jQuery(h.Wc).find(c).find("toolbar");
        var e = jQuery(h.Wc).find(c).find("general");
        h.readOnly = "true" == jQuery(e).attr("ReadOnly");
        h.backgroundColor = jQuery(e).attr("backgroundColor");
        h.linkColor = null != jQuery(e).attr("linkColor") ? jQuery(e).attr("linkColor") : "#72e6ff";
        h.O.linkColor = h.linkColor;
        h.Ic = null != jQuery(e).attr("linkAlpha") ? jQuery(e).attr("linkAlpha") : 0.4;
        h.O.Ic = h.Ic;
        h.yf = null != jQuery(e).attr("arrowSize") ? jQuery(e).attr("arrowSize") : 22;
        h.O.yf = h.yf;
        h.backgroundImage = jQuery(e).attr("backgroundImage");
        h.uj = null == jQuery(e).attr("stretchBackgroundImage") || null != jQuery(e).attr("stretchBackgroundImage") && "true" == jQuery(e).attr("stretchBackgroundImage");
        h.F.Qe = null == jQuery(e).attr("enablePageShadows") || null != jQuery(e).attr("enablePageShadows") && "true" == jQuery(e).attr("enablePageShadows");
        h.Ba = ("true" == jQuery(e).attr("forceSinglePage") || (eb.platform.lb || eb.platform.ios || eb.platform.android) && eb.browser.mh || h.F.Te || h.uq) && !(h.O.PreviewMode && !eb.browser.mh);
        h.kb = jQuery(e).attr("panelColor");
        h.ob = null != jQuery(e).attr("arrowColor") ? jQuery(e).attr("arrowColor") : "#AAAAAA";
        h.He = jQuery(e).attr("backgroundAlpha");
        h.ue = jQuery(e).attr("navPanelBackgroundAlpha");
        h.Ki = jQuery(e).attr("imageAssets");
        h.fb = !eb.platform.touchonlydevice && (null == jQuery(e).attr("enableFisheyeThumbnails") || jQuery(e).attr("enableFisheyeThumbnails") && "false" != jQuery(e).attr("enableFisheyeThumbnails")) && (!h.Ba || h.F.Te) && !h.F.config.document.RTLMode;
        h.gf = "false" != jQuery(e).attr("navPanelsVisible");
        h.pg = "false" != jQuery(e).attr("firstLastButtonsVisible");
        h.Gp = null != jQuery(e).attr("startWithTOCOpen") && "false" != jQuery(e).attr("startWithTOCOpen");
        h.uf = null != jQuery(e).attr("zoomDragMode") && "false" != jQuery(e).attr("zoomDragMode");
        h.Er = null != jQuery(e).attr("hideNavPanels") && "false" != jQuery(e).attr("hideNavPanels");
        h.zn = null != jQuery(e).attr("disableMouseWheel") && "false" != jQuery(e).attr("disableMouseWheel");
        h.mg = null != jQuery(e).attr("disableZoom") && "false" != jQuery(e).attr("disableZoom");
        h.sk = null != jQuery(e).attr("disableSharingURL") && "false" != jQuery(e).attr("disableSharingURL");
        h.Be = null != jQuery(e).attr("flipAnimation") ? jQuery(e).attr("flipAnimation") : "3D, Soft";
        h.Tc = null != jQuery(e).attr("flipSpeed") ? jQuery(e).attr("flipSpeed").toLowerCase() : "medium";
        h.tb = h.tb && !h.Ba;
        h.kn = null != jQuery(e).attr("bindBindNavigationKeys") && "false" != jQuery(e).attr("bindBindNavigationKeys");
        h.yi = null != jQuery(e).attr("flipSound") ? jQuery(e).attr("flipSound") : null;
        jQuery(h.toolbar.K).css("visibility", "hidden");
        if (h.backgroundImage) {
          FLOWPAPER.authenticated && (h.backgroundImage = FLOWPAPER.appendUrlParameter(h.backgroundImage, FLOWPAPER.authenticated.getParams())), h.uj ? (jQuery(h.O.L).css("background-color", ""), jQuery(h.O.L).css("background", ""), jQuery(h.O.N).css({
            background: "url('" + h.backgroundImage + "')",
            "background-size": "cover"
          }), jQuery(h.O.L).css("background-size", "cover")) : (jQuery(h.O.L).css("background", ""), jQuery(h.O.N).css({
            background: "url('" + h.backgroundImage + "')",
            "background-color": h.backgroundColor
          }), jQuery(h.O.L).css("background-size", ""), jQuery(h.O.L).css("background-position", "center"), jQuery(h.O.N).css("background-position", "center"), jQuery(h.O.L).css("background-repeat", "no-repeat"), jQuery(h.O.N).css("background-repeat", "no-repeat"));
        } else {
          if (h.backgroundColor && -1 == h.backgroundColor.indexOf("[")) {
            var f = R(h.backgroundColor),
              f = "rgba(" + f.r + "," + f.g + "," + f.b + "," + (null != h.He ? parseFloat(h.He) : 1) + ")";
            jQuery(h.O.L).css("background", f);
            jQuery(h.O.N).css("background", f);
            h.O.ab || jQuery(h.Oa).css("background", f);
          } else {
            if (h.backgroundColor && 0 <= h.backgroundColor.indexOf("[")) {
              var n = h.backgroundColor.split(",");
              n[0] = n[0].toString().replace("[", "");
              n[0] = n[0].toString().replace("]", "");
              n[0] = n[0].toString().replace(" ", "");
              n[1] = n[1].toString().replace("[", "");
              n[1] = n[1].toString().replace("]", "");
              n[1] = n[1].toString().replace(" ", "");
              f = n[0].toString().substring(0, n[0].toString().length);
              n = n[1].toString().substring(0, n[1].toString().length);
              jQuery(h.O.L).css("background", "");
              jQuery(h.O.N).css({
                background: "linear-gradient(" + f + ", " + n + ")"
              });
              jQuery(h.O.N).css({
                background: "-webkit-linear-gradient(" + f + ", " + n + ")"
              });
              eb.browser.msie && 10 > eb.browser.version && (jQuery(h.O.L).css("filter", "progid:DXImageTransform.Microsoft.gradient(GradientType=0,startColorStr='" + f + "', endColorStr='" + n + "');"), jQuery(h.O.N).css("filter", "progid:DXImageTransform.Microsoft.gradient(GradientType=0,startColorStr='" + f + "', endColorStr='" + n + "');"));
            } else {
              jQuery(h.O.N).css("background-color", "#222222");
            }
          }
        }
        h.Yj();
        jQuery(h.toolbar.K).children().css("display", "none");
        h.Zh = h.ea;
        h.$h = h.ea;
        h.Th = h.ea;
        h.Lg = h.ea;
        h.Qg = h.ea;
        h.bi = h.ea;
        h.Rg = h.ea;
        h.ci = h.ea;
        h.Tg = h.ea;
        h.di = h.ea;
        h.Ug = h.ea;
        h.ei = h.ea;
        h.Ng = h.ea;
        h.Vh = h.ea;
        h.Pg = h.ea;
        h.Xh = h.ea;
        h.Og = h.ea;
        h.Wh = h.ea;
        h.Mg = h.ea;
        h.Uh = h.ea;
        var q = "",
          t = null,
          f = 0;
        jQuery(toolbar_el).attr("visible") && "false" == jQuery(toolbar_el).attr("visible") ? h.rf = !1 : h.rf = !0;
        !jQuery(toolbar_el).attr("width") || null != jQuery(toolbar_el).attr("width") && 0 <= jQuery(toolbar_el).attr("width").indexOf("%") ? jQuery(h.toolbar.K).css("width", null) : jQuery(toolbar_el).attr("width") && jQuery(h.toolbar.K).css("width", parseInt(jQuery(toolbar_el).attr("width")) + 60 + "px");
        jQuery(toolbar_el).attr("backgroundColor") && (jQuery(h.toolbar.K).css("background-color", jQuery(toolbar_el).attr("backgroundColor")), jQuery(".toolbarMore").css("background-color", jQuery(toolbar_el).attr("backgroundColor")));
        jQuery(toolbar_el).attr("borderColor") && jQuery(h.toolbar.K).css("border-color", h.kb);
        jQuery(toolbar_el).attr("borderStyle") && jQuery(h.toolbar.K).css("border-style", jQuery(toolbar_el).attr("borderStyle"));
        jQuery(toolbar_el).attr("borderThickness") && jQuery(h.toolbar.K).css("border-width", jQuery(toolbar_el).attr("borderThickness"));
        jQuery(toolbar_el).attr("paddingTop") && (jQuery(h.toolbar.K).css("padding-top", jQuery(toolbar_el).attr("paddingTop") + "px"), f += parseFloat(jQuery(toolbar_el).attr("paddingTop")));
        jQuery(toolbar_el).attr("paddingLeft") && jQuery(h.toolbar.K).css("padding-left", jQuery(toolbar_el).attr("paddingLeft") + "px");
        jQuery(toolbar_el).attr("paddingRight") && jQuery(h.toolbar.K).css("padding-right", jQuery(toolbar_el).attr("paddingRight") + "px");
        jQuery(toolbar_el).attr("paddingBottom") && (jQuery(h.toolbar.K).css("padding-bottom", jQuery(toolbar_el).attr("paddingBottom") + "px"), f += parseFloat(jQuery(toolbar_el).attr("paddingTop")));
        jQuery(toolbar_el).attr("cornerRadius") && jQuery(h.toolbar.K).css({
          "border-radius": jQuery(toolbar_el).attr("cornerRadius") + "px",
          "-moz-border-radius": jQuery(toolbar_el).attr("cornerRadius") + "px"
        });
        jQuery(toolbar_el).attr("height") && jQuery(h.toolbar.K).css("height", parseFloat(jQuery(toolbar_el).attr("height")) - f + "px");
        jQuery(toolbar_el).attr("location") && "float" == jQuery(toolbar_el).attr("location") ? h.Dg = !0 : h.Dg = !1;
        jQuery(toolbar_el).attr("location") && "bottom" == jQuery(toolbar_el).attr("location") && (h.qf = !0, jQuery(h.toolbar.K).parent().detach().insertAfter(h.L), jQuery(h.toolbar.K).css("margin-top", "0px"), jQuery(h.toolbar.K).css("margin-bottom", "-5px"), jQuery(h.toolbar.K + "_wrap").css("bottom", "0px"), jQuery(h.toolbar.K + "_wrap").css("background-color", h.kb), jQuery(jQuery(h.F.L).css("height", jQuery(h.F.L).height() - 40 + "px")));
        var r = 1 < eb.platform.Ya && !eb.platform.touchonlydevice ? "@2x" : "";
        jQuery(jQuery(h.Wc).find(c)).find("toolbar").find("element").each(function() {
          "bttnPrint" != jQuery(this).attr("id") && "bttnDownload" != jQuery(this).attr("id") && "bttnTextSelect" != jQuery(this).attr("id") && "bttnHand" != jQuery(this).attr("id") && "barCursorTools" != jQuery(this).attr("id") || !h.readOnly || jQuery(this).attr("visible", !1);
          "bttnDownload" != jQuery(this).attr("id") || h.F.document.PDFFile || jQuery(this).attr("visible", !1);
          "bttnDownload" == jQuery(this).attr("id") && h.O.renderer.config.signature && 0 < h.O.renderer.config.signature.length && jQuery(this).attr("visible", !1);
          switch (jQuery(this).attr("type")) {
            case "button":
              q = ".flowpaper_" + jQuery(this).attr("id");
              jQuery(this).attr("paddingLeft") && jQuery(q).css("padding-left", jQuery(this).attr("paddingLeft") - 6 + "px");
              if (0 == jQuery(q).length && (jQuery(h.toolbar.K).append(String.format("<img id='{0}' class='{1} flowpaper_tbbutton'/>", jQuery(this).attr("id"), "flowpaper_" + jQuery(this).attr("id"))), jQuery(this).attr("onclick"))) {
                var c = jQuery(this).attr("onclick");
                jQuery(q).bind("mousedown", function() {
                  eval(c);
                });
              }
              if (jQuery(this).attr("fa-class")) {
                jQuery(q).replaceWith(String.format('<span id="{0}" style="cursor:pointer;color:#ffffff" class="fa {1} {2}"></span>', jQuery(this).attr("id"), jQuery(this).attr("fa-class"), jQuery(q).get(0).className));
              } else {
                var d = jQuery(this).attr("id");
                jQuery(this).attr("src") && (d = jQuery(this).attr("src"));
              }
              jQuery(q).css("display", "false" == jQuery(this).attr("visible") ? "none" : "block");
              jQuery(q).attr("src", h.Ki + d + r + ".png");
              jQuery(this).attr("icon_width") && jQuery(q).css("width", jQuery(this).attr("icon_width") + "px");
              jQuery(this).attr("icon_height") && jQuery(q).css("height", jQuery(this).attr("icon_height") + "px");
              jQuery(this).attr("fa-class") && jQuery(q).css("font-size", jQuery(this).attr("icon_height") + "px");
              jQuery(this).attr("paddingRight") && jQuery(q).css("padding-right", jQuery(this).attr("paddingRight") - 6 + "px");
              jQuery(this).attr("paddingTop") && jQuery(q).css("padding-top", jQuery(this).attr("paddingTop") + "px");
              h.Dg ? jQuery(q).css("margin-top", "0px") : jQuery(q).css("margin-top", "2px");
              null != t && jQuery(q).insertAfter(t);
              t = jQuery(q);
              break;
            case "separator":
              q = "#" + h.toolbar.Ia + "_" + jQuery(this).attr("id");
              jQuery(q).css("display", "false" == jQuery(this).attr("visible") ? "none" : "block");
              jQuery(q).attr("src", h.Ki + "bar" + r + ".png");
              jQuery(this).attr("width") && jQuery(q).css("width", jQuery(this).attr("width") + "px");
              jQuery(this).attr("height") && jQuery(q).css("height", jQuery(this).attr("height") + "px");
              jQuery(this).attr("paddingLeft") && jQuery(q).css("padding-left", +jQuery(this).attr("paddingLeft"));
              jQuery(this).attr("paddingRight") && jQuery(q).css("padding-right", +jQuery(this).attr("paddingRight"));
              jQuery(this).attr("paddingTop") && jQuery(q).css("padding-top", +jQuery(this).attr("paddingTop"));
              jQuery(q).css("margin-top", "0px");
              null != t && jQuery(q).insertAfter(t);
              t = jQuery(q);
              break;
            case "slider":
              q = ".flowpaper_" + jQuery(this).attr("id");
              jQuery(q).css("display", "false" == jQuery(this).attr("visible") ? "none" : "block");
              jQuery(this).attr("width") && jQuery(q).css("width : " + jQuery(this).attr("width"));
              jQuery(this).attr("height") && jQuery(q).css("height : " + jQuery(this).attr("height"));
              jQuery(this).attr("paddingLeft") && jQuery(q).css("padding-left : " + jQuery(this).attr("paddingLeft"));
              jQuery(this).attr("paddingRight") && jQuery(q).css("padding-right : " + jQuery(this).attr("paddingRight"));
              jQuery(this).attr("paddingTop") && jQuery(q).css("padding-top : " + jQuery(this).attr("paddingTop"));
              h.Dg ? jQuery(q).css("margin-top", "-5px") : jQuery(q).css("margin-top", "-3px");
              null != t && jQuery(q).insertAfter(t);
              t = jQuery(q);
              break;
            case "textinput":
              q = ".flowpaper_" + jQuery(this).attr("id");
              jQuery(q).css("display", "false" == jQuery(this).attr("visible") ? "none" : "block");
              jQuery(this).attr("width") && jQuery(q).css("width : " + jQuery(this).attr("width"));
              jQuery(this).attr("height") && jQuery(q).css("height : " + jQuery(this).attr("height"));
              jQuery(this).attr("paddingLeft") && jQuery(q).css("padding-left : " + jQuery(this).attr("paddingLeft"));
              jQuery(this).attr("paddingRight") && jQuery(q).css("padding-right : " + jQuery(this).attr("paddingRight"));
              jQuery(this).attr("paddingTop") && jQuery(q).css("padding-top : " + jQuery(this).attr("paddingTop"));
              jQuery(this).attr("readonly") && "true" == jQuery(this).attr("readonly") && jQuery(q).attr("disabled", "disabled");
              null != t && jQuery(q).insertAfter(t);
              eb.platform.touchonlydevice ? jQuery(q).css("margin-top", jQuery(this).attr("marginTop") ? jQuery(this).attr("marginTop") + "px" : "7px") : h.Dg ? jQuery(q).css("margin-top", "-2px") : jQuery(q).css("margin-top", "0px");
              t = jQuery(q);
              break;
            case "label":
              q = ".flowpaper_" + jQuery(this).attr("id"), jQuery(q).css("display", "false" == jQuery(this).attr("visible") ? "none" : "block"), jQuery(this).attr("width") && jQuery(q).css("width : " + jQuery(this).attr("width")), jQuery(this).attr("height") && jQuery(q).css("height : " + jQuery(this).attr("height")), jQuery(this).attr("paddingLeft") && jQuery(q).css("padding-left : " + jQuery(this).attr("paddingLeft")), jQuery(this).attr("paddingRight") && jQuery(q).css("padding-right : " + jQuery(this).attr("paddingRight")), jQuery(this).attr("paddingTop") && jQuery(q).css("padding-top : " + jQuery(this).attr("paddingTop")), null != t && jQuery(q).insertAfter(t), eb.platform.touchonlydevice ? jQuery(q).css("margin-top", jQuery(this).attr("marginTop") ? jQuery(this).attr("marginTop") + "px" : "9px") : h.Dg ? jQuery(q).css("margin-top", "1px") : jQuery(q).css("margin-top", "3px"), t = jQuery(q);
          }
        });
        h.O.outline = jQuery(jQuery(h.Wc).find("outline"));
        h.O.labels = jQuery(jQuery(h.Wc).find("labels"));
        jQuery(h.toolbar.K).css({
          "margin-left": "auto",
          "margin-right": "auto"
        });
        jQuery(toolbar_el).attr("location") && jQuery(toolbar_el).attr("location");
        350 > jQuery(h.toolbar.K).width() && jQuery(".flowpaper_txtSearch").css("width", "40px");
        jQuery(e).attr("glow") && "true" == jQuery(e).attr("glow") && (h.Cq = !0, jQuery(h.toolbar.K).css({
          "box-shadow": "0 0 35px rgba(22, 22, 22, 1)",
          "-webkit-box-shadow": "0 0 35px rgba(22, 22, 22, 1)",
          "-moz-box-shadow": "0 0 35px rgba(22, 22, 22, 1)"
        }));
        h.kb ? jQuery(h.toolbar.K).css("background-color", h.kb) : eb.platform.touchonlydevice ? !jQuery(toolbar_el).attr("gradients") || jQuery(toolbar_el).attr("gradients") && "true" == jQuery(toolbar_el).attr("gradients") ? jQuery(h.toolbar.K).addClass("flowpaper_toolbarios_gradients") : jQuery(h.toolbar.K).css("background-color", "#555555") : jQuery(h.toolbar.K).css("background-color", "#555555");
        h.rf ? jQuery(h.toolbar.K).css("visibility", "visible") : jQuery(h.toolbar.K).hide();
        jQuery(jQuery(h.Wc).find("content")).find("page").each(function() {
          var c = jQuery(this);
          jQuery(this).find("link").each(function() {
            h.F.addLink(jQuery(c).attr("number"), jQuery(this).attr("href"), jQuery(this).attr("x"), jQuery(this).attr("y"), jQuery(this).attr("width"), jQuery(this).attr("height"), jQuery(this).attr("showLinkIcon") ? "true" == jQuery(this).attr("showLinkIcon") : !1, jQuery(this).attr("showMouseOverText") ? "true" == jQuery(this).attr("showMouseOverText") : !1, jQuery(this).attr("mouseOverText"));
          });
          jQuery(this).find("video").each(function() {
            h.F.addVideo(jQuery(c).attr("number"), jQuery(this).attr("src"), jQuery(this).attr("url"), jQuery(this).attr("x"), jQuery(this).attr("y"), jQuery(this).attr("width"), jQuery(this).attr("height"), jQuery(this).attr("maximizevideo"), jQuery(this).attr("autoplay"));
          });
          jQuery(this).find("iframe").each(function() {
            h.F.Xj(jQuery(c).attr("number"), jQuery(this).attr("src"), jQuery(this).attr("url"), jQuery(this).attr("x"), jQuery(this).attr("y"), jQuery(this).attr("width"), jQuery(this).attr("height"), jQuery(this).attr("maximizeframe"));
          });
          jQuery(this).find("image").each(function() {
            h.F.addImage(jQuery(c).attr("number"), jQuery(this).attr("src"), jQuery(this).attr("x"), jQuery(this).attr("y"), jQuery(this).attr("width"), jQuery(this).attr("height"), jQuery(this).attr("href"), jQuery(this).attr("hoversrc"));
          });
        });
        h.kn && jQuery(window).bind("keydown", function(c) {
          !c || Mouse.down || jQuery(c.target).hasClass("flowpaper_zoomSlider") || "INPUT" == jQuery(c.target).get(0).tagName || h.F.pages.animating || (h.O.pages.fe() || h.O.pages && h.O.pages.animating) && !h.ah || ("37" == c.keyCode ? h.O.previous() : "39" == c.keyCode && h.O.next());
        });
        d && d();
      }
    });
  };
  this.ih = function() {
    this.F.N.find(".flowpaper_fisheye").hide();
  };
  this.rj = function() {
    this.nk();
  };
  this.Qk = function() {
    this.F.PreviewMode || jQuery(this.O.L).css("padding-top", "20px");
    jQuery("#" + this.Ia).hide();
  };
  this.Ap = function() {
    jQuery(this.O.L).css("padding-top", "0px");
    jQuery("#" + this.Ia).show();
  };
  this.Vj = function() {
    this.Ba = eb.platform.lb && !this.O.PreviewMode;
    this.uf = !0;
    this.fb = !eb.platform.touchonlydevice;
    this.ue = 1;
    this.F.Qe = !0;
    jQuery(this.toolbar.K).css({
      "border-radius": "3px",
      "-moz-border-radius": "3px"
    });
    jQuery(this.toolbar.K).css({
      "margin-left": "auto",
      "margin-right": "auto"
    });
    this.O.config.document.PanelColor && (this.kb = this.O.config.document.PanelColor);
    this.O.config.document.BackgroundColor ? this.backgroundColor = this.O.config.document.BackgroundColor : this.backgroundColor = "#222222";
    this.backgroundImage || jQuery(this.O.N).css("background-color", this.backgroundColor);
    this.kb ? jQuery(this.toolbar.K).css("background-color", this.kb) : eb.platform.touchonlydevice ? jQuery(this.toolbar.K).addClass("flowpaper_toolbarios_gradients") : jQuery(this.toolbar.K).css("background-color", "#555555");
    this.Yj();
    this.Kg = !0;
    this.F.Wg && this.F.Wg();
  };
  this.Yj = function() {
    if (eb.platform.touchonlydevice) {
      var c = eb.platform.lb ? -5 : -1,
        d = eb.platform.lb ? 7 : 15,
        h = eb.platform.lb ? 40 : 60;
      jQuery(this.toolbar.K).html(String.format("<img src='{0}' class='flowpaper_tbbutton_large flowpaper_bttnDownload' style='margin-left:{1}px;'/>", this.ln, d) + (this.toolbar.O.config.document.ViewModeToolsVisible ? String.format("<img src='{0}' style='margin-left:{1}px' class='flowpaper_tbbutton_large flowpaper_twopage flowpaper_tbbutton_pressed flowpaper_bttnBookView flowpaper_viewmode'>", this.Th, d) + String.format("<img src='{0}' class='flowpaper_bttnSinglePage flowpaper_tbbutton_large flowpaper_singlepage flowpaper_viewmode' style='margin-left:{1}px;'>", this.Qg, c) + String.format("<img src='{0}' style='margin-left:{1}px;' class='flowpaper_tbbutton_large flowpaper_thumbview flowpaper_bttnThumbView flowpaper_viewmode' >", this.Rg, c) + "" : "") + (this.toolbar.O.config.document.ZoomToolsVisible ? String.format("<img class='flowpaper_tbbutton_large flowpaper_bttnZoomIn' src='{0}' style='margin-left:{1}px;' />", this.Tg, d) + String.format("<img class='flowpaper_tbbutton_large flowpaper_bttnZoomOut' src='{0}' style='margin-left:{1}px;' />", this.Ug, c) + String.format("<img class='flowpaper_tbbutton_large flowpaper_bttnFullscreen' src='{0}' style='margin-left:{1}px;' />", this.Ng, c) + "" : "") + (this.toolbar.O.config.document.NavToolsVisible ? String.format("<img src='{0}' class='flowpaper_tbbutton_large flowpaper_previous flowpaper_bttnPrevPage' style='margin-left:{0}px;'/>", this.Pg, d) + String.format("<input type='text' class='flowpaper_tbtextinput_large flowpaper_currPageNum flowpaper_txtPageNumber' value='1' style='width:{0}px;' />", h) + String.format("<div class='flowpaper_lblTotalPages flowpaper_tblabel_large flowpaper_numberOfPages'> / </div>") + String.format("<img src='{0}' class='flowpaper_bttnPrevNext flowpaper_tbbutton_large flowpaper_next'/>", this.Og) + "" : "") + (this.toolbar.O.config.document.SearchToolsVisible ? String.format("<input type='txtSearch' class='flowpaper_txtSearch flowpaper_tbtextinput_large' style='margin-left:{0}px;width:{1}px;text-align:right' value='{2}' />", d, eb.platform.lb ? 70 : 130, eb.platform.lb ? "&#x1F50D" : "") + String.format("<img src='{0}' class='flowpaper_bttnFind flowpaper_find flowpaper_tbbutton_large'  style=''/>", this.Mg) + "" : "") + String.format("<img src='{0}' id='{1}' class='flowpaper_bttnMore flowpaper_tbbutton_large' style='display:none' />", this.nn, this.mn));
      jQuery(this.toolbar.K).removeClass("flowpaper_toolbarstd");
      jQuery(this.toolbar.K).addClass("flowpaper_toolbarios");
      jQuery(this.toolbar.K).parent().parent().css({
        "background-color": this.backgroundColor
      });
    } else {
      jQuery(this.toolbar.K).css("margin-top", "15px"), c = this.O.renderer.config.signature && 0 < this.O.renderer.config.signature.length, jQuery(this.toolbar.K).html(String.format("<img style='margin-left:10px;' src='{0}' class='flowpaper_bttnPrint flowpaper_tbbutton print'/>", this.Mp) + (this.F.document.PDFFile && 0 < this.F.document.PDFFile.length && !c ? String.format("<img src='{0}' class='flowpaper_bttnDownload flowpaper_tbbutton download'/>", this.Ip) : "") + String.format("<img src='{0}' id='{1}' class='flowpaper_tbseparator' />", this.hg, this.gn) + (this.O.config.document.ViewModeToolsVisible ? String.format("<img style='margin-left:10px;' src='{1}' class='flowpaper_tbbutton {0} flowpaper_bttnBookView flowpaper_twopage flowpaper_tbbuttonviewmode flowpaper_viewmode' />", "FlipView" == this.O.vb ? "flowpaper_tbbutton_pressed" : "", this.Pp) + String.format("<img src='{1}' class='flowpaper_tbbutton {0} flowpaper_bttnSinglePage flowpaper_singlepage flowpaper_tbbuttonviewmode flowpaper_viewmode' />", "Portrait" == this.O.vb ? "flowpaper_tbbutton_pressed" : "", this.Hp) + String.format("<img src='{0}' id='{1}' class='flowpaper_tbseparator' />", this.hg, this.jn) : "") + (this.O.config.document.ZoomToolsVisible ? String.format("<div class='flowpaper_zoomSlider flowpaper_slider' style='background-image:url({1})'><div class='flowpaper_handle' style='{0}'></div></div>", eb.browser.msie && 9 > eb.browser.version ? this.F.toolbar.Sl : "", "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTIiPjxsaW5lIHgxPSIwIiB5MT0iNiIgeDI9Ijk1IiB5Mj0iNiIgc3R5bGU9InN0cm9rZTojQUFBQUFBO3N0cm9rZS13aWR0aDoxIiAvPjwvc3ZnPg==") + String.format("<input type='text' class='flowpaper_tbtextinput flowpaper_txtZoomFactor' style='width:40px;' />") + String.format("<img style='margin-left:10px;' class='flowpaper_tbbutton flowpaper_bttnFullscreen' src='{0}' />", this.Jp) : "") + (this.O.config.document.NavToolsVisible ? String.format("<img src='{0}' class='flowpaper_tbbutton flowpaper_previous flowpaper_bttnPrevPage'/>", this.Lp) + String.format("<input type='text' class='flowpaper_txtPageNumber flowpaper_tbtextinput flowpaper_currPageNum' value='1' style='width:50px;text-align:right;' />") + String.format("<div class='flowpaper_lblTotalPages flowpaper_tblabel flowpaper_numberOfPages'> / </div>") + String.format("<img src='{0}' class='flowpaper_bttnPrevNext flowpaper_tbbutton flowpaper_next'/>", this.Np) + String.format("<img src='{0}' id='{1}' class='flowpaper_tbseparator' />", this.hg, this.en) : "") + (this.O.config.document.CursorToolsVisible ? String.format("<img style='margin-top:5px;margin-left:6px;' src='{0}' class='flowpaper_tbbutton flowpaper_bttnTextSelect'/>", this.Op) + String.format("<img style='margin-top:4px;' src='{0}' class='flowpaper_tbbutton flowpaper_tbbutton_pressed flowpaper_bttnHand'/>", this.Kp) + String.format("<img src='{0}' id='{1}' class='flowpaper_tbseparator' />", this.hg, this.dn) : "") + (this.O.config.document.SearchToolsVisible ? String.format("<input id='{0}' type='text' class='flowpaper_tbtextinput flowpaper_txtSearch' style='width:40px;margin-left:4px' />") + String.format("<img src='{0}' class='flowpaper_find flowpaper_tbbutton flowpaper_bttnFind' />", this.Qp) : "") + String.format("<img src='{0}' id='{1}' class='flowpaper_tbseparator' />", this.hg, this.hn));
    }
  };
  this.mk = function() {
    var c = this;
    if (0 < jQuery(c.Oa).find(".toolbarMore").length) {
      var d = jQuery(c.Oa).find(".toolbarMore").children(),
        h = jQuery(c.toolbar.K),
        f = jQuery(c.Oa).find(".flowpaper_bttnMore"),
        k = jQuery(c.Oa).find(".toolbarMore"),
        l = (jQuery(c.Oa).width() - jQuery(c.toolbar.K).width()) / 2 - 5,
        n = jQuery(c.Oa).find(".flowpaper_bttnZoomIn").offset().top,
        q = !1,
        t = jQuery(c.toolbar.K).children();
      jQuery(c.toolbar.K).last();
      jQuery(c.Oa).find(".toolbarMore").css({
        "margin-right": l + "px",
        "margin-left": l + "px"
      });
      t.each(function() {
        jQuery(this).is(":visible") && (q = q || 20 < jQuery(this).offset().top - h.offset().top);
      });
      d.each(function() {
        jQuery(this).insertBefore(f);
      });
      q && (k.show(), k.css("background-color", jQuery(c.toolbar.K).css("background-color")));
      q ? (f.show(), t.each(function() {
        !jQuery(this).hasClass("flowpaper_bttnMore") && jQuery(this).is(":visible") && 35 < jQuery(this).offset().top - n && k.append(this);
      }), requestAnim(function() {
        20 < f.offset().top - n && k.prepend(jQuery(c.Oa).find(".flowpaper_bttnMore").prev());
      }, 50), k.prepend(jQuery(c.Oa).find(".flowpaper_bttnMore").prev())) : (f.hide(), k.css("visibility", "hidden"));
    }
  };
  this.bindEvents = function() {
    var c = this;
    eb.platform.touchonlydevice ? (jQuery(c.Oa).find(".flowpaper_txtSearch").on("touchstart focus", function() {
      !jQuery(".flowpaper_bttnFind").is(":visible") && 0 < jQuery(this).val().length && 55357 == jQuery(this).val().charCodeAt(0) ? (jQuery(this).css("text-align", "left"), jQuery(this).val(""), jQuery(this).data("original-width", jQuery(this).css("width")), 0 < jQuery(c.toolbar.K).find(".flowpaper_txtSearch").length ? (jQuery(c.toolbar.K).find("*:visible:not(.flowpaper_txtSearch)").data("search-hide", !0), jQuery(c.toolbar.K).find("*:visible:not(.flowpaper_txtSearch)").hide(), jQuery(this).css({
        width: "100%"
      })) : jQuery(this).css({
        width: jQuery(this).parent().width() - jQuery(this).offset().left + "px"
      })) : jQuery(".flowpaper_bttnFind").is(":visible") || "100%" == jQuery(this).width || (0 < jQuery(c.toolbar.K).find(".flowpaper_txtSearch").length ? (jQuery(c.toolbar.K).find("*:visible:not(.flowpaper_txtSearch)").data("search-hide", !0), jQuery(c.toolbar.K).find("*:visible:not(.flowpaper_txtSearch)").hide(), jQuery(this).css({
        width: "100%"
      })) : jQuery(this).css({
        width: jQuery(this).parent().width() - jQuery(this).offset().left + "px"
      }));
    }), jQuery(c.toolbar.K).find(".flowpaper_txtSearch").on("blur", function() {
      jQuery(".flowpaper_bttnFind").is(":visible") || 0 != jQuery(this).val().length || (jQuery(this).css("text-align", "right"), jQuery(this).val(String.fromCharCode(55357) + String.fromCharCode(56589)));
      jQuery(this).data("original-width") && jQuery(this).animate({
        width: jQuery(this).data("original-width")
      }, {
        duration: 300,
        always: function() {
          for (var d = jQuery(c.toolbar.K).children(), h = 0; h < d.length; h++) {
            jQuery(d[h]).data("search-hide") && jQuery(d[h]).show();
          }
        }
      });
    }), jQuery(c.toolbar.K).find(".flowpaper_bttnPrint").on("mousedown touchstart", function() {
      c.$h != c.ea && jQuery(this).attr("src", c.$h);
    }), jQuery(c.toolbar.K).find(".flowpaper_bttnPrint").on("mouseup touchend", function() {
      c.Zh != c.ea && jQuery(this).attr("src", c.Zh);
    }), jQuery(c.toolbar.K).find(".flowpaper_bttnBookView").on("mousedown touchstart", function() {
      c.Lg != c.ea && jQuery(this).attr("src", c.Lg);
    }), jQuery(c.toolbar.K).find(".flowpaper_bttnBookView").on("mouseup touchend", function() {
      c.Lg != c.ea && jQuery(this).attr("src", c.Th);
    }), jQuery(c.toolbar.K).find(".flowpaper_bttnSinglePage").on("mousedown touchstart", function() {
      c.bi != c.ea && jQuery(this).attr("src", c.bi);
    }), jQuery(c.toolbar.K).find(".flowpaper_bttnSinglePage").on("mouseup touchend", function() {
      c.Qg != c.ea && jQuery(this).attr("src", c.Qg);
    }), jQuery(c.toolbar.K).find(".flowpaper_bttnThumbView").on("mousedown touchstart", function() {
      c.ci != c.ea && jQuery(this).attr("src", c.ci);
    }), jQuery(c.toolbar.K).find(".flowpaper_bttnThumbView").on("mouseup touchend", function() {
      c.Rg != c.ea && jQuery(this).attr("src", c.Rg);
    }), jQuery(c.toolbar.K).find(".flowpaper_bttnZoomIn").on("mousedown touchstart", function() {
      c.di != c.ea && jQuery(this).attr("src", c.di);
    }), jQuery(c.toolbar.K).find(".flowpaper_bttnZoomIn").on("mouseup touchend", function() {
      c.Tg != c.ea && jQuery(this).attr("src", c.Tg);
    }), jQuery(c.toolbar.K).find(".flowpaper_bttnZoomOut").on("mousedown touchstart", function() {
      c.ei != c.ea && jQuery(this).attr("src", c.ei);
    }), jQuery(c.toolbar.K).find(".flowpaper_bttnZoomOut").on("mouseup touchend", function() {
      c.Ug != c.ea && jQuery(this).attr("src", c.Ug);
    }), jQuery(c.toolbar.K).find(".flowpaper_bttnFullscreen").on("mousedown touchstart", function() {
      c.Vh != c.ea && jQuery(this).attr("src", c.Vh);
    }), jQuery(c.toolbar.K).find(".flowpaper_bttnFullscreen").on("mouseup touchend", function() {
      c.Ng != c.ea && jQuery(this).attr("src", c.Ng);
    }), jQuery(c.toolbar.K).find(".flowpaper_bttnPrevPage").on("mousedown touchstart", function() {
      c.Xh != c.ea && jQuery(this).attr("src", c.Xh);
    }), jQuery(c.toolbar.K).find(".flowpaper_bttnPrevPage").on("mouseup touchend", function() {
      c.Pg != c.ea && jQuery(this).attr("src", c.Pg);
    }), jQuery(c.toolbar.K).find(".flowpaper_bttnNextPage").on("mousedown touchstart", function() {
      c.Wh != c.ea && jQuery(this).attr("src", c.Wh);
    }), jQuery(c.toolbar.K).find(".flowpaper_bttnNextPage").on("mouseup touchend", function() {
      c.Og != c.ea && jQuery(this).attr("src", c.Og);
    }), jQuery(c.toolbar.K).find(".flowpaper_bttnFind").on("mousedown touchstart", function() {
      c.Uh != c.ea && jQuery(this).attr("src", c.Uh);
    }), jQuery(c.toolbar.K).find(".flowpaper_bttnFind").on("mouseup touchend", function() {
      c.Mg != c.ea && jQuery(this).attr("src", c.Mg);
    })) : (jQuery(c.toolbar.K).find(".flowpaper_txtSearch").on("focus", function() {
      40 >= jQuery(this).width() && (jQuery(c.toolbar.K).animate({
        width: jQuery(c.toolbar.K).width() + 60
      }, 100), jQuery(this).animate({
        width: jQuery(this).width() + 60
      }, 100));
    }), jQuery(c.toolbar.K).find(".flowpaper_txtSearch").on("blur", function() {
      40 < jQuery(this).width() && (jQuery(c.toolbar.K).animate({
        width: jQuery(c.toolbar.K).width() - 60
      }, 100), jQuery(this).animate({
        width: 40
      }, 100));
    }));
    jQuery(c.toolbar.K).find(".flowpaper_bttnZoomIn").bind("click", function() {
      c.O.pages.ne(!0);
    });
    jQuery(c.toolbar.K).find(".flowpaper_bttnZoomOut").bind("click", function() {
      c.O.pages.md();
    });
    0 == c.F.N.find(".flowpaper_socialsharedialog").length && (c.sk ? c.F.N.prepend(String.format("<div id='modal-socialshare' class='modal-content flowpaper_socialsharedialog' style='overflow:hidden;'><font style='color:#000000;font-size:11px'><img src='{0}' align='absmiddle' />&nbsp;<b>{15}</b></font><div style='width:530px;height:180px;margin-top:5px;padding-top:5px;padding-left:5px;background-color:#ffffff;box-shadow: 0px 2px 10px #aaa'><div style='position:absolute;left:20px;top:42px;color:#000000;font-weight:bold;'>{8}</div><div style='position:absolute;left:177px;top:47px;color:#000000;font-weight:bold;'><hr size='1' style='width:350px'/></div><div style='position:absolute;left:20px;top:58px;color:#000000;font-size:10px;'>{9}</div><div style='position:absolute;left:20px;top:88px;color:#000000;font-weight:bold;'><input type='text' style='width:139px;' value='&lt;{10}&gt;' class='flowpaper_txtPublicationTitle' /></div><div style='position:absolute;left:165px;top:86px;color:#000000;'><img src='{1}' class='flowpaper_socialshare_twitter' style='cursor:pointer;' /></div><div style='position:absolute;left:200px;top:86px;color:#000000;'><img src='{2}' class='flowpaper_socialshare_facebook' style='cursor:pointer;' /></div><div style='position:absolute;left:235px;top:86px;color:#000000;'><img src='{3}' class='flowpaper_socialshare_googleplus' style='cursor:pointer;' /></div><div style='position:absolute;left:270px;top:86px;color:#000000;'><img src='{4}' class='flowpaper_socialshare_tumblr' style='cursor:pointer;' /></div><div style='position:absolute;left:305px;top:86px;color:#000000;'><img src='{5}' class='flowpaper_socialshare_linkedin' style='cursor:pointer;' /></div></div></div>", c.am, c.$l, c.Wl, c.Xl, c.Zl, c.Yl, c.F.toolbar.la(c.F.toolbar.Ka, "CopyUrlToPublication", "Copy URL to publication"), c.F.toolbar.la(c.F.toolbar.Ka, "DefaultStartPage", "Default start page"), c.F.toolbar.la(c.F.toolbar.Ka, "ShareOnSocialNetwork", "Share on Social Network"), c.F.toolbar.la(c.F.toolbar.Ka, "ShareOnSocialNetworkDesc", "You can easily share this publication to social networks. Just click on the appropriate button below."), c.F.toolbar.la(c.F.toolbar.Ka, "SharingTitle", "Sharing Title"), c.F.toolbar.la(c.F.toolbar.Ka, "EmbedOnSite", "Embed on Site"), c.F.toolbar.la(c.F.toolbar.Ka, "EmbedOnSiteDesc", "Use the code below to embed this publication to your website."), c.F.toolbar.la(c.F.toolbar.Ka, "EmbedOnSiteMiniature", "Linkable Miniature"), c.F.toolbar.la(c.F.toolbar.Ka, "EmbedOnSiteFull", "Full Publication"), c.F.toolbar.la(c.F.toolbar.Ka, "Share", "Share"), c.F.toolbar.la(c.F.toolbar.Ka, "StartOnCurrentPage", "Start on current page"))) : c.F.N.prepend(String.format("<div id='modal-socialshare' class='modal-content flowpaper_socialsharedialog' style='overflow:hidden;'><font style='color:#000000;font-size:11px'><img src='{0}' align='absmiddle' />&nbsp;<b>{15}</b></font><div style='width:530px;height:307px;margin-top:5px;padding-top:5px;padding-left:5px;background-color:#ffffff;box-shadow: 0px 2px 10px #aaa'><div style='position:absolute;left:20px;top:42px;color:#000000;font-weight:bold;'>{6}</div><div style='position:absolute;left:177px;top:42px;color:#000000;font-weight:bold;'><hr size='1' style='width:350px'/></div><div style='position:absolute;left:20px;top:62px;color:#000000;font-weight:bold;'><select class='flowpaper_ddlSharingOptions'><option>{7}</option><option>{16}</option></select></div><div style='position:absolute;left:175px;top:62px;color:#000000;font-weight:bold;'><input type='text' readonly style='width:355px;' class='flowpaper_socialsharing_txtUrl' /></div><div style='position:absolute;left:20px;top:102px;color:#000000;font-weight:bold;'>{8}</div><div style='position:absolute;left:177px;top:107px;color:#000000;font-weight:bold;'><hr size='1' style='width:350px'/></div><div style='position:absolute;left:20px;top:118px;color:#000000;font-size:10px;'>{9}</div><div style='position:absolute;left:20px;top:148px;color:#000000;font-weight:bold;'><input type='text' style='width:139px;' value='&lt;{10}&gt;' class='flowpaper_txtPublicationTitle' /></div><div style='position:absolute;left:165px;top:146px;color:#000000;'><img src='{1}' class='flowpaper_socialshare_twitter' style='cursor:pointer;' /></div><div style='position:absolute;left:200px;top:146px;color:#000000;'><img src='{2}' class='flowpaper_socialshare_facebook' style='cursor:pointer;' /></div><div style='position:absolute;left:235px;top:146px;color:#000000;'><img src='{3}' class='flowpaper_socialshare_googleplus' style='cursor:pointer;' /></div><div style='position:absolute;left:270px;top:146px;color:#000000;'><img src='{4}' class='flowpaper_socialshare_tumblr' style='cursor:pointer;' /></div><div style='position:absolute;left:305px;top:146px;color:#000000;'><img src='{5}' class='flowpaper_socialshare_linkedin' style='cursor:pointer;' /></div><div style='position:absolute;left:20px;top:192px;color:#000000;font-weight:bold;'>{11}</div><div style='position:absolute;left:20px;top:208px;color:#000000;font-size:10px;'>{12}</div><div style='position:absolute;left:20px;top:228px;color:#000000;font-size:10px;'><input type='radio' name='InsertCode' class='flowpaper_radio_miniature' checked />&nbsp;{13}&nbsp;&nbsp;&nbsp;&nbsp;<input type='radio' name='InsertCode' class='flowpaper_radio_fullembed' />&nbsp;{14}</div><div style='position:absolute;left:20px;top:251px;color:#000000;font-size:10px;'><textarea class='flowpaper_txtEmbedCode' readonly style='width:507px;height:52px'></textarea></div></div></div>", c.am, c.$l, c.Wl, c.Xl, c.Zl, c.Yl, c.F.toolbar.la(c.F.toolbar.Ka, "CopyUrlToPublication", "Copy URL to publication"), c.F.toolbar.la(c.F.toolbar.Ka, "DefaultStartPage", "Default start page"), c.F.toolbar.la(c.F.toolbar.Ka, "ShareOnSocialNetwork", "Share on Social Network"), c.F.toolbar.la(c.F.toolbar.Ka, "ShareOnSocialNetworkDesc", "You can easily share this publication to social networks. Just click on the appropriate button below."), c.F.toolbar.la(c.F.toolbar.Ka, "SharingTitle", "Sharing Title"), c.F.toolbar.la(c.F.toolbar.Ka, "EmbedOnSite", "Embed on Site"), c.F.toolbar.la(c.F.toolbar.Ka, "EmbedOnSiteDesc", "Use the code below to embed this publication to your website."), c.F.toolbar.la(c.F.toolbar.Ka, "EmbedOnSiteMiniature", "Linkable Miniature"), c.F.toolbar.la(c.F.toolbar.Ka, "EmbedOnSiteFull", "Full Publication"), c.F.toolbar.la(c.F.toolbar.Ka, "Share", "Share"), c.F.toolbar.la(c.F.toolbar.Ka, "StartOnCurrentPage", "Start on current page"))));
    c.F.N.find(".flowpaper_radio_miniature, .flowpaper_radio_fullembed, .flowpaper_ddlSharingOptions").on("change", function() {
      c.Hh();
    });
    c.F.N.find(".flowpaper_txtPublicationTitle").on("focus", function(c) {
      -1 != jQuery(c.target).val().indexOf("Sharing Title") && jQuery(c.target).val("");
    });
    c.F.N.find(".flowpaper_txtPublicationTitle").on("blur", function(c) {
      0 == jQuery(c.target).val().length && jQuery(c.target).val("<Sharing Title>");
    });
    c.F.N.find(".flowpaper_txtPublicationTitle").on("keydown", function() {
      c.Hh();
    });
    c.Hh();
    jQuery(c.toolbar.K).find(".flowpaper_bttnSocialShare").bind("click", function() {
      c.Hh();
      jQuery("#modal-socialshare").css("background-color", "#dedede");
      jQuery("#modal-socialshare").smodal({
        minHeight: c.sk ? 90 : 350,
        minWidth: 550,
        appendTo: c.F.N
      });
      jQuery("#modal-socialshare").parent().css("background-color", "#dedede");
    });
    jQuery(c.toolbar.K).find(".flowpaper_bttnBookView").bind("click", function() {
      eb.browser.msie && 8 >= eb.browser.version ? c.O.switchMode("BookView", c.O.getCurrPage()) : c.O.switchMode("FlipView", c.O.getCurrPage() + 1);
      jQuery(this).addClass("flowpaper_tbbutton_pressed");
    });
    jQuery(c.toolbar.K).find(".flowpaper_bttnMore").bind("click", function() {
      var d = (jQuery(c.Oa).width() - jQuery(c.toolbar.K).width()) / 2 - 5;
      "hidden" == jQuery(c.Oa).find(".toolbarMore").css("visibility") ? jQuery(c.Oa).find(".toolbarMore").css({
        "margin-right": d + "px",
        "margin-left": d + "px",
        visibility: "visible"
      }) : jQuery(c.Oa).find(".toolbarMore").css({
        "margin-right": d + "px",
        "margin-left": d + "px",
        visibility: "hidden"
      });
    });
    c.F.N.find(".flowpaper_socialsharing_txtUrl, .flowpaper_txtEmbedCode").bind("focus", function() {
      jQuery(this).select();
    });
    c.F.N.find(".flowpaper_socialsharing_txtUrl, .flowpaper_txtEmbedCode").bind("mouseup", function() {
      return !1;
    });
    c.F.N.find(".flowpaper_socialshare_twitter").bind("mousedown", function() {
      window.open("https://twitter.com/intent/tweet?url=" + escape(c.Ue(!1)) + "&text=" + escape(c.hh()), "_flowpaper_exturl");
      c.F.L.trigger("onSocialMediaShareClicked", "Twitter");
    });
    c.F.N.find(".flowpaper_socialshare_facebook").bind("mousedown", function() {
      window.open("http://www.facebook.com/sharer.php?u=" + escape(c.Ue(!1), "_flowpaper_exturl"));
      c.F.L.trigger("onSocialMediaShareClicked", "Facebook");
    });
    c.F.N.find(".flowpaper_socialshare_googleplus").bind("mousedown", function() {
      window.open("https://plus.google.com/share?url=" + escape(c.Ue(!1)), "_flowpaper_exturl");
      c.F.L.trigger("onSocialMediaShareClicked", "GooglePlus");
    });
    c.F.N.find(".flowpaper_socialshare_tumblr").bind("mousedown", function() {
      window.open("http://www.tumblr.com/share/link?name=" + escape(c.hh()) + "&url=" + escape(c.Ue(!1)), "_flowpaper_exturl");
      c.F.L.trigger("onSocialMediaShareClicked", "Tumblr");
    });
    c.F.N.find(".flowpaper_socialshare_linkedin").bind("mousedown", function() {
      window.open("http://www.linkedin.com/shareArticle?mini=true&url=" + escape(c.Ue(!1)) + "&title=" + escape(c.hh()), "_flowpaper_exturl");
      c.F.L.trigger("onSocialMediaShareClicked", "LinkedIn");
    });
  };
  this.Hh = function() {
    this.F.N.find(".flowpaper_txtEmbedCode").val('<iframe frameborder="0"  width="400" height="300"  title="' + this.hh() + '" src="' + this.Ue() + '" type="text/html" scrolling="no" marginwidth="0" marginheight="0" allowFullScreen></iframe>');
    this.F.N.find(".flowpaper_socialsharing_txtUrl").val(this.Ue(!1));
  };
  this.hh = function() {
    return this.F.N.find(".flowpaper_txtPublicationTitle").length && -1 == this.F.N.find(".flowpaper_txtPublicationTitle").val().indexOf("Sharing Title") ? this.F.N.find(".flowpaper_txtPublicationTitle").val() : "";
  };
  this.Ue = function(c) {
    0 == arguments.length && (c = !0);
    var d = this.F.N.find(".flowpaper_ddlSharingOptions").prop("selectedIndex"),
      h = this.F.N.find(".flowpaper_radio_miniature").is(":checked"),
      f = location.protocol + "//" + location.host + location.pathname + (location.search ? location.search : "");
    this.F.document.SharingUrl && (f = this.F.document.SharingUrl);
    return f.substring(0) + (0 < d ? "#page=" + this.F.getCurrPage() : "") + (0 < d && h && c ? "&" : h && c ? "#" : "") + (h && c ? "PreviewMode=Miniature" : "");
  };
  this.initialize = function() {
    var c = this.F;
    c.I.tb = c.I.ii();
    c.I.ah = !1;
    c.I.tb || (c.renderer.Xg = !0);
    eb.platform.ios && 8 > eb.platform.iosversion && (c.I.tb = !1);
    if (!c.config.document.InitViewMode || c.config.document.InitViewMode && "Zine" == c.config.document.InitViewMode || "TwoPage" == c.config.document.InitViewMode || "Flip-SinglePage" == c.config.document.InitViewMode) {
      c.L && 0.7 > c.L.width() / c.L.height() && (c.Te = !0), "Flip-SinglePage" != c.config.document.InitViewMode || (eb.platform.lb || eb.platform.ios || eb.platform.android) && eb.browser.mh || (c.Te = !0), c.vb = "FlipView", c.config.document.MinZoomSize = 1, c.H = c.vb, "TwoPage" == c.H && (c.H = "FlipView"), c.scale = 1;
    }
    c.config.document.jl = c.config.document.MinZoomSize;
    null === c.N && (c.N = jQuery("<div style='" + c.L.attr("style") + ";overflow-x: hidden;overflow-y: hidden;' class='flowpaper_viewer_container'/>"), c.N = c.L.wrap(c.N).parent(), c.L.css({
      left: "0px",
      top: "0px",
      position: "relative",
      width: "100%",
      height: "100%"
    }).addClass("flowpaper_viewer"), eb.browser.safari && c.L.css("-webkit-transform", "translateZ(0)"));
    jQuery(c.L).bind("onCurrentPageChanged", function(d, h) {
      c.Wb && (jQuery(".activeElement-label").remove(), jQuery(".activeElement").removeClass("activeElement"));
      c.T && c.sn();
      var f = window.location.search ? window.location.search : "",
        k = eb.platform.mobilepreview ? ",mobilepreview=" + FLOWPAPER.getLocationHashParameter("mobilepreview") : "";
      c.config.document.RTLMode && (h = c.getTotalPages() - h + (0 == c.getTotalPages() % 2 ? 1 : 0));
      window.history.replaceState && !c.Wb && window.history.replaceState(null, null, f + "#page=" + h + k);
      if (jQuery(this).data("TrackingNumber") && window.createTimeSpent && !c.Wb && !W()) {
        f = (-1 < document.location.pathname.indexOf(".html") ? document.location.pathname.substr(0, document.location.pathname.lastIndexOf(".html")) + "/" : document.location.pathname) + "#page=" + h;
        FLOWPAPER.ic || (FLOWPAPER.ic = []);
        for (var l in FLOWPAPER.ic) {
          FLOWPAPER.ic[l] && (FLOWPAPER.ic[l].end(), FLOWPAPER.ic[l] = null);
        }
        FLOWPAPER.ic[f] || (FLOWPAPER.ic[f] = createTimeSpent(), FLOWPAPER.ic[f].init({
          location: f,
          gaTracker: "FlowPaperEventTracker"
        }));
      }
    });
    window.addEventListener("beforeunload", function() {
      FLOWPAPER.ic || (FLOWPAPER.ic = []);
      for (var c in FLOWPAPER.ic) {
        FLOWPAPER.ic[c] && (FLOWPAPER.ic[c].end(), FLOWPAPER.ic[c] = null);
      }
    });
  };
  this.Up = function(d) {
    eb.platform.touchonlydevice ? c.switchMode("SinglePage", d) : c.switchMode("Portrait", d);
  };
  FlowPaperViewer_HTML.prototype.ul = function(c) {
    var d = this;
    if (d.bc != c) {
      var h = (c - 20 + 1) / 2,
        f = h + 9 + 1,
        k = 1,
        l = null != d.I.kb ? d.I.kb : "#555555";
      d.T.find(".flowpaper_fisheye_item").parent().parent().remove();
      0 > d.getTotalPages() - c && (f = f + (d.getTotalPages() - c) / 2 + (c - d.getTotalPages()) % 2);
      19 < c ? d.T.find(".flowpaper_fisheye_panelLeft").animate({
        opacity: 1
      }, 150) : d.T.find(".flowpaper_fisheye_panelLeft").animate({
        opacity: 0
      }, 150);
      c < d.getTotalPages() ? d.T.find(".flowpaper_fisheye_panelRight").animate({
        opacity: 1
      }, 150) : d.T.find(".flowpaper_fisheye_panelRight").animate({
        opacity: 0
      }, 150);
      for (i = h; i < f; i++) {
        d.Ym(k), k++;
      }
      d.T.find(".flowpaper_fisheye_item, .flowpaper_fisheye_panelLeft, .flowpaper_fisheye_panelRight").bind("mouseover", function() {
        if (!d.pages.animating && 0 != d.T.css("opacity")) {
          var c = (1 - Math.min(1, Math.max(0, 1 / d.Ak))) * d.yk + d.Ib;
          d.T.css({
            "z-index": 12,
            "pointer-events": "auto"
          });
          jQuery(this).parent().parent().parent().find("span").css({
            display: "none"
          });
          jQuery(this).parent().find("span").css({
            display: "inline-block"
          });
          jQuery(this).parent().parent().parent().find("p").remove();
          var e = jQuery(this).context.dataset && 1 == jQuery(this).context.dataset.pageindex ? d.dh / 2 : 0;
          jQuery(this).parent().find("span").after(String.format("<p style='width: 0;height: 0;border-left: 7px solid transparent;border-right: 7px solid transparent;border-top: 7px solid {0};margin-top:-35px;margin-left:{1}px;'></p>", l, c / 2 - 20 + e));
        }
      });
      d.T.find(".flowpaper_fisheye_item").bind("mouseout", function(c) {
        d.pages.animating || 0 == d.T.css("opacity") || (d.vi = c.pageX, d.wi = c.pageY, d.ke = c.target, jQuery(d.ke).get(0), d.Rl(), d.T.css({
          "z-index": 9,
          "pointer-events": "none"
        }), jQuery(this).parent().find("span").css({
          display: "none"
        }), jQuery(this).parent().find("p").remove());
      });
      d.T.find("li").each(function() {
        jQuery(this).bind("mousemove", function(c) {
          d.pages.animating || 0 < c.buttons || !d.T.is(":visible") || (d.ke = c.target, d.vi = c.pageX, d.wi = c.pageY, jQuery(d.ke).get(0), d.xi = !0, d.ql());
        });
      });
      jQuery(d.T).bind("mouseleave", function() {
        d.T.find("li").each(function() {
          var c = this;
          requestAnim(function() {
            jQuery(c).find("a").css({
              width: d.Ib,
              top: d.Ib / 3
            });
          }, 10);
        });
      });
      jQuery(d.pages.J + ", " + d.pages.J + "_parent, #" + d.P).bind("mouseover", function() {
        if (d.T && (d.T.css({
            "z-index": 9,
            "pointer-events": "none"
          }), (eb.browser.msie || eb.browser.safari && 5 > eb.browser.Kb) && d.ke)) {
          d.ke = null;
          var c = d.T.find("a").find("canvas").data("origwidth"),
            e = d.T.find("a").find("canvas").data("origheight");
          d.T.find("li").each(function() {
            jQuery(this).find("a").css({
              height: e,
              width: c,
              top: d.Ib / 3
            });
            jQuery(this).find("a").find("canvas").css({
              height: e,
              width: c,
              top: d.Ib / 3
            });
          });
        }
      });
    }
    d.bc = c;
  };
  FlowPaperViewer_HTML.prototype.sn = function() {
    (this.da > this.bc || this.da <= this.bc - 20) && -1 != this.bc && this.nh(this.da > this.bc ? 20 : -20);
  };
  FlowPaperViewer_HTML.prototype.nh = function(c) {
    var d = this;
    0 != c && d.ul(d.bc + c);
    window.setTimeout(function() {
      d.Yd = (d.bc - 20 + 1) / 2 + 1;
      d.Aj = d.Yd + 9;
      0 > d.getTotalPages() - d.bc && (d.Aj = d.Aj + (d.getTotalPages() - d.bc) / 2 + (d.bc - d.getTotalPages()) % 2);
      d.Yd <= d.getTotalPages() && d.renderer.Pe(d, d.Yd, 2 * d.je);
    }, 300);
  };
  FlowPaperViewer_HTML.prototype.Ym = function(c) {
    var d = 0 == i ? 1 : 2 * i + 1,
      h = this;
    if (h.T) {
      var f = null != h.I.kb ? h.I.kb : "#555555",
        k = "";
      h.config.document.RTLMode && (d = h.getTotalPages() - parseInt(d) + 1);
      1 != d || h.config.document.RTLMode ? 1 == d && h.config.document.RTLMode ? k = "&nbsp;&nbsp;" + d + "&nbsp;&nbsp;" : d == h.getTotalPages() && 0 == h.getTotalPages() % 2 ? k = (d - 1).toString() : d > h.getTotalPages() ? k = (d - 1).toString() : k = d - 1 + "-" + d : k = "&nbsp;&nbsp;" + c + "&nbsp;&nbsp;";
      k = h.toolbar.yd(d, k);
      c = jQuery(String.format("<li><a style='height:{2}px;width:{7}px;top:{9}px;' class='flowpaper_thumbitem'><span style='margin-left:{8}px;background-color:{0}'>{4}</span><canvas data-pageIndex='{5}' data-ThumbIndex='{6}' class='flowpaper_fisheye_item' style='pointer-events: auto;' /></a></li>", f, h.Cf, 0.8 * h.je, h.dh, k, d, c, h.Ib, 1 == d ? h.dh : 0, h.Ib / 3));
      c.insertBefore(h.T.find(".flowpaper_fisheye_panelRight").parent());
      c.find(".flowpaper_fisheye_item").css({
        opacity: 0
      });
      jQuery(c).bind("mousedown", function() {
        1 != !h.scale && (h.T && h.T.css({
          "z-index": 9,
          "pointer-events": "none"
        }), d > h.getTotalPages() && (d = h.getTotalPages()), h.gotoPage(d));
      });
    }
  };
  this.nk = function() {
    var c = this.F;
    if ("FlipView" == c.H) {
      0 < c.N.find(".flowpaper_fisheye").length && c.N.find(".flowpaper_fisheye").remove();
      c.bc = -1;
      var d = 0;
      0 < c.getDimensions(0).length && (d = c.getDimensions(0)[0].na / c.getDimensions(0)[0].za - 0.3);
      c.qr = 25;
      c.je = 0.25 * c.L.height();
      c.dh = 0.41 * c.je;
      c.Cf = jQuery(c.L).offset().top + jQuery(c.pages.J).height() - c.N.offset().top + c.nc;
      c.Ak = 1.25 * c.je;
      c.Ib = c.je / (3.5 - d);
      c.Mn = 2.5 * c.Ib;
      c.Nn = -(c.Ib / 3);
      d = null != c.I.kb ? c.I.kb : "#555555";
      c.I.ue && (d = R(d), d = "rgba(" + d.r + "," + d.g + "," + d.b + "," + c.I.ue + ")");
      c.N.append(jQuery(String.format("<div class='flowpaper_fisheye' style='position:absolute;pointer-events: none;top:{1}px;z-index:12;left:{4}px;" + (c.I.qf || !c.I.rf ? "margin-top:2.5%;" : "") + "'><ul><li><div class='flowpaper_fisheye_panelLeft' style='pointer-events: auto;position:relative;-moz-border-radius-topleft: 10px;border-top-left-radius: 10px;-moz-border-radius-bottomleft: 10px;border-bottom-left-radius: 10px;background-color:{0};left:0px;width:22px;'><div style='position:absolute;height:100px;width:100px;left:0px;top:-40px;'></div><div class='flowpaper_fisheye_leftArrow' style='position:absolute;top:20%;left:3px'></div></div></li><li><div class='flowpaper_fisheye_panelRight' style='pointer-events: auto;position:relative;-moz-border-radius-topright: 10px;border-top-right-radius: 10px;-moz-border-radius-bottomright: 10px;border-bottom-right-radius: 10px;background-color:{0};left:0px;width:22px;'><div style='position:absolute;height:100px;width:100px;left:0px;top:-40px;'></div><div class='flowpaper_fisheye_rightArrow' style='position:absolute;top:20%;left:3px;'></div></div></li></ul></div>", d, c.Cf, 0.8 * c.je, c.dh, c.Nn)));
      c.T = c.N.find(".flowpaper_fisheye");
      c.T.css({
        top: c.Cf - (c.T.find(".flowpaper_fisheye_panelLeft").offset().top - jQuery(c.T).offset().top) + c.T.find(".flowpaper_fisheye_panelLeft").height() / 2
      });
      c.yk = c.Mn - c.Ib;
      c.vi = -1;
      c.wi = -1;
      c.ui = !1;
      c.xi = !1;
      c.qg = c.Ib - 0.4 * c.Ib;
      c.pr = c.qg / c.Ib;
      c.T.find(".flowpaper_fisheye_panelLeft").bind("mousedown", function() {
        c.nh(-20);
      });
      c.T.find(".flowpaper_fisheye_panelRight").bind("mousedown", function() {
        c.nh(20);
      });
      36 < c.qg && (c.qg = 36);
      c.T.find(".flowpaper_fisheye_panelLeft").css({
        opacity: 0,
        height: c.qg + "px",
        top: "-10px"
      });
      c.T.find(".flowpaper_fisheye_panelRight").css({
        height: c.qg + "px",
        top: "-10px"
      });
      c.T.css({
        top: c.Cf - (c.T.find(".flowpaper_fisheye_panelLeft").offset().top - jQuery(c.T).offset().top) + c.T.find(".flowpaper_fisheye_panelLeft").height() / 3
      });
      c.bh = 30 < c.T.find(".flowpaper_fisheye_panelLeft").height() ? 11 : 0.35 * c.T.find(".flowpaper_fisheye_panelLeft").height();
      c.T.find(".flowpaper_fisheye_leftArrow").xe(c.bh, c.I.ob ? c.I.ob : "#AAAAAA");
      c.T.find(".flowpaper_fisheye_rightArrow").vd(c.bh, c.I.ob ? c.I.ob : "#AAAAAA");
      jQuery(c).unbind("onThumbPanelThumbAdded");
      jQuery(c).bind("onThumbPanelThumbAdded", function(d, g) {
        var f = c.T.find(String.format('*[data-thumbIndex="{0}"]', g.mf));
        f.data("pageIndex");
        var l = (g.mf - 1) % 10;
        f && f.animate({
          opacity: 1
        }, 300);
        c.Yd < c.Aj && (c.bc - 20 + 1) / 2 + l + 2 > c.Yd && (c.Xp ? (c.Yd++, c.Xp = !1) : c.Yd = (c.bc - 20 + 1) / 2 + l + 2, c.Yd <= c.getTotalPages() && c.renderer.Pe(c, c.Yd, 2 * c.je));
        0 == l && f.height() - 10 < c.T.find(".flowpaper_fisheye_panelRight").height() && (c.T.find(".flowpaper_fisheye_panelLeft").css("top", c.T.find(".flowpaper_fisheye_panelLeft").height() - f.height() + 5 + "px"), c.T.find(".flowpaper_fisheye_panelLeft").height(c.T.find(".flowpaper_fisheye_panelLeft").height() - 3), c.T.find(".flowpaper_fisheye_panelRight").css("top", c.T.find(".flowpaper_fisheye_panelRight").height() - f.height() + 5 + "px"), c.T.find(".flowpaper_fisheye_panelRight").height(c.T.find(".flowpaper_fisheye_panelRight").height() - 3));
      });
      c.ul(19);
      c.PreviewMode || c.nh(0);
      1 != c.scale && c.T.animate({
        opacity: 0
      }, 0);
      c.Qa && c.I.Dh();
      c.$a && c.I.Ql();
    }
  };
  this.wh = function() {
    c.I.mk();
    if ("FlipView" == c.H && window.zine) {
      c.nc = c.ab && !c.I.qf ? c.I.Oa.height() : 0;
      c.Rb && c.ab && (c.nc = 5);
      c.document.StartAtPage && !c.Jg && (c.Jg = 0 == c.document.StartAtPage % 2 || c.I.Ba ? c.document.StartAtPage : c.document.StartAtPage - 1);
      c.Zf = !1;
      var d = 1400;
      "very fast" == c.I.Tc && (d = 300);
      "fast" == c.I.Tc && (d = 700);
      "slow" == c.I.Tc && (d = 2300);
      "very slow" == c.I.Tc && (d = 6300);
      c.em = 600;
      c.ta = jQuery(c.pages.J).turn({
        gradients: !eb.platform.android,
        acceleration: !0,
        elevation: 50,
        duration: d,
        page: c.Jg ? c.Jg : 1,
        display: c.I.Ba ? "single" : "double",
        pages: c.getTotalPages(),
        cornerDragging: c.document.EnableCornerDragging,
        disableCornerNavigation: c.I.tb,
        when: {
          turning: function(d, e) {
            c.pages.animating = !0;
            c.pages.Vf = null;
            c.pages.R = 0 != e % 2 || c.I.Ba ? e : e + 1;
            c.pages.R > c.getTotalPages() && (c.pages.R = c.pages.R - 1);
            if (1 != e || c.I.Ba) {
              c.I.Ba ? c.I.Ba && c.nc && jQuery(c.pages.J + "_parent").transition({
                x: 0,
                y: c.nc
              }, 0) : jQuery(c.pages.J + "_parent").transition({
                x: 0,
                y: c.nc
              }, c.em, "ease", function() {});
            } else {
              var g = c.Zf ? c.em : 0;
              jQuery(c.pages.J + "_parent").transition({
                x: -(c.pages.kd() / 4),
                y: c.nc
              }, g, "ease", function() {});
            }
            c.da = 1 < e ? c.pages.R : e;
            c.renderer.ie && c.Zf && c.pages.$e(e - 1);
            c.renderer.ie && c.Zf && c.pages.$e(e);
            "FlipView" == c.H && (!c.pages.pages[e - 1] || c.pages.pages[e - 1].uc || c.pages.pages[e - 1].pa || (c.pages.pages[e - 1].uc = !0, c.pages.pages[e - 1].Qc()), e < c.getTotalPages() && c.pages.pages[e] && !c.pages.pages[e].uc && !c.pages.pages[e].pa && (c.pages.pages[e].uc = !0, c.pages.pages[e].Qc()));
          },
          turned: function(d, e) {
            c.I.tb && c.ta ? c.pages.fe() || (c.ta.css({
              opacity: 1
            }), c.Rf ? (c.Zf = !0, c.pages.animating = !1, c.Gc(e), c.pages.jc(), c.L.trigger("onCurrentPageChanged", e), null != c.Zd && (c.Zd(), c.Zd = null)) : jQuery("#" + c.pages.Nb).animate({
              opacity: 0.5
            }, {
              duration: 50,
              always: function() {
                jQuery("#" + c.pages.Nb).animate({
                  opacity: 0
                }, {
                  duration: 50,
                  always: function() {
                    jQuery("#" + c.pages.Nb).css("z-index", -1);
                    c.Zf = !0;
                    c.pages.animating = !1;
                    c.Gc(e);
                    c.pages.jc();
                    c.L.trigger("onCurrentPageChanged", e);
                    null != c.Zd && (c.Zd(), c.Zd = null);
                  }
                });
              }
            })) : (c.Zf = !0, c.pages.animating = !1, c.Gc(e), c.pages.jc(), c.L.trigger("onCurrentPageChanged", e), null != c.Zd && (c.Zd(), c.Zd = null));
          },
          pageAdded: function(d, e) {
            var g = c.pages.getPage(e - 1);
            g.Uk();
            c.I.Ac.mo(g);
          },
          foldedPageClicked: function(d, e) {
            0 < c.N.find(".simplemodal-container").length || c.dj || (c.pages.fe() || c.pages.animating) && !c.I.ah || c.Qa || c.$a || requestAnim(function() {
              window.clearTimeout(c.Rf);
              c.Rf = null;
              e >= c.pages.R && e < c.getTotalPages() ? c.pages.Cj("next") : c.pages.Cj("previous");
            });
          },
          destroyed: function() {
            c.Bn && c.L.parent().remove();
          }
        }
      });
      jQuery(c.ta).bind("cornerActivated", function() {
        c.T && c.T.css({
          "z-index": 9,
          "pointer-events": "none"
        });
      });
      jQuery(c.K).trigger("onScaleChanged", 1 / c.document.MaxZoomSize);
    }
    if (c.backgroundColor && -1 == c.backgroundColor.indexOf("[") && !this.backgroundImage) {
      d = R(this.backgroundColor), d = "rgba(" + d.r + "," + d.g + "," + d.b + "," + (null != this.He ? parseFloat(this.He) : 1) + ")", jQuery(this.O.L).css("background", d), this.O.ab || jQuery(this.Oa).css("background", d);
    } else {
      if (c.backgroundColor && 0 <= c.backgroundColor.indexOf("[") && !this.backgroundImage) {
        var g = c.backgroundColor.split(",");
        g[0] = g[0].toString().replace("[", "");
        g[0] = g[0].toString().replace("]", "");
        g[0] = g[0].toString().replace(" ", "");
        g[1] = g[1].toString().replace("[", "");
        g[1] = g[1].toString().replace("]", "");
        g[1] = g[1].toString().replace(" ", "");
        d = g[0].toString().substring(0, g[0].toString().length);
        g = g[1].toString().substring(0, g[1].toString().length);
        jQuery(c.O.L).css("backgroundImage", "linear-gradient(top, " + d + ", " + g + ")");
      }
    }
    "FlipView" == c.H && !eb.platform.touchonlydevice && c.I.rj && c.I.fb ? (c.I.nk(), c.PreviewMode && c.I.ih()) : (c.T && (c.T.remove(), c.T = null), c.bc = -1);
    FlowPaperViewer_HTML.prototype.distance = function(c, d, e, g) {
      c = e - c;
      d = g - d;
      return Math.sqrt(c * c + d * d);
    };
    FlowPaperViewer_HTML.prototype.turn = function(c) {
      var d = this;
      d.I.yi && "None" != d.I.yi && (d.$i && d.$i.remove(), window.setTimeout(function() {
        d.$i = new oa(d.I.Ki + "../sounds/" + d.I.yi + ".mp3");
        d.$i.start();
      }, 200));
      var e = arguments[0],
        g = 2 == arguments.length ? arguments[1] : null;
      !d.I.tb || "next" != e && "previous" != e || d.Qa || d.$a ? (jQuery("#" + d.pages.Nb).css("z-index", -1), d.ta && (1 == arguments.length && d.ta.turn(arguments[0]), 2 == arguments.length && d.ta.turn(arguments[0], arguments[1]))) : !d.pages.fe() && !d.pages.animating || d.I.ah ? requestAnim(function() {
        window.clearTimeout(d.Rf);
        d.Rf = null;
        d.pages.Cj(e, g);
      }) : (window.clearTimeout(d.Rf), d.Rf = window.setTimeout(function() {
        d.turn(e, g);
      }, 500));
    };
    FlowPaperViewer_HTML.prototype.ql = function() {
      var c = this;
      c.ui || (c.ui = !0, c.xk && window.clearTimeout(c.xk), c.xk = requestAnim(function() {
        c.Ln(c);
      }, 40));
    };
    FlowPaperViewer_HTML.prototype.Ln = function(c) {
      c.Rl();
      c.ui = !1;
      c.xi && (c.xi = !1, c.ql());
    };
    FlowPaperViewer_HTML.prototype.Rl = function() {
      var c = this;
      c.T.find("li").each(function() {
        var d = c.ke;
        if (!(eb.browser.msie || eb.browser.safari && 5 > eb.browser.Kb) || c.ke) {
          if (d && jQuery(d).get(0).tagName && "IMG" != jQuery(d).get(0).tagName && "LI" != jQuery(d).get(0).tagName && "DIV" != jQuery(d).get(0).tagName && "CANVAS" != jQuery(d).get(0).tagName) {
            c.T.find("li").each(function() {
              jQuery(this).find("a").css({
                width: c.Ib,
                top: c.Ib / 3
              });
            });
          } else {
            var d = jQuery(this).offset().left + jQuery(this).outerWidth() / 2,
              e = jQuery(this).offset().top + jQuery(this).outerHeight() / 2,
              d = c.distance(d, e, c.vi, c.wi),
              d = (1 - Math.min(1, Math.max(0, d / c.Ak))) * c.yk + c.Ib,
              e = jQuery(this).find("a").find("canvas").data("origwidth"),
              g = jQuery(this).find("a").find("canvas").data("origheight"),
              f = d / e;
            e && g && (eb.browser.msie || eb.browser.safari && 5 > eb.browser.Kb ? (jQuery(this).find("a").animate({
              height: g * f,
              width: d,
              top: d / 3
            }, 0), jQuery(this).find("a").find("canvas").css({
              height: g * f,
              width: d,
              top: d / 3
            }), c.Mr = c.ke) : jQuery(this).find("a").css({
              width: d,
              top: d / 3
            }));
          }
        }
      });
    };
    jQuery(c.toolbar.K).css("visibility", "visible");
    c.T && c.T.css({
      "z-index": 9,
      "pointer-events": "none"
    });
    c.I.Oa.animate({
      opacity: 1
    }, 300);
    c.I.Gp && c.expandOutline();
  };
  this.dispose = function() {
    c.ta.turn("destroy");
    delete c.ta;
  };
  this.Ag = function() {
    c.ta = null;
  };
  this.switchMode = function(d, g) {
    c.ta && c.ta.turn("destroy");
    c.ta = null;
    "Portrait" == d || "SinglePage" == d ? (c.Sd = c.L.height(), c.Sd = c.Sd - jQuery(c.K).outerHeight() + 20, c.L.height(c.Sd)) : (c.Jg = 0 != g % 2 ? g - 1 : g, c.Sd = null, c.L.css({
      left: "0px",
      top: "0px",
      position: "relative",
      width: c.L.parent().width() + "px",
      height: c.L.parent().height() + "px"
    }), c.ak());
    "FlipView" == c.H && "FlipView" != d && (c.config.document.MinZoomSize = 1, jQuery(c.pages.J).turn("destroy"), c.T && c.T.remove());
    c.pages.$d && c.pages.Gd && c.pages.Gd();
    "FlipView" != d && c.config.document.jl && (c.config.document.MinZoomSize = c.config.document.jl);
    "FlipView" == d && (c.scale = 1, c.H = "FlipView", c.I.tb = c.I.ii());
  };
  this.ii = function() {
    return c.config.document.EnableWebGL && !eb.platform.lb && !eb.platform.android && !eb.browser.mh && !c.I.Ba && eb.browser.capabilities.iq && "Flip-SinglePage" != c.config.document.InitViewMode && window.THREE;
  };
  this.gotoPage = function(d, g) {
    "FlipView" == c.H && c.pages.bo(d, g);
  };
  this.Gc = function(d) {
    if ("FlipView" == c.H) {
      1 < c.pages.R && 1 == c.scale ? jQuery(c.pages.J + "_panelLeft").animate({
        opacity: 1
      }, 100) : 1 == c.pages.R && jQuery(c.pages.J + "_panelLeft").animate({
        opacity: 0
      }, 100);
      if (c.pages.R < c.getTotalPages() && 1.1 >= c.scale) {
        1 < c.getTotalPages() && jQuery(c.pages.J + "_panelRight").animate({
          opacity: 1
        }, 100), c.T && "1" != c.T.css("opacity") && window.setTimeout(function() {
          1.1 >= c.scale && (c.T.show(), c.T.animate({
            opacity: 1
          }, 100));
        }, 700);
      } else {
        if (1.1 < c.scale || c.pages.R + 2 >= c.getTotalPages() || 0 != c.getTotalPages() % 2 && c.pages.R + 1 >= c.getTotalPages()) {
          jQuery(c.pages.J + "_panelRight").animate({
            opacity: 0
          }, 100), 1 == c.scale && 0 == c.getTotalPages() % 2 && c.pages.R - 1 <= c.getTotalPages() ? c.T && (c.T.show(), c.T.animate({
            opacity: 1
          }, 100)) : c.T && c.T.animate({
            opacity: 0
          }, 0, function() {
            c.T.hide();
          });
        }
      }
      eb.platform.touchonlydevice || (window.clearTimeout(c.ro), c.ro = setTimeout(function() {
        0 != parseInt(d) % 2 && (d = d - 1);
        var g = [d - 1];
        1 < d && parseInt(d) + 1 <= c.document.numPages && !c.Ba && g.push(d);
        for (var h = 0; h < g.length; h++) {
          jQuery(".flowpaper_mark_link, .pdfPageLink_" + g[h]).stop(), jQuery(".flowpaper_mark_link, .pdfPageLink_" + g[h]).css({
            background: c.linkColor,
            opacity: c.Ic
          }), jQuery(".flowpaper_mark_link, .pdfPageLink_" + g[h]).animate({
            opacity: 0
          }, {
            duration: 1700,
            complete: function() {}
          });
        }
      }, 100));
    }
  };
  this.Dh = function() {
    this.F.T && (this.zk = this.F.T.css("margin-left"), this.F.T.animate({
      "margin-left": parseFloat(this.F.T.css("margin-left")) + 0.5 * this.F.Qa.width() + "px"
    }, 200));
  };
  this.Ql = function() {
    this.F.T && (this.zk = this.F.T.css("margin-left"), this.F.T.animate({
      "margin-left": parseFloat(this.F.T.css("margin-left")) + 0.5 * this.F.$a.width() + "px"
    }, 200));
  };
  this.Kf = function() {
    this.F.T && this.F.T.animate({
      "margin-left": parseFloat(this.zk) + "px"
    }, 200);
  };
  this.resize = function(d, g, h, f) {
    if (!$(".flowpaper_videoframe").length || !eb.platform.ios) {
      if (c.nc = c.ab && !c.I.qf ? c.I.Oa.height() : 0, c.I.mk(), "FlipView" == c.H && c.pages) {
        var k = -1 < c.L.get(0).style.width.indexOf("%"),
          l = -1 < c.L.get(0).style.width.indexOf("%");
        k && (c.Qa || c.$a) && (c.L.data("pct-width", c.L.get(0).style.width), k = !1);
        l && (c.Qa || c.$a) && (c.L.data("pct-height", c.L.get(0).style.height), l = !1);
        k || !c.L.data("pct-width") || c.Qa || c.$a || (c.L.css("width", c.L.data("pct-width")), k = !0);
        l || !c.L.data("pct-height") || c.Qa || c.$a || (c.L.css("height", c.L.data("pct-height")), l = !0);
        c.L.css({
          width: k ? c.L.get(0).style.width : d - (c.Qa ? c.Qa.width() : 0) - (c.$a ? c.$a.width() : 0),
          height: l ? c.L.get(0).style.height : g - 35
        });
        d = c.L.width();
        g = c.L.height();
        k && l || (d - 5 < jQuery(document.body).width() && d + 5 > jQuery(document.body).width() && g + 37 - 5 < jQuery(document.body).height() && g + 37 + 5 > jQuery(document.body).height() ? (c.N.css({
          width: "100%",
          height: "100%"
        }), c.I.qf && jQuery(jQuery(c.L).css("height", jQuery(c.L).height() - 40 + "px"))) : null != h && 1 != h || c.N.css({
          width: d + (c.Qa ? c.Qa.width() : 0) + (c.$a ? c.$a.width() : 0),
          height: g + 37
        }));
        c.pages.resize(d, g, f);
        c.T && c.L && (c.Cf = jQuery(c.L).offset().top + jQuery(c.pages.J).height() - jQuery(c.N).offset().top + c.nc, c.T.css({
          top: c.Cf - (c.T.find(".flowpaper_fisheye_panelLeft").offset().top - jQuery(c.T).offset().top) + c.T.find(".flowpaper_fisheye_panelLeft").height() / 2
        }), c.je = 0.25 * c.L.height());
        for (d = 0; d < c.document.numPages; d++) {
          c.pages.Ua(d) && (c.pages.pages[d].Bl = !0, c.pages.pages[d].pa = !1);
        }
        window.clearTimeout(c.jq);
        c.jq = setTimeout(function() {
          c.jc();
          c.pages.Ea();
        }, 350);
      }
    }
  };
  this.setCurrentCursor = function() {};
  this.sp = function(c, d) {
    var h = this.I;
    "brandingUrl" == c && (h.O.config.document.BrandingUrl = d);
    "brandingLogo" == c && ((h.O.config.document.BrandingLogo = d) && 0 < d.length ? (h.O.N.append(String.format("<div class='flowpaper_custom_logo'><a href='#' data-brandingUrl='{1}'><img src='{0}' border='0' width='80'></a></div>", h.O.config.document.BrandingLogo, h.O.config.document.BrandingUrl ? h.O.config.document.BrandingUrl : "#")), h.O.N.find(".flowpaper_custom_logo").bind("click", function() {
      jQuery(h.O.L).trigger("onExternalLinkClicked", $(this).find("a").attr("data-brandingUrl"));
    })) : h.O.N.find(".flowpaper_custom_logo").remove());
    if ("backgroundColor" == c || "backgroundAlpha" == c || "stretchBackground" == c || "backgroundImage" == c) {
      if ("backgroundColor" == c && (h.backgroundColor = d), "backgroundAlpha" == c && (h.He = d), "stretchBackground" == c && (h.uj = d), "backgroundImage" == c && (h.backgroundImage = d), h.backgroundImage) {
        FLOWPAPER.authenticated && (h.backgroundImage = FLOWPAPER.appendUrlParameter(h.backgroundImage, FLOWPAPER.authenticated.getParams())), h.uj ? (jQuery(h.O.L).css("background-color", ""), jQuery(h.O.L).css("background", ""), jQuery(h.O.N).css({
          background: "url('" + h.backgroundImage + "')",
          "background-size": "cover"
        }), jQuery(h.O.L).css("background-size", "cover")) : (jQuery(h.O.L).css("background", ""), jQuery(h.O.N).css({
          background: "url('" + h.backgroundImage + "')",
          "background-color": h.backgroundColor
        }), jQuery(h.O.L).css("background-size", ""), jQuery(h.O.L).css("background-position", "center"), jQuery(h.O.N).css("background-position", "center"), jQuery(h.O.L).css("background-repeat", "no-repeat"), jQuery(h.O.N).css("background-repeat", "no-repeat"));
      } else {
        if (h.backgroundColor && -1 == h.backgroundColor.indexOf("[")) {
          var f = R(h.backgroundColor),
            f = "rgba(" + f.r + "," + f.g + "," + f.b + "," + (null != h.He ? parseFloat(h.He) : 1) + ")";
          jQuery(h.O.L).css("background", f);
          jQuery(h.O.N).css("background", f);
          h.O.ab || jQuery(h.Oa).css("background", f);
        } else {
          if (h.backgroundColor && 0 <= h.backgroundColor.indexOf("[")) {
            var k = h.backgroundColor.split(",");
            k[0] = k[0].toString().replace("[", "");
            k[0] = k[0].toString().replace("]", "");
            k[0] = k[0].toString().replace(" ", "");
            k[1] = k[1].toString().replace("[", "");
            k[1] = k[1].toString().replace("]", "");
            k[1] = k[1].toString().replace(" ", "");
            f = k[0].toString().substring(0, k[0].toString().length);
            k = k[1].toString().substring(0, k[1].toString().length);
            jQuery(h.O.L).css("background", "");
            jQuery(h.O.N).css({
              background: "linear-gradient(" + f + ", " + k + ")"
            });
            jQuery(h.O.N).css({
              background: "-webkit-linear-gradient(" + f + ", " + k + ")"
            });
            eb.browser.msie && 10 > eb.browser.version && (jQuery(h.O.L).css("filter", "progid:DXImageTransform.Microsoft.gradient(GradientType=0,startColorStr='" + f + "', endColorStr='" + k + "');"), jQuery(h.O.N).css("filter", "progid:DXImageTransform.Microsoft.gradient(GradientType=0,startColorStr='" + f + "', endColorStr='" + k + "');"));
          } else {
            jQuery(h.O.N).css("background-color", "#222222");
          }
        }
      }
    }
    if ("panelColor" == c || "navPanelBackgroundAlpha" == c) {
      "panelColor" == c && (h.kb = d), "navPanelBackgroundAlpha" == c && (h.ue = d), h.kb ? (jQuery(h.toolbar.K).css("background-color", h.kb), jQuery(h.toolbar.K).css("border-color", h.kb)) : eb.platform.touchonlydevice ? !jQuery(toolbar_el).attr("gradients") || jQuery(toolbar_el).attr("gradients") && "true" == jQuery(toolbar_el).attr("gradients") ? jQuery(h.toolbar.K).addClass("flowpaper_toolbarios_gradients") : jQuery(h.toolbar.K).css("background-color", "#555555") : jQuery(h.toolbar.K).css("background-color", "#555555"), f = R(h.kb), jQuery(h.F.pages.J + "_panelLeft").css("background-color", "rgba(" + f.r + "," + f.g + "," + f.b + "," + h.ue + ")"), jQuery(h.F.pages.J + "_panelRight").css("background-color", "rgba(" + f.r + "," + f.g + "," + f.b + "," + h.ue + ")");
    }
    "linkColor" == c && (h.linkColor = d, h.O.linkColor = h.linkColor, jQuery("a.flowpaper_interactiveobject_documentViewer").css("background-color", h.linkColor), h.Gc(h.O.getCurrPage()));
    "linkAlpha" == c && (h.Ic = d, h.O.Ic = h.Ic, jQuery("a.flowpaper_interactiveobject_documentViewer").css("opacity", h.Ic), h.Gc(h.O.getCurrPage()));
    "arrowColor" == c && (h.O.ob = d, h.O.I.ob = d, h.O.T.find(".flowpaper_fisheye_leftArrow").xe(h.O.bh, h.O.I.ob ? h.O.I.ob : "#AAAAAA"), h.O.T.find(".flowpaper_fisheye_rightArrow").vd(h.O.bh, h.O.I.ob ? h.O.I.ob : "#AAAAAA"), f = jQuery(h.O.pages.J + "_arrowleft").css("border-bottom"), f = parseInt(f.substr(0, f.indexOf("px"))), jQuery(h.O.pages.J + "_arrowleft").xe(f, h.O.ob), jQuery(h.O.pages.J + "_arrowright").vd(f, h.O.ob), h.O.I.pg && (f = jQuery(h.O.pages.J + "_arrowleftbottom").css("border-bottom"), f = f.substr(0, f.indexOf("px")), jQuery(h.O.pages.J + "_arrowleftbottom").xe(f, h.O.ob), jQuery(h.O.pages.J + "_arrowleftbottommarker").fj(f, h.O.ob, jQuery(h.O.pages.J + "_arrowleftbottom")), jQuery(h.O.pages.J + "_arrowrightbottom").vd(f, h.O.ob), jQuery(h.O.pages.J + "_arrowrightbottommarker").gj(f, h.O.ob, jQuery(h.O.pages.J + "_arrowrightbottom"))));
    "enablePageShadows" == c && (h.O.Qe = d, h.O.Qe ? (jQuery(".flowpaper_zine_page_left_noshadow").addClass("flowpaper_zine_page_left").removeClass("flowpaper_zine_page_left_noshadow"), jQuery(".flowpaper_zine_page_right_noshadow").addClass("flowpaper_zine_page_right").removeClass("flowpaper_zine_page_right_noshadow")) : (jQuery(".flowpaper_zine_page_left").addClass("flowpaper_zine_page_left_noshadow").removeClass("flowpaper_zine_page_left"), jQuery(".flowpaper_zine_page_right").addClass("flowpaper_zine_page_right_noshadow").removeClass("flowpaper_zine_page_right")), jQuery(window).trigger("resize"));
    if ("arrowSize" == c) {
      h.O.I.yf = h.O.pages.fa = h.O.yf = d;
      jQuery(window).trigger("resize");
      var f = h.O.pages,
        k = h.O.I.ob ? h.O.I.ob : "#AAAAAA",
        l = f.We();
      jQuery(f.J + "_arrowleft").xe(f.fa - 0.4 * f.fa, k);
      jQuery(f.J + "_arrowright").vd(f.fa - 0.4 * f.fa, k);
      jQuery(f.J + "_arrowleft").css({
        left: (f.fa - (f.fa - 0.4 * f.fa)) / 2 + "px",
        top: l / 2 - f.fa + "px"
      });
      jQuery(f.J + "_arrowright").css({
        left: (f.fa - (f.fa - 0.4 * f.fa)) / 2 + "px",
        top: l / 2 - f.fa + "px"
      });
    }
  };
  this.Hn = function(c, d) {
    var h = this.I;
    d ? jQuery(".flowpaper_" + c).show() : jQuery(".flowpaper_" + c).hide();
    "txtPageNumber" == c && (d ? jQuery(".flowpaper_lblTotalPages").show() : jQuery(".flowpaper_lblTotalPages").hide());
    "txtSearch" == c && (d ? jQuery(".flowpaper_bttnFind").show() : jQuery(".flowpaper_bttnFind").hide());
    "firstLastButton" == c && (h.O.I.pg = d, h.O.I.pg ? (jQuery(h.O.pages.J + "_arrowleftbottom").css("opacity", 1), jQuery(h.O.pages.J + "_arrowleftbottommarker").css("opacity", 1), jQuery(h.O.pages.J + "_arrowrightbottom").css("opacity", 1), jQuery(h.O.pages.J + "_arrowrightbottommarker").css("opacity", 1)) : (jQuery(h.O.pages.J + "_arrowleftbottom").css("opacity", 0), jQuery(h.O.pages.J + "_arrowleftbottommarker").css("opacity", 0), jQuery(h.O.pages.J + "_arrowrightbottom").css("opacity", 0), jQuery(h.O.pages.J + "_arrowrightbottommarker").css("opacity", 0)));
    if ("toolbarstd" == c) {
      var f = h.O.pages.We(),
        k = h.O.I.Oa.height();
      jQuery(h.O.pages.J + "_parent").css("padding-top", "");
      jQuery(h.O.pages.J + "_parent").css("margin-top", "");
      h.rf = d;
      h.O.pages.Db = h.O.Rb && !h.O.I.fb || 0 == k ? (h.L.height() - f) / 2 : 0;
      h.O.pages.Db = 0 == h.O.pages.Db && h.O.ab && !h.O.Rb && 0 < k && !h.O.I.fb ? (h.L.height() - f) / 2 - k : h.O.pages.Db;
      h.O.ab || h.O.I.fb ? 0 < h.O.pages.Db && !h.O.I.fb && jQuery(h.O.pages.J + "_parent").css("padding-top", h.O.pages.Db + "px") : jQuery(h.O.pages.J + "_parent").css("margin-top", "2.5%");
      jQuery(window).trigger("resize");
    }
    "navPanelsVisible" == c && (h.gf = d, h.gf ? (jQuery(h.O.pages.J + "_panelLeft").css("opacity", 1), jQuery(h.O.pages.J + "_panelRight").css("opacity", 1)) : (jQuery(h.O.pages.J + "_panelLeft").css("opacity", 0), jQuery(h.O.pages.J + "_panelRight").css("opacity", 0)));
    "fisheye" == c && (h.fb = d, f = h.O.pages.We(), k = h.O.I.Oa.height(), jQuery(h.O.pages.J + "_parent").css("padding-top", ""), jQuery(h.O.pages.J + "_parent").css("margin-top", ""), h.O.pages.Db = h.O.Rb && !h.O.I.fb || 0 == k ? (h.L.height() - f) / 2 : 0, h.O.pages.Db = 0 == h.O.pages.Db && h.O.ab && !h.O.Rb && 0 < k && !h.O.I.fb ? (h.L.height() - f) / 2 - k : h.O.pages.Db, h.O.ab || h.O.I.fb ? 0 < h.O.pages.Db && !h.O.I.fb ? (jQuery(h.O.pages.J + "_parent").css("margin-top", ""), jQuery(h.O.pages.J + "_parent").css("padding-top", h.O.pages.Db + "px")) : jQuery(h.O.pages.J + "_parent").css("padding-top", "") : (jQuery(h.O.pages.J + "_parent").css("padding-top", ""), jQuery(h.O.pages.J + "_parent").css("margin-top", "2.5%")), h.fb ? jQuery(".flowpaper_fisheye").css("visibility", "") : jQuery(".flowpaper_fisheye").css("visibility", "hidden"), jQuery(window).trigger("resize"));
  };
  window[this.O.af].setStyleSetting = this.sp;
  FLOWPAPER.setStyleSetting = function(c, d) {
    $FlowPaper("documentViewer").setStyleSetting(c, d);
  };
  window[this.O.af].enableDisableUIControl = this.Hn;
  FLOWPAPER.enableDisableUIControl = function(c, d) {
    $FlowPaper("documentViewer").enableDisableUIControl(c, d);
  };
  window[this.O.af].changeConfigSetting = this.rn;
  window[this.O.af].loadUIConfig = function(c) {
    var d = this;
    jQuery("#" + d.Ia + "_wrap").remove();
    d.Toolbar = d.N.prepend("<div id='" + d.Ia + "' class='flowpaper_toolbarstd' style='z-index:200;overflow-y:hidden;overflow-x:hidden;'></div>").parent();
    d.I.Oa = d.Rb ? jQuery("#" + d.Ia).wrap("<div id='" + d.Ia + "_wrap' style='" + (d.ab ? "position:absolute;z-index:50;" : "") + "text-align:center;width:100%;position:absolute;z-index:100;top:-70px'></div>").parent() : jQuery("#" + d.Ia).wrap("<div id='" + d.Ia + "_wrap' style='" + (d.ab ? "position:absolute;z-index:50;" : "") + "text-align:center;width:100%;'></div>").parent();
    d.I.dl(c, function() {
      d.toolbar.bindEvents(d.L);
      d.toolbar.yc = null;
      d.toolbar.$j(d.config.document.MinZoomSize, d.config.document.MaxZoomSize);
    });
  };
};
window.FlowPaper_Resources = function(f) {
  this.F = f;
  this.ka = {};
  this.ka.kq = "";
  this.ka.Nm = "";
  this.ka.Jm = "";
  this.ka.vm = "";
  this.ka.Mm = "";
  this.ka.Qm = "";
  this.ka.Pm = "";
  this.ka.Im = "";
  this.ka.Hm = "";
  this.ka.zm = "";
  this.ka.sm = "";
  this.ka.tm = "";
  this.ka.Om = "";
  this.ka.Bm = "";
  this.ka.ym = "";
  this.ka.Lm = "";
  this.ka.yq = "";
  this.ka.Aq = "";
  this.ka.Bq = "";
  this.ka.Gq = "";
  this.ka.Eq = "";
  this.ka.Kq = "";
  this.ka.Lq = "";
  this.ka.Mq = "";
  this.ka.Jq = "";
  this.ka.Nq = "";
  this.To = function() {
    var c = this.F,
      d = this,
      e = -1 === document.URL.indexOf("http://") && -1 === document.URL.indexOf("https://");
    W();
    var g = window.navigator.cg || window.matchMedia("(display-mode: standalone)").matches,
      h = !0,
      h = h = "",
      h = ["Z1n3d0ma1n"],
      h = h[0],
      h = c.resources.lm(h, g && e);
    h || (h = ["d0ma1n"], h = h[0] + "#FlexPaper-1-4-5-Annotations-1.0.10", h = c.resources.lm(h, g && e));
    h || alert("License key not accepted. Please check your configuration settings.");
    jQuery(".flowpaper_tbloader").hide();
    h && (c.Si = new Image, jQuery(c.Si).bind("load", function() {
      jQuery(d).trigger("onPostinitialized");
    }), c.Si.src = c.Sj);
  };
  this.lm = function(c, d) {
    var e = this.F,
      g = Math.pow(9, 3),
      h = Math.pow(6, 2),
      f = null != e.config.key && 0 < e.config.key.length && 0 <= e.config.key.indexOf("@"),
      k = function() {
        var c = Array.prototype.slice.call(arguments),
          d = c.shift();
        return c.reverse().map(function(c, e) {
          return String.fromCharCode(c - d - 28 - e);
        }).join("");
      }(14, 144, 124) + (20196).toString(36).toLowerCase() + function() {
        var c = Array.prototype.slice.call(arguments),
          d = c.shift();
        return c.reverse().map(function(c, e) {
          return String.fromCharCode(c - d - 9 - e);
        }).join("");
      }(27, 150, 102, 155) + (928).toString(36).toLowerCase(),
      k = parseInt(g) + Da(!0) + k,
      h = parseInt(h) + Da(!0) + "AdaptiveUId0ma1n",
      g = ja(parseInt(g) + (f ? e.config.key.split("$")[0] : Da(!0)) + c),
      h = ja(h),
      k = ja(k),
      g = "$" + g.substring(11, 30).toLowerCase(),
      h = "$" + h.substring(11, 30).toLowerCase(),
      k = "~" + k.substring(11, 30).toLowerCase();
    return validated = d ? W() || e.config.key == k : W() || e.config.key == g || e.config.key == h || f && g == "$" + e.config.key.split("$")[1];
  };
  this.initialize = function() {
    var c = this.F;
    c.N.prepend(String.format("<div id='modal-I' class='modal-content'><p><a href='https://flowpaper.com/?ref=FlowPaper' target='_new'><img src='{0}' style='display:block;width:100px;heigh:auto;padding-bottom:10px;' border='0' /></a></p>FlowPaper  web PDF viewer 3.2.9. Developed by Devaldi Ltd.<br/><a href='https://flowpaper.com/' target='_new'>Click here for more information about this online PDF viewer</a></div>", "data:image/png;base64,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"));
    c.about = FLOWPAPER.about = function() {
      jQuery("#modal-I").smodal();
    };
    c.config.document.BrandingLogo && 3 < c.config.document.BrandingLogo.length && jQuery(c.L).bind("onPagesContainerCreated", function() {
      c.N.append(String.format("<div class='flowpaper_custom_logo'><a href='#' data-brandingUrl='{1}'><img src='{0}' border='0' width='80'></a></div>", c.config.document.BrandingLogo, c.config.document.BrandingUrl ? c.config.document.BrandingUrl : "#"));
      c.N.find(".flowpaper_custom_logo").bind("click", function() {
        jQuery(c.L).trigger("onExternalLinkClicked", $(this).find("a").attr("data-brandingUrl"));
      });
    });
  };
};

function Da(f) {
  var c = window.location.href.toString();
  0 == c.length && (c = document.URL.toString());
  if (f) {
    var d;
    d = c.indexOf("///");
    0 <= d ? d = d + 3 : (d = c.indexOf("//"), d = 0 <= d ? d + 2 : 0);
    c = c.substr(d);
    d = c.indexOf(":");
    var e = c.indexOf("/");
    0 < d && 0 < e && d < e || (0 < e ? d = e : (e = c.indexOf("?"), d = 0 < e ? e : c.length));
    c = c.substr(0, d);
  }
  if (f && (f = c.split(".")) && (d = f.length, !(2 >= d))) {
    if (!(e = -1 != "co,com,net,org,web,gov,edu,".indexOf(f[d - 2] + ","))) {
      b: {
        for (var e = ".ac.uk .ab.ca .bc.ca .mb.ca .nb.ca .nf.ca .nl.ca .ns.ca .nt.ca .nu.ca .on.ca .pe.ca .qc.ca .sk.ca .yk.ca".split(" "), g = 0; g < e.length;) {
          var h = e[g];
          if (-1 !== c.indexOf(h, c.length - h.length)) {
            e = !0;
            break b;
          }
          g++;
        }
        e = !1;
      }
    }
    c = e ? f[d - 3] + "." + f[d - 2] + "." + f[d - 1] : f[d - 2] + "." + f[d - 1];
  }
  return c;
}

function W() {
  var f = Da(!1),
    c = window.navigator.cg || window.matchMedia("(display-mode: standalone)").matches,
    d = -1 === document.URL.indexOf("http://") && -1 === document.URL.indexOf("https://");
  return c || d ? !1 : 0 == f.indexOf("http://localhost/") || 0 == f.indexOf("http://localhost:") || 0 == f.indexOf("http://localhost:") || 0 == f.indexOf("http://192.168.") || 0 == f.indexOf("http://127.0.0.1") || 0 == f.indexOf("https://localhost/") || 0 == f.indexOf("https://localhost:") || 0 == f.indexOf("https://localhost:") || 0 == f.indexOf("https://192.168.") || 0 == f.indexOf("https://127.0.0.1") || 0 == f.indexOf("http://10.1.1.") || 0 == f.indexOf("http://git.devaldi.com") || 0 == f.indexOf("https://online.flowpaper.com") || 0 == f.indexOf("http://online.flowpaper.com") || 0 == f.indexOf("file://") ? !0 : 0 == f.indexOf("http://") ? !1 : 0 == f.indexOf("/") ? !0 : !1;
}
var Ba = function() {
    function f() {}
    f.prototype = {
      Kd: function(c, d) {
        if (d.Xa && (d.Oi || d.create(d.pages.J), !d.initialized)) {
          c.rb = d.rb = c.config.MixedMode;
          c.im = !1;
          c.jm = !1;
          var e = d.V;
          0 == jQuery(e).length && (e = jQuery(d.Mc).find(d.V));
          if ("FlipView" == d.H) {
            var g = 0 != d.pageNumber % 2 ? "flowpaper_zine_page_left" : "flowpaper_zine_page_right";
            0 == d.pageNumber && (g = "flowpaper_zine_page_left_noshadow");
            d.F.Qe || (g = 0 != d.pageNumber % 2 ? "flowpaper_zine_page_left_noshadow" : "flowpaper_zine_page_right_noshadow");
            jQuery(e).append("<div id='" + d.aa + "_canvascontainer' style='height:100%;width:100%;position:relative;'><canvas id='" + c.Ca(1, d) + "' style='position:relative;left:0px;top:0px;height:100%;width:100%;" + (c.im ? "" : "background-repeat:no-repeat;background-size:100% 100%;background-color:#ffffff;") + "display:none;' class='flowpaper_interactivearea flowpaper_grab flowpaper_hidden flowpaper_flipview_canvas flowpaper_flipview_page' width='100%' height='100%' ></canvas><canvas id='" + c.Ca(2, d) + "' style='position:relative;left:0px;top:0px;width:100%;height:100%;display:block;background-repeat:no-repeat;background-size:100% 100%;background-color:#ffffff;display:none;' class='flowpaper_border flowpaper_interactivearea flowpaper_grab flowpaper_rescale flowpaper_flipview_canvas_highres flowpaper_flipview_page' width='100%' height='100%'></canvas><div id='" + d.aa + "_textoverlay' style='position:absolute;z-index:11;left:0px;top:0px;width:100%;height:100%;' class='" + g + "'></div></div>");
            if (eb.browser.chrome || eb.browser.safari) {
              eb.browser.safari && (jQuery("#" + c.Ca(1, d)).css("-webkit-backface-visibility", "hidden"), jQuery("#" + c.Ca(2, d)).css("-webkit-backface-visibility", "hidden")), jQuery("#" + d.aa + "_textoverlay").css("-webkit-backface-visibility", "hidden");
            }
            eb.browser.mozilla && (jQuery("#" + c.Ca(1, d)).css("backface-visibility", "hidden"), jQuery("#" + c.Ca(2, d)).css("backface-visibility", "hidden"), jQuery("#" + d.aa + "_textoverlay").css("backface-visibility", "hidden"));
          }
          d.initialized = !0;
        }
      },
      xp: function(c, d) {
        if ("FlipView" == d.H && 0 == jQuery("#" + c.Ca(1, d)).length || "FlipView" == d.H && d.pa) {
          return !1;
        }
        "FlipView" != d.H || null != d.context || d.uc || d.pa || (d.Qc(), d.uc = !0);
        return !0;
      },
      wp: function(c, d) {
        return 1 == d.scale || 1 < d.scale && d.pageNumber == d.pages.R - 1 || d.pageNumber == d.pages.R - 2;
      },
      $b: function(c, d, e, g) {
        1 == d.scale && eb.browser.safari ? (jQuery("#" + c.Ca(1, d)).css("-webkit-backface-visibility", "hidden"), jQuery("#" + c.Ca(2, d)).css("-webkit-backface-visibility", "hidden"), jQuery("#" + d.aa + "_textoverlay").css("-webkit-backface-visibility", "hidden")) : eb.browser.safari && (jQuery("#" + c.Ca(1, d)).css("-webkit-backface-visibility", "visible"), jQuery("#" + c.Ca(2, d)).css("-webkit-backface-visibility", "visible"), jQuery("#" + d.aa + "_textoverlay").css("-webkit-backface-visibility", "visible"));
        if ("FlipView" != d.H || 0 != jQuery("#" + c.Ca(1, d)).length) {
          if ("FlipView" != d.H || !d.pa) {
            if ("FlipView" == d.H && 1 < d.scale) {
              if (d.pageNumber == d.pages.R - 1 || d.pageNumber == d.pages.R - 2) {
                jQuery(c).trigger("UIBlockingRenderingOperation", {
                  P: c.P,
                  Ro: !0
                });
                var h = 3 > d.scale ? 2236 : 3236;
                magnifier = h * Math.sqrt(1 / (d.xa() * d.Ga()));
                d.ga.width = d.xa() * magnifier;
                d.ga.height = d.Ga() * magnifier;
              } else {
                c.si = !1, d.ga.width = 2 * d.xa(), d.ga.height = 2 * d.Ga(), d.pa = !0, jQuery("#" + d.Eb).xd(), c.Pk(d), eb.platform.touchdevice && (null != c.Ji && window.clearTimeout(c.Ji), c.Ji = setTimeout(function() {}, 1500)), null != g && g();
              }
            } else {
              d.rb && c.pageImagePattern && !d.mi ? (d.Jc && d.Jc(c.ia(d.pageNumber + 1), c.ia(d.pageNumber + 2)), d.dimensions.loaded || c.tc(d.pageNumber + 1, !0, function() {
                c.Dc(d);
              }, !0, d), d.Um = !0, c.im ? (d.U = new Image, jQuery(d.U).bind("load", function() {
                d.Hr = !0;
                d.Xe = !0;
                d.Ye = this.height;
                d.Ze = this.width;
                c.vp(d);
                d.dimensions.na > d.dimensions.width && (d.dimensions.width = d.dimensions.na, d.dimensions.height = d.dimensions.za);
                d.Fb = !1;
                c.ge();
              }), jQuery(d.U).attr("src", c.ia(d.pageNumber + 1))) : null == d.U ? (d.Fb = !0, d.U = new Image, jQuery(d.U).bind("load", function() {
                jQuery(d.Yb).remove();
                jQuery(d.ga).css("background-image", "url('" + c.ia(d.pageNumber + 1) + "')");
                d.Fb = !1;
                c.ge();
              }), jQuery(d.U).bind("error", function() {
                jQuery.ajax({
                  url: this.src,
                  type: "HEAD",
                  error: function(h) {
                    if (404 == h.status || 500 <= h.status) {
                      d.mi = !0, d.Fb = !1, d.Um = !0, d.pa = !1, 1 == d.pageNumber && d.F.pages.Gd && d.F.pages.Gd(), c.$b(d, e, g);
                    }
                  },
                  success: function() {}
                });
              }), jQuery(d.U).bind("error", function() {
                jQuery(d.Yb).remove();
                jQuery(d.ga).css("background-image", "url('" + c.ia(d.pageNumber + 1) + "')");
                d.Fb = !1;
                c.ge();
              }), jQuery(d.U).attr("src", c.ia(d.pageNumber + 1)), c.Ji = setTimeout(function() {
                d.Fb && ("none" == jQuery(d.ga).css("background-image") && jQuery(d.ga).css("background-image", "url('" + c.ia(d.pageNumber + 1) + "')"), d.Fb = !1, c.ge());
              }, 6000)) : d.Fb || "none" == jQuery(d.ga).css("background-image") && jQuery(d.ga).css("background-image", "url('" + c.ia(d.pageNumber + 1) + "')"), c.Se(d, g)) : !c.wa && c.bb ? (magnifier = 1236 * Math.sqrt(1 / (d.xa() * d.Ga())), d.ga.width = d.xa() * magnifier, d.ga.height = d.Ga() * magnifier) : (d.ga.width = 1 * d.xa(), d.ga.height = 1 * d.Ga());
            }
          }
        }
      },
      cq: function(c, d) {
        return "FlipView" == d.H;
      },
      pj: function(c, d) {
        "FlipView" == d.H && (1 < d.scale ? (d.Eb = c.Ca(2, d), d.Mf = c.Ca(1, d)) : (d.Eb = c.Ca(1, d), d.Mf = c.Ca(2, d)));
      },
      Se: function(c, d) {
        "FlipView" == d.H && (1 < d.scale ? requestAnim(function() {
          var e = jQuery("#" + c.Ca(2, d)).get(0);
          eb.browser.safari && c.jm && (jQuery(e).css("background-image", "url('" + e.toDataURL() + "')"), e.width = 100, e.height = 100);
          jQuery("#" + c.Ca(1, d)).rc();
        }) : (jQuery("#" + c.Ca(1, d)).xd(), jQuery("#" + c.Ca(2, d)).rc(), eb.browser.safari && c.jm && jQuery("#" + c.Ca(2, d)).css("background-image", "")), d.rb && c.pageImagePattern && 1 == d.scale || jQuery(d.Yb).remove());
        jQuery(c).trigger("UIBlockingRenderingOperationCompleted", {
          P: c.P
        });
        c.ge();
      }
    };
    CanvasPageRenderer.prototype.rh = function(c) {
      return "FlipView" == c.H ? 1 : 1.4;
    };
    CanvasPageRenderer.prototype.vp = function(c) {
      var d = c.ga;
      if (1 == c.scale && d && (100 == d.width || jQuery(d).hasClass("flowpaper_redraw")) && d) {
        d.width = c.xa();
        d.height = c.Ga();
        var e = d.getContext("2d"),
          g = document.createElement("canvas"),
          h = g.getContext("2d");
        g.width = c.U.width;
        g.height = c.U.height;
        h.drawImage(c.U, 0, 0, g.width, g.height);
        h.drawImage(g, 0, 0, 0.5 * g.width, 0.5 * g.height);
        e.drawImage(g, 0, 0, 0.5 * g.width, 0.5 * g.height, 0, 0, d.width, d.height);
        jQuery(d).removeClass("flowpaper_redraw");
        1 == c.scale && (jQuery(c.V + "_canvas").xd(), jQuery(c.V + "_canvas_highres").rc());
        1 < c.pageNumber && jQuery(c.V + "_pixel").css({
          width: 2 * c.xa(),
          height: 2 * c.Ga()
        });
      }
      jQuery(c.Yb).remove();
    };
    CanvasPageRenderer.prototype.Pe = function(c, d, e) {
      var g = this;
      if (null != g.pageThumbImagePattern && 0 < g.pageThumbImagePattern.length) {
        for (var h = 0, f = null, k = c.getDimensions(0)[0].width / c.getDimensions(0)[0].height, l = 1; l < d; l++) {
          h += 2;
        }
        0.5 > k && g.config.JSONDataType && c.getDimensions(0)[0].na < c.getDimensions(0)[0].za && (k = 0.7);
        var n = 1 == d ? h + 1 : h,
          q = new Image;
        jQuery(q).bind("load", function() {
          var f = d % 10;
          0 == f && (f = 10);
          var l = c.N.find(".flowpaper_fisheye").find(String.format('*[data-thumbIndex="{0}"]', f)).get(0);
          l.width = e * k - 2;
          l.height = e / k / 2 - 2;
          var p = jQuery(l).parent().width() / l.width;
          l.getContext("2d").fillStyle = "#999999";
          var t = (l.height - l.height * k) / 2,
            r = l.height * k;
          0 > t && (l.height += l.width - r, t += (l.width - r) / 2);
          eb.browser.msie && jQuery(l).css({
            width: l.width * p + "px",
            height: l.height * p + "px"
          });
          jQuery(l).data("origwidth", l.width * p);
          jQuery(l).data("origheight", l.height * p);
          l.getContext("2d").fillRect(1 == d ? l.width / 2 : 0, t, n == c.getTotalPages() ? l.width / 2 + 2 : l.width + 2, r + 2);
          l.getContext("2d").drawImage(q, 1 == d ? l.width / 2 + 1 : 1, t + 1, l.width / 2, r);
          if (1 < d && h + 1 <= c.getTotalPages() && n + 1 <= c.getTotalPages()) {
            var w = new Image;
            jQuery(w).bind("load", function() {
              l.getContext("2d").drawImage(w, l.width / 2 + 1, t + 1, l.width / 2, r);
              l.getContext("2d").strokeStyle = "#999999";
              l.getContext("2d").moveTo(l.width - 1, t);
              l.getContext("2d").lineTo(l.width - 1, r + 1);
              l.getContext("2d").stroke();
              jQuery(c).trigger("onThumbPanelThumbAdded", {
                mf: f,
                thumbData: l
              });
            });
            jQuery(w).attr("src", g.ia(n + 1, 200));
          } else {
            jQuery(c).trigger("onThumbPanelThumbAdded", {
              mf: f,
              thumbData: l
            });
          }
        });
        n <= c.getTotalPages() && jQuery(q).attr("src", g.ia(n, 200));
      } else {
        if (-1 < g.Da(null) || 1 != c.scale) {
          window.clearTimeout(g.nf), g.nf = setTimeout(function() {
            g.Pe(c, d, e);
          }, 50);
        } else {
          h = 0;
          f = null;
          k = c.getDimensions(0)[0].width / c.getDimensions(0)[0].height;
          for (l = 1; l < d; l++) {
            h += 2;
          }
          var n = 1 == d ? h + 1 : h,
            q = new Image,
            t = d % 10;
          0 == t && (t = 10);
          f = c.N.find(".flowpaper_fisheye").find(String.format('*[data-thumbIndex="{0}"]', t)).get(0);
          f.width = e * k;
          f.height = e / k / 2;
          l = jQuery(f).parent().width() / f.width;
          eb.browser.msie && jQuery(f).css({
            width: f.width * l + "px",
            height: f.height * l + "px"
          });
          jQuery(f).data("origwidth", f.width * l);
          jQuery(f).data("origheight", f.height * l);
          var r = f.height / g.getDimensions()[n - 1].height;
          g.Ha(null, "thumb_" + n);
          g.La.getPage(n).then(function(l) {
            var q = l.getViewport(r),
              v = f.getContext("2d"),
              x = document.createElement("canvas");
            x.height = f.height;
            x.width = x.height * k;
            var z = {
              canvasContext: x.getContext("2d"),
              viewport: q,
              Fh: null,
              pageNumber: n,
              continueCallback: function(h) {
                1 != c.scale ? (window.clearTimeout(g.nf), g.nf = setTimeout(function() {
                  g.Pe(c, d, e);
                }, 50)) : h();
              }
            };
            l.render(z).promise.then(function() {
              var l = (f.height - f.height * k) / 2,
                m = f.height * k;
              0 > l && (f.height += f.width - m, l += (f.width - m) / 2);
              g.Ha(null, -1, "thumb_" + n);
              1 < d && h + 1 <= c.getTotalPages() && n + 1 <= c.getTotalPages() ? -1 < g.Da(null) || 1 != c.scale ? (window.clearTimeout(g.nf), g.nf = setTimeout(function() {
                g.Pe(c, d, e);
              }, 50)) : (g.Ha(null, "thumb_" + (n + 1)), g.La.getPage(n + 1).then(function(h) {
                q = h.getViewport(r);
                var k = document.createElement("canvas");
                k.width = x.width;
                k.height = x.height;
                z = {
                  canvasContext: k.getContext("2d"),
                  viewport: q,
                  Fh: null,
                  pageNumber: n + 1,
                  continueCallback: function(h) {
                    1 != c.scale ? (window.clearTimeout(g.nf), g.nf = setTimeout(function() {
                      g.Pe(c, d, e);
                    }, 50)) : h();
                  }
                };
                h.render(z).promise.then(function() {
                  g.Ha(null, -1);
                  v.fillStyle = "#ffffff";
                  v.fillRect(1 == d ? f.width / 2 : 0, l, f.width / 2, m);
                  1 != d && v.fillRect(f.width / 2, l, f.width / 2, m);
                  v.drawImage(x, 1 == d ? f.width / 2 : 0, l, f.width / 2, m);
                  1 != d && v.drawImage(k, f.width / 2, l, f.width / 2, m);
                  jQuery(c).trigger("onThumbPanelThumbAdded", {
                    mf: t,
                    thumbData: f
                  });
                }, function() {
                  g.Ha(null, -1, "thumb_" + (n + 1));
                });
              })) : (v.fillStyle = "#ffffff", v.fillRect(1 == d ? f.width / 2 : 0, l, f.width / 2, m), 1 != d && v.fillRect(f.width / 2, l, f.width / 2, m), v.drawImage(x, 1 == d ? f.width / 2 : 0, l, f.width / 2, m), jQuery(c).trigger("onThumbPanelThumbAdded", {
                mf: t,
                thumbData: f
              }));
            }, function() {
              g.Ha(null, -1);
            });
          });
        }
      }
    };
    return f;
  }(),
  Aa = function() {
    function f() {}
    f.prototype = {
      Kd: function(c, d) {
        if (d.Xa && (d.Oi || d.create(d.pages.J), !d.initialized)) {
          c.mb = !c.sa && null != c.aj && 0 < c.aj.length && eb.platform.touchonlydevice && !eb.platform.mobilepreview;
          if ("FlipView" == d.H) {
            var e = 0 != d.pageNumber % 2 ? "flowpaper_zine_page_left" : "flowpaper_zine_page_right";
            0 == d.pageNumber && (e = "flowpaper_zine_page_left_noshadow");
            d.F.Qe || (e = 0 != d.pageNumber % 2 ? "flowpaper_zine_page_left_noshadow" : "flowpaper_zine_page_right_noshadow");
            var g = d.V;
            0 == jQuery(g).length && (g = jQuery(d.Mc).find(d.V));
            c.lh(d, g);
            c.sa && c.sf(c, d) ? (jQuery(g).append("<canvas id='" + d.aa + "_canvas' class='flowpaper_flipview_page' height='100%' width='100%' style='z-index:10;position:absolute;left:0px;top:0px;width:100%;height:100%;'></canvas><div id='" + d.aa + "_textoverlay' style='z-index:11;position:absolute;left:0px;top:0px;width:100%;height:100%;' class='" + e + "'></div>"), c.So = new Image, jQuery(c.So).attr("src", c.ea)) : c.zb ? jQuery(g).append("<canvas id='" + d.aa + "_canvas' class='flowpaper_flipview_page' height='100%' width='100%' style='z-index:10;position:absolute;left:0px;top:0px;width:100%;height:100%;'></canvas><canvas id='" + d.aa + "_canvas_highres' class='flowpaper_flipview_page' height='100%' width='100%' style='display:none;z-index:10;position:absolute;left:0px;top:0px;width:100%;height:100%;background-color:#ffffff;'></canvas><div id='" + d.aa + "_textoverlay' style='z-index:11;position:absolute;left:0px;top:0px;width:100%;height:100%;' class='" + e + "'></div>") : jQuery(g).append("<canvas id='" + d.aa + "_canvas' class='flowpaper_flipview_page' height='100%' width='100%' style='z-index:10;position:absolute;left:0px;top:0px;width:100%;height:100%;'></canvas><canvas id='" + d.aa + "_canvas_highres' class='flowpaper_flipview_page' height='100%' width='100%' style='image-rendering:-webkit-optimize-contrast;display:none;z-index:10;position:absolute;left:0px;top:0px;width:100%;height:100%;'></canvas><div id='" + d.aa + "_textoverlay' style='z-index:11;position:absolute;left:0px;top:0px;width:100%;height:100%;' class='" + e + "'></div>");
            if (eb.browser.chrome || eb.browser.safari) {
              eb.browser.safari && (jQuery("#" + d.aa + "_canvas").css("-webkit-backface-visibility", "hidden"), jQuery("#" + d.aa + "_canvas_highres").css("-webkit-backface-visibility", "hidden")), jQuery("#" + d.aa + "_textoverlay").css("-webkit-backface-visibility", "hidden");
            }
          }
          d.initialized = !0;
        }
      },
      $b: function(c, d, e, g) {
        d.initialized || c.Kd(d);
        if (!d.pa && "FlipView" == d.H) {
          if (-1 < c.Da(d) && c.Da(d) != d.pageNumber && d.pageNumber != d.pages.R && d.pageNumber != d.pages.R - 2 && d.pageNumber != d.pages.R - 1) {
            if (window.clearTimeout(d.kc), d.pageNumber == d.pages.R || d.pageNumber == d.pages.R - 2 || d.pageNumber == d.pages.R - 1) {
              d.kc = setTimeout(function() {
                c.$b(d, e, g);
              }, 250);
            }
          } else {
            1 == d.scale && d.Jc && !c.sa && d.Jc(c.ia(d.pageNumber + 1), c.ia(d.pageNumber + 2));
            if (!d.pa) {
              c.ar = d.scale;
              c.Ha(d, d.pageNumber);
              1 == d.scale && d.Qc();
              d.Fb = !0;
              if (!d.U || d.po != d.scale || c.sf(c, d) || !c.sf(c, d) && c.sa) {
                d.po = d.scale, d.U = new Image, jQuery(d.U).data("pageNumber", d.pageNumber), jQuery(d.U).bind("load", function() {
                  d.Fb = !1;
                  d.Xe = !0;
                  d.Ye = this.height;
                  d.Ze = this.width;
                  d.Jb();
                  c.Pc(d);
                  d.dimensions.na > d.dimensions.width && (d.dimensions.width = d.dimensions.na, d.dimensions.height = d.dimensions.za);
                }), jQuery(d.U).bind("abort", function() {
                  jQuery(this).zh(function() {
                    d.Fb = !1;
                    c.Ha(d, -1);
                  });
                }), jQuery(d.U).bind("error", function() {
                  jQuery(this).zh(function() {
                    d.Fb = !1;
                    c.Ha(d, -1);
                  });
                });
              }
              1 >= d.scale ? jQuery(d.U).attr("src", c.ia(d.pageNumber + 1, null, c.zb)) : c.mb && 1 < d.scale ? d.pageNumber == d.pages.R - 1 || d.pageNumber == d.pages.R - 2 ? jQuery(d.U).attr("src", c.ia(d.pageNumber + 1, null, c.zb)) : c.sa || jQuery(d.U).attr("src", c.ea) : d.pageNumber == d.pages.R - 1 || d.pageNumber == d.pages.R - 2 ? (!c.zb || -1 != jQuery(d.U).attr("src").indexOf(".svg") && d.Ao == d.scale || c.Da(d) != d.pageNumber || d.pageNumber != d.pages.R - 1 && d.pageNumber != d.pages.R - 2 ? d.vj == d.scale && (jQuery(d.V + "_canvas_highres").show(), jQuery(d.V + "_canvas").hide()) : (jQuery(c).trigger("UIBlockingRenderingOperation", c.P), d.Ao = d.scale, jQuery(d.U).attr("src", c.ia(d.pageNumber + 1, null, c.zb))), c.zb || jQuery(d.U).attr("src", c.ia(d.pageNumber + 1, null, c.zb))) : c.sa || jQuery(d.U).attr("src", c.ea);
            }
            jQuery(d.V).removeClass("flowpaper_load_on_demand");
            !d.pa && jQuery(d.oa).attr("src") == c.ea && d.Xe && c.Pc(d);
            null != g && g();
          }
        }
      },
      Pc: function(c, d) {
        if ("FlipView" == d.H) {
          jQuery(d.V).removeClass("flowpaper_hidden");
          1 == d.scale && eb.browser.safari ? (jQuery("#" + d.aa + "_canvas").css("-webkit-backface-visibility", "hidden"), jQuery("#" + d.aa + "_canvas_highres").css("-webkit-backface-visibility", "hidden"), jQuery("#" + d.aa + "_textoverlay").css("-webkit-backface-visibility", "hidden")) : eb.browser.safari && (jQuery("#" + d.aa + "_canvas").css("-webkit-backface-visibility", "visible"), jQuery("#" + d.aa + "_canvas_highres").css("-webkit-backface-visibility", "visible"), jQuery("#" + d.aa + "_textoverlay").css("-webkit-backface-visibility", "visible"));
          if (c.sf(c, d)) {
            1 == d.scale ? (jQuery(d.va).css("background-image", "url('" + c.ia(d.pageNumber + 1, null, c.zb) + "')"), jQuery("#" + d.aa + "_textoverlay").css("-webkit-backface-visibility", "visible"), jQuery("#" + d.aa + "_textoverlay").css("backface-visibility", "visible"), c.Fc(d)) : (d.pageNumber == d.pages.R - 1 || d.pageNumber == d.pages.R - 2 ? jQuery(d.va).css("background-image", "url('" + c.ia(d.pageNumber + 1) + "')") : jQuery(d.va).css("background-image", "url(" + c.ea + ")"), jQuery("#" + d.aa + "_textoverlay").css("-webkit-backface-visibility", "visible"), jQuery("#" + d.aa + "_textoverlay").css("backface-visibility", "visible"), jQuery(d.V + "_canvas").hide(), c.mb && d.scale > d.rg() && (d.kc = setTimeout(function() {
              c.Nc(d);
              jQuery(".flowpaper_flipview_canvas_highres").show();
              jQuery(".flowpaper_flipview_canvas").hide();
            }, 500)));
          } else {
            var e = document.getElementById(d.aa + "_canvas");
            c.sa ? (jQuery(d.va).css("background-image", "url('" + c.ia(d.pageNumber + 1, null, c.zb) + "')"), jQuery("#" + d.aa + "_textoverlay").css("-webkit-backface-visibility", "visible"), jQuery("#" + d.aa + "_textoverlay").css("backface-visibility", "visible")) : jQuery(d.va).css("background-image", "url(" + c.ea + ")");
            if (1 == d.scale && e && (100 == e.width || jQuery(e).hasClass("flowpaper_redraw"))) {
              var g = e;
              if (g) {
                var h = d.xa(),
                  f = d.Ga();
                g.width = 2 * h;
                g.height = 2 * f;
                h = g.getContext("2d");
                h.ag = h.mozImageSmoothingEnabled = h.imageSmoothingEnabled = !0;
                h.drawImage(d.U, 0, 0, g.width, g.height);
                jQuery(g).data("needs-overlay", 1);
                jQuery(e).removeClass("flowpaper_redraw");
                1 == d.scale && (jQuery(d.V + "_canvas").show(), jQuery(d.V + "_canvas_highres").hide());
                1 < d.pageNumber && jQuery(d.V + "_pixel").css({
                  width: 2 * d.xa(),
                  height: 2 * d.Ga()
                });
                jQuery(g).data("needs-overlay", 1);
                c.Fc(d);
              }
            } else {
              1 == d.scale && e && 100 != e.width && (jQuery(d.V + "_canvas").show(), jQuery(d.V + "_canvas_highres").hide(), c.Fc(d));
            }
            if (1 < d.scale && !c.sa) {
              if (g = document.getElementById(d.aa + "_canvas_highres")) {
                !(c.zb && d.vj != d.scale || c.sa && d.vj != d.scale || 100 == g.width || jQuery(g).hasClass("flowpaper_redraw")) || d.pageNumber != d.pages.R - 1 && d.pageNumber != d.pages.R - 2 ? (jQuery(d.V + "_pixel").css({
                  width: 2 * d.xa(),
                  height: 2 * d.Ga()
                }), jQuery(d.V + "_canvas_highres").show(), jQuery(d.V + "_canvas").hide(), c.mb && jQuery(d.V + "_canvas_highres").css("z-index", "-1")) : (d.vj = d.scale, e = 1000 < d.L.width() || 1000 < d.L.height() ? 1 : 2, h = (d.L.width() - 30) * d.scale, c.sa && 1 == e && (e = c.Ya), eb.platform.ios && (1500 < h * d.le() || 535 < d.Df()) && (e = 2236 * Math.sqrt(1 / (d.xa() * d.Ga()))), eb.browser.safari && !eb.platform.touchdevice && 3 > e && (e = 3), h = g.getContext("2d"), h.ag || h.mozImageSmoothingEnabled || h.imageSmoothingEnabled ? (h.ag = h.mozImageSmoothingEnabled = h.imageSmoothingEnabled = !1, c.zb || c.sa ? (g.width = d.xa() * e, g.height = d.Ga() * e, h.drawImage(d.U, 0, 0, d.xa() * e, d.Ga() * e)) : (g.width = d.U.width, g.height = d.U.height, h.drawImage(d.U, 0, 0))) : (g.width = d.xa() * e, g.height = d.Ga() * e, h.drawImage(d.U, 0, 0, d.xa() * e, d.Ga() * e)), c.zb ? c.vo(d, g.width / d.U.width, function() {
                  jQuery(g).removeClass("flowpaper_redraw");
                  jQuery(d.V + "_canvas_highres").show();
                  jQuery(d.V + "_canvas").hide();
                  jQuery(d.V + "_canvas_highres").addClass("flowpaper_flipview_canvas_highres");
                  jQuery(d.V + "_canvas").addClass("flowpaper_flipview_canvas");
                  c.Ha(d, -1);
                }) : (jQuery(g).removeClass("flowpaper_redraw"), c.sa || (jQuery(d.V + "_canvas_highres").show(), jQuery(d.V + "_canvas").hide(), jQuery(d.V + "_canvas_highres").addClass("flowpaper_flipview_canvas_highres"), jQuery(d.V + "_canvas").addClass("flowpaper_flipview_canvas")), c.mb && jQuery(d.V + "_canvas_highres").css("z-index", "-1")));
              }
              d.kc = setTimeout(function() {
                c.Nc(d);
              }, 500);
            }
          }
          c.sa && 1 == d.scale && (jQuery(d.V + "_canvas").addClass("flowpaper_flipview_canvas"), jQuery(d.V + "_canvas").show(), g = document.getElementById(d.aa + "_canvas"), h = d.xa(), f = d.Ga(), e = 1.5 < c.Ya ? c.Ya : 1, g.width != h * e && c.sf(c, d) ? (d.pa || (g.width = 100), g.width != h * e && c.sf(c, d) && (g.width = h * e, g.height = f * e), jQuery(g).css({
            width: g.width / e + "px",
            height: g.height / e + "px"
          }), c.El = !0, jQuery(g).data("needs-overlay", 1), d.Ud(g).then(function() {
            d.Jc(c.ia(d.pageNumber + 1), c.ia(d.pageNumber + 2), !0);
          })) : c.sf(c, d) || 1 != jQuery(g).data("needs-overlay") ? d.pa || d.Jc(c.ia(d.pageNumber + 1), c.ia(d.pageNumber + 2), !0) : d.Ud(g).then(function() {
            d.Jc(c.ia(d.pageNumber + 1), c.ia(d.pageNumber + 2), !0);
          }));
          d.pa = 0 < jQuery(d.va).length;
        }
      },
      unload: function(c, d) {
        d.U = null;
        jQuery(d.va).css("background-image", "url(" + c.ea + ")");
        var e = document.getElementById(d.aa + "_canvas");
        e && (e.width = 100, e.height = 100);
        if (e = document.getElementById(d.aa + "_canvas_highres")) {
          e.width = 100, e.height = 100;
        }
      }
    };
    ImagePageRenderer.prototype.sf = function(c, d) {
      return c.sa && (eb.platform.ios || eb.browser.mozilla && 57 > eb.browser.version) ? !1 : c.sa ? !0 : eb.platform.touchdevice && (eb.platform.Ld || d && d.Ze && d.Ye && 5000000 < d.Ze * d.Ye || eb.platform.android) && (eb.platform.Ld || eb.platform.android) || eb.browser.chrome || eb.browser.mozilla || c.sa || eb.browser.safari && !eb.platform.touchdevice;
    };
    ImagePageRenderer.prototype.resize = function(c, d) {
      this.lh(d);
    };
    ImagePageRenderer.prototype.vo = function(c, d, e) {
      var g = this;
      window.Lh = d;
      jQuery.ajax({
        type: "GET",
        url: g.ia(c.pageNumber + 1, null, g.zb),
        cache: !0,
        dataType: "xml",
        success: function(h) {
          var f = new Image;
          jQuery(f).bind("load", function() {
            var g = document.getElementById(c.aa + "_canvas"),
              l = document.getElementById(c.aa + "_canvas_highres").getContext("2d");
            l.ag = l.mozImageSmoothingEnabled = l.imageSmoothingEnabled = !1;
            var n = g.getContext("2d");
            n.ag = n.mozImageSmoothingEnabled = n.imageSmoothingEnabled = !1;
            g.width = c.U.width * d;
            g.height = c.U.height * d;
            n.drawImage(f, 0, 0, c.U.width * d, c.U.height * d);
            if (c.cm) {
              q = c.cm;
            } else {
              var q = [];
              jQuery(h).find("image").each(function() {
                var c = {};
                c.id = jQuery(this).attr("id");
                c.width = S(jQuery(this).attr("width"));
                c.height = S(jQuery(this).attr("height"));
                c.data = jQuery(this).attr("xlink:href");
                c.dataType = 0 < c.data.length ? c.data.substr(0, 15) : "";
                q[q.length] = c;
                jQuery(h).find("use[xlink\\:href='#" + c.id + "']").each(function() {
                  if (jQuery(this).attr("transform") && (c.transform = jQuery(this).attr("transform"), c.transform = c.transform.substr(7, c.transform.length - 8), c.Gh = c.transform.split(" "), c.x = S(c.Gh[c.Gh.length - 2]), c.y = S(c.Gh[c.Gh.length - 1]), "g" == jQuery(this).parent()[0].nodeName && null != jQuery(this).parent().attr("clip-path"))) {
                    var d = jQuery(this).parent().attr("clip-path"),
                      d = d.substr(5, d.length - 6);
                    jQuery(h).find("*[id='" + d + "']").each(function() {
                      c.jg = [];
                      jQuery(this).find("path").each(function() {
                        var d = {};
                        d.d = jQuery(this).attr("d");
                        c.jg[c.jg.length] = d;
                      });
                    });
                  }
                });
              });
              c.cm = q;
            }
            for (n = 0; n < q.length; n++) {
              if (q[n].jg) {
                for (var t = 0; t < q[n].jg.length; t++) {
                  for (var r = q[n].jg[t].d.replace(/M/g, "M\x00").replace(/m/g, "m\x00").replace(/v/g, "v\x00").replace(/l/g, "l\x00").replace(/h/g, "h\x00").replace(/c/g, "c\x00").replace(/s/g, "s\x00").replace(/z/g, "z\x00").split(/(?=M|m|v|h|s|c|l|z)|\0/), m = 0, u = 0, v = 0, x = 0, z = !1, w, D = !0, C = 0; C < r.length; C += 2) {
                    if ("M" == r[C] && r.length > C + 1 && (w = T(r[C + 1]), v = m = S(w[0]), x = u = S(w[1]), D && (z = !0)), "m" == r[C] && r.length > C + 1 && (w = T(r[C + 1]), v = m += S(w[0]), x = u += S(w[1]), D && (z = !0)), "l" == r[C] && r.length > C + 1 && (w = T(r[C + 1]), m += S(w[0]), u += S(w[1])), "h" == r[C] && r.length > C + 1 && (w = T(r[C + 1]), m += S(w[0])), "v" == r[C] && r.length > C + 1 && (w = T(r[C + 1]), u += S(w[0])), "s" == r[C] && r.length > C + 1 && (w = T(r[C + 1])), "c" == r[C] && r.length > C + 1 && (w = T(r[C + 1])), "z" == r[C] && r.length > C + 1 && (m = v, u = x, w = null), z && (l.save(), l.beginPath(), D = z = !1), "M" == r[C] || "m" == r[C]) {
                      l.moveTo(m, u);
                    } else {
                      if ("c" == r[C] && null != w) {
                        for (var H = 0; H < w.length; H += 6) {
                          var A = m + S(w[H + 0]),
                            G = u + S(w[H + 1]),
                            B = m + S(w[H + 2]),
                            F = u + S(w[H + 3]),
                            y = m + S(w[H + 4]),
                            E = u + S(w[H + 5]);
                          l.bezierCurveTo(A, G, B, F, y, E);
                          m = y;
                          u = E;
                        }
                      } else {
                        "s" == r[C] && null != w ? (B = m + S(w[0]), F = u + S(w[1]), y = m + S(w[2]), E = u + S(w[3]), l.bezierCurveTo(m, u, B, F, y, E), m = y, u = E) : "z" == r[C] ? (l.lineTo(m, u), l.closePath(), l.clip(), l.drawImage(g, 0, 0), l.restore(), D = !0, C--) : l.lineTo(m, u);
                      }
                    }
                  }
                }
              } else {
                M("no clip path for image!");
              }
            }
            e && e();
          });
          f.src = g.ia(c.pageNumber + 1);
        }
      });
    };
    ImagePageRenderer.prototype.Pe = function(c, d, e) {
      var g = this,
        h = 0,
        f = c.getDimensions(d)[d - 1].na / c.getDimensions(d)[d - 1].za;
      g.bb && 1 < d && (f = c.getDimensions(1)[0].na / c.getDimensions(1)[0].za);
      0.5 > f && g.config.JSONDataType && c.getDimensions(0)[0].na < c.getDimensions(0)[0].za && (f = 0.7);
      for (var k = 1; k < d; k++) {
        h += 2;
      }
      var l = 1 == d ? h + 1 : h,
        n = new Image;
      jQuery(n).bind("load", function() {
        var k = d % 10;
        0 == k && (k = 10);
        var t = jQuery(".flowpaper_fisheye").find(String.format('*[data-thumbIndex="{0}"]', k)).get(0);
        t.width = e * f - 2;
        t.height = e / f / 2 - 2;
        var r = jQuery(t).parent().width() / t.width;
        t.getContext("2d").fillStyle = "#999999";
        var m = (t.height - t.height * f) / 2,
          u = t.height * f;
        0 > m && (t.height += t.width - u, m += (t.width - u) / 2);
        jQuery(t).data("origwidth", t.width * r);
        jQuery(t).data("origheight", t.height * r);
        (eb.browser.msie || eb.browser.safari && 5 > eb.browser.Kb) && jQuery(t).css({
          width: t.width * r + "px",
          height: t.height * r + "px"
        });
        t.getContext("2d").fillRect(1 == d ? t.width / 2 : 0, m, l == c.getTotalPages() ? t.width / 2 + 2 : t.width + 2, u + 2);
        t.getContext("2d").drawImage(n, 1 == d ? t.width / 2 + 1 : 1, m + 1, t.width / 2, u);
        if (1 < d && h + 1 <= c.getTotalPages() && l + 1 <= c.getTotalPages()) {
          var v = new Image;
          jQuery(v).bind("load", function() {
            t.getContext("2d").drawImage(v, t.width / 2 + 1, m + 1, t.width / 2, u);
            t.getContext("2d").strokeStyle = "#999999";
            t.getContext("2d").moveTo(t.width - 1, m);
            t.getContext("2d").lineTo(t.width - 1, u + 1);
            t.getContext("2d").stroke();
            jQuery(c).trigger("onThumbPanelThumbAdded", {
              mf: k,
              thumbData: t
            });
          });
          jQuery(v).attr("src", g.ia(l + 1, 200));
        } else {
          jQuery(c).trigger("onThumbPanelThumbAdded", {
            mf: k,
            thumbData: t
          });
        }
      });
      l <= c.getTotalPages() && jQuery(n).attr("src", g.ia(l, 200));
    };
    return f;
  }(),
  ya = function() {
    function f() {}
    V.prototype.We = function() {
      var c = this.F.I.gf,
        d = this.gh(0),
        d = d.na / d.za,
        e = Math.round(this.L.height() - 10);
      this.F.N.find(".flowpaper_fisheye");
      var g = eb.platform.touchdevice ? 90 == window.orientation || -90 == window.orientation || jQuery(window).height() > jQuery(window).width() : !1,
        h = this.F.I.rf ? this.F.I.Oa.height() : 0;
      if (this.F.I.fb && !this.F.PreviewMode) {
        e -= eb.platform.touchonlydevice ? this.F.ab ? h : 0 : this.L.height() * (this.F.ab ? 0.2 : 0.15);
      } else {
        if (this.F.PreviewMode) {
          this.F.PreviewMode && (e = this.F.N.height() - 15, e -= eb.platform.touchonlydevice ? this.F.ab ? h + 30 : 0 : this.L.height() * (g ? 0.5 : 0.09));
        } else {
          var f = 0.07;
          this.F.I.fb || (f = 0.07);
          eb.platform.touchonlydevice ? e = this.F.Rb ? e - (this.F.ab ? 5 : 0) : e - (this.F.ab ? h : 0) : (h = this.F.I.rf ? jQuery(this.F.K).parent().height() || 0 : 0, 0 == h && this.F.I.rf && (h = this.L.height() * f), e -= this.F.ab && !this.F.I.qf ? h : this.L.height() * (g ? 0.5 : f));
        }
      }
      g = this.L.width();
      2 * e * d > g - (c ? 2.4 * this.fa : 0) && !this.F.I.Ba && (e = g / 2 / d - +(c ? 1.5 * this.fa : 75));
      if (e * d > g - (c ? 2.4 * this.fa : 0) && this.F.I.Ba) {
        for (f = 10; e * d > g - (c ? 2.4 * this.fa : 0) && 1000 > f;) {
          e = g / d - f + (c ? 0 : 50), f += 10;
        }
      }
      if (!eb.browser.nr) {
        for (c = 2.5 * Math.floor(e * (this.F.I.Ba ? 1 : 2) * d), g = 0; 0 != c % 4 && 20 > g;) {
          e += 0.5, c = 2.5 * Math.floor(e * (this.F.I.Ba ? 1 : 2) * d), g++;
        }
      }
      return e;
    };
    V.prototype.Dd = function(c) {
      var d = this,
        e = c ? c : d.F.scale;
      if (1 == e && 1 == d.ba) {
        jQuery(d.J + "_glyphcanvas").css("z-index", -1).rc(), jQuery(".flowpaper_flipview_canvas").xd(), d.cd();
      } else {
        if (d.F.renderer.sa && d.F.I.W == d.F.H && (c = jQuery(d.J + "_glyphcanvas").get(0), void 0 == d.jk && (d.jk = jQuery(c).offset().left), void 0 == d.kk && (d.kk = jQuery(c).offset().top), void 0 == d.nm && (d.nm = jQuery(d.F.N).position().left), void 0 == d.om && (d.om = jQuery(d.F.N).position().top), 1 < e)) {
          var g = c.getContext("2d"),
            h = 1 < d.R ? d.R - (d.F.I.Ba || 0 == d.R % 2 || d.R + (0 == d.R % 2 ? 1 : 0) > d.F.getTotalPages() ? 1 : 2) : 0,
            f = d.F.I.Ba || 0 == h || null == d.pages[h + 1] ? 1 : 2,
            k = 0,
            l = eb.platform.Ya,
            n = 0,
            q = d.jk - d.nm,
            t = d.kk - d.om;
          d.F.Qa && (n = parseFloat(d.L.css("left")));
          d.F.$a && (n = parseFloat(d.L.css("left")));
          if (!l || 1 > l) {
            l = 1;
          }
          for (var r = 0; r < f; r++) {
            var m = jQuery(d.pages[h + r].V),
              u = m.get(0).getBoundingClientRect(),
              m = u.right < d.L.width() ? u.right - (0 < u.left ? u.left : 0) : d.L.width() - (0 < u.left ? u.left : 0),
              k = k + (0 < m ? m : 0);
          }
          for (r = 0; r < f; r++) {
            var h = h + r,
              m = jQuery(d.pages[h].V),
              u = m.get(0).getBoundingClientRect(),
              v = 0 < u.left ? u.left : 0 + q,
              x = 0 < u.top ? u.top : 0 + t,
              m = k,
              z = u.bottom < d.L.height() ? u.bottom - (0 < u.top ? u.top : 0) : d.L.height() - (0 < u.top ? u.top : 0),
              w = d.getPage(h);
            jQuery(c).data("needs-overlay", f);
            0 == r && (jQuery(c).css({
              left: v + "px",
              top: x + "px",
              "z-index": 49,
              display: "block"
            }), g.clearRect(0, 0, c.width, c.height), c.width = m + n, c.height = z, 1 < l && (c.width = (m + n) * l, c.height = z * l, jQuery(c).css({
              width: c.width / l + "px",
              height: c.height / l + "px"
            })));
            m = 0 > u.left ? u.left * l : 0;
            v = 0 > u.top ? u.top * l : 0;
            1 < f && 0 < r && 0 < u.left && (m += u.left * l, x = jQuery(d.pages[h - 1].V), 0 < x.length && (x = x.get(0).getBoundingClientRect(), 0 < x.left && (m -= x.left * l)));
            w.Ud(c, 0, u.width * l, m, v).then(function() {
              if (d.F.Z[h]) {
                g.save();
                g.globalCompositeOperation = "destination-out";
                g.beginPath();
                for (var c = u.width / (w.ng() * w.Ma) * l, k = 0; k < d.F.Z[h].length; k++) {
                  "video" == d.F.Z[h][k].type && g.rect(d.F.Z[h][k].Fj * c, d.F.Z[h][k].Gj * c, d.F.Z[h][k].width * c, d.F.Z[h][k].height * c), "image" == d.F.Z[h][k].type && g.rect(d.F.Z[h][k].jh * c, d.F.Z[h][k].kh * c, d.F.Z[h][k].width * c, d.F.Z[h][k].height * c);
                }
                g.closePath();
                g.fill();
                g.restore();
              }
              w.Mk = e;
              r == f - 1 && requestAnim(function() {
                jQuery(".flowpaper_flipview_canvas").rc();
              }, 50);
            });
          }
        }
      }
    };
    V.prototype.bo = function(c, d) {
      var e = this;
      c = parseInt(c);
      e.F.Zd = d;
      e.F.renderer.ie && e.$e(c);
      1 != this.F.scale ? e.Pa(1, !0, function() {
        e.F.turn("page", c);
      }) : e.F.turn("page", c);
    };
    V.prototype.Ci = function() {
      return (this.L.width() - this.kd()) / 2;
    };
    V.prototype.kd = function() {
      var c = this.gh(0),
        c = c.na / c.za;
      return Math.floor(this.We() * (this.F.I.Ba ? 1 : 2) * c);
    };
    V.prototype.ld = function() {
      if ("FlipView" == this.F.H) {
        return 0 < this.width ? this.width : this.width = this.M(this.J).width();
      }
    };
    V.prototype.Df = function() {
      if ("FlipView" == this.F.H) {
        return 0 < this.height ? this.height : this.height = this.M(this.J).height();
      }
    };
    f.prototype = {
      $e: function(c, d) {
        for (var e = d - 10; e < d + 10; e++) {
          0 < e && e + 1 < c.F.getTotalPages() + 1 && !c.getPage(e).initialized && (c.getPage(e).Xa = !0, c.F.renderer.Kd(c.getPage(e)), c.getPage(e).Xa = !1);
        }
      },
      jc: function(c) {
        null != c.Vd && (window.clearTimeout(c.Vd), c.Vd = null);
        var d = 1 < c.R ? c.R - 1 : c.R;
        if (!c.F.renderer.sb || c.F.renderer.rb && 1 == c.F.scale) {
          1 <= c.R ? (c.pages[d - 1].load(function() {
            1 < c.R && c.pages[d] && c.pages[d].load(function() {
              c.pages[d].Ea();
              for (var e = c.M(c.J).scrollTop(), g = c.M(c.J).height(), f = 0; f < c.document.numPages; f++) {
                c.Ua(f) && (c.pages[f].Hc(e, g, !0) ? (c.pages[f].Xa = !0, c.pages[f].load(function() {}), c.pages[f].Ea()) : c.pages[f].unload());
              }
            });
          }), c.pages[d - 1].Ea()) : c.pages[d] && c.pages[d].load(function() {
            c.pages[d].Ea();
            for (var e = c.M(c.J).scrollTop(), g = c.M(c.J).height(), f = 0; f < c.document.numPages; f++) {
              c.Ua(f) && (c.pages[f].Hc(e, g, !0) ? (c.pages[f].Xa = !0, c.pages[f].load(function() {}), c.pages[f].Ea()) : c.pages[f].unload());
            }
          });
        } else {
          1 < c.R ? (c.pages[d - 1] && c.pages[d - 1].load(function() {}), c.pages[d - 0] && c.pages[d - 0].load(function() {})) : c.pages[d] && c.pages[d].load(function() {});
          for (var e = c.M(c.J).scrollTop(), g = c.M(c.J).height(), f = 0; f < c.document.numPages; f++) {
            c.Ua(f) && (c.pages[f].Hc(e, g, !0) ? (c.pages[f].Xa = !0, c.pages[f].load(function() {}), c.pages[f].Ea()) : c.pages[f].unload());
          }
        }
      },
      Yi: function(c) {
        1.1 < c.F.scale && c.F.ta && (c.F.ta.data().opts.cornerDragging = !1);
        c.ri = setTimeout(function() {
          c.F.pages && "FlipView" == c.F.H && (1.1 < c.F.scale || !c.F.ta || !c.F.ta.data().opts || (c.F.ta.data().opts.cornerDragging = !0), c.vh = !1);
        }, 1000);
      },
      Mb: function(c) {
        return "FlipView" == c.F.H;
      },
      Pa: function(c, d, e, g, f) {
        jQuery(c).trigger("onScaleChanged");
        1 < e && 0 < jQuery("#" + c.Nb).length && jQuery("#" + c.Nb).css("z-index", -1);
        1 < e && (jQuery(".flowpaper_shadow").hide(), c.F.T && c.F.T.hide());
        if ("FlipView" == c.F.H && (e >= 1 + c.F.document.ZoomInterval ? jQuery(".flowpaper_page, " + c.J).removeClass("flowpaper_page_zoomIn").addClass("flowpaper_page_zoomOut") : jQuery(".flowpaper_page, " + c.J).removeClass("flowpaper_page_zoomOut").addClass("flowpaper_page_zoomIn"), jQuery(c.J).data().totalPages)) {
          var p = c.gh(0),
            k = p.na / p.za,
            p = c.We() * e,
            k = 2 * p * k;
          c.F.renderer.sa && 0 == g.wf && setTimeout(function() {
            c.animating = !1;
          }, 50);
          if (!g || !c.Mb() || 1 < d && !c.M(c.J + "_parent").If()) {
            if (c.M(c.J + "_parent").If() && e >= 1 + c.F.document.ZoomInterval && ((d = c.Fi()) ? (c.M(c.J + "_parent").transition({
                transformOrigin: "0px 0px"
              }, 0), c.M(c.J + "_parent").transition({
                x: 0,
                y: 0,
                scale: 1
              }, 0), g.Ob = d.left, g.oc = d.top, g.Vc = !0) : (l = 1 != c.F.da || c.F.I.Ba ? 0 : -(c.kd() / 4), c.M(c.J + "_parent").transition({
                x: l,
                y: c.F.nc,
                scale: 1
              }, 0))), c.M(c.J).If() && c.M(c.J).transition({
                x: 0,
                y: 0,
                scale: 1
              }, 0), !c.animating) {
              c.xh || (c.xh = c.F.ta.width(), c.Uo = c.F.ta.height());
              1 == e && c.xh ? (turnwidth = c.xh, turnheight = c.Uo) : (turnwidth = k - (c.M(c.J + "_panelLeft").width() + c.M(c.J + "_panelRight").width() + 40), turnheight = p);
              c.M(c.J).css({
                width: k,
                height: p
              });
              c.F.ta.turn("size", turnwidth, turnheight, !1);
              e >= 1 + c.F.document.ZoomInterval ? (g.Vc || eb.platform.touchonlydevice) && requestAnim(function() {
                c.L.scrollTo({
                  left: jQuery(c.L).scrollLeft() + g.Ob / e + "px",
                  top: jQuery(c.L).scrollTop() + g.oc / e + "px"
                });
              }, 500) : c.Ie();
              for (p = 0; p < c.document.numPages; p++) {
                c.Ua(p) && (c.pages[p].pa = !1);
              }
              1 < e ? c.F.ta.turn("setCornerDragging", !1) : (c.M(c.J + "_panelLeft").show(), c.M(c.J + "_panelRight").show(), c.F.ta.turn("setCornerDragging", !0), jQuery(".flowpaper_shadow").show());
              c.ed();
              c.cd();
              setTimeout(function() {
                null != f && f();
              }, 200);
            }
          } else {
            if (!c.animating || !c.ck) {
              c.animating = !0;
              c.ck = g.Vc;
              jQuery(".flowpaper_flipview_canvas").xd();
              jQuery(".flowpaper_flipview_canvas_highres").rc();
              c.F.renderer.sa && jQuery(c.J + "_glyphcanvas").css("z-index", -1).rc();
              jQuery("#" + c.Nb).css("z-index", -1);
              jQuery(c).trigger("onScaleChanged");
              p = 400;
              d = "snap";
              c.F.document.ZoomTime && (p = 1000 * parseFloat(c.F.document.ZoomTime));
              c.F.document.ZoomTransition && ("easeOut" == c.F.document.ZoomTransition && (d = "snap"), "easeIn" == c.F.document.ZoomTransition && (d = "ease-in", p /= 2));
              g && g.Ob && g.oc ? (g.Vc && (g.Ob = g.Ob + c.Ci()), g.Vc || eb.platform.touchonlydevice ? (c.Bd = g.Ob, c.Cd = g.oc) : (k = c.M(c.J + "_parent").css("transformOrigin").split(" "), 2 == k.length ? (k[0] = k[0].replace("px", ""), k[1] = k[1].replace("px", ""), c.Bd = parseFloat(k[0]), c.Cd = parseFloat(k[1])) : (c.Bd = g.Ob, c.Cd = g.oc), c.Dl = !0), g.wf && (p = g.wf)) : (c.Bd = 0, c.Cd = 0);
              c.F.renderer.sb && c.F.renderer.mb && 1 == e && (k = 1 < c.R ? c.R - 1 : c.R, 1 < c.R && c.F.renderer.Fc(c.pages[k - 1]), c.F.renderer.Fc(c.pages[k]));
              "undefined" != g.wf && (p = g.wf);
              e >= 1 + c.F.document.ZoomInterval ? ("preserve-3d" == c.M(c.J + "_parent").css("transform-style") && (p = 0), (g.Vc || eb.platform.touchonlydevice) && c.M(c.J + "_parent").css({
                transformOrigin: c.Bd + "px " + c.Cd + "px"
              }), c.F.ta.turn("setCornerDragging", !1)) : (c.M(c.J).transition({
                x: 0,
                y: 0
              }, 0), c.F.ta.turn("setCornerDragging", !0));
              var l = 1 != c.F.da || c.F.I.Ba ? 0 : -(c.kd() / 4);
              c.M(c.J + "_parent").transition({
                x: l,
                y: c.F.nc,
                scale: e
              }, p, d, function() {
                c.M(c.J + "_parent").css("will-change", "");
                c.Dd();
                c.cd();
                null != c.we && (window.clearTimeout(c.we), c.we = null);
                c.we = setTimeout(function() {
                  if (!c.F.renderer.sa) {
                    for (var d = 0; d < c.document.numPages; d++) {
                      c.pages[d].pa = !1;
                    }
                  }
                  c.rd = 0;
                  c.te = 0;
                  c.ed();
                  c.animating = !1;
                  c.ck = !1;
                }, 50);
                1 == e && c.M(c.J + "_parent").css("-webkit-transform-origin:", "");
                1 == e && (jQuery(".flowpaper_shadow").show(), jQuery(".flowpaper_zine_page_left").fadeIn(), jQuery(".flowpaper_zine_page_right").fadeIn());
                null != f && f();
              });
            }
          }
        }
      },
      resize: function(c, d, e, g) {
        c.width = -1;
        c.height = -1;
        jQuery(".flowpaper_pageword_" + c.P + ", .flowpaper_interactiveobject_" + c.P).remove();
        if ("FlipView" == c.F.H) {
          c.F.renderer.sa && c.F.renderer.El && (jQuery(".flowpaper_flipview_page").css({
            height: "100%",
            width: "100%"
          }), c.F.renderer.El = !1);
          1 != c.F.da || c.F.I.Ba ? c.F.I.Ba || jQuery(c.J + "_parent").transition({
            x: 0,
            y: c.F.nc
          }, 0, "snap", function() {}) : jQuery(c.J + "_parent").transition({
            x: -(c.kd() / 4),
            y: c.F.nc
          }, 0, "snap", function() {});
          var f = c.We(),
            p = c.kd();
          c.M(c.J + "_parent").css({
            width: d,
            height: f
          });
          c.jd = p;
          c.fg = f;
          d = c.Ci();
          c.F.ta && c.F.ta.turn("size", p, f, !1);
          c.M(c.J + "_panelLeft").css({
            "margin-left": d - c.fa,
            width: c.fa,
            height: f - 30
          });
          c.M(c.J + "_arrowleft").css({
            top: (f - 30) / 2 + "px"
          });
          c.M(c.J + "_arrowright").css({
            top: (f - 30) / 2 + "px"
          });
          c.M(c.J + "_panelRight").css({
            width: c.fa,
            height: f - 30
          });
          c.F.PreviewMode ? (jQuery(c.J + "_arrowleftbottom").hide(), jQuery(c.J + "_arrowleftbottommarker").hide(), jQuery(c.J + "_arrowrightbottom").hide(), jQuery(c.J + "_arrowrightbottommarker").hide()) : (jQuery(c.J + "_arrowleftbottom").show(), jQuery(c.J + "_arrowleftbottommarker").show(), jQuery(c.J + "_arrowrightbottom").show(), jQuery(c.J + "_arrowrightbottommarker").show());
          c.xh = null;
          c.Yr = null;
          c.Dd();
        }
        jQuery(".flowpaper_flipview_page").addClass("flowpaper_redraw");
        for (d = 0; d < c.document.numPages; d++) {
          c.Ua(d) && c.pages[d].Pa();
        }
        "FlipView" == c.F.H ? (window.clearTimeout(c.gp), c.gp = setTimeout(function() {
          c.Al && c.Al();
          for (var d = 0; d < c.document.numPages; d++) {
            c.Ua(d) && (c.pages[d].pa = !1, null != c.F.renderer.resize && c.F.renderer.resize(c.F.renderer, c.pages[d]));
          }
          c.ed();
          jQuery(c.F).trigger("onResizeCompleted");
          c.F.I.tb && jQuery("#" + c.pages.container + "_webglcanvas").css({
            width: p,
            height: f
          });
          g && g();
        }, 300)) : g && g();
      },
      ne: function(c, d) {
        if (c.F.PreviewMode) {
          c.F.openFullScreen();
        } else {
          if (!c.fe()) {
            var e = c.document.TouchZoomInterval ? c.F.scale + c.document.TouchZoomInterval : 2.5;
            "FlipView" == c.F.H ? d ? c.Pa(e, {
              Ob: jQuery(c.J + "_parent").width() / 2,
              oc: jQuery(c.J + "_parent").height() / 2
            }) : c.Pa(e, {
              Ob: c.Zc,
              oc: c.$c
            }) : c.Pa(1);
            c.cd();
          }
        }
      },
      md: function(c, d) {
        "FlipView" == c.F.H ? c.Pa(1, !0, d) : c.Pa(window.FitHeightScale);
        c.cd();
      },
      Xi: function(c) {
        "FlipView" == c.F.H && (this.touchwipe = c.M(c.J).touchwipe({
          wipeLeft: function() {
            c.Ce = !0;
            setTimeout(function() {
              c.Ce = !1;
            }, 3800);
            c.Xf = null;
            null == c.ba && (c.F.ta.turn("cornerActivated") || c.animating || 1 == c.F.scale && c.next());
          },
          wipeRight: function() {
            c.Ce = !0;
            setTimeout(function() {
              c.Ce = !1;
            }, 3800);
            c.Xf = null;
            c.F.ta.turn("cornerActivated") || c.animating || null == c.ba && 1 == c.F.scale && c.previous();
          },
          preventDefaultEvents: !0,
          min_move_x: 100,
          min_move_y: 100
        }));
      },
      ek: function(c) {
        if (c.F.Wb || !eb.platform.touchdevice || c.F.I.mg) {
          c.F.Wb ? (d = c.M(c.J), d.doubletap(function(d) {
            var g = jQuery(".activeElement").data("hint-pageNumber");
            window.parent.postMessage("EditPage:" + g, "*");
            window.clearTimeout(c.Mi);
            d.preventDefault();
            d.stopImmediatePropagation();
          }, null, 300, !0)) : (d = c.M(c.J), d.doubletap(function(c) {
            c.preventDefault();
          }, null, 300));
        } else {
          var d = c.M(c.J);
          d.doubletap(function(d) {
            c.Xf = null;
            if ("TwoPage" == c.F.H || "BookView" == c.F.H || "FlipView" == c.F.H) {
              "TwoPage" != c.F.H && "BookView" != c.F.H || 1 == c.F.scale ? 1 != c.F.scale || "FlipView" != c.F.H || c.vh ? "FlipView" == c.F.H && 1 <= c.F.scale && !c.bj ? c.md() : "TwoPage" == c.F.H && 1 == c.F.scale && c.md() : c.ne() : c.ne(), d.preventDefault(), c.bj = !1, c.vh = !1;
            }
          }, null, 300);
        }
      },
      ji: function(c, d) {
        if ("FlipView" == c.F.H) {
          c.F.I.yf && (c.fa = c.F.I.yf);
          var e = c.We(),
            g = c.kd(),
            f = c.Ci(),
            p = c.F.I.gf && (430 < g || c.F.PreviewMode || c.F.I.Ba),
            k = p ? 0 : f,
            f = f - c.fa,
            l = c.F.I.kb ? c.F.I.kb : "#555555",
            n = c.F.I.ob ? c.F.I.ob : "#AAAAAA",
            q = c.F.I.Oa.height();
          c.Db = c.F.Rb && !c.F.I.fb || 0 == q ? (c.L.height() - e) / 2 : 0;
          c.Db = 0 == c.Db && c.F.ab && !c.F.Rb && 0 < q && !c.F.I.fb ? (c.L.height() - e) / 2 - q : c.Db;
          c.jd = g;
          c.fg = e;
          d.append("<div id='" + c.container + "_parent' style='white-space:nowrap;width:100%;height:" + e + "px;" + (!c.F.ab && !c.F.I.fb || c.F.I.qf ? "margin-top:2.5%;" : 0 < c.Db ? "padding-top:" + c.Db + "px;" : "") + "z-index:10" + (!eb.browser.mozilla || !eb.platform.mac || eb.platform.mac && (18 > parseFloat(eb.browser.version) || 33 < parseFloat(eb.browser.version)) ? "" : ";transform-style:preserve-3d;") + "'>" + (p ? "<div id='" + c.container + "_panelLeft' class='flowpaper_arrow' style='cursor:pointer;opacity: 0;margin-top:15px;-moz-border-radius-topleft: 10px;border-top-left-radius: 10px;-moz-border-radius-bottomleft: 10px;border-bottom-left-radius: 10px;position:relative;float:left;background-color:" + l + ";left:0px;top:0px;height:" + (e - 30) + "px;width:" + c.fa + "px;margin-left:" + f + "px;-moz-user-select:none;-webkit-user-select:none;-ms-user-select:none;user-select: none;'><div style='position:relative;left:" + (c.fa - (c.fa - 0.4 * c.fa)) / 2 + "px;top:" + (e / 2 - c.fa) + "px' id='" + c.container + "_arrowleft' class='flowpaper_arrow'></div><div style='position:absolute;left:" + (c.fa - (c.fa - 0.55 * c.fa)) / 2 + "px;bottom:0px;margin-bottom:10px;' id='" + c.container + "_arrowleftbottom' class='flowpaper_arrow flowpaper_arrow_start'></div><div style='position:absolute;left:" + (c.fa - 0.8 * c.fa) + "px;bottom:0px;width:2px;margin-bottom:10px;' id='" + c.container + "_arrowleftbottommarker' class='flowpaper_arrow flowpaper_arrow_start'></div></div>" : "") + "<div id='" + c.container + "' style='float:left;position:relative;height:" + e + "px;width:" + g + "px;margin-left:" + k + "px;z-index:10;-moz-user-select:none;-webkit-user-select:none;-ms-user-select:none;user-select: none;' class='flowpaper_twopage_container flowpaper_hidden'></div>" + (p ? "<div id='" + c.container + "_panelRight' class='flowpaper_arrow' style='cursor:pointer;opacity: 0;margin-top:15px;-moz-border-radius-topright: 10px;border-top-right-radius: 10px;-moz-border-radius-bottomright: 10px;border-bottom-right-radius: 10px;position:relative;display:inline-block;background-color:" + l + ";left:0px;top:0px;height:" + (e - 30) + "px;width:" + c.fa + "px;-moz-user-select:none;-webkit-user-select:none;-ms-user-select:none;user-select: none;'><div style='position:relative;left:" + (c.fa - (c.fa - 0.4 * c.fa)) / 2 + "px;top:" + (e / 2 - c.fa) + "px' id='" + c.container + "_arrowright' class='flowpaper_arrow'></div><div style='position:absolute;left:" + (c.fa - (c.fa - 0.55 * c.fa)) / 2 + "px;bottom:0px;margin-bottom:10px;' id='" + c.container + "_arrowrightbottom' class='flowpaper_arrow flowpaper_arrow_end'></div><div style='position:absolute;left:" + ((c.fa - (c.fa - 0.55 * c.fa)) / 2 + c.fa - 0.55 * c.fa) + "px;bottom:0px;width:2px;margin-bottom:10px;' id='" + c.container + "_arrowrightbottommarker' class='flowpaper_arrow flowpaper_arrow_end'></div></div>" : "") + "</div>");
          g = R(l);
          c.F.renderer.sa && (c.F.N.append("<canvas id='" + c.container + "_glyphcanvas' style='pointer-events:none;position:absolute;left:0px;top:0px;z-index:-1;' class='flowpaper_glyphcanvas'></canvas>"), eb.browser.msie && 11 > eb.browser.version && PointerEventsPolyfill.initialize({
            selector: "#" + c.container + "_glyphcanvas",
            mouseEvents: ["click", "dblclick", "mousedown", "mouseup", "mousemove"]
          }), jQuery(c.F.renderer).bind("onTextDataUpdated", function(d, e) {
            for (var g = e + 12, f = e - 2; f < g; f++) {
              var h = c.getPage(f);
              if (h) {
                var k = h ? document.getElementById(h.aa + "_canvas") : null;
                if (k) {
                  var l = h.xa(),
                    p = h.Ga(),
                    q = 1.5 < c.F.renderer.Ya ? c.F.renderer.Ya : 1.5;
                  k.width != l * q && (jQuery(k).data("needs-overlay", 1), k.width = l * q, k.height = p * q, h.Ud(k).then(function() {}));
                }
              }
            }
          }));
          jQuery(c.J + "_panelLeft").css("background-color", "rgba(" + g.r + "," + g.g + "," + g.b + "," + c.F.I.ue + ")");
          jQuery(c.J + "_panelRight").css("background-color", "rgba(" + g.r + "," + g.g + "," + g.b + "," + c.F.I.ue + ")");
          jQuery(c.J + "_arrowleft").xe(c.fa - 0.4 * c.fa, n);
          jQuery(c.J + "_arrowright").vd(c.fa - 0.4 * c.fa, n);
          c.F.I.pg && !c.F.Wb && (jQuery(c.J + "_arrowleftbottom").xe(c.fa - 0.55 * c.fa, n), jQuery(c.J + "_arrowleftbottommarker").fj(c.fa - 0.55 * c.fa, n, jQuery(c.J + "_arrowleftbottom")), jQuery(c.J + "_arrowrightbottom").vd(c.fa - 0.55 * c.fa, n), jQuery(c.J + "_arrowrightbottommarker").gj(c.fa - 0.55 * c.fa, n, jQuery(c.J + "_arrowrightbottom")));
          c.F.Wb && (jQuery(c.J + "_arrowleftbottom").xe(c.fa - 0.55 * c.fa, n), jQuery(c.J + "_arrowleftbottommarker").fj(c.fa - 0.55 * c.fa, n, jQuery(c.J + "_arrowleftbottom")), jQuery(c.J + "_arrowrightbottom").vd(c.fa - 0.55 * c.fa, n), jQuery(c.J + "_arrowrightbottommarker").gj(c.fa - 0.55 * c.fa, n, jQuery(c.J + "_arrowrightbottom")), c.F.I.pg || (jQuery(c.J + "_arrowleftbottom").css("opacity", 0), jQuery(c.J + "_arrowleftbottommarker").css("opacity", 0), jQuery(c.J + "_arrowrightbottom").css("opacity", 0), jQuery(c.J + "_arrowrightbottommarker").css("opacity", 0)));
          !c.F.I.Ba || c.F.Te || c.F.ab || d.css("top", (d.height() - e) / 2.1 + "px");
          c.F.I.gf || (jQuery(c.J + "_panelLeft").attr("id", c.J + "_panelLeft_disabled").css("visibility", "none"), jQuery(c.J + "_panelRight").attr("id", c.J + "_panelRight_disabled").css("visibility", "none"));
          c.F.PreviewMode && (jQuery(c.J + "_arrowleftbottom").hide(), jQuery(c.J + "_arrowleftbottommarker").hide(), jQuery(c.J + "_arrowrightbottom").hide(), jQuery(c.J + "_arrowrightbottommarker").hide());
          jQuery(c.J).on(c.F.I.uf ? "mouseup" : "mousedown", function(d) {
            if (jQuery(d.target).hasClass("flowpaper_mark")) {
              return !1;
            }
            var e = !0;
            c.F.I.uf && (c.hm(), null == c.wb || d.pageX && d.pageY && d.pageX <= c.wb + 2 && d.pageX >= c.wb - 2 && d.pageY <= c.sc + 2 && d.pageY >= c.sc - 2 || (e = !1), c.wb = null, c.sc = null, c.Lf && (eb.browser.safari || c.F.renderer.sa) && (jQuery(".flowpaper_flipview_canvas_highres").show(), jQuery(".flowpaper_flipview_canvas").hide(), c.Lf = !1, c.Dd()));
            if ((!c.F.I.uf || e) && !c.F.I.mg) {
              var g = !1,
                e = 0 < jQuery(d.target).parents(".flowpaper_page").children().find(".flowpaper_zine_page_left, .flowpaper_zine_page_left_noshadow").length;
              c.Vf = e ? c.F.da - 2 : c.F.da - 1;
              jQuery(d.target).hasClass("flowpaper_interactiveobject_" + c.P) && (g = !0);
              if (c.F.ta.turn("cornerActivated") || c.animating || jQuery(d.target).hasClass("turn-page-wrapper") || jQuery(d.target).hasClass("flowpaper_shadow") && jQuery(d.target).If()) {
                return;
              }
              if (c.F.PreviewMode && "A" != d.target.tagName) {
                c.F.openFullScreen();
                return;
              }
              eb.platform.mobilepreview || c.fe() || "transform" == c.M(c.J + "_parent").css("will-change") || (c.F.Wb ? (clearTimeout(c.Mi), c.Mi = setTimeout(function() {
                c.Mb() && c.M(c.J + "_parent").css("will-change", "transform");
                var e = jQuery(c.J).Hf(d.pageX, d.pageY);
                g || c.F.mc || 1 != c.F.scale ? !g && !c.F.mc && 1 < c.F.scale ? c.F.Zoom(1, {
                  Vc: !0,
                  Ob: e.x,
                  oc: e.y
                }) : g && c.M(c.J + "_parent").css("will-change", "") : c.F.Zoom(2.5, {
                  Vc: !0,
                  Ob: e.x,
                  oc: e.y
                });
              }, 350)) : (c.Mb() && c.M(c.J + "_parent").css("will-change", "transform"), requestAnim(function() {
                var e = jQuery(c.J).Hf(d.pageX, d.pageY);
                g || c.F.mc || 1 != c.F.scale ? !g && !c.F.mc && 1 < c.F.scale ? c.F.Zoom(1, {
                  Vc: !0,
                  Ob: e.x,
                  oc: e.y
                }) : g && c.M(c.J + "_parent").css("will-change", "") : c.F.Zoom(2.5, {
                  Vc: !0,
                  Ob: e.x,
                  oc: e.y
                });
              }, 50)));
              var f = {};
              jQuery(jQuery(d.target).attr("class").split(" ")).each(function() {
                "" !== this && (f[this] = this);
              });
              for (class_name in f) {
                0 == class_name.indexOf("gotoPage") && c.gotoPage(parseInt(class_name.substr(class_name.indexOf("_") + 1)));
              }
            }
            if (c.F.renderer.sb && c.F.renderer.mb && 1 < c.F.scale) {
              var h = 1 < c.R ? c.R - 1 : c.R;
              setTimeout(function() {
                1 < c.F.scale ? (1 < c.R && c.F.renderer.Nc(c.pages[h - 1]), c.F.renderer.Nc(c.pages[h])) : (1 < c.R && c.F.renderer.Fc(c.pages[h - 1]), c.F.renderer.Fc(c.pages[h]));
              }, 500);
            }
          });
          jQuery(c.J + "_parent").on("mousemove", function(d) {
            if (1 < c.F.scale && !c.F.mc) {
              if (c.F.I.uf && "down" == c.F.sh) {
                c.wb || (c.wb = d.pageX, c.sc = d.pageY), c.Lf || !eb.browser.safari && !c.F.renderer.sa || (jQuery(".flowpaper_flipview_canvas").show(), jQuery(".flowpaper_flipview_canvas_highres").hide(), jQuery(c.J + "_glyphcanvas").css("z-index", -1).rc(), c.Lf = !0), eb.platform.touchdevice || c.M(c.J + "_parent").If() ? (c.Dl && (c.hm(), c.Dl = !1), c.lk(d.pageX, d.pageY)) : (c.L.scrollTo({
                  left: jQuery(c.L).scrollLeft() + (c.wb - d.pageX) + "px",
                  top: jQuery(c.L).scrollTop() + (c.sc - d.pageY) + "px"
                }, 0, {
                  axis: "xy"
                }), c.wb = d.pageX + 3, c.sc = d.pageY + 3);
              } else {
                if (!c.F.I.uf) {
                  var e = c.L.Hf(d.pageX, d.pageY);
                  eb.platform.touchdevice || c.M(c.J + "_parent").If() || c.L.scrollTo({
                    left: d.pageX + "px",
                    top: d.pageY + "px"
                  }, 0, {
                    axis: "xy"
                  });
                  d = e.x / jQuery(c.J + "_parent").width();
                  e = e.y / jQuery(c.J + "_parent").height();
                  requestAnim(function() {
                    c.Dd();
                  }, 10);
                  c.Vg((jQuery(c.L).width() + 150) * d - 20, (jQuery(c.L).height() + 150) * e - 250);
                }
              }
              c.F.renderer.sb && c.F.renderer.mb && !c.F.I.uf && (e = 1 < c.R ? c.R - 1 : c.R, 1 < c.F.scale ? (1 < c.R && c.F.renderer.Nc(c.pages[e - 1]), c.F.renderer.Nc(c.pages[e])) : (1 < c.R && c.F.renderer.Fc(c.pages[e - 1]), c.F.renderer.Fc(c.pages[e])));
            }
          });
          jQuery(c.J + "_parent").on("touchmove", function(d) {
            if (!eb.platform.ios && 2 == d.originalEvent.touches.length) {
              d.preventDefault && d.preventDefault();
              d.returnValue = !1;
              if (c.Wk) {
                return !1;
              }
              var e = Math.sqrt((d.originalEvent.touches[0].pageX - d.originalEvent.touches[1].pageX) * (d.originalEvent.touches[0].pageX - d.originalEvent.touches[1].pageX) + (d.originalEvent.touches[0].pageY - d.originalEvent.touches[1].pageY) * (d.originalEvent.touches[0].pageY - d.originalEvent.touches[1].pageY)),
                e = 2 * e;
              if (null == c.ba) {
                c.gb = c.F.scale, c.Sf = e;
              } else {
                c.ba == c.gb && c.F.ta.turn("setCornerDragging", !1);
                if (null == c.gb || null == c.Sf) {
                  return;
                }
                1 > c.ba && (c.ba = 1);
                3 < c.ba && !eb.platform.Ld && !c.F.renderer.sa && (c.ba = 3);
                c.F.renderer.mb && 4 < c.ba && eb.platform.ipad && !c.F.renderer.sa && (c.ba = 4);
                !c.F.renderer.mb && 3 < c.ba && eb.platform.ipad && !c.F.renderer.sa && (c.ba = 3);
                var g = 0;
                1 != c.F.da || c.F.I.Ba || (g = -(c.kd() / 4));
                c.Wk = !0;
                c.M(c.J + "_parent").transition({
                  x: g,
                  y: c.F.nc,
                  scale: c.ba
                }, 0, "ease", function() {
                  c.Wk = !1;
                });
              }
              c.ba = c.gb + (e - c.Sf) / jQuery(c.J + "_parent").width();
            }
            if (1 < c.F.scale || null != c.ba && 1 < c.ba) {
              e = d.originalEvent.touches[0] || d.originalEvent.changedTouches[0], eb.platform.ios || 2 != d.originalEvent.touches.length ? c.wb || (c.wb = e.pageX, c.sc = e.pageY) : c.wb || (g = d.originalEvent.touches[1] || d.originalEvent.changedTouches[1], g.pageX > e.pageX ? (c.wb = e.pageX + (g.pageX - e.pageX) / 2, c.sc = e.pageY + (g.pageY - e.pageY) / 2) : (c.wb = g.pageX + (e.pageX - g.pageX) / 2, c.sc = g.pageY + (e.pageY - g.pageY) / 2)), c.Lf || c.F.renderer.sa || (jQuery(".flowpaper_flipview_canvas").show(), jQuery(".flowpaper_flipview_canvas_highres").hide(), c.Lf = !0), (1 == d.originalEvent.touches.length || eb.platform.ios) && c.lk(e.pageX, e.pageY), eb.platform.ios ? (jQuery(c.J + "_glyphcanvas").css("z-index", -1).rc(), jQuery(".flowpaper_flipview_canvas").xd()) : c.Dd(2 == d.originalEvent.touches.length && null != c.ba ? c.ba : null), d.preventDefault();
            }
          });
          jQuery(c.J + "_parent, " + c.J).on(!eb.platform.touchonlydevice || eb.platform.mobilepreview ? "mousedown" : "touchstart", function() {
            c.Xf = (new Date).getTime();
          });
          jQuery(c.J + "_parent").on("mouseup touchend", function(d) {
            !c.F.Rb || null != c.ba || c.Ce || c.F.ta.turn("cornerActivated") || c.animating ? c.F.Rb && 0 == c.F.I.Oa.position().top && c.F.I.Oa.animate({
              opacity: 0,
              top: "-" + c.F.I.Oa.height() + "px"
            }, 300) : setTimeout(function() {
              !jQuery(d.target).hasClass("flowpaper_arrow") && 1 == c.F.scale && c.Xf && c.Xf > (new Date).getTime() - 1000 ? (jQuery(c.F.I.Oa).find(".flowpaper_txtSearch").trigger("blur"), 0 == c.F.I.Oa.position().top ? c.F.I.Oa.animate({
                opacity: 0,
                top: "-" + c.F.I.Oa.height() + "px"
              }, 300) : c.F.I.Oa.animate({
                opacity: 1,
                top: "0px"
              }, 300)) : c.Xf = null;
            }, 600);
            if (null != c.gb) {
              c.bj = c.gb < c.ba;
              c.gb = null;
              c.Sf = null;
              c.wb = null;
              c.sc = null;
              1.1 > c.ba && (c.ba = 1);
              c.F.scale = c.ba;
              for (var e = 0; e < c.document.numPages; e++) {
                c.Ua(e) && (c.pages[e].scale = c.F.scale, c.pages[e].Pa());
              }
              c.Dd();
              setTimeout(function() {
                1 == c.F.scale && (c.M(c.J).transition({
                  x: 0,
                  y: 0
                }, 0), c.F.ta.turn("setCornerDragging", !0), c.F.I.fb && (c.F.T.show(), c.F.T.animate({
                  opacity: 1
                }, 100)));
                1 < c.F.scale && c.F.I.fb && c.F.T.animate({
                  opacity: 0
                }, 0, function() {
                  c.F.T.hide();
                });
                for (var d = 0; d < c.document.numPages; d++) {
                  c.Ua(d) && (c.pages[d].pa = !1);
                }
                c.ed();
                jQuery(c).trigger("onScaleChanged");
                c.ba = null;
              }, 500);
            }
            1 < c.F.scale ? (e = c.M(c.J).css("transform") + "", null != e && (e = e.replace("translate", ""), e = e.replace("(", ""), e = e.replace(")", ""), e = e.replace("px", ""), e = e.split(","), c.rd = parseFloat(e[0]), c.te = parseFloat(e[1]), isNaN(c.rd) && (c.rd = 0, c.te = 0)), c.wb && 1.9 < c.F.scale && (jQuery(".flowpaper_flipview_canvas_highres").show(), jQuery(".flowpaper_flipview_canvas").hide()), c.F.renderer.sb && c.F.renderer.mb && 1.9 < c.F.scale && (e = 1 < c.R ? c.R - 1 : c.R, 1 < c.R && c.F.renderer.Nc(c.pages[e - 1]), c.F.renderer.Nc(c.pages[e])), null != c.wb && c.Dd(null != c.ba ? c.ba : c.F.scale)) : (c.rd = 0, c.te = 0);
            c.Lf = !1;
            c.wb = null;
            c.sc = null;
          });
          jQuery(c.J + "_parent").on("gesturechange", function(d) {
            d.preventDefault();
            c.F.I.mg || (null == c.gb && (c.gb = d.originalEvent.scale), c.F.ta.turn("setCornerDragging", !1), c.ba = c.F.scale + (c.gb > c.F.scale ? (d.originalEvent.scale - c.gb) / 2 : 4 * (d.originalEvent.scale - c.gb)), 1 > c.ba && (c.ba = 1), 3 < c.ba && !eb.platform.Ld && !c.F.renderer.sa && (c.ba = 3), c.F.renderer.mb && 4 < c.ba && eb.platform.ipad && !c.F.renderer.sa && (c.ba = 4), !c.F.renderer.mb && 3 < c.ba && (eb.platform.ipad || eb.platform.iphone) && !c.F.renderer.sa && (c.ba = 3), d = 1 != c.F.da || c.F.I.Ba ? 0 : -(c.kd() / 4), c.M(c.J + "_parent").transition({
              x: d,
              y: c.F.nc,
              scale: c.ba
            }, 0, "ease", function() {}));
          });
          jQuery(c.J + "_parent").on("gestureend", function(d) {
            d.preventDefault();
            if (!c.F.I.mg) {
              c.vh = c.ba < c.F.scale || c.vh;
              c.F.scale = c.ba;
              for (d = 0; d < c.document.numPages; d++) {
                c.Ua(d) && (c.pages[d].scale = c.F.scale, c.pages[d].Pa());
              }
              c.Dd();
              setTimeout(function() {
                1 == c.F.scale && (c.M(c.J).transition({
                  x: 0,
                  y: 0
                }, 0), c.F.ta.turn("setCornerDragging", !0));
                for (var d = 0; d < c.document.numPages; d++) {
                  c.Ua(d) && (c.pages[d].pa = !1);
                }
                c.ed();
                jQuery(c).trigger("onScaleChanged");
                c.ba = null;
              }, 500);
            }
          });
          jQuery(c.J + "_parent").on("mousewheel", function(d) {
            if (!(c.fe() || c.F.PreviewMode || (c.F.ta.turn("cornerActivated") && c.F.ta.turn("stop"), c.F.I.mg || c.F.I.zn))) {
              d.preventDefault && d.preventDefault();
              d.returnValue = !1;
              c.Fd || (c.Fd = 0);
              0 < d.deltaY ? c.F.scale + c.Fd + 2 * c.F.document.ZoomInterval < c.F.document.MaxZoomSize && (c.Fd = c.Fd + 2 * c.F.document.ZoomInterval) : c.Fd = 1.2 < c.F.scale + c.Fd - 3 * c.F.document.ZoomInterval ? c.Fd - 3 * c.F.document.ZoomInterval : -(c.F.scale - 1);
              null != c.we && (window.clearTimeout(c.we), c.we = null);
              1.1 <= c.F.scale + c.Fd ? (c.F.I.fb && c.F.T.animate({
                opacity: 0
              }, 0, function() {
                c.F.T.hide();
              }), c.M(c.J + "_panelLeft").finish(), c.M(c.J + "_panelRight").finish(), c.M(c.J + "_panelLeft").fadeTo("fast", 0), c.M(c.J + "_panelRight").fadeTo("fast", 0), c.F.ta.turn("setCornerDragging", !1)) : (c.M(c.J + "_panelLeft").finish(), c.M(c.J + "_panelRight").finish(), 1 < c.R ? c.M(c.J + "_panelLeft").fadeTo("fast", 1) : c.M(c.J + "_panelLeft").fadeTo("fast", 0), c.F.da < c.F.getTotalPages() && c.M(c.J + "_panelRight").fadeTo("fast", 1), c.M(c.J).transition({
                x: 0,
                y: 0
              }, 0), c.F.I.fb && (c.F.T.show(), c.F.T.animate({
                opacity: 1
              }, 100)), c.wb = null, c.sc = null, c.rd = 0, c.te = 0);
              c.bd = c.F.scale + c.Fd;
              1 > c.bd && (c.bd = 1);
              if (!(eb.browser.mozilla && 30 > eb.browser.version) && 0 < jQuery(c.J).find(d.target).length) {
                if (1 == c.bd) {
                  c.M(c.J + "_parent").transition({
                    transformOrigin: "0px 0px"
                  }, 0);
                } else {
                  if (1 == c.F.scale && c.M(c.J + "_parent").transition({
                      transformOrigin: "0px 0px"
                    }, 0), c.F.ta.turn("setCornerDragging", !1), 0 < jQuery(c.J).has(d.target).length) {
                    d = jQuery(c.J + "_parent").Hf(d.pageX, d.pageY);
                    var e = c.M(c.J + "_parent").css("transformOrigin").split(" ");
                    2 <= e.length ? (e[0] = e[0].replace("px", ""), e[1] = e[1].replace("px", ""), c.Bd = parseFloat(e[0]), c.Cd = parseFloat(e[1]), 0 == c.Bd && (c.Bd = d.x), 0 == c.Cd && (c.Cd = d.y)) : (c.Bd = d.x, c.Cd = d.y);
                    c.M(c.J + "_parent").transition({
                      transformOrigin: c.Bd + "px " + c.Cd + "px"
                    }, 0, null, function() {
                      if (eb.platform.touchonlydevice) {
                        c.F.scale = c.bd;
                        for (var d = 0; d < c.document.numPages; d++) {
                          c.Ua(d) && (c.pages[d].scale = c.bd, c.pages[d].Pa());
                        }
                        c.Dd();
                      }
                    });
                  }
                }
              }
              jQuery(".flowpaper_flipview_canvas").xd();
              jQuery(".flowpaper_flipview_canvas_highres").rc();
              jQuery(c.J + "_glyphcanvas").css("z-index", -1).rc();
              c.F.ta.turn("setCornerDragging", !1);
              c.M(c.J + "_parent").transition({
                scale: c.bd
              }, 0, "ease", function() {
                window.clearTimeout(c.we);
                c.we = setTimeout(function() {
                  c.F.scale == c.bd && c.Dd();
                  c.F.scale = c.bd;
                  for (var d = c.Fd = 0; d < c.document.numPages; d++) {
                    c.Ua(d) && (c.pages[d].scale = c.F.scale, c.pages[d].Pa());
                  }
                  1 == c.F.scale && (c.M(c.J).transition({
                    x: 0,
                    y: 0
                  }, 0), c.F.ta.turn("setCornerDragging", !0));
                  for (d = 0; d < c.document.numPages; d++) {
                    c.Ua(d) && (c.pages[d].pa = !1);
                  }
                  c.ed();
                  c.bd = null;
                  jQuery(c).trigger("onScaleChanged");
                  jQuery(c.F.K).trigger("onScaleChanged", c.F.scale / c.F.document.MaxZoomSize);
                }, 150);
              });
            }
          });
          jQuery(c.J + "_arrowleft, " + c.J + "_panelLeft").on(!eb.platform.touchonlydevice || eb.platform.mobilepreview ? "mousedown" : "touchstart", function(d) {
            if (c.F.I.gf) {
              return jQuery(d.target).hasClass("flowpaper_arrow_start") ? c.gotoPage(1) : c.previous(), !1;
            }
          });
          jQuery(c.J + "_arrowright, " + c.J + "_panelRight").on(!eb.platform.touchonlydevice || eb.platform.mobilepreview ? "mousedown" : "touchstart", function(d) {
            jQuery(d.target).hasClass("flowpaper_arrow_end") ? c.gotoPage(c.F.getTotalPages()) : c.next();
            return !1;
          });
          jQuery(d).css("overflow-y", "hidden");
          jQuery(d).css("overflow-x", "hidden");
          jQuery(d).css("-webkit-overflow-scrolling", "hidden");
        }
      },
      Sh: function(c, d) {
        c.ol = d.append("<div id='" + c.container + "_play' onclick='$FlowPaper(\"" + c.P + "\").openFullScreen()' class='abc' style='position:absolute;left:" + (d.width() / 2 - 20) + "px;top:" + (c.fg / 2 - 25) + "px;width:" + c.jd + "px;height:" + c.fg + "px;z-index:100;'></div>");
        jQuery("#" + c.container + "_play").vd(50, "#AAAAAA", !0);
      },
      Yo: function(c, d) {
        d.find("#" + c.container + "_play").remove();
        c.ol = null;
      },
      previous: function(c) {
        if ("FlipView" == c.F.H) {
          var d = c.R - 1;
          c.F.renderer.ie && c.$e(d);
          1 != c.F.scale ? c.Pa(1, !0, function() {
            jQuery(c.F.K).trigger("onScaleChanged", 1 / c.F.document.MaxZoomSize);
            c.F.turn("previous");
          }) : c.F.turn("previous");
        }
      },
      next: function(c) {
        if ("FlipView" == c.F.H) {
          var d = c.R;
          if (d < c.F.getTotalPages() || d == c.F.getTotalPages() && c.F.I.Ba) {
            d++, c.F.renderer.ie && c.$e(d), 1 != c.F.scale ? c.Pa(1, !0, function() {
              jQuery(c.F.K).trigger("onScaleChanged", 1 / c.F.document.MaxZoomSize);
              c.F.turn("next");
            }) : c.F.turn("next");
          }
        }
      },
      Vg: function(c, d, e) {
        if (!c.animating) {
          var g = c.L.width(),
            f = c.L.height(),
            p = null == c.bd ? c.F.scale : c.bd;
          "FlipView" == c.F.H && 1 < p && !eb.browser.safari ? c.M(c.J).transition({
            x: -c.Vn(d, c.F.scale),
            y: -c.Wn(e)
          }, 0) : "FlipView" == c.F.H && 1 < p && eb.browser.safari && jQuery(".flowpaper_viewer").scrollTo({
            top: 0.9 * e / f * 100 + "%",
            left: d / g * 100 + "%"
          }, 0, {
            axis: "xy"
          });
        }
      },
      Fi: function(c) {
        c = c.M(c.J + "_parent").css("transformOrigin") + "";
        return null != c ? (c = c.replace("translate", ""), c = c.replace("(", ""), c = c.replace(")", ""), c = c.split(" "), 1 < c.length ? {
          left: parseFloat(c[0].replace("px", "")),
          top: parseFloat(c[1].replace("px", ""))
        } : null) : null;
      },
      Ie: function(c) {
        !eb.platform.touchdevice && "FlipView" == c.F.H && 1 < c.F.scale ? jQuery(".flowpaper_viewer").scrollTo({
          left: "50%"
        }, 0, {
          axis: "x"
        }) : eb.platform.touchdevice || "FlipView" != c.F.H || 1 != c.F.scale || c.Mb() || jQuery(".flowpaper_viewer").scrollTo({
          left: "0%",
          top: "0%"
        }, 0, {
          axis: "xy"
        });
      }
    };
    return f;
  }(),
  X = window.Dq = X || {},
  Y = X;
Y.Jh = {
  PI: Math.PI,
  Ir: 1 / Math.PI,
  co: 0.5 * Math.PI,
  Gn: 2 * Math.PI,
  ms: Math.PI / 180,
  ls: 180 / Math.PI
};
Y.be = {
  NONE: 0,
  LEFT: -1,
  RIGHT: 1,
  X: 1,
  Y: 2,
  Ph: 4,
  Qq: 0,
  Rq: 1,
  Uq: 2
};
Y.um = "undefined" !== typeof Float32Array ? Float32Array : Array;
Y.rq = "undefined" !== typeof Float64Array ? Float64Array : Array;
Y.sq = "undefined" !== typeof Int8Array ? Int8Array : Array;
Y.nq = "undefined" !== typeof Int16Array ? Int16Array : Array;
Y.pq = "undefined" !== typeof Int32Array ? Int32Array : Array;
Y.tq = "undefined" !== typeof Uint8Array ? Uint8Array : Array;
Y.oq = "undefined" !== typeof Uint16Array ? Uint16Array : Array;
Y.qq = "undefined" !== typeof Uint32Array ? Uint32Array : Array;
Y.Oh = Y.um;
!0;
! function(f, c) {
  var d = f.Qj = ring.create({
    constructor: function(d, g) {
      this.x = d === c ? 0 : d;
      this.y = g === c ? 0 : g;
    },
    x: 0,
    y: 0,
    dispose: function() {
      this.y = this.x = null;
      return this;
    },
    serialize: function() {
      return {
        name: this.name,
        x: this.x,
        y: this.y
      };
    },
    Bb: function(c) {
      c && this.name === c.name && (this.x = c.x, this.y = c.y);
      return this;
    },
    clone: function() {
      return new d(this.x, this.y);
    }
  });
}(X);
! function(f, c) {
  var d = Math.sin,
    e = Math.cos,
    g = f.Qj,
    h = f.Em = ring.create({
      constructor: function(d, e, g, f) {
        this.m11 = d === c ? 1 : d;
        this.m12 = e === c ? 0 : e;
        this.m21 = g === c ? 0 : g;
        this.m22 = f === c ? 1 : f;
      },
      m11: 1,
      m12: 0,
      m21: 0,
      m22: 1,
      dispose: function() {
        this.m22 = this.m21 = this.m12 = this.m11 = null;
        return this;
      },
      serialize: function() {
        return {
          name: this.name,
          m11: this.m11,
          m12: this.m12,
          m21: this.m21,
          m22: this.m22
        };
      },
      Bb: function(c) {
        c && this.name === c.name && (this.m11 = c.m11, this.m12 = c.m12, this.m21 = c.m21, this.m22 = c.m22);
        return this;
      },
      reset: function() {
        this.m11 = 1;
        this.m21 = this.m12 = 0;
        this.m22 = 1;
        return this;
      },
      rotate: function(c) {
        var g = e(c);
        c = d(c);
        this.m11 = g;
        this.m12 = -c;
        this.m21 = c;
        this.m22 = g;
        return this;
      },
      scale: function(d, e) {
        this.m21 = this.m12 = 0;
        this.m22 = this.m11 = 1;
        d !== c && (this.m22 = this.m11 = d);
        e !== c && (this.m22 = e);
        return this;
      },
      multiply: function(c) {
        var d = this.m11,
          e = this.m12,
          g = this.m21,
          f = this.m22,
          h = c.m11,
          r = c.m12,
          m = c.m21;
        c = c.m22;
        this.m11 = d * h + e * m;
        this.m12 = d * r + e * c;
        this.m21 = g * h + f * m;
        this.m22 = g * r + f * c;
        return this;
      },
      ns: function(c) {
        var d = c.x;
        c = c.y;
        return new g(this.m11 * d + this.m12 * c, this.m21 * d + this.m22 * c);
      },
      dm: function(c) {
        var d = c.x,
          e = c.y;
        c.x = this.m11 * d + this.m12 * e;
        c.y = this.m21 * d + this.m22 * e;
        return c;
      },
      clone: function() {
        return new h(this.m11, this.m12, this.m21, this.m22);
      }
    });
}(X);
! function(f, c) {
  var d = Math.sqrt,
    e = f.Oh,
    g = f.Vector3 = ring.create({
      constructor: function(d, g, f) {
        d && d.length ? this.ca = new e([d[0], d[1], d[2]]) : (d = d === c ? 0 : d, g = g === c ? 0 : g, f = f === c ? 0 : f, this.ca = new e([d, g, f]));
      },
      ca: null,
      dispose: function() {
        this.ca = null;
        return this;
      },
      serialize: function() {
        return {
          name: this.name,
          ca: this.ca
        };
      },
      Bb: function(c) {
        c && this.name === c.name && (this.ca = c.ca);
        return this;
      },
      Jd: function() {
        return new e(this.ca);
      },
      Kk: function() {
        return this.ca;
      },
      setXYZ: function(c) {
        this.ca = new e(c);
        return this;
      },
      Nl: function(c) {
        this.ca = c;
        return this;
      },
      clone: function() {
        return new g(this.ca);
      },
      kr: function(c) {
        var d = this.ca;
        c = c.ca;
        return d[0] == c[0] && d[1] == c[1] && d[2] == c[2];
      },
      Cs: function() {
        this.ca[0] = 0;
        this.ca[1] = 0;
        this.ca[2] = 0;
        return this;
      },
      negate: function() {
        var c = this.ca;
        return new g([-c[0], -c[1], -c[2]]);
      },
      Tr: function() {
        var c = this.ca;
        c[0] = -c[0];
        c[1] = -c[1];
        c[2] = -c[2];
        return this;
      },
      add: function(c) {
        var d = this.ca;
        c = c.ca;
        return new g([d[0] + c[0], d[1] + c[1], d[2] + c[2]]);
      },
      Xm: function(c) {
        var d = this.ca;
        c = c.ca;
        d[0] += c[0];
        d[1] += c[1];
        d[2] += c[2];
        return this;
      },
      gs: function(c) {
        var d = this.ca;
        c = c.ca;
        return new g([d[0] - c[0], d[1] - c[1], d[2] - c[2]]);
      },
      hs: function(c) {
        var d = this.ca;
        c = c.ca;
        d[0] -= c[0];
        d[1] -= c[1];
        d[2] -= c[2];
        return this;
      },
      multiplyScalar: function(c) {
        var d = this.ca;
        return new g([d[0] * c, d[1] * c, d[2] * c]);
      },
      Qr: function(c) {
        var d = this.ca;
        d[0] *= c;
        d[1] *= c;
        d[2] *= c;
        return this;
      },
      multiply: function(c) {
        var d = this.ca;
        c = c.ca;
        return new g([d[0] * c[0], d[1] * c[1], d[2] * c[2]]);
      },
      Rr: function(c) {
        var d = this.ca;
        c = c.ca;
        d[0] *= c[0];
        d[1] *= c[1];
        d[2] *= c[2];
        return this;
      },
      divide: function(c) {
        c = 1 / c;
        var d = this.ca;
        return new g([d[0] * c, d[1] * c, d[2] * c]);
      },
      hr: function(c) {
        c = 1 / c;
        var d = this.ca;
        d[0] *= c;
        d[1] *= c;
        d[2] *= c;
        return this;
      },
      normalize: function() {
        var c = this.ca,
          e = c[0],
          f = c[1],
          c = c[2],
          l = e * e + f * f + c * c;
        0 < l && (l = 1 / d(l), e *= l, f *= l, c *= l);
        return new g([e, f, c]);
      },
      Ho: function() {
        var c = this.ca,
          e = c[0],
          g = c[1],
          f = c[2],
          n = e * e + g * g + f * f;
        0 < n && (n = 1 / d(n), e *= n, g *= n, f *= n);
        c[0] = e;
        c[1] = g;
        c[2] = f;
        return this;
      },
      ur: function() {
        var c = this.ca,
          e = c[0],
          g = c[1],
          c = c[2];
        return d(e * e + g * g + c * c);
      },
      bs: function(c) {
        this.Ho();
        var d = this.ca;
        d[0] *= c;
        d[1] *= c;
        d[2] *= c;
        return this;
      },
      ir: function(c) {
        var d = this.ca;
        c = c.ca;
        return d[0] * c[0] + d[1] * c[1] + d[2] * c[2];
      },
      $q: function(c) {
        var d = this.ca,
          e = c.ca;
        c = d[0];
        var g = d[1],
          f = d[2],
          q = e[0],
          t = e[1],
          e = e[2];
        d[0] = g * e - f * t;
        d[1] = f * q - c * e;
        d[2] = c * t - g * q;
        return this;
      },
      gr: function(c) {
        var e = this.ca,
          g = c.ca;
        c = e[0] - g[0];
        var f = e[1] - g[1],
          e = e[2] - g[2];
        return d(c * c + f * f + e * e);
      },
      toString: function() {
        return "[" + this.ca[0] + " , " + this.ca[1] + " , " + this.ca[2] + "]";
      }
    });
  f.Vector3.ZERO = function() {
    return new g([0, 0, 0]);
  };
  f.Vector3.dot = function(c, d) {
    var e = c.ca,
      g = d.ca;
    return e[0] * g[0] + e[1] * g[1] + e[2] * g[2];
  };
  f.Vector3.equals = function(c, d) {
    var e = c.ca,
      g = d.ca;
    return e[0] == g[0] && e[1] == g[1] && e[2] == g[2];
  };
  f.Vector3.cross = function(c, d) {
    var e = c.ca,
      f = d.ca,
      n = e[0],
      q = e[1],
      e = e[2],
      t = f[0],
      r = f[1],
      f = f[2];
    return new g([q * f - e * r, e * t - n * f, n * r - q * t]);
  };
  f.Vector3.distance = function(c, e) {
    var g = c.ca,
      f = e.ca,
      n = g[0] - f[0],
      q = g[1] - f[1],
      g = g[2] - f[2];
    return d(n * n + q * q + g * g);
  };
  f.Vector3.js = function(c, d) {
    var e = c.ca,
      f = d.ca;
    return new g([e[0] + f[0], e[1] + f[1], e[2] + f[2]]);
  };
}(X);
! function(f, c) {
  var d = f.be,
    e = d.X,
    g = d.Y,
    h = d.Ph,
    p = f.Vector3,
    k = f.Oh;
  f.eg = ring.create({
    constructor: function(d) {
      this.ca = new k([0, 0, 0]);
      this.Lb = new k([0, 0, 0]);
      this.ratio = new k([0, 0, 0]);
      c !== d && null !== d && !1 !== d && this.Ml(d);
    },
    ib: null,
    ca: null,
    Lb: null,
    ratio: null,
    dispose: function() {
      this.ratio = this.Lb = this.ca = this.ib = null;
      return this;
    },
    serialize: function() {
      return {
        ib: this.name,
        ca: this.Jd(),
        Lb: this.Lb,
        ratio: this.ratio
      };
    },
    Bb: function(c) {
      c && (this.setXYZ(c.ca), this.Lb = c.Lb, this.ratio = c.ratio);
      return this;
    },
    Ml: function(c) {
      this.ib = c;
      return this;
    },
    Ar: function() {
      return new p(this.ratio);
    },
    zr: function(c) {
      switch (c) {
        case e:
          return this.ratio[0];
        case g:
          return this.ratio[1];
        case h:
          return this.ratio[2];
      }
      return -1;
    },
    yr: function(c) {
      switch (c) {
        case e:
          return this.Lb[0];
        case g:
          return this.Lb[1];
        case h:
          return this.Lb[2];
      }
      return 0;
    },
    rp: function(d, e, g) {
      d = d === c ? 0 : d;
      e = e === c ? 0 : e;
      g = g === c ? 0 : g;
      this.ratio = new k([d, e, g]);
      return this;
    },
    pp: function(d, e, g) {
      d = d === c ? 0 : d;
      e = e === c ? 0 : e;
      g = g === c ? 0 : g;
      this.Lb = new k([d, e, g]);
      return this;
    },
    Jd: function() {
      return new k(this.ca);
    },
    Kk: function() {
      return this.ca;
    },
    getX: function() {
      return this.ca[0];
    },
    getY: function() {
      return this.ca[1];
    },
    getZ: function() {
      return this.ca[2];
    },
    setXYZ: function(c) {
      this.ca = new k(c);
      return this;
    },
    Nl: function(c) {
      this.ca = c;
      return this;
    },
    setX: function(c) {
      this.ca[0] = c;
      return this;
    },
    setY: function(c) {
      this.ca[1] = c;
      return this;
    },
    setZ: function(c) {
      this.ca[2] = c;
      return this;
    },
    getValue: function(c) {
      switch (c) {
        case e:
          return this.getX();
        case g:
          return this.getY();
        case h:
          return this.getZ();
      }
      return 0;
    },
    setValue: function(c, d) {
      switch (c) {
        case e:
          this.setX(d);
          break;
        case g:
          this.setY(d);
          break;
        case h:
          this.setZ(d);
      }
      return this;
    },
    reset: function() {
      this.setXYZ(this.Lb);
      return this;
    },
    collapse: function() {
      this.Lb = this.Jd();
      return this;
    },
    Gk: function() {
      return new p(this.Jd());
    },
    Ll: function(c) {
      this.setXYZ(c.ca);
    }
  });
}(X);
! function(f, c) {
  var d = f.be,
    e = d.X,
    g = d.Y,
    h = d.Ph,
    p = Math.min,
    k = Math.max,
    l, n;
  l = function(c) {
    return c ? c.serialize() : c;
  };
  n = f.isWorker ? function(c) {
    return c && c.ib ? (new f.eg).Bb(c) : c;
  } : function(c, d) {
    return c && c.ib ? this.vertices[d].Bb(c) : c;
  };
  f.Ig = ring.create({
    constructor: function(d) {
      this.depth = this.height = this.width = this.wc = this.hc = this.gc = this.Qd = this.Pd = this.Od = this.se = this.re = this.pe = null;
      this.vertices = [];
      this.faces = [];
      this.ja = null;
      c !== d && this.qj(d);
    },
    pe: null,
    re: null,
    se: null,
    Od: null,
    Pd: null,
    Qd: null,
    gc: null,
    hc: null,
    wc: null,
    width: null,
    height: null,
    depth: null,
    vertices: null,
    faces: null,
    ja: null,
    dispose: function() {
      this.depth = this.height = this.width = this.wc = this.hc = this.gc = this.Qd = this.Pd = this.Od = this.se = this.re = this.pe = null;
      this.tk();
      this.uk();
      this.ja = null;
      return this;
    },
    uk: function() {
      var c, d;
      if (this.vertices) {
        for (d = this.vertices.length, c = 0; c < d; c++) {
          this.vertices[c].dispose();
        }
      }
      this.vertices = null;
      return this;
    },
    tk: function() {
      var c, d;
      if (this.faces) {
        for (d = this.faces.length, c = 0; c < d; c++) {
          this.faces[c].dispose();
        }
      }
      this.faces = null;
      return this;
    },
    serialize: function() {
      return {
        ja: this.name,
        pe: this.pe,
        re: this.re,
        se: this.se,
        Od: this.Od,
        Pd: this.Pd,
        Qd: this.Qd,
        gc: this.gc,
        hc: this.hc,
        wc: this.wc,
        width: this.width,
        height: this.height,
        depth: this.depth,
        vertices: this.vertices ? this.vertices.map(l) : null,
        faces: null
      };
    },
    Bb: function(c) {
      c && (f.isWorker && (this.tk(), this.uk()), this.pe = c.pe, this.re = c.re, this.se = c.se, this.Od = c.Od, this.Pd = c.Pd, this.Qd = c.Qd, this.gc = c.gc, this.hc = c.hc, this.wc = c.wc, this.width = c.width, this.height = c.height, this.depth = c.depth, this.vertices = (c.vertices || []).map(n, this), this.faces = null);
      return this;
    },
    qj: function(c) {
      this.ja = c;
      this.vertices = [];
      return this;
    },
    Hk: function() {
      return this.vertices;
    },
    rr: function() {
      return this.faces;
    },
    bk: function() {
      var c = this.vertices,
        d = c.length,
        f = d,
        l, n, v, x, z, w, D, C, H, A, G;
      for (d && (l = c[0], n = l.Jd(), v = n[0], x = n[1], n = n[2], z = w = v, D = C = x, H = A = n); 0 <= --f;) {
        l = c[f], n = l.Jd(), v = n[0], x = n[1], n = n[2], l.pp(v, x, n), z = p(z, v), D = p(D, x), H = p(H, n), w = k(w, v), C = k(C, x), A = k(A, n);
      }
      v = w - z;
      x = C - D;
      G = A - H;
      this.width = v;
      this.height = x;
      this.depth = G;
      this.Od = z;
      this.pe = w;
      this.Pd = D;
      this.re = C;
      this.Qd = H;
      this.se = A;
      f = k(v, x, G);
      l = p(v, x, G);
      f == v && l == x ? (this.wc = g, this.hc = h, this.gc = e) : f == v && l == G ? (this.wc = h, this.hc = g, this.gc = e) : f == x && l == v ? (this.wc = e, this.hc = h, this.gc = g) : f == x && l == G ? (this.wc = h, this.hc = e, this.gc = g) : f == G && l == v ? (this.wc = e, this.hc = g, this.gc = h) : f == G && l == x && (this.wc = g, this.hc = e, this.gc = h);
      for (f = d; 0 <= --f;) {
        l = c[f], n = l.Jd(), l.rp((n[0] - z) / v, (n[1] - D) / x, (n[2] - H) / G);
      }
      return this;
    },
    ep: function() {
      for (var c = this.vertices, d = c.length; 0 <= --d;) {
        c[d].reset();
      }
      this.update();
      return this;
    },
    tn: function() {
      for (var c = this.vertices, d = c.length; 0 <= --d;) {
        c[d].collapse();
      }
      this.update();
      this.bk();
      return this;
    },
    $n: function(c) {
      switch (c) {
        case e:
          return this.Od;
        case g:
          return this.Pd;
        case h:
          return this.Qd;
      }
      return -1;
    },
    vr: function(c) {
      switch (c) {
        case e:
          return this.pe;
        case g:
          return this.re;
        case h:
          return this.se;
      }
      return -1;
    },
    getSize: function(c) {
      switch (c) {
        case e:
          return this.width;
        case g:
          return this.height;
        case h:
          return this.depth;
      }
      return -1;
    },
    update: function() {
      return this;
    },
    Xr: function() {
      return this;
    },
    gm: function() {
      return this;
    }
  });
}(X);
! function(f) {
  var c = 0,
    d = f.be.NONE;
  f.Pj = ring.create({
    constructor: function(e) {
      this.id = ++c;
      this.ma = e || null;
      this.dc = this.Ge = d;
      this.enabled = !0;
    },
    id: null,
    ma: null,
    Ge: null,
    dc: null,
    enabled: !0,
    dispose: function(c) {
      !0 === c && this.ma && this.ma.dispose();
      this.dc = this.Ge = this.name = this.ma = null;
      return this;
    },
    serialize: function() {
      return {
        qd: this.name,
        params: {
          Ge: this.Ge,
          dc: this.dc,
          enabled: !!this.enabled
        }
      };
    },
    Bb: function(c) {
      c && this.name === c.qd && (c = c.params, this.Ge = c.Ge, this.dc = c.dc, this.enabled = c.enabled);
      return this;
    },
    enable: function(c) {
      return arguments.length ? (this.enabled = !!c, this) : this.enabled;
    },
    Yq: function(c) {
      this.Ge = c || d;
      return this;
    },
    as: function(c) {
      this.dc = c || d;
      return this;
    },
    Bh: function(c) {
      this.ma = c;
      return this;
    },
    Hk: function() {
      return this.ma ? this.ma.Hk() : null;
    },
    xf: function() {
      return this;
    },
    apply: function(c) {
      var d = this;
      d._worker ? d.bind("apply", function(f) {
        d.unbind("apply");
        f && f.xg && (d.ma.Bb(f.xg), d.ma.update());
        c && c.call(d);
      }).send("apply", {
        params: d.serialize(),
        xg: d.ma.serialize()
      }) : (d.xf(), c && c.call(d));
      return d;
    },
    toString: function() {
      return "[Modifier " + this.name + "]";
    }
  });
}(X);
! function(f) {
  f.Mh = ring.create({
    constructor: function() {
      this.Vi = f.Ig;
      this.mm = f.eg;
    },
    Vi: null,
    mm: null
  });
  var c = ring.create({
    Zn: function(c) {
      if (arguments.length) {
        var e = c.Vi;
        return e ? new e : null;
      }
      return null;
    },
    ao: function(c) {
      return c && c.qd && f[c.qd] ? new f[c.qd] : null;
    },
    sr: function(c) {
      return c && c.al && f[c.al] ? new f[c.al] : new f.Mh;
    },
    wr: function(c) {
      return c && c.ja && f[c.ja] ? (new f.Ig).Bb(c) : new f.Ig;
    },
    Br: function(c) {
      return c && c.ib && f[c.ib] ? (new f.eg).Bb(c) : new f.eg;
    }
  });
  f.Nj = new c;
}(X);
! function(f) {
  function c(c) {
    return c ? c.serialize() : c;
  }
  var d = f.Nj.Zn,
    e = f.Gm = ring.create({
      constructor: function(c, e) {
        this.ma = null;
        this.stack = [];
        this.Qi = f.isWorker ? new f.Mh : c;
        this.ma = d(this.Qi);
        e && (this.ma.qj(e), this.ma.bk());
      },
      Qi: null,
      ma: null,
      stack: null,
      dispose: function(c) {
        this.Qi = null;
        if (c && this.stack) {
          for (; this.stack.length;) {
            this.stack.pop().dispose();
          }
        }
        this.stack = null;
        this.ma && this.ma.dispose();
        this.ma = null;
        return this;
      },
      serialize: function() {
        return {
          qd: this.name,
          params: {
            Fo: this.stack.map(c)
          }
        };
      },
      Bb: function(c) {
        if (c && this.name === c.qd) {
          c = c.params.Fo;
          var d = this.stack,
            e;
          if (c.length !== d.length) {
            for (e = d.length = 0; e < c.length; e++) {
              d.push(f.Nj.ao(c[e]));
            }
          }
          for (e = 0; e < d.length; e++) {
            d[e] = d[e].Bb(c[e]).Bh(this.ma);
          }
          this.stack = d;
        }
        return this;
      },
      Bh: function(c) {
        this.ma = c;
        return this;
      },
      add: function(c) {
        c && (c.Bh(this.ma), this.stack.push(c));
        return this;
      },
      xf: function() {
        if (this.ma && this.stack && this.stack.length) {
          var c = this.stack,
            d = c.length,
            e = this.ma,
            f = 0;
          for (e.ep(); f < d;) {
            c[f].enabled && c[f].xf(), f++;
          }
          e.update();
        }
        return this;
      },
      apply: function(c) {
        var d = this;
        d._worker ? d.bind("apply", function(e) {
          d.unbind("apply");
          e && e.xg && (d.ma.Bb(e.xg), d.ma.update());
          c && c.call(d);
        }).send("apply", {
          params: d.serialize(),
          xg: d.ma.serialize()
        }) : (d.xf(), c && c.call(d));
        return d;
      },
      collapse: function() {
        this.ma && this.stack && this.stack.length && (this.apply(), this.ma.tn(), this.stack.length = 0);
        return this;
      },
      clear: function() {
        this.stack && (this.stack.length = 0);
        return this;
      },
      xr: function() {
        return this.ma;
      }
    });
  e.prototype.Zj = e.prototype.add;
}(X);
! function(f) {
  var c = f.Vector3;
  f.Km = ring.create([f.Pj], {
    constructor: function(d, e, f) {
      this.$super();
      this.Zb = new c([d || 0, e || 0, f || 0]);
    },
    Zb: null,
    dispose: function() {
      this.Zb.dispose();
      this.Zb = null;
      this.$super();
      return this;
    },
    serialize: function() {
      return {
        qd: this.name,
        params: {
          Zb: this.Zb.serialize(),
          enabled: !!this.enabled
        }
      };
    },
    Bb: function(c) {
      c && this.name === c.qd && (c = c.params, this.Zb.Bb(c.Zb), this.enabled = !!c.enabled);
      return this;
    },
    ds: function() {
      var d = this.ma;
      this.Zb = new c(-(d.Od + 0.5 * d.width), -(d.Pd + 0.5 * d.height), -(d.Qd + 0.5 * d.depth));
      return this;
    },
    xf: function() {
      for (var c = this.ma.vertices, e = c.length, f = this.Zb, h; 0 <= --e;) {
        h = c[e], h.Ll(h.Gk().Xm(f));
      }
      this.ma.gm(f.negate());
      return this;
    }
  });
}(X);
! function(f, c) {
  var d = f.be.NONE,
    e = f.be.LEFT,
    g = f.be.RIGHT,
    h = f.Em,
    p = Math.atan,
    k = Math.sin,
    l = Math.cos,
    n = f.Jh.PI,
    q = f.Jh.co,
    t = f.Jh.Gn,
    r = f.Qj;
  f.wm = ring.create([f.Pj], {
    constructor: function(e, f, g) {
      this.$super();
      this.dc = d;
      this.origin = this.height = this.width = this.Nd = this.min = this.max = 0;
      this.pd = this.od = null;
      this.Ne = 0;
      this.Xd = !1;
      this.force = e !== c ? e : 0;
      this.offset = f !== c ? f : 0;
      g !== c ? this.Bg(g) : this.Bg(0);
    },
    force: 0,
    offset: 0,
    angle: 0,
    Ne: 0,
    max: 0,
    min: 0,
    Nd: 0,
    width: 0,
    height: 0,
    origin: 0,
    od: null,
    pd: null,
    Xd: !1,
    dispose: function() {
      this.origin = this.height = this.width = this.Nd = this.min = this.max = this.Ne = this.angle = this.offset = this.force = null;
      this.od && this.od.dispose();
      this.pd && this.pd.dispose();
      this.Xd = this.pd = this.od = null;
      this.$super();
      return this;
    },
    serialize: function() {
      return {
        qd: this.name,
        params: {
          force: this.force,
          offset: this.offset,
          angle: this.angle,
          Ne: this.Ne,
          max: this.max,
          min: this.min,
          Nd: this.Nd,
          width: this.width,
          height: this.height,
          origin: this.origin,
          od: this.od.serialize(),
          pd: this.pd.serialize(),
          Xd: this.Xd,
          dc: this.dc,
          enabled: !!this.enabled
        }
      };
    },
    Bb: function(c) {
      c && this.name === c.qd && (c = c.params, this.force = c.force, this.offset = c.offset, this.angle = c.angle, this.Ne = c.Ne, this.max = c.max, this.min = c.min, this.Nd = c.Nd, this.width = c.width, this.height = c.height, this.origin = c.origin, this.od.Bb(c.od), this.pd.Bb(c.pd), this.Xd = c.Xd, this.dc = c.dc, this.enabled = !!c.enabled);
      return this;
    },
    Bg: function(c) {
      this.angle = c;
      this.od = (new h).rotate(c);
      this.pd = (new h).rotate(-c);
      return this;
    },
    Bh: function(c) {
      this.$super(c);
      this.max = this.Xd ? this.ma.hc : this.ma.gc;
      this.min = this.ma.wc;
      this.Nd = this.Xd ? this.ma.gc : this.ma.hc;
      this.width = this.ma.getSize(this.max);
      this.height = this.ma.getSize(this.Nd);
      this.origin = this.ma.$n(this.max);
      this.Ne = p(this.width / this.height);
      return this;
    },
    xf: function() {
      if (!this.force) {
        return this;
      }
      for (var c = this.ma.vertices, d = c.length, f = this.dc, h = this.width, p = this.offset, w = this.origin, D = this.max, C = this.min, H = this.Nd, A = this.od, G = this.pd, B = w + h * p, F = h / n / this.force, y = h / (F * t) * t, E, I, K, N, L = 1 / h; 0 <= --d;) {
        h = c[d], E = h.getValue(D), I = h.getValue(H), K = h.getValue(C), I = A.dm(new r(E, I)), E = I.x, I = I.y, N = (E - w) * L, e === f && N <= p || g === f && N >= p || (N = q - y * p + y * N, E = k(N) * (F + K), N = l(N) * (F + K), K = E - F, E = B - N), I = G.dm(new r(E, I)), E = I.x, I = I.y, h.setValue(D, E), h.setValue(H, I), h.setValue(C, K);
      }
      return this;
    }
  });
}(X);
! function(f) {
  var c = f.be,
    d = c.X,
    e = c.Y,
    g = c.Ph,
    h = f.Vector3,
    p = f.Oh,
    c = f.Rj = ring.create([f.eg], {
      constructor: function(c, d) {
        this.ja = c;
        this.$super(d);
      },
      ja: null,
      dispose: function() {
        this.ja = null;
        this.$super();
        return this;
      },
      Ml: function(c) {
        this.ib = c;
        this.Lb = new p([c.x, c.y, c.z]);
        this.ca = new p(this.Lb);
        return this;
      },
      Jd: function() {
        var c = this.ib;
        return new p([c.x, c.y, c.z]);
      },
      getX: function() {
        return this.ib.x;
      },
      getY: function() {
        return this.ib.y;
      },
      getZ: function() {
        return this.ib.z;
      },
      setXYZ: function(c) {
        var d = this.ib;
        d.x = c[0];
        d.y = c[1];
        d.z = c[2];
        return this;
      },
      setX: function(c) {
        this.ib.x = c;
        return this;
      },
      setY: function(c) {
        this.ib.y = c;
        return this;
      },
      setZ: function(c) {
        this.ib.z = c;
        return this;
      },
      reset: function() {
        var c = this.ib,
          d = this.Lb;
        c.x = d[0];
        c.y = d[1];
        c.z = d[2];
        return this;
      },
      collapse: function() {
        var c = this.ib;
        this.Lb = new p([c.x, c.y, c.z]);
        return this;
      },
      getValue: function(c) {
        var f = this.ib;
        switch (c) {
          case d:
            return f.x;
          case e:
            return f.y;
          case g:
            return f.z;
        }
        return 0;
      },
      setValue: function(c, f) {
        var h = this.ib;
        switch (c) {
          case d:
            h.x = f;
            break;
          case e:
            h.y = f;
            break;
          case g:
            h.z = f;
        }
        return this;
      },
      Ll: function(c) {
        var d = this.ib;
        c = c.ca;
        d.x = c[0];
        d.y = c[1];
        d.z = c[2];
        return this;
      },
      Gk: function() {
        var c = this.ib;
        return new h([c.x, c.y, c.z]);
      }
    });
  c.prototype.Kk = c.prototype.Jd;
  c.prototype.Nl = c.prototype.setXYZ;
}(X);
! function(f) {
  var c = f.Rj;
  f.Fm = ring.create([f.Ig], {
    constructor: function(c) {
      this.$super(c);
    },
    qj: function(d) {
      this.$super(d);
      var e = 0;
      d = this.ja;
      for (var f = this.vertices, h = d.geometry.vertices, p = h.length, k, e = 0; e < p;) {
        k = new c(d, h[e]), f.push(k), e++;
      }
      this.faces = null;
      return this;
    },
    update: function() {
      var c = this.ja.geometry;
      c.verticesNeedUpdate = !0;
      c.normalsNeedUpdate = !0;
      c.Wq = !0;
      c.dynamic = !0;
      return this;
    },
    gm: function(c) {
      var e = this.ja.position;
      c = c.ca;
      e.x += c[0];
      e.y += c[1];
      e.z += c[2];
      return this;
    }
  });
}(X);
! function(f) {
  var c = ring.create([f.Mh], {
    constructor: function() {
      this.Vi = f.Fm;
      this.mm = f.Rj;
    }
  });
  f.Dm = new c;
}(X);
J = V.prototype;
J.Vk = function() {
  var f = this;
  if (f.F.H && (!f.F.H || 0 != f.F.H.length) && f.F.I.tb && !f.Ni) {
    f.Ni = !0;
    f.Nb = f.container + "_webglcanvas";
    var c = jQuery(f.J).offset(),
      d = f.w = f.F.N.width(),
      e = f.h = f.F.N.height(),
      g = c.left,
      c = c.top;
    f.Pb = new THREE.Scene;
    f.$d = jQuery(String.format("<canvas id='{0}' style='opacity:0;pointer-events:none;position:absolute;left:0px;top:0px;z-index:-1;width:100%;height:100%;'></canvas>", f.Nb, g, c));
    f.$d.get(0).addEventListener("webglcontextlost", function(c) {
      f.Gd();
      c.preventDefault && c.preventDefault();
      f.$d.remove();
      return !1;
    }, !1);
    f.Ed = new THREE.WebGLRenderer({
      alpha: !0,
      antialias: !0,
      canvas: f.$d.get(0)
    });
    f.Ed.setPixelRatio(eb.platform.Ya);
    f.Ed.shadowMap.type = THREE.PCFShadowMap;
    f.Ed.shadowMap.enabled = !0;
    f.Gb = new THREE.PerspectiveCamera(180 / Math.PI * Math.atan(e / 1398) * 2, d / e, 1, 1000);
    f.Gb.position.z = 700;
    f.Pb.add(f.Gb);
    g = new THREE.PlaneGeometry(d, 1.3 * e);
    c = new THREE.MeshPhongMaterial({
      color: f.F.I.backgroundColor
    });
    g = new THREE.Mesh(g, c);
    g.receiveShadow = !0;
    g.position.x = 0;
    g.position.y = 0;
    g.position.z = -3;
    c = new THREE.ShadowMaterial;
    c.opacity = 0.15;
    g.material = c;
    f.Pb.add(g);
    f.Ed.setSize(d, e);
    0 == f.Ed.context.getError() ? (jQuery(f.F.N).append(f.Ed.domElement), f.WebGLObject = new THREE.Object3D, f.WebGLObject.scale.set(1, 1, 0.35), f.Bc = new THREE.Object3D, f.WebGLObject.add(f.Bc), f.Pb.add(f.WebGLObject), f.cb = new THREE.DirectionalLight(16777215, 0.2), f.cb.position.set(500, 0, 800), f.cb.intensity = 0.37, f.cb.shadow = new THREE.LightShadow(new THREE.PerspectiveCamera(70, 1, 5, 2000)), f.cb.castShadow = !0, f.cb.shadow.bias = -0.000222, f.cb.shadow.mapSize.height = 1024, f.cb.shadow.mapSize.width = 1024, f.Pb.add(f.cb), d = f.es = new THREE.CameraHelper(f.cb.shadow.camera), d.visible = !1, f.Pb.add(d), f.Qb = new THREE.AmbientLight(16777215), f.Qb.intensity = 0.75, f.Qb.visible = !0, f.Pb.add(f.Qb), f.Gb.lookAt(f.Pb.position), f.Ui(), f.F.renderer.sa && jQuery(f.F.renderer).bind("onTextDataUpdated", function(c, d) {
      for (var e = f.M(f.J).scrollTop(), g = d - 2, n = d + 12, q = f.M(f.J).height(); g < n; g++) {
        var t = f.getPage(g);
        if (t && t.Hc(e, q) && 0 == t.pageNumber % 2) {
          var r = f.pages.length > g + 1 ? f.pages[g] : null;
          f.F.renderer.S[t.pageNumber].loaded ? r && !f.F.renderer.S[r.pageNumber].loaded && f.F.renderer.tc(r.pageNumber + 1, !0, function() {}) : f.F.renderer.tc(t.pageNumber + 1, !0, function() {
            r && !f.F.renderer.S[r.pageNumber].loaded && f.F.renderer.tc(r.pageNumber + 1, !0, function() {});
          });
          t.Jc(f.F.renderer.ia(t.pageNumber + 1), f.F.renderer.ia(t.pageNumber + 2), !0);
        }
      }
    })) : f.Gd();
    f.Ni = !1;
  }
};
J.Gd = function() {
  this.F.I.tb = !1;
  for (var f = 0; f < this.document.numPages; f++) {
    this.pages[f] && this.pages[f].ja && this.pages[f].An();
  }
  this.Pb && (this.WebGLObject && this.Pb.remove(this.WebGLObject), this.Gb && this.Pb.remove(this.Gb), this.Qb && this.Pb.remove(this.Qb), this.cb && this.Pb.remove(this.cb), this.$d.remove());
  this.Nb = null;
};
J.Al = function() {
  if (this.F.I.tb) {
    if (this.me = [], this.$d) {
      for (var f = 0; f < this.document.numPages; f++) {
        this.pages[f].ja && this.pages[f].Gg(!0);
      }
      var f = this.F.N.width(),
        c = this.F.N.height(),
        d = 180 / Math.PI * Math.atan(c / 1398) * 2;
      this.Ed.setSize(f, c);
      this.Gb.fov = d;
      this.Gb.aspect = f / c;
      this.Gb.position.z = 700;
      this.Gb.position.x = 0;
      this.Gb.position.y = 0;
      this.Gb.updateProjectionMatrix();
      jQuery("#" + this.Nb).css("opacity", "0");
    } else {
      this.Vk();
    }
  }
};
J.Bp = function() {
  var f = jQuery(this.J).offset();
  jQuery(this.J).width();
  var c = jQuery(this.J).height();
  this.Gb.position.y = -1 * ((this.$d.height() - c) / 2 - f.top) - this.F.N.offset().top;
  this.Gb.position.x = 0;
  this.fo = !0;
};
J.fe = function() {
  if (!this.F.I.tb) {
    return !1;
  }
  for (var f = this.gg, c = 0; c < this.document.numPages; c++) {
    if (this.pages[c].Tb || this.pages[c].Ub) {
      f = !0;
    }
  }
  return f;
};
J.Yn = function(f) {
  return f == this.ua ? 2 : f == this.ua - 2 ? 1 : f == this.ua + 2 ? 1 : 0;
};
J.Zm = function() {
  for (var f = jQuery(this.J).width(), c = 0; c < this.document.numPages; c++) {
    this.pages[c].ja && (c + 1 < this.R ? this.pages[c].Tb || this.pages[c].Ub || this.pages[c].ja.rotation.y == -Math.PI || this.pages[c].no() : this.pages[c].Tb || this.pages[c].Ub || 0 == this.pages[c].ja.rotation.y || this.pages[c].oo(), this.pages[c].ja.position.x = 800 < f ? 0.5 : 0, this.pages[c].ja.position.y = 0, this.pages[c].Tb || this.pages[c].Ub || (this.pages[c].ja.position.z = this.Yn(c)), this.pages[c].ja.visible = 0 == this.pages[c].ja.position.z ? !1 : !0);
  }
};
J.Cj = function(f, c) {
  var d = this;
  d.Rk = !1;
  var e = d.F.getTotalPages();
  d.gg = !0;
  d.Jj = f;
  d.hq = c;
  if (1 == d.F.scale) {
    if ("next" == f && (d.ua ? d.ua = d.ua + 2 : d.ua = d.R - 1, 0 == e % 2 && d.ua == e - 2 && (d.Rk = !0), 0 != d.ua % 2 && (d.ua = d.ua - 1), d.ua >= e - 1 && 0 != e % 2)) {
      d.gg = !1;
      return;
    }
    "previous" == f && (d.ua = d.ua ? d.ua - 2 : d.R - 3, 0 != d.ua % 2 && (d.ua += 1), d.ua >= e && (d.ua = e - 3));
    "page" == f && (d.ua = c - 3, f = d.ua >= d.R - 1 ? "next" : "previous");
    d.pages[d.ua] && !d.pages[d.ua].ja && d.pages[d.ua].Ke();
    d.pages[d.ua - 2] && !d.pages[d.ua - 2].ja && d.pages[d.ua - 2].Ke();
    d.pages[d.ua + 2] && !d.pages[d.ua + 2].ja && d.pages[d.ua + 2].Ke();
    d.Bp();
    "0" == jQuery("#" + d.Nb).css("opacity") && jQuery("#" + d.Nb).animate({
      opacity: 0.5
    }, 50, function() {});
    jQuery("#" + d.Nb).animate({
      opacity: 1
    }, {
      duration: 60,
      always: function() {
        d.Zm();
        d.gg = !1;
        if ("next" == f && !d.pages[d.ua].Tb && !d.pages[d.ua].Ub) {
          if (0 == d.ua || d.Rk) {
            d.F.ta.css({
              opacity: 0
            }), d.Bc.position.x = d.pages[d.ua].Lc / 2 * -1, jQuery(d.J + "_parent").transition({
              x: 0
            }, 0, "ease", function() {});
          }
          0 < d.ua && (d.Bc.position.x = 0);
          jQuery("#" + d.Nb).css("z-index", 99);
          d.ae || (d.ae = !0, d.hj());
          d.cb.position.set(300, d.h / 2, 400);
          d.cb.intensity = 0;
          d.Qb.color.setRGB(1, 1, 1);
          var c = d.Jk();
          (new TWEEN.Tween({
            intensity: d.cb.intensity
          })).to({
            intensity: 0.37
          }, c / 2).easing(TWEEN.Easing.Sinusoidal.EaseInOut).onUpdate(function() {
            d.cb.intensity = this.intensity;
            d.Qb.intensity = 1 - this.intensity;
            d.Qb.color.setRGB(1 - this.intensity / 6, 1 - this.intensity / 6, 1 - this.intensity / 6);
          }).onComplete(function() {
            (new TWEEN.Tween({
              intensity: d.cb.intensity
            })).to({
              intensity: 0
            }, c / 2).easing(TWEEN.Easing.Sinusoidal.EaseInOut).onUpdate(function() {
              d.cb.intensity = this.intensity;
              d.Qb.intensity = 1 - this.intensity;
              d.Qb.color.setRGB(1 - this.intensity / 6, 1 - this.intensity / 6, 1 - this.intensity / 6);
            }).start();
          }).start();
          d.pages[d.ua].On(d.Ik());
        }
        "previous" == f && (d.gg = !1, !d.pages[d.ua] || d.pages[d.ua].Ub || d.pages[d.ua].Tb || (0 == d.ua && (d.F.ta.css({
          opacity: 0
        }), jQuery(d.J + "_parent").transition({
          x: -(d.kd() / 4)
        }, 0, "ease", function() {}), d.Bc.position.x = 0), 0 < d.ua && (d.Bc.position.x = 0), jQuery("#" + d.Nb).css("z-index", 99), d.ae || (d.ae = !0, d.hj()), d.cb.position.set(-300, d.h / 2, 400), d.cb.intensity = 0, d.Qb.color.setRGB(1, 1, 1), c = d.Jk(), (new TWEEN.Tween({
          intensity: d.cb.intensity
        })).to({
          intensity: 0.37
        }, c / 2).easing(TWEEN.Easing.Sinusoidal.EaseInOut).onUpdate(function() {
          d.cb.intensity = this.intensity;
          d.Qb.intensity = 1 - this.intensity;
          d.Qb.color.setRGB(1 - this.intensity / 6, 1 - this.intensity / 6, 1 - this.intensity / 6);
        }).onComplete(function() {
          (new TWEEN.Tween({
            intensity: d.cb.intensity
          })).to({
            intensity: 0
          }, c / 2).easing(TWEEN.Easing.Sinusoidal.EaseInOut).onUpdate(function() {
            d.cb.intensity = this.intensity;
            d.Qb.intensity = 1 - this.intensity;
            d.Qb.color.setRGB(1 - this.intensity / 6, 1 - this.intensity / 6, 1 - this.intensity / 6);
          }).start();
        }).start(), d.pages[d.ua].Pn(d.Ik())));
      }
    });
  }
};
J.Jk = function() {
  var f = 800;
  "very fast" == this.F.I.Tc && (f = 200);
  "fast" == this.F.I.Tc && (f = 300);
  "slow" == this.F.I.Tc && (f = 1700);
  "very slow" == this.F.I.Tc && (f = 2700);
  return f;
};
J.Ik = function() {
  var f = 1.5;
  "very fast" == this.F.I.Tc && (f = 0.4);
  "fast" == this.F.I.Tc && (f = 0.7);
  "slow" == this.F.I.Tc && (f = 2.3);
  "very slow" == this.F.I.Tc && (f = 3.7);
  return f;
};
J.ho = function() {
  this.F.I.ah ? ("next" == this.Jj && this.F.ta.turn("page", this.ua + 2, "instant"), "previous" == this.Jj && this.F.ta.turn("page", this.ua, "instant")) : this.F.ta.turn(this.Jj, this.hq, "instant");
  this.ua = null;
};
J.hj = function() {
  var f, c = this;
  c.ec || (c.ec = []);
  3 > c.ec.length && (f = !0);
  if ((c.F.I.tb || c.ae) && (c.ae || f) && (c.Id || (c.Id = 0, c.vg = (new Date).getTime(), c.elapsedTime = 0), f = (new Date).getTime(), requestAnim(function() {
      c.hj();
    }), TWEEN.update(), c.Ed.render(c.Pb, c.Gb), c.Id++, c.elapsedTime += f - c.vg, c.vg = f, 1000 <= c.elapsedTime && 4 > c.ec.length && (f = c.Id, c.Id = 0, c.elapsedTime -= 1000, c.ec.push(f), 3 == c.ec.length && !c.zi))) {
    c.zi = !0;
    for (var d = f = 0; 3 > d; d++) {
      f += c.ec[d];
    }
    25 > f / 3 && c.Gd();
  }
};
J.Tf = function(f) {
  var c = this;
  if (f && !c.dd) {
    c.dd = f;
  } else {
    if (f && c.dd && 10 > c.dd + f) {
      c.dd = c.dd + f;
      return;
    }
  }
  c.Ed && c.Pb && c.Gb && c.fo ? c.animating ? setTimeout(function() {
    c.Tf();
  }, 500) : (0 < c.dd ? (c.dd = c.dd - 1, requestAnim(function() {
    c.Tf();
  })) : c.dd = null, !c.ae && 0 < c.dd && c.Ed.render(c.Pb, c.Gb)) : c.dd = null;
};
J.Ui = function() {
  var f = this;
  if (!f.F.initialized) {
    setTimeout(function() {
      f.Ui();
    }, 1000);
  } else {
    if (!eb.platform.ios && (f.ec || (f.ec = []), f.$d && f.F.I.tb && !f.ae && 4 > f.ec.length)) {
      f.Id || (f.Id = 0, f.vg = (new Date).getTime(), f.elapsedTime = 0);
      var c = (new Date).getTime();
      requestAnim(function() {
        f.Ui();
      });
      f.Id++;
      f.elapsedTime += c - f.vg;
      f.vg = c;
      c = f.$d.get(0);
      if (c = c.getContext("webgl") || c.getContext("experimental-webgl")) {
        if (c.clearColor(0, 0, 0, 0), c.enable(c.DEPTH_TEST), c.depthFunc(c.LEQUAL), c.clear(c.COLOR_BUFFER_BIT | c.DEPTH_BUFFER_BIT), 1000 <= f.elapsedTime && 4 > f.ec.length && (c = f.Id, f.Id = 0, f.elapsedTime -= 1000, f.ec.push(c), 4 == f.ec.length && !f.zi)) {
          f.zi = !0;
          for (var d = c = 0; 3 > d; d++) {
            c += f.ec[d];
          }
          25 > c / 3 && f.Gd();
        }
      } else {
        f.Gd();
      }
    }
  }
};
J.Oo = function() {
  for (var f = this, c = !1, d = 0; d < f.document.numPages; d++) {
    if (f.pages[d].Tb || f.pages[d].Ub) {
      c = !0;
    }
  }
  c || (f.gg = !1, 3 > f.ec ? setTimeout(function() {
    f.fe() || (f.ae = !1);
  }, 3000) : f.ae = !1, f.ho());
};
var Ca = function() {
    function f() {}
    f.prototype = {
      Hc: function(c, d) {
        return d.pages.R == d.pageNumber || d.R == d.pageNumber + 1;
      },
      Tn: function(c, d, e) {
        var f = null != d.dimensions.nb ? d.dimensions.nb : d.dimensions.na;
        return !d.pages.Mb() && c.sb && (!eb.browser.safari || eb.platform.touchdevice || eb.browser.safari && 7.1 > eb.browser.Kb) ? e : null != d.dimensions.nb && c.sb && d.F.renderer.wa ? d.pages.jd / (d.F.Te ? 1 : 2) / f : d.rb && !d.F.renderer.wa ? d.pages.jd / 2 / d.F.renderer.Aa[d.pageNumber].nb : c.sb && !d.rb && !d.F.renderer.wa && 1 < d.scale ? d.Gi() / f : e;
      },
      bn: function(c, d, e) {
        jQuery(d.V + "_textoverlay").append(e);
      },
      dk: function(c, d, e, f, h, p, k) {
        var l = c.Vo == f && !d.F.renderer.sb;
        e && (c.Vo = f, c.Zr = e.attr("id"), c.Wo != e.css("top") || h || c.Xo != d.pageNumber ? (null == c.wd || h || c.wd.remove(), c.Wo = e.css("top"), c.wd = h ? p ? e.wrap(jQuery(String.format("<div class='flowpaper_pageword flowpaper_pageword_" + c.P + "' style='{0};border-top-width: 3px;border-left-width: 3px;border-style:dotted;border-color: #ee0000;'></div>", e.attr("style")))).parent() : k ? e.wrap(jQuery(String.format("<div class='flowpaper_pageword flowpaper_pageword_" + c.P + "' style='{0};border-top-width: 3px;border-right-width: 3px;border-style:dotted;border-color: #ee0000;'></div>", e.attr("style")))).parent() : e.wrap(jQuery(String.format("<div class='flowpaper_pageword flowpaper_pageword_" + c.P + "' style='{0};border-top-width: 3px;border-right-width: 3px;border-style:dotted;border-color: transparent;'></div>", e.attr("style")))).parent() : e.wrap(jQuery(String.format("<div class='flowpaper_pageword flowpaper_pageword_" + c.P + "' style='{0};border-width: 3px;border-style:dotted;border-color: #ee0000;'></div>", e.attr("style")))).parent(), c.wd.css({
          "margin-left": "-3px",
          "margin-top": "-4px",
          "z-index": "11"
        }), jQuery(d.va).append(c.wd)) : l ? (c.wd.css("width", c.wd.width() + e.width()), jQuery(c.wd.children()[0]).width(c.wd.width())) : (c.wd.css("left", e.css("left")), c.wd.append(e)), e.css({
          left: "0px",
          top: "0px"
        }), e.addClass("flowpaper_selected"), e.addClass("flowpaper_selected_default"), e.addClass("flowpaper_selected_searchmatch"), c.Xo = d.pageNumber);
      }
    };
    return f;
  }(),
  za = function() {
    function f() {}
    f.prototype = {
      create: function(c, d) {
        if ("FlipView" == c.F.H && (c.xn = 10 < c.pages.ze ? c.pages.ze : 10, !(c.Oi || c.F.renderer.ie && !c.Xa && c.pageNumber > c.xn + 6))) {
          c.Mc = jQuery("<div class='flowpaper_page flowpaper_page_zoomIn' id='" + c.sd + "' style='" + c.getDimensions() + ";z-index:2;background-size:100% 100%;background-color:#ffffff;margin-bottom:0px;backface-visibility:hidden;'><div id='" + c.aa + "' style='height:100%;width:100%;'></div></div>");
          c.pages.F.ta && c.F.renderer.ie ? c.pages.F.ta.turn("addPage", c.Mc, c.pageNumber + 1) : jQuery(d).append(c.Mc);
          var e = c.ng() * c.Ma,
            f = c.xa() / e;
          null != c.dimensions.nb && c.sb && c.F.renderer.wa && (f = c.pages.jd / 2 / e);
          c.Ti = f;
          c.Nf(f);
          c.Oi = !0;
          c.Xa = !0;
          c.F.renderer.Kd(c);
          c.Pl();
          c.Ke && c.Ke();
        }
      },
      mo: function(c) {
        var d = c.ng() * c.Ma,
          e = c.xa() / d;
        null != c.dimensions.nb && c.sb && c.F.renderer.wa && (e = c.pages.jd / 2 / d);
        c.Ti = e;
        c.Nf(e);
      },
      ld: function(c) {
        return c.pages.ld() / (c.F.I.Ba ? 1 : 2);
      },
      Df: function(c) {
        return c.pages.Df();
      },
      getDimensions: function(c) {
        if ("FlipView" == c.F.H) {
          return c.L.width(), "position:absolute;left:0px;top:0px;width:" + c.xa(c) + ";height:" + c.Ga(c);
        }
      },
      xa: function(c) {
        if ("FlipView" == c.F.H) {
          return c.pages.jd / (c.F.I.Ba ? 1 : 2) * c.scale;
        }
      },
      Ei: function(c) {
        if ("FlipView" == c.F.H) {
          return c.pages.jd / (c.F.I.Ba ? 1 : 2) * 1;
        }
      },
      Gi: function(c) {
        if ("FlipView" == c.F.H) {
          return c.pages.jd / (c.F.I.Ba ? 1 : 2);
        }
      },
      Ga: function(c) {
        if ("FlipView" == c.F.H) {
          return c.pages.fg * c.scale;
        }
      },
      Di: function(c) {
        if ("FlipView" == c.F.H) {
          return 1 * c.pages.fg;
        }
      },
      Vb: function() {
        return 0;
      },
      Hc: function(c) {
        var d = c.F.I.tb;
        if ("FlipView" == c.F.H) {
          return c.pages.R >= c.pageNumber - (d ? 3 : 2) && c.pages.R <= c.pageNumber + (d ? 5 : 4);
        }
      },
      unload: function(c) {
        var d = c.V;
        0 == jQuery(d).length && (d = jQuery(c.Mc).find(c.V));
        (c.pageNumber < c.pages.R - 15 || c.pageNumber > c.pages.R + 15) && c.Mc && !c.Mc.parent().hasClass("turn-page-wrapper") && !c.Fb && 0 != c.pageNumber && (jQuery(d).find("*").unbind(), jQuery(d).find("*").remove(), c.initialized = !1, c.uc = !1);
      }
    };
    wa.prototype.rg = function() {
      return eb.platform.touchdevice ? "FlipView" == this.F.H ? !this.F.I.Ba && window.devicePixelRatio && 1 < window.devicePixelRatio ? 1.9 : 2.6 : 1 : "FlipView" == this.F.H ? 2 : 1;
    };
    return f;
  }();
J = wa.prototype;
J.Ke = function() {
  var f = this;
  if (0 == f.pageNumber % 2 && 1 == f.scale && f.F.I.tb) {
    if (f.ja && f.pages.Bc.remove(f.ja), f.pages.Nb || f.pages.Vk(), f.pages.Ni) {
      setTimeout(function() {
        f.Ke();
      }, 200);
    } else {
      f.Lc = f.xa(f);
      f.Rd = f.Ga(f);
      f.angle = 0.25 * Math.PI * this.Lc / this.Rd;
      f.Ej = !eb.platform.touchonlydevice;
      for (var c = 0; 6 > c; c++) {
        c != f.ra.Wa || f.Sa[f.ra.Wa] ? c != f.ra.back || f.Sa[f.ra.back] ? f.Sa[c] || c == f.ra.back || c == f.ra.Wa || (f.Sa[c] = new THREE.MeshPhongMaterial({
          color: f.No
        }), f.Sa[c].name = "edge") : (f.Sa[f.ra.back] = new THREE.MeshPhongMaterial({
          map: null,
          overdraw: !0,
          shininess: 15
        }), f.Sa[f.ra.back].name = "back", f.Wj(f.pageNumber, f.Lc, f.Rd, f.ra.back, function(c) {
          f.ad || (f.zj = new THREE.TextureLoader, f.zj.load(c, function(c) {
            c.minFilter = THREE.LinearFilter;
            f.Sa[f.ra.back].map = c;
          }));
        })) : (f.Sa[f.ra.Wa] = new THREE.MeshPhongMaterial({
          map: null,
          overdraw: !0,
          shininess: 15
        }), f.Sa[f.ra.Wa].name = "front", f.Wj(f.pageNumber, f.Lc, f.Rd, f.ra.Wa, function(c) {
          f.ad || (f.yj = new THREE.TextureLoader, f.yj.load(c, function(c) {
            c.minFilter = THREE.LinearFilter;
            f.Sa[f.ra.Wa].map = c;
          }));
        }));
      }
      f.ja = new THREE.Mesh(new THREE.BoxGeometry(f.Lc, f.Rd, 0.1, 10, 10, 1), new THREE.MeshFaceMaterial(f.Sa));
      f.ja.receiveShadow = f.Ej;
      f.ja.overdraw = !0;
      f.ma = new X.Gm(X.Dm, f.ja);
      f.Zb = new X.Km(f.Lc / 2, 0, 0);
      f.ma.Zj(f.Zb);
      f.ma.collapse();
      f.cc = new X.wm(0, 0, 0);
      f.cc.dc = X.be.LEFT;
      f.Rd > f.Lc && (f.cc.Xd = !0);
      f.ma.Zj(f.cc);
      f.pages.Bc.add(f.ja);
      f.ja.position.x = 0;
      f.ja.position.z = -1;
      f.oh && (f.ja.rotation.y = -Math.PI);
      f.ph && (f.ja.rotation.y = 0);
    }
  }
};
J.Wj = function(f, c, d, e, g) {
  var h = "image/jpeg",
    p, k, l;
  this.pages.me || (this.pages.me = []);
  h = "image/jpeg";
  p = 0.95;
  if (e == this.ra.Wa && this.pages.me[this.ra.Wa]) {
    g(this.pages.me[this.ra.Wa]);
  } else {
    if (e == this.ra.back && this.pages.me[this.ra.back]) {
      g(this.pages.me[this.ra.back]);
    } else {
      if (k = document.createElement("canvas"), k.width = c, k.height = d, l = k.getContext("2d"), l.ag = l.mozImageSmoothingEnabled = l.imageSmoothingEnabled = !0, l.fillStyle = "white", l.fillRect(0, 0, k.width, k.height), l.drawImage(this.F.Si, k.width / 2 + (this.Vb() - 10), k.height / 2, 24, 8), this.F.Qe) {
        if (e == this.ra.back) {
          l.beginPath();
          l.strokeStyle = "transparent";
          l.rect(0.65 * c, 0, 0.35 * c, d);
          var n = l.createLinearGradient(0, 0, c, 0);
          n.addColorStop(0.93, "rgba(255, 255, 255, 0)");
          n.addColorStop(0.96, "rgba(170, 170, 170, 0.05)");
          n.addColorStop(1, "rgba(125, 124, 125, 0.3)");
          l.fillStyle = n;
          l.fill();
          l.stroke();
          l.closePath();
          n = k.toDataURL(h, p);
          this.pages.me[this.ra.back] = n;
          g(n);
        }
        e == this.ra.Wa && 0 != f && (l.beginPath(), l.strokeStyle = "transparent", l.rect(0, 0, 0.35 * c, d), n = l.createLinearGradient(0, 0, 0.07 * c, 0), n.addColorStop(0.07, "rgba(125, 124, 125, 0.3)"), n.addColorStop(0.93, "rgba(255, 255, 255, 0)"), l.fillStyle = n, l.fill(), l.stroke(), l.closePath(), n = k.toDataURL(h, p), this.pages.me[this.ra.Wa] = n, g(n));
      }
    }
  }
};
J.Gg = function(f) {
  if (this.ja && this.ad || f) {
    this.fm(), this.ma.dispose(), this.Zb.dispose(), this.ma = this.ja = this.Zb = null, this.Sa = [], this.gd = this.resources = null, this.Ke(), this.ad = !1;
  }
};
J.An = function() {
  this.ja && this.ad && (this.fm(), this.ma.dispose(), this.Zb.dispose(), this.ma = this.ja = this.Zb = null, this.Sa = [], this.resources = null, this.ad = !1);
};
J.fm = function() {
  var f = this.ja;
  if (f) {
    for (var c = 0; c < f.material.materials.length; c++) {
      f.material.materials[c].map && f.material.materials[c].map.dispose(), f.material.materials[c].dispose();
    }
    f.geometry.dispose();
    this.pages.Bc.remove(f);
  }
};
J.Jc = function(f, c, d) {
  var e = this;
  if (e.F.I.tb && (!e.ad || d) && 0 == e.pageNumber % 2 && 1 == e.F.scale && 1 == e.scale) {
    for (e.ad = !0, e.qh = !0, e.Lc = e.xa(e), e.Rd = e.Ga(e), e.angle = 0.25 * Math.PI * this.Lc / this.Rd, d = 0; 6 > d; d++) {
      d == e.ra.Wa ? e.loadResources(e.pageNumber, function() {
        e.jj(e.pageNumber, e.ra.Wa, f, "image/jpeg", 0.95, e.Lc, e.Rd, function(c) {
          e.Sa[e.ra.Wa] && (e.Sa[e.ra.Wa].map = null);
          e.pages.Tf(2);
          e.yj = new THREE.TextureLoader;
          e.yj.load(c, function(c) {
            c.minFilter = THREE.LinearFilter;
            e.Sa[e.ra.Wa] = new THREE.MeshPhongMaterial({
              map: c,
              overdraw: !0
            });
            e.ja && e.ja.material.materials && e.ja.material.materials && (e.ja.material.materials[e.ra.Wa] = e.Sa[e.ra.Wa]);
            e.qh && e.Sa[e.ra.Wa] && e.Sa[e.ra.Wa].map && e.Sa[e.ra.back] && e.Sa[e.ra.back].map && (e.qh = !1, e.pages.Tf(2));
          });
        });
      }) : d == e.ra.back && e.loadResources(e.pageNumber + 1, function() {
        e.jj(e.pageNumber + 1, e.ra.back, c, "image/jpeg", 0.95, e.Lc, e.Rd, function(c) {
          e.Sa[e.ra.back] && (e.Sa[e.ra.back].map = null);
          e.pages.Tf(2);
          e.zj = new THREE.TextureLoader;
          e.zj.load(c, function(c) {
            c.minFilter = THREE.LinearFilter;
            e.Sa[e.ra.back] = new THREE.MeshPhongMaterial({
              map: c,
              overdraw: !0
            });
            e.ja && e.ja.material.materials && e.ja.material.materials && (e.ja.material.materials[e.ra.back] = e.Sa[e.ra.back]);
            e.qh && e.Sa[e.ra.Wa] && e.Sa[e.ra.Wa].map && e.Sa[e.ra.back] && e.Sa[e.ra.back].map && (e.qh = !1, e.pages.Tf(2));
          });
        });
      });
    }
  }
};
J.loadResources = function(f, c) {
  var d = this,
    e = d.pages.getPage(f);
  if (e) {
    if (null == e.resources && (e.resources = [], d.F.Z[f])) {
      for (var g = 0; g < d.F.Z[f].length; g++) {
        if ("image" == d.F.Z[f][g].type || "video" == d.F.Z[f][g].type || "iframe" == d.F.Z[f][g].type) {
          var h = d.F.Z[f][g].src,
            p = new Image;
          p.loaded = !1;
          p.setAttribute("crossOrigin", "anonymous");
          p.setAttribute("data-x", d.F.Z[f][g].jh ? d.F.Z[f][g].jh : d.F.Z[f][g].Fj);
          p.setAttribute("data-y", d.F.Z[f][g].kh ? d.F.Z[f][g].kh : d.F.Z[f][g].Gj);
          d.F.Z[f][g].Ai && p.setAttribute("data-x", d.F.Z[f][g].Ai);
          d.F.Z[f][g].Bi && p.setAttribute("data-y", d.F.Z[f][g].Bi);
          p.setAttribute("data-width", d.F.Z[f][g].width);
          p.setAttribute("data-height", d.F.Z[f][g].height);
          jQuery(p).bind("load", function() {
            this.loaded = !0;
            d.Cl(f) && c();
          });
          p.src = h;
          e.resources.push(p);
        }
      }
    }
    d.Cl(f) && c();
  }
};
J.Cl = function(f) {
  var c = !0;
  f = this.pages.getPage(f);
  if (!f.resources) {
    return !1;
  }
  for (var d = 0; d > f.resources.length; d++) {
    f.resources[d].loaded || (c = !1);
  }
  return c;
};
J.no = function() {
  this.ja.rotation.y = -Math.PI;
  this.page.Tb = !1;
  this.page.oh = !0;
  this.page.Ub = !1;
  this.page.ph = !1;
};
J.oo = function() {
  this.ja.rotation.y = 0;
  this.page.Tb = !1;
  this.page.ph = !0;
  this.page.Ub = !1;
  this.page.oh = !1;
};
J.jj = function(f, c, d, e, g, h, p, k) {
  var l = this,
    n = new Image,
    q, t, r, m, u = new jQuery.Deferred;
  e = 0 == d.indexOf("data:image/png") ? "image/png" : "image/jpeg";
  g = g || 0.92;
  l.U && !l.Fb && 0 != l.U.naturalWidth && l.U.getAttribute("src") == d ? (n = l.U, u.resolve()) : l.pages.pages[f] && !l.pages.pages[f].Fb && l.pages.pages[f].U && 0 != l.pages.pages[f].U.naturalWidth && l.pages.pages[f].U.getAttribute("src") == d ? (n = l.pages.pages[f].U, u.resolve()) : l.pages.pages[f - 1] && !l.pages.pages[f - 1].Fb && l.pages.pages[f - 1].U && 0 != l.pages.pages[f - 1].U.naturalWidth && l.pages.pages[f - 1].U.getAttribute("src") == d ? (n = l.pages.pages[f - 1].U, u.resolve()) : l.pages.pages[f + 1] && !l.pages.pages[f + 1].Fb && l.pages.pages[f + 1].U && 0 != l.pages.pages[f + 1].U.naturalWidth && l.pages.pages[f + 1].U.getAttribute("src") == d ? (n = l.pages.pages[f + 1].U, u.resolve()) : (l.pages.pages[f] && l.pages.pages[f].U && (n = l.pages.pages[f].U), l.pages.pages[f - 1] && l.pages.pages[f - 1].U && l.pages.pages[f - 1].U.getAttribute("src") == d && (n = l.pages.pages[f - 1].U), l.pages.pages[f + 1] && l.pages.pages[f + 1].U && l.pages.pages[f + 1].U.getAttribute("src") == d && (n = l.pages.pages[f + 1].U), jQuery(n).bind("error", function() {
    jQuery(this).zh(function() {});
  }), jQuery(n).bind("abort", function() {
    jQuery(this).zh(function() {});
  }), n.setAttribute("crossOrigin", "anonymous"), n.src = d, jQuery(n).one("load", function() {
    l.pages.pages[f] == l && (l.pages.pages[f].U = this, l.pages.pages[f].U.scale = l.pages.pages[f].scale);
    l.pages.pages[f - 1] == l && (l.pages.pages[f - 1].U = this, l.pages.pages[f - 1].U.scale = l.pages.pages[f - 1].scale);
    l.pages.pages[f + 1] == l && (l.pages.pages[f + 1].U = this, l.pages.pages[f + 1].U.scale = l.pages.pages[f + 1].scale);
    u.resolve();
  }).each(function() {
    this.complete && jQuery(this).load();
  }));
  u.then(function() {
    r = l.renderer.sa && l.renderer.S[0] ? l.renderer.S[0].width : n.naturalWidth;
    m = l.renderer.sa && l.renderer.S[0] ? l.renderer.S[0].height : n.naturalHeight;
    if (l.renderer.sa) {
      var u = 1.5 < l.renderer.Ya ? l.renderer.Ya : 1;
      r = l.xa() * u;
      m = l.Ga() * u;
    } else {
      r /= 2, m /= 2;
    }
    q = document.createElement("canvas");
    t = q.getContext("2d");
    if (r < h || m < p) {
      r = h, m = p;
    }
    r < d.width && (r = d.width);
    m < d.height && (m = d.height);
    q.width = r;
    q.height = m;
    t.clearRect(0, 0, q.width, q.height);
    t.fillStyle = "rgba(255, 255, 255, 1)";
    t.fillRect(0, 0, r, m);
    t.drawImage(n, 0, 0, r, m);
    jQuery(q).data("needs-overlay", 1);
    l.Ud(q, c == l.ra.Wa ? 0 : 1).then(function() {
      l.vl ? l.vl++ : l.vl = 1;
      var n = r / (l.ng() * l.Ma),
        u = l.pages.getPage(f).resources;
      if (u) {
        for (var v = 0; v < u.length; v++) {
          t.drawImage(u[v], parseFloat(u[v].getAttribute("data-x")) * n, parseFloat(u[v].getAttribute("data-y")) * n, parseFloat(u[v].getAttribute("data-width")) * n, parseFloat(u[v].getAttribute("data-height")) * n);
        }
      }
      l.F.Qe && (c == l.ra.back && (t.beginPath(), t.strokeStyle = "transparent", t.rect(0.65 * r, 0, 0.35 * r, m), n = t.createLinearGradient(0, 0, r, 0), n.addColorStop(0.93, "rgba(255, 255, 255, 0)"), n.addColorStop(0.96, "rgba(170, 170, 170, 0.05)"), n.addColorStop(1, "rgba(125, 124, 125, 0.3)"), t.fillStyle = n, t.fill(), t.stroke(), t.closePath()), c == l.ra.Wa && 0 != f && (t.beginPath(), t.strokeStyle = "transparent", t.rect(0, 0, 0.35 * r, m), n = t.createLinearGradient(0, 0, 0.07 * r, 0), n.addColorStop(0.07, "rgba(125, 124, 125, 0.3)"), n.addColorStop(0.93, "rgba(255, 255, 255, 0)"), t.fillStyle = n, t.fill(), t.stroke(), t.closePath()));
      try {
        var D = q.toDataURL(e, g);
        k(D);
      } catch (C) {
        if (0 != this.src.indexOf("blob:")) {
          ia(d, function(d) {
            l.jj(f, c, d, e, g, h, p, k);
          });
        } else {
          throw C;
        }
      }
    });
  });
};
J.nearestPowerOfTwo = function(f) {
  return Math.pow(2, Math.round(Math.log(f) / Math.LN2));
};
J.On = function(f) {
  var c = this;
  f && (c.duration = f);
  f = 0.8;
  var d = 0.1,
    e = 0,
    g = 415 * c.duration,
    h = 315 * c.duration,
    p = 415 * c.duration;
  "3D, Curled" == c.F.I.Be && (f = 0.6, d = 0.1, e = -0.15, p = 210 * c.duration);
  "3D, Soft" == c.F.I.Be && (f = 0.8, d = 0.1, e = 0, p = 415 * c.duration);
  "3D, Hard" == c.F.I.Be && (f = 0, d = 0.1, e = 0);
  "3D, Bend" == c.F.I.Be && (f = -0.3, d = 0.2, e = -0.4, g = 515 * c.duration, h = 215 * c.duration, p = 372 * c.duration);
  c.Tb || c.Ub || (c.Tb = !0, c.cc.Bg(e), c.ja.castShadow = c.Ej, c.cc.force = 0, c.cc.offset = 0, c.ma.apply(), c.to = {
    angle: c.ja.rotation.y,
    t: -1,
    bg: 0,
    page: c,
    force: c.force,
    offset: c.offset
  }, (new TWEEN.Tween(c.to)).to({
    angle: -Math.PI,
    bg: 1,
    t: 1
  }, g).easing(TWEEN.Easing.Sinusoidal.EaseInOut).onUpdate(c.sl).start(), (new TWEEN.Tween(c.to)).to({
    force: f
  }, h).easing(TWEEN.Easing.Quadratic.EaseInOut).onUpdate(c.Qf).onComplete(function() {
    (new TWEEN.Tween(c.to)).to({
      force: 0,
      offset: 1
    }, p).easing(TWEEN.Easing.Sinusoidal.EaseOut).onUpdate(c.Qf).onComplete(c.Bk).start();
  }).start(), (new TWEEN.Tween(c.to)).to({
    offset: d
  }, h).easing(TWEEN.Easing.Quadratic.EaseOut).onUpdate(c.Qf).start(), c.ja.position.z = 2);
};
J.Pn = function(f) {
  var c = this;
  f && (c.duration = f);
  f = -0.8;
  var d = 0.1,
    e = 0,
    g = 415 * c.duration,
    h = 315 * c.duration,
    p = 415 * c.duration;
  "3D, Curled" == c.F.I.Be && (f = -0.6, d = 0.1, e = -0.15, p = 210 * c.duration);
  "3D, Soft" == c.F.I.Be && (f = -0.8, d = 0.1, e = 0, p = 415 * c.duration);
  "3D, Hard" == c.F.I.Be && (f = 0, d = 0.1, e = 0);
  "3D, Bend" == c.F.I.Be && (f = 0.3, d = 0.2, e = -0.4, g = 515 * c.duration, h = 215 * c.duration, p = 372 * c.duration);
  c.Ub || c.Tb || (c.Ub = !0, c.ja.castShadow = c.Ej, c.cc.Bg(e), c.cc.force = 0, c.cc.offset = 0, c.ma.apply(), c.to = {
    angle: c.ja.rotation.y,
    t: -1,
    bg: 0,
    page: c,
    force: c.force,
    offset: c.offset
  }, (new TWEEN.Tween(c.to)).to({
    angle: 0,
    bg: 1,
    t: 1
  }, g).easing(TWEEN.Easing.Sinusoidal.EaseInOut).onUpdate(c.sl).start(), (new TWEEN.Tween(c.to)).to({
    force: f
  }, h).easing(TWEEN.Easing.Quadratic.EaseInOut).onUpdate(c.Qf).onComplete(function() {
    (new TWEEN.Tween(c.to)).to({
      force: 0,
      offset: 1
    }, p).easing(TWEEN.Easing.Sinusoidal.EaseOut).onUpdate(c.Qf).onComplete(c.Bk).start();
  }).start(), (new TWEEN.Tween(c.to)).to({
    offset: d
  }, h).easing(TWEEN.Easing.Quadratic.EaseOut).onUpdate(c.Qf).start(), c.ja.position.z = 2);
};
J.sl = function() {
  this.page.ja.rotation.y = this.angle;
  this.page.Tb && 0 == this.page.pageNumber && (this.page.pages.Bc.position.x = (1 - this.bg) * this.page.pages.Bc.position.x);
  this.page.Ub && 0 == this.page.pageNumber && (this.page.pages.Bc.position.x = (1 - this.bg) * this.page.pages.Bc.position.x - this.bg * this.page.Lc * 0.5);
};
J.Qf = function() {
  this.page.cc.force = this.force;
  this.page.cc.offset = this.offset;
  this.page.ma.apply();
};
J.Bk = function() {
  this.page.Tb ? (this.page.Tb = !1, this.page.oh = !0, this.page.Ub = !1, this.page.ph = !1, this.page.ja.position.z = 2) : this.page.Ub && (this.page.Tb = !1, this.page.ph = !0, this.page.Ub = !1, this.page.oh = !1, this.page.ja.position.z = 2);
  this.page.cc.force = 0;
  this.page.cc.Bg(0);
  this.page.cc.offset = 0;
  this.page.ma.apply();
  this.page.ja.castShadow = !1;
  this.page.pages.Oo();
};
var Ea = "undefined" == typeof window;
Ea && (window = []);
var FlowPaperViewer_HTML = window.FlowPaperViewer_HTML = function() {
  function f(c) {
    window.zine = !0;
    this.config = c;
    this.af = this.config.instanceid;
    this.document = this.config.document;
    this.P = this.config.rootid;
    this.L = {};
    this.hd = this.N = null;
    this.selectors = {};
    this.H = "Portrait";
    this.vb = null != c.document.InitViewMode && "undefined" != c.document.InitViewMode && "" != c.document.InitViewMode ? c.document.InitViewMode : window.zine ? "FlipView" : "Portrait";
    this.initialized = !1;
    this.ye = "flowpaper_selected_default";
    this.Va = {};
    this.Z = [];
    this.Sm = "data:image/gif;base64,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%3D";
    this.Tj = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAANCAYAAABy6+R8AAAAAXNSR0IArs4c6QAAAAZiS0dEAFEAUQBRjSJ44QAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9wCCgEMO6ApCe8AAAFISURBVCjPfZJBi49hFMV/521MUYxEsSGWDDWkFKbkA/gAajaytPIFLKx8BVkodjP5AINGU0xZKAslC3Ys2NjP+VnM++rfPzmb23065z6de27aDsMwVD0C3AfOAYeB38BP9fEwDO/aMgwDAAFQDwKbwC9gZxScUM8Al5M8SPJ0Eu5JYV0FeAZcBFaAxSSPkjwHnrQ9Pf1E22XVsX5s+1m9o54cB9J2q+361KM+VN+ot9uqrjIH9VJbpz7qOvAeuAIcSnJzThA1SXaTBGAAvgCrwEvg0yxRXUhikrOjZ1RQz7uHFfUu/4C60fb16G9hetxq+1a9Pkdears2Dt1Rj87mdAx4BfwAttWvSQ4AV9W1aYlJtoFbmQJTjwP3gAvAIlDgG7CsXvu7uWQzs+cxmj0F7Fd3k3wfuRvqDWAfM+HxP6hL6oe2tn3xB7408HFbpc41AAAAAElFTkSuQmCC";
    this.Qh = "data:image/png;base64,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%3D";
    this.Tm = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAZCAMAAADzN3VRAAAARVBMVEX///////////////////////////////////////////////////////////////////////////////////////////+QFj7cAAAAFnRSTlMAHDE8PkJmcXR4eY+Vs8fL09Xc5vT5J4/h6AAAAFtJREFUeNqt0kkOgDAMQ9EPZSgztMX3PyoHiMKi6ttHkZ1QI+UDpmwkXl0QZbwUnTDLKEg3LLIIQw/dYATa2vYI425sSA+ssvw8/szPnrb83vyu/Tz+Tf0/qPABFzEW/E1C02AAAAAASUVORK5CYII=";
    this.Sj = "data:image/gif;base64,R0lGODlhHgAKAMIAALSytPTy9MzKzLS2tPz+/AAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQJBgAEACwAAAAAHgAKAAADTki63P4riDFEaJJaPOsNFCAOlwIOIkBG4SilqbBMMCArNJzDw4LWPcWPN0wFCcWRr6YSMG8EZw0q1YF4JcLVmN26tJ0NI+PhaLKQtJqQAAAh+QQJBgADACwAAAAAHgAKAIKUlpTs7uy0srT8/vzMysycmpz08vS0trQDWTi63P7LnFKOaYacQy7LWzcEBWACRRBtQmutRytYx3kKiya3RB7vhJINtfjtDsWda3hKKpEKo2zDxCkISkHvmiWQhiqF5BgejKeqgMAkKIs1HE8ELoLY74sEACH5BAkGAAUALAAAAAAeAAoAg3R2dMzKzKSipOzq7LSytPz+/Hx+fPTy9LS2tAAAAAAAAAAAAAAAAAAAAAAAAAAAAARfsMhJq71zCGPEqEeAIMEBiqQ5cADAfdIxEjRixnN9CG0PCBMRbRgIIoa0gMHlM0yOSALiGZUuW0sONTqVQJEIHrYFlASqRTN6dXXBCjLwDf6VqjaddwxVOo36GIGCExEAIfkECQYABQAsAAAAAB4ACgCDXFpctLK05ObkjI6MzMrM/P78ZGJktLa09PL0AAAAAAAAAAAAAAAAAAAAAAAAAAAABFmwyEmrvVMMY4aoCHEcBAKKpCkYQAsYn4SMQX2YMm0jg+sOE1FtSAgehjUCy9eaHJGBgxMaZbqmUKnkiTz0mEAJgVoUk1fMWGHWxa25UdXXcxqV6imMfk+JAAAh+QQJBgAJACwAAAAAHgAKAIM8Ojy0srTk4uR8enxEQkTMysz08vS0trRERkT8/vwAAAAAAAAAAAAAAAAAAAAAAAAEXDDJSau9UwyEhqhGcRyFAYqkKSBACyCfZIxBfZgybRuD6w4TUW1YCB6GtQLB10JMjsjA4RmVsphOCRQ51VYPPSZQUqgWyeaVDzaZcXEJ9/CW0HA8p1Epn8L4/xQRACH5BAkGAAkALAAAAAAeAAoAgxweHLSytNza3GRmZPTy9CwqLMzKzLS2tNze3Pz+/CwuLAAAAAAAAAAAAAAAAAAAAARgMMlJq70TjVIGqoRxHAYBiqSJFEALKJ9EjEF9mDJtE4PrDhNRbWgIHoY1A8sHKEyOyMDhGZUufU4JFDnVVg89JlBiqBbJZsG1KZjMuLjEe3hLaDiDNiU0Kp36cRiCgwkRACH5BAkGAAwALAAAAAAeAAoAgwQCBLSytNza3ExOTAwODMzKzPTy9AwKDLS2tFRSVBQSFNTW1Pz+/AAAAAAAAAAAAARikMlJq71TJKKSqEaBIIUBiqQpEEALEJ9kjEGNmDJtG4PrDhNRbVgIIoa1wsHXOkyOyADiGZUumU4JFDnVVhE9JlBSqBbJ5gXLRVhMZlwcAz68MQSDw2EQe6NKJyOAGISFExEAIfkECQYACAAsAAAAAB4ACgCDHB4clJaU3NrctLK07O7sZGZkLCoszMrM/P78nJqc3N7ctLa09PL0LC4sAAAAAAAABGwQyUmrvVMVY4qqzJIkCwMey3KYigG8QPNJTBLcQUJM4TL8pQIMVpgscLjBBPVrHlxDgGFiQ+aMzeYCOpxKqlZsdrAQRouSgTWglBzGg4OAKxXwwLcdzafdaTgFdhQEamwEJjwoKogYF4yNCBEAIfkECQYACwAsAAAAAB4ACgCDPDo8pKKk5OLkdHZ0zMrM9PL0REJEtLK0fH587OrsfHp8/P78REZEtLa0AAAAAAAABHRwyUmrvVMoxpSoSYAgQVIVRNMQxSIwQAwwn5QgijIoiCkVqoOwUVDIZIpJQLfbBSYpoZRgOMYYE0SzmZQ0pNIGzIqV4La5yRd8aAysgIFywB08JQT2gfA60iY3TAM9E0BgRC4IHAg1gEsKJScpKy0YlpcTEQAh+QQJBgAFACwAAAAAHgAKAINcWly0srTk5uSMjozMysz8/vxkYmS0trT08vQAAAAAAAAAAAAAAAAAAAAAAAAAAAAEW7DISau9Uwxjhqga51UIcRwEUggG4ALGJ7EvLBfIGewHMtSuweQHFEpMuyShBQRMmMDJIZk8NF3Pq5TKI9aMBe8LTOAGCLTaTdC85ai9FXFE0QRvktIphen7KREAIfkECQYACwAsAAAAAB4ACgCDPDo8pKKk5OLkdHZ0zMrM9PL0REJEtLK0fH587OrsfHp8/P78REZEtLa0AAAAAAAABHVwyUmrvTMFhEKqgsIwilAVRNMQxZIgijIoyCcJDKADjCkVqoOwUQgMjjJFYKLY7RSTlHBKgM2OA8TE4NQxJo3ptIG4JqGSXPcrCYsPDaN5sJQ0u4Po+0B4yY41EzhOPRNAYkQuATEeIAMjCD6GKSstGJeYExEAIfkECQYACAAsAAAAAB4ACgCDHB4clJaU3NrctLK07O7sZGZkLCoszMrM/P78nJqc3N7ctLa09PL0LC4sAAAAAAAABGsQyUmrvZOtlBarSmEYhVIxx7IcH5EEcJAQk9IAONCYkrYMQM8iFhtMCrlcYZICOg8vomxiSOIMk58zKI1RrQCsRLtVdY0SpHUpOWyBB5eUJhFUcwZBhjxY0AgDMAN0NSIkPBkpKx8YjY4TEQAh+QQJBgAMACwAAAAAHgAKAIMEAgS0srTc2txMTkwMDgzMysz08vQMCgy0trRUUlQUEhTU1tT8/vwAAAAAAAAAAAAEYpDJSau90xSEiqlCQiiJUGmcxxhc4CKfJBBADRCmxCJuABe9XmGSsNkGk00woFwiJgdj7TDhOa3BpyQqpUqwvc6SORlIAUgJcOkBwyYzI2GRcX9QnRh8cDgMchkbeRiEhRQRACH5BAkGAAgALAAAAAAeAAoAgxweHJSWlNza3LSytOzu7GRmZCwqLMzKzPz+/JyanNze3LS2tPTy9CwuLAAAAAAAAARsEMlJq72TnbUOq0phGIVSMUuSLB+6DDA7KQ1gA40pMUngBwnCAUYcHCaF260wWfx+g1cxOjEobYZJ7wmUFhfVKyAr2XKH06MkeWVKBtzAAPUlTATWm0GQMfvsGhweICIkOhMEcHIEHxiOjo0RACH5BAkGAAsALAAAAAAeAAoAgzw6PKSipOTi5HR2dMzKzPTy9ERCRLSytHx+fOzq7Hx6fPz+/ERGRLS2tAAAAAAAAARxcMlJq72zkNZIqYLCMIpQJQGCBMlScEfcfJLAADjAmFKCKIqBApEgxI4HwkSRyykmgaBQGGggZRNDE8eYIKZThfXamNy2XckPDDRelRLmdgAdhAeBF3I2sTV3Ez5SA0QuGx00fQMjCDyBUQosGJOUFBEAIfkECQYABQAsAAAAAB4ACgCDXFpctLK05ObkjI6MzMrM/P78ZGJktLa09PL0AAAAAAAAAAAAAAAAAAAAAAAAAAAABFiwyEmrvRORcwiqwmAYgwCKpIlwQXt8kmAANGCY8VzfROsHhMmgVhsIibTB4eea6JBOJG3JPESlV2SPGZQMkUavdLD6vSYCKa6QRqo2HRj6Wzol15i8vhABACH5BAkGAAsALAAAAAAeAAoAgzw6PKSipOTi5HR2dMzKzPTy9ERCRLSytHx+fOzq7Hx6fPz+/ERGRLS2tAAAAAAAAARycMlJq72zkNZIqUmAIEFSCQrDKMJScEfcfFKCKMqgIKYkMIAggCEgxI4HwiSQ0+kCE4VQOGggZROE06mYGKZBhvXayOaauAkQzDBelZLAgDuASqTgwQs5m9iaAzwTP1NELhsdNH5MCiUnAyoILRiUlRMRACH5BAkGAAgALAAAAAAeAAoAgxweHJSWlNza3LSytOzu7GRmZCwqLMzKzPz+/JyanNze3LS2tPTy9CwuLAAAAAAAAARvEMlJq72TnbUOq8ySJMtHKYVhFAoSLkNcZklgBwkxKQ3gAw3FIUYcHCaL220wKfx+BVhxsJjUlLiJ4ekzSItVyRWr5QIMw+lRMsAGmBIntxAC6ySMse2OEGx/BgIuGx0mEwRtbwSGCCgqLBiRjJERACH5BAkGAAwALAAAAAAeAAoAgwQCBLSytNza3ExOTAwODMzKzPTy9AwKDLS2tFRSVBQSFNTW1Pz+/AAAAAAAAAAAAARmkMlJq73TFISKqRrnVUJCKInAGFzgIp/EIm4ATwIB7AAhFLVaYbIJBoaSBI83oBkRE2cQKjksdwdpjcrQvibW6wFoRDLIQfPgChiwprGV9ibJLQmL1aYTl+1HFAIDBwcDKhiIiRMRACH5BAkGAAkALAAAAAAeAAoAgxweHLSytNza3GRmZPTy9CwqLMzKzLS2tNze3Pz+/CwuLAAAAAAAAAAAAAAAAAAAAARiMMlJq72TmHMMqRrnVchQFAOSEFzgHp/EHm4AT4gC7ICCGLWaYbIJBoaSAY83oBkPE2cQKiksdwVpjZrQvibWawFoRCbIQbPyOmBNYyvtTSIIYwWrTQcu048oJScpGISFFBEAIfkECQYACQAsAAAAAB4ACgCDPDo8tLK05OLkfHp8REJEzMrM9PL0tLa0REZE/P78AAAAAAAAAAAAAAAAAAAAAAAABGEwyUmrvdOUc4qpGudVwoAgg5AYXOAen8QebgBPAgLsACIUtVphsgkGhpIBjzegGQ8TZxAqISx3CGmNmtC+JrorAmhEJshBs/I6YE1jK+1Nklv6VpsOXJYfUUonKRiDhBQRACH5BAkGAAUALAAAAAAeAAoAg1xaXLSytOTm5IyOjMzKzPz+/GRiZLS2tPTy9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAResMhJq70TkXMIqhrnVcJgGINQIFzgHp/EHm4AT4IB7IAhELUaYbIJBoaSAY83oBkPE2cQKtEtd9IatZB9TaxXoBFZEAfJyuuANY2tsjeJ4ApQhTpu2QZPSqcwgIEUEQAh+QQJBgAFACwAAAAAHgAKAIN0dnTMysykoqTs6uy0srT8/vx8fnz08vS0trQAAAAAAAAAAAAAAAAAAAAAAAAAAAAEY7DISau98wSEwqka51WDYBjCUBwc4SKfxCIuAU/DCQDnENS1wGQDJAglgp0SIKAVERMnECox8HZWg7RGLWxfE+sV+yseC2XgOYndCVjT2Gp7k+TEPFWoI5dt+CQmKCoYhYYTEQAh+QQJBgADACwAAAAAHgAKAIKUlpTs7uy0srT8/vzMysycmpz08vS0trQDWTi63P7LkHOIaZJafEo5l0EJJBiN5aUYBeACRUCQtEAsU20vx/sKBx2QJzwsWj5YUGdULGvNATI5090U1dp1IEgCBCJo4CSOTF3jTEUVmawbge43wIbYH6oEADs%3D";
    this.Rm = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB0AAAAdCAYAAABWk2cPAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAVVSURBVHjaxFdbSFxHGJ7djfdb1HgNpsV7iwQrYhWN5EmReHlqUEGqUcGHohBCMSqhqEgU8aWiqH0QBDGkAe2bF1ARMduKldqqsURFrVqtBo1uvOzu9P+n/znMWVfNWwc+zp455/zf/LdvZnXs8qGTrrbAwe2ASddrDdvOIfSEGwADQW9DagVYCGa6t9os4kpS5bdCgGSOCpqamj5PSUm5d+fOnS98fHyiHB0dg3U6HT8/P//r6Ojoj729PePy8vJIRkbGnLQQdh25johcADcBQYDQ4uLitNevX3eB4Q2r1coVbG1t8ZWVFS7PnZ6ewtTK856eniiypbskmuoDB4ArwBfwCSCmvr7+GzBiJIO8s7OTP3jwgLu6umqQnJzMW1pauMlkEuTg9eDo6Gg62bRLrHiIhLfQO0B8VVXVk83NzUU0Mjg4yKOioi6Q2eLu3bt8enpaEJ+cnBiHh4fTJY81QwmpLxEmpKWlPVpYWJjFj7u7u7mHh8e1hC4uLgLu7u68oaFBEIPng11dXdH2iJ0ohxjSeEDmy5cvf1I8vIpQIbKHtrY2Qfz27dvnxKGXSd2oaGIAaVB9Nbu7u3tQODw8PFxDkpiYyO/fv3+BICQkhJeWlnJfX191zsvLi6+vr4vigsKKt/XWm8KaDMiFghjAFba2tmoI4+Li1Cqtra1VjUdHR/ONjQ0x39HRoc47OzvzsrIyMT8zM1NJrSdI9XSDReSJC4iNjY3ABy9evNAk/vj4mEFxiN81NTXs6dOnLDQ0lI2MjLDg4GAx//79e8Y5F8AxMDDAgJRBxL609TQEiwfwFeBbWPXewcGB3fzl5OSobYHA95Tfr1694m5ubsJDGbOzs1jJS2Dbg0RHeOpAiUZvXSEvntvb2xovlZUPDQ2x3NxcdnZ2Ju6hyMS1v7+fFRUV/SdnBoMGkFfm4OBwmwjV8Cpy50RgIG0XCJUBYiHCKI/5+XlmsVjsSh3Ogw2drNt6W2Hf2dk5DgwMtGsAciO8hWiIe8wXDhASVllZafcbzDdEZlNWJr3tS4uLi+9A0MXLspcYSiQMCAhQQ/rw4UO1uKqrq1lJSYnGFoY3MjKSQfu9kef10naEW5NlfHx8Bx9kZWVpDODHMmFhYSED8WD5+fkqMWiw5pvU1FTm6enJlpaWfrXd7rBH7wG+BnwXExPzI1TwEe4icrMjsO8qKio4GBKVqgC2PF5XV8cjIiI08xMTExx3J2ivdFK9G3ZbBvB9Y2Pj79gGzc3NGlJsAdnoVYBQi1YyGo1dxKG2jIHE3pGu2DYukFcrSJ4P5Mx9dXWVzc3NqfnV6/XXnUZYQkIC6+vrY7BL/fzs2bNW2DywkE4ohdxAhPIpwenw8BALCj++CSt2MZvNbHJy8qNIsbh6e3vZ/v7+m/b29h9AGo0oaIBT6TShFXzAI1Q6DHNSUtIwkG1hmGC1PC8vj/v5+dkNZ2ZmJocThggpFM7s48ePn5DNIOJQZVBHgoCh9QL4AQLpRSzVW0FBQbfLy8s/Kygo+BTayA12DaxGBiIuVgyFx6CARJXCiWF/bGxsEmqhH3L5GzzeBRwAPqDmUJeopwblqOJFpwd/wi3ahdzh5BCUnZ0dAluff1hYmLe/vz+uHokO19bW/p6amvoTWukXqNhZmMa2+4cITURoUVpGUQmDzW7jI8GbKs+VomJQFI7yhEZRF98B9iUc0rMzmZBJfWOh1ZjooYWq7ZhW6y6RKt+YJdIjIjmgBRxJIbXYOx9x8tYsqYaFVmgiQwqhoySdVnpHITYR0QeaO7/s7PvRh23K+w0bUjMZP5Ngvu6w/b/8rfhXgAEAmJkyLSnsNQEAAAAASUVORK5CYII=";
    this.fq = this.P + "_textoverlay";
    this.Ij = "#" + this.fq;
    this.da = 1;
    this.renderer = this.config.renderer;
    this.Ia = "toolbar_" + this.P;
    this.K = "#" + this.Ia;
    this.mc = !1;
    this.scale = this.config.document.Scale;
    this.resources = new FlowPaper_Resources(this);
    this.Rb = !1;
    this.ig = 0;
    this.linkColor = "#72e6ff";
    this.Ic = 0.4;
  }
  f.prototype = {
    M: function(c) {
      if (0 < c.indexOf("undefined")) {
        return jQuery(null);
      }
      this.selectors || (this.selectors = {});
      this.selectors[c] || (this.selectors[c] = jQuery(c));
      return this.selectors[c];
    },
    W: function() {
      return this.I ? this.I.W : "";
    },
    loadFromUrl: function(c) {
      var d = this;
      d.Ag();
      var e;
      window.annotations && d.plugin && d.plugin.clearMarks();
      if (d.pages) {
        for (var f = 0; f < d.document.numPages; f++) {
          d.pages.pages[f] && delete d.pages.pages[f];
        }
      }
      var h = f = !1;
      c.RenderingOrder && (h = c.RenderingOrder.split(","), f = 0 < h.length && "html5" == h[0], h = 0 < h.length && "html" == h[0]);
      c.DOC && (c.PDFFile = FLOWPAPER.translateUrlByFormat(unescape(c.DOC), "pdf"), c.SWFFile = FLOWPAPER.translateUrlByFormat(unescape(c.DOC), "swf"), c.JSONFile = FLOWPAPER.translateUrlByFormat(unescape(c.DOC), "jsonp"), c.IMGFiles = FLOWPAPER.translateUrlByFormat(unescape(c.DOC), "jpg"));
      c.FitPageOnLoad && (d.config.document.FitPageOnLoad = !0, d.config.document.FitWidthOnLoad = !1);
      c.FitWidthOnLoad && (d.config.document.FitWidthOnLoad = !0, d.config.document.FitPageOnLoad = !1);
      (eb.browser.capabilities.Rp && c.PDFFile || f) && !h ? e = new CanvasPageRenderer(this.P, c.PDFFile, d.config.jsDirectory, {
        jsonfile: c.JSONFile,
        pageImagePattern: c.pageImagePattern,
        JSONDataType: d.renderer.config.JSONDataType,
        signature: d.renderer.config.signature
      }) : (c.JSONFile && c.IMGFiles || h) && !f && (e = new ImagePageRenderer(this.P, {
        jsonfile: c.JSONFile,
        pageImagePattern: c.IMGFiles,
        JSONDataType: d.renderer.config.JSONDataType,
        signature: d.renderer.config.signature
      }, d.config.jsDirectory));
      d.renderer = e;
      jQuery(d.renderer).bind("loadingProgress", function(c, e) {
        d.Jl(c, e);
      });
      jQuery(d.renderer).bind("labelsLoaded", function(c, e) {
        d.Hl(c, e);
      });
      jQuery(d.renderer).bind("loadingProgressStatusChanged", function(c, e) {
        d.Kl(c, e);
      });
      jQuery(d.renderer).bind("UIBlockingRenderingOperation", function(c, e) {
        d.Qc(c, e);
      });
      jQuery(d.renderer).bind("UIBlockingRenderingOperationCompleted", function() {
        d.Jb();
      });
      jQuery(d.renderer).bind("outlineAdded", function(c, e) {
        d.nl(c, e);
      });
      e && (d.oe = "", d.sj(), d.renderer = e, e.initialize(function() {
        d.document.numPages = e.getNumPages();
        d.document.dimensions = e.getDimensions();
        d.document.StartAtPage = c.StartAtPage;
        d.loadDoc(e, e.getNumPages());
      }, {}));
    },
    loadDoc: function(c, d) {
      this.initialized = !1;
      this.document.numPages = d;
      this.renderer = c;
      this.show();
    },
    getDimensions: function(c) {
      return this.renderer.getDimensions(c);
    },
    En: function(c) {
      if (jQuery(c.target).hasClass("flowpaper_note_container") && eb.platform.touchdevice) {
        return window.Cb = !1, !0;
      }
      var d = eb.platform.touchdevice && "undefined" !== typeof c.originalEvent.touches ? c.originalEvent.touches[0].pageX : c.pageX,
        e = eb.platform.touchdevice && "undefined" !== typeof c.originalEvent.touches ? c.originalEvent.touches[0].pageY : c.pageY;
      if (this.mc || eb.platform.touchdevice) {
        c.target && c.target.id && 0 <= c.target.id.indexOf("page") && 0 <= c.target.id.indexOf("word") && (hoverPage = parseInt(c.target.id.substring(c.target.id.indexOf("_") + 1)), hoverPageObject = U(this.P));
        if (!hoverPageObject && !window.Cb || !window.Cb) {
          return !0;
        }
        eb.platform.touchdevice && (c.preventDefault && c.preventDefault(), c.stopPropagation && c.stopPropagation(), this.pages.jScrollPane && this.pages.jScrollPane.data("jsp").disable());
        this.H == this.W() && 1 < this.scale ? window.b = hoverPageObject.hl(c.target.id) : window.b = hoverPageObject.match({
          left: d,
          top: e
        }, !1);
        null != window.b && null != window.a && window.a.pageNumber != window.b.pageNumber && (window.a = hoverPageObject.match({
          left: d - 1,
          top: e - 1
        }, !1));
        this.Je(!0);
        this.he = hoverPageObject.Af(!0, this.ye);
      } else {
        if (c.target && c.target.id && 0 <= c.target.id.indexOf("page") && (hoverPage = parseInt(c.target.id.substring(c.target.id.indexOf("_") + 1)), hoverPageObject = U(this.P)), hoverPageObject && hoverPageObject.match({
            left: d,
            top: e
          }, !0), !hoverPageObject && !window.Cb) {
          return !0;
        }
      }
    },
    Je: function(c) {
      eb.platform.touchdevice || (this.he = null);
      this.mc && (jQuery(".flowpaper_pageword_" + this.P).removeClass("flowpaper_selected"), jQuery(".flowpaper_pageword_" + this.P).removeClass("flowpaper_selected_default"));
      c && jQuery(".flowpaper_pageword_" + this.P).each(function() {
        jQuery(this).hasClass("flowpaper_selected_yellow") && !jQuery(this).data("isMark") && jQuery(this).removeClass("flowpaper_selected_yellow");
        jQuery(this).hasClass("flowpaper_selected_orange") && !jQuery(this).data("isMark") && jQuery(this).removeClass("flowpaper_selected_orange");
        jQuery(this).hasClass("flowpaper_selected_green") && !jQuery(this).data("isMark") && jQuery(this).removeClass("flowpaper_selected_green");
        jQuery(this).hasClass("flowpaper_selected_blue") && !jQuery(this).data("isMark") && jQuery(this).removeClass("flowpaper_selected_blue");
        jQuery(this).hasClass("flowpaper_selected_strikeout") && !jQuery(this).data("isMark") && jQuery(this).removeClass("flowpaper_selected_strikeout");
      });
    },
    Fn: function(c) {
      this.sh = "up";
      this.Xc = this.Pi = !1;
      this.fl = null;
      if (!this.pages || !this.pages.animating) {
        if (jQuery(c.target).hasClass("flowpaper_searchabstract_result") || jQuery(c.target).parent().hasClass("flowpaper_searchabstract_result") || jQuery(c.target).hasClass("flowpaper_note_container") || "TEXTAREA" == c.target.tagName || jQuery(c.target).hasClass("flowpaper_textarea_contenteditable") || jQuery(c.target).parent().hasClass("flowpaper_textarea_contenteditable")) {
          return !0;
        }
        if (this.mc || eb.platform.touchdevice) {
          if (hoverPageObject) {
            if (eb.platform.touchdevice) {
              var d = null;
              "undefined" != typeof c.originalEvent.touches && (d = c.originalEvent.touches[0] || c.originalEvent.changedTouches[0]);
              null != d && this.Zc == d.pageX && this.$c == d.pageY && (this.Je(), this.he = hoverPageObject.Af(window.Cb, this.ye));
              null != d && (this.Zc = d.pageX, this.$c = d.pageY);
              this.pages.jScrollPane && this.pages.jScrollPane.data("jsp").enable();
            } else {
              window.b = hoverPageObject.match({
                left: c.pageX,
                top: c.pageY
              }, !1);
            }
            null != this.he && this.L.trigger("onSelectionCreated", this.he.text);
            window.Cb = !1;
            window.a = null;
            window.b = null;
          }
        } else {
          hoverPageObject && (window.b = hoverPageObject.match({
            left: c.pageX,
            top: c.pageY
          }, !1), window.Cb = !1, this.Je(), this.he = hoverPageObject.Af(!1, this.ye));
        }
      }
    },
    Dn: function(c) {
      var d = this;
      d.sh = "down";
      if (jQuery(c.target).hasClass("flowpaper_note_textarea") || "INPUT" == jQuery(c.target).get(0).tagName) {
        window.b = null, window.a = null;
      } else {
        if (!d.pages.animating) {
          var e = eb.platform.touchdevice && "undefined" !== typeof c.originalEvent.touches ? c.originalEvent.touches[0].pageX : c.pageX,
            f = eb.platform.touchdevice && "undefined" !== typeof c.originalEvent.touches ? c.originalEvent.touches[0].pageY : c.pageY;
          d.Zc = e;
          d.$c = f;
          eb.platform.touchdevice && (eb.platform.touchonlydevice && window.annotations && (d.mc = !0, d.Je(!0)), window.clearTimeout(d.Bo), d.fl = (new Date).getTime(), document.activeElement && jQuery(document.activeElement).hasClass("flowpaper_note_textarea") && document.activeElement.blur(), d.Bo = setTimeout(function() {
            if (null != d.fl && c.originalEvent.touches && 0 < c.originalEvent.touches.length) {
              var e = eb.platform.touchdevice && "undefined" !== typeof c.originalEvent.touches ? c.originalEvent.touches[0].pageX : c.pageX,
                f = eb.platform.touchdevice && "undefined" !== typeof c.originalEvent.touches ? c.originalEvent.touches[0].pageY : c.pageY;
              d.Zc + 20 > e && d.Zc - 20 < e && d.$c + 20 > f && d.$c - 20 < f && (hoverPage = parseInt(c.target.id.substring(c.target.id.indexOf("_") + 1)), hoverPageObject = U(d.P), null != hoverPageObject && (null != d.pages.jScrollPane && d.pages.jScrollPane.data("jsp").disable(), window.Cb = !0, d.Je(!0), window.b = hoverPageObject.match({
                left: e,
                top: f
              }, !1), window.a = hoverPageObject.match({
                left: e - 1,
                top: f - 1
              }, !1), d.he = hoverPageObject.Af(!0, d.ye)));
            }
          }, 800));
          if (d.mc || eb.platform.touchdevice) {
            if (!hoverPageObject) {
              if (eb.platform.touchdevice) {
                if (c.target && c.target.id && 0 <= c.target.id.indexOf("page") && 0 <= c.target.id.indexOf("word") && (hoverPage = parseInt(c.target.id.substring(c.target.id.indexOf("_") + 1)), hoverPageObject = U(d.P)), !hoverPageObject) {
                  window.a = null;
                  return;
                }
              } else {
                window.a = null;
                return;
              }
            }
            d.H == d.W() && 1 < d.scale ? window.a = hoverPageObject.hl(c.target.id) : window.a = hoverPageObject.match({
              left: e,
              top: f
            }, !0);
            if (window.a) {
              return window.Cb = !0, d.Je(), d.he = hoverPageObject.Af(!1, d.ye), !1;
            }
            jQuery(c.target).hasClass("flowpaper_tblabelbutton") || jQuery(c.target).hasClass("flowpaper_tbtextbutton") || jQuery(c.target).hasClass("flowpaper_colorselector") || jQuery(c.target).hasClass("flowpaper_tbbutton") || eb.platform.touchdevice || (d.Je(), d.he = hoverPageObject.Af(!1, d.ye));
            window.Cb = !1;
            return !0;
          }
          window.a = hoverPageObject ? hoverPageObject.match({
            left: e,
            top: f
          }, !0) : null;
        }
      }
    },
    ld: function() {
      this.width || (this.width = this.N.width());
      return this.width;
    },
    xm: function() {
      return null != this.pages ? this.H != this.W() ? this.pages.R + 1 : this.pages.R : 1;
    },
    bindEvents: function() {
      var c = this;
      hoverPage = 0;
      hoverPageObject = null;
      c.N.bind("mousemove", function(d) {
        return c.En(d);
      });
      c.N.bind("mousedown", function(d) {
        return c.Dn(d);
      });
      c.N.bind("mouseup", function(d) {
        return c.Fn(d);
      });
      var d = jQuery._data(jQuery(window)[0], "events");
      eb.platform.android ? jQuery(window).bind("orientationchange", function(d) {
        c.Kj(d);
      }) : jQuery(window).bind("resize", function(d) {
        c.Kj(d);
      });
      jQuery(window).bind("orientationchange", function(d) {
        c.Jo(d);
      });
      d && d.resize && (c.zl = d.resize[d.resize.length - 1]);
      if (!c.document.DisableOverflow) {
        try {
          jQuery.get(c.config.localeDirectory + c.document.localeChain + "/FlowPaper.txt", function(d) {
            c.toolbar.cl(d);
            c.sj();
          }).error(function() {
            c.sj();
            O("Failed loading supplied locale (" + c.document.localeChain + ")");
          }), c.toolbar.cl("");
        } catch (e) {}
      }
      c.oe || (c.oe = "");
    },
    Jo: function(c) {
      var d = this;
      d.hi = !0;
      if (window.zine && d.H == d.W()) {
        var e = window.screen && window.screen.orientation ? window.screen.orientation.angle : window.orientation;
        if ("Flip-SinglePage" != d.document.InitViewMode) {
          switch (e) {
            case 270:
            case -90:
            case 90:
              d.I.Ba = "Flip-SinglePage" != d.config.document.TouchInitViewMode ? !1 : !0;
              break;
            default:
              d.I.Ba = !0;
          }
        }
        d.I.tb = d.I.ii();
        setTimeout(function() {
          d.H = "";
          d.switchMode(d.W(), d.getCurrPage() - 1);
          d.hi = !1;
          window.scrollTo(0, 0);
        }, 500);
        jQuery(".flowpaper_glyphcanvas").css("z-index", -1);
      }
      if ("Portrait" == d.H || "SinglePage" == d.H) {
        d.config.document.FitPageOnLoad && d.fitheight(), d.config.document.FitWidthOnLoad && d.fitwidth(), d.N.height("auto"), setTimeout(function() {
          requestAnim(function() {
            d.Kj(c);
            d.N.height("auto");
            d.hi = !1;
          });
        }, 1000);
      }
    },
    Kj: function(c) {
      if (!this.document.DisableOverflow && !this.hi && !jQuery(c.target).hasClass("flowpaper_note")) {
        c = this.N.width();
        var d = this.N.height(),
          e = !1,
          f = -1;
        this.mj ? f = this.mj : 0 < this.N[0].style.width.indexOf("%") && (this.mj = f = parseFloat(this.N[0].style.width.substr(0, this.N[0].style.width.length - 1) / 100));
        0 < f && (c = 0 == this.N.parent().width() ? jQuery(document).width() * f : this.N.parent().width() * f, e = !0);
        f = -1;
        this.lj ? f = this.lj : 0 < this.N[0].style.height.indexOf("%") && (this.lj = f = parseFloat(this.N[0].style.height.substr(0, this.N[0].style.height.length - 1) / 100));
        0 < f && (d = 0 == this.N.parent().height() ? jQuery(window).height() * f : this.N.parent().height() * f, e = !0);
        f = document.Cb || document.mozFullScreen || document.webkitIsFullScreen || window.Cm || window.cg;
        e && !f && this.resize(c, d);
      }
    },
    sj: function() {
      var c = this;
      if (!c.document.DisableOverflow) {
        if (c.df || (c.df = null != c.toolbar && null != c.toolbar.Ka ? c.toolbar.la(c.toolbar.Ka, "LoadingPublication") : "Loading Publication"), null == c.df && (c.df = "Loading Publication"), c.km = window.zine && (c.renderer.config.pageThumbImagePattern && 0 < c.renderer.config.pageThumbImagePattern.length || c.config.document.LoaderImage), c.km) {
          var d = new Image;
          jQuery(d).bind("load", function() {
            if (!c.initialized && (!c.Va || c.Va && !c.Va.jquery)) {
              var d = this.width / 1.5,
                f = this.height / 1.5;
              this.width = d;
              this.height = f;
              110 < d && (f = this.width / this.height, d = 110, f = d / f);
              c.Va = jQuery(String.format("<div class='flowpaper_loader' style='position:{1};z-index:100;top:50%;left:50%;color:#ffffff;width:{5}px;margin-left:-{10}px;margin-top:-{11}px'><div style='position:relative;'><div class='flowpaper_titleloader_image' style='position:absolute;left:0px;'></div><div class='flowpaper_titleloader_progress' style='position:absolute;left:{7}px;width:{8}px;height:{6}px;background-color:#000000;opacity:0.3;'></div></div></div>", c.P, "static" == c.N.css("position") ? "relative" : "fixed", c.I.Ba && !c.Te ? "35%" : "47%", c.I.kb, c.renderer.ia(1, 200), d, f, 0, d, c.I.Ba && !c.Te ? "30%" : "40%", d / 2, f / 2));
              c.N.append(c.Va);
              jQuery(this).css({
                width: d + "px",
                height: f + "px"
              });
              c.Va.find(".flowpaper_titleloader_image").append(this);
            }
          });
          c.config.document.LoaderImage ? d.src = c.config.document.LoaderImage : d.src = c.renderer.ia(1, 200);
        } else {
          !window.zine || eb.browser.msie && 10 > eb.browser.version ? (c.Va = jQuery(String.format("<div class='flowpaper_loader flowpaper_initloader' style='position:{2};z-index:100;'><div class='flowpaper_initloader_panel' style='{1};background-color:#ffffff;'><img src='{0}' style='vertical-align:middle;margin-top:7px;margin-left:5px;'><div style='float:right;margin-right:25px;margin-top:19px;' class='flowpaper_notifylabel'>" + c.df + "<br/><div style='margin-left:30px;' class='flowpaper_notifystatus'>" + c.oe + "</div></div></div></div>", c.Sm, "margin: 0px auto;", "static" == c.N.css("position") ? "relative" : "absolute")), c.N.append(c.Va)) : (c.Va = jQuery(String.format("<div id='flowpaper_initloader_{0}' class='flowpaper_loader flowpaper_initloader' style='position:{1};margin: 0px auto;z-index:100;top:40%;left:{2}'></div>", c.P, "static" == c.N.css("position") ? "relative" : "absolute", eb.platform.iphone ? "40%" : "50%")), c.N.append(c.Va), c.Ec = new CanvasLoader("flowpaper_initloader_" + c.P), c.Ec.setColor("#555555"), c.Ec.setShape("square"), c.Ec.setDiameter(70), c.Ec.setDensity(151), c.Ec.setRange(0.8), c.Ec.setSpeed(2), c.Ec.setFPS(42), c.Ec.show());
        }
      }
    },
    initialize: function() {
      var c = this;
      FLOWPAPER.Lk.init();
      c.np();
      c.mp();
      c.Wb = location.hash && 0 <= location.hash.substr(1).indexOf("inpublisher") ? !0 : !1;
      c.L = jQuery("#" + c.P);
      c.toolbar = new xa(this, this.document);
      c.Tk = c.document.ImprovedAccessibility;
      !eb.platform.iphone || c.config.document.InitViewMode || window.zine || (c.vb = "Portrait");
      "BookView" == c.config.document.InitViewMode && 0 == c.document.StartAtPage % 2 && (c.document.StartAtPage += 1);
      c.config.document.TouchInitViewMode && c.config.document.TouchInitViewMode != c.vb && eb.platform.touchonlydevice && (c.vb = c.config.document.TouchInitViewMode);
      c.config.document.TouchInitViewMode || !eb.platform.touchonlydevice || window.zine || (c.vb = "SinglePage");
      window.zine && !c.document.DisableOverflow ? (c.I = c.toolbar.og = new FlowPaperViewer_Zine(c.toolbar, this, c.L), "Portrait" != c.vb && "Portrait" != c.config.document.TouchInitViewMode || !eb.platform.touchonlydevice || (c.config.document.TouchInitViewMode = c.config.document.InitViewMode = c.H = "Flip-SinglePage"), c.I.initialize(), c.H != c.W() && (c.H = c.vb)) : c.H = c.vb;
      "CADView" == c.H && (c.H = "SinglePage");
      window.zine && (eb.browser.msie && 9 > eb.browser.version || eb.browser.safari && 5 > eb.browser.Kb) && !eb.platform.touchonlydevice && (c.document.MinZoomSize = c.MinZoomSize = 0.3, c.H = "BookView");
      "0px" == c.L.css("width") && c.L.css("width", "1024px");
      "0px" == c.L.css("height") && c.L.css("height", "600px");
      c.Rb = c.H == c.W() && (eb.platform.iphone || eb.platform.lb);
      null !== c.N || c.I || (0 < c.L.css("width").indexOf("%") && (c.mj = parseFloat(c.L[0].style.width.substr(0, c.L[0].style.width.length - 1) / 100)), 0 < c.L.css("height").indexOf("%") && (c.lj = parseFloat(c.L[0].style.height.substr(0, c.L[0].style.height.length - 1) / 100)), c.document.DisableOverflow ? (c.config.document.FitPageOnLoad = !1, c.config.document.FitWidthOnLoad = !0, c.N = jQuery("<div style='left:0px;top:0px;position:absolute;width:" + (window.printWidth ? window.printWidth : "210mm") + ";height:" + (window.printHeight ? window.printHeight : "297mm") + ";' class='flowpaper_viewer_container'/>")) : (c.N = jQuery("<div style='" + c.L.attr("style") + ";' class='flowpaper_viewer_wrap flowpaper_viewer_container'/>"), "" != c.N.css("position") && "static" != c.N.css("position") || c.N.css({
        position: "relative"
      })), c.N = c.L.wrap(c.N).parent(), c.document.DisableOverflow ? c.L.css({
        left: "0px",
        top: "0px",
        position: "relative",
        width: "100%",
        height: "100%",
        "max-width": window.printWidth ? window.printWidth : "210mm",
        "max-height": window.printHeight ? window.printHeight : "297mm"
      }).addClass("flowpaper_viewer") : c.L.css({
        left: "0px",
        top: "0px",
        position: "relative",
        width: "100%",
        height: "100%"
      }).addClass("flowpaper_viewer").addClass("flowpaper_viewer_gradient"), window.annotations && c.config.document.AnnotationToolsVisible && !c.document.DisableOverflow ? (c.ig = eb.platform.touchdevice ? 15 : 22, c.L.height(c.L.height() - c.ig)) : c.ig = 0);
      c.gq = c.N.html();
      eb.browser.msie && jQuery(".flowpaper_initloader_panel").css("left", c.L.width() - 500);
      c.document.DisableOverflow || (null == c.config.Toolbar && 0 == jQuery("#" + c.Ia).length ? (c.Toolbar = c.N.prepend("<div id='" + c.Ia + "' class='flowpaper_toolbarstd' style='z-index:200;overflow-y:hidden;overflow-x:hidden;'></div>").parent(), c.toolbar.create(c.Ia)) : null == c.config.Toolbar || c.Toolbar instanceof jQuery || (c.config.Toolbar = unescape(c.config.Toolbar), c.Toolbar = jQuery(c.config.Toolbar), c.Toolbar.attr("id", c.Ia), c.N.prepend(c.Toolbar)));
      c.ak();
      c.document.DisableOverflow || c.resources.initialize();
      c.document.DisplayRange && (c.DisplayRange = ca(c.document.DisplayRange));
      hoverPage = 0;
      hoverPageObject = null;
      null != c.I ? c.I.wn(c.Ia) : window.annotations && (c.plugin = new FlowPaperViewerAnnotations_Plugin(this, this.document, c.Ia + "_annotations"), c.plugin.create(c.Ia + "_annotations"), c.plugin.bindEvents(c.F));
      c.document.DisableOverflow || (eb.platform.touchonlydevice || c.N.append("<textarea id='selector' class='flowpaper_selector' rows='0' cols='0'></textarea>"), 0 == jQuery("#printFrame_" + c.P).length && c.N.append("<iframe id='printFrame_" + c.P + "' name='printFrame_" + c.P + "' class='flowpaper_printFrame'>"));
      jQuery(c.renderer).bind("loadingProgress", function(d, e) {
        c.Jl(d, e);
      });
      jQuery(c.renderer).bind("labelsLoaded", function(d, e) {
        c.Hl(d, e);
      });
      jQuery(c.renderer).bind("loadingProgressStatusChanged", function(d, e) {
        c.Kl(d, e);
      });
      jQuery(c.renderer).bind("UIBlockingRenderingOperation", function(d, e) {
        c.Qc(d, e);
      });
      jQuery(c.renderer).bind("UIBlockingRenderingOperationCompleted", function() {
        c.Jb();
      });
      jQuery(c.renderer).bind("outlineAdded", function(d, e) {
        c.nl(d, e);
      });
      $FlowPaper(c.P).dispose = c.dispose;
      $FlowPaper(c.P).highlight = c.highlight;
      $FlowPaper(c.P).rotate = c.rotate;
      $FlowPaper(c.P).getCurrentRenderingMode = c.getCurrentRenderingMode;
    },
    ak: function() {
      this.$m || this.document.DisableOverflow || (eb.platform.touchonlydevice && !this.Rb ? eb.platform.touchonlydevice ? (window.zine ? this.L.height(this.L.height() - (this.config.BottomToolbar ? 65 : 0)) : window.annotations ? this.L.height(this.L.height() - (this.config.BottomToolbar ? 65 : 47)) : this.L.height(this.L.height() - (this.config.BottomToolbar ? 65 : 25)), this.config.BottomToolbar && this.N.height(this.N.height() - (eb.platform.lb ? 7 : 18))) : this.L.height(this.L.height() - 25) : window.zine && "Portrait" != this.H || (this.config.BottomToolbar ? this.L.height(this.L.height() - jQuery(this.K).height() + 11) : this.L.height(this.L.height() - 23)), this.$m = !0);
    },
    Hl: function(c, d) {
      if (window.zine && this.I && this.I.Wc) {
        var e = this.I.Wc.createElement("labels");
        this.I.Wc.childNodes[0].appendChild(e);
        try {
          for (var f = 0; f < d.Yk.length; f++) {
            var h = d.Yk[f],
              p = e,
              k = this.I.Wc.createElement("node");
            k.setAttribute("pageNumber", f + 1);
            k.setAttribute("title", escape(h));
            p.appendChild(k);
          }
        } catch (l) {}
        this.labels = jQuery(e);
      }
    },
    Jl: function(c, d) {
      var e = this;
      e.oe = Math.round(100 * d.progress) + "%";
      e.Va && e.Va.find && 0 < e.Va.find(".flowpaper_notifystatus").length && e.Va.find(".flowpaper_notifystatus").html(e.oe);
      if (e.km && e.Va && e.Va.find) {
        var f = e.Va.find(".flowpaper_titleloader_progress");
        if (f) {
          var h = e.Va.find(".flowpaper_titleloader_image");
          if (0 < h.length) {
            var p = h.css("width"),
              p = parseFloat(p.replace("px", ""));
            requestAnim(function() {
              (isNaN(e.oe) || parseFloat(e.oe) < Math.round(100 * d.progress)) && f.animate({
                left: p * d.progress + "px",
                width: p * (1 - d.progress) + "px"
              }, 100);
            });
          }
        }
      }
    },
    Kl: function(c, d) {
      this.df = d.label;
      this.Va.find(".flowpaper_notifylabel").html(d.label);
    },
    Qc: function(c, d) {
      var e = this;
      e.document.DisableOverflow || null !== e.hd || (e.hd = jQuery("<div style='position:absolute;left:50%;top:50%;'></div>"), e.N.append(e.hd), e.hd.spin({
        color: "#777"
      }), null != e.Ii && (window.clearTimeout(e.Ii), e.Ii = null), d.Ro || (e.Ii = setTimeout(function() {
        e.hd && (e.hd.remove(), e.hd = null);
      }, 1000)));
    },
    Jb: function() {
      this.hd && (this.hd.remove(), this.hd = null);
    },
    show: function() {
      var c = this;
      jQuery(c.resources).bind("onPostinitialized", function() {
        setTimeout(function() {
          c.Ag();
          c.config.document.RTLMode && c.renderer.S && c.renderer.S.length && (c.document.StartAtPage = c.renderer.S.length - c.document.StartAtPage + (0 == c.renderer.S.length % 2 ? 1 : 0));
          c.document.DisableOverflow || null != c.I ? null != c.I && c.I.Kg && c.toolbar.bindEvents(c.L) : c.toolbar.bindEvents(c.L);
          c.I && c.I.Kg && null != c.I && !c.document.DisableOverflow && c.I.bindEvents(c.L);
          c.I && !c.I.Kg ? c.Wg = function() {
            c.toolbar.bindEvents(c.L);
            c.I.bindEvents(c.L);
            c.Rh(c.document.StartAtPage);
            jQuery(c.L).trigger("onDocumentLoaded", c.renderer.getNumPages());
          } : (c.Rh(c.document.StartAtPage), jQuery(c.L).trigger("onDocumentLoaded", c.renderer.getNumPages()));
        }, 50);
        jQuery(c.resources).unbind("onPostinitialized");
      });
      c.resources.To();
    },
    dispose: function() {
      this.Bn = !0;
      this.L.unbind();
      this.L.find("*").unbind();
      this.N.find("*").unbind();
      this.N.find("*").remove();
      this.L.empty();
      this.N.empty();
      jQuery(this).unbind();
      0 == jQuery(".flowpaper_viewer_container").length && window.PDFJS && delete window.PDFJS;
      this.plugin && (jQuery(this.plugin).unbind(), this.plugin.dispose(), delete this.plugin, this.plugin = null);
      jQuery(this.renderer).unbind();
      this.renderer.dispose();
      delete this.renderer;
      delete this.config;
      jQuery(this.pages).unbind();
      this.pages.dispose();
      delete this.pages;
      delete window["wordPageList_" + this.P];
      window["wordPageList_" + this.P] = null;
      this.N.unbind("mousemove");
      this.N.unbind("mousedown");
      this.N.unbind("mouseup");
      jQuery(window).unbind("resize", this.zl);
      delete this.zl;
      jQuery(this.renderer).unbind("loadingProgress");
      jQuery(this.renderer).unbind("labelsLoaded");
      jQuery(this.renderer).unbind("loadingProgressStatusChanged");
      jQuery(this.renderer).unbind("UIBlockingRenderingOperation");
      jQuery(this.renderer).unbind("UIBlockingRenderingOperationCompleted");
      this.I ? this.I.dispose() : this.L.parent().remove();
      var c = this.N.parent(),
        d = this.N.attr("style");
      this.N.remove();
      delete this.N;
      delete this.L;
      this.renderer && (delete this.renderer.ya, delete this.renderer.S, delete this.renderer.Ra, delete this.renderer.Eh, delete this.renderer.qa);
      delete this.renderer;
      var e = jQuery(this.gq);
      e.attr("style", d);
      e.attr("class", "flowpaper_viewer");
      c.append(e);
      this.plugin && delete this.plugin;
    },
    wh: function() {
      var c = this;
      eb.platform.touchonlydevice ? (c.initialized = !0, (!c.I && c.config.document.FitWidthOnLoad && "TwoPage" != c.H && "BookView" != c.H || "Portrait" == c.H || "SinglePage" == c.H) && c.fitwidth(), (c.config.document.FitPageOnLoad || "TwoPage" == c.H || "BookView" == c.H || c.I) && c.fitheight(), c.pages.Hg(), c.pages.cd()) : (c.initialized = !0, c.cr || c.toolbar.$j(c.config.document.MinZoomSize, c.config.document.MaxZoomSize), c.document.DisableOverflow ? c.fitwidth() : c.config.document.FitPageOnLoad || "TwoPage" == c.H || "BookView" == c.H ? c.fitheight() : c.config.document.FitWidthOnLoad && "TwoPage" != c.H && "BookView" != c.H ? c.fitwidth() : c.Zoom(c.config.document.Scale));
      c.document.StartAtPage && 1 != c.document.StartAtPage || c.H == c.W() || c.L.trigger("onCurrentPageChanged", c.pages.R + 1);
      c.document.StartAtPage && 1 != c.document.StartAtPage && c.pages.scrollTo(c.document.StartAtPage);
      c.I && c.I.wh();
      c.Va && c.Va.fadeOut ? c.Va.fadeOut(300, function() {
        c.Va && (c.Va.remove(), c.N.find(".flowpaper_loader").remove(), c.Ec && (c.Ec.kill(), delete c.Ec), delete c.Va, c.Ec = null, jQuery(c.pages.J).fadeIn(300, function() {}), c.PreviewMode && c.I.jb.Sh(c.pages, c.L));
      }) : (c.N.find(".flowpaper_loader").remove(), jQuery(c.pages.J).fadeIn(300, function() {}), c.PreviewMode && c.I.jb.Sh(c.pages, c.L));
      c.L.trigger("onInitializationComplete");
    },
    Ag: function() {
      this.renderer.si = !1;
      if (this.pages) {
        for (var c = 0; c < this.document.numPages; c++) {
          this.pages.pages[c] && window.clearTimeout(this.pages.pages[c].kc);
        }
      }
      this.da = 1;
      this.L.find("*").unbind();
      this.L.find("*").remove();
      this.L.empty();
      this.oe = 0;
      this.renderer.Jf = !1;
      jQuery(".flowpaper_glyphcanvas").css("z-index", -1);
      jQuery(this.Ij).remove();
      this.I && this.I.Ag();
    },
    Rh: function(c) {
      this.pages = new V(this.L, this, this.P, c);
      this.pages.create(this.L);
    },
    previous: function() {
      var c = this;
      c.cj || c.H == c.W() ? c.H == c.W() && c.pages.previous() : (c.cj = setTimeout(function() {
        window.clearTimeout(c.cj);
        c.cj = null;
      }, 700), c.pages.previous());
    },
    nl: function() {
      for (var c = jQuery.parseXML("<UIConfig></UIConfig>"), d = c.createElement("outline"), e = 0; e < this.renderer.outline.length; e++) {
        da(c, this.renderer.outline[e], d, this.renderer);
      }
      this.outline = jQuery(d);
    },
    expandOutline: function() {
      var c = this;
      c.Qa && c.Kf();
      if (!c.$a && c.outline && (!c.outline || 0 != c.outline.length)) {
        c.na = c.L.width();
        c.za = c.L.height();
        var d = c.df = null != c.toolbar && null != c.toolbar.Ka ? c.toolbar.la(c.toolbar.Ka, "TOC", "Table of Contents") : "Table of Contents",
          e = window.zine ? jQuery(c.K).css("background-color") : "transparent",
          f = window.zine ? "transparent" : "#c8c8c8",
          h = c.H == c.W() ? "40px" : jQuery(c.K).height() + 2;
        c.W();
        var p = c.H == c.W() ? 30 : 40,
          k = c.H == c.W() ? 0 : 41,
          l = c.I && !c.I.qf ? jQuery(c.K).offset().top + jQuery(c.K).outerHeight() : 0,
          n = c.H == c.W() ? c.N.height() : parseFloat(jQuery(c.pages.J).css("height")) - 10;
        c.Eg = c.N.find(c.K).css("margin-left");
        "rgba(0, 0, 0, 0)" == e.toString() && (e = "#555");
        c.N.append(jQuery(String.format("<div class='flowpaper_toc' style='position:absolute;left:0px;top:0px;height:{5}px;width:{2};min-width:{3};opacity: 0;z-index:50;background:{9}'><div style='padding: 10px 10px 10px 10px;background-color:{6};height:{7}px'><div style='height:25px;width:100%'><div class='flowpaper_tblabel' style='margin-left:10px; width: 100%;height:25px;'><img src='{1}' style='vertical-align: middle;width:14px;height:auto;'><span style='margin-left:10px;vertical-align: middle'>{0}</span><img src='{4}' style='float:right;margin-right:5px;cursor:pointer;' class='flowpaper_toc_close' /></div><hr size='1' color='#ffffff' /></div></div>" + (window.zine ? "" : "<div class='flowpaper_bottom_fade'></div></div>"), d, c.Tm, "20%", "250px", c.Qh, n, e, n - 20, l, f)));
        c.$a = c.N.find(".flowpaper_toc");
        jQuery(c.$a.children()[0]).css({
          "border-radius": "3px",
          "-moz-border-radius": "3px"
        });
        jQuery(c.$a.children()[0]).append("<div class='flowpaper_toc_content' style='display:block;position:relative;height:" + (jQuery(c.$a.children()[0]).height() - p) + "px;margin-bottom:50px;width:100%;overflow-y: auto;overflow-x: hidden;'><ul class='flowpaper_accordionSkinClear'>" + ma(c, c.outline.children()).html() + "</ul></div>");
        d = jQuery(".flowpaper_accordionSkinClear").children();
        0 < d.children().length && (d = jQuery(d.get(0)).children(), 0 < d.children().length && jQuery(d.find("li").get(0)).addClass("cur"));
        window.zine ? (jQuery(c.K).css("opacity", 0.7), c.resize(c.L.width(), c.L.height() + k, !1, function() {})) : "TwoPage" != c.H && c.H != c.W() && c.resize(c.L.width(), c.N.height() + 1, !1, function() {});
        jQuery(".flowpaper_accordionSkinClear").qo();
        jQuery(".flowpaper-tocitem").bind("mousedown", function() {
          c.gotoPage(jQuery(this).data("pagenumber"));
        });
        c.H == c.W() ? (k = c.N.width() - c.L.width(), c.L.animate({
          left: Math.abs(k) + "px"
        }, 0)) : c.L.animate({
          left: c.$a.width() + "px"
        }, 0);
        k = 0.5 * c.$a.width();
        jQuery(c.K).width() + k > c.N.width() && (k = 0);
        jQuery(c.K).animate({
          "margin-left": parseFloat(c.Eg) + k + "px"
        }, 200, function() {
          if (window.onresize) {
            window.onresize();
          }
        });
        0 == k && c.$a.css({
          top: h,
          height: c.L.height() - 40 + "px"
        });
        c.H == c.W() && c.I.Ql();
        c.$a.fadeTo("fast", 1);
        c.N.find(".flowpaper_toc_close").bind("mousedown", function() {
          c.Sk();
        });
      }
    },
    Sk: function() {
      this.$a.hide();
      this.N.find(".flowpaper_tocitem, .flowpaper_tocitem_separator").remove();
      this.$a.remove();
      this.$a = null;
      window.zine && (jQuery(this.K).css("opacity", 1), this.resize(this.na, this.za + 33, !1));
      this.L.css({
        left: "0px"
      });
      jQuery(this.K).animate({
        "margin-left": parseFloat(this.Eg) + "px"
      }, 200);
      this.H == this.W() && this.I.Kf();
    },
    setCurrentCursor: function(c) {
      "ArrowCursor" == c && (this.mc = !1, addCSSRule(".flowpaper_pageword", "cursor", "default"), window.annotations || jQuery(".flowpaper_pageword_" + this.P).remove());
      "TextSelectorCursor" == c && (this.mc = !0, this.ye = "flowpaper_selected_default", addCSSRule(".flowpaper_pageword", "cursor", "text"), window.annotations || (this.pages.getPage(this.pages.R - 1), this.pages.getPage(this.pages.R - 2), jQuery(".flowpaper_pageword_" + this.P).remove(), this.pages.Ea()));
      this.I && this.I.setCurrentCursor(c);
      this.pages.setCurrentCursor(c);
      jQuery(this.K).trigger("onCursorChanged", c);
    },
    highlight: function(c) {
      var d = this;
      jQuery.ajax({
        type: "GET",
        url: c,
        dataType: "xml",
        error: function() {},
        success: function(c) {
          jQuery(c).find("Body").attr("color");
          c = jQuery(c).find("Highlight");
          var f = 0,
            h = -1,
            p = -1;
          jQuery(c).find("loc").each(function() {
            f = parseInt(jQuery(this).attr("pg"));
            h = parseInt(jQuery(this).attr("pos"));
            p = parseInt(jQuery(this).attr("len"));
            d.pages.getPage(f).Fe(h, p, !1);
          });
          d.pages.Ea();
        }
      });
    },
    printPaper: function(c) {
      if (this.document.PrintFn) {
        this.document.PrintFn();
      } else {
        if (eb.platform.touchonlydevice) {
          c = "current";
        } else {
          if (!c) {
            jQuery("#modal-print").css("background-color", "#dedede");
            jQuery("#modal-print").smodal({
              minHeight: 255,
              appendTo: this.N
            });
            jQuery("#modal-print").parent().css("background-color", "#dedede");
            return;
          }
        }
        "current" == c && 0 < jQuery(this.K).find(".flowpaper_txtPageNumber").val().indexOf("-") && (c = jQuery(this.K).find(".flowpaper_txtPageNumber").val());
        var d = null,
          e = "ImagePageRenderer";
        if ("ImagePageRenderer" == this.renderer.Gf() || this.document.MixedMode || this.renderer.config.pageImagePattern && this.renderer.config.jsonfile) {
          e = "ImagePageRenderer", d = "{key : '" + this.config.key + "',jsonfile : '" + this.renderer.config.jsonfile + "',compressedJsonFormat : " + (this.renderer.Fa ? this.renderer.Fa : !1) + ",pageImagePattern : '" + this.renderer.config.pageImagePattern + "',JSONDataType : '" + this.renderer.config.JSONDataType + "',signature : '" + this.renderer.config.signature + "',UserCollaboration : " + this.config.UserCollaboration + "}";
        }
        "CanvasPageRenderer" == this.renderer.Gf() && (e = "CanvasPageRenderer", d = "{key : '" + this.config.key + "',jsonfile : '" + this.renderer.config.jsonfile + "',PdfFile : '" + this.renderer.file + "',compressedJsonFormat : " + (this.renderer.Fa ? this.renderer.Fa : !1) + ",pageThumbImagePattern : '" + this.renderer.config.pageThumbImagePattern + "',pageImagePattern : '" + this.renderer.config.pageImagePattern + "',JSONDataType : '" + this.renderer.config.JSONDataType + "',signature : '" + this.renderer.config.signature + "',UserCollaboration : " + this.config.UserCollaboration + "}");
        if (0 < jQuery("#printFrame_" + this.P).length) {
          var f = window.printFrame = eb.browser.msie || eb.browser.ff ? window.open().document : jQuery("#printFrame_" + this.P)[0].contentWindow.document || jQuery("#printFrame_" + this.P)[0].contentDocument,
            h = "",
            p = Math.floor(this.renderer.getDimensions()[0].width),
            k = Math.floor(this.renderer.getDimensions()[0].height);
          jQuery("#printFrame_" + this.P).css({
            width: S(p) + "px",
            height: S(k) + "px"
          });
          f.open();
          h += "<!doctype html><html>";
          h += "<head>";
          h += "<script type='text/javascript' src='" + this.config.jsDirectory + "jquery.min.js'>\x3c/script>";
          h += "<script type='text/javascript' src='" + this.config.jsDirectory + "jquery.extensions.min.js'>\x3c/script>";
          h += '<script type="text/javascript" src="' + this.config.jsDirectory + 'flowpaper.js">\x3c/script>';
          h += '<script type="text/javascript" src="' + this.config.jsDirectory + 'flowpaper_handlers.js">\x3c/script>';
          h += "<script type='text/javascript' src='" + this.config.jsDirectory + "FlowPaperViewer.js'>\x3c/script>";
          eb.browser.safari || this.renderer.sa && eb.platform.mac || (h += "<script type='text/javascript'>window.printWidth = '" + p + "pt';window.printHeight = '" + k + "pt';\x3c/script>");
          h += "<style type='text/css' media='print'>html, body { height:100%; } body { margin:0; padding:0; } .flowpaper_ppage { clear:both;display:block;max-width:" + p + "pt !important;max-height:" + k + "pt !important;margin-top:0px;} .ppage_break { page-break-after : always; } .ppage_none { page-break-after : avoid; }</style>";
          this.renderer.sa ? this.renderer.sa && (eb.browser.safari || eb.platform.mac) && (h += "<style type='text/css' media='print'>@page { size: auto; margin: 0mm; }</style>") : h += "<style type='text/css' media='print'>@supports ((size:A4) and (size:1pt 1pt)) {@page { margin: 0mm 0mm 0mm 0mm; size: " + p + "pt " + k + "pt;}}</style>";
          h += "<link rel='stylesheet' type='text/css' href='" + this.config.cssDirectory + "flowpaper.css' />";
          h += "</head>";
          h += "<body>";
          h += '<script type="text/javascript">';
          h += "function waitForLoad(){";
          h += "if(window.jQuery && window.$FlowPaper && window.print_flowpaper_Document ){";
          h += "window.focus();";
          h += "window.print_flowpaper_Document('" + e + "'," + d + ",'" + c + "', " + this.xm() + ", " + this.getTotalPages() + ", '" + this.config.jsDirectory + "');";
          h += "}else{setTimeout(function(){waitForLoad();},1000);}";
          h += "}";
          h += "waitForLoad();";
          h += "\x3c/script>";
          h += "</body></html>";
          f.write(h);
          eb.browser.msie || setTimeout("window['printFrame'].close();", 3000);
          eb.browser.msie && 9 <= eb.browser.version && f.close();
        }
      }
    },
    switchMode: function(c, d) {
      var e = this;
      e.H == c || ("TwoPage" == c || "BookView" == c) && 2 > e.getTotalPages() || (d > e.getTotalPages() && (d = e.getTotalPages()), e.Qa && e.Kf(), jQuery(e.pages.J).In(function() {
        e.I && e.I.switchMode(c, d);
        "Tile" == c && (e.H = "ThumbView");
        "Portrait" == c && (e.H = "SinglePage" == e.vb ? "SinglePage" : "Portrait");
        "SinglePage" == c && (e.H = "SinglePage");
        "TwoPage" == c && (e.H = "TwoPage");
        "BookView" == c && (e.H = "BookView");
        e.Ag();
        e.pages.fp();
        e.renderer.Me = -1;
        e.renderer.ya && e.renderer.ya.kp();
        "TwoPage" != c && "BookView" != c && (null != d ? e.pages.R = d - 1 : d = 1);
        e.Rh(d);
        jQuery(e.K).trigger("onViewModeChanged", c);
        setTimeout(function() {
          !eb.platform.touchdevice || eb.platform.touchdevice && ("SinglePage" == c || "Portrait" == c) ? e.fitheight() : "TwoPage" != c && "BookView" != c && c != e.W() && e.fitwidth();
          "TwoPage" != c && "BookView" != c && e.Gc(d);
        }, 100);
      }));
    },
    fitwidth: function() {
      if ("TwoPage" != this.H && "BookView" != this.H && "ThumbView" != this.H) {
        var c = jQuery(this.pages.J).width() - (this.document.DisableOverflow ? 0 : 15);
        this.Qa && (c -= 100);
        var d = 1 < this.getTotalPages() ? this.da - 1 : 0;
        0 > d && (d = 0);
        this.DisplayRange && (d = this.DisplayRange[0] - 1);
        var e = this.pages.getPage(d).dimensions.na / this.pages.getPage(d).dimensions.za;
        if (eb.platform.touchonlydevice) {
          f = c / (this.pages.getPage(d).Ma * e) - (this.document.DisableOverflow ? 0 : 0.03), window.FitWidthScale = f, this.hb(f), this.pages.wj();
        } else {
          var f = c / (this.pages.getPage(d).Ma * this.document.MaxZoomSize * e) - (this.document.DisableOverflow ? 0 : 0.012);
          if (90 == this.pages.getPage(d).rotation || 270 == this.pages.getPage(d).rotation) {
            f = this.Ve();
          }
          window.FitWidthScale = f;
          jQuery(this.K).trigger("onScaleChanged", f / this.document.MaxZoomSize);
          if (this.document.DisableOverflow) {
            for (var h = S(parseFloat(window.printHeight)) - 0, p = this.pages.getPage(d).Ma * this.document.MaxZoomSize * f, k = this.pages.getPage(d).Ma * this.pages.getPage(d).le() * this.document.MaxZoomSize * f, l = 0; p > h;) {
              f = c / (this.pages.getPage(d).Ma * this.document.MaxZoomSize * e) + l, p = this.pages.getPage(d).Ma * this.document.MaxZoomSize * f, k = this.pages.getPage(d).Ma * this.pages.getPage(d).le() * this.document.MaxZoomSize * f, l -= 0.0001;
            }
            this.N.css("width", Math.floor(k) + "px");
            this.N.css("height", Math.floor(p) + "px");
          }
          f * this.document.MaxZoomSize >= this.document.MinZoomSize && f <= this.document.MaxZoomSize && ("Portrait" == this.H ? this.hb(this.document.MaxZoomSize * f, {
            lg: !0
          }) : this.hb(this.document.MaxZoomSize * f));
        }
      }
    },
    getCurrentRenderingMode: function() {
      return this.renderer instanceof CanvasPageRenderer ? "html5" : "html";
    },
    hb: function(c, d) {
      var e = this;
      if (e.initialized && e.pages) {
        e.H == e.W() && 1 == c && (d = d || {}, d.lg = !0);
        if (!d || d && !d.lg) {
          var f = 100 / (100 * e.document.ZoomInterval);
          c = Math.round(c * f) / f;
        }
        e.H == e.W() && 1 > c && (c = 1);
        jQuery(e.K).trigger("onScaleChanged", c / e.document.MaxZoomSize);
        var f = jQuery(e.pages.J).prop("scrollHeight"),
          h = jQuery(e.pages.J).scrollTop(),
          f = 0 < h ? h / f : 0;
        null != e.vf && (window.clearTimeout(e.vf), e.vf = null);
        e.pages.cp() && e.scale != c && (jQuery(".flowpaper_annotation_" + e.P).remove(), jQuery(".flowpaper_pageword_" + e.P).remove());
        e.vf = setTimeout(function() {
          e.jc();
          e.pages && e.pages.Ea();
        }, 500);
        if (0 < c) {
          c < e.config.document.MinZoomSize && (c = this.config.document.MinZoomSize);
          c > e.config.document.MaxZoomSize && (c = this.config.document.MaxZoomSize);
          e.pages.Pa(c, d);
          e.scale = c;
          !d || d && !d.Vc ? e.pages.pages[0] && e.pages.pages[0].Ie() : e.pages.Vg(d.Ob, d.oc);
          jQuery(e.K).trigger("onZoomFactorChanged", {
            Bf: c,
            F: e
          });
          if ("undefined" != window.FitWidthScale && Math.round(100 * window.FitWidthScale) == Math.round(c / e.document.MaxZoomSize * 100)) {
            if (jQuery(e.K).trigger("onFitModeChanged", "FitWidth"), window.onFitModeChanged) {
              window.onFitModeChanged("Fit Width");
            }
          } else {
            if ("undefined" != window.FitHeightScale && Math.round(100 * window.FitHeightScale) == Math.round(c / e.document.MaxZoomSize * 100)) {
              if (jQuery(e.K).trigger("onFitModeChanged", "FitHeight"), window.onFitModeChanged) {
                window.onFitModeChanged("Fit Height");
              }
            } else {
              if (jQuery(e.K).trigger("onFitModeChanged", "FitNone"), window.onFitModeChanged) {
                window.onFitModeChanged("Fit None");
              }
            }
          }
          e.H != e.W() && (e.pages.cd(), e.pages.ed(), e.pages.wj(), h = jQuery(e.pages.J).prop("scrollHeight"), eb.browser.capabilities.yb && (!d || d && !d.Vc ? jQuery(e.pages.J).scrollTo({
            left: "50%",
            top: h * f + "px"
          }, 0, {
            axis: "xy"
          }) : jQuery(e.pages.J).scrollTo({
            top: h * f + "px"
          }, 0, {
            axis: "y"
          })));
        }
      }
    },
    jc: function() {
      if (this.renderer) {
        null != this.vf && (window.clearTimeout(this.vf), this.vf = null);
        "CanvasPageRenderer" == this.renderer.Gf() && (jQuery(".flowpaper_pageword_" + this.P + ":not(.flowpaper_selected_searchmatch)").remove(), window.annotations && this.pages.Ea());
        this.pages.Vf && 0 <= this.pages.Vf && this.pages.pages[this.pages.Vf].Xa && this.renderer.$b(this.pages.pages[this.pages.Vf], !0);
        for (var c = 0; c < this.document.numPages; c++) {
          this.pages.Ua(c) && c != this.pages.Vf && this.pages.pages[c] && (this.pages.pages[c].Xa ? this.renderer.$b(this.pages.pages[c], !0) : this.pages.pages[c].pa = !1);
        }
      }
    },
    Zoom: function(c, d) {
      !eb.platform.touchonlydevice || "TwoPage" != this.H && "BookView" != this.H ? (c > this.document.MaxZoomSize && (c = this.document.MaxZoomSize), c = c / this.document.MaxZoomSize, jQuery(this.K).trigger("onScaleChanged", c), c * this.document.MaxZoomSize >= this.document.MinZoomSize && c <= this.document.MaxZoomSize && this.hb(this.document.MaxZoomSize * c, d)) : 1 < c ? "TwoPage" == this.H || "BookView" == this.H ? this.pages.ne() : "Portrait" != this.H && "SinglePage" != this.H || this.fitwidth() : "TwoPage" == this.H || "BookView" == this.H ? this.pages.md() : "Portrait" != this.H && "SinglePage" != this.H || this.fitheight();
    },
    ZoomIn: function() {
      this.Zoom(this.scale + 3 * this.document.ZoomInterval);
    },
    ZoomOut: function() {
      if ("Portrait" == this.H || "SinglePage" == this.H) {
        null != this.pages.jScrollPane ? (this.pages.jScrollPane.data("jsp").scrollTo(0, 0, !1), this.pages.jScrollPane.data("jsp").reinitialise(this.Yc)) : this.pages.M(this.pages.J).parent().scrollTo({
          left: 0,
          top: 0
        }, 0, {
          axis: "xy"
        });
      }
      this.Zoom(this.scale - 3 * this.document.ZoomInterval);
    },
    sliderChange: function(c) {
      c > this.document.MaxZoomSize || (c = c / this.document.MaxZoomSize, c * this.document.MaxZoomSize >= this.document.MinZoomSize && c <= this.document.MaxZoomSize && this.hb(this.document.MaxZoomSize * c));
    },
    Dh: function() {
      var c = this;
      if (!eb.platform.mobilepreview && !eb.platform.lb && (c.$a && c.Sk(), !c.Qa)) {
        c.N.find(".flowpaper_searchabstract_result, .flowpaper_searchabstract_result_separator").remove();
        var d = c.df = null != c.toolbar && null != c.toolbar.Ka ? c.toolbar.la(c.toolbar.Ka, "Search") : "Search",
          e = c.H == c.W() ? c.N.height() - 0 : parseFloat(jQuery(c.pages.J).css("height")) - 10,
          f = c.H == c.W() ? jQuery(c.K).css("background-color") : "#c8c8c8",
          h = c.H == c.W() ? "40px" : jQuery(c.K).height() + 2,
          p = c.H == c.W() ? "color:#ededed" : "color:#555555;",
          k = (c.W(), 40),
          l = c.H == c.W() ? 0 : 41;
        "rgba(0, 0, 0, 0)" == f.toString() && (f = "#555");
        c.Eg = c.N.find(c.K).css("margin-left");
        c.H == c.W() ? (jQuery(c.K).css("opacity", 0.7), c.N.append(jQuery(String.format("<div class='flowpaper_searchabstracts' style='position:absolute;left:0px;top:{8}px;height:{5}px;width:{2};min-width:{3};opacity: 0;z-index:50;{9}'><div style='padding: 10px 10px 10px 10px;background-color:{6};height:{7}px'><div style='height:25px;width:100%'><div class='flowpaper_tblabel' style='margin-left:10px; width: 100%;height:25px;'><img src='{1}' style='vertical-align: middle'><span style='margin-left:10px;vertical-align: middle'>{0}</span><img src='{4}' style='float:right;margin-right:5px;cursor:pointer;' class='flowpaper_searchabstracts_close' /></div><hr size='1' color='#ffffff' /></div></div>", d, c.Tj, "20%", "250px", c.Qh, e, f, e - 20, 0, c.I.backgroundImage ? "" : "background-color:" + c.I.backgroundColor))), c.Qa = c.N.find(".flowpaper_searchabstracts"), jQuery(c.Qa.children()[0]).css({
          "border-radius": "0 3px 3px 0px",
          "-moz-border-radius": "3px"
        }), jQuery(c.Qa.children()[0]).append("<div class='flowpaper_searchabstracts_content' style='display:block;position:relative;height:" + (jQuery(c.Qa.children()[0]).height() - k) + "px;margin-bottom:50px;width:100%;overflow-y: auto;overflow-x: hidden;'></div>"), c.resize(c.L.width(), c.L.height() + l, !1, function() {}), d = c.N.width() - c.L.width(), c.L.animate({
          left: Math.abs(d) + "px"
        }, 0)) : (c.N.append(jQuery(String.format("<div class='flowpaper_searchabstracts' style='position:absolute;left:0px;top:0px;height:{5}px;width:{2};min-width:{3};opacity: 0;z-index:13;overflow:hidden;'><div style='margin: 0px 0px 0px 0px;padding: 10px 7px 10px 10px;background-color:{6};height:{7}px'><div style='height:25px;width:100%' <div class='flowpaper_tblabel' style='margin-left:10px; width: 100%;height:25px;'><img src='{1}' style='vertical-align: middle'><span style='margin-left:10px;vertical-align: middle'>{0}</span><img src='{4}' style='float:right;margin-right:5px;cursor:pointer;' class='flowpaper_searchabstracts_close' /></div><div class='flowpaper_bottom_fade'></div></div></div>", d, c.Tj, "20%", "250px", c.Qh, parseFloat(jQuery(c.pages.J).css("height")) + 10, f, c.N.height() - 58))), c.Qa = c.N.find(".flowpaper_searchabstracts"), jQuery(c.Qa.children()[0]).append("<div class='flowpaper_searchabstracts_content' style='display:block;position:relative;height:" + e + "px;margin-bottom:50px;width:100%;overflow-y: auto;overflow-x: hidden;'></div>"), "TwoPage" != c.H && c.H != c.W() && c.resize(c.L.width(), c.N.height() + 1, !1, function() {}), c.L.animate({
          left: c.Qa.width() / 2 + "px"
        }, 0), c.document.FitWidthOnLoad ? c.fitwidth() : c.fitheight());
        d = 0.5 * c.Qa.width();
        jQuery(c.K).width() + d > c.N.width() && (d = 0);
        jQuery(c.K).animate({
          "margin-left": parseFloat(c.Eg) + d + "px"
        }, 200, function() {
          if (window.onresize) {
            window.onresize();
          }
        });
        0 == d && c.Qa.css({
          top: h,
          height: parseFloat(jQuery(c.pages.J).css("height")) + 10 + "px"
        });
        c.H == c.W() && c.I.Dh();
        c.Qa.fadeTo("fast", 1);
        var n = c.N.find(".flowpaper_searchabstracts_content");
        jQuery(c).bind("onSearchAbstractAdded", function(d, e) {
          var f = e.ee.Rn;
          100 < f.length && (f = f.substr(0, 100) + "...");
          f = f.replace(new RegExp(c.Td, "g"), "<font style='color:#ffffff'>[" + c.Td + "]</font>");
          f = "<b>p." + c.toolbar.yd(e.ee.pageIndex + 1, e.ee.pageIndex + 1, !0) + "</b> : " + f;
          n.append(jQuery(String.format("<div id='flowpaper_searchabstract_item_{1}' style='{2}' class='flowpaper_searchabstract_result'>{0}</div><hr size=1 color='#777777' style='margin-top:8px;' class='flowpaper_searchabstract_result_separator' />", f, e.ee.id, p)));
          jQuery("#flowpaper_searchabstract_item_" + e.ee.id).bind("mousedown", function(d) {
            c.Ta = e.ee.pageIndex + 1;
            c.ve = e.ee.ip;
            c.ac = -1;
            c.searchText(c.Td, !1);
            d.preventDefault && d.preventDefault();
            d.returnValue = !1;
          });
          jQuery("#flowpaper_searchabstract_item_" + e.ee.id).bind("mouseup", function(c) {
            c.preventDefault && c.preventDefault();
            c.returnValue = !1;
          });
        });
        c.N.find(".flowpaper_searchabstracts_close").bind("mousedown", function() {
          c.Kf();
        });
      }
    },
    Kf: function() {
      this.Qa && (this.L.css({
        left: "0px"
      }), this.Qa.remove(), this.Qa = null, this.N.find(".flowpaper_searchabstract_result, .flowpaper_searchabstract_result_separator").remove(), this.H == this.W() ? (jQuery(this.K).css("opacity", 1), this.resize(this.N.width(), this.L.height(), !1)) : "TwoPage" == this.H ? (this.L.css({
        left: "0px",
        width: "100%"
      }), this.fitheight()) : this.resize(this.N.width(), this.N.height() + 1, !1), jQuery(this.K).animate({
        "margin-left": parseFloat(this.Eg) + "px"
      }, 200), this.H == this.W() && this.I.Kf());
      jQuery(this).unbind("onSearchAbstractAdded");
    },
    Xk: function(c, d) {
      jQuery(".flowpaper_searchabstract_blockspan").remove();
      var e = this.renderer.getNumPages();
      d || (d = 0);
      for (var f = d; f < e; f++) {
        this.Wm(f, c);
      }
      this.H != this.W() && this.N.find(".flowpaper_searchabstracts_content").append(jQuery("<div class='flowpaper_searchabstract_blockspan' style='display:block;clear:both;height:200px'></div>"));
    },
    Wm: function(c, d) {
      var e = this.renderer.qa;
      if (null != e[c]) {
        -1 < e[c].toLowerCase().indexOf("actionuri") && (e[c] = e[c].replace(/actionuri(.*?)\):/gi, "")); - 1 < e[c].toLowerCase().indexOf("actiongotor") && (e[c] = e[c].replace(/actiongotor(.*?)\):/gi, "")); - 1 < e[c].toLowerCase().indexOf("actiongoto") && (e[c] = e[c].replace(/actiongoto(.*?)\):/gi, ""));
        for (var f = e[c].toLowerCase().indexOf(d), h = 0; 0 <= f;) {
          var p = 0 < f - 50 ? f - 50 : 0,
            k = f + 75 < e[c].length ? f + 75 : e[c].length,
            l = this.Oc.length;
          this.Oc.lf[l] = [];
          this.Oc.lf[l].pageIndex = c;
          this.Oc.lf[l].ip = h;
          this.Oc.lf[l].id = this.P + "_" + c + "_" + h;
          this.Oc.lf[l].Rn = e[c].substr(p, k - p);
          f = e[c].toLowerCase().indexOf(d, f + 1);
          jQuery(this).trigger("onSearchAbstractAdded", {
            ee: this.Oc.lf[l]
          });
          h++;
        }
      } else {
        null == this.Fl && this.pm(d, c);
      }
    },
    pm: function(c, d) {
      var e = this;
      e.Fl = setTimeout(function() {
        null == e.renderer.nd ? e.renderer.tc(d + 1, !1, function() {
          e.Fl = null;
          e.Xk(c, d);
        }) : e.pm(c, d);
      }, 100);
    },
    searchText: function(c, d) {
      var e = this;
      if (null != c && (null == c || 0 != c.length)) {
        if (void 0 !== d || "Portrait" != e.H && "SinglePage" != e.H && "TwoPage" != e.H && e.H != e.W() || !e.document.EnableSearchAbstracts || eb.platform.mobilepreview || (d = !0), d && e.H == e.W() && 1 < e.scale && (e.renderer.mb && e.renderer.Nc && e.renderer.Nc(), e.Zoom(1)), jQuery(e.K).find(".flowpaper_txtSearch").val() != c && jQuery(e.K).find(".flowpaper_txtSearch").val(c), "ThumbView" == e.H) {
          e.switchMode("Portrait"), setTimeout(function() {
            e.searchText(c);
          }, 1000);
        } else {
          var f = e.renderer.qa,
            h = e.renderer.getNumPages();
          e.Ah || (e.Ah = 0);
          if (0 == e.renderer.ya.Ra.length && 10 > e.Ah) {
            window.clearTimeout(e.jp), e.jp = setTimeout(function() {
              e.searchText(c, d);
            }, 500), e.Ah++;
          } else {
            e.Ah = 0;
            e.ve || (e.ve = 0);
            e.Ta || (e.Ta = -1);
            null != c && 0 < c.length && (c = c.toLowerCase());
            e.Td != c && (e.ac = -1, e.Td = c, e.ve = 0, e.Ta = -1, e.Oc = [], e.Oc.lf = []); - 1 == e.Ta ? (e.Ta = parseInt(e.da), e.config.document.RTLMode && (e.Ta = parseInt(e.da) - h + 1)) : e.ac = e.ac + c.length;
            0 == e.Oc.lf.length && e.Oc.searchText != c && d && (e.Oc.searchText != c && e.N.find(".flowpaper_searchabstract_result, .flowpaper_searchabstract_result_separator").remove(), e.Oc.searchText = c, e.Dh(), e.Xk(c));
            1 > e.Ta && (e.Ta = 1);
            for (; e.Ta - 1 < h;) {
              var p = f[e.Ta - 1];
              if (e.renderer.wa && null == p) {
                jQuery(e.renderer).trigger("UIBlockingRenderingOperation", e.P);
                e.Dp = e.Ta;
                e.renderer.tc(e.Ta, !1, function() {
                  p = f[e.Ta - 1];
                  e.Dp = null;
                });
                return;
              }
              e.ac = p.indexOf(c, -1 == e.ac ? 0 : e.ac);
              if (0 <= e.ac) {
                e.da == e.Ta || !(e.H == e.W() && e.da != e.Ta + 1 || "BookView" == e.H && e.da != e.Ta + 1 || "TwoPage" == e.H && e.da != e.Ta - 1 || "SinglePage" == e.H && e.da != e.Ta) || "TwoPage" != e.H && "BookView" != e.H && "SinglePage" != e.H && e.H != e.W() ? (e.ve++, e.renderer.sb ? this.pages.getPage(e.Ta - 1).load(function() {
                  e.pages.getPage(e.Ta - 1).Cc(e.Td, !1, e.ac);
                }) : ("Portrait" == e.H && this.pages.getPage(e.Ta - 1).load(function() {
                  e.pages.getPage(e.Ta - 1).Cc(e.Td, !1, e.ac);
                }), "TwoPage" != e.H && "SinglePage" != e.H && e.H != e.W() || this.pages.getPage(e.Ta - 1).Cc(e.Td, !1, e.ac))) : e.gotoPage(e.Ta, function() {
                  e.ac = e.ac - c.length;
                  e.searchText(c);
                });
                break;
              }
              e.Ta++;
              e.ac = -1;
              e.ve = 0;
            } - 1 == e.ac && (e.ac = -1, e.ve = 0, e.Ta = -1, e.Jb(), alert(null != e.toolbar && null != e.toolbar.Ka ? e.toolbar.la(e.toolbar.Ka, "Finishedsearching") : "No more search matches."), e.gotoPage(1));
          }
        }
      }
    },
    fitheight: function() {
      if (this.H != this.W()) {
        try {
          if (eb.platform.touchdevice) {
            if (c = this.Ve()) {
              window.FitHeightScale = c, this.hb(c, {
                lg: !0
              }), this.pages.wj();
            }
          } else {
            var c = this.Ve();
            window.FitHeightScale = c;
            jQuery(this.K).trigger("onScaleChanged", c / this.document.MaxZoomSize);
            c * this.document.MaxZoomSize >= this.document.MinZoomSize && c <= this.document.MaxZoomSize && ("Portrait" == this.H ? this.hb(this.document.MaxZoomSize * c, {
              lg: !0
            }) : this.hb(this.document.MaxZoomSize * c));
          }
        } catch (d) {}
      }
    },
    fh: function() {
      var c = jQuery(this.pages.J).width() - 15,
        d = 1 < this.getTotalPages() ? this.da - 1 : 0;
      0 > d && (d = 0);
      this.DisplayRange && (d = this.DisplayRange[0] - 1);
      var e = this.pages.getPage(d).dimensions.na / this.pages.getPage(d).dimensions.za;
      return eb.platform.touchdevice ? c / (this.pages.getPage(d).Ma * e) - ("SinglePage" == this.H ? 0.1 : 0.03) : c / (this.pages.getPage(d).Ma * this.document.MaxZoomSize * e) - 0.012;
    },
    Ve: function() {
      this.da - 1 && (this.da = 1);
      if ("Portrait" == this.H || "SinglePage" == this.H || "TwoPage" == this.H || "BookView" == this.H) {
        var c = this.pages.getPage(this.da - 1).dimensions.width / this.pages.getPage(this.da - 1).dimensions.height;
        if (eb.platform.touchdevice) {
          d = jQuery(this.L).height() - ("TwoPage" == this.H || "BookView" == this.H ? 40 : 0), "SinglePage" == this.H && (d -= 25), d /= this.pages.getPage(this.da - 1).Ma, e = this.pages.getPage(this.da - 1), e = e.dimensions.na / e.dimensions.za * e.Ma * d, ("TwoPage" == this.H || "BookView" == this.H) && 2 * e > this.L.width() && (d = this.L.width() - 0, d /= 4 * this.pages.getPage(this.da - 1).Ma);
        } else {
          var d = jQuery(this.pages.J).height() - ("TwoPage" == this.H || "BookView" == this.H ? 25 : 0);
          this.document.DisableOverflow && (d = S(parseFloat(window.printHeight)));
          var d = d / (this.pages.getPage(this.da - 1).Ma * this.document.MaxZoomSize),
            e = this.pages.getPage(this.da - 1),
            e = e.dimensions.na / e.dimensions.za * e.Ma * this.document.MaxZoomSize * d;
          ("TwoPage" == this.H || "BookView" == this.H) && 2 * e > this.L.width() && !this.document.DisableOverflow && (d = (jQuery(this.L).width() - ("TwoPage" == this.H || "BookView" == this.H ? 40 : 0)) / 1.48, d = d / 1.6 / (this.pages.getPage(this.da - 1).Ma * this.document.MaxZoomSize * c));
        }
        return window.FitHeightScale = d;
      }
      if (this.H == this.W()) {
        return d = 1, window.FitHeightScale = d;
      }
    },
    next: function() {
      var c = this;
      c.Wi || c.H == c.W() ? c.H == c.W() && c.pages.next() : (c.Wi = setTimeout(function() {
        window.clearTimeout(c.Wi);
        c.Wi = null;
      }, 700), c.pages.next());
    },
    gotoPage: function(c, d) {
      var e = this;
      e.pages && (e.config.document.RTLMode && (c = e.renderer.S.length - c + 1), "ThumbView" == e.H ? eb.platform.ios ? e.I ? e.I.Up(c) : e.switchMode("Portrait", c) : e.switchMode("Portrait", c) : ("Portrait" == e.H && e.pages.scrollTo(c), "SinglePage" == e.H && setTimeout(function() {
        e.pages.sg(c, d);
      }, 300), "TwoPage" != e.H && "BookView" != e.H || setTimeout(function() {
        e.pages.tg(c, d);
      }, 300), e.I && e.I.gotoPage(c, d)));
    },
    rotate: function() {
      var c = this.getCurrPage() - 1; - 1 == c && (c = 0);
      this.pages.rotate(c);
      window.annotations && (jQuery(".flowpaper_pageword_" + this.P).remove(), this.jc(), this.pages.Ea());
    },
    getCurrPage: function() {
      return null != this.pages ? this.H != this.W() ? this.pages.R + 1 : this.pages.R : 1;
    },
    np: function() {
      this.version = "3.2.9";
    },
    mp: function() {
      this.build = "29-March-2019";
    },
    getTotalPages: function() {
      return this.pages.getTotalPages();
    },
    Gc: function(c) {
      var d = this;
      d.H != d.W() && (this.da = c, this.pages.R = this.da - 1);
      c > d.getTotalPages() && (c = c - 1, this.pages.R = c);
      "TwoPage" != this.H && "BookView" != this.H || this.pages.R != this.pages.getTotalPages() - 1 || 0 == this.pages.R % 2 || (this.pages.R = this.pages.R + 1);
      d.I && (0 == c && (c++, this.da = c), d.I.Gc(c));
      d.vc && (jQuery(".flowpaper_mark_video_maximized").remove(), jQuery(".flowpaper_mark_video_maximized_closebutton").remove(), d.vc = null);
      var e = jQuery(".flowpaper_mark_video_" + (c - 1) + '[data-autoplay="true"]');
      if (e.length) {
        for (var f = 0; f < e.length; f++) {
          jQuery(e[f]).trigger("mouseup");
        }
      }
      0 < jQuery(".flowpaper_mark_video").find("iframe,video").length && jQuery(".flowpaper_mark_video").find("iframe,video").each(function() {
        try {
          var c = jQuery(this).closest(".flowpaper_page").attr("id"),
            e = parseInt(c.substr(14, c.lastIndexOf("_") - 14));
          if (0 == e && 0 != d.pages.R - 1 || !d.I.Ba && 0 < e && e != d.pages.R - 1 && e != d.pages.R - 2 || d.I.Ba && e != d.pages.R - 1) {
            jQuery(this).parent().remove();
            var f = d.pages.pages[e];
            f.Nf(f.Ti ? f.Ti : f.scale, f.Vb());
          }
        } catch (g) {}
      });
      this.toolbar.Zp(c);
      null != d.plugin && ("TwoPage" == this.H ? (d.plugin.Yg(this.pages.R + 1), d.plugin.Yg(this.pages.R + 2)) : "BookView" == this.H ? (1 != c && d.plugin.Yg(this.pages.R), d.plugin.Yg(this.pages.R + 1)) : d.plugin.Yg(this.da));
    },
    addLink: function(c, d, e, f, h, p, k, l, n) {
      window[this.af].addLink = this.addLink;
      c = parseInt(c);
      null == this.Z[c - 1] && (this.Z[c - 1] = []);
      var q = {
        type: "link"
      };
      q.href = d;
      q.so = e;
      q.uo = f;
      q.width = h;
      q.height = p;
      q.yp = k;
      q.zp = l;
      q.Go = n;
      this.Z[c - 1][this.Z[c - 1].length] = q;
    },
    addVideo: function(c, d, e, f, h, p, k, l, n) {
      window[this.af].addVideo = this.addVideo;
      c = parseInt(c);
      null == this.Z[c - 1] && (this.Z[c - 1] = []);
      var q = {
        type: "video"
      };
      q.src = d;
      q.url = e;
      q.Fj = f;
      q.Gj = h;
      q.width = p;
      q.height = k;
      q.Eo = l;
      q.autoplay = "true" == n + "";
      this.Z[c - 1][this.Z[c - 1].length] = q;
    },
    Xj: function(c, d, e, f, h, p, k, l) {
      window[this.af].addIFrame = this.Xj;
      c = parseInt(c);
      null == this.Z[c - 1] && (this.Z[c - 1] = []);
      var n = {
        type: "iframe"
      };
      n.src = d;
      n.url = e;
      n.Ai = f;
      n.Bi = h;
      n.width = p;
      n.height = k;
      n.Do = l;
      this.Z[c - 1][this.Z[c - 1].length] = n;
    },
    addImage: function(c, d, e, f, h, p, k, l) {
      c = parseInt(c);
      null == this.Z[c - 1] && (this.Z[c - 1] = []);
      var n = {
        type: "image"
      };
      n.src = d;
      n.jh = e;
      n.kh = f;
      n.width = h;
      n.height = p;
      n.href = k;
      n.io = l;
      this.Z[c - 1][this.Z[c - 1].length] = n;
    },
    openFullScreen: function() {
      var c = this;
      FLOWPAPER.getParameterByName("autoplay") && (c.document.FullScreenAsMaxWindow = !0);
      if (c.Wb) {
        c.N.prepend("<div id='modal-maximize' class='modal-content flowpaper_printdialog' style='overflow:hidden;;'><div style='background-color:#fff;color:#000;padding:10px 10px 10px 10px;height:155px;padding-bottom:20px;'>It's not possible to maximize the viewer from within the Desktop Publisher. <br/><br/>You can try this feature by clicking on 'Publish' and then 'View in Browser'.<br/><br/><a class='flowpaper_printdialog_button' id='bttnMaximizeDisabledOK'>OK</a></div></div>"), c.Pr = jQuery("#modal-maximize").smodal({
          minHeight: 155,
          appendTo: c.N
        }), jQuery("#bttnMaximizeDisabledOK").bind("click", function(c) {
          jQuery.smodal.close();
          c.stopImmediatePropagation();
          jQuery("#modal-maximize").remove();
          return !1;
        });
      } else {
        var d = document.Cb || document.mozFullScreen || document.webkitIsFullScreen || window.Cm || window.cg || document.fullscreenElement || document.msFullscreenElement,
          e = c.N.get(0);
        if (d) {
          return document.exitFullscreen ? document.exitFullscreen() : document.mozCancelFullScreen ? document.mozCancelFullScreen() : document.webkitExitFullscreen ? document.webkitExitFullscreen() : document.msExitFullscreen && document.msExitFullscreen(), window.cg && window.close(), !1;
        }
        "0" != c.N.css("top") && (c.Lo = c.N.css("top"));
        "0" != c.N.css("left") && (c.Ko = c.N.css("left"));
        c.H == c.W() && 1 < c.scale && (c.pages.md(), c.T.show(), c.T.animate({
          opacity: 1
        }, 100));
        c.na = c.N.width();
        c.za = c.N.height();
        c.PreviewMode && c.pages.ol && (c.PreviewMode = !1, c.Nh = !0, c.I.jb.Yo(c.pages, c.L), c.I.Ap());
        c.N.css({
          visibility: "hidden"
        });
        jQuery(document).bind("webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange", function() {
          setTimeout(function() {
            if (window.navigator.standalone || document.fullScreenElement && null != document.fullScreenElement || document.mozFullScreen || document.webkitIsFullScreen) {
              eb.browser.safari ? window.zine ? c.resize(screen.width, screen.height) : c.config.BottomToolbar ? c.resize(screen.width, screen.height - jQuery(c.K).height() - 70) : c.resize(screen.width, screen.height - jQuery(c.K).height()) : window.zine ? c.resize(jQuery(document).width(), jQuery(document).height()) : c.resize(window.innerWidth, window.innerHeight);
            }
            window.annotations && (jQuery(".flowpaper_pageword_" + c.P).remove(), c.jc(), c.pages.Ea());
            c.N.css({
              visibility: "visible"
            });
          }, 500);
          jQuery(document).bind("webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange", function() {
            jQuery(document).unbind("webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange");
            c.Li = !1;
            c.N.css({
              top: c.Lo,
              left: c.Ko
            });
            c.Nh && (c.PreviewMode = !0, c.I.Qk(), c.I.ih(), setTimeout(function() {
              c.PreviewMode && c.I.ih();
            }, 1000));
            c.H == c.W() && 1 < c.scale ? c.pages.md(function() {
              c.T.show();
              c.T.animate({
                opacity: 1
              }, 100);
              c.resize(c.na, c.za - 2);
              jQuery(c.K).trigger("onFullscreenChanged", !1);
            }) : (c.resize(c.na, c.za - 2), jQuery(c.K).trigger("onFullscreenChanged", !1));
            jQuery(document).unbind("webkitfullscreenchange mozfullscreenchange fullscreenchange MSFullscreenChange");
            c.Nh && (c.Nh = !1, c.I.jb.Sh(c.pages, c.L));
            window.annotations && (jQuery(".flowpaper_pageword_" + c.P).remove(), c.jc(), c.pages.Ea());
          });
          window.clearTimeout(c.kj);
          c.kj = setTimeout(function() {
            !c.PreviewMode && c.I && c.I.fb && c.I.rj();
          }, 1000);
        });
        d = eb.platform.android && !e.webkitRequestFullScreen || eb.platform.ios;
        c.document.FullScreenAsMaxWindow || !document.documentElement.requestFullScreen || d ? c.document.FullScreenAsMaxWindow || !document.documentElement.mozRequestFullScreen || d ? c.document.FullScreenAsMaxWindow || !document.documentElement.webkitRequestFullScreen || d ? !c.document.FullScreenAsMaxWindow && document.documentElement.msRequestFullscreen ? (c.N.css({
          visibility: "hidden"
        }), c.Li ? (c.Li = !1, window.document.msExitFullscreen()) : (c.Li = !0, e.msRequestFullscreen()), setTimeout(function() {
          c.N.css({
            visibility: "visible"
          });
          c.resize(window.outerWidth, window.outerHeight);
          window.annotations && (jQuery(".flowpaper_pageword_" + c.P).remove(), c.jc(), c.pages.Ea());
        }, 500)) : (c.Io(), setTimeout(function() {
          c.N.css({
            visibility: "visible"
          });
        }, 500)) : (c.N.css({
          visibility: "hidden"
        }), e.webkitRequestFullScreen(eb.browser.safari && 10 > eb.browser.Kb ? 0 : {}), c.N.css({
          left: "0px",
          top: "0px"
        })) : (c.N.css({
          visibility: "hidden"
        }), e.mozRequestFullScreen(), c.N.css({
          left: "0px",
          top: "0px"
        })) : (c.N.css({
          visibility: "hidden"
        }), e.requestFullScreen(), c.N.css({
          left: "0px",
          top: "0px"
        }));
        jQuery(c.K).trigger("onFullscreenChanged", !0);
      }
    },
    Io: function() {
      console.log('entre en IO');
      var c = "",
        c = "toolbar=no, location=no, scrollbars=no, width=" + screen.width,
        c = c + (", height=" + screen.height),
        c = c + ", top=0, left=0, fullscreen=yes";
      nw = this.document.FullScreenAsMaxWindow ? window.open("") : window.open("", "windowname4", c);
      nw.params = c;
      c = "<!doctype html><head>";
      c += '<meta name="viewport" content="initial-scale=1,user-scalable=no,maximum-scale=1,width=device-width" />';
      c += '<link rel="stylesheet" type="text/css" href="' + this.config.cssDirectory + (-1 == this.config.cssDirectory.indexOf("flowpaper.css") ? "flowpaper.css" : "") + '" />';
      c += '<script type="text/javascript" src="' + this.config.jsDirectory + 'jquery.min.js">\x3c/script>';
      c += '<script type="text/javascript" src="' + this.config.jsDirectory + 'jquery.extensions.min.js">\x3c/script>';
      c += '<script type="text/javascript" src="' + this.config.jsDirectory + 'flowpaper.js">\x3c/script>';
      c += '<script type="text/javascript" src="' + this.config.jsDirectory + 'flowpaper_handlers.js">\x3c/script>';
      c += '<style type="text/css" media="screen">body{ margin:0; padding:0; overflow-x:hidden;overflow-y:hidden; }</style>';
      c += "</head>";
      c += '<body onload="openViewer();">';
      c += '<div id="documentViewer" class="flowpaper_viewer" style="position:absolute;left:0px;top:0px;width:100%;height:100%;"></div>';
      c += '<script type="text/javascript">';
      c += "function openViewer(){";
      c += 'jQuery("#documentViewer").FlowPaperViewer(';
      c += "{ config : {";
      c += "";
      c += 'SWFFile : "' + this.document.SWFFile + '",';
      c += 'IMGFiles : "' + this.document.IMGFiles + '",';
      c += 'JSONFile : "' + this.document.JSONFile + '",';
      c += 'PDFFile : "' + this.document.PDFFile + '",';
      c += "";
      c += "Scale : " + this.scale + ",";
      c += 'ZoomTransition : "' + this.document.ZoomTransition + '",';
      c += "ZoomTime : " + this.document.ZoomTime + ",";
      c += "ZoomInterval : " + this.document.ZoomInterval + ",";
      c += "FitPageOnLoad : " + this.document.FitPageOnLoad + ",";
      c += "FitWidthOnLoad : " + this.document.FitWidthOnLoad + ",";
      c += "FullScreenAsMaxWindow : " + this.document.FullScreenAsMaxWindow + ",";
      c += "ProgressiveLoading : " + this.document.ProgressiveLoading + ",";
      c += "MinZoomSize : " + this.document.MinZoomSize + ",";
      c += "MaxZoomSize : " + this.document.MaxZoomSize + ",";
      c += "MixedMode : " + this.document.MixedMode + ",";
      c += "SearchMatchAll : " + this.document.SearchMatchAll + ",";
      c += 'InitViewMode : "' + this.document.InitViewMode + '",';
      c += 'RenderingOrder : "' + this.document.RenderingOrder + '",';
      c += "useCustomJSONFormat : " + this.document.useCustomJSONFormat + ",";
      c += 'JSONDataType : "' + this.document.JSONDataType + '",';
      null != this.document.JSONPageDataFormat && (c += "JSONPageDataFormat : {", c += 'pageWidth : "' + this.document.JSONPageDataFormat.kf + '",', c += 'pageHeight : "' + this.document.JSONPageDataFormat.jf + '",', c += 'textCollection : "' + this.document.JSONPageDataFormat.Ae + '",', c += 'textFragment : "' + this.document.JSONPageDataFormat.qb + '",', c += 'textFont : "' + this.document.JSONPageDataFormat.Cg + '",', c += 'textLeft : "' + this.document.JSONPageDataFormat.lc + '",', c += 'textTop : "' + this.document.JSONPageDataFormat.Ab + '",', c += 'textWidth : "' + this.document.JSONPageDataFormat.Ad + '",', c += 'textHeight : "' + this.document.JSONPageDataFormat.zd + '"', c += "},");
      c += "ViewModeToolsVisible : " + this.document.ViewModeToolsVisible + ",";
      c += "ZoomToolsVisible : " + this.document.ZoomToolsVisible + ",";
      c += "NavToolsVisible : " + this.document.NavToolsVisible + ",";
      c += "CursorToolsVisible : " + this.document.CursorToolsVisible + ",";
      c += "SearchToolsVisible : " + this.document.SearchToolsVisible + ",";
      window.zine || (c += 'Toolbar : "' + escape(this.config.Toolbar) + '",');
      c += 'BottomToolbar : "' + this.config.BottomToolbar + '",';
      c += 'UIConfig : "' + this.document.UIConfig + '",';
      c += 'jsDirectory : "' + this.config.jsDirectory + '",';
      c += 'cssDirectory : "' + this.config.cssDirectory + '",';
      c += 'localeDirectory : "' + this.config.localeDirectory + '",';
      c += 'key : "' + this.config.key + '",';
      c += "";
      c += 'localeChain: "' + this.document.localeChain + '"';
      c += "}});";
      c += "}";
      c += "document.fullscreen = true;";
      c += "$(document).keyup(function(e) {if (e.keyCode == 27){window.close();}});";
      c += "\x3c/script>";
      c += "</body>";
      c += "</html>";
      nw.document.write(c);
      nw.cg = !0;
      window.focus && nw.focus();
      nw.document.close();
      return !1;
    },
    resize: function(c, d, e, f) {
      var h = this;
      if (h.initialized) {
        h.width = null;
        if (h.H == h.W()) {
          h.I.resize(c, d, e, f);
        } else {
          h.Qa && (c = c - h.Qa.width() / 2, h.L.animate({
            left: h.Qa.width() / 2 + "px"
          }, 0));
          var p = jQuery(h.K).height() + 1 + 14,
            k = 0 < h.ig ? h.ig + 1 : 0;
          h.I && (k = 37);
          h.L.css({
            width: c,
            height: d - p - k
          });
          null != e && 1 != e || this.N.css({
            width: c,
            height: d
          });
          h.pages.resize(c, d - p - k, f);
          jQuery(".flowpaper_interactiveobject_" + h.P).remove();
          jQuery(".flowpaper_pageword_" + h.P).remove();
          "TwoPage" != h.H && "BookView" != h.H || h.fitheight();
          window.clearTimeout(h.Po);
          h.Po = setTimeout(function() {
            h.pages.Ea();
          }, 700);
        }
        h.I && h.I.fb && (window.clearTimeout(h.kj), h.kj = setTimeout(function() {
          h.PreviewMode || h.I.rj();
        }, 2500));
      }
    }
  };
  f.loadFromUrl = f.loadFromUrl;
  return f;
}();
window.print_flowpaper_Document = function(f, c, d, e, g) {
  console.log('print_flowpaper_Document', f, c, d, e, g)
  FLOWPAPER.Lk.init();
  var h = Array(g + 1),
    p = 0;
  if ("all" == d) {
    for (var k = 1; k < g + 1; k++) {
      h[k] = !0;
    }
    p = g;
  } else {
    if ("current" == d) {
      h[e] = !0, p = 1;
    } else {
      if (-1 == d.indexOf(",") && -1 < d.indexOf("-")) {
        for (var l = parseInt(d.substr(0, d.toString().indexOf("-"))), n = parseInt(d.substr(d.toString().indexOf("-") + 1)); l < n + 1; l++) {
          h[l] = !0, p++;
        }
      } else {
        if (0 < d.indexOf(",")) {
          for (var q = d.split(","), k = 0; k < q.length; k++) {
            if (-1 < q[k].indexOf("-")) {
              for (l = parseInt(q[k].substr(0, q[k].toString().indexOf("-"))), n = parseInt(q[k].substr(q[k].toString().indexOf("-") + 1)); l < n + 1; l++) {
                h[l] = !0, p++;
              }
            } else {
              h[parseInt(q[k].toString())] = !0, p++;
            }
          }
        } else {
          isNaN(d) || (h[parseInt(d)] = !0, p = 1);
        }
      }
    }
  }
  jQuery(document.body).append("<div id='documentViewer' style='position:absolute;width:100%;height:100%'></div>");
  h = "1-" + g;
  window.Kh = 0;
  "current" == d ? h = e + "-" + e : "all" == d ? h = "1-" + g : h = d;
  jQuery("#documentViewer").FlowPaperViewer({
    config: {
      IMGFiles: c.pageImagePattern,
      JSONFile: c.jsonfile && "undefined" != c.jsonfile ? c.jsonfile : null,
      PDFFile: c.PdfFile,
      JSONDataType: c.JSONDataType,
      Scale: 1,
      RenderingOrder: "ImagePageRenderer" == f ? "html,html" : "html5,html",
      key: c.key,
      UserCollaboration: c.UserCollaboration,
      InitViewMode: "Portrait",
      DisableOverflow: !0,
      DisplayRange: h
    }
  });
  jQuery("#documentViewer").bind("onPageLoaded", function() {
    window.Kh == p - 1 && setTimeout(function() {
      if (window.parent.onPrintRenderingCompleted) {
        window.parent.onPrintRenderingCompleted();
      }
      window.focus && window.focus();
      window.print();
      window.close && window.close();
    }, 2000);
    window.Kh++;
    if (window.parent.onPrintRenderingProgress) {
      window.parent.onPrintRenderingProgress(window.Kh);
    }
  });
};
window.renderPrintPage = function Z(c, d) {
  console.log('entreeee', c, d);
  "CanvasPageRenderer" == c.Gf() && (d < c.getNumPages() ? c.wa ? document.getElementById("ppage_" + d) ? c.Ri(d + 1, function() {
    if (parent.onPrintRenderingProgress) {
      parent.onPrintRenderingProgress(d + 1);
    }
    document.getElementById("ppage_" + d) ? c.La[d].getPage(1).then(function(e) {
      var g = document.getElementById("ppage_" + d);
      if (g) {
        var h = g.getContext("2d"),
          p = e.getViewport(4),
          h = {
            canvasContext: h,
            viewport: p,
            Fh: null,
            continueCallback: function(c) {
              c();
            }
          };
        g.width = p.width;
        g.height = p.height;
        e.render(h).promise.then(function() {
          e.destroy();
          Z(c, d + 1);
        }, function(c) {
          console.log(c);
        });
      } else {
        Z(c, d + 1);
      }
    }) : Z(c, d + 1);
  }) : Z(c, d + 1) : document.getElementById("ppage_" + d) ? c.La.getPage(d + 1).then(function(e) {
    if (parent.onPrintRenderingProgress) {
      parent.onPrintRenderingProgress(d + 1);
    }
    var g = document.getElementById("ppage_" + d);
    if (g) {
      var h = g.getContext("2d"),
        p = e.getViewport(4),
        h = {
          canvasContext: h,
          viewport: p,
          Fh: null,
          continueCallback: function(c) {
            c();
          }
        };
      g.width = p.width;
      g.height = p.height;
      e.render(h).promise.then(function() {
        Z(c, d + 1);
        e.destroy();
      }, function(c) {
        console.log(c);
      });
    } else {
      Z(c, d + 1);
    }
  }) : Z(c, d + 1) : (parent.onPrintRenderingCompleted(), window.print()));
};
Ea && self.addEventListener("message", function(f) {
  f = f.data;
  if ("undefined" !== f.cmd) {
    switch (f.cmd) {
      case "loadImageResource":
        var c = new XMLHttpRequest;
        c.open("GET", "../../" + f.src);
        c.Cb = c.responseType = "arraybuffer";
        c.onreadystatechange = function() {
          if (4 == c.readyState && 200 == c.status) {
            for (var d = new Uint8Array(this.response), e = d.length, f = Array(e); e--;) {
              f[e] = String.fromCharCode(d[e]);
            }
            self.postMessage({
              status: "ImageResourceLoaded",
              blob: f.join("")
            });
            self.close();
          }
        };
        c.send(null);
    }
  }
}, !1);