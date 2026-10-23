// Hides the browser's scrollbars on the whole website; scrolling (wheel, touch, keyboard) still works.
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = '* { scrollbar-width: none; } *::-webkit-scrollbar { display: none; }';
  document.head.appendChild(style);
}

export {};
