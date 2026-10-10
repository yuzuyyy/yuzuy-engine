/*!
 * <sleepy-buddy> — web component (Shadow DOM; three.js is loaded automatically)
 * A cute 3D character that sleeps, wakes on hover, and follows or flies after the cursor.
 *
 * FEATURES
 *   - Sleep / wake states, blinking, breathing, click-to-jump
 *   - Cursor following: look only, or fly across the element
 *   - Name pill above the character (toggleable, resizable)
 *   - Floating text (e.g. "z Z 💤") and a moving splash effect while flying
 *   - 5 built-in characters + your own image or 3D model (GLB/GLTF)
 *   - Per-character hit area, prefers-reduced-motion support, ARIA label, WebGL fallback
 *   - Keyboard accessible (focus wakes, Enter/Space pokes) when interactive
 *
 * USAGE
 *   <script src="sleepy-buddy.js"></script>
 *   <sleepy-buddy character="long" follow="fly" height="480"></sleepy-buddy>
 *   <sleepy-buddy custom-src="mascot.png"></sleepy-buddy>   <!-- your own image -->
 *   <sleepy-buddy custom-src="mascot.glb"></sleepy-buddy>   <!-- your own 3D model -->
 *
 * CONFIGURATION (use any; priority: attribute > data-* attribute > JSON > default)
 *   1. Attributes        <sleepy-buddy character="rex" size="240"></sleepy-buddy>
 *   2. data-* attributes <sleepy-buddy data-character="rex" data-size="240"></sleepy-buddy>
 *   3. JSON              <sleepy-buddy data-config='{"character":"rex","size":240}'></sleepy-buddy>
 *   4. Auto-mount        <div data-sleepy-buddy='{"character":"rex"}' style="height:480px"></div>
 *   5. JavaScript        new SleepyBuddy({ character: "rex", size: 240, container: "#slot" })
 *                        el.config = { character: "rex", floatText: ["z", "Z"] }
 *   JSON / JS keys may be camelCase or kebab-case; arrays are joined with "|".
 *
 * ATTRIBUTES (all optional; every one also works as data-<name> and as a JSON key)
 *  Character
 *   character         long | bonn | emy | rex | clo                 (default: long)
 *   name              text shown in the pill                        (default: character name)
 *   custom-src        URL of your own image (png/jpg/webp) or model (glb/gltf)
 *   custom-type       image | model (auto-detected from the extension)
 *   color, color-2, color-3, eye-color   palette overrides          (default: the character's own colors)
 *  Size and layout
 *   width, height     element size: number = px, or any CSS value   (default: 100% x 400px)
 *   size              character height in px, or sm | md | lg | xl (120 / 200 / 300 / 420)
 *   scale             extra multiplier on top of size, 0.2-3        (default: 1)
 *   background        element background color                      (default: transparent)
 *  Behavior
 *   follow            none | look | fly                             (default: look)
 *   fly-speed         0.5-12                                        (default: 3)
 *   fly-range         0.1-1, share of the element the character may cover (default: 0.75)
 *   turn              0-3, how strongly the body turns to the cursor (default: 1)
 *   track             window | element, where the cursor is tracked (default: window)
 *   interactive       true | false, hover wakes and click jumps     (default: true)
 *   auto-sleep        true | false, fall asleep when idle           (default: true)
 *   sleep-delay       ms before falling asleep                      (default: 2500)
 *   always-awake      boolean attribute, never sleep
 *   blink, shadow     true | false                                  (default: true)
 *   reduce-motion     auto | true | false                           (default: auto)
 *  Name pill
 *   bubble            true | false, show or hide the pill           (default: true)
 *   bubble-scale      pill size multiplier, 0.4-3                   (default: 1)
 *   bubble-font-size  pill text size in px, 8-64                    (default: 14)
 *   bubble-bg, bubble-color   pill background and text color
 *  Floating text
 *   float-text        texts that float up near the head: "z|Z|💤" or a JSON array (default: off)
 *   float-when        sleep | awake | always                        (default: sleep)
 *   float-interval    ms between texts, 300-60000                   (default: 1400)
 *   float-size        text size in px, 8-80                         (default: 18)
 *   float-color       text color
 *  Moving effect (splash)
 *   splash            true | false, show or hide the effect         (default: true)
 *   splash-type       drops | bubbles | sparkle                     (default: drops)
 *   splash-color      one or more colors separated by "|"           (default: the character's colors)
 *   splash-amount     0-3, particle amount                          (default: 1)
 *  Misc
 *   three-src         URL of a self-hosted three.js UMD build (r128). Default: cdnjs, then jsDelivr
 *
 * METHODS
 *   new SleepyBuddy(options)       create an element from a config object ("container" mounts it)
 *   SleepyBuddy.mountAll(root)     mount every [data-sleepy-buddy] element (runs automatically on load)
 *   el.config = {...}              change several options at once
 *   wake() / sleep() / poke()      control the character
 *   spawnText("text")              float a text now, e.g. "+1 ❤️"
 *   useCharacter(id)               switch character and restore ITS ORIGINAL COLORS
 *   useImage(urlOrFile) / useModel(urlOrFile)   use your own character
 * EVENTS     buddy-wake, buddy-sleep, buddy-poke, buddy-error  (detail: { character })
 * CSS VARS   --sb-bg  --sb-bubble-bg  --sb-bubble-color  --sb-font
 * PARTS      ::part(stage)  ::part(bubble)  ::part(bubble-body)
 *
 * CUSTOM CHARACTERS
 *   SleepyBuddy.defineCharacter(id, { name, emoji, height, bubbleY, floaty, hit: { radius, y },
 *     defaults: { color, color2, color3, eye }, build(palette, helpers) -> { root, tick(state) } })
 *   tick(state): { awake, dt, t, look: {x, y}, fly: 0..1, blink, reduce }
 */
(function () {
    'use strict';
    if (typeof window === 'undefined' || !window.customElements) return;
    if (window.customElements.get('sleepy-buddy')) return;

    const THREE_URLS = [
        'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
        'https://cdn.jsdelivr.net/npm/three@0.128.0/build/three.min.js',
    ];
    const GLTF_URLS = [
        'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',
        'https://unpkg.com/three@0.128.0/examples/js/loaders/GLTFLoader.js',
    ];
    const HOME_Y = -0.35;
    const EYE_REACH = 0.08;
    const SIZES = { sm: 120, md: 200, lg: 300, xl: 420 };

    const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
    // "flySpeed" -> "fly-speed", "color2" -> "color-2"
    const normKey = (k) =>
        String(k)
            .replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())
            .replace(/^color([23])$/, 'color-$1');

    /* ------------------------------ Script loader ------------------------------ */
    const pending = {};
    // Tries each URL in order (CDN fallback). ready() tells whether the library is already present.
    function loadScript(srcs, ready) {
        if (ready()) return Promise.resolve();
        srcs = [].concat(srcs);
        const key = srcs[0];
        if (!pending[key]) {
            pending[key] = srcs
                .reduce(function (chain, src) {
                    return chain.catch(function () {
                        return new Promise(function (res, rej) {
                            const el = document.createElement('script');
                            el.src = src;
                            el.async = true;
                            el.onload = function () {
                                ready()
                                    ? res()
                                    : rej(
                                        new Error(
                                            'Loaded ' + src + ' but the library was not found'
                                        )
                                    );
                            };
                            el.onerror = function () {
                                el.remove();
                                rej(new Error('Failed to load ' + src));
                            };
                            document.head.appendChild(el);
                        });
                    });
                }, Promise.reject(new Error('start')))
                .catch(function (e) {
                    delete pending[key];
                    throw e;
                });
        }
        return pending[key];
    }
    const loadThree = (src) =>
        loadScript(
            src ? [src] : THREE_URLS,
            () => window.THREE && window.THREE.WebGLRenderer
        ).then(() => window.THREE);
    const loadGLTF = () =>
        loadScript(GLTF_URLS, () => window.THREE && window.THREE.GLTFLoader);

    /* --------------------------------- Helpers 3D -------------------------------- */
    function makeHelpers(THREE) {
        // three < r152: hex colors must be converted to linear because output uses sRGB
        const legacy = parseInt(THREE.REVISION, 10) < 152 && !!THREE.sRGBEncoding;

        const col = (v, fb) => {
            const c = new THREE.Color();
            try {
                c.set(v || fb || '#ffffff');
            } catch (e) {
                c.set(fb || '#ffffff');
            }
            if (legacy) c.convertSRGBToLinear();
            return c;
        };
        const std = (color, o) => {
            o = o || {};
            return new THREE.MeshStandardMaterial({
                color: color,
                roughness: o.rough !== undefined ? o.rough : 0.6,
                metalness: o.metal || 0,
                emissive: o.emissive !== undefined ? o.emissive : 0x000000,
                emissiveIntensity: o.ei || 0,
            });
        };
        const sphere = (r, mat, x, y, z, sx, sy, sz) => {
            const m = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 32), mat);
            m.position.set(x || 0, y || 0, z || 0);
            m.scale.set(sx || 1, sy || 1, sz || 1);
            return m;
        };
        const cylinder = (rt, rb, hgt, mat, x, y, z) => {
            const m = new THREE.Mesh(
                new THREE.CylinderGeometry(rt, rb, hgt, 32),
                mat
            );
            m.position.set(x || 0, y || 0, z || 0);
            return m;
        };
        const cone = (r, hgt, mat, x, y, z, rx, ry, rz) => {
            const m = new THREE.Mesh(new THREE.ConeGeometry(r, hgt, 16), mat);
            m.position.set(x || 0, y || 0, z || 0);
            m.rotation.set(rx || 0, ry || 0, rz || 0);
            return m;
        };
        // Rounded box via ExtrudeGeometry + bevel (r128 has no RoundedBoxGeometry in core)
        const rbox = (w, hgt, d, r, mat, x, y, z) => {
            const iw = w - 2 * r,
                ih = hgt - 2 * r,
                id = Math.max(0.001, d - 2 * r);
            const c = Math.min(r * 0.6, iw / 2, ih / 2),
                x0 = -iw / 2,
                y0 = -ih / 2;
            const s = new THREE.Shape();
            s.moveTo(x0 + c, y0);
            s.lineTo(x0 + iw - c, y0);
            s.quadraticCurveTo(x0 + iw, y0, x0 + iw, y0 + c);
            s.lineTo(x0 + iw, y0 + ih - c);
            s.quadraticCurveTo(x0 + iw, y0 + ih, x0 + iw - c, y0 + ih);
            s.lineTo(x0 + c, y0 + ih);
            s.quadraticCurveTo(x0, y0 + ih, x0, y0 + ih - c);
            s.lineTo(x0, y0 + c);
            s.quadraticCurveTo(x0, y0, x0 + c, y0);
            const geo = new THREE.ExtrudeGeometry(s, {
                depth: id,
                bevelEnabled: true,
                bevelThickness: r,
                bevelSize: r,
                bevelSegments: 4,
                curveSegments: 8,
            });
            geo.translate(0, 0, -id / 2);
            const m = new THREE.Mesh(geo, mat);
            m.position.set(x || 0, y || 0, z || 0);
            return m;
        };
        const makeEyes = (spread, radius, color, glow, bx, by, bz) => {
            const group = new THREE.Group();
            group.position.set(bx, by, bz);
            const mat = std(color, {
                rough: 0.4,
                emissive: glow ? color : 0x000000,
                ei: glow ? 1.6 : 0,
            });
            const geo = new THREE.SphereGeometry(radius, 20, 20);
            [-1, 1].forEach(function (side) {
                const m = new THREE.Mesh(geo, mat);
                m.position.x = side * spread;
                group.add(m);
            });
            let open = 0.08,
                blinking = false,
                blinkT = 0,
                nextBlink = 1.5 + Math.random() * 3;
            return {
                group: group,
                tick: function (st) {
                    open = damp(open, st.awake ? 1 : 0.08, 10, st.dt);
                    let k = 1;
                    if (st.awake && st.blink) {
                        nextBlink -= st.dt;
                        if (!blinking && nextBlink <= 0) {
                            blinking = true;
                            blinkT = 0;
                        }
                        if (blinking) {
                            blinkT += st.dt / 0.16;
                            k = 1 - Math.sin(Math.min(blinkT, 1) * Math.PI) * 0.95;
                            if (blinkT >= 1) {
                                blinking = false;
                                nextBlink =
                                    Math.random() < 0.2 ? 0.12 : 2 + Math.random() * 3.5;
                            }
                        }
                    } else blinking = false;
                    const y = Math.max(0.06, open * k);
                    group.children.forEach(function (c) {
                        c.scale.y = y;
                    });
                    group.position.set(
                        bx + st.look.x * EYE_REACH,
                        by + st.look.y * EYE_REACH * 0.7,
                        bz
                    );
                },
            };
        };
        return {
            THREE,
            legacy,
            col,
            std,
            sphere,
            cylinder,
            cone,
            rbox,
            makeEyes,
            damp,
        };
    }

    /* -----------------------------------  Characters -------------------------------- */
    // Builders receive a palette c ({main, light, detail, eye, dark}) and helpers h.
    // state tick = { awake, dt, t, look:{x,y}, fly:0..1, blink }

    function buildLong(c, h) {
        const g = new h.THREE.Group();
        const body = h.std(c.main, { rough: 0.85 });
        const pale = h.std(c.light, { rough: 0.9 });
        const pink = h.std(c.detail, { rough: 0.8 });
        const green = h.std(h.col('#6fcf6f'), { rough: 0.7 });

        g.add(h.sphere(1, body, 0, 0, 0, 1.05, 0.95, 0.95)); // round chubby body
        g.add(h.sphere(1, pale, 0, -0.32, 0.5, 0.78, 0.66, 0.5)); // belly

        [-1, 1].forEach(function (s) {
            g.add(h.sphere(0.28, body, s * 0.64, 0.8, 0)); // round ears
            g.add(h.sphere(0.15, pink, s * 0.64, 0.8, 0.12, 1, 1, 0.6)); // inner ears
            g.add(h.sphere(0.12, pink, s * 0.66, -0.1, 0.74, 1.2, 0.75, 0.45)); // blushing cheeks
            g.add(h.sphere(0.3, pale, s * 0.45, -0.93, 0.25, 1, 0.6, 1.2)); // stubby feet
        });

        const eyes = h.makeEyes(0.38, 0.1, c.eye, false, 0, 0.12, 0.86);
        g.add(eyes.group);
        const mouth = h.sphere(0.06, h.std(c.eye), 0, -0.14, 0.92);
        g.add(mouth);

        const arms = [];
        [-1, 1].forEach(function (s) {
            const arm = h.sphere(0.22, body, s * 1.0, -0.1, 0.1, 0.8, 1.25, 0.8);
            arm.rotation.z = s * -0.35;
            g.add(arm);
            arms.push({ m: arm, s: s });
        });

        const sprout = new h.THREE.Group(); // little sprout on the head
        sprout.position.set(0, 0.93, 0);
        sprout.add(h.cylinder(0.025, 0.03, 0.22, green, 0, 0.1, 0));
        sprout.add(h.sphere(0.12, green, -0.1, 0.25, 0, 1.3, 0.6, 0.6));
        sprout.add(h.sphere(0.12, green, 0.1, 0.25, 0, 1.3, 0.6, 0.6));
        g.add(sprout);

        let mo = 0.5;
        return {
            root: g,
            tick: function (st) {
                eyes.tick(st);
                mo = damp(mo, st.awake ? 1.6 : 0.5, 10, st.dt);
                mouth.scale.set(1.4, mo, 0.5);
                mouth.position.x = st.look.x * 0.05;
                const wave = st.awake ? Math.sin(st.t * 7) * 0.25 : 0;
                arms.forEach(function (a) {
                    a.m.rotation.z = a.s * (-0.35 - (st.awake ? 0.35 : 0)) + a.s * wave;
                });
                sprout.rotation.z =
                    Math.sin(st.t * (st.awake ? 5 : 1.5)) * (st.awake ? 0.25 : 0.08);
            },
        };
    }

    function buildBonn(c, h) {
        const g = new h.THREE.Group();
        g.add(h.sphere(0.9, h.std(c.main, { rough: 0.55 })));
        g.add(
            h.sphere(
                0.9,
                h.std(c.light, { rough: 0.7 }),
                0,
                -0.25,
                0.35,
                0.75,
                0.7,
                0.6
            )
        );
        const eyes = h.makeEyes(0.3, 0.09, c.eye, false, 0, 0.22, 0.8);
        g.add(eyes.group);
        const beak = h.std(c.detail, { rough: 0.5 });
        g.add(h.cone(0.14, 0.3, beak, 0, 0, 0.92, Math.PI / 2, 0, 0));
        const wings = [];
        [-1, 1].forEach(function (s) {
            const w = h.sphere(
                1,
                h.std(c.dark),
                s * 0.88,
                -0.05,
                0.05,
                0.18,
                0.4,
                0.3
            );
            w.rotation.z = s * -0.3;
            g.add(w);
            wings.push({ m: w, s: s });
            g.add(h.sphere(0.16, beak, s * 0.3, -0.9, 0.35, 1, 0.4, 1.4));
        });
        const tuft = h.std(c.main, { rough: 0.55 });
        [-1, 0, 1].forEach(function (s) {
            g.add(h.cone(0.08, 0.3, tuft, s * 0.1, 0.92, 0.05, 0, 0, s * -0.35));
        });
        return {
            root: g,
            tick: function (st) {
                eyes.tick(st);
                const flap = st.fly * (0.5 + 0.5 * Math.sin(st.t * 18)) * 0.9;
                wings.forEach(function (w) {
                    w.m.rotation.z = w.s * (-0.3 - flap);
                });
            },
        };
    }

    function buildEmy(c, h) {
        const g = new h.THREE.Group();
        const a = h.std(c.main, { rough: 0.95 });
        const b = h.std(c.light, { rough: 0.95 });
        [
            [0, 0.05, 0, 0.78, a],
            [-0.62, 0.28, 0, 0.5, b],
            [0.62, 0.28, 0, 0.5, b],
            [-0.5, -0.38, 0.1, 0.48, a],
            [0.5, -0.38, 0.1, 0.48, a],
            [0, 0.7, -0.05, 0.5, b],
            [-0.3, 0.6, 0.25, 0.38, a],
            [0.3, 0.6, 0.25, 0.38, a],
        ].forEach(function (p) {
            g.add(h.sphere(p[3], p[4], p[0], p[1], p[2]));
        });
        const eyes = h.makeEyes(0.26, 0.08, c.eye, false, 0, 0.1, 0.7);
        g.add(eyes.group);
        const cheek = h.std(c.detail, { rough: 0.8 });
        [-1, 1].forEach(function (s) {
            g.add(h.sphere(0.1, cheek, s * 0.45, -0.12, 0.6, 1, 0.7, 0.5));
        });
        g.add(h.sphere(0.05, cheek, 0, -0.05, 0.75));
        return {
            root: g,
            tick: function (st) {
                eyes.tick(st);
            },
        };
    }

    function buildRex(c, h) {
        const g = new h.THREE.Group();
        const metal = h.std(c.main, { rough: 0.35, metal: 0.3 });
        const dark = h.std(c.dark, { rough: 0.4, metal: 0.3 });

        g.add(h.rbox(1.5, 1.1, 1.1, 0.18, metal, 0, 0.55, 0)); // head
        g.add(
            h.rbox(
                1.2,
                0.6,
                0.1,
                0.05,
                h.std(h.col('#0b1230'), { rough: 0.3 }),
                0,
                0.55,
                0.52
            )
        ); // visor

        const eyes = h.makeEyes(0.3, 0.1, c.eye, true, 0, 0.55, 0.6);
        g.add(eyes.group);

        const ear = h.std(c.light, { rough: 0.5 });
        [-1, 1].forEach(function (s) {
            const e = h.cylinder(0.15, 0.15, 0.12, ear, s * 0.8, 0.55, 0); // ears
            e.rotation.z = Math.PI / 2;
            g.add(e);
        });

        g.add(h.cylinder(0.04, 0.04, 0.4, metal, 0, 1.3, 0)); // antenna
        const bulb = h.std(c.detail, { emissive: c.detail, ei: 0.3 });
        g.add(h.sphere(0.1, bulb, 0, 1.55, 0));

        g.add(h.rbox(1.0, 0.8, 0.8, 0.14, metal, 0, -0.4, 0)); // body
        const chest = h.std(c.eye, { emissive: c.eye, ei: 0.2 });
        g.add(h.sphere(0.1, chest, 0, -0.35, 0.42));

        [-1, 1].forEach(function (s) {
            g.add(h.rbox(0.22, 0.6, 0.22, 0.08, metal, s * 0.68, -0.35, 0)); // arms
            g.add(h.rbox(0.35, 0.18, 0.5, 0.07, dark, s * 0.28, -0.88, 0.05)); // feet
        });

        let bulbI = 0.3,
            chestI = 0.2;
        return {
            root: g,
            tick: function (st) {
                eyes.tick(st);
                bulbI = damp(bulbI, st.awake ? 1.4 : 0.3, 6, st.dt);
                chestI = damp(chestI, st.awake ? 1.2 : 0.2, 6, st.dt);
                bulb.emissiveIntensity = bulbI;
                chest.emissiveIntensity = chestI;
            },
        };
    }

    function buildClo(c, h) {
        const g = new h.THREE.Group();
        const ghost = h.std(c.main, { rough: 0.6, emissive: c.detail, ei: 0.1 });

        g.add(h.sphere(0.8, ghost, 0, 0.3, 0)); // head
        g.add(h.cylinder(0.8, 0.8, 1.0, ghost, 0, -0.2, 0)); // body
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            g.add(
                h.sphere(0.27, ghost, Math.cos(a) * 0.55, -0.7, Math.sin(a) * 0.55)
            ); // wavy hem
        }
        g.add(h.sphere(0.4, ghost, 0, -0.7, 0));
        [-1, 1].forEach(function (s) {
            g.add(h.sphere(0.18, ghost, s * 0.85, -0.05, 0.25));
        }); // hands

        const cheek = h.std(c.light, { rough: 0.8 });
        [-1, 1].forEach(function (s) {
            g.add(h.sphere(0.09, cheek, s * 0.5, 0.22, 0.6, 1, 0.7, 0.5));
        }); // cheeks

        const eyes = h.makeEyes(0.28, 0.1, c.eye, false, 0, 0.4, 0.72);
        g.add(eyes.group);
        const mouth = h.sphere(0.1, h.std(c.eye), 0, 0.1, 0.74);
        g.add(mouth);

        let open = 0.25;
        return {
            root: g,
            tick: function (st) {
                eyes.tick(st);
                open = damp(open, st.awake ? 1.2 : 0.25, 10, st.dt);
                mouth.scale.set(1, open, 0.5);
                mouth.position.x = st.look.x * 0.05;
                mouth.position.y = 0.1 + st.look.y * 0.03;
            },
        };
    }

    const CHARACTERS = {
        rex: {
            name: 'Rex',
            emoji: '🤖',
            height: 3.1,
            bubbleY: 1.85,
            floaty: 0.06,
            hit: { radius: 1.5, y: 0.3 },
            defaults: {
                color: '#4d7cff',
                color2: '#ffb000',
                color3: '#ff3b3b',
                eye: '#ffe14d',
            },
            build: buildRex,
        },
        clo: {
            name: 'Clo',
            emoji: '👻',
            bubbleY: 1.3,
            floaty: 0.16,
            hit: { radius: 1.25, y: 0.05 },
            defaults: {
                color: '#b9f4e0',
                color2: '#8fe3c9',
                color3: '#14b894',
                eye: '#16403a',
            },
            build: buildClo,
        },
        long: {
            name: 'Long',
            emoji: '🍡',
            bubbleY: 1.5,
            floaty: 0.05,
            hit: { radius: 1.3, y: 0 },
            defaults: {
                color: '#0099FF',
                color2: '#fff1dc',
                color3: '#ff8aa8',
                eye: '#2a1b1b',
            },
            build: buildLong,
        },
        bonn: {
            name: 'Bonn',
            emoji: '🐣',
            bubbleY: 1.25,
            floaty: 0.06,
            hit: { radius: 1.2, y: 0 },
            defaults: {
                color: '#ff4000',
                color2: '#ffb38a',
                color3: '#ffb000',
                eye: '#1a1a1a',
            },
            build: buildBonn,
        },
        emy: {
            name: 'Emy',
            emoji: '☁️',
            bubbleY: 1.4,
            floaty: 0.06,
            hit: { radius: 1.3, y: 0.15 },
            defaults: {
                color: '#ff9cc6',
                color2: '#ffc6de',
                color3: '#ff4f9a',
                eye: '#3a1f35',
            },
            build: buildEmy,
        },
    };

    /* ------------------------------------ Template ------------------------------- */
    const CSS = `
  :host{display:block;position:relative;width:100%;height:400px;overflow:hidden;background:var(--sb-bg,transparent);contain:layout paint;touch-action:pan-y;-webkit-tap-highlight-color:transparent}
  :host([hidden]){display:none}
  :host(:focus-visible){outline:2px solid #4d90fe;outline-offset:2px}
  .stage{position:absolute;inset:0}
  canvas{position:absolute;inset:0;display:block;width:100%;height:100%}
  .bubble{position:absolute;top:0;left:0;z-index:2;pointer-events:none;will-change:transform;visibility:hidden}
  .bubble.on{visibility:visible}
  .bubble.off{display:none}
  .bubble-body,.fb{font:600 var(--sb-bubble-font-size,14px) var(--sb-font,"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif)}
  .bubble-body{position:relative;display:flex;align-items:center;justify-content:center;padding:calc(12px * var(--sb-pill,1)) calc(22px * var(--sb-pill,1));border-radius:calc(24px * var(--sb-pill,1));background:var(--sb-bubble-bg,#fff);color:var(--sb-bubble-color,#111827);white-space:nowrap;box-shadow:0 14px 34px rgba(0,0,0,.12),0 4px 10px rgba(0,0,0,.06)}
  .bubble-body::after{content:"";position:absolute;bottom:calc(-7px * var(--sb-pill,1));left:50%;margin-left:calc(-8px * var(--sb-pill,1));border-left:calc(8px * var(--sb-pill,1)) solid transparent;border-right:calc(8px * var(--sb-pill,1)) solid transparent;border-top:calc(8px * var(--sb-pill,1)) solid var(--sb-bubble-bg,#fff)}
  .bubble-body.pop{animation:sb-pop .28s cubic-bezier(.2,1.4,.4,1)}
  @keyframes sb-pop{0%{opacity:0;transform:scale(.85) translateY(6px)}100%{opacity:1;transform:none}}
  @media (prefers-reduced-motion:reduce){.bubble-body.pop{animation:none}}
  .fx{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none}
  .ft{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden}
  .ft-i{position:absolute;left:0;top:0;font:800 18px var(--sb-font,"Inter",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif);color:var(--sb-bubble-color,#111827);opacity:0;white-space:nowrap;text-shadow:0 2px 8px rgba(0,0,0,.12);will-change:transform,opacity;animation:sb-float 2.4s ease-out forwards}
  @keyframes sb-float{0%{opacity:0;transform:translate(var(--x),var(--y)) scale(.6)}15%{opacity:1}100%{opacity:0;transform:translate(calc(var(--x) + var(--dx)),calc(var(--y) - 90px)) scale(1.15)}}
  @keyframes sb-fade{0%{opacity:0}20%{opacity:1}100%{opacity:0}}
  @media (prefers-reduced-motion:reduce){.ft-i{transform:translate(var(--x),var(--y));animation:sb-fade 2s forwards}}
  .fb{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--sb-bubble-color,#111827)}
  .fb[hidden]{display:none}
  .fb-emoji{font-size:72px;line-height:1}
  `;
    const TEMPLATE =
        '<style>' +
        CSS +
        '</style>' +
        '<div class="stage" part="stage">' +
        '<canvas class="fx" aria-hidden="true"></canvas><div class="ft" aria-hidden="true"></div>' +
        '<div class="bubble" part="bubble" aria-hidden="true"><div class="bubble-body" part="bubble-body"><span class="bubble-text">Zzz... 💤</span></div></div>' +
        '<div class="fb" hidden><div class="fb-emoji"></div><div class="fb-text"></div></div>' +
        '</div>';

    const ATTRS = [
        'character',
        'name',
        'width',
        'height',
        'scale',
        'follow',
        'fly-speed',
        'fly-range',
        'track',
        'turn',
        'color',
        'color-2',
        'color-3',
        'eye-color',
        'bubble',
        'bubble-bg',
        'bubble-color',
        'bubble-scale',
        'bubble-font-size',
        'auto-sleep',
        'sleep-delay',
        'always-awake',
        'interactive',
        'blink',
        'shadow',
        'background',
        'three-src',
        'reduce-motion',
        'custom-src',
        'custom-type',
        'size',
        'float-text',
        'float-when',
        'float-interval',
        'float-color',
        'float-size',
        'splash',
        'splash-type',
        'splash-color',
        'splash-amount',
    ];
    const PALETTE_ATTRS = [
        'color',
        'color-2',
        'color-3',
        'eye-color',
        'custom-src',
        'custom-type',
    ];

    function parseMessages(v) {
        if (!v || !v.trim()) return null;
        v = v.trim();
        if (v.charAt(0) === '[') {
            try {
                const arr = JSON.parse(v);
                if (Array.isArray(arr) && arr.length) return arr.map(String);
            } catch (e) {
                /* fall back to the | separator */
            }
        }
        const parts = v
            .split('|')
            .map(function (s) {
                return s.trim();
            })
            .filter(Boolean);
        return parts.length ? parts : null;
    }

    function disposeObject(obj) {
        obj.traverse(function (o) {
            if (o.geometry) o.geometry.dispose();
            if (o.material) {
                (Array.isArray(o.material) ? o.material : [o.material]).forEach(
                    function (m) {
                        Object.keys(m).forEach(function (k) {
                            if (m[k] && m[k].isTexture) m[k].dispose();
                        });
                        m.dispose();
                    }
                );
            }
        });
    }

    /* -----------------------------------  Element ---------------------------------- */
    class SleepyBuddy extends HTMLElement {
        static get observedAttributes() {
            return ATTRS.concat(
                ATTRS.map((a) => 'data-' + a),
                ['config', 'data-config']
            );
        }

        static defineCharacter(id, def) {
            CHARACTERS[String(id).toLowerCase()] = Object.assign(
                {
                    name: String(id),
                    emoji: '🙂',
                    bubbleY: 1.4,
                    floaty: 0.06,
                    hit: { radius: 1.25, y: 0 },
                    defaults: {},
                },
                def
            );
        }

        constructor(options) {
            super();
            const root = this.attachShadow({ mode: 'open' });
            root.innerHTML = TEMPLATE;
            this._stage = root.querySelector('.stage');
            this._bubble = root.querySelector('.bubble');
            this._bubbleBody = root.querySelector('.bubble-body');
            this._bubbleText = root.querySelector('.bubble-text');
            this._fb = root.querySelector('.fb');
            this._fx = root.querySelector('.fx');
            this._ft = root.querySelector('.ft');
            this._parts = [];
            this._emitAcc = 0;
            this._burst = false;
            this._fxDirty = false;
            this._ftIdx = 0;
            this._ftLast = 0;
            this._fxm = null;
            this._defCols = null;
            this._ready = this._booting = this._failed = false;
            this._raf = 0;
            this._visible = true;
            this._sizeSet = {};
            this._varsSet = {};
            this._lastText = null;
            this._hitY = 0;
            this._blobUrl = null;
            this._mq = window.matchMedia
                ? window.matchMedia('(prefers-reduced-motion: reduce)')
                : null;
            [
                '_tick',
                '_onMove',
                '_onDown',
                '_onUp',
                '_onLeave',
                '_onKey',
                '_onFocus',
            ].forEach((k) => (this[k] = this[k].bind(this)));
            this._cfgObj = options && typeof options === 'object' ? options : null; // new SleepyBuddy({ ... })
            if (this._cfgObj && this._cfgObj.container) {
                const c = this._cfgObj.container;
                const host = typeof c === 'string' ? document.querySelector(c) : c;
                if (host && host.appendChild) host.appendChild(this);
                else console.warn('[sleepy-buddy] container not found:', c);
            }
        }

        connectedCallback() {
            this._readConfig();
            this._a11y();
            this._applyHost();
            this._boot();
        }
        disconnectedCallback() {
            this._teardown();
        }

        attributeChangedCallback(name, oldV, newV) {
            if (oldV === newV) return;
            const key = name.replace(/^data-/, '');
            if (key === 'config') {
                this._reconfigure();
                return;
            }
            this._readConfig();
            this._applyHost();
            if (key === 'interactive') this._a11y();
            if (this._failed) this._paintFallback();
            if (!this._ready) return;
            if (key === 'character') this._queueChar(true);
            else if (PALETTE_ATTRS.indexOf(key) !== -1)
                this._queueChar(key.indexOf('custom') === 0);
            else if (key === 'name') this._setBubble(true);
            this._resize();
        }

        // merge consecutive attribute changes into a single rebuild
        _queueChar(reset) {
            this._qReset = this._qReset || reset;
            if (this._q) return;
            this._q = true;
            Promise.resolve().then(() => {
                this._q = false;
                const r = this._qReset;
                this._qReset = false;
                if (this._ready) this._setCharacter(r);
            });
        }

        /* ---------- config sources: attribute > data-* > JSON ---------- */
        _raw(n) {
            if (this.hasAttribute(n)) return this.getAttribute(n);
            if (this.hasAttribute('data-' + n)) return this.getAttribute('data-' + n);
            const j = this._json;
            return j && Object.prototype.hasOwnProperty.call(j, n) ? j[n] : null;
        }

        // Merges the JSON attribute (config / data-config) with the object given to the constructor or el.config
        _parseJson() {
            let fromAttr = {};
            const raw =
                this.getAttribute('config') || this.getAttribute('data-config');
            if (raw) {
                try {
                    const o = JSON.parse(raw);
                    if (o && typeof o === 'object') fromAttr = o;
                } catch (e) {
                    if (this._badJson !== raw)
                        console.warn(
                            '[sleepy-buddy] Invalid JSON in config attribute:',
                            e.message
                        );
                    this._badJson = raw;
                }
            }
            const out = {};
            const warned = this._warned || (this._warned = {});
            [fromAttr, this._cfgObj || {}].forEach(function (o) {
                Object.keys(o).forEach(function (k) {
                    if (k === 'container') return;
                    const key = normKey(k),
                        v = o[k];
                    if (v === null || v === undefined) return;
                    if (ATTRS.indexOf(key) === -1 && !warned[key]) {
                        warned[key] = true;
                        console.warn('[sleepy-buddy] Unknown option: ' + k);
                    }
                    out[key] = Array.isArray(v) ? v.join('|') : String(v);
                });
            });
            return out;
        }

        _reconfigure() {
            const prev = this._cfg || {};
            this._readConfig();
            this._applyHost();
            this._a11y();
            if (this._failed) this._paintFallback();
            if (!this._ready) return;
            const c = this._cfg;
            this._queueChar(
                c.character !== prev.character ||
                c.customSrc !== prev.customSrc ||
                c.customType !== prev.customType
            );
            this._setBubble(true);
            this._resize();
        }

        // Removes options from the JSON sources (used when switching character)
        _dropOptions(keys) {
            const strip = (o) => {
                const out = {};
                Object.keys(o || {}).forEach((k) => {
                    if (keys.indexOf(normKey(k)) === -1) out[k] = o[k];
                });
                return out;
            };
            if (this._cfgObj) this._cfgObj = strip(this._cfgObj);
            ['config', 'data-config'].forEach((a) => {
                const raw = this.getAttribute(a);
                if (!raw) return;
                try {
                    this.setAttribute(a, JSON.stringify(strip(JSON.parse(raw))));
                } catch (e) {
                    /* invalid JSON: leave it */
                }
            });
        }

        /* ---------- config ---------- */
        _readConfig() {
            this._json = this._parseJson();
            const g = (n, d) => {
                const v = this._raw(n);
                return v === null ? d : v;
            };
            const num = (n, d, lo, hi) => {
                const v = parseFloat(g(n, ''));
                return isFinite(v) ? clamp(v, lo, hi) : d;
            };
            const bool = (n, d) => {
                const raw = this._raw(n);
                if (raw === null) return d;
                const v = raw.trim().toLowerCase();
                return !(v === 'false' || v === '0' || v === 'off' || v === 'no');
            };
            const follow = (g('follow', 'look') || 'look').toLowerCase();
            const pick = (n, list, d) => {
                const v = (g(n, d) || d).toLowerCase();
                return list.indexOf(v) !== -1 ? v : d;
            };
            const ct = (g('custom-type', '') || '').toLowerCase();
            this._cfg = {
                character: (g('character', 'long') || 'long').toLowerCase(),
                name: g('name', ''),
                scale: num('scale', 1, 0.2, 3),
                follow: follow === 'none' || follow === 'fly' ? follow : 'look',
                flySpeed: num('fly-speed', 3, 0.5, 12),
                flyRange: num('fly-range', 0.75, 0.1, 1),
                track:
                    (g('track', 'window') || '').toLowerCase() === 'element'
                        ? 'element'
                        : 'window',
                turn: num('turn', 1, 0, 3),
                color: g('color', ''),
                color2: g('color-2', ''),
                color3: g('color-3', ''),
                eyeColor: g('eye-color', ''),
                bubble: bool('bubble', true),
                bubbleBg: g('bubble-bg', ''),
                bubbleColor: g('bubble-color', ''),
                bubbleScale: num('bubble-scale', 1, 0.4, 3),
                bubbleFontSize: num('bubble-font-size', 0, 8, 64),
                autoSleep: bool('auto-sleep', true),
                sleepDelay: num('sleep-delay', 2500, 200, 600000),
                alwaysAwake:
                    this._raw('always-awake') !== null && bool('always-awake', true),
                interactive: bool('interactive', true),
                blink: bool('blink', true),
                shadow: bool('shadow', true),
                background: g('background', ''),
                threeSrc: g('three-src', ''),
                reduceMotion: (g('reduce-motion', 'auto') || 'auto').toLowerCase(),
                customSrc: g('custom-src', ''),
                customType: ct === 'image' || ct === 'model' ? ct : '',
                size:
                    SIZES[(g('size', '') || '').toLowerCase()] ||
                    num('size', 0, 40, 1200),
                floatText: parseMessages(g('float-text', '')),
                floatWhen: pick('float-when', ['sleep', 'awake', 'always'], 'sleep'),
                floatInterval: num('float-interval', 1400, 300, 60000),
                floatColor: g('float-color', ''),
                floatSize: num('float-size', 18, 8, 80),
                splash: bool('splash', true),
                splashType: pick(
                    'splash-type',
                    ['drops', 'bubbles', 'sparkle'],
                    'drops'
                ),
                splashColors: (function () {
                    const a = g('splash-color', '')
                        .split('|')
                        .map(function (x) {
                            return x.trim();
                        })
                        .filter(Boolean);
                    return a.length ? a : null;
                })(),
                splashAmount: num('splash-amount', 1, 0, 3),
            };
        }

        _reduced() {
            const m = this._cfg.reduceMotion;
            if (m === 'true' || m === 'on') return true;
            if (m === 'false' || m === 'off') return false;
            return !!(this._mq && this._mq.matches);
        }

        _applyHost() {
            const cfg = this._cfg,
                st = this.style;
            const dim = (v) => (/^\d+(\.\d+)?$/.test(v.trim()) ? v.trim() + 'px' : v);
            ['width', 'height'].forEach((k) => {
                const v = this._raw(k);
                if (v) {
                    st.setProperty(k, dim(v));
                    this._sizeSet[k] = true;
                } else if (this._sizeSet[k]) {
                    st.removeProperty(k);
                    this._sizeSet[k] = false;
                }
            });
            const vars = {
                '--sb-bg': cfg.background,
                '--sb-bubble-bg': cfg.bubbleBg,
                '--sb-bubble-color': cfg.bubbleColor,
                '--sb-bubble-font-size': cfg.bubbleFontSize
                    ? cfg.bubbleFontSize + 'px'
                    : '',
                '--sb-pill': cfg.bubbleScale !== 1 ? String(cfg.bubbleScale) : '',
            };
            Object.keys(vars).forEach((k) => {
                if (vars[k]) {
                    st.setProperty(k, vars[k]);
                    this._varsSet[k] = true;
                } else if (this._varsSet[k]) {
                    st.removeProperty(k);
                    this._varsSet[k] = false;
                }
            });
            this._bubble.classList.toggle('off', !cfg.bubble);
        }

        /* ---------- custom character (image / model) ---------- */
        _customType() {
            const c = this._cfg;
            return (
                c.customType ||
                (/\.(glb|gltf)([?#]|$)/i.test(c.customSrc) ? 'model' : 'image')
            );
        }

        _customDef() {
            const self = this;
            const url = this._cfg.customSrc;
            const type = this._customType();
            return {
                name: this._cfg.name || 'Buddy',
                emoji: '✨',
                height: 2.3,
                bubbleY: 1.7,
                floaty: 0.06,
                hit: { radius: 1.35, y: 0 },
                defaults: {},
                build(c, h) {
                    const T = h.THREE;
                    const fail = (e) =>
                        self._reportError(
                            e instanceof Error
                                ? e
                                : new Error('Failed to load custom character: ' + url)
                        );
                    const g = new T.Group();

                    if (type === 'image') {
                        const mat = new T.MeshBasicMaterial({
                            transparent: true,
                            side: T.DoubleSide,
                            alphaTest: 0.02,
                        });
                        const mesh = new T.Mesh(new T.PlaneGeometry(2.2, 2.2), mat);
                        g.add(mesh);
                        new T.TextureLoader().load(
                            url,
                            (tex) => {
                                if (T.sRGBEncoding && h.legacy) tex.encoding = T.sRGBEncoding;
                                if (T.SRGBColorSpace && !h.legacy)
                                    tex.colorSpace = T.SRGBColorSpace;
                                mat.map = tex;
                                mat.needsUpdate = true;
                                mesh.scale.x = tex.image.width / tex.image.height; // keep the image aspect ratio
                            },
                            undefined,
                            fail
                        );
                        return {
                            root: g,
                            tick(st) {
                                mat.color.setScalar(st.awake ? 1 : 0.75);
                                mesh.rotation.z =
                                    st.awake && !st.reduce ? Math.sin(st.t * 6) * 0.05 : 0;
                            },
                        };
                    }

                    let mixer = null;
                    loadGLTF()
                        .then(() => {
                            new T.GLTFLoader().load(
                                url,
                                (gl) => {
                                    const m = gl.scene;
                                    const box = new T.Box3().setFromObject(m);
                                    const size = box.getSize(new T.Vector3());
                                    m.position.sub(box.getCenter(new T.Vector3()));
                                    const w = new T.Group();
                                    w.add(m);
                                    w.scale.setScalar(
                                        2.4 / (Math.max(size.x, size.y, size.z) || 1)
                                    ); // normalize size
                                    g.add(w);
                                    if (gl.animations && gl.animations.length) {
                                        mixer = new T.AnimationMixer(m);
                                        mixer.clipAction(gl.animations[0]).play();
                                    }
                                },
                                undefined,
                                fail
                            );
                        })
                        .catch(fail);
                    return {
                        root: g,
                        tick(st) {
                            if (mixer) mixer.update(st.awake ? st.dt : 0);
                        },
                    };
                },
            };
        }

        _defOf() {
            if (this._cfg.customSrc) return this._customDef();
            return CHARACTERS[this._cfg.character] || CHARACTERS.long;
        }

        // accepts a URL string or a File/Blob from <input type="file">
        _setCustom(src, type) {
            if (typeof Blob !== 'undefined' && src instanceof Blob) {
                const max = SleepyBuddy.maxFileSize;
                if (max && src.size > max) {
                    return this._reportError(
                        new Error(
                            'File is too large (' +
                            (src.size / 1048576).toFixed(1) +
                            ' MB). Limit: ' +
                            (max / 1048576).toFixed(1) +
                            ' MB.'
                        )
                    );
                }
                const fname = (src.name || '').toLowerCase();
                const valid =
                    type === 'model'
                        ? /\.(glb|gltf)$/.test(fname)
                        : /^image\//.test(src.type);
                if (!valid)
                    return this._reportError(
                        new Error(
                            'Unsupported file type: ' + (src.name || src.type || 'unknown')
                        )
                    );
            }
            let url = src;
            if (typeof Blob !== 'undefined' && src instanceof Blob)
                url = URL.createObjectURL(src);
            if (this._blobUrl && this._blobUrl !== url)
                URL.revokeObjectURL(this._blobUrl);
            this._blobUrl = url !== src ? url : null;
            this.setAttribute('custom-type', type);
            this.setAttribute('custom-src', url);
        }
        useImage(src) {
            this._setCustom(src, 'image');
        }
        useModel(src) {
            this._setCustom(src, 'model');
        }
        // Switch to a built-in character and restore its ORIGINAL colors
        // (color overrides and custom images/models are cleared).
        useCharacter(id) {
            if (this._blobUrl) {
                URL.revokeObjectURL(this._blobUrl);
                this._blobUrl = null;
            }
            const reset = [
                'custom-src',
                'custom-type',
                'color',
                'color-2',
                'color-3',
                'eye-color',
            ];
            this._dropOptions(reset);
            reset.forEach((a) => {
                this.removeAttribute(a);
                this.removeAttribute('data-' + a);
            });
            if (id) this.setAttribute('character', id);
        }

        _palette(def) {
            const h = this._h,
                cfg = this._cfg,
                d = def.defaults || {};
            const main = h.col(cfg.color, d.color);
            return {
                main: main,
                light: h.col(cfg.color2, d.color2),
                detail: h.col(cfg.color3, d.color3),
                eye: h.col(cfg.eyeColor, d.eye),
                dark: main.clone().multiplyScalar(0.78),
            };
        }

        /* ---------- error & fallback ---------- */
        _reportError(err) {
            console.error('[sleepy-buddy]', err);
            this.dispatchEvent(
                new CustomEvent('buddy-error', {
                    detail: { error: err },
                    bubbles: true,
                    composed: true,
                })
            );
        }

        _showFallback(err) {
            this._failed = true;
            this._reportError(err);
            if (!this._fbBound) {
                this._fbBound = true;
                this.addEventListener('pointerenter', () => {
                    this._fbAwake = true;
                    this._paintFallback();
                });
                this.addEventListener('pointerleave', () => {
                    this._fbAwake = false;
                    this._paintFallback();
                });
            }
            this._paintFallback();
        }

        _paintFallback() {
            const def = this._defOf();
            const name = this._cfg.name || def.name;
            this._fb.hidden = false;
            this._bubble.classList.add('off');
            this._fb.querySelector('.fb-emoji').textContent = this._fbAwake
                ? def.emoji || '🙂'
                : '😴';
            this._fb.querySelector('.fb-text').textContent = this._cfg.bubble
                ? name
                : '';
            this._label(name + (this._fbAwake ? ', awake' : ', sleeping'));
        }

        // Interactive elements are focusable buttons (Enter / Space = poke); otherwise a plain image.
        _a11y() {
            const on = this._cfg.interactive;
            if (!this.hasAttribute('role') || this._autoRole) {
                this.setAttribute('role', on ? 'button' : 'img');
                this._autoRole = true;
            }
            if (!this.hasAttribute('tabindex') || this._autoTab) {
                if (on) {
                    this.setAttribute('tabindex', '0');
                    this._autoTab = true;
                } else if (this._autoTab) {
                    this.removeAttribute('tabindex');
                    this._autoTab = false;
                }
            }
        }

        _label(text) {
            if (this.hasAttribute('aria-label') && !this._autoLabel) return; // respect a user-provided label
            this._autoLabel = true;
            this.setAttribute('aria-label', text);
        }

        /* ---------- boot / teardown ---------- */
        _boot() {
            if (this._ready || this._booting || this._failed) return;
            this._booting = true;
            loadThree(this._cfg.threeSrc)
                .then((THREE) => {
                    this._booting = false;
                    if (!this.isConnected || this._ready) return;
                    this._init(THREE);
                })
                .catch((err) => {
                    this._booting = false;
                    this._showFallback(err);
                });
        }

        _init(THREE) {
            this._T = THREE;
            this._hp = makeHelpers(THREE);
            this._h = this._hp;

            let renderer;
            try {
                renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: true,
                    powerPreference: 'high-performance',
                });
            } catch (e) {
                this._showFallback(e);
                return;
            }
            renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            renderer.setClearColor(0x000000, 0);
            if (this._hp.legacy) renderer.outputEncoding = THREE.sRGBEncoding; // r152+ is sRGB by default
            this._stage.insertBefore(renderer.domElement, this._stage.firstChild);
            this._r = renderer;
            renderer.domElement.addEventListener('webglcontextlost', function (e) {
                e.preventDefault();
            });
            SleepyBuddy._live = (SleepyBuddy._live || 0) + 1;
            if (SleepyBuddy._live > 6)
                console.warn(
                    '[sleepy-buddy] ' +
                    SleepyBuddy._live +
                    ' instances active; browsers limit WebGL contexts (about 8-16).'
                );

            const scene = new THREE.Scene();
            const cam = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
            cam.position.set(0, 0, 7);
            this._scene = scene;
            this._cam = cam;

            const K = parseInt(THREE.REVISION, 10) >= 155 ? Math.PI : 1;
            scene.add(new THREE.AmbientLight(0xffffff, 0.9 * K));
            const key = new THREE.DirectionalLight(0xffffff, 1.6 * K);
            key.position.set(3, 5, 4);
            scene.add(key);
            const rim = new THREE.DirectionalLight(0x9ec5ff, 0.6 * K);
            rim.position.set(-4, 2, -3);
            scene.add(rim);

            this._fly = new THREE.Group();
            this._fly.position.set(0, HOME_Y, 0);
            scene.add(this._fly);
            this._rig = new THREE.Group();
            this._fly.add(this._rig);

            this._hit = new THREE.Mesh(
                new THREE.SphereGeometry(1.25, 16, 16),
                new THREE.MeshBasicMaterial({
                    transparent: true,
                    opacity: 0,
                    depthWrite: false,
                })
            );
            this._fly.add(this._hit);

            const sc = document.createElement('canvas');
            sc.width = sc.height = 128;
            const ctx = sc.getContext('2d');
            const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
            grad.addColorStop(0, 'rgba(0,0,0,0.35)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, 128, 128);
            this._shadow = new THREE.Mesh(
                new THREE.PlaneGeometry(2.8, 2.8),
                new THREE.MeshBasicMaterial({
                    map: new THREE.CanvasTexture(sc),
                    transparent: true,
                    depthWrite: false,
                })
            );
            this._shadow.rotation.x = -Math.PI / 2;
            scene.add(this._shadow);

            this._ray = new THREE.Raycaster();
            this._tmp = new THREE.Vector3();
            this._tmpV = new THREE.Vector2();
            this._fxCtx = this._fx.getContext('2d');
            this._s = {
                appear: 0,
                jump: 0,
                pokes: 0,
                awake: false,
                hovering: false,
                sticky: false,
                lastActive: -Infinity,
                flyAmt: 0,
                pos: { x: 0, y: HOME_Y },
                vx: 0,
                vy: 0,
                ptr: new THREE.Vector2(0, 0),
                look: { x: 0, y: 0 },
                bw: 0,
                bh: 0,
                shown: false,
            };

            window.addEventListener('pointermove', this._onMove, { passive: true });
            window.addEventListener('pointerup', this._onUp, { passive: true });
            window.addEventListener('pointercancel', this._onUp, { passive: true });
            document.documentElement.addEventListener('mouseleave', this._onLeave);
            this.addEventListener('pointerdown', this._onDown);
            this.addEventListener('keydown', this._onKey);
            this.addEventListener('focus', this._onFocus);

            if (typeof ResizeObserver !== 'undefined') {
                this._ro = new ResizeObserver(() => this._resize());
                this._ro.observe(this);
            }
            if (typeof IntersectionObserver !== 'undefined') {
                this._io = new IntersectionObserver((entries) => {
                    this._visible = entries[entries.length - 1].isIntersecting;
                    if (this._visible) this._start();
                });
                this._io.observe(this);
            }

            this._ready = true;
            this._setCharacter(true);
            this._resize();
            this._start();
        }

        _teardown() {
            if (this._raf) cancelAnimationFrame(this._raf);
            this._raf = 0;
            window.removeEventListener('pointermove', this._onMove);
            window.removeEventListener('pointerup', this._onUp);
            window.removeEventListener('pointercancel', this._onUp);
            document.documentElement.removeEventListener('mouseleave', this._onLeave);
            this.removeEventListener('pointerdown', this._onDown);
            this.removeEventListener('keydown', this._onKey);
            this.removeEventListener('focus', this._onFocus);
            if (this._ro) this._ro.disconnect();
            if (this._io) this._io.disconnect();
            this._ro = this._io = null;
            if (this._built) disposeObject(this._built.root);
            if (this._hit) disposeObject(this._hit);
            if (this._shadow) disposeObject(this._shadow);
            if (this._r) {
                SleepyBuddy._live = Math.max(0, (SleepyBuddy._live || 0) - 1);
                this._r.dispose();
                try {
                    this._r.forceContextLoss();
                } catch (e) {
                    /* optional */
                }
                if (this._r.domElement.parentNode)
                    this._r.domElement.parentNode.removeChild(this._r.domElement);
            }
            this._built =
                this._r =
                this._scene =
                this._cam =
                this._fly =
                this._rig =
                this._hit =
                this._shadow =
                null;
            this._parts.length = 0;
            this._ft.textContent = '';
            this._fxCtx = null;
            this._ready = false;
            this._lastText = null;
            this._bubble.classList.remove('on');
        }

        _start() {
            if (this._raf || !this._ready) return;
            this._last = performance.now();
            this._raf = requestAnimationFrame(this._tick);
        }

        /* ---------- character & pill ---------- */
        _setCharacter(reset) {
            const s = this._s,
                T = this._T;
            const def = this._defOf();
            this._def = def;
            const d0 = def.defaults || {};
            this._defCols = [
                this._cfg.color || d0.color,
                this._cfg.color3 || d0.color3,
                this._cfg.color2 || d0.color2,
            ].filter(Boolean);

            if (this._built) {
                this._rig.remove(this._built.root);
                disposeObject(this._built.root);
            }
            this._built = def.build(this._palette(def), this._h);
            this._rig.add(this._built.root);

            // per-character hit area
            const hit = def.hit || {};
            this._hit.geometry.dispose();
            this._hit.geometry = new T.SphereGeometry(hit.radius || 1.25, 16, 16);
            this._hitY = hit.y || 0;

            if (reset) {
                s.appear = 0;
                s.jump = 0;
                s.pokes = 0;
                s.hovering = false;
                s.sticky = false;
                s.lastActive = -Infinity;
                this._rig.rotation.set(0, 0, 0);
                this._setAwake(false);
            }
            this._setBubble(true);
        }

        _nameText() {
            return this._cfg.name || (this._def || this._defOf()).name;
        }

        // The pill always shows the character name
        _setBubble(force) {
            const s = this._s;
            if (!s) return;
            const text = this._nameText();
            this._label(text + (s.awake ? ', awake' : ', sleeping'));
            if (!force && text === this._lastText) return;
            this._lastText = text;
            this._bubbleText.textContent = text;
            this._bubbleBody.classList.remove('pop');
            void this._bubbleBody.offsetWidth;
            this._bubbleBody.classList.add('pop');
            s.bw = this._bubbleBody.offsetWidth;
            s.bh = this._bubbleBody.offsetHeight;
        }

        _setAwake(a) {
            const s = this._s;
            if (a === s.awake) return;
            s.awake = a;
            this._setBubble(a); // replay the pop animation on wake
            this.dispatchEvent(
                new CustomEvent(a ? 'buddy-wake' : 'buddy-sleep', {
                    detail: { character: this._cfg.character },
                    bubbles: true,
                    composed: true,
                })
            );
        }

        /* ---------- public API ---------- */
        wake() {
            if (!this._ready) return;
            this._s.lastActive = performance.now();
            if (!this._cfg.autoSleep) this._s.sticky = true;
            this._setAwake(true);
        }
        sleep() {
            if (!this._ready) return;
            const s = this._s;
            s.sticky = false;
            s.hovering = false;
            s.lastActive = -Infinity;
            this._setAwake(false);
        }
        poke() {
            if (!this._ready) return;
            const s = this._s;
            s.pokes += 1;
            s.jump = 1;
            s.lastActive = performance.now();
            this._burst = true;
            if (!this._cfg.autoSleep) s.sticky = true;
            this._setAwake(true);
            this._setBubble(false);
            this.dispatchEvent(
                new CustomEvent('buddy-poke', {
                    detail: { character: this._cfg.character },
                    bubbles: true,
                    composed: true,
                })
            );
        }

        /* ---------- pointer ---------- */
        _toNdc(e, out) {
            const r = this.getBoundingClientRect();
            if (!r.width || !r.height) return null;
            out.set(
                ((e.clientX - r.left) / r.width) * 2 - 1,
                -((e.clientY - r.top) / r.height) * 2 + 1
            );
            return (
                e.clientX >= r.left &&
                e.clientX <= r.right &&
                e.clientY >= r.top &&
                e.clientY <= r.bottom
            );
        }
        _hitTest() {
            this._ray.setFromCamera(this._s.ptr, this._cam);
            return this._ray.intersectObject(this._hit, false).length > 0;
        }
        _onMove(e) {
            if (!this._ready) return;
            const s = this._s,
                cfg = this._cfg;
            const inside = this._toNdc(e, this._tmpV);
            if (inside === null) return;
            if (cfg.track === 'element' && !inside) {
                s.hovering = false;
                return;
            }
            s.ptr.copy(this._tmpV);
            if (cfg.follow === 'fly') s.lastActive = performance.now();
            s.hovering = cfg.interactive ? this._hitTest() : false;
        }
        _onDown(e) {
            if (!this._ready || !this._cfg.interactive) return;
            if (this._toNdc(e, this._s.ptr) === null) return;
            if (this._hitTest()) this.poke();
        }
        _onUp(e) {
            if (this._ready && e.pointerType && e.pointerType !== 'mouse')
                this._s.hovering = false;
        }
        _onKey(e) {
            if (!this._ready || !this._cfg.interactive) return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.poke();
            }
        }
        _onFocus() {
            if (this._ready && this._cfg.interactive) this.wake();
        }
        _onLeave() {
            if (this._ready) this._s.hovering = false;
        }

        /* ---------- effects: splash + floating text ---------- */
        _fxColors() {
            return (
                this._cfg.splashColors ||
                (this._defCols && this._defCols.length
                    ? this._defCols
                    : ['#7fd4ff', '#ffffff', '#ffd1e8'])
            );
        }

        _spawn(kind, x, y, vx, vy) {
            const cols = this._fxColors();
            const p = {
                x: x,
                y: y,
                vx: vx,
                vy: vy,
                t: 0,
                kind: kind,
                col: cols[(Math.random() * cols.length) | 0],
                g: 0,
                size: 4,
                max: 1,
            };
            if (kind === 'drops') {
                p.g = 720;
                p.size = 3 + Math.random() * 4;
                p.max = 0.6 + Math.random() * 0.5;
            } else if (kind === 'bubbles') {
                p.g = -70;
                p.size = 4 + Math.random() * 7;
                p.max = 1 + Math.random() * 0.8;
            } else {
                p.size = 4 + Math.random() * 6;
                p.max = 0.5 + Math.random() * 0.6;
            } // sparkle
            this._parts.push(p);
        }

        // Manual floating text, e.g. el.spawnText("+1 ❤️")
        spawnText(text) {
            if (
                !this._ready ||
                !this._fxm ||
                text === undefined ||
                text === null ||
                text === ''
            )
                return;
            const m = this._fxm,
                s = this._s,
                cfg = this._cfg;
            const r = m.sc * m.ppu;
            const x =
                this._w / 2 + s.pos.x * m.ppu + r * (0.45 + Math.random() * 0.5);
            const y = this._hgt / 2 - s.pos.y * m.ppu - r * this._def.bubbleY * 0.55;
            const el = document.createElement('span');
            el.className = 'ft-i';
            el.textContent = String(text);
            el.style.setProperty('--x', x.toFixed(1) + 'px');
            el.style.setProperty('--y', y.toFixed(1) + 'px');
            el.style.setProperty('--dx', (Math.random() * 50 - 10).toFixed(0) + 'px');
            el.style.fontSize =
                (cfg.floatSize * (0.85 + Math.random() * 0.4)).toFixed(0) + 'px';
            if (cfg.floatColor) el.style.color = cfg.floatColor;
            el.addEventListener('animationend', () => el.remove());
            if (this._ft.children.length > 14) this._ft.firstChild.remove();
            this._ft.appendChild(el);
        }

        _fxStep(dt, now, active, reduce, flying, ppu, sc) {
            const ctx = this._fxCtx,
                cfg = this._cfg,
                s = this._s,
                parts = this._parts;
            if (!ctx) return;
            const cx = this._w / 2 + s.pos.x * ppu,
                cy = this._hgt / 2 - s.pos.y * ppu;
            const r = sc * ppu;
            const vxp = s.vx * ppu,
                vyp = -s.vy * ppu; // on-screen velocity (px/s)
            const speed = Math.hypot(vxp, vyp);
            const rnd = (a) => (Math.random() - 0.5) * a;

            // splash: emitted behind the character while flying, bursts on poke
            if (cfg.splash && cfg.splashAmount > 0 && !reduce) {
                if (flying && active && speed > 60) {
                    const ux = vxp / speed,
                        uy = vyp / speed;
                    this._emitAcc += Math.min(70, speed * 0.09) * cfg.splashAmount * dt;
                    while (this._emitAcc >= 1 && parts.length < 260) {
                        this._emitAcc -= 1;
                        this._spawn(
                            cfg.splashType,
                            cx - ux * r * 0.6 + rnd(r * 0.8),
                            cy - uy * r * 0.6 + rnd(r * 0.8),
                            -vxp * 0.2 + rnd(120),
                            -vyp * 0.2 + rnd(120) - 30
                        );
                    }
                } else this._emitAcc = 0;
                if (this._burst) {
                    for (let i = 0; i < 16 && parts.length < 260; i++) {
                        const a = (i / 16) * Math.PI * 2 + Math.random() * 0.4,
                            v = 140 + Math.random() * 220;
                        this._spawn(
                            cfg.splashType,
                            cx + Math.cos(a) * r * 0.5,
                            cy + Math.sin(a) * r * 0.5 - r * 0.2,
                            Math.cos(a) * v,
                            Math.sin(a) * v - 120
                        );
                    }
                }
            }
            this._burst = false;

            // automatic floating text
            const ft = cfg.floatText;
            if (ft && ft.length && !reduce) {
                const ok =
                    cfg.floatWhen === 'always' ||
                    (cfg.floatWhen === 'awake' ? active : !active);
                if (ok && now - this._ftLast > cfg.floatInterval) {
                    this._ftLast = now;
                    this.spawnText(ft[this._ftIdx++ % ft.length]);
                }
            }

            if (!parts.length) {
                if (this._fxDirty) {
                    ctx.clearRect(0, 0, this._w, this._hgt);
                    this._fxDirty = false;
                }
                return;
            }
            this._fxDirty = true;
            ctx.clearRect(0, 0, this._w, this._hgt);
            for (let i = parts.length - 1; i >= 0; i--) {
                const p = parts[i];
                p.t += dt;
                if (p.t >= p.max) {
                    parts[i] = parts[parts.length - 1];
                    parts.pop();
                    continue;
                }
                const k = p.t / p.max;
                p.vy += p.g * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.vx *= 1 - Math.min(1, 1.2 * dt);
                ctx.globalAlpha = 1 - k * k;
                ctx.fillStyle = ctx.strokeStyle = p.col;
                if (p.kind === 'drops') {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * (1 - 0.5 * k), 0, 6.2832);
                    ctx.fill();
                } else if (p.kind === 'bubbles') {
                    ctx.lineWidth = 1.6;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size * (1 + 0.6 * k), 0, 6.2832);
                    ctx.stroke();
                    ctx.globalAlpha *= 0.2;
                    ctx.fill();
                } else {
                    const z = p.size * (1 - 0.3 * k);
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.t * 3);
                    ctx.beginPath();
                    ctx.moveTo(0, -z);
                    ctx.lineTo(z * 0.3, -z * 0.3);
                    ctx.lineTo(z, 0);
                    ctx.lineTo(z * 0.3, z * 0.3);
                    ctx.lineTo(0, z);
                    ctx.lineTo(-z * 0.3, z * 0.3);
                    ctx.lineTo(-z, 0);
                    ctx.lineTo(-z * 0.3, -z * 0.3);
                    ctx.closePath();
                    ctx.fill();
                    ctx.restore();
                }
            }
            ctx.globalAlpha = 1;
        }

        /* ---------- resize ---------- */
        _resize() {
            if (!this._ready) return;
            const w = this.clientWidth,
                hh = this.clientHeight;
            if (!w || !hh) return;
            this._w = w;
            this._hgt = hh;
            this._r.setSize(w, hh, false);
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            this._fx.width = Math.round(w * dpr);
            this._fx.height = Math.round(hh * dpr);
            if (this._fxCtx) this._fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this._cam.aspect = w / hh;
            this._cam.position.z = Math.max(7, 4.7 / this._cam.aspect);
            this._cam.updateProjectionMatrix();
            this._s.bw = this._bubbleBody.offsetWidth;
            this._s.bh = this._bubbleBody.offsetHeight;
        }

        /* ---------- render loop ---------- */
        _tick(now) {
            this._raf = 0;
            if (!this._ready || !this._visible) return;
            this._raf = requestAnimationFrame(this._tick);
            if (!this._w) {
                this._resize();
                if (!this._w) return;
            }

            const T = this._T,
                s = this._s,
                cfg = this._cfg,
                def = this._def,
                cam = this._cam,
                rig = this._rig;
            const halfH =
                Math.tan(T.MathUtils.degToRad(cam.fov / 2)) * cam.position.z;
            const ppu = this._hgt / (2 * halfH); // pixels per scene unit
            // size = character height in px; scale = extra multiplier
            const sc =
                (cfg.size ? cfg.size / ppu / (def.height || 2.2) : 1) * cfg.scale;
            const dt = Math.min(0.05, Math.max(0.001, (now - this._last) / 1000));
            this._last = now;
            const t = now / 1000;
            const reduce = this._reduced();
            const flying = cfg.follow === 'fly' && !reduce; // flying is disabled with reduced motion

            if (s.hovering) s.lastActive = now;
            const active =
                cfg.alwaysAwake || s.sticky || now - s.lastActive < cfg.sleepDelay;
            if (!cfg.autoSleep && active) s.sticky = true;
            this._setAwake(active);

            const halfW = halfH * cam.aspect;

            let tx = 0,
                ty = HOME_Y;
            if (flying && active) {
                const nx = clamp(s.ptr.x, -1, 1),
                    ny = clamp(s.ptr.y, -1, 1);
                const rx = Math.max(0, halfW - 1.25 * sc) * cfg.flyRange;
                const ru = Math.max(0, halfH - 1.7 * sc) * cfg.flyRange;
                const rd = Math.max(0, halfH - 1.2 * sc) * cfg.flyRange;
                tx = nx * rx;
                ty = ny >= 0 ? ny * ru : ny * rd;
            }
            const ox = s.pos.x,
                oy = s.pos.y;
            s.pos.x = damp(ox, tx, cfg.flySpeed, dt);
            s.pos.y = damp(oy, ty, cfg.flySpeed, dt);
            s.vx = (s.pos.x - ox) / dt;
            s.vy = (s.pos.y - oy) / dt;
            this._fly.position.set(s.pos.x, s.pos.y, 0);
            s.flyAmt = damp(s.flyAmt, flying && active ? 1 : 0, 6, dt);

            s.appear = Math.min(1, s.appear + dt * (reduce ? 8 : 2.2));
            const x = s.appear - 1;
            const pop = Math.max(0.0001, 1 + 2.70158 * x * x * x + 1.70158 * x * x);
            s.jump = Math.max(0, s.jump - dt * 2.2);
            const hop = Math.sin(s.jump * Math.PI) * (reduce ? 0.1 : 0.45);
            const m = reduce ? 0 : 1; // decorative motion multiplier
            const breathe =
                (active ? Math.sin(t * 4) * 0.03 : Math.sin(t * 1.2) * 0.04) * m;
            const floaty = def.floaty * (1 + s.flyAmt * 0.5) * m;

            rig.position.y =
                (floaty * Math.sin(t * 1.6) +
                    breathe +
                    hop +
                    s.flyAmt * 0.1 * Math.sin(t * 5)) *
                sc;
            const k = sc * pop;
            rig.scale.set(
                k * (1 + breathe * 0.5),
                k * (1 - breathe * 0.5),
                k * (1 + breathe * 0.5)
            );
            this._hit.scale.setScalar(sc);
            this._hit.position.y = this._hitY * sc;

            this._tmp.copy(this._fly.position).project(cam);
            const lookOn = active && cfg.follow !== 'none';
            const lx = lookOn ? clamp((s.ptr.x - this._tmp.x) * 1.15, -1, 1) : 0;
            const ly = lookOn ? clamp((s.ptr.y - this._tmp.y) * 1.15, -1, 1) : 0;
            s.look.x = damp(s.look.x, lx, 8, dt);
            s.look.y = damp(s.look.y, ly, 8, dt);

            const tiltZ = flying ? clamp(-s.vx * 0.07, -0.5, 0.5) : 0;
            const tiltX = flying ? clamp(-s.vy * 0.04, -0.3, 0.3) : 0;
            const tY = s.look.x * 0.8 * cfg.turn * (reduce ? 0.5 : 1);
            const tX = (active ? -s.look.y * 0.4 * cfg.turn : 0.12) + tiltX;
            const tZ =
                (active
                    ? -s.look.x * 0.06 * cfg.turn
                    : 0.08 + Math.sin(t * 0.8) * 0.05 * m) + tiltZ;
            rig.rotation.y = damp(rig.rotation.y, tY, 10, dt);
            rig.rotation.x = damp(rig.rotation.x, tX, 10, dt);
            rig.rotation.z = damp(rig.rotation.z, tZ, 8, dt);

            this._built.tick({
                awake: active,
                dt: dt,
                t: reduce ? 0 : t,
                look: s.look,
                fly: s.flyAmt,
                blink: cfg.blink && !reduce,
                reduce: reduce,
            });

            const shadow = this._shadow;
            shadow.visible = cfg.shadow;
            if (cfg.shadow) {
                const homeFloor = HOME_Y - 1.15 * sc;
                const floorY = flying ? Math.min(homeFloor, -halfH * 0.9) : homeFloor;
                const height = clamp(
                    (s.pos.y - floorY - 1.15 * sc) / (2 * halfH),
                    0,
                    1
                );
                const shScale = sc * pop * (1 - hop * 0.6) * (1 - 0.5 * height);
                shadow.position.set(s.pos.x, floorY, 0);
                shadow.scale.set(shScale, shScale, shScale);
                shadow.material.opacity = 1 - 0.7 * height;
            }

            this._fxm = { ppu: ppu, sc: sc };
            this._fxStep(dt, now, active, reduce, flying, ppu, sc);

            if (cfg.bubble) {
                this._tmp.set(s.pos.x, s.pos.y + def.bubbleY * sc, 0).project(cam);
                const hw = s.bw / 2 + 6;
                const bx = clamp(
                    (this._tmp.x * 0.5 + 0.5) * this._w,
                    hw,
                    Math.max(hw, this._w - hw)
                );
                const by = Math.max(
                    s.bh + 14,
                    (-this._tmp.y * 0.5 + 0.5) * this._hgt - 8
                );
                this._bubble.style.transform =
                    'translate3d(-50%,-100%,0) translate3d(' +
                    bx.toFixed(1) +
                    'px,' +
                    by.toFixed(1) +
                    'px,0)';
                if (!s.shown) {
                    this._bubble.classList.add('on');
                    s.shown = true;
                }
            }

            this._r.render(this._scene, cam);
        }
    }

    ATTRS.forEach(function (attr) {
        const prop = attr.replace(/-([a-z0-9])/g, function (_, ch) {
            return ch.toUpperCase();
        });
        Object.defineProperty(SleepyBuddy.prototype, prop, {
            configurable: true,
            get: function () {
                return this.getAttribute(attr);
            },
            set: function (v) {
                if (v === null || v === undefined) this.removeAttribute(attr);
                else this.setAttribute(attr, v === true ? '' : String(v));
            },
        });
    });

    // el.config = { ... } (object or JSON string); el.config reads the merged options back
    Object.defineProperty(SleepyBuddy.prototype, 'config', {
        configurable: true,
        get: function () {
            return Object.assign({}, this._json);
        },
        set: function (v) {
            if (typeof v === 'string') {
                this.setAttribute('config', v);
                return;
            }
            this._cfgObj = v && typeof v === 'object' ? v : null;
            this._reconfigure();
        },
    });

    SleepyBuddy.characters = CHARACTERS;
    SleepyBuddy.version = '1.1.0';
    SleepyBuddy.maxFileSize = 25 * 1048576; // upload limit in bytes (set 0 to disable)
    window.SleepyBuddy = SleepyBuddy;
    window.customElements.define('sleepy-buddy', SleepyBuddy);

    // Auto-mount: <div data-sleepy-buddy='{"character":"rex"}' data-size="240"></div>
    // Every data-* attribute of the div (and its JSON value) is passed to the character.
    SleepyBuddy.mountAll = function (root) {
        Array.prototype.forEach.call(
            (root || document).querySelectorAll(
                '[data-sleepy-buddy]:not([data-sb-mounted])'
            ),
            function (host) {
                host.setAttribute('data-sb-mounted', '');
                const el = new SleepyBuddy();
                const val = (host.getAttribute('data-sleepy-buddy') || '').trim();
                if (val.charAt(0) === '{') el.setAttribute('config', val);
                Array.prototype.forEach.call(host.attributes, function (a) {
                    if (
                        a.name.indexOf('data-') === 0 &&
                        a.name !== 'data-sleepy-buddy' &&
                        a.name !== 'data-sb-mounted'
                    )
                        el.setAttribute(a.name, a.value);
                });
                el.style.width = '100%';
                el.style.height = '100%';
                host.appendChild(el);
                if (!host.clientHeight) host.style.height = '400px'; // the div needs a height; give it one if it has none
            }
        );
    };
    if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', function () {
            SleepyBuddy.mountAll(document);
        });
    else SleepyBuddy.mountAll(document);
})();
