/** Scroll a child into view inside a horizontal scroller without moving page ancestors. */
export function scrollChildIntoContainer(
  container: HTMLElement,
  child: HTMLElement,
  behavior: ScrollBehavior = "smooth",
) {
  const containerRect = container.getBoundingClientRect();
  const childRect = child.getBoundingClientRect();
  const childCenter =
    childRect.left - containerRect.left + container.scrollLeft + childRect.width / 2;
  const nextLeft = Math.max(
    0,
    Math.min(
      container.scrollWidth - container.clientWidth,
      childCenter - container.clientWidth / 2,
    ),
  );

  container.scrollTo({ left: nextLeft, behavior });
}
