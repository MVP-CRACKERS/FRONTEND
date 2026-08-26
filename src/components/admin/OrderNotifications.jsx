import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Bell, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { adminOrderFeed } from '../../api/client';

const SEEN_KEY = 'mvp_admin_orders_seen_at';
const SOUND_KEY = 'mvp_admin_order_chime';
const POLL_MS = 20000;

const money = (n) => `Rs. ${Number(n || 0).toFixed(2)}`;

const ago = (iso) => {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const read = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* private browsing — the preference just won't persist */
  }
};

/**
 * A short two-note chime, synthesised rather than shipped as a file.
 *
 * Browsers refuse to play audio until the user has interacted with the
 * page, which is why the toggle is opt-in: turning it on is itself the
 * interaction that unlocks playback.
 */
function playChime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [
      [880, 0],
      [1320, 0.14],
    ].forEach(([freq, offset]) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.34);
    });
    setTimeout(() => ctx.close().catch(() => {}), 900);
  } catch {
    /* audio is a nicety; never let it break the panel */
  }
}

/**
 * Watches for incoming orders and announces them.
 *
 * Polls rather than holding a socket open: the backend runs on a small
 * instance that sleeps when idle, and one tiny request every 20 seconds
 * is cheaper and far less to go wrong than a connection to keep alive.
 *
 * "New" is measured against a timestamp the SERVER hands back, so a
 * laptop with a wrong clock cannot make orders vanish or repeat.
 */
export default function OrderNotifications({ onOpenOrder, onRefresh }) {
  const [orders, setOrders] = useState([]);
  const [open, setOpen] = useState(false);
  const [sound, setSound] = useState(() => read(SOUND_KEY, 'off') === 'on');
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  const sinceRef = useRef(null);
  const seenAtRef = useRef(read(SEEN_KEY, null));
  const soundRef = useRef(sound);
  const panelRef = useRef(null);
  soundRef.current = sound;

  // The parent passes fresh arrow functions on every render. Holding them
  // in a ref keeps `poll` stable, so the interval below is created once
  // instead of being torn down and restarted on every parent render —
  // which previously meant a burst of overlapping polls, and a new order
  // could advance the cursor without ever landing on screen.
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const unread = orders.filter(
    (o) => !seenAtRef.current || new Date(o.createdAt) > new Date(seenAtRef.current)
  ).length;

  const poll = useCallback(async () => {
    try {
      const res = await adminOrderFeed(sinceRef.current);
      sinceRef.current = res.serverTime;
      setPendingCount(res.pendingCount ?? 0);

      // First ever sign-in on this browser: the orders the baseline call
      // returns are history, not news. Show them in the panel, but do not
      // light up the badge — otherwise the bell is permanently "unread"
      // from the moment the panel is opened, which teaches the shop owner
      // to ignore it.
      if (res.baseline && !seenAtRef.current) {
        seenAtRef.current = res.serverTime;
        write(SEEN_KEY, res.serverTime);
      }

      if (res.orders.length) {
        setOrders((prev) => {
          const merged = [...res.orders, ...prev];
          const seen = new Set();
          return merged.filter((o) => !seen.has(o.id) && seen.add(o.id)).slice(0, 30);
        });

        // The first call establishes the baseline — those orders are
        // history, not news, so they must not set off the chime.
        if (!res.baseline && soundRef.current) playChime();
        if (!res.baseline) onRefreshRef.current?.();
      }
    } catch {
      /* a dropped poll is not worth telling the shop owner about */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_MS);
    // Coming back to the tab should feel instant rather than waiting
    // out the rest of the interval.
    const onFocus = () => poll();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, [poll]);

  // Close on outside click and on Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const markSeen = () => {
    const now = new Date().toISOString();
    seenAtRef.current = now;
    write(SEEN_KEY, now);
    setOrders((prev) => [...prev]); // re-render so the badge clears
  };

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) markSeen();
  };

  const toggleSound = (e) => {
    e.stopPropagation();
    const next = !sound;
    setSound(next);
    write(SOUND_KEY, next ? 'on' : 'off');
    if (next) playChime(); // confirm it works, and unlock audio
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={toggleOpen}
        aria-label={
          unread ? `${unread} new order${unread === 1 ? '' : 's'}` : 'Order notifications'
        }
        className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
      >
        <Bell className={`w-5 h-5 ${unread ? 'animate-[wiggle_1s_ease-in-out_infinite]' : ''}`} />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center ring-2 ring-[#0F3D1E]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(380px,calc(100vw-2rem))] bg-white rounded-xl shadow-2xl ring-1 ring-black/10 overflow-hidden text-gray-900 z-50">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-bold text-sm text-[#0F3D1E]">New orders</p>
              <p className="text-xs text-gray-500">
                {pendingCount > 0
                  ? `${pendingCount} awaiting confirmation`
                  : 'Nothing awaiting confirmation'}
              </p>
            </div>
            <button
              onClick={toggleSound}
              title={sound ? 'Chime on — click to mute' : 'Chime off — click to enable'}
              className={`shrink-0 flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border-2 transition-colors ${
                sound
                  ? 'border-green-600 text-green-700 bg-green-50'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {sound ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              {sound ? 'Sound on' : 'Sound off'}
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {loading && (
              <div className="py-10 text-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
              </div>
            )}

            {!loading && orders.length === 0 && (
              <div className="py-10 px-6 text-center">
                <Bell className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-600">No orders yet today</p>
                <p className="text-xs text-gray-400 mt-1">
                  This checks every {POLL_MS / 1000} seconds. New orders appear here on their own.
                </p>
              </div>
            )}

            {orders.map((o) => {
              const isNew =
                !seenAtRef.current || new Date(o.createdAt) > new Date(seenAtRef.current);
              return (
                <button
                  key={o.id}
                  onClick={() => {
                    setOpen(false);
                    onOpenOrder?.(o.id);
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors flex gap-3 items-start ${
                    isNew ? 'bg-green-50/60' : ''
                  }`}
                >
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      isNew ? 'bg-green-500' : 'bg-transparent'
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-2">
                      <span className="font-bold text-sm text-[#0F3D1E] truncate">
                        {o.orderNumber}
                      </span>
                      <span className="font-bold text-sm text-gray-900 shrink-0">
                        {money(o.grandTotal)}
                      </span>
                    </span>
                    <span className="block text-sm text-gray-700 truncate">
                      {o.customerName}
                      {o.city ? ` · ${o.city}` : ''}
                    </span>
                    <span className="block text-xs text-gray-400 mt-0.5">{ago(o.createdAt)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
