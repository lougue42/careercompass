'use client';
import React from 'react';

const STYLES = {
  Applied:   'bg-blue-50 text-blue-700 ring-blue-200',
  Interview: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  Offer:     'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Rejected:  'bg-rose-50 text-rose-700 ring-rose-200',
  Wishlist:  'bg-slate-50 text-slate-700 ring-slate-200',
};

export default function StatusBadge({ status = '' }) {
  const cls = STYLES[status] || STYLES.Wishlist;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      {status || '—'}
    </span>
  );
}
