const ease = 'cubic-bezier(.16,1,.3,1)';
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function initMotion() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  let teardown: (() => void) | undefined;

  function start() {
    document.documentElement.classList.add('motion-ready');
    const controller = new AbortController();
    const { signal } = controller;
    const animations = new Set<Animation>();
    const observers: IntersectionObserver[] = [];
    const pending = new Set<HTMLElement>();
    let frame = 0;
    const animate = (el: Element, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      const animation = el.animate(frames, { duration: 900, easing: ease, ...options });
      animations.add(animation);
      animation.finished.then(() => animations.delete(animation)).catch(() => {});
      return animation;
    };

    // Preserve the original text and line break; masks are only a visual enhancement.
    const heading = document.querySelector<HTMLElement>('.hero h1');
    if (heading && !heading.dataset.split) {
      heading.setAttribute('aria-label', heading.innerText.replace(/\s+/g, ' ').trim());
      const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
      const nodes: Text[] = [];
      while (walker.nextNode()) nodes.push(walker.currentNode as Text);
      nodes.forEach(node => {
        const fragment = document.createDocumentFragment();
        (node.textContent || '').split(/(\s+)/).forEach(word => {
          if (!word.trim()) { fragment.append(document.createTextNode(word)); return; }
          const mask = document.createElement('span');
          mask.className = 'word-mask';
          mask.setAttribute('aria-hidden', 'true');
          const inner = document.createElement('span');
          inner.className = 'motion-word';
          inner.textContent = word;
          mask.append(inner);
          fragment.append(mask);
        });
        node.replaceWith(fragment);
      });
      heading.dataset.split = 'true';
    }

    const entrance = (selector: string, delay: number, y = 24, angle = 0) => {
      document.querySelectorAll(selector).forEach(el => animate(el, [
        { opacity: 0, transform: `translate3d(0,${y}px,0) rotate(${angle}deg)` },
        { opacity: 1, transform: 'translate3d(0,0,0) rotate(0deg)' },
      ], { delay, duration: 1100 }));
    };
    entrance('.header', 0, -12);
    entrance('.hero-heading .eyebrow', 80, 14);
    heading?.querySelectorAll('.motion-word').forEach((word, index) => animate(word, [
      { transform: 'translateY(115%) rotate(5deg)' },
      { transform: 'translateY(0) rotate(0)' },
    ], { delay: 150 + index * 55, duration: 1000 }));
    entrance('.hero-subline', 480);
    entrance('.doctor-teaser', 380, 65, -5);
    entrance('.hero-treatment', 470, 45);
    entrance('.symptom-widget', 610, 35, 3);
    entrance('.quick-links', 700, 55, 4);
    entrance('.hero-foot', 850, 15);
    document.querySelectorAll('.symptom-tags a,.treatment-label>span').forEach((el, i) => animate(el, [
      { opacity: 0, transform: 'translateY(15px) scale(.92)' },
      { opacity: 1, transform: 'translateY(0) scale(1)' },
    ], { delay: 760 + i * 60, duration: 700 }));
    const heroImage = document.querySelector('.hero-treatment');
    if (heroImage) animate(heroImage, [
      { clipPath: 'inset(0 100% 0 0 round 9px)' },
      { clipPath: 'inset(0 0% 0 0 round 9px)' },
    ], { delay: 400, duration: 1400 });

    // A section choreographs its heading and cards together, rather than one global delay.
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        reveal(el);
        revealObserver.unobserve(el);
      });
    }, { threshold: .12, rootMargin: '0px 0px -24px 0px' });
    observers.push(revealObserver);
    const reveal = (el: HTMLElement) => {
      if (!pending.delete(el)) return;
      el.style.removeProperty('opacity');
      const delay = Number(el.dataset.motionDelay || 0);
      animate(el, [
        { opacity: 0, transform: 'translate3d(0,50px,0) scale(.97)', clipPath: 'inset(0 0 12% 0 round 8px)' },
        { opacity: 1, transform: 'translate3d(0,0,0) scale(1)', clipPath: 'inset(0 0 0% 0 round 8px)' },
      ], { delay, duration: 1050 });
    };
    document.querySelectorAll<HTMLElement>('.section-heading,.doctor-copy,.doctor-display,.faq-inner>h2,.faq-inner>.eyebrow,.booking-card,.footer-info,.review-foot').forEach(el => {
      pending.add(el); el.style.opacity = '0'; revealObserver.observe(el);
    });
    document.querySelectorAll('.review-grid,.care-bento,.resource-grid,.faq-list').forEach(group => {
      Array.from(group.children).forEach((child, index) => {
        const el = child as HTMLElement;
        el.dataset.motionDelay = String(index * 95);
        pending.add(el); el.style.opacity = '0'; revealObserver.observe(el);
      });
    });
    document.addEventListener('focusin', event => {
      if (!(event.target instanceof Element)) return;
      pending.forEach(el => { if (el.contains(event.target as Node)) reveal(el); });
    }, { signal });

    const progress = document.createElement('div');
    progress.className = 'reading-progress';
    progress.setAttribute('aria-hidden', 'true');
    document.body.append(progress);
    const sceneElements = Array.from(document.querySelectorAll<HTMLElement>('.hero-treatment,.doctor-display'));
    const visibleScenes = new Set<HTMLElement>();
    const sceneObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.isIntersecting ? visibleScenes.add(entry.target as HTMLElement) : visibleScenes.delete(entry.target as HTMLElement));
      schedule();
    }, { rootMargin: '100px' });
    sceneElements.forEach(el => sceneObserver.observe(el));
    observers.push(sceneObserver);
    function updateScroll() {
      frame = 0;
      const distance = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${clamp(window.scrollY / Math.max(1, distance))})`;
      visibleScenes.forEach(el => {
        const rect = el.getBoundingClientRect();
        const position = clamp((window.innerHeight / 2 - (rect.top + rect.height / 2)) / window.innerHeight, -.7, .7);
        el.querySelector<HTMLElement>('img')?.style.setProperty('--image-y', `${position * 38}px`);
        el.querySelector<HTMLElement>('.doctor-stamp')?.style.setProperty('--stamp-angle', `${position * 25}deg`);
      });
    }
    function schedule() { if (!frame) frame = requestAnimationFrame(updateScroll); }
    window.addEventListener('scroll', schedule, { passive: true, signal });
    window.addEventListener('resize', schedule, { passive: true, signal });
    schedule();

    // Pointer effects are local to the hovered control and never run on touch devices.
    document.querySelectorAll<HTMLElement>('.button,.round-link,.care-card,.resource-grid article,.review-grid figure,.booking-card').forEach(el => {
      const magnetic = el.matches('.button,.round-link');
      el.addEventListener('pointermove', event => {
        if (!finePointer.matches || event.pointerType === 'touch') return;
        const rect = el.getBoundingClientRect();
        const x = event.clientX - rect.left, y = event.clientY - rect.top;
        if (magnetic) {
          el.style.setProperty('--magnet-x', `${(x / rect.width - .5) * 12}px`);
          el.style.setProperty('--magnet-y', `${(y / rect.height - .5) * 10}px`);
        } else {
          // rotate3d axis + angle avoids clobbering entrance transforms.
          el.style.rotate = `${-(y / rect.height - .5)} ${x / rect.width - .5} 0 5deg`;
          el.style.setProperty('--spot-x', `${x}px`);
          el.style.setProperty('--spot-y', `${y}px`);
        }
      }, { signal });
      el.addEventListener('pointerleave', () => {
        el.style.removeProperty('--magnet-x'); el.style.removeProperty('--magnet-y'); el.style.removeProperty('rotate');
      }, { signal });
    });

    // Native details remains the semantic control, with reversible height animation.
    document.querySelectorAll<HTMLDetailsElement>('details').forEach(details => {
      const summary = details.querySelector('summary');
      let current: Animation | undefined;
      let desiredOpen = details.open;
      summary?.addEventListener('click', event => {
        event.preventDefault();
        const from = details.getBoundingClientRect().height;
        desiredOpen = !desiredOpen;
        current?.cancel();
        details.style.height = '';
        details.open = true;
        const to = desiredOpen ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height;
        details.style.overflow = 'hidden';
        details.dataset.expanded = String(desiredOpen);
        current = animate(details, [{ height: `${from}px` }, { height: `${to}px` }], { duration: 440, easing: 'cubic-bezier(.4,0,.2,1)' });
        const thisAnimation = current;
        current.finished.then(() => {
          if (current !== thisAnimation) return;
          details.open = desiredOpen;
          details.style.removeProperty('overflow');
          delete details.dataset.expanded;
          current = undefined;
          schedule();
        }).catch(() => {});
      }, { signal });
    });

    // Indicate the section currently in view in the navigation.
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const link = document.querySelector(`.header nav a[href="#${entry.target.id}"]`);
        if (entry.isIntersecting) link?.setAttribute('aria-current', 'location');
        else link?.removeAttribute('aria-current');
      });
    }, { rootMargin: '-15% 0px -55% 0px' });
    document.querySelectorAll('#care,#doctor,#patients,#contact').forEach(el => sectionObserver.observe(el));
    observers.push(sectionObserver);

    return () => {
      document.documentElement.classList.remove('motion-ready');
      controller.abort();
      observers.forEach(observer => observer.disconnect());
      animations.forEach(animation => animation.cancel());
      cancelAnimationFrame(frame);
      pending.forEach(el => el.style.removeProperty('opacity'));
      document.querySelectorAll<HTMLElement>('[data-expanded]').forEach(el => { (el as HTMLDetailsElement).open = el.dataset.expanded === 'true'; el.style.removeProperty('overflow'); delete el.dataset.expanded; });
      document.querySelectorAll<HTMLElement>('.button,.round-link,.care-card,.resource-grid article,.review-grid figure,.booking-card').forEach(el => { el.style.removeProperty('--magnet-x'); el.style.removeProperty('--magnet-y'); el.style.removeProperty('rotate'); });
      progress.remove();
    };
  }

  const syncPreference = () => { teardown?.(); teardown = reduced.matches ? undefined : start(); };
  syncPreference();
  reduced.addEventListener('change', syncPreference);
  window.addEventListener('pagehide', () => { teardown?.(); teardown = undefined; });
  window.addEventListener('pageshow', event => { if (event.persisted) syncPreference(); });
}
