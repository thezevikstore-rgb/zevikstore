import { useState, useEffect } from "react";
import { ShoppingBag, Sun, Moon, Star, MapPin, X, Plus, Minus, Trash2, Package, ShieldCheck, Truck, Zap } from "lucide-react";
import { supabase, uploadProductImage } from "./supabase";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xgaklgbj";
const OWNER = "thezevikstore@gmail.com", PIN = "2026", IG = "the_zevikstore";
const ls = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const sv = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const mk = (id, name, price, mrp, category, badge, stock, tagline, highlights, specs) => ({ id, name, price, mrp, category, badge, stock, tagline, highlights, specs, images: [] });

const DEFAULTS = [
  mk("laptop-stand", "Foldable Aluminum Laptop Stand", 349, 699, "Desk Setup", "Bestseller", 6, "Ergonomic height, folds flat.", ["Fits 10–17 inch laptops", "6 adjustable angles", "Anti-slip silicone pads", "Foldable, 480g"], [["Material", "Aluminum alloy"], ["Weight", "480 g"], ["Load", "Up to 10 kg"]]),
  mk("led-desk-lamp", "Rechargeable Clip-On LED Desk Lamp", 399, 799, "Lighting", "Night Study Pick", 4, "Eye-care light that clips anywhere.", ["3 colour modes", "Stepless dimming", "Up to 20 hrs battery", "360° flexible neck"], [["Battery", "2000 mAh"], ["Charging", "USB-C"], ["Modes", "Warm / Neutral / Cool"]]),
  mk("cable-clips", "Silicone Cable Clips & Organizer Pack", 229, 449, "Power & Cables", "Essential", 14, "Tame every cable on your desk.", ["Self-adhesive base", "Pack of 12 clips", "Holds up to 4 cables", "Reusable silicone"], [["Material", "Silicone"], ["Pack", "12 pcs"], ["Adhesive", "3M-style"]]),
  mk("mobile-stand", "360° Rotating Metal Mobile Desk Stand", 279, 549, "Desk Setup", "360° Swivel", 7, "Any angle, any phone.", ["360° rotation", "Fits 4–12.9 inch devices", "Non-slip grip", "Sturdy metal base"], [["Material", "Metal + silicone"], ["Rotation", "360°"], ["Weight", "260 g"]]),
  mk("usb-hub", "4-Port High-Speed USB Hub", 299, 599, "Power & Cables", "Plug & Play", 12, "Four ports, zero drivers.", ["4x USB 3.0 ports", "5 Gbps transfer", "Plug & play", "Slim aluminum body"], [["Ports", "4x USB-A 3.0"], ["Speed", "5 Gbps"], ["Cable", "30 cm"]]),
  mk("retractable-cable", "3-in-1 Retractable Fast Charging Cable", 269, 499, "Power & Cables", "EDC Gear", 5, "Type-C, Lightning & Micro in one.", ["3 connectors in 1", "Retractable, tangle-free", "Fast charge up to 3A", "Pocket friendly"], [["Connectors", "C / Lightning / Micro"], ["Length", "1 m"], ["Current", "3 A"]]),
];

const CATS = ["All", "Desk Setup", "Power & Cables", "Lighting"];
const STATUS = ["Order Received", "Dispatched", "Delivered"];
const inr = n => "₹" + Number(n).toLocaleString("en-IN");
const off = p => Math.round((1 - p.price / p.mrp) * 100);

const toRow = p => ({
  id: p.id, name: p.name, price: Number(p.price), mrp: Number(p.mrp),
  category: p.category, badge: p.badge || "", tagline: p.tagline || "",
  specs: { highlights: p.highlights || [], specs: p.specs || [] },
  stock: Number(p.stock), images: p.images || []
});

const fromRow = r => {
  const sp = Array.isArray(r.specs) ? { highlights: [], specs: r.specs } : (r.specs || {});
  return {
    id: r.id, name: r.name, price: r.price, mrp: r.mrp,
    category: r.category, badge: r.badge || "", tagline: r.tagline || "",
    highlights: sp.highlights || [], specs: sp.specs || [],
    stock: r.stock ?? 0, images: r.images || []
  };
};

const Mark = ({ s = 28 }) => (<svg width={s} height={s} viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#10B981" /><path d="M8 9h16l-12 14h12" stroke="#0B1329" strokeWidth="3" fill="none" strokeLinejoin="round" /></svg>);
function Logo({ dark, h = 28 }) {
  const [bad, setBad] = useState(false);
  return (
    <span className="flex items-center gap-2">
      {bad ? <Mark s={h} /> : <img src="/zevik-logo.png" alt="Zevik" onError={() => setBad(true)} style={{ height: h, width: h }} className={`object-contain rounded-md ${dark ? "invert brightness-110" : ""}`} />}
    </span>
  );
}
const Art = ({ p }) => (<svg viewBox="0 0 200 200" className="h-full w-full p-8"><rect width="200" height="200" fill="none" /><circle cx="100" cy="100" r="70" fill="#10B98122" stroke="#00D9FF" strokeWidth="2" /><path d="M60 130h80M75 130l25-50 25 50M100 80V60" stroke="#10B981" strokeWidth="6" strokeLinecap="round" fill="none" /><text x="100" y="170" textAnchor="middle" fontSize="12" fill="currentColor">{p.name.split(" ").slice(-2).join(" ")}</text></svg>);
const Img = ({ p, i = 0 }) => p.images?.[i] ? <img src={p.images[i]} alt={p.name} className="h-full w-full object-cover" /> : <Art p={p} />;

const compressToFile = file => new Promise(res => {
  const r = new FileReader();
  r.onload = () => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 900 / Math.max(im.width, im.height));
      const c = document.createElement("canvas");
      c.width = im.width * k; c.height = im.height * k;
      c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
      c.toBlob(blob => res(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })), "image/jpeg", 0.8);
    };
    im.src = r.result;
  };
  r.readAsDataURL(file);
});

export default function App() {
  const [dark, setDark] = useState(true);
  const [products, setProducts] = useState(() => ls("zevik_products", DEFAULTS));
  const [orders, setOrders] = useState(() => ls("zevik_orders", []));
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState({ n: "home" });
  const [cat, setCat] = useState("All");
  const [bag, setBag] = useState([]);
  const [bagOpen, setBagOpen] = useState(false);
  const [co, setCo] = useState(null);
  const [track, setTrack] = useState(false);
  const [seller, setSeller] = useState(false);

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: true });
        if (!error && data) {
          if (data.length === 0) {
            await supabase.from("products").insert(DEFAULTS.map(toRow));
            setProducts(DEFAULTS);
            sv("zevik_products", DEFAULTS);
          } else {
            const mapped = data.map(fromRow);
            setProducts(mapped);
            sv("zevik_products", mapped);
          }
        }
        const { data: ordData } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
        if (ordData) {
          const mappedOrders = ordData.map(r => ({
            id: r.id, date: r.created_at, items: r.items || [], total: r.total, status: r.status,
            buyer: { name: r.customer_name, mobile: r.phone, insta: r.instagram || "", address: r.address.split(" | ")[0] || r.address, city: r.address.split(" | ")[1] || "", pincode: r.pincode, pay: r.payment_method }
          }));
          setOrders(mappedOrders);
          sv("zevik_orders", mappedOrders);
        }
      } catch (e) { console.error("Supabase sync error:", e); }
      setLoading(false);
    })();
  }, []);

  const get = id => products.find(p => p.id === id);
  const addBag = (id, q = 1) => {
    const p = get(id);
    if (!p || p.stock <= 0) return;
    setBag(b => b.find(x => x.id === id) ? b.map(x => x.id === id ? { ...x, qty: Math.min(p.stock, x.qty + q) } : x) : [...b, { id, qty: q }]);
    setBagOpen(true);
  };
  const go = n => { setPage(n); window.scrollTo(0, 0); };
  const cur = page.n === "pdp" ? get(page.id) : null;
  const count = bag.reduce((a, b) => a + b.qty, 0);

  return (<div className="min-h-screen">
    <div className="bg-emerald py-1.5 text-center text-[11px] font-bold tracking-wide text-white sm:text-xs">FREE PAN INDIA DELIVERY 🇮🇳 • EXTRA ₹20 OFF ON PREPAID UPI • COD AVAILABLE</div>
    <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
      <button onClick={() => go({ n: "home" })}><Logo dark={dark} /></button>
      <div className="flex items-center gap-2">
        <button className="btn2 !py-1.5" onClick={() => setTrack(true)}>Track</button>
        <button className="btn2 !px-2.5 !py-1.5" onClick={() => setDark(!dark)} aria-label="theme">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
        <button className="btn2 relative !px-2.5 !py-1.5" onClick={() => setBagOpen(true)}><ShoppingBag size={16} />{count > 0 && <span className="absolute -right-1.5 -top-1.5 rounded-full bg-cyan px-1.5 text-[10px] font-bold text-black">{count}</span>}</button>
      </div></div></header>

    <main className="mx-auto max-w-6xl px-4 py-6">
      {loading && <div className="mb-4 text-center text-xs opacity-60">Syncing live catalog...</div>}
      {page.n === "home" && <Home products={products} cat={cat} setCat={setCat} go={go} addBag={addBag} />}
      {page.n === "pdp" && cur && <PDP p={cur} products={products} go={go} addBag={addBag} buy={() => setCo([{ id: cur.id, qty: 1 }])} />}
      {page.n === "seller" && <Seller {...{ seller, setSeller, products, setProducts, orders, setOrders }} />}
    </main>

    <footer className="mt-10 border-t border-line py-8 text-center text-xs opacity-80"><div className="mb-3 flex justify-center"><Logo dark={dark} h={24} /></div>
      <p>© 2026 Zevik • <a className="text-cyan" href={`https://instagram.com/${IG}`} target="_blank" rel="noreferrer">@{IG}</a></p>
      <button className="mt-2 opacity-50 hover:opacity-100" onClick={() => go({ n: "seller" })}>Seller Login</button></footer>

    {bagOpen && <Drawer title="Your Bag" close={() => setBagOpen(false)}>
      {!bag.length && <p className="opacity-60">Your bag is empty.</p>}
      {bag.map(x => { const p = get(x.id); if (!p) return null; return (<div key={x.id} className="mb-3 flex gap-3 rounded-lg border border-line p-2">
        <div className="h-16 w-16 overflow-hidden rounded bg-bg"><Img p={p} /></div>
        <div className="flex-1 text-sm"><div className="font-semibold">{p.name}</div><div className="text-emerald">{inr(p.price)}</div>
          <div className="mt-1 flex items-center gap-2"><button onClick={() => setBag(b => b.map(i => i.id === x.id ? { ...i, qty: Math.max(1, i.qty - 1) } : i))}><Minus size={14} /></button>{x.qty}<button onClick={() => setBag(b => b.map(i => i.id === x.id ? { ...i, qty: Math.min(p.stock, i.qty + 1) } : i))}><Plus size={14} /></button>
            <button className="ml-auto" onClick={() => setBag(b => b.filter(i => i.id !== x.id))}><Trash2 size={14} /></button></div></div></div>); })}
      {bag.length > 0 && <button className="btn w-full" onClick={() => { setCo(bag); setBagOpen(false); }}>Proceed to Checkout</button>}
    </Drawer>}

    {co && <Checkout items={co} products={products} close={() => setCo(null)} done={async (o) => {
      const nextOrders = [o, ...orders];
      setOrders(nextOrders);
      sv("zevik_orders", nextOrders);
      const nextProducts = products.map(p => {
        const it = o.items.find(i => i.id === p.id);
        return it ? { ...p, stock: Math.max(0, p.stock - it.qty) } : p;
      });
      setProducts(nextProducts);
      sv("zevik_products", nextProducts);
      setBag([]);
      await supabase.from("orders").insert({
        id: o.id, customer_name: o.buyer.name, phone: o.buyer.mobile,
        instagram: o.buyer.insta || "", address: `${o.buyer.address} | ${o.buyer.city}`,
        pincode: o.buyer.pincode, payment_method: o.buyer.pay,
        items: o.items, total: o.total, status: o.status
      });
      for (const it of o.items) {
        const updated = nextProducts.find(p => p.id === it.id);
        if (updated) await supabase.from("products").update({ stock: updated.stock }).eq("id", it.id);
      }
    }} />}

    {track && <Track orders={orders} close={() => setTrack(false)} />}
  </div>);
}

function Drawer({ title, close, children }) {
  return (<div className="fixed inset-0 z-40 flex justify-end bg-black/60" onClick={close}><div className="h-full w-full max-w-md overflow-y-auto bg-card p-5" onClick={e => e.stopPropagation()}>
    <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{title}</h2><button onClick={close}><X /></button></div>{children}</div></div>);
}

function Home({ products, cat, setCat, go, addBag }) {
  const list = products.filter(p => cat === "All" || p.category === cat);
  return (<>
    <section className="py-8 text-center"><h1 className="text-3xl font-extrabold sm:text-5xl">Engineered for your <span className="text-cyan">everyday desk</span></h1>
      <p className="mx-auto mt-3 max-w-xl opacity-70">Minimalist desk gear & mobile accessories, made for Indian setups.</p></section>
    <div className="mb-6 grid grid-cols-2 gap-2 text-center text-xs font-semibold sm:grid-cols-4">
      {["4.9★ Rated by 500+ Indian Setups", "24-Hr Dispatch", "7-Day Easy Replacement", "100% Quality Checked"].map(t => <div key={t} className="rounded-lg border border-line bg-card p-3">{t}</div>)}</div>
    <div className="mb-5 flex gap-2 overflow-x-auto">{CATS.map(c => <button key={c} onClick={() => setCat(c)} className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm ${cat === c ? "border-emerald bg-emerald text-white" : "border-line"}`}>{c}</button>)}</div>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{list.map(p => (
      <div key={p.id} className="overflow-hidden rounded-xl border border-line bg-card">
        <button className="block w-full text-left" onClick={() => go({ n: "pdp", id: p.id })}>
          <div className="relative aspect-square bg-bg"><Img p={p} />{p.badge && <span className="absolute left-2 top-2 rounded bg-cyan px-2 py-0.5 text-[10px] font-bold text-black">{p.badge}</span>}{p.stock === 0 && <div className="absolute inset-0 grid place-items-center bg-black/60 font-bold text-white">SOLD OUT</div>}</div>
          <div className="p-3"><h3 className="line-clamp-2 text-sm font-semibold">{p.name}</h3>
            <div className="mt-1 flex items-baseline gap-2"><b className="text-emerald">{inr(p.price)}</b><s className="text-xs opacity-50">{inr(p.mrp)}</s><span className="text-xs font-bold text-emerald">{off(p)}% OFF</span></div>
            {p.stock > 0 && p.stock < 10 && <div className="mt-1 text-xs text-orange-400">🔥 Only {p.stock} left in stock</div>}</div></button>
        <div className="px-3 pb-3"><button disabled={!p.stock} className="btn w-full !py-2" onClick={() => addBag(p.id)}>Add to Bag</button></div></div>))}</div></>);
}

function PDP({ p, products, go, addBag, buy }) {
  const [i, setI] = useState(0); const [pin, setPin] = useState(""); const [pr, setPr] = useState(null);
  const n = Math.max(p.images?.length || 0, 1);
  const bundle = products.filter(x => x.id !== p.id).slice(0, 2);
  const reviews = [["Aarav S.", "Perfect for my hostel desk. Build is solid for the price!"], ["Priya M.", "Delivered in 4 days. Exactly as shown."], ["Rohit K.", "Great value, using it daily for WFH."]];
  return (<div>
    <div className="mb-4 text-xs opacity-70"><button onClick={() => go({ n: "home" })}>Home</button> > {p.category} > <b>{p.name}</b></div>
    <div className="grid gap-6 lg:grid-cols-2">
      <div><div className="flex flex-col-reverse gap-3 sm:flex-row-reverse">
        <div className="aspect-square flex-1 overflow-hidden rounded-xl border border-line bg-card"><Img p={p} i={i} /></div>
        <div className="flex gap-2 sm:flex-col">{Array.from({ length: n }).map((_, k) => <button key={k} onClick={() => setI(k)} className={`h-14 w-14 overflow-hidden rounded border bg-card ${i === k ? "border-emerald" : "border-line"}`}><Img p={p} i={k} /></button>)}</div></div>
        <div className="sticky bottom-0 mt-4 grid grid-cols-2 gap-2 bg-bg/95 py-3"><button disabled={!p.stock} className="btn2 !border-emerald !py-3" onClick={() => addBag(p.id)}>ADD TO BAG</button><button disabled={!p.stock} className="btn !py-3" onClick={buy}>BUY NOW</button></div></div>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{p.name}</h1><p className="opacity-70">{p.tagline}</p>
        <div className="flex items-center gap-2"><span className="inline-flex items-center gap-1 rounded bg-emerald px-2 py-0.5 text-sm font-bold text-white">4.8 <Star size={12} fill="white" /></span><span className="text-sm opacity-70">(120+ verified buyers)</span></div>
        <div className="flex items-baseline gap-3"><b className="text-3xl text-emerald">{inr(p.price)}</b><s className="opacity-50">{inr(p.mrp)}</s><span className="rounded bg-emerald/20 px-2 py-0.5 text-sm font-bold text-emerald">{off(p)}% OFF</span></div>
        {p.stock > 0 && p.stock < 10 && <div className="font-semibold text-orange-400">🔥 Only {p.stock} left in stock</div>}
        {p.stock === 0 && <div className="font-semibold text-red-400">Out of stock</div>}
        <div className="rounded-xl border border-line bg-card p-4"><div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Truck size={16} /> Delivery</div>
          <div className="flex gap-2"><input className="inp" inputMode="numeric" maxLength={6} placeholder="Enter Pincode" value={pin} onChange={e => { setPin(e.target.value.replace(/\D/g, "")); setPr(null); }} /><button className="btn" onClick={() => setPr(/^\d{6}$/.test(pin))}>Check</button></div>
          {pr === true && <p className="mt-2 text-sm text-emerald">Free Delivery in 3–5 Days • COD & UPI Available</p>}{pr === false && <p className="mt-2 text-sm text-red-400">Enter a valid 6-digit pincode</p>}</div>
        {p.highlights?.length > 0 && <div><h3 className="mb-2 font-bold">Highlights</h3><ul className="list-disc space-y-1 pl-5 text-sm">{p.highlights.map(h => <li key={h}>{h}</li>)}</ul></div>}
        {p.specs?.length > 0 && <div><h3 className="mb-2 font-bold">Specifications</h3><table className="w-full text-sm"><tbody>{p.specs.map(([k, v]) => <tr key={k} className="border-b border-line"><td className="w-1/3 py-2 opacity-60">{k}</td><td>{v}</td></tr>)}</tbody></table></div>}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">{[[Package, "7-Day Replacement"], [ShieldCheck, "Quality Checked"], [Truck, "PAN India Shipping"]].map(([I, t]) => <div key={t} className="rounded-lg border border-line bg-card p-3"><I className="mx-auto mb-1 text-cyan" size={18} />{t}</div>)}</div>
        <div><h3 className="mb-2 font-bold">Verified Customer Reviews</h3>{reviews.map(([a, t]) => <div key={a} className="mb-2 rounded-lg border border-line bg-card p-3 text-sm"><b>{a}</b> <span className="text-emerald">★★★★★</span> <span className="text-xs opacity-60">Verified Buyer</span><p className="mt-1 opacity-80">{t}</p></div>)}</div></div></div>
    <section className="mt-10"><h3 className="mb-3 text-lg font-bold">Complete Your Desk Setup</h3>
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-card p-4">{[p, ...bundle].map((x, k) => <div key={x.id} className="flex items-center gap-3">{k > 0 && <Plus size={16} />}<div className="h-14 w-14 overflow-hidden rounded bg-bg"><Img p={x} /></div><div className="text-xs"><div className="max-w-[130px] truncate">{x.name}</div><b className="text-emerald">{inr(x.price)}</b></div></div>)}
        <div className="ml-auto text-right"><div className="text-sm font-bold">{inr([p, ...bundle].reduce((a, x) => a + x.price, 0))}</div><button className="btn mt-1" onClick={() => [p, ...bundle].forEach(x => x.stock > 0 && addBag(x.id))}>Add Bundle</button></div></div></section></div>);
}

function Checkout({ items, products, close, done }) {
  const [f, setF] = useState(() => ({ name: "", mobile: "", insta: "", address: "", city: "", pincode: "", pay: "UPI", ...ls("zevik_buyer_profile", {}) }));
  const [err, setErr] = useState({}); const [order, setOrder] = useState(null); const [busy, setBusy] = useState(false);
  const lines = items.map(i => ({ ...i, p: products.find(p => p.id === i.id) })).filter(l => l.p);
  const sub = lines.reduce((a, l) => a + l.p.price * l.qty, 0); const disc = f.pay === "UPI" ? 20 : 0; const total = sub - disc;
  const set = (k, v) => setF({ ...f, [k]: v });
  const gps = () => navigator.geolocation?.getCurrentPosition(async pos => {
    try { const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`); const a = (await r.json()).address || {};
      setF(s => ({ ...s, address: s.address || [a.road, a.suburb].filter(Boolean).join(", "), city: [a.city || a.town || a.village || a.state_district, a.state].filter(Boolean).join(", "), pincode: (a.postcode || "").replace(/\D/g, "").slice(0, 6) }));
    } catch { alert("Couldn't fetch address. Please type it in."); } }, () => alert("Location permission denied."));
  const submit = async () => {
    const e = {};
    if (!f.name.trim()) e.name = 1; if (!/^[6-9]\d{9}$/.test(f.mobile)) e.mobile = 1; if (!f.address.trim()) e.address = 1; if (!f.city.trim()) e.city = 1; if (!/^\d{6}$/.test(f.pincode)) e.pincode = 1;
    setErr(e); if (Object.keys(e).length || busy) return;
    setBusy(true);
    sv("zevik_buyer_profile", f);
    const o = { id: "ZVK-" + Math.random().toString(36).slice(2, 8).toUpperCase(), date: new Date().toISOString(), items: lines.map(l => ({ id: l.id, name: l.p.name, qty: l.qty, price: l.p.price })), total, buyer: f, status: STATUS[0] };
    await done(o); setOrder(o); setBusy(false);
    if (!FORMSPREE_ENDPOINT.includes("YOUR_FORMSPREE")) fetch(FORMSPREE_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(o) }).catch(() => {});
  };
  const receipt = o => `ZEVIK ORDER ${o.id}\n${o.items.map(i => `${i.qty}x ${i.name} - ${inr(i.price * i.qty)}`).join("\n")}\nTotal: ${inr(o.total)} (${o.buyer.pay === "UPI" ? "Prepaid UPI" : "COD"})\nName: ${o.buyer.name}\nMobile: ${o.buyer.mobile}\nAddress: ${o.buyer.address}, ${o.buyer.city} - ${o.buyer.pincode}`;
  const cls = k => `inp ${err[k] ? "!border-red-500" : ""}`;
  if (order) return (<Drawer title="Order Placed 🎉" close={close}><p className="mb-1">Your Order ID</p><div className="mb-4 text-3xl font-extrabold text-emerald">{order.id}</div>
    <p className="mb-4 text-sm opacity-70">Send your receipt on Instagram for instant tracking updates.</p>
    <button className="btn w-full" onClick={() => { navigator.clipboard?.writeText(receipt(order)); window.open(`https://ig.me/m/${IG}`, "_blank"); }}>Copy Receipt & Open @{IG} DM</button></Drawer>);
  return (<Drawer title="Checkout" close={close}><div className="space-y-3">
    {lines.map(l => <div key={l.id} className="flex justify-between text-sm"><span>{l.qty}× {l.p.name}</span><b>{inr(l.p.price * l.qty)}</b></div>)}
    <input className={cls("name")} placeholder="Full Name *" value={f.name} onChange={e => set("name", e.target.value)} />
    <input className={cls("mobile")} inputMode="numeric" maxLength={10} placeholder="10-digit Mobile *" value={f.mobile} onChange={e => set("mobile", e.target.value.replace(/\D/g, ""))} />
    <input className="inp" placeholder="Instagram @handle (optional)" value={f.insta} onChange={e => set("insta", e.target.value)} />
    <textarea className={cls("address")} rows={2} placeholder="Street / Hostel / Flat Address + Landmark *" value={f.address} onChange={e => set("address", e.target.value)} />
    <input className={cls("city")} placeholder="City, State *" value={f.city} onChange={e => set("city", e.target.value)} />
    <div className="flex gap-2"><input className={cls("pincode")} inputMode="numeric" maxLength={6} placeholder="Pincode *" value={f.pincode} onChange={e => set("pincode", e.target.value.replace(/\D/g, ""))} /><button className="btn2 flex items-center gap-1 whitespace-nowrap" onClick={gps}><MapPin size={14} />Use Current Location</button></div>
    {[["UPI", "Prepaid UPI — Priority Dispatch (Save ₹20)"], ["COD", "Cash on Delivery (COD)"]].map(([v, t]) => <label key={v} className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-sm ${f.pay === v ? "border-emerald" : "border-line"}`}><input type="radio" checked={f.pay === v} onChange={() => set("pay", v)} />{t}</label>)}
    {disc > 0 && <div className="flex justify-between text-sm text-emerald"><span>UPI discount</span><span>−₹20</span></div>}
    <div className="flex justify-between text-lg font-bold"><span>Total</span><span>{inr(total)}</span></div>
    {Object.keys(err).length > 0 && <p className="text-sm text-red-400">Please fix the highlighted fields.</p>}
    <button disabled={busy} className="btn w-full !py-3" onClick={submit}><Zap className="mr-1 inline" size={14} />{busy ? "Placing Order..." : "Place Order"}</button></div></Drawer>);
}

function Track({ orders, close }) {
  const [q, setQ] = useState(""); const [found, setFound] = useState(null);
  const searchOrder = async () => {
    const id = q.toUpperCase().trim();
    if (!id) return;
    const { data } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
    if (data) setFound([{ id: data.id, total: data.total, items: data.items || [], status: data.status }]);
    else setFound([]);
  };
  const list = found !== null ? found : orders.filter(o => !q || o.id.includes(q.toUpperCase().trim()));
  return (<Drawer title="Track Your Order" close={close}>
    <div className="mb-3 flex gap-2"><input className="inp" placeholder="Order ID (ZVK-XXXXXX)" value={q} onChange={e => { setQ(e.target.value); setFound(null); }} /><button className="btn" onClick={searchOrder}>Search</button></div>
    {!list.length && <p className="opacity-60">No orders found. Enter your ZVK-XXXXXX ID and click Search.</p>}
    {list.map(o => <div key={o.id} className="mb-3 rounded-lg border border-line p-3 text-sm"><div className="flex justify-between"><b>{o.id}</b><b className="text-emerald">{inr(o.total)}</b></div>
      <div className="opacity-70">{o.items.map(i => `${i.qty}× ${i.name}`).join(", ")}</div>
      <div className="mt-2 flex gap-1">{STATUS.map((s, k) => <div key={s} className={`flex-1 rounded px-1 py-1 text-center text-[10px] ${k <= STATUS.indexOf(o.status) ? "bg-emerald text-white" : "bg-bg"}`}>{s}</div>)}</div></div>)}</Drawer>);
}

function Seller({ seller, setSeller, products, setProducts, orders, setOrders }) {
  const [em, setEm] = useState(""); const [pn, setPn] = useState(""); const [bad, setBad] = useState(false); const [uploading, setUploading] = useState(false);
  const blank = { name: "", price: "", mrp: "", category: "Desk Setup", badge: "", tagline: "", highlights: "", specs: "", stock: 10, images: [] };
  const [nf, setNf] = useState(blank); const [url, setUrl] = useState({});

  if (!seller) return (<div className="mx-auto max-w-sm space-y-3 rounded-xl border border-line bg-card p-6"><h2 className="text-xl font-bold">Seller Login</h2>
    <input className="inp" type="email" placeholder="Seller email" value={em} onChange={e => setEm(e.target.value)} /><input className="inp" type="password" placeholder="Store PIN" value={pn} onChange={e => setPn(e.target.value)} />
    {bad && <p className="text-sm text-red-400">Access denied.</p>}
    <button className="btn w-full" onClick={() => em.trim().toLowerCase() === OWNER && pn === PIN ? setSeller(true) : setBad(true)}>Unlock</button></div>);

  const upd = async (id, fn) => {
    const target = products.find(p => p.id === id);
    if (!target) return;
    const updated = fn(target);
    const next = products.map(p => p.id === id ? updated : p);
    setProducts(next); sv("zevik_products", next);
    await supabase.from("products").update(toRow(updated)).eq("id", id);
  };

  const uploadFiles = async (files, cb) => {
    setUploading(true);
    try {
      const urls = [];
      for (const f of files) {
        const compressed = await compressToFile(f);
        const publicUrl = await uploadProductImage(compressed);
        urls.push(publicUrl);
      }
      await cb(urls);
    } catch (e) { alert("Image upload failed: " + e.message); }
    setUploading(false);
  };

  const lines = t => t.split("\n").map(s => s.trim()).filter(Boolean);
  const addProduct = async () => {
    if (!nf.name || !nf.price || !nf.mrp) return alert("Name, price and MRP are required.");
    const item = {
      ...nf, id: nf.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36),
      price: +nf.price, mrp: +nf.mrp, stock: +nf.stock,
      highlights: lines(nf.highlights),
      specs: lines(nf.specs).map(s => s.split(":").map(x => x.trim())).map(([k, ...v]) => [k, v.join(":")])
    };
    const next = [...products, item];
    setProducts(next); sv("zevik_products", next); setNf(blank);
    await supabase.from("products").insert(toRow(item));
  };

  const deleteProduct = async (id) => {
    if (!confirm("Delete product?")) return;
    const next = products.filter(x => x.id !== id);
    setProducts(next); sv("zevik_products", next);
    await supabase.from("products").delete().eq("id", id);
  };

  const resetCatalog = async () => {
    if (!confirm("Reset cloud catalog to default 6 products?")) return;
    setProducts(DEFAULTS); sv("zevik_products", DEFAULTS);
    await supabase.from("products").delete().neq("id", "");
    await supabase.from("products").insert(DEFAULTS.map(toRow));
  };

  const updateOrderStatus = async (id, status) => {
    const next = orders.map(x => x.id === id ? { ...x, status } : x);
    setOrders(next); sv("zevik_orders", next);
    await supabase.from("orders").update({ status }).eq("id", id);
  };

  return (<div className="space-y-8"><div className="flex items-center justify-between"><h2 className="text-2xl font-bold">Seller Portal {uploading && <span className="text-sm font-normal text-cyan">(Uploading image...)</span>}</h2><button className="btn2" onClick={() => setSeller(false)}>Logout</button></div>
    <section><h3 className="mb-3 font-bold">Add New Product</h3><div className="grid gap-2 rounded-xl border border-line bg-card p-4 sm:grid-cols-2">
      {[["name", "Name"], ["price", "Price (₹)"], ["mrp", "MRP (₹)"], ["badge", "Badge"], ["tagline", "Tagline"], ["stock", "Stock Count"]].map(([k, l]) => <input key={k} className="inp" placeholder={l} value={nf[k]} onChange={e => setNf({ ...nf, [k]: e.target.value })} />)}
      <select className="inp" value={nf.category} onChange={e => setNf({ ...nf, category: e.target.value })}>{CATS.slice(1).map(c => <option key={c}>{c}</option>)}</select>
      <textarea className="inp" rows={3} placeholder="Highlights (one per line)" value={nf.highlights} onChange={e => setNf({ ...nf, highlights: e.target.value })} />
      <textarea className="inp" rows={3} placeholder="Specs (Key: Value per line)" value={nf.specs} onChange={e => setNf({ ...nf, specs: e.target.value })} />
      <input type="file" accept="image/*" multiple disabled={uploading} className="text-xs" onChange={e => uploadFiles([...e.target.files], o => setNf(s => ({ ...s, images: [...s.images, ...o] })))} />
      <button disabled={uploading} className="btn" onClick={addProduct}>{uploading ? "Uploading..." : `Add Product (${nf.images.length} photos)`}</button></div></section>
    <section><h3 className="mb-3 font-bold">Catalog, Photos & Stock</h3><div className="space-y-4">{products.map(p => <div key={p.id} className="rounded-xl border border-line bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><b>{p.name}</b><div className="flex items-center gap-2 text-sm">Stock <button className="btn2 !px-2 !py-1" onClick={() => upd(p.id, x => ({ ...x, stock: Math.max(0, x.stock - 1) }))}><Minus size={12} /></button><b>{p.stock}</b><button className="btn2 !px-2 !py-1" onClick={() => upd(p.id, x => ({ ...x, stock: x.stock + 1 }))}><Plus size={12} /></button>
        <button className="text-red-400" onClick={() => deleteProduct(p.id)}><Trash2 size={16} /></button></div></div>
      <div className="mt-3 flex flex-wrap gap-2">{p.images?.map((im, k) => <div key={k} className="relative h-16 w-16 overflow-hidden rounded border border-line"><img src={im} className="h-full w-full object-cover" alt="" />
        <button className="absolute right-0 top-0 bg-black/70 px-1 text-white" onClick={() => upd(p.id, x => ({ ...x, images: x.images.filter((_, j) => j !== k) }))}>×</button>
        {k > 0 ? <button className="absolute bottom-0 w-full bg-emerald text-[9px] text-white" onClick={() => upd(p.id, x => ({ ...x, images: [x.images[k], ...x.images.filter((_, j) => j !== k)] }))}>Cover</button> : <span className="absolute bottom-0 w-full bg-cyan text-center text-[9px] text-black">Cover</span>}</div>)}</div>
      <div className="mt-3 flex flex-wrap items-center gap-2"><input type="file" accept="image/*" multiple disabled={uploading} className="text-xs" onChange={e => uploadFiles([...e.target.files], o => upd(p.id, x => ({ ...x, images: [...(x.images || []), ...o] })))} />
        <input className="inp !w-56" placeholder="Paste image URL" value={url[p.id] || ""} onChange={e => setUrl({ ...url, [p.id]: e.target.value })} />
        <button className="btn2" onClick={() => { if (url[p.id]) { upd(p.id, x => ({ ...x, images: [...(x.images || []), url[p.id]] })); setUrl({ ...url, [p.id]: "" }); } }}>Add URL</button></div></div>)}</div>
      <button className="btn2 mt-4" onClick={resetCatalog}>Reset Default Catalog</button></section>
    <section><h3 className="mb-3 font-bold">Orders ({orders.length})</h3>{!orders.length && <p className="opacity-60">No orders yet.</p>}{orders.map(o => <div key={o.id} className="mb-2 rounded-xl border border-line bg-card p-3 text-sm">
      <div className="flex flex-wrap justify-between gap-2"><b>{o.id} • {inr(o.total)} • {o.buyer.pay}</b>
        <select className="inp !w-auto" value={o.status} onChange={e => updateOrderStatus(o.id, e.target.value)}>{STATUS.map(s => <option key={s}>{s}</option>)}</select></div>
      <div className="opacity-70">{o.items.map(i => `${i.qty}× ${i.name}`).join(", ")}</div>
      <div className="opacity-70">{o.buyer.name} • {o.buyer.mobile}{o.buyer.insta && ` • ${o.buyer.insta}`} • {o.buyer.address}, {o.buyer.city} - {o.buyer.pincode}</div></div>)}</section></div>);
}