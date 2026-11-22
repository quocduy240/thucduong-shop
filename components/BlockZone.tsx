import { getRenderedBlocksForPosition, type BlockPosition } from "@/lib/blocks";
import FrontendEditButton from "./FrontendEditButton";

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
      {blocks.map((b) => {
        // QR blocks are rendered with a synthetic id (100000 + qr.id); edit them in /admin/qr/.
        const isQr = b.id >= 100000;
        return (
          <div key={b.id} className="group/block relative">
            <FrontendEditButton
              resource="block"
              href={isQr ? `/admin/qr/${b.id - 100000}/` : `/admin/blocks/${b.id}/`}
              label={isQr ? `Sửa QR #${b.id - 100000}` : `Sửa Block #${b.id}`}
              variant="badge"
              className="absolute right-2 top-2 z-20 opacity-85 group-hover/block:opacity-100"
            />
            <div dangerouslySetInnerHTML={{ __html: b.html }} />
          </div>
        );
      })}
    </div>
  );
}
