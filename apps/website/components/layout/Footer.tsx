import Link from "next/link";
import Image from "next/image";
import { socialLinks } from "@/components/shared/socialLinks";
import { PatternDivider } from "@/components/shared/PatternDivider";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Products" },
  { href: "/contact", label: "Contact" },
];

export function Footer() {
  return (
    <footer className="bg-black text-cream">
      {/* Adinkra pattern divider at top of footer */}
      <PatternDivider />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 py-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex items-center gap-3">
              <div className="h-12 w-12 flex-shrink-0">
                <Image
                  src="/logo.svg"
                  alt="PrintsbyTee"
                  width={48}
                  height={48}
                  className="h-full w-full brightness-0 invert"
                  style={{ width: "auto", height: "auto" }}
                />
              </div>
              <span className="font-heading text-xl font-bold text-cream">PrintsbyTee</span>
            </Link>
            <p className="text-cream/70 text-sm leading-relaxed max-w-xs">
              Ready-to-Wear fashion for bold and beautiful African women. Premium African prints with contemporary style.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-heading text-sm font-bold tracking-wider uppercase text-gold mb-4">
              Quick Links
            </h3>
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-cream/70 hover:text-gold transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Get in Touch */}
          <div>
            <h3 className="font-heading text-sm font-bold tracking-wider uppercase text-gold mb-4">
              Get in Touch
            </h3>
            <div className="space-y-3">
              <a
                href="mailto:hello@printsbytee.co.uk"
                className="block text-sm text-cream/70 hover:text-gold transition-colors"
              >
                hello@printsbytee.co.uk
              </a>

              {/* Social Icons */}
              <div className="flex items-center gap-4 pt-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cream/70 hover:text-gold transition-colors"
                    aria-label={social.label}
                  >
                    <social.Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-cream/10 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-cream/50">
            © {new Date().getFullYear()} PrintsbyTee. All rights reserved.
          </p>
          <p className="text-xs text-cream/50 italic">
            Ready-to-Wear
          </p>
        </div>
      </div>
    </footer>
  );
}
