import { Link } from "react-router-dom";
import { site } from "../data/site";
import ScrollReveal from "../components/ui/ScrollReveal";

const values = [
  {
    title: "Rooted in tradition",
    description: "We celebrate familiar ingredients and traditional food, bringing time-honoured flavours into everyday life.",
  },
  {
    title: "Made with care",
    description: "From wholesome pantry staples to satisfying snacks, we focus on quality and care in every product we share.",
  },
  {
    title: "Goodness for every home",
    description: "Our range is thoughtfully brought together to make it easier to enjoy authentic taste and everyday goodness at home.",
  },
];

export default function About() {
  return (
    <article>
      <ScrollReveal>
      <header className="bg-gradient-to-br from-[#f7f1e4] via-[#efe3c6] to-[#e6d3a9]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:py-24 lg:px-8">
          <div>
            <p className="font-semibold uppercase tracking-[0.2em] text-paddy">Our story</p>
            <h1 className="mt-4 max-w-2xl font-display text-5xl font-bold leading-tight text-paddy md:text-6xl">
              From local roots to goodness in every home.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#3b3326]">
              At SM Foods, we bring together the authentic taste of traditional ingredients and the comfort of food made with care. From wholesome pantry favourites to nourishing snacks, our aim is simple: make good food part of everyday life.
            </p>
            <Link to="/products" className="mt-8 inline-flex rounded bg-paddy px-7 py-3 font-semibold uppercase tracking-wide text-white transition hover:bg-paddy-soft">
              Explore our products
            </Link>
          </div>
          <div className="mx-auto w-full max-w-md rounded-3xl bg-white p-5 shadow-[0_20px_60px_rgba(74,54,18,0.12)]">
            <img src={site.logo} alt={`${site.name} — From Local Roots to Global Routes`} className="mx-auto w-full object-contain" />
            <p className="mt-4 text-center font-display text-xl italic text-paddy">From Local Roots to Global Routes</p>
          </div>
        </div>
      </header>
      </ScrollReveal>

      <ScrollReveal>
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold text-paddy md:text-4xl">A taste of tradition, made for today</h2>
          <p className="mt-5 text-lg leading-8 text-muted">
            We believe that the food we bring home should feel familiar, taste authentic, and be chosen with confidence. SM Foods brings together products inspired by traditional food culture—from pure cow ghee and natural jaggery to rice varieties, combos, and roasted makhana.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {values.map((value, index) => (
            <ScrollReveal key={value.title} delay={index * 0.07}>
            <section className="h-full rounded-2xl border border-line bg-white p-7 shadow-[0_4px_18px_rgba(0,0,0,0.04)]">
              <span className="grid h-11 w-11 place-items-center rounded-full bg-[#f7f1e4] font-display text-xl font-bold text-ghee">{`0${index + 1}`}</span>
              <h3 className="mt-5 text-xl font-semibold text-paddy">{value.title}</h3>
              <p className="mt-3 leading-7 text-muted">{value.description}</p>
            </section>
            </ScrollReveal>
          ))}
        </div>
      </section>
      </ScrollReveal>

      <ScrollReveal>
      <section className="bg-[#f7f8f3]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:px-6 md:grid-cols-[1fr_auto] md:items-center md:py-16 lg:px-8">
          <div>
            <h2 className="font-display text-3xl font-bold text-paddy">Good food, shared with care</h2>
            <p className="mt-4 max-w-3xl leading-7 text-[#3b3326]">
              Whether you are stocking your kitchen or discovering a new favourite, we are glad to be part of your table. Thank you for choosing SM Foods and being part of our journey from local roots to global routes.
            </p>
          </div>
          <Link to="/contact" className="inline-flex justify-center rounded border border-paddy px-6 py-3 font-semibold text-paddy transition hover:bg-paddy hover:text-white">
            Get in touch
          </Link>
        </div>
      </section>
      </ScrollReveal>
    </article>
  );
}
