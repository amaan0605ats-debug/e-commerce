import { services } from '../data/services.js';
import { getCachedProducts } from '../firebase.js';
import { offeringCard, applyProductStatus } from '../components/offering-card.js';

const sectors = [
  { label:'Spaces & interiors', slug:'modular-kitchens', title:'Thoughtful spaces. Better living.', image:'modular-kitchens', category:'Core Supply' },
  { label:'Farms & food', slug:'agriculture-implements', title:'Equip the next season.', image:'agriculture-implements', category:'Specialized & Engineering' },
  { label:'Business & industry', slug:'laboratory-setup-equipment', title:'Built for what comes next.', image:'laboratory-setup-equipment', category:'Specialized & Engineering' },
];
export function renderHome() {
  const featured = ['modular-kitchens','agriculture-implements','cold-storage-engineering','furniture-solutions'].map(slug=>services.find(s=>s.slug===slug)).filter(Boolean);
  const paths = [
    {title:'A space to make your own.', image:'interior-paneling', label:'FOR HOMES & INTERIORS', copy:'Bring surfaces, storage and furniture into the same conversation.', slugs:['interior-paneling','flooring-solutions','modular-kitchens']},
    {title:'Room for the next harvest.', image:'agriculture-implements', label:'FOR FARMS & FOOD', copy:'Explore equipment for growing, handling and storing what you produce.', slugs:['agriculture-implements','dairy-equipment-commissioning','cold-storage-engineering']},
    {title:'Get your next venture ready.', image:'laboratory-setup-equipment', label:'FOR WORK & INDUSTRY', copy:'Find the supplies and specialist equipment your workspace needs.', slugs:['laboratory-setup-equipment','general-commercial-supplies','furniture-solutions']},
  ];
  return `<div class="home-editorial">
    <section class="editorial-hero" aria-labelledby="hero-title">
      <div class="hero-editorial-copy"><div class="eyebrow"><span class="status-point"></span> FROM KASHMIR. FOR WHAT’S NEXT.</div>
        <h1 id="hero-title">Good things<br>start with<br><em>the right supply.</em></h1>
        <p>For the spaces you create. The land you grow.<br> The business you’re building.</p>
        <div class="hero-editorial-actions"><a href="/services" class="btn btn-primary">Explore the collection <span aria-hidden="true">↗</span></a><a href="/contact" class="text-link">Let’s talk <span aria-hidden="true">↗</span></a></div>
        <div class="hero-footnote"><span class="mini-rule"></span>General suppliers & distributors<br><strong>Kashmir Valley · Leh Region</strong></div>
      </div>
      <div class="hero-editorial-visual"><img id="sector-image" class="sector-image" src="/images/modular-kitchens.webp" alt="Contemporary modular kitchen with warm wood finishes" width="1024" height="1024" fetchpriority="high">
        <div class="visual-topline"><span>THE AL GANI EDIT</span><span id="sector-number">01 / 03</span></div>
        <div class="visual-caption"><div><span id="sector-kicker">SPACES THAT WORK BEAUTIFULLY</span><h2 id="sector-title">Thoughtful spaces.<br>Better living.</h2></div><a id="sector-link" href="/services/modular-kitchens" aria-label="Explore featured offering">↗</a></div>
        <div class="visual-stamp" aria-hidden="true">AG<span>ROOTED HERE.<br>READY FOR MORE.</span></div>
      </div>
    </section>
    <div class="sector-switcher" aria-label="Explore sectors"><span class="switcher-label">WHAT ARE YOU BUILDING?</span>${sectors.map((s,i)=>`<button type="button" data-sector="${i}" class="sector-tab ${i===0?'active':''}" aria-pressed="${i===0}"><span>0${i+1}</span>${s.label}<span aria-hidden="true">↗</span></button>`).join('')}</div>
    <section class="editorial-section collection-section" aria-labelledby="collection-heading"><div class="section-heading-row"><div><div class="eyebrow">MANY NEEDS. ONE SUPPLY PARTNER.</div><h2 id="collection-heading">A world of <em>possibilities.</em></h2></div><a href="/services" class="text-link">View all offerings ↗</a></div><div class="offering-grid home-offerings">${featured.map(offeringCard).join('')}</div><p class="collection-note">Explore the range. Add your requirements to a quote list. We’ll help with the details.</p></section>
    <section class="editorial-section project-guide" aria-labelledby="project-guide-title"><div class="section-heading-row"><div><div class="eyebrow">START WITH WHAT YOU HAVE IN MIND</div><h2 id="project-guide-title">Your project.<br><em>A few good starting points.</em></h2></div><p>Explore ideas for your space, farm or business.<br>Choose an offering to see the details.</p></div><div class="project-paths">${paths.map(path=>`<article class="project-path"><img src="/images/${path.image}.webp" alt="" loading="lazy" width="1024" height="1024"><div class="project-path-copy"><div class="eyebrow">${path.label}</div><h3>${path.title}</h3><p>${path.copy}</p><div class="project-path-links">${path.slugs.filter(slug=>services.some(service=>service.slug===slug)).map(slug=>`<a href="/services/${slug}">${({'interior-paneling':'Wall panels','flooring-solutions':'Flooring','modular-kitchens':'Modular kitchens','agriculture-implements':'Farm implements','dairy-equipment-commissioning':'Dairy equipment','cold-storage-engineering':'Cold storage','laboratory-setup-equipment':'Laboratory equipment','general-commercial-supplies':'Commercial supplies','furniture-solutions':'Furniture'})[slug]} <span aria-hidden="true">↗</span></a>`).join('')}</div></div></article>`).join('')}</div></section>
    <section class="regional-story"><div class="story-image"><img src="/images/hero-day.webp" alt="Mountain landscape and lakes of Kashmir" loading="lazy" width="1024" height="453"><span>34° N / KASHMIR VALLEY</span></div><div class="story-copy"><div class="eyebrow">LOCAL ROOTS. WIDER POSSIBILITIES.</div><h2>We know the place.<br><em>We know the possibilities.</em></h2><p>Based in Nowgam, Al Gani connects businesses across Kashmir and Leh with interior materials, equipment and commercial supplies.</p><p>One conversation can bring together the different parts of your project—from the first material choice to the next piece of equipment.</p><a href="/about" class="text-link">Meet Al Gani ↗</a><div class="regional-tags"><span>KASHMIR VALLEY</span><span>LEH REGION</span><span>B2B SOURCING</span></div></div></section>
    <section class="editorial-section process-section" aria-labelledby="process-title"><div class="section-heading-row"><div><div class="eyebrow">LESS BACK AND FORTH. MORE FORWARD.</div><h2 id="process-title">From your idea<br>to <em>your next step.</em></h2></div><p>Keep your sourcing in one place.<br>Start a conversation with a clear brief.</p></div><div class="process-grid"><article><span>01</span><h3>Find your fit.</h3><p>Browse the collection by sector or search for a specific offering.</p><a href="/services">Explore offerings ↗</a></article><article><span>02</span><h3>Build your list.</h3><p>Save multiple offerings, set quantities and keep your requirements together.</p><a href="/quote">Open your quote list ↗</a></article><article><span>03</span><h3>Make it happen.</h3><p>Send your brief to discuss specifications, availability and delivery options.</p><a href="/contact">Talk to our team ↗</a></article></div></section>
    <section class="editorial-section sourcing-brief" aria-labelledby="brief-title"><div><div class="eyebrow">A LITTLE PREPARATION GOES A LONG WAY</div><h2 id="brief-title">Make your first<br><em>conversation count.</em></h2><p>You don’t need every answer yet. Share what you know, and we’ll help clarify the next steps.</p><a href="/contact" class="btn btn-primary">Discuss your requirements <span aria-hidden="true">↗</span></a></div><div class="brief-checklist"><div><span>01</span><div><h3>What do you need?</h3><p>Product type, approximate quantity, dimensions or preferred specifications.</p></div></div><div><span>02</span><div><h3>Where is it going?</h3><p>Your project location in Kashmir or Leh, plus any site access details.</p></div></div><div><span>03</span><div><h3>When do you need it?</h3><p>Your target date and any installation requirements, for the team to confirm.</p></div></div><a href="/quote" class="text-link">Already have a shortlist? Open your quote list ↗</a></div></section>
    <section class="editorial-section home-faq"><div><div class="eyebrow">A FEW THINGS TO KNOW</div><h2>Before<br><em>we begin.</em></h2><a href="/contact" class="text-link">Ask us anything ↗</a></div><div class="editorial-faq-list"><details><summary>Can I ask for several products in one quote?<span>+</span></summary><p>Yes. Add offerings to your quote list, adjust the quantities, then prepare an inquiry. The list will be included in your message for our team.</p></details><details><summary>Do you supply outside Srinagar?<span>+</span></summary><p>Our focus is Kashmir Valley and the Leh region. Share your exact delivery location and timeline so the team can confirm transport arrangements.</p></details><details><summary>Are the images exact product specifications?<span>+</span></summary><p>Images illustrate each offering. Confirm models, finishes, dimensions, warranties and other specifications with our team before placing an order.</p></details><details><summary>How do I confirm price and availability?<span>+</span></summary><p>Submit your requirements or call us. Pricing, availability, delivery and installation are confirmed for your particular project.</p></details></div></section>
    <section class="editorial-cta"><div><div class="eyebrow">YOUR NEXT CHAPTER STARTS HERE.</div><h2>Big plans?<br><em>Let’s supply them.</em></h2></div><a href="/contact" class="cta-round" aria-label="Discuss your project">Let’s talk <span>↗</span></a></section>
  </div>`;
}
let generation = 0;
export function cleanupHome() { generation++; }
export async function initHome() {
  const current = ++generation;
  const host = document.querySelector('.home-editorial');
  let selection = 0;
  host?.querySelectorAll('[data-sector]').forEach(button=>button.addEventListener('click',async()=>{
    const index = Number(button.dataset.sector); const sector=sectors[index];
    const request = ++selection;
    const loaded = new Image(); loaded.src = `/images/${sector.image}.webp`;
    try { await loaded.decode(); } catch { return; }
    if (request !== selection || current !== generation || !host.isConnected) return;
    host.querySelectorAll('[data-sector]').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-pressed',String(b===button));});
    const image=host.querySelector('#sector-image'); image.src=`/images/${sector.image}.webp`; image.alt=sector.label;
    host.querySelector('#sector-title').textContent=sector.title;
    host.querySelector('#sector-kicker').textContent=['SPACES THAT WORK BEAUTIFULLY','FOR THE LAND YOU GROW','TOOLS FOR YOUR NEXT CHAPTER'][index];
    host.querySelector('#sector-number').textContent=`0${index+1} / 03`;
    host.querySelector('#sector-link').href=`/services/${sector.slug}`;
  }));
  const products = await getCachedProducts();
  if(current!==generation || !host?.isConnected) return;
  host.querySelectorAll('.offering-card').forEach(card=>applyProductStatus(card,products.find(p=>p.slug===card.dataset.slug)));
}
