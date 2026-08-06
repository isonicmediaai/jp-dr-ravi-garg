/* booking.js — <booking-modal>: appointment popup with a Mon–Sat calendar and
   9:30 am–5:30 pm slots. Any element with [data-book-open] opens it.
   On submit it redirects to the booking thank-you page with the details as query params. */
(function () {
  if (customElements.get('booking-modal')) return;

  var BLUE = '#0A66FF', INK = '#111111', MUTED = '#3D4552', LINE = 'rgba(10,102,255,0.16)';
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function slots() {
    var out = [];
    for (var m = 570; m <= 1050; m += 30) {           // 9:30 → 17:30
      var h = Math.floor(m / 60), mm = m % 60;
      var ampm = h >= 12 ? 'pm' : 'am';
      var h12 = h % 12 === 0 ? 12 : h % 12;
      out.push({ v: (h < 10 ? '0' : '') + h + ':' + (mm === 0 ? '00' : mm), label: h12 + ':' + (mm === 0 ? '00' : mm) + ' ' + ampm });
    }
    return out;
  }

  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function thankYouHref() {
    return /\.dc\.html$/i.test(location.pathname) ? 'Thank You Booking.dc.html' : 'thank-you-booking.html';
  }

  var css = `
:host{position:fixed;inset:0;z-index:2000;display:none;font-family:'Inter','SF Pro Display',-apple-system,sans-serif;color:${INK}}
:host([open]){display:block}
*{box-sizing:border-box}
.scrim{position:absolute;inset:0;background:rgba(9,20,40,0.42);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);opacity:0;transition:opacity .4s ease}
:host([open]) .scrim{opacity:1}
.sheet{position:absolute;top:50%;left:50%;transform:translate(-50%,-46%) scale(.97);opacity:0;width:min(940px,calc(100vw - 32px));max-height:calc(100vh - 48px);overflow:auto;border-radius:26px;border:1px solid ${LINE};background:linear-gradient(170deg,#FFFFFF,#F3F8FF);box-shadow:0 60px 130px -50px rgba(10,102,255,0.55);transition:transform .5s cubic-bezier(.16,1,.3,1),opacity .4s ease}
:host([open]) .sheet{transform:translate(-50%,-50%) scale(1);opacity:1}
.head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:clamp(24px,3vw,36px) clamp(22px,3vw,38px) 0}
.kicker{font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${BLUE}}
h2{margin:8px 0 0;font-size:clamp(23px,2.4vw,32px);font-weight:300;letter-spacing:-0.03em;line-height:1.15}
.sub{margin:8px 0 0;font-size:13px;line-height:1.6;color:${MUTED}}
.x{flex:none;width:40px;height:40px;border-radius:50%;border:1px solid ${LINE};background:#FFFFFF;color:${INK};font-size:17px;line-height:1;cursor:pointer;transition:background .3s ease,transform .3s ease}
.x:hover{background:#F5F7FA;transform:rotate(90deg)}
form{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:clamp(20px,2.6vw,34px);padding:clamp(20px,2.6vw,32px) clamp(22px,3vw,38px) clamp(24px,3vw,36px)}
.col{display:flex;flex-direction:column;gap:16px}
label{display:flex;flex-direction:column;gap:7px}
.lab{font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:${MUTED}}
input,textarea,select{width:100%;padding:13px 2px;border:0;border-bottom:1px solid rgba(10,102,255,0.25);background:transparent;font:inherit;font-size:15px;font-weight:400;color:${INK};outline:none;transition:border-color .35s ease}
input:focus,textarea:focus,select:focus{border-bottom-color:${BLUE}}
textarea{resize:vertical;min-height:52px;line-height:1.55}
.cal{border:1px solid ${LINE};border-radius:18px;background:#FFFFFF;padding:14px}
.calhead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:2px 2px 10px}
.mon{font-size:14px;font-weight:500;letter-spacing:-0.01em}
.nav{display:flex;gap:6px}
.nav button{width:30px;height:30px;border-radius:50%;border:1px solid ${LINE};background:#FFFFFF;color:${INK};cursor:pointer;font-size:13px;line-height:1;transition:background .3s ease}
.nav button:hover:not(:disabled){background:#EFF6FF}
.nav button:disabled{opacity:.32;cursor:default}
.grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.dow{font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#8A929E;text-align:center;padding:4px 0}
.day{aspect-ratio:1;min-height:34px;border:1px solid transparent;border-radius:10px;background:transparent;font:inherit;font-size:13px;color:${INK};cursor:pointer;transition:background .25s ease,color .25s ease,border-color .25s ease}
.day:hover:not(:disabled){background:#EFF6FF;border-color:${LINE}}
.day:disabled{color:#C3C9D4;cursor:default}
.day[aria-pressed="true"]{background:${BLUE};color:#FFFFFF;border-color:${BLUE}}
.note{font-size:11px;color:#8A929E;padding-top:8px;text-align:center}
.slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:7px}
.slot{padding:10px 6px;border:1px solid ${LINE};border-radius:999px;background:#FFFFFF;font:inherit;font-size:12px;color:${INK};cursor:pointer;transition:background .25s ease,color .25s ease,border-color .25s ease}
.slot:hover:not(:disabled){background:#EFF6FF}
.slot:disabled{opacity:.35;cursor:default}
.slot[aria-pressed="true"]{background:${BLUE};color:#FFFFFF;border-color:${BLUE}}
.foot{grid-column:1 / -1;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;padding-top:6px;border-top:1px solid rgba(10,102,255,0.12)}
.ticks{display:flex;flex-direction:column;gap:5px;font-size:12px;color:${MUTED}}
.tick{display:inline-flex;align-items:center;gap:7px}
.tick i{color:${BLUE};font-style:normal}
.submit{display:inline-flex;align-items:center;gap:10px;padding:16px 28px;border:0;border-radius:999px;background:${BLUE};color:#FFFFFF;font:inherit;font-size:14px;font-weight:500;cursor:pointer;box-shadow:0 22px 48px -20px rgba(10,102,255,0.7);transition:background .35s ease,transform .35s ease}
.submit:hover{background:${INK};transform:translateY(-2px)}
.err{grid-column:1 / -1;margin:0;font-size:12px;color:#C22B2B;min-height:16px}
.summary{font-size:12px;color:${MUTED};padding-top:2px}
.summary b{color:${INK};font-weight:550}
@media (max-width:780px){
  form{grid-template-columns:minmax(0,1fr)}
  .sheet{width:calc(100vw - 20px);max-height:calc(100vh - 24px);border-radius:22px}
  .submit{width:100%;justify-content:center;min-height:52px}
  .foot{flex-direction:column;align-items:stretch}
}
`;

  var BookingModal = class extends HTMLElement {
    connectedCallback() {
      if (this._init) return;
      this._init = true;
      var today = new Date(); today.setHours(0, 0, 0, 0);
      this._today = today;
      this._view = new Date(today.getFullYear(), today.getMonth(), 1);
      this._date = null;
      this._time = null;
      this._slots = slots();
      this.attachShadow({ mode: 'open' });
      this.render();
    }

    render() {
      var r = this.shadowRoot;
      r.innerHTML = '<style>' + css + '</style>' +
        '<div class="scrim" part="scrim"></div>' +
        '<div class="sheet" role="dialog" aria-modal="true" aria-label="Book an appointment">' +
          '<div class="head">' +
            '<div>' +
              '<div class="kicker">JP Hospital, Zirakpur</div>' +
              '<h2>Book an appointment</h2>' +
              '<p class="sub">Consultations Monday to Saturday, 9:30 am to 5:30 pm. Choose a slot and the clinical team will confirm it by phone.</p>' +
            '</div>' +
            '<button class="x" type="button" aria-label="Close">&#10005;</button>' +
          '</div>' +
          '<form novalidate>' +
            '<div class="col">' +
              '<label><span class="lab">Full name</span><input name="name" type="text" placeholder="Your name" autocomplete="name" required></label>' +
              '<label><span class="lab">Email</span><input name="email" type="email" placeholder="you@email.com" autocomplete="email" required></label>' +
              '<label><span class="lab">Phone</span><input name="phone" type="tel" placeholder="+91" autocomplete="tel"></label>' +
              '<label><span class="lab">Reason for visit (optional)</span><textarea name="notes" rows="2" placeholder="Symptoms, prior scans, referring doctor"></textarea></label>' +
              '<div class="summary" data-summary></div>' +
            '</div>' +
            '<div class="col">' +
              '<div>' +
                '<span class="lab">Choose a date</span>' +
                '<div class="cal" style="margin-top:7px">' +
                  '<div class="calhead"><span class="mon" data-mon></span>' +
                    '<span class="nav"><button type="button" data-prev aria-label="Previous month">&#8592;</button><button type="button" data-next aria-label="Next month">&#8594;</button></span>' +
                  '</div>' +
                  '<div class="grid" data-dow></div>' +
                  '<div class="grid" data-days style="margin-top:3px"></div>' +
                  '<div class="note">Sundays and past dates are unavailable</div>' +
                '</div>' +
              '</div>' +
              '<div>' +
                '<span class="lab">Choose a time</span>' +
                '<div class="slots" data-slots style="margin-top:9px"></div>' +
              '</div>' +
            '</div>' +
            '<p class="err" data-err></p>' +
            '<div class="foot">' +
              '<span class="ticks">' +
                '<span class="tick"><i>&#10003;</i>Confirmation call within one working day</span>' +
                '<span class="tick"><i>&#10003;</i>No referral needed, no obligation</span>' +
              '</span>' +
              '<button class="submit" type="submit">Request this appointment <span>&#8594;</span></button>' +
            '</div>' +
          '</form>' +
        '</div>';

      var q = function (s) { return r.querySelector(s); };
      this._els = {
        form: q('form'), err: q('[data-err]'), mon: q('[data-mon]'), days: q('[data-days]'),
        slots: q('[data-slots]'), prev: q('[data-prev]'), next: q('[data-next]'), summary: q('[data-summary]'),
      };

      var dow = q('[data-dow]');
      DAYS.forEach(function (d) {
        var s = document.createElement('span'); s.className = 'dow'; s.textContent = d; dow.appendChild(s);
      });

      var self = this;
      q('.scrim').addEventListener('click', function () { self.close(); });
      q('.x').addEventListener('click', function () { self.close(); });
      this._els.prev.addEventListener('click', function () { self.shiftMonth(-1); });
      this._els.next.addEventListener('click', function () { self.shiftMonth(1); });
      this._els.form.addEventListener('submit', function (e) { self.submit(e); });
      this._onKey = function (e) {
        if (e.key === 'Escape' && self.hasAttribute('open')) self.close();
      };
      document.addEventListener('keydown', this._onKey);

      this.drawMonth();
      this.drawSlots();
    }

    shiftMonth(n) {
      var v = new Date(this._view.getFullYear(), this._view.getMonth() + n, 1);
      var floor = new Date(this._today.getFullYear(), this._today.getMonth(), 1);
      if (v < floor) return;
      this._view = v;
      this.drawMonth();
    }

    drawMonth() {
      var view = this._view, today = this._today, self = this;
      this._els.mon.textContent = MONTHS[view.getMonth()] + ' ' + view.getFullYear();
      this._els.prev.disabled = view.getFullYear() === today.getFullYear() && view.getMonth() === today.getMonth();

      var first = new Date(view.getFullYear(), view.getMonth(), 1);
      var start = first.getDay();
      var count = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      var max = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 120);

      var frag = document.createDocumentFragment();
      for (var i = 0; i < start; i++) frag.appendChild(document.createElement('span'));
      var _loop = function (d) {
        var date = new Date(view.getFullYear(), view.getMonth(), d);
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'day'; b.textContent = String(d);
        var closed = date.getDay() === 0 || date < today || date > max;
        b.disabled = closed;
        if (closed) b.setAttribute('aria-disabled', 'true');
        b.setAttribute('aria-pressed', String(!!self._date && iso(self._date) === iso(date)));
        b.setAttribute('aria-label', DAYS[date.getDay()] + ' ' + d + ' ' + MONTHS[date.getMonth()]);
        b.addEventListener('click', function () {
          self._date = date;
          self.drawMonth(); self.drawSlots(); self.drawSummary(); self.setError('');
        });
        frag.appendChild(b);
      };
      for (var d = 1; d <= count; d++) _loop(d);
      this._els.days.innerHTML = '';
      this._els.days.appendChild(frag);
    }

    drawSlots() {
      var self = this;
      var isToday = this._date && iso(this._date) === iso(this._today);
      var nowMin = new Date().getHours() * 60 + new Date().getMinutes();
      this._els.slots.innerHTML = '';
      this._slots.forEach(function (s) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'slot'; b.textContent = s.label;
        var mins = parseInt(s.v.split(':')[0], 10) * 60 + parseInt(s.v.split(':')[1], 10);
        b.disabled = !self._date || (isToday && mins <= nowMin + 60);
        b.setAttribute('aria-pressed', String(self._time === s.v));
        b.addEventListener('click', function () {
          self._time = s.v; self._label = s.label;
          self.drawSlots(); self.drawSummary(); self.setError('');
        });
        self._els.slots.appendChild(b);
      });
    }

    drawSummary() {
      if (!this._date) { this._els.summary.innerHTML = ''; return; }
      var d = this._date;
      var txt = DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
      this._els.summary.innerHTML = 'Selected: <b>' + txt + (this._time ? ' at ' + this._label : '') + '</b>';
    }

    setError(msg) { this._els.err.textContent = msg || ''; }

    open(source) {
      this.setAttribute('open', '');
      document.documentElement.style.overflow = 'hidden';
      this._source = source || '';
      var self = this;
      setTimeout(function () {
        var f = self.shadowRoot.querySelector('input[name=name]');
        if (f) f.focus({ preventScroll: true });
      }, 120);
    }

    close() {
      this.removeAttribute('open');
      document.documentElement.style.overflow = '';
    }

    submit(e) {
      e.preventDefault();
      var f = this._els.form;
      var name = f.name.value.trim(), email = f.email.value.trim(), phone = f.phone.value.trim(), notes = f.notes.value.trim();
      if (!name) return this.setError('Please enter your name.');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return this.setError('Please enter a valid email address.');
      if (!this._date) return this.setError('Please choose a date, Monday to Saturday.');
      if (!this._time) return this.setError('Please choose a time slot.');

      try {
        sessionStorage.setItem('rg_lead_name', name);
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({
          event: 'appointment_booked', page: 'booking_modal', source: this._source || '',
          appointment_date: iso(this._date), appointment_time: this._time,
        });
      } catch (err) { /* storage or analytics blocked */ }

      try {
        fetch('./send-lead.php', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'booking', name: name, email: email, phone: phone, notes: notes,
            date: iso(this._date), label: this._label || '', source: this._source || '',
          }),
        }).catch(function () { /* lead still confirmed client-side, redirect proceeds */ });
      } catch (err) { /* fetch unavailable */ }

      var qs = new URLSearchParams({
        name: name, email: email, phone: phone, notes: notes,
        date: iso(this._date), time: this._time, label: this._label || '',
      });
      location.href = thankYouHref() + '?' + qs.toString();
    }

    disconnectedCallback() { document.removeEventListener('keydown', this._onKey); }
  };

  customElements.define('booking-modal', BookingModal);

  function ensure() {
    var el = document.querySelector('booking-modal');
    if (!el) {
      el = document.createElement('booking-modal');
      document.body.appendChild(el);
    }
    return el;
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-book-open]');
    if (!t) return;
    e.preventDefault();
    ensure().open(t.getAttribute('data-book-open') || t.textContent.trim().slice(0, 40));
  });

  if (document.body) ensure();
  else document.addEventListener('DOMContentLoaded', ensure);
})();
