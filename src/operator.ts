const operatorSession = Antri.guard(true);
const operatorBoard = Antri.$<HTMLElement>('operatorBoard');
function renderOperator(): void {
  if (!operatorSession) return;
  const s = Antri.readState();
  const display = s.services.filter(x => x.active || s.tickets.some(t => t.code === x.code && t.status !== 'Selesai'));
  const cards = display.map(service => {
    const current = Antri.current(s,service.code); const waiting = Antri.allWaiting(s,service.code); const next = waiting[0];
    const card = Antri.el('article','panel operator-card'); card.dataset.code = service.code;
    const top = Antri.el('div','operator-card-head');
    top.append(Antri.el('h2','',service.name), Antri.el('span','muted',`${waiting.length} menunggu`));
    const numbers = Antri.el('div','operator-numbers');
    const nowBlock = Antri.el('div','operator-value');
    nowBlock.append(Antri.el('small','','SEDANG DIPANGGIL'),Antri.el('strong','number-current', current ? Antri.format(current) : '—'));
    const nextBlock = Antri.el('div','operator-value');
    nextBlock.append(Antri.el('small','','BERIKUTNYA'),Antri.el('strong','number-next',next ? Antri.format(next) : '—'));
    const detail = Antri.el('p','operator-detail',current ? `Prioritas ${Antri.labels[current.priority]}` : 'Belum ada panggilan');
    const detail2 = Antri.el('p','operator-detail',next ? `Prioritas ${Antri.labels[next.priority]}` : 'Tidak ada tiket menunggu');
    nowBlock.append(detail); nextBlock.append(detail2); numbers.append(nowBlock,nextBlock);
    const controls = Antri.el('div','operator-controls');
    const call = Antri.el('button','btn btn-primary','Panggil berikutnya'); call.dataset.action='call'; call.type='button'; call.disabled = !next;
    const skip = Antri.el('button','btn btn-outline','Lewati'); skip.dataset.action='skip'; skip.type='button'; skip.disabled = !current;
    const finish = Antri.el('button','btn btn-outline','Selesai'); finish.dataset.action='finish'; finish.type='button'; finish.disabled = !current;
    controls.append(call,skip,finish); card.append(top,numbers,controls); return card;
  });
  operatorBoard.replaceChildren(...(cards.length ? cards : [Antri.el('p','empty-msg','Belum ada layanan. Tambahkan melalui Dashboard.') ]));
}
function speak(ticket: Antri.Ticket): void {
  if (!Antri.$<HTMLInputElement>('voiceToggle').checked || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const msg = new SpeechSynthesisUtterance(`Nomor antrian ${ticket.code}, ${String(ticket.number).padStart(3,'0').split('').join(' ')}, silakan menuju loket pelayanan.`);
  msg.lang='id-ID'; msg.rate=0.85; window.speechSynthesis.speak(msg);
}
operatorBoard.addEventListener('click', e => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
  const code = btn?.closest<HTMLElement>('[data-code]')?.dataset.code; if (!btn || !code) return;
  try {
    if (btn.dataset.action === 'call') {
      const t = Antri.callNext(code);
      if (t) { Antri.feedback('operatorFeedback',`${Antri.format(t)} sedang dipanggil.`,true); speak(t); }
      else Antri.feedback('operatorFeedback','Tidak ada tiket yang menunggu.');
    } else if (btn.dataset.action === 'skip') {
      if (Antri.skip(code)) Antri.feedback('operatorFeedback','Tiket dilewati dan dipindah ke akhir antrian.',true);
    } else if (btn.dataset.action === 'finish') {
      if (Antri.finish(code)) Antri.feedback('operatorFeedback','Pelayanan selesai.',true);
    }
  } catch (error) { Antri.feedback('operatorFeedback',error instanceof Error ? error.message : 'Aksi gagal.'); }
  renderOperator();
});
renderOperator(); Antri.observe(renderOperator);
