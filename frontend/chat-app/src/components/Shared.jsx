import { MessageCircle, Users } from 'lucide-react'

const colors = [
  'bg-[#eaddff] text-[#6028a4]', 'bg-[#dceae1] text-[#25644a]',
  'bg-[#ffead4] text-[#88501c]', 'bg-[#fbe1ed] text-[#9e3969]',
  'bg-[#e1eaff] text-[#3854a0]',
]

export function Brand() {
  return <div className="flex items-center gap-2.5 text-[23px] font-extrabold tracking-tight">
    <span className="grid size-9 place-items-center rounded-[11px] bg-brand text-white">
      <MessageCircle size={20} strokeWidth={2.6} />
    </span>
    Relay
  </div>
}

export function Avatar({ name = '', group, online, large }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => [...part][0]).join('').toUpperCase()
  const color = colors[[...name].reduce((sum, char) => sum + char.codePointAt(0), 0) % colors.length]
  return <span aria-hidden="true" className={`relative grid shrink-0 place-items-center rounded-[35%] font-extrabold ${large ? 'size-16 text-xl' : 'size-10 text-sm'} ${group ? 'bg-lavender text-brand' : color}`}>
    {group ? <Users size={large ? 29 : 18} /> : initials || '?'}
    {online && <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-white bg-emerald-500" />}
  </span>
}

export function ErrorNotice({ error, retry }) {
  if (!error) return null
  return <div role="alert" className="flex items-center justify-between gap-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-800">
    {error}
    {retry && <button className="shrink-0 font-bold underline" onClick={retry}>Retry</button>}
  </div>
}

export function IconButton({ label, icon: Icon, ...props }) {
  return <button type="button" className="icon-button" aria-label={label} title={label} {...props}><Icon size={19} /></button>
}

export function Empty({ icon: Icon = MessageCircle, title, children }) {
  return <div className="m-auto flex max-w-96 flex-col items-center px-5 py-10 text-center">
    <span className="mb-5 grid size-16 place-items-center rounded-[22px] bg-lavender text-brand"><Icon size={28} /></span>
    <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
    <div className="mt-2 text-sm leading-6 text-muted">{children}</div>
  </div>
}
