const visitorSession = Antri.guard();
const visitorBoard = Antri.$<HTMLElement>('visitorBoard');
const ticketDialog = Antri.$<HTMLDialogElement>('ticketDialog');
const lastTicketKey = `antrisehat:last-ticket:${visitorSession?.username || 'guest'}`;
let serviceFingerprint = '';
function recentTicket(): Antri.Ticket | undefined {
  const id = localStorage.getItem(lastTicketKey);
  return Antri.readState().tickets.find(t => t.id === id);
}
function receipt(ticket: Antri.Ticket): void {
  const s = Antri.readState();
  Antri.$('receiptNumber').textContent = Antri.format(ticket);
  Antri.$('receiptService').textContent = Antri.serviceName(s,ticket.code);
  Antri.$('receiptPriority').textContent = `Prioritas: ${Antri.labels[ticket.priority]}`;
  Antri.$('receiptDate').textContent = new Date(ticket.createdAt).toLocaleString('id-ID',{dateStyle:'long',timeStyle:'short'});
  Antri.$('receiptStatus').textContent = ticket.status === 'Dipanggil' ? 'Sedang dipanggil · silakan menuju loket.' : ticket.status === 'Selesai' ? 'Pelayanan selesai.' : 'Tiket masuk antrian. Nomor akan muncul di layar setelah dipanggil petugas.';
}
function renderVisitor(): void {
  if (!visitorSession) return;
  const s = Antri.readState(); const services = s.services.filter(service => service.active);
  const signature = JSON.stringify(services.map(x => [x.code,x.name]));
  if (serviceFingerprint !== signature) {
    serviceFingerprint = signature;
    const cards = services.map(service => {
      const card = Antri.el('article','panel visitor-card'); card.dataset.code=service.code;
      const head = Antri.el('div','visitor-card-title'); head.append(Antri.el('span','service-letter',service.code),Antri.el('h2','',service.name));
      const waiting = Antri.el('p','muted',''); waiting.dataset.waiting=service.code;
      const selectLabel = Antri.el('label','input-label','Prioritas');
      const select = Antri.el('select','input visitor-priority') as HTMLSelectElement;
      select.setAttribute('aria-label',`Prioritas untuk ${service.name}`);
      select.append(new Option('Normal','normal'),new Option('Lansia','lansia'),new Option('Disabilitas','disabilitas'),new Option('VIP','vip'));
      const button = Antri.el('button','btn btn-primary btn-wide','Ambil nomor'); button.dataset.action='take'; button.type='button';
      card.append(head,waiting,selectLabel,select,button); return card;
    });
    visitorBoard.replaceChildren(...(cards.length ? cards : [Antri.el('p','empty-msg','Belum ada layanan yang aktif.') ]));
  }
  visitorBoard.querySelectorAll<HTMLElement>('[data-waiting]').forEach(el => { el.textContent = `${Antri.allWaiting(s,el.dataset.waiting!).length} tiket menunggu`; });
  const t = recentTicket();
  const last = Antri.$<HTMLElement>('lastTicket'); last.hidden = !t;
  if (t) { Antri.$('lastTicketNumber').textContent = Antri.format(t); Antri.$('lastTicketState').textContent = t.status; if (ticketDialog.open) receipt(t); }
  else if (ticketDialog.open) ticketDialog.close();
}
visitorBoard.addEventListener('click',e => {
  const button = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action="take"]');
  const card = button?.closest<HTMLElement>('[data-code]');
  if (!visitorSession || !button || !card) return;
  try {
    button.disabled=true;
    const priority = card.querySelector<HTMLSelectElement>('select')!.value as Antri.Priority;
    const ticket = Antri.issue(card.dataset.code!,priority);
    localStorage.setItem(lastTicketKey,ticket.id);
    Antri.feedback('visitorFeedback',''); renderVisitor(); receipt(ticket); ticketDialog.showModal();
  } catch(error) { Antri.feedback('visitorFeedback',error instanceof Error ? error.message : 'Gagal mengambil nomor.'); }
  finally { button.disabled=false; }
});
Antri.$('viewLastTicket').addEventListener('click',() => { const t = recentTicket(); if (t) { receipt(t); ticketDialog.showModal(); } });
Antri.$('closeTicket').addEventListener('click',() => ticketDialog.close());
Antri.$('printTicket').addEventListener('click',() => window.print());
renderVisitor(); Antri.observe(renderVisitor);
