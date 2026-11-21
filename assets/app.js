"use strict";
(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function initDust() {
        const canvas = document.getElementById('dust');
        const label = document.getElementById('phase');
        const ctx = canvas ? canvas.getContext('2d') : null;
        if (!canvas || !ctx)
            return;
        const COLORS = ['#e6d8b2', '#9aab5a', '#e0661a'];
        const hubs = [[0.6, 0.3], [0.86, 0.26], [0.68, 0.72], [0.9, 0.64], [0.5, 0.52], [0.78, 0.48]].map(([fx, fy]) => ({ fx, fy, x: 0, y: 0 }));
        const dust = [];
        const bursts = [];
        let mx = -999, my = -999, power = 0.7, fr = 0;
        const meter = document.getElementById('meter');
        const burstLevel = (t) => bursts.reduce((m, b) => Math.max(m, Math.max(0, 1 - (t - b.t) / 2.5)), 0);
        let w = 0;
        let h = 0;
        const pulse = (t) => Math.pow((Math.sin(t * 0.6 - Math.PI / 2) + 1) / 2, 1.1);
        let curDpr = 0;
        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            if (rect.width === w && rect.height === h && dpr === curDpr)
                return;
            const ow = w;
            const oh = h;
            w = rect.width;
            h = rect.height;
            curDpr = dpr;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            // keep particles inside the new bounds (also fixes the canvas being 0x0 while the team page is showing)
            for (const d of dust) {
                if (ow > 0 && oh > 0) {
                    d.x *= w / ow;
                    d.y *= h / oh;
                }
                else {
                    d.x = Math.random() * w;
                    d.y = Math.random() * h;
                }
            }
        };
        const seed = () => {
            const n = w < 600 ? 150 : 270;
            for (let i = 0; i < n; i++) {
                const roll = Math.random();
                dust.push({
                    x: Math.random() * w, y: Math.random() * h, vx: 0, vy: 0,
                    r: 1 + Math.random() * 1.4, hub: i % hubs.length,
                    c: roll < 0.2 ? 2 : roll < 0.6 ? 1 : 0,
                    ox: (Math.random() - 0.5) * 34, oy: (Math.random() - 0.5) * 34,
                });
            }
        };
        const step = (p, t) => {
            hubs.forEach((hb, i) => {
                hb.x = w * hb.fx + Math.sin(t * 0.3 + i * 2) * 14;
                hb.y = h * hb.fy + Math.cos(t * 0.25 + i) * 14;
            });
            for (const d of dust) {
                const hb = hubs[d.hub];
                for (const b of bursts) {
                    const age = t - b.t;
                    if (age < 0 || age > 2.5)
                        continue;
                    const dx = b.x - d.x;
                    const dy = b.y - d.y;
                    if (dx * dx + dy * dy < 200000) {
                        const k = 0.009 * (1 - age / 2.5);
                        d.vx += dx * k;
                        d.vy += dy * k;
                    }
                }
                { const px = d.x - mx, py = d.y - my, pd = px * px + py * py; if (pd < 12100) { const f = (1 - pd / 12100) * 0.03; d.vx += px * f; d.vy += py * f; } }
                d.vx += 0.014 + (Math.random() - 0.5) * 0.06 + (hb.x + d.ox - d.x) * 0.0026 * p;
                d.vy += (Math.random() - 0.5) * 0.06 + (hb.y + d.oy - d.y) * 0.0026 * p;
                d.vx *= 0.95;
                d.vy *= 0.95;
                d.x += d.vx;
                d.y += d.vy;
                if (d.x < 0)
                    d.x = w;
                else if (d.x > w)
                    d.x = 0;
                if (d.y < 0)
                    d.y = h;
                else if (d.y > h)
                    d.y = 0;
            }
        };
        const draw = (p, t) => {
            ctx.clearRect(0, 0, w, h);
            if (p > 0.3) {
                ctx.lineWidth = 2;
                hubs.forEach((hb, i) => {
                    for (let k = 0; k < 3; k++) {
                        const rad = (t * 70 + k * 55 + i * 17) % 165;
                        ctx.beginPath();
                        ctx.arc(hb.x, hb.y, rad, 0, Math.PI * 2);
                        ctx.strokeStyle = `rgba(224,102,26,${((1 - rad / 165) * 0.6 * Math.min(p, 1)).toFixed(3)})`;
                        ctx.stroke();
                    }
                });
            }
            for (const b of bursts) {
                const age = t - b.t;
                if (age < 0 || age > 2.5)
                    continue;
                ctx.beginPath();
                ctx.arc(b.x, b.y, age * 230, 0, Math.PI * 2);
                ctx.lineWidth = 2;
                ctx.strokeStyle = `rgba(243,234,211,${(0.6 * (1 - age / 2.5)).toFixed(3)})`;
                ctx.stroke();
            }
            ctx.globalAlpha = 0.85;
            for (const d of dust) {
                ctx.beginPath();
                ctx.arc(d.x, d.y, d.r * (1 + p * 1.9), 0, Math.PI * 2);
                ctx.fillStyle = COLORS[d.c];
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        };
        const setLabel = (p) => {
            if (!label)
                return;
            const on = p > 0.35 ? 'on' : 'off';
            if (label.dataset.state === on)
                return;
            label.dataset.state = on;
            label.textContent = on === 'on' ? 'Ultrasound on: dust is clumping' : 'Ultrasound off: dust is drifting';
        };
        resize();
        seed();
        if (typeof ResizeObserver !== 'undefined')
            new ResizeObserver(() => { resize(); if (reduceMotion) draw(0.6, 5); }).observe(canvas);
        if (reduceMotion) {
            document.getElementById('pulse')?.remove();
            document.querySelector('.hero .ctl')?.remove();
            meter?.remove();
            for (let i = 0; i < 160; i++)
                step(0.6, 5);
            draw(0.6, 5);
            setLabel(0.6);
            window.addEventListener('resize', () => { resize(); draw(0.6, 5); });
            return;
        }
        document.getElementById('pulse')?.addEventListener('click', () => {
            const hb = hubs[Math.floor(Math.random() * hubs.length)];
            bursts.push({ x: hb.x, y: hb.y, t: performance.now() / 1000 });
            if (bursts.length > 4)
                bursts.shift();
        });
        canvas.parentElement?.addEventListener('pointerdown', (ev) => {
            if (ev.target.closest('a,button,input,label'))
                return;
            const r = canvas.getBoundingClientRect();
            bursts.push({ x: ev.clientX - r.left, y: ev.clientY - r.top, t: performance.now() / 1000 });
            if (bursts.length > 4)
                bursts.shift();
        });
        const hero = canvas.parentElement, pw = document.getElementById('pw'), pv = document.getElementById('pwv');
        hero.addEventListener('pointermove', (ev) => { const r = canvas.getBoundingClientRect(); mx = ev.clientX - r.left; my = ev.clientY - r.top; });
        hero.addEventListener('pointerleave', () => { mx = my = -999; });
        pw?.addEventListener('input', () => { power = pw.value / 100; pv.textContent = pw.value + '%'; });
        let running = true;
        const loop = (now) => {
            if (!running)
                return;
            const t = now / 1000;
            const p = Math.min(1.6, Math.max(pulse(t), burstLevel(t)) * power * 1.6);
            step(p, t);
            draw(p, t);
            setLabel(p);
            if (meter && ++fr % 12 === 0) meter.textContent = 'Dust clumped: ' + Math.round(100 * dust.filter((d) => Math.hypot(d.x - hubs[d.hub].x, d.y - hubs[d.hub].y) < 55).length / dust.length) + '%';
            requestAnimationFrame(loop);
        };
        window.addEventListener('resize', resize);
        new IntersectionObserver((entries) => {
            const visible = entries[0].isIntersecting;
            if (visible && !running) {
                running = true;
                requestAnimationFrame(loop);
            }
            else if (!visible)
                running = false;
        }).observe(canvas);
        requestAnimationFrame(loop);
    }
    // Scrollytelling brick: the stage follows the step on screen; dots jump to a stage
    function initStory() {
        const story = document.getElementById('story');
        if (!story)
            return;
        const beats = Array.from(story.querySelectorAll('.beat'));
        const dots = Array.from(story.querySelectorAll('.dots button'));
        const name = document.getElementById('stage-name');
        const setStage = (i) => {
            story.dataset.stage = String(i);
            dots.forEach((d, k) => { d.classList.toggle('on', k === i); d.setAttribute('aria-current', String(k === i)); });
            beats.forEach((b, k) => b.classList.toggle('on', k === i));
            if (name)
                name.textContent = beats[i]?.dataset.name ?? '';
        };
        const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => { if (e.isIntersecting)
                setStage(beats.indexOf(e.target)); });
        }, { rootMargin: '-45% 0px -45% 0px' });
        beats.forEach((b) => io.observe(b));
        dots.forEach((d, i) => d.addEventListener('click', () => {
            beats[i]?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        }));
        setStage(0);
    }
    // Run the MgO + CO2 reaction: the product fades in, the reactants fade back
    function initReaction() {
        const eq = document.getElementById('eq');
        const btn = document.getElementById('react');
        if (!eq || !btn)
            return;
        btn.addEventListener('click', () => {
            const done = eq.classList.toggle('done');
            btn.textContent = done ? 'Reset' : 'Run the reaction';
            btn.setAttribute('aria-pressed', String(done));
        });
    }
    // Manual light/dark switch (defaults to the system setting)
    function initTheme() {
        const root = document.documentElement;
        document.querySelectorAll('#theme,#theme2').forEach((btn) => btn.addEventListener('click', () => {
            const dark = root.dataset.theme ? root.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.dataset.theme = dark ? 'light' : 'dark';
            try { localStorage.setItem('aerolith-theme', root.dataset.theme); } catch (e) { }
        }));
    }
    // EDIT HERE: one entry per teammate. Add img:'photo.jpg' (or a data URI) to show a photo instead of initials.
   const TEAM = [
        { n: 'Ethan',  b: 'Keeps the project moving and ties the four techniques together.', c: '#f6c945' },
        { n: 'Namah', b: 'Builds and maintains this website.', c: '#f6c945' },
        { n: 'Maithra',  b: 'Ultrasound dust collection and agglomeration.', c: '#e0661a' },
        { n: 'Aadya', b: 'Poster, slides and presenting Aerolith to others.', c: '#b9c98a' }, 
        { n: 'Ananya',  b: 'MgO and CO₂ chemistry, and carbonate separation.', c: '#9aab5a' },
        { n: 'Umar',  b: 'Sourcing quarry dust, sodium silicate and reactive minerals.', c: '#f6c945' },
        { n: 'Vihaan',  b: 'Growing and handling Sporosarcina pasteurii safely.', c: '#b9c98a' },
        { n: 'Aaban',  b: 'Milling and activating minerals for carbonation.', c: '#e0661a' },
        { n: 'Mukul',  b: 'Recording measurements and comparing results with controls.', c: '#f3ead3' },
        { n: 'Zeeshan', b: 'Literature review and checking the science.', c: '#9aab5a' },
        { n: 'Arham',  b: 'Geopolymer mix, moulding and curing.', c: '#b9c98a' }, 
        { n: 'Aadya', b: 'Poster, slides and presenting Aerolith to others.', c: '#b9c98a' },
    ];
    function initTeam() {
        const el = document.getElementById('crew');
        if (!el)
            return;
        const ini = (n) => n.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
        el.innerHTML = TEAM.map((m) => `<article class="member"><div class="avatar" style="--c:${m.c}">${m.img ? `<img src="${m.img}" alt="${m.n}">` : ini(m.n)}</div><h3>${m.n}</h3><p>${m.b}</p></article>`).join('');
    }
    function initFilter() {
        const chips = Array.from(document.querySelectorAll('.chip'));
        const rows = Array.from(document.querySelectorAll('#approach .row'));
        chips.forEach((c) => c.addEventListener('click', () => {
            chips.forEach((x) => x.setAttribute('aria-pressed', String(x === c)));
            rows.forEach((r) => { r.hidden = c.dataset.f !== 'all' && !r.querySelector('.tag.' + c.dataset.f); });
        }));
    }
    function initMenu() {
        const bar = document.querySelector('.bar');
        const btn = document.getElementById('menu');
        if (!bar || !btn)
            return;
        const set = (o) => { bar.classList.toggle('open', o); btn.setAttribute('aria-expanded', String(o)); btn.textContent = o ? 'Close' : 'Menu'; };
        document.addEventListener('click', (e) => { if (!e.target.closest('.bar'))
            set(false); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape')
            set(false); });
        btn.addEventListener('click', () => set(!bar.classList.contains('open')));
        bar.querySelectorAll('nav a').forEach((a) => a.addEventListener('click', () => set(false)));
        const mq = window.matchMedia('(min-width:960px)');
        const onMq = (e) => { if (e.matches) set(false); };
        mq.addEventListener ? mq.addEventListener('change', onMq) : mq.addListener(onMq);
    }
    function initNodes() {
        const INFO = {
            'Quarry dust': 'Fine powder left when rock is crushed. Once collected, it is the raw material for the bricks.',
            'Geopolymerisation': 'Sodium silicate dissolves reactive silica and alumina in the dust. They relink into a Si–O–Al network that hardens into a binder.',
            'MICP treatment': 'S. pasteurii bacteria help calcium carbonate form in the cured brick’s pores, which should strengthen it. This still has to be tested.',
            'Eco-friendly bricks': 'The finished product: moulded, cured and MICP-treated. “Eco-friendly” is a goal until strength and durability are tested.',
            'Airborne dust': 'Fine particles that stay in the air and spread beyond the quarry.',
            'Acoustic agglomeration': 'Ultrasound makes particles collide and clump, so they are easier to collect.',
            'Mineral activation': 'Milling exposes fresh, reactive mineral surfaces that are ready to react with CO₂.',
            'CO₂ carbonation': 'Reactive minerals take up CO₂ and form stable carbonates, for example MgO + CO₂ → MgCO₃. Proposed, not yet tested.',
        };
        const out = document.getElementById('node-info');
        const items = Array.from(document.querySelectorAll('#solution .flow li'));
        items.forEach((li) => {
            li.tabIndex = 0;
            li.setAttribute('role', 'button');
            const go = () => { items.forEach((x) => { x.classList.toggle('sel', x === li); x.setAttribute('aria-pressed', String(x === li)); }); out.textContent = INFO[li.textContent] || ''; };
            li.addEventListener('click', go);
            li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
        });
    }
    // Plays the five carbon-capture steps in order; step 4 runs the MgO reaction
    function initPlay() {
        const b = document.getElementById('play'), eq = document.getElementById('eq'), r = document.getElementById('react');
        const lis = Array.from(document.querySelectorAll('#carbon .steps li'));
        if (!b || !eq || !r) return;
        let t;
        const clear = () => lis.forEach((l) => l.classList.remove('on'));
        const setEq = (d) => { eq.classList.toggle('done', d); r.textContent = d ? 'Reset' : 'Run the reaction'; r.setAttribute('aria-pressed', String(d)); };
        b.addEventListener('click', () => {
            clearInterval(t); clear(); setEq(false);
            let i = 0;
            const tick = () => { if (i >= lis.length) { clearInterval(t); return; } clear(); lis[i].classList.add('on'); if (i === 3) setEq(true); i++; };
            tick();
            t = setInterval(tick, reduceMotion ? 600 : 1400);
        });
    }
    // Stokes' law: settling speed grows with the square of particle size (idealised, small particles)
    function initStokes() {
        const s = document.getElementById('sz'), v = document.getElementById('szv'), o = document.getElementById('sz-out');
        if (!s) return;
        const upd = () => { const n = +s.value; v.textContent = '×' + n; o.textContent = n === 1 ? 'Same size as the original particle, so the same settling speed.' : 'A cluster ' + n + '× wider settles roughly ' + n * n + '× faster in still air. Idealised: Stokes’ law, for small particles of equal density.'; };
        s.addEventListener('input', upd);
        upd();
    }
    initDust();
    initNodes();
    initPlay();
    initStokes();
    initStory();
    initReaction();
    initTheme();
    initTeam();
    initFilter();
    initMenu();
})();
