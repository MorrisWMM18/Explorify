/**
 * The page's backdrop: a fixed gradient wash plus three blurred
 * colour blobs that the glass panels refract. Pure markup with no client
 * JS — it stays server-rendered.
 */
function GlassBackdrop() {
  return (
    <div aria-hidden="true">
      <div className="fixed inset-0 z-0" data-layer="gradient" />
      <div className="fixed -inset-[10%] z-0" data-layer="blobs">
        <div className="absolute left-[6%] top-[4%] size-[38vw] rounded-full" />
        <div className="absolute right-[2%] top-[22%] size-[32vw] rounded-full" />
        <div className="absolute bottom-[-8%] left-[34%] size-[42vw] rounded-full" />
      </div>
    </div>
  );
}

export default GlassBackdrop;
