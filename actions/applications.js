{/* Add Application Slide-over */}
{adding && (
  <div
    role="dialog"
    aria-modal="true"
    aria-label="Add application"
    className="fixed inset-0 z-[70] flex"
  >
    {/* Overlay */}
    <div
      className="absolute inset-0 bg-slate-900/50"
      onClick={() => setAdding(false)}
    />

    {/* Panel */}
    <aside
      className="relative ml-auto h-full w-full sm:w-[520px] md:w-[640px] bg-white shadow-xl flex flex-col"
      style={{ borderLeft: `1px solid ${theme.border}` }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
        style={{ background: theme.card, borderBottom: `1px solid ${theme.border}` }}
      >
        <div>
          <h2 className="m-0 text-xl font-semibold tracking-tight">Add application</h2>
          <p className="m-0 mt-1 text-sm" style={{ color: theme.mutedText }}>
            Keep it lightweight. You can edit details later.
          </p>
        </div>
        <button
          onClick={() => setAdding(false)}
          className="rounded-xl px-3 py-2 text-sm"
          style={{ background: theme.header, border: `1px solid ${theme.border}` }}
        >
          Close
        </button>
      </div>

      {/* Content */}
      <form
        onSubmit={handleCreate} // keep your existing submit handler
        className="flex-1 overflow-y-auto px-5 pb-24"
      >
        {/* Section: Basics */}
        <div className="mt-4">
          <h3 className="text-sm font-medium uppercase tracking-wide" style={{ color: theme.mutedText }}>
            Basics
          </h3>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1">
              <label className="block text-sm font-medium mb-1">Company<span className="text-rose-600">*</span></label>
              <input
                required
                name="company"
                value={form.company}
                onChange={onChange}
                placeholder="e.g., Google"
                className="w-full rounded-xl px-3 py-2.5 text-[15px] outline-none"
                style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}` }}
              />
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-medium mb-1">Role<span className="text-rose-600">*</span></label>
              <input
                required
                name="role"
                value={form.role}
                onChange={onChange}
                placeholder="e.g., Business Analyst Intern"
                className="w-full rounded-xl px-3 py-2.5 text-[15px] outline-none"
                style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}` }}
              />
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={onChange}
                className="w-full rounded-xl px-3 py-2.5 text-[15px] outline-none"
                style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}` }}
              >
                {['Wishlist','Applied','Interview','Offer','Rejected'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="col-span-1">
              <label className="block text-sm font-medium mb-1">Industry</label>
              <input
                name="industry"
                value={form.industry || ''}
                onChange={onChange}
                placeholder="e.g., Aerospace"
                className="w-full rounded-xl px-3 py-2.5 text-[15px] outline-none"
                style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}` }}
              />
            </div>
          </div>
        </div>

        {/* Section: Next step */}
        <div className="mt-7">
          <h3 className="text-sm font-medium uppercase tracking-wide" style={{ color: theme.mutedText }}>
            Next step
          </h3>
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Next action</label>
              <input
                name="next_action"
                value={form.next_action || ''}
                onChange={onChange}
                placeholder="e.g., Follow up with recruiter"
                className="w-full rounded-xl px-3 py-2.5 text-[15px] outline-none"
                style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}` }}
              />
              {/* Quick chips for speed */}
              <div className="mt-2 flex flex-wrap gap-2">
                {['Send resume','Thank you email','Schedule interview','Apply on site'].map(chip => (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => onChange({ target: { name: 'next_action', value: chip } })}
                    className="rounded-full px-3 py-1 text-xs"
                    style={{ background: theme.header, border: `1px solid ${theme.border}` }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Due date</label>
              <input
                type="date"
                name="due_date"
                value={form.due_date || ''}
                onChange={onChange}
                className="w-full rounded-xl px-3 py-2.5 text-[15px] outline-none"
                style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}` }}
              />
              {/* Date shortcuts */}
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  { label: 'Today', days: 0 },
                  { label: '+3d', days: 3 },
                  { label: 'Next Mon', days:  (7 - new Date().getDay() + 1) % 7 || 7 },
                ].map(({ label, days }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setForm(f => ({
                      ...f,
                      due_date: new Date(Date.now() + days * 86400000).toISOString().slice(0,10),
                    }))}
                    className="rounded-full px-3 py-1 text-xs"
                    style={{ background: theme.header, border: `1px solid ${theme.border}` }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section: Notes */}
        <div className="mt-7">
          <h3 className="text-sm font-medium uppercase tracking-wide" style={{ color: theme.mutedText }}>
            Notes
          </h3>
          <textarea
            name="notes"
            value={form.notes || ''}
            onChange={onChange}
            rows={4}
            placeholder="Optional context, links, or reminders"
            className="mt-3 w-full rounded-xl px-3 py-2.5 text-[15px] outline-none"
            style={{ background: theme.inputBg, border: `1px solid ${theme.inputBorder}` }}
          />
        </div>
      </form>

      {/* Sticky footer */}
      <div
        className="pointer-events-auto sticky bottom-0 z-10 flex items-center justify-between gap-3 px-5 py-3"
        style={{ background: theme.card, borderTop: `1px solid ${theme.border}` }}
      >
        <button
          type="button"
          onClick={() => setAdding(false)}
          className="rounded-xl px-4 py-2 text-sm"
          style={{ background: theme.header, border: `1px solid ${theme.border}` }}
        >
          Cancel
        </button>
        <button
          formAction="submit"
          onClick={(e) => {
            // allow your handleCreate to run via form submit
          }}
          className="rounded-xl px-4 py-2 text-sm font-medium text-white"
          style={{ background: theme.primary }}
        >
          Save
        </button>
      </div>
    </aside>
  </div>
)}
