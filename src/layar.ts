const screenSession = Antri.guard();
const screenBoard = Antri.$<HTMLElement>('screenBoard');
const fullButton = Antri.$<HTMLButtonElement>('fullscreenButton');
let lastRenderKey = '';
function showClock(): void {
  const now = new Date();
  Antri.$('screenClock').textContent = new Intl.DateTimeFormat('id-ID',{hour:'2-digit',minute:'2-digit',hour12:false}).format(now).replace('.',':');
  Antri.$('screenDate').textContent = new Intl.DateTimeFormat('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(now);
}
function renderScreen(): void {
  if (!screenSession) return;
  const s = Antri.readState();
  const visible = s.services.filter(x => x.active);
  const fingerprint = JSON.stringify([visible,s.tickets]);
  if (fingerprint === lastRenderKey) return;
  lastRenderKey = fingerprint;
  const cards = visible.map(service => {
    const t = Antri.current(s,service.code); const waiting = Antri.allWaiting(s,service.code).length;
    const card = Antri.el('article','panel screen-card');
    const top = Antri.el('div','screen-card-top'); top.append(Antri.el('h2','',service.name), Antri.el('span','service-code',service.code));
    const middle = Antri.el('div','screen-card-middle');
    middle.append(Antri.el('small',t ? '● SEDANG DIPANGGIL' : 'BELUM ADA PANGGILAN'),Antri.el('strong',t ? 'screen-number is-called' : 'screen-number', t ? Antri.format(t) : '—'));
    const bottom = Antri.el('p','screen-card-foot',`${waiting} tiket menunggu`);
    card.append(top,middle,bottom); return card;
  });
  screenBoard.replaceChildren(...(cards.length ? cards : [Antri.el('p','empty-msg','Belum ada layanan aktif.') ]));
}
fullButton.addEventListener('click',async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await Antri.$('screenMain').requestFullscreen();
  } catch { Antri.feedback('screenError','Layar penuh tidak diizinkan oleh browser.'); }
});
document.addEventListener('fullscreenchange',()=> { fullButton.textContent = document.fullscreenElement ? 'Keluar layar penuh' : 'Layar penuh'; });
showClock(); renderScreen(); Antri.observe(() => { showClock(); renderScreen(); });
