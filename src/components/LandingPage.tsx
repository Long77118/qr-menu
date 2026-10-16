'use client';
import React, { createContext, useContext, useRef, useState } from 'react';
import { motion, useInView, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react';
import { ArrowRight, ArrowUpRight, Check, Image, MapPin, PencilLine, Pause, Play, QrCode, Store, UtensilsCrossed } from 'lucide-react';
import './landingPage.css';

interface LandingPageProps { onStartCreate: () => void; onLogin: () => void }
const photo = '/images/landing/cafe-editorial.webp';
const LandingMotion = createContext(false);
function useLandingReducedMotion() { return useContext(LandingMotion); }
const ease = [0.16, 1, 0.3, 1] as const;

// Continuous scroll values stay outside React state. Reduced motion shows static content.
function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const reduce = useLandingReducedMotion();
  const frame = useRef<HTMLDivElement>(null);
  const inView = useInView(frame, { amount: .15 });
  return <motion.div ref={frame} className={`${className} qm-reveal${inView ? ' qm-in-view' : ''}`} initial={reduce ? false : { opacity: 0, y: 32, scale: .985 }}
    whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, amount: 0.12 }}
    transition={{ duration: 0.7, delay: reduce ? 0 : delay, ease }}>{children}</motion.div>;
}
function CafePhoto({ className = '', priority = false, alt, src = photo }: { className?: string; priority?: boolean; alt: string; src?: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const reduce = useLandingReducedMotion();
  const { scrollYProgress } = useScroll({ target: frame, offset: ['start end', 'end start'] });
  const drift = useTransform(scrollYProgress, [0, 1], [-18, 18]);
  const y = useSpring(drift, { stiffness: 100, damping: 30 });
  const scale = useTransform(scrollYProgress, [0, .5, 1], [1.06, 1, 1.04]);
  return <div ref={frame} className={`qm-photo ${className}`}>
    <motion.img src={src} alt={alt} width={1536} height={1024}
      loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async"
      style={{ y: reduce ? 0 : y, scale: reduce ? 1 : scale }} />
  </div>;
}

function Accent({ className = '' }: { className?: string }) {
  const reduce = useLandingReducedMotion();
  return <svg className={`qm-accent ${className}`} viewBox="0 0 90 80" fill="none" aria-hidden="true"><motion.path initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .9, delay: reduce ? 0 : .5, ease }} d="M20 42 33 14M40 54 72 35M43 73 78 72" stroke="currentColor" strokeWidth="7" strokeLinecap="round" /></svg>;
}
function FeatureArt({ kind }: { kind: 'edit' | 'map' }) {
  return <svg className={`qm-feature-art qm-art-${kind}`} viewBox="0 0 260 230" aria-hidden="true" fill="none">
    <ellipse cx="144" cy="194" rx="85" ry="15" fill={kind === 'edit' ? '#b69ddd' : '#9ac8b4'} opacity=".25" />
    {kind === 'edit' ? <>
      <g transform="rotate(13 130 110)"><rect x="66" y="28" width="132" height="166" rx="15" fill="#c6b0e8" /><rect x="60" y="20" width="132" height="166" rx="15" fill="#fffcf7" /><path d="M83 54h73M83 79h90M83 104h67M83 129h49" stroke="#d1bbee" strokeWidth="9" strokeLinecap="round" /></g>
      <g transform="rotate(37 173 123)"><rect x="164" y="52" width="23" height="136" rx="5" fill="#7447e8" /><path d="M164 161h23v27l-11.5 22-11.5-22z" fill="#d9b88f" /><path d="m171 200 4.5 10 4.5-10z" fill="#241e35" /><path d="M170 62v94" stroke="#b599ed" strokeWidth="5" strokeLinecap="round" /></g>
    </> : <>
      <g transform="rotate(-11 130 130)"><path d="m30 76 62-22 65 23 65-21v124l-65 23-65-24-62 23z" fill="#fffcf7" /><path d="m44 87 48-17v95l-48 17z" fill="#d0e7d9" /><path d="m92 70 65 23v94l-65-22z" fill="#b1d6c2" /><path d="m157 93 51-17v94l-51 17z" fill="#d0e7d9" /><path d="M57 160c35-65 71 43 124-44" stroke="#147d64" strokeWidth="4" strokeDasharray="7 9" strokeLinecap="round" /></g>
      <path d="M164 35c-23 0-37 17-37 36 0 28 37 59 37 59s37-31 37-59c0-19-14-36-37-36Z" fill="#147d64" /><circle cx="164" cy="70" r="13" fill="#fffcf7" />
    </>}
    <path d="M226 166c-30-16-18-51-18-51 28 9 35 30 18 51ZM224 166c5-27 28-35 28-35 5 23-9 35-28 35Z" fill={kind === 'edit' ? '#88b89c' : '#6ba98c'} />
  </svg>;
}


// Landing-page direction: DESIGN_VARIANCE 9 / MOTION_INTENSITY 8 / VISUAL_DENSITY 4.
// Pointer values never enter React state; touch and reduced-motion users get static controls.
function MagneticButton({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick: () => void }) {
  const reduce = useLandingReducedMotion();
  const dx = useMotionValue(0);
  const dy = useMotionValue(0);
  const x = useSpring(dx, { stiffness: 220, damping: 18, mass: .5 });
  const y = useSpring(dy, { stiffness: 220, damping: 18, mass: .5 });
  const reset = () => { dx.set(0); dy.set(0); };
  const follow = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (reduce || event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const box = event.currentTarget.getBoundingClientRect();
    dx.set(Math.max(-8, Math.min(8, (event.clientX - box.left - box.width / 2) * .12)));
    dy.set(Math.max(-6, Math.min(6, (event.clientY - box.top - box.height / 2) * .18)));
  };
  return <motion.button className={`qm-button ${className}`} onClick={onClick}
    onPointerMove={follow} onPointerLeave={reset} onPointerCancel={reset} onBlur={reset}
    style={{ x: reduce ? 0 : x, y: reduce ? 0 : y }}
    whileTap={reduce ? undefined : { scale: .96 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>{children}</motion.button>;
}
function FloatingMenu() {
  const reduce = useLandingReducedMotion();
  const dx = useMotionValue(0);
  const dy = useMotionValue(0);
  const rotateY = useSpring(dx, { stiffness: 130, damping: 20 });
  const rotateX = useSpring(dy, { stiffness: 130, damping: 20 });
  const reset = () => { dx.set(0); dy.set(0); };
  return <div className="qm-mockup-stage" onPointerLeave={reset} onPointerCancel={reset}
    onPointerMove={event => {
      if (reduce || event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      const box = event.currentTarget.getBoundingClientRect();
      dx.set(Math.max(-7, Math.min(7, (event.clientX - box.left - box.width / 2) / box.width * 14)));
      dy.set(Math.max(-6, Math.min(6, -(event.clientY - box.top - box.height / 2) / box.height * 12)));
    }}>
    <motion.div className="qm-mockup-tilt" style={{ rotateX: reduce ? 0 : rotateX, rotateY: reduce ? 0 : rotateY }}>
      <div className="qm-phone" role="img" aria-label="Minh họa giao diện menu trên điện thoại: chọn danh mục món ăn hoặc cà phê">
        <div className="qm-phone-camera" />
        <div className="qm-phone-screen">
          <img className="qm-phone-cover" src="/images/landing/cafe-corner.webp" width="1536" height="1024" alt="" loading="eager" />
          <div className="qm-phone-heading"><UtensilsCrossed aria-hidden="true" size={19} /><strong>Thực đơn</strong><span>Chọn danh mục</span></div>
          <div className="qm-phone-category"><img src={photo} width="1536" height="1024" alt="" /><span>Món ăn</span></div>
          <div className="qm-phone-category qm-phone-coffee"><img src="/images/landing/cafe-corner.webp" width="1536" height="1024" alt="" /><span>Cà phê</span></div>
          <div className="qm-phone-caption"><QrCode size={16} aria-hidden="true" />Quét QR. Chọn món.</div>
        </div>
      </div>
    </motion.div>
  </div>;
}
const marqueeItems = ['Menu lên hình', 'Quán lên gu', 'Quét QR, chọn món', 'Miễn phí cho quán'];
function MenuMarquee() {
  const [paused, setPaused] = useState(false);
  const frame = useRef<HTMLElement>(null);
  const inView = useInView(frame);
  return <section ref={frame} className={`qm-marquee${inView ? ' qm-in-view' : ''}${paused ? ' qm-paused' : ''}`} aria-label="Thực đơn điện tử miễn phí">
    <div className="qm-marquee-window"><div className="qm-marquee-track">
      {[0, 1].map(copy => <div key={copy} className="qm-marquee-group" aria-hidden={copy === 1 ? true : undefined}>{marqueeItems.map(text => <span key={text}><QrCode aria-hidden="true" size={23} />{text}</span>)}</div>)}
    </div></div>
    <button className="qm-marquee-toggle" onClick={() => setPaused(!paused)} aria-label={paused ? 'Tiếp tục dải chữ chuyển động' : 'Tạm dừng dải chữ chuyển động'} aria-pressed={paused}>{paused ? <Play size={17} aria-hidden="true" /> : <Pause size={17} aria-hidden="true" />}</button>
  </section>;
}

const steps = [
  { icon: Store, title: 'Tạo quán của bạn', text: 'Đăng ký tài khoản, thêm tên quán, hình ảnh và địa chỉ. Một góc riêng cho quán bắt đầu từ đây.', note: 'Thông tin quán và địa điểm' },
  { icon: UtensilsCrossed, title: 'Thêm món vào thực đơn', text: 'Chia món theo danh mục. Thêm ảnh, mô tả và giá để khách dễ tìm món hợp gu.', note: 'Danh mục rõ ràng, hình ảnh dễ xem' },
  { icon: QrCode, title: 'Xuất bản và chia sẻ QR', text: 'Xuất bản thực đơn rồi tải mã QR để đặt tại quán. Khách quét mã và xem món trực tiếp.', note: 'Khách xem menu không cần đăng nhập' },
];
export function LandingPage({ onStartCreate, onLogin }: LandingPageProps) {
  // Full motion is the requested default for this marketing page.
  const reduce = false;
  const { scrollYProgress } = useScroll();
  const heroFrame = useRef<HTMLElement>(null);
  const heroInView = useInView(heroFrame);
  const readingProgress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return <LandingMotion.Provider value={reduce}><div className="qm-landing" data-motion={reduce ? 'off' : 'on'}>
    <a className="qm-skip" href="#qm-main">Đến nội dung chính</a>
    <header className="qm-header"><div className="qm-wrap qm-nav">
      <a className="qm-logo" href="#/" aria-label="QR Menu, trang chủ"><span>QR</span>Menu</a>
      <nav aria-label="Điều hướng chính">
        <a className="qm-nav-discover" href="#/discover">Khám phá các quán <ArrowUpRight aria-hidden="true" size={14} /></a>
        <button className="qm-login" onClick={onLogin}>Đăng nhập</button>
        <MagneticButton className="qm-nav-create" onClick={onStartCreate}>Tạo menu miễn phí <ArrowRight aria-hidden="true" size={16} /></MagneticButton>
      </nav>
    </div><motion.div className="qm-reading-progress" aria-hidden="true" style={{ scaleX: reduce ? scrollYProgress : readingProgress }} /></header>
    <main id="qm-main">
      <section ref={heroFrame} className={heroInView ? "qm-hero qm-in-view" : "qm-hero"} aria-labelledby="qm-hero-title">
        <div className="qm-liquid" aria-hidden="true"><span /><span /><span /></div>
        <div className="qm-hero-copy">
          <motion.p className="qm-eyebrow" initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>THỰC ĐƠN ĐIỆN TỬ MIỄN PHÍ</motion.p>
          <h1 id="qm-hero-title"><span className="qm-title-mask"><motion.span initial={reduce ? false : { y: '110%', opacity: 0, rotate: 2 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ duration: .85, delay: reduce ? 0 : .12, ease }}>Menu lên hình.</motion.span></span><span className="qm-title-mask qm-title-purple"><motion.span initial={reduce ? false : { y: '110%', opacity: 0, rotate: 2 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ duration: .85, delay: reduce ? 0 : .3, ease }}>Quán lên gu.</motion.span></span><Accent /></h1>
          <motion.p className="qm-hero-description" initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay: reduce ? 0 : .48, ease }}>Tạo thực đơn miễn phí. Khách quét QR, chọn món và khám phá quán của bạn.</motion.p>
          <motion.div className="qm-actions" initial={reduce ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay: reduce ? 0 : .6, ease }}>
            <MagneticButton onClick={onStartCreate}>Tạo menu miễn phí <ArrowRight aria-hidden="true" size={19} /></MagneticButton>
            <a className="qm-text-link" href="#/discover">Khám phá các quán <ArrowUpRight aria-hidden="true" size={18} /></a>
          </motion.div>
        </div>
        <motion.div className="qm-hero-media" initial={reduce ? false : { opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.2, delay: reduce ? 0 : .65, ease }}>
          <CafePhoto priority className="qm-hero-photo" alt="Cà phê trong tách xanh ngọc, bánh croissant và món salad trên bàn quán phủ khăn lavender" />
        </motion.div>
        <motion.div className="qm-floating-menu" initial={reduce ? false : { opacity: 0, y: 36, scale: .9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 1, delay: reduce ? 0 : 1, ease }}><FloatingMenu /></motion.div>
        <svg className="qm-hero-wave" viewBox="0 0 1440 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 46C220-42 367 108 650 59S1050 15 1440 60V100H0Z" fill="currentColor" /></svg>
      </section>
      <section className="qm-benefits qm-wrap" aria-labelledby="qm-benefits-title">
        <Reveal className="qm-section-intro"><p className="qm-eyebrow">DÀNH CHO QUÁN CÀ PHÊ, NHÀ HÀNG & GÓC ĂN UỐNG CỦA BẠN</p><h2 id="qm-benefits-title">Đẹp mắt với khách.<span>Dễ dùng cho quán.</span></h2><p>Từ bức ảnh món ngon đến địa chỉ quán, mọi thứ cùng có mặt trong thực đơn của bạn.</p></Reveal>
        <div className="qm-benefit-grid">
          <Reveal className="qm-feature qm-feature-photo"><CafePhoto className="qm-detail-photo" alt="Ảnh cận món ăn và đồ uống với màu sắc tự nhiên, hấp dẫn" />
            <div className="qm-feature-copy"><Image aria-hidden="true" size={26} /><h3>Món ngon, có hình.</h3><p>Ảnh, mô tả và giá nằm cạnh nhau. Khách chọn danh mục rồi tìm món mình thích.</p></div>
          </Reveal>
          <Reveal className="qm-feature qm-feature-lavender" delay={.08}><FeatureArt kind="edit" /><div className="qm-icon-tile"><PencilLine aria-hidden="true" size={30} /></div><h3>Cập nhật theo nhịp quán.</h3><p>Thay giá, thêm món hoặc tạm ẩn món hết hàng. Xuất bản khi bạn sẵn sàng.</p><span className="qm-feature-note"><Check aria-hidden="true" size={16} />Chủ động với thực đơn của bạn</span></Reveal>
          <Reveal className="qm-feature qm-feature-emerald" delay={.16}><FeatureArt kind="map" /><div className="qm-icon-tile"><MapPin aria-hidden="true" size={30} /></div><h3>Địa điểm cũng lên menu.</h3><p>Cho khách biết quán ở đâu. Thực đơn đã xuất bản xuất hiện trong trang khám phá.</p><a href="#/discover" className="qm-text-link">Khám phá các quán <ArrowUpRight aria-hidden="true" size={18} /></a></Reveal>
        </div>
      </section>
      <MenuMarquee />
      <section className="qm-workflow" aria-labelledby="qm-workflow-title"><div className="qm-wrap qm-workflow-grid">
        <div className="qm-workflow-sticky"><Reveal><h2 id="qm-workflow-title">Từ quán của bạn<span>đến tay khách.</span></h2><p>Một thực đơn mang màu sắc của quán. Một mã QR để khách mở bất cứ lúc nào.</p></Reveal><CafePhoto src="/images/landing/cafe-corner.webp" className="qm-workflow-photo" alt="Không khí bàn cà phê ấm áp với đồ uống và món ăn" /></div>
        <div className="qm-steps">{steps.map(({ icon: Icon, title, text, note }, index) => <Reveal key={title} delay={index * .1} className={`qm-step qm-step-${index}`}><div className="qm-step-icon"><span className="qm-step-number">0{index + 1}</span><Icon aria-hidden="true" size={36} strokeWidth={1.6} /></div><h3>{title}</h3><p>{text}</p><span><Check aria-hidden="true" size={16} />{note}</span></Reveal>)}</div>
      </div></section>
      <section className="qm-closing" aria-labelledby="qm-closing-title"><div className="qm-wrap">
        <div className="qm-closing-grid"><Reveal className="qm-closing-copy"><h2 id="qm-closing-title">Một mã QR.<span>Cả gu của quán.</span></h2><p>Thực đơn điện tử miễn phí, dành cho quán của bạn.</p><MagneticButton onClick={onStartCreate}>Tạo menu miễn phí <ArrowRight aria-hidden="true" size={19} /></MagneticButton></Reveal><Reveal className="qm-closing-visual"><CafePhoto src="/images/landing/cafe-corner.webp" alt="Tách cà phê xanh ngọc trên bàn sáng màu" className="qm-closing-photo" /></Reveal></div>
        <div className="qm-questions"><Reveal><h3>Khách có cần tài khoản?</h3><p>Khách quét QR và xem thực đơn trực tiếp trên điện thoại, không cần đăng nhập.</p></Reveal><Reveal delay={.1}><h3>Sửa món có cần in lại QR?</h3><p>Cập nhật và xuất bản lại thực đơn. Mã QR vẫn dẫn đến menu của quán.</p></Reveal></div>
      </div></section>
    </main>
    <footer className="qm-footer qm-wrap"><div><a href="#/" className="qm-logo" aria-label="QR Menu, trang chủ"><span>QR</span>Menu</a><p>Thực đơn điện tử miễn phí.</p></div><nav aria-label="Điều hướng cuối trang"><a href="#/discover">Khám phá các quán <ArrowUpRight aria-hidden="true" size={16} /></a><button onClick={onLogin}>Đăng nhập</button></nav></footer>
  </div></LandingMotion.Provider>;
}
