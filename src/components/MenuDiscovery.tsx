import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowUpRight, Globe2, MapPin, Search, Sparkles, UtensilsCrossed } from 'lucide-react';
import { DirectoryPage, DIRECTORY_PAGE_SIZE } from '../services/menuDirectoryCore';
import { dataDiagnosticsEnabled, observeResourceMetrics } from '../services/dataMetrics';
import { MenuDirectoryService } from '../services/menuDirectory';
import { matchesDirectorySearch } from '../utils/menuDirectory';
import { COUNTRY_OPTIONS, countryName } from '../utils/countries';
import { DiscoveryCard } from './DiscoveryCard';
import { motion, useInView, useScroll, useSpring, useTransform } from 'motion/react';
import './menuDiscovery.css';


// Match the approved Index direction: DESIGN_VARIANCE 9 / MOTION_INTENSITY 8 / VISUAL_DENSITY 4.
function DiscoveryReveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .1 }} transition={{ duration: .7, delay, ease: [.16, 1, .3, 1] }}>{children}</motion.div>;
}
function DiscoveryScene() {
  const frame = useRef<HTMLDivElement>(null);
  const inView = useInView(frame);
  const { scrollYProgress } = useScroll({ target: frame, offset: ['start end', 'end start'] });
  const shift = useTransform(scrollYProgress, [0, 1], [-14, 14]);
  const y = useSpring(shift, { stiffness: 100, damping: 30 });
  return <div ref={frame} className={`discovery-scene${inView ? ' discovery-scene-visible' : ''}`} aria-hidden="true">
    <div className="discovery-scene-frame"><motion.img src="/images/landing/cafe-corner.webp" alt="" width="1536" height="1024" fetchPriority="high" style={{ y }} /></div>
    <div className="discovery-scene-detail"><img src="/images/landing/cafe-editorial.webp" alt="" width="1536" height="1024" /></div>
    <div className="discovery-scene-ticket"><MapPin size={22} /><span>Mở menu.<strong>Tìm góc quen.</strong></span><ArrowUpRight size={21} /></div>
    <Sparkles className="discovery-scene-spark" strokeWidth={1.4} />
  </div>;
}

const QUICK_COUNTRIES = ['VN', 'TH', 'JP', 'KR', 'US'];
const Diagnostics=dataDiagnosticsEnabled?React.lazy(()=>import('./DataDiagnostics').then(module=>({default:module.DataDiagnostics}))):null;
export function MenuDiscovery() {
  const [page, setPage] = useState<DirectoryPage>();
  const [cursors, setCursors] = useState<Array<DirectoryPage['cursor']>>([undefined]);
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('all');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const cursor = cursors.at(-1);
  const requestVersion=useRef(0),navigationPending=useRef(true);
  useEffect(()=>observeResourceMetrics(),[]);
  useEffect(() => {
    const version=++requestVersion.current;
    let active = true;
    navigationPending.current=true;
    setPage(undefined); setError('');
    const unsubscribe = MenuDirectoryService.subscribe(cursor, result => {
      if (active&&version===requestVersion.current) { navigationPending.current=false;setPage(result); setError(''); }
    }, failure => { if (active&&version===requestVersion.current) { navigationPending.current=false;setPage(undefined); setError(failure.message); } }, country);
    return () => { active = false; unsubscribe(); };
  }, [cursor, country, attempt]);
  function chooseCountry(value: string) {
    if (value === country) return;
    requestVersion.current++;navigationPending.current=true;
    setPage(undefined); setError(''); setCursors([undefined]); setCountry(value); setSearch('');
  }
  function changePage(direction:'previous'|'next'){
    if(navigationPending.current||!page||direction==='previous'&&cursors.length===1||direction==='next'&&(!page.hasMore||!page.cursor))return;
    requestVersion.current++;navigationPending.current=true;setPage(undefined);setSearch('');
    setCursors(value=>direction==='previous'?value.slice(0,-1):[...value,page.cursor]);
  }
  function retry(){if(navigationPending.current)return;requestVersion.current++;navigationPending.current=true;setPage(undefined);setError('');setAttempt(value=>value+1);}
  const entries = page?.entries.filter(entry => matchesDirectorySearch(entry, search)) || [];
  const countryLabel = country === 'all' ? 'Khắp thế giới' : country === 'unknown' ? 'Chưa cập nhật quốc gia' : countryName(country);
  return <main className="menu-discovery">
    <header className="discovery-header"><nav className="discovery-container discovery-nav">
      <a href="#/" className="discovery-brand"><span>QR</span> Menu</a>
      <div className="discovery-nav-links"><a href="#/discover" aria-current="page">Khám phá</a><a href="#/" className="discovery-home-link">Về trang chủ <ArrowUpRight size={16} aria-hidden="true" /></a></div>
    </nav></header>
    <section className="discovery-hero" aria-labelledby="discovery-hero-title"><div className="discovery-container discovery-hero-grid">
      <div className="discovery-hero-copy">
        <DiscoveryReveal><p className="discovery-eyebrow"><Globe2 aria-hidden="true" /> MENU CÔNG KHAI · KHÔNG CẦN ĐĂNG NHẬP</p></DiscoveryReveal>
        <h1 id="discovery-hero-title"><span className="discovery-title-mask"><motion.span initial={{ y: '110%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .8, ease: [.16, 1, .3, 1] }}>Ăn ngon.</motion.span></span><span className="discovery-title-mask discovery-title-purple"><motion.span initial={{ y: '110%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: .8, delay: .18, ease: [.16, 1, .3, 1] }}>Đi chill. Lên kèo!</motion.span></span></h1>
        <DiscoveryReveal delay={.3}><p className="discovery-hero-description">Một chiếc menu, một địa điểm mới. Khám phá quán bạn thích — từ góc phố quen đến bên kia thế giới.</p></DiscoveryReveal>
        <DiscoveryReveal className="discovery-hero-meta" delay={.4}><span><UtensilsCrossed size={17} aria-hidden="true" /> Xem món trước khi ghé</span><span><MapPin size={17} aria-hidden="true" /> Tìm địa chỉ dễ dàng</span></DiscoveryReveal>
      </div>
      <DiscoveryReveal className="discovery-hero-visual" delay={.35}><DiscoveryScene /></DiscoveryReveal>
    </div><div className="discovery-hero-band" aria-hidden="true" /></section>
    <section className="discovery-container discovery-results" aria-labelledby="discovery-title">
      <div className="discovery-filter-shell"><div className="discovery-filter-intro"><span><Search size={17} aria-hidden="true" />Tìm chiếc kèo hợp gu</span><span>Chọn quốc gia, khám phá quán</span></div><div className="discovery-filter-panel">
        <label className="discovery-search"><Search aria-hidden="true" /><span className="sr-only">Tìm tên quán hoặc địa chỉ trong trang này</span>
          <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm tên quán hoặc địa chỉ trong trang này…" />
        </label>
        <label className="discovery-country-select"><Globe2 aria-hidden="true" /><span className="sr-only">Lọc theo quốc gia</span>
          <select value={country} onChange={event => chooseCountry(event.target.value)}>
            <option value="all">Tất cả quốc gia</option>
            {COUNTRY_OPTIONS.map(option => <option key={option.code} value={option.code}>{option.name}</option>)}
            <option value="unknown">Chưa cập nhật quốc gia</option>
          </select>
        </label>
      </div>
      <div className="discovery-country-chips" aria-label="Chọn nhanh quốc gia">
        <button aria-pressed={country === 'all'} onClick={() => chooseCountry('all')}><Globe2 aria-hidden="true" /> Khắp thế giới</button>
        {QUICK_COUNTRIES.map(code => <button key={code} aria-pressed={country === code} onClick={() => chooseCountry(code)}>{countryName(code)}</button>)}
        <button aria-pressed={country === 'unknown'} onClick={() => chooseCountry('unknown')}>Chưa cập nhật</button>
      </div>
      </div>
      <DiscoveryReveal className="discovery-results-heading"><div><p className="discovery-section-kicker">ĐIỂM HẸN TIẾP THEO CỦA BẠN</p><h2 id="discovery-title">Khám phá các quán <span>↗</span></h2></div>
        <span className="discovery-results-region"><Globe2 aria-hidden="true" />{countryLabel}</span>
      </DiscoveryReveal>
      <p className="discovery-page-note">Lọc quốc gia trên toàn bộ danh sách. Tìm tên/địa chỉ trong trang hiện tại · tối đa {DIRECTORY_PAGE_SIZE} quán mỗi trang. Chuyển trang để xem thêm.</p>
      {error ? <div role="alert" className="discovery-state"><Globe2 aria-hidden="true" /><h3>Chưa tải được danh sách</h3><p>{error}</p><button onClick={retry}>Thử lại</button></div>
        : !page ? <div role="status" aria-label="Đang tải các quán" className="discovery-skeleton-grid">{[0, 1, 2].map(index => <div key={index} className="discovery-skeleton"><div /><span /><span /></div>)}</div>
        : <><div className="discovery-grid">{entries.map((entry, index) => <DiscoveryReveal key={entry.shopId} className="discovery-card-reveal" delay={Math.min(index, 5) * .06}><DiscoveryCard entry={entry} /></DiscoveryReveal>)}</div>
          {!entries.length && <div className="discovery-state"><UtensilsCrossed aria-hidden="true" /><h3>{search.trim() ? 'Chưa tìm thấy chiếc kèo này' : 'Chưa có quán ở đây'}</h3>
            <p>{search.trim() ? 'Thử tên quán hoặc địa chỉ khác trong trang đang xem.' : 'Đổi quốc gia để khám phá thêm. Các menu mới sẽ xuất hiện khi chủ quán xuất bản.'}</p>
            {(search || country !== 'all') && <button onClick={() => { setSearch(''); chooseCountry('all'); }}>Xem tất cả quán</button>}
          </div>}
          <nav className="discovery-pagination" aria-label="Phân trang danh sách quán"><button disabled={cursors.length === 1} onClick={() => changePage('previous')}><ArrowLeft aria-hidden="true" /> Trang trước</button>
            <span aria-live="polite">Trang {cursors.length}</span><button disabled={!page.hasMore||!page.cursor} onClick={() => changePage('next')}>Trang sau <ArrowRight aria-hidden="true" /></button></nav>
        </>}
    </section>
    <footer className="discovery-footer"><div className="discovery-container discovery-footer-inner"><div><p>BẠN CŨNG CÓ MỘT QUÁN?</p><h2>Đưa góc riêng của bạn<br /><em>lên bản đồ khám phá.</em></h2><span>Tạo thực đơn miễn phí và xuất bản để mọi người tìm thấy quán.</span></div><a href="#/">Tạo menu miễn phí <ArrowUpRight size={19} aria-hidden="true" /></a></div><div className="discovery-container discovery-footer-bottom"><span>QR Menu · Mở menu, mở trải nghiệm.</span><a href="#/">Về trang chủ</a></div></footer>
    {Diagnostics&&<React.Suspense fallback={null}><Diagnostics/></React.Suspense>}
  </main>;
}
