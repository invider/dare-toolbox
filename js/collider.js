/**************************************************************
 *
 * Collider.JS Player
 *
 * (C) 2016 ColliderLabs
 *
 * ************************************************************/

// expose collider to global scope
_ = collider = (function(window) {

"use strict"

// there is collider and there is mapping to a page
// we can create our own canvas(es) or map to existing
// "canvas" by default

var TARGET_FPS = 60
var MAX_EVO_TIME = 0.1

var cnv, ctx
var lastFrame = Date.now()


var _collider = function(val) {
    console.log(val)
}

var scene = {
    name: "Scene",
    mouseX: 0,
    mouseY: 0,
    mouseButton: '---',
    keys: {},
    
    resIncluded: 0,
    resLoaded: 0,
    img: {},
    snd: {},

    loaders: [],
    entities: {},
    commands: {},
    handlers: [],
    mutators: [],
    painters: [],

    isFun: function(f) {
        return !!(f && f.constructor && f.call && f.apply);
    },
    patch: function(target, v) {
        switch(target) {
            case 'load':
                if (!this.isFun(v)) return;
                this.loaders.push(v)
                break;
            case 'handle':
                if (!this.isFun(v)) return;
                this.handlers.push(v)
                break;
            case 'mutate':
                if (!this.isFun(v)) return;
                this.mutators.push(v)
                break;
            case 'draw':
                if (!this.isFun(v)) return;
                this.painters.push(v)
                break;
            case 'entity':
                this.entities[v.name] = v;
                break;
        }
    },
    normalizeActions: function() {
        this.loaders.sort();
        this.handlers.sort();
        this.mutators.sort();
        this.painters.sort();
    },
    loadImg: function(name, src) {
        var img = new Image()
        img.src = src
        img.onload = onLoad
        this.resIncluded ++
        this.img[name] = img
    },
}

function init() {
    // binding to graphical context by convention
    // > should be possible to create and bind manually multiple contexes
    cnv = document.getElementById("canvas")
    ctx = cnv.getContext("2d")
    //cnv.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT); //Chrome
    //cnv.mozRequestFullScreen(); //Firefox

    // inject load, input, evo and render actions and entities
    for (var key in window) {
        if (key.startsWith('_load$')) {
            scene.patch('load', window[key])
            delete window[key]
        } else if (key.startsWith('_handle$')) {
            scene.patch('handle', window[key])
            delete window[key]
        } else if (key.startsWith('_mutate$')) {
            scene.patch('mutate', window[key])
            delete window[key]
        } else if (key.startsWith('_draw$')) {
            scene.patch('draw', window[key])
            delete window[key]
        } else if (key.startsWith('_obj$')) {
            var obj = window[key]
            if (obj.name === undefined) {
                obj.name = key.substring(3,key.length())
            }
            scene.patch('entity', obj)
            delete window[key]
        }
    }
    scene.normalizeActions(); // TODO find how to change

    expandCanvas()

    load()

    // initiate the game loop
    if (TARGET_FPS <= 0) {
        setInterval(loop, 1)
    } else {
        setInterval(loop, 1000/TARGET_FPS)
    }
}

// > implement 'keepOriginalAspectRatio'&'aspectRatio' option
function expandCanvas() {
    var canvas = document.getElementById('canvas')
    var newWidth = window.innerWidth
    var newHeight = window.innerHeight
    scene.width = canvas.width = newWidth
    scene.height = canvas.height = newHeight
    canvas.style.width = newWidth + 'px'
    canvas.style.height = newHeight + 'px'
    render(0)
}

function handleMouse(e) {
    e = e || window.event
    scene.mouseX = e.pageX
    scene.mouseY = e.pageY
    e.preventDefault()
    e.stopPropagation()
    return false;
}

function handleMouseDown(e) {
    switch (e.button) {
    case 0: scene.mouseButton = '*--';
            break;
    case 1: scene.mouseButton = '-*-';
            break;
    case 2: scene.mouseButton = '--*';
            break;
    }
    e.preventDefault()
    e.stopPropagatton = e.button
    return false;
}

function handleMouseUp(e) {
    scene.mouseButton = '---'
}

function handleMouseDoubleClick(e) {
    switch (e.button) {
    case 0: scene.mouseButton = '+--';
            break;
    case 1: scene.mouseButton = '-+-';
            break;
    case 2: scene.mouseButton = '--+';
            break;
    }
    e.preventDefault()
    e.stopPropagatton = e.button
    return false;
}

function handleMouseOut(e) {
    for (var k in scene.keys) {
        delete scene.keys[k]
    }
}

function handleContextMenu() {
    return false;
}

function handleKeyDown(e) {
    var code = e.which || e.keyCode

    scene.keys[code] = 1

    e.preventDefault()
    e.stopPropagation()
    return false;
}

function handleKeyUp(e) {
    var code = e.which || e.keyCode
    delete scene.keys[code]

    e.preventDefault()
    e.stopPropagation()
    return false;
}

function onLoad() {
    scene.resLoaded++
}

function load() {
    scene.loaders.map( function(l) {
        l.apply(_collider)
    });
}


// process input events (controls, random, AI)
function input(delta) {
    // execute handlers
    scene.handlers.map( function(h) {
        h.apply(_collider, [delta])
    });
}

function evolve(delta) {
    // execute mutators
    scene.mutators.map( function(m) {
        m.apply(_collider, [delta])
    });
}

var fps = 0, fpsa = 1, fpsc = 0
function render(delta) {
    // clear
    ctx.fillStyle = "#220044"
    ctx.fillRect(0,0,cnv.width,cnv.height)

    // execute painters
    scene.painters.map( function(p) {
        p.apply(_collider, [ctx, delta])
    });

    // draw status
    ctx.fillStyle = "#FFFF00"
    //ctx.font = '20px monospace'
    //ctx.font = '24px pixelated'
    ctx.font = '19px commodore'
    ctx.textBaseline = 'bottom'

    if (fpsa >= 1 && delta > 0) {
        fps = Math.round(fpsc/fpsa)
        fpsa = delta
        fpsc = 1
    } else {
        fpsc += 1
        fpsa += delta
    }

    var status = 'fps: ' + fps + 'res ' + scene.resIncluded + '/' + scene.resLoaded
        +' mouse: ' + scene.mouseX + 'x' + scene.mouseY + ', ' + scene.mouseButton
        + " Keyboard: "
    for (var k in scene.keys) {
        status += "-" + k
    }
    status += '-'
    ctx.fillText(status, 10, 30)
}


function loop() {
    var now = Date.now()
    var delta = (now - lastFrame)/1000

    // show, react and update cycle
    render(delta)
    input(delta)
    // evolve multiple times in small quants
    // to compensate possible lag due to rendering delays
    while(delta > 0) {
        if (delta > MAX_EVO_TIME) {
            evolve(MAX_EVO_TIME);
        } else {
            evolve(delta);
        }
        delta -= MAX_EVO_TIME
    }
    lastFrame = now
}

// bind to events
window.addEventListener('resize', expandCanvas, false)
window.onload = init;
window.onmousemove = handleMouse
window.onmousedown = handleMouseDown
window.onmouseup = handleMouseUp
window.onmouseout = handleMouseOut
window.ondblclick = handleMouseDoubleClick
window.oncontextmenu = handleContextMenu
window.onkeydown = handleKeyDown
window.onkeyup = handleKeyUp

_collider['scene'] = scene

_collider['lib'] = {
    mix: function() {
        var arg, prop, mixin = {};
        for (arg = 0; arg < arguments.length; arg++) {
            for (prop in arguments[arg]) {
                if (arguments[arg].hasOwnProperty(prop)) {
                    mixin[prop] = arguments[arg][prop];
                }
            }
        }
        return mixin;
    },
    augment: function() {
        var arg;
        var prop;
        var mixin = arguments[0];
        for (arg = 1; arg < arguments.length; arg++) {
            for (prop in arguments[arg]) {
                mixin[prop] = arguments[arg][prop];
            }
        }
        return mixin;
    },
}

_collider['math'] = {
    
    PI2: Math.PI * 2,
    
    length: function(x, y) {
        return Math.sqrt(x*x + y*y)
    },

    // get normalized vector as array
    normalize: function(x, y) {
        var len = this.length(x, y)
        if (len === 0) return [0, 0];
        return [x/len, y/len]
    },

    distance: function(x1, y1, x2, y2) {
        var dx = x2 - x1
        var dy = y2 - y1
        return Math.sqrt(dx*dx + dy*dy)
    },

    distanceSq: function(x1, y1, x2, y2) {
        var dx = x2 - x1
        var dy = y2 - y1
        return dx*dx + dy*dy
    },

    distanceToSegmentSq: function(px, py, x1, y1, x2, y2) {
        segLen2 = this.distanceSq(x1, y1, x2, y2)
        if (segLen2 === 0) return this.distanceSq(px, py, x1, y1)
        var t = ((px - x1)*(x2 - x1) + (py - y1)*(y2 - y1)) / segLen2
        if (t < 0) return this.distanceSq(px, py, x1, y1)
        if (t > 1) return this.distanceSq(px, py, x2, y2)
        return this.distanceSq(px, py, x1 + t*(x2 - x1), y1 + t*(y2 - y1))
    },

    distanceToSegment: function(px, py, x1, y1, x2, y2) {
        return Math.sqrt(this.distanceToSegmentSq(px, py, x1, y1, x2, y2))
    },


    // angle from source to target vectors
    targetAngle: function(sx, sy, tx, ty) {
        return Math.atan2(tx - sx, ty - sy)
    },

    normalizeAngle: function(a) {
        a = a % (2*Math.PI)
        return a < 0? a + 2*Math.PI : a
    },

    reverseAngle: function(a) {
        a = (a + Math.PI) % (2*Math.PI)
        return a < 0? a + 2*Math.PI : a
    },

    limitedAdd: function(val, q, max) {
        return Math.min(val+q, max)
    },

    limitedSub: function(val, q, min) {
        return Math.max(val-q, min)
    },

    limitValue: function(val, min, max) {
        return val < min? min : val > max? max : val
    },

    limitMin: function(val, min) {
        return val < min? min : val
    },

    limitMax: function(val, max) {
        return val > max? max : val
    },

    wrap: function(val, min, max) {
        var range = max - min
        if (range <= 0) return 0;
        var res = (val - min) % range
        if (res < 0) res += range;
        return res + min
    },

    // linear interpolation value for v1 and v2 and t[0..1]
    linear: function(v1, v2, t) {
        return (v2 - v1) * t + v1
    },

    // useful for interception of moving objects
    dotProduct: function(x1, y1, x2, y2) {
        return x1*x2 + y1*y2
    },

    // get vector's angle in rad
    vecAngle: function(x, y) {
        return Math.atan2(y, x)
    },

    // get unit vector x from angle
    vecX: function(a) {
        return Math.cos(a)
    },

    // get unit vector y from angle
    vecY: function(a) {
        return Math.sin(a)
    },

    degToRad: function(d) {
        return d * (Math.PI / 180)
    },

    radToDeg: function(r) {
        return r * (180 / Math.PI)
    },

}


return _collider;

}(this))
