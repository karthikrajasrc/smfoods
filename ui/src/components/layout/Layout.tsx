import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import Header from "./Header";
import Footer from "./Footer";
import FloatingActions from "./FloatingActions";

export default function Layout() {
  const { pathname } = useLocation();
  const reduceMotion = useReducedMotion();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2">Skip to content</a>
      <Header />
      <main id="main">
        <motion.div
          key={pathname}
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.28, ease: "easeOut" }}
        >
          <Outlet />
        </motion.div>
      </main>
      <Footer />
      <FloatingActions />
    </>
  );
}
