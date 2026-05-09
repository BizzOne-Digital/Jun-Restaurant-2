import Image from "next/image";
import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/5 bg-black/30 sm:mt-20">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 px-3 py-10 sm:grid-cols-2 sm:gap-10 sm:px-4 sm:py-12 md:grid-cols-3 md:px-6">
        <div>
          <div className="relative mb-4 h-14 w-14">
            <Image src="/awok-logo.png" alt="A Wok" fill className="object-contain" sizes="56px" />
          </div>
          <p className="font-display text-xl font-bold text-awok-cream">A Wok</p>
          <p className="mt-2 text-sm text-awok-muted">Premium Chinese street-food energy. Built for bold cravings.</p>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-awok-gold">Visit</p>
          <p className="text-sm text-awok-cream">1025 A St</p>
          <p className="text-sm text-awok-cream">Hayward, CA 94541</p>
        </div>
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-awok-gold">Quick links</p>
          <ul className="space-y-2 text-sm text-awok-muted">
            <li>
              <Link href="/menu" className="hover:text-awok-cream">
                Menu
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-awok-cream">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-awok-cream">
                Contact
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-awok-cream">
                Cart
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-awok-cream">
                Account
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-4 text-center text-xs text-awok-muted">
        © {new Date().getFullYear()} A Wok. Crafted for flavor-first dining.
      </div>
    </footer>
  );
}
