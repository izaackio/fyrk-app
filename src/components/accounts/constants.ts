import type {
  AccountType,
  AccountVisibility,
  ImportFormat,
  WrapperType,
} from "./contracts";

export interface SelectOption<T extends string = string> {
  label: string;
  value: T;
}

export const PROVIDER_OPTIONS: SelectOption[] = [
  { value: "avanza", label: "Avanza" },
  { value: "nordnet", label: "Nordnet" },
  { value: "seb", label: "SEB" },
  { value: "swedbank", label: "Swedbank" },
  { value: "handelsbanken", label: "Handelsbanken" },
  { value: "skandia", label: "Skandia" },
  { value: "amf", label: "AMF" },
  { value: "alecta", label: "Alecta" },
  { value: "spp", label: "SPP" },
  { value: "other", label: "Other Provider" },
];

export const ACCOUNT_TYPE_OPTIONS: SelectOption<AccountType>[] = [
  { value: "investment", label: "Investment" },
  { value: "savings", label: "Savings" },
  { value: "pension", label: "Pension" },
  { value: "mortgage", label: "Mortgage" },
  { value: "loan", label: "Loan" },
  { value: "cash", label: "Cash Account" },
];

export const WRAPPER_OPTIONS_BY_ACCOUNT_TYPE: Record<
  AccountType,
  SelectOption<WrapperType>[]
> = {
  investment: [
    { value: "ISK", label: "ISK" },
    { value: "KF", label: "KF" },
    { value: "Depa", label: "Depå" },
  ],
  savings: [{ value: "Savings", label: "Savings Account" }],
  pension: [{ value: "Pension", label: "Pension" }],
  mortgage: [{ value: "Mortgage", label: "Mortgage" }],
  loan: [{ value: "Loan", label: "Loan" }],
  cash: [{ value: "Checking", label: "Checking / Cash" }],
};

export const CURRENCY_OPTIONS: SelectOption[] = [
  { value: "SEK", label: "SEK" },
  { value: "EUR", label: "EUR" },
  { value: "USD", label: "USD" },
  { value: "NOK", label: "NOK" },
  { value: "DKK", label: "DKK" },
  { value: "GBP", label: "GBP" },
];

export const VISIBILITY_OPTIONS: SelectOption<AccountVisibility>[] = [
  { value: "full", label: "Full (amount visible)" },
  { value: "hidden", label: "Amount hidden" },
  { value: "private", label: "Private (not visible to partner)" },
];

export const IMPORT_FORMAT_OPTIONS: SelectOption<ImportFormat>[] = [
  { value: "avanza", label: "Avanza CSV" },
  { value: "nordnet", label: "Nordnet CSV" },
];

export const PROVIDER_ICON_BY_ID: Record<string, string> = {
  avanza: "A",
  nordnet: "N",
  seb: "S",
  swedbank: "Sw",
  handelsbanken: "H",
  skandia: "Sk",
  amf: "Am",
  alecta: "Al",
  spp: "Sp",
  other: "•",
};
