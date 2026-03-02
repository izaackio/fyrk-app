"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { ApiClientError, createAccount } from "../accounts/client";
import {
  ACCOUNT_TYPE_OPTIONS,
  CURRENCY_OPTIONS,
  PROVIDER_OPTIONS,
  VISIBILITY_OPTIONS,
  WRAPPER_OPTIONS_BY_ACCOUNT_TYPE,
} from "../accounts/constants";
import type { AccountType, WrapperType } from "../accounts/contracts";
import { useHouseholdContext } from "../accounts/useHouseholdContext";
import styles from "../accounts/accounts.module.css";
import { Button } from "../ui/Button";
import { InputField } from "../ui/InputField";
import { SelectField } from "../ui/SelectField";

interface FormState {
  accountType: AccountType;
  currency: string;
  name: string;
  providerId: string;
  visibility: "full" | "hidden" | "private";
  wrapperType: WrapperType;
}

type FieldName = keyof FormState;

const INITIAL_FORM: FormState = {
  accountType: "investment",
  currency: "SEK",
  name: "",
  providerId: "avanza",
  visibility: "full",
  wrapperType: "ISK",
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  return "Could not create account. Please retry.";
};

const validate = (form: FormState): Partial<Record<FieldName, string>> => {
  const errors: Partial<Record<FieldName, string>> = {};

  if (form.name.trim().length < 2) {
    errors.name = "Account name must be at least 2 characters.";
  }

  if (!form.providerId) {
    errors.providerId = "Select a provider.";
  }

  if (!form.accountType) {
    errors.accountType = "Select account type.";
  }

  if (!form.wrapperType) {
    errors.wrapperType = "Select account wrapper.";
  }

  if (!/^[A-Z]{3}$/.test(form.currency)) {
    errors.currency = "Currency must be a 3-letter code.";
  }

  if (!form.visibility) {
    errors.visibility = "Select visibility.";
  }

  return errors;
};

export function AddAccountForm() {
  const router = useRouter();
  const { activeHouseholdId, error: householdError, loading: householdLoading } =
    useHouseholdContext();
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const wrapperOptions = useMemo(
    () => WRAPPER_OPTIONS_BY_ACCOUNT_TYPE[form.accountType],
    [form.accountType],
  );

  const handleAccountTypeChange = (nextType: AccountType) => {
    const defaultWrapper = WRAPPER_OPTIONS_BY_ACCOUNT_TYPE[nextType][0]?.value ?? "ISK";

    setForm((current) => ({
      ...current,
      accountType: nextType,
      wrapperType: defaultWrapper,
    }));
  };

  const updateField = <K extends FieldName>(field: K, value: FormState[K]) => {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setForm((current) => ({ ...current, [field]: value }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = validate(form);
    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    if (!activeHouseholdId) {
      setSubmitError("Create a household before adding accounts.");
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const response = await createAccount({
        accountType: form.accountType,
        currency: form.currency,
        householdId: activeHouseholdId,
        name: form.name.trim(),
        providerId: form.providerId,
        visibility: form.visibility,
        wrapperType: form.wrapperType,
      });

      router.push(`/accounts/${response.data.id}?created=1`);
    } catch (error) {
      setSubmitError(toErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (householdLoading) {
    return <p className={styles.stateMessage}>Loading household context…</p>;
  }

  if (householdError) {
    return <p className={styles.errorText}>{householdError}</p>;
  }

  return (
    <form className={styles.formLayout} onSubmit={onSubmit}>
      <InputField
        autoComplete="off"
        hint="Use provider-native naming when possible (for example: ISK Avanza)."
        id="account-name"
        label="Account name"
        onChange={(event) => updateField("name", event.target.value)}
        placeholder="ISK Avanza"
        required
        value={form.name}
        {...(fieldErrors.name ? { error: fieldErrors.name } : {})}
      />

      <div className={styles.formRow}>
        <SelectField
          id="account-provider"
          label="Provider"
          onChange={(event) => updateField("providerId", event.target.value)}
          options={PROVIDER_OPTIONS}
          required
          value={form.providerId}
        />
        <SelectField
          id="account-type"
          label="Account type"
          onChange={(event) => handleAccountTypeChange(event.target.value as AccountType)}
          options={ACCOUNT_TYPE_OPTIONS}
          required
          value={form.accountType}
        />
      </div>

      <div className={styles.formRow}>
        <SelectField
          id="account-wrapper"
          label="Wrapper"
          onChange={(event) => updateField("wrapperType", event.target.value as WrapperType)}
          options={wrapperOptions}
          required
          value={form.wrapperType}
        />
        <SelectField
          id="account-currency"
          label="Currency"
          onChange={(event) => updateField("currency", event.target.value)}
          options={CURRENCY_OPTIONS}
          required
          value={form.currency}
        />
      </div>

      <SelectField
        id="account-visibility"
        label="Visibility"
        onChange={(event) =>
          updateField("visibility", event.target.value as FormState["visibility"])
        }
        options={VISIBILITY_OPTIONS}
        required
        value={form.visibility}
      />

      <p className={styles.stateMessage}>
        Visibility controls partner view rights. Values are shown exactly as provider-reported,
        without live repricing.
      </p>

      {submitError ? (
        <p aria-live="polite" className={styles.errorText}>
          {submitError}
        </p>
      ) : null}

      <div className={styles.inlineActions}>
        <Button disabled={submitting} type="submit" variant="primary">
          {submitting ? "Creating account…" : "Create account"}
        </Button>
        <Button
          disabled={submitting}
          onClick={() => router.push("/accounts")}
          type="button"
          variant="ghost"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
