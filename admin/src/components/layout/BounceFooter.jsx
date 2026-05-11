import { useId } from "react";
import {
  MdAccessTime,
  MdEmail,
  MdPhone,
  MdWhatsapp,
} from "react-icons/md";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaYoutube,
} from "react-icons/fa";


const SUPPORT = {
  phoneDisplay: "+55 11 2615-2600",
  phoneTel: "+551126152600",
  whatsappDisplay: "+55 11 99598-7696",
  whatsappHref: "https://wa.me/5511995987696",
  email: "suporte@tegrapharma.com",
  hours: "Seg. à Sex., das 9h às 18h",
};

const SOCIAL = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/tegrapharma",
    Icon: FaLinkedinIn,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@tegrapharma",
    Icon: FaYoutube,
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/tegrapharma",
    Icon: FaInstagram,
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/tegrapharma",
    Icon: FaFacebookF,
  },
];

function ContactRow({ icon: Icon, children, href }) {
  const inner = (
    <span className="flex items-start gap-2.5 text-sm text-white/90">
      <Icon
        className="mt-0.5 shrink-0 text-lg text-white/85"
        aria-hidden
      />
      <span>{children}</span>
    </span>
  );

  if (href) {
    return (
      <a
        href={href}
        className="transition hover:text-white"
        target="_blank"
        rel="noopener noreferrer"
      >
        {inner}
      </a>
    );
  }
  return <div>{inner}</div>;
}

/** Rodapé estático em SVG com gradiente Tegra. */
export default function BounceFooter() {
  const year = new Date().getFullYear();
  const rawId = useId();
  const gradId = `tegra-footer-grad-${rawId.replace(/:/g, "")}`;

  return (
    <footer
      role="contentinfo"
      aria-label="Rodapé"
      className="relative mt-auto w-full shrink-0 overflow-hidden pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      <svg className="absolute h-0 w-0" aria-hidden>
        <defs>
          <linearGradient
            id={gradId}
            x1="0"
            y1="0"
            x2="1"
            y2="1"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0.12" stopColor="#1a2f5b" />
            <stop offset="0.48" stopColor="#3da2b8" />
            <stop offset="0.88" stopColor="#8FA9C1" />
          </linearGradient>
        </defs>
      </svg>

      <div
        className="relative min-h-[300px] w-full sm:min-h-[320px]"
        style={{ background: `linear-gradient(120deg, #1a2f5b 12%, #3da2b8 48%, #8FA9C1 88%)` }}
      >
        <div
          className="pointer-events-none absolute inset-0 z-[1]"
          style={{
            backgroundImage:
              "url(https://assets.codepen.io/16327/noise.png)",
            mixBlendMode: "soft-light",
            opacity: 0.38,
          }}
          aria-hidden
        />

        <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-4 pt-10 sm:px-6 sm:pb-5 sm:pt-12">
          <div className="w-full">
            <div className="flex flex-col gap-10 pb-6 lg:flex-row lg:items-start lg:justify-between lg:gap-12 lg:pb-8">
              <div className="flex max-w-md flex-col gap-3">
                <img
                  src="/logoCorp.png"
                  alt="TegraPharma Corp — Integrative Cannabinoids"
                  className="h-14 w-auto max-w-[220px] object-contain object-left brightness-0 invert sm:h-16"
                />
              </div>

              <div className="min-w-0 flex-1 lg:max-w-md">
                <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-white/95">
                  Suporte
                </h2>
                <ul className="flex flex-col gap-3.5">
                  <li>
                    <ContactRow icon={MdPhone} href={`tel:${SUPPORT.phoneTel}`}>
                      {SUPPORT.phoneDisplay}{" "}
                      <span className="text-white/75">(Suporte)</span>
                    </ContactRow>
                  </li>
                  <li>
                    <ContactRow
                      icon={MdWhatsapp}
                      href={SUPPORT.whatsappHref}
                    >
                      {SUPPORT.whatsappDisplay}{" "}
                      <span className="text-white/75">(Suporte)</span>
                    </ContactRow>
                  </li>
                  <li>
                    <ContactRow
                      icon={MdEmail}
                      href={`mailto:${SUPPORT.email}`}
                    >
                      {SUPPORT.email}
                    </ContactRow>
                  </li>
                  <li>
                    <ContactRow icon={MdAccessTime}>
                      {SUPPORT.hours}
                    </ContactRow>
                  </li>
                </ul>

                <div className="mt-5 flex flex-wrap gap-2">
                  {SOCIAL.map(({ label, href, Icon }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="flex h-9 w-9 items-center justify-center rounded border border-white/25 bg-white/10 text-white transition hover:bg-white/20"
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-dotted border-white/50 pt-4 sm:pt-5">
              <div className="flex flex-col gap-3 text-center text-[0.7rem] text-white/85 sm:flex-row sm:items-center sm:justify-between sm:text-left sm:text-xs">
                <p>
                  {year} © Todos os direitos reservados — TegraPharma Corp
                </p>
                <a
                  href="#"
                  className="font-medium text-white/95 underline-offset-2 transition hover:text-white hover:underline"
                >
                  Política de privacidade
                </a>
                <p className="sm:text-right">
                  Desenvolvido pela equipe de TI TegraPharma
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
