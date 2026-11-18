import { getRenderedBlocksForPosition, type BlockPosition } from "@/lib/blocks";

export default async function BlockZone({
  position,
  postId,
  productId,
  className = "",
}: {
  position: BlockPosition;
  postId?: number;
  productId?: number;
  className?: string;
}) {
  const blocks = await getRenderedBlocksForPosition(position, { postId, productId });
  if (blocks.length === 0) return null;

  return (
    <div className={className} data-block-position={position}>
      {blocks.map((b) => (
        <div key={b.id} dangerouslySetInnerHTML={{ __html: b.html }} />
      ))}
    </div>
  );
}
