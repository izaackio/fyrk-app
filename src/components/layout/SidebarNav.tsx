"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "./navigation";

import styles from "../theme/theme.module.css";

interface SidebarNavProps {
  items: NavItem[];
  onNavigate?: () => void;
}

const isActivePath = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

export function SidebarNav({ items, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary">
      <ul className={styles.navList}>
        {items.map((item) => {
          const active = isActivePath(pathname, item.href);
          const className = [styles.navLink, active ? styles.navLinkActive : ""]
            .filter(Boolean)
            .join(" ");
          const linkProps = onNavigate ? { onClick: onNavigate } : {};

          return (
            <li key={item.href}>
              <Link className={className} href={item.href} {...linkProps}>
                <span aria-hidden className={styles.navIcon}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
