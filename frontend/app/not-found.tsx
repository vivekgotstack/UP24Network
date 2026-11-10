import Link from "next/link";
import { SiteHeader } from "@/components/site-header";

export default function NotFound() {
  return <><SiteHeader /><main id="main-content" className="empty-state">
    <p className="eyebrow">404 / PAGE NOT FOUND</p><h1>This story isn’t here.</h1>
    <p>It may have moved, or the link may be incorrect.</p><Link className="text-link" href="/">Back to the front page</Link>
  </main></>;
}
