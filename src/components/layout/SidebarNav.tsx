"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AppIcon } from "./icons";
import { isActivePath, type NavSection, type ShellTone } from "./navigation";

import styles from "./shell.module.css";

interface SidebarNavProps {
  sections: NavSection[];
  onNavigate?: () => void;
}

const toneLabels: Record<ShellTone, string | null> = {
  primary: null,
  emerging: "Emerging",
  support: null,
  preview: "Preview",
};

export function SidebarNav({ sections, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <>
      {sections.map((section) => (
        <section className={styles.navSection} key={section.label}>
          <header className={styles.navSectionHeader}>
            <span className={styles.navSectionTitle}>{section.label}</span>
            {section.helper ? <span className={styles.navSectionHelper}>{section.helper}</span> : null}
          </header>

          <ul className={styles.navList}>
            {section.items.map((item) => {
              const active = isActivePath(pathname, item.href);
              const toneLabel = toneLabels[item.tone];
              const className = [styles.navLink, active ? styles.navLinkActive : ""]
                .filter(Boolean)
                .join(" ");
              const linkProps = onNavigate ? { onClick: onNavigate } : {};

              return (
                <li key={item.href}>
                  <Link className={className} href={item.href} {...linkProps}>
                    <span aria-hidden className={styles.navIcon}>
                      <AppIcon height={18} name={item.icon} width={18} />
                    </span>
                    <span className={styles.navCopy}>
                      <span className={styles.navLabelRow}>
                        <span className={styles.navLabel}>{item.label}</span>
                        {toneLabel ? (
                          <span className={styles.navTone} data-tone={item.tone}>
                            {toneLabel}
                          </span>
                        ) : null}
                      </span>
                      <span className={styles.navDescription}>{item.description}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
