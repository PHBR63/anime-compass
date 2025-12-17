import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

/**
 * Hook para detectar se o dispositivo é mobile (< 768px)
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

/**
 * Hook para detectar se o dispositivo é tablet (768px - 1024px)
 */
export function useIsTablet() {
  const [isTablet, setIsTablet] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const onChange = () => {
      const width = window.innerWidth;
      setIsTablet(width >= MOBILE_BREAKPOINT && width < TABLET_BREAKPOINT);
    };
    
    window.addEventListener("resize", onChange);
    onChange();
    return () => window.removeEventListener("resize", onChange);
  }, []);

  return !!isTablet;
}

/**
 * Hook para detectar se deve usar layout compacto (mobile ou tablet)
 */
export function useIsCompact() {
  const [isCompact, setIsCompact] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const onChange = () => {
      setIsCompact(window.innerWidth < TABLET_BREAKPOINT);
    };
    
    window.addEventListener("resize", onChange);
    onChange();
    return () => window.removeEventListener("resize", onChange);
  }, []);

  return !!isCompact;
}
