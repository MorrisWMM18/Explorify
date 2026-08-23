/** Three-bar equaliser shown while a row's preview is playing. */
function EqBars() {
  return (
    <div className="flex h-4 items-end gap-0.5" aria-hidden="true">
      <span className="w-[3px] rounded-[2px] [animation:sr-bar_0.6s_ease-in-out_infinite] h-4" />
      <span className="w-[3px] rounded-[2px] [animation:sr-bar_0.6s_ease-in-out_0.15s_infinite] h-2.5" />
      <span className="w-[3px] rounded-[2px] [animation:sr-bar_0.6s_ease-in-out_0.3s_infinite] h-3.5" />
    </div>
  );
}

export default EqBars;
