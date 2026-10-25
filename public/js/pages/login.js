(async () => {
  const $ = s => document.querySelector(s), { esc } = Shell, next = new URLSearchParams(location.search).get('next');
  const safeNext = next && /^[a-z0-9_-]+\.html(\?[^\s]*)?$/i.test(next) ? next : 'index.html';
  await Api.detect(); Shell.mountNav('account');
  let sections = [];
  if (Api.mode === 'live') { try { sections = (await Api.http('/sections')).sections; } catch (_) {} }
  async function view() {
    const u = await Api.refreshUser(), v = $('#view');
    if (Api.mode !== 'live') { v.innerHTML = '<div class="banner">Sign-in is available when the MapifyMUJ server is running (<code>npm start</code>). In offline demo mode the app shows sample data.</div>'; return; }
    if (u) {
      v.innerHTML = '<div class="form"><div class="card"><div class="lab">Signed in as</div><div class="hero-title" style="font-size:20px">' + esc(u.name) + '</div><div class="sub">' + esc(u.email) + ' · ' + esc(u.role) + (u.section ? ' · ' + esc(u.section) : '') + '</div></div>' +
        (u.role === 'student' ? '<div class="card field"><label for="sec">My section (decides your timetable)</label><select id="sec"><option value="">—</option>' + sections.map(s => '<option value="' + esc(s.code) + '" ' + (s.code === u.section ? 'selected' : '') + '>' + esc(s.name) + '</option>').join('') + '</select><button class="btn" id="svsec" style="margin-top:10px">Save section</button></div>' : '') +
        (u.role !== 'student' ? '<a class="btn primary" href="admin.html">⚙️ Open ' + (u.role === 'admin' ? 'admin' : 'faculty') + ' console</a>' : '') +
        '<div class="card field"><label for="cur">Change password</label><input id="cur" type="password" placeholder="Current password" autocomplete="current-password"/><input id="nw" type="password" placeholder="New password (8+ chars)" style="margin-top:8px" autocomplete="new-password"/><button class="btn" id="chpw" style="margin-top:10px">Update password</button></div>' +
        '<button class="btn danger" id="out">Sign out</button><div id="msg" class="err"></div></div>';
      const sv = $('#svsec'); if (sv) sv.onclick = async () => { try { await Api.http('/auth/me', { method: 'PATCH', body: { section: $('#sec').value } }); await Api.refreshUser(); Shell.toast('Section saved'); } catch (e) { Shell.toast(e.message, true); } };
      $('#chpw').onclick = async () => { try { await Api.http('/auth/password', { method: 'POST', body: { current: $('#cur').value, next: $('#nw').value } }); Shell.toast('Password updated'); $('#cur').value = $('#nw').value = ''; } catch (e) { Shell.toast(e.message, true); } };
      $('#out').onclick = () => { Api.logout(); view(); };
      return;
    }
    v.innerHTML = '<div class="tabs" style="padding:0 16px"><button class="seg on" data-m="in">Sign in</button><button class="seg" data-m="up">Create account</button></div><form class="form" id="f" novalidate></form>';
    let mode = 'in';
    const form = () => { $('#f').innerHTML = (mode === 'up' ? '<div class="field"><label for="nm">Full name</label><input id="nm" autocomplete="name" required/></div>' : '') +
      '<div class="field"><label for="em">Email</label><input id="em" type="email" autocomplete="email" required/></div><div class="field"><label for="pw">Password' + (mode === 'up' ? ' (8+ characters)' : '') + '</label><input id="pw" type="password" autocomplete="' + (mode === 'up' ? 'new-password' : 'current-password') + '" required/></div>' +
      (mode === 'up' ? '<div class="field"><label for="sc">Section</label><select id="sc"><option value="">Choose later</option>' + sections.map(s => '<option value="' + esc(s.code) + '">' + esc(s.name) + '</option>').join('') + '</select></div><div class="field"><label for="rg">Registration no. (optional)</label><input id="rg"/></div>' : '') +
      '<button class="btn primary" type="submit">' + (mode === 'up' ? 'Create account' : 'Sign in') + '</button><div id="msg" class="err" role="alert"></div>' + (mode === 'in' ? '<p class="sub">Demo accounts (development only): student@muj.local / student123</p>' : ''); };
    form();
    v.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (!b) return; mode = b.dataset.m; v.querySelectorAll('[data-m]').forEach(x => x.classList.toggle('on', x === b)); form(); });
    $('#f').addEventListener('submit', async e => {
      e.preventDefault(); $('#msg').textContent = '';
      try { if (mode === 'up') await Api.register({ name: $('#nm').value, email: $('#em').value, password: $('#pw').value, section: $('#sc').value || undefined, reg_no: $('#rg').value || undefined }); else await Api.login($('#em').value, $('#pw').value); location.href = safeNext; }
      catch (err) { $('#msg').textContent = err.message; }
    });
  }
  view();
})();
