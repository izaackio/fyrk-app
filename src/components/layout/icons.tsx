import type { SVGProps } from "react";

export type IconName =
  | "home"
  | "balanceSheet"
  | "timeline"
  | "playbooks"
  | "household"
  | "settings"
  | "review"
  | "fitness"
  | "proposals";

type IconProps = SVGProps<SVGSVGElement>;

const iconProps = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.75,
  viewBox: "0 0 24 24",
} as const;

export function FyrkMark(props: IconProps) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" fill="currentColor" stroke="none" {...props}>
      <text
        x="12"
        y="19"
        textAnchor="middle"
        fontFamily="var(--font-narrative), 'Instrument Serif', Georgia, serif"
        fontStyle="italic"
        fontSize="26"
        fontWeight="400"
      >
        ƒ
      </text>
    </svg>
  );
}

export function AppIcon({ className, name, ...props }: IconProps & { name: IconName }) {
  const sharedProps = { ...iconProps, className, ...props };

  switch (name) {
    case "home":
      return (
        <svg aria-hidden {...sharedProps}>
          <path d="M4.5 10.5 12 4l7.5 6.5" />
          <path d="M6.5 9.5V20h11V9.5" />
          <path d="M10 20v-5.5h4V20" />
        </svg>
      );
    case "balanceSheet":
      return (
        <svg aria-hidden {...sharedProps}>
          <rect height="14" rx="2.5" width="15" x="4.5" y="5" />
          <path d="M8 9.5h8" />
          <path d="M8 13.5h5.5" />
          <path d="M8 17.5h8" />
        </svg>
      );
    case "timeline":
      return (
        <svg aria-hidden {...sharedProps}>
          <path d="M6 6v12" />
          <path d="M18 6v12" />
          <path d="M8.5 8h7" />
          <path d="M8.5 16h7" />
          <circle cx="8" cy="12" r="1.5" />
          <circle cx="16" cy="12" r="1.5" />
          <path d="M9.5 12h5" />
        </svg>
      );
    case "playbooks":
      return (
        <svg aria-hidden {...sharedProps}>
          <path d="M6.5 5.5h7a3 3 0 0 1 3 3V19a2.5 2.5 0 0 0-2.5-2.5h-7a2.5 2.5 0 0 0-2.5 2.5V8a2.5 2.5 0 0 1 2.5-2.5Z" />
          <path d="M16.5 8.5h1A2.5 2.5 0 0 1 20 11v8a2.5 2.5 0 0 0-2.5-2.5h-1" />
          <path d="M8 9.5h5" />
          <path d="M8 13h4" />
        </svg>
      );
    case "household":
      return (
        <svg aria-hidden {...sharedProps}>
          <path d="M8 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          <path d="M16.5 10.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
          <path d="M4.5 18a3.5 3.5 0 0 1 7 0" />
          <path d="M13.5 18a3 3 0 0 1 5.5-1.5" />
        </svg>
      );
    case "settings":
      return (
        <svg aria-hidden {...sharedProps}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.6-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.6 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .6.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.6Z" />
        </svg>
      );
    case "review":
      return (
        <svg aria-hidden {...sharedProps}>
          <path d="M7 4.5h8l3 3V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V6A1.5 1.5 0 0 1 7.5 4.5Z" />
          <path d="M15 4.5V8h3" />
          <path d="M9 12h6" />
          <path d="m9 15 1.5 1.5L15 12" />
        </svg>
      );
    case "fitness":
      return (
        <svg aria-hidden {...sharedProps}>
          <path d="M12 20.5s-6.5-3.9-6.5-10.2A3.8 3.8 0 0 1 9.3 6.5c1.1 0 2.1.5 2.7 1.4.6-.9 1.6-1.4 2.7-1.4a3.8 3.8 0 0 1 3.8 3.8C18.5 16.6 12 20.5 12 20.5Z" />
          <path d="m8.5 12.5 1.7-1.8 1.8 3 1.8-2h1.7" />
        </svg>
      );
    case "proposals":
      return (
        <svg aria-hidden {...sharedProps}>
          <path d="M6 5.5h12a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 18 15.5h-5l-4 3v-3H6A1.5 1.5 0 0 1 4.5 14V7A1.5 1.5 0 0 1 6 5.5Z" />
          <path d="M8.5 10h7" />
          <path d="M8.5 13h4.5" />
        </svg>
      );
    default:
      return null;
  }
}

export function SearchIcon(props: IconProps) {
  return (
    <svg aria-hidden {...iconProps} {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m19 19-3.5-3.5" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg aria-hidden {...iconProps} {...props}>
      <path d="M4.5 7.5h15" />
      <path d="M4.5 12h15" />
      <path d="M4.5 16.5h15" />
    </svg>
  );
}

export function SunIcon(props: IconProps) {
  return (
    <svg aria-hidden {...iconProps} {...props}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3.5v2.2" />
      <path d="M12 18.3v2.2" />
      <path d="m5.9 5.9 1.6 1.6" />
      <path d="m16.5 16.5 1.6 1.6" />
      <path d="M3.5 12h2.2" />
      <path d="M18.3 12h2.2" />
      <path d="m5.9 18.1 1.6-1.6" />
      <path d="m16.5 7.5 1.6-1.6" />
    </svg>
  );
}

export function MoonIcon(props: IconProps) {
  return (
    <svg aria-hidden {...iconProps} {...props}>
      <path d="M18 14.5A6.5 6.5 0 1 1 9.5 6a5.5 5.5 0 0 0 8.5 8.5Z" />
    </svg>
  );
}
