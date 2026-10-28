"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

/** Which storefront overlay is open: the nav menu or the cart drawer. */
type Panel = "menu" | "cart" | null;

const ShopUIContext = createContext<{ panel: Panel; open: (p: Exclude<Panel, null>) => void; close: () => void }>({
  panel: null,
  open: () => {},
  close: () => {},
});

export function ShopUIProvider({ children }: { children: React.ReactNode }) {
  const [panel, setPanel] = useState<Panel>(null);
  const open = useCallback((p: Exclude<Panel, null>) => setPanel(p), []);
  const close = useCallback(() => setPanel(null), []);
  const value = useMemo(() => ({ panel, open, close }), [panel, open, close]);
  return <ShopUIContext.Provider value={value}>{children}</ShopUIContext.Provider>;
}

export function useShopUI() {
  return useContext(ShopUIContext);
}

/** Call after a successful add-to-cart to show the drawer. */
export function useOpenCart() {
  const { open } = useShopUI();
  return useCallback(() => open("cart"), [open]);
}

const FOCUSABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]';

/** Tabbable elements inside `root`: skips disabled, tabindex=-1, hidden and inert ones. */
function tabbables(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) =>
      !el.matches(':disabled, [tabindex="-1"]') && !el.closest("[hidden], [inert]") && el.getClientRects().length > 0,
  );
}

/** Open modals, innermost last. Only the top one handles Tab and Escape. */
const modalStack: symbol[] = [];
let savedBodyStyle: { overflow: string; paddingRight: string } | null = null;

/** Elements that stay live while the page behind a modal is inert. */
const KEEP_LIVE = "script, style, link, template, next-route-announcer, nextjs-portal";

/**
 * Makes everything outside the panel's layer inert: the siblings of each of
 * its ancestors, from the panel's parent (which holds its backdrop and
 * toggle) up to <body>. Returns the elements it changed, for restoring.
 */
function inertOutside(panel: HTMLElement) {
  const changed: HTMLElement[] = [];
  for (let node = panel.parentElement; node && node !== document.body; node = node.parentElement) {
    for (const sibling of Array.from(node.parentElement?.children ?? [])) {
      if (sibling === node || !(sibling instanceof HTMLElement) || sibling.inert || sibling.matches(KEEP_LIVE)) continue;
      sibling.inert = true;
      changed.push(sibling);
    }
  }
  return changed;
}

/** Last focused element, for modals opened by a route change that replaced their trigger. */
let lastFocused: HTMLElement | null = null;
if (typeof document !== "undefined") {
  document.addEventListener("focusin", (e) => {
    if (e.target instanceof HTMLElement) lastFocused = e.target;
  });
}

const isShown = (el: Element) => el.isConnected && el.getClientRects().length > 0;

/**
 * Where focus goes back to: the trigger itself, or, when a route change
 * re-rendered it (an Edit link that opens a drawer route), the visible element
 * with the same href or id.
 */
function returnTarget(el: HTMLElement | null) {
  if (!el || isShown(el)) return el;
  const href = el.getAttribute("href");
  const candidates = href
    ? document.querySelectorAll<HTMLElement>(`${el.tagName}[href="${CSS.escape(href)}"]`)
    : el.id
      ? document.querySelectorAll<HTMLElement>(`#${CSS.escape(el.id)}`)
      : [];
  return Array.from(candidates).find(isShown) ?? el;
}

function restoreFocus(el: HTMLElement | null) {
  const target = returnTarget(el);
  target?.focus();
  // The page behind may still be rendering (route change): try once more on the next frame.
  if (target && document.activeElement !== target) requestAnimationFrame(() => returnTarget(el)?.focus());
}

/**
 * Shared modal behavior for drawers and dialogs: Escape closes, the page
 * behind does not scroll and is inert, Tab stays inside the panel, focus moves
 * into the panel (a `[data-autofocus]` element first) and returns afterwards.
 * Modals stack (a confirm dialog over a drawer): the covered one pauses, and
 * gets focus back when the top one closes.
 */
export function useModal(isOpen: boolean, onClose: () => void) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const id = Symbol("modal");
    const isTop = () => modalStack[modalStack.length - 1] === id;
    const active = document.activeElement as HTMLElement | null;
    const previouslyFocused = active && active !== document.body ? active : lastFocused;

    if (modalStack.length === 0) {
      const { body, documentElement } = document;
      savedBodyStyle = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
      // Fill the scrollbar's space so the page (and its sticky header) does not shift.
      const scrollbar = window.innerWidth - documentElement.clientWidth;
      body.style.overflow = "hidden";
      if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    }
    modalStack.push(id);
    const inerted = panelRef.current ? inertOutside(panelRef.current) : [];

    const focusFirst = () => {
      const panel = panelRef.current;
      if (!panel) return;
      const items = tabbables(panel);
      (items.find((el) => el.hasAttribute("data-autofocus")) ?? items[0])?.focus();
    };
    const raf = requestAnimationFrame(focusFirst);

    const onKey = (e: KeyboardEvent) => {
      const panel = panelRef.current;
      if (!panel || !isTop()) return;
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const items = tabbables(panel);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!panel.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      const wasTop = isTop();
      modalStack.splice(modalStack.indexOf(id), 1);
      for (const el of inerted) el.inert = false;
      if (modalStack.length === 0 && savedBodyStyle) {
        document.body.style.overflow = savedBodyStyle.overflow;
        document.body.style.paddingRight = savedBodyStyle.paddingRight;
        savedBodyStyle = null;
      }
      // A modal closing underneath another one leaves focus where it is.
      if (wasTop) restoreFocus(previouslyFocused);
    };
  }, [isOpen, onClose]);

  return panelRef;
}
