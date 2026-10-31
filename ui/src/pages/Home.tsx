import Hero from "../components/home/Hero";
import HomeCategories from "../components/home/HomeCategories";
import SuperDeals from "../components/home/SuperDeals";
import OurCombos from "../components/home/OurCombos";
import WhyChooseUs from "../components/home/WhyChooseUs";
import Testimonials from "../components/home/Testimonials";

export default function Home() {
  return (
    <>
      <Hero />
      <HomeCategories />
      <SuperDeals />
      <OurCombos />
      <WhyChooseUs />
      <Testimonials />
    </>
  );
}
