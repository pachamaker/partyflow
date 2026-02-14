import { QRCodeSVG } from 'qrcode.react'

export function HomePage() {
  return (
    <section className="space-y-6 rounded-2xl border border-white/10 bg-secondary/70 p-6 shadow-xl">
      <h1 className="text-3xl font-bold text-accent">PartyFlow</h1>
      <p className="text-slate-200">Создайте комнату или присоединитесь по QR-коду.</p>
      <div className="inline-flex rounded-xl bg-white p-3">
        <QRCodeSVG value="https://partyflow.local/join/DEMO01" size={140} />
      </div>
      <div className="flex flex-wrap gap-3">
        <button className="rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:opacity-90">
          Создать комнату
        </button>
        <button className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 font-semibold text-white hover:bg-white/20">
          Ввести код
        </button>
      </div>
    </section>
  )
}
