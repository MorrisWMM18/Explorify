import emptyMixImage from "../../images/emptymix.svg";

interface AlbumArtProps {
  src: string | null;
  songName: string | null;
}

/**
 * Song photo of the current track.
 */
function AlbumArt({ src, songName }: AlbumArtProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src ?? emptyMixImage}
      alt={songName ? `Album art for ${songName}` : ""}
      className="aspect-square w-full rounded-art object-cover"
    />
  );
}

export default AlbumArt;
