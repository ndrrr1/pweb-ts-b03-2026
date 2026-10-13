const adminSession = Antri.guard(true);
const serviceForm = Antri.$<HTMLFormElement>('serviceForm');
const codeInput = Antri.$<HTMLInputElement>('serviceCode');
const nameInput = Antri.$<HTMLInputElement>('serviceName');
const serviceList = Antri.$<HTMLElement>('serviceList');
const ticketList = Antri.$<HTMLElement>('ticketList');
const manualForm = Antri.$<HTMLFormElement>('manualForm');
const manualService = Antri.$<HTMLSelectElement>('manualService');
const manualPriority = Antri.$<HTMLSelectElement>('manualPriority');
const resetDialog = Antri.$<HTMLDialogElement>('resetDialog');
function renderAdmin(): void {
  if (!adminSession) return;
  const s = Antri.readState();
  Antri.$('statServices').textContent = `${s.services.filter(v => v.active).length}`;
  Antri.$('statWaiting').textContent = `${s.tickets.filter(v => v.status === 'Menunggu').length}`;
  Antri.$('statCalled').textContent = `${s.tickets.filter(v => v.status === 'Dipanggil').length}`;
  const list = s.services.map(service => {
    const row = Antri.el('div','service-row'); row.dataset.code = service.code;
    const circle = Antri.el('span','service-letter',service.code);
    const main = Antri.el('div','service-info');
    main.append(Antri.el('strong','',service.name), Antri.el('small','',service.active ? 'Aktif' : 'Nonaktif'));
    const buttons = Antri.el('div','inline-actions');
    const toggle = Antri.el('button','btn btn-small btn-subtle',service.active ? 'Nonaktifkan' : 'Aktifkan');
    toggle.type='button'; toggle.dataset.action='toggle'; toggle.setAttribute('aria-label',`${toggle.textContent} ${service.name}`);
    const del = Antri.el('button','btn btn-small btn-text-danger','Hapus');
    del.type='button'; del.dataset.action='delete'; del.setAttribute('aria-label',`Hapus ${service.name}`);
    buttons.append(toggle,del); row.append(circle,main,buttons); return row;
  });
  serviceList.replaceChildren(...(list.length ? list : [Antri.el('p','empty-msg','Belum ada layanan.') ]));
  const selected = manualService.value;
  const options = s.services.filter(x => x.active).map(x => new Option(`${x.name} (${x.code})`,x.code));
  manualService.replaceChildren(new Option('Pilih layanan',''),...options);
  if (options.some(o => o.value === selected)) manualService.value = selected;
  const recent = [...s.tickets].sort((a,b) => b.order-a.order).slice(0,9).map(t => {
    const item = Antri.el('div','ticket-row');
    const left = Antri.el('div','ticket-row-main');
    left.append(Antri.el('strong','ticket-number',Antri.format(t)), Antri.el('small','',`${Antri.serviceName(s,t.code)} · ${Antri.labels[t.priority]}`));
    const tag = Antri.el('span',`status status-${t.status === 'Menunggu' ? 'wait' : t.status === 'Dipanggil' ? 'called' : 'done'}`,t.status);
    item.append(left,tag); return item;
  });
  ticketList.replaceChildren(...(recent.length ? recent : [Antri.el('p','empty-msg','Belum ada tiket antrian.') ]));
}
codeInput.addEventListener('input',() => { codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z]/g,'').slice(0,1); });
serviceForm.addEventListener('submit', e => {
  e.preventDefault();
  try { Antri.addService(codeInput.value,nameInput.value); serviceForm.reset(); Antri.feedback('serviceError',''); codeInput.focus(); renderAdmin(); }
  catch (error) { Antri.feedback('serviceError',error instanceof Error ? error.message : 'Gagal menambah layanan.'); }
});
serviceList.addEventListener('click', e => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');
  const code = btn?.closest<HTMLElement>('[data-code]')?.dataset.code;
  if (!btn || !code) return;
  if (btn.dataset.action === 'delete') {
    if (!confirm(`Hapus layanan ${code}? Semua tiket layanan tersebut juga dihapus.`)) return;
    Antri.deleteService(code);
  } else if (btn.dataset.action === 'toggle') Antri.toggleService(code);
  renderAdmin();
});
manualForm.addEventListener('submit',e => {
  e.preventDefault();
  try { const ticket = Antri.issue(manualService.value, manualPriority.value as Antri.Priority); Antri.feedback('manualFeedback',`Tiket ${Antri.format(ticket)} berhasil diterbitkan.`,true); renderAdmin(); }
  catch (error) { Antri.feedback('manualFeedback',error instanceof Error ? error.message : 'Gagal menerbitkan tiket.'); }
});
Antri.$<HTMLButtonElement>('openReset').addEventListener('click', () => resetDialog.showModal());
Antri.$<HTMLButtonElement>('cancelReset').addEventListener('click', () => resetDialog.close());
Antri.$<HTMLButtonElement>('confirmReset').addEventListener('click', () => { Antri.reset(); resetDialog.close(); Antri.feedback('manualFeedback','Nomor antrian dimulai lagi dari 001.',true); });
renderAdmin(); Antri.observe(renderAdmin);
