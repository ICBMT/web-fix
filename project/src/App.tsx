import { useCallback, useEffect, useRef, useState } from "react";
import Cursor from "./components/Cursor";
import Loader from "./components/Loader";
import Nav from "./components/Nav";
import Home from "./pages/Home";
import Work from "./pages/Work";
import { gsap, initScroll, lockScroll, scrollTop, ScrollTrigger } from "./lib/core";

function getRoute(): string {
  return window.location.hash === "#/work" ? "#/work" : "#/";
}

export default function App() {
  const [route, setRoute] = useState<string>(getRoute());
  const [loading, setLoading] = useState(true);
  const routeRef = useRef(route);
  const transitionRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    initScroll();
    lockScroll(true);
  }, []);

  /* ---------- magnetic elements (delegated) ---------- */
  useEffect(() => {
    if (window.matchMedia("(hover: none)").matches) return;
    let active: HTMLElement | null = null;
    const onMove = (e: PointerEvent) => {
      const el = (e.target as HTMLElement).closest?.("[data-magnetic]") as HTMLElement | null;
      if (el !== active) {
        if (active) gsap.to(active, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.45)" });
        active = el;
      }
      if (el) {
        const r = el.getBoundingClientRect();
        gsap.to(el, {
          x: (e.clientX - (r.left + r.width / 2)) * 0.32,
          y: (e.clientY - (r.top + r.height / 2)) * 0.32,
          duration: 0.45,
          ease: "power3.out",
        });
      }
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    document.title = route === "#/work" ? "Work Archive — GreePixel®" : "GreePixel® — We Build Beyond";
  }, [route]);

  const transitionTo = useCallback((next: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    const cols = transitionRef.current!.querySelectorAll(".wipe-col");
    const tl = gsap.timeline({
      onComplete: () => {
        busyRef.current = false;
        ScrollTrigger.refresh();
      },
    });
    tl.set(transitionRef.current, { pointerEvents: "auto" })
      .fromTo(cols, { scaleY: 0, transformOrigin: "50% 100%" }, { scaleY: 1, duration: 0.5, ease: "power3.inOut", stagger: 0.045 })
      .add(() => {
        routeRef.current = next;
        setRoute(next);
        scrollTop(true);
      })
      .to(cols, { scaleY: 0, transformOrigin: "50% 0%", duration: 0.55, ease: "power3.inOut", stagger: 0.045 }, "+=0.12")
      .set(transitionRef.current, { pointerEvents: "none" });
  }, []);

  useEffect(() => {
    const onHash = () => {
      const r = getRoute();
      if (r !== routeRef.current) transitionTo(r);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [transitionTo]);

  const navigate = useCallback(
    (r: string) => {
      if (r === routeRef.current) {
        scrollTop(false);
        return;
      }
      window.location.hash = r;
    },
    []
  );

  const handleLoaderDone = useCallback(() => {
    setLoading(false);
    lockScroll(false);
  }, []);

  return (
    <div className="grain min-h-screen" style={{ background: "#0b0a09" }}>
      <Cursor />
      <Nav route={route} onNavigate={navigate} />

      {route === "#/" ? <Home ready={!loading} onNavigate={navigate} /> : <Work ready={!loading} onNavigate={navigate} />}

      {/* pixel wipe transition */}
      <div ref={transitionRef} className="pointer-events-none fixed inset-0 z-[90] flex" style={{ visibility: "visible" }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="wipe-col h-full flex-1" style={{ background: i % 2 ? "#0b0a09" : "#f4602a", transform: "scaleY(0)" }} />
        ))}
      </div>

      {loading && <Loader onDone={handleLoaderDone} />}
    </div>
  );
}
