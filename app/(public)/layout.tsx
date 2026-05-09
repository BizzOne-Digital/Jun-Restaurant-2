import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 min-w-0 overflow-x-clip pb-[env(safe-area-inset-bottom)]">{children}</main>
      <SiteFooter />
    </div>
  );
}
