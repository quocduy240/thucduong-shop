import { getSocialLinksConfig } from "@/lib/social-links";
import {
  renderSocialBlockHtml,
  type SocialGroup,
  type SocialStyle,
} from "@/lib/social-links-shared";

export default async function SocialLinksBlock({
  style,
  group = "all",
  dark = false,
  compactTitle = false,
  className = "",
}: {
  style?: SocialStyle;
  group?: "all" | SocialGroup;
  dark?: boolean;
  compactTitle?: boolean;
  className?: string;
}) {
  const config = await getSocialLinksConfig();
  const html = renderSocialBlockHtml(config, {
    style,
    group,
    dark,
    compactTitle,
    trackClicks: true,
  });
  if (!html) return null;

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
